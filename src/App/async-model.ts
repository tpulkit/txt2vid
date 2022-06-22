import { FrameInput } from './model';

type Listener = (result: ImageData[]) => void;
const pool: { send(data: FrameInput[]): void; listeners: Listener[] }[] = [];

for (let i = 0; i < 4; ++i) {
  const worker = new Worker(new URL('./model-worker.ts', import.meta.url), { type: 'module' });
  const listeners: Listener[] = [];
  worker.onmessage = (evt) => {
    listeners.shift()!(evt.data);
  };
  pool.push({
    send(data) {
      worker.postMessage(data);

    },
    listeners
  });
}

export function genFrames(input: FrameInput[]) {
  const target = pool.sort((a, b) => a.listeners.length - b.listeners.length)[0];
  return new Promise<ImageData[]>(resolve => {
    target.listeners.push(resolve);
    target.send(input);
  });
}
