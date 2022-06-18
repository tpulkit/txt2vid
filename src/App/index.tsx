import {
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
  DialogQueue
} from 'rmwc';
import '@rmwc/textfield/styles';
import '@rmwc/checkbox/styles';
import '@rmwc/button/styles';
import '@rmwc/dialog/styles';
import { css } from '@emotion/react';
import { createWriteStream } from 'streamsaver';
import { theme, confirm, dialogs, FaceTracker, makeTTS } from '../util';
import Room from './room';
import {
  FFT_SIZE,
  FrameInput,
  genFrames,
  IMG_SIZE,
  SAMPLE_RATE,
  SPECTROGRAM_FRAMES
} from './model';

const ASR = window.SpeechRecognition || window.webkitSpeechRecognition;

const asr = new ASR();
console.log(asr);
asr.continuous = true;
asr.interimResults = true;

const ID = 'cc3ddc80:91c6bde6'; // TODO: prompt for this and cache in localstorage

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
      let nextTime = driver.currentTime - 0.05;
      const interval = setInterval(() => {
        driver.currentTime = nextTime;
        if (driver.currentTime <= 0) {
          clearInterval(interval);
          driver.currentTime = 0;
          driver.play();
        }
        nextTime -= 0.05;
      }, 50);
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
        video: { facingMode: 'user', width: 480, height: 360 }
      })
      .then(async (stream) => {
        const settings = stream.getVideoTracks()[0].getSettings();
        console.log(stream.getAudioTracks()[0].getSettings());
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
      const actx = new AudioContext();
      const src = actx.createMediaElementSource(tts);
      const delay = actx.createDelay();
      // delayTime = average time for model to process
      delay.delayTime.setValueAtTime(0.1, 0);
      src.connect(delay);
      delay.connect(actx.destination);
      const reemphasis = actx.createIIRFilter([1, -0.97], [1]);
      const analyser = actx.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      src.connect(reemphasis);
      reemphasis.connect(analyser);

      tts.play();
      if (!queuedTTS.current) queuedTTS.current = [];
      let bufs: Float32Array[] = [];
      const ctx = peerRef.current!.getContext('2d')!;
      const interval = setInterval(async () => {
        const face = faceTracker?.find();
        const img = face ? faceTracker!.extract(face, IMG_SIZE) : null;
        const buf = new Float32Array(analyser.frequencyBinCount);
        analyser.getFloatFrequencyData(buf);
        bufs.push(buf);
        const batchSize = 1;
        if (bufs.length == SPECTROGRAM_FRAMES * batchSize) {
          // console.log(bufs);
          if (img) {
            const { width, height } = (_tmpPeerVidRef.current!
              .srcObject as MediaStream)
              .getVideoTracks()[0]
              .getSettings();
            peerRef.current!.width = width!;
            peerRef.current!.height = height!;
            ctx.drawImage(peerDriverRef.current!, 0, 0);
            const ts = performance.now();
            const batch: FrameInput[] = [];
            for (let i = 0; i < batchSize; ++i) {
              batch.push({
                img,
                spectrogram: bufs.slice(
                  i * SPECTROGRAM_FRAMES,
                  (i + 1) * SPECTROGRAM_FRAMES
                )
              });
            }
            const result = await genFrames(batch);
            console.log(performance.now() - ts, result);
            faceTracker!.plaster(face!, result[0], ctx);
          }
          bufs = bufs.slice(8);
        }
      }, 200 / SPECTROGRAM_FRAMES);
      const onDone = async () => {
        clearInterval(interval);
        const next = queuedTTS.current!.shift();
        if (next) setTTS(await next);
        else queuedTTS.current = null;
      };
      tts.addEventListener('ended', onDone);
      tts.addEventListener('error', onDone);
      return () => clearInterval(interval);
    }
  }, [faceTracker, tts]);
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
        room.sendID(ID);
        room.sendVid(stream!);
      });
      const cb = room.on('vid', async (ms) => {
        setFaceTracker(await FaceTracker.create(peerDriverRef.current!));
        _tmpPeerVidRef.current!.srcObject = ms;
        _tmpPeerVidRef.current!.muted = true;
        _tmpPeerVidRef.current!.play();
        const restartMR = () => {
          const mr = new MediaRecorder(ms, {
            mimeType: 'video/webm;codecs=vp8,opus'
          });
          mr.addEventListener('dataavailable', (evt) => {
            if (peerDriverRef.current!.src) {
              return; // for debugging only - in production we should always get the latest driver
              URL.revokeObjectURL(peerDriverRef.current!.src);
            }
            peerDriverRef.current!.src = URL.createObjectURL(evt.data);
            peerDriverRef.current!.play();
            restartMR();
          });
          mr.start();
          setTimeout(() => mr.stop(), 10000);
        };
        restartMR();
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
          placeholder="Manual TTS (Arjun)"
          onKeyDown={async (ev) => {
            if (ev.key == 'Enter') {
              setTTS(
                await makeTTS(ev.currentTarget.value, 'cc3ddc80:91c6bde6')
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
