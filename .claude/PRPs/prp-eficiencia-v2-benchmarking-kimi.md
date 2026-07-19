# PRP-002: Eficiencia de tokens v2 — telemetría completa, benchmarking arena.ai y probe Kimi

> **Estado**: PENDIENTE
> **Fecha**: 2026-07-19
> **Proyecto**: Hermes OS · A2A
> **Antecesor**: PRP-001 (`prp-eficiencia-de-tokens.md`, COMPLETO 2026-07-08) y `fase1-eficiencia.md`

---

## Objetivo

Cerrar los huecos del analizador de tokens de Fase 1 (subcuenteo de llamadas
auxiliares, fragilidad del parser, sin métrica de caché), montar una señal
automatizada de benchmarking desde arena.ai (mirror JSON, gate humano intacto)
y correr el gate de adopción de Kimi (`probe-kimi.py` sobre `kimi-k2.7-code`
como competidor de GLM-5.2 para la capa pesada del trío) + piloto de Kimi Code
como implementador con Claude Opus como revisor de PRs. Todo dentro del
presupuesto de $30/mes y bajo la regla "copiloto, no autopiloto".

## Por Qué

| Problema | Solución |
|----------|----------|
| `ingest-token-usage.py` solo parsea el loop principal; los ~13 profiles auxiliares no emiten tokens al agent.log → `token_usage` **subcuenta** y no sabemos cuánto. | Reconciliación mensual contra el gasto real de OpenRouter (endpoint de activity/créditos con la key) y columna de "% no observado" en el snapshot. Si la brecha es <10% es cosmética; si es ≥30%, instrumentar las aux. |
| Un drop del caché de prefijo (97% → 60% por churn de SOUL/MEMORY) hoy solo se detectaría en la factura — exactamente el incidente nemotron. | El snapshot agrega `pct_cache` y `costo_promedio_por_turno` por modelo; la alerta de las 08:00 avisa si `pct_cache` cae bajo umbral. |
| El parser depende del formato exacto `API call #`; un upgrade de Hermes lo rompe EN SILENCIO (imprime "No hay líneas" y sale 0 → el cron no avisa). | Exit code ≠0 cuando hay output de log pero cero matches; buffer del agent.log en el host antes de parsear (mitiga rotación); caché local del catálogo de precios de OpenRouter con fallback al último bueno. |
| Elegir modelos "a ojo" o por hype: no hay señal externa sistemática de qué candidato vale un probe. | Cron semanal que baja el mirror JSON de arena.ai (Code Arena) y deja nota SOLO si un candidato supera al activo por >25 Elo (menos es ruido) siendo ≥2× más barato en OpenRouter. La decisión sigue siendo de Elisa. |
| La capa pesada (`curator`, `kanban_decomposer`, Ejecutor del trío) corre Sonnet ($3/$15); el seam GLM-5.2 ($0.9/$2.9) espera su probe; y salió Kimi K3/K2.7 Code (2026-07-16) sin evaluar. | `probe-kimi.py` (clon de `probe-glm.py`): mismos 3 checks (español, tool-calling, caché de prefijo). Candidato racional: **`kimi-k2.7-code` ($0.95/$4)**, NO K3 ($3/$15 con razonamiento always-max que se come el tope de tokens de la cola). |
| El desarrollo colaborativo hoy es Claude Code solo; no hay segundo par de manos barato para implementación mecánica. | Piloto Kimi Code (CLI open-source, soporta subagentes/plan mode) como implementador en rama + Claude Opus como revisor de PR, bajo el flujo de master protegido existente (todo por PR, 1 review). |

**Valor de negocio**: visibilidad real del gasto (hoy parcial), detección
temprana de regresiones de caché (la variable que decide el costo en esta
arquitectura), y una vía verificable para bajar la capa pesada de $3/$15 a
~$0.95/$4 (~3.5×) sin sacrificar calidad — con evidencia (arena + probe), no fe.
La suscripción de Claude para desarrollo se registra como línea de presupuesto
separada de los $30 de inferencia (hoy no aparece en `negocio/MEMORY.md`).

## Qué

### Criterios de Éxito
- [ ] El snapshot `presupuesto.json` incluye: `pct_cache` por modelo,
      `costo_promedio_por_turno`, y `pct_no_observado` (brecha vs gasto real
      OpenRouter del mes). La nota "solo loop principal" se sustituye por la
      cifra medida de la brecha.
- [ ] `ingest-token-usage.py` falla RUIDOSAMENTE (exit ≠0) si el log tiene
      contenido pero cero matches; el catálogo de precios se cachea en
      `~/state/` con fallback; el agent.log se copia a buffer del host antes
      de parsear.
- [ ] Cron semanal `arena-watch` corriendo en Hetzner: baja el mirror JSON del
      Code Arena, compara contra los modelos activos por capa y deja nota en el
      workspace SOLO si se cumple el doble umbral (>25 Elo Y ≥2× más barato).
      Cero notas espurias en 2 semanas de operación.
- [ ] `probe-kimi.py` corrido contra `moonshotai/kimi-k2.7-code` (y opcional
      `moonshotai/kimi-k3` como dato): veredicto documentado en los 3 checks
      (español, tool-calling, caché de prefijo — verificando si OpenRouter
      aplica el cache-hit de Moonshot o solo el API directo).
- [ ] Si el probe pasa: decisión de la dueña registrada (adoptar K2.7 Code vs
      GLM-5.2 vs mantener Sonnet en la capa pesada), con receta de `config set`
      + rollback en [[hermes-vertical-setup]]. Si no pasa: gotcha documentado.
- [ ] Piloto colaborativo: 1 sub-tarea real implementada por Kimi Code en rama
      → PR revisado por Claude Opus → aprobación de Elisa → merge por el flujo
      estándar de bypass. Costo del piloto medido y reportado.
- [ ] Línea "suscripción Claude (desarrollo)" registrada en `negocio/MEMORY.md`
      separada del presupuesto de inferencia de $30.

### Comportamiento Esperado
La dueña pregunta "¿cuánto vamos gastando?" y negocio responde con el total,
el desglose por vertical Y el % del gasto que la telemetría no observa
directamente (reconciliado contra OpenRouter), citando la fuente. Si el caché
del loop principal cae bajo el umbral, el push de las 08:00 lo dice antes de
que duela. Una vez por semana, si (y solo si) aparece un modelo que domina al
activo en Elo Y precio, aparece una nota en el workspace; Elisa decide si se
corre el probe. El probe de Kimi produce un veredicto binario por check, sin
adivinar. En desarrollo, Kimi Code implementa lo mecánico en rama y Claude
Opus revisa el PR; nada llega a master sin la revisión y la aprobación humana.

---

## Contexto

### Referencias
- `.claude/PRPs/prp-eficiencia-de-tokens.md` — PRP-001, base de todo esto.
- `.claude/memory/project/fase1-eficiencia.md` — estado real: routing aplicado,
  ingesta viva, snapshot dato-en-SOUL, alerta 80% instalada, seam GLM-5.2 listo
  (probe pendiente), limitación "solo loop principal" documentada.
- `businessos/ingest-token-usage.py` — parser `API call #`, delete+insert
  idempotente (índice único PARCIAL desde 2026-07-11, ver
  `supabase-fix-token-ledger.sql`; JAMÁS tocar filas con `task_id`).
- `businessos/probe-glm.py` — patrón del gate previo (idioma + tool-calling +
  caché); `probe-kimi.py` es su clon con otro model ID.
- `businessos/alerta-presupuesto.sh` — cron 08:00, dedupe mensual en ~/state;
  se extiende con el aviso de caché.
- `.claude/memory/reference/hermes-vertical-setup.md` — receta `config set` en
  vivo + rollback; telemetría de tokens en agent.log.
- `.claude/memory/reference/master-branch-protection.md` — flujo de merge con
  ventana de bypass; el piloto Kimi↔Opus opera DENTRO de este flujo.
- `.claude/memory/reference/supabase-acceso.md` — escrituras por service_role
  desde jobs de host; el agente nunca toca credenciales.
- Mirror arena.ai: `github.com/oolong-tea-2026/arena-ai-leaderboards`
  (snapshots diarios JSON; `data/latest.json`, `code.json`). Arena.ai no tiene
  API pública; el mirror es la vía automatizable.
- OpenRouter: `moonshotai/kimi-k2.7-code` ($0.95/$4), `moonshotai/kimi-k3`
  ($3/$15, razonamiento solo "max", 1M contexto, un solo proveedor INT4 de
  Moonshot al 2026-07-19), `z-ai/glm-5.2` ($0.9/$2.9). Precios a re-confirmar
  al entrar a la fase.

### Arquitectura Propuesta
No es app Next.js: son host-jobs + config de contenedores, el patrón ya
establecido.

```
businessos/
├── ingest-token-usage.py        (v2: buffer, exit ruidoso, caché de precios,
│                                 pct_cache, reconciliación OpenRouter)
├── arena-watch.py               (NUEVO: cron semanal, mirror JSON → nota gated)
├── probe-kimi.py                (NUEVO: clon de probe-glm.py, model ID kimi)
└── alerta-presupuesto.sh        (v2: + umbral de pct_cache)

~/state/
├── openrouter-models.json       (caché del catálogo de precios, con fecha)
└── arena-watch-last.json        (dedupe de notas del watcher)
```

### Modelo de Datos
`token_usage` NO se toca (regla del PRP-001, reforzada por el fix del ledger).
Los campos nuevos viven en el snapshot JSON (`presupuesto.json`), no en SQL.

---

## Blueprint (Assembly Line)

> IMPORTANTE: Solo FASES. Subtareas se generan al entrar a cada fase con
> `/bucle-agentico`. Orden: primero endurecer la telemetría (sin datos fiables,
> el resto no se puede evaluar), luego la señal externa, luego el probe, y el
> piloto colaborativo al final porque depende del veredicto del probe solo
> parcialmente (puede correr en paralelo si la dueña lo decide).

### Fase 1: Analizador v2 (telemetría fiable)
**Objetivo**: `ingest-token-usage.py` robusto (buffer de log, exit ruidoso,
caché de precios) y snapshot con `pct_cache`, `costo_promedio_por_turno` y
`pct_no_observado` (reconciliación mensual vs OpenRouter). Alerta 08:00
extendida con umbral de caché.
**Validación**:
- Corrida real en Hetzner con las 3 verticales: snapshot con los campos nuevos
  y cifras coherentes (pct_cache del loop ≈ lo observado en agent.log).
- Simulación de rotura: log con contenido + regex que no matchea → exit ≠0 y
  el cron avisa.
- Brecha `pct_no_observado` medida y anotada en `fase1-eficiencia.md` con la
  decisión que dispara (<10% cosmética / ≥30% instrumentar aux).

### Fase 2: arena-watch (señal externa gated)
**Objetivo**: cron semanal que baja `code.json` del mirror, compara candidatos
contra el modelo activo de cada capa (loop / pesada) con el doble umbral
(>25 Elo Y ≥2× más barato en OpenRouter) y deja nota en el workspace de
negocio. Sin notas = silencio.
**Validación**:
- Corrida manual con el snapshot actual: la nota (o su ausencia) es correcta y
  explicable a mano.
- Dedupe verificado: la misma conclusión no genera dos notas.
- Documentado en memoria que arena mide preferencia humana, no exactitud: la
  nota es entrada al probe, nunca veredicto.

### Fase 3: probe-kimi (gate de adopción)
**Objetivo**: `probe-kimi.py` corrido contra `kimi-k2.7-code` (y K3 como dato
comparativo): español, tool-calling, caché de prefijo — incluyendo verificar
en vivo si OpenRouter aplica el cache-hit ($0.19/M en K2.7) o solo el API
directo de Moonshot. Veredicto binario por check.
**Validación**:
- Los 3 checks con resultado documentado (sin "probablemente").
- Si pasa: matriz K2.7 vs GLM-5.2 vs Sonnet (precio real con caché, latencia,
  Elo Code Arena) presentada a la dueña; su decisión registrada con receta de
  `config set` + rollback. Si falla: gotcha en Aprendizajes.
- Ningún cambio de config sin OK explícito de Elisa.

### Fase 4: Piloto colaborativo Kimi Code ↔ Claude Opus
**Objetivo**: 1 sub-tarea real acotada implementada por Kimi Code en rama,
PR revisado por Claude Opus (checklist: tests, gates del trío si aplica,
estilo del repo), aprobación de Elisa, merge por el flujo de bypass estándar.
Costo del piloto medido.
**Validación**:
- PR mergeado por el flujo estándar; cero pushes directos.
- Un solo agente por worktree (gotcha node_modules compartido respetado).
- Costo real del piloto (tokens Kimi + revisión Opus) anotado; decisión de
  continuar/parar registrada.
- Línea "suscripción Claude (desarrollo)" (y Kimi si se adopta) en
  `negocio/MEMORY.md`.

### Fase N: Validación Final
**Objetivo**: Eficiencia v2 end-to-end.
**Validación**:
- [ ] Snapshot v2 vivo en producción y reporte on-demand correcto (round-trip
      con negocio).
- [ ] arena-watch corriendo 2 semanas sin notas espurias.
- [ ] Veredicto del probe + decisión de la dueña documentados.
- [ ] Piloto colaborativo cerrado con costo medido.
- [ ] Todos los Criterios de Éxito cumplidos.
- [ ] Docs vivas actualizadas (ROADMAP, `fase1-eficiencia.md` o memoria nueva,
      esta sección de Aprendizajes) — regla de auto-blindaje de CLAUDE.md.

---

## 🧠 Aprendizajes (Self-Annealing)

> Crece con cada error durante la implementación. El mismo error NUNCA ocurre dos veces.

*(vacío — se llena al ejecutar con `/bucle-agentico`)*

---

## Gotchas

- [ ] **K3 razona SIEMPRE a "max"**: la traza de razonamiento se factura a
      $15/M de salida y puede comerse el tope de tokens de la cola (fase 10)
      dejando respuestas vacías si `max_tokens` no cubre traza + respuesta.
      Por eso el candidato del trío es K2.7 Code, no K3.
- [ ] **Cache-hit de Moonshot ($0.30/M en K3, $0.19/M en K2.7) es del API
      DIRECTO**: OpenRouter no lo igualaba al 2026-07-19. El probe debe
      medirlo en vivo (`cached_tokens` en la respuesta), no asumirlo — cambia
      el veredicto económico completo.
- [ ] **K3 en OpenRouter = un solo proveedor (endpoint INT4 de Moonshot)**:
      el mismo modo de falla del cuelgue nemotron. Cualquier adopción va con
      la cadena de fallback Nivel 2 ya establecida.
- [ ] **Slug correcto `moonshotai/...`** (no `moonshot/...`): el 404 solo dice
      "model not found". Pesos abiertos prometidos ~2026-07-27; hasta entonces
      "open" es roadmap.
- [ ] **El mirror de arena.ai es de terceros**: puede romperse o quedarse
      stale. `arena-watch` valida `fetched_at` del snapshot y avisa si tiene
      >10 días; nunca tumba el cron nocturno (job independiente).
- [ ] **Arena mide preferencia, no exactitud**: premia prosa segura y formato.
      >25 Elo es el mínimo para salir del ruido; la nota es entrada al probe.
- [ ] **No tocar las filas por-tarea del trío** (`task_id` set): el índice
      único es parcial; la ingesta v2 mantiene el delete filtrado
      `task_id=is.null` + verticales propias, igual que hoy.
- [ ] **El endpoint de precios/activity de OpenRouter puede fallar a las
      03:10**: por eso el caché en `~/state/` con fallback al último bueno y
      fecha visible en el snapshot.
- [ ] **Higiene de salida**: nunca imprimir `OPENROUTER_API_KEY`,
      `SUPABASE_SERVICE_ROLE_KEY` ni `sbp_`; el agente lee snapshots, jamás
      credenciales (patrón dato-en-SOUL / job de confianza).
- [ ] **Un agente por worktree**: Kimi Code y Claude Code no comparten
      worktree ni `node_modules` (gotcha documentado del enjambre).
- [ ] **Verificar round-trip antes de confiar** tras cualquier `config set`:
      mensaje real al bot + leer el `config.yaml` del volumen, no el log.

## Anti-Patrones

- NO cambiar el cerebro de ninguna capa por precio sin probe + OK humano
  ("copiloto, no autopiloto"; el auto-tuner sigue siendo futuro).
- NO adoptar K3 para el loop ni para profiles por-mensaje: gemini-flash-lite
  gana en caché + latencia + costo sin discusión.
- NO tratar el Elo de arena como veredicto: es shortlist, el gate es el probe
  local (idioma + tools + caché, que arena no mide).
- NO tocar el esquema de `token_usage` ni las filas del ledger por-tarea.
- NO dejar que el watcher genere notas semanales por inercia: doble umbral o
  silencio.
- NO permitir que Kimi Code haga push a master ni merge: implementa en rama;
  el flujo de bypass lo opera el revisor bajo la autorización estándar.
- NO inventar cifras de brecha o de costo del piloto: si falta el dato, se
  marca pendiente.

---

*PRP pendiente aprobación. No se ha modificado código ni configuración.*
