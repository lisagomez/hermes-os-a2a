# Cómo retomar — BusinessOS

Guía rápida para volver a entrar y operar. Estado al 2026-07-08:
**las TRES verticales viven en Hetzner** (negocio, personal/Kiris y clientes), junto con
grafo, grafo-a2a, el trío (ejecutor + supervisor + coordinador) y el dashboard.

| Recurso | Dónde |
|---------|-------|
| Servidor (runtime de TODO) | Hetzner cx33 · Falkenstein · **`167.233.233.56`** |
| Repo + compose en el server | `/home/hermes/repo/businessos` |
| Volúmenes de las verticales | `/home/hermes/businessos/{negocio,personal,clientes}/.hermes` |
| Este repo (desarrollo) | `/home/gsore/code/a2aboths` |

---

## 1. Hablar con el bot (sin login)

Los 3 bots corren 24/7 en Hetzner — solo mándales un mensaje por **Telegram**:
**@a2aTeamBot** (negocio) · **Kiris** (personal) · **@a2aClientbot** (clientes). No hay que entrar a nada.

Además, **negocio vive en Slack** (piloto 2026-07-08): @menciona a `@Hermes Negocio`
en `#dep-negocio` del workspace **A2AMassivo** — responde en hilo. Solo usuarios en
`SLACK_ALLOWED_USERS` (`.env` del volumen); para sumar al equipo, añade sus Member
IDs ahí y corre `~/repo/businessos/slack-piloto.sh`.

## 2. Entrar al servidor (para operarlo)

Desde tu terminal WSL:
```bash
ssh hermes@167.233.233.56
```
Entra con tu llave, sin contraseña. Estás dentro cuando el prompt diga `hermes@businessos:~$`.

Todo vive en:
```bash
cd ~/repo/businessos
```
Comandos útiles:
```bash
docker compose ps                      # qué está corriendo
docker compose logs -f hermes-negocio  # logs del bot (Ctrl+C para salir)
docker compose restart hermes-negocio  # reiniciar el bot
docker compose up -d                    # levantar el núcleo (negocio+grafo+grafo-db+a2abot)
```

Sumar servicios a demanda (perfiles):
```bash
docker compose --profile verticales up -d   # + personal + clientes
docker compose --profile trio up -d         # + ejecutor + supervisor
docker compose --profile a2a up -d          # + grafo-a2a + ventas-a2a (Fase 9)
```

## 3. Ver el dashboard (Mission Control)

En tu PC, deja esta ventana abierta:
```bash
ssh -L 9200:localhost:9200 hermes@167.233.233.56
```
Y abre en el navegador: **http://localhost:9200** (AI Spend + Pantheon + Grafo).

## 4. Gestionar el servidor por CLI (crear/apagar/precios/costo)

El token de Hetzner ya está en `~/.config/claude/secrets.env`.
```bash
cd ~/printing-press/library/hcloud
source ~/.config/claude/secrets.env
./hcloud-pp-cli servers list --json     # estado
./hcloud-pp-cli burn --json             # costo mensual real corriendo
```

## 5. Seguir con Claude Code

Abre Claude Code en `/home/gsore/code/a2aboths` y escribe **`/primer`** para recargar todo el contexto. La memoria ya sabe que negocio vive en Hetzner y cómo se migró.

---

## Reglas de oro (para no romper nada)

- **NO correr `docker compose up` de NINGUNA vertical en la máquina WSL2 local.** Los tokens de
  los 3 bots viven en Hetzner; Telegram permite una sola conexión por token → chocarían. (Los
  contenedores locales fueron eliminados el 2026-07-08; los volúmenes locales quedan solo como
  respaldo extra de la migración.)
- Escalar el server: `cx33 → cx42` es **resize en caliente** desde la consola de Hetzner
  (minutos, sin reprovisionar).
- Apagar el server en Hetzner **no** deja de cobrar (reserva recursos); pausa real = snapshot + delete.

## Respaldo automático (las 3 verticales)

Cada noche (**04:17**, hora del server) un cron copia los volúmenes `.hermes` de
negocio, personal y clientes (memoria + sesiones de cada bot) a dos sitios:
- **Local**: `~/backups/{negocio,personal,clientes}-*.tgz` en el server (últimos 7 de cada una).
- **Off-box**: repo privado GitHub **`lisagomez/businessos-negocio`** (sobrevive aunque muera el server).

Script: `~/bin/backup-verticales.sh` · log: `~/backups/backup.log` · corre como `hermes` (sin sudo).

**Restaurar** (si hiciera falta): bajar el `.tgz` del repo privado (o de `~/backups`), y con
negocio detenido, volcarlo en un volumen `.hermes` limpio preservando uid 10000/0700 —
mismo patrón de extracción que la migración (ver `.claude/memory/project/despliegue-hetzner.md`).

## Qué corre solo (crons en el server)

Todo como `hermes`, sin intervención. Log en `~/logs/host-jobs.log` (y `~/backups/backup.log`):

| Cron | Cuándo | Qué hace |
|------|--------|----------|
| `nightly-jobs.sh` | 03:10 diario | Ingesta `token_usage` (ayer+hoy) → snapshot de **presupuesto** que lee el bot; + **pantheon** de las 3 verticales |
| `weekly-jobs.sh` | 03:30 lunes | Salud del grafo (`revisar-vigencias`): reglas vencidas / cifras a cotejar |
| `backup-verticales.sh` | 04:17 diario | Respaldo de los 3 volúmenes `.hermes` (local + repo privado) |
| `alerta-presupuesto.sh` | 08:00 diario | Push proactivo a Elisa si el gasto cruzó el **80%** del presupuesto (una vez por mes) |

Al bot le puedes preguntar **"¿cómo va el presupuesto?"** y responde con datos frescos del snapshot.

## Pendientes anotados

- [x] ~~Cron nocturno de respaldo de negocio~~ → **hecho (2026-07-06)**; generalizado a las 3 verticales el 2026-07-08.
- [x] ~~Cierre de root SSH~~ → **hecho (2026-07-06)**. Root ya NO entra por SSH (`PermitRootLogin no`).
  El acceso es **solo `hermes`** (con llave), que ahora tiene **sudo sin contraseña** para administrar.
- [x] ~~Migrar personal + clientes a Hetzner~~ → **hecho (2026-07-08)**, mismo patrón que negocio; envío
  saliente verificado desde ambos bots.

## Qué queda por decidir (nada corre solo sin tu OK)

- **Dogfood real del trío/enjambre** (quema tokens): `EJECUTOR_ENGINE=claude` y/o
  `COORDINADOR_PLANNER=claude` + CLI de Claude Code en las imágenes.
- **Polar producción**: cambiar token/product_id de sandbox a prod cuando haya cobros reales.
- **Voz** (TTS/transcripción) y **exposición de grafo-a2a a internet** (dominio + auth real).
- **Fase 9 (adquisición)**: motor LLM real para tareas `adquisicion`, host-job
  `enviar-salientes.py` (email real), negociación A2A externa, card de ventas en internet,
  canal `#dep-adquisicion` en Slack. El núcleo ya corre en Hetzner (ventas-a2a :4400).
- **CLIs pendientes de imprimir** (acción humana en Claude Code): grafo y Polar (`/printing-press`).
