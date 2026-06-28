# Departamento: Desarrollo de Software (paquete de competencias)

> Primer departamento del trío (ver `SPEC-trio.md`). Un departamento = **(1) tareas del
> Ejecutor + (2) reglas de validación del Supervisor + (3) fuentes de conocimiento**.
> Añadir un departamento = definir este paquete, no desplegar agentes nuevos.
>
> Se eligió este como primero porque este repo **ya es** una fábrica de software (los
> skills) y porque **no depende del grafo** (Fase 2): sus fuentes son el código y los
> skills, no lo fiscal. Eso lo vuelve el camino más corto a un trío validable en uso propio.

---

## 1. Tareas que sabe hacer el Ejecutor

Cada tarea se apoya en un skill o flujo **que ya existe** en el repo (sin reimplementar):

| Tarea | Apoyo existente (skill / flujo) |
|-------|---------------------------------|
| Arrancar app desde cero | `new-app` (entrevista → BUSINESS_LOGIC.md) |
| Planear feature compleja | `prp` (genera el plan; siempre antes de construir) |
| Implementar feature por fases | `bucle-agentico` (DB + API + UI coordinados) |
| Añadir autenticación | `add-login` |
| Añadir pagos | `add-payments` (Polar) |
| Añadir emails | `add-emails` (Resend) |
| Añadir PWA / push | `add-mobile` |
| Landing cinemática | `website-3d` |
| Operaciones de base de datos | `supabase` (tablas, RLS, migraciones, queries) |
| Capacidades de IA | `ai` (chat, RAG, vision, tools) |
| Escribir/correr tests de browser | `playwright-cli` |
| Fix de bug / refactor | flujo directo + `playwright-cli` para validar |
| Preparar deploy | **propuesto**, nunca auto-ejecutado (gate humano) |

**Frontera del Ejecutor:** no decide el alcance (lo da Hermes con criterios de aceptación)
ni aprueba su propio trabajo (lo juzga el Supervisor). Trabaja en un **workspace aislado**
(git worktree / contenedor por cliente).

---

## 2. Reglas de validación que aplica el Supervisor

Cada regla mapea a un **comando o skill real**; el veredicto es estructurado
(aprobado/rechazado + hallazgos). Reglas mal definidas dan falsa seguridad → estas deben
mantenerse **auditadas**, no improvisadas.

| Regla (gate) | Cómo se comprueba |
|--------------|-------------------|
| Compila | `npm run build` sin errores |
| Tipos correctos | `npm run typecheck` limpio (y **sin `any`** — usar `unknown`) |
| Estilo / lint | `npm run lint` sin errores |
| Tests verdes | suite Playwright pasa (`playwright-cli`) |
| Calidad de código | `/code-review` sin hallazgos bloqueantes |
| Seguridad | `security-review` sin hallazgos; RLS habilitado en tablas nuevas; sin secretos en código; entradas validadas con Zod |
| Cumple la tarea | criterios de aceptación que entregó Hermes, satisfechos |
| Convenciones | `CLAUDE.md`: archivos ≤500 líneas, funciones ≤50, `camelCase`/`PascalCase`/`kebab-case`, KISS/YAGNI/DRY |
| Presupuesto | el costo de la tarea (filas en `token_usage`) dentro de lo asignado; sin escalado innecesario a Opus |

**Regla de oro del gate:** si una comprobación no se puede correr de verdad, **no** se marca
como pasada. (Anti-sello-de-goma, hermano del "citar fuentes, no inventar".)

---

## 3. Fuentes de conocimiento que consulta

- **El repo objetivo** — el código sobre el que se trabaja (estructura feature-first).
- **`BUSINESS_LOGIC.md`** del proyecto — qué hace el producto y por qué.
- **Los design-systems** (`.claude/design-systems/`) — neobrutalism, liquid-glass, etc.
- **El catálogo de skills** — la "biblioteca de competencias" de la fábrica.
- **RAG con ámbito por cliente** — sobre los docs propios del cliente (aislado por ámbito,
  como ya se diseñó el RAG). *Dependencia futura: el RAG por ámbito aún no está integrado en
  BusinessOS (existe como template en `/ai rag`).*

> **No interviene el grafo.** Esa es la diferencia con un futuro departamento de Finanzas:
> aquí el conocimiento es el código y los skills, no lo fiscal/regulatorio.

---

## 4. Recorrido de escritorio (dogfood): "añade login a la app X"

Verifica que cada paso tiene **dueño** y un **artefacto verificable**:

1. **Hermes** entiende "añade login a X", identifica departamento = software, arma contexto
   (repo X, su BUSINESS_LOGIC, ámbito RAG de X) y entrega la tarea: *"añade auth email+OAuth
   con profiles y RLS; criterio: build+typecheck+lint verdes, flujo de login probado en
   browser"*. → *artefacto: tarea con criterios.*
2. **Ejecutor**, en workspace aislado, corre `add-login`, implementa, y produce el cambio. →
   *artefacto: diff + salida de build/test.*
3. **Supervisor** (A2A, independiente) corre los gates: build/typecheck/lint, Playwright del
   login, `/code-review`, `security-review` (RLS, sin secretos). → *artefacto: veredicto
   estructurado.*
   - Si falla algo → vuelve al Ejecutor con los hallazgos.
4. **Hermes** recibe el aprobado y propone el **merge** a la dueña (irreversible). →
   *artefacto: propuesta de merge.*
5. **La dueña** aprueba → Hermes concreta. *Deploy* sería otro gate humano.

**Dependencias futuras que este recorrido expone** (no bloquean la spec, sí la
construcción): A2A real entre los servicios (Fase 5) y el RAG por ámbito por cliente.

---

## 5. Cómo se añade el siguiente departamento

Mismo patrón, otro paquete: definir sus tres listas (tareas / reglas / fuentes). Ejemplos
naturales a futuro — **Soporte** (responder tickets; reglas de tono y política; RAG de la
base de conocimiento del cliente) y **Finanzas** (procesar facturas; reglas de monto y
cuadre; **aquí sí** el grafo para deducibilidad). No se construyen ahora.
