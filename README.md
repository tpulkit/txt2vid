# txt2vid-browser

## Generating the model

Setup:
```sh
git clone https://github.com/tpulkit/txt2vid
cd txt2vid
git checkout arjun-browser
git submodule update --init --progress
```

You should now have the `arjun-browser` branch checked out in your local git repo, along with the Wav2Lip repo as a submodule. To generate the ONNX model file you only need to install PyTorch:
```sh
pip3 install torch --extra-index-url https://download.pytorch.org/whl/cpu
```

Then download one of the pretrained model files from the Wav2Lip repo. I have included their links here:

Available models
----------
| Model  | Description |  Link to the model | 
| :-------------: | :---------------: | :---------------: |
| Wav2Lip  | Highly accurate lip-sync | [Link](https://iiitaphyd-my.sharepoint.com/:u:/g/personal/radrabha_m_research_iiit_ac_in/Eb3LEzbfuKlJiR600lQWRxgBIY27JZg80f7V9jtMfbNDaQ?e=TBFBVW)  |
| Wav2Lip + GAN  | Slightly inferior lip-sync, but better visual quality | [Link](https://iiitaphyd-my.sharepoint.com/:u:/g/personal/radrabha_m_research_iiit_ac_in/EdjI7bZlgApMqsVoEUUXpLsBxqXbn5z8VTmoxp55YNDcIA?e=n9ljGW) |

I recommend using the Wav2Lip + GAN model because from my testing it resulted in a substantially better lipsync.

After you download the `.pth` file, place it into the same directory as this README and run:

```sh
# Change this to just wav2lip if you aren't using the GAN model
python3 onnxconv.py wav2lip_gan
```

You may see a warning if numpy is not installed but you should eventually get a `wav2lip_gan.onnx` or `wav2lip.onnx` file. This is the ONNX file containing the converted PyTorch model. You can move this file to `src/assets`.


## Working on the webapp

### Installing Node.js and NPM

First, install a recent version of Node.js with the download at [this link](https://nodejs.org/en/download/). Make sure you are installing Node v12 or later, but not later than Node v16. Also check that you have enabled the option to add `node` to your `$PATH`.

Alternatively, if you're on a Mac and have [Homebrew](https://brew.sh), you can just do `brew install node`. If you're on Linux, you can also just use the one-line install commands from [NodeSource](https://github.com/nodesource/distributions).

If you already have `node` and `npm` installed, you can skip this step entirely.

### Installing dependencies
Now that you have Node.js installed, you should be able to run `npm -v` in the terminal. If you get an error or a version number below `6.0.0`, double check you followed the previous steps correctly.

You can install `txt2vid`'s dependencies with the following command:
```sh
npm install
```

It may take a few minutes to finish, but when it's done you should see a gigantic `node_modules` folder inside `txt2vid`.

### Developing

To start the development environment, run `npm start` in the `txt2vid` directory. You should see the app building, and you should be able to go to `http://localhost:4200` in your browser to open the web app once you see a build success message.

The web application's UI is a bit unintuitive at the moment, but you should get a prompt to allow camera and mic access when you open it and click on "Join test room". Input your Resemble ID in the format shown. Now, you can test the real-time video conferencing (it's basically like Zoom or Google Meet but sends only ~100bps on the P2P connection after the initial driver video).

First, open the app on two devices/browser windows and wait 5 sceonds for the driver video to finish recording. You will know the driver video has finished recording when the on-screen video stream no longer matches your movements. After this is done, try sending over a sample text prompt from one browser window and wait a few seconds for the reconstructed speech and mouth movements to appear on the other window.

## Important files

This project contains a lot of code designed around peer-to-peer video conferencing and data exchange that has been optimized for mobile-friendliness and real-world performance. However for the time being, I would only worry about the following file:

```
src/util/ml/model.ts
```

This file contains the preprocessing and postprocessing logic for the Wav2Lip model, and exports a `genFrames` function that accepts spectrogram and video-frame input to generate a lipsynced video-frame output. I added many comments to this file to try to explain the code.
