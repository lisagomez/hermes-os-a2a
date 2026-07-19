# Análisis de integración — SaaSFactory_SoloprenurOS_V1

> **Fuente**: https://github.com/IAGGDEV/SaaSFactory_SoloprenurOS_V1 (main, ~77 KB, TS/Next+Supabase)
> **Fecha**: 2026-07-18
> **Objetivo**: qué de ese repo agrega valor a la filosofía de businessos, y cómo alinearlo
> respetando la estructura de runtime en Hetzner (verticales Hermes + trío/enjambre + grafo).
> **Regla que se respeta**: analizar y proponer; NO copiar a ciegas ni tocar el runtime. Todo
> cambio va por PR; los skills de vertical viven en el volumen, no se despliegan editando el repo.

---

## 1. Qué es el repo

"SolopreneurOS 2026": un **centro de comando Agent-First** para un fundador técnico en solitario.
Su núcleo son **6 skills** de Claude Code (`.claude/skills/`, "el enjambre") + un scaffold Next.js
+ Supabase + un README que declara un **vacío de infraestructura: rieles de pago A2A**.

| # | Nodo | Misión | Naturaleza |
|:-:|:--|:--|:--|
| 01 | `thumbnail-architect` | Thumbnails de alto CTR (SVG + prompt Midjourney) | content-creator |
| 02 | `algorithmic-editor` | Timeline de edición de video agresivo | content-creator |
| 03 | `viral-hook-engine` | Guiones con retención >75% | content-creator |
| 04 | `b2b-outbound-sniper` | Cold emails asimétricos desde LinkedIn | ventas/prospección |
| 05 | `ui-visual-mapper` | Dashboards data-first React/Tailwind | diseño/UI |
| 06 | `social-listening-radar` | Radar de tendencias tech (GitHub/foros) | inteligencia de mercado |
| ⚠ | `agent-payments` | (vacío) rieles de pago **A2A** máquina-a-máquina | concepto/arquitectura |

Los skills son **cortos** (3-5 líneas cada uno): definen misión + "output no negociable". Son
semilla de capacidad, no implementaciones profundas.

---

## 2. Alineación filosófica

La doctrina del repo es **la misma que la nuestra**, con otra estética (militar/operador):

| SolopreneurOS | businessos / SaaS Factory V4 |
|:--|:--|
| "El operador fija objetivo; el enjambre ejecuta" | "El humano dice QUÉ; tú decides CÓMO" (CLAUDE.md) |
| Nodos con misión única + ROE + output no negociable | Skills con trigger único + criterios; gates no negociables del trío |
| "Enjambre" de skills | Enjambre A2A **real**: coordinador → ejecutor → supervisor (Fase 7) |
| Vacío: rieles de pago A2A | Ya tenemos A2A (grafo-a2a, ventas-a2a) + Polar (MoR humano) |

**Conclusión filosófica**: el repo **valida** nuestra dirección, no la extiende. Nosotros ya
pasamos de "skills-como-enjambre" (prompts) a un **enjambre A2A ejecutable con juicio** (el trío
con gates reales, presupuesto, cola, veredicto). Su "enjambre" es la etapa que nosotros ya
industrializamos. No hay arquitectura que importar; sí hay **capacidades** y **una provocación**.

---

## 3. Evaluación skill-por-skill (valor para businessos)

| Nodo | ¿Aporta a businessos? | Veredicto | Por qué |
|:--|:--|:--|:--|
| `thumbnail-architect` | Bajo | **Omitir** | Ya tenemos `image-generation` + `video-visuals`; foco YouTube, no negocio |
| `algorithmic-editor` | Bajo | **Omitir** | Edición de video de creador; fuera del dominio businessos |
| `viral-hook-engine` | Bajo | **Omitir** | Copy de retención de video; solapa parcialmente con `website-3d` (copy AIDA/PAS) |
| `ui-visual-mapper` | Bajo-medio | **Omitir/absorber** | Ya cubierto por `dataviz` + `design-systems` + los frontends; su idea "data-first" ya vive ahí |
| `b2b-outbound-sniper` | **Medio-alto** | **Adaptar (opcional)** | GAP real: prospección saliente. Encaja en la vertical **negocio** (rol comercial/CRM) y/o `ventas-a2a` |
| `social-listening-radar` | **Medio** | **Adaptar (opcional)** | GAP real: inteligencia de tendencias. Capacidad nueva para la vertical **negocio** |
| `agent-payments` (A2A) | **Alto (concepto)** | **Capturar como dirección** | Ver §4. Es lo más alineado con nuestra apuesta A2A |

**Regla aplicada**: no importamos los 6. La mayoría es de content-creator y/o ya está cubierta.
El valor real son **dos semillas de capacidad** (outbound, social-listening) y **una provocación
arquitectónica** (pagos A2A).

---

## 4. Lo más valioso: la provocación de "rieles de pago A2A"

Su README de `agent-payments` afirma: *"los agentes pueden operar pero NO transaccionar; conectar
un enjambre a pasarelas humanas (Stripe/PayPal, con UI) causa fallos de token, bloqueos de fraude
y cuellos de autorización manual. La escala autónoma exige rieles de pago A2A (máquina-a-máquina),
sin GUI, con liquidación programática."*

**Por qué nos toca**: businessos es de los pocos proyectos que YA tiene un enjambre A2A ejecutable
(trío + coordinador + grafo-a2a + ventas-a2a). Hoy nuestro cobro es **Polar (MoR humano)** vía el
skill `add-payments` — perfecto para vender a humanos, pero es exactamente la "pasarela humana" que
su README señala como límite para transacciones **entre agentes**. La provocación es legítima y
está a la altura de nuestra arquitectura, no por debajo.

**Cómo se alinea (sin sobre-construir)**: NO se implementa aquí. Se **captura como dirección
estratégica** para evaluar en su momento (posible PRP-0xx "settlement A2A"), con estas anclas
propias que ya existen:
- El contrato A2A del trío (a2a-sdk v1, wire-format ya domado) es el lugar natural donde una
  sub-tarea podría **declarar y liquidar** costo entre servicios (hoy ya medimos `token_usage` por
  `task_id` y cortamos por presupuesto — es el 80% del andamiaje de "settlement" interno).
- `ventas-a2a` + Polar cubren el cobro **a humanos**; un carril A2A cubriría el intercambio de valor
  **entre agentes/servicios** (interno o con terceros). Son complementarios, no sustitutos.
- Fail-safe y procedencia (regla de oro del grafo) aplican igual: ningún movimiento de valor sin
  fuente/autorización auditable.

---

## 5. Recomendación de alineación (respeta la estructura de Hetzner)

**Estructura que se respeta** (doctrina):
- El **runtime vive en Hetzner** (verticales Hermes + trío + grafo en `docker-compose`, red
  `hermes-net`, volúmenes uid 10000). **Nada de esto se toca** por este análisis.
- Los **skills de la fábrica** viven en `.claude/skills/` (máquina de dev, donde corre Claude Code).
  Los **skills de una vertical** (p.ej. negocio) viven en **su volumen**; editarlos en el repo NO
  los despliega (hay que sincronizar al volumen + restart — doctrina 2026-07-12).
- Todo cambio entra por **PR** (yo reviso y mergeo; el runtime no se edita a mano).

**Qué hacer, en orden de valor / menor riesgo**:
1. **Ahora (este PR)**: dejar este análisis versionado. Cero impacto en runtime. ✅
2. **Si la dueña lo quiere** — dos capacidades para la vertical **negocio** (no para la fábrica):
   adaptar `b2b-outbound-sniper` y `social-listening-radar` a nuestras convenciones (es-CO, atadas
   a los datos reales del negocio, sin inventar fuentes). Se redactarían como skills de la vertical
   y se **sincronizarían al volumen** de negocio (no basta commitear). Requiere decisión explícita
   porque toca el runtime de un bot.
3. **Estratégico (cuando toque)**: un PRP para "settlement A2A" que parta de lo que YA existe
   (`token_usage.task_id` + presupuesto del trío + contrato A2A), NO de reimplementar pagos.

**Qué NO hacer**: importar los 6 skills al por mayor; copiar su scaffold Next (el nuestro es más
completo); ni tratar su "enjambre" de prompts como arquitectura a adoptar (ya lo superamos con el
trío A2A). Y jamás conectar pagos reales sin PRP + OK explícito.

---

## 6. Veredicto en una línea

El repo **confirma** nuestra filosofía y aporta **dos semillas de capacidad** (outbound,
social-listening, opcionales, para la vertical negocio) y **una provocación valiosa** (settlement
A2A) que encaja en nuestra arquitectura A2A existente. **No** hay arquitectura ni scaffold que
adoptar. El valor se captura con este doc + (si se aprueba) 2 skills de vertical sincronizados al
volumen y 1 PRP estratégico — todo sin tocar el runtime de Hetzner.
