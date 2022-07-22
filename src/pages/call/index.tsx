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
  alert
} from '../../util';
import PeerDisplay from './peer-display';

type PeerEntry = {
  peer: Peer;
  ref: React.RefObject<HTMLCanvasElement>;
  vid?: PeerVideo;
};

const Call = () => {
  const [ttsID, setTTSID] = useGlobalState('ttsID');
  const [username] = useGlobalState('username');
  const [id, setID] = useState(username);
  const { roomID } = useParams();
  const [searchParams] = useSearchParams();
  const [room, setRoom] = useState<Room | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<PeerEntry[]>([]);
  const asr = useMemo(() => new STTEngine(), []);
  const selfView = useRef<HTMLVideoElement>(null);

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
        console.log('received chat', chat);
      });
      const dcb = entry.peer.on('disconnect', () => {
        setPeers(peers => peers.filter(e => e != entry));
      });

      cleanups.push(() => {
        asr.off('speech', scb);
        asr.off('correction', ccb);
        entry.peer.off('disconnect', dcb);
        entry.peer.off('chat', chatCb);
      });

      if (!entry.vid) {
        if (process.env.NODE_ENV == 'production') asr.start();
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
      <TextField
        placeholder="Send global chat message"
        onKeyDown={(ev) => {
          if (ev.key == 'Enter' && !ev.shiftKey) {
            for (const { peer } of peers) {
              peer.sendChat(ev.currentTarget.value);
            }
            ev.currentTarget.value = '';
          }
        }}
      />
      <video ref={selfView} />
      <div>Your ID is {id}</div>
      <div>
        {peers.map(({ peer, ref }) => <PeerDisplay ref={ref} key={peer.id} />)}
      </div>
    </>
  );
};

export default Call;
