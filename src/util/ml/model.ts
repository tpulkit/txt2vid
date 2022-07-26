// This file has many comments to clarify how the ONNX model is actually run.
// This import creates a modelURL variable that contains a URL pointing to the converted ONNX model file
const modelURL = new URL('../../assets/wav2lip.onnx', import.meta.url);

// These imports create variables that reference URLs to the WebAssembly runtimes necessary to efficiently
// run the model. WebAssembly is an instruction set like x86 or ARM, but with instructions that can be
// implemented on a wide variety of actual host devices (i.e. there are no native WebAssembly CPUs, but
// a WebAssembly CPU is very easy to emulate). This allows us to run native code to execute machine learning
// models on any device, no matter what CPU architecture, while still maintaining good performance.
//
// However, WebAssembly does not have access to the GPU, meaning that if we run Wav2Lip on WebAssembly we
// will, at best, get the performance of running the model without a GPU on a desktop, which is already
// quite slow. Therefore, we would like to switch from the official onnxruntime-web neural network runner
// to an unofficial runtime like wonnx that can use WebGPU to provide GPU acceleration for our model.
// At the moment, wonnx doesn't support a specific operation within the ONNX standard that we need known
// as ConvTranspose. I am hoping to contribute a GPU implementation of ConvTranspose to wonnx, since wonnx
// is open source. That would enable use to switch to a GPU-accelerated model runner, and therefore get
// realtime performance on mobile.
//
// onnxruntime-web: https://github.com/microsoft/onnxruntime/tree/master/js/web
// wonnx: https://github.com/webonnx/wonnx
import baseWASM from 'url:onnxruntime-web/dist/ort-wasm.wasm';
import simdWASM from 'url:onnxruntime-web/dist/ort-wasm-simd.wasm';
import threadWASM from 'url:onnxruntime-web/dist/ort-wasm-threaded.wasm';
import simdThreadWASM from 'url:onnxruntime-web/dist/ort-wasm-simd-threaded.wasm';

// This imports the classes necessary to prepare our inputs and run our model from onnxruntime-web,
// the official CPU-only ONNX-standardized neural network runner.
import { InferenceSession, Tensor, env } from 'onnxruntime-web';
import { DataLoader } from '../data';

// This just tells ONNX where to find the WebAssembly binaries needed to run the model
env.wasm.wasmPaths = {
  'ort-wasm.wasm': baseWASM,
  'ort-wasm-simd.wasm': simdWASM,
  'ort-wasm-threaded.wasm': threadWASM,
  'ort-wasm-simd-threaded.wasm': simdThreadWASM
};
env.wasm.proxy = true;

declare let OffscreenCanvas: {
  new (width: number, height: number): HTMLCanvasElement;
};

export const loading = new DataLoader(modelURL, 'wav2lip');

type Executor = {
  warmUp: number;
  busy(): boolean;
  execute(input: Record<string, Tensor>): Promise<Record<string, Tensor>>;
};

const makeThreadedExecutor = (type: 'webgl' | 'wasm', numWorkers: number): Executor => {
  type WorkerTensors = Record<string, { data: Tensor['data']; dims: number[] }>;
  type Listeners = Record<number, (data: WorkerTensors) => void>;
  type WorkerMessage = { id: number; data: WorkerTensors; };
  const workers: {
    send: (msg: WorkerMessage) => void;
    listeners: Listeners;
  }[] = [];
  for (let i = 0; i < numWorkers; ++i) {
    const worker = new Worker(new URL('./wgl-proxy.ts', import.meta.url), {
      type: 'module'
    });
    const listeners: Listeners = {};
    worker.onmessage = (evt) => {
      listeners[evt.data.id](evt.data.data);
      delete listeners[evt.data.id];
    };
    let sentLast = loading.then((buf) => worker.postMessage([type, buf, env.wasm.wasmPaths]));
    workers.push({
      send(msg) {
        sentLast = sentLast.then(() => {
          let bufs: Transferable[] = [];
          for (const input in msg.data) {
            const buf = msg.data[input].data;
            if (ArrayBuffer.isView(buf)) bufs.push(buf.buffer);
          }
          worker.postMessage(msg, bufs);
        });
      },
      listeners
    });
  }
  return {
    warmUp: numWorkers,
    busy() {
      return workers.every(w => Object.keys(w.listeners).length > 0);
    },
    execute: (input: Record<string, Tensor>) => {
      const tensors: WorkerTensors = {};
      for (const name in input) {
        tensors[name] = {
          data: input[name].data,
          dims: input[name].dims.slice()
        };
      }
      const id = Math.floor(Math.random() * 1000000);
      const target = workers.sort(
        (a, b) =>
          Object.keys(a.listeners).length - Object.keys(b.listeners).length
      )[0];
      target.listeners[id] = () => { throw new TypeError('early call'); }
      return new Promise<Record<string, Tensor>>((resolve) => {
        target.listeners[id] = (tensors) => {
          const output: Record<string, Tensor> = {};
          for (const name in tensors) {
            output[name] = new Tensor(tensors[name].data, tensors[name].dims);
          }
          resolve(output);
        };
        target.send({ id, data: tensors });
      });
    }
  };
};

const makeLocalExecutor = (type: 'webgl' | 'wasm'): Executor => {
  const modelProm = loading.then(buf => InferenceSession.create(buf, {
    executionProviders: [type],
    graphOptimizationLevel: 'all'
  }));
  let lastExec = Promise.resolve({} as Record<string, Tensor>);
  let busy = false;
  return {
    warmUp: 1,
    busy() {
      return busy;
    },
    execute: async (input: Record<string, Tensor>) => {
      return lastExec = lastExec.then(async () => {
        busy = true;
        const model = await modelProm;
        const outputs = await model.run(input);
        busy = false;
        return outputs;
      });
    }
  };
}

const makeMultiExecutor = (executors: (Executor | undefined)[]): Executor => {
  const sources = executors.filter(e => e) as Executor[];
  const warmUps: Executor[] = [];
  for (const executor of sources) {
    for (let i = 0; i < executor.warmUp; ++i) {
      warmUps.push(executor);
    }
  }
  return {
    warmUp: warmUps.length,
    busy() {
      return sources.every(e => e.busy());
    },
    execute: (input: Record<string, Tensor>) => {
      const executor = warmUps.shift() || sources.find(e => !e.busy()) || sources[0];
      return executor.execute(input);
    }
  };
};

export const mlType = (localStorage.getItem('ml-backend') as 'cpu' | 'gpu' | 'hybrid') || (
  typeof OffscreenCanvas == 'undefined' ? 'cpu' : 'gpu'
);

let gpuExec = mlType == 'gpu' || mlType == 'hybrid' ? makeThreadedExecutor('webgl', 1) : undefined;
let cpuExec = mlType == 'cpu' || mlType == 'hybrid' ? makeLocalExecutor('wasm') : undefined;
let executor = makeMultiExecutor([gpuExec, cpuExec]);

// The rest of this file is preprocessing logic that was used in the original Wav2Lip repo and therefore
// had to be reimplemented in JavaScript. I couldn't use any pre-existing libraries for most of this
// because there are no implementations that work properly in modern browsers. So, I reimplemented the
// logic from librosa, NumPy, and SciPy from scratch.

// These constants are hyperparameters from the original Wav2Lip project.
// Link: https://github.com/Rudrabha/Wav2Lip/blob/master/hparams.py
const LO_FREQ = 55;
const HI_FREQ = 7600;
const N_MELS = 80;
const MIN_DB = -100;
const REF_DB = 20;
const MAX_ABS = 4;
export const SPECTROGRAM_FRAMES = 16;
export const IMG_SIZE = 96;
export const FFT_SIZE = 1024;
export const SAMPLE_RATE = 16000;

const freqBins = FFT_SIZE / 2;
const totalPx = IMG_SIZE * IMG_SIZE;

// Conversion functions between Hz scale and Mel scale (which better aligns with human hearing)
// Slaney's algorithms (linear below 1 kHz, logarithmic above 1 kHz)
const hzToMel = (hz: number) => {
  if (hz >= 1000) {
    return 15 + Math.log(hz / 1000) / 0.06875;
  } else {
    return (hz * 3) / 200;
  }
};
const melToHz = (mel: number) => {
  if (mel >= 15) {
    return Math.exp((mel - 15) * 0.06875) * 1000;
  } else {
    return (mel * 200) / 3;
  }
};

// Similar to numpy.linspace
// Link: https://numpy.org/doc/stable/reference/generated/numpy.linspace.html
const linspace = (start: number, end: number, n: number) => {
  const diff = (end - start) / (n - 1);
  const out = new Float32Array(n);
  for (let i = 0; i < n; ++i) {
    out[i] = start + diff * i;
  }
  return out;
};

// The Mel basis matrix generation code. Probably not worth trying to understand unless
// you've studied DSP in great depth.
const melBasis = (() => {
  const weights = new Float32Array(N_MELS * freqBins);
  // fft frequency bins are linear from 0 to nyquist (sr/2)
  const fftFreqs = linspace(0, SAMPLE_RATE / 2, freqBins);
  // set mel scale from min to max freq
  const melFreqs = linspace(hzToMel(LO_FREQ), hzToMel(HI_FREQ), N_MELS + 2).map(
    melToHz
  );
  for (let i = 0; i < N_MELS; ++i) {
    const prev = melFreqs[i];
    const cur = melFreqs[i + 1];
    const next = melFreqs[i + 2];
    const diff = cur - prev;
    const nextDiff = next - cur;
    const norm = 2 / (next - prev);
    for (let j = 0; j < freqBins; ++j) {
      const fftFreq = fftFreqs[j];
      if (fftFreq < prev) continue;
      if (fftFreq > next) break;
      const wPrev = (fftFreq - prev) / diff;
      const wNext = (next - fftFreq) / nextDiff;
      weights[i * freqBins + j] = Math.min(wPrev, wNext) * norm;
    }
  }
  return weights;
})();

// Converts a full spectrum to Mel scale by multiplying it by the Mel basis matrix
const toMelScale = (spectrum: Float32Array) => {
  const amp = spectrum.map((db) => Math.pow(10, (db + 40) * 0.05));
  const melScale = new Float32Array(N_MELS);
  for (let i = 0; i < N_MELS; ++i) {
    let scaledAmp = 0.0;
    for (let j = 0; j < freqBins; ++j) {
      scaledAmp += amp[j] * melBasis[i * freqBins + j];
    }
    const db = Math.max(MIN_DB, 20 * Math.log10(scaledAmp)) - REF_DB;
    // scaled from -1 to 1
    const scaled = 1 - 2 * Math.min(Math.max(db / MIN_DB, 0), 1);
    melScale[i] = scaled * MAX_ABS;
  }
  return melScale;
};

// Wrapper for toMelScale that converts an entire spectrogram
const toInputMelSpectrogram = (spectrogram: Float32Array[]) => {
  const melData = new Float32Array(N_MELS * SPECTROGRAM_FRAMES);
  for (let i = 0; i < SPECTROGRAM_FRAMES; ++i) {
    const melScaleSpectrum = toMelScale(spectrogram[i]);
    for (let j = 0; j < N_MELS; ++j) {
      melData[j * SPECTROGRAM_FRAMES + i] = melScaleSpectrum[j];
    }
  }
  return new Tensor(melData, [1, N_MELS, SPECTROGRAM_FRAMES]);
};

// Prepares the visual input (i.e. the video frame) for use in Wav2Lip. For some reason,
// Wav2Lip uses BGR instead of RGB and also uses 6 color channels instead of three. The
// first three channels represents the original image, and the second three represent the
// original image with the bottom half completely blacked out. The original Wav2Lip authors
// claimed this helped accelerate training because it prevented the model from being
// influenced too much by the original lip movements while generating the new image: after
// all, the lip movements are the main thing that needs to change between the input frame
// and output frame.
//
// So basically, this function takes the input image data, strips the alpha channel, duplicates
// the channels for the upper half of the image, and prepends those channels to the
// stripped image to create 6 96x96 grayscale images representing each color channel's intensity.
const toInputFrame = (img: ImageData) => {
  const imgData = new Float32Array(totalPx * 6);
  for (let y = 0; y < IMG_SIZE; ++y) {
    for (let x = 0; x < IMG_SIZE; ++x) {
      const px = y * IMG_SIZE + x;
      if (y < IMG_SIZE / 2) {
        imgData[totalPx * 2 + px] = img.data[px * 4] / 255;
        imgData[totalPx + px] = img.data[px * 4 + 1] / 255;
        imgData[px] = img.data[px * 4 + 2] / 255;
      }
      imgData[totalPx * 5 + px] = img.data[px * 4] / 255;
      imgData[totalPx * 4 + px] = img.data[px * 4 + 1] / 255;
      imgData[totalPx * 3 + px] = img.data[px * 4 + 2] / 255;
    }
  }
  return new Tensor(imgData, [6, IMG_SIZE, IMG_SIZE]);
};

const toOutputImgs = (result: Tensor, num: number) => {
  if (result.type != 'float32')
    throw new TypeError(`unexpected tensor type ${result.type}`);
  const data = result.data as Float32Array;
  const out: ImageData[] = [];
  const batchSize = totalPx * 3;
  for (let i = 0; i < num; ++i) {
    const ret = new ImageData(IMG_SIZE, IMG_SIZE);
    for (let y = 0; y < IMG_SIZE; ++y) {
      for (let x = 0; x < IMG_SIZE; ++x) {
        const px = y * IMG_SIZE + x;
        ret.data[px * 4] = data[batchSize * i + totalPx * 2 + px] * 255;
        ret.data[px * 4 + 1] = data[batchSize * i + totalPx + px] * 255;
        ret.data[px * 4 + 2] = data[batchSize * i + px] * 255;
        ret.data[px * 4 + 3] = 255;
      }
    }
    out.push(ret);
  }
  return out;
};

// Batches multiple tensors together, since batching inputs in theory improves performance. However
// the lack of hardware acceleration in the WASM executor means this is mostly useless for now.
const batch = (tensors: Tensor[]) => {
  if (!tensors.length) throw new TypeError('cannot create an empty batch');
  const base = tensors[0];
  if (tensors.length == 1) {
    return base.reshape([1, ...base.dims]);
  }
  const length = tensors.reduce((l, v) => {
    if (
      v.type != base.type ||
      v.dims.length != base.dims.length ||
      v.dims.some((v, i) => base.dims[i] != v)
    ) {
      throw new TypeError(
        `expected${base.type} tensor(${base.dims.join(', ')}), found ${
          v.type
        } tensor(${v.dims.join(', ')})`
      );
    }
    return l + v.data.length;
  }, 0);
  if (base.type == 'string') {
    return new Tensor(
      tensors.flatMap((t) => t.data as string[]),
      [tensors.length, ...base.dims]
    );
  }
  const buf = new (base.data.constructor as Uint8ArrayConstructor)(length);
  let offset = 0;
  for (const tensor of tensors) {
    buf.set(tensor.data as Uint8Array, offset);
    offset += tensor.data.length;
  }
  return new Tensor(buf, [tensors.length, ...base.dims]);
};

const makeSampleInput = () => ({
  mel: new Tensor(new Float32Array(N_MELS * SPECTROGRAM_FRAMES), [1, 1, N_MELS, SPECTROGRAM_FRAMES]),
  vid: new Tensor(new Float32Array(6 * IMG_SIZE * IMG_SIZE), [1, 6, IMG_SIZE, IMG_SIZE])
});

let profileWait = Promise.resolve();

for (let i = 0; i < executor.warmUp; ++i) {
  const ret = executor.execute(makeSampleInput());
  profileWait = profileWait.then(async () => { await ret; });
}

let profiles: number[] = JSON.parse(localStorage.getItem('profiles') || '[]');

export const expectedTime = async () => {
  await profileWait;
  const avgMS = profiles.reduce((a, b) => a + b) / profiles.length;
  return avgMS;
};

export const rerunProfiles = async (reset = true) => {
  if (reset) profiles = [];
  for (let i = 0; i < Math.ceil(navigator.hardwareConcurrency / 4); ++i) {
    profileWait = profileWait.then(async () => {
      const ts = performance.now();
      await executor.execute(makeSampleInput());
      profiles.push(performance.now() - ts);
    });
  }
  const time = await expectedTime();
  localStorage.setItem('profiles', JSON.stringify(profiles));
  return time;
}

if (!profiles.length) rerunProfiles();

export const init = profileWait;

export function setMLType(type: 'cpu' | 'gpu' | 'hybrid') {
  if (type != mlType) {
    localStorage.setItem('ml-backend', type);
    localStorage.setItem('profiles', '[]');
    location.reload();
  }
}

export type FrameInput = { spectrogram: Float32Array[]; img: ImageData };

// This is the exported function that takes in a spectrogram and a video frame to generate a
// lipsynced video frame. It is asynchronous to allow the model to finish downloading before
// it runs the model on the provided inputs. Here are the expected inputs:
//
// img: input video frame
// spectrogram: 16 stft frames on a waveform filtered with:
// wav[n] = origWav[n] - origWav[n - 1] * 0.97
//
// The expected output is a single video frame as an ImageData object that can be rendered to a canvas.
export async function genFrames(input: FrameInput[]) {
  if (
    input.some(
      ({ img, spectrogram }) =>
        spectrogram.length != SPECTROGRAM_FRAMES ||
        spectrogram.some((v) => v.length != freqBins) ||
        img.width != IMG_SIZE ||
        img.height != IMG_SIZE
    )
  ) {
    throw new TypeError(
      `need ${SPECTROGRAM_FRAMES} spectra and a ${IMG_SIZE}x${IMG_SIZE} image per input to predict`
    );
  }
  const melBatch = batch(
    input.map(({ spectrogram }) => toInputMelSpectrogram(spectrogram))
  );
  const imgBatch = batch(input.map(({ img }) => toInputFrame(img)));
  const result = await executor.execute({
    mel: melBatch,
    vid: imgBatch
  });
  return toOutputImgs(result.gen, input.length);
}
