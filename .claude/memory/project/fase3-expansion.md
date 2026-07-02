# Fase 3 — Expansión del grafo + cobro (Polar) + contratos-documento

**Estado (2026-07-02): núcleo COMPLETO en código; residuales de cuenta/runtime.**
PRP: `.claude/PRPs/prp-fase3-expansion.md`. Rama `feat/fase3-expansion`.

## Grafo v2 (multi-ámbito)

- Seed renombrado a `grafo/seed/reglas.json` (ya no es solo MX): 24 reglas / 27 impactos /
  11 categorías. Ámbitos: fiscal MX (11), fiscal CO (3: ET 107/771-2/104), contable MX
  (4: CFF 28/30 + NIF C-6/D-5), contractual MX (6: CCF 1794-1797/1843, CCo 78, LFPDPPP 21,
  CFF 29-A). Toda regla lleva `jurisdiccion`+`dimension` explícitas (el gate lo exige con
  catálogo múltiple).
- Motor: `regimen: GENERAL` en un impacto = wildcard (CO y contractual lo usan); la
  clasificación filtra categorías al ámbito consultado (sin cruces fiscal↔contractual).
- Contractual NUNCA dice "deducible": solo dudoso/requisitos (el grafo señala, Elisa decide).
- `GET /salud-conocimiento` (reglas vencidas + `verificar:true` pendientes + ámbitos) +
  host-job `revisar-vigencias.py` → snapshot `/opt/data/workspace/vigencias.json` en negocio;
  exit 1 si hay vencidas (cron lunes sugerido). 47 tests pytest verdes.

## Cobro (Polar MoR)

- **Payouts a México VERIFICADOS** (2026-07-02, docs Polar: Stripe Connect Express; CO también).
- `polar-cobros.py`: bandeja `cobros_pending/` (clientes y negocio) → POST
  `api.polar.sh/v1/checkouts/` (products=[PWYW product], amount en CENTAVOS, solo se honra en
  precio custom) → link a `cobros_links/` + fila en `cobros`; `--sync` mapea estados Polar
  (open/confirmed/succeeded/expired/failed → abierto/confirmado/pagado/expirado/fallido).
- Env: `POLAR_ACCESS_TOKEN` (scope checkouts:write), `POLAR_PRODUCT_ID` (producto
  pay-what-you-want creado una vez), opcional `POLAR_API` sandbox.
- **Residual**: crear la cuenta/organización Polar + producto + token (solo Elisa).

## Contratos-documento

- `supabase-fase3.sql`: tablas `cobros` y `contratos` (RLS sin políticas, solo service_role).
  Estados contrato: borrador → validado|en_revision (job según banderas) → aprobado → firmado
  (estos dos SOLO humano; ningún job/agente los pone).
- `validar-contratos.py`: bandeja `contratos_pending/` → grafo dimensión contractual →
  dictamen a `contratos_validados/` + upsert `contratos`. Plantilla en
  `clientes/contrato-template.md` (cláusulas diseñadas para clasificar: pago,
  confidencialidad, terminación, pena convencional).
- Smoke real: contrato de 5 cláusulas → `en_revision` con bandera CCF 1843 (pena del 20%),
  4/5 cláusulas citadas (CFF 29-A, LFPDPPP 21, CCF 1797).

## Gotchas nuevos

- Los host-jobs aceptan `COBROS_DIR`/`CONTRATOS_DIR` (bandeja local) para probarlos sin Docker.
- Un uvicorn de smoke anterior puede quedarse vivo amarrado al puerto (el kill del bloque no
  siempre llega): verificar `ss -tlnp` si un endpoint nuevo da 404 con /health vivo.
- Los AGENTS.md de clientes/negocio ya documentan cobros/contratos/vigencias (leer antes de
  cambiar flujos).
