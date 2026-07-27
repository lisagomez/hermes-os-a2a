---
name: hermes-design-integrity
description: Auditoría de integridad y elocuencia de componentes en apps panel-adm (marca blanca) — alineación de tablas, persistencia de selectores, contratos de primitivas, tokens Tailwind v4, tema dual. Usar al construir o revisar cualquier vista, y como checklist previo a cerrar un PR de frontend.
---

# Hermes-Design-Integrity (marca blanca)

> Origen: dos defectos reales cazados por Victor en dogfood (2026-07-26/27) que
> ningún gate automático detectó — headers de tabla desalineados con la data, y
> un selector que perdía su posición al navegar. Este skill convierte cada
> defecto pagado en una regla verificable. Sector-agnóstico: aplica a cualquier
> app del design system panel-adm (canon: meeting-copilot).

## Principio

Un componente tiene **integridad** cuando su estructura es la que el HTML/framework
espera (no solo "se ve bien en mi pantalla"), y tiene **elocuencia** cuando su
estado le dice la verdad al usuario (selección donde la dejó, fallo declarado,
procedencia visible). Los gates de compilación no ven ninguna de las dos cosas:
hay que auditarlas con reglas explícitas y tests que fallen si se rompen.

## Reglas (cada una nació de un bug pagado)

### 1. Tablas: estructura válida y fit encabezado↔data
- `THead` renderiza su PROPIO `<tr>` — **jamás anidar `TRow` dentro** (tr dentro
  de tr = HTML inválido → headers desalineados en silencio; bug GAL, 4 tablas).
- Headers 1:1 con columnas: mismo número de `TH` que de `TCell` por fila, en el
  mismo orden semántico.
- Contenido multilínea en celdas → `table-fixed` + anchos explícitos en los TH
  (`w-[24%]`, `w-24`…) + `align-top`: sin eso, el navegador reparte anchos por
  contenido y el fit visual con los headers se rompe según los datos.
- Verificación: screenshot de la tabla CON datos reales largos, no con demo corta.

### 2. Selectores: el estado se clasifica ANTES de elegir dónde vive
- **Estado de navegación** (tab activo, elemento seleccionado de una lista,
  filtro): vive en la **URL** (`?tab=`, `?playbook=`) — sobrevive a salir/volver,
  es compartible y el back del navegador funciona. `router.replace(..., {scroll:
  false})` + `useSearchParams` (+ `<Suspense>` en la page).
- **Preferencia del usuario** (tema, modo, tarifas): store con `persist`.
- **Entrada efímera** (texto de un form aún no enviado): `useState` local — el
  ÚNICO caso legítimo.
- Smell: `useState(primerElemento)` para una selección visible = bug latente (el
  selector "regresa solo" al primero en cada montaje; bug Playbooks).
- Verificación obligatoria: seleccionar la opción 2+ → navegar a OTRA sección →
  volver → la selección sigue. Automatizarla en el smoke.

### 3. Primitivas: contrato de props completo
- Toda primitiva del design system spreadea las props nativas
  (`...rest: ComponentProps<'div'>`): sin eso, `data-testid` no llega al DOM y
  los smoke "no encuentran" componentes que sí existen (bug Card).
- Opciones de toggles/selectores aceptan `testid` por opción.

### 4. Tokens Tailwind v4: verificar el CSS COMPILADO
- Un token `@theme` cuyo nombre de utilidad colisione con una nativa
  (`--radius-s` → `rounded-s` = radio lógico "start") pierde en los corners y se
  rompe en silencio. Evitar sufijos que sean lados lógicos (`s`,`e`,`ss`,`se`,
  `t`,`r`,`b`,`l`) o hacer override en `@layer utilities` al final.
- La paridad visual se comprueba en el CSS compilado de producción, no en el fuente.

### 5. Tema dual y estados con criterio
- Todo color por token (light+dark verificados con screenshot en ambos temas);
  jamás hex directo en componentes.
- Estados vacíos/error dicen POR QUÉ y qué hacer (criterio, no hueco genérico);
  los fallos se declaran (fuente bloqueada, análisis parcial), nunca se ocultan.
- Sin layout shift: chips/badges de estado reservan su espacio.

## Procedimiento de auditoría (al revisar una vista o cerrar un PR)

1. `grep` de smells: `<THead>` con `<TRow>` dentro; `useState(` inicializado con
   el primer elemento de una lista seleccionable; hex colors en tsx.
2. Recorrido con navegador real: cada tabla con datos largos; cada selector con
   el test salir/volver; ambos temas.
3. Por cada defecto: fix + **test de control que se ponga rojo si se revierte**
   (pregunta obligada: "si borro el fix, ¿este test falla?").
4. El hallazgo se documenta en el skill/CLAUDE.md si aplica a más de una vista
   (auto-blindaje: el mismo error jamás dos veces).
