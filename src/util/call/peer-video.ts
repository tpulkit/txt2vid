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
  private driver: HTMLVideoElement;
  private spareDriver: HTMLVideoElement;
  private lastSpeech = Promise.resolve();
  private ctx: CanvasRenderingContext2D;
  private faceTracker!: FaceTracker;
  private reverse: boolean;
  private lastTimestamp!: number;
  private paused: boolean;
  readonly canvas: HTMLCanvasElement;
  constructor(peer: Peer) {
    super();
    this.driver = document.createElement('video');
    this.spareDriver = document.createElement('video');
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.driver.addEventListener('resize', () => {
      this.canvas.width = this.driver.videoWidth;
      this.canvas.height = this.driver.videoHeight;
    });
    this.reverse = false;
    peer.on('voiceID', id => this.voiceID = id);
    peer.on('connect', evt => this.emit('start', evt));
    peer.on('video', vid => {
      this.driver.srcObject = vid;
      const mr = new MediaRecorder(vid);
      const chunks: Blob[] = [];
      mr.addEventListener('dataavailable', evt => chunks.push(evt.data));
      mr.addEventListener('stop', async () => {
        console.log('recording stopped');
        const blob = new Blob(chunks, { type: mr.mimeType });
        const url = URL.createObjectURL(blob);
        this.driver.srcObject = null;
        this.driver.src = this.spareDriver.src = url;
        this.faceTracker = await FaceTracker.create(this.spareDriver);
        peer.on('speech', speech => {
          if (!this.voiceID) throw new TypeError('no voice ID for speech');
          const ttsProm = makeTTS(speech, this.voiceID);
          this.lastSpeech = this.lastSpeech.then(async () => {
            const tts = await ttsProm;
            await this.speak(tts);
          });
        });
        this.lastTimestamp = performance.now();
        this.driver.addEventListener('loadedmetadata', () => requestAnimationFrame(ts => this.runLoop(ts)));
      });
    });
    peer.on('disconnect', evt => {
      if (this.driver.src) URL.revokeObjectURL(this.driver.src);
      this.driver.src = this.spareDriver.src = '';
      this.emit('end', evt);
    });
    this.paused = false;
  }
  private flipDriverTime(time: number): number {
    if (time > this.driver.duration) return this.flipDriverTime(2 * this.driver.duration - time);
    if (time < 0) return this.flipDriverTime(-time);
    return time;
  }
  private runLoop(timeStamp: number) {
    this.driver.addEventListener('seeked', () => {
      if (this.reverse ? this.driver.currentTime <= 0 : this.driver.currentTime >= this.driver.duration) {
        this.reverse = !this.reverse;
      }
      if (!this.paused) this.ctx.drawImage(this.driver, 0, 0);
      requestAnimationFrame(ts => this.runLoop(ts));
    }, { once: true });
    const delta = (timeStamp - this.lastTimestamp) / 1000;
    this.driver.currentTime += (this.reverse ? -delta : delta);
    this.lastTimestamp = timeStamp;
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

    let predTime = 0.07;
    delay.delayTime.value = 0.1 + predTime;

    src.connect(delay);
    delay.connect(actx.destination);

    const specPerFrame = 1 / TARGET_FPS / (0.2 / SPECTROGRAM_FRAMES);
    let bufs: Float32Array[] = [];
    this.paused = true;
    const tmpCnv = document.createElement('canvas');
    const tmpCtx = tmpCnv.getContext('2d')!;
    return new Promise<void>(resolve => {
      const interval = setInterval(async () => {
        const buf = new Float32Array(analyser.frequencyBinCount);
        analyser.getFloatFrequencyData(buf);
        bufs.push(buf);
        if (bufs.length == SPECTROGRAM_FRAMES) {
          const spectrogram = bufs.slice();
          this.spareDriver.currentTime = this.flipDriverTime(this.driver.currentTime + predTime);
          this.spareDriver.addEventListener('seeked', () => {
            const face = this.faceTracker.find();
            if (face) {
              tmpCnv.width = this.canvas.width;
              tmpCnv.height = this.canvas.height;
              tmpCtx.drawImage(this.spareDriver, 0, 0);
              const bg = tmpCtx.getImageData(0, 0, tmpCnv.width, tmpCnv.height);
              const img = this.faceTracker.extract(face, IMG_SIZE);
              genFrames([{ img, spectrogram }]).then(([result]) => {
                this.ctx.putImageData(bg, 0, 0);
                this.faceTracker.plaster(face, result, this.ctx);
              });
            }
          }, { once: true });
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