import { EventEmitter } from '../sub';
import { Peer } from './room';
import { makeTTS } from './resemble';
import { SAMPLE_RATE, SPECTROGRAM_FRAMES, IMG_SIZE, genFrames, FFT_SIZE, expectedTime } from '../ml';
import { Face, FaceTracker } from '../face-tracking';

interface PeerVideoEvents {
  start: void;
  end: void;
};

const MIN_FPS = 8;
const TARGET_FPS = 30;

export class PeerVideo extends EventEmitter<PeerVideoEvents> {
  private voiceID?: string;
  private ctx: CanvasRenderingContext2D;
  private reverse: boolean;
  private frames!: ImageData[];
  private faces!: Face[];
  private faceTracker!: FaceTracker;
  private currentTime: number;
  private driverTime!: number;
  private driverCtx: CanvasRenderingContext2D;
  private lastTimestamp!: number;
  private fps!: number;
  private paused: boolean;
  readonly canvas: HTMLCanvasElement;
  constructor(peer: Peer, canvas?: HTMLCanvasElement) {
    super();
    const driver = document.createElement('video');
    this.canvas = canvas || document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    const driverCanvas = document.createElement('canvas');
    this.driverCtx = driverCanvas.getContext('2d')!;
    driver.addEventListener('resize', () => {
      this.canvas.width = driverCanvas.width = driver.videoWidth;
      this.canvas.height = driverCanvas.height = driver.videoHeight;
    });
    this.currentTime = 0;
    this.reverse = false;
    peer.on('voiceID', id => this.voiceID = id);
    peer.on('connect', evt => this.emit('start', evt));
    peer.on('video', vid => {
      driver.srcObject = vid;
      driver.play();
      this.fps = vid.getVideoTracks()[0].getSettings().frameRate || TARGET_FPS;
      let shouldPause = false;
      const initDisplayInterval = setInterval(() => {
        if (!shouldPause) this.ctx.drawImage(driver, 0, 0);
      }, 1 / this.fps);
      const mr = new MediaRecorder(vid, { mimeType: 'video/webm' });
      const chunks: Blob[] = [];
      mr.addEventListener('dataavailable', evt => chunks.push(evt.data));
      mr.addEventListener('stop', async () => {
        shouldPause = true;
        const blob = new Blob(chunks, { type: mr.mimeType });
        const url = URL.createObjectURL(blob);
        const ct = driver.currentTime;
        driver.pause();
        driver.srcObject = null;
        driver.src = url;
        this.faceTracker = await FaceTracker.create(driverCanvas);
        let lastSpeech = new Promise<void>(resolve => {
          driver.addEventListener('canplay', () => {
            this.frames = [];
            this.faces = [];
            shouldPause = false;
            const genFrame = (time: number) => {
              driver.addEventListener('seeked', () => {
                if (time <= 0) {
                  clearInterval(initDisplayInterval);
                  for (let i = 1; i < this.faces.length; ++i) {
                    if (!this.faces[i]) this.faces[i] = this.faces[i - 1];
                  }
                  this.driverTime = ct;
                  this.currentTime = 0;
                  this.lastTimestamp = performance.now();
                  this.runLoop(this.lastTimestamp);
                  resolve();
                  return;
                }
                this.driverCtx.drawImage(driver, 0, 0);
                this.frames.unshift(this.driverCtx.getImageData(0, 0, driverCanvas.width, driverCanvas.height));
                this.faces.unshift(this.faceTracker.find()!);
                genFrame(time - 1 / this.fps);
              }, { once: true });
              driver.currentTime = time;
            }
            genFrame(ct + 0.1);
          }, { once: true });
        });
        peer.on('speech', speech => {
          if (!this.voiceID) throw new TypeError('no voice ID for speech');
          const ttsProm = makeTTS(speech, this.voiceID);
          lastSpeech = lastSpeech.then(async () => {
            const tts = await ttsProm;
            await this.speak(tts);
          });
        });
      });
      // dev hack
      setTimeout(() => {
        mr.stop();
      }, 5000);
      mr.start();
    });
    peer.on('disconnect', evt => {
      if (driver.src) URL.revokeObjectURL(driver.src);
      driver.src = '';
      this.emit('end', evt);
    });
    this.paused = false;
  }
  private flipDriverTime(time: number): number {
    if (time > this.driverTime) return this.flipDriverTime(2 * this.driverTime - time);
    if (time < 0) return this.flipDriverTime(-time);
    return time;
  }
  // TODO: merge with flipDriverTime
  private flipDriverCount(time: number) {
    let flips = 0;
    for (;; ++flips) {
      if (time > this.driverTime) time = 2 * this.driverTime - time;
      else if (time < 0) time = -time;
      else return flips;
    }
  }
  private getData(time: number) {
    const ind = Math.min(Math.max(Math.floor(time * this.fps), 0), this.frames.length - 1);
    return {
      frame: this.frames[ind],
      face: this.faces[ind]
    };
  }
  private runLoop(timeStamp: number) {
    const delta = (timeStamp - this.lastTimestamp) / 1000;
    this.currentTime = this.currentTime + (this.reverse ? -delta : delta);
    const flippedTime = this.flipDriverTime(this.currentTime);
    if (this.currentTime != flippedTime) {
      this.currentTime = flippedTime;
      this.reverse = !this.reverse;
    }
    if (!this.paused) this.ctx.putImageData(this.getData(this.currentTime).frame, 0, 0);
    this.lastTimestamp = timeStamp;
    requestAnimationFrame(ts => this.runLoop(ts));
  }
  private async speak(tts: HTMLAudioElement) {
    const predTime = (await expectedTime()) / 1000;
    const actx = new AudioContext({ sampleRate: SAMPLE_RATE });
    const src = actx.createMediaElementSource(tts);
    const reemphasis = actx.createIIRFilter([1, -0.97], [1]);
    const analyser = actx.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = 0.2;
    src.connect(reemphasis);
    reemphasis.connect(analyser);

    const expectedFPS = 1 / predTime;
    if (expectedFPS > MIN_FPS) {
      const delay = actx.createDelay();
      delay.delayTime.value = 0.1 + predTime;
      src.connect(delay);
      delay.connect(actx.destination);

      const specPerFrame = predTime / (0.2 / SPECTROGRAM_FRAMES);
      let bufs: Float32Array[] = [];
      return new Promise<void>(resolve => {
        let spec = 0;
        const interval = setInterval(async () => {
          const buf = new Float32Array(analyser.frequencyBinCount);
          analyser.getFloatFrequencyData(buf);
          bufs.push(buf);
          if (bufs.length == SPECTROGRAM_FRAMES) {
            const spectrogram = bufs.slice();
            const targetTime = this.flipDriverTime(this.currentTime + (this.reverse ? -predTime : predTime));
            const { frame, face } = this.getData(targetTime);
            this.driverCtx.putImageData(frame, 0, 0);
            const img = this.faceTracker.extract(face, IMG_SIZE, frame);
            genFrames([{ img, spectrogram }]).then(([result]) => {
              this.paused = true;
              this.ctx.putImageData(frame, 0, 0);
              this.faceTracker.plaster(face, result, this.ctx);
            });
            const sliceCount = Math.round(spec + specPerFrame) - Math.round(spec);
            spec += specPerFrame;
            bufs = bufs.slice(sliceCount);
          }
        }, 200 / SPECTROGRAM_FRAMES);
        tts.play();
        tts.addEventListener('ended', () => {
          setTimeout(() => {
            clearInterval(interval);
            setTimeout(() => {
              this.paused = false;
              resolve();
            }, 1000 * predTime);
          }, delay.delayTime.value * 1000);
        }, { once: true });
      });
    } else {
      const specPerFrame = (1 / MIN_FPS) / (0.2 / SPECTROGRAM_FRAMES);
      const expectedGenTime = Math.max(predTime * MIN_FPS, 1) * (isFinite(tts.duration) ? tts.duration * 1.2 : 0);
      let bufs: Float32Array[] = [];
      return new Promise<void>(resolve => {
        let spec = 0;
        // bg not strictly necessary (should already be there from driver) but helpful in case of desync
        let futureFrames: Promise<{ time: number; reverse: boolean; bg: ImageData; img: ImageData; face: Face; }>[] = [];
        const interval = setInterval(async () => {
          const buf = new Float32Array(analyser.frequencyBinCount);
          analyser.getFloatFrequencyData(buf);
          bufs.push(buf);
          if (bufs.length == SPECTROGRAM_FRAMES) {
            const spectrogram = bufs.slice();
            const targetTime = this.currentTime + (this.reverse ? -expectedGenTime : expectedGenTime);
            const time = this.flipDriverTime(targetTime);
            const reverse = (this.flipDriverCount(targetTime) + +this.reverse) % 2 == 1;
            const { frame: bg, face } = this.getData(time);
            this.driverCtx.putImageData(bg, 0, 0);
            const img = this.faceTracker.extract(face, IMG_SIZE, bg);
            futureFrames.push(genFrames([{ img, spectrogram }]).then(([img]) => ({
              img,
              bg,
              face,
              time,
              reverse
            })));
            const sliceCount = Math.round(spec + specPerFrame) - Math.round(spec);
            spec += specPerFrame;
            bufs = bufs.slice(sliceCount);
          }
        }, 200 / SPECTROGRAM_FRAMES);
        tts.play();
        tts.addEventListener('ended', async () => {
          tts.currentTime = 0;
          const delay = actx.createDelay();
          delay.delayTime.value = 0.1;
          src.connect(delay);
          delay.connect(actx.destination);
          clearInterval(interval);
          const frames = await Promise.all(futureFrames);
          let ti!: number;
          let frametime = 0
          let lastFail = false;
          const run = (ts: number) => {
            if (!this.paused) {
              if (this.reverse == frames[0].reverse && this.reverse ? this.currentTime < frames[0].time : this.currentTime > frames[0].time) {
                if (lastFail) {
                  this.paused = true;
                  tts.play();
                  ti = ts;
                }
              } else {
                lastFail = true;
              }
            }
            if (this.paused) {
              const shift = (ts - ti) / 1000;
              if (shift > frametime) {
                const { img, bg, face, time, reverse } = frames.shift()!;
                this.ctx.putImageData(bg, 0, 0);
                this.faceTracker.plaster(face, img, this.ctx);
                if (!frames.length) {
                  requestAnimationFrame(() => {
                    this.paused = false;
                    resolve();
                  });
                  return;
                }
                ti = ts;
                frametime = reverse
                  ? frames[0].reverse
                    ? time - frames[0].time
                    : time + frames[0].time
                  : frames[0].reverse
                    ? 2 * this.driverTime - frames[0].time - time
                    : frames[0].time - time;
              }
            }
            requestAnimationFrame(run);
          };
          requestAnimationFrame(run);
        }, { once: true });
      });
    }
  }
}