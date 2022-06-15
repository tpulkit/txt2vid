export type CascadeClassifier = (
  row: number,
  col: number,
  mcol: number,
  scale: number,
  pixels: Uint8Array | Uint8ClampedArray
) => number;

export function createClassifier(raw: ArrayBuffer): CascadeClassifier {
  const view = new DataView(raw);
  // Technically, both are 32-bit signed, but negative makes no sense
  // tree depth
  const dt = view.getUint32(8, true);
  // 2 power tree depth
  const dtp2 = 1 << dt;
  // 4x 2 power tree depth
  const dtp24 = dtp2 << 2;
  // code byte length
  const cbl = dtp24 - 4;
  const nt = view.getUint32(12, true);
  // preds length
  const pl = nt * dtp2;
  const rawi8 = new Int8Array(raw);
  // current byte
  let b = 16;
  // code byte
  let cb = 0;
  const codes = new Int8Array(pl << 2);
  const preds = new Float32Array(pl);
  const thresh = new Float32Array(nt);
  for (let i = 0; i < nt; ++i) {
    codes.set(rawi8.subarray(b, (b += cbl)), cb + 4), (cb += dtp24);
    const bb = i * dtp2;
    for (let j = 0; j < dtp2; ++j) {
      preds[bb + j] = view.getFloat32(b + (j << 2), true);
    }
    (thresh[i] = view.getFloat32((b += dtp24), true)), (b += 4);
  }
  return (row, col, mcol, scale, pixels) => {
    (row <<= 8), (col <<= 8);
    let root = 0,
      o = 0;
    for (let i = 0; i < nt; ++i) {
      let idx = 1;
      for (let j = 0; j < dt; ++j) {
        const nroot = root + (idx << 2);
        idx =
          (idx << 1) +
          (((pixels[
            ((row + codes[nroot] * scale) >> 8) * mcol +
              ((col + codes[nroot + 1] * scale) >> 8)
          ] <=
            pixels[
              ((row + codes[nroot + 2] * scale) >> 8) * mcol +
                ((col + codes[nroot + 3] * scale) >> 8)
            ]) as unknown) as number);
      }
      o += preds[dtp2 * (i - 1) + idx];
      if (o <= thresh[i]) return -1;
      root += dtp24;
    }
    return o - thresh[nt - 1];
  };
}

export interface Image {
  data: Uint8Array | Uint8ClampedArray;
  width: number;
  height: number;
}

export interface ClassifierOptions {
  minSize?: number;
  maxSize?: number;
  scaleRatio?: number;
  shiftRatio?: number;
}

export interface Detection {
  x: number;
  y: number;
  radius: number;
  confidence: number;
}

export function toGrayscale(img: Image): Uint8Array | Uint8ClampedArray;
export function toGrayscale<T extends ArrayLike<number> & Pick<Uint8Array, 'set'> = Uint8Array | Uint8ClampedArray>(
  img: Image,
  buffer: T
): T;
export function toGrayscale<T extends ArrayLike<number> & Pick<Uint8Array, 'set'> = Uint8Array | Uint8ClampedArray>(
  { data, width, height }: Image,
  buffer?: T
): Uint8Array | Uint8ClampedArray | T {
  const pixels = width * height;
  const bin = data.length;
  if (pixels == bin) {
    if (buffer) {
      buffer.set(data);
      return buffer;
    }
    return data;
  }
  const out = buffer || new Uint8ClampedArray(pixels);
  if (pixels * 3 == bin) {
    for (let i = 0; i < pixels; ++i) {
      const base = i * 3;
      (out as Uint8ClampedArray)[i] =
        data[base] * 0.2989 + data[base + 1] * 0.587 + data[base + 2] * 0.114;
    }
    return out;
  }
  if (pixels << 2 == bin) {
    for (let i = 0; i < pixels; ++i) {
      const base = i << 2;
      (out as Uint8ClampedArray)[i] =
        data[base] * 0.2989 + data[base + 1] * 0.587 + data[base + 2] * 0.114;
    }
    return out;
  }
  throw new Error('provide RGB, RGBA, or grayscale data');
}

export function runClassifier(
  img: Image,
  classifier: CascadeClassifier,
  opts?: ClassifierOptions
): Detection[] {
  const { height, width } = img;
  const data = toGrayscale(img);
  const {
    minSize = height >> 2,
    maxSize = height,
    scaleRatio = 1.1,
    shiftRatio = 0.1
  } = opts || {};
  const detections: Detection[] = [];
  for (let scale = minSize; scale <= maxSize; scale *= scaleRatio) {
    const step = Math.max((shiftRatio * scale) | 0, 1);
    const halfScale = scale >> 1;
    const offset = halfScale + 1;
    //    min y                    min x
    const my = height - halfScale,
      mx = width - halfScale;
    for (let y = offset; y < my; y += step) {
      for (let x = offset; x < mx; x += step) {
        const prob = classifier(y, x, width, scale, data);
        if (prob > 0)
          detections.push({
            x,
            y,
            radius: halfScale,
            confidence: prob
          });
      }
    }
  }
  return detections;
}

export interface ClusteredDetection extends Detection {
  srcIndices: number[];
}

export function clusterDetections(detections: Detection[], clusterIOU = 0.2) {
  type InternalDetection = Detection & {
    i: number;
    c?: 1;
  };
  const intDets = detections.map((v, i) => ({
    ...v,
    i
  })).sort((a, b) => b.confidence - a.confidence);
  const outDetections: ClusteredDetection[] = [];
  for (let i = 0; i < intDets.length; ++i) {
    const d = intDets[i];
    if (!(d as InternalDetection).c) {
      const { x, y, radius: rad, confidence: conf, i: srcInd } = d;
      const srcIndices = [srcInd];
      let n = conf,
        sumX = x * n,
        sumY = y * n,
        sumRad = rad * n,
        sumConf = conf;
      for (let j = i + 1; j < intDets.length; ++j) {
        const d2 = intDets[j];
        const { x: x2, y: y2, radius: rad2, confidence: conf2 } = d2;
        const intX = Math.max(
          0,
          Math.min(x + rad, x2 + rad2) - Math.max(x - rad, x2 - rad2)
        );
        const intY = Math.max(
          0,
          Math.min(y + rad, y2 + rad2) - Math.max(y - rad, y2 - rad2)
        );
        const int = intX * intY;
        const iou = int / (((rad * rad + rad2 * rad2) << 2) - int);
        if (iou >= clusterIOU) {
          (d2 as InternalDetection).c = 1;
          const weight = conf2;
          sumX += x2 * weight;
          sumY += y2 * weight;
          sumRad += rad2 * weight;
          sumConf += conf2;
          n += weight;
          srcIndices.push(d2.i);
        }
      }
      outDetections.push({
        x: Math.round(sumX / n),
        y: Math.round(sumY / n),
        radius: Math.round(sumRad / n),
        confidence: sumConf,
        srcIndices
      });
    }
  }
  return outDetections.sort((a, b) => b.confidence - a.confidence);
}