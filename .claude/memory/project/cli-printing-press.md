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

## Instalación (2026-06-30)
- **Go 1.26.4** instalado en `~/.local/go` (user-local, sin sudo; es el mínimo que pide la prensa).
- **Binario `cli-printing-press` 4.27.0** vía `go install github.com/mvanhorn/cli-printing-press/v4/
  cmd/cli-printing-press@latest` → queda en `~/go/bin/cli-printing-press`.
- **Ruta de librería CONFIRMADA:** `~/printing-press/library/<slug>` (de `publish --dir
  ~/printing-press/library/notion`). Runstate de impresiones en curso: `~/printing-press/.runstate/`.
  `cli-audit.py` ya apunta ahí (override con env `CLI_PRESS_LIBRARY`). Hoy la librería está vacía
  → `library_path: null` en el snapshot (degrada bien). Verificar impresos con
  `cli-printing-press library list [--json]`.
- **Catálogo valida el manifiesto:** `digitalocean` y `telegram` SÍ están en el catálogo embebido
  (= `source: catalog`); `supabase` y `polar` NO (= `source: sniff`, sin spec público). Consistente.
- ✅ **Skills instaladas** (fuera de auto-mode): 9 en `~/.claude/skills/printing-press*`
  (`printing-press`, `-polish`, `-publish`, `-reprint`, `-amend`, `-import`, `-retro`, `-score`,
  `-output-review`). Comando: `npx -y skills@latest add mvanhorn/cli-printing-press/skills
  --skill "*" -g -y -a claude-code`. Nota: el clasificador de auto-mode bloquea `npx skills add`
  y `go install` de repos externos por diseño → instalar la prensa requiere modo no-auto.

## Política CLI-first en AGENTS.md (2026-06-30)
- Añadido a `negocio/AGENTS.md` y `clientes/AGENTS.md` el **orden de resolución CLI-first**:
  (1) usar CLI existente (`cli-manifest.yaml`) → (2) si falta y se repite/es cara, **señalar**
  candidato a imprimir (el agente NO imprime; Elisa lo hace en Claude Code; el auditor lleva la
  cuenta) → (3) escalón A2A reservado Fase 5 → (4) modelo con routing por costo.
- **Reconciliado** de un borrador (`04-politica-cli-first.md`): se quitó la instrucción "imprime"
  (Hermes no corre Printing Press → instrucción imposible, mismo muro que el secret-scrubbing).
- **DIFERIDO (no integrado, requiere tu decisión):**
  - Autonomía Nivel 3 (agente imprime solo dentro de un tope) — **descartado** en el plan del
    auditor; reintroducirlo lo revertiría, y el agente no puede imprimir igual.
  - Presupuesto de impresión $10/mes registrado en `token_usage` con `tarea='print-cli'` — la
    tabla NO tiene columna `tarea` (es `fecha/vertical/modelo/tokens_in/tokens_out/costo_usd`,
    única por `fecha,vertical,modelo`); y la impresión ocurre en Claude Code, no en un vertical.
    Necesita migración + decisión de cómo atribuirlo antes de activarse.
- `config-routing.yaml` (mismo lote) NO se integró: repetía decisiones de Fase 1 y proponía
  `haiku-4.5` de default global (regresión vs `gemini-2.5-flash-lite`); su esquema no coincide
  con el config real de Hermes. Único hilo a futuro: afinar compresión de contexto (verificar
  claves reales antes de tocar un vertical vivo).

## Pendiente
- ⬜ Imprimir los primeros CLIs (Nivel 1, manual) para medir el costo real por CLI antes de
  considerar más automatización. Flujo: `./businessos/print-phase.sh 0-1 --emit` → pegar prompts
  a `/printing-press`; arrancar por `digitalocean` y `telegram` (están en el catálogo).
  Nota: codex CLI no instalado → la prensa correría en modo estándar (más tokens de Opus) hasta
  instalar codex.
