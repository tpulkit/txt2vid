import React, { useEffect, useState, useRef, useMemo, createRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Slider, Switch, TextField, Theme, Typography, SliderOnChangeEventT, Checkbox } from 'rmwc';
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
  senders?: RTCRtpSender[];
};

const Call = () => {
  const [ttsID] = useGlobalState('ttsID');
  const [av] = useGlobalState('av')
  const [username] = useGlobalState('username');
  const [id, setID] = useState(username);
  const [driverVideoLength, setDriverVideoLength] = useState(5000);
  const [bitrate, setBitrate] = useState(1000);
  const [useTxt2Vid, setUseTxt2Vid] = useState(true);
  const { roomID } = useParams();
  const [searchParams] = useSearchParams();
  const [room, setRoom] = useState<Room | null>(null);
  const [autoASR, setAutoASR] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<PeerEntry[]>([]);
  const [ready, setReady] = useState(false);
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
    if (roomID && stream && ttsID && ready) {
      const room = new Room(roomID, username, searchParams.get('pw') ?? undefined);
      setPeers([]);
      setRoom(room);
      return () => room.disconnect();
    } else setRoom(null);
  }, [roomID, stream, ttsID, ready]);

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
    for (const { senders } of peers) {
      for (const sender of senders || []) {
        if (['video', 'audio'].includes(sender.track?.kind!)) {
          const params = sender.getParameters();
          if (!params.encodings) params.encodings = [{}];
          params.encodings[0].maxBitrate = sender.track!.kind == 'video' ? bitrate * 900 : bitrate * 100;
          sender.setParameters(params);
        }
      }
    }
  }, [bitrate]);

  useEffect(() => {
    if (autoASR && peers.length) asr.start();
    else asr.stop();
    const cleanups: (() => void)[] = [];
    for (const entry of peers) {
      if (autoASR) {
        const scb = asr.on('speech', speech => entry.peer.sendSpeech(speech));
        const ccb = asr.on('correction', speech => entry.peer.sendSpeech(speech));
        cleanups.push(() => {
          asr.off('speech', scb);
          asr.off('correction', ccb);
        });
      }

      const chatCb = entry.peer.on('chat', chat => {
        // TODO
      });
      const dcb = entry.peer.on('disconnect', () => {
        setPeers(peers => peers.filter(e => e != entry));
      });

      cleanups.push(() => {
        entry.peer.off('disconnect', dcb);
        entry.peer.off('chat', chatCb);
      });

      if (!entry.vid) {
        entry.peer.sendTTSID(ttsID);
        const result = entry.peer.sendVideo(stream!);
        entry.senders = result.senders;
        // Amount of time doesn't matter - can also be as long as possible
        if (useTxt2Vid) setTimeout(result.close, driverVideoLength);
        
        entry.vid = new PeerVideo(entry.peer, entry.ref.current!);
      }
    }
    return () => {
      for (const cleanup of cleanups) cleanup();
    }
  }, [peers, asr, autoASR]);
  useEffect(() => {
    dispatchEvent(new Event('resize'));
  }, [useTxt2Vid]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', height: '100vh' }}>
      <Theme use="onSurface" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div>
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
            disabled={!peers.length || autoASR}
            style={{ width: '30vw', marginTop: '1rem', marginBottom: '1rem' }}
          />
          <Switch label="Send speech" onChange={(evt: React.FormEvent<HTMLInputElement>) => {
            setAutoASR(evt.currentTarget.checked);
          }} disabled={!asr.supported} style={{ marginLeft: '2rem' }} />
        </div>
        <Theme use="onSurface" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Slider
            value={driverVideoLength / 1000}
            onChange={(evt: SliderOnChangeEventT) => setDriverVideoLength(evt.detail.value * 1000)}
            min={3}
            max={10}
            discrete
            step={0.5}
            disabled={peers.length > 0}
            style={!useTxt2Vid ? { display: 'none' } : {}}
          />
          <Slider
            value={bitrate}
            onChange={(evt: SliderOnChangeEventT) => setBitrate(evt.detail.value)}
            min={10}
            max={2000}
            discrete
            step={10}
            disabled={!peers.length}
            style={!useTxt2Vid ? {} : { display: 'none' }}
          />
          <Checkbox
            theme="onSurface"
            label="Disable Txt2Vid (high bandwidth required)"
            disabled={peers.length > 0}
            checked={!useTxt2Vid}
            onChange={(evt: React.FormEvent<HTMLInputElement>) => {
              setUseTxt2Vid(!evt.currentTarget.checked);
            }}
          />
          <Typography use="body1">{useTxt2Vid
            ? `Using Txt2Vid (~100bps, ${driverVideoLength / 1000}s driver video)`
            : `Using VP8/VP9 (~${bitrate}kbps)`}</Typography>
          <Switch label="Ready" checked={ready} onChange={(evt: React.FormEvent<HTMLInputElement>) => {
            setReady(evt.currentTarget.checked);
          }} style={{ margin: '1rem' }} />
        </Theme>
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
