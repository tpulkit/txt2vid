# Txt2Vid: Ultra-Low Bitrate Compression of Talking-Head Videos via Text

Repo containing code for txt2vid project. Gives a proof-of-concept for the following compression 
pipeline (for more details read the paper on [arXiv](https://arxiv.org/abs/2106.14014)):

![Motivation](https://github.com/tpulkit/txt2vid/blob/main/images/motivation.png)
![Pipeline](https://github.com/tpulkit/txt2vid/blob/main/images/block_diagram.png).

Though the pipeline is flexible and can be replaced by appropriate software programs performing same function, 
the code currently uses and allows for [Wav2Lip](https://github.com/Rudrabha/Wav2Lip) for lip-syncing, 
[Resemble](https://www.resemble.ai) or [Google](https://cloud.google.com/text-to-speech) APIs for 
personalized and general text-to-speech (TTS) synthesis respectively, and
[Google](https://cloud.google.com/speech-to-text) API for speech-to-text synthesis (STT). 
It uses [ffmpeg-python](https://github.com/kkroening/ffmpeg-python/tree/master/examples#audiovideo-pipeline)
to enable streaming.

## Table of Contents
* [Demo Videos](#Demo-Videos)
* [Installation Instructions](#Installation-Instructions)
  * [Notes](#Notes)
  * [Environment Setup](#Environment-Setup)
  * [Wav2Lip Setup](#Wav2Lip-Setup)
  * [Google STT and TTS Setup](#Google-STT-and-TTS-Setup)
  * [Resemble TTS Setup](#Resemble-TTS-Setup)
* [Use Cases](#Use-Cases)
  * [Storing txt2vid video as file using text or audio file available at server](#Storing-txt2vid-video-as-file-using-text-or-audio-file-available-at-server)
  * [Streaming txt2vid video on a port using text or audio file available at server](#Streaming-txt2vid-video-on-a-port-using-text-or-audio-file-available-at-server)
  * [Streaming txt2vid video on a port using streaming input from a sender](#Streaming-txt2vid-video-on-a-port-using-streaming-input-from-a-sender)

## Demo Videos

### Streaming txt2vid video on a port using streaming text input from terminal on a sender side
Click on the image below to play the demo video. 
[![Demo1](https://user-images.githubusercontent.com/22584025/120798568-2b0e8600-c55b-11eb-85f8-906f3148e825.png)](https://user-images.githubusercontent.com/22584025/120799025-cef83180-c55b-11eb-921d-0e9940b5f107.mp4)

### Streaming txt2vid video on a port using streaming text input from STT on a sender side
Click on the image below to play the demo video. 
[![Demo2](https://user-images.githubusercontent.com/22584025/120799213-12eb3680-c55c-11eb-8a58-86e79a9c5b21.png)](https://user-images.githubusercontent.com/22584025/120795869-ae2ddd00-c557-11eb-989e-67d4a30d5398.mp4)

## Installation Instructions

### Notes
* This setup assumes three machines -- sender, server and receiver. Some of them can be same.
  * sender -- machine from where streaming inputs will be provided, typically will be your local machine.
  * server -- machine where decoding is happening (where main code runs), should have GPU.
  * receiver -- machine for watching output streaming content, typically will be your local machine.

* Server can be same as receiver if the server has access to GPU for running streamable lip-syncing code. 
  In that case, port-forwarding for playing streaming video output using ffplay as described in sections below 
  is not necessary.
  
* Sender and Receiver can be different local machines.
  
* Abbreviations:
    * TTS = Text-to-Speech
    * STT = Speech-to-Text
  
### Environment Setup

Setup requirements using following steps on all machines (sender, server, receiver):

* Create conda environment:
  ```
  conda create --name myenv python=3.7
  conda activate myenv
  ```
  Note that 3.7 or above is integral for streaming to work,
  even though wav2lip repo uses 3.6. In particular, it is 
  essential for audio-video sync (AV sync) in a streaming fashion
  as both audio and videos are being handled separately. `myenv` is 
  the name of the environment you would like to keep.
  
* Ensure ffmpeg (and ffplay) are installed.
  ```
  sudo apt-get install ffmpeg
  ``` 
  (for macs use:
  ```brew install ffmpeg```, this also installs ffplay required
  for streaming video content locally).

* Install python dependencies.
  ```
  pip install -r requirements.txt
  ```

### Wav2Lip Setup
Make sure model files are downloaded and put in appropriate
folder from the `wav2lip` repo, on the machine where the decoding code will run (server).
* GAN model: `wav2lip_gan.pth` should be present in
  `Wav2Lip/checkpoints`. Pretrained model can be downloaded from following
  [link](https://iiitaphyd-my.sharepoint.com/:u:/g/personal/radrabha_m_research_iiit_ac_in/EdjI7bZlgApMqsVoEUUXpLsBxqXbn5z8VTmoxp55YNDcIA?e=n9ljGW).
* Face detection model: `s3fd.pth` should be present in 
  `Wav2Lip/face_detection/detection/sfd/s3fd.pth`. Pretrained model can be downloaded from 
  [link1](https://www.adrianbulat.com/downloads/python-fan/s3fd-619a316812.pth)
  or 
  [link2](https://iiitaphyd-my.sharepoint.com/:u:/g/personal/prajwal_k_research_iiit_ac_in/EZsy6qWuivtDnANIG73iHjIBjMSoojcIV0NULXV-yiuiIg?e=qTasa8).
    
### Google STT and TTS Setup
To use Google API for TTS or STT, ensure following steps are executed:
* Follow [instructions](https://cloud.google.com/docs/authentication/getting-started#creating_a_service_account)
  to create a service account (if it doesn't exist already), and download the json key.
* Follow [instructions](https://support.google.com/googleapi/answer/6158841?hl=en) ("enable and disable APIs")
  to add the following APIs to this project
    1. Cloud Speech-to-Text API
    2. Cloud Text-to-Speech API
* **Pass the path to the json key to the `-gc` parameter 
  for the relevant script runs using Google as STT/TTS.**
* **Note that:** Google APIs might ask for a billing account to enable them. But they allow
  free usage for reasonable number of characters. For pricing information you can 
  see: 
  [here](https://cloud.google.com/speech-to-text/pricing) and 
  [here](https://cloud.google.com/text-to-speech/pricing).
  
### Resemble TTS Setup
To use Resemble API, ensure following steps are executed:
* Create an account on [resemble.ai website](https://app.resemble.ai) and create your own 
  [voice](https://app.resemble.ai/voices) by recording 50-100 samples of audio data.
  Resemble allows training one free voice clone with an account. Create a new project. 
  
* Make `resemble_tts/resemble_config.json` with your data. This json has following structure:
  ```
  {
  "voices": { 
    <voice_name>: {
      "token": <api_token>,
      "voice_id": <voice_id>
      },
    } 
  "project_uuid": <project_uuid>
  }
  ```
  where all the variables are strings. `api_token` is the token used for API access 
  (found [here](https://app.resemble.ai/account/api)) and `voice_id` is 8 character resemble voice ID
  (can be found [here](https://app.resemble.ai/docs#voice) by executing the interactive example and copying
  the `uuid`). For default resemble voices, `voice_id` is same as the name of the default voice
  instead of unique 8 character ID. The `voice_name` can be any identifier string for the voice. 
  **Pass the `voice_name` to `--voice` parameter for the relevant script runs using Resemble as TTS.** 
  `project_uuid` is 8 character ID of the project where the voice will be created using the API 
  (can be found [here](https://app.resemble.ai/docs#project) by executing the interactive example and
  copying the `uuid` of the project to contain voice clips generated via API).
  
* **Callback Server setup** <br>
  * For the Resemble TTS to work via API, we use a callback server to receive the voice output
    generated by Resemble. On server (machine where decoding will happen), 
    launch the callback server by 
    ```
    cd resemble_tts
    export FLASK_APP=tts_callback_file.py
    python -m flask run -p <callback_port>
    ```
    This runs a callback server on `<callback_port>` port (default is `5000`) on the server. 
  * If the server's port `<callback_port>` is publicly accessible, then the callback from resemble can be received
    at `http://localhost:<callback_port>`. If server is inside a network, we need to provide a publicly 
    accessible port to the resemble for sending voice data. One way to do so could be to use
    `https://ngrok.com` for creating an HTTP tunnel. Create a ngrok account and
    follow [instructions](https://dashboard.ngrok.com/get-started/setup) to install
    it on your server. Launch tunnel forwarding to local port `<callback_port>` where the callback server is 
    listening by running: 
    ```
    ./ngrok http <callback_port>
    ```
    This port forwards a publicly accessible link to our
    callback server. The publicly accessible link (`<link>`) is
    available as output where the ngrok command was run in 
    `Forwarding` section as `<link> -> http://localhost:<callback_port>`.
  * **Pass the `<link>` variable or appropriate publicly accessible callback server address to the
    `--resemble_callback_url` parameter for the relevant script runs using Resemble as TTS.**


## Use-Cases
Currently, the repo allows following use cases:

![Use Cases](https://github.com/tpulkit/txt2vid/blob/main/images/repo_use_cases.png)

The main scripts are <br>
1. `Wav2Lip/inference_streaming_pipeline.py` for handing the decoding by 
appropriately handling inputs through various pipes and queues in a multiprocess framework 
2. `input_stream_socket.py` for handling streaming input handling. <br>

Below we describe a subset of these use-cases with an example from all store/stream modalities,
in increasing order of complexity. See all available argument flags by:

```
cd Wav2Lip
python inference_streaming_pipeline.py -h
```
and
```
python input_stream_socket.py -h
```

Ensure Google or Resemble TTS setup is done for all use-cases involving text as described 
in [Google STT and TTS Setup](#Google-STT-and-TTS-Setup) and [Resemble TTS Setup](#Resemble-TTS-Setup).

### Storing txt2vid video as file using text or audio file available at server
<pre>
server (AV-synced streamed video)
^
|
pre-recorded audio/text + driving picture/video
</pre>

**Example Code:**
  
On server launch the streaming inference script, and save the generated video. 
* from pre-recorded audio:
  ```
  python inference_streaming_pipeline.py -it audio \
                                         --checkpoint_path checkpoints/wav2lip_gan.pth \
                                         --face sample_data/einstein.jpg \
                                         -aif file \
                                         --audio_file_path sample_data/einstein_audio_resemble.wav \
                                         -vot file \
                                         --video_file_out results/test_video.mp4
  ```
* from pre-recorded text and Resemble TTS:
  ```
  python inference_streaming_pipeline.py -it text \
                                         -TTS Resemble \
                                         --checkpoint_path checkpoints/wav2lip_gan.pth \
                                         --face sample_data/einstein.jpg \
                                         -tif file \
                                         --text_file_path sample_data/einstein_text.txt \
                                         -vot file \
                                         --video_file_out results/test_video.mp4 \
                                         --voice <voice_name> \
                                         --resemble_callback_url <resemble_callback_url>
  ```
  Arguments `<voice_name>`, `<resemble_callback_url>` depend on the resemble setup and instructions to get them
  are provided in "Installation Instructions - Resemble TTS". <br>
  Resemble also allows for voices generated in specific emotions, instead of default personalized TTS
  output. For accessing them use `-e` flag.
  
* from pre-recorded text and Google TTS:
  ```
  python inference_streaming_pipeline.py -it text \
                                         -TTS Google \
                                         --checkpoint_path checkpoints/wav2lip_gan.pth \
                                         --face sample_data/einstein.jpg \
                                         -tif file \
                                         --text_file_path sample_data/einstein_text.txt \
                                         -vot file \
                                         --video_file_out results/test_video.mp4 \
                                         -gc <google_credential>
  ```
  The argument `<google_credential>` depends on the google setup and instructions to get it
  are provided in "Installation Instructions - Google TTS and STT". <br>

### Streaming txt2vid video on a port using text or audio file available at server
<pre>
server (AV-synced streamed video) -----> receiver (view AV stream)
^
|
pre-recorded audio/text + driving picture/video
</pre>

On server launch the streaming inference script, and port forward to stream the generated txt2vid video.

**Example Code:** 

Note: We show use case with text as input and Resemble as TTS.
Other use cases for Google TTS or audio file can be generated by changing appropriate flags.

* On receiver, ssh into the server with port-forwarding enabled.
  ```
  ssh -Y -L localhost:8080:localhost:8080 xyz@abc.com
  ```
  `8080` is the default port but any port should work with appropriately
  modified `<output_port>` argument in `inference_streaming_pipeline` below.
  This step is not needed if server = receiver (i.e. receiver is the local machine and has GPU access).
  
* On server launch the streaming inference script, and write txt2vid video to a port. 
  ```
  python inference_streaming_pipeline.py -it text \
                                         -TTS Resemble \
                                         --checkpoint_path checkpoints/wav2lip_gan.pth \
                                         --face sample_data/einstein.jpg \
                                         -tif file \
                                         --text_file_path sample_data/einstein_text.txt \
                                         -vot socket \
                                         --output_port 8080 \
                                         --voice <voice_name> \
                                         --resemble_callback_url <resemble_callback_url>
  ```
  Wait till it says `Model Loaded`. The code will halt here waiting
  for the ffplay command to ask for streaming content.
  
* View streaming output on the receiver. Ensure `ffplay` is installed. 
  ```
  ffplay -f avi http://localhost:8080
  ```

### Streaming txt2vid video on a port using streaming input from a sender
<pre>
sender -----> server (AV-synced streamed video) -----> receiver (view AV stream)
^             ^
|             |
audio/video   driving picture/video
</pre>

**Example Code:** 

Note: We show use case with streaming text as input from terminal and Google STT, with Resemble as TTS.
Other use cases for Google TTS or audio from microphone can be generated by changing appropriate flags.

* On receiver, ssh into the server with port-forwarding enabled.
  ```
  ssh -Y -L localhost:8080:localhost:8080 xyz@abc.com
  ```
  `8080` is default port but any port should work with appropriately
  modified `<output_port>` argument in `inference_streaming_pipeline` below.
  This step is not needed if server = receiver (i.e. receiver is the local machine and has GPU access).
  
* On server launch the streaming inference script, and write txt2vid video to a port. 
  ```
  python inference_streaming_pipeline.py -it text \
                                         -TTS Resemble \
                                         --checkpoint_path checkpoints/wav2lip_gan.pth \
                                         --face sample_data/einstein.jpg \
                                         -tif socket \
                                         --text_port 50007 \
                                         -vot socket \
                                         --output_port 8080 \
                                         --voice <voice_name> \
                                         --resemble_callback_url <resemble_callback_url>
  ```
  Wait till it says `Model Loaded`. The code will halt here waiting
  for the ffplay command to ask for streaming content. <br>
  `50007` is default port where the Server will stream the text. Can be specified to be something else,
  but also change `PORT` in below command.
  
* On sender launch the input streaming via socket. 2 examples are shown (use one, not both).
  * for text stream from terminal:
    ```
    python input_stream_socket.py -it text \
                                  -tif terminal \
                                  --HOST abc.com \
                                  --PORT 50007
    ```
  * for text stream using microphone and then Google STT:
    ```
    python input_stream_socket.py -it text \
                                  -tif Google \
                                  --HOST abc.com \
                                  --PORT 50007
                                  --gc <google_credential>
    ```
    Here, `<google_credential>` is the credential required for Google STT described in
    installation instructions.

  Note: `HOST` needs to be the server machine where the wav2lip inference code will run
  (in our example: server = xyz@abc.com)

* View streaming output on the receiver. Ensure `ffplay` is installed. 
  ```
  ffplay -f avi http://localhost:8080
  ```
  Might need to wait a few secs (~4s) before running this command after the previous one due to latency
  of the system. If it throws error, just try running it again.

