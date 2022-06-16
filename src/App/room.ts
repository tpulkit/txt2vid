import {
  S2C,
  P2P,
  Sendable
} from '../util/network';
import { EventEmitter, mediaStreamToRS, rsToMediaSource } from '../util';

interface SignalingConnectionMessages {
  welcome: string[];
  connect: string;
  disconnect: string;
}

interface RoomP2PEvents {
  speech: string;
}

interface RoomEvents {
  ready: void;
  vid: MediaStream;
  speech: string;
  error: Error;
}

export default class Room extends EventEmitter<RoomEvents> {
  name?: string;
  private conn: P2P<RoomP2PEvents> | null;
  private signal: Sendable<SignalingConnectionMessages, unknown>;
  constructor(id: string, name: string, pw?: string) {
    super();
    this.signal = new S2C<SignalingConnectionMessages, unknown>(
      `/api/room/${id}?un=${name}${pw ? '&pw=' + pw : ''}`
    );
    this.conn = null;
    let foundPeer: string | null = null;
    const peerConnect = async (remote: boolean) => {
      console.log('connecting to peer', foundPeer);
      this.conn = await P2P.init<RoomP2PEvents>(this.signal.sub(foundPeer!), remote);
      this.conn.on('message', (evt) => {
        switch (evt.type) {
          case 'speech':
            this.emit('speech', evt.msg);
            break;
          case 'error':
            this.emit('error', new Error('Peer error: ' + evt.msg));
            break;
        }
      });
      this.conn.on('stream', stream => {
        this.emit('vid', stream);
      });
      this.emit('ready', undefined);
    };
    this.signal.on('message', (evt) => {
      switch (evt.type) {
        case 'welcome':
          const [ownName, ...others] = evt.msg;
          this.name = ownName;
          if (others.length > 1) {
            this.disconnect();
          } else if (others.length) {
            foundPeer = others[0];
            peerConnect(true);
          }
          break;
        case 'connect':
          if (!foundPeer) {
            foundPeer = evt.msg;
            peerConnect(false);
          }
          break;
        case 'disconnect':
          if (foundPeer == evt.msg) {
            foundPeer = null;
            this.conn!.disconnect();
            this.conn = null;
          }
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

  sendVid(stream: MediaStream) {
    this.conn?.sendMediaStream(stream);
  }

  sendSpeech(speech: string) {
    this.conn?.send('speech', speech);
  }

  disconnect() {
    this.signal.disconnect();
    if (this.conn) this.conn.disconnect();
    this.conn = null;
  }
}
