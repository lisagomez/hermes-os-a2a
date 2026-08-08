# Plan de Marketing y Funnel de Ventas B2B/A2A — Hermes OS · A2A

> **Vender implementación de IA para Pymes y empresas de México y LATAM,
> con la infraestructura que ya está viva — y sin prometer la que no.**
>
> **Versión 1.0 · 2026-08-07 · Estado: PROPUESTA, sin aplicar**
> **Extiende:** `businessos/GTM.md` (2026-07-20) — este plan es la capa de
> marketing, captación y nutrición SOBRE el GTM; hereda su tesis, su ICP, su
> pricing y sus gates sin reescribirlos.
> **Anclado a:** `businessos/ROADMAP.md` · **Solicitud:** prompt de Victor
> "Plan de Marketing y Funnel de Ventas B2B/A2A" (v2, 2026-08-07).
>
> Lo marcado *(construido)* está verificado en el código del repo.
> Lo marcado *(propuesta)* es recomendación pendiente de validación de Elisa.

---

## Índice

0. Semáforo de realidad
1. Resumen ejecutivo
2. Estándares, glosario y sistema comercial
3. Posicionamiento y arquitectura de oferta (portafolio + servicios)
4. ICP, avatares y segmentos prioritarios
5. Pipeline de avatar a venta
6. Funnel multicanal (canales A–F)
7. Landing principal y arquitectura web
8. Lead magnets y ofertas de entrada
9. CRM, scoring y operación comercial
10. WhatsApp CRM y Meeting Copilot dentro del funnel
11. Estrategia de contenido y autoridad
12. Agencia de marketing digital agéntica (redes, SEO, AEO)
13. Roadmap comercial de 90 días
14. KPIs y tablero comercial
15. Quick wins de esta semana
16. Decisiones que necesito de la dueña
17. Anclaje al roadmap
— Nota de método

---

## 0. Semáforo de realidad

Este plan se construye sobre infraestructura real, y su primera regla es no
vender sobre la que aún no opera. Todo lo que sigue distingue tres estados:
**🟢 vivo** (corriendo, verificable en el repo/runtime), **🟡 construido sin
desplegar** (código verde, falta un paso de despliegue o dato), **🔴 bloqueado
por gate** (decisión de la dueña, no deuda técnica).

| Activo | Estado | Detalle |
|---|---|---|
| `cliente-web2` — landing + cotizador + chat vendedor IA | 🟢 | Vercel; leads `origen='web2'` persisten *(construido)* |
| Mission Control — vista CRM (embudo, conversaciones, tabla, mover etapa) | 🟢 | Vercel con allowlist fail-closed *(construido)* |
| Meeting Copilot — pre-discovery + agendamiento M1–M5 + reserva pública | 🟢 | Vercel con auth *(construido)* |
| `enriquecimiento-a2a` — waterfall sin LLM (RFC, DENUE, 69-B, grafo) | 🟢 | Desplegado en prod 2026-08-02 *(construido)* |
| `ventas-a2a` — card comercial pública + gates deterministas | 🟢 | Edge con TLS + rate-limit *(construido)* |
| Tabla `leads` — 10 etapas, `origen`, `canal`, `telefono` | 🟢 | Fuente de verdad del pipeline *(construido)* |
| `crm-canales` — webhooks WhatsApp Cloud + Telegram, multi-tenant, sup-crm | 🟢/🔴 | Código y runtime vivos; **cero tenants reales**: responde 503 por diseño hasta el alta Meta Business (gate) |
| CRM-4 — calificación de intención, nutrición, atribución de campaña | 🟡 | Construido con 52 tests; **sin desplegar**: `calificacion`/`campana_id`/`utm` no producen dato en prod |
| Skills EG.CRM (pre-descubrimiento → paquete comercial) | 🟡 | Versionadas en repo; NO desplegadas al volumen (esperan motor real) |
| `enviar-salientes.py` — outbound email con doble verificación | 🟡/🔴 | Existe en dry-run; **ningún correo sale** hasta aprobación + SMTP/dominio (gate) |
| Motor LLM real del departamento de adquisición | 🔴 | Hoy MockEngine; activarlo es gate de la dueña |
| **Outbound proactivo por WhatsApp** (plantillas HSM + ventana 24h) | 🔴 | **P2 pendiente.** El roadmap prohíbe expresamente prometer promociones/recompra antes de cerrar P2 |
| Dominio propio | 🔴 | Todo el edge vive en `sslip.io` temporal (gate, ya listado en GTM §11) |
| Puente Meeting Copilot → `leads` (`origen='copilot'`) | 🔴 (diseño) | El origen existe en el CHECK pero **no tiene escritor**; las citas no crean leads hoy |
| Notificador real de citas (email/WhatsApp) | 🟡 | Cola idempotente **mock declarado**; falta host-job real |
| Columna de scoring en `leads` | 🔴 (no existe) | El modelo 0–100 de §9 es diseño nuevo; tocar BD es decisión de Elisa |

**Consecuencia operativa:** las fases de este plan que dependen de un 🔴 lo
declaran como dependencia nombrada, nunca como supuesto. La Ola 0 del GTM §5
(alta WhatsApp, dominio, motor real + salientes) sigue siendo la puerta de
entrada de casi todo.

---

## 1. Resumen ejecutivo

**Qué se propone.** Convertir la infraestructura comercial ya construida
(vendedor web, CRM conversacional, copiloto de reuniones, enriquecimiento,
panel CRM) en una **máquina comercial B2B medible**, en cuatro movimientos:

1. **Ordenar la oferta** en 5 líneas de solución y 7 servicios con entrega
   clara (§3), todas respaldadas por activos que existen — bajo la promesa
   madre del GTM: *"Tu departamento con IA bajo supervisión, con tu marca"*,
   copiloto, no autopiloto.
2. **Activar el funnel multicanal** (§6) con los canales que ya operan
   (`cliente-web2`, agenda del Copilot, outreach preparado bajo gates) y
   encender WhatsApp y email exactamente cuando sus gates se abran — con
   campañas diseñadas desde hoy para ese momento.
3. **Instrumentar la conversión** (§9, §14): scoring 0–100 propuesto sobre
   señales que ya se capturan, etapas = las 10 reales de `leads.etapa`,
   KPIs leídos de las vistas que Mission Control ya tiene.
4. **Construir autoridad que venda** (§11, §12): contenido basado en lo único
   que este proyecto puede demostrar y la mayoría no — operación real de
   agentes con gates, trazabilidad y fuente citada — y, como línea de
   expansión, una agencia de marketing operada con el propio stack.

**Qué NO se propone.** Prometer outbound de WhatsApp antes de P2, enviar
correos antes de aprobar `enviar-salientes.py`, inventar claims fuera de la
lista curada, ni precios fuera de la política vigente. El plan hereda los
gates del GTM §11 y los trata como el camino crítico que son.

**La meta heredada** (GTM §5, Ola 1, *propuesta*): **2 pilotos CRM firmados
en 60 días**, cada uno cerrado en el hito CRM-3 (un caso resuelto de punta a
punta en el WhatsApp del cliente). Este plan añade el andamiaje de marketing
para que esos pilotos no dependan solo de la red del equipo, y para que el
tercero en adelante lleguen por un funnel que se mide.

---

## 2. Estándares, glosario y sistema comercial

### 2.1 Estándares de operación comercial

Los estándares no son aspiraciones: cada uno se ancla al mecanismo que ya lo
hace cumplir (o al gate que falta para poder cumplirlo).

**a) Calidad de leads.**
- Dato mínimo para que un lead exista: `lead_id` + `origen` + al menos un
  identificador de contacto (teléfono E.164 si entra por WhatsApp; el chat
  web captura empresa/contacto/mensaje). *(construido: tabla `leads`)*
- Dato mínimo para que un lead AVANCE a `calificado`: empresa identificable +
  canal de respuesta + señal de dolor en una de las 4 cubetas (operativo /
  documental / regulatorio / comercial — las del pre-descubrimiento EG.CRM).
  *(propuesta)*
- El estándar del pipeline EG.CRM (correo + WhatsApp obligatorios en la ficha
  de contacto) aplica desde el hito 2 (agendar llamada), no en la captación:
  exigirlo en el primer contacto mata conversión. *(propuesta)*
- Validación automática: el enriquecimiento (`enriquecimiento-a2a`) corre
  sin LLM y aporta RFC/DENUE/69-B al expediente del lead *(construido)*.
  **Ojo:** que un lead marcado 69-B (facturera) NO se persiga es hoy criterio
  humano al revisar el expediente — el enriquecimiento, por frontera de
  diseño, jamás escribe en `leads`, así que nada lo excluye en automático.
  La regla de descarte de §9.3 la ejecuta el equipo. *(propuesta de rutina)*

**b) Tiempo de respuesta (SLA).**
- Chat web: respuesta inmediata (el vendedor IA responde en vivo). *(construido)*
- WhatsApp entrante: respuesta del agente en segundos cuando haya tenant
  activo; escalado a humano visible en Mission Control. *(construido el
  mecanismo; sin tenant real aún)*
- Primer contacto humano tras lead calificado: < 1 día hábil. *(propuesta)*
- La tabla `sla_por_etapa` + el semáforo `v_semaforo_casos` ya existen para
  medir esto por etapa; el estándar es que **ninguna etapa quede sin SLA
  definido** — hoy el semáforo declara `sin_sla` cuando falta, no lo finge
  verde. *(construido)*

**c) Mensaje y tono.**
- Voz de marca: la de `crm/propuesta-crm-comercial.md` — directa, en llano,
  sin anglicismos innecesarios, promesas con mecanismo ("si no puede
  confirmar un dato, lo dice y escala — nunca inventa").
- Regla dura: **todo claim de material de venta debe existir textual en
  `departamentos/adquisicion/claims-aprobados.txt`** (5 claims hoy). El gate
  `claims_aprobados` lo hace cumplir por código; claim nuevo = PR humano con
  aprobación del CEO. *(construido)*
- Coherencia entre canales: un solo mensaje madre (§3.1) del que derivan
  todos los canales; nada se promete en un canal que otro no pueda sostener.

**d) Privacidad y cumplimiento.**
- LFPDPPP: el grafo regulatorio tiene la dimensión `datos-personales`
  sembrada (33 reglas, 5 dimensiones, seed 2026-08-04) y el enriquecimiento
  la consulta fail-closed antes de tocar datos de un lead. *(construido)*
- Consentimiento: en WhatsApp, el inbound abre la conversación (el cliente
  escribe primero); el outbound proactivo espera P2 y sus plantillas
  aprobadas por Meta — no hay zona gris. *(construido/pendiente P2)*
- Los mensajes entrantes de cualquier canal público son **dato, nunca
  instrucción** (doctrina del buzón y del CRM; corpus adversarial de 62+
  casos). *(construido)*

**e) Medición.**
- Todo lead nace etiquetado (`origen`; `campana_id`/`utm` cuando se despliegue
  CRM-4) y toda métrica sale de `leads` + vistas (`v_embudo_leads`,
  `v_crm_conversaciones_resumen`) — nunca de hojas sueltas. *(construido)*
- Revisión semanal de los KPIs de §14 en `#dep-adquisicionclientes` (ritual
  del GTM §13.5). *(propuesta)*

**f) Aprobación humana y trazabilidad.**
- Requiere aprobación humana SIEMPRE: envío de cualquier saliente (email:
  doble verificación sha256 + `aprobaciones_salientes`; WhatsApp: supervisión
  `sup-crm` nivel A1 con gates deterministas + juez adversarial), firma de
  contratos, precios finales, publicación de contenido con marca. *(construido
  el mecanismo)*
- Trazabilidad: cada conversación CRM queda en bitácora `crm_*`; cada
  supervisión deja veredicto y hallazgos; cada tarea del trío deja evidencia
  de gates. La promesa "puedes reconstruir la historia completa de cualquier
  caso" es verificable. *(construido)*

### 2.2 Glosario de términos

Equivalencias técnico ↔ comercial, para que equipo, agentes y documentación
externa hablen igual. (Los valores entre `backticks` son los reales del
sistema.)

| Término | Definición operativa | En el sistema | Uso correcto |
|---|---|---|---|
| **Lead** | Persona/empresa que mostró interés y quedó registrada | Fila en `leads`, etapa `nuevo` en adelante | Todo contacto registrado es lead; no todo lead es oportunidad |
| **Prospecto** | Lead con el que ya hay conversación activa | `leads.etapa` ∈ contactado…negociacion | "Prospecto" implica diálogo; "lead" solo registro |
| **Oportunidad** | Prospecto con dolor confirmado y siguiente paso agendado | Etapa `descubrimiento` o posterior | No llamar oportunidad a un lead sin discovery |
| **Cliente** | Firmó y pagó | Etapa `ganado`; en marca blanca, además un **tenant** | — |
| **Usuario** | Quien usa la superficie (puede no ser quien compra) | p. ej. el ejecutivo que atiende el WhatsApp del cliente | Comprador ≠ usuario: el avatar de §4 distingue ambos |
| **Tenant** | Cliente de marca blanca con su espacio aislado | Fila en `crm_tenants`; aislamiento por diseño | "Tenant" es término interno; al cliente se le dice "tu espacio/tu marca" |
| **Agente** | Software que ejecuta trabajo bajo reglas | Servicios A2A (`ventas-a2a`, ejecutor…) | Nunca "el agente lo hace solo": siempre bajo supervisión |
| **Copilot** | IA que asiste a un humano en su tarea, sin sustituirlo | Meeting Copilot | Copiloto, no autopiloto — es la promesa de marca |
| **CRM** | Sistema que registra y hace avanzar la relación comercial | `leads` + bitácora `crm_*` + vista CRM de Mission Control | — |
| **CRM conversacional** | CRM cuyo canal primario es la conversación (WhatsApp/Telegram) | `crm-canales` + `sup-crm` | Es la línea de producto 1 (§3.2) |
| **Pipeline** | El recorrido completo de un lead hasta cierre | Las 10 etapas de `leads.etapa` | Pipeline = recorrido; embudo = su foto con volúmenes |
| **Embudo** | Los volúmenes por etapa y sus tasas de paso | `v_embudo_leads` + vista CRM | — |
| **Etapa** | Posición del lead en el pipeline | `nuevo → calificado → contactado → descubrimiento → propuesta → negociacion → contrato → onboarding → ganado \| perdido` | Solo estas 10; no inventar estados |
| **Discovery / descubrimiento** | Sesión estructurada para mapear dolor, proceso y factibilidad | Etapa `descubrimiento`; sesión de 60 min sin costo (GTM §7) | Primer paso de TODO lead, en todos los canales |
| **Pre-discovery** | Investigación del prospecto ANTES de la primera llamada | Pipeline de Meeting Copilot + skill `adquisicion-pre-descubrimiento` (Ficha de Inteligencia) | Lo declarado se separa de lo hipotético (`observado`/`hipótesis`) |
| **Scoring** | Priorización numérica de leads | Hoy NO existe columna; señales en `calificacion` + `calificacion_senales` (§9 propone el modelo) | No confundir con **calificación** (ver abajo) |
| **Calificación** | Dictamen de intención: `califica` / `no_califica` / `indeterminado` | Columna `calificacion` (CRM-4, sin desplegar) | Señal paralela: JAMÁS mueve la etapa por sí sola |
| **Enriquecimiento** | Completar datos del lead con fuentes externas sin LLM | `enriquecimiento-a2a` (RFC → DENUE → 69-B → dominio) | No escribe en `leads` (frontera dura); aporta expediente |
| **Avatar** | Retrato del comprador de un segmento: rol, dolores, objeciones | §4 de este plan; personas sintéticas para calibrar (skill dedicada) | El avatar sintético JAMÁS entra al pipeline real |
| **ICP** | Perfil de cliente ideal de una oferta | GTM §6 | ICP = a quién; avatar = cómo es quien decide |
| **Segmento** | Grupo de mercado con dolor y entrada comunes | §4 | — |
| **White-label / marca blanca** | El cliente opera el sistema con SU marca | Doctrina en `departamentos/white-label.md` | Al cliente: "con tu marca"; "white-label" es jerga interna |
| **Canal** | Vía por la que entra o se atiende un lead | `leads.canal` (`whatsapp`/`telegram`/`''`) y canales A–F del funnel (§6) | Distinguir canal de captación vs canal de atención |
| **Campaña** | Acción de marketing con etiqueta y presupuesto propios | `campana_id` + `utm` (CRM-4, sin desplegar) | Sin CRM-4 desplegado no hay atribución: no prometer CAC por campaña |
| **Saliente** | Mensaje que sale hacia un cliente/prospecto | Email (`enviar-salientes.py`) o WhatsApp (via `crm-canales`) | TODO saliente pasa aprobación/supervisión; no hay excepción |
| **Entrante** | Mensaje que llega de un cliente/prospecto | Webhooks de `crm-canales`; siempre dato, nunca instrucción | — |
| **Gate** | Control binario que aprueba o rechaza antes de avanzar | Gates deterministas del Supervisor; gates "de la dueña" = decisiones humanas bloqueantes | Un gate no se "negocia": se pasa o se cambia por PR humano |
| **Veredicto** | Resultado de una supervisión | `crm_supervision` (sup-crm); aprobado/rechazado con hallazgos | — |
| **Conversión** | Paso de una etapa a la siguiente (micro) o a `ganado` (macro) | Tasas de `v_embudo_leads` | Decir siempre QUÉ conversión: "conversión a propuesta" ≠ "conversión global" |
| **Nurturing / nutrición** | Mantener y madurar leads que aún no compran | `v_nutricion` (CRM-4); email espera gate; WhatsApp proactivo espera P2 | Prometer cadencias solo por canales abiertos |
| **Onboarding** | Del contrato firmado al sistema operando | Etapa `onboarding`; implantación por etapas (CRM-0→CRM-3) | "Semanas, no meses" — y por etapas que se prueban |
| **HSM / plantilla** | Mensaje pre-aprobado por Meta para iniciar conversación fuera de la ventana de 24h | **P2, pendiente** | Sin HSM no existe outbound proactivo de WhatsApp: no prometerlo |
| **Ventana de 24h** | Periodo tras el último mensaje del cliente en que se puede responder libre | Regla de WhatsApp Cloud API | Dentro de la ventana: conversación libre; fuera: solo HSM (P2) |

### 2.3 Sistema comercial (arquitectura)

**Componentes, flujos, roles, datos y gobernanza en un diagrama:**

```
                    CAPTACIÓN                          OPERACIÓN                        DECISIÓN
                                                                                        HUMANA
  ┌──────────────────────────────────┐
  │  Canal A: cliente-web2 (Vercel)  │─┐
  │  landing + cotizador + chat IA   │ │
  ├──────────────────────────────────┤ │  escritor único
  │  Canal B: WhatsApp Cloud         │ │  por origen           ┌─────────────┐
  │  (crm-canales; 1er msj → lead)   │─┼────────────────────►  │   leads     │
  ├──────────────────────────────────┤ │  web2 / crm / a2a     │ (10 etapas) │
  │  Canal C: eventos / QR           │ │                       └──────┬──────┘
  │  (aterrizan en A o B)            │─┘                              │
  ├──────────────────────────────────┤                                │ lee
  │  Canal D: Meeting Copilot        │  (puente a leads:              ▼
  │  reserva pública /reservar/…     │   PENDIENTE, §16)      ┌───────────────────┐
  ├──────────────────────────────────┤                        │  Mission Control  │
  │  Canal E: email nurturing        │  (espera gate          │  vista CRM:       │
  │  (enviar-salientes.py, dry-run)  │   salientes)           │  embudo · conv. · │
  ├──────────────────────────────────┤                        │  tabla · mover    │──► Equipo comercial
  │  Canal F: outreach dirigido      │                        │  etapa            │    (5 personas)
  │  (ventas-a2a card + pitch decks) │                        └───────────────────┘
  └──────────────────────────────────┘
                                          APOYO A LA VENTA
  ┌──────────────────────────────────────────────────────────────────────────┐
  │ enriquecimiento-a2a (expediente sin LLM) · transcripcion-a2a (STT)       │
  │ Meeting Copilot (pre-discovery, guided meeting, notas CRM, agenda)       │
  │ skills EG.CRM (ficha → entrevista → diagnóstico → informe → paquete)     │
  └──────────────────────────────────────────────────────────────────────────┘
                                          SUPERVISIÓN (nada sale sin pasar aquí)
  ┌──────────────────────────────────────────────────────────────────────────┐
  │ sup-crm (gates + juez LLM, cada saliente WhatsApp)                       │
  │ Supervisor A2A (gates comerciales: claims, precio, contrato, política)   │
  │ aprobaciones_salientes (email: sha256 + autenticidad)                    │
  │ Humanos: PM/CEO aprueban salientes, firman contratos, fijan precio final │
  └──────────────────────────────────────────────────────────────────────────┘
```

- **Roles.** Los agentes preparan, investigan, redactan, transcriben y
  responden lo acotado; los humanos habilitan canales, califican el juicio,
  aprueban todo saliente e irreversible, firman y fijan precio final. (El
  principio del pipeline EG.CRM: "la IA prepara, analiza y propone; los
  humanos deciden".)
- **Datos.** Captura: identificadores + conversación + etiqueta de origen.
  Almacén: `leads` (verdad del pipeline), bitácora `crm_*` (conversaciones),
  `erp` (activos/costeo), `token_usage` (costo por operación). Transformación:
  vistas SQL (`v_embudo_leads`, `v_nutricion`, `v_semaforo_casos`). Decisión:
  Mission Control + ritual semanal.
- **Gobernanza.** Las reglas comerciales viven en archivos versionados
  (claims, precios, plantillas de contrato) que los gates hacen cumplir y que
  solo cambian por PR humano con aprobación de CEO (y CFO en dinero). La
  auditoría es el propio historial: veredictos, bitácoras y evidencia de gates.

---

## 3. Posicionamiento y arquitectura de oferta

### 3.1 Posicionamiento (heredado del GTM, sin cambios)

- **Qué somos:** proveedor de **implementación de IA aplicada al negocio** —
  no vendemos "un software", implantamos departamentos y capacidades con IA
  bajo supervisión, con la marca del cliente cuando aplica.
- **Mensaje madre:** *"Tu departamento con IA bajo supervisión (automática +
  humana), con tu marca."* (GTM §2)
- **El pitch en 3 frases** (GTM §9): (1) *"Tu departamento con IA, con tu
  marca, en semanas — no un chatbot que inventa."* (2) *"Nada delicado pasa
  solo: lo irreversible lo aprueba tu equipo con un botón."* (3) *"Cada dato
  que te damos cita su fuente."*
- **Diferenciadores demostrables** (y solo estos): supervisión con gates
  re-ejecutables, trazabilidad de punta a punta, aislamiento por cliente,
  fuente citada (grafo regulatorio), margen conocido antes de firmar
  (`token_usage` por tenant).

### 3.2 Las 5 líneas de solución

**Línea 1 — CRM conversacional marca blanca** *(construido; espera 1er tenant)*
- **Promesa:** "Atención que vende, cobra y agenda — en el WhatsApp de tu
  negocio" (la propuesta comercial ya redactada en
  `crm/propuesta-crm-comercial.md`).
- **Cliente ideal:** Pyme con alto volumen conversacional (ICP-1, §4).
- **Problema:** pierde ventas por no responder a tiempo; el equipo pequeño
  vive saturado; nadie registra qué se prometió a quién.
- **Formato de venta:** descubrimiento sin costo → implantación por proyecto
  cerrado → mensualidad por nivel de uso. Piloto = hito CRM-3.

**Línea 2 — Sitio comercial con vendedor IA** *(construido)*
- **Promesa:** tu página deja de ser un folleto: conversa, cotiza y captura
  al interesado en el momento de mayor intención.
- **Cliente ideal:** negocio cuyo sitio recibe visitas que no convierten;
  también es el escaparate de nuestra propia captación (`cliente-web2`).
- **Problema:** el formulario de contacto muere en un correo que nadie
  responde; el visitante se va sin dejar rastro.
- **Formato de venta:** implantación cerrada (landing + chat acotado por
  prompt + captura a CRM) + mensualidad de operación.

**Línea 3 — Meeting Copilot comercial** *(construido)*
- **Promesa:** cada reunión de ventas llega preparada (pre-discovery con
  fuentes), se conduce mejor (guía y coaching) y termina con resumen, notas
  y siguiente paso agendado.
- **Cliente ideal:** equipos de venta consultiva que viven de reuniones de
  discovery/demo (ICP-3, §4).
- **Problema:** los asesores llegan a ciegas, el conocimiento de la llamada
  se pierde, y el seguimiento depende de la memoria de cada quien.
- **Formato de venta:** configuración inicial + acompañamiento; mensualidad
  por asesor. La agenda pública (M1–M5) entra como módulo.

**Línea 4 — Automatización comercial y pipeline de adquisición** *(construido
con gates pendientes)*
- **Promesa:** un pipeline donde la investigación del prospecto, la ficha de
  inteligencia, el diagnóstico y el paquete comercial los prepara la IA — y
  tu equipo solo decide.
- **Cliente ideal:** dirección comercial con operación desordenada y
  seguimiento inconsistente (ICP-4, §4).
- **Problema:** leads que se enfrían sin que nadie lo note, propuestas que
  tardan semanas, cero atribución por canal.
- **Formato de venta:** diagnóstico → implantación por fases del pipeline
  EG.CRM (7 hitos) → mensualidad. **Honestidad:** el outbound automático de
  email/WhatsApp se entrega cuando sus gates estén abiertos; se vende hoy la
  preparación asistida + aprobación humana, que es lo que opera.

**Línea 5 — Departamentos de IA por función (white-label)** *(construido;
validado en dogfood real)*
- **Promesa:** un departamento (software, procesos, adquisición…) que
  produce trabajo verificado por gates, con tu marca y tus datos aislados.
- **Cliente ideal:** empresa con backlog de producto/procesos sin equipo
  técnico interno (ICP-5, §4); prospectos white-label que quieren demostrar
  gobernanza.
- **Problema:** contratar un equipo es caro y lento; delegar a una agencia
  clásica pierde el control y la trazabilidad.
- **Formato de venta:** piloto acotado con criterios de aceptación → retainer
  mensual por capacidad de departamento.

### 3.3 Catálogo de servicios (7)

Regla transversal de precio: **implantación por proyecto cerrado + mensualidad
dentro de la política de precios vigente** (`politica-precios.json`: USD
500–5000/mes; el gate `precio_en_rango` rechaza lo demás). Las cifras
concretas de cada propuesta se dan **tras la sesión de descubrimiento**, como
ya establece `propuesta-crm-comercial.md` — este plan no fija precios nuevos.

| # | Servicio (nombre comercial) | Qué resuelve | Entregables | Duración | Modelo de cobro | Cliente ideal |
|---|---|---|---|---|---|---|
| 1 | **Diagnóstico de Madurez IA** | "Quiero IA pero no sé por dónde empezar" | Sesión de descubrimiento de 60 min + diagnóstico escrito de la operación + mapa de procesos automatizables + propuesta cerrada con alcance, plazos y precio | 60 min + entrega en ≤5 días | **Sin costo** (es la oferta de entrada del GTM §7) | Todo prospecto, todos los canales |
| 2 | **CRM Conversacional Implantado** | Ventas perdidas por atención lenta en WhatsApp | Canales conectados, caso de uso configurado, tono de marca por escrito, piloto real (CRM-3), reporte diario | Semanas, por etapas CRM-0→3 que se prueban antes de avanzar | Implantación cerrada + mensualidad por nivel de uso | ICP-1 (Pyme conversacional) |
| 3 | **Copilot de Reuniones para Equipos de Venta** | Reuniones sin preparación ni seguimiento | Pre-discovery configurado, guías de reunión, resumen+notas automáticas, agenda pública de asesores, tablero de citas | 2–4 semanas de configuración + adopción | Configuración cerrada + mensualidad por asesor | ICP-3 (venta consultiva) |
| 4 | **Pipeline Comercial Automatizado** | Leads que se enfrían y propuestas que tardan | Panel de canales, etiquetado de origen, ficha de inteligencia por lead, diagnóstico de factibilidad, paquete comercial asistido, KPIs por canal | Por fases (7 hitos EG.CRM); primeras fases en semanas | Implantación por fase + mensualidad | ICP-4 (dirección comercial) |
| 5 | **Departamento IA White-Label** | Backlog sin equipo; necesidad de demostrar control | Departamento configurado (software/procesos/adquisición), gates y supervisión, marca del cliente, aislamiento de datos, evidencia de cada entrega | Piloto en semanas; retainer continuo | Piloto cerrado + retainer mensual | ICP-5 (white-label) |
| 6 | **Consultoría de Implementación de IA en Procesos** | Proceso manual, caro o con errores; no saben si es automatizable | Análisis del proceso (¿existe?, ¿es agentizable?), informe con costo-beneficio y eficiencia actual vs propuesta, fases de implementación, plan de contingencia (el Informe de Análisis del hito 5 EG.CRM) | 2–4 semanas | Proyecto cerrado | Empresas medianas con procesos core manuales |
| 7 | **Gobernanza y Trazabilidad para IA en Empresa** | "Ya usamos IA y no sabemos qué hace ni cómo auditarla" | Política de supervisión, gates sobre las salidas, bitácora auditable, tablero de costo por operación (patrón `token_usage`), reporte para dirección | 3–6 semanas | Proyecto cerrado + mensualidad de operación | Empresas con IA en producción sin control; prospectos regulados |

*(Los servicios 6 y 7 empaquetan capacidades ya construidas para consumo
interno — informe de análisis, gates, token_usage — como servicio; no
requieren infraestructura nueva, sí horas de consultor.)* *(propuesta)*

---

## 4. ICP, avatares y segmentos prioritarios

Parte de los 3 ICPs del GTM §6 (CRM cuña / seguros fondo / software upsell) y
los desarrolla en 5 segmentos accionables. Los dolores usan las **4 cubetas**
del pre-descubrimiento: operativo, documental, regulatorio, comercial.

### Segmento 1 — Pyme conversacional (la cuña; ICP CRM del GTM)
- **Quién:** retail, e-commerce, clínicas, servicios con cobranza; 5–50
  empleados; el negocio YA vive en WhatsApp.
- **Avatar del comprador:** dueño/a o gerente general. Opera en el día a día;
  el WhatsApp del negocio suena en SU teléfono.
- **Dolores:** (operativo) responde de noche o pierde la venta; (comercial)
  no sabe cuántas conversaciones acaban en venta; (documental) las promesas a
  clientes viven en el chat, sin registro.
- **Motivaciones:** recuperar horas; no perder ventas; verse profesional.
- **Objeciones:** "un bot va a espantar a mis clientes" → respuesta: atención
  por niveles, lo delicado pasa a tu equipo, y si piden persona, hay persona.
  "¿Y mis datos?" → aislados y exportables.
- **Disparadores de compra:** contratar al segundo/tercer agente de atención;
  una venta grande perdida por no responder; campañas de pauta que llegan a
  un WhatsApp que nadie atiende.
- **Entrada recomendada:** Diagnóstico de Madurez IA (60 min) → piloto CRM.

### Segmento 2 — Broker/insurtech de carga (la apuesta de fondo; ICP seguros)
- **Quién:** brokers de seguros de carga e insurtechs logísticas MX **con
  cédula CNSF**; usuario diario = ejecutivo de suscripción.
- **Avatar:** socio/director. Vive de la relación con aseguradoras; compara
  pólizas en Excel y PDFs; le preocupa el cumplimiento tanto como la venta.
- **Dolores:** (documental) capturar dos veces lo mismo; (regulatorio)
  demostrar sustento de cada recomendación; (operativo) cotizar tarda días.
- **Motivaciones:** velocidad de cotización con respaldo normativo citado.
- **Objeciones:** "la IA no puede opinar de seguros" → correcto, y es nuestro
  diferencial: fronteras negativas literales (no intermedia, no emite, no
  asesora), el licenciado decide, cada dato cita su fuente (grafo).
- **Disparadores:** crecimiento de cartera sin poder crecer equipo; auditoría
  o requerimiento regulatorio reciente.
- **Entrada recomendada:** entrevista de discovery (la Ola 2 del GTM es
  literalmente esto: 10–20 entrevistas antes de comprometer desarrollo). **A
  este segmento hoy NO se le vende producto de seguros: se le pide
  conversación.** El pitch deck insurtech existe para esa conversación.

### Segmento 3 — Equipo de venta consultiva (Copilot)
- **Quién:** despachos, agencias, consultoras, integradores; 3–20 asesores
  que viven de reuniones de discovery/demo/propuesta.
- **Avatar:** director comercial o socio que también vende. Mide a su equipo
  por reuniones y cierres; sufre la heterogeneidad entre asesores.
- **Dolores:** (comercial) cada asesor prepara (o no) a su manera; (operativo)
  el seguimiento post-reunión se pierde; (documental) no queda constancia de
  lo dicho.
- **Motivaciones:** subir el piso de todo el equipo, no depender de estrellas.
- **Objeciones:** "mis asesores no van a adoptar otra herramienta" →
  respuesta: el copiloto trabaja alrededor de la reunión que ya tienen
  (prepara antes, resume después); la agenda pública les quita trabajo.
- **Disparadores:** contratación de asesores nuevos (onboarding); pérdida de
  un cliente por mal seguimiento; presión por profesionalizar el discurso.
- **Entrada recomendada:** Diagnóstico + piloto del Copilot con 2–3 asesores.

### Segmento 4 — Dirección comercial con operación desordenada
- **Quién:** empresas de 20–200 empleados con equipo de ventas pero sin
  disciplina de pipeline: seguimiento en Excel, leads sin dueño, propuestas
  artesanales.
- **Avatar:** director/gerente comercial contratado para "poner orden".
  Necesita mostrar resultados en trimestres, no años.
- **Dolores:** (comercial) cero visibilidad del embudo real; (operativo)
  cada venta reinventa el proceso; (documental) las propuestas tardan y
  salen inconsistentes.
- **Motivaciones:** un tablero que le diga dónde se pierde el dinero; proceso
  repetible que no dependa de él.
- **Objeciones:** "ya intentamos un CRM y nadie lo llenó" → respuesta: aquí
  el CRM se llena solo desde los canales (el lead nace etiquetado; la ficha
  la prepara la IA), el equipo solo decide.
- **Disparadores:** nueva dirección comercial; inversión en pauta sin
  atribución; crecimiento que rompió el proceso informal.
- **Entrada recomendada:** Diagnóstico → Pipeline Comercial Automatizado por
  fases (hitos 1–3 primero).

### Segmento 5 — Prospecto white-label / con necesidad de gobernanza
- **Quién:** software houses pequeñas, agencias que quieren ofrecer IA con su
  marca, y empresas que ya usan IA sin control y necesitan demostrarlo
  (a clientes corporativos, auditores o dirección).
- **Avatar:** fundador/CTO de la agencia, o director de operaciones del
  corporativo. Comprador más técnico que el resto; pedirá ver el mecanismo.
- **Dolores:** (comercial) quiere vender IA sin construir la fábrica;
  (regulatorio/documental) necesita evidencia de qué hizo la IA y quién
  aprobó qué.
- **Motivaciones:** time-to-market con margen conocido; control demostrable.
- **Objeciones:** "¿y si el proveedor desaparece o me encierra?" → aislamiento
  por cliente y datos exportables; "¿esto es un wrapper?" → se enseña la
  operación real (gates, veredictos, bitácoras — la vitrina de gobernanza del
  roadmap se habilita por evidencia cuando un prospecto la pida).
- **Disparadores:** perdió un contrato por no tener oferta de IA; un cliente
  corporativo le exigió evidencia de control sobre su IA.
- **Entrada recomendada:** demo de la operación (pitch deck white-label +
  recorrido por la evidencia) → piloto de departamento.

---

## 5. Pipeline de avatar a venta

Las 6 fases comerciales mapeadas a las **10 etapas reales** de `leads.etapa`
(las que Mission Control ya visualiza y permite mover). Cada fase: entrada,
salida, responsable, criterio de avance, métricas.

```
FASE:      Conciencia   Consideración      Decisión           Compra              Onboarding       Expansión
            │            │                  │                  │                   │                │
ETAPA:     (pre-lead)   nuevo→calificado   contactado→        propuesta→          contrato→        ganado
                                           descubrimiento     negociacion         onboarding       (+nuevas líneas)
```

### Fase 1 — Conciencia (pre-lead)
- **Qué pasa:** el avatar descubre que su dolor tiene solución. Canales:
  contenido (§11), referidos de la red del equipo, eventos, la landing.
- **Entrada:** desconocido. **Salida:** visita con intención (chat abierto,
  QR escaneado, recurso descargado).
- **Responsable:** marketing (humano + agentes de contenido cuando existan).
- **Criterio de avance:** dejó un identificador → nace el lead (`nuevo`).
- **Señales de riesgo:** tráfico sin conversación; rebote alto en la landing.
- **Métricas:** visitas, conversaciones de chat iniciadas, leads por origen.

### Fase 2 — Consideración (`nuevo` → `calificado`)
- **Qué pasa:** el lead evalúa; nosotros calificamos. El vendedor IA del chat
  responde en llano; el enriquecimiento arma expediente (RFC/DENUE/69-B); si
  entra por WhatsApp (con tenant activo), el primer mensaje ya creó el lead.
- **Entrada:** lead `nuevo` con identificador. **Salida:** lead `calificado`
  (dato mínimo de §2.1a + dolor en una cubeta).
- **Responsable:** agentes (chat, enriquecimiento) + revisión humana en
  Mission Control.
- **Criterio de avance:** empresa identificable + canal de respuesta + señal
  de dolor. Con CRM-4 desplegado, `calificacion='califica'` apoya (nunca
  sustituye) el juicio.
- **Señales de riesgo:** lead sin respuesta a 2 intentos; aparición en 69-B
  (descarte); dominio/email desechable.
- **Métricas:** tasa nuevo→calificado, tiempo en `nuevo`, % con expediente.

### Fase 3 — Decisión (`contactado` → `descubrimiento`)
- **Qué pasa:** conversación humana. Se agenda la **sesión de descubrimiento
  de 60 min sin costo** (la oferta de entrada universal). El pre-discovery
  del Copilot prepara al asesor con la Ficha de Inteligencia.
- **Entrada:** lead calificado con cita agendada (reserva pública del Copilot
  o agenda directa). **Salida:** discovery realizado con diagnóstico.
- **Responsable:** asesor humano, asistido por Copilot (guía, transcripción
  cuando el STT real se active, resumen y notas).
- **Criterio de avance:** diagnóstico entregado + dolor y presupuesto
  confirmados + siguiente paso aceptado.
- **Señales de riesgo:** no-show (medir show rate); reagendas repetidas;
  "mándame la info" sin fecha.
- **Métricas:** tasa calificado→discovery, show rate, tiempo a primera cita.

### Fase 4 — Compra (`propuesta` → `negociacion` → `contrato`)
- **Qué pasa:** el paquete comercial (propuesta + cotización + contrato) se
  prepara asistido por la fábrica bajo gates (claims aprobados, precio en
  rango, plantilla intacta) y lo presenta el humano.
- **Entrada:** discovery con diagnóstico. **Salida:** contrato firmado +
  anticipo (la firma es exclusivamente humana — frontera negativa de la card).
- **Responsable:** asesor + PM/CEO (aprobación); agentes solo preparan.
- **Criterio de avance:** propuesta presentada ≤5 días tras discovery;
  contrato = firma + anticipo.
- **Señales de riesgo:** propuesta sin respuesta >7 días; negociación que
  pide bajar de rango (el gate lo rechaza: es señal de segmento equivocado).
- **Métricas:** tasa discovery→propuesta, tasa propuesta→cierre, días
  discovery→firma.

### Fase 5 — Onboarding (`onboarding`)
- **Qué pasa:** implantación por etapas que se prueban antes de avanzar
  (CRM-0→CRM-3 en la línea CRM; equivalentes por línea). El piloto real ES
  el onboarding.
- **Entrada:** contrato + anticipo. **Salida:** hito de valor comprobado
  (CRM-3: un caso resuelto de punta a punta con el equipo del cliente
  mirando) → `ganado`.
- **Responsable:** equipo de implantación + el cliente (su equipo participa).
- **Criterio de avance:** Time-to-CRM-3 en semanas (el KPI del GTM §10 que
  prueba la promesa "semanas, no meses").
- **Señales de riesgo:** cliente que no da accesos/datos; alcance que crece
  sin control (el blueprint cerrado lo contiene).
- **Métricas:** Time-to-valor por línea, % pilotos completados.

### Fase 6 — Expansión (`ganado` → nuevas oportunidades)
- **Qué pasa:** el cliente que ya confía compra la siguiente línea (la tesis
  land-and-expand del GTM §1: CRM → white-label de software → más
  departamentos) y refiere.
- **Entrada:** cliente con hito de valor. **Salida:** nueva oportunidad
  (nuevo lead etiquetado como expansión) o referido.
- **Responsable:** asesor de cuenta (humano); el Copilot prepara las
  revisiones de cuenta.
- **Criterio de avance:** revisión de cuenta trimestral con propuesta de
  siguiente paso; NPS/testimonio pedido tras el hito de valor.
- **Señales de riesgo:** uso decreciente (visible en `token_usage`/bitácora);
  facturas con fricción.
- **Métricas:** ingreso por expansión, referidos por cliente, retención.

---

## 6. Funnel multicanal (canales A–F)

Cada canal con: objetivo, CTA, captura, señal de intención, siguiente paso
automático — y su **estado real**.

### Canal A — `cliente-web2` (landing + chat vendedor) 🟢
- **Objetivo:** captación inbound con la menor fricción posible.
- **CTA principal:** "Platícalo con nosotros ahora" (chat) + cotizador.
- **Captura:** empresa, contacto, mensaje/necesidad → lead `origen='web2'`
  (escritor único server-side, ya construido).
- **Señal de intención:** usó el cotizador; preguntó por precio/tiempos;
  dejó datos de contacto en el chat.
- **Siguiente paso automático:** hoy, el lead queda visible en Mission
  Control para seguimiento humano. Propuesto: CTA del chat hacia la reserva
  pública del Copilot (§16-D3) para que el interesado agende el
  descubrimiento sin esperar a nadie.

### Canal B — WhatsApp Cloud (CRM conversacional) 🟢 mecanismo / 🔴 sin tenant
- **Objetivo:** convertir la conversación natural del negocio en pipeline.
- **CTA principal:** "Escríbenos por WhatsApp" (link `wa.me`/QR desde
  landing, contenido, eventos).
- **Captura:** primer mensaje crea lead `origen='crm'`, `canal='whatsapp'`,
  `telefono` E.164 — automático, ya construido.
- **Señal de intención:** pregunta por precio, plazos o caso concreto (con
  CRM-4 desplegado, el calificador de intención lo marca en
  `calificacion_senales`).
- **Siguiente paso automático:** respuesta del agente supervisada por
  sup-crm dentro de la ventana de 24h; escalado a humano cuando toca.
- **⚠️ Límites vigentes:** (1) requiere el **alta del primer tenant** (Meta
  Business verificado + número + token — gate Ola 0); (2) **solo inbound y
  respuesta en ventana de 24h**: cero outbound proactivo hasta P2 (HSM).
  Las campañas de este canal en §10 se separan en "ya" vs "post-P2".

### Canal C — Eventos / QR 🟢 (aterriza en A o B)
- **Objetivo:** captación presencial/online con etiqueta de campaña.
- **CTA principal:** QR → landing con contexto del evento, o QR → `wa.me`
  con mensaje prellenado ("Vengo del evento X").
- **Captura:** la del canal donde aterriza (A o B). La atribución formal
  (`campana_id`/`utm`) requiere **desplegar CRM-4**; mientras tanto, el
  mensaje prellenado del QR es la etiqueta de facto.
- **Señal de intención:** escaneó y escribió (el QR pasivo no cuenta).
- **Siguiente paso automático:** el del canal de aterrizaje + seguimiento
  humano post-evento en ≤48h (lista del evento contra `leads`).

### Canal D — Meeting Copilot / agenda 🟢 (con dos huecos declarados)
- **Objetivo:** que el prospecto agende el descubrimiento solo, sin fricción.
- **CTA principal:** "Agenda tu sesión de descubrimiento de 60 minutos, sin
  costo" → reserva pública `/reservar/[slug]` (M1–M5, construida: token de un
  solo uso, aprobación, reprogramación, tablero).
- **Captura:** datos de la reserva + contexto del solicitante.
- **Señal de intención:** reservar ES la señal (la más fuerte del funnel).
- **Siguiente paso automático:** aprobación en bandeja + pre-discovery del
  caso antes de la cita.
- **⚠️ Huecos declarados:** (1) la cita **no crea lead** (`origen='copilot'`
  sin escritor) — el puente es la pieza de trabajo #1 que este plan propone
  (§16-D3); (2) la confirmación email/WhatsApp es **mock**: el recordatorio
  real espera el host-job (y P2/salientes según canal). Hasta entonces, la
  confirmación es manual.

### Canal E — Email / nurturing 🔴 (diseñar sí, ejecutar no)
- **Objetivo:** madurar leads tibios y acompañar el ciclo largo (seguros,
  white-label).
- **CTA principal (cuando abra):** contenido útil → invitación a discovery.
- **Captura:** aperturas/respuestas como señal de re-calificación.
- **Señal de intención:** respuesta directa o clic en agenda.
- **Siguiente paso automático:** mover a contacto humano.
- **⚠️ Estado:** `enviar-salientes.py` existe con doble verificación
  (sha256 + `aprobaciones_salientes`) pero está en **dry-run sin aprobación,
  sin SMTP y sin dominio**. Este plan DISEÑA las secuencias (§10-bis en §11)
  para tenerlas listas, y las marca **no ejecutables hasta el gate**. Ningún
  correo sale hoy.

### Canal F — Outreach dirigido (ventas A2A) 🟢 preparación / 🔴 envío
- **Objetivo:** abrir puertas en los segmentos 2 y 5 (ciclo largo, alto
  valor) con precisión, no con volumen.
- **CTA principal:** conversación de discovery (no venta en frío).
- **Captura:** lead `origen='a2a'` (card pública) o `manual` (lista curada).
- **Señal de intención:** respuesta a outreach; interés recibido por la card.
- **Siguiente paso automático:** enriquecimiento del lead (expediente) +
  pitch deck parametrizado por cliente (`personalizar-deck.py`) + redacción
  del saliente bajo gates → **aprobación humana** → envío (cuando el gate
  de salientes abra; mientras, el envío es manual por el humano desde su
  propio correo, con el material preparado por la fábrica).
- **Nota:** esta es la vía comercial para los 2 pilotos de la Ola 1 — la red
  del equipo (motion "warm" del GTM §7) cuenta como canal F manual.

---

## 7. Landing principal y arquitectura web

### 7.1 Arquitectura propuesta *(propuesta; base construida)*

```
cliente-web2 (existente, Vercel)                    meeting-copilot (existente)
├── / ................. Landing principal           ├── /reservar/[slug] ... Reserva pública
├── /solucion/crm ..... Página por línea (5)        └── (resto: superficie del producto)
├── /solucion/copilot .
├── /solucion/pipeline
├── /solucion/departamentos
├── /casos/[industria]  Casos de uso por segmento
├── /recursos ......... Lead magnets (§8)
└── /diagnostico ...... Puente a la reserva pública del Copilot
```

- La base es el `cliente-web2` real (Next.js en Vercel, bilingüe, con
  cotizador deck-builder y chat). Las páginas nuevas son contenido sobre la
  misma app — no infraestructura nueva.
- **Prerequisito declarado:** el **dominio propio** (gate Ola 0). Invertir en
  SEO/AEO sobre `*.vercel.app` y `sslip.io` es tirar autoridad; las páginas
  pueden construirse ya, la promoción fuerte espera el dominio.
- El puente completo del funnel: landing → chat (captura web2) → WhatsApp
  (cuando haya tenant) → reserva de descubrimiento (Copilot) → propuesta.

### 7.2 Secciones de la landing principal *(propuesta)*

1. **Hero:** *"Tu departamento con IA, con tu marca, en semanas — no un
   chatbot que inventa."* Sub: implementación de IA para Pymes y empresas,
   bajo supervisión humana. CTA doble: [Platícalo ahora] (chat) /
   [Agenda tu diagnóstico sin costo].
2. **Dolores** (por cubeta, en lenguaje del dueño): ventas que se pierden en
   el WhatsApp · reuniones sin seguimiento · propuestas que tardan semanas ·
   "usamos IA pero nadie la controla".
3. **Soluciones por bloque:** las 5 líneas de §3.2, una tarjeta cada una,
   con su promesa y su enlace a `/solucion/*`.
4. **Casos de uso / escenarios:** uno por segmento de §4 (la Pyme que
   atiende de noche sin contratar; el equipo de asesores que llega preparado
   a cada reunión; la dirección que por fin ve su embudo).
5. **Diferenciadores A2A:** los 4 demostrables de §3.1 — supervisión con
   gates, trazabilidad, aislamiento, fuente citada. Sin superlativos: el
   mecanismo es el argumento.
6. **CTA intermedio:** diagnóstico / chat / WhatsApp (este último visible
   solo cuando haya tenant activo — no publicar un número que no atiende).
7. **Recursos descargables:** 2–3 lead magnets estrella de §8.
8. **Prueba social / credibilidad:** honesta al estado real — hoy: la
   operación propia como caso ("así corre nuestro negocio"), el caso GAL
   México **citado por lo que es** (cliente real de branding digital
   —entregado— y rediseño web —en curso—; NO es cliente de CRM ni Copilot,
   y no se presenta como tal), y la evidencia de gobernanza cuando la
   vitrina se habilite por evidencia (condición del roadmap: cuando un
   prospecto la pida). Testimonios de pilotos se añaden cuando existan —
   **no se inventan**.

### 7.3 Reutilización de activos existentes
- Vendedor IA del chat: ya acotado por prompt, ya captura — solo se le
  alinean los CTAs al funnel (§16-D3).
- Cotizador deck-builder: es el "precio orientativo antes de hablar con
  nadie" — se conserva como está.
- Agendamiento M1–M5: la página `/diagnostico` enlaza la reserva pública.
- Pitch decks parametrizados: la venta 1:1 usa los decks, la web usa el
  mismo mensaje — una sola voz.

---

## 8. Lead magnets y ofertas de entrada

### 8.1 Catálogo de lead magnets (12) *(propuesta)*

Criterio: producibles por el equipo actual a partir de conocimiento que YA
existe en el repo (playbooks, checklists y guías se derivan de los documentos
de implantación reales — no se investiga desde cero). Formato descargable
desde `/recursos` a cambio de correo (que alimenta el nurturing del canal E
cuando abra; mientras, el contacto se trabaja por chat/agenda).

| # | Lead magnet | Promesa | Formato | Público | Momento del funnel | CTA posterior |
|---|---|---|---|---|---|---|
| 1 | **Diagnóstico exprés de madurez IA** (autoevaluación) | "En 10 minutos sabes qué tan listo estás para IA y por dónde empezar" | Checklist interactivo/PDF de 20 preguntas | Todos los segmentos | Conciencia | Agenda el diagnóstico completo (60 min, sin costo) |
| 2 | **Mapa de procesos automatizables en una Pyme** | "Los 12 procesos que más horas queman y cuáles automatizar primero" | Guía PDF con matriz esfuerzo/impacto | S1, S4 | Conciencia | Diagnóstico |
| 3 | **Checklist: CRM conversacional por WhatsApp bien hecho** | "Las 15 cosas que debe tener (consentimiento, escalado a humano, registro) antes de encender un bot" | Checklist PDF | S1 | Consideración | Chat / diagnóstico |
| 4 | **Guía: cómo no perder leads en una Pyme** | "El agujero está entre el primer mensaje y la primera respuesta — y así se tapa" | Guía breve + plantilla de SLA | S1, S4 | Conciencia | Chat |
| 5 | **Scorecard de reuniones comerciales** | "Califica tus últimas 5 reuniones de venta en 7 dimensiones y encuentra el patrón" | Plantilla + rúbrica (deriva de la rúbrica de coaching del pipeline) | S3 | Consideración | Piloto de Copilot |
| 6 | **Playbook: implementación de IA en 90 días** | "Fases, criterios de avance y errores comunes de una implantación que sí llega" | PDF (deriva del método de implantación por etapas) | S4, S5 | Consideración | Diagnóstico |
| 7 | **Plantillas de seguimiento comercial** | "Los 8 mensajes de seguimiento que no incomodan (y cuándo mandarlos)" | Pack de plantillas | S1, S3, S4 | Conciencia | Chat |
| 8 | **Guía de ROI de IA: costo por operación** | "Cómo saber cuánto te cuesta cada conversación/tarea de IA — antes de firmar con nadie" | Guía + calculadora simple (patrón `token_usage`) | S4, S5 | Consideración | Diagnóstico |
| 9 | **Comparativa: atención manual vs copilot + CRM** | "Tiempo, costo y errores de los dos caminos, con números de operación real" | One-pager | S1, S3 | Decisión | Diagnóstico |
| 10 | **Playbook de pre-discovery** | "Qué investigar de un prospecto antes de llamarle (y qué NO asumir)" | Guía (deriva de la Ficha de Inteligencia: observado vs hipótesis, 4 cubetas) | S3, S4 | Consideración | Piloto de Copilot |
| 11 | **Guía de gobernanza y trazabilidad para IA en empresas** | "Qué exigirle a cualquier IA que toque a tus clientes: supervisión, registro, evidencia" | Guía PDF | S5, S2 | Consideración | Servicio 7 |
| 12 | **Mini-auditoría de canales comerciales** | "En qué canal pierdes más prospectos: cuestionario de 15 min con semáforo por canal" | Formulario + reporte | S4 | Conciencia | Diagnóstico |

### 8.2 Ofertas de entrada (3) *(construida la 1ª; propuestas 2ª y 3ª)*

1. **Sesión de descubrimiento de 60 minutos, sin costo** *(construida como
   oferta — GTM §7)*: diagnóstico de la operación + propuesta cerrada con
   alcance, plazos y precio. Es el primer paso de TODO lead en TODOS los
   canales. La reserva pública del Copilot es su puerta.
2. **Piloto controlado con criterio de éxito pactado**: implantación acotada
   de UNA línea (p. ej. CRM hasta el hito CRM-3) con criterio de terminado
   verificable ("un caso resuelto de punta a punta con tu equipo mirando").
   Cobro de implantación cerrada; el piloto ES el onboarding, no un demo.
3. **Setup + mensualidad**: la implantación completa de la línea elegida con
   mensualidad por nivel de uso dentro de la política vigente — el formato
   estándar del GTM §8, presentado como continuidad natural del piloto.

---

## 9. CRM, scoring y operación comercial

### 9.1 Modelo de scoring de leads 0–100 *(propuesta de diseño)*

**Estado real primero:** NO existe columna `scoring` en `leads`. Existen
señales dispersas: `calificacion` + `calificacion_senales` (CRM-4, sin
desplegar), expediente de enriquecimiento, `origen`/`canal`, actividad en
bitácora `crm_*`, y SLA por etapa. El modelo se diseña para calcularse
**desde señales que ya se capturan**, en dos posibles encarnaciones (decisión
§16-D4): (a) vista SQL calculada al vuelo (patrón `v_semaforo_casos`, cero
migración) — recomendada para empezar; (b) columna materializada si el
volumen lo pide algún día.

| Bloque | Peso | Variables (todas existentes o de CRM-4) |
|---|---|---|
| **Ajuste al ICP** | 30 | Empresa identificada vía enriquecimiento (RFC/DENUE +10), giro dentro de segmentos §4 (+10), tamaño/señales de operación conversacional (+10) |
| **Intención** | 30 | `calificacion='califica'` (+15), señales de compra en `calificacion_senales` — pregunta por precio/plazos (+10), usó cotizador (+5) |
| **Engagement** | 25 | Conversación activa en bitácora ≤7 días (+10), respondió a seguimiento (+10), reservó cita (+5 → y dispara avance de etapa directo) |
| **Higiene** | 15 | Contacto completo (tel+email) (+5), canal de respuesta confirmado (+5), no aparece en 69-B ni dominio desechable (+5) |
| **Deterioro** | resta | −5 por semana sin actividad tras `contactado`; −20 si no-show sin reagendar; el semáforo de SLA vencido fuerza revisión |

- **Ranking:** ≥70 = prioridad alta (contacto humano hoy); 40–69 = trabajar;
  <40 = nutrir o descartar (69-B/facturera = descarte directo).
- **Regla heredada de CRM-4:** el score, como la calificación, es **señal
  paralela: jamás mueve `etapa` por sí solo**. Mover etapa es acto humano (o
  del flujo explícito), y Mission Control ya lo implementa así.

### 9.2 Catálogo de etapas del embudo *(construido)*

Las 10 etapas reales, con su definición operativa de entrada (§5 las detalla
por fase): `nuevo` (existe registro) → `calificado` (dato mínimo + dolor) →
`contactado` (conversación humana iniciada) → `descubrimiento` (sesión
agendada/realizada) → `propuesta` (paquete presentado) → `negociacion`
(objeciones activas) → `contrato` (firma + anticipo) → `onboarding`
(implantación por etapas) → `ganado` (hito de valor comprobado) | `perdido`
(con motivo registrado en `datos`). No se proponen etapas nuevas: el CHECK
actual cubre el ciclo. La brecha conocida "cita perdida" se maneja como
señal (score/semáforo), no como etapa (decisión ya abierta en el roadmap).

### 9.3 Reglas de enrutamiento *(propuesta)*

| Situación | Ruta |
|---|---|
| Lead web2 con intención (cotizador/precio) | CTA a reserva de descubrimiento; si pide hablar ya → humano por chat |
| Lead WhatsApp entrante (tenant activo) | Agente responde en ventana 24h bajo sup-crm; escalado a humano si el caso lo amerita o lo pide |
| Lead con score ≥70 | Contacto humano el mismo día (lista priorizada en Mission Control) |
| Lead calificado sin cita tras 2 contactos | Nutrición (canal E cuando abra; mientras: seguimiento manual espaciado) |
| Cita reservada | Pre-discovery automático antes de la sesión (Ficha de Inteligencia) |
| Prospecto S2/S5 (ciclo largo) | Enriquecimiento + pitch deck parametrizado + outreach preparado bajo gates, envío aprobado por humano |
| Señal de descarte (69-B, spam, fuera de mercado) | `perdido` con motivo; no se recontacta |

### 9.4 Modelo de operación interna *(construido el tablero; propuesta la rutina)*

- **Qué ve el equipo en Mission Control:** embudo con tasas de paso,
  conversaciones por canal con resumen, tabla de leads (últimos 50), acción
  de mover etapa. Con CRM-4 desplegado se suman calificación y atribución.
- **Campos mínimos por lead:** los de §2.1a; el expediente de enriquecimiento
  como anexo.
- **Automatizaciones a activar primero (orden):** (1) desplegar CRM-4
  (calificación + atribución — ya construido, 52 tests); (2) puente
  cita→lead del Copilot; (3) scoring como vista; (4) notificador real de
  citas; (5) nurturing por email tras su gate.
- **Siempre con aprobación humana:** todo saliente, todo cambio de precio,
  toda promesa nueva (claims), firma y cierre.

---

## 10. WhatsApp CRM y Meeting Copilot dentro del funnel

### 10.1 WhatsApp: qué se puede YA y qué requiere P2

**Prerequisito de todo:** el alta del primer tenant (gate Ola 0). Sin tenant,
este canal está en cero operativo aunque el mecanismo esté construido.

**✅ Posible YA (con tenant activo, sin tocar P2):**
- **Inbound como motor:** todo CTA del funnel puede apuntar a `wa.me` —
  landing, QR de eventos, firma de correo, contenido. El primer mensaje crea
  el lead etiquetado; el agente atiende al instante bajo supervisión.
- **Conversación completa en ventana de 24h:** calificar, resolver dudas,
  proponer la sesión de descubrimiento, compartir el enlace de reserva —
  todo mientras el cliente mantenga viva la conversación.
- **Onboarding conversacional del piloto CRM:** el caso de uso del cliente
  piloto (ventas/cobranza/citas) opera inbound desde el día 1.
- **Recuperación de tibios PASIVA:** si el lead vuelve a escribir, la
  bitácora conserva el contexto y se retoma donde quedó *(construido)*.

**⛔ Requiere P2 (HSM + ventana 24h) — diseñar hoy, ejecutar después:**
- Secuencias de onboarding proactivas (mensajes iniciados por nosotros).
- Seguimiento post-evento a lista fría; reactivación de leads tibios que
  dejaron de escribir; recordatorios de cita por WhatsApp.
- Campañas de promoción/recompra — **prohibido prometerlas en propuesta
  comercial antes de cerrar P2** (regla explícita del roadmap).

**Diseño listo para el día que P2 abra** *(propuesta, no ejecutable)*: 3
plantillas HSM candidatas (confirmación de cita, seguimiento post-discovery,
reactivación con contenido útil), cada una con disparador, audiencia y
métrica — se redactan y aprueban con Meta cuando P2 sea prioridad; el plan
las deja especificadas para no rediseñar sobre la marcha.

### 10.2 Meeting Copilot como acelerador comercial

No es el producto principal del funnel: es el **multiplicador del asesor** en
cada etapa donde hay una reunión.

| Momento | Qué aporta el Copilot *(construido salvo notas)* |
|---|---|
| **Pre-venta** | La reserva pública elimina la fricción de agendar; el pre-discovery arma la Ficha de Inteligencia (fuentes compiladas, claims auditados, benchmark, marco regulatorio vía grafo) antes de la primera llamada |
| **Primera llamada (discovery)** | Guía de reunión + next-best-question; el asesor conduce, el copiloto sopla |
| **Seguimiento de oportunidad** | Resumen y notas de cada reunión; el tablero de citas muestra qué sigue |
| **Preparación de propuesta** | El diagnóstico del discovery alimenta el paquete comercial (pipeline EG.CRM hitos 5–6) |
| **Expansión de cuenta** | Revisiones de cuenta preparadas con el historial de reuniones |

**Además es producto** (línea 3): usarlo en nuestra propia venta es la demo
más honesta — "así preparamos ESTA reunión contigo" *(propuesta de guion)*.

---

## 11. Estrategia de contenido y autoridad

**Principio:** solo se publica lo que la operación puede demostrar. La
ventaja de contenido de este proyecto es rara: hay evidencia real de
operación agéntica con supervisión — la mayoría del mercado solo tiene demos.

### Temas pilares (4) *(propuesta)*
1. **IA aplicada al negocio, sin humo** — casos concretos por proceso
   (atención, reuniones, pipeline), con el mecanismo explicado en llano.
   Alimenta S1/S3/S4.
2. **Copiloto, no autopiloto** — supervisión, gates, aprobación humana:
   por qué "el agente lo hace solo" es la promesa equivocada. Diferenciación
   directa. Alimenta S5 y prepara S2.
3. **Operación real de un negocio con agentes** — el behind-the-scenes de
   nuestra propia operación (con juicio: sin secretos ni datos de clientes).
   Es el pilar de credibilidad.
4. **Gobernanza y trazabilidad de IA** — qué exigir, cómo auditar, costo por
   operación. Alimenta S5/S2 y al comprador corporativo.

### Formato por canal y cadencia mínima viable *(propuesta)*
| Canal | Formato | Cadencia mínima |
|---|---|---|
| LinkedIn (canal primario B2B) | 2 publicaciones/semana: 1 caso/mecanismo + 1 lección de operación | 2/sem |
| Newsletter (cuando el canal E abra; antes, el blog acumula) | 1 correo quincenal con lo mejor publicado | 2/mes |
| Blog en `cliente-web2` (post-dominio) | 1 artículo pilar/mes (base SEO §12.2) | 1/mes |
| Webinar/demo en vivo | 1/mes: "así opera un CRM conversacional supervisado" con recorrido real | 1/mes |
| Recursos (lead magnets §8) | 1 nuevo/mes hasta completar el catálogo | 1/mes |

### CTA por contenido
Todo contenido termina en UN paso: lead magnet afín → chat → reserva de
descubrimiento. El puente estándar: contenido → recurso → conversación →
agenda. Nada de "síguenos": el CTA siempre mueve hacia el funnel.

---

## 12. Agencia de marketing digital agéntica

**Qué es:** operar el marketing propio con agentes del stack Hermes bajo el
mismo patrón del resto de la fábrica (agentes preparan → gates verifican →
humano aprueba), y — cuando esté maduro — ofrecerlo como servicio.
**Qué no es:** un compromiso de infraestructura nueva ya; es la línea de
expansión que reutiliza la existente. *(propuesta completa)*

### 12.1 Gestión de redes y contenidos
- **Canales objetivo (orden):** LinkedIn (B2B primario) → YouTube (demos y
  webinars grabados) → X (conversación técnica) → Instagram/Facebook (solo
  si los segmentos S1 lo justifican con datos) → newsletter/blog (base
  propia).
- **Tipo de contenido por canal:** educativo y caso de uso (LinkedIn/blog),
  behind-the-scenes de operación (LinkedIn/YouTube), thought leadership
  (pilar 2 y 4), oferta directa (solo 1 de cada 5 piezas).
- **Frecuencia mínima viable:** la tabla de §11.
- **Proceso de producción con agentes:** idea (humano o agente desde la
  operación real) → borrador (agente con la voz de marca §2.1c) → revisión
  de claims/tono (gate determinista: mismo patrón `claims_aprobados` aplicado
  a contenido) → **aprobación humana** → publicación (host-job con
  credenciales, patrón host-job; el agente nunca toca las llaves de las
  redes) → métricas al tablero.
- **Métricas de éxito por canal:** alcance cualificado (perfil del seguidor),
  conversaciones iniciadas, leads por origen de contenido, agenda atribuible.

### 12.2 SEO
- **Estrategia de palabras clave** (ES-MX, intención comercial): "CRM con IA
  para WhatsApp", "automatizar atención a clientes Pyme", "copiloto de
  reuniones de ventas", "implementación de IA para empresas México",
  "agentes de IA para negocios", más long-tail por segmento/industria.
- **Arquitectura de contenidos:** páginas pilar = las 5 líneas de §3.2
  (`/solucion/*`); clusters = casos por industria y artículos del blog
  enlazando a su pilar; los lead magnets como contenido enlazable.
- **Optimización técnica de los frontends existentes:** `cliente-web2` y
  `meeting-copilot` ya son Next.js (SSR, rendimiento controlable); trabajo:
  metadatos/OG por página, sitemap, datos estructurados (§12.3), y —
  prerequisito duro — **el dominio propio** (gate Ola 0). Sin dominio no hay
  autoridad acumulable.
- **Link building:** directorios B2B MX/LATAM, prensa de nicho (IA aplicada,
  Pymes), invitados en newsletters/podcasts del ecosistema, y los propios
  clientes white-label enlazando "powered by".
- **Métricas:** posiciones en términos objetivo, tráfico orgánico, leads
  `origen='web2'` con `utm` orgánico (post CRM-4), conversión de orgánico a
  agenda.

### 12.3 AEO (Answer Engine Optimization)
- **Qué optimizar para ser citado:** las páginas pilar con definiciones
  claras (qué es un CRM conversacional supervisado, qué es gobernanza de IA),
  los recursos con datos propios (costo por operación, comparativas honestas)
  y las preguntas frecuentes reales de discovery.
- **Estructura digerible por motores de respuesta:** respuestas directas en
  los primeros párrafos, FAQs con marcado `FAQPage`/`HowTo` (JSON-LD),
  definiciones autocontenidas, datos con fuente — la doctrina "cada dato cita
  su fuente" es exactamente lo que los motores de respuesta premian.
- **Autoridad y menciones:** consistencia nombre/dominio en todos los
  perfiles, presencia en los directorios que los motores ya citan, contenido
  original con datos propios (lo único difícil de parafrasear sin citarte).
- **Métricas:** menciones en respuestas de ChatGPT/Perplexity (revisión
  manual mensual con las 10 preguntas objetivo), tráfico referido de esos
  motores, leads que declaran "te encontré por IA".

### 12.4 Operación agéntica de la agencia
- **Agentes para:** investigación de temas/keywords, borradores, optimización
  on-page, programación de publicaciones (vía host-job), análisis de métricas
  (reporte semanal al canal del equipo).
- **Humanos para:** estrategia y calendario, aprobación de CADA pieza
  publicada (tono/claims), relación con clientes, creatividad de campaña.
- **Gates y supervisión:** contenido = material comercial → mismo estándar:
  claims de la lista, sin promesas de autonomía, sin datos de clientes; la
  publicación es un saliente → aprobación registrada antes de publicar.
- **Integración con CRM:** todo contenido etiqueta sus enlaces (`utm` — post
  CRM-4); los leads de marketing entran por los mismos canales A/B y se
  puntúan con §9.1; el handover a ventas es el mismo pipeline — no hay dos
  funnels.

### 12.5 Roadmap de implementación de la agencia *(propuesta)*
- **Fase A1 — Cimientos** (mes 1–2, en paralelo al plan de 90 días):
  posicionamiento (§3.1), páginas pilar, SEO técnico básico, 4 lead magnets.
  Sin agentes aún: humanos con plantillas.
- **Fase A2 — Producción sistemática** (mes 2–4): calendario, agente de
  borradores con gate de claims, host-job de publicación, cadencia plena
  de §11.
- **Fase A3 — Optimización y escala** (mes 4–6): AEO, experimentos A/B de
  landing/CTAs, doblar en los canales con mejor lead-por-esfuerzo,
  especialización por vertical (empezando por el segmento que más pilotos
  dio).
- **Fase A4 — Agencia como servicio** (mes 6+, gated): solo si la operación
  propia demuestra números (leads orgánicos/mes, costo por lead), se
  empaqueta como servicio 8 del catálogo para clientes — con la evidencia de
  nuestra propia operación como caso.

---

## 13. Roadmap comercial de 90 días

Alineado con las 3 olas del GTM §5. **La Fase 1 empieza por los desbloqueos —
no son trabajo de marketing, son la condición de todo lo demás.**

### Fase 1 — Ordenar la oferta y desatascar (semanas 1–3)
- **Desbloqueos (gates Ola 0, decisiones de Elisa):** alta WhatsApp Cloud
  del primer tenant · dominio propio · aprobar motor real + salientes ·
  desplegar CRM-4 (construido, es un deploy).
- Mensaje principal y voz de marca fijados (§3.1, §2.1c).
- Empaquetado: páginas `/solucion/*` con las 5 líneas; catálogo §3.3 como
  documento interno de venta.
- 4 lead magnets producidos (los #1, #3, #5, #8 — uno por segmento activo).
- Funnel base verificado: chat → lead → Mission Control → agenda (con el
  puente cita→lead si §16-D3 se aprueba).
- **Criterio de fase terminada:** un prospecto puede recorrer
  landing→chat→agenda→discovery sin intervención nuestra, y cada paso deja
  registro.

### Fase 2 — Activar canales (semanas 3–6)
- `cliente-web2`: CTAs alineados + recursos publicados.
- WhatsApp: tenant activo respondiendo inbound con supervisión; QR/`wa.me`
  en todos los materiales.
- Agenda: reserva pública enlazada desde landing y firma de correos del
  equipo; confirmación manual mientras el notificador es mock.
- Outreach F: lista curada de 20 prospectos S1 + 6 brokers S2 (discovery de
  seguros, Ola 2) con expediente de enriquecimiento y deck parametrizado;
  envío manual por humanos con material preparado bajo gates.
- Eventos: 1 evento/webinar propio como banco de pruebas del canal C.
- **Criterio:** los 4 canales activables generando leads etiquetados en
  `leads`; los 2 pilotos de la Ola 1 en etapa `descubrimiento` o mejor.
- *(El email/nurturing NO se activa en esta fase salvo que su gate abra;
  las secuencias quedan diseñadas.)*

### Fase 3 — Operar y aprender (semanas 6–10)
- Scoring §9.1 encendido como vista; lista priorizada en la rutina diaria.
- Ritual semanal de KPIs (§14) en `#dep-adquisicionclientes`.
- Optimización de conversión: 2 experimentos A/B (hero de landing; CTA
  chat→agenda) con decisión por datos.
- Contenido a cadencia plena (§11); primer webinar-demo grabado.
- Coaching de discovery: revisar las primeras sesiones con la rúbrica del
  pipeline (mejora del asesor, no vigilancia).
- **Criterio:** tasas de paso por etapa conocidas y con línea base; al menos
  1 piloto en `onboarding` o `ganado`; mejores segmentos identificados con
  datos.

### Fase 4 — Escalar (semanas 10–13)
- Doblar en el canal y segmento con mejor conversión (decisión por tablero,
  no por intuición).
- Outbound validado: si el gate de salientes abrió, primeras secuencias
  aprobadas; si P2 cerró, primeras HSM aprobadas por Meta.
- Contenido sistemático con agentes (Fase A2 de §12.5).
- Especialización: la landing del segmento ganador se convierte en página de
  industria con caso real del piloto.
- Oferta white-label empujada a los clientes `ganado` (expansión §5-F6) y
  segundo tenant CRM (CRM-5) como prueba de marca blanca.
- **Criterio:** pipeline con las métricas del GTM §10 en verde; decisión
  informada de dónde invertir el trimestre 2.

---

## 14. KPIs y tablero comercial

**Regla:** todo KPI se lee de `leads` + vistas + `token_usage` (nada de hojas
sueltas), y cada uno declara si es medible HOY o qué lo desbloquea.

### KPIs de captación
| KPI | Fuente | ¿Medible hoy? |
|---|---|---|
| Leads por origen (`web2`/`crm`/`a2a`/`manual`) | `leads.origen` | ✅ |
| Leads por campaña / CAC por campaña | `campana_id`+`utm` | ⛔ requiere desplegar CRM-4 (y pauta activa) |
| Conversaciones de chat iniciadas → lead | bitácora + `leads` | ✅ (web2) |
| Costo por lead por canal | inversión canal ÷ leads | 🟡 cuando haya pauta |

### KPIs de nutrición
| KPI | Fuente | ¿Medible hoy? |
|---|---|---|
| Tasa de respuesta en chat/WhatsApp | `v_crm_conversaciones_resumen` | ✅ mecanismo (falta tenant para WhatsApp) |
| Leads en nutrición y reactivados | `v_nutricion` | ⛔ CRM-4 + (email gate / P2 según canal) |
| Tiempo a primer contacto | `leads` timestamps + SLA | ✅ (`sla_por_etapa`/semáforo) |

### KPIs de ventas
| KPI | Fuente | ¿Medible hoy? |
|---|---|---|
| Tasa de paso por etapa (embudo completo) | `v_embudo_leads` | ✅ |
| Tasa de agendamiento (calificado→cita) | Copilot agenda + `leads` | 🟡 completo con puente cita→lead (§16-D3) |
| Show rate a reuniones | tablero de citas M5 | ✅ en el Copilot; cruce con leads tras el puente |
| Tasa discovery→propuesta y propuesta→cierre | `leads` | ✅ |
| Time-to-CRM-3 (firma→piloto resuelto) | operación | ✅ manual (KPI estrella del GTM) |
| Valor esperado por segmento | `leads.datos` + cierre | 🟡 requiere disciplina de registro |
| Velocidad del pipeline (días por etapa) | `leads` timestamps | ✅ |

### KPIs de operación del canal
| KPI | Fuente | ¿Medible hoy? |
|---|---|---|
| Margen unitario por tenant | `token_usage` vs tier | ✅ (el costeo por tarea ya se recalcula en fuente) |
| Supervisiones rechazadas / total (calidad del agente) | `crm_supervision` | ✅ mecanismo |
| Salud de canal (¿está recibiendo leads?) | `leads` por origen por semana | ✅ (alerta si un canal cae a cero) |
| Costo de marketing por oportunidad | gasto ÷ leads en `descubrimiento`+ | 🟡 cuando haya gasto |

**Tablero:** la vista CRM de Mission Control ya muestra embudo y
conversaciones; se propone añadir (en este orden): leads por origen por
semana, lista priorizada por score, y el bloque de KPIs de venta — como
vistas SQL nuevas con el mismo patrón (`security_invoker` + revoke), decisión
§16-D5. La revisión es el ritual semanal del GTM §13.5.

---

## 15. Quick wins de esta semana

Solo acciones ejecutables SIN gates pendientes (o que son el gate mismo):

1. **Presentar a Elisa las 6 decisiones de §16** — varias destraban todo lo
   demás y ya estaban listadas en GTM §11 y §13 (alta WhatsApp, dominio,
   motor+salientes). Costo: una sesión.
2. **Desplegar CRM-4** (si Elisa aprueba): está construido y testeado; es
   aplicar 2 migraciones + sembrar presupuesto + rebuild. Enciende
   calificación y atribución para todo lo que sigue.
3. **Publicar `/recursos` con los 2 primeros lead magnets** (#1 diagnóstico
   exprés y #3 checklist CRM): se derivan de documentos que ya existen;
   contenido, no infraestructura.
4. **Alinear los CTAs de `cliente-web2`**: chat → "agenda tu sesión de
   descubrimiento" (enlace a la reserva pública del Copilot). Cambio de
   contenido/prompt, no de arquitectura.
5. **Armar la lista de la Fase 2**: 20 prospectos S1 de la red del equipo +
   los 4–6 brokers S2 del discovery de seguros, cada uno con expediente de
   `enriquecimiento-a2a`. El GTM §13.2-3 lo pedía; este plan lo agenda.
6. **Fijar el ritual semanal de KPIs** en `#dep-adquisicionclientes` con los
   medibles-hoy de §14 (aunque los números arranquen en cero: la línea base
   también es dato).

---

## 16. Decisiones que necesito de la dueña

| # | Decisión | Contexto | Impacto si se aprueba |
|---|---|---|---|
| D1 | **Gates Ola 0** (ya listados en GTM §11): alta WhatsApp del 1er tenant, dominio propio, motor real + `enviar-salientes.py` | Sin cambios: este plan solo los re-presenta como camino crítico | Abre canales B, E y F completo |
| D2 | **Desplegar CRM-4** | Construido con 52 tests; es un deploy, no desarrollo | Calificación de intención + atribución de campaña en prod |
| D3 | **Puente Copilot→leads** (escritor para `origen='copilot'`) + CTAs del chat hacia la agenda | Pieza de código nueva (pequeña); respeta "un escritor por origen" | El canal D deja de ser isla: citas visibles en el embudo |
| D4 | **Scoring como vista SQL** (§9.1, sin migración) | Cálculo al vuelo, patrón `v_semaforo_casos`; reversible | Lista priorizada en Mission Control |
| D5 | **Vistas nuevas del tablero** (§14) | Mismo patrón de vistas existente | KPIs de captación/venta en el panel |
| D6 | **Conciliación de pricing en materiales**: la política fija USD 500–5000/mes (gate); la propuesta comercial dice "cifras tras descubrimiento" | No se contradicen, pero conviene decidir cuál mensaje va en materiales públicos (¿se publica el rango o no?) | Coherencia de todos los materiales del funnel |
| D7 | **Validación de este plan completo** (segmentos §4, servicios §3.3, cadencias §11, agencia §12, 90 días §13) | Todo lo marcado *(propuesta)* | El plan pasa de propuesta a plan de trabajo |

**Además, heredadas y solo re-señaladas:** los puntos `(sugerido)` abiertos
del pipeline EG.CRM (§9 de ese documento) y la decisión "cita perdida" del
Copilot siguen esperando dictamen.

---

## 17. Anclaje al roadmap

| Entrega de este plan | Se apoya en | Estado del soporte |
|---|---|---|
| Funnel canal A (web) | `cliente-web2` + `chat-web2` + leads `web2` | ✅ construido |
| Funnel canal B (WhatsApp) | `crm-canales` + `sup-crm` + puente a `leads` | ✅ construido / 🔴 sin tenant; P2 pendiente |
| Funnel canal C (eventos/QR) | canales A/B + `campana_id` (CRM-4) | ✅ base / 🟡 atribución sin desplegar |
| Funnel canal D (agenda) | Meeting Copilot M1–M5 + pre-discovery | ✅ construido / 🔴 puente a leads inexistente; notificador mock |
| Funnel canal E (email) | `enviar-salientes.py` + `aprobaciones_salientes` | 🟡 dry-run / 🔴 gate + SMTP + dominio |
| Funnel canal F (outreach) | `ventas-a2a` + pitch decks + `enriquecimiento-a2a` + gates comerciales | ✅ construido / 🔴 envío espera gate |
| Scoring y enrutamiento | `calificacion`/`calificacion_senales` (CRM-4) + enriquecimiento + vistas | 🟡 CRM-4 sin desplegar; vista de score por crear |
| KPIs y tablero | `v_embudo_leads`, `v_crm_conversaciones_resumen`, `token_usage`, Mission Control | ✅ construido / 🟡 vistas nuevas propuestas |
| Contenido/SEO/AEO | frontends Next.js + dominio propio | ✅ frontends / 🔴 dominio |
| Agencia agéntica | stack Hermes + patrón host-job + gates de claims | ✅ patrón probado / *(propuesta completa)* |
| Metas y secuencia | GTM §5 (3 olas), §10 (KPIs), §11 (gates) | *(propuesta del GTM, heredada)* |

---

## Nota de método

Este plan **extiende** `businessos/GTM.md` y no reemplaza ninguna decisión
del equipo: hereda su tesis, ICP, pricing, pitch y gates, y añade la capa de
marketing, funnel y operación que el GTM no cubría. Todo lo *(propuesta)* —
segmentos, servicios, scoring, cadencias, agencia, metas de fase — queda
pendiente de validación de Elisa (§16-D7). La honestidad del semáforo (§0) es
deliberada: la credibilidad comercial de este proyecto se apoya en no
prometer lo que sus propios gates aún no abren, y ese mismo estándar es el
que este plan aplica a su marketing. Si el equipo quiere presionar las
decisiones grandes desde ángulos que chocan (¿rango público o no?, ¿agencia
propia o foco total en pilotos?), el camino es la skill `consejo`, con
`decision_id` registrado.

*Este documento es una propuesta. Nada aquí está aplicado: cero código, cero
SQL, cero campañas lanzadas, cero claims ni precios nuevos.*
