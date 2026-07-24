# Plan de Escalamiento por Fases — Proyecto Hermes

**Fecha:** Julio 2026 · **Stack base:** Vercel (free) · Supabase (free) · Suscripción Claude · OpenRouter · Docker · Hetzner

> Nota inicial importante: la **suscripción de Claude (claude.ai)** no da acceso a la API. Sirve para desarrollo (Claude Code, prototipado, análisis). Todo consumo de IA **en producción** debe fluir por OpenRouter o la API de Anthropic, que se cobran por token. Este supuesto atraviesa todo el costeo.

---

## Fase 1 — Crecimiento interno del negocio

**Perfil:** Hermes se usa dentro de tu propia operación. Un solo "tenant" (tú), pocos usuarios, datos propios. El objetivo no es escalar sino **validar procesos y acumular casos de uso reales** que después se venden.

La arquitectura correcta aquí es la más simple posible: frontend en Vercel free, base de datos y auth en Supabase free, y los servicios pesados (workers, procesamiento de documentos, colas ligeras) en contenedores Docker sobre **un solo Hetzner Cloud pequeño (CX22, ~€3.8/mes)**. No conviene montar Kubernetes ni nada gestionado: un `docker compose` con Caddy/Traefik como reverse proxy es suficiente y te da práctica operativa barata.

Aunque el volumen sea mínimo, hay dos decisiones que **debes tomar en Fase 1 porque son carísimas de retrofitear después**:

1. **Modelo de datos multitenant desde el día uno.** Toda tabla lleva `tenant_id` y Row Level Security (RLS) activo en Supabase, aunque solo exista un tenant. Migrar un esquema mono-tenant a multitenant con datos vivos es el error más caro de un SaaS.
2. **Capa de abstracción de LLM.** Todas las llamadas de IA pasan por un módulo propio (no llamadas directas dispersas en el código) que registra tokens, modelo, costo y tenant. Esto es lo que después te permite hacer costeo unitario real y routing de modelos.

**Costo mensual estimado Fase 1:** $0 infra + €3.8 Hetzner + $5–20 USD OpenRouter (uso propio) + suscripción Claude para desarrollo. **Total: ~$15–35 USD/mes.**

**Criterio de salida:** tienes 1–2 flujos de Hermes que resuelven un problema medible en tu operación y sabes cuántos tokens/documentos consume cada flujo.

---

## Fase 2 — MVP: productos en prueba de laboratorio

**Perfil:** 1–3 clientes piloto ("laboratorio") usando Hermes con datos semi-reales o reales bajo NDA. Aquí el riesgo ya no es técnico sino de **confianza**: un piloto que filtra datos mata el proyecto.

Cambios respecto a Fase 1:

- **Supabase sube a Pro ($25/mes)** en cuanto entre el primer dato real de un cliente: el free tier pausa proyectos inactivos, no tiene backups diarios ni soporte, y eso es inaceptable con datos de terceros. El Pro te da backups diarios, 8 GB de base y sin pausas.
- **Vercel puede seguir free** si el tráfico es bajo, pero revisa los términos: el plan Hobby prohíbe uso comercial. Si el piloto es pagado, formalmente corresponde **Vercel Pro ($20/mes)**. Alternativa de ahorro: servir el frontend desde el mismo Hetzner (Docker + Caddy) y dejar Vercel solo para previews de desarrollo.
- **Hetzner sube a CPX31 o CX32 (~€7–14/mes)** para separar staging de producción en el mismo servidor con Docker (dos stacks de compose), o dos servidores pequeños si prefieres aislamiento físico entre pilotos.
- **Entornos separados:** un proyecto Supabase para desarrollo/staging (puede ser free) y otro Pro para pilotos. Nunca datos reales en staging.

En IA, la fase de laboratorio es donde defines el **routing de modelos**: pruebas cada flujo con un modelo barato (Haiku, Gemini Flash, Llama vía OpenRouter) y uno caro (Sonnet/Opus), mides calidad y fijas el modelo mínimo aceptable por tarea. Ese mapa tarea→modelo es tu principal palanca de margen en Fases 3 y 4.

**Costo mensual estimado Fase 2:** $25 Supabase + $0–20 Vercel + €7–14 Hetzner + $20–60 OpenRouter (pilotos) ≈ **$60–130 USD/mes.**

**Criterio de salida:** al menos un piloto convierte a contrato pagado, y conoces el costo unitario real por operación (ver sección de costeo) con margen bruto >70%.

---

## Fase 3 — Multitenant con poco volumen (3–15 tenants)

**Perfil:** clientes pequeños/medianos pagando. Volumen bajo por tenant, pero ya hay obligaciones contractuales: disponibilidad, confidencialidad, soporte.

**Arquitectura recomendada:** multitenant por **fila compartida (`tenant_id` + RLS)**, no por esquema ni por base separada. Con poco volumen, bases separadas multiplican costo operativo sin beneficio. Las excepciones se manejan como premium: si un cliente exige aislamiento total, se le cobra un plan "dedicado" que financie su propio proyecto Supabase o su propio contenedor de base en Hetzner.

Cambios de infraestructura:

- **Hetzner CPX41 o CCX23 (~€25–30/mes)** como nodo principal de producción + un CX22 para staging. Considera **Coolify** (self-hosted, gratis) sobre Docker para despliegues tipo PaaS sin pagar Vercel Pro por seat.
- **Supabase Pro con compute upgrade** si las conexiones/CPU lo piden (add-ons desde ~$10–60/mes), o evaluar ya mover Postgres a Hetzner autogestionado (ahorro grande, pero asumes backups, PITR y parches tú mismo — solo hazlo si el tiempo operativo te sale más barato que el fee).
- **Backups fuera del proveedor primario:** dumps cifrados diarios de Supabase hacia Hetzner Storage Box (€3.8/mes por 1 TB). Regla 3-2-1 mínima.
- **Observabilidad:** Uptime Kuma + Grafana/Loki en Docker (gratis) o Better Stack free. Con clientes pagando, "no me di cuenta de que estaba caído" no es opción.

**Costo mensual estimado Fase 3:** $25–85 Supabase + €30–35 Hetzner (prod+staging+storage) + $20 Vercel (o $0 con Coolify) + $50–200 OpenRouter según volumen ≈ **$140–350 USD/mes**, contra ingresos que en este punto deberían ser 10–20× eso.

**Criterio de salida:** un prospecto de volumen alto (freight forwarder, aseguradora) exige SLA, cuestionario de seguridad o procesamiento masivo que el nodo actual no soporta.

---

## Fase 4 — Multitenant con alto volumen (freight forwarder, agencia de seguros)

**Perfil:** clientes que procesan cientos o miles de documentos/operaciones al día (BLs, facturas, packing lists, pólizas, siniestros), con decenas de usuarios concurrentes y exigencias formales de seguridad. Aquí cambian tres cosas a la vez: **volumen, criticidad y cumplimiento**.

**Arquitectura objetivo:**

- **Cómputo:** migrar el core a **Hetzner dedicado (AX42 ~€52/mes o AX102 ~€110/mes)**. Un solo AX102 (Ryzen, 128 GB RAM, NVMe) rinde como $600–900/mes de nube gestionada. Los cloud CPX quedan como nodos de staging y workers elásticos.
- **Orquestación:** `docker compose` deja de alcanzar cuando necesitas despliegues sin caída y workers que escalan. **k3s (Kubernetes ligero)** sobre 2–3 nodos Hetzner con su Load Balancer (€5–6/mes) y red privada (vSwitch) es el punto dulce: alta disponibilidad real sin la complejidad de un k8s completo.
- **Base de datos:** o Supabase Team ($599/mes: SOC 2, SSO, soporte prioritario — a veces lo paga el propio requisito del cliente) o **Postgres autogestionado en el dedicado con réplica y PITR (pgBackRest)**. La decisión es de cumplimiento tanto como de costo: si el cliente exige certificaciones, Supabase Team las trae hechas.
- **Cola de trabajos obligatoria** (Redis + BullMQ, o pgboss sobre Postgres): el procesamiento masivo de documentos con LLM debe ser asíncrono, con reintentos, prioridad por tenant y límites de gasto por tenant (para que un cliente no consuma el presupuesto de tokens de todos).
- **Latencia desde México:** Hetzner tiene datacenters en **Ashburn y Hillsboro (EE. UU.)** con ~40–70 ms desde Veracruz, contra 120–150 ms de Alemania. Para Fase 4 con usuarios interactivos, ubica producción en EE. UU.

**Costo mensual estimado Fase 4:** €110–220 Hetzner (dedicado + nodos + LB + storage) + $85–599 base de datos + $0–40 frontend + observabilidad ~$0–50 + **LLM $300–2,000+ según volumen (es el costo dominante, ver costeo)** ≈ **$600–3,000 USD/mes**, financiado por contratos enterprise.

---

## Escalamiento de servidores Hetzner — análisis y FODA

**Ruta de escalamiento propuesta:**

| Etapa | Servidor | Precio aprox. | Capacidad orientativa |
|---|---|---|---|
| F1 | CX22 (2 vCPU, 4 GB) | €3.8/mes | Uso interno, workers ligeros |
| F2 | CPX31 (4 vCPU, 8 GB) | €13/mes | Pilotos + staging |
| F3 | CPX41 / CCX23 (8 vCPU o dedicado-cloud) | €25–30/mes | 3–15 tenants de bajo volumen |
| F4 | AX42 → AX102 dedicado + 2 CPX + LB | €110–220/mes | Multitenant de alto volumen, k3s |

La ventaja estructural es que **cada salto es 2–4× de capacidad por ~2× de precio**, sin cambiar de proveedor, red ni tooling: Docker viaja intacto de CX22 a AX102.

**FODA de Hetzner como plataforma de escalamiento:**

| **Fortalezas** | **Debilidades** |
|---|---|
| Mejor relación precio/rendimiento del mercado (5–10× más barato que AWS/GCP equivalente). Hardware dedicado accesible. Red privada (vSwitch), LB y snapshots baratos. Protección DDoS incluida. Predictibilidad total de factura. | **Nada es gestionado**: base de datos, colas, backups y parches son tu responsabilidad (costo en tu tiempo). Soporte básico, sin SLA enterprise en cloud estándar. Sin servicios serverless/PaaS nativos. |
| **Oportunidades** | **Amenazas** |
| Datacenters en EE. UU. reducen latencia a México a niveles competitivos. Crecer a bare-metal sin migración de stack. GDPR-friendly (valor ante clientes europeos de freight forwarding). Coolify/k3s convierten Hetzner en tu "Vercel privado" a costo fijo. | Concentración en un solo proveedor (mitigar: backups externos + IaC con Terraform para poder recrear en otro lado). Clientes enterprise pueden exigir certificaciones (SOC 2/ISO 27001) que aplican a **tu** operación, no solo al datacenter — Hetzner certifica el suyo (ISO 27001) pero el stack encima lo certificas tú. Cuenta puede ser suspendida por abuso reportado (mitigar: monitoreo saliente, dominios limpios). |

**Conclusión FODA:** Hetzner es óptimo para las 4 fases **si aceptas ser tu propio equipo de plataforma**. El costo que ahorras en factura lo pagas parcialmente en disciplina operativa (backups, monitoreo, hardening). El plan de mitigación es automatizar esa disciplina temprano (Fase 2–3), no en Fase 4.

---

## Ciberseguridad y confidencialidad al cliente (por fase)

La seguridad escala con las fases; lo crítico es qué es **irrenunciable desde cuándo**:

**Desde Fase 1 (fundacional):** RLS activo en todas las tablas; secretos fuera del código (variables de entorno, nunca en Git); 2FA en Hetzner, Supabase, Vercel, GitHub y OpenRouter; TLS en todo (Caddy lo automatiza); actualizaciones automáticas del SO (unattended-upgrades) y firewall de Hetzner cerrando todo excepto 80/443 (SSH solo por llave, idealmente detrás de VPN/Tailscale).

**Desde Fase 2 (datos de terceros):** NDA firmado antes de cargar cualquier dato; datos de prueba anonimizados cuando sea posible; separación estricta staging/producción; **política de IA por contrato**: en OpenRouter activar proveedores con *Zero Data Retention* / no-training para datos de clientes, y documentarlo — para un freight forwarder o una aseguradora, "¿mis datos entrenan modelos?" es la primera pregunta del cuestionario de seguridad.

**Desde Fase 3 (multitenant):** el riesgo central es **fuga entre tenants**. Se mitiga con RLS + pruebas automatizadas de aislamiento en CI (tests que intentan leer datos de otro tenant y deben fallar); cifrado de backups (age/gpg) antes de salir a Storage Box; logging de acceso por tenant con retención definida; acuerdo de tratamiento de datos (DPA) anexo al contrato; cumplimiento **LFPDPPP** (México): aviso de privacidad, finalidades, derechos ARCO, y registro de dónde residen los datos (relevante si el cliente exige residencia en EE. UU. vs. Europa).

**Desde Fase 4 (enterprise):** SSO/SAML para clientes que lo pidan (Supabase Team o Keycloak self-hosted); bitácora de auditoría inmutable (quién vio qué y cuándo — las aseguradoras lo piden); cifrado de disco en los dedicados (LUKS); red privada entre nodos, base de datos jamás expuesta a internet; pentest anual externo (desde ~$3–5k USD, se cobra dentro del pricing enterprise); plan de respuesta a incidentes escrito con tiempos de notificación al cliente; y roadmap hacia ISO 27001/SOC 2 si el pipeline comercial lo justifica.

---

## Costeo unitario — variables, escalamiento por volumen y uso óptimo

### Las variables que participan

El costo de servir una operación en Hermes se descompone así:

**Costos variables puros (crecen con cada operación):**

1. **Tokens de LLM** — la variable dominante. `Costo = (tokens_entrada × precio_in) + (tokens_salida × precio_out)`. Los precios varían ~75× entre modelos (un modelo económico vía OpenRouter puede costar ~$0.1–1 por millón de tokens de entrada; un modelo frontier, $3–15).
2. **Egress/ancho de banda** — casi despreciable en Hetzner (20 TB incluidos) y Supabase Pro (250 GB), pero es la trampa clásica de Vercel (100 GB free, luego caro).
3. **Almacenamiento de documentos** — crece con volumen acumulado, no mensual: cada BL/póliza en PDF ocupa ~0.2–2 MB para siempre (salvo política de retención).

**Costos escalonados (fijos por tramo, saltan al cruzar umbrales):**

4. **Cómputo (Hetzner)** — fijo hasta saturar CPU/RAM; entonces salta de tramo (€13 → €30 → €110).
5. **Base de datos** — conexiones concurrentes, tamaño y IOPS; salta por add-on o por tier ($25 → $85 → $599 o autogestión).
6. **Seats/planes de plataforma** (Vercel Pro por miembro, herramientas).

**Costos fijos reales:** suscripción Claude (desarrollo), dominio, monitoreo, y sobre todo **tu tiempo operativo** — que en Hetzner es un costo real y debe imputarse.

### Ejemplo numérico: freight forwarder

Operación tipo: procesar un embarque = extraer y validar BL + factura comercial + packing list ≈ 15,000 tokens de entrada + 3,000 de salida (documentos escaneados vía OCR + estructuración).

| Estrategia de modelo | Costo por embarque | 1,000 embarques/mes | 10,000/mes |
|---|---|---|---|
| Todo con modelo frontier (~$3/$15 por M tokens) | ~$0.090 | $90 | $900 |
| Todo con modelo económico (~$0.8/$4) | ~$0.024 | $24 | $240 |
| **Routing: económico extrae, frontier solo valida casos dudosos (~15%)** | **~$0.034** | **$34** | **$340** |
| Routing + prompt caching (plantillas/instrucciones cacheadas, −60–90% en entrada repetida) | ~$0.018 | $18 | $180 |

Lectura clave: entre la peor y la mejor estrategia hay **5× de diferencia de costo con calidad equivalente**. En Fase 4, esa diferencia es tu margen.

### Cómo escala el costo total por volumen (síntesis)

- De 0 a ~1,000 operaciones/mes: el costo está **dominado por fijos** (~$60–350/mes de plataforma); el costo unitario cae rápido al repartirse. Aquí el pricing por suscripción plana funciona.
- De 1,000 a ~10,000: los **tokens se vuelven el rubro #1**; los fijos saltan un tramo (servidor, DB). El costo unitario se aplana en ~$0.02–0.05 por operación bien optimizada.
- Más de 10,000: escala casi lineal en tokens + saltos discretos de infraestructura. Aquí el pricing al cliente debe tener **componente por volumen** (por embarque, por póliza, por siniestro) para que tu ingreso escale con tu costo — nunca vendas "ilimitado" a un freight forwarder.

### Propuesta de uso óptimo

1. **Router de modelos por tarea** (definido en Fase 2): clasificación/extracción → modelo económico; razonamiento, redacción legal, casos ambiguos → frontier. Objetivo: <20% del tráfico en modelos caros.
2. **Prompt caching y plantillas estables**: instrucciones de sistema largas y esquemas de extracción se cachean; solo el documento varía.
3. **Batch/asíncrono para todo lo no interactivo**: colas nocturnas para reprocesos; algunas APIs dan −50% en batch.
4. **Presupuesto de tokens por tenant** con corte/alerta: protege margen y evita sorpresas de factura en OpenRouter.
5. **Medición desde el día 1**: la capa de abstracción de LLM de Fase 1 registra costo real por tenant y por flujo — es lo que te permite cotizar Fase 4 con datos, no con fe.
6. **Infra: retrasar cada salto de tramo** hasta ~70% de utilización sostenida, y preferir Hetzner dedicado sobre múltiples nodos cloud cuando el gasto cloud supere ~€60/mes.

---

## Resumen ejecutivo de costos por fase

| Fase | Infra + plataforma | LLM (variable) | Total estimado/mes | Disparador de salto |
|---|---|---|---|---|
| 1. Interno | ~$5–15 | $5–20 | **$15–35** | Primer piloto externo |
| 2. MVP laboratorio | ~$40–70 | $20–60 | **$60–130** | Primer contrato pagado |
| 3. Multitenant bajo volumen | ~$90–150 | $50–200 | **$140–350** | Cliente de volumen/enterprise |
| 4. Multitenant alto volumen | ~$300–1,000 | $300–2,000+ | **$600–3,000+** | — |

(Cifras en USD aprox.; €1 ≈ $1.08. El tipo de cambio MXN aplica solo a tu facturación local — cotiza a clientes en USD para no absorber riesgo cambiario de costos denominados en USD/EUR.)

---

## Anexo de la fábrica (2026-07-24) — deltas verificados contra la operación real

> Sección añadida al versionar este documento en el repo. El texto de arriba se
> conserva **verbatim** como lo entregó la dueña; lo de abajo corrige o ancla
> contra el estado observable (doctrina: verificar el runbook contra la
> realidad, no al revés).

1. **Los tipos CX22/CX32 ya no existen** (naming actual: cx23 4 GB $6.49 /
   **cx33 8 GB $8.99** — verificado contra el endpoint `pricing` el
   2026-07-05). Además la **línea CX es solo-Europa**: en EE. UU. (Ashburn/
   Hillsboro) solo hay CPX/CCX a ~3.4× el precio ($37.49 el cpx21 de 4 GB).
   La recomendación de Fase 4 "producción en EE. UU. por latencia" carga ese
   sobrecosto — evaluarla con números del endpoint `pricing`, no de tablas.
2. **La Fase 1 de este plan YA corre**: cx33 en Falkenstein (`fsn1`,
   ~$9/mes) con las 3 verticales Hermes + grafo + trío A2A (6 servicios) +
   edge Caddy (TLS + rate-limit, único puerto público 443). Ver ROADMAP
   FASE 0 y `.claude/memory/project/despliegue-hetzner.md`.
3. **La "capa de abstracción de LLM" que el plan pide ya existe**: routing
   por perfil en Hermes (gemini-lite loop / GLM-5.2 y haiku en pesados),
   `token_usage` con ledger por-tarea del trío, presupuesto con corte por
   tarea (`fan_out_max` + acumulado), y gate `probe-glm.py` (caché+tools)
   antes de cablear un modelo nuevo. El costeo unitario de la sección de
   costeo se alimenta de ahí, no de estimaciones.
4. **Multitenant día-uno:** el CRM conversacional (`crm-canales`) ya es
   multi-tenant; las tablas del negocio (`tareas`, `leads`, `token_usage`)
   hoy son single-tenant del propio negocio. Si un flujo interno se convierte
   en producto (Fase 2→3 del plan), aplica la regla del plan: `tenant_id` +
   RLS ANTES del primer dato de tercero, no después.
5. **Seguridad "fundacional desde Fase 1":** password-auth por SSH ya está
   cerrado y el firewall es tcp/22+443 (2026-07-12), pero el **2FA de la
   cuenta Hetzner sigue PENDIENTE** — es el único punto de falla real de la
   cuenta y este plan lo lista como irrenunciable. Acción de la dueña.
6. **Precios**: todas las cifras de servidores de este plan son orientativas
   y envejecen; la fuente de verdad es el endpoint `pricing` vía
   `hcloud-pp-cli` (con `sync` previo — el espejo local miente si está rancio).
