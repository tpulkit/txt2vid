export const makeTTS = (text: string, id: string) => {
  const aud = new Audio(
    `/api/tts?id=${encodeURIComponent(id)}&text=${encodeURIComponent(text)}`
  );
  aud.crossOrigin = 'anonymous';
  return new Promise<HTMLAudioElement>((resolve, reject) => {
    aud.addEventListener('load', () => resolve(aud));
    aud.addEventListener('error', (evt) => reject(evt.error));
  });
};
