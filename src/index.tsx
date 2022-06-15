import { render } from 'react-dom';
import './polyfill';
import App from './App';

if (process.env.NODE_ENV == 'production') {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register(new URL('sw.ts', import.meta.url));
  }
}

render(<App />, document.getElementById('root'));
