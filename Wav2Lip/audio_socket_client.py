# based on http://sharewebegin.blogspot.com/2013/06/real-time-voice-chat-example-in-python.html

# Usage: python client.py [audio_file]
# by default takes input from mic, unless a input file parameter is provided 
# stops when either audio file ends, or when interrupt with ctrl-c 

# requires pyaudio (https://people.csail.mit.edu/hubert/pyaudio/)

import socket
import pyaudio
import wave
import sys
import subprocess
import time
import os

AUDIO_FILE = None

if len(sys.argv) == 2:
    AUDIO_FILE = sys.argv[1]

#record
CHUNK = 3200 # 200ms for RATE 16000 Hz
FORMAT = pyaudio.paInt16 # 2 byte (default wav)
CHANNELS = 1 # mono
RATE = 16000 # 16 kHz
WIDTH = 2 # corresponds to FORMAT

HOST = 'popeye2.stanford.edu'    # The remote host (leave blank for localhost)
PORT = 50007              # Put the same port as used by the server

# connect to server
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.connect((HOST, PORT))

if AUDIO_FILE is not None:
    # audio file case
    print('Extracting raw audio...')
    TEMP_AUDIO_FILE = 'temp.wav'
    # convert to 16 kHz wav file
    command = 'ffmpeg -y -i {} -strict -2 -ar {} {}'.format(AUDIO_FILE, RATE, TEMP_AUDIO_FILE)
    print(command)
    subprocess.call(command, shell=True)
    wf = wave.open(TEMP_AUDIO_FILE, 'rb')
    # we send wav audio in 200 ms chunks, with gap between sending chunks to simulate real-time transmission
    time_interval_between_chunks = (CHUNK)/RATE # in seconds
    assert wf.getsampwidth() == WIDTH
    assert wf.getframerate() == RATE
    assert wf.getnchannels() == CHANNELS
    print("*start sending wav file")
    audio_sent = 0.0 # in s
    while True:
        start_time = time.time()
        data = wf.readframes(CHUNK)
        if len(data) < CHUNK*WIDTH:
            break
        s.sendall(data)
        audio_sent += CHUNK/RATE
        print('Sent','{:.1f}'.format(audio_sent),'s of audio',end='\r')
        time.sleep(time_interval_between_chunks-time.time()+start_time) # wait a bit till the time for the next frame comes
    print()
    print("*done sending wav file")
    os.remove(TEMP_AUDIO_FILE)
else:
    # use mic input
    p = pyaudio.PyAudio()
    stream = p.open(format=FORMAT,
                    channels=CHANNELS,
                    rate=RATE,
                    input=True,
                    frames_per_buffer=CHUNK)

    print("*recording")
    audio_sent = 0.0 # in s
    while True:
        data  = stream.read(CHUNK)
        s.sendall(data)
        audio_sent += CHUNK/RATE
        print('Sent','{:.1f}'.format(audio_sent),'s of audio',end='\r')
    print()

    print("*done recording")

    # close recorder
    stream.stop_stream()
    stream.close()  
    p.terminate() 
    
s.close() # close connection

print("*closed")
