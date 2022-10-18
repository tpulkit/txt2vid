if (!HTMLVideoElement.prototype.captureStream) {
  alert('Your browser does not support captureStream, please use Chromium');
  window.close();
  throw new TypeError('failed init');
}

async function initRTC() {
  const RTC_CONFIG = {};

  const vidCodecs = RTCRtpSender.getCapabilities('video').codecs;
  const audCodecs = RTCRtpSender.getCapabilities('audio').codecs;
  
  const vcc = document.querySelector('#video-codec');
  const acc = document.querySelector('#audio-codec');
  const vidq = document.querySelector('#video-bitrate');
  const audq = document.querySelector('#audio-bitrate');
  const addCodec = document.querySelector('#add-codec');
  
  for (let i = 0; i < vidCodecs.length; ++i) {
    const codec = vidCodecs[i];
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = codec.mimeType;
    if (vidCodecs.findIndex(c => c.mimeType === codec.mimeType) === i) {
      vcc.appendChild(opt);
    }
  }
  
  for (let i = 0; i < audCodecs.length; ++i) {
    const codec = audCodecs[i];
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = codec.mimeType;
    if (audCodecs.findIndex(c => c.mimeType === codec.mimeType) === i) {
      acc.appendChild(opt);
    }
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
  const vid = document.querySelector('#live-feed');
  const recipients = document.querySelector('#recipients');
  const start = document.querySelector('#start');
  const stop = document.querySelector('#stop');
  vid.srcObject = stream;

  const [audTrack] = stream.getAudioTracks();
  const [vidTrack] = stream.getVideoTracks();

  const genPeer = qual => new Promise(resolve => {
    const target = document.createElement('video');
    target.muted = true;
    target.autoplay = true;
    const peer = new RTCPeerConnection(RTC_CONFIG);
    
    peer.ontrack = evt => {
      target.srcObject = evt.streams[0];
    }
    const src = new RTCPeerConnection(RTC_CONFIG);
    peer.onicecandidate = e => {
      if (e.candidate) {
        src.addIceCandidate(e.candidate);
      }
    }
      
    src.onnegotiationneeded = async () => {
      try {
        const offer = await src.createOffer();
        await src.setLocalDescription(offer);
        await peer.setRemoteDescription(offer);
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        await src.setRemoteDescription(answer);
      } catch (err) {
        alert('Failed to negotiate; you may have set the codec settings too low');
        window.close();
      }
    }

    src.onicecandidate = e => {
      if (e.candidate) {
        peer.addIceCandidate(e.candidate);
      }
    }

    src.addTrack(audTrack, stream);
    src.addTrack(vidTrack, stream);

    const senders = src.getSenders();
    const transcievers = src.getTransceivers();

    for (const transciever of transcievers) {
      if (transciever.sender.track?.kind == 'audio' || transciever.sender.track?.kind == 'video') {
        transciever.setCodecPreferences([qual[transciever.sender.track.kind + 'Codec']]);
      }
    }
    let done = false;
    peer.addEventListener('track', evt => {
      evt.track.onunmute = async  () => {
        if (done) return;
        done = true;
        for (const sender of senders) {
          if (sender.track?.kind == 'audio' || sender.track?.kind == 'video') {
            const params = sender.getParameters();
            params.encodings[0].maxBitrate = qual[sender.track.kind];
            await sender.setParameters(params);
          }
        }

        const container = document.createElement('div');

        container.appendChild(target);

        const info = document.createElement('div');
        info.textContent = `Audio: ${(qual.audio / 1000).toFixed(1)}kbps; Video: ${(qual.video / 1000).toFixed(1)}kbps`;
        container.appendChild(info);

        const remove = document.createElement('button');
        remove.textContent = 'Remove';
        const removeHandlers = [];
        remove.onclick = () => {
          recipients.removeChild(container);
          src.close();
          peer.close();
          for (const handler of removeHandlers) {
            handler();
          }
        }
        container.appendChild(remove);

        recipients.appendChild(container);
        resolve({
          capture: () => {
            remove.disabled = true;
            const result = target.captureStream();
            const recorder = new MediaRecorder(result, {
              mimeType: 'video/webm;codecs=vp9',
              videoBitsPerSecond: 5000000,
              audioBitsPerSecond: 200000
            });
            recorder.start();
            return () => new Promise(resolve => {
              recorder.ondataavailable = evt => {
                const fixCodec = v => v.replace(/\//g, '-');
                resolve({
                  data: evt.data,
                  name: `${fixCodec(qual.videoCodec.mimeType)}-${qual.video}_${fixCodec(qual.audioCodec.mimeType)}-${qual.audio}.webm`
                });
              }
              recorder.stop();
              remove.disabled = false;
            });
          },
          onRemove: handler => {
            removeHandlers.push(handler);
          }
        });
      }
    })
  });

  let peers = [];

  addCodec.onclick = async () => {
    const peer = await genPeer({
      videoCodec: vidCodecs[vcc.value],
      audioCodec: audCodecs[acc.value],
      audio: audq.value * 1000,
      video: vidq.value * 1000
    });
    start.disabled = false;
    peer.onRemove(() => {
      peers = peers.filter(p => p !== peer);
      start.disabled = peers.length === 0;
    });
    peers.push(peer);
  }
  start.onclick = async () => {
    start.disabled = true;
    stop.disabled = false;
    const captures = peers.map(p => p.capture());
    stop.onclick = async () => {
      const zipData = {};
      for (const capture of captures) {
        const { name, data } = await capture();
        zipData[name] = new Uint8Array(await data.arrayBuffer());
      }
      const result = fflate.zipSync(zipData, { level: 0 });
      const url = URL.createObjectURL(new Blob([result], { type: 'application/zip' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${prompt('Enter download name')}.zip`;
      link.click();
      start.disabled = false;
      stop.disabled = true;
      stop.onclick = null;
    }
  }
}

document.addEventListener('DOMContentLoaded', initRTC);

