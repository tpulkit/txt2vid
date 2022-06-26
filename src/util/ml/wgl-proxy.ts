import { InferenceSession, Tensor, env } from 'onnxruntime-web';

const worker = (self as unknown) as {
  addEventListener: (
    type: 'message',
    listener: (e: MessageEvent) => void
  ) => void;
  postMessage: (data: unknown, transfer?: Transferable[]) => void;
};

let modelProm: Promise<InferenceSession> | null = null;

type WorkerTensor = { data: Tensor['data']; dims: number[] };

worker.addEventListener('message', async (evt) => {
  if (!modelProm) {
    modelProm = InferenceSession.create(evt.data as ArrayBuffer, {
      executionProviders: ['webgl']
    });
  } else {
    const { id, data } = evt.data as {
      id: number;
      data: Record<string, WorkerTensor>;
    };
    const model = await modelProm;
    const inputs: Record<string, Tensor> = {};
    for (const rawIn in data) {
      const dat = data[rawIn];
      inputs[rawIn] = new Tensor(dat.data, dat.dims);
    }
    const outputs = await model.run(inputs);
    worker.postMessage(
      { id, data: outputs },
      Object.values(outputs).map((o) => (o.data as ArrayBufferView).buffer)
    );
  }
});
