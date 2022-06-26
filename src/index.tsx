import { createRoot } from 'react-dom/client';
import App from './App';
import './polyfill';

if (process.env.NODE_ENV == 'production') {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register(new URL('sw.ts', import.meta.url));
  }
}

const root = createRoot(document.getElementById('root')!);

root.render(<App />);
