# Levantar una vertical Hermes (setup + gotchas)

Cómo poner viva una vertical de Hermes OS · A2A sin repetir el viacrucis del 2026-06-27.

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

## Setup NO interactivo (sin TTY) — funciona (2026-06-28, negocio)

El wizard interactivo NO es obligatorio. La imagen detecta "no TTY" y siembra el config
base igual (migración, skills, profiles) y sale 0. Lo "de wizard" (modelo, telegram) se
completa a mano. Camino que levantó `hermes-negocio` sin terminal interactiva:

1. **Sembrar el volumen** (no interactivo, stdin cerrado):
   `docker run --rm -i -v $HOME/businessos/<v>/.hermes:/opt/data <IMG> setup < /dev/null`
   (imprime "Non-interactive mode" y crea `config.yaml` con `model.default` en un **default
   caro: `anthropic/claude-opus-4.6`** — ¡hay que cambiarlo!).
2. **Fijar modelo** (el setup lo deja en Opus y `provider: auto`):
   `docker run --rm -v $VOL:/opt/data <IMG> config set model.default "nvidia/nemotron-3-super-120b-a12b"`
   `docker run --rm -v $VOL:/opt/data <IMG> config set model.provider "openrouter"`
3. **Crear el `.env` del volumen a mano** (el setup no interactivo NO lo escribe). 5 claves:
   `OPENROUTER_API_KEY`, `TERMINAL_ENV=docker`, `TELEGRAM_BOT_TOKEN=<token vertical>`,
   `TELEGRAM_ALLOWED_USERS=7022378429`, `TELEGRAM_HOME_CHANNEL=7022378429`. Escribir vía
   contenedor (uid 10000), pasando los secretos con `-e VAR` (sin valor) para no exponerlos:
   `docker run --rm -e OPENROUTER_API_KEY -e TELEGRAM_BOT_TOKEN_<V> -v $VOL:/opt/data alpine sh -c 'cat > /opt/data/.env <<EOF ... EOF; chown 10000:10000 /opt/data/.env; chmod 600 ...'`
4. Copiar persona (paso 2 de "Procedimiento") y levantar gateway (paso 3).

La config de plataforma `telegram:` del `config.yaml` ya viene igual que en personal (no hay
que tocarla); lo que falta sin wizard es SOLO el `.env` del volumen y el modelo.

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
- **Token rotado → actualizar el `.env` del VOLUMEN, no solo el del repo** (2026-06-28):
  el gateway lee `TELEGRAM_BOT_TOKEN` del `.env` del volumen (`~/businessos/<v>/.hermes/.env`).
  Si rotas el token del bot, el repo `.env` puede tener el nuevo pero el volumen sigue con el
  viejo → `telegram.error.InvalidToken: Unauthorized` y la vertical deja de responder
  (el contenedor sigue "Up"; el error está en logs). Fix: `sed -i` del `TELEGRAM_BOT_TOKEN`
  en el `.env` del volumen + `docker restart`. Verifica el token exacto con `getMe` (no
  `getUpdates`, que choca con el long-poll del gateway).

## Editar config/persona de una vertical VIVA (2026-06-30, Fase 1)
- **Cambiar config:** usar `docker exec -u hermes <contenedor> hermes config set <clave> <valor>`
  + `docker restart`. Las claves anidadas usan **dot-path** (`auxiliary.curator.model`,
  `display.language`). El subcomando de lectura es `config show` (NO existe `config get`).
  Correr como `-u hermes` preserva el owner (uid 10000); como root, hermes puede reescribir
  el archivo y cambiar el dueño.
- **NO usar `docker run ... <imagen-hermes> config ...` sobre el volumen vivo:** dispara el
  init s6 → `config-migrate` (crea backup nuevo) + resync de skills en CADA invocación, y
  compite con el gateway corriendo (carrera). Verificado: deja backups `config.yaml.bak-<hoy>`.
  Para LEER el volumen sin efectos usa un contenedor `alpine` (cat/sed/cp), no la imagen hermes.
- **Cambiar persona (SOUL):** editar el repo `businessos/<v>/SOUL.md` (fuente) y copiar SOLO
  ese archivo al volumen con alpine (`cp /src/SOUL.md /opt/data/SOUL.md && chown 10000:10000`),
  **nunca copiar `MEMORY.md`** del repo encima del volumen (el agente escribe su propia memoria
  ahí; lo borrarías). Restart para que recargue.
- **`display.language: es` NO fuerza el idioma de respuesta** — es solo UI/meta-textos del
  sistema (p.ej. la descripción en inglés de un sticker). Verificado 2026-06-30: con nemotron,
  un sticker/empty/texto-de-sistema en inglés hace que responda en inglés aunque el SOUL diga
  "habla en español" en un bullet suave. **Fix que sí funciona:** una **regla dura de idioma
  arriba del SOUL** ("SIEMPRE respondes en español, pase lo que pase..."). Confirmado: tras
  ponerla, Kiris respondió en español a texto en español. Es adherencia del modelo, no del
  routing (el loop principal sigue en nemotron sin tocar).

## Routing dinámico de costo: `:floor` (2026-06-30, verificado)
- OpenRouter acepta el sufijo `:floor` en el id del modelo → rutea al **proveedor más barato**
  de ESE modelo en tiempo real (`:nitro` = más rápido; no se pueden ambos). Verificado con
  llamada real: `openai/gpt-oss-120b:floor` → 200 OK, provider=DeepInfra. Hermes lo pasa tal
  cual a OpenRouter, así que basta `config set auxiliary.<p>.model "<id>:floor"`.
- Aplicado a la **capa barata** (10 profiles de apoyo) de personal. Los de Sonnet NO llevan
  `:floor` (Anthropic es proveedor ~único; no aporta). El **loop principal NO se subasta por
  precio** (queda estable y vetado). "Cheapest automático" solo para apoyo de bajo riesgo.
- Niveles de "dinámico" acordados: (1) `:floor` [hecho en personal], (2) cadena de fallback
  curada, (3) auto-tuner con eval binaria (skill autoresearch) + aprobación humana, DIFERIDO
  al Droplet (necesita 24/7, igual que el respaldo nocturno). El cerebro principal nunca se
  auto-cambia por precio sin eval + OK humano ("copiloto no autopiloto").

## GLM-5.2 en profiles PESADOS (2026-07-04, seam listo — falta correr el gate)
- **Qué:** `z-ai/glm-5.2` (OpenRouter) como reemplazo de `claude-sonnet-4.6` en los profiles
  pesados (`curator`, `kanban_decomposer`). GLM-5.2 (lanzado 2026-06-13, MoE 744B/40B, 1M ctx,
  MIT, hecho para coding+tools) cuesta ~$0.9/$2.9 por M vs Sonnet $3/$15 → ~6× más barato.
  **NO al loop principal** (gemini-2.5-flash-lite gana en caché 97% + 3.3s; GLM es reasoner pesado).
- **Gate ANTES de aplicar** (host-job `businessos/probe-glm.py`, no quema casi nada):
  `OPENROUTER_API_KEY=... python3 businessos/probe-glm.py`
  Verifica (1) responde español, (2) **tool_calling** (imprescindible), (3) **caché de prefijo**
  `cached_tokens>0` (lección nemotron: sin caché no vale para uso frecuente). Solo si pasa idioma+tools
  se cablea; si además cachea → apto para pesados; sin caché → solo fallback o profiles poco frecuentes.
- **Aplicar (por vertical, sobre el volumen vivo; NO `docker run` sobre el volumen):**
  ```
  docker exec -u hermes hermes-<v> hermes config set auxiliary.curator.model "z-ai/glm-5.2"
  docker exec -u hermes hermes-<v> hermes config set auxiliary.kanban_decomposer.model "z-ai/glm-5.2"
  docker restart hermes-<v>
  ```
  Considerar sufijo `:nitro` (proveedor rápido/estable) si el probe muestra varianza de latencia.
- **Rollback:** `config set auxiliary.<p>.model "anthropic/claude-sonnet-4.6"` (o `""` = default).
- **Verificar en vivo:** ejercitar un profile pesado (p.ej. `kanban_decomposer` con una tarea real) y
  confirmar en `agent.log` `API call # ... model=z-ai/glm-5.2 ... cache=NN%` sin error y en español.
  Aplicar primero en UNA vertical, luego replicar a las 3 (routing idéntico).

## Proveedor muerto cuelga el bot → `:nitro` en el loop principal (2026-06-30)
- **Síntoma:** un bot recibe el mensaje (gateway.log: `inbound message`) pero NUNCA responde.
  En agent.log se ve `chat_completion_stream_request` creado y luego NADA (sin `API call #`,
  sin `Turn ended`). El gateway sigue "Up" y conectado a Telegram.
- **Causa:** el ruteo de proveedor por defecto de OpenRouter es no-determinista; a veces pega
  en un proveedor que acepta la petición y nunca devuelve (stream colgado, sin timeout). El
  loop principal (model.default) se cuelga. Verificado: `nemotron-...-a12b` sin sufijo tardó
  >90s/vacío en un proveedor y 0s en otro (DekaLLM) minutos después.
- **Fix:** `config set model.default "<modelo>:nitro"` → OpenRouter rutea al proveedor más
  rápido/responsivo (nemotron:nitro → DeepInfra ~1s). Aplicado a las 3 (2026-06-30). Para
  DIAGNOSTICAR rápido qué modelo/proveedor responde, llamar la API directo con `--max-time`
  (ver patrón de `:floor`). Aun así nemotron es lento (32-67s/turno con ~17k tokens de input);
  la cura durable es una **cadena de fallback** (Nivel 2) o un modelo principal más rápido.
- **NO reiniciar un contenedor con tarea activa:** `docker restart` mata el turno en curso
  ("Gateway shutting down — task interrupted"). Hermes auto-reanuda la sesión, pero molesta al
  usuario. Antes de reiniciar, revisar agent.log por un turno en vuelo / aprobación pendiente.

## Cadena de fallback de modelo (Nivel 2, 2026-06-30)
- `hermes fallback {list,add,remove,clear}`. `add` es **solo interactivo** (picker, sin flags)
  → en WSL no sirve. Se configura editando `fallback_providers` en config.yaml. Esquema:
  lista de `{provider, model}` (opcionales `base_url`, `key_env` para `provider: custom`).
  Ítems a columna 0 (igual que `toolsets:`). Ejemplo:
  `fallback_providers:` / `- provider: openrouter` / `  model: <id>` (uno por línea).
- Edición no interactiva segura: backup + reemplazo quirúrgico de la línea `fallback_providers: []`
  (python con `assert count==1`, sin reformatear el resto), como usuario hermes. Verificar con
  `hermes fallback list` (si la parsea, el YAML es válido) + `config check`, luego restart.
- **Dispara en:** 429, 5xx, 401/403, 404, respuestas vacías/malformadas (tras reintentos).
  **NO** garantiza cubrir un stream colgado indefinido (eso lo mitiga `:nitro`). Es **per-turn**:
  cada mensaje nuevo reintenta el primario antes de caer al fallback.
- Cadena en uso (las 3): nemotron:nitro → mistral-small-24b:nitro → claude-sonnet-4.6.

## Caché de prefijo: depende del proveedor (2026-06-30, verificado)
- La caché de prompt SOLO funciona si el modelo corre en un proveedor que la soporta
  (Anthropic, OpenAI, Gemini, DeepSeek). **nemotron vía DeepInfra NO la soporta** → probe
  dio `cached_tokens=0`; reprocesaba ~17-19k tokens cada turno (~8-12s de latencia). El
  `prompt_caching: cache_ttl` del config no ayuda si el proveedor ignora los marcadores.
- **Cómo verificar:** llamada directa a OpenRouter y mirar `usage.prompt_tokens_details.cached_tokens`.
  En el agent.log de Hermes aparece como `API call #N: ... latency=Xs cache=<hit>/<total> (NN%)`.
- **Fix aplicado:** loop principal → `google/gemini-2.5-flash-lite` (caché implícita automática).
  En producción: `cache=16262/16744 (97%)`, latencia 3.3s caliente (vs ~12s nemotron). Gemini
  y DeepSeek cachean solos; Anthropic necesita `cache_control:{type:ephemeral}` en el mensaje.
- Mantener SOUL/MEMORY/tools ESTABLES: cualquier cambio en el prefijo invalida la caché y el
  siguiente turno paga el prefijo completo de nuevo (caché es por prefijo idéntico).

## El agente NO puede usar secretos (secret-scrubbing) → patrón host-job + snapshot (2026-06-30)
- Hermes **scrubbea los secretos del sandbox del agente por diseño** (defense-in-depth):
  el código que corre el agente (`execute_code`/bash) **NO recibe** las env vars con
  credenciales (`SUPABASE_SERVICE_ROLE_KEY`, etc.), y `read_file` de `/opt/data/.env` está
  bloqueado ("credential store"). Un `docker exec` del host SÍ ve esas vars (engaña), pero el
  agente no. Síntoma: el bot dice "no tengo las credenciales / no puedo acceder a .env".
- **Implicación:** el agente NO debe consultar ni escribir Supabase directo. Lo hace un **job
  de confianza del host** (que sí tiene la credencial) y deja el dato listo donde el agente lo
  LEE. Ej: `ingest-token-usage.py` escribe `token_usage` y deja `/opt/data/workspace/presupuesto.json`;
  el skill/AGENTS.md dicen "lee ese snapshot". (`read_file` sí accede a `/opt/data/...` salvo `.env`.)
- **AGENTS.md gana al skill:** AGENTS.md/MEMORY.md están SIEMPRE en el prompt; un skill requiere
  `skill_view`. Si AGENTS.md ordena algo (p.ej. "consulta Supabase con service_role"), el agente lo
  sigue aunque sea imposible, e ignora el skill. Las instrucciones de AGENTS.md deben reflejar la
  arquitectura REAL. Si cambias el enfoque, prueba en **sesión nueva** (`/new`): la sesión vieja
  ancla al agente en su intento previo fallido.
- Pendiente del mismo tipo: clientes escribir `facturas` a Supabase (falta su job de host).

## Telemetría de tokens — ya existe en logs (para Fase 1 ingesta)
- El `agent.log` del volumen ya trae el consumo exacto por llamada:
  `API call #N: model=<m> provider=openrouter in=<tok> out=<tok> total=<tok> latency=<s>`.
  Esa línea es la fuente de ingesta para `token_usage` (no hay que inventar telemetría).
