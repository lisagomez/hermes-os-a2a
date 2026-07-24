# Análisis y planeación — integración en Hermes-os-a2a

> **Proyecto:** Hermes-os-a2a · **Fecha del veredicto:** 2026-07-17 · **Integrado:** 2026-07-17
> **Método:** sesión real del Consejo (skill `consejo`: 5 asesores con lentes que chocan →
> peer-review anónimo A–E → síntesis del Chairman), corrida sobre el estado real del repo
> (Fases 0–10 del ROADMAP) y el análisis de la plataforma Spartane.ai.
> **Registro:** decisión archivada en `.claude/memory/decisiones/2026-07-17-integracion-analisis-planeacion.md`
> (primer uso del patrón que este mismo plan cablea). La **Etapa 1 quedó APLICADA** en el
> PR que integra este documento.

---

## Parte 1 — Veredicto del Consejo: ¿cómo integrar análisis y planeación, y cuánto adoptar de Spartane?

**La decisión sometida:** ¿Cómo unificar las 5 piezas de análisis/planeación hoy dispersas
(skill `consejo`, skill `prp`, `claude_planner` del Coordinador, grafo regulatorio,
entrevista `new-app`), y cuánto de la metodología de 7 fases de Spartane.ai adoptar?
Opciones: A) pipeline completo Consejo→PRP→Planner con tabla `decisiones` + vista Mission
Control; B) adoptar las 7 fases como capa de gobernanza; C) mínimo: Consejo como paso 0 del
PRP; D) nada: Spartane solo como benchmark.

### Dónde coincide el Consejo

Cuatro de cinco asesores convergieron de forma independiente en tres señales de alta confianza:

1. **Spartane no se copia; se lee.** Sus 209 documentos y 20 roles son el residuo de un
   modelo de consultoría enterprise cuyos clientes (AXA, GNP, FEMSA) compran certeza
   documental como entregable. Hermes-os-a2a vende lo contrario: operación agéntica 24/7
   barata. Adoptar su forma (opción B) es "importar la estructura de costos de otro negocio"
   y "comprar la enfermedad de tu cliente objetivo sin su presupuesto". El Forastero lo
   llamó desajuste de especie, no de escala.
2. **La dispersión de las 5 piezas no es el dolor — es sistema inmune.** Cada pieza resuelve
   un problema real y acotado sin necesitar a las otras. La única costura con costo
   plausible es **Consejo→PRP**: que una decisión estratégica se pierda cuando el Ejecutor
   empieza a picar código.
3. **El presupuesto manda.** El Consejo cuesta ~11 llamadas por decisión; con $30/mes
   alimentando 3 verticales 24/7, cablearlo *por sistema* en cada PRP es matemática que
   nadie había hecho — y que no cierra. El Consejo se queda como está: manual, en Claude
   Code, solo para decisiones caras/irreversibles.

### Dónde choca el Consejo

Choque genuino Expansionista vs. Contrarian/Primeros Principios, sin suavizar:

- **El Expansionista** ve en el pipeline A el producto comercial escondido: con la
  trazabilidad Decisión→Plan→Ejecución→KPI cableada, Mission Control deja de ser dashboard
  interno y se vuelve **la demo de venta del white-label** — "gobernanza agéntica como
  subproducto de operar", exactamente lo que Spartane cobra caro, a 1/1000 del costo. Y la
  tabla `decisiones`↔`tareas` es un activo de datos que a futuro permitiría al Coordinador
  proponer PRPs desde el patrón histórico.
- **Contrarian y Primeros Principios** responden: eso es ingeniería especulativa sobre
  demanda no validada — cero contratos firmados han pedido "ver mi DAG de decisiones", y
  ventas-a2a apenas abrió. Construir la vitrina antes de tener qué exhibir es resolver el
  problema de Spartane, no el de Hermes-os-a2a.
- **El Ejecutor** rompe el empate con un criterio operativo: A es la única opción "grande"
  con camino ejecutable, pero no el lunes; C se hace hoy en una sesión, cero SQL, y A se
  gana el derecho a existir cuando C se haya usado y duela.

### Puntos ciegos que cazó el Consejo (solo emergieron en el peer-review)

- **Nadie propuso medir antes de decidir.** Falta el paso intermedio obvio entre "no hacer
  nada" y "construir tabla+vista": **instrumentación barata** — un log append-only (JSONL)
  en cada traspaso Consejo→PRP→tarea, que preserva el dato sin pagar UI ni esquema, y
  resuelve con evidencia la incertidumbre que todos debatieron por intuición.
- **El prototipo de trazabilidad ya existe y está en producción: el grafo.** Su patrón
  (veredicto + fuente citada + persistencia en `evaluaciones`, fail-safe) es trazabilidad
  probada. No se diseña de cero: se generaliza ese patrón.
- **El recurso más escaso no son los tokens: es el tiempo de Elisa** (bus factor 1). Cada
  capa de proceso que se cablee, ella la mantiene para siempre. Ese costo no apareció en
  ninguna respuesta original.
- **Faltó un umbral de graduación objetivo** para pasar de C a A (el "3-4 usos" del
  Ejecutor era intuición, no medida).

### La recomendación

**Opción C ampliada con instrumentación, con graduación a A por evidencia — y de Spartane
se adopta el mapa, no la maquinaria.** En concreto: cablear hoy la costura Consejo→PRP
(cero infraestructura nueva), registrar cada traspaso en un log barato con un `decision_id`
que viaje hasta la fila padre del enjambre (el ledger `token_usage.task_id` ya cierra el
hilo hasta el gasto real), y construir la tabla `decisiones` + vista Mission Control **solo
cuando** existan 3 hilos completos decisión→PRP→tarea aprobada Y un prospecto real pida
verlos — en ese momento deja de ser especulación y se convierte en la demo de venta que
describe el Expansionista. De Spartane se adopta únicamente su metodología de 7 fases
**como checklist de descubrimiento** para proyectos white-label (mapa fase→pieza de
Hermes-os-a2a, Parte 2), nunca sus generadores de documentos ni sus 20 roles.

### Lo primero que hacer

Editar `.claude/PRPs/prp-base.md` agregando la sección opcional **"Decisión del Consejo"**
(`decision_id` + veredicto resumido + link al archivo de memoria), y que el Paso 6 del
skill `consejo` escriba cada veredicto a `.claude/memory/decisiones/<decision_id>.md`.
Una sesión, cero SQL, cero tokens de runtime. **→ HECHO (2026-07-17, este PR).**

---

## Parte 2 — El plan de integración

### 2.1 El flujo unificado (lo que queda cableado)

```
DECISIÓN (¿vale la pena? ¿cuál opción?)          ← Claude Code, manual, solo decisiones caras
   │  skill consejo → veredicto del Chairman
   │  Paso 6: veredicto → .claude/memory/decisiones/<decision_id>.md
   ▼
ANÁLISIS / BLUEPRINT (¿qué construir?)
   │  skill prp → PRP con sección "Decisión del Consejo" (decision_id)
   │  + consulta al grafo si la feature tiene arista fiscal/contractual/regulatoria
   ▼
PLANEACIÓN TÉCNICA (¿cómo y en qué orden?)
   │  Coordinador → claude_planner → DAG de sub-tareas (alcances disjuntos)
   │  decision_id viaja en el contexto de la tarea PADRE
   ▼
EJECUCIÓN CON GATES (¿se hizo bien?)
   │  Cola → Ejecutor (worktree) → Supervisor (gates deterministas, anti-sello-de-goma)
   │  gate humano en lo irreversible (matriz equipo-y-slack.md)
   ▼
RESULTADO MEDIDO
      token_usage.task_id (gasto real) + tareas (veredictos) + Mission Control
```

El hilo de trazabilidad estilo Spartane (requisito → funcionalidad → automatización →
resultado medido) queda: **decisión → PRP → DAG → gates → gasto/veredicto**, sostenido por
un solo dato que viaja: `decision_id`. Sin tabla nueva en la etapa 1 — el log JSONL y la
memoria git-versionada son la fuente.

### 2.2 Etapas y gates (nada corre solo; cada etapa se gana la siguiente)

**Etapa 1 — La costura (✅ APLICADA 2026-07-17, costo ~0):**
- `prp-base.md`: sección opcional "Decisión del Consejo" (decision_id, veredicto en 2
  líneas, link). ✅
- Skill `consejo` Paso 6: además de memory-manager, escribir
  `.claude/memory/decisiones/<decision_id>.md` con estructura fija (pregunta,
  coincidencias, choques, recomendación, primer paso). ✅
- Instrumentación: `businessos/trazas-decisiones.jsonl` (append-only) — un evento por
  traspaso: `{decision_id, evento: consejo|prp|tarea_padre, ref, fecha}`. Lo escribe quien
  hace el traspaso (Claude Code); el runtime no se toca. ✅ (primer evento: esta decisión)

**Etapa 2 — El hilo hasta el enjambre (cuando haya la primera feature post-Consejo):**
- El skill `trio-software` / la TAREA padre incluye `decision_id` en su `contexto` (el
  contrato ya admite contexto libre; cero cambio de esquema — `tareas.plan` y `contexto`
  son jsonb).
- Con `token_usage.task_id` (ya en producción, Fase 7) el hilo decisión→gasto queda
  completo sin construir nada.

**Etapa 3 — La vitrina (gated por evidencia, NO por calendario):**
- Gate doble: (a) ≥3 hilos completos decisión→PRP→tarea aprobada en el JSONL, y (b) un
  prospecto/cliente del white-label pide ver gobernanza.
- Entonces sí: PRP nuevo para tabla `decisiones` en Supabase (patrón de escritor único,
  RLS sin políticas, como todo el stack) + vista "Estrategia" en Mission Control (junto a
  AI Spend/Grafo/Pantheon), mostrando el hilo vivo Decisión→Plan→Ejecución→KPI. Ahí se
  materializa el upside del Expansionista: **la vista es la demo de venta**, la respuesta
  de Hermes-os-a2a a la "trazabilidad de un solo hilo" de Spartane, como subproducto de
  operar y no como consultoría.

**Invariantes que NO cambian:** el Consejo corre solo en Claude Code, convocado por
humano, solo para decisiones caras/irreversibles; asesora, no aprueba (matriz de
`equipo-y-slack.md`); presupuesto $30/mes intacto (toda la etapa 1-2 es cero tokens de
runtime); un escritor por fila; gate humano en lo irreversible.

### 2.3 Mapa de alineación: 7 fases de Spartane ↔ piezas de Hermes-os-a2a

Uso: **checklist de descubrimiento** al arrancar un proyecto/cliente white-label ("¿qué
fase pide este cliente y con qué pieza la cubro?"), no proceso obligatorio.

| Fase Spartane | Pieza de Hermes-os-a2a que la cubre | Estado |
|---|---|---|
| 1. Estrategia | Skill `consejo` (Depto. Estrategia: 5 asesores + peer-review + Chairman) | ✅ Vivo |
| 2. Stakeholders | Entrevista `new-app` → BUSINESS_LOGIC.md + pipeline `leads` (ventas-a2a, Fase 9) | ✅ Vivo |
| 3. Análisis | Skill `prp` (blueprint) + `claude_planner` (DAG técnico) | ✅ Vivo — se les cablea el `decision_id` |
| 4. Compliance | **Grafo regulatorio** (fiscal/contable/contractual/regulatorio MX+CO, fuente citada, fail-safe, vía A2A) | ✅ Vivo — ventaja diferencial: Spartane declara compliance "ejecutable"; Hermes-os-a2a lo tiene con fuente primaria citada y disclaimer siempre |
| 5. Sistema | Trío Ejecutor/Supervisor (Fase 6) + enjambre (Fase 7) + cola (Fase 10) | ✅ Vivo |
| 6. Calidad | Gates deterministas del Supervisor + Playwright + anti-sello-de-goma | ✅ Vivo |
| 7. Implementación | Deploy Hetzner/compose + Mission Control + ledger `token_usage` (resultado medido) | ✅ Vivo |

**Compuerta de Procesos (alta 2026-07-23):** dentro de este mismo descubrimiento,
Hermes-Negocio aplica las preguntas de
`negocio/skills/procesos/references/descubrimiento.md` y juzga: si el proyecto
**rediseña un proceso que ya opera** (no greenfield), activa el **departamento de
Procesos** (`departamentos/procesos.md`) ANTES de encolar construcción a Software —
el diagnóstico 5S+ESOA y su build-spec aprobada por humano son quienes disparan
SDD/Skills/CLIs. Si es greenfield, se omite y va directo a Software (fila 3→5).

Lectura del mapa: **Hermes-os-a2a ya tiene las 7 fases en producción** — lo que Spartane
empaqueta como metodología, Hermes-os-a2a lo tiene como runtime. Lo que faltaba era el hilo
que las une (el `decision_id`) y el lenguaje comercial para contarlo. Ese es el pitch del
white-label frente al enfoque Spartane: *ellos generan el sistema y sus 209 documentos;
Hermes-os-a2a ES el sistema operando, con gobernanza auditable como subproducto, a una
fracción del costo.*

### 2.4 Qué NO hacer (acordado por el Consejo)

- No adoptar las 7 fases como proceso obligatorio ni generar documentos por fase (opción
  B: sin primer paso verificable, estructura de costos ajena).
- No cablear el Consejo como paso automático de cada PRP (rompe el filtro maestro del
  skill y el presupuesto).
- No construir tabla/vista antes del gate de evidencia de la Etapa 3.
- No exponer nada nuevo a internet por esto (la superficie pública sigue siendo solo
  ventas-a2a tras el edge).

### 2.5 Registro

✅ Hecho (2026-07-17): la decisión + veredicto están en
`.claude/memory/decisiones/2026-07-17-integracion-analisis-planeacion.md` (estructura fija
del Paso 6), el primer evento quedó en `businessos/trazas-decisiones.jsonl`, y la nota de
proyecto vive en `.claude/memory/project/integracion-analisis-planeacion.md`. Este
documento es el artefacto fuente.
