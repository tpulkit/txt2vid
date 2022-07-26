import { strFromU8, strToU8 } from 'fflate';
import Connection, { NonConnectionEvents } from './connection';

export interface RawSendable {
  addEventListener: ((evt: 'open' | 'close', handler: () => unknown) => void) &
    ((evt: 'error', handler: (evt: ErrorEvent) => unknown) => void) &
    ((evt: 'message', handler: (evt: MessageEvent) => unknown) => void);
  send: ((data: ArrayBuffer) => void) &
    ((data: string) => void) &
    ((data: ArrayBufferView) => void);
  close: () => void;
  binaryType: string;
}

export default class Sendable<
  E,
  M = E,
  L extends NonConnectionEvents<E> = Record<never, never>
> extends Connection<E, M, L> {
  private controllers: ReadableStreamDefaultController<Uint8Array>[] = [];
  private controllerID = 0;
  private children: Record<string, Connection<unknown>> = {};
  protected closed = false;
  private childrenControllers: Record<
    string,
    ReadableStreamDefaultController<Uint8Array>[]
  > = {};
  protected suggestedChunkSize = 65536;
  protected maxChunkSize = 33554432;
  constructor(protected connection: RawSendable) {
    super();
    connection.binaryType = 'arraybuffer';
    connection.addEventListener('open', () => {
      this.emit('connect', undefined);
    });
    connection.addEventListener('close', () => {
      this.cleanup();
    });
    connection.addEventListener('message', (evt) => {
      const dat = evt.data as ArrayBuffer | string;
      if (dat instanceof ArrayBuffer) {
        const head = new Uint8Array(dat, 0, 258);
        const controllerID = head[0];
        const pfxLen = head[1];
        const datStart = 2 + pfxLen;
        const buf = new Uint8Array(dat, datStart);
        if (pfxLen) {
          const pfx = strFromU8(head.subarray(2, datStart));
          const child = this.children[pfx];
          if (child) {
            const controller = this.childrenControllers[pfx][controllerID];
            if (controller) controller.enqueue(buf);
            else {
              child['emit'](
                'rawMessage',
                new ReadableStream({
                  start: (controller) => {
                    this.childrenControllers[pfx][controllerID] = controller;
                    controller.enqueue(buf);
                  }
                })
              );
            }
          }
        } else {
          const controller = this.controllers[controllerID];
          if (controller) controller.enqueue(new Uint8Array(buf));
          else {
            this.emit(
              'rawMessage',
              new ReadableStream<Uint8Array>({
                start: (controller) => {
                  this.controllers[controllerID] = controller;
                  controller.enqueue(new Uint8Array(buf));
                }
              })
            );
          }
        }
      } else {
        const nli = dat.slice(0, 257).indexOf('\0');
        const pfx = dat.slice(0, nli);
        const raw = dat.slice(nli + 1);
        if (raw[0] == 'r') {
          // end stream marker
          const controllerID = raw.charCodeAt(1);
          let controllers = this.controllers;
          if (nli && !(controllers = this.childrenControllers[pfx])) {
            return;
          }
          controllers[controllerID].close();
          controllers[
            controllerID
          ] = (null as unknown) as ReadableStreamDefaultController<Uint8Array>;
        } else {
          const msg = JSON.parse(raw);
          if (nli == -1) this.emit('error', new Error('Got corrupted message'));
          else if (nli) this.children[pfx]['emit']('message', msg);
          else this.emit('message', msg);
        }
      }
    });
    connection.addEventListener('error', (evt) => {
      this.emit(
        'error',
        new Error(`failed to establish connection: ${evt.message}`)
      );
    });
  }
  private sendJSON(msg: Record<string, unknown>, pfx = '') {
    this.connection.send(pfx + '\0' + JSON.stringify(msg));
  }
  send<K extends keyof M>(type: K, msg: M[K]) {
    if (this.closed) throw new Error('connection closed');
    this.sendJSON({
      type,
      msg
    });
  }
  private async sendStream(
    msg: ReadableStream<Uint8Array>,
    id: number,
    pfx = '',
    pfxBin = new Uint8Array(0)
  ) {
    const reader = msg.getReader();
    let chks: Uint8Array[] = [];
    let chksLength = -1;
    const defaultChksLength = 2 + pfxBin.length;
    const isRTC = this.connection instanceof RTCDataChannel;
    const reset = () => {
      chksLength = defaultChksLength;
      chks = [new Uint8Array([id, pfxBin.length]), pfxBin];
    };
    reset();
    for (;;) {
      const { value, done } = await reader.read();
      if (!done) {
        chks.push(value!);
        chksLength += value!.length;
      }
      while (
        chksLength > (done ? defaultChksLength : this.suggestedChunkSize)
      ) {
        const concat = new Uint8Array(Math.min(this.maxChunkSize, chksLength));
        for (let byte = 0, i = 0; ; ++i) {
          const chk = chks[i];
          if (!chk) {
            reset();
            break;
          }
          const nb = byte + chk.length;
          if (nb > this.maxChunkSize) {
            const end = this.maxChunkSize - byte;
            concat.set(chk.subarray(0, end), byte);
            reset();
            chks.push(chk.subarray(end));
            chksLength += nb - this.maxChunkSize;
            break;
          } else {
            concat.set(chk, byte);
            byte = nb;
          }
        }
        this.connection.send(concat);
      }
      if (done) break;
      if (
        isRTC &&
        (this.connection as RTCDataChannel).bufferedAmount >
          (this.connection as RTCDataChannel).bufferedAmountLowThreshold
      ) {
        await new Promise((resolve) =>
          (this
            .connection as RTCDataChannel).addEventListener(
            'bufferedamountlow',
            resolve,
            { once: true }
          )
        );
      }
    }
    // EOF marker
    this.connection.send(pfx + '\0r' + String.fromCharCode(id & 255));
  }
  sendRaw(msg: ReadableStream<Uint8Array>) {
    if (this.closed) throw new Error('connection closed');
    return this.sendStream(msg, this.controllerID++);
  }
  private cleanup() {
    if (this.closed) return;
    this.closed = true;
    for (const child in this.children) {
      this.children[child].disconnect();
    }
    this.emit('disconnect', undefined);
  }
  disconnect() {
    this.connection.close();
    this.cleanup();
  }
  sub<EC, MC = EC>(id: string): Connection<EC, MC> {
    if (this.closed) throw new Error('connection closed');
    if (this.children[id]) throw new Error('ID exists');
    if (id == '') throw new Error('null ID');
    if (id.length > 255) throw new Error('ID too long');
    if (id.indexOf('\0') != -1) throw new Error('ID includes null character');
    const idBin = strToU8(id);
    if (idBin.length > 255) throw new Error('ID too long');
    return new Sendable.Child<E, M, EC, MC>(this, id, idBin);
  }
  private static readonly Child = class<E, M, ES, MS = ES> extends Connection<
    ES,
    MS
  > {
    private controllerID? = 0;
    constructor(
      private parent: Sendable<E, M>,
      private pfx: string,
      private pfxBin: Uint8Array
    ) {
      super();
      queueMicrotask(() => {
        this.emit('connect', undefined);
      });
      parent.children[pfx] = this as Connection<unknown>;
      parent.childrenControllers[pfx] = [];
    }
    send<K extends keyof MS>(type: K, msg: MS[K]) {
      if (this.controllerID == null) throw new Error('connection closed');
      this.parent.sendJSON(
        {
          type,
          msg
        },
        this.pfx
      );
    }
    sendRaw(msg: ReadableStream<Uint8Array>) {
      if (this.controllerID == null) throw new Error('connection closed');
      return this.parent.sendStream(
        msg,
        this.controllerID++,
        this.pfx,
        this.pfxBin
      );
    }
    disconnect() {
      delete this.parent.children[this.pfx];
      delete this.controllerID;
      this.emit('disconnect', undefined);
    }
  };
}
