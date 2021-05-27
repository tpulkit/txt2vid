'''Example streaming ffmpeg numpy processing.

Based on examples from https://github.com/kkroening/ffmpeg-python/tree/master/examples

Usage instructions:
1. Install opencv, ffmpeg-python and numpy
2. Run python ffmpeg_stream.py input_file
3. In separate terminal run ffplay -f avi http://localhost:8080 (after enabling port forwarding if running remotely)

TODO: explore methods to reduce latency (both for ffmpeg and ffplay)

Demonstrates using ffmpeg to decode video input, process the frames in
python, and then encode video output using ffmpeg.

This example uses two ffmpeg processes - one to decode the input video
and one to encode an output video - while the raw frame processing is
done in python with numpy.
 
In addition the audio from the same input file is also streamed and combined with
the video.

At a high level, the signal graph looks like this:

  (input video) -> [ffmpeg process 1] -> [python] -> [ffmpeg process 2] -> (output video)
  (input audio) -> [ffmpeg process 1_audio] -------------^

Output video is sent to http server.

The simplest processing example simply darkens each frame by
multiplying the frame's numpy array by a constant value; see
``process_frame_simple``.

The audio is read and streamed in 40ms chunks (corresponding to one video frame).

We use named FIFO pipes for the communication to ffmpeg process 2, allowing use of 
two separate pipes for audio and video.

The writing to these pipes happens in distinct threads (so that blocking calls in the pipes don't cause trouble).

'''

from __future__ import print_function
import argparse
import ffmpeg
import logging
import numpy as np
import os
import subprocess
import zipfile
import threading

parser = argparse.ArgumentParser(description='Example streaming ffmpeg numpy processing')
parser.add_argument('in_filename', help='Input filename')
parser.add_argument('port', default=8080, help='Port')

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


# get video frame size using ffmpeg probe
def get_video_info(filename):
    logger.info('Getting video size for {!r}'.format(filename))
    probe = ffmpeg.probe(filename)
    print(probe['streams'])
    video_info = next(s for s in probe['streams'] if s['codec_type'] == 'video')
    width = int(video_info['width'])
    height = int(video_info['height'])
    return width, height


# this is process for reading video file and outputting in raw frames to pipe
# we specify fps here which automatically converts the fps to the desired vale
def start_ffmpeg_process1(in_filename, fps):
    logger.info('Starting ffmpeg process1')
    args = (
        ffmpeg
            .input(in_filename)
            .output('pipe:', format='rawvideo', pix_fmt='rgb24', r=fps)
            .compile()
    )
    # all ffmpeg commands are ultimately run as subprocesses with appropriate piping for stdout
    # the 'pipe:' in the output above means the output is written to stdout, which we redirect to 
    # subprocess.PIPE
    return subprocess.Popen(args, stdout=subprocess.PIPE)


# this is process for reading audio file and outputting to pipe
# the format is pcm signed 16 bit little endian (essentially wav)
# ac=1 -> mono
# ar=16k -> audio sampling rate for output (automatically converted)
def start_ffmpeg_process1_audio(in_filename):
    logger.info('Starting ffmpeg process1_audio')
    args = (
        ffmpeg
            .input(in_filename)
            .output('pipe:', format='s16le', acodec='pcm_s16le', ac=1, ar='16k')
            .compile()
    )
    return subprocess.Popen(args, stdout=subprocess.PIPE)


# process for writing output to http url by taking input from two FIFO pipes (video and audio)
def start_ffmpeg_process2(fifo_name_video, fifo_name_audio, width, height, fps, port,
                          output_to='socket', output_path='None'):
    logger.info('Starting ffmpeg process2')
    server_url = "http://127.0.0.1:" + str(port)  # any port should be fine, 127.0.0.1 is simply localhost

    # inputs: parameters largely the same as in the previous two functions
    input_video = ffmpeg.input(fifo_name_video, format='rawvideo', pix_fmt='rgb24', s='{}x{}'.format(width, height),
                               framerate=fps)
    input_audio = ffmpeg.input(fifo_name_audio, format='s16le', acodec='pcm_s16le', ac=1, ar='16k')

    if output_to == 'socket':
        # (mp4 doesn't work because it requires random access not appropriate for streaming)
        video_format = 'avi'  # format supporting both video and audio.

        # combine the two and output to url (listen = 1 probably sets the server)
        args = (
            ffmpeg
                .output(input_audio, input_video, server_url, listen=1, f=video_format, vcodec='libx264',
                        preset='ultrafast')
                # .global_args('-fflags', 'nobuffer')        # .run()
                # .global_args('-ss', '4')
                # .global_args('-preset', 'ultrafast')
                .compile()
        )
    elif output_to == 'file':
        video_format = 'mp4'
        if output_path == 'None':
            raise ValueError('Asked to write in file but path not provided.')
        args = (
            ffmpeg
                .output(input_audio, input_video, output_path, f=video_format, vcodec='libx264', preset='ultrafast')
                .compile()
        )
    else:
        raise ValueError("Wrong output format. Should be 'socket' or 'file'.")
    return subprocess.Popen(args)


# read frame from process1 stdout pipe and convert to numpy
def read_frame(process1, width, height):
    logger.debug('Reading frame')

    # Note: RGB24 == 3 bytes per pixel.
    frame_size = width * height * 3
    in_bytes = process1.stdout.read(frame_size)
    if len(in_bytes) == 0:
        frame = None
    else:
        assert len(in_bytes) == frame_size
        frame = (
            np
                .frombuffer(in_bytes, np.uint8)
                .reshape([height, width, 3])
        )
    return frame


# read audio frame from process1_audio stdout pipe
def read_audio_frame(process1_audio, num_bytes):
    logger.debug('Reading audio frame')

    in_bytes = process1_audio.stdout.read(num_bytes)
    return in_bytes


# darken frame
def process_frame_simple(frame):
    '''Simple processing example: darken frame.'''
    return frame * 0.3


# write video frame to fifo pipe as bytes
def write_video_frame(fifo_video_out, frame):
    logger.debug('Writing frame')
    fifo_video_out.write(
        frame
            .astype(np.uint8)
            .tobytes()
    )


# write audio frame to fifo pipe as bytes
def write_audio_frame(fifo_audio_out, in_audio_frame):
    logger.debug('Writing audio frame')
    fifo_audio_out.write(in_audio_frame)


def video_thread_handler(fifo_filename_video, process1, width, height):
    fifo_video_out = open(fifo_filename_video, "wb")
    # this blocks until the read for the fifo opens so we run in separate thread

    # read frame one by one, process and write to fifo pipe
    while True:
        in_frame = read_frame(process1, width, height)

        if in_frame is None:
            logger.info('End of input stream')
            break
        logger.debug('Processing frame')
        out_frame = process_frame(in_frame)
        write_video_frame(fifo_video_out, out_frame)
    fifo_video_out.close()


def audio_thread_handler(fifo_filename_audio, process1_audio, audio_bytes_per_video_frame):
    fifo_audio_out = open(fifo_filename_audio, "wb")
    # this blocks until the read for the fifo opens so we run in separate thread

    # read frame one by one, process and write to fifo pipe
    while True:
        in_audio_frame = read_audio_frame(process1_audio, audio_bytes_per_video_frame)
        if len(in_audio_frame) == 0:
            break
        write_audio_frame(fifo_audio_out, in_audio_frame)
    fifo_audio_out.close()


def run(in_filename, process_frame, port):
    width, height = get_video_info(in_filename)
    fps = 25  # video fps
    process1 = start_ffmpeg_process1(in_filename, fps)
    process1_audio = start_ffmpeg_process1_audio(in_filename)

    # fifo pipes (remove file name if already exists)
    fifo_filename_video = '/tmp/fifovideo'
    fifo_filename_audio = '/tmp/fifoaudio'
    if os.path.exists(fifo_filename_video):
        os.remove(fifo_filename_video)
    if os.path.exists(fifo_filename_audio):
        os.remove(fifo_filename_audio)

    os.mkfifo(fifo_filename_video)
    os.mkfifo(fifo_filename_audio)

    process2 = start_ffmpeg_process2(fifo_filename_video, fifo_filename_audio, width, height, fps, port)
    audio_bytes_per_video_frame = 640 * 2  # 2 bytes, 640 audio frames (16000/25)

    # we run audio and video in separate threads otherwise the fifo opening blocks

    # create threads
    video_thread = threading.Thread(target=video_thread_handler, args=(fifo_filename_video, process1, width, height))
    audio_thread = threading.Thread(target=audio_thread_handler,
                                    args=(fifo_filename_audio, process1_audio, audio_bytes_per_video_frame))

    # start threads
    video_thread.start()
    audio_thread.start()

    # wait for threads to finish executing
    video_thread.join()
    audio_thread.join()

    logger.info('Waiting for ffmpeg process1')
    process1.wait()

    logger.info('Waiting for ffmpeg process2')
    process2.wait()

    os.remove(fifo_filename_video)
    os.remove(fifo_filename_audio)
    logger.info('Done')


if __name__ == '__main__':
    args = parser.parse_args()
    port = args.port
    process_frame = process_frame_simple
    run(args.in_filename, process_frame, port)
