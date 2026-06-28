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

## 7. Honestidad (riesgos a no esconder)

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

## 8. Relación con el resto del sistema

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
