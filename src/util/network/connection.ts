import { EventEmitter } from '..';

export interface ConnectionEvents<T> {
  connect: void;
  message:
    | {
        [K in keyof T]: {
          type: K;
          msg: T[K];
        };
      }[keyof T]
    | {
        type: 'error';
        msg: string;
      };
  rawMessage: ReadableStream<Uint8Array>;
  error: Error;
  disconnect: void;
}

export type NonConnectionEvents<E> = Record<string | symbol, unknown> &
  { [K in keyof ConnectionEvents<E>]?: ConnectionEvents<E>[K] };

export default abstract class Connection<
  E,
  M = E,
  L extends NonConnectionEvents<E> = {}
> extends EventEmitter<ConnectionEvents<E> & L> {
  abstract send<K extends keyof M>(type: K, msg: M[K]): void;
  abstract sendRaw(msg: ReadableStream<Uint8Array>): Promise<void>;
  abstract disconnect(): void;
}
