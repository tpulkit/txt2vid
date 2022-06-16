export const makeTTS = async (text: string, id: string) => {
  const aud = new Audio(`/api/tts?id=${encodeURIComponent(id)}&text=${encodeURIComponent(text)}`);
  aud.crossOrigin = 'anonymous';
  return aud;
}