from flask import Flask, request, Response
import requests
from io import BytesIO
from scipy.io import wavfile
# from multiprocessing import shared_memory

# import resemble_globals
# import tts_file
#
# def update_global_value(audio_data):
#     resemble_globals.resemble_audio = audio_data

app = Flask(__name__)

@app.route('/', methods=['POST'])
def respond():
    print(request.json)
    wav_download_url = request.json['url']
    print(wav_download_url)

    audio_raw = requests.get(wav_download_url)
    sr, audio_data = wavfile.read(BytesIO(audio_raw.content))

    # shm = shared_memory.SharedMemory(create=True, size=audio_data.nbytes)
    # print(shm.name)
    # audio_content = np.ndaraay(audio_data.shape, dtype = audio_data.dtype, buffer = shm.buf)
    # audio_content[:] = audio_data[:]

    # update_global_value(audio_data)
    # resemble_globals.a = [2]

    # tts_file.audio_content = audio_data

    # print('Global variable modified to:')
    # print(resemble_globals.resemble_audio)
    # print(tts_file.audio_content)

    # Write audio file to debug
    # wavfile.write('../Wav2Lip/results/resemble_tts_try.wav', sr, audio_data)
    # wavfile.write('../Wav2Lip/results/resemble_tts_try2.wav', sr, resemble_globals.resemble_audio)
    return Response(status=200)