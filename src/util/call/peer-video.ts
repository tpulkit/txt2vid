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
  private data: { frame: ImageData; face: Face; }[];
  private faceTracker!: FaceTracker;
  private currentTime!: number;
  private driverTime!: number;
  private lastTimestamp!: number;
  private fps!: number;
  private paused: boolean;
  private ended: boolean;
  readonly canvas: HTMLCanvasElement;
  constructor(peer: Peer, canvas?: HTMLCanvasElement) {
    super();
    const driver = document.createElement('video');
    this.ended = false;
    this.canvas = canvas || document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    driver.addEventListener('resize', () => {
      this.canvas.width = driver.videoWidth;
      this.canvas.height = driver.videoHeight;
    });
    // start in reverse
    this.reverse = true;
    this.data = [];
    peer.on('voiceID', id => this.voiceID = id);
    peer.on('connect', evt => this.emit('start', evt));
    peer.on('video', async vid => {
      driver.srcObject = vid;
      this.faceTracker = await FaceTracker.create(driver);
      await driver.play();
      this.fps = Math.min(vid.getVideoTracks()[0].getSettings().frameRate || TARGET_FPS, 60);
      const frametime = 1000 / this.fps;
      let ti = performance.now();
      const initDisplay = (ts: number) => {
        if (!vid.active) {
          this.driverTime = this.currentTime = driver.currentTime;
          driver.srcObject = null;
          this.lastTimestamp = performance.now();
          let lastSpeech = Promise.resolve();
          if (!this.data[0].face) {
            this.data[0].face = this.data.find(f => f.face)!.face;
          }
          for (let i = 1; i < this.data.length; ++i) {
            if (!this.data[i].face) {
              this.data[i].face = this.data[i - 1].face;
            }
          }
          this.runLoop(this.lastTimestamp);
          peer.on('speech', speech => {
            if (!this.voiceID) throw new TypeError('no voice ID for speech');
            const ttsProm = makeTTS(speech, this.voiceID);
            lastSpeech = lastSpeech.then(async () => {
              const tts = await ttsProm;
              await this.speak(tts);
            });
          });
          return;
        }
        this.ctx.drawImage(driver, 0, 0);
        if (ts - ti > frametime) {
          const result = {
            frame: this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height),
            face: this.faceTracker.find()!
          };
          while (ts - ti > frametime) {
            ti += frametime;
            this.data.push(result);
          }
        }
        requestAnimationFrame(initDisplay);
        // setTimeout(() => initDisplay(performance.now()), frametime);
      };
      initDisplay(ti);
    });
    peer.on('disconnect', evt => {
      console.log('ending peer video')
      this.ended = true;
      this.emit('end', evt);
    });
    this.paused = false;
  }
  private flipTime(time: number) {
    let flips = 0;
    for (;; ++flips) {
      if (time > this.driverTime) time = 2 * this.driverTime - time;
      else if (time < 0) time = -time;
      else break;
    }
    return [time, flips];
  }
  private getData(time: number) {
    const ind = Math.min(Math.max(Math.floor(time * this.fps), 0), this.data.length - 1);
    return this.data[ind]
  }
  private runLoop(timeStamp: number) {
    if (this.ended) return;
    const delta = (timeStamp - this.lastTimestamp) / 1000;
    this.currentTime = this.currentTime + (this.reverse ? -delta : delta);
    const [flippedTime, flippedCount] = this.flipTime(this.currentTime);
    if (flippedCount) {
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
            const [targetTime] = this.flipTime(this.currentTime + (this.reverse ? -predTime : predTime));
            const { frame, face } = this.getData(targetTime);
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
            const [time, flipCount] = this.flipTime(targetTime);
            const reverse = (flipCount + +this.reverse) % 2 == 1;
            const { frame: bg, face } = this.getData(time);
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