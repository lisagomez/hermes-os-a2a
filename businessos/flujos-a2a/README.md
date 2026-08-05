# flujos-a2a — proxy de lectura del grafo (App C, paso 2)

Compone vistas del grafo regulatorio (`businessos/grafo/`, `http://grafo:3000`)
para la capa visual de Mission Control (paso 3, `/grafo/explorador`). Puerto
**5100**, reservado en `RECOMENDACION-reuniones-headroom.md` §5.

> **Nota de nomenclatura**: el sufijo `-a2a` viene del nombre que fija el
> encargo en el ROADMAP; este servicio es **REST plano** y NO habla el
> protocolo A2A (sin Agent Card ni JSON-RPC). El puente A2A del grafo para
> agentes ya existe: `grafo-a2a`.

## Garantías

- **Solo LECTURA**: hacia el grafo salen únicamente GETs; el servicio no tiene
  rutas de escritura (hay un test que lo verifica sobre las rutas reales).
  "Jamás escribe reglas" es por construcción.
- **Nunca expuesto al navegador**: el compose lo publica solo en
  `127.0.0.1:5100`; lo consume Mission Control server-side dentro de
  `hermes-net`.
- **Fallo honesto**: grafo caído o con error → 503 con detalle, y cada fallo
  se loguea (nada de best-effort silencioso).
- **Perfil `a2a` del compose** (como `grafo-a2a`): no engorda el núcleo
  siempre-arriba; el paso 3 debe levantarlo con `--profile a2a`.

## Endpoints

| Ruta | Qué compone |
|---|---|
| `GET /health` | salud propia + estado del grafo (no se cae si el grafo cae) |
| `GET /arbol?fecha=` | árbol jurisdicción→dimensión→reglas (vigencia + fuente); 3 lecturas del grafo en paralelo con deadline único; `Cache-Control: no-store` |
| `GET /constructor?jurisdiccion=&dimension=&fecha=` | insumos del constructor de flujos: regímenes y categorías del ámbito (solo reglas vigentes, mismo criterio que `evaluador.evaluar`) + plantilla del body de `POST /evaluaciones` del grafo |
| `GET /catalogos` | `{jurisdicciones, dimensiones}` para los selectores |
| `GET /evaluaciones?limit=` | passthrough del historial, `salida` íntegra (disclaimer y fuentes intactos) |

## Config

| Var | Default | Qué es |
|---|---|---|
| `GRAFO_URL` | `http://grafo:3000` | base del grafo dentro de hermes-net |
| `FLUJOS_TIMEOUT_S` | `10` | deadline agregado por request de composición |

## Tests

```bash
cd businessos/flujos-a2a && ../.venv/bin/python -m pytest -q
```

Unit (MockTransport que **asserta las URLs exactas** — un mock que responde
200 a todo esconde bugs, gotcha 2026-08-02) + interop contra el app REAL de
`businessos/grafo/` vía `httpx.ASGITransport` con el seed real (swap de
`sys.modules` por los módulos homónimos `app`/`schemas`, patrón
`ejecutor-a2a/tests/test_interop.py`; sin postgres — `dependency_overrides`).
