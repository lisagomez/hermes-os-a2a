# Feature: indicador-actividad (Enjambre Binario)

Indicador de actividad en vivo para los agentes de HERMES / a2a: un **enjambre abstracto de bits
(0/1)** cuyo comportamiento se adapta a la tarea del agente, con momentos de verificacion explicita
de progreso (barra / % / contador). Los bits SON los datos: se ordenan cuando el agente los ordena.

## Estado (2026-07-18): que se queda y por que

| Archivo | Rol | Por que se queda |
|---|---|---|
| `enjambre-binario.v3.html` | **PROTOTIPO CANONICO** (decision de Johann) | 18 estados (10 base + 8 futuros), autoplay sin gating, anima con reduced-motion, geometria verificada (ningun estado se sale del marco). Se abre con doble clic. |
| `enjambre-engine.ts` | Motor TS de los 18 estados, agnostico del renderer | Typecheck limpio. Seam de upgrade: cambiar Canvas 2D por WebGL/WebGPU sin tocar estados. |
| `enjambre-binario.tsx` | Componente React controlado (`state`, `progress`, `progressMode`) | Para montar en cola/dashboard. Pendiente verificar con `npm install` + dev server. |
| `historial/` | v1 (prototipo original, ex-docs/) y v2 (10 estados) | Linea evolutiva del canonico, versionado `.vN` elegido por Johann. |
| `exploracion/` | Demos de render (WebGL/WebGPU/morph) + exploracion del personaje "ser IA" (APARCADA) | Cada archivo con veredicto y por que en `exploracion/_LEEME.md`. Incluye la LECCION image-to-particles (leerla antes de retomar el personaje). |

Estados del v3: pensar, leer, recolectar, escribir, construir, limpiar, negociar-a2a, esperar-gate,
bloqueado, confirmado + buscar, planear, herramienta, verificar, reintentar, enrutar, streaming,
desplegar. Paleta en el bloque `PALETTE`/`PALETA` (una sola fuente por archivo, cambiable sin tocar logica).

## Personaje "ser IA" (DES-APARCADO 2026-07-18, mismo dia): linea ser-ia.vN

Tras validar image-to-particles con el reto (demo en exploracion/), Johann aprobo continuar. Linea viva:
- `ser-ia.v1.html` = personaje COMPLETO con transformaciones (autocontenido ~8 MB, 4 imagenes embebidas
  en base64, doble clic): reposo solido respirando -> disolucion FUERTE en 1s/0s con los OJOS brillando
  sin dispersarse -> rearmado como profesion (Medico / Ing. de Sistemas / Financiero), chips + auto.
  Particulas muestreadas de las imagenes (color real por pixel); ojos = pixeles ambar en la mitad
  superior (~367 por forma, verificado con decodificador PNG en Node; el $ dorado del financiero
  clasifica como cuerpo y se disuelve).
- `assets/` = imagenes fuente de las profesiones, generadas con Nano Banana usando `--refs`
  exploracion/ser-ia-fuente.png para consistencia de personaje (funciono: es el mismo ser en las 4).
- Agregar una profesion nueva = generar imagen con --refs + anadirla al array SHAPES + re-inyectar base64.

## Que se aparco y por que (resumen; detalle en exploracion/_LEEME.md)

La exploracion del **personaje "ser IA"** (mascota con ojos que se transforma en profesiones) se
aparco el 2026-07-18 tras 4 iteraciones dibujando la silueta con codigo que salieron creepy. La causa
es de metodo, no de concepto: el look definido exige **muestrear una IMAGEN real** (tecnica
image-to-particles, como el leon de excellentaisolutions.es), no dibujar formas a mano en codigo. Las
decisiones de direccion ya tomadas (blob + ojos ambar, disolucion fuerte, profesion con ojos) y la
receta exacta para retomar quedan en `exploracion/_LEEME.md`. Investigacion de respaldo en el cerebro:
temas `estados-actividad-agente-enjambre` (F363) y `diseno-ser-ia-amigable-rostro-empatia` (F364).

## Decisiones de stack

- Framework = React/Next (host del proyecto a2a; no se relitiga). El render del indicador es Canvas 2D
  (dibuja digitos 0/1 trivialmente y corre en todo); WebGL/WebGPU quedan como upgrade del renderer o
  para un hero de fondo (demos en `exploracion/`).
- Web3 = eje APARTE. Encaja en el estado `confirmado` (on-chain/txHash); se conecta cuando exista esa capa.

## Promocion a producto (siguiente paso cuando se retome)

Montar `<EnjambreBinario>` donde se muestre actividad del agente (cola / dashboard), correr
`npm install` + `npm run dev` y verificar con Playwright. Reglas del repo: kebab-case, PascalCase en
componentes, sin `any`, <500 lineas/archivo.
