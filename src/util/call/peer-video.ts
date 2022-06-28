import { EventEmitter } from '../sub';
import { Peer } from './room';
import { makeTTS } from './resemble';
import { SAMPLE_RATE, SPECTROGRAM_FRAMES, IMG_SIZE, genFrames, FFT_SIZE } from '../ml';
import { FaceTracker } from '../face-tracking';

interface PeerVideoEvents {
  start: void;
  end: void;
};

const TARGET_FPS = 12;

export class PeerVideo extends EventEmitter<PeerVideoEvents> {
  private voiceID?: string;
  private lastSpeech = Promise.resolve();
  private ctx: CanvasRenderingContext2D;
  private faceTracker!: FaceTracker;
  private reverse: boolean;
  private frames!: ImageData[];
  private currentTime!: number;
  private driverTime!: number;
  private driverCtx: CanvasRenderingContext2D;
  private lastTimestamp!: number;
  private fps!: number;
  private paused: boolean;
  readonly canvas: HTMLCanvasElement;
  constructor(peer: Peer) {
    super();
    const driver = document.createElement('video');
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    const driverCanvas = document.createElement('canvas');
    this.driverCtx = driverCanvas.getContext('2d')!;
    driver.addEventListener('resize', () => {
      this.canvas.width = driverCanvas.width = driver.videoWidth;
      this.canvas.height = driverCanvas.height = driver.videoHeight;
    });
    // The video initially starts reversed after it is recorded
    this.reverse = true;
    peer.on('voiceID', id => this.voiceID = id);
    peer.on('connect', evt => this.emit('start', evt));
    peer.on('video', vid => {
      driver.srcObject = vid;
      driver.play();
      this.fps = vid.getVideoTracks()[0].getSettings().frameRate || TARGET_FPS;
      // TODO: why does this break everything
      // const initDisplayInterval = setInterval(() => {
      //   this.ctx.drawImage(driver, 0, 0);
      // }, 1 / this.fps);
      // driver.addEventListener('pause', () => clearInterval(initDisplayInterval));
      const mr = new MediaRecorder(vid, { mimeType: 'video/webm' });
      const chunks: Blob[] = [];
      mr.addEventListener('dataavailable', evt => chunks.push(evt.data));
      mr.addEventListener('stop', async () => {
        const blob = new Blob(chunks, { type: mr.mimeType });
        const url = URL.createObjectURL(blob);
        const ct = driver.currentTime;
        driver.pause();
        driver.srcObject = null;
        driver.src = url;
        this.faceTracker = await FaceTracker.create(driverCanvas);
        peer.on('speech', speech => {
          if (!this.voiceID) throw new TypeError('no voice ID for speech');
          const ttsProm = makeTTS(speech, this.voiceID);
          this.lastSpeech = this.lastSpeech.then(async () => {
            const tts = await ttsProm;
            await this.speak(tts);
          });
        });
        driver.addEventListener('canplay', () => {
          this.frames = [];
          const genFrame = (time: number) => {
            let ot = driver.currentTime;
            driver.addEventListener('seeked', () => {
              if (time != 0 && driver.currentTime == ot) {
                this.driverTime = driver.duration;
                this.currentTime = ct;
                this.lastTimestamp = performance.now();
                this.runLoop(this.lastTimestamp);
                return;
              }
              this.driverCtx.drawImage(driver, 0, 0);
              this.frames.push(this.driverCtx.getImageData(0, 0, driverCanvas.width, driverCanvas.height));
              genFrame(time + 1 / this.fps);
            }, { once: true });
            driver.currentTime = time;
          }
          genFrame(0);
        }, { once: true });
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
  private getData(time: number) {
    return this.frames[Math.min(Math.max(Math.floor(time * this.fps), 0), this.frames.length - 1)];
  }
  private runLoop(timeStamp: number) {
    const delta = (timeStamp - this.lastTimestamp) / 1000;
    this.currentTime = this.currentTime + (this.reverse ? -delta : delta);
    const flippedTime = this.flipDriverTime(this.currentTime);
    if (this.currentTime != flippedTime) {
      this.currentTime = flippedTime;
      this.reverse = !this.reverse;
    }
    if (!this.paused) this.ctx.putImageData(this.getData(this.currentTime), 0, 0);
    this.lastTimestamp = timeStamp;
    requestAnimationFrame(ts => this.runLoop(ts));
  }
  private async speak(tts: HTMLAudioElement) {
    const actx = new AudioContext({ sampleRate: SAMPLE_RATE });
    const src = actx.createMediaElementSource(tts);
    const delay = actx.createDelay();
    const reemphasis = actx.createIIRFilter([1, -0.97], [1]);
    const analyser = actx.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = 0.2;
    
    src.connect(reemphasis);
    reemphasis.connect(analyser);

    let predTime = 0.08;
    delay.delayTime.value = 0.1 + predTime;

    src.connect(delay);
    delay.connect(actx.destination);

    const specPerFrame = 1 / TARGET_FPS / (0.2 / SPECTROGRAM_FRAMES);
    let bufs: Float32Array[] = [];
    return new Promise<void>(resolve => {
      const interval = setInterval(async () => {
        const buf = new Float32Array(analyser.frequencyBinCount);
        analyser.getFloatFrequencyData(buf);
        bufs.push(buf);
        if (bufs.length == SPECTROGRAM_FRAMES) {
          const spectrogram = bufs.slice();
          const targetTime = this.flipDriverTime(this.currentTime + (this.reverse ? -predTime : predTime));
          const frame = this.getData(targetTime);
          this.driverCtx.putImageData(frame, 0, 0);
          const face = this.faceTracker.find();
          if (face) {
            const img = this.faceTracker.extract(face, IMG_SIZE);
            genFrames([{ img, spectrogram }]).then(([result]) => {
              this.paused = true;
              this.ctx.putImageData(frame, 0, 0);
              this.faceTracker.plaster(face, result, this.ctx);
            });
          }
          bufs = bufs.slice(Math.ceil(specPerFrame));
        }
      }, 200 / SPECTROGRAM_FRAMES);
      tts.play();
      tts.addEventListener('ended', () => {
        clearInterval(interval);
        setTimeout(() => {
          this.paused = false;
          resolve();
        }, 1000 * delay.delayTime.value);
      });
    });
  }
}