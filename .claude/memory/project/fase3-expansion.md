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
- **SANDBOX PROBADO end-to-end (2026-07-02)**: org sandbox + OAT (products:read/write,
  checkouts:read/write; SIN organizations:read — no hace falta) + producto PWYW
  «Cobro de servicios» `192ed732-dfed-4808-a814-bd389ddf63e7`. Flujo real: bandeja local
  (`COBROS_DIR`) → checkout → link → pago tarjeta 4242… → `--sync` → fila `pagado`.
- Gotcha corregido: **polar.sh está detrás de Cloudflare y bloquea el UA de urllib**
  (403 error 1010) — `http()` de `polar-cobros.py` ya manda `User-Agent: curl/8.0`.
- **Residual (máquina runtime)**: el tramo `docker exec` (bandejas de los contenedores)
  quedó sin ejercitar — se probó con `COBROS_DIR` en la máquina de desarrollo (ver
  [[maquinas-entornos]]). En la runtime: `git pull` (trae el fix de UA) + copiar a mano
  las 3 líneas de Polar al `.env` de esa máquina + prueba con bandeja real del agente.
- **Residual (producción)**: repetir con cuenta/token/producto de prod y sin `POLAR_API`.

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

- **UN solo `.env` de proyecto**: `businessos/businessos/.env` (junto a docker-compose.yml).
  Un `.env` en la raíz del repo es edición en ruta equivocada (pasó 2026-07-02; se borró
  tras verificar que era subset idéntico). Al recibir secretos pegados a mano, verificar
  formato/largo por variable SIN imprimir valores: detecta tokens en el slot equivocado
  (el `polar_oat_` apareció en `POLAR_PRODUCT_ID` y el `sbp_` en `SUPABASE_ANON_KEY`).
- Los host-jobs aceptan `COBROS_DIR`/`CONTRATOS_DIR` (bandeja local) para probarlos sin Docker.
- Un uvicorn de smoke anterior puede quedarse vivo amarrado al puerto (el kill del bloque no
  siempre llega): verificar `ss -tlnp` si un endpoint nuevo da 404 con /health vivo.
- Los AGENTS.md de clientes/negocio ya documentan cobros/contratos/vigencias (leer antes de
  cambiar flujos).
