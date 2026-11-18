# UNA Chat

Evaluación individual de Seguridad Informática · Universidad Nacional, Campus Nicoya

- [Chat público](https://una-chat-devsecops.onrender.com)
- [Estado y commit del backend](https://una-chat-devsecops.onrender.com/health)
- [Historial de GitHub Actions](https://github.com/Dani-develop/una-chat-devsecops/actions)

El frontend en HTML, CSS y JavaScript se comunica con un servidor Node.js, Express y Socket.IO. El servidor valida el mensaje y difunde los mensajes válidos a los clientes conectados. Abrí el chat en dos ventanas para comprobarlo. Es una sala pública de demostración, así que usá mensajes de prueba.

## Origen y alcance

La aplicación parte del [Laboratorio 5 de UNA Chat](https://github.com/Dani-develop/una-chat-lab5-seguridad/tree/3e094d9ce1fb2af3462d9dabc0a96499c1b8cea3), que adapta el código de partida del curso. Se reutilizan el chat y sus casos de prueba. Esta entrega integra los controles de seguridad y los reportes de CI, reduce las dependencias de pruebas, amplía las cabeceras HTTP y comprueba la revisión desplegada antes de analizarla.

## Ejecutar en local

Usá Node.js 24, la versión empleada en CI y Render.

```sh
npm ci
npm start
```

Abrí [http://127.0.0.1:3000](http://127.0.0.1:3000). Para pruebas reproducibles, el repositorio incluye `/media/prueba.png` y `/media/flower.webm`. Los enlaces multimedia deben ocupar todo el mensaje.

```sh
npx playwright install chromium
npm run test:all
npm run report
```

Playwright inicia su propio servidor en el puerto 3100. Si se define `CHAT_BASE_URL`, prueba esa URL y usa el backend desplegado.

## Controles en GitHub Actions

| Control | Qué revisa | Evidencia |
| --- | --- | --- |
| SAST · Semgrep | Reglas JavaScript y una regla local para inserción de HTML en el DOM. La regla local se prueba con entradas seguras e inseguras. | `sast-semgrep` · JSON y SARIF |
| SCA · npm audit | Dependencias directas y transitivas de producción y desarrollo a partir de `package-lock.json`. El job falla desde severidad baja. | `sca-npm-audit` · JSON |
| Gitleaks | Historial disponible tras hacer checkout con `fetch-depth: 0`. Un token ficticio generado fuera del repositorio verifica la detección. Los reportes ocultan la coincidencia. | `secretos-gitleaks` · JSON |
| Playwright | Chromium comprueba dos sesiones reales, medios y rechazo de entradas maliciosas. Corre en el entorno de CI y contra el chat público. | `pruebas-y-playwright` y `playwright-publico` · HTML, JSON y capturas |
| DAST · OWASP ZAP | Baseline pasivo en la URL pública. Registra alertas HTTP y marca como fallos las reglas de cabeceras especificadas en `security/zap.conf`. | `dast-zap` · HTML, JSON y registro |

[CI de seguridad](.github/workflows/ci.yml) corre al enviar cambios a `main`, al abrir una solicitud de cambios hacia `main` o manualmente. [Verificación pública](.github/workflows/produccion.yml) se ejecuta manualmente en `main` después de desplegarlo. Cada job consulta `/health` para comprobar que el SHA público coincide con el de la ejecución. Abrí una ejecución en Actions para ver sus jobs y descargar sus artefactos.

ZAP Baseline rastrea y analiza las respuestas HTTP observadas. Los eventos propios de Socket.IO y el rechazo de XSS se verifican con Playwright y pruebas de integración.

La [comparación SCA](docs/sca.md) explica las dependencias detectadas en el laboratorio base y el cambio que permitió retirar las vulnerabilidades reportadas.

## Render

El servicio Node despliega `main` con el comando de compilación `npm ci --omit=dev` y el de inicio `npm start`. El proceso escucha en el `PORT` de Render en `0.0.0.0`. El endpoint `/health` devuelve el SHA inyectado por Render. El plan gratuito puede tardar en responder tras un periodo de inactividad.
