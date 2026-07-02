# PRP-002: Grafo — Cerebro Regulatorio Fiscal (Fase 2)

> **Estado:** APROBADO (2026-07-01, aprobación del plan por Elisa en Claude Code)
> **Proyecto:** BusinessOS · **Fase del ROADMAP:** 2
> **Fuente de verdad del diseño:** este PRP + `businessos/ROADMAP.md:99-107`

---

## Objetivo

Un servicio `grafo` (Docker, red `hermes-net`, PostgreSQL propio) que evalúa deducibilidad
fiscal de conceptos de gasto para México + dimensión fiscal, devolviendo **veredicto por
concepto con fuente citada**, banderas rojas y checklist. Señala riesgos; NO asesora.

## Por Qué

| Problema | Solución |
|----------|----------|
| Decisiones fiscales a ciegas: saber qué es deducible exige consultar fuentes dispersas | Un cerebro regulatorio consultable en `http://grafo:3000` que cita LISR/CFF/SAT con vigencia |
| `facturas.deducibilidad_estado` lleva `pendiente` desde Fase 0 (nadie la determina) | El grafo la determina; un host-job escribe el veredicto (los agentes no tienen secretos) |
| El repo viejo (`lisagomez/grafo`, Neo4j) quedó al ~30% y sin API | Rediseño acotado: PostgreSQL relacional, FastAPI, seed nuevo con 11 reglas citadas |

**Valor:** cero afirmación fiscal sin fuente citada (métrica ancla del producto).

## Qué

### Criterios de Éxito
- [ ] `POST /evaluaciones` devuelve, por concepto: `estado ∈ {deducible,no_deducible,dudoso}` + `razon` que nombra la fuente + `fuente {clave,cita,url,vigencia}`.
- [ ] Respuesta incluye `banderas_rojas`, `checklist`, `fuentes` deduplicadas y `disclaimer` SIEMPRE.
- [ ] Conceptos no clasificables → `dudoso` "sin regla aplicable" (fail-safe, nunca afirma).
- [ ] Filtro de vigencia real (regla 28-XXXII vigente desde 2020 no aplica a fecha 2019).
- [ ] `GET /openapi.json` válido → CLI impreso con Printing Press (grado ≥ A).
- [ ] Una evaluación real end-to-end = salida de Fase 2 (banderas + checklist + fuentes).
- [ ] Host-job `evaluar-facturas.py`: facturas `pendiente` → veredicto en Supabase.

### Comportamiento (Happy Path)
1. Llega factura a clientes → `ingest-facturas.py` la sube con deducibilidad `pendiente`.
2. `evaluar-facturas.py` (host) las lee, llama a `grafo:3000/evaluaciones`, escribe veredicto.
3. Las verticales consultan `http://grafo:3000` (o el CLI impreso) para responder preguntas,
   siempre con fuente + disclaimer; lo dudoso se escala a Elisa.

## Contexto

- **Modelo:** proyecto → jurisdicción → dimensión → regla → impacto. "Proyecto" = contexto
  de la request (jurisdiccion/dimension/regimen/fecha), persistido en `evaluaciones.contexto`
  (KISS; tabla `proyectos` cuando haya multi-proyecto, Fase 3+).
- **Stack:** FastAPI + psycopg + postgres:16-alpine (OpenAPI gratis; Python = idioma de host-jobs).
- **Clasificación:** determinista por keywords (keyword más larga, frontera de palabra; sin LLM).
- **Semántica portada del motor viejo** (`inferenceEngine.js`): vigencia a fecha de operación;
  regla rectora = veredicto con `vigente_desde` más reciente; contradicción → dudoso + bandera;
  `importe > tope_monto` → degradar a dudoso; requisitos de todos los impactos vigentes → checklist.
- **Agregación factura:** `len(set(estados))==1 → ese estado; si no → dudoso`.
- **Procedencia:** toda regla con `fuente_cita`, `fuente_url`, `source_version`, `vigente_desde`
  NOT NULL. Montos con `parametros.verificar=true` (cotejar DOF antes de producción; cron de
  vigencias es Fase 3).
- **Seed:** 11 reglas / 13 impactos (LISR 27-I/III/V/VII, 28-V/XIII/XXVII/XXXII, 34-VII,
  CFF 29-A, criterio SAT viáticos) cubriendo las 7 categorías V1 (VIATICOS,
  SERVICIOS_PROFESIONALES, EQUIPO_DE_COMPUTO, DONATIVOS, INTERESES, COMBUSTIBLES, ARRENDAMIENTO),
  régimen PM_TITULO_II. Detalle completo en el plan aprobado y en `seed/reglas_mx.json`.

## Blueprint (Assembly Line)

| Fase | Objetivo | Validación |
|------|----------|------------|
| A | Seed + esquema (`reglas_mx.json`, `01-schema.sql`, `gen_seed_sql.py`, `02-seed.sql`) | `gen_seed_sql.py --check` + gate de procedencia |
| B | Evaluador puro (`evaluador.py` + tests) | pytest verde (clasificación, vigencia, agregación, invariante fuente) |
| C | API (`schemas.py`, `app.py`, `test_api.py`) | pytest + smoke `app.openapi()` sin DB |
| D | Persistencia + empaquetado (`db.py`, Dockerfile, compose, .env.example) | YAML válido; con Docker: up + /health + POST real |
| E | Integración (`evaluar-facturas.py`, AGENTS.md ×2) | --dry-run contra Supabase con grafo arriba, o RESIDUAL |
| F | Salida de fase + CLI | Evaluación real con banderas+checklist+fuentes; CLI grado ≥ A |

## Gotchas conocidos
- Docker/Go/prensa NO instalados en esta máquina (entorno recreado) → toolchain es mejor
  esfuerzo; Nivel 2 puede quedar RESIDUAL (Droplet).
- initdb de postgres solo corre con volumen virgen → reseed = recrear volumen (documentar).
- `unique nulls not distinct` requiere PG≥15 (16 ✓).
- El agente Hermes no tiene secretos → el veredicto a Supabase lo escribe SOLO el host-job.
- Pool de DB lazy en app.py: el openapi.json debe generarse sin postgres (para imprimir el CLI).

## Anti-Patrones
- ❌ LLM dentro del grafo (adivina; el grafo cita).
- ❌ Veredicto sin fuente (salvo dudoso "sin regla aplicable").
- ❌ Marcar validación como pasada sin ejecutarla (anti-sello-de-goma).
- ❌ Dar asesoría: el grafo señala y cita; decide el humano/contador.

## Aprendizajes (Self-Annealing)

### 2026-07-02: venv de python3.14 en esta WSL2 nace sin pip
- **Error**: `python3 -m venv` crea el venv pero sin pip/ensurepip (`No module named ensurepip`);
  no hay pip ni uv/pipx a nivel sistema.
- **Fix**: bootstrap con `curl -sSfL https://bootstrap.pypa.io/get-pip.py | .venv/bin/python -`
  (aquí: descargado al scratchpad y ejecutado). Después `.venv/bin/python -m pip install ...`.
- **Aplicar en**: cualquier venv nuevo en esta máquina.

### 2026-07-02: impactos sin veredicto también se citan
- **Error**: `fuentes` de la respuesta solo citaba impactos con `veredicto_base`; los que solo
  aportan requisitos (ej. `MX-SAT-CRIT-VIATICOS`) alimentaban el checklist sin aparecer en fuentes
  → afirmación (requisito) sin fuente visible. Lo cazaron los tests de vigencia.
- **Fix**: `fuentes` = todos los impactos vivos aplicables (generales + de la categoría), tengan o
  no veredicto.
- **Aplicar en**: cualquier motor de este estilo — si algo aporta al output, su fuente se cita.

### 2026-07-02: `docker compose config -q` exige el .env de los env_file
- **Error**: validar el YAML en una máquina sin `.env` falla (`env file ... not found`) aunque el
  compose sea correcto (los `env_file: [.env]` de las verticales no son opcionales).
- **Fix**: validar con copia temporal (`cp .env.example .env && docker compose config -q && rm .env`);
  `.env` está gitignored, riesgo cero.
- **Aplicar en**: validación local del compose de BusinessOS.

### 2026-07-02: estado real de la validación de runtime
- Daemon Docker apagado en WSL2 (arrancarlo pide sudo interactivo) → `up + /health + POST` real
  quedó RESIDUAL (Droplet), igual que `evaluar-facturas.py --dry-run` contra Supabase (sin `.env`
  local). Se validó el equivalente local: uvicorn + stub de `db` (reglas reales) + mock de
  Supabase → dry-run verde con veredictos y fuentes correctos. Anti-sello-de-goma: esto NO marca
  la validación Docker como pasada; queda listada como residual en ROADMAP.
