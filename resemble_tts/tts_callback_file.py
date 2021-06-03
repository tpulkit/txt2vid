from flask import Flask, request, Response
import requests
from io import BytesIO
from scipy.io import wavfile
import librosa

app = Flask(__name__)

@app.route('/', methods=['POST'])
def respond():
    # print(request.json)
    request_id = request.json['id']
    print('Request ID: ', request_id)
    wav_download_url = request.json['url']
    print('Download URL:', wav_download_url)

    audio_raw = requests.get(wav_download_url)
    # Use librosa to convert sr to 16k required by wav2lip from 44.1k provided by resemble
    # also ensure the correct dtypes of audio data for functions to work
    orig_sr = 44100
    final_sr = 16000
    sr, audio_data = wavfile.read(BytesIO(audio_raw.content))
    audio_data = librosa.resample(audio_data.astype('float32'), orig_sr, final_sr).astype('int16')

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


