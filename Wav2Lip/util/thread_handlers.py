from wav2lip_inference_funcs import *
import sys
import os
import socket
import numpy as np
import time
import ffmpeg_stream
import cv2
import librosa
import audio
import torch
from google.cloud import texttospeech
import subprocess
import wave

sys.path.insert(1, os.path.join(sys.path[0], "../resemble_tts/util"))
from resemble_utils import generate_voice_fn_resemble


def text_input_resemble_thread_handler(text_input_from, start_audio_input_thread,
                                       last_generated_clip_id_queue, text_file_path, callback_url,
                                       text_port,
                                       project_uuid, user_token, text_title, user_voice, emotion):
    """
    Function to get text input
    """

    if text_input_from == 'socket':
        HOST = ''  # Symbolic name meaning all available interfaces
        # Set up websocket server and listen for connections
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.bind((HOST, text_port))
        print('Listening for incoming connection on port', text_port)
        s.listen(1)
        conn, addr = s.accept()
        print('Connected by', addr)
        start_audio_input_thread.set()
        while True:
            line = b''
            conn_closed = False
            while True:  # recv till newline
                # socket.MSG_WAITALL: this parameter ensures we wait till sufficient data received
                byte = conn.recv(1, socket.MSG_WAITALL)
                # reading one byte at a time: not efficient!
                # http://developerweb.net/viewtopic.php?id=4006 has some suggestions
                if byte == b'\n':
                    break
                elif len(byte) == 0:
                    conn_closed = True
                    break
                else:
                    line += byte

            if line != b'':
                line = line.decode(encoding='UTF-8')
                line = line.rstrip()
                print("Input text:", line)

                # Perform the text-to-speech request on the text input
                generated_clip_id = \
                    generate_voice_fn_resemble(project_uuid, user_token, text_title, line, user_voice,
                                               callback_url, emotion)
                print(generated_clip_id)

            if conn_closed:
                last_generated_clip_id_queue.put(generated_clip_id)
                break

    elif text_input_from == 'file':
        start_audio_input_thread.set()
        with open(text_file_path) as f:
            for line in f:
                line = line.rstrip()
                print("Input text: " + line)

                # Perform the text-to-speech request on the text input
                generated_clip_id = \
                    generate_voice_fn_resemble(project_uuid, user_token, text_title, line, user_voice,
                                               callback_url, emotion)
                print(generated_clip_id)
        # Put last generated clip id in queue
        last_generated_clip_id_queue.put(generated_clip_id)


def text_input_google_thread_handler(text_input_from,
                                     audio_packet_queue, start_audio_input_thread, kill_audio_input_thread,
                                     text_file_path, text_port,
                                     audio_sr, google_credential):
    """
    Function to get text input
    """
    # Set environment variable with right credentials
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = google_credential

    # Instantiates a client
    client = texttospeech.TextToSpeechClient()

    # Build the voice request, select the language code ("en-US") and the ssml
    # voice gender ("female")
    voice = texttospeech.VoiceSelectionParams(
        language_code='en-US',
        name='en-IN-Wavenet-B',
        ssml_gender=texttospeech.SsmlVoiceGender.MALE)

    # Select the type of audio file you want returned
    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.LINEAR16,
        sample_rate_hertz=audio_sr, speaking_rate=1.0, pitch=5)

    if text_input_from == 'socket':
        HOST = ''  # Symbolic name meaning all available interfaces
        # Set up websocket server and listen for connections
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.bind((HOST, text_port))
        print('Listening for incoming connection on port', text_port)
        s.listen(1)
        conn, addr = s.accept()
        print('Connected by', addr)
        start_audio_input_thread.set()

        while True:
            line = b''
            conn_closed = False
            while True:  # recv till newline
                # socket.MSG_WAITALL: this parameter ensures we wait till sufficient data received
                byte = conn.recv(1, socket.MSG_WAITALL)
                # reading one byte at a time: not efficient!
                # http://developerweb.net/viewtopic.php?id=4006 has some suggestions
                if byte == b'\n':
                    break
                elif len(byte) == 0:
                    conn_closed = True
                    break
                else:
                    line += byte
            if conn_closed:
                break

            line = line.decode(encoding='UTF-8')
            line = line.rstrip()
            print("Input text:", line)

            # Perform the text-to-speech request on the text input with the selected
            # voice parameters and audio file type

            # Set the text input to be synthesized
            print('Synthesizing Audio')
            synthesis_input = texttospeech.SynthesisInput(text=line)

            response = client.synthesize_speech(
                input=synthesis_input, voice=voice, audio_config=audio_config
            )
            audio_bytes = response.audio_content[44:]  # header of length 44 at the start
            print('Audio Synthesized')
            audio_packet_queue.put(audio_bytes)

    elif text_input_from == 'file':
        start_audio_input_thread.set()
        with open(text_file_path) as f:
            for line in f:
                line = line.rstrip()
                print("Input text: " + line)

                # Perform the text-to-speech request on the text input with the selected
                # voice parameters and audio file type

                # Set the text input to be synthesized
                print('Synthesizing Audio')
                synthesis_input = texttospeech.SynthesisInput(text=line)

                response = client.synthesize_speech(
                    input=synthesis_input, voice=voice, audio_config=audio_config
                )
                audio_bytes = response.audio_content[44:]  # header of length 44 at the start
                print('Audio Synthesized')
                audio_packet_queue.put(audio_bytes)

    kill_audio_input_thread.set()


def audio_read_thread_from_callback(kill_audio_thread_callback, fifo_resemble_tts,
                                    last_generated_clip_id_queue,
                                    audio_packet_queue,
                                    kill_audio_input_thread):
    """
    Audio thread inspired by ../google_stt_tts/tts_socket_server.python
    Handles the pipe which receives audio data from a callback server once the resemble generates the audio.
    Puts output in audio_packet_queue.
    """
    # Initialize last_clip_id to keep track of when to exit the thread
    last_generated_clip_id = None

    # Read from fifo
    fifo = open(fifo_resemble_tts, 'rb')

    while True:
        # 16 bytes header in the pipe for every served request
        # First 8 bytes are id of the generated string
        # Next 8 bytes are length of string to be read
        # Note that: fifo reads are non-blocking in python
        audio_data = b''
        header_data = fifo.read(16)
        if len(header_data) != 0:
            fetched_clip_id = (header_data[0:8]).decode()
            num_bytes_to_fetch = int.from_bytes(header_data[8:], 'big')

            # print(len(header_data))
            audio_data = fifo.read(num_bytes_to_fetch)

        if not last_generated_clip_id_queue.empty():
            last_generated_clip_id = last_generated_clip_id_queue.get()

        if fetched_clip_id == last_generated_clip_id:
            # required to know when the text is completed to exit cleanly
            kill_audio_thread_callback.set()

        # start_time = time.time()
        if len(audio_data) > 0:
            audio_packet_queue.put(audio_data)
        # end_time = time.time()

        if kill_audio_thread_callback.is_set():
            kill_audio_input_thread.set()
            break


def text_to_audio_input_thread_handler(inqueue, outqueues, start_audio_input_thread, kill_audio_input_thread,
                                       BYTE_WIDTH, NUM_AUDIO_SAMPLES_PER_STEP, add_silence=True):
    """
    function to set up input audio connection, write output to queues. Writes in chunks of 200ms which was
    determined by Wav2Lip minimum audio latency for pretrained model to work.
    if add_silence is True, for every 200ms chunk if there is no audio received, the function adds silence.
    This ensures that if there was silence in audio input, the audio output keeps it.
    """
    # we work in 200 ms chunks
    time_per_write = 0.2
    current_audio_packet_data = b''
    desired_len = BYTE_WIDTH * NUM_AUDIO_SAMPLES_PER_STEP
    KILL_THREAD = False
    # block till we have start_audio_input_thread event (set when connection to peer established)
    while not start_audio_input_thread.is_set():
        pass
    while True:
        start_time = time.time()
        while not inqueue.empty():
            # first check if we have new data coming in
            current_audio_packet_data += inqueue.get()
        if len(current_audio_packet_data) >= desired_len:
            audio_bytes_to_write = current_audio_packet_data[:desired_len]
            current_audio_packet_data = current_audio_packet_data[desired_len:]
            for q in outqueues:
                q.put(audio_bytes_to_write)
        else:
            if add_silence:
                audio_bytes_to_write = current_audio_packet_data + bytearray(desired_len -
                                                                             len(current_audio_packet_data))
                current_audio_packet_data = b''
                for q in outqueues:
                    q.put(audio_bytes_to_write)

        if KILL_THREAD and len(current_audio_packet_data) < desired_len:
            # Throw in the remaining audio data in pipe as no more audio data is expected, and add kill character
            # for processes.
            audio_bytes_to_write = current_audio_packet_data + bytearray(desired_len -
                                                                         len(current_audio_packet_data))
            for q in outqueues:
                q.put(audio_bytes_to_write)
                q.put('BREAK')
            break
        if kill_audio_input_thread.is_set():
            KILL_THREAD = True

        time.sleep(time_per_write - time.time() + start_time)



def audio_input_thread_handler(audio_input_from, outqueues, audio_port,
                               kill_audio_input_thread, audio_file_path,
                               BYTE_WIDTH, NUM_AUDIO_SAMPLES_PER_STEP, audio_sr, ):
    """
    function to take input audio connection as is, and write output to queues
    """
    if audio_input_from == 'socket':
        HOST = ''
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.bind((HOST, audio_port))
        print('Listening for incoming connection on port', audio_port)
        s.listen(1)
        conn, addr = s.accept()
        print('Connected by', addr)

        # we work in 200 ms chunks
        desired_len = BYTE_WIDTH * NUM_AUDIO_SAMPLES_PER_STEP

        # At each step we get data for NUM_AUDIO_SAMPLES_PER_STEP (multiply by BYTE_WIDTH = 2
        # to obtain number of bytes to read)
        # socket.MSG_WAITALL: this parameter ensures we wait till sufficient frames received

        while True:
            conn_closed = False
            audio_bytes_to_write = conn.recv(desired_len, socket.MSG_WAITALL)
            if len(audio_bytes_to_write) == 0:
                conn_closed = True
            for q in outqueues:
                q.put(audio_bytes_to_write)
            if conn_closed:
                for q in outqueues:
                    q.put('BREAK')
                break
        kill_audio_input_thread.set()
    elif audio_input_from == 'file':
        # audio file case
        print('Extracting raw audio...')
        temp_audio_file = 'temp.wav'
        # convert to 16 kHz wav file
        command = 'ffmpeg -y -i {} -strict -2 -ar {} {}'.format(audio_file_path, audio_sr, temp_audio_file)
        print(command)
        subprocess.call(command, shell=True)
        wf = wave.open(temp_audio_file, 'rb')
        # we send wav audio in 200 ms chunks, with gap between sending chunks to simulate real-time transmission
        assert wf.getsampwidth() == BYTE_WIDTH
        assert wf.getframerate() == audio_sr
        assert wf.getnchannels() == 1  # Only supports mono channel audio (not stereo)
        print("start sending wav file")
        audio_sent = 0.0  # in s
        while True:
            audio_bytes_to_write = wf.readframes(NUM_AUDIO_SAMPLES_PER_STEP)
            if len(audio_bytes_to_write) == 0:
                break
            for q in outqueues:
                q.put(audio_bytes_to_write)
        for q in outqueues:
            q.put('BREAK')
        os.remove(temp_audio_file)


def audio_thread_handler(fifo_filename_audio, audio_inqueue):
    """
    receive audio from audio_inqueue and write to fifo_filename_audio pipe in chunks
    """
    fifo_audio_out = open(fifo_filename_audio, "wb")
    # this blocks until the read for the fifo opens so we run in separate thread

    # read frame one by one, process and write to fifo pipe
    while True:
        in_audio_frame = audio_inqueue.get()
        # if len(in_audio_frame) == 0:
        #     break
        if in_audio_frame == 'BREAK':
            break
        ffmpeg_stream.write_audio_frame(fifo_audio_out, in_audio_frame)
    fifo_audio_out.close()


def txt2vid_inference(fifo_filename_video, audio_inqueue, fps, checkpoint_path,
                      BYTE_WIDTH, NUM_AUDIO_SAMPLES_PER_STEP, audio_sr, mel_step_size,
                      wav2lip_batch_size, device,
                      face, resize_factor, rotate, crop,
                      face_det_batch_size, pads, nosmooth, box, static,
                      img_size):
    """
    Function to take audio from queue and use wav2lip to generate frames and put them in video fifo
    """
    # Get frames from input video
    full_frames = preprocess_video(face, fps, resize_factor, rotate, crop)

    # run face detection (precompute)
    face_det_results = face_detect_wrapper(full_frames,
                                           device,
                                           face_det_batch_size, pads,
                                           nosmooth, box, static)

    # Overall process works like this:
    # - split wav file into small chunks
    # - Initiate output stream for writing frames to intermediate video file
    # - Go through the audio chunks one by one. For each chunk:
    #     - compute melspectrrogram: mels
    #     - convert mel into overlapping chunks (#chunks = #frames corresponding to audio chunk, e.g., for 200 ms audio and fps 25, we get 5 frames)
    #     - Now go through the mel_chunks and the input video frames, and run NN to compute the output frame one by one, which are written to the output stream
    # - Combine the output file with video with the original audio file to get final output

    # mel_idx_multiplier: this is supposed to align the audio melspec to the video fps,
    # by default set to 80.0/fps. This determines the mel chunking process, defining the
    # by which we move a window of size mel_step_size (16). For very short audio chunks, the
    # default vale doesn't work well due to rounding effects and edge effects leading to very
    # short mel vector relative to audio length. We fix this by reducing the mel_idx_multiplier
    # which reduces the offsets of the consecutive mel chunks, and makes sure we get enough
    # frames for each audio chunk.
    # NOTE: The value has been chosen for fps=25, and NUM_AUDIO_SAMPLES_PER_STEP 3200. For other values, please recalculate
    mel_idx_multiplier = 15.0 / fps

    model = load_model(checkpoint_path, device)
    print("Model loaded")

    # Setup video streaming pipe:
    fifo_video_out = open(fifo_filename_video, "wb")

    frames_done = 0
    audio_received = 0.0
    audio_data = audio_inqueue.get()
    while len(audio_data) == NUM_AUDIO_SAMPLES_PER_STEP * BYTE_WIDTH:
        # break when exactly desired length not received (so very last packet might be lost)
        audio_received += NUM_AUDIO_SAMPLES_PER_STEP / audio_sr
        curr_wav = librosa.util.buf_to_float(audio_data, n_bytes=BYTE_WIDTH)  # convert to float
        #       print(curr_wav.shape)
        #       print('start:',audio_step*NUM_AUDIO_SAMPLES_PER_STEP)
        #       print('end:',(audio_step+1)*NUM_AUDIO_SAMPLES_PER_STEP)
        mel = audio.melspectrogram(curr_wav)
        #        print(curr_wav)
        # print(mel.shape)

        if np.isnan(mel.reshape(-1)).sum() > 0:
            raise ValueError(
                'Mel contains nan! Using a TTS voice? Add a small epsilon noise to the wav file and try again')

        # mel_chunk generation process. Generate overlapping chunks, with the shift in
        # chunks determined by int(i * mel_idx_multiplier), and the chunk length is
        # mel_step_size = 16 (except for last chunk). Two important constraints to satisfy:
        # 1. len(mel_chunks) should be equal to number of frames to be generated according to
        #    fps and NUM_AUDIO_SAMPLES_PER_STEP
        # 2. Each mel_chunk must be sufficiently long otherwise NN gives error.
        mel_chunks = []

        i = 0
        while 1:
            start_idx = int(i * mel_idx_multiplier)
            if start_idx + mel_step_size > len(mel[0]):
                mel_chunks.append(mel[:, len(mel[0]) - mel_step_size:])
                break
            mel_chunks.append(mel[:, start_idx: start_idx + mel_step_size])
            i += 1

        # print("Length of mel chunks: {}".format(len(mel_chunks)))

        batch_size = wav2lip_batch_size
        gen = datagen(full_frames, face_det_results, mel_chunks, frames_done,
                      static, img_size, wav2lip_batch_size)

        for i, (img_batch, mel_batch, frames, coords) in enumerate(gen):

            img_batch = torch.FloatTensor(np.transpose(img_batch, (0, 3, 1, 2))).to(device)
            mel_batch = torch.FloatTensor(np.transpose(mel_batch, (0, 3, 1, 2))).to(device)

            with torch.no_grad():
                pred = model(mel_batch, img_batch)

            pred = pred.cpu().numpy().transpose(0, 2, 3, 1) * 255.

            for p, f, c in zip(pred, frames, coords):
                y1, y2, x1, x2 = c
                p = cv2.resize(p.astype(np.uint8), (x2 - x1, y2 - y1))

                f[y1:y2, x1:x2] = p

                out_frame_BGR = f.copy()
                out_frame_RGB = out_frame_BGR[:, :, [2, 1, 0]]
                frames_done += 1

                # write to pipe
                ffmpeg_stream.write_video_frame(fifo_video_out, out_frame_RGB)

        print('Generated', frames_done, 'frames from', '{:.1f}'.format(audio_received), 's of received audio')

        audio_data = audio_inqueue.get()

        if audio_data == 'BREAK':
            print("=" * 50)
            print('Closing Fifo Video')
            print("=" * 50)
            fifo_video_out.close()
            break

        # if kill_audio_input_thread:
        #     break

    # print('Closing Fifo Audio')
    # fifo_video_out.close()

    # out.release()

    # # combine original audio and generated video
    # command = 'ffmpeg -y -i {} -i {} -strict -2 -q:v 1 {}'.format(args.audio, 'temp/result.avi', args.outfile)
    # subprocess.call(command, shell=platform.system() != 'Windows')
