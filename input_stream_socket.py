# Script to stream input from local machine
# Supports:
# 1) streaming of text via terminal
# 2) streaming of text via Google STT
# 3) streaming of audio by taking input from mic

# streams to a socket on a host server and IP

# Based on:
# http://sharewebegin.blogspot.com/2013/06/real-time-voice-chat-example-in-python.html
# https://github.com/googleapis/python-speech/blob/master/samples/microphone/transcribe_streaming_mic.py
# https://cloud.google.com/speech-to-text/docs/streaming-recognize#performing_streaming_speech_recognition_on_an_audio_stream

import argparse
import socket
import zlib
import re
from google.cloud import speech
import os
from six.moves import queue
import pyaudio

parser = argparse.ArgumentParser(description='Stream input from your local computer.')

# input type and source
parser.add_argument('-it', '--input_type', choices=['audio', 'text'], default='text',
                    help='Whether want to stream audio or text.')
parser.add_argument('-tif', '--text_input_from', choices=['terminal', 'Google'], default='terminal',
                    help='For text whether want to stream text from terminal or from Google STT.')

# socket params
parser.add_argument('--HOST', default='popeye2.stanford.edu',
                    help='Host you are trying to transfer text to. Keep it blank if running the code on same machine as'
                         ' the one recording text input.')
parser.add_argument('-ip', '--PORT', default=50007,
                    help='port for forwarding the text data')

# google api params
parser.add_argument('-gc', '--google_credential', default='google_stt_tts/text2vid-3d1ad0183321.json',
                    help='Need google credential to use Google STT')
parser.add_argument('-gsr', '--google_sampling_rate', default=16000, help='Sampling rate for google audio')

# audio params
parser.add_argument('-ac', '--audio_stream_chunk', default=3200,
                    help='Chunk audio in these many samples. Correspond to 200ms for 16kHz sampling rate which is '
                         'what Wav2Lip works with at minimum.')
parser.add_argument('-asr', '--audio_sampling_rate', default=16000, help='Sampling rate for audio. Default value 16kHz.')


args = parser.parse_args()

input_type = args.input_type
if input_type == 'text':
    text_input_from = args.text_input_from

    if text_input_from == 'Google':
        google_credential = args.google_credential
        # Google credential for STT
        # ToDO: add how to get google credentials for someone else in readme
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = google_credential

        # Audio recording parameters
        rate = args.google_sampling_rate
        chunk = int(rate / 10)  # 100ms
elif input_type == 'audio':
    CHUNK = args.audio_stream_chunk
    FORMAT = pyaudio.paInt16  # 2 byte (default wav)
    CHANNELS = 1  # mono
    RATE = args.audio_sampling_rate  # 16 kHz
    WIDTH = 2  # corresponds to FORMAT


HOST = args.HOST
PORT = int(args.PORT)
print('Host Machine:', HOST)
print('Port Connecting to:', PORT)

# connect to server
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.connect((HOST, PORT))


def text_from_terminal(text_socket):
    line = None
    compress = False
    while True:
        line = input("Enter text to be converted. Enter ESC if want to quit.\n")
        if line == 'ESC':
            break
        # add a newline character for server to know to generate audio till this point
        line = line + '\n'
        if not compress:
            text_socket.send(line.encode('UTF-8'))
        # Compress using gzip
        # Wasn't useful for us as we send very small sentences during our application while streaming
        else:
            # try compressing the string
            line = line.encode('UTF-8')
            print('To compress')
            print(line)

            z = zlib.compressobj()

            gzip_compressed_data = z.compress(line) + z.flush()
            # gzlen = len(gzip_compressed_data)

            print('Compressed')
            print(gzip_compressed_data)

            text_socket.send(gzip_compressed_data)


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


def listen_print_loop(responses, text_socket):
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
        text_socket.sendall(final_string.encode())

        # Exit recognition if any of the transcribed phrases could be
        # one of our keywords.
        if re.search(r"\b(exit|quit)\b", transcript, re.I):
            print("Exiting..")
            break


def text_from_google(RATE, CHUNK, text_socket):
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

    with MicrophoneStream(RATE, CHUNK) as stream:
        audio_generator = stream.generator()
        requests = (
            speech.StreamingRecognizeRequest(audio_content=content)
            for content in audio_generator
        )

        responses = client.streaming_recognize(streaming_config, requests)

        # Now, put the transcription responses to use.
        listen_print_loop(responses, text_socket)


def audio_from_microphone(FORMAT, CHANNELS, RATE, CHUNK, audio_socket):
    # use mic input
    p = pyaudio.PyAudio()
    stream = p.open(format=FORMAT,
                    channels=CHANNELS,
                    rate=RATE,
                    input=True,
                    frames_per_buffer=CHUNK)

    print("*recording")
    audio_sent = 0.0  # in s
    while True:
        data = stream.read(CHUNK)
        audio_socket.sendall(data)
        audio_sent += CHUNK / RATE
        print('Sent', '{:.1f}'.format(audio_sent), 's of audio', end='\r')

    print("Done recording")

    # close recorder
    stream.stop_stream()
    stream.close()
    p.terminate()


def main():
    # For text streaming
    if input_type == 'text':
        # From terminal, just record the input line by line and put it in the socket with appropriate format.
        if text_input_from == 'terminal':
            text_from_terminal(s)
        elif text_input_from == 'Google':
            text_from_google(rate, chunk, s)
    elif input_type == 'audio':
        audio_from_microphone(FORMAT, CHANNELS, RATE, CHUNK, s)
    s.close()

if __name__ == '__main__':
    main()
