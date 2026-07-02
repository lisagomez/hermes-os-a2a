# grafo — cerebro regulatorio fiscal (Fase 2)

Servicio Docker en `hermes-net` que evalúa conceptos contra reglas citadas y devuelve
veredicto por concepto **con fuente**, banderas rojas y checklist. **Señala riesgos; NO asesora.**
Ámbitos (Fase 3): **fiscal MX** (deducibilidad, PM Título II), **fiscal CO** (Estatuto
Tributario), **contable MX** (NIF/CFF) y **contractual MX** (cláusulas: CCF/CCo/LFPDPPP).
Pasa `jurisdiccion`/`dimension`/`regimen` en el contexto; `GENERAL` en un impacto aplica
a cualquier régimen. La clasificación solo considera categorías del ámbito consultado.

Regla de oro: **cero afirmación fiscal sin fuente citada.** Lo no clasificable sale
`dudoso` con razón `sin regla aplicable` (fail-safe: el grafo nunca adivina).

## Consumo

- Verticales Hermes (dentro de la red): `http://grafo:3000` — sin secretos, solo lectura HTTP.
- Host-jobs en el Droplet: `http://127.0.0.1:3000` (puerto publicado solo en loopback).
- Contrato: `GET /openapi.json` (de aquí se imprime el CLI con Printing Press).
- Salud del seed: `GET /salud-conocimiento` (reglas vencidas + montos sin cotejo);
  la consume el cron `businessos/revisar-vigencias.py`.

```bash
curl -s http://127.0.0.1:3000/evaluaciones -X POST -H 'content-type: application/json' -d '{
  "contexto": {"fecha": "2026-07-01"},
  "conceptos": [{"descripcion": "Hospedaje en hotel, viaje a Monterrey", "importe": 2400}]
}'
```

## Anatomía

| Pieza | Qué es |
|-------|--------|
| `seed/reglas.json` | FUENTE DE VERDAD del conocimiento: 24 reglas / 27 impactos (LISR/CFF/SAT/NIF MX, ET CO, CCF/CCo/LFPDPPP) |
| `seed/gen_seed_sql.py` | Valida el seed (gate de procedencia) y genera `02-seed.sql`. `--check` = solo validar |
| `seed/01-schema.sql`, `seed/02-seed.sql` | Corren vía initdb de postgres (orden alfabético) |
| `evaluador.py` | Motor puro (sin DB/LLM/red): clasificación por keywords, vigencia, regla rectora, topes |
| `schemas.py` / `app.py` | Contrato Pydantic + FastAPI. `app.openapi()` funciona SIN postgres (pool lazy) |
| `db.py` | Postgres lazy: conocimiento cacheado en memoria, evaluaciones persistidas best-effort |

## Editar el conocimiento (reglas)

1. Editar `seed/reglas.json` (nunca `02-seed.sql`, es generado).
2. `python3 seed/gen_seed_sql.py` (corre el gate de procedencia y regenera el SQL).
3. Reseed — initdb **solo corre con volumen virgen**:

```bash
docker compose stop grafo grafo-db
docker compose rm -f grafo-db && docker volume rm businessos_grafo-db-data
docker compose up -d grafo-db grafo   # initdb re-ejecuta 01-schema + 02-seed
```

(Esto borra también `evaluaciones` históricas; son un log de auditoría, exportar antes
si importan. El upsert del seed es idempotente si prefieres aplicarlo con psql sin
recrear el volumen: `docker exec -i grafo-db psql -U grafo -d grafo < seed/02-seed.sql`.)

## Tests

```bash
cd businessos/grafo
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt pytest httpx
.venv/bin/python -m pytest tests/ -q
```

## Advertencia de datos

Los artículos citados son reales pero **cifras y topes deben cotejarse contra DOF**
antes de decisiones de producción (impactos con `parametros.verificar=true`). El cron
de revisión de vigencias es Fase 3. La decisión final es del contribuyente y su contador.
