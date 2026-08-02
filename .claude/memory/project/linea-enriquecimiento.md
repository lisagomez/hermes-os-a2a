# Línea Enriquecimiento (App A — Waterfall Enrichment)

> **Estado (2026-08-02): A1 y A2 fusionados; A3 abierto en el PR #210** (CI verde, gate de
> imagen cerrado, bloqueado solo por revisión). Primera de las 3 apps del encargo; plan
> aprobado con **ataque adversarial** el 2026-07-30.

## Qué es

Enriquecimiento de leads en **cascada ordenada por costo y sin LLM** (cero tokens por lead),
con el grafo como gate de entrada: si la prospección no es lícita, no se toca un solo dato.

```
gate LFPDPPP (grafo) → rfc_offline → DENUE (INEGI) → gate 69-B CFF → patrón de correo por dominio
```

## Los tres PRs

| PR | Qué entra | Estado |
|---|---|---|
| **A1 · #198** | Dimensión `datos-personales` en el grafo: 4 categorías + 4 reglas MX para prospección B2B, **sin tocar el evaluador** (reusa `permitido\|dudoso\|no_permitido`). Corrige además la LFPDPPP derogada: la ley 2010 fue abrogada (Decreto DOF 20-03-2025, vigente 21-03-2025; autoridad hoy la Secretaría Anticorrupción y Buen Gobierno, INAI extinto). | fusionado |
| **A2 · #199** | `businessos/supabase-enriquecimiento.sql` — 5 tablas + 2 vistas, con el **gate 69-B como invariante en la tabla**, no como cortesía del código. `supabase-enriquecimiento.test.sql`: 27 pruebas de comportamiento en Postgres efímero. | fusionado · **SQL sin aplicar a producción** |
| **A3 · #210** | Servicio `businessos/enriquecimiento-a2a/` + `vigilancia-69b.py` + RPC `dominio_patron_reforzar` + alta en compose, puerto **5000** (el 4900 lo tomó `buzon-a2a` en el #208). | abierto, en revisión |

## Gate de imagen de A3 — cerrado con evidencia (2026-08-02)

Sobre el tip exacto: **77/77 tests** (venv `businessos/.venv`), `docker build` OK,
`Up (healthy)`, `/health` 200, agent-card con la skill `enriquecer-lead`, **opacidad 7/7**
en 404, y JSON-RPC e2e donde el fail-closed opera de verdad: *"grafo inalcanzable
(ConnectTimeout): la cascada no corre sin gate"*. Evidencia en el comentario del PR.

Nota de infra: **el daemon de Docker SÍ responde en la máquina de desarrollo** — corrige el
supuesto viejo. Lo que esa máquina sigue sin tener es admin de GitHub, token de Supabase y
SSH al Hetzner.

## Pendientes tras fusionar (exigen credenciales que dev no tiene)

1. Aplicar a producción los DOS SQL (#199 y `supabase-enriquecimiento-refuerzo.sql`) por
   management API.
2. Desplegar en el servidor: perfil `a2a`, `DENUE_TOKEN` en el `.env`, primera corrida de
   `vigilancia-69b.py`.
