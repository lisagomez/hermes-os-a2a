# BUSINESS_LOGIC.md — Hermes OS · A2A

> Generado por SaaS Factory (skill new-app, adaptado a infra agente-first) | Fecha: 2026-06-26
> Fuente de verdad de fases y stack: ROADMAP.md. Detalle de cimiento: FASE0.md.

> **Nota de encaje:** Hermes OS · A2A NO es un SaaS web Next.js. Es un sistema
> operativo de agentes (Hermes) sobre Docker/Telegram en un servidor Hetzner. Este
> documento usa la estructura de BUSINESS_LOGIC.md pero adapta la sección
> técnica a la arquitectura real (contenedores + servicios en `hermes-net`),
> no a `src/features/` ni a deploy en Vercel.

---

## 1. Problema de Negocio

**Dolor:** Operar tres frentes a la vez —vida personal, operación del negocio y
relación con clientes— está fragmentado entre apps, chats, notas y hojas de
cálculo. Nada comparte memoria ni contexto, y toda la carga mental + el trabajo
manual recae en una sola persona. A esto se suma la carga regulatoria/fiscal
multi-país: saber qué es deducible, qué cláusula es válida o qué impuesto aplica
exige consultar fuentes dispersas y se decide a ciegas.

**Costo actual:**
- Horas diarias en captura, clasificación y seguimiento manual.
- Gasto de modelos de IA sin visibilidad ni tope (se escala a Opus sin control).
- Facturas y leads que se caen por falta de seguimiento.
- Decisiones fiscales/contractuales sin una fuente citable → riesgo real.

---

## 2. Solución

**Propuesta de valor:** Un sistema operativo de agentes por Telegram —una mente
(Hermes) con tres bocas (personal, negocio, clientes)— con memoria persistente,
presupuesto de tokens controlado, y un cerebro regulatorio (grafo) que señala
riesgos fiscales/contractuales citando fuentes, sin sustituir al profesional.

**Flujo principal (Happy Path):**
1. Hablas (texto o voz) por Telegram a la vertical correspondiente.
2. El agente captura/clasifica/responde con su persona (SOUL.md) y sus reglas
   (AGENTS.md), apoyándose en su memoria (MEMORY.md) y la bóveda Obsidian.
3. Registra los datos en Supabase (`token_usage`, `facturas`) y, cuando exista,
   consulta el grafo para validar deducibilidad/cláusulas con fuente.
4. Entrega digests diarios, alertas de presupuesto y borradores; todo lo que
   sale hacia un cliente espera aprobación humana.
5. Respaldo nocturno de cada workspace a su repo privado de GitHub.

---

## 3. Usuario Objetivo

**Rol:** El dueño-operador único (un solo humano) que hace de todo a la vez:
gestiona su vida personal, dirige la operación del negocio y atiende a clientes.
No es un equipo: es una persona multiplicada por tres verticales.

**Contexto:** Acceso restringido por allowlist de Telegram (solo el dueño habla
con los bots). Cada vertical es un contenedor aislado con su propia persona,
memoria y bot; nunca se funden (principio "aislar, no fundir").

---

## 4. Arquitectura de Datos

**Input:**
- Mensajes y notas de voz de Telegram (la voz se transcribe a la entrada).
- Facturas (imagen / PDF) enviadas a la vertical clientes.
- Notas y capturas a la bóveda Obsidian (vertical personal).

**Output:**
- Digests diarios y cierres semanales por Telegram (con tope de palabras).
- Alertas de presupuesto de tokens al cruzar el 80%.
- Borradores de propuestas/respuestas a cliente (siempre con aprobación humana).
- Dashboard "Mission Control" (A2ABot): Pantheon, AI Spend, evaluaciones grafo.
- Respaldo nocturno a GitHub (un repo privado por vertical, horarios escalonados).

**Storage (Supabase + volúmenes):**
- `token_usage`: una fila por llamada relevante (`fecha, vertical, modelo,
  tokens_in, tokens_out, costo_usd`). Fuente de verdad del presupuesto.
- `facturas`: facturas extraídas (`cliente, folio, fecha, conceptos, subtotal,
  impuestos, total` + deducibilidad pendiente hasta el grafo).
- Volumen `.hermes` por vertical: config, credenciales, sesiones, skills, memoria.
- Bóveda Obsidian (`/opt/data/obsidian`): conocimiento personal versionado.
- `cobros` y `contratos` (Fase 3): checkouts Polar y acuerdos validados por el grafo
  (host-jobs `polar-cobros.py` / `validar-contratos.py`; aprobar/firmar = solo humano).
- `contratos_sc` (Fase 12, fundada 2026-07-19 — tabla aún por crear): contratos
  inteligentes de la fábrica de SC (Hyperledger Fabric) — spec confirmada, hash del
  paquete, lineage `origen`, aprobador y despliegue. Departamento:
  `businessos/departamentos/contratos-inteligentes.md`; operación del contrato
  (PM/oráculo) en la Fase 13.
- Grafo (Fase 2-3, construido): PostgreSQL propio con el modelo
  proyecto → jurisdicción → dimensión → regla → impacto; MX + fiscal, 11 reglas
  citadas (LISR/CFF/SAT). Veredictos de facturas: `deducibilidad_estado` +
  `deducibilidad_detalle` los escribe el host-job `evaluar-facturas.py`.

---

## 5. KPI de Éxito

**Por fase (la métrica medible que cierra cada una):**
- **Fase 0:** Las 3 verticales vivas, respondiendo por Telegram cada una con su
  persona, y respaldo nocturno funcionando.
- **Fase 1:** Gasto mensual de tokens visible y controlado (~$25-30 en uso
  personal), bajo el presupuesto de 120 USD/mes, con alerta automática al 80%.
- **Fase 2:** Una evaluación regulatoria real (1 país + 1 dimensión) que produce
  banderas rojas, checklist y fuentes citadas.
- **Fase 3:** Cobertura multi-país del grafo + cobro real (Polar) + contratos
  validados por el grafo antes de cerrar.
- **Fase 4:** Panel único (A2ABot) con las 3 verticales, AI Spend y evaluaciones.
- **Fase 5:** Un agente externo (cliente A2A) descubre el grafo por su Agent Card y
  completa una evaluación con fuente citada sin conocer su interior.

**Métrica ancla del producto:** cero facturas/pendientes de cliente sin procesar
y cero afirmación fiscal/contractual sin fuente citada.

---

## 6. Especificación Técnica (arquitectura agente-first)

### Componentes (servicios en `hermes-net`, no `src/features/`)
```
businessos/
├── personal/   .hermes/{SOUL,AGENTS,MEMORY}.md   # vida personal + Obsidian
├── negocio/    .hermes/{SOUL,AGENTS,MEMORY}.md   # KPIs + presupuesto de tokens
├── clientes/   .hermes/{SOUL,AGENTS,MEMORY}.md   # facturas + propuestas
├── dashboard   (A2ABot Mission Control)          # Fase 4
├── grafo       (servicio + PostgreSQL)           # Fase 2+, cerebro regulatorio
└── grafo-a2a   (agente A2A delante del grafo)    # Fase 5, puerta para pares
```

### Stack confirmado (de ROADMAP.md)
- **Servidor:** Hetzner Cloud cx33 (4 vCPU / 8 GB; corre las 3 verticales + grafo holgado)
- **Orquestación:** Docker + docker-compose (un contenedor por vertical)
- **Agente:** Hermes Agent (Nous Research) `:v2026.6.19` — memory, skills, soul, crons
- **Canales:** Telegram (3 bots) + voz (TTS salida / transcripción entrada)
- **Conocimiento personal:** Obsidian (bóveda como volumen)
- **Cerebro regulatorio:** grafo multi-país (de lisagomez/grafo, rediseñado)
- **Datos / dashboard:** Supabase (service_role, RLS) + A2ABot
- **Pagos:** Polar (MoR, Fase 3); Circle/USDC agéntico (Fase 5, futuro)
- **Contratos:** capa documento (validada por grafo) + capa blockchain opcional (Lean 4)
- **Conexión de herramientas:** MCP; **CLIs agente-nativos:** Printing Press
- **Conexión entre agentes:** protocolo A2A (`grafo-a2a` vivo desde Fase 5; SDK `a2a-sdk` 1.1.0)

### Decisiones de infra ya tomadas (Fase 0)
- Acceso al dashboard: en Docker (Hetzner) por túnel SSH; y desde 2026-07-24 (PR #143)
  exponible en Vercel para el equipo, con auth obligatoria (magic link + allowlist
  fail-closed `PANEL_ALLOWED_EMAILS`). El `service_role` no protege por sí solo → la
  allowlist es el candado. Runbook: `businessos/DEPLOY-mission-control.md`.
- Rutas de volumen con `${HOME}` (Compose no expande `~`).
- SSH endurecido (lockdown root/password tras verificar llave), swap 2 GB,
  fail2ban, unattended-upgrades. Ojo: Docker se salta UFW.
- Supabase vía `SUPABASE_SERVICE_ROLE_KEY` (bypassa RLS; llave de servidor).
- Respaldo: un repo privado por vertical, crons escalonados (2:00/2:10/2:20).

### Próximos Pasos (roadmap)
1. [x] **Fase 0** — Infra: servidor Hetzner + Docker + 3 verticales vivas (COMPLETA;
   migradas a Hetzner cx33 `167.233.233.56` el 2026-07, respaldo nocturno a GitHub)
2. [x] **Fase 1** — Eficiencia de tokens: routing, `token_usage`, reporte + facturas (núcleo
   completo 2026-07-01; residuales —alerta 80% por cron, validación en vivo de modelos— diferidos)
3. [x] **Fase 2** — Grafo acotado: MX + fiscal, evaluación end-to-end con fuente citada (núcleo
   completo 2026-07-02; residuales —up en el servidor, dry-run contra Supabase, CLI impreso— diferidos)
4. [x] **Fase 3** — Expansión grafo (fiscal MX/CO + contable + contractual, cron de vigencias)
   + cobro Polar (payouts MX verificados) + contratos validados por grafo (núcleo completo
   2026-07-02; residuales —cuenta Polar, SQL/jobs en el servidor— diferidos)
5. [x] **Fase 4** — Dashboard Mission Control (A2ABot): 3 vistas solo lectura (núcleo completo
   2026-07-02; residuales —compose up + cron snapshot en runtime, screenshots— diferidos)
6. [~] **Fase 5** — Interoperabilidad A2A: grafo expuesto como agente A2A (`grafo-a2a`, núcleo
   completo 2026-07-03; residual: up en el servidor). La economía agéntica (Circle, Lean 4) sigue
   FUTURA: mismo horizonte, otro PRP
7. [~] **Fase 6** — Departamentos operados por el trío Hermes→Ejecutor→Supervisor (núcleo
   completo 2026-07-03, PRP-006): `ejecutor-a2a` (worktree aislado + motor pluggable
   Mock/Claude Agent SDK) + `supervisor-a2a` (gates deterministas de `reglas/software.toml`,
   gate no corrible = rechazo) + skill `trio-software` (Hermes reparte, reintenta con tope,
   gate humano en lo irreversible) + tabla `tareas`; interop e2e con reintento demostrado en
   dev con cero tokens. Runtime cerrado 2026-07-08 y dogfood con motor real APROBADO
   2026-07-11 (GLM-5.2 vía seam z.ai, 8 gates verdes). Residual: gates de modelo con runner.
   Resiliencia (2026-07-25): un fallo TRANSITORIO del proveedor (429 rate-limit/5xx/conexión
   caída) se reintenta con backoff/pausa sin consumir un intento —clasificado con la señal
   estructural del SDK, no con el transcript—, en vez de escalarse como si la tarea hubiera
   fallado; lo definitivo (max_turns, error de código) sigue escalando. White-label y RAG por
   ámbito: FUTURO, otro PRP.
   Primer departamento: Desarrollo de Software (ver `businessos/departamentos/`).
8. [x] **Fase 7** — Enjambre (swarm) de Ejecutores (núcleo completo 2026-07-04, PRP-007,
   PR #13): `coordinador-a2a` (servicio A2A hermano) descompone una feature grande en un DAG
   de sub-tareas, las reparte en paralelo al Ejecutor con tope de fan-out + presupuesto
   (`token_usage.task_id`), integra lo aprobado en `tarea/<parent_id>` y pide una verificación
   final del Supervisor sobre la rama integrada — o escala; Planner pluggable (Mock/real
   opt-in), un escritor por fila padre/hija. Validado en dev con cero tokens (112 tests
   verdes); `supabase-fase7.sql` aplicado en producción (2026-07-04); runtime cerrado
   2026-07-08. COMPLETA 2026-07-11: dogfood real APROBADO — Planner real GLM-5.2 planificó
   3 sub-tareas, enjambre paralelo aprobado al primer intento, integración limpia y 8 gates
   verdes en el todo; ledger por-tarea real y corte de presupuesto operando con datos
   medidos (ver CLAUDE.md 2026-07-11 enjambre).
9. [x] **Fase 9** — Departamento de Adquisición de Clientes agéntico (núcleo en dev
   2026-07-10): segundo departamento del trío (`departamento: "adquisicion"` en el contrato;
   Supervisor multi-departamento ruteando `reglas/*.toml`); gates comerciales binarios con la
   referencia de verdad versionada e intocable (`adquisicion/`: claims aprobados, política de
   precios, plantilla de contrato white-label); `ventas-a2a` (:4400) = card comercial pública
   con fronteras negativas (no cierra tratos/no fija precios/no firma/no envía) que registra
   leads (tabla `leads`, escritor único, fallo visible) y comparte la oferta aprobada. Diseño
   completo: `businessos/departamentos/adquisicion-clientes.md`. Runtime CERRADO 2026-07-10
   (`leads` en producción, ventas-a2a healthy en Hetzner, smoke tiers 1-4 verde, :4400 solo
   localhost). Residuales: motor real, email saliente, negociación A2A externa y card en
   internet = gates de la dueña.

---

## 7. Principios que cruzan todo el proyecto
1. **Aislar, no fundir** — cada componente es un servicio en `hermes-net`.
2. **Acotar antes de escalar** — un país-dimensión antes de diez.
3. **Citar fuentes, no inventar** — en lo regulatorio, fuente + vigencia siempre.
4. **Eficiencia por routing, no por recorte** — lo barato a modelos baratos.
5. **Arreglar lo compartido, no el caso aislado** — el arreglo va en el común.
6. **Verificar antes de confiar** — nada que mueva dinero/datos/reglas sin verificación.
