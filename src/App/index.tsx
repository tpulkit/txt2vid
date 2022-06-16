import { FC, useEffect, useLayoutEffect, useState, useMemo, useRef } from 'react';
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
import { FFT_SIZE, FrameInput, genFrames, IMG_SIZE, SAMPLE_RATE, SPECTROGRAM_FRAMES } from './model';

const ASR = window.SpeechRecognition || window.webkitSpeechRecognition;

const asr = new ASR();
asr.continuous = true;

const un = Math.random().toString(36).slice(2);
const App: FC = () => {
  const [roomID, setRoomID] = useState('');
  const [room, setRoom] = useState<Room | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [faceTracker, setFaceTracker] = useState<FaceTracker | null>(null);
  const [tts, setTTS] = useState<HTMLAudioElement | null>(null);
  const vidRef = useRef<HTMLVideoElement>(null);
  const _tmpPeerVidRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: { autoGainControl: false, echoCancellation: true, noiseSuppression: true }, video: { facingMode: 'user', width: 480, height: 360 } }).then(async stream => {
      let settings = stream.getVideoTracks()[0].getSettings();
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
    if (analyser != null && tts != null) {
      tts.play();
      let bufs: Float32Array[] = [];
      const ctx = peerRef.current!.getContext('2d')!;
      const interval = setInterval(async () => {
        let face = faceTracker?.find();
        let img = face ? faceTracker!.extract(face, IMG_SIZE) : null;
        const buf = new Float32Array(analyser.frequencyBinCount);
        analyser.getFloatFrequencyData(buf);
        bufs.push(buf);
        const batchSize = 1;
        if (bufs.length == SPECTROGRAM_FRAMES * batchSize) {
          // console.log(bufs);
          if (img) {
            const { width, height } = (_tmpPeerVidRef.current!.srcObject as MediaStream).getVideoTracks()[0].getSettings();
            peerRef.current!.width = width!;
            peerRef.current!.height = height!;
            ctx.drawImage(_tmpPeerVidRef.current!, 0, 0);
            const ts = performance.now();
            let batch: FrameInput[] = [];
            for (let i = 0; i < batchSize; ++i) {
              batch.push({ img, spectrogram: bufs.slice(i * SPECTROGRAM_FRAMES, (i + 1) * SPECTROGRAM_FRAMES) });
            }
            const result = await genFrames(batch);
            console.log(performance.now() - ts, result);
            faceTracker!.plaster(face!, result[0], ctx);
          }
          bufs = bufs.slice(8);
        }
      }, 200 / SPECTROGRAM_FRAMES);
      return () => clearInterval(interval);
    }
  }, [analyser, faceTracker, tts]);
  useEffect(() => {
    if (tts) {
      const ctx = new AudioContext();
      const src = ctx.createMediaElementSource(tts);
      const delay = ctx.createDelay();
      // delayTime = average time for model to process
      delay.delayTime.setValueAtTime(0.1, 0);
      src.connect(delay);
      delay.connect(ctx.destination);
      const reemphasis = ctx.createIIRFilter([1, -0.97], [1]);
      const analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = FFT_SIZE;
      src.connect(reemphasis);
      reemphasis.connect(analyserNode);
      setAnalyser(analyserNode);
    }
  }, [tts]);
  useLayoutEffect(() => {
    if (room) {
      const asrHandler = (evt: SpeechRecognitionEvent) => {
        const newMessages = [...evt.results].slice(evt.resultIndex)
        room.sendSpeech(newMessages.map(msg => msg.item(0).transcript).join(' '))
      };
      asr.addEventListener('result', asrHandler);
      const rcb = room.on('ready', () => {
        room.sendVid(stream!);
      });
      const cb = room.on('vid', async ms => {
        setFaceTracker(await FaceTracker.create(vidRef.current!));
        _tmpPeerVidRef.current!.srcObject = ms;
        _tmpPeerVidRef.current!.muted = true;
        _tmpPeerVidRef.current!.play();
        asr.start();
      });
      const scb = room.on('speech', async msg => {
        setTTS(await makeTTS(msg, 'cc3ddc80:91c6bde6'));
      });
      return () => {
        room.off('ready', rcb);
        room.off('vid', cb);
        room.off('speech', scb);
        asr.stop();
        asr.removeEventListener('result', asrHandler);
      }
    }
  }, [room, stream, setFaceTracker, setAnalyser]);
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
          placeholder="TTS"
          onKeyDown={async (ev) => {
            if (ev.key == 'Enter') {
              setTTS(await makeTTS(ev.currentTarget.value!, 'cc3ddc80:91c6bde6'));
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
