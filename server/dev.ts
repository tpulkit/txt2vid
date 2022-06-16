import api from '.';
import express from 'express';
import expressWS from 'express-ws';
import { createProxyMiddleware } from 'http-proxy-middleware';
import ngrok from 'ngrok';

const PORT = 4200;

const { app } = expressWS(express());
const proxyMiddleware = createProxyMiddleware({
  target: 'http://localhost:4201'
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

if (!process.env.WEBSITE) {
  ngrok.connect(PORT).then(result => {
    process.env.WEBSITE = result;
  });
}