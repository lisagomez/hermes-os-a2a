# grafo — cerebro regulatorio multi-ámbito (Fase 2/3/8)

Servicio Docker en `hermes-net` que evalúa conceptos contra reglas citadas y devuelve
veredicto por concepto **con fuente**, banderas rojas y checklist. **Señala riesgos; NO asesora.**
Ámbitos: **fiscal MX** (deducibilidad, PM Título II), **fiscal CO** (Estatuto Tributario),
**contable MX** (NIF/CFF), **contractual MX** (cláusulas: CCF/CCo), **datos-personales MX**
(LFPDPPP 2025, prospección B2B) y **regulatorio MX** (permisos/cumplimiento operativo —
veredicto `permitido`/`no_permitido`/`dudoso`; drones-delivery, intermediación de seguros,
corporativo-mercantil, fiduciario/inmobiliario, ambiental, cabildeo, propiedad industrial,
servicios legales, **comercio exterior** —Ley Aduanera y Ley de Comercio Exterior— y **logística** —autotransporte federal de carga y carga aérea—;
Fase 8). Pasa `jurisdiccion`/`dimension`/`regimen`
en el contexto; `GENERAL` en un impacto aplica a cualquier régimen. La clasificación solo
considera categorías del ámbito consultado.

Regla de oro: **cero afirmación fiscal sin fuente citada.** Lo no clasificable sale
`dudoso` con razón `sin regla aplicable` (fail-safe: el grafo nunca adivina).

## Consumo

- Verticales Hermes (dentro de la red): `http://grafo:3000` — sin secretos, solo lectura HTTP.
- Host-jobs en el servidor: `http://127.0.0.1:3000` (puerto publicado solo en loopback).
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
| `seed/reglas.json` | FUENTE DE VERDAD del conocimiento: **83 reglas / 86 impactos / 55 categorías** (LISR/CFF/SAT/NIF MX, ET CO, CCF/CCo, LFPDPPP 2025, y regulatorio MX: LAC/NOM-107/LISF, LGSM/LFCE, LGTOC/LIE, LGEEPA/LGPGIR/LFRA, LMV, LFPPI, LRArt5/LFPIORPI **Ley Aduanera / Ley de Comercio Exterior**, y **LCPAF / Ley de Aviación Civil** para logística) |
| `seed/gen_seed_sql.py` | Valida el seed (gate de procedencia) y genera `02-seed.sql`. `--check` = solo validar |
| `PLANTILLA-INVESTIGACION-SEED.md` | Método investigación→seed: aterriza una investigación regulatoria a la Salida B sembrable (esquema real, gate, frontera Salida A vs B). Para dominios nuevos, p. ej. documentación de exportación logística |
| `seed/01-schema.sql`, `seed/02-seed.sql` | Corren vía initdb de postgres (orden alfabético) |
| `evaluador.py` | Motor puro (sin DB/LLM/red): clasificación por keywords, vigencia, regla rectora, topes |
| `schemas.py` / `app.py` | Contrato Pydantic + FastAPI. `app.openapi()` funciona SIN postgres (pool lazy) |
| `db.py` | Postgres lazy: conocimiento cacheado en memoria, evaluaciones persistidas best-effort |

## Editar el conocimiento (reglas)

> Para un **dominio regulatorio nuevo** (p. ej. documentación de exportación logística),
> parte de [`PLANTILLA-INVESTIGACION-SEED.md`](PLANTILLA-INVESTIGACION-SEED.md): estructura
> la investigación en la Salida B sembrable (esquema real + gate) antes de tocar `reglas.json`.

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
