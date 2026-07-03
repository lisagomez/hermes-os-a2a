# grafo-a2a — el grafo como agente A2A independiente (Fase 5)

Puente **determinista** (sin LLM, cero tokens por consulta) que expone el cerebro
regulatorio como agente del protocolo [A2A](https://a2a-protocol.org)
(a2aproject / Linux Foundation): cualquier agente —propio, de un cliente, de un
socio— lo descubre por su Agent Card y lo consulta **sin conocer su interior**.

## Superficie (toda la que existe)

| Ruta | Qué es |
|------|--------|
| `GET /.well-known/agent-card.json` | Agent Card: la capacidad anunciada (`evaluar-impacto-regulatorio`) |
| `POST /` | JSON-RPC A2A (`message/send`) |
| `GET /health` | Liveness del puente (no reporta nada del grafo) |

Opacidad por diseño: `/salud-conocimiento`, el listado de evaluaciones, las
reglas y el seed del grafo son **inalcanzables** desde aquí (testeado en
`tests/test_opacidad.py`). No hay `/docs` ni `/openapi.json`: la única promesa
pública es la card.

## Flujo

```
agente tercero ──card──▶ grafo-a2a ──POST /evaluaciones──▶ grafo ──▶ postgres
                 ◀── artifact: EvaluacionResponse ÍNTEGRA ──┘
                     (veredicto + fuentes + checklist + disclaimer)
```

- Entrada: `DataPart` con `{contexto?, conceptos:[...]}` o texto libre (un
  concepto por línea, contexto default MX/fiscal).
- Regla de oro a través del protocolo: la respuesta viaja **íntegra**; sin
  disclaimer/fuentes NO se entrega (tarea `failed`). Grafo caído o entrada
  inválida → `failed` con razón clara, nunca un veredicto inventado.
- Las verticales Hermes siguen usando el REST directo (`http://grafo:3000`):
  A2A es la puerta formal para pares, complementa, no reemplaza.

## Correr local (dev)

```bash
python3 -m venv --without-pip .venv && .venv/bin/python get-pip.py  # gotcha py3.14
.venv/bin/pip install -r requirements.txt
GRAFO_URL=http://127.0.0.1:3000 .venv/bin/uvicorn app:app --port 4000
```

Tests (el interop usa la app real del grafo in-process; requiere
`pip install fastapi pytest`):

```bash
.venv/bin/python -m pytest tests/ -q
```

## Env

| Var | Default | Qué hace |
|-----|---------|----------|
| `GRAFO_URL` | `http://grafo:3000` | A dónde puentea el executor |
| `GRAFO_A2A_PUBLIC_URL` | `http://grafo-a2a:4000` | URL anunciada en la card (para que no mienta si algún día se publica detrás de auth) |

Sin secretos: no toca Supabase ni llaves; compatible con el secret-scrubbing de
Hermes.
