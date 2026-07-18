# Feature: indicador-actividad (Enjambre Binario)

Indicador de actividad en vivo para los agentes de HERMES / a2a. Un **enjambre abstracto de bits
(0/1)** cuyo comportamiento se adapta a la tarea que el agente esta haciendo (leer, recolectar,
escribir, construir, limpiar, negociar A2A, esperar gate, bloqueado, confirmado, pensar), con
momentos de **verificacion explicita de progreso** (barra / % / contador). Los bits SON los datos:
se ordenan cuando el agente los ordena.

## Estado actual
- `enjambre-binario.v2.html` = version ACTUAL (autoplay, sin gating "SIM"; anima aunque el sistema
  tenga prefers-reduced-motion; abre y corre con doble clic). Reconstruccion "al siguiente nivel".
- `enjambre-binario.v1.html` = prototipo previo (5.7 KB), movido aqui desde `docs/` para llevar el
  historico. Versionado por nombre `.vN`, no en carpetas separadas.
- Se abre haciendo doble clic en el `.html` (no necesita servidor).

## Estados del enjambre (uno = un comportamiento distinto)
pensar · leer · recolectar · escribir · construir · limpiar · negociar-a2a · esperar-gate ·
bloqueado · confirmado. Cada estado tiene su propia forma/movimiento y etiqueta.

## Paleta
Identidad a2a: violeta `#7C3AED` + magenta `#EC4899`, mas semanticos (verde ok, rojo bloqueado,
ambar espera, cian para la contraparte en negociacion). Bloque `PALETTE` al inicio del html para
cambiarla en un sitio (p. ej. a cian) sin tocar la logica.

## Promocion a producto (feature-first, cuando se valide)
Convertir el prototipo a componente React del Next.js:
- `components/enjambre-binario.tsx` - client component con `<canvas>`, props `{ state, progress,
  progressMode }`. Toda la logica de particulas y el loop viven aqui.
- `hooks/use-enjambre.ts` - (opcional) el bucle de animacion y el estado.
- `types/index.ts` - el enum de estados y los tipos de props.
Reglas del repo: kebab-case en archivos, PascalCase en componentes, sin `any`, <500 lineas/archivo.
Se monta donde se muestre actividad del agente (cola / dashboard). Verificar con el dev server
(`npm run dev`) + Playwright antes de integrar.

## v3 (2026-07-18): 18 estados + componente React (motor separado del renderer)

- `enjambre-binario.v3.html` = prototipo standalone VERIFICABLE con los **18 estados** (10 base
  refinados + 8 futuros: buscar, planear, herramienta, verificar, reintentar, enrutar, streaming,
  desplegar). Autoplay, abre con doble clic. Geometria de los 18 verificada (ninguno se sale del marco).
- `enjambre-engine.ts` = el MOTOR: logica de los 18 estados AGNOSTICA del renderer (PALETA, DIM, STATES,
  LABEL, TARGET). Typecheck limpio. Es el seam para "no limitarnos": hoy renderer = Canvas 2D; se puede
  cambiar a WebGL / React Three Fiber / WebGPU reemplazando SOLO el dibujo, sin tocar los estados.
- `enjambre-binario.tsx` = componente React CONTROLADO (`'use client'`), props `{ state, progress,
  progressMode, className }`. Usa el motor; el `<canvas>` escala al 100% del contenedor. Renderer Canvas 2D.
  Verificacion visual pendiente: requiere `npm install` (este checkout no tiene node_modules) + montar en
  una pagina y `npm run dev` (los 4 errores de tsc son cascada de "react no instalado", no bug de codigo).

## Decisiones de stack (2026-07-18)

- Framework = React/Next (host del proyecto a2a; no se relitiga). Innovacion real = tecnologia de RENDER,
  por eso el motor esta separado (upgrade a WebGL/WebGPU sin reescribir estados). Escalable por diseno,
  esbelto en construccion (Canvas 2D basta para ~200 particulas).
- Web3 = eje APARTE (no del render). Encaja en el estado `confirmado` (on-chain / txHash) y donde la
  pagina muestre verificacion on-chain; se conecta a un tx real cuando exista esa capa. NO se mezcla aqui.

## Backlog

- Aplicar los refinamientos de F363 al resto (recolectar multi-origen async, limpiar jitter->settle, etc.)
  ya reflejados en v3; validar visualmente con Johann.
- Montar `<EnjambreBinario>` donde se muestre actividad de agente (cola/dashboard) + verificar con dev server.
- Corpus de referencia: `cerebro-investigacion/temas/estados-actividad-agente-enjambre.md` (F363).
