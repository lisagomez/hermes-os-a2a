# Feature: indicador-actividad (Enjambre Binario)

Indicador de actividad en vivo para los agentes de HERMES / a2a: un **enjambre abstracto de bits
(0/1)** cuyo comportamiento se adapta a la tarea del agente, con momentos de verificacion explicita
de progreso (barra / % / contador). Los bits SON los datos: se ordenan cuando el agente los ordena.

## Estado (2026-07-18): que se queda y por que

| Archivo | Rol | Por que se queda |
|---|---|---|
| `enjambre-binario.v4.html` | **PROTOTIPO CANONICO** (decision de Johann) | v3 + investigacion aplicada: ritmos calmados ~40%, verificar en barrido VERTICAL (2 ejes vs leer) y mas lento, transicion suave entre estados, Barra de progreso estable por defecto. 18 estados, geometria verificada. Doble clic. |
| `enjambre-engine.ts` | Motor TS de los 18 estados, agnostico del renderer | Typecheck limpio. Seam de upgrade: cambiar Canvas 2D por WebGL/WebGPU sin tocar estados. |
| `enjambre-binario.tsx` | Componente React controlado (`state`, `subtitle`, `progress`, `progressMode`) | Cumple el SPEC fase-10: subtitle = telemetria real + aria-live (guardrail honestidad), reduced-motion = figura FORMADA estatica, pausa fuera de viewport/pestana, paleta teal #5DCAA5 / rojo #E24B4A del SPEC. Typecheck limpio (los ~880 errores del repo son del vendored control-interno). DESTINO evaluado: dashboard de Mission Control (src/app/(main)/dashboard), mapeando estados de la cola `tareas`; NO la landing (ahi van OfficeSim + PR #67). Pendiente: montarlo + dev server + Playwright. |
| `historial/` | v1 (prototipo original, ex-docs/) y v2 (10 estados) | Linea evolutiva del canonico, versionado `.vN` elegido por Johann. |
| `exploracion/` | Demos de render (WebGL/WebGPU/morph) + exploracion del personaje "ser IA" (APARCADA) | Cada archivo con veredicto y por que en `exploracion/_LEEME.md`. Incluye la LECCION image-to-particles (leerla antes de retomar el personaje). |

Estados del v3: pensar, leer, recolectar, escribir, construir, limpiar, negociar-a2a, esperar-gate,
bloqueado, confirmado + buscar, planear, herramienta, verificar, reintentar, enrutar, streaming,
desplegar. Paleta en el bloque `PALETTE`/`PALETA` (una sola fuente por archivo, cambiable sin tocar logica).

## Personaje "ser IA" (DES-APARCADO 2026-07-18, mismo dia): linea ser-ia.vN

Tras validar image-to-particles con el reto (demo en exploracion/), Johann aprobo continuar. Linea viva:
- `ser-ia.v3.html` = ACTUAL (v2 + iconografia validada por cross-check: profesion como rotulo, chart exclusivo de Datos, sin sparkles): el ser + los **8 agentes A2A reales** del registro de la landing
  (espejo de `businessos/frontends/cliente-web2/src/features/landing/agents.ts`): VENDO-1, FLUJO-7,
  ORACULO, LEDGER-X, MUSA-3, EMPATIA-2, CUSTODIO, TESORO. Autocontenido ~12 MB (9 imagenes base64 con
  mime por magic bytes), doble clic. Reposo solido respirando -> disolucion FUERTE en 1s/0s con los
  OJOS brillando sin dispersarse -> rearmado como el agente, con nombre+rol en pantalla, chips + auto.
  Ritmo calibrado: transicion 1.7s + pausa 4.5s (investigacion ambiental). Ojos = pixeles naranja
  (r>140,g>60,b<130) en la mitad superior (~180 por forma, verificado con decodificador PNG en Node;
  el b<130 excluye el headset rosa de EMPATIA-2 y el catchlight).
- `historial/` = ser-ia.v1 (3 profesiones genericas) y ser-ia.v2 (8 agentes, iconos pre-cross-check);
  enjambre-binario v1/v2/v3 (v3 = pre-afinado, snapshot consolidado).
- `assets/` = las 8 imagenes de agentes, generadas con Nano Banana `--refs`
  exploracion/ser-ia-fuente.png (consistencia de personaje verificada visualmente en las 8).
- Agregar un agente nuevo = generar imagen con --refs + anadirlo al array SHAPES + re-inyectar base64.
- Pendiente produccion: version React debe respetar prefers-reduced-motion del VISITANTE.

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

## Promocion a producto: INTEGRACION EN PAUSA (2026-07-18, decision de Johann)

Los prototipos estan APROBADOS y en el repo (PR #74 abierto: calibracion visual + iconos, encima del
#73 ya mergeado). La integracion al producto NO esta cableada ni decidida: Johann la deja en pausa
("no tengo claro donde va cada pieza"). Reparto CANDIDATO (a decidir con Elisa, es producto de ambos):

| Pieza | Hogar candidato | Condiciones / bloqueos |
|---|---|---|
| **ser-IA** (personaje) | Hero de la landing `cliente-web2` (reemplaza el orbe "agent" de `NetworkMini` en la columna derecha del Hero) | (1) Es la superficie DESPLEGADA de Elisa en Vercel y solo ella despliega (proyecto no conectado a GitHub; deploys de colaboradores "Blocked" en Hobby, ver `businessos/frontends/DEPLOY-web2.md`). (2) Elisa fue por estetica PIXEL (PR #67, OfficeSim); el ser-IA es blob de particulas: alinear direccion con ella ANTES de construir. (3) **El ser-IA NO tiene componente React**: hoy es `ser-ia.v3.html`, standalone de 13.4 MB con 9 imagenes en base64 inline; mandarlo asi reventaria el bundle. Requiere rebuild como componente + assets optimizados (WebP servidos, no base64). |
| **enjambre** (indicador 18 estados) | Dashboard de Mission Control (`src/app/(main)/dashboard`), mapeando estados a la cola `tareas` | Menos disputado (no es la landing publica de Elisa). YA tiene su componente React (`enjambre-binario.tsx` + `enjambre-engine.ts`); falta montarlo + `npm run dev` + Playwright. |

Cuando se retome: decidir ubicacion (con Elisa), y si va a la landing, primero reconstruir el ser-IA
como componente React con assets optimizados. Reglas del repo: kebab-case, PascalCase en componentes,
sin `any`, <500 lineas/archivo.
