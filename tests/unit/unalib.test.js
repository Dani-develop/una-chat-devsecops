const assert = require('node:assert/strict');
const { describe, test } = require('node:test');
const { inspect } = require('node:util');
const validation = require('../../libs/unalib');
const message = (mensaje, extra = {}) => JSON.stringify({ nombre: 'Daniela', mensaje, color: '#155e75', ...extra });

describe('Pruebas originales del ZIP (mismos cinco casos)', () => {
  test('teléfono válido 8297-8547', () => assert.equal(validation.is_valid_phone('8297-8547'), true));
  test('teléfono inválido 8297p-8547', () => assert.equal(validation.is_valid_phone('8297p-8547'), false));
  for (const url of ['http://image.com/image.jpg', 'http://image.com/image.gif']) {
    test(`imagen válida ${url}`, () => assert.equal(validation.is_valid_url_image(url), true));
  }
  test('YouTube válido del proyecto original', () => {
    assert.equal(validation.is_valid_yt_video('https://www.youtube.com/watch?v=qYwlqx-JLok'), true);
  });
});

describe('URLs completas de imágenes y videos', () => {
  for (const [url, tipo] of [
    ['https://example.com/foto.PNG?version=2', 'imagen'],
    ['http://localhost:3100/media/prueba.png', 'imagen'],
    ['https://example.com/foto.webp', 'imagen'],
    ['https://example.com/clip.mp4?token=abc', 'video'],
    ['https://example.com/clip.webm', 'video'],
    ['https://example.com/clip.ogv', 'video'],
    ['https://youtu.be/qYwlqx-JLok?t=5', 'youtube'],
    ['https://www.youtube.com/embed/qYwlqx-JLok', 'youtube'],
    ['https://www.youtube.com/shorts/qYwlqx-JLok', 'youtube']
  ]) {
    test(`acepta ${url} como ${tipo}`, () => {
      const result = validation.validarMensaje(message(url));
      assert.partialDeepStrictEqual(result, { ok: true, tipo });
      assert.match(result.url, /^https?:\/\//);
    });
  }
  for (const url of [
    'https://example.com/index.html', 'https://example.com/script.svg',
    'https://example.com/foto.png.exe', 'https://example.com/foto.png/extra',
    'https://example.com/index.html?foto=x.png',
    'javascript:alert(1)', 'data:image/png;base64,AAAA', 'file:///tmp/foto.png',
    'ftp://example.com/foto.jpg', '//example.com/foto.jpg',
    'www.example.com/foto.jpg', 'https://user:password@example.com/foto.png',
    'https://example.com/foto.png" onerror="alert(1)',
    'https://example.com/foto.png%22%20onerror=alert(1)',
    'https://example.com/%3Cscript%3E.png', 'https://example.com/foto%0a.png',
    'https:\\example.com\\foto.png', 'https://example.com/%ZZ.png',
    'https://www.youtube.com/watch?v=incorrecto',
    'https://www.youtube.com.evil.example/watch?v=qYwlqx-JLok',
    'https://www.youtube.com/watch?v=qYwlqx-JLok&v=otro',
    'https://youtu.be/qYwlqx-JLok/extra', 'Mira https://example.com/foto.png'
  ]) {
    test(`rechaza URL no permitida: ${url}`, () => {
      assert.equal(validation.parseMediaUrl(url), null);
      assert.equal(validation.validarMensaje(message(url)).ok, false);
    });
  }
  for (const value of [null, undefined, 23, {}, [], '']) {
    test(`no lanza excepciones con ${inspect(value)}`, () => assert.equal(validation.parseMediaUrl(value), null));
  }
  test('el iframe usa dominio e ID canónicos', () => {
    assert.partialDeepStrictEqual(validation.validarMensaje(message('https://youtu.be/qYwlqx-JLok')), {
      url: 'https://www.youtube-nocookie.com/embed/qYwlqx-JLok', id: 'qYwlqx-JLok'
    });
    assert.equal(validation.getYTVideoId('https://example.com/no'), null);
  });
});

describe('Validación de mensajes y prevención de inyección', () => {
  test('acepta texto normal en español y elimina campos no autorizados', () => {
    assert.deepEqual(validation.validarMensaje(message('¡Hola, UNA!', { admin: true })), {
      ok: true, nombre: 'Daniela', mensaje: '¡Hola, UNA!', color: '#155e75', tipo: 'texto'
    });
  });
  test('nombre vacío usa Anónimo', () => {
    assert.equal(validation.validarMensaje(message('Hola', { nombre: '  ' })).nombre, 'Anónimo');
  });
  for (const payload of [
    "<script>alert('Inyección de script');</script>",
    '<img src=x onerror=alert(1)>', '<svg onload=alert(1)>',
    '<iframe src="javascript:alert(1)"></iframe>', '<ScRiPt>alert(1)</ScRiPt>'
  ]) {
    test(`bloquea HTML y script: ${payload}`, () => {
      assert.equal(validation.validarMensaje(message(payload)).ok, false);
    });
  }
  test('bloquea inyección en nombre y color', () => {
    assert.equal(validation.validarMensaje(message('Hola', { nombre: '<img src=x onerror=alert(1)>' })).ok, false);
    assert.equal(validation.validarMensaje(message('Hola', { color: "red' onmouseover='alert(1)" })).ok, false);
  });
  for (const raw of [null, undefined, {}, 1, '', '{', 'null', '[]', '"texto"', '{"mensaje":4}', '{"mensaje":""}']) {
    test(`rechaza entrada inválida ${inspect(raw)}`, () => assert.equal(validation.validarMensaje(raw).ok, false));
  }
  test('limita mensaje, nombre y tamaño del JSON', () => {
    assert.equal(validation.validarMensaje(message('a'.repeat(2001))).ok, false);
    assert.equal(validation.validarMensaje(message('Hola', { nombre: 'a'.repeat(41) })).ok, false);
    assert.equal(validation.validarMensaje('x'.repeat(12001)).ok, false);
  });
  test('mantiene alias validateMessage sin generar HTML', () => {
    assert.partialDeepStrictEqual(JSON.parse(validation.validateMessage(message('Hola'))), { ok: true, tipo: 'texto' });
  });
});
