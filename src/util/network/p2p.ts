import 'webrtc-adapter';
import Connection, { NonConnectionEvents } from './connection';
import Sendable from './sendable';

export interface SignalingConnectionEvents {
  icecandidate: RTCIceCandidateInit;
  sdp: RTCSessionDescriptionInit;
  cancel: string | void;
}

export type NegotiatedDataChannelOptions = Omit<
  RTCDataChannelInit,
  'id' | 'negotiated'
>;

export interface P2PInitRequest<E, M = E> extends Promise<RTCConnection<E, M>> {
  cancel: (reason?: string) => boolean;
}

type CustomEvents = {
  stream: MediaStream;
};

export type P2PCustomEvents<E> = NonConnectionEvents<E> &
  { [K in keyof CustomEvents]?: CustomEvents[K] };

export default class RTCConnection<
  E,
  M = E,
  L extends P2PCustomEvents<E> = Record<never, never>
> extends Sendable<E, M, L & CustomEvents> {
  private static readonly CONFIG: RTCConfiguration = {
    iceServers: [
      {
        // Revisit this later
        urls: ['stun:stun.l.google.com:19302']
      }
    ]
  };
  maxChunkSize = 65535;
  suggestedChunkSize = 65535;
  private constructor(
    private baseConnection: RTCPeerConnection,
    channel: RTCDataChannel
  ) {
    super(channel);
    const seenStreams: Set<MediaStream> = new Set();
    baseConnection.addEventListener('track', (evt) => {
      const stream = evt.streams[0];
      if (!seenStreams.has(stream)) {
        seenStreams.add(stream);
        this.emit('stream', stream);
      }
    });
    channel.bufferedAmountLowThreshold = 262144;
    baseConnection.addEventListener('datachannel', ({ channel }) => {
      this['children'][channel.label] = new RTCConnection.ChildRTC(
        this,
        channel
      );
    });
  }
  static init<EC, MC = EC>(
    signaling: Connection<SignalingConnectionEvents>,
    remote: boolean
  ): P2PInitRequest<EC, MC> {
    const conn = new RTCPeerConnection(RTCConnection.CONFIG);
    let canceled = false;
    let makingOffer = false;
    let ignoreCurrentOffer = false;
    let settingRemoteAnswer = false;
    const prom = new Promise<RTCDataChannel>((resolve, reject) => {
      conn.addEventListener('icecandidate', ({ candidate }) => {
        if (candidate) signaling.send('icecandidate', candidate);
      });
      const hdl = signaling.on('message', async (evt) => {
        if (canceled) {
          signaling.off('message', hdl);
          return;
        }
        switch (evt.type) {
          case 'icecandidate':
            try {
              await conn.addIceCandidate(evt.msg);
            } catch (err) {
              if (!ignoreCurrentOffer) throw err;
            }
            break;
          case 'sdp':
            ignoreCurrentOffer =
              evt.msg.type == 'offer' &&
              !remote &&
              (makingOffer ||
                (conn.signalingState != 'stable' &&
                  (conn.signalingState != 'have-local-offer' ||
                    !settingRemoteAnswer)));
            if (ignoreCurrentOffer) return;
            settingRemoteAnswer = evt.msg.type == 'answer';
            await conn.setRemoteDescription(evt.msg);
            settingRemoteAnswer = false;
            if (evt.msg.type == 'offer') {
              await conn.setLocalDescription();
              signaling.send('sdp', conn.localDescription!);
            }
            break;
          case 'cancel':
            reject(
              new Error(
                'peer cancelled request' + (evt.msg ? `: ${evt.msg}` : '')
              )
            );
            break;
          case 'error':
            reject(new Error(`remote server error: ${evt.msg}`));
            break;
        }
      });
      conn.addEventListener('negotiationneeded', async () => {
        try {
          makingOffer = true;
          await conn.setLocalDescription();
          signaling.send('sdp', conn.localDescription!);
        } finally {
          makingOffer = false;
        }
      });
      if (remote) {
        conn.addEventListener('datachannel', (ev) => resolve(ev.channel));
      } else {
        const chl = conn.createDataChannel('default');
        resolve(chl);
      }
    }).then((channel) => new RTCConnection<EC, MC>(conn, channel));
    return Object.assign(prom, {
      cancel(reason?: string) {
        if (!canceled) signaling.send('cancel', reason);
        canceled = true;
        return true;
      }
    });
  }
  sendMediaStream(stream: MediaStream) {
    const senders: RTCRtpSender[] = [];
    for (const track of stream.getTracks()) {
      senders.push(this.baseConnection.addTrack(track, stream));
    }
    return () => {
      for (const sender of senders) {
        this.baseConnection.removeTrack(sender);
      }
    };
  }
  sub<EC, MC = EC>(
    name: string,
    opts?: NegotiatedDataChannelOptions
  ): Connection<EC, MC> {
    return (
      (this['children'][name] as RTCConnection<EC, MC>) ||
      new RTCConnection.ChildRTC(
        this,
        this.baseConnection.createDataChannel('child-' + name, opts)
      )
    );
  }
  private static readonly ChildRTC = class<E, M, ES, MS = ES> extends Sendable<
    ES,
    MS
  > {
    private name: string;
    maxChunkSize = 65535;
    suggestedChunkSize = 65535;
    constructor(private parent: RTCConnection<E, M>, channel: RTCDataChannel) {
      super(channel);
      channel.bufferedAmountLowThreshold = 262144;
      channel.addEventListener('open', () => this.emit('connect', undefined));
      channel.addEventListener('error', console.error);
      channel.addEventListener('close', () => {
        this.disconnect();
      });
      this.name = channel.label;
      this.parent['children'][channel.label] = this as Connection<unknown>;
    }
    disconnect() {
      delete this.parent['children'][this.name];
      this.emit('disconnect', undefined);
    }
  };
}
