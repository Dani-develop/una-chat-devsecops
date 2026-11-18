'use strict';

const path = require('node:path');
const express = require('express');
const { createServer } = require('node:http');
const { Server } = require('socket.io');
const validation = require('./libs/unalib');
const EVENT = 'Evento-Mensaje-Server';
const socketClientDir = path.join(path.dirname(require.resolve('socket.io/package.json')), 'client-dist');

function createChatServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, { maxHttpBufferSize: 16384, serveClient: false });
  const commit = process.env.RENDER_GIT_COMMIT;
  const onRender = process.env.RENDER === 'true';
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (onRender) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    res.setHeader('Content-Security-Policy', [
      "default-src 'self'", "script-src 'self'", "style-src 'self'",
      "connect-src 'self'", "img-src 'self' http: https:",
      "media-src 'self' http: https:", "frame-src https://www.youtube-nocookie.com",
      "object-src 'none'", "base-uri 'none'", "form-action 'self'", "frame-ancestors 'none'"
    ].join('; '));
    next();
  });
  app.get('/health', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json(commit ? { ok: true, commit } : { ok: true });
  });
  app.use('/vendor/socket.io', express.static(socketClientDir, { index: false }));
  app.use(express.static(path.join(__dirname, 'public')));
  app.use((_req, res) => res.status(404).type('text/plain').send('Ruta no encontrada.'));
  io.on('connection', socket => {
    socket.on(EVENT, (raw, acknowledge) => {
      const result = validation.validarMensaje(raw);
      if (result.ok) io.emit(EVENT, JSON.stringify(result));
      else socket.emit('chat error', result.error);
      if (typeof acknowledge === 'function') acknowledge(result);
    });
  });
  return { app, httpServer, io, close: () => new Promise(resolve => io.close(resolve)) };
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || (process.env.RENDER === 'true' ? '0.0.0.0' : '127.0.0.1');
  const chat = createChatServer();
  chat.httpServer.listen(port, host, () => console.log(`UNA Chat: http://${host}:${port}`));
  const shutdown = () => chat.close().then(() => process.exit(0));
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

module.exports = { createChatServer, EVENT };
