import { S2C, P2P, Sendable, SignalingConnectionEvents, Connection } from '../network';
import { EventEmitter } from '../sub';

interface SignalingConnectionMessages {
  welcome: string[];
  connect: string;
  disconnect: string;
}

interface P2PEvents {
  speech: string;
  id: string;
  chat: string;
}

interface PeerEvents {
  connect: void;
  ttsID: string;
  chat: string;
  video: MediaStream;
  speech: string;
  disconnect: void;
  error: Error;
};

interface RoomEvents {
  peer: Peer;
  error: Error;
}

export interface Peer extends EventEmitter<PeerEvents> {
  id: string;
  sendTTSID(id: string): void;
  sendVideo(stream: MediaStream): { senders: RTCRtpSender[]; close: () => void; };
  sendSpeech(speech: string): void;
  sendChat(chat: string): void;
}

class RoomPeer extends EventEmitter<PeerEvents> implements Peer {
  private closed = true;
  constructor(private conn: P2P<P2PEvents>, public id: string) {
    super();
    conn.on('connect', evt => {
      this.closed = false;
      this.emit('connect', evt);
    });
    conn.on('disconnect', evt => {
      this.closed = true;
      this.emit('disconnect', evt);
    });
    conn.on('message', evt => {
      switch (evt.type) {
        case 'speech':
          this.emit('speech', evt.msg);
          break;
        case 'chat':
          this.emit('chat', evt.msg);
          break;
        case 'id':
          this.emit('ttsID', evt.msg);
          break;
        case 'error':
          this.emit('error', new Error(`Peer ${id} error: ${evt.msg}`));
          break;
      }
    });
    conn.on('stream', stream => this.emit('video', stream));
  }
  sendTTSID(id: string) {
    if (this.closed) return;
    this.conn.send('id', id);
  }
  sendVideo(stream: MediaStream) {
    if (this.closed) return { senders: [], close: () => {} };
    return this.conn.sendMediaStream(stream);
  }
  sendChat(chat: string) {
    if (this.closed) return;
    this.conn.send('chat', chat);
  }
  sendSpeech(speech: string) {
    if (this.closed) return;
    this.conn.send('speech', speech);
  }
}

export class Room extends EventEmitter<RoomEvents> {
  senderID?: string;
  private conns: Record<string, P2P<P2PEvents>>;
  private signal: Sendable<SignalingConnectionMessages>;
  constructor(id: string, name: string, pw?: string) {
    super();
    this.signal = new S2C<SignalingConnectionMessages>(
      `/api/room/${id}?un=${encodeURIComponent(name)}${pw ? '&pw=' + encodeURIComponent(pw) : ''}`
    );
    this.conns = {};
    const peerConnect = async (peer: string, remote: boolean) => {
      const peerSignal = this.signal.sub<SignalingConnectionEvents>(peer);
      this.conns[peer] = await P2P.init<P2PEvents>(peerSignal, remote);
      this.conns[peer].on('disconnect', () => peerSignal.disconnect());
      this.emit('peer', new RoomPeer(this.conns[peer], peer));
    };
    this.signal.on('message', (evt) => {
      switch (evt.type) {
        case 'welcome':
          const [ownID, ...others] = evt.msg;
          this.senderID = ownID;
          for (const other of others) {
            peerConnect(other, true);
          }
          break;
        case 'connect':
          peerConnect(evt.msg, false);
          break;
        case 'disconnect':
          this.conns[evt.msg]?.disconnect();
          delete this.conns[evt.msg];
          break;
        case 'error':
          this.emit(
            'error',
            new Error(`signaling connection error: ${evt.msg}`)
          );
          break;
      }
    });
  }

  disconnect() {
    this.signal.disconnect();
    for (const conn in this.conns) {
      this.conns[conn].disconnect();
    }
  }
}
