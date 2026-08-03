# App A — enriquecimiento-a2a (waterfall enrichment del depto. adquisición)

**Estado (2026-08-02): VIVO en producción** (Hetzner, `hermes-net`, perfil `a2a`,
puerto 5000 solo-localhost, healthy). Primera corrida real del cron de
vigilancia: noche del 2026-08-02.

## Qué es

Servicio A2A **sin LLM** (PR #210): cascada ordenada por costo para completar
email/teléfono/razón social de leads B2B — `rfc_offline` (valida el provisto) →
DENUE (INEGI) → gate 69-B CFF → patrón de dominio (siempre `dudoso`). Gate del
grafo (LFPDPPP) fail-closed por concepto; ledger `enriquecimiento_intento` por
intento; frontera dura: JAMÁS escribe `public.leads` (un-escritor-por-origen).
Productor del gate 69-B: host-job `businessos/vigilancia-69b.py` (cron en
`nightly-jobs.sh`, después del ingest).

## Historia corta

- **PR #210 mergeado con FAIL del QA conocido** (decisión de Elisa; el merge no
  despliega). Bloqueantes: inyección PostgREST (valores sin escapar con
  service_role) y gate 69-B fail-open (CSV del SAT por HTTP sin TLS +
  `no_listado` como dato que ABRE).
- **PR #213 (mismo día)**: `_q()` en todo valor de query + validación
  `RE_LEAD_ID` en el executor; guardas del host-job (umbral
  `VIGILANCIA_69B_MIN_FILAS=5000` + guarda de descensos presunto/definitivo→
  no_listado con `--permitir-descensos` como única salida); paginación `Range`;
  **frescura del dictamen** (`consultado_en` ausente/ilegible o >
  `GATE_69B_MAX_EDAD_DIAS` (45) = bloqueado). 99 tests, 5 controles de
  reversión (cada fix quitado pone rojo su test).
- **Despliegue 2026-08-02**: gate de imagen PASS; **las 5 tablas no existían en
  prod** (ver aprendizaje CLAUDE.md 2026-08-02) → `supabase-enriquecimiento.sql`
  + `-refuerzo.sql` aplicados por management API (404→200 verificado); smoke de
  protocolo real dentro de `businessos_hermes-net` (SendMessage → fallo honesto
  "lead no existe"; prueba grafo real + Supabase real; ledger quedó en 0);
  dry-run de vigilancia contra el SAT real: **14.055 RFCs** en el listado.

## Operación

- Levantar: `docker compose --profile a2a up -d enriquecimiento-a2a` (desde
  `~/repo/businessos` en el server). Env: `GRAFO_URL=http://grafo:3000`,
  Supabase del `.env`, `DENUE_TOKEN` opcional (sin él, DENUE falla visible).
- Vigilancia manual: `python3 vigilancia-69b.py [--dry-run] [--rfc X ...]` con
  el `.env` cargado. Con 0 objetivos corta sin bajar el CSV (correcto).
- Un abort por umbral o descensos IMPRIME y sale 1 — revisar el CSV a mano
  antes de `--permitir-descensos`.
- La card wire va en camelCase (`supportedInterfaces`); `/docs` y
  `/openapi.json` deben dar 404 (opacidad).

## Pendientes / gates de la dueña

- `DENUE_TOKEN` real en el `.env` del server (sin él, el escalón DENUE registra
  error visible y la cascada sigue).
- Overrides 69-B (`override_69b`) son actos humanos — no hay UI; por SQL vía
  management API cuando haga falta.
- Primer lead real por la cascada (hoy ledger en cero); revisar la corrida del
  cron de la primera noche.
