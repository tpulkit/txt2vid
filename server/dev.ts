import api from '.';
import Parcel from '@parcel/core';
import express from 'express';
import expressWS from 'express-ws';
import { createProxyMiddleware } from 'http-proxy-middleware';
import ngrok from 'ngrok';
import path from 'path';

const PORT = 4200;
const BUNDLER_PORT = 4201;

const { app } = expressWS(express());
const proxyMiddleware = createProxyMiddleware({
  target: `http://localhost:${BUNDLER_PORT}`
});
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});
app.use('/api', api);
app.use(proxyMiddleware);

app.listen(PORT, () => {
  console.log('Listening on http://localhost:4200');
});

let prebundle = Promise.resolve();

if (!process.env.WEBSITE) {
  prebundle = ngrok.connect(PORT).then(result => {
    process.env.WEBSITE = result;
    console.log('Publicly hosted at', result);
  });
}

const bundler = new Parcel({
  entries: path.resolve(__dirname, '..', 'src', 'index.html'),
  defaultConfig: '@parcel/config-default',
  serveOptions: { port: BUNDLER_PORT },
  hmrOptions: { port: BUNDLER_PORT },
  additionalReporters: [{ packageName: '@parcel/reporter-cli', resolveFrom: __dirname }]
});
prebundle.then(() => bundler.watch());