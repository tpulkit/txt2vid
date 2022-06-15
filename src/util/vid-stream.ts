const CODEC = 'video/webm;codecs=vp8,opus';

export function mediaStreamToRS(ms: MediaStream) {
  const rec = new MediaRecorder(ms, { mimeType: CODEC });
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(0))
      rec.addEventListener('dataavailable', async evt => {
        const buf = await evt.data.arrayBuffer();
        controller.enqueue(new Uint8Array(buf));
      });
      rec.addEventListener('stop', () => {
        controller.close();
      })
      rec.start(200);
    },
    cancel() {
      rec.stop();
    }
  });
}

export function rsToMediaSource(rs: ReadableStream<Uint8Array>) {
  const ms = new MediaSource();
  const reader = rs.getReader();
  ms.addEventListener('sourceopen', () => {
    reader.read().then(async ({ done, value }) => {
      const buf = ms.addSourceBuffer(CODEC);
      while (!done) {
        buf.appendBuffer(value!);
        ([{ done, value }] = await Promise.all([
          reader.read(),
          new Promise((resolve, reject) => {
            buf.addEventListener('error', reject);
            buf.addEventListener('updateend', resolve, { once: true });
          })
        ]));
      }
      ms.endOfStream();
    }).catch(() => ms.endOfStream('decode'));
  }, { once: true });
  return ms;
}