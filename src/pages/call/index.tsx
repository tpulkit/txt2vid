import { useEffect, useState, useRef } from 'react';
import { ThemeProvider, RMWCProvider, TextField, DialogQueue } from 'rmwc';
import '@rmwc/textfield/styles';
import '@rmwc/checkbox/styles';
import '@rmwc/button/styles';
import '@rmwc/dialog/styles';
import {
  prompt,
  useGlobalState,
  PeerVideo,
  Room,
  STTEngine,
  Peer
} from '../../util';

const un = Math.random().toString(36).slice(2);
const Call = () => {
  const [voiceID, setVoiceID] = useGlobalState('voiceID');
  const [roomID, setRoomID] = useState('');
  const [asr, setASR] = useState<STTEngine | null>(null)
  const [room, setRoom] = useState<Room | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const vidRef = useRef<HTMLVideoElement>(null);
  const peerContainer = useRef<HTMLDivElement>(null);
  const peers = useRef<Peer[]>([]);
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
    if (room && asr && stream) {
      const cb = room.on('peer', peer => {
        peers.current.push(peer);
        // if (!room._tmpRemote) asr.start();
        if (room._tmpRemote) {
          const peerVid = new PeerVideo(peer);
          peerVid.on('start', () => peerContainer.current!.appendChild(peerVid.canvas));
          peerVid.on('end', () => peerContainer.current!.removeChild(peerVid.canvas));
        }
        peer.on('connect', () => {
          peer.sendVoiceID(voiceID);
          peer.sendVideo(stream);
          asr.on('speech', speech => peer.sendSpeech(speech));
          asr.on('correction', speech => peer.sendSpeech(speech));
        });
        // in prod, do this at some point to realize bandwidth savings
        // setTimeout(() => {
        //   for (const track of stream.getTracks()) {
        //     track.stop();
        //   }
        // }, 5000);
      });
      return () => room.off('peer', cb);
    }
  }, [room, asr, stream]);
  return (
    <>
      <TextField
        placeholder="Room ID"
        onKeyDown={(ev) => {
          if (ev.key == 'Enter') {
            setRoomID(ev.currentTarget.value);
            ev.preventDefault();
            ev.currentTarget.value = '';
          }
        }}
      />
      <TextField
        textarea
        placeholder="Custom text prompt"
        onKeyDown={(ev) => {
          if (ev.key == 'Enter' && !ev.shiftKey) {
            for (const peer of peers.current) {
              peer.sendSpeech(ev.currentTarget.value);
            }
            ev.currentTarget.value = '';
          }
        }}
      />
      <video ref={vidRef} style={{display: 'none'}} />
      <div ref={peerContainer} />
    </>
  );
};

export default Call;
