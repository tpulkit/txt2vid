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
}

interface PeerEvents {
  connect: void;
  voiceID: string;
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
  sendVoiceID(id: string): void;
  sendVideo(stream: MediaStream): void;
  sendSpeech(speech: string): void;
}

class RoomPeer extends EventEmitter<PeerEvents> implements Peer {
  constructor(private conn: P2P<P2PEvents>, public id: string) {
    super();
    conn.on('connect', evt => this.emit('connect', evt));
    conn.on('disconnect', evt => this.emit('disconnect', evt));
    conn.on('message', evt => {
      switch (evt.type) {
        case 'speech':
          this.emit('speech', evt.msg);
          break;
        case 'id':
          this.emit('voiceID', evt.msg);
          break;
        case 'error':
          this.emit('error', new Error(`Peer ${id} error: ${evt.msg}`));
          break;
      }
    });
    conn.on('stream', stream => this.emit('video', stream));
  }
  sendVoiceID(id: string) {
    this.conn.send('id', id);
  }
  sendVideo(stream: MediaStream) {
    this.conn.sendMediaStream(stream);
  }
  sendSpeech(speech: string) {
    this.conn.send('speech', speech);
  }
}

export class Room extends EventEmitter<RoomEvents> {
  name?: string;
  _tmpRemote?: boolean;
  private conns: Record<string, P2P<P2PEvents>>;
  private signal: Sendable<SignalingConnectionMessages>;
  constructor(id: string, name: string, pw?: string) {
    super();
    this.signal = new S2C<SignalingConnectionMessages>(
      `/api/room/${id}?un=${encodeURIComponent(name)}${pw ? '&pw=' + encodeURIComponent(pw) : ''}`
    );
    this.conns = {};
    const peerConnect = async (peer: string, remote: boolean) => {
      this.conns[peer] = await P2P.init<P2PEvents>(
        this.signal.sub(peer),
        remote
      );
      this.emit('peer', new RoomPeer(this.conns[peer], peer));
    };
    this.signal.on('message', (evt) => {
      switch (evt.type) {
        case 'welcome':
          const [ownName, ...others] = evt.msg;
          this.name = ownName;
          this._tmpRemote = false;
          for (const other of others) {
            this._tmpRemote = true;
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
