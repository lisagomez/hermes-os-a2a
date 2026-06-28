---
name: fase6-departamentos
description: Fase 6 (futura) — departamentos operados por el trío Hermes→Ejecutor→Supervisor, white-label; primer departamento Desarrollo de Software.
metadata:
  type: project
---

Decisión (2026-06-28): se añadió al roadmap la **Fase 6 (futura)** a partir del documento
*"La idea: dos agentes, muchos departamentos"*.

**Arquitectura (tres niveles):** Hermes-Negocio **orquesta** (entiende, arma contexto,
reparte) → **Ejecutor** (servicio A2A propio sobre Claude Agent SDK, workspace aislado)
hace → **Supervisor** (servicio A2A independiente) valida por reglas antes de que algo tenga
efecto. Dos capas de control: Supervisor automático + humano en lo irreversible (merge,
deploy, cliente, dinero) — es "copiloto, no autopiloto".

**Departamento = paquete de competencias** (tareas del Ejecutor + reglas del Supervisor +
fuentes de conocimiento). No son agentes; añadir uno = definir el paquete.

**Primer departamento: Desarrollo de Software** (no Finanzas). Razón: el repo ya es una
fábrica de skills y **no depende del grafo** (Fase 2). Las reglas del Supervisor mapean a
comandos reales: `build`/`typecheck`/`lint`, Playwright, `/code-review`, `security-review`.

**White-label = configuración:** el trío es idéntico; por cliente cambian departamentos
activos, reglas, marca y datos/workspace aislados. Camino: **uso propio primero**
(construir los SaaS de la dueña), luego venta.

**Decisiones de la usuaria que acotaron el plan:** primer departamento = software; producto
doble (uso propio + venta); ubicación **Fase 6 completa** (después de A2A, Fase 5);
entregable **solo documentación, sin código**.

**Dependencias / no se construye aún:** A2A real (Fase 5) entre los servicios, y el RAG por
ámbito por cliente (hoy solo template en `/ai rag`). El grafo NO es dependencia de este
departamento.

**Por qué servicios propios y no "dos Hermes más":** la imagen Nous Hermes es un loop de
asistente, no un motor de codificación con edición de archivos, builds y skills; para venta
se necesita aislamiento por cliente, portabilidad y Agent Card. Es "aislar, no fundir".

**Entregables (docs creadas):** `businessos/ROADMAP.md` (Fase 6),
`businessos/departamentos/SPEC-trio.md`, `.../desarrollo-software.md`, `.../white-label.md`,
y mención en `BUSINESS_LOGIC.md`. Ver [[fase0-estado]] para el estado del cimiento.
