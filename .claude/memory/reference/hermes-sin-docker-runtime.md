---
name: hermes-sin-docker-runtime
description: En el runtime de Hetzner el contenedor Hermes NO tiene daemon de Docker → read_file/execute_code/file toolset fallan; solo terminal(local) en el gateway funciona, y solo SOUL.md se inyecta al system prompt. Para dar un dato al agente: inyectarlo en SOUL, no leer archivos.
metadata:
  type: reference
---

**Contexto:** el contenedor `hermes-negocio` (y cualquier vertical Hermes) en Hetzner corre SIN
un daemon de Docker accesible. Esto rompe las herramientas de archivo del agente y obligó a un
patrón nuevo para exponerle datos. Descubierto el 2026-07-06 arreglando `budget-report`.

## Qué NO funciona (y por qué)
- **`read_file` / `execute_code` / toolset `file`**: corren dentro de un *entorno Docker*
  (`tools.environments.docker`). Sin daemon → "Cannot connect to the Docker daemon". `hermes doctor`
  reporta `⚠ file (system dependency not met)` y auto-deshabilita el toolset. `environment_probe`
  NO es el switch (probé false, sigue eligiendo docker); el `file` toolset está atado a Docker en
  este build. `terminal.backend` es `local` pero el `file` toolset no lo respeta.
- **Inyectar el dato en `AGENTS.md`**: NO sirve — solo se *referencia* en el system prompt
  ("Reglas operativas en AGENTS.md"), su contenido no se incluye.
- **Inyectar el dato en `MEMORY.md` en crudo**: NO sirve — `MEMORY.md` se accede por la
  herramienta de memoria (`recall`), que busca por embeddings creados al ESCRIBIR una memoria;
  un edit crudo del archivo no queda indexado. `hermes memory` (CLI) solo tiene setup/status/off/
  reset, no "add" → un host-job no puede inyectar una memoria indexada.

## Qué SÍ funciona
- **`SOUL.md` se inyecta al system prompt** (siempre en contexto). Meter ahí un bloque con el dato
  = el agente lo ve directo, sin herramientas, en cualquier cliente. **Éste es el lever.**
- **`terminal` con backend `local` funciona, pero SOLO en el gateway** (Telegram/plataforma), no
  en `hermes chat --cli`. En el gateway el agente puede `cat` un archivo local del volumen.

## Patrón "dato-en-SOUL" (el fix de budget-report)
1. Host-job nocturno (`businessos/inject-presupuesto.py`, corre DENTRO del contenedor por
   `docker exec -i ... python3 -`) reescribe un bloque idempotente con marcadores
   `<!-- PRESUPUESTO:AUTO:START -->…<!-- END -->` en `/opt/data/SOUL.md`. Cableado en
   `businessos/nightly-jobs.sh` (03:10).
2. El skill (`negocio/skills/budget-report/SKILL.md` v3) ordena responder en TEXTO desde el
   contexto y **PROHÍBE ejecutar herramientas** (si no, el agente `cat`ea por la terminal: funciona
   pero ensucia el chat y se rompe en Telegram Web).
3. Tras cambiar SOUL/skill: `docker restart hermes-negocio`.

## Gotchas de verificación (verificar-antes-de-confiar)
- **`hermes chat -q "..."` es un harness PARCIAL**: no tiene el toolset `terminal` que el gateway
  sí tiene → puede pasar/fallar distinto que Telegram. La prueba REAL es un mensaje de la dueña.
- El **historial de la conversación** sesga al agente (arrastra intentos fallidos) → si sigue mal
  tras el fix, empezar sesión nueva (o resetear la sesión).
- **Telegram Web** no dibuja los widgets de tool-call ("message not supported on Telegram Web");
  Desktop/móvil sí. Un tool-call correcto puede *parecer* roto por el cliente.
- Editar `config.yaml` en vivo con `sed` puede dar un "No such file" transitorio durante el rename
  del `sed -i` — verificar después, no asumir daño. `hermes config set` usa `show/set` (no `get`).

Ver también [[hermes-vertical-setup]] y [[maquinas-entornos]].
