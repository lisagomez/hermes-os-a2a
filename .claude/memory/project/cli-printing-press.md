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

## Primeros CLIs impresos (2026-06-30)
- ✅ **digitalocean** (spec oficial, 660 endpoints) → shipcheck 7/7, scorecard **87/100 Grade A**.
  En `~/printing-press/library/digitalocean/` (binario `digitalocean-pp-cli` v1.0.0).
- ✅ **telegram** (apis.guru, 74 endpoints) → shipcheck 7/7, scorecard **83/100 Grade A** (2 bajo
  el 85 del manifiesto; drag = `insight 0/10`). Slug de librería = `telegram-bot` (del display name).
  En `~/printing-press/library/telegram-bot/` (binario `telegram-bot-pp-cli`).
- **Alcance usado:** spec-driven (generate + shipcheck + promote), SIN el tratamiento publish-grade
  "GOAT" (research profunda + 5+ features de transcendencia a mano). Suficiente para dogfood interno
  (`publish: false`). Para publicar: `/printing-press-polish <api>` levanta `insight`.
- Sin codex CLI → corrió en modo estándar (Opus); aun así el costo de tokens fue bajo porque
  `generate`/`shipcheck` son trabajo del binario Go, no del modelo.
- **Fix del auditor:** `cli-audit.py` ahora tolera el sufijo descriptivo de Printing Press
  (`telegram` ↔ dir `telegram-bot`) en `match_printed`; antes reportaba telegram como faltante.
  Verificado: auditor detecta la librería (`library_path` poblado), digitalocean+telegram salen de
  `faltantes`; queda solo `supabase` (fase 1-2, `sniff`, sin imprimir).

- ✅ **supabase** (2026-06-30) → shipcheck 7/7, **87/100 Grade A**. En `~/printing-press/library/
  supabase/` (binario `supabase-pp-cli`). NO se husmeó: se usó el **OpenAPI de PostgREST del
  proyecto** (`$SUPABASE_URL/rest/v1/`, Swagger 2.0 → convertido a OpenAPI 3); manifiesto cambiado
  a `source: spec`. Tablas tipadas: `token_usage`, `facturas`, `profiles`, `v_presupuesto_mensual`.
  - **Auth cableada a mano** (el generador no detecta auth en specs PostgREST): PostgREST/Supabase
    exige el service_role en DOS headers (`apikey` + `Authorization: Bearer`, mismo valor).
    Verificado con curl: solo `apikey` → 0 filas (anon, RLS); ambos → filas (service_role).
    Patch en `internal/config/config.go` (Load lee `SUPABASE_SERVICE_ROLE_KEY` → setea
    `AuthHeaderVal="Bearer "+key` y `Headers["apikey"]=key`; el client ya aplica ambos). Si se
    reimprime, reaplicar ese bloque (no es durable a regen). Documentado en el `note` del manifiesto.
  - **Caveat de uso:** es herramienta de **HOST/dev** (Elisa/jobs). El **agente Hermes NO puede
    usarla** (secret-scrubbing: no tiene el service_role). Mismo muro que [[fase1-eficiencia]];
    el path del agente para datos sigue siendo el snapshot que deja `ingest-token-usage.py`.
  - ✅ **Smoke test en vivo PASÓ** (2026-06-30): `supabase-pp-cli v-presupuesto-mensual list --json`
    devolvió el presupuesto del mes (3 verticales + TOTAL $0.1537, fuente "live"). `doctor`: API
    reachable, base_url correcto, credenciales presentes. Auth dual-header confirmada end-to-end.
  - **2º fix bakeado — base URL:** el spec PostgREST reporta `basePath "/"`, así que el generador
    dejó la base sin `/rest/v1` y las queries daban 404. Parcheado el default en `config.go` a
    `https://<ref>.supabase.co/rest/v1`. (Hand-edit durable, reaplicar si se regenera.)
  - **Gotcha de uso:** `businessos/.env` NO hace `export`, así que `source` deja las vars como
    shell-vars; el binario hijo no las ve. Correr con `source businessos/.env; export
    SUPABASE_SERVICE_ROLE_KEY` (o `export $(grep -v '^#' businessos/.env | xargs)`).
  - **Quirk del generador:** de las 4 tablas, solo la vista `v_presupuesto_mensual` quedó como
    comando de recurso top-level (`v-presupuesto-mensual list`); `token_usage`/`facturas`/`profiles`
    no surgieron como comandos directos (sí vía `sync`/`search`/`api`). Para el caso de uso de
    negocio (consultar presupuesto/dashboard) la vista es justo lo que se necesita. Si se quiere
    `token_usage` directo, es trabajo de spec/generación a futuro.

## Estado: Fase 0-1 + 1-2 completas en CLIs
Auditor reporta **0 faltantes** para la fase actual: digitalocean (87/A), telegram (83/A),
supabase (87/A) impresos. Quedan solo futuros: grafo (F2), Polar (F3), Circle (F5).

## Pendiente
- ⬜ (Opcional) `/printing-press-polish telegram-bot` para subir `insight 0/10` si se va a publicar.
- ⬜ (Opcional) exponer `token_usage`/`facturas` como comandos directos del supabase-pp-cli
  (hoy solo la vista de presupuesto es comando top-level; el resto vía sync/search/api).


## ACTUALIZACIÓN 2026-07-11 — el auditor corre en DEV y empuja por ssh

Tras la migración a Hetzner, `cli-audit.py` (que escribía el snapshot con
`docker exec` local) quedó huérfano: el JSON del volumen se congeló el 06-30 y
el bot, al pedirle "revisa el manifest", confabuló (skill instruía `read_file`,
inexistente en runtime). Arreglado: el auditor corre en la máquina de
desarrollo (única con la librería `~/printing-press/library/`) con
`CLI_AUDIT_SSH_HOST=hermes@<runtime>` para empujar el snapshot por ssh; el
skill `cli-audit` v1.1.0 lee con TERMINAL local (`cat`) y prohíbe
read_file/execute_code; AGENTS.md declara los toolsets inexistentes. Corrida
fresca 2026-07-11: fase 9, 4 faltantes (hetzner spec, grafo, polar, circle).
Refrescar el snapshot = correr el auditor on-demand desde dev (no hay cron que
pueda hacerlo: ni el server ni el bot tienen la librería).
