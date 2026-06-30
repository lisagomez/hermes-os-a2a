# PRP-001: Eficiencia de tokens (Fase 1)

> **Estado**: PENDIENTE
> **Fecha**: 2026-06-30
> **Proyecto**: BusinessOS

---

## Objetivo

Activar el ahorro de tokens del sistema sin sacrificar calidad: enrutar cada
profile interno de las tres verticales Hermes al modelo correcto (ligero→barato,
pesado→capaz, Opus casi nunca), confirmar la disciplina de caché de prefijo,
arrancar la ingesta real a `token_usage` (hoy en 0 filas) y dejar la vigilancia
de presupuesto operable. Salida: gasto mensual controlado (~$25-30 en uso
personal).

## Por Qué

| Problema | Solución |
|----------|----------|
| Las 3 verticales usan un único `model.default` (`nemotron-3-super-120b`) para TODO: tareas triviales (títulos, previews, tags TTS) pagan lo mismo que el razonamiento pesado. | Routing por profile: los ~17 profiles internos heredan `model:''`; se les asigna un modelo por nivel de carga. |
| `token_usage` existe pero tiene **0 filas**: no hay forma de saber cuánto se gasta ni por qué vertical/modelo. | Arrancar la ingesta real (una fila por llamada relevante) para que Supabase sea la fuente de verdad del gasto. |
| Sin datos de gasto no hay alerta posible; la alerta al 80% del presupuesto está definida en `negocio/MEMORY.md` pero no puede dispararse. | Consulta de presupuesto on-demand (funciona ya en WSL2) + plan explícito para la entrega por cron (acoplada al Droplet). |
| El caché de prefijo ya está activo pero un SOUL/MEMORY que cambia seguido lo invalida y se paga prefijo completo cada vez. | Disciplina verificada: SOUL/MEMORY estables; cambios deliberados, no churn. |

**Valor de negocio**: bajar el gasto de un default caro-para-todo a un routing
por nivel, con techo objetivo ~$25-30/mes (presupuesto formal 120 USD/mes en
`negocio/MEMORY.md`). El routing es la palanca de mayor retorno y la única
reversible y verificable por round-trip de inmediato.

## Qué

### Criterios de Éxito
- [ ] Cada vertical tiene cada profile asignado a un nivel de modelo: ligeros
      (`title_generation`, `compression`, `triage_specifier`,
      `user_message_preview`, `tts_audio_tags`) → modelo barato; pesados
      (`discovery`, `guardrail`, `curator`, `monitor`, `kanban_decomposer`) →
      modelo capaz; Opus en ninguno por defecto.
- [ ] El catálogo COMPLETO de profiles (~17) de una vertical queda mapeado a un
      nivel (ninguno queda en `model:''` heredando el default por descuido).
- [ ] Round-trip confirmado tras `hermes config set` + restart en las 3
      verticales: el bot sigue respondiendo con su persona y el config persiste
      en el volumen (verificado leyendo el `config.yaml` del volumen, no de
      memoria).
- [ ] `token_usage` deja de estar en 0: hay filas reales con
      `fecha, vertical, modelo, tokens_in, tokens_out, costo_usd` tras uso normal.
- [ ] El gasto del mes en curso se obtiene con un query a `token_usage` (no
      inventado) y negocio puede reportarlo on-demand desglosado por modelo y
      vertical.
- [ ] Decisión documentada sobre la alerta 80%: qué corre on-demand hoy en WSL2
      y qué queda diferido junto con el Droplet (sin pretender un cron 24/7 que
      no dispara fiable).

### Comportamiento Esperado
Una tarea trivial (generar un título, un preview de mensaje, tags de TTS) llega
al profile ligero correspondiente y se resuelve con el modelo barato. Una tarea
pesada (discovery, guardrail, curación, monitoreo, descomposición de kanban) usa
el modelo capaz. El default deja de ser el comodín universal. Cada llamada
relevante deja su fila en `token_usage`. Cuando la dueña pregunta "cuánto vamos
gastando", negocio consulta Supabase y responde con cifra real desglosada,
citando la fuente, sin volcar credenciales (regla de higiene de salida).

---

## Contexto

### Referencias
- `businessos/ROADMAP.md` — FASE 1 (líneas 55-63) y principio "Eficiencia por
  routing, no por recorte" (línea 240).
- `.claude/memory/reference/hermes-vertical-setup.md` — cómo se cambia el config
  de un contenedor vivo: `docker run --rm -v $VOL:/opt/data <IMG> config set
  <clave> <valor>` sobre el volumen `.hermes` (uid 10000, 0700) + `docker
  restart`; gotchas de verificación (gateway silencioso, no usar `getUpdates`
  con el long-poll vivo, verificar con mensaje real).
- `.claude/memory/project/fase0-estado.md` — las 3 verticales vivas en WSL2 con
  `nvidia/nemotron-3-super-120b-a12b`; Droplet y respaldo nocturno diferidos.
- `businessos/negocio/MEMORY.md` y `negocio/AGENTS.md` — presupuesto 120 USD/mes,
  alerta al 80% (96 USD), responsabilidad de registrar `token_usage`, routing
  declarado a nivel persona (barato/Sonnet/Opus-casi-nunca).
- `businessos/personal/AGENTS.md` y `clientes/AGENTS.md` — routing declarado por
  vertical (personal: "Haiku o el gratuito configurado" / Sonnet solo si hay
  razonamiento real; clientes: clasificar/extraer→barato, propuesta→Sonnet).
- `businessos/supabase-init.sql` — esquema `token_usage` (RLS ON, sin políticas,
  solo `service_role`). Conexión vía `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.
- `.claude/memory/reference/supabase-acceso.md` — MCP en `--read-only`; escrituras
  por management API; nunca imprimir el `sbp_`.

### Arquitectura Propuesta
No es código de app Next.js: es **configuración de contenedores Hermes vivos**.
La unidad de cambio es el `config.yaml` dentro de cada volumen `.hermes`,
modificado con `hermes config set` desde un contenedor efímero montando el
volumen, seguido de `docker restart` y verificación de round-trip.

```
~/businessos/<vertical>/.hermes/config.yaml   (uid 10000, 0700)
  model.default: nvidia/nemotron-3-super-120b-a12b   (se mantiene como red de seguridad)
  profiles:
    title_generation     → modelo BARATO
    compression          → modelo BARATO
    triage_specifier     → modelo BARATO
    user_message_preview → modelo BARATO
    tts_audio_tags       → modelo BARATO
    discovery            → modelo CAPAZ
    guardrail            → modelo CAPAZ
    curator              → modelo CAPAZ
    monitor              → modelo CAPAZ
    kanban_decomposer    → modelo CAPAZ
    (resto del catálogo ~17) → clasificar a un nivel; ninguno en model:'' por descuido
```

Niveles de modelo (IDs exactos a confirmar al entrar a la fase, contra
disponibilidad/precio en OpenRouter):
- **BARATO**: un modelo económico/gratuito de OpenRouter (candidato: Haiku o
  equivalente barato). A confirmar.
- **CAPAZ**: Sonnet (o el `nemotron` actual si resulta competitivo en costo para
  el nivel medio). A confirmar.
- **default**: se conserva `nemotron-3-super-120b` como red de seguridad para
  cualquier profile no mapeado.

### Modelo de Datos
`token_usage` YA existe y NO se modifica. Solo se arranca su ingesta.

```sql
-- ya aplicada (businessos/supabase-init.sql), referencia:
-- token_usage(id, fecha, vertical, modelo, tokens_in, tokens_out, costo_usd, created_at)
-- RLS ON, sin políticas → solo service_role escribe/lee.
```

---

## Blueprint (Assembly Line)

> IMPORTANTE: Solo se definen FASES. Las subtareas se generan al entrar a cada
> fase con `/bucle-agentico` (mapear contexto real → generar subtareas →
> ejecutar). El orden respeta "acotar antes de escalar": routing primero por ser
> reversible y verificable por round-trip.

### Fase 1: Routing por modelo (la palanca principal)
**Objetivo**: Cada profile de las 3 verticales enrutado a su nivel (ligero→barato,
pesado→capaz, Opus en ninguno). Empezar por UNA vertical (sugerido: personal),
verificarla end-to-end, y recién entonces replicar a negocio y clientes
("arreglar lo compartido"). Conservar `model.default` como red de seguridad.
**Validación**:
- Catálogo completo de profiles de una vertical leído del `config.yaml` del
  volumen y mapeado (ninguno olvidado en `model:''`).
- `hermes config set` aplicado + `docker restart` + round-trip: el bot responde
  con su persona y el `config.yaml` del volumen muestra los modelos asignados.
- Replicado a las 3 verticales con el mismo resultado.

### Fase 2: Disciplina de caché de prefijo
**Objetivo**: Confirmar que el caché de prefijo sigue activo tras el routing y
que SOUL/MEMORY de cada vertical están estables (sin churn que invalide el
prefijo en cada turno).
**Validación**:
- Verificado que SOUL/MEMORY no cambian entre turnos normales.
- Documentada la regla de estabilidad (qué se puede tocar y qué no) donde
  corresponda (memoria/AGENTS).

### Fase 3: Ingesta real a `token_usage`
**Objetivo**: Llevar `token_usage` de 0 filas a filas reales: cada llamada
relevante de cada vertical registra `fecha, vertical, modelo, tokens_in,
tokens_out, costo_usd` con el `service_role`. Sin esto no hay visibilidad ni
alerta posible.
**Validación**:
- Tras uso normal de las 3 verticales hay filas en `token_usage` con el `modelo`
  correcto (refleja el routing de Fase 1).
- Las cifras no se inventan: si falta un dato se marca pendiente.

### Fase 4: Visibilidad y alerta de presupuesto
**Objetivo**: Reporte de gasto on-demand (gasto del mes desglosado por modelo y
vertical, vía query a `token_usage`) funcionando hoy en WSL2. Decidir y
documentar el destino de la alerta automática al 80% (96 USD): qué es on-demand
ahora y qué queda diferido junto con el Droplet (un cron no dispara fiable en
WSL2 no-24/7).
**Validación**:
- Negocio responde "cuánto vamos gastando" con cifra real desde Supabase,
  citando la fuente, sin volcar credenciales (higiene de salida).
- Decisión sobre la entrega por cron registrada en `negocio/MEMORY.md` o memoria
  de proyecto (alineada con el diferimiento del Droplet/respaldo nocturno).

### Fase N: Validación Final
**Objetivo**: Eficiencia de tokens activa end-to-end en las 3 verticales.
**Validación**:
- [ ] Round-trip OK en las 3 verticales tras todos los cambios de config.
- [ ] `config.yaml` de cada volumen muestra el routing por profile (verificado en
      el volumen, no en memoria).
- [ ] `token_usage` con filas reales y reporte de gasto on-demand correcto.
- [ ] Todos los Criterios de Éxito cumplidos.
- [ ] Docs vivas actualizadas (ROADMAP FASE 1, memoria, esta sección de
      Aprendizajes) — regla de auto-blindaje de CLAUDE.md.

---

## 🧠 Aprendizajes (Self-Annealing)

> Crece con cada error durante la implementación. El mismo error NUNCA ocurre dos veces.

*(vacío — se llena al ejecutar con `/bucle-agentico`)*

---

## Gotchas

- [ ] **Cambios sobre contenedores vivos**: el config se cambia en el VOLUMEN
      (`hermes config set` montando `.hermes`) + `docker restart`. El volumen es
      uid 10000, modo 0700: un `ls` del host da "Permission denied", no concluir
      "vacío"; inspeccionar con un contenedor alpine.
- [ ] **Verificar round-trip antes de confiar**: el gateway es silencioso tras el
      banner y tarda en reanudar el polling; verificar con un mensaje real al bot,
      no por el log. Confirmar también el `config.yaml` del volumen.
- [ ] **No usar `getUpdates` con el gateway corriendo** (choca con el long-poll;
      Telegram permite un solo consumidor). Usar `getMe` para verificar tokens.
- [ ] **El setup no interactivo deja `model.default` en Opus caro**: confirmar que
      cada vertical tenga el default correcto antes de tocar profiles.
- [ ] **IDs de modelo a confirmar contra OpenRouter** (disponibilidad/precio del
      barato y del capaz) antes de aplicar; un ID inexistente rompe las llamadas.
- [ ] **Ingesta vs ruido**: registrar "cada llamada relevante", no cada micro-llamada,
      para que `token_usage` sea útil y no se infle.
- [ ] **Higiene de salida**: nunca imprimir `OPENROUTER_API_KEY`,
      `SUPABASE_SERVICE_ROLE_KEY` ni el `sbp_`; referenciar por nombre de variable.
- [ ] **MCP Supabase en `--read-only`**: para escribir/verificar por API usar la
      management API por curl (UA tipo `curl/8.0` para esquivar el 403 de Cloudflare).
- [ ] **No dos gateways sobre el mismo volumen** (corrompe estado): un restart, no
      un segundo contenedor sobre el mismo `.hermes`.

## Anti-Patrones

- NO recortar calidad donde importa: el routing es por nivel, no por bajar todo
  a barato ("eficiencia por routing, no por recorte").
- NO dejar profiles en `model:''` por descuido (heredarían el default y se pierde
  el ahorro silenciosamente).
- NO inventar cifras de gasto: siempre query a `token_usage`; si falta, pendiente.
- NO montar un cron de alerta que dependa de 24/7 en WSL2 (no dispara fiable);
  esa pieza va con el Droplet.
- NO tocar el esquema de `token_usage` (ya aplicado y verificado).
- NO escalar a las 3 verticales sin haber verificado round-trip en una primera.

---

*PRP pendiente aprobación. No se ha modificado código ni configuración.*
