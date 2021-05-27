'''
Code that gets audio stream from mic, converts to text using google API 
and sends to server using websocket on port PORT. 

Code largely based on 
https://github.com/googleapis/python-speech/blob/master/samples/microphone/transcribe_streaming_mic.py
https://cloud.google.com/speech-to-text/docs/streaming-recognize#performing_streaming_speech_recognition_on_an_audio_stream

Usage: python stt_stream_socket_client.py PORT
'''

from __future__ import division

import re
import sys

from google.cloud import speech

import pyaudio
from six.moves import queue

import socket

import os
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "text2vid-3d1ad0183321.json"

# Audio recording parameters
RATE = 16000
CHUNK = int(RATE / 10)  # 100ms

if len(sys.argv) != 2:
    print("Usage: python stt_stream_socket_client.py PORT")
    sys.exit(1)

HOST = 'popeye2.stanford.edu'  # The remote host (leave blank for localhost, put server name for popeye2)
PORT = int(sys.argv[1])        # should be the same port as used by the server

class MicrophoneStream(object):
    """Opens a recording stream as a generator yielding the audio chunks."""

    def __init__(self, rate, chunk):
        self._rate = rate
        self._chunk = chunk

        # Create a thread-safe buffer of audio data
        self._buff = queue.Queue()
        self.closed = True

    def __enter__(self):
        self._audio_interface = pyaudio.PyAudio()
        self._audio_stream = self._audio_interface.open(
            format=pyaudio.paInt16,
            # The API currently only supports 1-channel (mono) audio
            # https://goo.gl/z757pE
            channels=1,
            rate=self._rate,
            input=True,
            frames_per_buffer=self._chunk,
            # Run the audio stream asynchronously to fill the buffer object.
            # This is necessary so that the input device's buffer doesn't
            # overflow while the calling thread makes network requests, etc.
            stream_callback=self._fill_buffer,
        )

        self.closed = False

        return self

    def __exit__(self, type, value, traceback):
        self._audio_stream.stop_stream()
        self._audio_stream.close()
        self.closed = True
        # Signal the generator to terminate so that the client's
        # streaming_recognize method will not block the process termination.
        self._buff.put(None)
        self._audio_interface.terminate()

    def _fill_buffer(self, in_data, frame_count, time_info, status_flags):
        """Continuously collect data from the audio stream, into the buffer."""
        self._buff.put(in_data)
        return None, pyaudio.paContinue

    def generator(self):
        while not self.closed:
            # Use a blocking get() to ensure there's at least one chunk of
            # data, and stop iteration if the chunk is None, indicating the
            # end of the audio stream.
            chunk = self._buff.get()
            if chunk is None:
                return
            data = [chunk]

            # Now consume whatever other data's still buffered.
            while True:
                try:
                    chunk = self._buff.get(block=False)
                    if chunk is None:
                        return
                    data.append(chunk)
                except queue.Empty:
                    break

            yield b"".join(data)


def listen_print_loop(responses, s):
    """Iterates through server responses and prints them.

    The responses passed is a generator that will block until a response
    is provided by the server.

    Each response may contain multiple results, and each result may contain
    multiple alternatives; for details, see https://goo.gl/tjCPAU.  Here we
    print only the transcription for the top alternative of the top result.
    """
    for response in responses:
        if not response.results:
            continue
        # The `results` list is consecutive. For streaming, we only care about
        # the first result being considered, since once it's `is_final`, it
        # moves on to considering the next utterance.
        result = response.results[0]
        if not result.alternatives:
            continue

        # Display the transcription of the top alternative.
        transcript = result.alternatives[0].transcript
        final_string = transcript
        print(final_string)
        final_string = final_string.rstrip()
        final_string = final_string + '\n'
        s.sendall(final_string.encode())

        # Exit recognition if any of the transcribed phrases could be
        # one of our keywords.
        if re.search(r"\b(exit|quit)\b", transcript, re.I):
            print("Exiting..")
            break


def main():
    # See http://g.co/cloud/speech/docs/languages
    # for a list of supported languages.
    language_code = "en-US"  # a BCP-47 language tag

    client = speech.SpeechClient()
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        sample_rate_hertz=RATE,
        language_code=language_code,
        enable_automatic_punctuation=True,
    )

    streaming_config = speech.StreamingRecognitionConfig(
        config=config
    )

    # connect to server
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.connect((HOST, PORT))

    with MicrophoneStream(RATE, CHUNK) as stream:
        audio_generator = stream.generator()
        requests = (
            speech.StreamingRecognizeRequest(audio_content=content)
            for content in audio_generator
        )

        responses = client.streaming_recognize(streaming_config, requests)

        # Now, put the transcription responses to use.
        listen_print_loop(responses, s)

    s.close() # close connection

if __name__ == "__main__":
    main()
