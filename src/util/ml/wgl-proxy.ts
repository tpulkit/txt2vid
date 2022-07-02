import { InferenceSession, Tensor, env, Env } from 'onnxruntime-web';
env.webgl.pack = true;
env.webgl.async = true;

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
    const [type, buf, wasmPaths] = evt.data as [string, ArrayBuffer, Env.WebAssemblyFlags['wasmPaths']];
    env.wasm.wasmPaths = wasmPaths;
    modelProm = InferenceSession.create(buf, {
      executionProviders: [type]
    });
  } else {
    const { id, data } = evt.data as {
      id: number;
      data: Record<string, WorkerTensor>;
      env: Partial<Env>;
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
