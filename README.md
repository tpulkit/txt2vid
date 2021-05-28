# txt2vid
Repo containing code for txt2vid project. Repo gives a proof-of-concept for the following compression 
pipeline(for more details read paper **ToDo: add paper link**):
![Pipeline](https://github.com/tpulkit/txt2vid/blob/main/images/block_diagram.png).

## Use-Cases
Currently, repo allows following use cases 
![Use Cases](https://github.com/tpulkit/txt2vid/blob/main/images/repo_use_cases.png)

Though pipeline is flexible and can be replaced by appropriate softwares performing same function, the
repo currently uses and allows for [Wav2Lip](https://github.com/Rudrabha/Wav2Lip) codebase for lip-syncing, 
[Resemble](https://www.resemble.ai) or [Google](https://cloud.google.com/text-to-speech)  APIs for 
text-to-speech (TTS) synthesis, and [Google](https://cloud.google.com/speech-to-text) API for 
speech-to-text synthesis (STT). 
It uses [ffmpeg-python](https://github.com/kkroening/ffmpeg-python/tree/master/examples#audiovideo-pipeline)
to enable streaming.

NOTES: 
* For streaming demonstration, this setup assumes you will be working on a server-machine (**SM**)
  as a  receiver, and place where the code will run and generate
  the lip-synced video on the fly. In reality, this receiver can be 
  your own local machine (**LM**) if there is access to GPU. 
  In that case, some installments and port-forwarding for playing
  streaming video using ffplay can be avoided.
    
* Abbreviations: 
    * S = Server; actual server, machine from where streaming inputs will be provided, can be same as LM
    * SM = Server-machine; server machine proxy of receiver where decoding
      is happening, can be same as LM if access to GPU is available at LM
    * LM = Local-machine; used for watching output streaming content or input streaming content.
    * TTS = Text-to-Speech
    * STT = Speech-to-Text
      
## Installation Instructions

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
  
* **Resemble**: <br>
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
      at `http://localhost:5000`. But if SM is inside a network, we need to provide a publicly 
      accessible port to the resemble for sending voice data. One way to do so could be to use
      `https://ngrok.com` for creating a HTTP tunnel. Create a ngrok account and
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
      
      
  

### Streaming audio-video using audio input from mic
<pre>
S (audio) -----> SM (AV-synced streamed video) -----> LM (view AV stream)
                 ^
                 |
               pre-recorded picture/video
</pre>

Example Code:
* ssh into the server with port-forwarding enabled from local machine.
  ```
  ssh -Y -L localhost:8080:localhost:8080 xyz@abc
  ```
  `8080` is default port but any port should work with appropriately
  modified commands below. This step is not needed if SM = LM 
  (i.e. receiver is the local machine and has GPU access).
  
* On SM launch the webstreaming socket. This sets up 
  recording audio server as well as pipes for forwarding streaming
  AV content. 
  ```
  python inference_webstreaming_socket_audio.py --checkpoint_path checkpoints/wav2lip_gan.pth --face "sample_data/005_04.png" --wav2lip_batch_size 1 
  ```
  Wait till it says `Model Loaded`. The code will halt here waiting
  for input audio to stream. At this point all queues/pipes for 
  enabling streaming have been set up.
  
* On the LM ensure `ffplay` is installed. Also ensure the python
  environment you are working in has `pyaudio` package (else:
  ```pip install pyaudio```). Then launch the audio recording
  and ffplay for video display using `run_streaming.sh` provided
  in Wav2Lip folder of repo. These commands need to be run locally!
  ```
  sudo chmod 755 run_streaming.sh 
  ./run_streaming.sh
  ```
  This script launches the audio recording immediately and launches the 
  video streaming 5 seconds later on the local machine. The 5s added
  latency right now is arbitrary, but a significant latency is still
  required because of how ffmpeg works in streaming fashion (it
  picks up significant audio-video packets before streaming), e.g.,
  the script won't work is the latency is reduced to below 3s. If 
  you get a pipe broken error, try to increase the number 5 to
  something higher in the run_streaming.sh script.
  **MAIN TODO: IMPROVE LATENCY HERE**
  
### Streaming audio-video using audio and video file available at SM
<pre>
SM (AV-synced streamed video) -----> LM (view AV stream)
^
|
pre-recorded audio + picture/video
</pre>

Example Code:
* ssh into the server with port-forwarding enabled from local machine.
  ```
  ssh -Y -L localhost:8080:localhost:8080 xyz@abc
  ```
  `8080` is default port but any port should work with appropriately
  modified commands below. This step is not needed if SM = LM 
  (i.e. receiver is the local machine and has GPU access).
  
* On SM launch the webstreaming socket. This sets up 
  recording audio server as well as pipes for forwarding streaming
  AV content. 
  ```
  python inference_webstreaming.py --checkpoint_path checkpoints/wav2lip_gan.pth --face "sample_data/005_04.png" --audio "sample_data/hello.m4a" --wav2lip_batch_size 1  
  ```
  Wait till it says `Model Loaded`. The code will halt here waiting
  for the ffplay command to ask for streaming content.
  
* On the LM ensure `ffplay` is installed. 
  ```
  ffplay -f avi http://localhost:8080
  ```
  

  


