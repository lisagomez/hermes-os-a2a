# CLIs agente-nativos (Printing Press) + auditor (estado al 2026-06-30)

Imprimir un CLI por cada API del stack para que los agentes la usen gastando ~100x menos
tokens que un MCP pesado. Otra palanca de eficiencia, hermana del routing y el caché
([[fase1-eficiencia]]). Fuente de verdad de fases: `businessos/ROADMAP.md`
(sección "Corriente transversal — CLIs agente-nativos").

## Piezas (todas en la raíz de `businessos/`, NO en una carpeta `printing-press/`)
- `cli-manifest.yaml` — mapea cada CLI a su fase, `source` (catalog/sniff/spec/own), vertical.
  `defaults`: `mode: codex`, `min_grade: A`, `verify: true`, `publish: false` (dogfood primero).
- `print-phase.sh <fase> [--plan|--emit]` — prepara la impresión (NO imprime). `--emit` escribe
  los prompts a `/tmp/printing-press-fase-<fase>.txt`. Requiere `yq` (instalado en `~/.local/bin`).
- `GENERACION-AUTOMATICA.md` — los tres niveles de automatización.
- `cli-audit.py` — **job de confianza del host** (modelo: `ingest-token-usage.py`); detector.

## Restricción que manda en el diseño
- **Printing Press solo corre en Claude Code en la máquina de desarrollo** (Go 1.26.4+ y el
  comando `/printing-press`). NO corre en el Droplet ni dentro de Hermes → **ningún cron puede
  imprimir un CLI**; solo preparar y avisar. La impresión/mejora la dispara Elisa en Claude Code
  (`/printing-press`, `/printing-press-reprint`, `/printing-press-amend`, `/code-review`).
- Por eso el **Nivel 3 (autónomo) está descartado**; se eligió **Nivel 2-prep: detector + aviso**.

## Auditor `cli-audit.py` (decidido + construido 2026-06-30)
- Lee `cli-manifest.yaml` (pyyaml), descubre el stack en `docker-compose.yml`, detecta la fase
  actual desde el marcador `EN CURSO` del ROADMAP, y compara contra los CLIs ya impresos
  (librería de Printing Press; degrada si no existe → todo lo "due" es faltante).
- Salida: snapshot `/opt/data/workspace/cli-audit.json` con `faltantes`, `desactualizados`
  (impresos bajo grado mínimo), `apis_sin_entrada`, `no_due_aun`, `comando_sugerido`.
- Es **host-job** (escribe al volumen vía `docker exec -i -u hermes hermes-negocio` y lee docker),
  aunque NO necesita `service_role` (no toca Supabase). Mismo patrón snapshot que el presupuesto:
  el agente solo LEE (skill `cli-audit`), nunca corre el auditor ni imprime. Ver [[hermes-vertical-setup]]
  (sección secret-scrubbing) y [[fase1-eficiencia]].
- Verificado on-demand (fase 1): lista `digitalocean`, `telegram` (fase 0-1) y `supabase`
  (fase 1-2) como faltantes; sugiere `./print-phase.sh 0-1 --emit ; ./print-phase.sh 1-2 --emit`.

## Cableado
- **Hoy (sin Droplet):** on-demand. Corres `python3 businessos/cli-audit.py`; el skill `cli-audit`
  responde "¿qué CLIs faltan?".
- **Droplet (futuro):** cron de SO 2:30 (escalonado tras la ingesta de tokens 2:2x); el digest 8:00
  de negocio reporta brechas. Documentado en `businessos/negocio/AGENTS.md` "## Crons".

## Pendiente
- ⬜ Instalar Printing Press (Go + Claude Code) y confirmar la **ruta real de la librería** de CLIs
  impresos (hoy `cli-audit.py` prueba candidatos vía env `CLI_PRESS_LIBRARY` y rutas por defecto).
- ⬜ Imprimir los primeros CLIs (Nivel 1, manual) para medir el costo real por CLI antes de
  considerar más automatización.
