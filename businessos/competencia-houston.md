# Análisis competitivo — Houston (gethouston.ai) vs Hermes OS · A2A

> **Fecha:** 2026-07-24. **Método:** workflow de 3 agentes (ingesta web con sitemap real,
> clon del repo con historia, verificador con cuestionario fijo de moat re-chequeando
> contra fuentes primarias), plan atacado adversarialmente antes de ejecutar.
> **Sello de evidencia:** lado Houston verificado al SHA `cb4ce0f3c11a950459d7148fafc580f800619ac`
> (fetches y clon del 2026-07-24; blanco móvil: ~29 commits/día, este informe caduca rápido).
> **Lado Hermes = fuentes documentales al commit `d9128a1`, NO verificado en runtime.**

---

## 0. ¿Compiten por el mismo comprador? (la pregunta antes del plan)

**Hoy, no.** Houston vende un workspace horizontal self-serve (desktop gratis → $15/asiento)
a prosumers y startups globales en inglés (+ES/PT). Hermes vende white-label B2B de alto
contacto a PYMEs y verticales reguladas LatAm por WhatsApp/Telegram/Slack. Distinto
comprador, distinto canal, distinto motion.

**Donde sí chocan:** (a) la narrativa — ambos venden "agentes que hacen el trabajo, no chat";
(b) el futuro — su página `/startups/` invita a founders a construir verticales de
"contabilidad, legal y compliance" SOBRE Houston: es una invitación abierta a que otro
equipo arme un Hermes-like sobre su infra gratis. La amenaza no es Houston; es quien
construya encima de Houston.

---

## 1. Cómo funciona Houston (verificado, no marketing)

**Producto:** "AI-native workspace" — app de escritorio (Tauri) + iOS (Swift, en/es/pt) +
web, donde el usuario "contrata" agentes pre-construidos (Bookkeeper, HR Manager, Sales
Rep… 8 bundled en `store/catalog.json`) que operan herramientas reales. Tagline: *"Stop
being the USB cable between AI and your tools"*. BYO-subscription: corre sobre el ChatGPT
o Claude que el usuario ya paga.

**Arquitectura real (del repo, no del README):**
- **El "Rust engine" ya no existe.** `convergence/final-cutover.md`: el motor Rust (~51k
  LOC, 17 crates) fue **borrado**; quedan 59 archivos `.rs` que son solo el shell Tauri.
  El motor único es TypeScript (2.506 archivos .ts/.tsx).
- **El loop del agente es de TERCEROS:** `packages/runtime` depende de
  `@earendil-works/pi-ai@0.82.0` y `pi-coding-agent@0.82.0` (npm externo, el equipo lo
  versiona como dependencia: commit a9bea0fe "update pi (Earendil) dependencies").
- **Componentes:** `packages/protocol` (tipos wire v3 + zod) → `packages/host` (server
  abierto, ports/adaptadores) → `packages/runtime` (motor pi) → providers IA (OAuth
  Anthropic/OpenAI o API keys) + **1000+ integraciones vía Composio** (agregador externo;
  en el plan free las llamadas se reenvían **por el cloud de Houston con la sesión del
  usuario** — lock-in operativo sutil).
- **OSS vs negocio (`BOUNDARY.md`):** TODO el repo es MIT. El control plane cerrado fue
  "RETIRED and deleted". El negocio vive FUERA del repo: gateway privado multi-tenant
  (`gateway.gethouston.ai`) + un pod por agente que corre este mismo código abierto.
  Regla de una vía (OPEN nunca importa CLOSED) con checker automatizado.
- **Superficies developer:** REST Missions API (misiones asíncronas con modos
  execute/plan/auto, webhooks firmados, SSE), **protocolo A2A** (JSON-RPC 2.0: métodos
  `message/send`, `message/stream`, `tasks/get`, `tasks/cancel`; auth `Bearer hst_...`;
  card en `/a2a/:org/:agent/.well-known/agent-card.json`; **sin header de versión A2A
  documentado**), y MCP (4 tools).
- **Agent Store** (`agents.gethouston.ai`): lanzado y **VACÍO** al 2026-07-24 ("The store
  is brand new…").
- **Se construye con agentes**, como nosotros: 5 ramas remotas `agent/task-YYYYMMDD-*`,
  1.127 commits en ~4 meses, 408 en los últimos 14 días. Equipo humano: 4 personas
  concentradas (Julian Arango 602, Daniel Vélez 376, Juan David Rincón 128 — nombres
  hispanos; guías en español; probable equipo LatAm).

**Pricing:** Personal Free ("free forever", sin tarjeta) · Team $15/asiento/mes ($12
anual) — los agentes 24/7 y tareas programadas viven AQUÍ, no en free · Enterprise custom.
Laguna verificada: el tier de las API keys `hst_` no está documentado.

**Tracción externa verificable:** 87 stars, 62 forks, 60 issues, 1 watcher. Modesta.
Cero fuentes de terceros encontradas (HN/PH/funding) — todo lo demás es su propio copy.

---

## 2. Similitudes con Hermes

1. **Misma tesis de fondo:** agentes que EJECUTAN trabajo real, no chat que asesora.
2. **Mismos protocolos de interoperabilidad:** A2A + MCP como superficies públicas.
3. **Ambos se construyen con agentes:** sus ramas `agent/task-*` son el espejo de
   nuestro trío/enjambre construyendo la propia fábrica.
4. **Misma economía de producto:** "un producto, infinitas versiones" (ellos) ≈ "se
   fabrica por configuración, no se desarrolla por cliente" (nosotros).
5. **Agentes por función de negocio:** sus Bookkeeper/HR/Sales ≈ nuestros departamentos.
6. **Motor pluggable multi-modelo** con BYO-credenciales.
7. **Equipo pequeño (4-5 personas), probablemente LatAm, mismo pool de talento.**

## 3. Diferencias

| Eje | Houston | Hermes |
|---|---|---|
| Motion | PLG self-serve horizontal (desktop gratis → seats) | White-label B2B alto contacto (implantación + tiers) |
| ICP | Prosumer/startup global (EN, +ES/PT) | PYME y verticales reguladas LatAm |
| Canal | Desktop app + iOS + web (hay que instalar) | WhatsApp/Telegram/Slack (donde el usuario ya vive) |
| Confianza | "La IA opera la app" (autopilot-friendly) | Copiloto-no-autopiloto: Supervisor independiente + gates deterministas + humano en lo irreversible |
| Conocimiento regulado | No tiene (lo delega a founders que construyan encima) | **Grafo regulatorio multi-país con fuente citada** — fiscal MX/CO, contable, contractual, regulatorio |
| Motor | Alquilado a Earendil (2 maintainers externos) | claude-agent-sdk (Anthropic) + seam multi-proveedor; la verificación (Supervisor) es 100% propia |
| Integraciones | 1000+ alquiladas a Composio (re-autorizables; forwarding por su cloud en free) | CLIs impresos + MCP + host-jobs (menos cobertura, cero dependencia de agregador) |
| Marca | Central (Houston) — no hay white-label | El cliente pone SU marca |
| Código | Todo MIT público; negocio en el gateway | Repo privado |
| Estado | ~4 meses, tracción externa modesta, store vacío | Incubación, n=0 clientes pagando |

## 4. El moat de Houston — lo real vs lo aparente

**NO es moat** (verificado): el código (MIT, todo abierto) · el motor (de terceros) · las
1000+ integraciones (de Composio — cualquiera con una API key de Composio las tiene) ·
el Agent Store (hoy vacío: es opcionalidad, no efectos de red).

**SÍ es moat (hoy, moderado):**
1. **Distribución pulida multi-plataforma** — desktop firmado/notarizado (mac/Win/Linux),
   iOS nativo trilingüe, web. Meses de trabajo que nosotros no tenemos ni necesitamos aún.
2. **El gateway cerrado + session-forwarding de Composio** — en el plan free, las
   conexiones del usuario viven atadas a SU cloud. Switching cost operativo (sin
   exportador de datos documentado — verificado NO_ENCONTRADO).
3. **Velocidad de ejecución agéntica** (~29 commits/día con 4 humanos) — el mismo moat
   que nosotros estamos construyendo con el trío.
4. **Posicionamiento de categoría** ("AI-native workspace") + docs developer limpias.

**Fragilidades del moat:** motor alquilado a un proyecto de 2 personas (riesgo
existencial si Earendil pivota) · categoría contestada por gigantes (OpenAI/Anthropic
apps de escritorio, Notion AI) · tracción externa débil tras 4 meses · "free forever"
con laguna en el tier developer · sin efectos de red reales todavía (store vacío).

## 5. Dónde alcanzarlos y sobrepasarlos — y dónde NO jugar

**NO jugar su juego.** Perseguir el desktop horizontal PLG global sería regalarles 4
meses de ventaja en un tablero donde no tenemos nada — y contradice el veredicto del
Consejo (2026-07-24): vender B2A ya, con foco.

**Nuestro terreno, donde ya estamos adelante:**
1. **Profundidad regulada LatAm.** Su `/vision/` dice que los verticales de
   contabilidad/legal/compliance los construirán *founders sobre Houston*. Nosotros YA
   somos ese vertical: el grafo con fuente citada (LISR/CFF/CNSF/NIF/CCF) no se copia
   con código — es curaduría legal con gate de procedencia. **Es exactamente la pieza
   que a su ecosistema le falta y que un fork de su repo no da.**
2. **Supervisión verificable como promesa de venta.** Su pitch es "la IA opera la app";
   el nuestro es "nada irreversible sin verificación independiente + humano". Para una
   PYME que arriesga SU facturación o SU cumplimiento fiscal, la segunda promesa cierra
   ventas que la primera espanta. (Cautela honesta: no exploramos el 100% de su runtime;
   ausencia de evidencia de gates ≠ evidencia de ausencia.)
3. **Canal sin fricción.** El dueño de negocio LatAm no instala una app de escritorio:
   ya está en WhatsApp. Nuestro CRM conversacional entra donde Houston ni compite.
4. **White-label.** Houston es marca central; nosotros vendemos que el broker/agencia
   ponga la SUYA. Segmento entero que ellos estructuralmente no atienden.

**Qué copiarles (con juicio, barato):**
1. **Docs developer públicas** — su página `/developers/` (REST + A2A + MCP con ejemplos
   curl) es mejor que la nuestra. Cuando abramos la card de ventas-a2a a partners,
   copiar ese formato.
2. **"Missions" como unidad comercial** — natural-language-in → resultado-out con modos
   execute/plan/auto y webhooks firmados. Mejor naming y mejor contrato que "tarea del
   trío" para exponerle a clientes.
3. **El Agent Store como concepto de catálogo** — nuestra versión: catálogo de
   DEPARTAMENTOS white-label instalables por configuración. Ellos lo tienen vacío;
   nosotros tenemos 4 departamentos reales operando.

**Interoperabilidad A2A — NO concluida (por diseño):** Houston documenta `message/send`
JSON-RPC **sin header de versión**; nuestro stack (a2a-sdk v1 proto-first) usa
`SendMessage` + header `A2A-Version: 1.0` obligatorio — y nuestro propio CLAUDE.md
registra que `message/send` da -32601 en el SDK v1. **Son dialectos distintos del mismo
protocolo: la interoperabilidad NO es automática y solo un handshake real la decide**
(requiere cuenta Houston + API key `hst_` → gate humano). Si interopera, su store vacío
es un canal potencial para exponer el grafo como agente consumible.

## 6. Síntesis ejecutiva

Houston **valida nuestra tesis** (agentes que operan el negocio, A2A/MCP, fábrica que se
construye con agentes) jugando **otro juego** (horizontal, self-serve, global). Su moat
real es distribución + gateway, no tecnología: el motor es alquilado y el código es
público. No nos quita el comprador de hoy; nos presta urgencia — porque su página de
startups invita a que alguien más construya "nuestro" vertical sobre su infra gratis.

La respuesta no es imitarlos: es **cerrar el primer cliente** (el mismo veredicto del
Consejo) apoyados en lo que ellos no tienen y no pueden fabricar rápido: grafo
regulatorio citado, supervisión verificable, canal WhatsApp y marca blanca. Y robarles
tres ideas baratas: docs developer, el contrato "Missions", y el catálogo de
departamentos como nuestro Agent Store.

---

*Investigación: workflow `wf_1adc32ca-cd7` (3 agentes Sonnet, 60 tool calls, ~313k
tokens). Evidencia primaria por afirmación en el output del workflow. Clon local:
scratchpad de la sesión, SHA `cb4ce0f3`.*
