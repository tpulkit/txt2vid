from flask import Flask, request, Response
import requests
from io import BytesIO
from scipy.io import wavfile

app = Flask(__name__)

@app.route('/', methods=['POST'])
def respond():
    print(request.json)
    request_id = request.json['id']
    print(request_id)
    wav_download_url = request.json['url']
    print(wav_download_url)

    audio_raw = requests.get(wav_download_url)
    sr, audio_data = wavfile.read(BytesIO(audio_raw.content))
    # print(sr)
    # print(len(audio_data))

    audio_data_bytes = audio_data.tobytes()

    # Add a header in the beginning corresponding to the request being served -- 8 bytes from resemble_tts_try
    header_request_id = str.encode(request_id)

    # Add a header after request-id to tell the main receiving function how many bytes to read from the pipe
    # corresponding to this request -- 8 bytes
    data_len = len(audio_data_bytes)
    header_data_len = data_len.to_bytes(8, 'big')

    # Open a pipe and write data into it
    fifo_resemble_tts = '/tmp/fiforesembletts'
    fifo = open(fifo_resemble_tts, 'wb')

    pipe_content = header_request_id + header_data_len + audio_data_bytes

    fifo.write(pipe_content)
    # print(len(pipe_content))
    fifo.close()

    # Write audio file to debug
    # wavfile.write('../Wav2Lip/results/resemble_tts_try.wav', sr, audio_data)
    # wavfile.write('../Wav2Lip/results/resemble_tts_try2.wav', sr, resemble_globals.resemble_audio)
    return Response(status=200)


