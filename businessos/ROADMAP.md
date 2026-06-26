# BusinessOS — Roadmap del proyecto

Mapa consolidado de las decisiones tomadas. Las fases están en orden de
construcción: cada una se apoya en la anterior. No saltes hacia adelante hasta
que la fase previa esté validada.

---

## Arquitectura en una frase

Una mente (Hermes) con tres bocas (verticales: personal, negocio, clientes),
cada una en su propio contenedor Docker, sobre un Droplet de DigitalOcean,
hablando por Telegram y voz, con un grafo de conocimiento como cerebro
regulatorio/fiscal/contable multi-país, y un dashboard "Mission Control" encima.

---

## Stack confirmado

- **Servidor:** Droplet DigitalOcean (2 GB para arrancar; 4 GB al sumar el grafo)
- **Orquestación:** Docker + docker-compose (un contenedor por vertical)
- **Agente:** Hermes Agent (Nous Research) — memory, skills, soul, crons, loop
- **Canales:** Telegram (3 bots) + voz (TTS de salida, transcripción de entrada)
- **Conocimiento personal:** Obsidian (bóveda montada como volumen)
- **Cerebro regulatorio:** grafo (de lisagomez/grafo, rediseñado multi-país)
- **Datos / dashboard:** Supabase + A2ABot (Mission Control)
- **Pago tradicional:** Polar (Merchant of Record; tarjetas/fiat + impuestos)
- **Pago agéntico (futuro):** Circle / USDC (Agent Wallets con guardrails)
- **Contratos:** capa documento (cláusulas validadas por el grafo) + capa
  blockchain opcional (smart contracts con verificación formal Lean 4)
- **Conexión de herramientas:** MCP
- **CLIs agente-nativos:** Printing Press (imprime CLI+MCP por API; ahorro de
  tokens ~100x vs MCP pesado; corre en Claude Code, no en el Droplet)
- **Conexión entre agentes (futuro):** protocolo A2A

---

## FASE 0 — Infraestructura  ← EN CURSO

Cimiento técnico. Ver FASE0.md y los scripts.
- Droplet + endurecimiento + Docker
- Tres contenedores Hermes con sus SOUL.md / AGENTS.md
- Tres bots de Telegram + voz
- Sync nocturno a GitHub
- **Salida:** las tres verticales vivas y respondiendo.

## FASE 1 — Eficiencia de tokens

Activar el ahorro una vez que el cimiento corre.
- config.yaml de routing por modelo (barato para lo ligero, Sonnet para lo
  pesado, Opus casi nunca)
- Caché de prefijo (ya activo en Hermes; mantener SOUL/memoria estables)
- Topes de palabras en crons
- Tabla token_usage en Supabase + alertas de presupuesto al 80%
- **Salida:** gasto mensual controlado (~$25-30 en uso personal).

## FASE 2 — Cerebro regulatorio (grafo), acotado

Empezar por UN país + UNA dimensión, no los diez de golpe.
- grafo como servicio Docker en hermes-net con su PostgreSQL
- Rediseño del modelo: proyecto → jurisdicción → dimensión → regla → impacto
- Primer país-dimensión (sugerido: México + fiscal, o tu mercado principal)
- Validar el flujo completo de evaluación end-to-end
- Regla de oro: el sistema SEÑALA riesgos y cita fuentes; NO da asesoría legal
- **Salida:** una evaluación real con banderas rojas, checklist y fuentes.

## FASE 3 — Expansión del grafo + cobro + contratos-documento

El grafo crece, y encima de él se montan las dos capas que dependen de él:
cobrar y contratar. Ambas usan el grafo como validador.

Grafo:
- Resto de dimensiones (contable apoyándose en NIIF; regulatorio por sector)
- Resto de países LATAM
- Cron de revisión de vigencias (un grafo desactualizado miente con certeza)

Pasarela de pago tradicional (Polar):
- Polar como Merchant of Record: cobra tarjetas/fiat en 100+ mercados y asume
  la carga de IVA/GST/sales-tax internacional (resuelve en la práctica parte de
  lo que el grafo evalúa en teoría)
- Verificar ANTES: que Polar soporte payouts a tu país de cobro en LATAM
  (paga vía Stripe Connect Express, ~120 países; hay huecos)
- Costo a considerar: Starter 5% + 50¢ por transacción; planes de pago bajan la
  tarifa (Pro $20/mes, Growth $100/mes, Scale $400/mes)
- Lo usan Negocio (suscripciones, facturación) y Clientes (cobro a clientes)

Contratos-documento (capa 1):
- Generar/gestionar acuerdos comerciales (propuesta → contrato, términos,
  vencimientos, renovaciones)
- Cada contrato pasa por el grafo: valida cláusulas según el país del cliente,
  marca banderas con su fuente
- Aprobación humana obligatoria antes de cerrar (igual que el resto de Clientes)
- **Salida:** cobertura multi-país del grafo + cobro real + contratos validados.

## FASE 4 — Dashboard Mission Control

- A2ABot conectado a las tres verticales por API + Supabase
- Vistas: Pantheon (los 3 agentes + skills), AI Spend, evaluaciones del grafo
- **Salida:** panel único de control del sistema.

## FASE 5 (FUTURA) — Interoperabilidad A2A

El momento correcto para el protocolo Agent2Agent (a2aproject/A2A, Linux
Foundation). NO antes: A2A resuelve comunicación entre agentes pares/externos,
algo que el sistema no necesita hasta tener el grafo funcionando y querer
abrirlo al exterior.

**Caso de uso ancla: el grafo como agente A2A independiente.**
- Exponer el grafo regulatorio con su "Agent Card" que anuncia su capacidad
  ("evalúo impacto fiscal/contable/regulatorio en LATAM")
- Cualquier agente —tuyo, de un cliente, de un socio— lo consulta sin conocer
  su interior (preserva la opacidad: no expone reglas ni datos internos)
- Se monta como servicio más en hermes-net usando el SDK de Python o JS
- Complementa MCP, no lo reemplaza: MCP conecta con herramientas; A2A conecta
  con otros agentes
- **Salida:** el cerebro regulatorio convertido en servicio reutilizable por un
  ecosistema de agentes.

Otros casos A2A que habilita esta fase:
- Verticales tratándose como servicios independientes con descubrimiento formal
- Conexión con agentes de terceros (socios, proveedores) de forma segura

### Capa de economía agéntica (mismo horizonte que A2A)

Estas piezas comparten naturaleza —agentes que transaccionan valor— y la misma
carga regulatoria. Van juntas, al final, cuando todo lo demás esté sólido y el
grafo pueda evaluar cada una país por país antes de activarla.

Pago agéntico (Circle / USDC):
- La versión regulada y seria de lo que el commerce kit intentaba: Circle emite
  USDC y su Agent Stack da Agent Wallets con guardrails de política para que los
  agentes transaccionen de forma autónoma y controlada
- Pagos máquina-a-máquina (un agente paga a otro por un servicio/dato)
- Antes de activar modo real: pasarlo por el propio grafo (impacto cripto LATAM)
  y mantener aprobación humana

Contratos-blockchain (capa 2 de contratos):
- Smart contracts on-chain para escrow / liberación por hitos / acuerdos
  auto-ejecutables
- Construidos con la skill SDD + verificación formal en Lean 4 (probar la lógica
  antes de desplegar — la forma responsable de mover valor on-chain)
- Solo se justifica cuando un acuerdo concreto necesita auto-ejecución; la
  mayoría de contratos viven y mueren como documento (capa 1)
- Siempre con aprobación humana; nunca se firma ni ejecuta solo

**Salida de la capa económica:** el sistema no solo razona y contrata, también
transacciona — con respaldo regulado y verificación formal.

---

## Corriente transversal — CLIs agente-nativos (Printing Press)

No es una fase; atraviesa todas. Conforme cada fase suma un servicio nuevo, se
imprime su CLI para que los agentes lo usen gastando ~100x menos tokens que un
MCP pesado. Es otra palanca de eficiencia, hermana del routing y el caché.

Cómo funciona (ver carpeta printing-press/):
- cli-manifest.yaml mapea cada CLI a su fase, fuente y vertical
- print-phase.sh prepara/dispara la impresión de los CLIs de una fase
- Tres niveles de automatización; empezar por el manual asistido (Nivel 1)
- Printing Press corre en Claude Code en tu máquina de desarrollo, no en el
  Droplet (necesita Go 1.26.4+ y Claude Code)

Qué CLI por fase:
- Fase 0-1: DigitalOcean, Telegram (ambos en catálogo → impresión casi directa)
- Fase 1-2: Supabase (token_usage, evaluaciones, datos del dashboard)
- Fase 2:   grafo (apuntando a su spec propio)
- Fase 3:   Polar (cobros, suscripciones, estado MoR)
- Fase 5:   Circle (Agent Wallets, USDC) — solo al llegar ahí

Reglas de seguridad (heredadas del rigor del propio Printing Press):
- **Verificar anotaciones MCP en los CLIs que mueven dinero** (Polar, Circle):
  confirmar que las operaciones de escritura/cobro estén marcadas como
  destructivas, para que el agente pida confirmación antes de actuar. Una
  marca readOnly falsa en algo que mueve dinero es un bug real, no un detalle.
- **Dry-run por defecto:** los CLIs nacen imprimiendo, no actuando; las acciones
  con efecto requieren opt-in explícito (--launch/--send). Encaja con la
  aprobación humana obligatoria de Clientes.
- **Anti-reimplementación:** un CLI llama a la API real o lee del store local;
  nunca inventa respuestas. Es el principio "citar fuentes, no inventar"
  aplicado a código.
- **Verify antes de confiar:** shipcheck (dogfood + scorecard + proof) y grado A
  mínimo antes de usar un CLI en producción.

---

## Descartados (con motivo)

- **agent-commerce-kit (pagos agénticos en USDC):** introduce una línea de
  negocio nueva (cripto), código muy verde de hackathon moviendo dinero real, y
  carga regulatoria que el propio grafo marcaría en rojo. Fuera del alcance.
  Nota: su *función* (pago entre agentes) sí se retoma en Fase 5, pero vía
  Circle —regulado, con Agent Wallets y guardrails— en lugar de código casero.

---

## Principios que cruzan todo el proyecto

1. **Aislar, no fundir.** Cada componente nuevo es un servicio en hermes-net,
   no código mezclado. Mantiene el sistema entendible y seguro.
2. **Acotar antes de escalar.** Un país-dimensión antes de diez; un flujo
   validado antes del siguiente.
3. **Citar fuentes, no inventar.** En lo regulatorio/fiscal, cada afirmación
   trae fuente y vigencia. El sistema señala, el profesional decide.
4. **Eficiencia por routing, no por recorte.** Lo barato a modelos baratos, lo
   importante a modelos capaces. No se sacrifica calidad donde importa.
5. **Arreglar lo compartido, no el caso aislado.** Cuando algo falle, pregunta
   si el arreglo va en el componente común (Hermes, grafo, skill) o solo en una
   vertical. Por defecto, lo compartido — así el beneficio se compone. (Tomado
   del "machine vs printed-CLI change" de Printing Press.)
6. **Verificar antes de confiar.** Ningún componente que mueva dinero, datos o
   reglas se usa sin verificación: shipcheck en CLIs, fuentes en el grafo,
   anotaciones de seguridad correctas en MCP, aprobación humana en lo
   irreversible.
