# Competencia: Houston (gethouston.ai)

> Investigación inicial, 2026-07-24. Método: 3 agentes de investigación en paralelo (WebFetch a
> home/pricing/vision/guides/changelog/privacy/terms/agent-store/GitHub + WebSearch de prensa y
> comunidad), cruzados y sintetizados por Levy (OPS). Cada afirmación cita su fuente primaria; lo
> no verificado queda marcado explícito, no relleno. Reinvestigar si el producto cambia de forma
> sustancial (ritmo de ship muy alto: 8 releases entre 30-jun y 24-jul-2026).

## 1. Qué es Houston

App de escritorio (macOS/Windows) que se autodescribe "AI agents that actually do the work":
agentes de IA preentrenados conectados a 1000+ herramientas, para automatizar tareas en lenguaje
natural sin que el usuario tenga que ser el "cable USB" entre la IA y sus apps.
Fuente: [gethouston.ai](https://gethouston.ai/).

## 2. Modelo de precios y consumo de IA: respuesta a "¿tokens ilimitados o suscripción?"

**No vende ni revende tokens propios.** Corre sobre la suscripción de IA que el usuario ya paga.

- **Personal (gratis):** ejecución 100% local en tu computador, "unlimited agents and features",
  sin tarjeta de crédito. Usa tu suscripción existente de ChatGPT/Claude vía **OAuth in-app
  nativo** de cuenta (no API key pegada): el README dice explícito *"Anthropic and OpenAI use
  in-app OAuth flows"*, mismo mecanismo que "Login with Claude" en Claude Code CLI, no
  `ANTHROPIC_API_KEY`. Para proveedores adicionales (OpenRouter, Google Gemini, Amazon Bedrock)
  sí acepta API key pegada (BYOK): *"connect any pi api-key provider from the UI"*, *"live-verify
  a pasted API key before storing it"*.
  Fuentes: [github.com/gethouston/houston](https://github.com/gethouston/houston) (README),
  [gethouston.ai/changelog/](https://gethouston.ai/changelog/).
- **Límites:** los nativos del proveedor (ventana de 5h de Claude Pro/Max, cuotas de OpenAI
  Codex). Houston los **etiqueta** ("Claude session limits are labeled correctly",
  "Classify no-credit provider errors as quota_exhausted"), no los oculta ni evade. No se encontró
  techo adicional propio en el plan gratuito. Fuente: changelog.
- **Team ($15/asiento/mes, $12 anual):** agentes corriendo en la nube de Houston 24/7 (servidor,
  no tu laptop), app web + móvil, roles/permisos, prueba 14 días sin tarjeta.
  Fuente: [gethouston.ai](https://gethouston.ai/).
- **Enterprise (a medida):** SSO, SLA, soporte prioritario inglés/español, deploy privado.
- **[BLOQUEANTE, sin resolver]:** el changelog menciona que "Houston Cloud" (beta) separa
  cuentas en secciones *"AI subscriptions"* vs *"AI per token"*, lo que sugiere que a nivel
  organización SÍ podría existir un modo de facturación de IA por token, aparte del modelo
  "trae tu suscripción". `gethouston.ai/pricing` devuelve 404, no hay página que lo confirme.
  Verificar antes de citar un pricing Team/Enterprise cerrado en una comparación externa.

## 3. Catálogo de agentes y personalización

- Home lista 7 roles "core": Asistente Personal, Contador (Bookkeeper), Gerente de RRHH,
  Rep. de Servicio al Cliente, Rep. de Ventas, Gerente de Oficina, Analista Financiero, y
  afirma "+30 más" en el Agent Store.
- **El Agent Store (`agents.gethouston.ai`) está vacío** ("The store is brand new"): 14
  categorías sin agentes publicados. El "+30 agentes" es **cifra de marketing sin catálogo
  público verificable hoy**.
- Sí puedes crear tu propio agente: *"build your own in minutes"* (home). No se encontró
  documentación técnica de qué tan profunda es la personalización (no hay página de SDK/docs
  visible en lo rastreado).
- Publicación al Agent Store abierta a terceros sin proceso de revisión visible: vía app
  ("share it in one step, no code, no terminal") o vía API (posteando un documento AgentIR).
  Fuente: [agents.gethouston.ai](https://agents.gethouston.ai).

## 4. Interoperabilidad (A2A / MCP / API): el punto más relevante para nosotros

`gethouston.ai/guides/` describe **tres superficies bajo una sola API key**: REST API para
automatizaciones, **"Agent2Agent for other agents"** (agentes lanzando "missions" a otros
agentes) y **MCP** ("agents as tools", compatible con Claude y otros asistentes). El texto
insiste en que los agentes "aren't locked inside Houston".

**[Suponiendo, sin verificar]:** que usen el nombre "Agent2Agent" no confirma que implementen
el protocolo A2A real (proto-first, agent-card en `/.well-known/agent-card.json`, como el que
este repo ya mapeó en los gotchas de Fase 5-6, `CLAUDE.md` 2026-07-03). Podría ser una feature
propia con el mismo nombre de marketing, sin interoperar con el ecosistema A2A externo. No se
encontró un Agent Card público ni spec técnico documentado. **Si se necesita esta comparación
con certeza, el siguiente paso es un agente que le hable JSON-RPC crudo a un endpoint Houston**
(mismo método que usamos para verificar nuestro propio wire format en Fase 6).

## 5. Dónde corren los datos / privacidad

- Modo Personal: todo local, `~/.houston/...` (workspaces, agentes, prompts, transcripts).
  Houston no recibe copia salvo que el usuario active explícitamente una feature de subida.
- Houston Cloud (Team/Enterprise): datos en servidores de Houston.
- No entrena modelos propios con contenido del usuario. Cifrado en tránsito (HTTPS/TLS) y en
  reposo donde el proveedor lo soporte. Analítica vía PostHog + crash reports vía Sentry,
  explícitamente sin capturar contenido de mensajes/archivos/outputs.
- Responsabilidad limitada al mayor entre lo pagado en 12 meses o USD 100 (ToS).
  Fuentes: [gethouston.ai/privacy/](https://gethouston.ai/privacy/),
  [gethouston.ai/terms/](https://gethouston.ai/terms/).

### 5.1 Conexion a herramientas externas (Gmail/Calendar) via OAuth, investigado 2026-07-24

Flujo: el usuario conecta la herramienta desde Houston, Google muestra su propia pantalla OAuth
(Houston nunca ve la contrasena), Google emite un token que Houston guarda para que el agente lo
use despues.

Privacy Policy, seccion "Connector credentials": *"the credentials and tokens needed to authorize
those connections are stored either on your local machine (desktop app) or, if you use Houston
Cloud, encrypted on our servers."* Seccion "Connected applications": *"data flows between Houston
and that application as needed for the connector to work. The third party's use of your data is
governed by its own terms."* Fuente: [gethouston.ai/privacy/](https://gethouston.ai/privacy/).

**Punto ciego detectado (cruce contra su propio README tecnico):** el motor de integracion no es
de Houston, es **Composio** (asi conectan las "1000+ herramientas"). El README dice que por
defecto corre en **"platform mode" a traves de Composio**; para que el token quede solo local o en
Houston Cloud como promete la privacy policy, el usuario tendria que crear y auto-hospedar su
propio proyecto Composio (opcion que existe, no es el default). Fuente:
[github.com/gethouston/houston](https://github.com/gethouston/houston). Composio no aparece
nombrado ni una vez en la privacy policy fetcheada como subprocesador. **[Suponiendo, sin
confirmacion directa de Houston]:** en el modo por defecto es plausible que el token de Gmail
pase por o quede en infraestructura de Composio, no solo "local o Houston Cloud" como dice la
politica. No hay fuente primaria de Houston que lo confirme o lo niegue explicitamente.

Composio (el proveedor) publica buenas practicas propias como plataforma (AES-256 en reposo,
tokens nunca puestos en el contexto del LLM para evitar exfiltracion por prompt injection, scopes
minimos por conexion) pero eso es una garantia del producto Composio en general, no una
confirmacion especifica de que Houston las aplique en la practica. Fuente: Composio, "Per-User
OAuth for AI Agents" (https://composio.dev/content/per-user-oauth-for-ai-agents).

No se aclara si el acceso a Gmail es consulta en vivo por pedido del agente o si se cachea/
sincroniza contenido en algun lado; la politica solo dice que el flujo de datos "es gobernado por
los terminos del tercero", trasladando la responsabilidad al usuario.

**Riesgo practico no verificado:** Google exige verificacion (CASA) para apps que piden scopes
sensibles de Gmail; sin verificar, el usuario ve la pantalla "unverified app... unsafe" y la app
queda limitada a 100 usuarios de prueba. No se encontro evidencia publica de que Houston o
Composio (como cliente OAuth) hayan pasado esa verificacion. Si no la pasaron, cualquier empresa
real que quiera conectar Gmail se topa con esa friccion, algo que no aparece en su marketing
("para gente no tecnica").

**Contraste con nuestra doctrina:** este repo ya decidio (gotcha 2026-06-30, CLAUDE.md) que el
agente Hermes NUNCA maneja secretos directo (patron host-job + snapshot: un job de confianza del
host toca la credencial, el agente solo lee el resultado sanitizado). Houston hace lo opuesto por
diseno: el agente mismo trae el token OAuth y toca Gmail directo. Mas comodo para el usuario, pero
es la misma superficie de ataque (exfiltracion de token por prompt injection) que Composio
reconoce como riesgo en su propia documentacion.

## 6. Cumplimiento regulatorio / LATAM

No se encontró ninguna feature de cumplimiento fiscal/legal/contractual multi-país. El
"Bookkeeper" es un agente de contabilidad genérico, sin mención de normativa local. Este sigue
siendo terreno donde Hermes (grafo regulatorio multi-país, Fase 2-3) no tiene comparación directa
en Houston: es nuestro foso, no el suyo.

## 7. Empresa, equipo y financiamiento

Fundada **febrero 2026** por los colombianos **Felipe Salinas** (admin. de empresas, Universidad
de los Andes; ex Red Bull, Polymath Ventures, Latitud) y **Julián Arango** (ML engineer), sede en
San Francisco. Nació como herramienta interna de **TaxFlow**, su startup previa (agentes de IA
para firmas contables en EE.UU.), que sí cerró preseed de **US$750,000** en enero 2025
(Platanus Ventures, BFF, ángeles incluyendo Brian Requarth y Brian York).
**Houston mismo no tiene ronda cerrada confirmada**: prensa dice que "se prepara para levantar
una ronda con inversionistas de Silicon Valley" (sin fecha ni monto). Presentado en Harvard
Innovation Labs, Cornell y South Summit Madrid.
Fuentes: [Forbes Colombia](https://forbes.co/ia/houston-plataforma-para-crear-agentes-de-ia-sin-programar)
(2026), [El Ecosistema Startup](https://ecosistemastartup.com/houston-1-500-usuarios-en-46-paises-con-ia-no-code/) (2026).

## 8. Público objetivo (mensaje ambiguo)

- Home: personas no-técnicas, roles individuales (asistente, contador, ventas...).
- Prensa LATAM cita a los fundadores apuntando a *"founders que buscan automatizar procesos sin
  depender de equipos de ingeniería"*.
- `/startups/`: apunta a desarrolladores/emprendedores usando Houston como motor para construir
  SUS propios productos (caso propio citado: un "tax product" armado en una noche).

No hay landing sectorial dedicada más allá de esos ejemplos de finanzas/contabilidad.

## 9. Tracción, actividad y comunidad

- **1,500+ usuarios en 46 países**, **10 pilotos corporativos, 4 de ellos empresas colombianas**
  (sin nombres revelados), hackathon planeado en Colombia para reclutar talento regional.
- Ritmo de ship muy alto: **8 releases entre el 30-jun y el 24-jul-2026**, incluyendo soporte
  reciente a Claude Sonnet 5 (contexto 1M), Fable 5, GPT-5.6, y beta de "Houston Cloud".
- GitHub: **87 stars, 62 forks, 60 issues abiertos, 1,127 commits, licencia MIT**: motor
  **open source**, actividad moderada/temprana (no viral).
- **Sin reseñas verificables** en Reddit, Hacker News, ProductHunt, G2 ni Capterra: el producto
  aún no tiene tracción de terceros en esos canales, o es mínima.
- Cobertura de prensa solo en español (Forbes Colombia, El Heraldo, El Ecosistema Startup);
  **nada en TechCrunch** ni prensa tech en inglés todavía.
- Enterprise ofrece soporte "English and Spanish", señal de ambición LATAM temprana, aunque
  producto/docs/changelog están enteramente en inglés hoy.

## 10. Contradicciones / cabos sueltos detectados

- **Stack técnico:** un snippet de búsqueda sobre el repo de GitHub lo describía como "Rust
  engine + Tauri desktop app", mientras el README fetcheado dice *"Houston uses a single
  TypeScript engine"*. No resuelto, no es crítico para el análisis de negocio, pero no citar
  el stack como un hecho cerrado sin volver a verificar directo en el repo.
- **Facturación Team/Enterprise por token:** ver punto bloqueante en §2.
- **Protocolo A2A real vs. nombre de marketing:** ver §4.

## 11. Implicaciones para Hermes OS · A2A

- **Houston ya reclama interoperabilidad tipo A2A + MCP públicamente.** Nuestro "rumbo a
  interoperabilidad A2A" deja de ser diferenciador solo por existir; el diferenciador real
  tendría que ser la implementación (protocolo real, no solo el nombre): pendiente de
  verificar la de ellos.
- **Nuestro foso más defendible sigue siendo el grafo regulatorio multi-país** (fiscal/legal/
  contractual): Houston no tiene nada equivalente.
- **Distribución distinta:** Houston es app de escritorio a instalar; Hermes es chat-first vía
  Telegram, sin fricción de instalación, mejor calce para el operador informal LATAM que
  probablemente no instala software de escritorio en su flujo diario.
- **Amenaza geográfica real, no hipotética:** fundadores colombianos, pilotos corporativos en
  Colombia, hackathon planeado en el país. Houston está reclutando y validando en el mismo
  mercado que Hermes OS A2A apunta.
- Houston es **open source (MIT)** en su motor, vale la pena que alguien del equipo revise el
  repo si se quiere entender su arquitectura interna con más profundidad que lo que exponen
  públicamente en marketing.

## 12. Conectores Composio (Houston) vs. patron host-job de Hermes, investigado 2026-07-24

Mapeo del codigo real de este repo (no roadmap aspiracional) para comparar contra el modelo de
Composio de Houston (catalogo gestionado de 1000+ herramientas con OAuth por conector, ver §4-5.1).

**Hallazgo central: Hermes no tiene hoy ningun equivalente a Composio.** Grep exhaustivo de
"MCP", "OAuth", "connector", "Gmail", "Calendar", "HubSpot", "Stripe" en `businessos/**` no
encuentra ningun catalogo de conectores para el usuario final del negocio. Cada mencion de
"conector" en el repo es sobre gateways de canal de mensajeria (Telegram/WhatsApp), no APIs de
productividad de terceros.

**Lo que Hermes usa en su lugar (patron host-job + snapshot, ya en produccion, no solo infra
interna):**
- Cobros: `businessos/polar-cobros.py` (el agente deja un JSON pendiente, el host-job con
  `POLAR_ACCESS_TOKEN` crea el Checkout Session).
- Persistencia: `businessos/ingest-facturas.py`, `businessos/ingest-token-usage.py`,
  `businessos/evaluar-facturas.py`, `businessos/validar-contratos.py` (todos con
  `SUPABASE_SERVICE_ROLE_KEY`, ninguno accesible al agente).
- Confirmado explicito en `businessos/clientes/AGENTS.md`: "TU no tienes el service_role... no
  escribes a Supabase tu", "TU no escribes a token_usage... no tienes el service_role".

**MCP:** no implementado en runtime, solo mencionado en `businessos/ROADMAP.md` como capa
aspiracional; el motor del Ejecutor (`ejecutor-a2a/claude_engine.py`, `fabric_engine.py`) no
cablea servidores MCP. Lo que si esta implementado y verificado en codigo es **A2A real**: agent
card en `/.well-known/agent-card.json` (SDK `a2a`, `coordinador-a2a/app.py`), no solo el nombre
de marketing que reclama Houston sin spec publico.

**Conectar Gmail/Calendar de un CLIENTE FINAL: no existe, es brecha explicita.** Lo unico
parecido es `businessos/frontends/control-interno/integrations/calendar/agent-event.py`, pero es
de una app interna distinta, con una cuenta Google FIJA por variable de entorno
(`GOOGLE_CALENDAR_ACCOUNT`) para el propio operador, no un flujo OAuth multi-tenant donde cada
cliente conecta su propia cuenta.

**Dos filosofias de seguridad opuestas, no solo una diferencia de features:**
- Houston: el agente autonomo trae su propio token OAuth y actua directo. Mas rapido de
  construir, misma superficie de ataque (exfiltracion de token por prompt injection) que
  Composio reconoce como riesgo en su propia documentacion.
- Hermes: ningun agente toca una credencial real jamas (scrubbing de secretos del runtime por
  diseno, gotcha 2026-06-30). Mas lento de extender (cada integracion nueva es un host-job a
  mano, no "conectar de una lista de 1000"), pero es la decision correcta para un negocio que
  maneja datos fiscales/contables/contractuales sensibles.

**Implicacion de producto:** si el roadmap de Hermes llega a incluir que un cliente final
conecte SU Gmail/HubSpot/Stripe (no solo que el equipo interno opere el negocio), hoy no hay
nada construido para ese caso. Decision pendiente si se llega ahi: construir un "Composio
propio" con el mismo cuidado de aislamiento (mas caro, mas seguro) vs. aceptar el patron
agente-con-token-directo de Houston para ese caso puntual (mas rapido, contradice la doctrina
de scrubbing ya establecida en este repo).
