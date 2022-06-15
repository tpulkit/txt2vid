import express from 'express';
import expressWS from 'express-ws';
import WebSocket from 'ws';

const { app } = expressWS(express(), undefined, {
  wsOptions: {
    perMessageDeflate: false
  }
});

interface Room {
  conns: Record<string, WebSocket & {
    ip: string;
  }>;
  pw?: string;
}

const rooms: Record<string, Room> = {};

app.ws('/room/:id', (_ws, req) => {
  const ws = Object.assign(_ws, { ip: req.ip });
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
  const json = (dat: unknown) => '\n' + JSON.stringify(dat);
  const error = (msg: string) => json({
    type: 'error',
    msg
  });
  if (!uid || uid == '') autoError = 'null ID';
  else if (uid.length > 255) autoError = 'ID too long';
  else if (uid.indexOf('\n') != -1) autoError = 'ID includes newline';
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
  ws.on('message', dat => {
    if (typeof dat == 'string') {
      const nli = dat.slice(0, 257).indexOf('\n');
      const msg = dat.slice(nli);
      if (nli == -1) send(error('No target delimiter found'));
      else if (nli) {
        const to = dat.slice(0, nli);
        if (room.conns[to]) room.conns[to].send(uid + msg);
        else send(error('User does not exist'));
      } else broadcast(msg);
    } else send(error('Invalid type'));
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