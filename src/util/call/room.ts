import { S2C, P2P, Sendable } from '../network';
import { EventEmitter } from '..';

interface SignalingConnectionMessages {
  welcome: string[];
  connect: string;
  disconnect: string;
}

interface RoomP2PEvents {
  speech: string;
  id: string;
}

interface RoomEvents {
  connect: string;
  disconnect: string;
  vid: MediaStream;
  speech: string;
  id: string;
  error: Error;
}

export class Room extends EventEmitter<RoomEvents> {
  name?: string;
  _tmpRemote?: boolean;
  private conns: Record<string, P2P<RoomP2PEvents>>;
  private signal: Sendable<SignalingConnectionMessages, unknown>;
  constructor(id: string, name: string, pw?: string) {
    super();
    this.signal = new S2C<SignalingConnectionMessages, unknown>(
      `/api/room/${id}?un=${encodeURIComponent(name)}${pw ? '&pw=' + encodeURIComponent(pw) : ''}`
    );
    this.conns = {};
    const peerConnect = async (peer: string, remote: boolean) => {
      const conn = this.conns[peer] = await P2P.init<RoomP2PEvents>(
        this.signal.sub(peer),
        remote
      );
      conn.on('message', (evt) => {
        switch (evt.type) {
          case 'speech':
            this.emit('speech', evt.msg);
            break;
          case 'id':
            this.emit('id', evt.msg);
            break;
          case 'error':
            this.emit('error', new Error('Peer error: ' + evt.msg));
            break;
        }
      });
      conn.on('stream', (stream) => {
        this.emit('vid', stream);
      });
      conn.on('disconnect', () => {
        this.emit('disconnect', peer);
      });
      conn.on('connect', () => {
        this.emit('connect', peer);
      });
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

  broadcast(run: (conn: P2P<RoomP2PEvents>) => void) {
    for (const conn in this.conns) {
      run(this.conns[conn]);
    }
  }

  sendID(id: string, to: string) {
    this.conns[to].send('id', id);
  }

  sendVid(stream: MediaStream, to: string) {
    this.conns[to].sendMediaStream(stream);
  }

  sendSpeech(speech: string) {
    this.broadcast(conn => conn.send('speech', speech));
  }

  disconnect() {
    this.signal.disconnect();
    this.broadcast(conn => conn.disconnect());
  }
}
