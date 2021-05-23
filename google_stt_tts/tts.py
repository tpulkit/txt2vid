#!/usr/bin/env python
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

"""Google Cloud Text-To-Speech API sample application .
Example usage:
python tts.py textFile
Script that reads text from file and converts to audio in real-time
that is written to a ffmpeg process and played on http port with ffplay.

Based on https://cloud.google.com/text-to-speech/docs/samples/tts-quickstart
"""

import os
os.environ["GOOGLE_APPLICATION_CREDENTIALS"]="text2vid-3d1ad0183321.json"
from google.cloud import texttospeech
import time
import sys
import ffmpeg
import subprocess 

if len(sys.argv) != 3:
    print("Usage: python tts.py textFile outFile")
    sys.exit(1)

txtfile = sys.argv[1]
outfile = sys.argv[2]

# process for writing output to http url by taking input from audio pipe
def start_ffmpeg_process(fps, outfile):
    out_format = "avi"  # format supporting audio
    # server_url = "http://127.0.0.1:"+str(port) # any port should be fine, 127.0.0.1 is simply localhost

    # inputs: parameters largely the same as in the previous two functions
    input_audio = ffmpeg.input('pipe:', format='s16le', acodec='pcm_s16le', ac=1, ar=str(fps))
	
    # combine the two and output to url (listen = 1 probably sets the server)
    args = (
        ffmpeg
        .output(input_audio,outfile)#input_audio, server_url, listen=1, f=out_format)
        .global_args('-y')
        .compile()
    )
    return subprocess.Popen(args, stdin=subprocess.PIPE)

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
sample_rate_hertz=fps)

ffmpeg_process = start_ffmpeg_process(fps, outfile)

with open(txtfile) as f:
    for line in f:
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
        ffmpeg_process.stdin.write(response.audio_content[44:]) # header of length 44 at the start
    
        stop_time = time.time()
        print("Received response in ","{:.2f}".format(stop_time-start_time),"s")

ffmpeg_process.stdin.close()
ffmpeg_process.wait()
