import { useEffect, useState, useRef } from 'react';
import { ThemeProvider, RMWCProvider, TextField, DialogQueue } from 'rmwc';
import '@rmwc/textfield/styles';
import '@rmwc/checkbox/styles';
import '@rmwc/button/styles';
import '@rmwc/dialog/styles';
import {
  theme,
  dialogs,
  prompt,
  useGlobalState,
  Face,
  FaceTracker,
  makeTTS,
  FFT_SIZE,
  IMG_SIZE,
  SAMPLE_RATE,
  SPECTROGRAM_FRAMES,
  genFrames,
  Room,
  STTEngine
} from '../util';

const ASR = window.SpeechRecognition || window.webkitSpeechRecognition;

const sr = new ASR();
sr.continuous = true;
sr.interimResults = true;

declare global {
  interface HTMLAudioElement {
    captureStream(): MediaStream;
  }

  interface HTMLCanvasElement {
    captureStream(): MediaStream;
  }
}

const un = Math.random().toString(36).slice(2);
const App = () => {
  const [voiceID, setVoiceID] = useGlobalState('voiceID');
  const [roomID, setRoomID] = useState('');
  const [asr, setASR] = useState<STTEngine | null>(null)
  const [room, setRoom] = useState<Room | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [faceTracker, setFaceTracker] = useState<FaceTracker | null>(null);
  const [tts, setTTS] = useState<HTMLAudioElement | null>(null);
  const vidRef = useRef<HTMLVideoElement>(null);
  const peerDriverRef = useRef<HTMLVideoElement | null>(null);
  const _tmpPeerVidRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<HTMLCanvasElement>(null);
  const queuedTTS = useRef<Promise<HTMLAudioElement>[] | null>(null);
  // Ask for voice ID if necessary
  useEffect(() => {
    if (!voiceID) {
      prompt({
        title: 'Enter your Resemble voice ID',
        body: <div><span style={{ fontWeight: 'bold' }}>Format:</span> project_id:voice_id</div>,
        preventOutsideDismiss: true,
        acceptLabel: 'Submit',
        cancelLabel: null
      }).then((res: string) => {
        setVoiceID(res);
      })
    }
  }, [voiceID]);
  // Create ASR
  useEffect(() => {
    setASR(new STTEngine());
  }, []);
  useEffect(() => {
    const driver = document.createElement('video');
    driver.addEventListener('ended', () => {
      // let nextTime = driver.currentTime - 0.1;
      // const interval = setInterval(() => {
      //   driver.currentTime = nextTime;
      //   if (driver.currentTime <= 0) {
      //     clearInterval(interval);
      //     driver.currentTime = 0;
      //     driver.play();
      //   }
      //   nextTime -= 0.1;
      // }, 100);
      driver.currentTime = 0;
      driver.play();
    });
    driver.muted = true;
    document.body.appendChild(driver);
    peerDriverRef.current = driver;
    navigator.mediaDevices
      .getUserMedia({
        audio: {
          autoGainControl: false,
          echoCancellation: true,
          noiseSuppression: true
        },
        video: {
          facingMode: 'user',
          height: { ideal: 1080 },
          width: { ideal: 1920 }
        }
      })
      .then(async (stream) => {
        const settings = stream.getVideoTracks()[0].getSettings();
        vidRef.current!.width = peerRef.current!.width = settings.width!;
        vidRef.current!.height = peerRef.current!.height = settings.height!;
        vidRef.current!.srcObject = stream;
        vidRef.current!.muted = true;
        vidRef.current!.play();
        setStream(stream);
      });
  }, []);
  useEffect(() => {
    if (roomID) {
      const room = new Room(roomID, un);
      setRoom(room);
      return () => room.disconnect();
    } else setRoom(null);
  }, [roomID]);
  useEffect(() => {
    if (tts != null) {
      const actx = new AudioContext({ sampleRate: SAMPLE_RATE });
      const src = actx.createMediaElementSource(tts);
      const reemphasis = actx.createIIRFilter([1, -0.97], [1]);
      const analyser = actx.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = 0.2;
      src.connect(reemphasis);
      reemphasis.connect(analyser);

      tts.play();
      console.log(tts);
      if (!queuedTTS.current) queuedTTS.current = [];
      const tmpCnv = document.createElement('canvas');
      const tmpCtx = tmpCnv.getContext('2d')!;
      let bufs: Float32Array[] = [];
      const promises: Promise<{
        gen: ImageData;
        imd: ImageData;
        face: Face;
        timestamp: number;
      }>[] = [];
      const ctx = peerRef.current!.getContext('2d')!;
      const TARGET_FPS = 12;
      const specPerFrame = 1 / TARGET_FPS / (0.2 / SPECTROGRAM_FRAMES);
      const interval = setInterval(async () => {
        const buf = new Float32Array(analyser.frequencyBinCount);
        analyser.getFloatFrequencyData(buf);
        bufs.push(buf);
        if (bufs.length == SPECTROGRAM_FRAMES) {
          const timestamp = performance.now();
          const face = faceTracker?.find();
          if (face) {
            const { videoWidth, videoHeight } = peerDriverRef.current!;
            tmpCnv.width = peerRef.current!.width = videoWidth;
            tmpCnv.height = peerRef.current!.height = videoHeight;
            tmpCtx.drawImage(peerDriverRef.current!, 0, 0);
            const imd = tmpCtx.getImageData(0, 0, videoWidth, videoHeight);
            const faceSrc = faceTracker!.extract(face, IMG_SIZE, tmpCnv);
            promises.push(
              genFrames([{ img: faceSrc, spectrogram: bufs.slice() }]).then(
                (result) => ({
                  gen: result[0],
                  imd,
                  face: face,
                  timestamp
                })
              )
            );
          }
          bufs = bufs.slice(Math.ceil(specPerFrame));
        }
      }, 200 / SPECTROGRAM_FRAMES);
      const onDone = (evt: Event) => {
        setTimeout(async () => {
          clearInterval(interval);
          if (!(evt as ErrorEvent).error) {
            await Promise.all(promises).then((frames) => {
              frames = frames.sort((a, b) => a.timestamp - b.timestamp);
              const audStream = tts.captureStream();
              const cnvStream = peerRef.current!.captureStream();
              cnvStream.addTrack(audStream.getAudioTracks()[0]);
              const mr = new MediaRecorder(cnvStream, {
                mimeType: 'video/webm;codecs=vp9,opus',
                videoBitsPerSecond: 10000000
              });
              const chunks: Blob[] = [];
              mr.addEventListener('dataavailable', (evt) => {
                chunks.push(evt.data);
              });
              mr.addEventListener('stop', () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = Math.random().toString(36).slice(2) + '.webm';
                a.click();
              });
              tts.addEventListener(
                'ended',
                () => {
                  setTimeout(() => mr.stop(), 200);
                },
                { once: true }
              );
              mr.start();
              return new Promise<void>((resolve) => {
                const delay = actx.createDelay();
                delay.delayTime.setValueAtTime(0.1, actx.currentTime);
                src.connect(delay);
                delay.connect(actx.destination);
                tts.currentTime = 0;
                tts.play();
                const ti = performance.now();
                const frameTi = frames[0].timestamp;
                const run = (ts: number) => {
                  const tgtFrame = frames.find(
                    (f) => f.timestamp - frameTi >= ts - ti
                  );
                  if (tgtFrame) {
                    const { gen, imd, face } = tgtFrame;
                    ctx.putImageData(imd, 0, 0);
                    faceTracker!.plaster(face, gen, ctx);
                    requestAnimationFrame(run);
                  } else {
                    resolve();
                  }
                };
                run(ti);
              });
            });
          }
          const next = queuedTTS.current!.shift();
          if (next) setTTS(await next);
          else queuedTTS.current = null;
        }, 200);
      };
      tts.addEventListener('ended', onDone, { once: true });
      tts.addEventListener('error', onDone, { once: true });
      return () => clearInterval(interval);
    }
  }, [faceTracker, tts, setTTS]);
  useEffect(() => {
    if (room && asr) {
      const speechCB = asr.on('speech', speech => room.sendSpeech(speech));
      const rcb = room.on('connect', peer => {
        room.sendID(voiceID, peer);
        room.sendVid(stream!, peer);
      });
      const cb = room.on('vid', async (ms) => {
        setFaceTracker(await FaceTracker.create(peerDriverRef.current!));
        _tmpPeerVidRef.current!.srcObject = ms;
        _tmpPeerVidRef.current!.muted = true;
        _tmpPeerVidRef.current!.play();
        const restartMR = () => {
          const mr = new MediaRecorder(ms, {
            mimeType: 'video/webm;codecs=vp8,opus',
            videoBitsPerSecond: 10000000
          });
          mr.addEventListener('dataavailable', (evt) => {
            if (peerDriverRef.current!.srcObject)
              peerDriverRef.current!.srcObject = null;
            if (peerDriverRef.current!.src) {
              return; // for debugging only - in production we should always get the latest driver
              URL.revokeObjectURL(peerDriverRef.current!.src);
            }
            peerDriverRef.current!.src = URL.createObjectURL(evt.data);
            peerDriverRef.current!.play();
            restartMR();
          });
          mr.start();
          setTimeout(() => mr.stop(), 5000);
        };
        setTimeout(restartMR, 0);
        if (!room._tmpRemote) asr.start();
      });
      let id = '';
      const icb = room.on('id', (msg) => {
        id = msg;
      });
      const scb = room.on('speech', async (msg) => {
        const ttsProm = makeTTS(msg, id);
        if (!queuedTTS.current) {
          setTTS(await ttsProm);
        } else {
          queuedTTS.current.push(ttsProm);
        }
      });
      return () => {
        asr.off('speech', speechCB);
        room.off('connect', rcb);
        room.off('vid', cb);
        room.off('speech', scb);
        room.off('id', icb);
        asr.stop();
      };
    }
  }, [room, stream, setFaceTracker, setTTS]);
  return (
    <ThemeProvider options={theme}>
      <RMWCProvider>
        <DialogQueue dialogs={dialogs} />
        <TextField
          placeholder="Room ID"
          onKeyDown={(ev) => {
            if (ev.key == 'Enter') {
              setRoomID(ev.currentTarget.value);
              ev.currentTarget.value = '';
            }
          }}
        />
        <TextField
          placeholder="Manual TTS (your voice)"
          onKeyDown={async (ev) => {
            if (ev.key == 'Enter') {
              setTTS(await makeTTS(ev.currentTarget.value, voiceID));
              ev.currentTarget.value = '';
            }
          }}
        />
        <video ref={vidRef} />
        <video ref={_tmpPeerVidRef} />
        <canvas ref={peerRef} />
      </RMWCProvider>
    </ThemeProvider>
  );
};

export default App;
