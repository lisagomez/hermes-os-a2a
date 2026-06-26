# BUSINESS_LOGIC.md — BusinessOS

> Generado por SaaS Factory (skill new-app, adaptado a infra agente-first) | Fecha: 2026-06-26
> Fuente de verdad de fases y stack: ROADMAP.md. Detalle de cimiento: FASE0.md.

> **Nota de encaje:** BusinessOS NO es un SaaS web Next.js. Es un sistema
> operativo de agentes (Hermes) sobre Docker/Telegram en un Droplet. Este
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
- Grafo (Fase 2+): PostgreSQL propio con el modelo
  proyecto → jurisdicción → dimensión → regla → impacto.

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
└── grafo       (servicio + PostgreSQL)           # Fase 2+, cerebro regulatorio
```

### Stack confirmado (de ROADMAP.md)
- **Servidor:** Droplet DigitalOcean (4 GB realista con 3 verticales; 8 GB con grafo)
- **Orquestación:** Docker + docker-compose (un contenedor por vertical)
- **Agente:** Hermes Agent (Nous Research) `:v2026.6.19` — memory, skills, soul, crons
- **Canales:** Telegram (3 bots) + voz (TTS salida / transcripción entrada)
- **Conocimiento personal:** Obsidian (bóveda como volumen)
- **Cerebro regulatorio:** grafo multi-país (de lisagomez/grafo, rediseñado)
- **Datos / dashboard:** Supabase (service_role, RLS) + A2ABot
- **Pagos:** Polar (MoR, Fase 3); Circle/USDC agéntico (Fase 5, futuro)
- **Contratos:** capa documento (validada por grafo) + capa blockchain opcional (Lean 4)
- **Conexión de herramientas:** MCP; **CLIs agente-nativos:** Printing Press
- **Conexión entre agentes:** protocolo A2A (Fase 5)

### Decisiones de infra ya tomadas (Fase 0)
- Acceso al dashboard SOLO por túnel SSH (sin Caddy/puertos públicos).
- Rutas de volumen con `${HOME}` (Compose no expande `~`).
- SSH endurecido (lockdown root/password tras verificar llave), swap 2 GB,
  fail2ban, unattended-upgrades. Ojo: Docker se salta UFW.
- Supabase vía `SUPABASE_SERVICE_ROLE_KEY` (bypassa RLS; llave de servidor).
- Respaldo: un repo privado por vertical, crons escalonados (2:00/2:10/2:20).

### Próximos Pasos (roadmap)
1. [ ] **Fase 0** — Infra: Droplet + Docker + 3 verticales vivas (EN CURSO)
2. [ ] **Fase 1** — Eficiencia de tokens: routing, `token_usage`, alertas 80%
3. [ ] **Fase 2** — Grafo acotado: 1 país + 1 dimensión, evaluación end-to-end
4. [ ] **Fase 3** — Expansión grafo + cobro (Polar) + contratos-documento
5. [ ] **Fase 4** — Dashboard Mission Control (A2ABot)
6. [ ] **Fase 5 (futura)** — Interoperabilidad A2A + economía agéntica (Circle, Lean 4)

---

## 7. Principios que cruzan todo el proyecto
1. **Aislar, no fundir** — cada componente es un servicio en `hermes-net`.
2. **Acotar antes de escalar** — un país-dimensión antes de diez.
3. **Citar fuentes, no inventar** — en lo regulatorio, fuente + vigencia siempre.
4. **Eficiencia por routing, no por recorte** — lo barato a modelos baratos.
5. **Arreglar lo compartido, no el caso aislado** — el arreglo va en el común.
6. **Verificar antes de confiar** — nada que mueva dinero/datos/reglas sin verificación.
