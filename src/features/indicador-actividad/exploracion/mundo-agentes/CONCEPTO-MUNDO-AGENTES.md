# Nuestro mundo de agentes: concepto y lenguaje visual

> Exploracion de direccion (2026-07-19). El objetivo NO es "una oficina bonita": es que un observador
> LEA de un vistazo que estan haciendo los agentes, en la metafora familiar de una oficina. Nace de la
> critica de Johann a Pixel Agents (pixelagent.space): es tierno pero cuesta ver que hace cada agente,
> si trabaja y en que, cuanto lleva, si esta idle, que agente es (especialidad).

## Tesis: legibilidad operativa (el hueco de Pixel Agents)

Pixel Agents resolvio la **visibilidad tierna** (agentes como coworkers en una oficina acogedora). El
hueco es la **legibilidad operativa**: quien, que, cuanto lleva, esperando que, costando cuanto,
pasandole a quien. Ahi construimos nuestro mundo. Dos ventajas que ellos no tienen:
1. **Ya hicimos la investigacion** de como comunicar actividad de agente: F363,
   `cerebro-investigacion/temas/estados-actividad-agente-enjambre.md` (18 estados, senal = movimiento +
   color, regla de dos ejes, ambar = pendiente, nunca solo-color, reduced-motion).
2. **Tenemos el dato REAL**: la cola `tareas`, `token_usage` (costo), los gates del supervisor. La
   oficina mapea a datos reales de nuestro enjambre, no es cosmetica. Pixel Agents lee logs de Claude
   Code; nosotros leemos el estado real del sistema a2a.

## Las 6 preguntas del observador

| Pregunta | Pixel Agents (hueco) | Nuestro mundo | Fuente |
|---|---|---|---|
| Que agente / especialidad | sprites humanos genericos | los 8 agentes A2A con identidad + ICONO de especialidad + rol + ojos ambar | ser-ia.v3 |
| Trabaja o idle | ambiguo (Anthropic lo tiene abierto: issue #43951, no distingue "esperandote" de "trabajando") | estados con movimiento+color distinto; idle=reposo calmado; gate="te espera"=ambar inequivoco | F363 |
| En QUE trabaja | burbuja de log crudo (ruido) | el estado dice el TIPO (leer/escribir/construir/buscar/verificar) + rotulo de asunto corto | F363 (18 estados) |
| Cuanto lleva / que ha hecho | no hay | timer de elapsed + barra/%/contador de progreso + mini-historial | enjambre v4 |
| Como interactuan | NPCs independientes | A2A real: handoff, negociar-A2A, coordinador->ejecutores, red de colaboracion | F363 + arquitectura trio |
| Como descansan | idle plano | reposo del ser-IA (respira, se apaga suave, va al lounge); distinto de bloqueado | ser-IA |

## Dimensiones que Pixel Agents NO muestra y nosotros SI (tenemos el dato)

- **Salud:** bloqueado (rojo), reintentando (ambar->verde).
- **Costo/presupuesto por agente** (`token_usage`): medidor de tokens gastados vs presupuesto. Clave
  para el valor de a2a (costo controlado).
- **Gate humano:** aprobacion pendiente (ambar) = el momento human-in-the-loop.
- **Linaje/handoff:** que agente delego en cual (coordinador->ejecutor, padre->hija).
- **Desenlace:** desplegado / confirmado / fallo.

## LENGUAJE VISUAL DE ESTADOS (el core)

Traduccion del vocabulario F363 (enjambre abstracto) a la metafora de oficina: la senal viene de la
POSE/ACCION del personaje + COLOR + un BADGE de estado (color+glyph, nunca solo color) + un CUE en la
pantalla/escritorio. Se respetan las reglas F363: dos ejes de distincion, ambar reservado a "pendiente",
never-solo-color (accesibilidad), reduced-motion = pose estatica (no congelar), sobriedad en el exito.

### Base / pasivo
| Estado | Personaje (pose/accion) | Color | Badge | Cue pantalla/escritorio |
|---|---|---|---|---|
| **Idle / reposo** | recostado, respira, o en el lounge/cafe | gris tenue | ● gris | pantalla atenuada, lampara baja |
| **Esperando gate (TE ESPERA)** | vuelto hacia TI / mano levantada, halo que pulsa | **ambar** | ◐ ambar pulsante | prompt de aprobacion en pantalla |

> Idle vs Esperando es la distincion #1 (la que Anthropic tiene rota): idle = gris calmado y quieto;
> esperando = ambar que pulsa y busca tu atencion. Nunca se confunden.

### Cognicion
| Pensando | burbuja de bits sobre la cabeza, converge/diverge | violeta | ✳ violeta | shimmer en pantalla |

### Manejo de datos (los 3 difieren en DOS ejes, no solo color)
| Leyendo | escanea un documento, barrido lineal | violeta+magenta | glyph doc | scan-line horizontal en el monitor |
| Recolectando | jala items de varias direcciones al escritorio | magenta | glyph inbound | varios entrantes convergiendo |
| Buscando web | mira un sonar/radar en pantalla | azul frio | glyph radar | barrido radar + blips (diseno v4) |

### Produccion
| Escribiendo | teclea, cursor vivo | base + cursor magenta | glyph cursor | texto que fluye izq->der con cursor parpadeante |
| Construyendo | ensambla bloques que se apilan | base + magenta | glyph bloques | apilado vertical en pantalla |

### Limpieza / verificacion
| Limpiando | ordena bits corruptos in-place | rojo(sucio)->verde | glyph escoba | glitch que resuelve a orden |
| Verificando | pasa un escaner tipo codigo de barras | verde/ambar | glyph check-scan | onda de escaneo tinendo verde/ambar (diseno v4) |

### Colaboracion A2A (nuestro diferenciador)
| Negociando A2A | dos agentes intercambian un paquete de bits por una linea de luz (bidireccional) | violeta+cian | glyph a2a | flecha de handoff con bits 0/1 |
| Enrutando/decidiendo | elige entre 2-3 ramas que compiten en brillo hasta que una gana | magenta | glyph bifurcacion | ramas que se encienden |
| Llamando herramienta | engranaje-de-bits girando en el sitio, sin desplazarse | cian | glyph tool | nucleo compacto girando |

### Reintento / bloqueo / desenlace
| Reintentando | colapsa y rebota en bucle | ambar->verde | glyph loop | contraccion-expansion |
| **Bloqueado** | atascado, barrera/X, un shake unico | **rojo** | ✕ rojo | error en pantalla |
| Confirmado | pequena celebracion, un check que condensa (sobriedad, sin confeti) | verde | ✓ verde | check en pantalla |
| Desplegando | columna/cohete que sube del escritorio | verde(exito)/rojo(fallo) | glyph deploy | asciende y se dispersa (exito) o cae (fallo); diseno v4 |
| Transmitiendo | goteo constante de bits del escritorio a una salida, cursor vivo | blanco hueso | glyph stream | flujo con cursor en la salida (diseno v4) |

### Capa de telemetria (siempre visible, cross-cutting)
- **Identidad:** chip con nombre + ICONO de especialidad sobre la cabeza + ojos ambar; color por agente.
- **Progreso:** anillo/barra en el borde del escritorio (%/contador de pasos).
- **Elapsed:** chip de tiempo ("2m14s").
- **Costo:** medidor de tokens gastado vs presupuesto (moneda/barra).
- **Linaje:** linea fina al agente padre (coordinador->ejecutor).

## Conceptos generados (Nano Banana, esta carpeta)

| Archivo | Que es | Veredicto |
|---|---|---|
| `ref-pixelagents-oficina.jpg` | Screenshot REAL de Pixel Agents (tema madera calido) | referencia |
| `ref-pixelagents-personajes.png` | Set de personajes REAL (humanos pixel) | referencia |
| `c1-calido.png` | Fusion calido/fiel (madera, humanos) | tierno pero poco diferenciado (parece copia) |
| `c2-darkpremium.png` | Dark premium (linea de Elisa elevada) | apuesta segura, coherente con lo desplegado |
| `c3-bits-neon.png` | Criaturas oscuras de bits 0/1 (mi 1a direccion) | frio, pierde el encanto |
| `cB-personaje-bits.png` | Personaje ser-IA hecho de bits | util para identidad, no para la escena |
| `c4-mejorado.png` | Warm-premium + mascotas ojos ambar + red global + cockpit | el mas branded/diferenciado |
| `c5-interaccion.png` | Colaboracion A2A + estados legibles (delegacion, handoff, descanso) | **el que mejor demuestra la tesis** (legibilidad + A2A) |

## Pendiente / proximos pasos

- Aterrizar los 8 agentes A2A reales (VENDO-1/FLUJO-7/ORACULO/LEDGER-X/MUSA-3/EMPATIA-2/CUSTODIO/TESORO)
  con su escritorio y especialidad, no genericos.
- Anatomia de UN agente (close-up) con TODAS las capas legibles juntas.
- Mas escenas de comportamiento (cafe/reunion/error/celebra).
- Decidir con Elisa: entra como TEMA nuevo en su sistema de temas de OfficeSim (aditivo, no reemplazo).
- Implementacion real = sprite sheet + logica de estado mapeada a `tareas`/`token_usage`/gates (dato real).
