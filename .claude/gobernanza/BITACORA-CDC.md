# Bitácora de Cambios de Comportamiento (CDC)

> Control **C1** de `GOBERNANZA.md`. **Append-only.** Una entrada por cada cambio de
> modelo, skill, subagente, `SOUL.md`/`AGENTS.md`, plantilla, `prp-base.md` o
> configuración del agente.
>
> Regla de oro: los prompts y skills viven en git y se despliegan como código — el CDC
> añade que se **revisan** como código. Nadie los edita en caliente, ni la dueña, sin que
> quede diff, regresión y aprobación.

## Modelo pineado en producción

⚠️ **Estado honesto al 2026-09-04: el pineo está PENDIENTE.** Esta tabla declara lo que
hay, no lo que debería haber. Fijarla es trabajo de la Fase 5 del plan de alineación.

| Uso | Identificador en uso | ¿Pineado? | Desde |
|---|---|---|---|
| Subagente `verificador-qa` | `opus` (alias de familia) | ❌ **alias flotante** | — |
| Subagente `atacante-adversarial` | `opus` (alias de familia) | ❌ **alias flotante** | — |
| Motor del trío (Ejecutor / Planner) | GLM-5.2 vía z.ai, `modelo_pref` por tarea | 🟡 por tarea, sin tabla única | 2026-07-04 |
| Ruteo Hermes — loop | `gemini-2.5-flash-lite` | 🟡 declarado en config del volumen | 2026-06-30 |
| Ruteo Hermes — vertical negocio | `haiku-4.5` | 🟡 declarado en config del volumen | 2026-06-30 |
| Generación de imágenes | OpenRouter (ver skill `image-generation`) | 🟡 con respaldo al Auto Router | 2026-08-31 |

> **El pineo aspiracional es el error clásico**: declararlo aquí y dejar un alias en la
> configuración real. `latest` y los alias de familia son anti-patrón igual que en las
> imágenes Docker — y este repo lo tiene escrito en cuatro sitios, uno diciendo
> literalmente *"fijar digest sha256 tras el primer pull"*. Nunca se fijó.
>
> Cambiar una fila de esta tabla es un **CDC completo**: diff + regresión verde +
> aprobación humana.

## El runtime también cuenta

Un CDC sobre la doctrina de una vertical (`SOUL.md`, `AGENTS.md`, `MEMORY.md`) **no está
cerrado hasta que el volumen lo refleje**: el repo es fuente, no despliegue
(aprendizaje 2026-07-12). La entrada declara ambas mitades: repo ☑ / volumen ☑.

## Formato

```markdown
### <fecha ISO> — <qué cambió> — radio: <sistema | skill | vertical | plantilla | menor>
- **Cambio**:
- **Motivo**:
- **Gate aplicado**: diff revisado ☐ · regresión verde ☐ · aprobación humana ☐ · pineo ☐
- **Regresión**: <resultado, o el riesgo registrado que lo cubre>
- **Runtime**: repo ☐ / volumen ☐ / n/a
- **Aprobado por**:
```

---

## Entradas

### 2026-09-04 — apertura: adopción de la capa de gobernanza (Fases 0–1) — radio: plantilla
- **Cambio**: alta de `.claude/gobernanza/` con los ocho archivos del control:
  `GOBERNANZA.md` (los siete controles C1–C7, cada uno apuntando al documento de
  `businessos/gobernanza/` que ya lo desarrolla), `REGISTRO-RIESGO.md` de proyecto,
  esta bitácora, `INCIDENTES.md` vacío, las tres plantillas reconciliadas con el catálogo
  vivo de Hermes, y `golden-sets/contratos.json` como esqueleto.
  **No se movió ni se copió ninguno de los nueve documentos existentes**: la capa los
  indexa y les da un puntero de vuelta.
- **Motivo**: Hermes no necesita más doctrina — necesita que la suya **dispare**. De sus
  nueve documentos de gobernanza, solo uno tiene mecanismo. El criterio es del propio repo
  (2026-08-02): *"una doctrina sin gate es una costumbre"*.
- **Radio y por qué**: **plantilla**. Esta fase es documental y no cambia el
  comportamiento de ningún agente en ejecución: no toca skills, ni subagentes, ni
  `prp-base.md`, ni configuración de MCP, ni ningún `SOUL.md`/`AGENTS.md` de las
  verticales. El radio sube a **sistema** en la Fase 2, cuando las nueve reglas entren
  inline a `CLAUDE.md`.
- **Gate aplicado**: diff revisado ☑ · regresión verde ☐ *(C2 no existe todavía — cubierto
  por la entrada firmada del 2026-09-04 en `REGISTRO-RIESGO.md`)* · aprobación humana ☐
  *(pendiente: ver abajo)* · pineo ☐ *(pendiente, Fase 5)*
- **Regresión**: `npm run typecheck && npm run lint && npm run build` en verde. El
  verificador (`verify:gobernanza`) y la regresión de skills **no existen todavía**: son
  las Fases 3 y 4, y hasta entonces esta capa **no tiene gate propio**. Decirlo es el
  punto: una capa de gobernanza que se declarara verificada sin verificador sería el
  primer ejemplo del problema que viene a resolver.
- **Runtime**: n/a — nada de esta fase se despliega a un volumen ni a un contenedor.
- **Alcance declarado**: `businessos/` (79 % del repo) queda fuera del gate salvo el
  corpus del buzón, con entrada firmada en `REGISTRO-RIESGO.md` y revisión el 2026-12-04.
- **Pendiente de esta fase, para no darla por cerrada de más**:
  - Las **dos entradas** de `REGISTRO-RIESGO.md` están escritas y **sin firmar**. La firma
    es de una persona; ningún agente puede fabricarla. Completar el campo `Firmado por`
    **no** viola el append-only: el campo existe para llenarse.
  - Falta la **aprobación humana** de este CDC.
- **Aprobado por**: _pendiente de firma_

<!-- Añadir aquí las entradas siguientes. NO editar las anteriores. -->
