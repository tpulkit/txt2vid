# txt2vid-browser

## Generating the model

Setup:
```sh
git clone https://github.com/101arrowz/send-it
cd send-it
git checkout real-txt2vid
git submodule update
```

You should now have the real-txt2vid branch checked out in your local git repo, along with the Wav2Lip repo as a submodule. To generate the ONNX model file you only need to install PyTorch:
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

First, install a recent version of Node.js with the download at [this link](https://nodejs.org/en/download/). Make sure you are installing Node v12 or later. Also check that you have enabled the option to add `node` to your `$PATH`.

Alternatively, if you're on a Mac and have [Homebrew](https://brew.sh), you can just do `brew install node`. If you're on Linux, you can also just use the one-line install commands from [NodeSource](https://github.com/nodesource/distributions).

If you already have `node` and `npm` installed, you can skip this step entirely.

### Installing Yarn

Now that you have Node.js installed, you should be able to run `npm -v` in the terminal. If you get an error or a version number below `6.0.0`, double check you followed the previous steps correctly.

If that command worked, you can install Yarn Classic:
```sh
npm install -g yarn
```

This should add a `yarn` command to your `$PATH`, so you should be able to run `yarn -v`. You should see a version greater than `1.18.0`.

If all that worked, you can install `send-it`'s dependencies with the following command:
```sh
yarn install
```

It may take a few minutes to finish, but when it's done you should see a gigantic `node_modules` folder inside `send-it`.

### Developing

To start the development environment, run `yarn start` in the `send-it` directory. You should see the app building, and you should be able to go to `http://localhost:4200` in your browser to open the web app once you see a build success message.

The web application's UI is a bit unintuitive at the moment, but you should get a prompt to allow camera and mic access when you open it.

To actually try out the model, you can just take a screenshot of your face cropped from just above the top of your head to just below your chin (basically like a driver's license headshot but without any background). Then upload that cropped photo into the "Upload files" prompt and start speaking. You should see your real video feed alongside your cropped, screenshotted face being contorted to look like it's saying whatever you're currently speaking.

This will soon be converted into a part of the video conferencing platform. To test the real-time video conferencing (it's basically like Zoom or Google Meet), you can open the app on two devices/browser windows, type in `test` into the Room ID field and hit ENTER on both devices, then watch the video streams that appear.

## Important files

This project contains a lot of code designed around peer-to-peer video conferencing and data exchange that has been optimized for mobile-friendliness and real-world performance. However for the time being, I would only worry about the following file:

```
src/App/model.ts
```

This file contains the preprocessing and postprocessing logic for the Wav2Lip model, and exports a `genFrames` function that accepts spectrogram and video-frame input to generate a lipsynced video-frame output. I added many comments to this file to try to explain the code.