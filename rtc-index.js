const RTC_CONFIG = {};

async function initRTC() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
  const vid = document.querySelector('#live-feed');
  const recipients = document.querySelector('#recipients');
  
  vid.srcObject = stream;
  vid.play();

  const [audTrack] = stream.getAudioTracks();
  const [vidTrack] = stream.getVideoTracks();

  const targetQuals = [{
    audio: 10000,
    video: 1000000
  }];

  const peers = targetQuals.map(v => {
    const target = document.createElement('video');
    const peer = new RTCPeerConnection(RTC_CONFIG);
    
    peer.ontrack = evt => {
      target.srcObject = evt.streams[0];
      target.play();
    }
    recipients.appendChild(target);
    return peer;
  });

  for (let i = 0; i < peers.length; ++i) {
    const peer = peers[i];
    const quality = targetQuals[i];

    const src = new RTCPeerConnection(RTC_CONFIG);
    peer.onicecandidate = e => {
      if (e.candidate) {
        src.addIceCandidate(e.candidate);
      }
    }
      
    src.onnegotiationneeded = async () => {
      const offer = await src.createOffer();
      await src.setLocalDescription(offer);
      console.log('nego')
      for (const peer of peers) {
        console.log('here')
        await peer.setRemoteDescription(offer);
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        await src.setRemoteDescription(answer);
      }
    }

    src.onicecandidate = e => {
      if (e.candidate) {
        for (const peer of peers) {
          peer.addIceCandidate(e.candidate);
        }
      }
    }

    src.addTrack(audTrack, stream);
    src.addTrack(vidTrack, stream);

    const senders = src.getSenders();
    const transcievers = src.getTransceivers();
    const vidCap = RTCRtpSender.getCapabilities('video').codecs.find(c => c.mimeType.includes('AV1'));
    const audCap = RTCRtpSender.getCapabilities('audio').codecs.find(c => c.mimeType.includes('opus'));
    console.log(vidCap, audCap);
    for (const transciever of transcievers) {
      if (transciever.sender.track?.kind == 'audio' || transciever.sender.track?.kind == 'video') {
        transciever.setCodecPreferences(transciever.sender.track.kind == 'audio' ? [audCap] : [vidCap]);
      }
    }
    peer.addEventListener('track', () => {
      setTimeout(async () => {
        for (const sender of senders) {
          if (sender.track?.kind == 'audio' || sender.track?.kind == 'video') {
            const params = sender.getParameters();
            console.log(params);
            params.encodings[0].maxBitrate = quality[sender.track.kind];
            await sender.setParameters(params);
          }
        }
      }, 2000)
    })
  }
}

init();

