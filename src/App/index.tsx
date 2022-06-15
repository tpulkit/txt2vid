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
import { theme, confirm, dialogs, FaceTracker } from '../util';
import Room from './room';
import { FFT_SIZE, FrameInput, genFrames, IMG_SIZE, SAMPLE_RATE, SPECTROGRAM_FRAMES } from './model';


const un = Math.random().toString(36).slice(2);
const App: FC = () => {
  const [roomID, setRoomID] = useState('');
  const [room, setRoom] = useState<Room | null>(null);
  const [img, setImg] = useState<ImageData | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [faceTracker, setFaceTracker] = useState<FaceTracker | null>(null);
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
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const reemphasis = ctx.createIIRFilter([1, -0.97], [1]);
      const analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = FFT_SIZE;
      src.connect(reemphasis);
      reemphasis.connect(analyserNode);
      // analyserNode.connect(ctx.destination);
      setAnalyser(analyserNode);
      setFaceTracker(await FaceTracker.create(vidRef.current!));
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
    if (analyser != null && img != null) {
      let bufs: Float32Array[] = [];
      const ctx = peerRef.current!.getContext('2d')!;
      const interval = setInterval(async () => {
        let face = faceTracker!.find();
        // if (face != null) {
        //   ctx.putImageData(faceTracker!.extract(face, IMG_SIZE), 0, 0);
        // }
        const buf = new Float32Array(analyser.frequencyBinCount);
        analyser.getFloatFrequencyData(buf);
        bufs.push(buf);
        const batchSize = 1;
        if (bufs.length == SPECTROGRAM_FRAMES * batchSize) {
          // console.log(bufs);
          const ts = performance.now();
          let batch: FrameInput[] = [];
          for (let i = 0; i < batchSize; ++i) {
            batch.push({ img, spectrogram: bufs.slice(i * SPECTROGRAM_FRAMES, (i + 1) * SPECTROGRAM_FRAMES) });
          }
          const result = await genFrames(batch);
          console.log(performance.now() - ts, result);
          ctx.putImageData(result[0], 0, 0);
          // console.log(result.data.reduce((a, v, i) => a + Math.abs(v - img.data[i]), 0));
          bufs = bufs.slice(batchSize * SPECTROGRAM_FRAMES);
        }
      }, 200 / SPECTROGRAM_FRAMES);
      return () => clearInterval(interval);
    }
  }, [analyser, img])
  useLayoutEffect(() => {
    if (room) {
      room.on('ready', () => {
        room.sendVid(stream!);
      });
      room.on('vid', ms => {
        _tmpPeerVidRef.current!.srcObject = ms;
        _tmpPeerVidRef.current!.play();
      });
    }
  }, [room, stream]);
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
        <video ref={vidRef} />
        <video ref={_tmpPeerVidRef} />
        <canvas ref={peerRef} />
        <input type="file" accept="image/*" onChange={async evt => {
          const file = evt.currentTarget.files?.[0];
          if (file) {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.src = url;
            await new Promise(resolve => img.onload = resolve);
            peerRef.current!.width = img.width;
            peerRef.current!.height = img.height;
            const ctx = peerRef.current!.getContext('2d')!;
            ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, IMG_SIZE, IMG_SIZE);
            setImg(ctx.getImageData(0, 0, IMG_SIZE, IMG_SIZE));
            peerRef.current!.width = peerRef.current!.height = IMG_SIZE;
          }
        }} />
      </RMWCProvider>
    </ThemeProvider>
  );
};

export default App;
