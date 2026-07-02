# Fase 2 — Grafo (cerebro regulatorio fiscal)

**Estado (2026-07-02): núcleo COMPLETO en código; residuales de runtime en el Droplet.**
PRP: `.claude/PRPs/prp-fase2-grafo.md` (aprobado 2026-07-01). Rama `feat/fase2-grafo`.

## Qué se construyó (businessos/grafo/)

- **Seed citado**: `seed/reglas_mx.json` (11 reglas / 13 impactos / 7 categorías; LISR 27/28/34,
  CFF 29-A, criterio SAT viáticos; MX + fiscal + PM_TITULO_II). `gen_seed_sql.py --check` =
  gate de procedencia (fuente_cita/url/vigencia NOT NULL; montos exigen `verificar:true`;
  keywords sin ambigüedad entre categorías). `02-seed.sql` es GENERADO — editar solo el JSON.
- **Motor puro** `evaluador.py` (sin DB/LLM/red): clasificación determinista por keyword más
  larga con frontera de palabra y sin acentos; vigencia a fecha de operación; regla rectora =
  `vigente_desde` más reciente; contradicción → dudoso + bandera; importe > tope_monto degrada
  deducible → dudoso; checklist = requisitos de todos los impactos vivos (generales + de la
  categoría). Fail-safe: sin regla → `dudoso` "sin regla aplicable" (nunca afirma; el motor
  viejo decía NO_DEDUCIBLE y eso era afirmar sin fuente).
- **API FastAPI** `app.py` + `schemas.py`: `POST /evaluaciones`, `GET /health`, `GET /openapi.json`.
  `import db` es lazy DENTRO de las dependencias → el openapi se genera sin postgres (necesario
  para imprimir el CLI). 31 tests pytest verdes (21 motor + 8 API + 2 ensamblado db).
- **Empaquetado**: `Dockerfile` (python:3.12-slim, healthcheck stdlib), servicios `grafo` +
  `grafo-db` (postgres:16-alpine) en `docker-compose.yml`, red hermes-net, puerto SOLO
  127.0.0.1:3000 (host-jobs); seed vía initdb (solo volumen virgen; reseed documentado en
  `grafo/README.md`). `GRAFO_DB_PASSWORD` en `.env`.
- **Integración**: host-job `businessos/evaluar-facturas.py` (facturas `pendiente` → grafo →
  `deducibilidad_estado`+`deducibilidad_detalle`; aborta claro si grafo no responde; idempotente).
  AGENTS.md de clientes y negocio actualizados: el agente SÍ consulta `http://grafo:3000` por
  HTTP (sin secretos), el veredicto a Supabase lo escribe SOLO el host-job.
- **Salida de fase cumplida**: evaluación real end-to-end (uvicorn local + reglas reales) con
  veredicto por concepto + fuente citada + banderas + checklist + disclaimer.

## Residuales (Droplet / runtime)

- `docker compose up` real + `/health` + POST con postgres (daemon Docker apagado en WSL2;
  arrancarlo pide sudo interactivo).
- `evaluar-facturas.py --dry-run` contra Supabase productivo (sin `.env` local). Validado
  contra mock local + grafo real por uvicorn.
- CLI impreso con Printing Press grado ≥A (sin Go/prensa en esta máquina; instalador bloqueado
  en auto-mode). El manifiesto ya apunta a `http://grafo:3000/openapi.json` (source: own).
- Cotejo DOF de cifras/topes (impactos con `verificar:true`) y cron de vigencias → Fase 3.

## Gotchas nuevos

- WSL2 con python3.14 sin ensurepip/pip: bootstrap con get-pip.py dentro del venv.
- Impactos sin veredicto (solo requisitos, ej. criterio SAT) también deben citarse en `fuentes`:
  si aportan checklist, su fuente va en la respuesta.
