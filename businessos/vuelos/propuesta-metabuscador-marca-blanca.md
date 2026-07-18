# PROPUESTA MARCA BLANCA — METABUSCADOR DE VUELOS (tipo Skyscanner)
## Cliente: Luis · Adaptación del modelado agéntico al modelo de la fábrica

> Versión white-label de la propuesta técnica del hilo de `#dep-desarrollo` (2026-07-16),
> re-anclada al modelo real del proyecto: `departamentos/white-label.md` (aislar, no fundir;
> configurar, no programar), `SPEC-trio.md` (quién construye y quién juzga) y las lecciones
> pagadas de CLAUDE.md. Hermana de `crm/propuesta-crm-marca-blanca.md`.
>
> **El cambio de fondo vs. la propuesta original:** los "5 agentes" del runtime NO son agentes
> LLM — son **servicios deterministas** que el enjambre CONSTRUYE. La IA aparece donde hay
> juicio (construcción, supervisión, soporte al viajero), nunca en el camino caliente de una
> búsqueda (regla de la casa desde el grafo: cero LLM en el hot path; y es la única forma de
> cumplir p99 < 2s sin quemar tokens por búsqueda).

---

## 1. Requerimiento (sin cambios)

Luis quiere comparar y **reservar** vuelos (no solo redirect → ahí está el margen), agregando
múltiples fuentes (NDC/GDS/OTAs) con cobertura LCC, **sin montar acreditación IATA propia**
(US$50k+ en bonos). Eje recomendado: **Duffel** (emite bajo SU autoridad IATA) + Travelpayouts
como fuente de caché barata + Amadeus como backup si su Self-Service sigue disponible.

---

## 2. Qué es común y qué se configura (white-label §1–2)

**Común (la fábrica, idéntico para todos los clientes):**
- El trío que construye y mantiene: Hermes-Negocio → Ejecutor → Supervisor (+ Coordinador
  para fan-out). Montar a Luis **no se programa, se configura**.
- El catálogo de skills, los gates del Supervisor, las dos capas de control
  (Supervisor automático + gate humano en lo irreversible).
- El **design system A2A Factory** (`frontends/design-system/`): componentes CSS-var driven —
  el reskin de marca blanca es literalmente **intercambiar el archivo de tokens** (colores,
  tipografía, radios) por los de la marca de Luis. Cero cambio de componentes.

**Configuración específica de Luis (compartimento estanco, §3 — no negociable):**

| Eje | Configuración |
|-----|---------------|
| Repo | repositorio PROPIO de Luis; el Ejecutor jamás cruza repos |
| Workspace | worktree/contenedor propio; su tope de presupuesto en la cola del trío |
| Secretos | credenciales Duffel/Amadeus/Travelpayouts **de Luis**, en su almacén, nunca en git |
| Marca | tokens del design system con su identidad; su dominio |
| Datos | Supabase propio del producto (o schema aislado), RLS on; ámbito RAG propio |
| Canal humano | `#cli-luis` privado en Slack (el aislamiento hecho visible) |
| Infra | server/compose propio (cx33 ~US$9/mes) tras edge Caddy — un fallo suyo no toca a nadie |

---

## 3. Arquitectura runtime — determinista, con la IA en sus 3 lugares

Los 5 componentes de la propuesta original se conservan **como servicios/módulos de código**
(el skeleton técnico era correcto; lo que cambia es QUIÉN los ejecuta):

| Componente | Qué es en la fábrica | LLM |
|------------|----------------------|-----|
| DATA-INGESTER | servicio async (fan-out HTTP concurrente, timeout por fuente, tolerancia a fallo parcial) | ❌ |
| NORMALIZER | módulo puro de mapeo esquema→canónico (Zod/tipos; testeable con fixtures) | ❌ |
| CACHE-MANAGER | lógica embebida junto a la caché (TTL dinámico por días-a-salida) — como decía la propuesta, "no es un agente" | ❌ |
| RANKER | scoring determinista (fórmula de la propuesta) + dedup por clave compuesta | ❌ |
| BOOKER | máquina de estados (revalidar → crear orden → capturar pago) con **un escritor por fila** en la tabla `orders` | ❌ |

**Dónde SÍ hay IA:**
1. **Construcción:** el **enjambre** (Coordinador descompone → Ejecutores construyen en
   worktrees → Supervisor re-gatea el todo integrado). Es el producto que vendemos: "su
   departamento de software con IA, bajo supervisión".
2. **Soporte al viajero (opcional, fase 2):** una vertical Hermes de Luis para tier-1
   (cambios, dudas, estado de reserva) — con escalera de autonomía A0→A3 del patrón CRM
   (`crm/plan-autonomia-crm.md`): la autonomía se gana con evidencia, no se otorga.
3. **Operación del negocio de Luis:** reportes/alertas por su canal (patrón budget-report).

**Flujo de búsqueda** (idéntico al flowchart original, pero todo código):
búsqueda → fan-out (Duffel/Amadeus/Travelpayouts) → caché TTL dinámico → normalizar →
rankear/dedup → stream a UI → click → revalidación live quote → orden → pago → confirmación.

---

## 4. Quién construye y cómo (esto reemplaza las 780 horas-hombre)

La propuesta original presupuestó **US$41,200 en 6 humanos × 10 semanas**. En el modelo de la
fábrica, la construcción la hace el **enjambre por la cola del trío** (Fase 10) con gates
del Supervisor, y los humanos quedan donde son insustituibles: aprobar, dar acceso a
sandboxes, y el steering con Luis.

| Componente original | Se convierte en | Presupuesto tokens* |
|---|---|---|
| DATA-INGESTER (120 h) | 2–3 tareas del trío (fan-out + tolerancia + timing LTB) | ~$4–8 |
| NORMALIZER (80 h) | 1–2 tareas (modelo canónico + fixtures por proveedor) | ~$2–5 |
| CACHE (40 h) | 1 tarea (Redis en compose + TTL dinámico) | ~$2–3 |
| RANKER (100 h) | 1–2 tareas (scoring + dedup + 3 listas) | ~$2–5 |
| BOOKER (160 h) | 3–4 tareas (máquina de estados, revalidación, pago, retries) | ~$6–12 |
| Monitoring (60 h) | 2 host-jobs (patrón fábrica, ver §6) | ~$2–4 |
| Frontend (120 h) | 3–5 tareas sobre design system + patrón `cliente-web2` | ~$6–12 |
| QA (100 h) | lo hace el **Supervisor en cada tarea** (gates) + smoke de runtime | incluido |
| **Total** | **~15–20 tareas + integración** | **~$25–50 nominal → presupuesto $150–300 con iteraciones** |

\* Referencia real, no teórica: el dogfood del enjambre (feature de 3 sub-tareas, 8 gates
verdes) costó ~$1.62. El ledger por tarea (`token_usage.task_id`) hace el gasto **visible
y con tope** — el corte de presupuesto ya operó con datos reales.

**Regla de gates (lección 2026-07-12):** todo gate que el Supervisor corre incondicionalmente
va SIEMPRE en los `criterios_aceptacion` de cada tarea — incluido *"incluye al menos un test
de Playwright que cubra X"*. Los gates medibles de la propuesta original (§8) se conservan
íntegros como criterios por tarea: fan-out 3 fuentes con 1 caída y las otras siguen; 100
itinerarios brutos → 100 normalizados; dedup sin colisiones; 5 órdenes end-to-end en sandbox;
LTB ≥ 1:50; cache hit ≥ 35 %; p99 < 2 s; uptime ≥ 99.5 %.

**Cuello de botella honesto:** ya no son horas de código — son (a) el alta y sandbox de
proveedores (Duffel/Amadeus la abre Luis o su gestor: son SUS credenciales), y (b) las
aprobaciones humanas de la matriz. El calendario lo marcan esos dos, no el enjambre.

---

## 5. Stack (golden path, con las excepciones honestas)

| Capa | Elección | Nota |
|------|----------|------|
| Frontend | Next.js 16 + `@a2a/design-system` (tokens de la marca de Luis) | patrón `cliente-web2`; deploy Vercel o su compose |
| Backend búsqueda | servicio Python/Node async en compose (hermes-net propio de Luis) | determinista |
| BD | Supabase propio/aislado, RLS on, escrituras por service_role server-side | patrón de la casa |
| Caché | Redis como contenedor en SU compose (US$0 marginal) | no un Redis gestionado de $200–500/mes |
| **Pagos del viajero** | **Duffel Payments** (o Stripe Checkout hosted, SAQ-A) | ⚠️ excepción al default Polar: Polar es MoR de productos digitales, NO puede liquidar boletos aéreos regulados. Nunca tocamos tarjetas (hosted checkout) |
| Cobros de la fábrica a Luis | **Polar** (tabla `cobros`, pipeline Fase 3) | setup + mensualidad + % por orden |
| Observabilidad | host-jobs + snapshots + Mission Control + alertas `hermes send` a `#cli-luis` | reemplaza DataDog ($400–800/mes → $0) |
| Contrato | tabla `contratos` validada por grafo (ámbito contractual MX); **firmar = solo humano** | pipeline Fase 3/9 |

---

## 6. Gobernanza y operación (lo que la propuesta original no tenía)

- **Lead → contrato:** Luis entra al pipeline de adquisición (tabla `leads`, Fase 9);
  propuesta y contrato los aprueba el **PM** (cara a cliente), montos el **CFO**, la firma es
  humana — matriz de `equipo-y-slack.md` sin excepciones.
- **Monitor LTB** = host-job cron (no un "agente"): escribe snapshot por proveedor y alerta a
  `#cli-luis` si look-to-book degrada (< 1:100 → throttle). **Todo best-effort loguea**
  (lección del fetch fantasma: lo silencioso es invisible y lo invisible muerde).
- **Máquina de estados de reservas:** antes de darla por viva, **matarla a propósito en cada
  estado en vuelo** (lección de la cola, PRP-010) — una orden muerta en `pending_payment`
  debe tener salida, no limbo.
- **Clientes A2A de tareas largas:** timeout ≥ 900 s y jamás concluir "el servicio está caído"
  por un timeout (lección 2026-07-12); el servidor usa `asyncio.shield`.
- **Steering con Luis:** cada 2 semanas, contra los gates medibles (§4), en `#cli-luis`.

---

## 7. Inversión (recalculada al modelo fábrica)

| Concepto | Propuesta original | Modelo fábrica |
|----------|-------------------:|---------------:|
| Desarrollo MVP | US$41,200 (6 humanos × 10 sem) | **US$150–300 en tokens** + horas humanas de PM/aprobaciones/setup |
| QA | US$4,800 (incluido arriba) | incluido (Supervisor + smoke) |
| Observabilidad | US$400–800/mes | US$0 (patrón host-jobs) |
| Redis | US$200–500/mes | US$0 (contenedor propio) |
| Infra | US$1K–2.5K/mes | **US$9–40/mes** (cx33 dedicado + edge; escala después) |
| APIs Duffel | US$3 + 1 % por orden | igual (costo real del proveedor, lo paga la operación) |
| Amadeus (si aplica) | US$500–2K/mes | igual, solo si el volumen lo justifica |
| **Año 1 total** | **US$73K–137K** | **~US$1.5K–6K** de operación base + fees por orden + **precio de la fábrica a Luis** |

**El precio a Luis es decisión comercial** (CEO/CFO): setup + mensualidad del "departamento
de software con IA" + % por reserva emitida. El colapso de costos de construcción ES el
margen del modelo white-label — y la cotización puede salir del deck-builder de
`cliente-web2` como cualquier otro mazo.

---

## 8. Timeline (el enjambre paraleliza; los humanos marcan el paso)

- **Semana 1 — Config, no código:** alta Duffel/Travelpayouts sandbox (Luis), repo propio,
  compose + secretos + `#cli-luis`, contrato (grafo + PM + firma). Spike: 1 itinerario
  MEX→MIA por cada proveedor, a mano, para fijar fixtures reales.
- **Semanas 2–3 — MVP por el enjambre:** tareas de ingester/normalizer/cache/ranker a la
  cola (varias en paralelo vía Coordinador); frontend sobre design system. Gates verdes
  por tarea + re-gateo del todo integrado.
- **Semana 4 — Reserva y pago:** BOOKER (sandbox Duffel end-to-end ×5), Duffel Payments,
  smoke de runtime matando estados en vuelo.
- **Semanas 5–6 — Endurecimiento y salida:** load test (100 RPS, p99 < 2 s), monitor LTB,
  runbook, deploy prod, steering de cierre con Luis.

**MVP: 4–6 semanas calendario** (vs. 10), condicionado a sandboxes y aprobaciones — no a
capacidad de construcción.

---

## 9. Riesgos (los originales + los del modelo)

| Riesgo | Mitigante |
|--------|-----------|
| Cambio Amadeus Self-Service (17-jul) | eje en Duffel; Amadeus es backup opcional |
| LTB degrada por exceso de búsquedas | monitor host-job + throttle; alerta < 1:100 |
| TTL mal calibrado → precios viejos | revalidación live quote en checkout; tolerancia 5 % |
| Orden en limbo por reinicio | máquina de estados con salida por CADA estado (lección cola) |
| Madurez del stack (white-label §5) | se vende **con supervisión**, no "el agente solo"; el trío ya está validado en dogfood real |
| Reglas de Supervisor flojas = falsa seguridad | auditar los criterios por tarea ANTES de encolar (regla de la casa) |

---

## 10. Próximos pasos

1. **Luis confirma:** facilitated booking (recomendado) vs. redirect; rutas prioritarias;
   presupuesto cap. → lo lleva el **PM** en `#cli-luis`.
2. **CEO/CFO fijan precio** (setup + mensualidad + % por orden) y el PM emite propuesta
   comercial (hermana de `crm/propuesta-crm-comercial.md`).
3. **Config del compartimento** (semana 1 de §8) — nada de esto gasta tokens.
4. **Primera tanda a la cola del trío:** ingester + normalizer + fixtures del spike, con
   criterios de aceptación completos (incluido Playwright).

---

*Derivada del análisis técnico de Elisa (doc Skyscanner) + plan del bot en `#dep-desarrollo`
(2026-07-16). El esqueleto técnico de aquel plan se conserva; lo que cambia es la economía
(enjambre, no 6 humanos) y la doctrina (determinista en runtime, IA donde hay juicio,
compartimento estanco por cliente).*
