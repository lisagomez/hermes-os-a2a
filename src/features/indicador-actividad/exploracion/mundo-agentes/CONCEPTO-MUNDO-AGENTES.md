# Nuestro mundo de agentes: concepto y lenguaje visual

> Exploracion de direccion (2026-07-19). El objetivo NO es "una oficina bonita": es que un observador
> LEA de un vistazo que estan haciendo los agentes, en la metafora familiar de una oficina. Nace de la
> critica de Johann a Pixel Agents (pixelagent.space): es tierno pero cuesta ver que hace cada agente,
> si trabaja y en que, cuanto lleva, si esta idle, que agente es (especialidad).

## META (el norte, por encima de toda la inspiracion de este documento)

**El objetivo final, sin ambiguedad (Johann, 2026-07-19):** que crear y administrar un agente sea
PRACTICO y AMIGABLE para TODA la familia, TODAS las edades, TODOS los gustos. La vara ya fijada en
el Principio rector se mantiene (un nino de 10 anios deberia poder) y se extiende: cubrir todos los
gustos con exactamente 2 versiones, no una por cada referencia mencionada en este doc:
- **Version practica/ligera** (tipo juego, el mundo casual pixel/cenital): simple, calida, sin
  curva de aprendizaje.
- **Version dura/hardcore** (el panel analitico tipo tmux/bolsa): datos densos, numeros, texto.

**Todo lo demas de este documento (Pixel Agents, AgentCraft, The Sims, Factorio, RimWorld, Oxygen
Not Included, Frostpunk, Manor Lords, Against the Storm, Europa Universalis IV, tmux, la bolsa de
valores) es INSPIRACION, no la meta.** Ninguno de esos juegos o herramientas se copia completo; cada
uno aporto UNA idea puntual (legibilidad, mapa=filesystem, escalera de autonomia, barras de
necesidad, vista de comandante...) que se adapta al objetivo de arriba. Regla de descarte: si una
idea de inspiracion compromete "facil para toda la familia" (ej. exige alfabetizacion de gamer), se
descarta, sin importar cuan buena sea en su juego original. Ya se aplico una vez (seccion "Principio
rector": se retracto el ciclo tipo RTS de AgentCraft por esta misma razon).

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

## Principio rector (2026-07-19, correccion de Johann): accesible a CUALQUIERA, el orquestador es el concierge

Corrige una desviacion real de esta exploracion: varias ideas tomadas de AgentCraft (ciclar entre
agentes con atajos, navegar submenus para un handoff) asumen un usuario GAMER. El publico de nuestro
producto es lo opuesto: la meta declarada es que CUALQUIERA cree y administre un agente sin saber
nada tecnico, ni siquiera alfabetizacion de videojuego (la vara: un nino de 10 anios deberia poder).
Tres decisiones que esto fija, no negociables:

1. **Metafora ganadora: oficina/ciudad, nunca un mapa de guerra tipo RTS.** No es gusto estetico: la
   gente ya sabe como funciona una oficina o una ciudad porque la vivio; leer un mapa de unidades
   estilo Warcraft es una alfabetizacion que no todos tienen. Ya lo habiamos sospechado (seccion
   AgentCraft, "riesgo de la metafora RTS pura"); esto lo confirma como no-negociable.

2. **El ORQUESTADOR es el concierge; el mundo visual es AMBIENTE, no la interfaz de trabajo.** El
   patron de AgentCraft "navega al mapa, entra al panel del agente, resuelve" es justo lo que hay
   que evitar. El default de interaccion es un solo chat con EL ORQUESTADOR, que:
   - FILTRA el ruido de los agentes y solo sube al humano lo que necesita una decision real.
   - REPORTA proactivamente ("este agente esta libre, ¿le asignas algo?", "este tiene una
     pregunta"): push, nunca que el humano tenga que ir a buscar quien necesita atencion.
   - Deja abierta la opcion de hablar directo con un agente especifico (drill-down), pero esa es
     la excepcion, no el camino principal.

   El mundo visual (oficina/ciudad 8-bit) sigue teniendo valor real: es la vista AMBIENTAL y de
   confianza (ver que los agentes trabajan, satisfaccion pasiva), y el lugar del drill-down
   OPCIONAL. Pero NUNCA es donde se decide/aprueba/asigna: eso vive en el chat con el orquestador.
   Riesgo a vigilar: si el mundo visual acumula botones de accion "por si acaso", se convierte en
   el mismo laberinto de submenus que se busca evitar.

   **Grounding (no duplica nada existente):** ya hay un `ChatWidget.tsx` en la landing de Elisa
   (`businessos/frontends/cliente-web2/src/features/landing/sections/ChatWidget.tsx`), pero es la
   demo PUBLICA de ventas ("Habla con la fabrica", para prospectos). El orquestador-concierge es
   otra cosa: vive DENTRO del producto (Mission Control), para el cliente ya activo gestionando SUS
   agentes. Es un componente nuevo, sin colision con lo que ya existe.

3. **El 8/16-bit no es solo estetica retro, es requisito de accesibilidad.** Correr liviano en
   navegador o celular sin drenar bateria es un objetivo declarado, no un efecto colateral del
   look. Refuerza (no cambia) lo ya decidido: Canvas 2D / sprites, vista cenital, sin isometrico ni
   3D (ver seccion siguiente).

**Que queda retractado de la seccion AgentCraft:** el "ciclo tipo RTS" (saltar entre agentes con
atajos de teclado) y cualquier navegacion por submenus quedan DESCARTADOS como patron de interaccion
primario. Se conservan como CAPACIDADES DE FONDO (heatmap de colisiones, mapa=filesystem, la
escalera de autonomia quest/campana/canal) que el ORQUESTADOR consume y resume, no que el humano
navega directamente.

## Dos superficies de visualizacion, un mismo dato (2026-07-19, Johann: Sims + tmux + bolsa)

**Referencia adicional que confirma la accesibilidad:** *The Sims* es otro management game que
CUALQUIERA conoce por experiencia propia, sin expertise (a diferencia de un RTS o un colony-sim
hardcore). Refuerza lo ya fijado en el Principio rector: metafora cotidiana por encima de
alfabetizacion de gamer.

**El mundo casual (pixel/cenital) no es la unica vista.** Se necesita una segunda superficie,
"vista de comandante", para el usuario TECNICO que prefiere datos/texto sobre personajes. Dos
referencias reales que Johann trae:

1. **tmux** (multiplexor de terminal): grid de paneles pequenos, cada uno una sesion en vivo, con
   zoom en 3 pasos: mosaico (glance) -> click expande ESE panel sobre los demas, foco -> boton para
   pantalla completa, interaccion directa. Pixel Agents ya tiene algo parecido (mostrar que hace
   cada agente), pero Johann lo califica de POCO PRACTICO: se conserva la idea del mosaico
   expandible en 3 pasos, no la ejecucion de Pixel Agents.
2. **Bolsa de valores** (ticker board): muchos recuadros a la vez, indicadores rapidos de
   sube/baja, para identificar el estado de TODOS de un vistazo sin entrar a ninguno.

**No confundir con lo que YA existe:** `OfficeSim.tsx` (Elisa) ya tiene un selector de TEMA
(dropdown "estilo") que cambia el SKIN de los personajes pixel, pero sigue siendo la MISMA vista de
mundo. Esto es distinto: no es cambiar el skin, es una SEGUNDA vista completa (modo analitico) que
renderiza el MISMO dato (los 18 estados F363 + la capa de telemetria ya definida) como dashboard,
no como personajes. Ambas vistas alimentan al mismo orquestador-concierge para la accion (seccion
anterior); solo difieren en como se GLANCEA el estado.

**Grounding de diseno** (consultada la skill `dataviz` antes de proponer, regla
`consultar-cerebro-antes-de-opinar`): cada mini-panel del mosaico es, en terminos de dataviz, un
STAT TILE (con sparkline de tendencia opcional: burn-rate de tokens, tareas completadas) mas que un
chart complejo. Reglas que aplican de una vez, sin reinventar:
- Los colores de ESTADO (idle/trabajando/esperando-gate/bloqueado) son colores de STATUS,
  reservados, nunca reusados para "categoria": el mismo vocabulario que ya fijamos en el Lenguaje
  Visual de Estados (ambar=pendiente, rojo=bloqueado, verde=confirmado). El panel analitico HEREDA
  esa paleta, no inventa una nueva.
- Un sparkline de tendencia sigue la regla "secuencial = un solo tono, claro a oscuro", nunca arcoiris.
- Cada tile necesita su propio hover/tooltip (un chart ES interactivo por defecto, regla dataviz).

**Interaccion en 3 pasos (mismo espiritu que el Principio rector: no repetir el error de submenus):**
1. **Mosaico:** grid completo, todos los agentes, un vistazo. Solo lectura, cero clicks para "ver
   que pasa".
2. **Foco:** click en un tile, se expande SOBRE los demas (overlay), sigues viendo el resto de
   reojo. Aqui vive interaccion ligera (leer el detalle, aprobar algo puntual).
3. **Pantalla completa:** boton explicito desde el foco, interaccion directa y completa con ESE
   agente. Equivale a "hablar directo con un agente especifico", ya definido como la EXCEPCION en
   el Principio rector, no el camino principal.

Esto es COMPLEMENTARIO al Principio rector, no lo contradice: el orquestador sigue siendo el canal
de ACCION por defecto (decidir/aprobar/asignar); el mosaico/bolsa es una forma alternativa de
GLANCE para quien prefiere datos densos sobre un mundo pixel-art. Las 2 vistas son un TOGGLE del
mismo dato, no dos productos distintos.

### Resumen: dos publicos, dos vistas

| | Mundo casual (pixel/cenital) | Panel analitico (tmux/bolsa) |
|---|---|---|
| Para quien | cualquiera, sin conocimiento tecnico | usuario tecnico, prefiere datos/texto |
| Referencia | Pixel Agents, oficina, The Sims | tmux (grid expandible), ticker de bolsa |
| Densidad | pocos elementos, calido, ambiental | muchos recuadros a la vez, denso, rapido |
| Accion | via orquestador-concierge (chat) | via orquestador-concierge; drill-down = foco->pantalla completa |
| Dato subyacente | el mismo: 18 estados F363 + telemetria | el mismo: 18 estados F363 + telemetria |

## Vista / cámara (nota para tener presente en el desarrollo)

**VISTA CENITAL** (top-down, cámara recta desde arriba) es la referencia de cámara para la oficina,
no isométrica. Verificado contra las 2 referencias reales que tenemos: el screenshot real de Pixel
Agents (`ref-pixelagents-oficina.jpg`, arriba en esta carpeta) es cenital recto; y el `OfficeSim.tsx`
que Elisa YA construyó (`businessos/frontends/cliente-web2/src/features/landing/sections/OfficeSim.tsx`)
posiciona todo por `left/top` en % sobre un plano, sin proyección isométrica real (aunque algunos de
los conceptos Nano Banana de esta carpeta pidieron "isometric" en el prompt: corregir eso en la
próxima ronda de generación, pidiendo explícitamente vista cenital/top-down, no isométrica).

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

## Referencia adicional: AgentCraft (Ido Salomon, 2026)

> Investigado 2026-07-19 (no visto animado: la pagina oficial se congelo al cargar, igual que
> pixelagent.space; hallazgos son de fuentes de texto, marcadas como tal, no de captura visual propia).

**Que es** [Ido Salomon, AgentCraft: RTS interface for agent orchestration, 2026](https://www.getagentcraft.com/):
plataforma de control centralizado que usa la estetica y mecanicas de un RTS (Real-Time Strategy, tipo
StarCraft/Warcraft) para orquestar agentes de codigo. Los AGENTES son UNIDADES en un MAPA; hay
"buildings" (edificios) para funcionalidades (gestion de skills, plugins), terminal y Git integrados,
y una "Alliance Hall" para coordinacion colaborativa entre varios desarrolladores. Soporta multiples
motores: Claude Code, OpenAI, OpenCode, Cursor (contenedores Docker aislados por agente). Charla de
referencia: [Ido Salomon, "AgentCraft: Putting the Orc in Agent Orchestration": GitNation, 2026](https://gitnation.com/contents/agentcraft-putting-the-orc-in-agent-orchestration).
Anuncio original: [@idosal1 en X, 2026](https://x.com/idosal1/status/2011124558976434469). Paquete:
[`@idosal/agentcraft` en npm](https://www.npmjs.com/package/@idosal/agentcraft) (v0.4.9 al momento de
esta nota).

**El problema que dice resolver** (relevante para nosotros): la capacidad HUMANA de gestionar agentes
es el cuello de botella, no la capacidad de los agentes; gestionar decenas/cientos de agentes necesita
mas que "lanzarlos a la fuerza". La apuesta de Salomon es aplicar lecciones de UX de gaming (RTS) a la
productividad, aprovechando la "memoria muscular RTS" de desarrolladores que ya jugaron estos juegos.

**Que podemos tomar (inspiracion, NO copiar 1:1):**
- **El agente como UNIDAD accionable, no solo observable.** Pixel Agents y AgentCraft muestran que
  trabaja el agente; AgentCraft ademas deja LANZAR/CONTROLAR unidades (crear, supervisar, terminar)
  desde la misma vista. Nuestro mundo hoy es solo-observacion; considerar si el "centro de mando" del
  OfficeSim (ya existe en el codigo de Elisa, panel lateral) deberia poder ACCIONAR (aprobar un gate,
  re-lanzar una tarea) directo desde ahi, no solo mostrar.
- **Vocabulario RTS para delegacion/costo:** "presupuesto"/"recursos" de un RTS mapea 1:1 a nuestro
  `token_usage` (dimension que YA identificamos como diferenciador vs Pixel Agents, ver seccion de
  arriba). AgentCraft no lo tiene documentado explicitamente; seria una ventaja nuestra si lo hacemos bien.
- **"Alliance Hall" (multi-usuario) es un concepto a futuro**, no hoy: nuestro escenario es Johann +
  Elisa viendo SUS agentes, no un equipo grande coordinando en vivo. Anotar como backlog, no construir.
- **Riesgo de la metafora RTS pura (vs la nuestra de oficina):** unidades-en-mapa-de-guerra comunica
  "control/comando" (frio, tactico); oficina-con-personajes comunica "equipo trabajando para ti"
  (calido, el mismo hueco que identificamos en Pixel Agents). Para un producto de VENTA (landing de
  Elisa) la oficina calida sigue siendo mas fuerte para conversion que un mapa de guerra; el vocabulario
  RTS (unidades, recursos, comando) es mejor prestado como METAFORA DE INTERACCION (que puedes HACER)
  que como ESTETICA VISUAL (como se VE).

## AgentCraft, la charla completa: mecanicas concretas (sintesis, no transcripcion)

> Fuente: [Ido Salomon, "AgentCraft: Putting the Orc in Orchestration", AI Engineer (charla, 2026-04-25)](https://www.youtube.com/watch?v=kR64LOqBBCU),
> 11:18 min. Visto vía transcript (subtitulos descargados con el pipeline `ver-video`, yt-dlp
> `--write-auto-sub`). Sintesis funcional de las mecanicas mostradas en la demo, no cita textual.

Mecanicas que muestra la demo (funcionales, no visuales, ya que no pude ver el sitio animado):

1. **El mapa ES el sistema de archivos.** Cada carpeta del proyecto es una zona del mapa; cada
   archivo es una "habitacion". Ver en que archivo trabaja un agente, el diff completo de esa
   sesion, y el LINAJE (que agente hizo que y cuando) es literal, no una lista aparte.
2. **Heatmap de colisiones.** Como sabe que archivo toca cada agente, puede pintar un mapa de calor
   de colisiones (dos agentes en el mismo archivo) y prevenirlas antes de que pasen.
3. **Ciclo tipo RTS (hotkey entre unidades):** saltar rapido entre los agentes que necesitan tu
   atencion (aprobar un plan, responder una pregunta), como ciclar entre unidades en un RTS.
4. **La escalera de autonomia (el hallazgo mas fuerte de la charla).** Salomon describe 3 escalones
   para sacarse a si mismo de la ecuacion progresivamente:
   - **Quests auto-generadas:** el agente propone que hacer (encuentra su propio trabajo), el
     humano solo aprueba con un clic.
   - **Campanas (containers aislados):** una meta amplia se delega a un "orquestador de campana"
     que descompone, planea y PRESENTA EL PLAN; el humano revisa el plan, no la ejecucion paso a
     paso. El esfuerzo humano se mueve de "supervisar" a "planear + revisar".
   - **Canales autonomos (cron/trigger):** una direccion se fija UNA vez (ej. "revisa X fuente
     cada dia y actua"), sin relanzar cada vez.
5. **Bundles de revision:** cuando varios agentes producen resultados en paralelo, una vista de
   revision por lotes (diff + motivo/tarea + evidencia visual) para no gastar tiempo entrando
   uno por uno.
6. **Colaboracion suave (soft collaboration):** un chat compartido humano-humano Y humano-agente
   donde un agente anuncia "estoy trabajando en X" para que otros (humanos o agentes) no dupliquen
   esfuerzo, ademas del handoff explicito.

**Que ya teniamos cubierto vs que es nuevo para nosotros:**
- Mapa=filesystem, colisiones, linaje → confirma y refuerza nuestra "Capa de telemetria" (linaje ya
  esta en el spec); el HEATMAP de colisiones es una idea nueva, no la teniamos.
- La escalera de autonomia (quest→campana→canal) mapea directo a nuestra arquitectura real:
  quest=tarea suelta, campana=coordinador→ejecutores (YA construida en el trio/enjambre), canal=cron
  autonomo (tenemos crons de Hermes). Vale la pena visualizarla como una progresion EXPLICITA en el
  mundo (3 "modos" de una tarea), no solo como arquitectura de backend invisible.
- Bundles de revision con evidencia visual: nueva idea util, sobre todo si el "centro de mando" del
  OfficeSim se vuelve accionable (ver seccion anterior).

## Sintesis: juegos de gestion de recursos, ideas para agentes

> A peticion de Johann: extraer mecanicas de management games conocidos (no investigados con fuente
> primaria esta ronda, es conocimiento general del genero; profundizar con captura real si alguna
> mecanica concreta se decide construir).

| Genero / juegos | Mecanica clave | Adaptacion a nuestro mundo de agentes |
|---|---|---|
| **Fabricas/automatizacion** (Factorio, Satisfactory, Captain of Industry) | Cadena de montaje: el item viaja por una banda a traves de ESTACIONES; alertas de "banda atascada" cuando un paso no da abasto | Una TAREA viaja por estaciones visibles (planear→codear→verificar→desplegar) como el ITEM en la banda, no solo un estado en el escritorio del agente. Alerta visual cuando una estacion (ej. verificacion) se atasca = cuello de botella real del sistema |
| **Colonias/supervivencia** (RimWorld, Oxygen Not Included, Frostpunk) | Panel de NECESIDADES/animo por colono (barras: descanso, comida, alegria); tablero de PRIORIDAD de trabajo (que colono hace que tarea, por prioridad 1-4); medidores de crisis a nivel CIUDAD (esperanza, descontento) | (a) Barra de "salud" compacta por agente (reintentos, bloqueos, presupuesto) tipo panel de colono; (b) tablero de PRIORIDAD/ESPECIALIDAD: Johann asigna que tipo de tarea prefiere cada agente, accionable, no solo informativo (idea que tambien pide AgentCraft: poder actuar, no solo mirar); (c) un DASHBOARD GLOBAL (no por agente) tipo Frostpunk: salud del enjambre completo (cola pendiente, quema de presupuesto, bloqueados), la vista "como va todo" de un vistazo |
| **Tuberias/redes** (Oxygen Not Included) | Se ve LITERALMENTE el flujo de gas/liquido viajando por tuberias | Ya lo tenemos disenado (negociar-A2A: paquete de bits viajando por una linea de luz entre agentes): ONI lo confirma como patron probado y fuerte, no hace falta cambiar nada |
| **Medieval/imperios** (Manor Lords, Against the Storm, Europa Universalis IV) | Manor Lords: la cadena de produccion se ve EN el edificio mismo, sin menu aparte; Against the Storm: presion de tiempo narrativa (la tormenta se acerca); EU4: mapa de PROVINCIAS coloreadas por dueño | (a) El escritorio YA es "el edificio con su cadena visible" (telemetria en el propio escritorio, coherente con Manor Lords); (b) presion de tiempo visual para una campana con deadline (una barra que se acerca, no solo un timer numerico); (c) EXTENDER la idea de AgentCraft "mapa=filesystem" con COLOR DE PROPIEDAD tipo EU4: que agente es dueno/responsable de que carpeta/feature, coloreado en el mapa |

**Recomendacion de direccion (no solo lista de ideas):** de los 3 grupos, **colonia/supervivencia
(RimWorld/ONI/Frostpunk) encaja MEJOR que RTS puro** con lo que ya definimos (oficina calida, 8-bit,
vista cenital, "equipo que cuidas" vs "tropas que comandas"). Una colonia se NUTRE, un ejercito se
COMANDA: la primera metafora es mas coherente con la calidez que ya identificamos como ventaja
sobre AgentCraft. Tomar de AgentCraft el INFO-ARCHITECTURE (mapa=filesystem, escalera de autonomia,
bundles de revision) y de colonia-sim el LENGUAJE DE CUIDADO (barras de salud, prioridades, panel
de crisis), ambos renderizados en el 8-bit vista-cenital ya establecido.

## Pendiente / proximos pasos

- Aterrizar los 8 agentes A2A reales (VENDO-1/FLUJO-7/ORACULO/LEDGER-X/MUSA-3/EMPATIA-2/CUSTODIO/TESORO)
  con su escritorio y especialidad, no genericos.
- Anatomia de UN agente (close-up) con TODAS las capas legibles juntas.
- Mas escenas de comportamiento (cafe/reunion/error/celebra).
- Decidir con Elisa: entra como TEMA nuevo en su sistema de temas de OfficeSim (aditivo, no reemplazo).
- Implementacion real = sprite sheet + logica de estado mapeada a `tareas`/`token_usage`/gates (dato real).
