# txt2vid
Repo containing code for txt2vid project. Repo gives a proof-of-concept for the following compression 
pipeline (for more details read paper **ToDo: add paper link**):
![Pipeline](https://github.com/tpulkit/txt2vid/blob/main/images/block_diagram.png).

Though pipeline is flexible and can be replaced by appropriate software programs performing same function, 
the repo currently uses and allows for [Wav2Lip](https://github.com/Rudrabha/Wav2Lip) for lip-syncing, 
[Resemble](https://www.resemble.ai) or [Google](https://cloud.google.com/text-to-speech) APIs for 
personalized and general text-to-speech (TTS) synthesis respectively, and
[Google](https://cloud.google.com/speech-to-text) API for speech-to-text synthesis (STT). 
It uses [ffmpeg-python](https://github.com/kkroening/ffmpeg-python/tree/master/examples#audiovideo-pipeline)
to enable streaming.
      
## Installation Instructions

NOTES: 
* For streaming demonstration, this setup assumes you will be working on a server-machine (**SM**)
  as a  receiver, and place where the code will run and generate
  the lip-synced video on the fly. In reality, this receiver can be 
  your own or another local machine (**LM**) if there is access to GPU. 
  In that case, some installments and port-forwarding for playing
  streaming video using ffplay can be avoided.
  
* For input streaming, we assume a Server (**S**) from where input will be streamed. This server will be
  your own local machine (**LM**) and will be used to stream (a) audio from microphone; or text via
  (b) terminal, or (c) using Google STT on audio recorded from microphone.
    
* Abbreviations: 
    * S = Server; actual server, machine from where streaming inputs will be provided, can be same as LM
    * SM = Server-machine; server machine proxy of receiver where decoding
      is happening, can be same as LM if access to GPU is available at LM
    * LM = Local-machine; used for watching output streaming content or input streaming content.
    * TTS = Text-to-Speech
    * STT = Speech-to-Text
  
Setup requirements using following steps on all machines (S, SM, LM):

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

* **Wav2Lip**: <br>
  Make sure model files are downloaded and put in appropriate
  folder from the `wav2lip` repo.
  * GAN model: `wav2lip_gan.pth` should be present in
    `Wav2Lip/checkpoints`. Pretrained model can be downloaded from following
    [link](https://iiitaphyd-my.sharepoint.com/:u:/g/personal/radrabha_m_research_iiit_ac_in/EdjI7bZlgApMqsVoEUUXpLsBxqXbn5z8VTmoxp55YNDcIA?e=n9ljGW).
  * Face detection model: `s3fd.pth` should be present in 
    `Wav2Lip/face_detection/detection/sfd/s3fd.pth`. Pretrained model can be downloaded from 
    [link1](https://www.adrianbulat.com/downloads/python-fan/s3fd-619a316812.pth)
    or 
    [link2](https://iiitaphyd-my.sharepoint.com/:u:/g/personal/prajwal_k_research_iiit_ac_in/EZsy6qWuivtDnANIG73iHjIBjMSoojcIV0NULXV-yiuiIg?e=qTasa8).
    
* **Google STT and TTS**: <br>
  To use Google API for TTS or STT, ensure following steps are executed:
  * Follow [instructions](https://cloud.google.com/docs/authentication/getting-started#creating_a_service_account)
    to create a service account (if it doesn't exist already), and download the json key.
  * Follow [instructions](https://support.google.com/googleapi/answer/6158841?hl=en) ("enable and disable APIs")
    to add the following APIs to this project
      1. Cloud Speech-to-Text API
      2. Cloud Text-to-Speech API
  * **Pass the path to the json key to the `-gc` parameter 
    for the relevant script runs using Google as STT/TTS.**
  
* **Resemble TTS**: <br>
  To use Resemble API, ensure following steps are executed:
  * Create an account on [resemble.ai website](https://app.resemble.ai) and create your own 
    [voice](https://app.resemble.ai/voices) by recording 50-100 samples of audio data.
    Create a new project.
    
  * Update `resemble_tts/resemble_config.json` with your data. This json has following structure:
    ```
    {
    "users": { 
      <user_name>: {
        "name": <voice_name>,
        "token": <api_token>,
        "voice_id": <voice_id>
      },
      ...
    "project_uuid": <project_uuid>
    }
    ```
    where all the variables are strings. `voice_name` is the name of the recorded voice chosen in resemble 
    (found [here](https://app.resemble.ai/voices)), `api_token` is the token used for API access 
    (found [here](https://app.resemble.ai/account/api)) and `voice_id` is 8 character resemble voice ID
    (can be found [here](https://app.resemble.ai/docs#voice) by executing the interactive example and copying
    the `uuid`). The `user_name` can be any identifier string for the voice. **Pass the `user_name` to 
    `--user` parameter for the relevant script runs using Resemble as TTS.** `project_uuid` is 8 character
    ID of the project where the voice will be created using the API 
    (can be found [here](https://app.resemble.ai/docs#project)
    by executing the interactive example and copying the `uuid` of the project to contain voice clips 
    generated via API).
    
  * **Callback Server setup** <br>
    * For the Resemble TTS to work via API, we use a callback server to receive the voice output
      generated by Resemble. On SM (machine where decoding will happen), 
      launch the callback server by 
      ```
      cd resemble_tts
      export FLASK_APP=tts_callback_file.py
      python -m flask run
      ```
      This runs a callback server on default port of `5000` on the SM. 
    * If the SM's port `5000` is publicly accessible, then the callback from resemble can be received
      at `http://localhost:5000`. If SM is inside a network, we need to provide a publicly 
      accessible port to the resemble for sending voice data. One way to do so could be to use
      `https://ngrok.com` for creating an HTTP tunnel. Create a ngrok account and
      follow [instructions](https://dashboard.ngrok.com/get-started/setup) to install
      it on your SM. Launch tunnel forwarding to local port `5000` where the callback server is 
      listening by running: 
      ```
      ./ngrok http 5000
      ```
      This port forwards a publicly accessible link to our
      callback server. The publicly accessible link (`<link>`) is
      available as output where the ngrok command was run in 
      `Forwarding` section as `<link> -> http://localhost:5000`.
    * **Pass the `<link>` variable or appropriate publicly accessible callback server address to the
      `--resemble_callback_url` parameter for the relevant script runs using Resemble as TTS.**
  

## Use-Cases
Currently, repo allows following use cases:
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
"Installation Instructions".

### Storing txt2vid video as file using text/audio file available at SM
<pre>
SM (AV-synced streamed video)
^
|
pre-recorded audio/text + driving picture/video
</pre>

**Example Code:**
  
On SM launch the streaming inference script, and save the generated video. 
* from pre-recorded audio:
  ```
  python inference_streaming_pipeline.py -it audio \
					      --checkpoint_path checkpoints/wav2lip_gan.pth \
					      --face sample_data/006_06.png \
                                -aif file \
					      --audio_file_path sample_data/hello_intro.m4a \
					      -vot file \
					      --video_file_out results/test_video.mp4
  ```
* from pre-recorded text and Resemble TTS:
  ```
  python inference_streaming_pipeline.py --it text \
					      -TTS Resemble \
					      --checkpoint_path checkpoints/wav2lip_gan.pth \
					      --face sample_data/006_06.png \
                                -tif file \
					      --text_file_path sample_data/random.txt \
					      -vot file \
					      --video_file_out results/test_video.mp4 \
					      --user <user_name> \
					      --callback_url <callback_url>
  ```
  Arguments `<user_name>`, `<callback_url>` depends on the resemble setup and instructions to get them
  are provided in "Installation Instructions - Resemble TTS". <br>
  Resemble also allows for voices generated in specific emotions, instead of default personalized TTS
  output. For accessing them use `-e` flag.
  
* from pre-recorded text and Google TTS:
  ```
  python inference_streaming_pipeline.py --it text \
					      -TTS Google \
					      --checkpoint_path checkpoints/wav2lip_gan.pth \
					      --face sample_data/006_06.png \
                                -tif file \
					      --text_file_path sample_data/random.txt \
					      -vot file \
					      --video_file_out results/test_video.mp4 \
					      -gc <google_credential>
  ```
  Arguments `<google_credentail>` depends on the google setup and instructions to get them
  are provided in "Installation Instructions - Google TTS and STT". <br>

### Streaming txt2vid video on a port using audio and video file available at SM
<pre>
SM (AV-synced streamed video) -----> LM (view AV stream)
^
|
pre-recorded audio/text + driving picture/video
</pre>

On SM launch the streaming inference script, and port forward to stream the generated txt2vid video.

**Example Code:** 

Note: We show use case with text as input and Resemble as TTS.
Other use cases for Google TTS or audio file can be generated by changing appropriate flags.

* On LM, ssh into the server with port-forwarding enabled.
  ```
  ssh -Y -L localhost:8080:localhost:8080 xyz@abc
  ```
  `8080` is default port but any port should work with appropriately
  modified `<port>` argument in `inference_streaming_pipeline` below.
  This step is not needed if SM = LM (i.e. receiver is the local machine and has GPU access).
  
* On SM launch the streaming inference script, and write txt2vid video to a port. 
  ```
  python inference_streaming_pipeline.py -it text \
					      -TTS Resemble \
			                      --checkpoint_path checkpoints/wav2lip_gan.pth \
			                      --face sample_data/006_06.png \
                                -tif file \
			                      --text_file_path sample_data/random.txt \
			                      -vot socket \
			                      --port 8080 \
			                      --user <user_name> \
			                      --callback_url <callback_url>
  ```
  Wait till it says `Model Loaded`. The code will halt here waiting
  for the ffplay command to ask for streaming content.
  
* View streaming output on the LM. Ensure `ffplay` is installed. 
  ```
  ffplay -f avi http://localhost:8080
  ```

### Streaming txt2vid video on a port using streaming input from a server (S)
<pre>
S (audio/text) -----> SM (AV-synced streamed video) -----> LM (view AV stream)
                      ^
                      |
                      driving picture/video
</pre>

**Example Code:** 

Note: We show use case with streaming text as input from terminal and Google STT, with Resemble as TTS.
Other use cases for Google TTS or audio from microphone can be generated by changing appropriate flags.

* On LM, ssh into the server with port-forwarding enabled.
  ```
  ssh -Y -L localhost:8080:localhost:8080 xyz@abc
  ```
  `8080` is default port but any port should work with appropriately
  modified `<port>` argument in `inference_streaming_pipeline` below.
  This step is not needed if SM = LM (i.e. receiver is the local machine and has GPU access).
  
* On SM launch the streaming inference script, and write txt2vid video to a port. 
  ```
  python inference_streaming_pipeline.py -it text \
					      -TTS Resemble \
			                      --checkpoint_path checkpoints/wav2lip_gan.pth \
			                      --face sample_data/006_06.png \
                                -tif socket \
                                --text_port 50007 \
			                      -vot socket \
			                      --port 8080 \
			                      --user <user_name> \
			                      --callback_url <callback_url>
  ```
  Wait till it says `Model Loaded`. The code will halt here waiting
  for the ffplay command to ask for streaming content. <br>
  `50007` is default port where the Server will stream the text. Can be specified to be something else,
  but also change `PORT` in below command.
  
* On S launch the input streaming via socket. 2 examples are shown (use one, not both).
  * for text stream from terminal:
    ```
    python input_stream_socket.py -it text \
                                -tif terminal \
				                            --HOST abc \
				                            --PORT 50007
    ```
  * for text stream using microphone and then Google STT:
    ```
    python input_stream_socket.py -it text \
                                -tif Google \
				                            --HOST abc \
				                            --PORT 50007
                                --gc <google_credential>
    ```
    Here, `<google_credential>` is the credential required for Google STT described in
    installation instructions.

  Note: `HOST` needs to be the SM machine where the wav2lip inference code will run
  (in our example: SM = xyz@abc)

* View streaming output on the LM. Ensure `ffplay` is installed. 
  ```
  ffplay -f avi http://localhost:8080
  ```

