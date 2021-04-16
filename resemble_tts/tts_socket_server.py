'''
Resemble socket: Picks from ../google_stt_tts/tts_socket_server.py and also uses a callback server
as described by callback_function_TTS. Uses pause processing as described in ../google_stt_tts/tts_socket_server.py

Ensure to launch callback server from tts_callback_file, and ensuring ngrosk is running and thus putting the
ip public.
ToDO: Add more comments and run-time descriptions.

Uses resemble API based on https://app.resemble.ai/docs to do TTS (text-to-speech).

Input: reads from a socket
Output: wav file
'''
#Imports
import os
import time
import ffmpeg
import subprocess
import threading
import requests
import copy
import argparse
import json
import queue
import socket

# Input arguments
parser = argparse.ArgumentParser()
parser.add_argument("-ip", "--input_port", help='Path to input text file', required=True)
parser.add_argument("-o", "--OUTFILE", help='Output wav file (specify .wav)', required=True)
parser.add_argument("-fps", "--fps", help="specifies audio sr, defaulted to 16000", default=16000)
# Verify fps here is same as the one implemented in callback function tts_callback_file
parser.add_argument("-u", "--user", help="name of user to pick voice in resemble project", default="Pulkit Tandon")
parser.add_argument("-e", "--emotion", help="emotion of voice to be generated", default="None",
                    choices=['neutral', 'angry', 'annoyed', 'question', 'happy'])
parser.add_argument("-p", "--project_id", help="project id at resemble", default="None")
parser.add_argument("-t", "--text_title", help="text title inside project", default="Demo")

## Add as input the ngrok link for callback_uri??

args = parser.parse_args()

PORT = int(args.input_port)
OUTFILE = args.OUTFILE
fps = int(args.fps)
user = args.user
emotion = args.emotion
if emotion == "None":
    emotion = None
project_id = args.project_id
text_title = f'{args.text_title}_{user}_{emotion}'

# Define resemble variables
resemble_config_data = json.load(open('resemble_config.json'))
# User API token for access
user_token = resemble_config_data['users'][user]['token']
# Project to consider
if project_id == "None":
    project_uuid = resemble_config_data['project_uuid']
# User ID (uuid) for voice
user_voice = resemble_config_data['users'][user]['voice_id']

def generate_voice_fn(project_uuid, user_token, text_title, text_input, user_voice, emotion = None):
    ## Using API asynchronously to generate some text
    url = "https://app.resemble.ai/api/v1/projects/" + project_uuid + "/clips"
    headers = {
        'Authorization': 'Token token=' + user_token,
        'Content-Type': 'application/json'
    }
    if emotion is not None:
        text_input_em = f'<speak><resemble:style emotions = "{emotion}">{text_input}</resemble:style></speak>'
    else:
        text_input_em = copy.copy(text_input)

    # print(text_input_em)

    data = {
        'data': {
            'title': text_title,
            'body': text_input_em,
            'voice': user_voice,
        },
        # "callback_uri": "https://mycall.back/service" # default
        # "callback_uri": "https://webhook.site/c08d0ced-0450-43a9-8f62-00482545bfcc" #webhook site
        "callback_uri": "https://7fd2364008af.ngrok.io" #server ngrok
        # "callback_uri": "https://63ea99b482e1.ngrok.io"  # local ngrok
    }
    print(data["callback_uri"])
    response = requests.post(url, headers=headers, json=data)
    print('Generating clip using API')
    print(response.json())
    return response.json()['id']

def start_ffmpeg_process(fps, outfile, port=8081):
    '''
    :param fps:
    :param port:
    :param outfile:
    :return:

    Utilizes ffmpeg to write to outfile
    '''
    out_format = "avi"  # format supporting audio
    server_url = "http://127.0.0.1:" + str(port)  # any port should be fine, 127.0.0.1 is simply localhost

    # inputs: parameters largely the same as in the previous two functions
    # pipe here means take input from the stdin pipe
    input_audio = ffmpeg.input('pipe:', format='s16le', acodec='pcm_s16le', ac=1, ar=str(fps))

    # combine the two and output to url (listen = 1 probably sets the server)
    args = (
        ffmpeg
            .output(input_audio, outfile)  # input_audio, server_url, listen=1, f=out_format)
            .overwrite_output()
            .compile()
    )
    return subprocess.Popen(args, stdin=subprocess.PIPE)

def audio_read_thread_from_callback(kill_audio_thread, fifo_resemble_tts,
                                    last_generated_clip_id_queue, audio_packet_queue):
    '''
    :param ffmpeg_process:
    :param fifo_resemble_tts:
    :return:

    Audio thread inspired by ../google_stt_tts/tts_socket_server.python
    Handles the pipe which receives audio data from a callback server once the resemble generates the audio.
    Puts output in audio_packet_queue.
    '''
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

        # print('From audio thread: ' + last_generated_clip_id)
        # print('From audio thread: ' + fetched_clip_id)
        # print('From audio thread: ' + str(len(tmp_data)))

        if fetched_clip_id == last_generated_clip_id:
            # required to know when the text is completed to exit cleanly
            kill_audio_thread.set()

        # start_time = time.time()
        if len(audio_data) > 0:
            audio_packet_queue.put(audio_data)
        # end_time = time.time()
        # print(f'Callback took {end_time-start_time} to write in audio_packet_queue.')

        if kill_audio_thread.is_set():
            break

def audio_thread_handler(kill_audio_thread, ffmpeg_process, audio_packet_queue):
    # we work in 200 ms chunks
    time_per_write = 0.2
    num_audio_bytes_per_write = int(fps*time_per_write*2) # for 200 ms, 2 bytes per frame
    current_audio_packet_data = b''
    while True:
        # print(time_per_write)
        start_time = time.time()
        audio_bytes_to_write = b''
        # print(audio_packet_queue.empty())
        while not audio_packet_queue.empty():
            # first check if we have new data coming in
            # print('Fetching Data')
            current_audio_packet_data += audio_packet_queue.get()
        # print(time.time()-start_time)
        if len(current_audio_packet_data) >= num_audio_bytes_per_write:
            audio_bytes_to_write = current_audio_packet_data[:num_audio_bytes_per_write]
            current_audio_packet_data = current_audio_packet_data[num_audio_bytes_per_write:]
            # print('More data than worth 200ms.')
            # print(f'Audio bytes to write size {len(audio_bytes_to_write)}')
            # print(f'Buffer audio bytes size {len(current_audio_packet_data)}')
        else:
            audio_bytes_to_write = current_audio_packet_data + bytearray(num_audio_bytes_per_write-len(current_audio_packet_data))
            current_audio_packet_data = b''
            # print('Less data than worth 200ms.')
            # print(f'Audio bytes to write size {len(audio_bytes_to_write)}')
            # print(f'Buffer audio bytes size {len(current_audio_packet_data)}')
        # print(time.time() - start_time)
        ffmpeg_process.stdin.write(audio_bytes_to_write)
        # print(time.time() - start_time)
        if kill_audio_thread.is_set() and len(current_audio_packet_data) == 0:
            break
        end_time = time.time()
        # print(end_time - start_time)
        sleep_time = time_per_write - end_time + start_time
        time.sleep(sleep_time)
        assert sleep_time >= 0, 'Sleep Time is Negative, something went wrong.'
### Main Code:

# Launch a queue to keep track of sent out generation jobs to resemble
last_generated_clip_id_queue = queue.Queue()

# Launch ffmpeg process
ffmpeg_process = start_ffmpeg_process(fps, OUTFILE)

# Set up websocket server and listen for connections
HOST = '' # Symbolic name meaning all available interfaces, popeye2.stanford.edu if running on popeye, else leave blank
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.bind((HOST, PORT))
print('Listening for incoming connection on port', PORT)
s.listen(1)
conn, addr = s.accept()
print('Connected by', addr)

# Setup pipe for transferring audio data from callback to the script
fifo_resemble_tts = '/tmp/fiforesembletts'
if os.path.exists(fifo_resemble_tts):
    os.remove(fifo_resemble_tts)

os.mkfifo(fifo_resemble_tts)
print('fifo exists now')

# Launch queue to transfer audio data from audio_callback thread to audio_processing thread from socket
audio_packet_queue = queue.Queue()

# Launch audio thread
kill_audio_thread_callback = threading.Event()
audio_thread_callback = threading.Thread(target=audio_read_thread_from_callback,args=(kill_audio_thread_callback,
                                    fifo_resemble_tts,
                                    last_generated_clip_id_queue, audio_packet_queue))
audio_thread_callback.start()
print('Callback Audio listening thread launched')

# Launch audio thread which enable pause detection etc and finally puts in ffmpeg
kill_audio_thread_main = threading.Event()
audio_thread_main = threading.Thread(target=audio_thread_handler,args=(kill_audio_thread_main, ffmpeg_process,
                                    audio_packet_queue))
audio_thread_main.start()
print('Audio writing to ffmpeg thread launched')

# Extract Input
# Currently does it line by line
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
        last_generated_clip_id_queue.put(generated_clip_id)
        break

    if line != b'':
        line = line.decode(encoding='UTF-8')
        line = line.rstrip()
        print("Input text:", line)

        # Send command to generate audio
        generated_clip_id = \
            generate_voice_fn(project_uuid, user_token, text_title, line, user_voice, emotion)
        print(generated_clip_id)


# Wait to receive all audio. Thread blocking call.
audio_thread_callback.join()
kill_audio_thread_main.set()
audio_thread_main.join()

# Exit cleanly from ffmpeg
ffmpeg_process.stdin.close()
ffmpeg_process.wait()