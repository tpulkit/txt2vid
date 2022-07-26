import { useEffect, useState } from 'react';
import { CircularProgress, Typography } from 'rmwc';
import { mlLoading } from '../util';

const pretty = (bytes: number) => {
  if (!isFinite(bytes)) return '?';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (bytes >= 1024) {
    bytes /= 1024;
    i++;
  }
  return `${i ? bytes.toFixed(1) : bytes}${units[i]}`;
}

const Loading = () => {
  const [progress, setProgress] = useState<boolean | { loaded: number, total: number }>(false);
  useEffect(() => {
    const onProgress = mlLoading.on('progress', setProgress);
    mlLoading.then(() => {
      setProgress(true);
    });
    return () => mlLoading.off('progress', onProgress);
  }, []);
  return <div style={{ display: 'flex', width: '100vw', height: '100vh', alignItems: 'center', flexDirection: 'column' }}>
    <CircularProgress size={108} style={{ marginTop: '30vh' }} />
    <Typography use="body1" style={{ marginTop: '30vh' }}>
      {progress ? progress === true ? 'Initializing...' : `Downloading model... (${pretty(progress.loaded)}/${pretty(progress.total)})` : 'Loading...'}
    </Typography>
  </div>
};

export default Loading;