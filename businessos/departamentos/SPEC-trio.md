# SPEC — El trío Hermes→Ejecutor→Supervisor (Fase 6)

> Especificación operativa **sin código**. Define quién decide, quién hace, quién valida y
> quién aprueba; cómo fluye una solicitud de punta a punta; cómo se hablan el Ejecutor y el
> Supervisor por A2A; y qué anuncia cada uno en su Agent Card.
>
> Fuente conceptual: *"La idea: dos agentes, muchos departamentos"*. Ubicación en el plan:
> ROADMAP.md → **Fase 6**. Depende de A2A (Fase 5). No se construye nada aquí.

---

## 1. La idea en una frase

Hermes **orquesta**; el par Ejecutor/Supervisor **opera**. Hermes decide y reparte; ellos
hacen y vigilan. Eso separa el **juicio** (Hermes) de la **ejecución** (los dos A2A) — lo
que hace el sistema seguro y reutilizable. Los departamentos no son agentes: son
**paquetes de competencias** que el par carga según la tarea.

---

## 2. Los tres niveles (roles y fronteras)

### Hermes-Negocio — Orquestador
Es el director de orquesta, no un músico. **No** ejecuta tareas de departamento ni las
supervisa directamente.
- Recibe la solicitud (Telegram / panel): "hazme / arregla / añade X".
- La entiende, identifica a qué **departamento** pertenece y qué **contexto** necesita
  (repo objetivo, `BUSINESS_LOGIC.md`, ámbito RAG del cliente, catálogo de skills).
- Entrega al Ejecutor una **tarea concreta** con criterios de aceptación.
- Mantiene el **estado** y el control del reintento; concreta el resultado aprobado
  (responde, registra, propone merge/deploy a la dueña).
- Es la **memoria y el juicio** del sistema. Es también quien habla por Telegram.

**Frontera:** no escribe código, no se auto-aprueba.

### Ejecutor — Agente A2A (servicio propio sobre Claude Agent SDK)
Recibe de Hermes **una** tarea de un departamento y la hace.
- Corre el bucle de codificación real en un **workspace aislado** (git worktree /
  contenedor por cliente): edita archivos, ejecuta build/test, usa los skills de la fábrica.
- Entrega su resultado al Supervisor **vía A2A** (no a Hermes directamente, no al humano).
- Es independiente y reemplazable (un servicio, con su Agent Card).

**Frontera:** no decide **qué** hacer (eso es de Hermes) ni se **auto-aprueba** (eso es del
Supervisor). Solo ejecuta bien la tarea que le toca.

### Supervisor — Agente A2A (servicio propio, independiente del Ejecutor)
Vigila el trabajo del Ejecutor **antes** de que tenga efecto.
- Revisa contra **reglas** del departamento (ver `desarrollo-software.md`): ¿build/typecheck/
  lint verdes? ¿tests pasan? ¿`/code-review` y `security-review` sin hallazgos bloqueantes?
  ¿cumple los criterios de aceptación? ¿dentro de presupuesto de tokens? ¿respeta `CLAUDE.md`?
- Si **aprueba**: el resultado procede (vuelve a Hermes).
- Si **rechaza**: lo devuelve al Ejecutor **con observaciones**.

**Frontera + razón de ser:** es **independiente** del Ejecutor a propósito —proceso y
contexto separados—. Un supervisor que fuera parte del ejecutor no supervisaría nada.

---

## 3. Dos capas de control (deliberadas)

1. **Supervisor** — automático, regla a regla. Cierra el lazo técnico (compila, pasa, es
   seguro, cumple).
2. **Humano (la dueña)** — en lo **irreversible**: merge a `main`, deploy, cualquier cosa de
   cara al cliente o que mueva dinero.

Esa redundancia es lo que hace **defendible vender esto**. Mapea 1:1 al principio ya
implementado "copiloto, no autopiloto" (`clientes/AGENTS.md` §Regla de aprobación) y al
principio 6 del ROADMAP ("verificar antes de confiar").

---

## 4. Flujo de una solicitud, de punta a punta

1. **Entra** una solicitud (Telegram, correo o panel).
2. **Hermes** la recibe, la entiende, determina el departamento y arma el contexto
   (repo, BUSINESS_LOGIC, ámbito RAG, skills). Con eso, entrega la **tarea** al Ejecutor.
3. **Ejecutor** la realiza en su **workspace aislado** y entrega el resultado al
   **Supervisor vía A2A**.
4. **Supervisor** valida contra las reglas del departamento.
   - **Aprueba** → el resultado vuelve a **Hermes**.
   - **Rechaza** → regresa al **Ejecutor con observaciones**; Hermes mantiene el control del
     reintento (con un tope de intentos antes de escalar al humano).
5. **Hermes** concreta lo aprobado. Si la acción **toca al cliente o mueve dinero / es
   irreversible** (merge, deploy), pide a la **dueña** el visto bueno final antes de actuar.

```
solicitud → Hermes (entiende + arma contexto + reparte)
                │  tarea + criterios
                ▼
            Ejecutor (workspace aislado: edita, build, test, skills)
                │  resultado  ── A2A ──▶
                ▼
            Supervisor (reglas: build/test/review/aceptación/presupuesto)
             ├─ rechaza ─▶ Ejecutor (observaciones)  [reintento, con tope]
             └─ aprueba ─▶ Hermes ─▶ ¿irreversible? ─ sí ─▶ Humano aprueba ─▶ efecto
                                                     └ no ─▶ efecto + registro
```

---

## 5. Reglas A2A entre Ejecutor y Supervisor

A2A (Fase 5) es el protocolo por el que estos dos se hablan **como pares formales**. Aquí
sí encaja A2A de verdad —no de adorno— porque el Supervisor necesita ser **independiente**
del Ejecutor para que la vigilancia signifique algo.

- **Hermes ↔ Ejecutor** y **Ejecutor ↔ Supervisor** son interacciones A2A entre servicios
  separados (descubrimiento por Agent Card, tarea/mensaje como unidad).
- El Supervisor **nunca** comparte proceso ni contexto con el Ejecutor: recibe el resultado
  como entrada externa y lo juzga de cero contra las reglas.
- El veredicto del Supervisor es **estructurado** (aprobado / rechazado + lista de hallazgos
  con regla violada y evidencia), para que Hermes decida reintento o escalado sin ambigüedad.
- **Opacidad:** ni el Ejecutor ni el Supervisor exponen su interior; se anuncian por
  capacidad (igual que el grafo como agente A2A en Fase 5).

---

## 6. Agent Cards (qué anuncia cada servicio)

- **Ejecutor —** *"Construyo y modifico software a partir de una tarea con criterios de
  aceptación, en un workspace aislado; entrego un resultado verificable (diff + artefactos
  de build/test)."* No promete decidir alcance ni desplegar.
- **Supervisor —** *"Valido un resultado de software contra un conjunto de reglas de
  departamento (build, tests, code-review, seguridad, aceptación, presupuesto, convenciones)
  y emito un veredicto estructurado."* No promete construir ni arreglar.
- **Hermes-Negocio —** orquestador y único canal humano; no se anuncia como ejecutor ni
  supervisor.

---

## 7. Mecánica detallada

Cómo correría de verdad, pieza por pieza. (Las reglas concretas del departamento están en
`desarrollo-software.md`; aquí va el *cómo* en runtime.)

### 7.1 Las tres piezas como procesos reales

| Pieza | Qué es en runtime | Stack | Cómo se comunica |
|-------|-------------------|-------|------------------|
| **Hermes-Negocio** | Contenedor que ya existe (`hermes-negocio`) | Imagen Nous Hermes | Telegram (humano) + cliente A2A hacia Ejecutor/Supervisor |
| **Ejecutor** | Servicio nuevo, 1 contenedor (o 1 por cliente) | Claude Agent SDK (motor Claude Code), Python/Node | Servidor A2A (recibe tareas) + corre el repo en un worktree |
| **Supervisor** | Servicio nuevo, contenedor **aparte** | Claude Agent SDK + runners (build/test/review) | Servidor A2A (recibe resultados, emite veredicto) |

Los tres viven en `hermes-net`. La independencia del Supervisor es **física**: proceso,
contenedor y contexto de modelo separados del Ejecutor; no comparten memoria ni historial.

### 7.2 Estado y aislamiento

- **Estado de tareas:** Hermes mantiene cada solicitud como una **tarea A2A** con `task_id`,
  estado (`recibida → en_ejecución → en_revisión → aprobada/rechazada → concretada`) y
  contador de reintentos. Persistido en Supabase (tabla nueva `tareas`, a futuro) o en el
  store de Hermes.
- **Workspace aislado:** el Ejecutor usa un **git worktree** por tarea
  (`worktree/<task_id>`), nunca trabaja sobre `main`. Por cliente, además, repo y contenedor
  distintos. Un fallo de una tarea no contamina otra.
- **Presupuesto:** cada llamada de modelo del Ejecutor y del Supervisor escribe en
  `token_usage`; negocio sigue vigilando el tope.

### 7.3 Traza de punta a punta — "añade login con Google a la app de recetas"

**1. Hermes entiende y arma la tarea** (con criterios de aceptación explícitos):

```
task_id: rec-2026-0042
objetivo: "Auth email+password y Google OAuth, con profiles y RLS"
contexto: { repo: recetas, business_logic: <resumen>, rag_ambito: recetas, design_system: actual }
criterios_aceptacion:
  - build, typecheck y lint verdes
  - flujo login probado en browser (Playwright)
  - tablas nuevas con RLS habilitado
  - sin secretos en código; entradas validadas con Zod
limites: { intentos_max: 3, modelo_pref: sonnet }
```

**2. Ejecutor hace** en `worktree/rec-2026-0042`: corre `add-login`, implementa, valida en
caliente (`build`/`typecheck`). No entrega a Hermes ni al humano: entrega el **resultado al
Supervisor vía A2A**:

```
result: { task_id: rec-2026-0042, diff: <patch>, archivos: [...],
          build: ok, typecheck: ok, notas: "OAuth Google; migración profiles" }
```

**3. Supervisor valida** (de cero, re-ejecutando — no confía en lo que dice el Ejecutor):

| Gate | Comando | Resultado |
|------|---------|-----------|
| Compila | `npm run build` | ✅ |
| Tipos | `npm run typecheck` (y sin `any`) | ✅ |
| Lint | `npm run lint` | ✅ |
| Tests | Playwright del flujo login | ❌ callback OAuth da 500 |
| Calidad | `/code-review` | — (no llega) |
| Seguridad | `security-review` (RLS, secretos, Zod) | — |

Veredicto estructurado:

```
verdict: rechazado
hallazgos:
  - regla: tests_verdes
    evidencia: "playwright: login-google.spec falla, callback 500"
    archivo: app/auth/callback/route.ts
```

**4. Reintento controlado:** Hermes incrementa el contador (1/3) y devuelve la tarea al
Ejecutor con las observaciones. El Ejecutor corrige y re-entrega. Segunda vuelta: gates
verdes + `/code-review` limpio + `security-review` OK → **aprobado**.

**5. Gate humano en lo irreversible:** el aprobado vuelve a Hermes. Como sigue **merge a
`main`**, Hermes no lo hace solo: manda por Telegram el resumen + diff y pide visto bueno.

```
Telegram: "✅ Login Google listo en recetas (rec-2026-0042).
Build/test/review OK. ¿Apruebo el merge a main? [Sí / Ver diff / No]"
```

### 7.4 El motor de reglas del Supervisor (el corazón)

Cada regla es **(comando real → criterio binario → evidencia)**. Tres propiedades no
negociables:

1. **Re-ejecuta, no confía:** corre los comandos él mismo sobre el worktree; ignora lo que
   afirme el Ejecutor.
2. **Si no puede correr un gate, NO lo marca pasado:** un gate no verificado es rechazo, no
   un "asumimos que sí" (hermano de "citar fuentes, no inventar").
3. **Reglas auditables y versionadas:** viven como config revisable y diff-eable, no
   improvisadas — igual que el checklist del grafo.

### 7.5 Lazo de fallo y escalado

```
Ejecutor → Supervisor → ¿aprobado?
   ▲           │ no
   └───────────┘  (Hermes reenvía con hallazgos, intento++)
                  si intentos == max → Hermes ESCALA al humano:
                  "3 intentos sin pasar el gate de tests. ¿Reviso yo, ajusto criterios o cancelo?"
```

El tope de intentos evita el bucle infinito entre dos agentes quemando tokens. El humano
entra cuando la máquina se atasca, no en cada paso.

### 7.6 Reusado vs. construido (actualizado 2026-07-03, PRP-006)

- **Reusado tal cual:** Hermes-Negocio, todos los skills (`new-app`, `add-*`,
  `bucle-agentico`), los runners (`build`/`typecheck`/`lint`, Playwright, `/code-review`,
  `security-review`), `token_usage`, el patrón de aprobación humana de `clientes`.
- **Construido (PRP-006):** los dos servicios A2A — `businessos/ejecutor-a2a/`
  (motor pluggable: MockEngine + ClaudeAgentEngine sobre claude-agent-sdk) y
  `businessos/supervisor-a2a/` (motor de reglas determinista, config
  `reglas/software.toml`) — con sus Agent Cards; el contrato del trío
  (`trio-contrato/contrato.py`); la tabla `tareas` (`supabase-fase6.sql`); y el
  lado Hermes como skill (`negocio/skills/trio-software/`, JSON-RPC crudo sin
  secretos — no hizo falta un "cliente A2A dentro de Hermes" como pieza aparte).
  Nota de diseño: el Supervisor quedó stateless (juzga puro); el Ejecutor es el
  ÚNICO escritor de `tareas` (un escritor por fila, sin carreras).
- **Sigue pendiente (futuro, otro PRP):** el RAG por ámbito por cliente (hoy solo
  template en `/ai rag`) y los gates de modelo del Supervisor (declarados en la
  config, inactivos hasta tener runner real).

### 7.7 Piloto "lite" posible antes de A2A (nota de secuencia)

El trío completo depende de A2A (Fase 5). Si se quisiera validar la mecánica antes, hay un
atajo: Ejecutor y Supervisor como dos procesos llamados por **HTTP interno** en vez del
protocolo A2A formal — misma lógica, menos ceremonia, y luego se migra a A2A. No es lo
elegido (se optó por Fase 6 completa), pero queda señalado por si adelantar el aprendizaje
compensa.

---

## 8. Honestidad (riesgos a no esconder)

- Un agente que **escribe y despacha** software es justo el patrón "casi solo" que el
  proyecto ya juzgó **no listo para producción**. El split Ejecutor/Supervisor + el gate
  humano en merge/deploy lo **mitiga, no lo elimina**.
- **El Supervisor es tan bueno como sus reglas.** Reglas mal definidas dan *falsa
  seguridad*. Cada departamento necesita sus reglas **auditadas, no improvisadas** — mismo
  principio del checklist de auditoría del grafo.
- **Vender multiplica el riesgo:** datos y producción del cliente. Por eso el orden:
  especificar y validar en **uso propio** antes de white-label.
- Madurez: Hermes es v0.x ("tenacidad, no producción"); este trío es lo más ambicioso del
  roadmap. Pesa aquí más que en ningún otro lado.

---

## 9. Relación con el resto del sistema

- **Orquestador reusado:** `hermes-negocio` ya habla Telegram, mantiene memoria y crons, y
  enruta. No se crea un orquestador nuevo.
- **Por qué Ejecutor/Supervisor son servicios propios y no "dos Hermes más":** la imagen
  Nous Hermes es un loop de asistente, no un motor de codificación con edición de archivos,
  builds y skills. Para venta se necesita aislamiento por cliente, portabilidad y un límite
  de capacidad formal (Agent Card). Es "aislar, no fundir" aplicado.
- **No depende del grafo:** a diferencia de un futuro departamento de Finanzas, las fuentes
  de conocimiento del departamento de software son el código y los skills, no lo fiscal.

Ver: `desarrollo-software.md` (el paquete de competencias) y `white-label.md` (el modelo de
configuración por cliente).
