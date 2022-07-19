import React, { useEffect, useState, useRef, useMemo, createRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
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
  Peer,
  mlInit,
  alert
} from '../../util';

type PeerEntry = {
  peer: Peer;
  ref: React.RefObject<HTMLCanvasElement>;
  vid?: PeerVideo;
};

const Call = () => {
  const [voiceID, setVoiceID] = useGlobalState('voiceID');
  const [username] = useGlobalState('username');
  const [id, setID] = useState(username);
  const { roomID } = useParams();
  const [ready, setReady] = useState(false);
  const [searchParams] = useSearchParams();
  const [room, setRoom] = useState<Room | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<PeerEntry[]>([]);
  const asr = useMemo(() => new STTEngine(), []);
  const selfView = useRef<HTMLVideoElement>(null);
  
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
  }, []);

  useEffect(() => {
    mlInit.then(() => {
      setReady(true);
    });
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
      .then(stream => {
        selfView.current!.srcObject = stream;
        selfView.current!.muted = true;
        selfView.current!.play();
        setStream(stream);
      });
  }, []);

  useEffect(() => {
    if (roomID && stream && voiceID && ready) {
      const room = new Room(roomID, username, searchParams.get('pw') ?? undefined);
      setPeers([]);
      setRoom(room);
      return () => room.disconnect();
    } else setRoom(null);
  }, [roomID, stream, voiceID, ready]);

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
      const dcb = entry.peer.on('disconnect', () => {
        setPeers(peers => peers.filter(e => e != entry));
      });

      cleanups.push(() => {
        asr.off('speech', scb);
        asr.off('correction', ccb);
        entry.peer.off('disconnect', dcb);
      });

      if (!entry.vid) {
        if (process.env.NODE_ENV == 'production') asr.start();
        entry.peer.sendVoiceID(voiceID);
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
    <>
      <TextField
        placeholder="Custom text prompt"
        onKeyDown={(ev) => {
          if (ev.key == 'Enter' && !ev.shiftKey) {
            for (const { peer } of peers) {
              peer.sendSpeech(ev.currentTarget.value);
            }
            ev.currentTarget.value = '';
          }
        }}
      />
      <video ref={selfView} />
      <div>Your ID is {id}</div>
      <div>
        {peers.map(({ peer, ref }) =>
          <div key={peer.id}>
            <canvas ref={ref} style={{ width: '100%' }} />
            <div>Peer ID is {peer.id}</div>
          </div>
        )}
      </div>
    </>
  );
};

export default Call;
