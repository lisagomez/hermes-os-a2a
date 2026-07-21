# SPEC — Indicador de actividad "Enjambre Binario" (variante B)
## Para Claude Design · Hermes OS · A2A

> Variante alternativa/complementaria al personaje polimorfo (ver
> `HANDOFF-claude-design-personaje-demo.md`). Mismo propósito: mostrar QUÉ hace el agente durante
> una tarea para bajar la ansiedad del humano. Distinto vehículo: en vez de una criatura, los
> **datos mismos** — dígitos binarios que se organizan.
> Prototipo funcional adjunto: `prototipo-enjambre-binario.html` (abrir en navegador; NO
> reconstruir la lógica desde cero, portar de ahí).

## 1. Concepto

~120 glifos monoespaciados (`0` y `1`) que fluyen y se ensamblan en la figura de cada actividad.
La metáfora es literal: los bits SON los datos del agente; cuando el agente los ordena, se ordenan
en pantalla. Herencia estética Matrix, en paleta Neural Nexus.

**Por qué binario y no puntos:** un punto es abstracto; un `0`/`1` significa "dato". La figura
resultante (documento, renglones, check) se lee como "tus datos tomando forma", sin leyenda.

## 2. Reglas del sistema

1. **Tipografía:** JetBrains Mono, ~11px, `textAlign:center`. Los glifos son SOLO `0` y `1`
   (excepto corrupción, ver Limpiando).
2. **Bit-flip:** cada glifo cambia aleatoriamente 0↔1 con período individual (40–200 frames).
   Es lo que los hace sentirse código vivo. Nunca estáticos.
3. **Movimiento:** cada glifo persigue su posición objetivo con lerp suave (factor 0.08). Las
   transiciones entre estados son el mismo mecanismo (los objetivos cambian, los bits migran).
4. **Alpha pulsante:** ±25% con fase por glifo — respiración del conjunto.
5. **Honestidad (guardrail heredado, no negociable):** cada estado se dispara desde telemetría
   real de la cola. Sin dato → estado neutro. El subtítulo mono SIEMPRE muestra el dato real
   (`grafo-a2a · 3 de 7 fuentes`). La animación jamás afirma actividad que el sistema no reporta.

## 3. Colores por rol del bit

| Rol | Color | Uso |
|---|---|---|
| Bit asentado / en formación | `#7C3AED` violeta | figuras estables |
| Bit activo / entrante / foco | `#EC4899` magenta | anillos de llegada, banda de escaneo, bits cayendo |
| Bit limpio / verificado | `#5DCAA5` teal | resultado de limpieza, check final |
| Carácter corrupto | `#E24B4A` rojo | solo en Limpiando: glifos `# % ? ! ~` con jitter |
| Neutro | `#6d5bc9` violeta apagado, alpha .55 | órbita de Pensando |

## 4. Estados (figura objetivo por estado)

| Estado | Figura que forman los bits | Detalle |
|---|---|---|
| **Recolectando** | Anillo elíptico magenta girando lento (fuentes externas) + bloque-documento violeta 9 columnas al centro | los bits del anillo "alimentan" al documento |
| **Leyendo** | 6 renglones de bits violeta | banda vertical magenta recorre los renglones de izq→der; los bits bajo la banda se encienden en magenta |
| **Construyendo** | Grilla 12×6 que se llena de abajo hacia arriba | los bits aún no colocados esperan arriba en magenta y "caen" a su celda |
| **Limpiando** ★ | Antes/después explícito: glifos corruptos rojos (`#%?!~`) con jitter dispersos; línea de barrido magenta avanza; lo barrido se convierte en `0/1` teal alineados en grilla inferior | la corrupción es texto ilegible; la limpieza lo vuelve binario ordenado. El barrido reinicia en loop mientras la tarea siga |
| **Confirmado** | Los bits forman un **check** grueso (3 bits de espesor) en teal | subtítulo muestra el txHash real |
| **Pensando (neutro)** | Órbita elíptica difusa, violeta apagado, flip lento | el guardrail: sin telemetría, solo órbita |

Los estados restantes del catálogo del personaje (Negociando A2A, Esperando gate, Bloqueado) no
están en el prototipo; si se necesitan en esta variante: Negociando = dos nubes de bits
intercambiando columnas; Esperando gate = los bits forman un candado con anillo punteado;
Bloqueado = todos los glifos se corrompen a rojo con jitter. Mantener el mismo lenguaje.

## 5. Relación con el personaje polimorfo (decisión de producto pendiente ⚑)

Ambos indicadores comparten estados, subtítulos, telemetría y guardrails. Opciones para el equipo:
a) **Binario como modo "técnico"** y personaje como modo "amable" (toggle o según superficie:
   binario en vistas densas/expertas, personaje en vistas de cliente).
b) **Fusión:** el personaje polimorfo hecho DE bits (su cuerpo es el enjambre binario con la
   física de gelatina encima) — máxima ambición, mayor costo.
c) Elegir uno solo.
La demo puede mostrar ambos y dejar que el equipo decida viéndolos.

## 6. Notas técnicas

- Canvas 2D + requestAnimationFrame; 120 glifos con fillText corre fluido. Pausar fuera de
  viewport; reducir N en móvil.
- `prefers-reduced-motion`: variante estática (la figura formada, sin flip ni movimiento) + el
  subtítulo mono como fuente de verdad textual con `aria-live`.
- Panel contenedor: header con código de agente (mono, violeta claro) + título del estado +
  subtítulo de telemetría a la derecha (mono, gris). Igual al prototipo.
