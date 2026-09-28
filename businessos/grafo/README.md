# grafo — cerebro regulatorio multi-ámbito (Fase 2/3/8)

> ## ⛔ Las reglas se GENERAN del paquete de conocimiento fijado: aquí no se siembra
>
> Desde el 2026-09-28, `seed/reglas.json` y su `seed/02-seed.sql` se **generan** del recorte del
> paquete de conocimiento (`@tu-scope/conocimiento`), la fuente única versionada que vive en el
> monorepo privado de la fábrica (PRP-005). Llega solo el **recorte** de los dominios que Hermes
> registra, fijado por `seed/paquete/PIN.json` (versión, dominios y huellas). Antes estuvieron
> congeladas en el corte `97d9f9e` (2026-09-27). Plan: `.claude/PRPs/prp-grafo-lee-paquete.md`.
>
> - **Una regla nueva**: se investiga y se siembra en la fuente única; aquí se **sube el pin**.
> - **Subir el pin**: lo prepara un agente, que mide qué respuestas cambian, y lo firma el
>   laboratorio (ver «Recibir reglas nuevas» abajo).
> - **Lo vigila** el job obligatorio `grafo-congelado` (conserva su nombre). Pone rojo si
>   `reglas.json` o `02-seed.sql` no son los generados del recorte, si el recorte no tiene la
>   huella del pin, o si el pin cambia sin una entrada firmada en `BITACORA-CDC.md`. También
>   `tests/test_congelado.py`, `tests/test_paquete.py` y `tests/test_gate_pin.py`.
> - **Lo que NO bloquea**: aplicar en runtime el seed generado (pendiente por la red del
>   servidor), y todo lo que no sea el conocimiento (motor, API, puente A2A).

Servicio Docker en `hermes-net` que evalúa conceptos contra reglas citadas y devuelve
veredicto por concepto **con fuente**, banderas rojas y checklist. **Señala riesgos; NO asesora.**
Ámbitos: **fiscal MX** (deducibilidad, PM Título II), **fiscal CO** (Estatuto Tributario),
**contable MX** (NIF/CFF), **contractual MX** (cláusulas: CCF/CCo), **datos-personales MX**
(LFPDPPP 2025, prospección B2B) y **regulatorio MX** (permisos/cumplimiento operativo —
veredicto `permitido`/`no_permitido`/`dudoso`; drones-delivery, intermediación de seguros,
corporativo-mercantil, fiduciario/inmobiliario, ambiental, cabildeo, propiedad industrial,
servicios legales, **comercio exterior** —Ley Aduanera y Ley de Comercio Exterior—, **logística**
—autotransporte federal de carga y carga aérea— y **T-MEC** —origen, certificación, verificación,
envíos de entrega rápida y resoluciones anticipadas—;
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
| `seed/reglas.json` | **GENERADO** del recorte del paquete fijado (`seed/desde_paquete.py`): **99 reglas / 102 impactos / 61 categorías** (LISR/CFF/SAT/NIF MX, ET CO, CCF/CCo, LFPDPPP 2010 cerrada y 2025, y regulatorio MX: LAC/NOM-107/LISF, LGSM/LFCE, LGTOC/LIE, LGEEPA/LGPGIR/LFRA, LMV, LFPPI, LRArt5/LFPIORPI, Ley Aduanera / Ley de Comercio Exterior, LCPAF / Ley de Aviación Civil y el T-MEC). No se edita a mano |
| `seed/paquete/` | `recorte.json` (los dominios de Hermes, vendorizado tal cual), `PIN.json` (versión, dominios y huellas) y `DIFERENCIAS.json` (lo que cambió la última subida del pin) |
| `seed/actualiza_paquete.py` | Sube el pin: comprueba la huella, pasa el gate de procedencia, mide diferencias y regenera. No firma |
| `seed/diferencias.py` | Qué respuestas cambian entre dos seeds (este motor sobre cada uno); los casos se derivan de los seeds |
| `seed/gen_seed_sql.py` | Valida el seed (gate de procedencia) y genera `02-seed.sql`. `--check` = solo validar |
| `PLANTILLA-INVESTIGACION-SEED.md` | Método investigación→seed: aterriza una investigación regulatoria a la Salida B sembrable (esquema real, gate, frontera Salida A vs B). Para dominios nuevos, p. ej. documentación de exportación logística |
| `seed/01-schema.sql`, `seed/02-seed.sql` | Corren vía initdb de postgres (orden alfabético) |
| `evaluador.py` | Motor puro (sin DB/LLM/red): clasificación por keywords, vigencia, regla rectora, topes |
| `schemas.py` / `app.py` | Contrato Pydantic + FastAPI. `app.openapi()` funciona SIN postgres (pool lazy) |
| `db.py` | Postgres lazy: conocimiento cacheado en memoria, evaluaciones persistidas best-effort |

## Recibir reglas nuevas (subir el pin)

> Aquí **no se edita** `seed/reglas.json`: se genera. Una regla o un dominio nuevo se investiga y
> se siembra en la fuente única (su gate caza conflictos de veredicto, contenciones y borrados).
> Aquí solo se sube el pin.

1. En la fuente única: `npm run recorta -- --dominios <los de seed/paquete/PIN.json> --salida <dir>`.
   Un dominio nuevo para Hermes se añade a esa lista, y es parte de lo que se firma.
2. Aquí: `python3 seed/actualiza_paquete.py <dir>`. Comprueba la huella y pasa el gate de
   procedencia antes de tocar nada. Mide con `seed/diferencias.py` qué respuestas cambian, lo deja
   en `seed/paquete/DIFERENCIAS.json`, y reescribe `reglas.json`, `02-seed.sql` y
   `CONGELADO.sha256`.
3. Entrada nueva en `.claude/gobernanza/BITACORA-CDC.md` que nombre el pin
   (`<nombre>@<versión>`), declare las diferencias y lleve la firma del laboratorio.
   `_pendiente de firma_` no basta: `grafo-congelado` la rechaza.
4. Reseed en runtime. initdb **solo corre con volumen virgen**:

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
