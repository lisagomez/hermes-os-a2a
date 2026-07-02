# PRP-003: Expansión del grafo + cobro (Polar) + contratos-documento (Fase 3)

> **Estado:** APROBADO (2026-07-02, Elisa pre-aprobó ejecución de Fase 3 y 4 sin gates intermedios: "no preguntes ejecuta")
> **Proyecto:** BusinessOS · **Fase del ROADMAP:** 3
> **Fuente de verdad del diseño:** este PRP + `businessos/ROADMAP.md` (sección FASE 3)

---

## Objetivo

El grafo crece (multi-dimensión, multi-país, cron de vigencias) y sobre él se montan
las dos capas que dependen de él: **cobrar** (Polar como Merchant of Record) y
**contratar** (contratos-documento validados por el grafo antes de cerrar).

## Por Qué

| Problema | Solución |
|----------|----------|
| El grafo solo sabe MX+fiscal; un negocio LATAM necesita más dimensiones/países | Seed v2: dimensión contable (MX) + jurisdicción CO (fiscal) + dimensión contractual (MX), todo citado |
| Un grafo desactualizado miente con certeza | Endpoint de salud del conocimiento + host-job cron `revisar-vigencias.py` |
| No hay forma de cobrar a clientes (fiat, multi-mercado) | Polar MoR vía host-job (los agentes no tienen secretos): request en volumen → checkout link |
| Los acuerdos comerciales se cierran sin validación regulatoria | Tabla `contratos` + host-job que pasa cláusulas por el grafo; aprobación humana obligatoria |

## Qué (Criterios de Éxito)

- [ ] Grafo responde evaluaciones en dimensión `contable` (MX) y jurisdicción `CO` (fiscal) con fuente citada; el gate de procedencia sigue verde.
- [ ] La clasificación NO cruza dominios: solo considera categorías referenciadas por reglas vivas del ámbito (jurisdicción+dimensión) consultado.
- [ ] `GET /salud-conocimiento`: reglas vencidas, montos con `verificar:true` pendientes, edad del seed. Host-job `revisar-vigencias.py` lo consume → snapshot al volumen de negocio + exit code para cron.
- [ ] Cobro: agente deja request en `cobros_pending/` → host-job `polar-cobros.py` crea checkout link en Polar → link al volumen + fila en `cobros` (Supabase). `--dry-run` sin tocar Polar.
- [ ] Contratos: agente deja contrato (cláusulas) en `contratos_pending/` → host-job `validar-contratos.py` evalúa vía grafo (dimensión contractual, jurisdicción del cliente) → veredicto+banderas al volumen y a `contratos` (Supabase). Cerrar contrato = SOLO humano.
- [ ] AGENTS.md (clientes y negocio) reflejan los flujos reales; SQL de tablas nuevas en `supabase-fase3.sql`.
- [ ] Tests pytest verdes (multi-dimensión, multi-país, no-cruce de dominios, salud-conocimiento).

## Contexto / Decisiones

- **Regímenes**: los impactos con `regimen: GENERAL` aplican a cualquier régimen del contexto
  (wildcard). CO y contractual usan GENERAL; fiscal MX sigue en PM_TITULO_II.
- **Clasificación por ámbito**: `evaluar()` filtra el catálogo de categorías a las que tienen
  al menos un impacto en reglas del ámbito consultado (sin columna nueva; la relación
  categoría↔dimensión ya vive en `impactos`). El gate mantiene keywords globalmente sin ambigüedad.
- **Honestidad regulatoria**: seeds nuevos con citas reales (Estatuto Tributario CO, CFF/NIF MX,
  CCF/CCo MX), veredictos conservadores (dudoso-céntricos) y `verificar:true` en todo monto.
  El grafo señala y cita; no asesora. Cotejo contra fuente oficial antes de producción.
- **Polar**: API v1 (`https://api.polar.sh/v1`), token de organización en `.env` del host
  (`POLAR_ACCESS_TOKEN`). Verificar payouts a México ANTES de activar cobro real (Stripe
  Connect Express). El costo Starter 5%+50¢ se documenta en el job.
- **Patrón host-job SIEMPRE** para Polar y Supabase (Hermes scrubbea secretos, CLAUDE.md
  2026-06-30). El agente pide/lee por archivos del volumen; el grafo sí es consultable directo
  (HTTP sin credenciales).

## Blueprint (fases del bucle agéntico)

| Fase | Objetivo | Validación |
|------|----------|------------|
| A | Seed v2 (contable MX, fiscal CO, contractual MX) + regimen GENERAL + clasificación por ámbito | gate --check + pytest |
| B | `GET /salud-conocimiento` + host-job `revisar-vigencias.py` | pytest + smoke local |
| C | Polar: `supabase-fase3.sql` (cobros) + host-job `polar-cobros.py` | --dry-run local + research payouts MX |
| D | Contratos: tabla `contratos` + host-job `validar-contratos.py` + template | --dry-run contra grafo local |
| E | AGENTS.md ×2 + docs vivas + salida de fase | evaluación real contable/CO/contractual |

## Gotchas conocidos
- Daemon Docker apagado en esta WSL2 → validación runtime local vía uvicorn+stub (como Fase 2);
  compose real = residual Droplet.
- venv python3.14 sin ensurepip → get-pip.py (PRP-002).
- Reseed del grafo = volumen virgen (o aplicar 02-seed.sql por psql; upserts idempotentes).
- Cuenta Polar + token real no existen aún → cobro REAL es residual; el job se valida con --dry-run.

## Anti-Patrones
- ❌ Citar leyes extranjeras sin marcar `verificar:true` y sin veredicto conservador.
- ❌ El agente tocando Polar/Supabase directo (secret-scrubbing).
- ❌ Cerrar (firmar) un contrato sin humano.
- ❌ Marcar validación como pasada sin ejecutarla.

## Aprendizajes (Self-Annealing)

### 2026-07-02: puertos de smoke con procesos zombis
- **Error**: un uvicorn de un smoke anterior seguía amarrado al puerto 3999; el smoke nuevo
  "arrancaba" pero curl pegaba al proceso viejo → 404 en el endpoint recién agregado con
  /health respondiendo (server desactualizado, no bug de código).
- **Fix**: ante 404 inexplicable con salud viva, `ss -tlnp | grep <puerto>` y matar el PID viejo.
- **Aplicar en**: todo smoke con servidores de fondo en esta máquina.

### 2026-07-02: bandeja local para probar host-jobs sin Docker
- **Aprendizaje**: los jobs de bandeja (cobros/contratos) aceptan `COBROS_DIR`/`CONTRATOS_DIR`
  para leer de un directorio local en vez de `docker exec` — permite validar el flujo completo
  (validación + grafo + dictamen) en máquinas sin daemon Docker. Costo: ~10 líneas por job.
- **Aplicar en**: futuros host-jobs de bandeja (patrón a repetir).

### 2026-07-02: verificación Polar hecha ANTES de escribir código
- **Aprendizaje**: payouts a México confirmados en docs oficiales de Polar (Stripe Connect
  Express; Colombia también en la lista) y el shape real del API confirmado (POST /v1/checkouts/
  con products[] y amount en CENTAVOS que solo se honra en productos de precio custom; estados
  open/confirmed/succeeded/expired/failed). Evitó construir sobre supuestos.
- **Aplicar en**: cualquier integración externa — verificar docs vivas antes de codificar.

### 2026-07-02: dimensión contractual sin "deducible"
- **Decisión**: el enum de estado del grafo es fijo (deducible/no_deducible/dudoso); para
  cláusulas solo se usan dudoso/null → todo dictamen contractual sale "dudoso + checklist +
  fuentes", que es exactamente el producto (el grafo señala, el humano decide). Testeado como
  invariante (test_contractual_nunca_afirma_deducible).
