# PRP (borrador) — Frontend Web2 (humanos) + Web3 (agentes) · Hermes OS · A2A

> **Estado:** borrador de planeacion (pre-PRP). No es el PRP final: falta pasarlo por la skill
> `prp` del repo para normalizarlo al formato de `.claude/PRPs/`, y falta cerrar 1 decision
> bloqueante (cadena/L2) + reconciliar contra el codigo real (`src/`, `SOUL.md`, contratos).
>
> **Alcance de este documento:** producido solo a partir de `kickoff-frontend-web2-web3.md`.
> No hubo acceso al repo. Todo lo que aqui se afirma sobre codigo existente es **supuesto
> declarado**, marcado con `[SUPUESTO]`, y debe verificarse antes de ejecutar.
>
> **Metodo aplicado:** ruteo por blast radius + estampado dificultad/modelo por tarea
> (seccion 3.5 del brief) + un pase adversarial (red-team) con reconciliacion escrita
> (seccion 10 del brief). El pase adversarial esta en el §8 de este documento.

---

## 1. Objetivo en una frase

Extender el dashboard "Mission Control" (Next.js, `src/`) con un canal agentico Web3 que
**visualiza** la actividad A2A (cards de agentes, reputacion, estado de contratos) en modo solo
lectura desde el dia 1, dejando **construido pero apagado** todo el cableado transaccional, y
**un unico gate humano** en el punto exacto donde algo mueve valor real.

## 2. Los tres tiers de alcance (leer con cuidado: es lo que mas se malinterpreta)

Todo workstream de este PRP pertenece a exactamente uno de estos tres tiers. Si una tarea no
encaja limpio en un tier, **sube de tier** (mismo criterio que "empate -> sube de clase").

| Tier | Que es | Se despliega en prod? | Puede mover valor? |
|---|---|---|---|
| **T1 — SHIP** | Solo lectura / visualizacion. Cards, reputacion, estado de contratos. | **Si, ahora.** | **No. Cero.** |
| **T2 — CABLEADO** | Todo el wiring transaccional: esquema de datos, interfaces/ABIs, integracion Farcaster/X, logica de reputacion, eleccion de cadena. Completo y listo para conectar. | Detras de feature flag, con adapters mockeados. **No se ejercita en prod.** | No (esta apagado). |
| **T3 — GATE** | El punto exacto donde algo mueve valor real o ejecuta un contrato en vivo. | Solo tras autorizacion humana explicita. | **Si, y solo aqui.** |

**Mecanismo del gate (T3), recomendado por el brief, no reinventar:** Account Abstraction
(ERC-4337) con "sesiones de agente": el humano autoriza un umbral de gasto + una ventana de
tiempo (ej. 24h). Dentro de eso el agente opera solo; fuera de eso, no.

### 2.1 Regla de oro del T1 (correccion al brief — ver §8, objecion A)

**El T1 NO debe depender de que ERC-6551 / ERC-4337 / Safe esten desplegados.** Visualizar cards
y reputacion es leer datos y renderizarlos; no requiere identidad on-chain tokenizada ni cuentas
de agente en vivo. El T1 se alimenta de una **capa de lectura** (indexer / read-model) que el dia
1 puede estar respaldada por datos off-chain o por lo que ya exista en el sistema, y que **despues**
se re-apunta a las fuentes on-chain sin cambiar la UI. Esto mantiene la infra cripto bleeding-edge
fuera de la ruta critica del ship.

## 3. Contexto y estado actual `[SUPUESTO — verificar contra repo]`

- Mission Control existe: Next.js, Fase 4 cerrada = auth + 3 vistas read-only (AI Spend, Grafo,
  Pantheon). El canal humano **se extiende**, no se recrea.
- Protocolo A2A ya vive parcial: `grafo-a2a`, `ventas-a2a`, `ejecutor-a2a`, `supervisor-a2a`,
  `coordinador-a2a`.
- Cada vertical/departamento ya tiene un `SOUL.md` (fuente de la "personalidad" de cada agente
  para las cards; no inventar contenido nuevo).
- Rename "Hermes OS · A2A" ya mergeado (PR #30).

**Accion previa obligatoria antes de ejecutar:** un agente (Sonnet `med`, lectura pesada a
destilado) lee `README.md`, `BUSINESS_LOGIC.md`, `businessos/ROADMAP.md`, la estructura de `src/`
y un `SOUL.md` de ejemplo, y produce un anexo que confirme o corrija cada `[SUPUESTO]` de este PRP.

## 4. Decision de diseno cerrada (no re-litigar)

Paleta "The Neural Nexus" (aprobada por votacion):

| Rol | Hex |
|---|---|
| Fondo principal (negro carbon mate) | `#121214` |
| Dominante (cyber purple) | `#7C3AED` |
| Acento de red (magenta) | `#EC4899` |
| Texto/detalles (gris platino) | `#E5E7EB` |

## 5. A2A Cards — estructura (T1) y tratamiento visual (guia, no spec rigida)

**Estructura de datos de la card (T1, solo lectura):**

- **Codigo + expertise + nodo:** formato `LEG-014` (prefijo depto + numero), ligado a la identidad
  on-chain del agente (ERC-6551 en T2) y a su posicion en el grafo.
- **Nivel:** tier de autonomia (mas nivel -> mas presupuesto/aprobacion para "invocarlo").
- **Descripcion:** personalidad, tomada del `SOUL.md`, no inventar.
- **Habilidad vs Ataque:** ESTA es la linea T1/T3. *Habilidad* = pasiva, sin costo, no dispara el
  gate. *Ataque* = activa, con costo de gas explicito, la que puede mover valor real (T3). **No
  inventar una tercera categoria**; reusar exactamente esta linea.
- **Fortaleza / Debilidad:** honestidad sobre historial (ej. "debil fuera de jurisdiccion MX").
  Coherente con el principio del roadmap: citar fuentes, verificar antes de confiar, no inventar.
  Ver §8 objecion E (problema de reputacion en frio).

**Tratamiento visual (destilado de `impeccable` + `ui-ux-pro-max-skill`):**

- Imagen del agente full-bleed cubriendo el fondo; figura central en zona focal (centro / centro-
  superior); bordes se desvanecen.
- Scrim/degradado deliberado (patron "Photo-Based": imagen + overlay sutil + texto encima), no
  transparencia improvisada.
- Zona segura: contenido critico dentro del 80% central. Contraste minimo **AA 4.5:1**, probado a
  tamano reducido.
- **Anti-patron a evitar:** grillas de cards identicas (icono + titulo + texto clonado). Variar el
  tratamiento entre cartas.
- El arte final se genera DESPUES con la skill `image-generation` (OpenRouter + Gemini). Este PRP
  solo fija el layout/estructura que ese arte debe respetar.

### 5.1 Micro-estados y componentes (incorpora la guia "Neural Nexus")

Mapeo de color/animacion por estado (T1 muestra; T3 inicia):

- **Tx Enviada:** pulso sutil en violeta `#7C3AED`.
- **Tx Pendiente / Mining:** linea de conexion fluida y parpadeante en magenta `#EC4899`.
- **Tx Confirmada / On-chain:** brillo estatico y estado activo permanente.
- **Medidor de gas/presupuesto:** barra en violeta que se degrada con los fondos + **alerta de
  recarga** cuando el agente necesita top-up (si no, sus tareas se detienen en cadena). Estado nuevo
  respecto al kickoff.
- **Red incorrecta (solo superficie agentica, W1):** alerta en magenta indicando cambio de red.

### 5.2 Visualizacion de la red A2A (hub neural)

Direccion visual adoptada del mockup: **nucleo del agente al centro, con aristas radiando a los
nodos pares** (representa la red A2A / el grafo). Encaja con el campo "nodo de conexion / posicion
en la red" de la card (§5). Es la vista de red, no la card individual: una alimenta a la otra.
Nota: el mockup es generado por IA y trae texto de relleno alucinado ("Moon core", "Nosk", etc.);
se toma como inspiracion de layout/mood, **no como spec de campos**.

### 5.3 Guardrails de diseno (NO regresar — el material previo los re-abre)

La guia "Neural Nexus" reintroduce, en silencio, tres decisiones que el pase adversarial (§8) ya
cerro. Se dejan explicitas para que no se cuelen en la ejecucion:

1. **Reputacion nunca hard-coded.** El mockup muestra "98%" el dia 1; eso es historial inventado
   (obj. E). La reputacion se deriva del read-model o se muestra el estado "historial insuficiente".
   Prohibido un numero de relleno.
2. **No reemplazar el login humano por wallet-only.** El doc dice "sustituir el boton clasico de
   inicio de sesion" por wallet (obj. D). El auth del Mission Control humano se conserva; SIWE vive
   en la superficie agentica y para autorizar sesiones (T3).
3. **No anunciar "Certificado DID/ERC-6551 - Verificado" como badge en vivo en T1.** Implica infra
   de identidad encendida el dia 1, contra el split T1/T2. La card muestra identidad desde el
   read-model, agnostica del backend; el badge on-chain solo cuando la fuente on-chain este viva.
4. **La cadena no se hereda de una maqueta.** El mockup dice "Red Polygon"; sigue siendo la decision
   bloqueante del §7 (default recomendado: Base, pendiente de checklist). No fijar por imagen.

## 6. Piezas tecnicas por tier

| Pieza | Tier | Nota |
|---|---|---|
| **Auth wallet (SIWE)** | T2/T3 | **Ver §8 objecion D.** SIWE es para la superficie agentica y para que un humano *autorice sesiones*. NO reemplazar el auth humano ya existente del dashboard (Fase 4). |
| Estados tx (Enviada -> Pendiente -> Confirmada) | T1 muestra / T3 inicia | El *display* de txs ya ocurridas (leidas del explorador) es T1. La *iniciacion* es T3. |
| Medidor de gas / presupuesto por agente | T1 muestra / T3 aplica | Barra de "combustible restante" como lectura en T1; el enforcement del umbral de sesion es T3. |
| Libreria de estado de cadena (wagmi / viem / ethers) | T1 (reads) + T2/T3 | Recomendado **viem + wagmi** (viem como capa base, wagmi para hooks de React). ethers.js solo si el codigo existente ya lo usa `[SUPUESTO]`. |
| Verificabilidad (link a explorador + txHash) | T1 | Nunca "confiar" en que el agente hizo su trabajo; siempre enlazar la prueba on-chain. |
| Identidad del agente (ERC-6551 / DID) | T2 | Bleeding-edge para agentes (ver §8 obj. A/E). Construir el modelo + adapter en T2; en T1 la card lee identidad de la capa de lectura, agnostica del backend. |
| Cuentas multisig (Safe) con umbrales | T2/T3 | Preaprobados por el humano. |
| **Cadena / L2** | **DECISION ABIERTA — bloquea T2/T3** | Ver §7. |

## 7. Decision abierta y bloqueante: cadena / L2

El brief la deja explicitamente sin cerrar ("preguntarlo antes de fijarlo en el PRP"). **Verifique
el estado actual y el supuesto del brief cambio de forma relevante:**

- La justificacion del brief ("Base porque Farcaster corre sobre Base") es hoy **imprecisa**: la
  *identidad* de Farcaster esta anclada en **Optimism**, no en Base; Farcaster paso a ser
  **multi-cadena** (Base, OP, Arbitrum, Polygon, Solana, BNB, etc.), Neynar adquirio el protocolo
  (ene-2026), y Base anuncio **migracion fuera del OP Stack** (feb-2026) mas la remocion del feed
  Farcaster en la Base App. O sea: el acoplamiento "1 chain = Farcaster" se diluyo.
- **Base sigue siendo un default razonable**, pero por otras razones mas solidas: mayor ecosistema
  y liquidez L2, USDC nativo, mejor tooling de AA/paymaster, distribucion Coinbase. **Recomiendo
  Base como default**, pero por *estos* motivos, no por el de Farcaster.
- **ERC-6551** es usable hoy (registry canonico, direcciones deterministas) pero para *identidad de
  agentes* sigue siendo caso de uso emergente, soporte de wallets aun delgado, y el EIP no esta
  plenamente finalizado. Refuerza la regla de oro del §2.1: no colgar el T1 de esta pieza.

**Que confirmar con el equipo antes de fijar (checklist de dependencias por cadena elegida):**
1. Bundler + paymaster ERC-4337 disponibles y estables en esa cadena.
2. Registry ERC-6551 desplegado + tooling (Tokenbound u otro) en esa cadena.
3. Safe desplegado en esa cadena.
4. Explorador de bloques con API estable para los links de verificabilidad (T1).
5. Si Farcaster/X importa para reputacion/identidad: en que cadena viven esos contratos hoy
   (Farcaster identity = Optimism) y si eso obliga a un setup multi-cadena.
6. Impacto de la migracion de Base fuera del OP Stack sobre el tooling elegido (si se elige Base).

## 8. Pase adversarial (red-team) + reconciliacion

> Ataque directo al plan (rol sub-director). Cada objecion se marca: **refutada / aceptada /
> mitigada**, con la decision del director por escrito.

**Objecion A — "Construir pero no encender" invita a codigo muerto que se pudre.**
ABIs/adapters escritos contra una cadena sin confirmar y flujos nunca ejercidos derivan de la
realidad para cuando se enciendan. *Peor:* el ship read-only NO necesita ERC-6551/4337/Safe, pero
el brief los mezcla en la misma cola.
→ **ACEPTADA.** Correccion incorporada como §2.1: el T1 se desacopla por completo de la infra AA/
identidad, se alimenta de una capa de lectura re-apuntable. El T2 se limita a **esquema + interfaces
tipadas + adapters mockeados detras de flag**, no pipelines transaccionales completos sin poder
integration-testearlos end-to-end. Regla: nada entra a T2 si no se puede al menos type-check + mock-
test; lo que no, espera a que la cadena este fija.

**Objecion B — Sobre-ingenieria del slice que se envia.**
ERC-6551 + ERC-4337 + Safe + NFT dinamico es demasiada superficie bleeding-edge para un ship de
solo lectura.
→ **MITIGADA.** El ship (T1) queda con: capa de lectura, render de cards, links a explorador,
displays de estado. Cero AA en la ruta critica. La infra pesada vive en T2/T3, aislada.

**Objecion C — La cadena cascadea.**
Elegir cadena no es cosmetico: condiciona disponibilidad de registry 6551, bundler/paymaster 4337,
Safe, explorador y UX de gas. Fijarla "por Farcaster" era fragil (ver §7).
→ **ACEPTADA.** La cadena es decision bloqueante de T2/T3 con checklist de 6 dependencias (§7). El
T1 se disena agnostico de cadena para no quedar rehen de ella.

**Objecion D — SIWE wallet-only contradice "los humanos se quedan en Web2".**
El brief justifica el canal humano en Web2 *porque* las wallets son antinaturales para humanos; a
la vez pide auth wallet-based (SIWE). Forzar SIWE en el dashboard humano es una regresion de UX y
rompe el auth de la Fase 4 que ya funciona.
→ **ACEPTADA.** SIWE se restringe a: (a) la superficie agentica Web3 y (b) el momento puntual en
que un humano *autoriza una sesion de agente* (T3). El login del Mission Control humano **conserva
su auth actual** `[SUPUESTO: Fase 4 ya lo tiene]`. Verificar contra repo.

**Objecion E — Reputacion en frio.**
El dia 1 nada movio valor: ¿de donde sale la reputacion on-chain que muestran las cards? El
principio de honestidad del roadmap (no inventar, citar fuentes) choca con no tener historial.
→ **ACEPTADA.** Se disena explicitamente un estado "historial insuficiente" como ciudadano de
primera clase de la card (no un placeholder inventado). Fortaleza/Debilidad muestran "sin datos
suficientes todavia" cuando corresponda. Se define la procedencia de cada dato de reputacion en el
read-model antes de renderizarlo.

**Objecion F — Se planea sin el repo.**
Reusar `SOUL.md`, vistas y auth existentes son supuestos; el PRP puede contradecir el codigo real.
→ **MITIGADA.** Todo supuesto va marcado `[SUPUESTO]` y hay una tarea de reconciliacion previa
obligatoria (§3, ultima linea) antes de ejecutar cualquier cosa.

**Objecion G — Urgencia manufacturada.**
"Fable sale de disponibilidad el 12-jul, usar pronto" presiona a saltar la confirmacion de cadena.
→ **MITIGADA.** La urgencia no exime la decision bloqueante. Se puede *arrancar T1* (agnostico de
cadena) sin esperar; T2/T3 no arrancan hasta cerrar §7. Asi la urgencia no compromete lo
irreversible.

**Veredicto del director:** plan viable con las correcciones A–G incorporadas. El cambio estructural
principal vs el brief: **desacoplar el T1 de toda la infra AA/identidad** y **no tocar el auth
humano existente**. Queda 1 decision bloqueante (cadena) y 1 tarea de reconciliacion contra repo
antes de ejecutar T2/T3.

## 9. Desglose de tareas con ruteo (dificultad / modelo / esfuerzo)

> Formato por unidad (seccion 3.5 del brief). "Auto-check": si el modelo real es mas debil que el
> recomendado, avisar antes de proceder. Orden: **contratos/interfaces primero (secuencial),
> implementaciones despues (paralelo)**.

### Fase 0 — Reconciliacion (antes que nada)
- **R0. Leer repo y confirmar supuestos.** Dificultad: Estandar · Ejecutar con: **Sonnet 5 `med`** ·
  Por que: lectura pesada a destilado, verificable contra archivos. Salida: anexo que valida/corrige
  cada `[SUPUESTO]`.

### Fase 1 — Contratos e interfaces (secuencial, bloquea lo demas)
- **C1. Definir el read-model de la A2A Card + estados (incl. "historial insuficiente").**
  Dificultad: **Delicada** · **Opus 4.8 `high`** · Por que: es el contrato que consume toda la UI T1;
  side-cases no obvios (reputacion en frio, obj. E). Auto-check activo.
- **C2. Definir interfaces/ABIs del modo transaccional (esquema T2, sin implementar).**
  Dificultad: **Delicada** · **Opus 4.8 `high`** · Por que: toca contratos entre modulos y define el
  borde T2/T3; dificil de revertir despues.
- **C3. Definir la frontera del gate humano (interfaz de "sesion de agente" ERC-4337).**
  Dificultad: **Delicada** · **Opus 4.8 `high->xhigh`** · Por que: es el punto que mueve valor; error
  aqui es caro e irreversible. Debate adversarial obligatorio antes de aprobar.
  **Spec de UX ya cerrada:** ver `PUENTE-factory-design-vs-prp.md` §8 (principios, ciclo de vida de
  4 salidas, anatomia de pantallas). C3 la traduce a contrato tecnico; no re-disenar la UX.

### Fase 2 — Implementacion T1 (paralelo tras Fase 1; archivos disjuntos)
- **U1. Capa de lectura / adapter agnostico de cadena que sirve el read-model C1.**
  Dificultad: Estandar · **Sonnet 5 `med`** · Por que: bien especificado por C1, verificable.
- **U2. Componente A2A Card (layout full-bleed, scrim, zona segura, AA 4.5:1).**
  Dificultad: Estandar · **Sonnet 5 `low->med`** · Por que: UI cableando un contrato ya definido.
  Leer skill `frontend-design` antes de escribir UI.
- **U3. Vista de reputacion + estado de contratos (read-only) en el dashboard.**
  Dificultad: Estandar · **Sonnet 5 `med`** · Por que: feature en 1 carpeta, verificable.
- **U4. Display de estados de tx + links a explorador (verificabilidad).**
  Dificultad: Estandar · **Sonnet 5 `low->med`** · Por que: render de datos leidos, revertible.
- **U5. Medidor de gas/presupuesto (solo display).**
  Dificultad: Mecanica->Estandar · **Sonnet 5 `low`** · Por que: componente aislado.

### Fase 3 — Implementacion T2 (tras cerrar §7 cadena; detras de flag, mockeado)
- **W1. SIWE en la superficie agentica + manejo de wallet desconectada / red incorrecta / sin fondos.**
  Dificultad: **Delicada** · **Opus 4.8 `high`** · Por que: seguridad/auth, side-cases; NO tocar auth
  humano (obj. D).
- **W2. Adapters mockeados de contratos (ABIs de C2) detras de feature flag.**
  Dificultad: Estandar · **Sonnet 5 `med`** · Por que: definido por C2, testeable con mocks.
- **W3. Modelo de identidad de agente (ERC-6551/DID) + su binding al read-model.**
  Dificultad: **Delicada** · **Opus 4.8 `high`** · Por que: bleeding-edge, toca contrato de identidad.
- **W4. Integracion Farcaster/X para reputacion/identidad (segun §7 punto 5).**
  Dificultad: **Delicada** · **Opus 4.8 `high`** · Por que: multi-cadena posible, requisitos aun ambiguos.

### Fase 4 — T3 (NO se enciende; se deja listo tras aprobacion humana + debate)
- **G1. Sesiones de agente ERC-4337 (umbral + ventana) + Safe con umbrales.**
  Dificultad: **Diamante** · **Fable `low->xhigh` (subagente)** · Por que: mueve valor real,
  irreversible, seguridad critica. **Debate adversarial obligatorio; no se integra sin verificacion
  contra archivos reales.** Permanece apagado tras un gate humano explicito.

## 10. Paralelizacion, verificacion y gates

- **Orden duro:** Fase 0 → Fase 1 (secuencial) → Fase 2 (paralelo) → Fase 3 (paralelo, tras §7) →
  Fase 4 (apagada). Un agente no toca el archivo de otro; si un archivo B consume el contrato de A,
  van en secuencia. Aislamiento con git worktree si mutan a la vez.
- **Verificacion antes de integrar:** nada entra sin build/tsc/test verde. El verificador recibe el
  diff real, nunca resumido. Max 2 reintentos por subtarea; al tercero, escala.
- **Circuit breaker de valor:** cualquier tarea que roce T3 en vivo se detiene y pasa por debate
  adversarial + aprobacion humana escrita. El agente nunca "se acerca" al gate por su cuenta.
- **Handoff:** `PROGRESS.md` en la raiz del build (Objetivo/contexto, En curso con Last checkpoint +
  Next action, Completado, Decisiones append-only). Cadencia por hitos.

## 11. Como cerrar y ejecutar

1. Resolver la **decision de cadena** (§7) con el equipo → fijarla en este PRP.
2. Correr **R0** (reconciliacion contra repo) → resolver los `[SUPUESTO]`.
3. Pasar este borrador por la skill **`prp`** del repo para normalizarlo al formato de
   `.claude/PRPs/`.
4. Ejecutar con **`bucle-agentico`**, respetando el ruteo/dificultad estampados por tarea (§9) y el
   gatillo adversarial obligatorio antes de aprobar cada plan de fase (variante Fable, seccion 10 del
   brief).

## 11.5 Segunda superficie: A2A Factory (Claude Design) — enlazada, no absorbida

Existe un sistema de diseno paralelo producido en Claude Design ("A2A Factory"): la cara
**comercial** del sistema (marketplace/fabrica de agentes, cotizador deck-builder, dos shoppers:
humano y agente A2A con settlement fiat/USDC). Este PRP cubre la cara **operativa** (Mission
Control). Son dos superficies de un mismo sistema:

- Factory muestra **capacidad prometida** (specs de producto — hard-code legitimo, rotulado como
  spec); Mission Control muestra **desempeno verificado** (solo datos reales).
- Comparten: tokens con nombres unificados, tipografia (Space Grotesk + JetBrains Mono), diccionario
  de conceptos (Energia⚡ = Nivel; Habilidad/Ataque = linea T1/T3), y los guardrails del §5.3.
- El flujo del shopper A2A con settlement **toca T3** y pasa por el mismo gate humano (C3/G1).
- La A2A Card operativa (§5) se construye como **variante del `AgentCard` de Factory**, no desde cero.
- Detalle completo del enlace, adopciones, backlog de Design y pendientes de ratificacion:
  `PUENTE-factory-design-vs-prp.md` (documento companion de este PRP).

## 12. Preguntas abiertas a cerrar (bloquean partes del PRP)

1. **Cadena/L2** (bloquea T2/T3). Default recomendado: Base — pero confirmar checklist §7.
2. **¿El auth humano de la Fase 4 se conserva tal cual?** (obj. D). Necesario para no romperlo.
3. **Procedencia de la reputacion dia-1** (obj. E): ¿que datos existen ya en el sistema para poblar
   Fortaleza/Debilidad sin inventar?
4. **¿wagmi/viem o ethers?** Depende de si `src/` ya trae una de las dos `[SUPUESTO]`.
5. **¿Farcaster/X es requisito de T2 o puede diferirse?** Afecta si el setup es mono o multi-cadena.
