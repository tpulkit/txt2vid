# txt2vid
Repo containing code for txt2vid project. **ToDo: add paper link**

Pipeline:
![Pipeline](https://github.com/tpulkit/txt2vid/blob/main/images/block_diagram.png)
Currently, does speech2vid in a streaming fashion using 
[Wav2Lip](https://github.com/Rudrabha/Wav2Lip) codebase
and using [ffmpeg-python](https://github.com/kkroening/ffmpeg-python/tree/master/examples#audiovideo-pipeline)
to enable streaming.

## Installation

Setup requirements using following steps:

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
  These need to be installed in the machine on the receiver side 
  where processing will happen as well as on the local machine 
  where you intend to view the streaming output (for macs use:
  ```brew install ffmpeg```, this also installs ffplay required
  for streaming video content locally).

* Install python dependencies.
  ```
  pip install -r requirements.txt
  ```

* Make sure model files are downloaded and put in appropriate
  folder from the `wav2lip` repo.
  * GAN model: `wav2lip_gan.pth` should be present in
    `Wav2Lip/checkpoints` 
  * Face detection model: `s3fd.pth` should be present in 
    `Wav2Lip/face_detection/detection/sfd/s3fd.pth`
    
## Use-cases:

NOTES: 
* This setup assumes you will be working on a server-machine (**SM**)
  as a  receiver, and place where the code will run and generate
  the lip-synced video on the fly. In reality, this receiver can be 
  your own local machine (**LM**) if there is access to GPU. 
  In that case, some installments and port-forwarding for playing
  streaming video using ffplay can be avoided.
  
* There are multiple scripts enabling added functionalities from 
  original wav2lip code and can be used to build other applications
  as needed. This is a work-in-progress (e.g. text aspects will be
  added with time). <br>
  * audio-video (AV) files provided and saved as AV and lip-synced 
    files. This is original wav2lip functionality. <br>
    Script: ```Wav2Lip/inference.py```
  * adding streaming read. This reads audio files in chunks and 
    generates video files on the fly. Still writes as a file
    and doesn't enable streaming. Latency of 200s exists here 
    due to the wav2lip model parameters and would require changing
    model to improve. <br>
    Script: ```Wav2Lip/inference_streaming.py```
  * adding AV synced streaming. This reads audio files in chunks 
    and generates streamable AV and lip-synced video files on fly.
    <br>
    Script: ```Wav2Lip/inference_webstreaming.py```
  * audio input from port mimicking recording at the actual server (**S**), 
    while video input by user available at the SM. This receives audio
    from a local machine and combines webstreaming to generate
    streamable AV and lip-synced videos on fly. <br>
    Script: ```Wav2Lip/inference_webstreaming_socket_audio.py```
    
* To reiterate: 
    * S = Server (actual server)
    * SM = Server-machine (server machine proxy of where processing
      is happening, can be same as LM)
    * LM = Local-machine (to be used for both audio input and
      watching streaming content)  
    
Below are some added details for the streaming use-cases above:

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
  

  


