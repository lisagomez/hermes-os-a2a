# Mantener la documentación viva tras cambios importantes

Feedback del usuario (Elisa) el 2026-06-28; ampliado por ella el 2026-07-28:
**README.md y ROADMAP van SIEMPRE en la pasada de docs**, no solo cuando "toque".

## Qué pidió
Cada vez que hacemos un **cambio importante**, actualizar (sin que ella lo pida) los
lugares donde vive el estado del proyecto:

| Qué actualizar | Dónde |
|----------------|-------|
| **Aprendizajes / Auto-Blindaje** | `CLAUDE.md` §"Aprendizajes" (errores y su fix permanente) |
| **Roadmap** | `businessos/ROADMAP.md` + "Próximos Pasos" de `BUSINESS_LOGIC.md` — **SIEMPRE en la pasada** |
| **README** | `README.md` de la raíz (§"Estado actual" y arquitectura) — **SIEMPRE en la pasada** (pedido 2026-07-28; llevaba una semana congelado y nadie lo notó) |
| **Memoria** | `.claude/memory/` (project/feedback/reference + índice `MEMORY.md`) |
| **Business logic** | `BUSINESS_LOGIC.md` (problema, solución, datos, KPIs, arquitectura) |

## Qué cuenta como "cambio importante"
- Una vertical pasa a viva / se mueve al Droplet / cambia de bot o modelo.
- Cambios de esquema en Supabase (tablas, RLS, políticas).
- Decisiones de infra/arquitectura o de seguridad (p.ej. dónde vive un secreto).
- Cierre o avance de una Fase del roadmap, o un KPI alcanzado.
- Un error resuelto cuyo fix debe quedar blindado para no repetirse.
NO para cambios triviales (typos, ajustes de formato, exploración sin efecto).

## Cómo aplicarlo
- Al terminar un cambio importante, antes de cerrar el turno: revisar los 4 lugares y
  actualizar los que correspondan, convirtiendo fechas relativas a absolutas.
- Mantener `MEMORY.md` como índice (1 línea por memoria, <200 líneas); el detalle va en
  el archivo, no en el índice.
- Si un fix aplica a múltiples features, va en el skill/CLAUDE.md, no solo en el caso aislado
  (principio "arreglar lo compartido"). Ver [[respetar-logica-del-proyecto]].
- Mencionar brevemente al usuario qué docs se actualizaron, no hacerlo en silencio total.
