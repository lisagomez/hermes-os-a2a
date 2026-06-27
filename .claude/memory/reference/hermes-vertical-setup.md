# Levantar una vertical Hermes (setup + gotchas)

Cómo poner viva una vertical de BusinessOS sin repetir el viacrucis del 2026-06-27.

## Modelo mental correcto
- **Cada vertical ES su propio Hermes** (un contenedor `nousresearch/hermes-agent`).
  NO existe un "Hermes orquestador" central en Fase 0. La interconexión entre
  agentes (A2A) es Fase 5. "Una mente, tres bocas" es diseño compartido, no un router.
- **Un bot de Telegram por vertical** (Telegram permite UNA sola conexión por token).
  - Vertical **personal** = bot **Kiris** `@hermes_khmcih2cwjdulkbq_bot` (id 8920861327).
  - `@liziris_bot` (id 8618732782) es de OTRO Hermes "del host" (instalado a pelo en
    `~/.hermes`, con WhatsApp + `hermes-webui/`). NO mezclar: comparten persona/idea
    pero deben ir en bots distintos ("aislar, no fundir").

## Procedimiento que funciona
1. **Wizard** (interactivo, requiere TTY real — NO se puede correr desde una shell no
   interactiva, queda huérfano):
   `docker run -it --rm -v ~/businessos/personal/.hermes:/opt/data nousresearch/hermes-agent:v2026.6.19 setup`
   Responder: proveedor OpenRouter + API key; token del bot de la vertical; modelo;
   allowed user IDs = tu user_id Telegram (`7022378429`); home channel = Y (tu DM).
2. **Persona**: copiar `businessos/<vertical>/{SOUL,AGENTS,MEMORY}.md` al volumen
   (reemplaza el SOUL default del wizard). El volumen es de **uid 10000**, así que
   copiar vía contenedor: `docker run --rm -v $HOME/businessos/personal/.hermes:/opt/data
   -v $PWD/businessos/personal:/src:ro alpine sh -c 'cp /src/*.md /opt/data/ && chown 10000:10000 /opt/data/*.md'`
3. **Levantar gateway** (compose en el Droplet; en WSL no hay compose, usar `docker run`):
   `docker run -d --name hermes-personal --restart unless-stopped --network hermes-net
   --shm-size 1g --env-file businessos/.env -e TELEGRAM_BOT_TOKEN=$PERSONAL
   -v $HOME/businessos/personal/.hermes:/opt/data -v $HOME/businessos/obsidian:/opt/data/obsidian:rw
   nousresearch/hermes-agent:v2026.6.19 gateway run`
4. **Verificar**: escribirle al bot desde tu cuenta → iris responde con su persona.

## Gotchas (cada uno costó tiempo el 2026-06-27)
- **El volumen `.hermes` es uid 10000, modo 0700.** Un `ls` del host da "Permission
  denied" → NO concluir "está vacío". Inspeccionar con un contenedor alpine.
- **La config de Telegram del gateway vive en el `.env` del volumen**
  (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALLOWED_USERS`, `TELEGRAM_HOME_CHANNEL`), puesta por
  el wizard. La sección `telegram:` del `config.yaml` es mínima/cosmética.
- **El gateway es SILENCIOSO tras el banner** y tarda un poco en empezar el polling y
  procesar mensajes pendientes. No declarar fallo por un log callado: verificar con un
  mensaje real. (El 2026-06-27 iris respondió tras unos minutos, no de inmediato.)
- **NO llamar `getUpdates` del bot una vez corre el gateway**: choca con su long-poll
  (Telegram permite un solo consumidor). Usar `getUpdates` solo ANTES de levantarlo.
- **Un bot no puede escribirte primero**: el usuario debe darle `/start` para que exista
  el `chat_id` (= su user_id en chat privado).
- **`hermes send --to telegram:<chat_id> "msg"`** envía vía Hermes sin gateway corriendo
  (lee `.env`+`config.yaml`), útil para cron/scripts. PERO es un envío mecánico: NO pasa
  por la persona ni el loop del agente. No confundir con "la vertical hablando".
- **En WSL no hay `docker compose`/`docker-compose`** (apunta al binario de Docker
  Desktop, inactivo). `docker` nativo sí. Replicar el servicio con `docker run`. En el
  Droplet sí se usa `docker compose`.
- **Warning inofensivo**: `Auxiliary Nous client unavailable / payment-credit error` —
  es el cliente auxiliar Nous Portal; con OpenRouter como proveedor principal no afecta.
