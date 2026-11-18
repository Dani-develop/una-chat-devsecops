const assert = require('node:assert/strict');
const { after, before, describe, test } = require('node:test');
const { io: connect } = require('socket.io-client');
const request = require('supertest');
const { createChatServer, EVENT } = require('../../server');

const rawMessage = (mensaje, extra = {}) => JSON.stringify({ nombre: 'Integración', mensaje, color: '#155e75', ...extra });

describe('Backend real + una-lib + Socket.IO real', { timeout: 10000 }, () => {
  let chat, sender, receiver;
  const broadcasts = [];

  before(async () => {
    chat = createChatServer();
    await new Promise(resolve => chat.httpServer.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${chat.httpServer.address().port}`;
    sender = connect(url, { transports: ['websocket'], forceNew: true, reconnection: false });
    receiver = connect(url, { transports: ['websocket'], forceNew: true, reconnection: false });
    await Promise.all([sender, receiver].map(client => new Promise((resolve, reject) => {
      client.once('connect', resolve);
      client.once('connect_error', reject);
    })));
    receiver.on(EVENT, raw => broadcasts.push(JSON.parse(raw)));
  });
  after(async () => {
    sender?.disconnect();
    receiver?.disconnect();
    if (chat) await chat.close();
  });
  const send = raw => sender.timeout(3000).emitWithAck(EVENT, raw);

  for (const [mensaje, tipo] of [
    ['https://example.com/foto.jpg', 'imagen'],
    ['https://example.com/video.webm', 'video'],
    ['https://www.youtube.com/watch?v=qYwlqx-JLok', 'youtube'],
    ['Hola desde otro cliente', 'texto']
  ]) {
    test(`acepta y transmite ${mensaje}`, async () => {
      const broadcast = new Promise(resolve => receiver.once(EVENT, value => resolve(JSON.parse(value))));
      const result = await send(rawMessage(mensaje));
      assert.partialDeepStrictEqual(result, { ok: true, tipo, mensaje });
      assert.deepEqual(await broadcast, result);
    });
  }
  for (const mensaje of [
    'https://example.com/pagina.html',
    "<script>alert('Inyección de script');</script>",
    '<img src=x onerror=alert(1)>',
    'javascript:alert(1)'
  ]) {
    test(`rechaza y no difunde ${mensaje}`, async () => {
      const receivedBefore = broadcasts.length;
      const errorEvent = new Promise(resolve => sender.once('chat error', resolve));
      const result = await send(rawMessage(mensaje));
      assert.equal(result.ok, false);
      assert.equal(await errorEvent, result.error);
      // La barrera espera a que el mismo transporte procese los mensajes pendientes.
      const barrier = new Promise(resolve => receiver.once(EVENT, resolve));
      await send(rawMessage('Barrera de sincronización'));
      await barrier;
      assert.equal(broadcasts.length - receivedBefore, 1);
      assert.equal(broadcasts.at(-1).mensaje, 'Barrera de sincronización');
    });
  }
  test('JSON malformado no cae en un retorno inseguro', async () => {
    assert.partialDeepStrictEqual(await send('{bad json'), { ok: false });
  });
  test('rechaza código en el nombre aunque el mensaje sea normal', async () => {
    assert.partialDeepStrictEqual(await send(rawMessage('Hola', { nombre: '<script>alert(1)</script>' })), { ok: false });
  });
  test('servidor continúa disponible después de un rechazo', async () => {
    await send(rawMessage('data:text/html,alert(1)'));
    assert.partialDeepStrictEqual(await send(rawMessage('Todavía conectado')), { ok: true, tipo: 'texto' });
  });
  test('Supertest verifica HTML real y políticas HTTP', async () => {
    const response = await request(chat.app).get('/').expect(200).expect('Content-Type', /html/);
    assert.match(response.text, /UNA Chat/);
    assert.match(response.headers['content-security-policy'], /script-src 'self'/);
    assert.equal(response.headers['x-content-type-options'], 'nosniff');
    assert.equal(response.headers['x-frame-options'], 'DENY');
    assert.match(response.headers['permissions-policy'], /camera=\(\)/);
    await request(chat.app).get('/health').expect(200, { ok: true });
  });
});
