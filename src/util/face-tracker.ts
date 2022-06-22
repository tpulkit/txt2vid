import modelURL from 'url:../assets/model.pico';
import {
  CascadeClassifier,
  clusterDetections,
  createClassifier,
  Detection,
  runClassifier
} from './pico';

const model = fetch(modelURL)
  .then((res) => res.arrayBuffer())
  .then(createClassifier);

export type Face = Omit<Detection, 'confidence'>;

export class FaceTracker {
  private lastPreds: Detection[][];
  private cnv: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  private memoryInd: number;
  private constructor(
    private classifier: CascadeClassifier,
    private src: HTMLVideoElement | HTMLCanvasElement,
    private memory = 5
  ) {
    this.lastPreds = [];
    this.cnv = document.createElement('canvas');
    this.ctx = this.cnv.getContext('2d')!;
    this.memoryInd = 0;
  }
  static async create(
    src: HTMLVideoElement | HTMLCanvasElement,
    memory?: number
  ) {
    return new this(await model, src, memory);
  }
  find(): Face | null {
    this.cnv.width =
      (this.src as HTMLVideoElement).videoWidth || this.src.width;
    this.cnv.height =
      (this.src as HTMLVideoElement).videoHeight || this.src.height;
    this.ctx.drawImage(this.src, 0, 0);
    const data = this.ctx.getImageData(0, 0, this.cnv.width, this.cnv.height);
    const newDetections = runClassifier(data, this.classifier);
    for (const t of this.lastPreds) {
      for (const pred of t) pred.confidence *= 0.7;
    }
    const prevPredictions = this.lastPreds.flat();
    const faces = clusterDetections(newDetections.concat(prevPredictions));
    this.lastPreds[this.memoryInd] = [];
    for (const face of faces) {
      for (const ind of face.srcIndices) {
        const baseInd = ind - prevPredictions.length;
        if (baseInd >= 0) {
          this.lastPreds[this.memoryInd].push(newDetections[baseInd]);
        }
      }
    }
    if (++this.memoryInd >= this.memory) this.memoryInd = 0;
    return faces.length
      ? {
          x: faces[0].x,
          y: faces[0].y - faces[0].radius * 0.1,
          radius: faces[0].radius * 1.2
        }
      : null;
  }
  extract(face: Face, size?: number, cnv?: HTMLCanvasElement): ImageData {
    const x = face.x - face.radius,
      y = face.y - face.radius,
      s = face.radius * 2;
    if (size != null) {
      this.ctx.drawImage(cnv || this.cnv, x, y, s, s, 0, 0, size, size);
      return this.ctx.getImageData(0, 0, size, size);
    }
    return (cnv ? cnv.getContext('2d')! : this.ctx).getImageData(x, y, s, s);
  }
  plaster(face: Face, img: ImageData, ctx: CanvasRenderingContext2D) {
    const x = face.x - face.radius,
      y = face.y - face.radius,
      s = face.radius * 2;
    this.ctx.putImageData(img, 0, 0);
    ctx.drawImage(
      this.cnv,
      0,
      0,
      img.width,
      img.height,
      x,
      y,
      s,
      s
    );
  }
}
