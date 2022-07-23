import React, { useEffect, useState, useRef, useMemo, createRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { TextField, Theme, Typography } from 'rmwc';
import '@rmwc/textfield/styles';
import '@rmwc/checkbox/styles';
import '@rmwc/button/styles';
import '@rmwc/dialog/styles';
import {
  useGlobalState,
  PeerVideo,
  Room,
  STTEngine,
  Peer,
  alert
} from '../../util';
import PeerDisplay from './peer-display';

type PeerEntry = {
  peer: Peer;
  ref: React.RefObject<HTMLCanvasElement>;
  vid?: PeerVideo;
};

const Call = () => {
  const [ttsID] = useGlobalState('ttsID');
  const [av] = useGlobalState('av')
  const [username] = useGlobalState('username');
  const [id, setID] = useState(username);
  const { roomID } = useParams();
  const [searchParams] = useSearchParams();
  const [room, setRoom] = useState<Room | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<PeerEntry[]>([]);
  const asr = useMemo(() => new STTEngine(), []);
  const selfView = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const constraints = {
      audio: {
        autoGainControl: false,
        echoCancellation: true,
        noiseSuppression: true,
        deviceId: av.mic
      } as MediaTrackConstraints,
      video: {
        facingMode: 'user',
        height: { ideal: 1080 },
        width: { ideal: 1920 }
      } as MediaTrackConstraints
    };
    if (av.mic && av.mic != 'default') constraints.audio.deviceId = av.mic;
    if (av.cam && av.cam != 'default') constraints.video.deviceId = av.cam;
    navigator.mediaDevices.getUserMedia(constraints).then(stream => {
      selfView.current!.srcObject = stream;
      selfView.current!.muted = true;
      selfView.current!.play();
      setStream(stream);
    }, err => {
      alert({
        title: 'Failed to load webcam or microphone',
        body: 'Please check your webcam settings and try again.',
      });
      navigate('/');
    });
  }, []);

  useEffect(() => {
    if (roomID && stream && ttsID) {
      const room = new Room(roomID, username, searchParams.get('pw') ?? undefined);
      setPeers([]);
      setRoom(room);
      return () => room.disconnect();
    } else setRoom(null);
  }, [roomID, stream, ttsID]);

  useEffect(() => {
    if (room) {
      const cb = room.on('peer', peer => {
        setID(room.senderID!);
        peer.on('connect', () => {
          setPeers(peers => [...peers, { peer, ref: createRef() }]);
        });
      });
      return () => room.off('peer', cb);
    }
  }, [room]);

  useEffect(() => {
    if (!peers.length) asr.stop();
    const cleanups: (() => void)[] = [];
    for (const entry of peers) {
      const scb = asr.on('speech', speech => entry.peer.sendSpeech(speech));
      const ccb = asr.on('correction', speech => entry.peer.sendSpeech(speech));
      const chatCb = entry.peer.on('chat', chat => {
        // TODO
      });
      const dcb = entry.peer.on('disconnect', () => {
        console.log('peer disconnected');
        setPeers(peers => peers.filter(e => e != entry));
      });

      cleanups.push(() => {
        asr.off('speech', scb);
        asr.off('correction', ccb);
        entry.peer.off('disconnect', dcb);
        entry.peer.off('chat', chatCb);
      });

      if (!entry.vid) {
        // asr.start();
        entry.peer.sendTTSID(ttsID);
        const close = entry.peer.sendVideo(stream!);
        // Amount of time doesn't matter - can also be as long as possible
        setTimeout(close, 5000);
        
        entry.vid = new PeerVideo(entry.peer, entry.ref.current!);
      }
    }
    return () => {
      for (const cleanup of cleanups) cleanup();
    }
  }, [peers, asr]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', height: '100vh' }}>
      <Theme use="onSurface">
        <TextField
          outlined
          placeholder="Say something to the other peers"
          onKeyDown={(ev) => {
            if (ev.key == 'Enter' && !ev.shiftKey) {
              for (const { peer } of peers) {
                peer.sendSpeech(ev.currentTarget.value);
              }
              ev.currentTarget.value = '';
            }
          }}
          disabled={!peers.length}
          style={{ width: '30vw', marginTop: '1rem', marginBottom: '1rem' }}
        />
      </Theme>
      {/* <TextField
        placeholder="Send global chat message"
        onKeyDown={(ev) => {
          if (ev.key == 'Enter' && !ev.shiftKey) {
            for (const { peer } of peers) {
              peer.sendChat(ev.currentTarget.value);
            }
            ev.currentTarget.value = '';
          }
        }}
      /> */}
      <div style={{ textAlign: 'center' }}>
        <video ref={selfView} style={{ height: '30vh' }} />
        <div>Your ID is {id}</div>
        <Typography use="body2" style={{ fontWeight: 'bold' }}>
          NOTICE: Try to face forward and remain relatively centered in the webcam stream for the first five seconds<br />
          after connecting to a peer because that is the time your driver video will be recorded.<br /> A bad driver video will always yield
          bad quality.
        </Typography>
      </div>
      <div>
        {peers.map(({ peer, ref }) => <PeerDisplay peer={peer} ref={ref} key={peer.id} />)}
      </div>
    </div>
  );
};

export default Call;
