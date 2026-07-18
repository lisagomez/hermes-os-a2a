# Kickoff: Frontend Web2 (humanos) + Web3 (agentes): Hermes OS · A2A

> Brief autocontenido para un agente que arranca EN FRIO (solo conoce este repo, no vio ninguna
> conversacion previa). Objetivo: usar este insumo para producir el PRP formal del frontend (skill
> `prp` de este mismo repo), con Fable como director y Opus 4.8 como sub-director adversarial
> (metodologia completa en la seccion 6), antes de ejecutar con `bucle-agentico`.

## 1. Que es este proyecto (orientate rapido)

Lee en este orden: `README.md`, `BUSINESS_LOGIC.md`, `businessos/ROADMAP.md`. Resumen: sistema de
agentes (Hermes) que opera 3 verticales (personal/negocio/clientes) por Telegram, con un grafo
regulatorio multi-pais y un dashboard "Mission Control" (`src/`, Next.js, Fase 4 cerrada: auth +
3 vistas read-only: AI Spend, Grafo, Pantheon). Protocolo A2A ya vive parcialmente (`grafo-a2a`,
`ventas-a2a`, `ejecutor-a2a`, `supervisor-a2a`, `coordinador-a2a`).

Nombre actual: fork del BusinessOS de Daniel, fusionado con el agente Hermes -> "Hermes OS · A2A"
(rename aprobado por la duena del repo, PR #30 ya mergeado a master).

## 2. La tarea: frontend con 2 canales

Conclusion de reunion con la duena del repo: los agentes se comunican mas naturalmente en Web3
(identidad, reputacion, pagos entre ellos), los humanos siguen en Web2.

- **Canal humano = Web2.** Ya existe: EXTENDER el Mission Control actual (`src/`), no crear uno nuevo.
- **Canal agentico = Web3**, porque es "el entorno mas natural de A2A".

## 3. Alcance decidido (la parte que mas se presta a malentendidos, leer con cuidado)

- **Se ENCIENDE ahora (ship):** solo lectura/visualizacion. Cards A2A, reputacion, estado de
  contratos, visible en el dashboard, cero movimiento de valor real.
- **Se CONSTRUYE ahora pero NO se enciende:** todo el cableado hacia el modo transaccional (esquema
  de datos, interfaces/ABIs de los contratos, integracion con Farcaster/X, eleccion de cadena, logica
  de reputacion), completo y listo para conectar.
- **Lo unico detras de un gate humano explicito:** el punto donde algo mueve valor real o ejecuta un
  contrato en vivo. Mecanismo tecnico recomendado (no reinventar): **Account Abstraction (ERC-4337)**
  con "sesiones de agente": el humano autoriza un umbral de gasto + una ventana de tiempo (ej. 24h);
  dentro de eso el agente opera solo, fuera de eso no.

## 4. Piezas tecnicas ya identificadas (investigacion previa, no partir de cero)

- **Auth:** wallet-based (SIWE, Sign-In with Ethereum), no password. Maneja: wallet desconectada,
  red incorrecta, sin fondos.
- **Estados de transaccion:** Enviada -> Pendiente -> Confirmada (no instantaneo como Web2).
- **Medidor de gas/presupuesto por agente** (barra de "combustible restante").
- **Libreria de estado de cadena en tiempo real:** wagmi, viem o ethers.js.
- **Verificabilidad:** enlace a explorador de bloques + txHash, en vez de "confiar" en que el agente
  hizo su trabajo.
- **Identidad del agente:** NFT dinamico (ERC-6551) o DID, no una fila de Postgres, de ahi sale su
  reputacion on-chain.
- **Cuentas multisig** (ej. Safe) para los agentes, con umbrales de gasto preaprobados por el humano.
- **Pregunta ABIERTA, no decidida:** que cadena/L2. Base es la candidata natural (Farcaster corre
  sobre Base) pero el equipo no lo ha confirmado explicito, preguntarlo antes de fijarlo en el PRP.

## 5. Decision de diseno ya cerrada

Paleta aprobada por votacion del equipo, **"The Neural Nexus"**:

| Rol | Color | Hex |
|---|---|---|
| Fondo principal | Negro carbon mate | `#121214` |
| Color dominante | Violeta / Cyber Purple | `#7C3AED` |
| Acento de red | Rosa neon / Magenta vivo | `#EC4899` |
| Texto/detalles | Gris platino | `#E5E7EB` |

## 5.1 Diseno visual de las A2A Cards (guia de direccion, no restriccion)

> Esto es una guia, no una spec rigida. El agente que ejecute el frontend tiene libertad de
> ajustar el detalle visual; lo que no deberia perderse es la logica de fondo (que un campo
> signifique lectura vs que mueva valor, y la honestidad de mostrar limites del agente).

**Inspiracion:** la estructura de cartas de juegos de estrategia (Yu-Gi-Oh, Pokemon TCG, Magic),
NO su estilo de arte de fantasia pintada. Campos y su equivalente en la A2A Card:

- **Codigo + expertise + nodo de conexion:** formato tipo `LEG-014` (prefijo de departamento +
  numero), ligado a la identidad on-chain del agente (ERC-6551, seccion 4) y a su posicion en la
  red de agentes.
- **Nivel:** tier de autonomia (mismo concepto que el "nivel" de Yu-Gi-Oh: mas nivel, mas poder,
  pero mas presupuesto/aprobacion necesaria para "invocarlo").
- **Descripcion:** personalidad del agente. Ya resuelto con el `SOUL.md` que cada
  vertical/departamento ya tiene, no hay que inventar contenido nuevo.
- **Habilidad** (pasiva, sin costo, no dispara el gate humano) **vs Ataque** (activa, con costo
  de gas explicito, la que puede mover valor real): esta distincion ES la misma linea trazada en
  la seccion 3 entre "se enciende ahora" y "se cablea pero espera aprobacion humana". Reusar esa
  linea, no inventar una tercera categoria.
- **Fortaleza / Debilidad:** honestidad sobre donde el agente tiene buen historial y donde NO es
  confiable todavia (ej. "debil fuera de jurisdiccion MX"). Coherente con el principio ya
  existente del roadmap: citar fuentes, no inventar; verificar antes de confiar.

**Tratamiento visual** (destilado de dos guias de UX/UI consultadas, `impeccable` y
`ui-ux-pro-max-skill`; viven en el OPS del que sale este brief, no en este repo, por eso van
resumidas aqui y no como link):

- La imagen (retrato/ilustracion del agente) cubre TODO el fondo de la carta, full-bleed. La
  cara o figura central del agente va en la zona focal (centro/centro-superior); el resto de la
  imagen es decorativo, se desvanece hacia los bordes.
- Scrim/degradado (no transparencia improvisada) para que el texto sea legible sobre la imagen:
  patron "Photo-Based", imagen + overlay sutil + texto encima.
- Zona segura: contenido critico dentro del 80% central del canvas. Contraste minimo AA 4.5:1
  para el texto sobre cualquier fondo, probado a tamano reducido.
- Evitar el anti-patron que ambas guias nombran explicito: grillas de cards identicas (icono +
  titulo + texto repetido). Variar el tratamiento entre cartas en vez de clonar la plantilla.
- El arte final (retrato/ilustracion real de cada agente) se genera DESPUES con la skill
  `image-generation` de este mismo repo (OpenRouter + Gemini). No es parte de este kickoff,
  solo el layout/estructura que ese arte tiene que respetar.

## 6. Metodologia para armar el PRP: orquestar-agentes-fable (extraido integro)

> Skill de comportamiento del orquestador (no es del dominio del proyecto). Aplica porque el modelo
> del loop principal para esta planeacion sera Fable. Fuente original: OPS de Johann Valderrama,
> `orquestar-agentes-fable/SKILL.md`, se pega completa aqui porque ese archivo vive fuera de este
> repo y un agente en frio no puede leerlo por ruta.

### 0. Filtro maestro

Antes de montar nada: ¿el costo de orquestar (briefs, subagentes, paneles, debate) es menor que el
costo del error que evita? Si no, no orquestes, hazlo inline. La mayoria de un build (UI, CRUD,
endpoints estandar) no es delicado: va inline o a un ejecutor barato. Orquesta solo la fraccion
delicada.

### 1. Niveles

| Nivel | Quien | Para que |
|---|---|---|
| L0 Director | Fable | Dueno del plan global y la decision final. No ejecuta lo delicado: delega, verifica, integra. |
| L1 Ejecutor de riesgo | Opus 4.8 (`high->xhigh`); lo verdaderamente dificil -> subagente Fable (`low->med`) | Logica delicada, migraciones/RLS, integraciones, contratos entre modulos. |
| L2 Ejecutores mecanicos | Sonnet 5; Haiku 4.5 solo lo determinista | UI cableando contratos definidos, scaffolding, refactors de una carpeta. |

### 2. Ruteo por blast radius (clasificador de arranque)

Clasifica cada unidad de trabajo antes de despachar, de arriba hacia abajo (empate o duda -> sube de clase):

| Clase | Senales | Ruta |
|---|---|---|
| MECANICA | determinista, sin juicio, 0-1 archivo, revertible | Haiku 4.5 `low` |
| ESTANDAR | bien especificado, 1 carpeta/feature, verificable, error barato | Sonnet 5 `low->med` |
| DELICADA | cumple >=1 criterio delicado (dificil de revertir / toca contratos o esquema / seguridad-RLS / side cases no obvios / requisitos ambiguos / sin verificacion automatica) | Opus 4.8 `high->xhigh` |
| DIAMANTE | verdaderamente dificil: algoritmo portado, diseno delicado, bug imposible | Fable `low->xhigh` (subagente) |

Tabla de ruteo tipica: git push/renombrar -> Haiku `low`. UI cableando contratos -> Sonnet `low->med`.
Lectura pesada a destilado -> Sonnet `med`. Migracion/RLS verificable -> Opus `high`. Algoritmo
portado/contrato multi-modulo -> Fable `low->med` subagente. Plan/arquitectura/sintesis final ->
siempre L0 (Fable), nunca Haiku ni `low`. Debate adversarial -> Opus `high->xhigh`.

### 3. Delegar a subagentes: arrancan EN FRIO

Un subagente no ve la conversacion previa. Sub-especificar es la causa #1 de fallo. Cada brief debe
traer: objetivo + criterio de "hecho", contexto necesario (rutas, contratos, decisiones ya tomadas),
contrato de salida, fronteras (que puede y no puede tocar). El PLAN GLOBAL se persiste en un artefacto
(PRP/PROGRESS.md), nunca solo en el hilo. Brief de ida: completo > corto. Retorno: apretado y
estructurado (formato fijo, no tope de palabras).

### 3.5 Quien planea fija dificultad y modelo por unidad

Cada tarea ejecutable del PRP/plan lleva estampado:
```
Dificultad: <Mecanica|Estandar|Delicada|Diamante>
Ejecutar con: <modelo> <esfuerzo>
Por que: <1 linea, que la hace facil o dificil>
Auto-check: si el modelo real es mas debil que el recomendado, avisar antes de proceder.
```

### 4. Paralelizacion segura

Particiona por archivo/feature, un agente no toca el archivo de otro. Archivos disjuntos no siempre
es independencia (si B consume el contrato de A, van en secuencia). Orden: contratos/interfaces
primero (secuencial), implementaciones despues (paralelo). Aislamiento duro: git worktree por agente
si mutan a la vez.

### 5. Verificacion antes de integrar + circuit breaker

Nada se integra sin verificar (build/tsc/test). El verificador recibe el diff real (nunca resumido
por IA). Si falla: maximo 2 reintentos por subtarea, al tercero se escala.

### 6. Escalada (ejes ortogonales)

Eje 0: si el paso es determinista puro, corre como SCRIPT, sin costo de modelo. Eje A (esfuerzo):
`low -> medium -> high -> xhigh` (nunca `max`: en benchmark rinde igual o peor que `xhigh` costando
40-60% mas). Eje B (herramienta): un agente -> panel -> Workflow; Workflow para trabajo
repetitivo/determinista a escala.

### 7. Debate adversarial: protocolo

1. Al adversario (Opus 4.8) se le da SOLO la propuesta y la orden de destruirla, nunca el
   razonamiento a favor (lo racionalizaria).
2. Devuelve: vectores de ataque concretos, alternativas con tradeoffs, fallo mas probable, veredicto.
3. El director responde por escrito a CADA objecion: refutada / aceptada / mitigada.
4. Una sola ronda salvo que el debate revele algo nuevo de peso.
5. El director reconcilia, decide y deja constancia del porque.

### 8. Handoff y checkpoint

Artefacto `PROGRESS.md` en la raiz del build. Plantilla: Objetivo/contexto, En curso (con Last
checkpoint + Next action), Completado, Decisiones (append-only). Cadencia por hitos, no continua.

### 10. Variante FABLE: Director Fable + Sub-director Opus 4.8 (lo especifico de esta variante)

**Roles:** Fable = director (formula, reconcilia, decide; no relee material pesado, eso lo delega).
Opus 4.8 = sub-director / contraparte de debate fija (ataca directo, uno a uno) y tambien puede
actuar como L1 ejecutor de riesgo (dos sombreros distintos).

**Gatillo OBLIGATORIO (endurece el debate adversarial estandar):** el debate deja de ser solo para
decisiones irreversibles y pasa a ser politica por defecto en 2 momentos:
1. SIEMPRE antes de aprobar un plan que vaya a ejecutarse (no solo lo irreversible).
2. Ante cualquier error grave detectado en ejecucion (se pausa, se debate el fix, se reconcilia).

Se gradua el ataque segun el riesgo del plan (plan simple -> Opus `high`, ataque rapido; plan
delicado multi-fase que toca esquema/contratos -> Opus `xhigh`, ataque profundo con verificacion
contra archivos reales) pero NUNCA se exime del debate si hay un plan por aprobar.

**Protocolo:** Fable formula la propuesta completa (con supuestos y afirmaciones verificables) ->
delega a un subagente Opus 4.8 dandole SOLO la propuesta (nunca el rationale a favor) con la orden de
destruirla -> Opus devuelve ataque + alternativas + fallo mas probable + veredicto -> Fable responde
por escrito a cada objecion -> Fable reconcilia, decide, deja constancia.

**Techo de esfuerzo (cost cap):** ni Fable ni Opus escalan a `max` en este modelo, su techo es
`xhigh`, tanto en el debate como ejecutando riesgo L1. Confirmado por benchmark: `max` rinde igual o
peor que `xhigh` costando 40-60% mas.

## 7. Modelo y esfuerzo recomendado para ESTA sesion de planeacion

- **Fable, esfuerzo xhigh** como director (formula el plan/PRP).
- **Opus 4.8, esfuerzo xhigh** como sub-director adversarial fijo (ataca el plan antes de aprobarlo,
  obligatorio en esta variante, no opcional, ver seccion 10 arriba).
- **Urgencia:** Fable sale de disponibilidad el 12 de julio de 2026 (inclusive). Si se va a usar,
  hacerlo pronto.
- Al cerrar el PRP: usar el skill `prp` de este mismo repo para dejarlo en formato consistente con
  el resto de `.claude/PRPs/`, y luego ejecutar con `bucle-agentico`.

## 8. Que NO va en este brief (a proposito)

- No se incluye el transcript crudo de la reunion con el equipo (se mantuvo fuera del repo
  compartido a proposito, son notas personales de un tercero).
- No se incluye ninguna informacion de infraestructura personal de la duena del repo mas alla de lo
  que ya esta en este mismo repositorio.
