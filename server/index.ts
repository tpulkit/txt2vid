import express from 'express';
import expressWS from 'express-ws';
import WebSocket from 'ws';
import fetch from 'node-fetch';
import { decrypt, key, createNonce } from './util/crypto';
import 'dotenv/config';

const { app } = expressWS(express(), undefined, {
  wsOptions: {
    perMessageDeflate: false
  }
});

type WebSocketWithIP = WebSocket & {
  ip: string;
};

interface Room {
  conns: Record<string, WebSocketWithIP>;
  pw?: string;
}

const rooms: Record<string, Room> = {};
const nonceCB: Record<string, (url: string) => void> = {};
const cache: { [K in string]?: Promise<string> } = {};

app.use(express.json());

app.get('/pubkey', (req, res) => {
  res.send(key);
});

app.get('/tts', async (req, res) => {
  const { id, text } = req.query;
  if (typeof id != 'string' || typeof text != 'string') {
    return res.status(400).end();
  }
  const cacheID = text.toLowerCase().replace(/'"\?.\!/g, '') + ':' + id;
  if (cache[cacheID]) return cache[cacheID]!.then(url => res.redirect(url));
  const nonce = createNonce();
  cache[cacheID] = new Promise(resolve => {
    nonceCB[nonce] = url => {
      resolve(url);
      res.redirect(url);
    }
  });
  const [projectID, voiceID, encodedApiKey] = id.split('.');
  const apiKey = (await decrypt(Buffer.from(encodedApiKey, 'base64url'))).toString('latin1');
  const response = await fetch(`https://app.resemble.ai/api/v2/projects/${projectID}/clips`, {
    method: 'POST',
    headers: {
      Authorization: `Token token=${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      body: text,
      voice_uuid: voiceID,
      is_public: false,
      is_archived: false,
      callback_uri: `${process.env.WEBSITE}/api/tts_callback?src=${nonce}`
    })
  });
  const result = await response.json() as { success: boolean };
  if (!result.success) {
    return res.status(400).end();
  }
});

app.post('/tts_callback', (req, res) => {
  const { src } = req.query;
  if (typeof src != 'string' || typeof req.body.url != 'string' || !nonceCB[src]) {
    return res.status(403).end();
  }
  nonceCB[src](req.body.url);
  delete nonceCB[src];
  res.status(200).end();
});

app.ws('/room/:id', (_ws, req) => {
  const ws = _ws as WebSocketWithIP;
  ws.ip = req.ip;
  const { id } = req.params;
  const { pw, un } = req.query as Record<string, string | undefined>;
  let room = rooms[id];
  let uid = un;
  let autoError = '';
  const send = (dat: string) => ws.readyState == WebSocket.OPEN && ws.send(dat);
  const broadcast = (dat: string) => {
    for (const conn in room.conns) {
      if (conn != uid) {
        const lws = room.conns[conn];
        if (lws.readyState == WebSocket.OPEN) lws.send(dat);
      }
    }
  }
  const json = (dat: unknown) => '\0' + JSON.stringify(dat);
  const error = (msg: string) => json({
    type: 'error',
    msg
  });
  if (!uid || uid == '') autoError = 'null ID';
  else if (uid.length > 255) autoError = 'ID too long';
  else if (uid.indexOf('\0') != -1) autoError = 'ID includes null character';
  else if (Buffer.from(uid).length > 255) autoError = 'Username too long';
  if (autoError) return ws.send(error(autoError), () => ws.close());
  if (!room) {
    rooms[id] = room = {
      conns: {},
      pw
    };
  } else {
    if (room.pw && room.pw != pw) return ws.send(error('Incorrect password'), () => ws.close());
    if (room.conns[uid!]) {
      let i = 1;
      for (; room.conns[uid + ' ' + i]; ++i);
      uid += ' ' + i;
    }
  }
  send(json({
    type: 'welcome',
    msg: [uid].concat(Object.keys(room.conns))
  }));
  room.conns[uid!] = ws;
  broadcast(json({
    type: 'connect',
    msg: uid
  }));
  ws.on('message', (src, isBinary) => {
    if (isBinary) send(error('Invalid type'));
    else {
      const dat = src.toString();
      const nli = dat.slice(0, 257).indexOf('\0');
      const msg = dat.slice(nli);
      if (nli == -1) send(error('No target delimiter found'));
      else if (nli) {
        const to = dat.slice(0, nli);
        if (room.conns[to]) room.conns[to].send(uid + msg);
        else send(error('User does not exist'));
      } else broadcast(msg);
    }
  });
  ws.on('close', () => {
    delete room.conns[uid!];
    for (const _ in room.conns) {
      broadcast(json({
        type: 'disconnect',
        msg: uid
      }));
      return;
    }
    delete rooms[id];
  });
});

export default app;