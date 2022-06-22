import { genFrames } from './model';

const worker = self as unknown as {
  addEventListener(type: 'message', listener: (e: MessageEvent) => void): void;
  postMessage(data: unknown, transfer?: Transferable[]): void;
};
worker.addEventListener('message', evt => {
  genFrames(evt.data).then(frames => {
    worker.postMessage(frames, frames.map(f => f.data.buffer));
  });
});