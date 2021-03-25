#!/usr/bin/env python

'''
Script that receives text from websocket and converts to audio in real-time
that is written to a wav file using a ffmpeg process.
The ffmpeg process takes input from stdin pipe. 
The text is received on the main thread (with paragraphs separated by \n),
and is then send to google TTS API. Upon receiving the audio, it is written
to a queue which is read by a separate audio thread. 
The audio thread keeps checking every 200ms if there is sufficient data to be played
in the queue, if not it plays silence for the remaining time.

Code inspired by https://cloud.google.com/text-to-speech/docs/samples/tts-quickstart
'''

# Script Written by - Mikhail Kulin 2020 www.kulin.co
# Copyright 2018 Google Inc. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import os
os.environ["GOOGLE_APPLICATION_CREDENTIALS"]="text2vid-3d1ad0183321.json"
from google.cloud import texttospeech
import time
import sys
import ffmpeg
import subprocess 
import socket
import queue
import threading

if len(sys.argv) != 3:
    print("Usage: python tts_socket_server.py IN_PORT OUTFILEWAV")
    sys.exit(1)

# we write to a file

PORT = int(sys.argv[1]) # Use the same port in the client
OUTFILEWAV = sys.argv[2]

# process for writing output to outfile by taking input from audio pipe
def start_ffmpeg_process(fps):
    # inputs: parameters largely the same as in the previous two functions
    input_audio = ffmpeg.input('pipe:', format='s16le', acodec='pcm_s16le', ac=1, ar=str(fps))
	
    outfile = OUTFILEWAV

    # output to file
    args = (
        ffmpeg
        .output(input_audio,outfile)
        .global_args('-y') # overwrite outfile if exists
        .compile()
    )
    p = subprocess.Popen(args, stdin=subprocess.PIPE)
    return p

def audio_thread_handler(kill_audio_thread, ffmpeg_process, audio_packet_queue):
    # we work in 200 ms chunks 
    time_per_write = 0.2
    num_audio_bytes_per_write = int(fps*0.2*2) # for 200 ms, 2 bytes per frame
    current_audio_packet_data = b''
    while True:
        start_time = time.time()
        audio_bytes_to_write = b''
        while not audio_packet_queue.empty():
            # first check if we have new data coming in
            current_audio_packet_data += audio_packet_queue.get()
        if len(current_audio_packet_data) >= num_audio_bytes_per_write:
            audio_bytes_to_write = current_audio_packet_data[:num_audio_bytes_per_write]
            current_audio_packet_data = current_audio_packet_data[num_audio_bytes_per_write:]
        else:
            audio_bytes_to_write = current_audio_packet_data + bytearray(num_audio_bytes_per_write-len(current_audio_packet_data))
            current_audio_packet_data = b''
        ffmpeg_process.stdin.write(audio_bytes_to_write)
        if kill_audio_thread.is_set() and len(current_audio_packet_data) == 0:
            break
        time.sleep(time_per_write-time.time()+start_time)

# Instantiates a client

client = texttospeech.TextToSpeechClient()

# Build the voice request, select the language code ("en-US") and the ssml
# voice gender ("female")
voice = texttospeech.VoiceSelectionParams(
language_code='en-US',
name='en-IN-Wavenet-B',
ssml_gender=texttospeech.SsmlVoiceGender.MALE)

fps = 44100

# Select the type of audio file you want returned
audio_config = texttospeech.AudioConfig(
audio_encoding=texttospeech.AudioEncoding.LINEAR16,
sample_rate_hertz=fps,speaking_rate=1.0, pitch=5)

ffmpeg_process = start_ffmpeg_process(fps)

HOST = ''                 # Symbolic name meaning all available interfaces
# Set up websocket server and listen for connections
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.bind((HOST, PORT))
print ('Listening for incoming connection on port',PORT)
s.listen(1)
conn, addr = s.accept()
print ('Connected by', addr)

audio_packet_queue = queue.Queue()

kill_audio_thread = threading.Event()

audio_thread = threading.Thread(target=audio_thread_handler,args=(kill_audio_thread, ffmpeg_process, 
                                    audio_packet_queue))

audio_thread.start()

while True:
    line = b''
    conn_closed = False
    while True: # recv till newline
        # socket.MSG_WAITALL: this parameter ensures we wait till sufficient data received
        byte = conn.recv(1,socket.MSG_WAITALL)
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
    print("Input text:",line)

    start_time = time.time()
    # Perform the text-to-speech request on the text input with the selected
    # voice parameters and audio file type

    # Set the text input to be synthesized
    synthesis_input = texttospeech.SynthesisInput(text=line)

    response = client.synthesize_speech(
    input=synthesis_input, voice=voice, audio_config=audio_config
    )
    audio_bytes = response.audio_content[44:] # header of length 44 at the start
    audio_packet_queue.put(audio_bytes)

    stop_time = time.time()
    print("Received response in ","{:.2f}".format(stop_time-start_time),"s")

kill_audio_thread.set()
audio_thread.join()

ffmpeg_process.stdin.close()
ffmpeg_process.wait()
