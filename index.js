async function init() {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true
  });
  const vid = document.querySelector('#live-feed');
  const start = document.querySelector('#start');
  const stop = document.querySelector('#stop');
  vid.srcObject = stream;
  vid.play();
  start.disabled = false;

  const qualTargets = [{
    codec: 'VP9',
    audio: 10000,
    video: 100000
  }];

  start.onclick = async () => {
    stop.disabled = false;
    start.disabled = true;
    let zipData = {};
    const recorders = qualTargets.map(qual => {
      const mr = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: qual.video,
        audioBitsPerSecond: qual.audio
      });
      mr.ondataavailable = evt => {
        const url = URL.createObjectURL(evt.data);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${qual.video}-${qual.audio}.webm`;
        link.click();
      }
      mr.start();
      return mr;
    });

    stop.onclick = () => {
      stop.disabled = true;
      start.disabled = false;
      for (const mr of recorders) {
        mr.stop();
      }
    }
  }
}

init();

