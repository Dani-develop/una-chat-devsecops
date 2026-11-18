# Auditoría de dependencias

En el commit de partida del Laboratorio 5, `npm audit --json` registró 38 entradas de paquetes afectados (34 de severidad alta y 4 moderada). npm cuenta tanto los paquetes con un aviso directo como los paquetes que heredan el riesgo en el árbol de dependencias.

Un aviso directo fue [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf), que describe consumo excesivo de CPU al procesar ciertos patrones con `picomatch`. El árbol de Jest introducía esta dependencia transitiva en el entorno de desarrollo. También aparecieron avisos de `glob` y `minimatch`.

Las pruebas unitarias y de integración pasaron a usar `node:test` y `node:assert`. Se conservan los 65 casos unitarios y los 12 casos de integración del chat. Playwright se mantiene como herramienta independiente para E2E. La auditoría del lockfile resultante registró cero paquetes afectados en la verificación local.

Para reproducir la comparación, corré `npm audit --json` en la raíz de cada repositorio. El punto de partida está fijado en el [commit de octubre del Laboratorio 5](https://github.com/Dani-develop/una-chat-lab5-seguridad/tree/3e094d9ce1fb2af3462d9dabc0a96499c1b8cea3). Los avisos de la base consultada por npm pueden cambiar con el tiempo.
