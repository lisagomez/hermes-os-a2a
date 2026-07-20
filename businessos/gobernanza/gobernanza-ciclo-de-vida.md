# Gobernanza del Ciclo de Vida de IA — traducción arquitectónica de ISO/IEC 42001
## (complemento de `adenda-iso42001.md`; cierra el gap de A.6 — ciclo de vida)

> **Estado**: ADOPTADA el 2026-07-19 (fundación del departamento de Contratos Inteligentes)
> **Fecha**: 2026-07-19
> **Tesis**: la lámina del estándar asume que entrenas modelos. Hermes OS no entrena:
> OPERA agentes sobre modelos de fundación. El ciclo de vida no desaparece — se
> desplaza. La etapa "Training & Fine-Tuning" se traduce a "cambios de comportamiento
> del sistema": modelo, SOUL, prompt, plantilla. Y ahí está el hueco más serio de la
> gobernanza actual (ver §3).

---

## 1. Las 7 etapas traducidas a la realidad de Hermes

| Etapa (42001) | Control | En Hermes significa | Estado |
|---|---|---|---|
| **Data Ingestion** | Lineage | Procedencia de todo insumo: mensajes que originaron la spec, evidencias con hash, contexto que entró a cada agente | 🟡 Parcial — hashes de evidencia sí; cadena completa requerimiento→spec no formalizada (§2) |
| **Data Preparation** | Quality Gate | La spec YAML validada por `contrato_sc.py` — un quality gate determinista ANTES de gastar tokens | ✅ Existe (Fase 1 ya construida y probada) |
| **Training & Fine-Tuning** → **Cambios de comportamiento** | Approval | Cambio de modelo, SOUL, prompt de sistema o plantilla del Engine = cambio del sistema de IA → requiere aprobación y re-evaluación | ❌ **El hueco** — hoy sin gate (§3) |
| **Evaluation** | Validation | Gates del Supervisor + red efímera para ARTEFACTOS; falta el equivalente para AGENTES | 🟡 Parcial — artefactos sí, agentes no (§4) |
| **Deployment** | Oversight | Doble candado: cola humana + lifecycle Fabric a dos firmas (Operadora+Testigo) | ✅ Existe — fortaleza diferencial |
| **Inference** → **Operación** | Monitoring | Presupuesto de tokens, rate-limits (G3), frecuencia del oráculo, banderas de specs | 🟡 Parcial — presupuesto sí; anomalías y kill-switch pendientes del threat model |
| **Improvement** | Audit Log | Self-Annealing + `sc_incidentes` + actas + revisión trimestral (AIMS-lite) | ✅ Existe (formalizar el rito trimestral) |

Lectura: las etapas donde Hermes es fuerte (Deployment, Improvement, Data Preparation)
son las que la industria suele tener débiles; las dos débiles de Hermes (cambios de
comportamiento, evals de agentes) son invisibles justamente porque no rompen nada el
día que se descuidan — rompen semanas después, sin ruido.

## 2. Lineage: la cadena de procedencia completa

Regla: **todo artefacto con consecuencias debe poder responder "¿de dónde vienes?"
hasta el origen**, con identificadores, no con memoria.

Cadena canónica (cada eslabón ya tiene ID; falta ENLAZARLOS explícitamente):

```
mensajes del cliente (ids de chat) → sc_spec (hash de la spec confirmada)
  → task_id (fabricación) → hash del paquete de chaincode → tx del commit
  → deposito_id (instancia) → evidencias (hashes) → transiciones (tx ids)
  → incidentes/acta
```

Implementación mínima: columna `origen` (JSONB) en `contratos_sc` y `sc_instancias`
que guarda los IDs del eslabón anterior. Costo: trivial. Beneficio: ante disputa o
auditoría, la historia completa se reconstruye con un join, no con arqueología.
(Actualiza PRP-013 Fase 5 y PRP-014 Fase 5.)

## 3. El hueco: gobernanza de cambios de comportamiento (el "fine-tuning" de un operador)

**Problema**: cambiar `modelo_pref`, editar un SOUL, ajustar el prompt del Planner o
retocar una plantilla del Engine altera el comportamiento de TODO lo que el sistema
produce — y hoy nada de eso pasa por un gate. El chaincode (menos alcance) tiene 7
candados; el prompt del Planner (todo el alcance) tiene cero.

**Control nuevo — "Cambio de Comportamiento" (CDC)**, proporcional al radio:

| Cambio | Radio | Gate requerido |
|---|---|---|
| Versión de modelo (`claude-X` → `claude-Y`) | Todo el sistema | CDC completo: PRP corto + suite de regresión (§4) verde + aprobación humana + pineo explícito de la versión (misma disciplina que imágenes Docker `v2026.6.19`) |
| SOUL / prompt de sistema de un servicio | Ese servicio y sus salidas | CDC estándar: diff del prompt en la cola como cualquier artefacto + regresión del servicio + aprobación |
| Plantilla del catálogo (Engine) | Todo contrato futuro de esa plantilla | Ya cubierto: re-auditoría firmada (PRP-013) — el CDC lo referencia, no lo duplica |
| Parámetros menores (temperatura, límites) | Acotado | Registro en bitácora + revisión trimestral |

Regla de oro del CDC: **los prompts y SOULs viven en git y se despliegan como código**
(ya es el caso en el repo) — el CDC añade que se REVISAN como código: nadie edita un
SOUL en caliente, ni siquiera la dueña, sin que quede diff, regresión y aprobación.
El modelo en producción SIEMPRE está pineado; "latest" es anti-patrón también aquí.

## 4. Evals de agentes: el Supervisor de los que no escriben código

**Problema**: el Supervisor re-verifica artefactos, pero nadie verifica sistemáticamente
a los AGENTES — ¿la vertical clientes sigue produciendo specs fieles tras el cambio de
modelo? ¿el Planner sigue descomponiendo bien?

**Control nuevo — Suite de Regresión de Agentes** (golden set, se corre en cada CDC):

- **Vertical clientes**: 10-15 conversaciones de requerimientos grabadas (reales
  anonimizadas + sintéticas) → la spec producida se compara contra la spec esperada
  (match estructural, no textual: mismos roles, transiciones, plazos). Incluye las
  **specs-trampa del modelo de amenazas (O1/G1)**: las conversaciones con cláusulas
  leoninas DEBEN producir bandera/escalada, no spec limpia — el threat model se vuelve
  test ejecutable.
- **Planner**: 5-8 tareas padre conocidas → el DAG producido se valida contra forma
  esperada (nº de fases, dependencias, gates incluidos).
- **PM/oráculo**: escenarios de agenda (hito vencido, evidencia incompleta) → las
  acciones propuestas ∈ catálogo y en el orden declarado.

Implementación: mismo patrón MockEngine/conftest ya usado en el trío — los golden sets
viven en el repo, la suite corre en CI y en cada CDC. Verde = promovible; rojo = el
cambio de modelo/prompt NO se promueve, sin excepciones ni "se ve bien".

## 5. Integración con la planeación

- **`adenda-iso42001.md` §2**: la fila "Ciclo de vida (A.6)" pasa de ✅ a 🟡 con este
  documento como plan de cierre; el SoA gana los controles CDC y Suite de Regresión.
- **`prp-base.md`**: sección nueva breve "¿Este PRP cambia comportamiento de agentes?
  → CDC aplicable: sí/no".
- **PRP-013/009**: columna `origen` (lineage, §2) en sus modelos de datos.
- **Modelo de amenazas**: O1/G1 ganan su forma ejecutable (specs-trampa en el golden
  set); añadir a activos: "golden sets" (A11 — envenenarlos cegaría la regresión;
  viven en git con revisión como todo).
- **Roadmap**: la Suite de Regresión de Agentes es candidata a PRP propio, previo a
  cualquier migración de modelo — y conviene construirla ANTES de la primera migración
  forzada (deprecación de un modelo), no durante.

---

*Pendiente de aprobación. El orden recomendado de construcción: lineage (§2, trivial)
→ pineo y bitácora CDC (§3, un día) → golden set de la vertical clientes con las
specs-trampa (§4, el de mayor valor por esfuerzo).*
