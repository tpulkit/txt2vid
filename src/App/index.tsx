import React, {
  FC,
  useEffect,
  useLayoutEffect,
  useState,
  useMemo,
  useRef
} from 'react';
import {
  ThemeProvider,
  RMWCProvider,
  TextField,
  Checkbox,
  Button,
  SimpleDialog
} from 'rmwc';
import '@rmwc/textfield/styles';
import '@rmwc/checkbox/styles';
import '@rmwc/button/styles';
import '@rmwc/dialog/styles';
import { css } from '@emotion/react';
import { createWriteStream } from 'streamsaver';
import { theme, prompt, dialogs, FaceTracker, makeTTS, Face } from '../util';
import Room from './room';
import {
  FFT_SIZE,
  FrameInput,
  IMG_SIZE,
  SAMPLE_RATE,
  SPECTROGRAM_FRAMES,
  genFrames
} from './model';

const ASR = window.SpeechRecognition || window.webkitSpeechRecognition;

const asr = new ASR();
console.log(asr);
asr.continuous = true;
asr.interimResults = true;

let rawTS = 0;

let ID = localStorage.getItem('voice_id');

declare global {
  interface HTMLAudioElement {
    captureStream(): MediaStream;
  }
  
  interface HTMLCanvasElement {
    captureStream(): MediaStream;
  }
}

const un = Math.random().toString(36).slice(2);
const App: FC = () => {
  const [roomID, setRoomID] = useState('');
  const [room, setRoom] = useState<Room | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [faceTracker, setFaceTracker] = useState<FaceTracker | null>(null);
  const [tts, setTTS] = useState<HTMLAudioElement | null>(null);
  const vidRef = useRef<HTMLVideoElement>(null);
  const peerDriverRef = useRef<HTMLVideoElement | null>(null);
  const _tmpPeerVidRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<HTMLCanvasElement>(null);
  const queuedTTS = useRef<Promise<HTMLAudioElement>[] | null>(null);
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
      const promises: Promise<{gen: ImageData; imd: ImageData; face: Face; timestamp: number;}>[] = [];
      const ctx = peerRef.current!.getContext('2d')!;
      const TARGET_FPS = 12;
      const specPerFrame = (1 / TARGET_FPS) / (0.2 / SPECTROGRAM_FRAMES);
      rawTS = performance.now();
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
            promises.push(genFrames([{ img: faceSrc, spectrogram: bufs.slice() }]).then(result => 
              ({ gen: result[0], imd, face: face!, timestamp })
            ));
          }
          bufs = bufs.slice(Math.ceil(specPerFrame));
        }
      }, 200 / SPECTROGRAM_FRAMES);
      const onDone = (evt: Event) => {
        setTimeout(async () => {
          clearInterval(interval);
          if (!(evt as ErrorEvent).error) {
            await Promise.all(promises).then(frames => {
              console.log('total time taken:', performance.now() - rawTS);
              console.log('raw time taken:', (performance.now() - rawTS) - tts.duration * 1000)
              frames = frames.sort((a, b) => a.timestamp - b.timestamp);
              const audStream = tts.captureStream();
              const cnvStream = peerRef.current!.captureStream();
              cnvStream.addTrack(audStream.getAudioTracks()[0]);
              const mr = new MediaRecorder(cnvStream, { mimeType: 'video/webm;codecs=vp9,opus', bitsPerSecond: 10000000 });
              const chunks: Blob[] = [];
              mr.addEventListener('dataavailable', evt => {
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
              tts.addEventListener('ended', () => {
                setTimeout(() => mr.stop(), 200);
              }, { once: true });
              mr.start();
              return new Promise<void>(resolve => {
                const delay = actx.createDelay();
                delay.delayTime.setValueAtTime(0.1, actx.currentTime);
                src.connect(delay);
                delay.connect(actx.destination);
                tts.currentTime = 0;
                tts.play();
                const ti = performance.now();
                const frameTi = frames[0].timestamp;
                const run = (ts: number) => {
                  const tgtFrame = frames.find(f => (f.timestamp - frameTi) >= (ts - ti));
                  if (tgtFrame) {
                    const { gen, imd, face } = tgtFrame;
                    ctx.putImageData(imd, 0, 0);
                    faceTracker!.plaster(face, gen, ctx);
                    requestAnimationFrame(run);
                  } else {
                    resolve();
                  }
                }
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
  useLayoutEffect(() => {
    if (room) {
      let stripFront = '';
      const asrHandler = (evt: SpeechRecognitionEvent) => {
        console.log(evt);
        let readyMsg = '';
        let finalizedUpTo = 0;
        for (let i = 0; i < evt.results.length; ++i) {
          const result = evt.results.item(i);
          const alt = result.item(0);
          if (alt.confidence < 0.7 && !result.isFinal) break;
          readyMsg += alt.transcript + ' ';
          if (result.isFinal)
            finalizedUpTo = readyMsg.length - stripFront.length;
        }
        if (!readyMsg.startsWith(stripFront)) {
          console.warn('tts mismatch, ignoring');
          for (let i = stripFront.length; i > 0; --i) {
            if (readyMsg[i] == ' ') {
              stripFront = readyMsg.slice(0, i);
              break;
            }
          }
        }
        readyMsg = readyMsg.slice(stripFront.length);
        if (readyMsg.length > 100) {
          const send = readyMsg.slice(0, 50);
          stripFront += send;
          console.log('sending', send);
          room.sendSpeech(send);
        } else if (finalizedUpTo) {
          const send = readyMsg.slice(0, finalizedUpTo);
          stripFront += send;
          console.log('sending finalized', send);
          room.sendSpeech(send);
        }
      };
      asr.addEventListener('result', asrHandler);
      const stopHandler = () => {
        asr.start();
      };
      asr.addEventListener('end', stopHandler);
      const rcb = room.on('ready', () => {
        room.sendID(ID!);
        room.sendVid(stream!);
      });
      const cb = room.on('vid', async (ms) => {
        setFaceTracker(await FaceTracker.create(peerDriverRef.current!));
        _tmpPeerVidRef.current!.srcObject = ms;
        _tmpPeerVidRef.current!.muted = true;
        _tmpPeerVidRef.current!.play();
        const restartMR = () => {
          const mr = new MediaRecorder(ms, {
            mimeType: 'video/webm;codecs=vp8,opus',
            bitsPerSecond: 10000000
          });
          mr.addEventListener('dataavailable', (evt) => {
            if (peerDriverRef.current!.srcObject) peerDriverRef.current!.srcObject = null;
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
        if (!room.remote) asr.start();
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
        room.off('ready', rcb);
        room.off('vid', cb);
        room.off('speech', scb);
        room.off('id', icb);
        asr.removeEventListener('end', stopHandler);
        asr.removeEventListener('result', asrHandler);
        if (!room.remote) asr.stop();
      };
    }
  }, [room, stream, setFaceTracker, setTTS]);
  return (
    <ThemeProvider options={theme}>
      <RMWCProvider>
        <SimpleDialog
          title="Enter your Resemble ID"
          acceptLabel="Submit"
          cancelLabel={null}
          body={<div>
            <div><span style={{ fontWeight: 'bold' }}>Format:</span> project_id:voice_id</div>
            <TextField onInput={(evt: React.FormEvent<HTMLInputElement>) => {
              localStorage.setItem('voice_id', evt.currentTarget.value);
            }} />
          </div>}
          preventOutsideDismiss
          open={!ID}
          onClose={evt => {
            ID = localStorage.getItem('voice_id');
          }}
        />
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
              setTTS(
                await makeTTS(ev.currentTarget.value, ID!)
              );
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
