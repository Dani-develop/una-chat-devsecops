'use strict';

const { setTimeout: delay } = require('node:timers/promises');

async function checkDeployment() {
  const target = new URL('/health', process.env.CHAT_BASE_URL);
  const expected = process.env.GITHUB_SHA;
  if (target.protocol !== 'https:' || !/^[a-f0-9]{40}$/.test(expected)) {
    throw new Error('Se necesita una URL HTTPS y el SHA completo a verificar.');
  }
  const deadline = Date.now() + (process.argv.includes('--once') ? 0 : 8 * 60_000);
  let lastResult;
  do {
    try {
      const response = await fetch(target, { redirect: 'error', signal: AbortSignal.timeout(10_000) });
      if (response.ok) {
        const health = await response.json();
        if (health.ok === true && health.commit === expected) {
          console.log(`${target.href} confirmó el commit ${expected}`);
          return;
        }
        lastResult = `commit recibido: ${health.commit || 'desconocido'}`;
      } else {
        lastResult = `HTTP ${response.status}`;
      }
    } catch (error) {
      lastResult = error.message;
    }
    if (Date.now() < deadline) {
      console.log(`Esperando ${expected.slice(0, 12)} (${lastResult})`);
      await delay(10_000);
    }
  } while (Date.now() < deadline);
  throw new Error(`No se pudo verificar el despliegue de ${expected}: ${lastResult}`);
}

checkDeployment().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
