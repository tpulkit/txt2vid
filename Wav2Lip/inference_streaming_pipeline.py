# Enables pipeline in the block diagram
# input can be audio or text, either streamed (for text via terminal or Google STT) or stored.
# output is AV generated via wav2lip, TTS can be google or resemble; either streamed or stored.

# Architecture:
# Thread 1 (text_input), Thread 2 (video generated), Thread 3 (audio generated),
# Thread 4 (audio received), Thread 5 (resemble callback)
# callback server); threads are used as applicable for the pipeline subset in use
#
# Thread 1: receive text packets from socket connection or file(with paragraphs separated by \n)
#           send text to resemble TTS API
# Thread 2: receive audio packet from thread 1, generate video frames and send to ffmpeg process
#           (using named pipe)
# Thread 3: receive audio packet from thread 1 and send to ffmpeg process (using named pipe)
# Thread 4: send generated audio to threads 2 & 3 using queue
#           keeps checking every 200ms if there is sufficient data to be played
#           in the input queue, if not it plays silence for the remaining time and
#           transfer to threads 2 & 3 (using queue)
# Thread 5: receive audio packets generated by resemble api and received via a pipe from callback server.
#           write audio to a queue read by thread 4.


import os
import numpy as np
import sys
import json
import torch
import threading
import multiprocessing
import argparse
import logging

sys.path.insert(1, "util")
import ffmpeg_stream, wav2lip_inference_funcs, thread_handlers

# Otherwise multiprocessing doesn't work properly leading to stalling video generation
# at a lower fps than real time.
os.environ["OMP_NUM_THREADS"] = "1"

parser = argparse.ArgumentParser(description='Inference code to lip-sync videos in the wild using Wav2Lip models')

#########################################################
###################### Inputs ##########################
#########################################################
# Inputs
parser.add_argument('-it', '--input_type', choices=['audio', 'text'], default='text',
                    help='Whether working with compression to audio or text.')
parser.add_argument('-TTS', '--text_to_speech', choices=['Resemble', 'Google'], default='Resemble',
                    help='TTS software api to use. Currently only supports Resemble and Google.')


# Input from file or stream
parser.add_argument('-tif', '--text_input_from', choices=['file', 'socket'], default='socket',
                    help='whether to take input text from a file or if it will be streamed over a socket.')
parser.add_argument('--text_file_path', default='None',
                    help='path of text file to be converted in case input from file.')
parser.add_argument('-aif', '--audio_input_from', choices=['file', 'socket'], default='socket',
                    help='whether to take input audio from a file or if it will be streamed over a socket.')
parser.add_argument('--audio_file_path', default='None',
                    help='path of audio file to be converted in case input from file.')

# Port for incoming text or audio stream
parser.add_argument('--text_port', type=int, default=50007,
                    help='Port for websocket server for text input (default: 50007)')  # Arbitrary non-privileged port
parser.add_argument('--audio_port', type=int, default=50007,
                    help='Port for websocket server for audio input (default: 50007)')  # Arbitrary non-privileged port

# Port for Output Video Streaming
parser.add_argument("--output_port", type=int, default=8080,
                    help="ephemeral port number of the server (1024 to 65535)")

# Output to file or stream
parser.add_argument('-vot', '--video_output_to', choices=['file', 'socket'], default='socket',
                    help='whether to write output video to a file or if it will be streamed over a socket.')
parser.add_argument('--video_file_out', default='None',
                    help='video file to be written: should be a .mp4 file.')

# wav2lip params
parser.add_argument('--checkpoint_path', type=str,
                    help='Name of saved checkpoint to load weights from', required=True)

parser.add_argument('--face', type=str,
                    help='Filepath of video/image that contains faces to use', required=True)

parser.add_argument('--static', type=bool,
                    help='If True, then use only first video frame for inference', default=False)
parser.add_argument('--fps', type=float, help='Can be specified only if input is a static image (default: 25)',
                    default=10., required=False)

parser.add_argument('--pads', nargs='+', type=int, default=[0, 10, 0, 0],
                    help='Padding (top, bottom, left, right). Please adjust to include chin at least')

parser.add_argument('--face_det_batch_size', type=int,
                    help='Batch size for face detection', default=16)
parser.add_argument('--wav2lip_batch_size', type=int, help='Batch size for Wav2Lip model(s)', default=128)

parser.add_argument('--resize_factor', default=1, type=int,
                    help='Reduce the resolution by this factor. Sometimes, best results are obtained at 480p or 720p')

parser.add_argument('--crop', nargs='+', type=int, default=[0, -1, 0, -1],
                    help='Crop video to a smaller region (top, bottom, left, right). Applied after resize_factor and rotate arg. '
                         'Useful if multiple face present. -1 implies the value will be auto-inferred based on height, width')

parser.add_argument('--box', nargs='+', type=int, default=[-1, -1, -1, -1],
                    help='Specify a constant bounding box for the face. Use only as a last resort if the face is not detected.'
                         'Also, might work only if the face is not moving around much. Syntax: (top, bottom, left, right).')

parser.add_argument('--rotate', default=False, action='store_true',
                    help='Sometimes videos taken from a phone can be flipped 90deg. If true, will flip video right by 90deg.'
                         'Use if you get a flipped result, despite feeding a normal looking video')

parser.add_argument('--nosmooth', default=False, action='store_true',
                    help='Prevent smoothing face detections over a short temporal window')


# Arguments for text-generation by resemble api
parser.add_argument('--resemble_config_data', default='../resemble_tts/resemble_config.json',
                    help='JSON file containing details of voices to allow generation from Resemble API.')
parser.add_argument("-v", "--voice", default="None",
                    help="name of voice to pick in resemble project from ../resemble_tts/resemble_config.json")
parser.add_argument("-e", "--emotion", help="emotion of voice to be generated", default="None",
                    choices=['neutral', 'angry', 'annoyed', 'question', 'happy'])
parser.add_argument("-p", "--project_id", help="project id at resemble", default='None')
parser.add_argument("-t", "--text_title", help="text title inside project", default="Demo")
parser.add_argument('--resemble_callback_url', default='None',
                    help='Publicly visible url which will receive callback from Resemble once it is ready')

# Arguments for text generation by Google
parser.add_argument('-gc', '--google_credential', default='None',
                    help='Need google credential to use Google STT')


args = parser.parse_args()

input_type = args.input_type
TTS = args.text_to_speech

# Add silence when waiting for TTS output
add_silence = True

if input_type == 'text':
    text_input_from = args.text_input_from
    text_file_path = args.text_file_path
    text_port = args.text_port
    # Get appropriate params for TTS service
    if TTS == 'Resemble':
        voice = args.voice
        if voice == 'None':
            raise ValueError('Provide a voice for the resemble api generation -- through '
                             '../resemble_tts/resemble_config.json. For more information, '
                             'read Resemble TTS Setup in README.md')
        emotion = args.emotion
        if emotion == "None":
            emotion = None
        project_id = args.project_id
        text_title = f'{args.text_title}_{voice}_{emotion}'
        # Define resemble variables
        resemble_config_data = json.load(open(args.resemble_config_data))
        # voice API token for access
        voice_token = resemble_config_data['voices'][voice]['token']
        # Project to consider
        if project_id == "None":
            project_uuid = resemble_config_data['project_uuid']
        # voice ID (uuid) for voice
        voice_id = resemble_config_data['voices'][voice]['voice_id']
        callback_url = args.resemble_callback_url
        if callback_url == 'None':
            raise ValueError('Provide a valid callback url --  '
                             'read Resemble TTS Setup: Callback Server Setup in README.md')
    elif TTS == 'Google':
        google_credential = args.google_credential
        if google_credential == 'None':
            raise ValueError('Provide a valid google crential json parameter -- '
                             'read Google STT and TTS Setup in README.md')

    # Don't add silence if reading from text file and writing to file
    if (text_input_from == 'file') and (args.video_output_to == 'file'):
        add_silence = False

elif input_type == 'audio':
    audio_input_from = args.audio_input_from
    audio_file_path = args.audio_file_path
    audio_port = args.audio_port

video_output_to = args.video_output_to
video_output_path = args.video_file_out

#########################################################
###################### Hyperparams ##########################
#########################################################
# From Wav2Lip
args.img_size = 96
args.audio_sr = 16000
args.BYTE_WIDTH = 2  # related to FORMAT (bytes/audio frame)

# NUM_AUDIO_SAMPLES_PER_STEP: defines the chunks in which audio is processed.
# Should be such that number of video frames within step is an integer
# NOTE: Current system assumes 3200 (i.e., 200ms chunks)
# NOTE: Can't make this much smaller, since that reduces the mel size to so small
# that the mel_chunk produced is smaller than allowed by neural network architecture.
NUM_AUDIO_SAMPLES_PER_STEP = np.ceil(args.audio_sr * 0.2).astype('int')  # 200 ms for 16000 Hz

# mel_step_size: size of each mel_chunk (except last one which can be shorter)
# can't be made very small due to neural network architecture (should be > roughly 3)
mel_step_size = 17
device = 'cpu'#'cuda' if torch.cuda.is_available() else 'cpu'
print('Using {} for inference.'.format(device))

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

if os.path.isfile(args.face) and args.face.split('.')[1] in ['jpg', 'png', 'jpeg']:
    args.static = True

####################################################################
###################### Streaming Functions ##########################
####################################################################
def stream():
    """
    Handles all the threads
    """
    width, height = ffmpeg_stream.get_video_info(args.face)

    # fifo pipes (remove file name if already exists)
    fifo_filename_video = '/tmp/fifovideo'
    fifo_filename_audio = '/tmp/fifoaudio'
    fifo_resemble_tts = '/tmp/fiforesembletts'

    if os.path.exists(fifo_filename_video):
        os.remove(fifo_filename_video)
    if os.path.exists(fifo_filename_audio):
        os.remove(fifo_filename_audio)
    if os.path.exists(fifo_resemble_tts):
        os.remove(fifo_resemble_tts)

    os.mkfifo(fifo_filename_video)
    os.mkfifo(fifo_filename_audio)
    os.mkfifo(fifo_resemble_tts)
    logger.info('fifo exists now')

    process2 = ffmpeg_stream.start_ffmpeg_process2(fifo_filename_video, fifo_filename_audio, width, height, args.fps,
                                                   args.output_port, video_output_to, video_output_path)
    logger.info('Output pipe set')

    # queues for sending audio packets from T1 (audio receiving) to T2 (audio generation) and T3
    # (video generation) at unlimited capacity
    audio_packet_queue_T2 = multiprocessing.Queue()
    audio_packet_queue_T3 = multiprocessing.Queue()

    # queue for sending generated audio from T4 to T1
    # unlimited capacity
    audio_packet_queue_T4 = multiprocessing.Queue()

    # we run audio and video in separate threads otherwise the fifo opening blocks
    outqueue_list = [audio_packet_queue_T2, audio_packet_queue_T3]

    start_audio_input_thread = multiprocessing.Event()  # set in T4 to start T1 execution
    kill_audio_input_thread = multiprocessing.Event()  # set in T4 to stop T1 execution
    if input_type == 'text':
        if TTS == 'Resemble':
            # set in T5 to know that all text received
            kill_audio_thread_callback = multiprocessing.Event()
            # queue for keeping track of audio generation jobs
            last_generated_clip_id_queue_T5 = multiprocessing.Queue()

            # create resemble callback thread
            audio_callback_thread = multiprocessing.Process(target=thread_handlers.audio_read_thread_from_callback,
                                                            args=(kill_audio_thread_callback,
                                                                  fifo_resemble_tts,
                                                                  last_generated_clip_id_queue_T5,
                                                                  audio_packet_queue_T4,
                                                                  kill_audio_input_thread))
            logger.info('T5: Audio receiving thread from callback launched -- Resemble')

            # create text receiving thread
            text_thread = multiprocessing.Process(target=thread_handlers.text_input_resemble_thread_handler,
                                                  args=(text_input_from, start_audio_input_thread,
                                                        last_generated_clip_id_queue_T5, text_file_path,
                                                        callback_url, text_port,
                                                        project_uuid, voice_token, text_title, voice_id, emotion))
            logger.info('T1: Text input thread launched -- Resemble')

        elif TTS == 'Google':
            text_thread = multiprocessing.Process(target=thread_handlers.text_input_google_thread_handler,
                                                  args=(text_input_from,
                                                        audio_packet_queue_T4, start_audio_input_thread,
                                                        kill_audio_input_thread, text_file_path,
                                                        args.text_port, args.audio_sr,
                                                        google_credential
                                                        ))
            logger.info('T1: Text input thread launched -- Google')

        # create audio input thread receiving from callback thread
        audio_input_thread = multiprocessing.Process(target=thread_handlers.text_to_audio_input_thread_handler,
                                                     args=(audio_packet_queue_T4, outqueue_list,
                                                           start_audio_input_thread,
                                                           kill_audio_input_thread,
                                                           args.BYTE_WIDTH, NUM_AUDIO_SAMPLES_PER_STEP,
                                                           add_silence))
        logger.info('T4: Audio input thread launched -- Resemble')

    elif input_type == 'audio':
        audio_input_thread = multiprocessing.Process(target=thread_handlers.audio_input_thread_handler,
                                                     args=(audio_input_from, outqueue_list, audio_port,
                                                           kill_audio_input_thread, audio_file_path,
                                                           args.BYTE_WIDTH, NUM_AUDIO_SAMPLES_PER_STEP,
                                                           args.audio_sr))
        logger.info('T4: Audio input thread launched -- Audio Input')

    video_thread = threading.Thread(target=thread_handlers.txt2vid_inference,
                                    args=(fifo_filename_video, audio_packet_queue_T2,
                                          args.fps, args.checkpoint_path,
                                          args.BYTE_WIDTH, NUM_AUDIO_SAMPLES_PER_STEP,
                                          args.audio_sr, mel_step_size,
                                          args.wav2lip_batch_size, device,
                                          args.face, args.resize_factor, args.rotate, args.crop,
                                          args.face_det_batch_size, args.pads,
                                          args.nosmooth, args.box, args.static,
                                          args.img_size
                                          ))
    logger.info('T2: Video thread launched')
    audio_thread = multiprocessing.Process(target=thread_handlers.audio_thread_handler,
                                           args=(fifo_filename_audio, audio_packet_queue_T3))
    logger.info('T3: Audio thread launched')

    # start threads
    if input_type == 'text':
        text_thread.start()
        if TTS == 'Resemble':
            audio_callback_thread.start()
    audio_input_thread.start()
    video_thread.start()
    audio_thread.start()

    # wait for threads to finish executing
    if input_type == 'text':
        text_thread.join()
        if TTS == 'Resemble':
            audio_callback_thread.join()
    audio_input_thread.join()
    video_thread.join()
    audio_thread.join()

    logger.info('Waiting for ffmpeg process2')
    process2.wait()

    os.remove(fifo_filename_video)
    os.remove(fifo_filename_audio)
    os.remove(fifo_resemble_tts)
    logger.info('Done')


def main():
    stream()


if __name__ == '__main__':
    main()
