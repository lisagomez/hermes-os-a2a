# Departamento de Procesos — SPEC

Tercer/N-ésimo departamento del trío (patrón Fase 6/7). Como Software y
Adquisición, **no es un agente**: es un **paquete de competencias** (tareas +
reglas de validación + fuentes de conocimiento) que el par Ejecutor/Supervisor
carga según la tarea, orquestado por Hermes-Negocio. Se **configura, no se
programa**: dar de alta Procesos es registrar el departamento, sus reglas y su
skill, no escribir un servicio nuevo.

Su función es distinta a la de los otros departamentos: Procesos **no entrega
software ni cierra ventas — entrega un rediseño de proceso y una spec de
construcción** que le dice al resto del sistema *qué* construir. Es el
departamento que corre en el **descubrimiento** y decide, con criterio del
orquestador, si un proyecto necesita rediseñarse antes de automatizarse.

---

## 1. Propósito y fronteras

**Hace:**
- Diagnostica un proceso que **ya opera** en el cliente (manual o
  semi-automático) y produce su rediseño *to-be* con dos metodologías
  combinadas: **5S** (capa de información/artefactos) y **ESOA** —
  Eliminar → Simplificar → Optimizar → Automatizar (capa de flujo).
- Estima **alcance, presupuesto, pricing y reparto humano-agente** en MXN y
  USD (aritmética determinista, cero tokens — script `genera_presupuesto.py`).
- Emite una **`build-spec`** legible por máquina: por cada automatización a
  construir, declara el departamento destino (p. ej. Software), si dispara
  **SDD**, las **skills** y **CLIs** requeridos, integraciones y el punto de
  control humano.

**NO hace (fronteras negativas, van en la card/skill):**
- No escribe el código de la automatización (eso es el departamento de
  Software, Fase 6/7). Procesos **produce la spec; no la construye**.
- No aprueba ni dispara solo la construcción: emite la `build-spec`; **encolar
  y construir requiere aprobación humana** (Elisa) en lo irreversible.
- No inventa el proceso: parte de la **evidencia de descubrimiento**. Si falta
  información, la pide o declara el supuesto — nunca lo esconde.
- No asesora en lo fiscal/regulatorio por su cuenta: cuando el rediseño toca
  deducibilidad, cumplimiento o contratos, **consulta el grafo** (REST o A2A);
  señala con fuente, no afirma sin ella.

---

## 2. Encaje en el trío y en el descubrimiento

```
Lead / proyecto  →  DESCUBRIMIENTO (Hermes-Negocio pregunta al cliente)
                         │
                         ▼   criterio del orquestador
             ¿el proyecto rediseña un proceso que ya opera?
                    │ sí                         │ no
                    ▼                            ▼
        activa DEPARTAMENTO DE PROCESOS     se omite (greenfield / build directo)
                    │
                    ▼
   Ejecutor carga el paquete 'procesos'  →  diagnóstico (5S + ESOA) + presupuesto + build-spec
                    │
                    ▼
   Supervisor re-gatea (reglas/procesos.toml, deterministas)  →  aprobado | rechazado con hallazgos
                    │ aprobado
                    ▼
   Hermes-Negocio lee la build-spec  →  aprobación humana  →  dispara SDD / Skills / CLI
                    │                                              (encola tareas al depto destino)
                    ▼
   Software (Fase 6/7) construye  ·  Printing Press imprime CLIs faltantes  ·  gate humano en lo irreversible
```

- **Tres niveles, iguales que Fase 6:** Hermes-Negocio orquesta (entiende, arma
  contexto, reparte) → Ejecutor hace el diagnóstico en workspace aislado
  (worktree por tarea) → Supervisor valida por reglas antes de que la
  `build-spec` tenga efecto.
- **No todos los proyectos lo requieren.** Un SaaS nuevo desde cero
  (greenfield) no tiene un proceso *as-is* que rediseñar: se salta Procesos y va
  directo a Software. Procesos aplica cuando hay un proceso vivo que duele.
- **Descubrimiento = compuerta, no formulario rígido.** Preguntas abiertas al
  cliente + **criterio del orquestador** (ver `references/descubrimiento.md`).
  Hermes-Negocio juzga la activación y estima el alcance; no hay puntaje fijo.

---

## 3. Metodología: 5S + ESOA (cómo se combinan)

Las dos metodologías operan en **capas distintas** y en **orden**, no compiten.

- **5S estabiliza y estandariza la capa de información/artefactos.** No se puede
  automatizar el caos: un agente necesita entradas predecibles, datos limpios y
  ubicaciones estándar. 5S = Clasificar (Seiri), Ordenar (Seiton), Limpiar
  (Seiso), Estandarizar (Seiketsu), Disciplina (Shitsuke).
- **ESOA rediseña la capa de flujo del proceso** paso por paso: Eliminar →
  Simplificar → Optimizar → Automatizar. El error caro es saltar a Automatizar.

El puente entre ambas es **Seiketsu (Estandarizar) → Automatizar (ESOA)**:
entradas y salidas estandarizadas son *lo que hace barata y confiable la
automatización A2A*. Y **Shitsuke (Disciplina)** se materializa en el sistema
que sostiene el estándar: los **gates deterministas del Supervisor** + el
**control humano** + el monitoreo. La disciplina no es voluntad, es harness.

Secuencia del diagnóstico (detalle en `references/metodologia-esoa-5s.md`):

```
Descubrimiento → Mapeo as-is → Línea base (cuánto vale hoy)
  → 5S del proceso y sus artefactos → ESOA por paso (veredicto + justificación)
  → Diseño A2A (to-be, con el stack del cliente) → Consejo + reto (limitantes)
  → Alcance / presupuesto / ROI → build-spec (dispara SDD/Skills/CLI)
```

Reglas de operación heredadas del taller (canónicas): el orden es sagrado (no
hay rediseño sin diagnóstico, ni diagnóstico sin datos), se cuestiona la
secuencialidad, se asigna el actor correcto (IA vs humano) en cada paso, se
rediseña con el stack disponible, y no se valida sin evidencia. Ver
`references/metodologia-esoa-5s.md` (Parte D) y `references/linea-base-y-consejo.md`.

---

## 4. Salida del departamento

El Ejecutor deja en el worktree un **paquete to-be** con:

| Artefacto | Qué | Para quién |
|---|---|---|
| `diagnostico.yaml` | Estructura legible por máquina: línea base, pasos as-is, 5S, veredictos ESOA, diseño A2A, consejo, reto/limitantes, alcance. | Los gates del Supervisor lo parsean. |
| `reporte.md` | El diagnóstico legible (prosa profesional, marca del cliente). | El decisor humano. |
| `presupuesto.xlsx` | Presupuesto/pricing/ROI en MXN y USD (script). | Comercial + cliente. |
| `build-spec.yaml` | Qué construir: por automatización → depto destino, SDD sí/no, skills, CLIs, integraciones, control humano. | Hermes-Negocio, para disparar la construcción. |

La `build-spec` es el contrato de disparo. Su esquema y la mecánica de disparo
(SDD, Skills, CLIs vía Printing Press, cola de Fase 10, gate humano) están en
`references/disparadores-sdd-skills-cli.md`.

---

## 5. Gates del Supervisor (deterministas, sin LLM)

Igual que Software re-corre `npm build` y Adquisición valida contra una
referencia versionada, el reto "¿aquí qué gate?" se resuelve gateando la
**estructura y las invariantes del paquete to-be**, no juzgando la calidad del
razonamiento (eso es gate de modelo, declarado inactivo hasta tener runner).

Config: `supervisor-a2a/reglas/procesos.toml`; runners:
`supervisor-a2a/chequeos_procesos.py`. Gates activos:

- `estructura_diagnostico` — el paquete trae todas las secciones/artefactos
  obligatorios.
- `linea_base_cuantificada` — la línea base trae costo actual (mensual o anual);
  si es estimada, con supuestos declarados. Es el ancla del ROI.
- `esoa_completo` — cada paso as-is tiene veredicto ∈
  {eliminar,simplificar,optimizar,automatizar} + justificación no vacía.
- `cinco_s_aplicado` — las 5 S evaluadas (cada una con hallazgo o "n/a" con
  razón).
- `control_humano_por_automatizacion` — todo paso "automatizar" nombra su punto
  de control humano (no se permite "cero humanos").
- `consejo_y_reto` — el diagnóstico trae una recomendación (consejo) **y** un
  reto/limitantes no vacío (pase adversarial de constraints).
- `presupuesto_dos_monedas` — montos en MXN **y** USD con supuestos visibles
  (TC, margen).
- `build_spec_valida` — por cada ítem a construir: depto destino, skills y CLIs
  declarados, y gate humano marcado en lo irreversible.
- `herramientas_en_stack` — toda herramienta propuesta está en el stack del
  cliente o trae justificación explícita.
- `sin_marcadores` — no quedan marcadores `[...]` de marca blanca sin sustituir.
- `fuentes_citadas` — afirmaciones fiscales/regulatorias con fuente o marca
  "consultar grafo"; nada inventado.
- `sin_secretos` — secret-scrubbing (heredado).

Gates de modelo declarados **inactivos** (no arrancan sin runner, por diseño):
`revision_metodologica` (¿el ESOA está bien razonado?), `tono_de_marca`.

Regla heredada: **gate no ejecutable = rechazo con hallazgo, jamás "asumido"**;
regla activa sin runner = el servicio no arranca.

---

## 6. Puntos de control humano

"Copiloto, no autopiloto." Nada irreversible corre solo:

- **Aprobación del diagnóstico:** el `reporte.md` y el presupuesto que ven los
  clientes los aprueba **Elisa** antes de enviarse (matriz de
  `equipo-y-slack.md`).
- **Disparo de construcción:** la `build-spec` no encola tareas de Software
  sola; requiere OK humano (entra por la **cola de Fase 10**, serial, tope de
  gasto).
- **Impresión de CLIs:** Procesos *declara* los CLIs necesarios; `cli-audit`
  los detecta y avisa, pero **imprimir sigue siendo acción humana** en Claude
  Code (`/printing-press`). Nivel 3 (impresión automática) descartado.

---

## 7. White-label = configuración

El departamento es idéntico para todos. Por cliente cambia por **configuración**,
no por código: qué marca (`[CONSULTORA]`, `[LOGO]`, `[CONTACTO]`), qué tarifas y
TC en el presupuesto, qué política de alcance. Arranca en **uso propio** (para
diagnosticar y rediseñar los procesos de la dueña antes de automatizarlos) y
luego se vende como "diagnóstico de procesos con IA" dentro del white-label.

---

## 8. Alta y registro (cómo se instala en el repo)

Aislar, no fundir: se reutilizan Ejecutor y Supervisor **sin tocarlos**; solo se
suma configuración.

1. **Contrato del trío** — `DEPARTAMENTOS += "procesos"` en
   `trio-contrato/contrato.py` (patch en `trio-contrato/PATCH-contrato.md`). El
   Ejecutor ya propaga el campo `departamento`; el Supervisor es
   multi-departamento (`cargar_configs` toma todos los `reglas/*.toml`).
2. **Gates** — `supervisor-a2a/reglas/procesos.toml` +
   `supervisor-a2a/chequeos_procesos.py`. ⚠️ Como pasó con Adquisición: el
   **Dockerfile del supervisor debe COPIAR `chequeos_procesos.py`** o el
   servicio entra en crash-loop (`ModuleNotFoundError`); los tests de dev no lo
   cazan porque corren desde el directorio fuente.
3. **Skill** — `negocio/skills/procesos/` (absorbe `diagnostico-a2a`): Hermes
   arma la tarea con criterios, sin secretos.
4. **Descubrimiento** — se suma al checklist de descubrimiento white-label
   (corriente "Análisis y planeación", §2.3): las preguntas de
   `references/descubrimiento.md` alimentan el criterio de activación.
5. **CLIs** — se declaran en la `build-spec`; `cli-manifest.yaml` + `cli-audit`
   siguen su curso normal (impresión humana).

**No requiere servicio A2A propio ni puerto público:** Procesos es interno,
corre por el trío. (A diferencia de `ventas-a2a`, no hay puerta comercial
pública que exponer.)

---

## 9. Encaje con los principios del proyecto

1. **Aislar, no fundir** — paquete de competencias, reutiliza el trío.
2. **Acotar antes de escalar** — un proceso a la vez; alcance chico→grande.
3. **Citar fuentes, no inventar** — parte de la evidencia de descubrimiento;
   lo regulatorio va al grafo con fuente.
4. **Eficiencia por routing** — diagnóstico a modelo capaz; aritmética del
   presupuesto determinista (cero tokens).
5. **Arreglar lo compartido** — 5S/ESOA viven en el paquete, reutilizable
   white-label.
6. **Verificar antes de confiar** — Supervisor re-gatea; humano aprueba antes
   de disparar construcción.
