# Hallazgo de ZAP en el despliegue inicial

La [primera verificación pública](https://github.com/Dani-develop/una-chat-devsecops/actions/runs/44271254685) confirmó el commit `d4d9b1f` en Render. Playwright pasó los seis casos públicos. OWASP ZAP reportó el fallo de política `10021` en `/socket.io/socket.io.js`. La respuesta del cliente de Socket.IO omitía `X-Content-Type-Options: nosniff` porque Socket.IO servía el archivo antes del middleware de Express.

La aplicación ahora entrega el cliente empaquetado mediante Express en `/vendor/socket.io/socket.io.min.js`. Las conexiones Socket.IO siguen utilizando `/socket.io/`. La prueba de integración confirma que el recurso JavaScript responde con `nosniff`. También se activa HSTS cuando el servidor se ejecuta en Render, que recibe al público por HTTPS. La regla correspondiente (`10035`) quedó como bloqueo de verificación.

El escaneo usa reglas pasivas. El proceso conserva en el informe todas las alertas, incluso las que no activan un bloqueo. Los avisos de política se evalúan según la función del chat. Por ejemplo, la CSP admite imágenes y videos de URLs externas, mientras que los scripts de la página se restringen al origen de la aplicación.
