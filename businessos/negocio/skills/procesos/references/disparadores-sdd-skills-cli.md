# Disparadores: cómo Procesos activa SDD, Skills y CLIs

El departamento de Procesos **no construye**: declara qué construir en un
contrato legible por máquina, la **`build-spec.yaml`**. Cuando el Supervisor
aprueba el diagnóstico y un humano da el OK, Hermes-Negocio lee la build-spec y
**encola** las tareas de construcción al departamento destino. Este archivo
define el contrato y la mecánica.

Principio: "verificar antes de confiar" y "copiloto, no autopiloto". Procesos
propone; construir es acción gateada por humano.

---

## Esquema de `build-spec.yaml`

```yaml
proyecto: comnorte-clasificador-facturas      # id del proyecto/cliente
alcance: mediano                              # chico | mediano | grande
resumen: >-
  Automatizar la clasificación de deducibilidad de facturas de gasto y su
  captura al sistema contable, con revisión humana de las dudosas.

stack_cliente:                                # con qué stack se rediseña (regla del taller)
  suite: M365                                 # M365 | google | otro
  herramientas: ["Power Automate", "Copilot", "Contpaqi"]

construir:
  - id: cls-01
    automatizacion: "Clasificación de deducibilidad de facturas"
    complejidad: media                        # baja | media | alta
    departamento_destino: software            # software | (futuro) otro depto del trío
    sdd: true                                 # ¿dispara Spec-Driven Development?
    spec_ref: "specs/clasificador-facturas.md"  # dónde vive/vivirá la spec SDD
    skills_requeridas: ["trio-software"]      # skills que la construcción necesita
    clis_requeridos: ["contpaqi", "grafo"]    # CLIs que deben existir (Printing Press)
    herramientas_propuestas: ["Power Automate", "Copilot"]  # del stack del cliente
    justificacion_herramientas: ""            # requerida solo si algo está FUERA del stack
    integraciones: ["Contpaqi API", "grafo (dimensión fiscal MX)"]
    fuentes_conocimiento: ["grafo: LISR 27/28"]  # de dónde sale la regla, con fuente
    control_humano: "revisar las facturas marcadas 'dudoso' antes de contabilizar"
    gate_humano_irreversible: true            # merge/deploy/dinero/cara-al-cliente

  - id: std-01
    automatizacion: "Estandarizar entrada de facturas (5S/Seiketsu)"
    complejidad: baja
    departamento_destino: software
    sdd: false                                # no siempre necesita spec formal
    skills_requeridas: []
    clis_requeridos: []
    integraciones: ["Gmail / bandeja de entrada"]
    control_humano: "n/a (solo normaliza formato antes de clasificar)"
    gate_humano_irreversible: false

disparo:
  cola: true                    # entra por la cola del trío (Fase 10), serial
  requiere_aprobacion_humana: true   # Elisa aprueba antes de encolar construcción
  tope_gasto_usd: 5             # techo de tokens para la construcción
  orden: ["std-01", "cls-01"]   # dependencias: estandarizar antes de clasificar
```

El gate `build_spec_valida` (Supervisor) verifica que cada ítem de `construir`
traiga: `departamento_destino`, `skills_requeridas`, `clis_requeridos`,
`control_humano` y `gate_humano_irreversible`. Sin esos campos, la spec es
ambigua y no se puede disparar sin riesgo → rechazo con hallazgo.

---

## Qué significa cada disparador

### SDD (Spec-Driven Development)
Cuando `sdd: true`, la automatización se construye **desde una spec**, no a mano
suelta — la forma responsable de construir en este sistema (la misma disciplina
de los contratos inteligentes: "probar la lógica antes de desplegar"). Procesos
deja el punto de partida de esa spec (`spec_ref`) derivado del to-be: qué hace,
entradas/salidas estandarizadas (de las 5S), reglas, criterios de aceptación y
el control humano. El departamento de Software toma esa spec y la ejecuta con su
trío/enjambre (Fase 6/7).

Cuándo `sdd: false`: cambios chicos y bien acotados (p. ej. un normalizador de
formato) donde una spec formal es sobrecarga. Aun así entran por la cola y sus
gates.

### Skills
`skills_requeridas` lista las skills que la construcción necesita cargar (p. ej.
`trio-software` para el build; skills de dominio si aplica). Si una skill
requerida **no existe todavía**, es una señal para la fábrica de skills: se
construye con `skill-creator` antes (o como primer ítem del plan). Procesos solo
**declara** la necesidad; no crea la skill él mismo.

### Rediseñar con el stack del cliente (regla del taller)
No se proponen herramientas que el cliente no tiene sin justificarlo. `stack_cliente`
declara su suite y herramientas; cada ítem lista `herramientas_propuestas`. Guía:
- **Microsoft 365** → Copilot + Power Automate.
- **Google Workspace** → Gemini + Apps Script.
- **Otro / fuera del stack** → permitido, pero con `justificacion_herramientas`
  no vacía que explique por qué vale salirse del stack.

El gate `herramientas_en_stack` verifica que toda herramienta propuesta esté en
`stack_cliente.herramientas` **o** venga con justificación. Es la versión
determinista de "no propones herramientas que el usuario no tiene sin
justificación explícita".

### CLIs (Printing Press)
`clis_requeridos` lista los CLIs agente-nativos que la automatización usará
(ahorro ~100x de tokens vs MCP pesado). Procesos los declara; **no los imprime**.
El flujo respeta la corriente Printing Press:
1. Los CLIs declarados se reflejan en `cli-manifest.yaml` (fase → fuente →
   vertical).
2. `cli-audit` (cron nocturno en el server) detecta los faltantes y los reporta
   en el digest 08:00 con el comando exacto.
3. **Imprimir sigue siendo acción humana** en Claude Code (`/printing-press`),
   con shipcheck y grado ≥A antes de usarse en producción. Nivel 3 (impresión
   automática) está descartado.
4. Reglas de seguridad heredadas: dry-run por defecto; anotaciones destructivas
   correctas en CLIs que muevan dinero; verify antes de confiar.

---

## Mecánica de disparo (paso a paso)

```
1. Supervisor aprueba el diagnóstico (todos los gates de procesos.toml en verde).
2. Hermes-Negocio publica el reporte + presupuesto → APROBACIÓN HUMANA (Elisa).
      · nada se construye sin este OK (matriz equipo-y-slack).
3. Con el OK, Hermes-Negocio lee build-spec.yaml y, respetando `disparo.orden`:
      · por cada ítem `construir`, arma una TAREA del departamento destino
        (normalmente Software) con su spec_ref/criterios (SDD si aplica).
      · declara skills_requeridas y clis_requeridos en el contexto de la tarea.
      · ENCOLA la tarea por la cola de Fase 10 (serial, tope de gasto).
4. Los CLIs faltantes → cli-audit los caza → un humano los imprime (Printing Press).
5. El depto destino construye; su Supervisor re-gatea; gate humano en lo
   irreversible (merge a main, deploy, cara al cliente, dinero).
6. La trazabilidad viaja por `decision_id`/`task_id` (token_usage) desde el
   descubrimiento hasta el gasto de construcción.
```

**Lo que Procesos NUNCA hace:** encolar construcción sin aprobación humana,
imprimir CLIs solo, o marcar `gate_humano_irreversible: false` en algo que toque
dinero, datos sensibles o al cliente. Esos son los candados del sistema; Procesos
los respeta, no los rodea.
