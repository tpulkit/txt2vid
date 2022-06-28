import { render } from 'react-dom';
import App from './app';
import './polyfill';

if (process.env.NODE_ENV == 'production') {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register(new URL('sw.ts', import.meta.url), { type: 'module' });
  }
}

render(<App />, document.getElementById('root')!);