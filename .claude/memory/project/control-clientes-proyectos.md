# Control multitenant de clientes/proyectos + primer cliente GAL MEXICO

**Estado (2026-07-22): VIVO** — estructura mergeada (PR #115) y snapshot desplegado en runtime.

## Qué es

- `businessos/activos-clientes/` = fuente de verdad del portafolio de clientes de la
  fábrica: un directorio por cliente (slug = misma noción que `tenant_id` de
  `crm_tenants`), con `CLIENTE.md` (ficha), `proyectos/<slug>/PROYECTO.md` (alcance,
  hitos, criterios binarios, gate "nada sale sin OK de Elisa"), `branding/` ingerido y
  ledger `activos.jsonl` (tokens + costo por activo).
- Catálogo de servicios `_catalogo/servicios.md` (S-01…S-09; precios TBD hasta tener
  2-3 proyectos con costo real medido). Plantillas de alta en `_plantillas/`.
- Ciclo de vida: propuesta → aprobado → en_curso → en_revision → entregado → cerrado.

## Primer cliente: GAL MEXICO (GAL Logistics)

- Logística express (Hand Carry · Charter · Parcel · Express Freight). Prefijo `GALMX`.
- Branding ingerido 2026-07-22: paleta MONOCROMÁTICA amarilla #F7C948 en 6 niveles
  (100 #FFFBEC → 950 #2A2205), Archivo + IBM Plex Sans/Mono, light-first (inverso del
  dark A2A). Tokens en `gal-mexico/branding/gal-tokens.css`. **Falta logo vectorial**
  (solo wordmark tipográfico en las láminas).
- Skill `gal-mexico-design` (`.claude/skills/`): metodología del design system A2A
  Factory con la marca del cliente; obliga etiqueta de entregable (GALMX-NNN), ledger
  con costo y verificación Playwright.
- Proyecto `rediseno-web` en **propuesta** (hito 1 = aprobar alcance con Elisa).

## Snapshot al bot de clientes (patrón dato-en-volumen)

- `businessos/snapshot-proyectos.py` deja `proyectos.json` en
  `/opt/data/workspace/` del contenedor `hermes-clientes`. Lee de **`origin/master`
  vía `git show`** (no del working tree): la frescura la garantiza el cron de fetch
  de 5 min, sin depender de pulls. Cableado en `nightly-jobs.sh` (cron 03:10 — ojo:
  el cron ejecuta `/home/hermes/bin/nightly-jobs.sh`, que es SYMLINK al repo, así que
  el pull basta). Doctrina en `clientes/AGENTS.md` (sección "Proyectos de clientes"),
  sincronizada al volumen el 2026-07-22 (backup `AGENTS.md.bak-20260722`).
- El bot LEE y cita `generado`; jamás adivina estado de proyectos.

## Pendientes

- Alcance de `rediseno-web` por aprobar → primer activo GALMX-001 (mock home).
- Pedir a GAL: logo vectorial, textos/fotos reales, datos de facturación.
- Futuro opcional: tablas `clientes`/`proyectos` en Supabase si Mission Control debe
  verlos (migración aditiva al proyecto compartido; lección `profiles`).

Relacionado: [[crm0-canales]] (tenants), [[frontend-web2]] (design system A2A).
