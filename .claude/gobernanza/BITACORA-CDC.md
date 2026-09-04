# Bitácora de Cambios de Comportamiento (CDC)

> Control **C1** de `GOBERNANZA.md`. **Append-only.** Una entrada por cada cambio de
> modelo, skill, subagente, `SOUL.md`/`AGENTS.md`, plantilla, `prp-base.md` o
> configuración del agente.
>
> Regla de oro: los prompts y skills viven en git y se despliegan como código — el CDC
> añade que se **revisan** como código. Nadie los edita en caliente, ni la dueña, sin que
> quede diff, regresión y aprobación.

## Modelo pineado en producción — FUENTE ÚNICA

Esta tabla es **el único sitio** donde se declara qué modelo corre cada pieza. No se
adopta un esquema de routing aparte: Hermes ya tiene ruteo propio, con una capa de
exclusión *fail-closed* que impide arrancar el servicio si el mapa nombra un modelo
prohibido (`coordinador-a2a`, `PLANNER_RUTEO_MODELOS`). Sustituir un mecanismo vivo por
uno de papel sería un retroceso; lo que faltaba era la **fuente única**, no otro esquema.

| Uso | Identificador | ¿Pineado? | Desde |
|---|---|---|---|
| Subagente `verificador-qa` | `claude-opus-5` | ✅ | 2026-09-04 |
| Subagente `atacante-adversarial` | `claude-opus-5` | ✅ | 2026-09-04 |
| Motor del trío (Ejecutor / Planner) | GLM-5.2 vía z.ai, `modelo_pref` por tarea | 🟡 por tarea; la exclusión fail-closed es el gate | 2026-07-04 |
| Ruteo Hermes — loop | `gemini-2.5-flash-lite` | 🟡 config del volumen (no vive en este repo) | 2026-06-30 |
| Ruteo Hermes — vertical negocio | `haiku-4.5` | 🟡 config del volumen (no vive en este repo) | 2026-06-30 |
| Generación de imágenes | OpenRouter, ver skill `image-generation` | 🟡 con respaldo al Auto Router | 2026-08-31 |

**Servidores MCP** (C1 los declara material de CDC; el espejo revisable es
`.claude/example.mcp.json`):

| Servidor | Versión pineada | Desde |
|---|---|---|
| `@playwright/mcp` | `0.0.80` | 2026-09-04 |
| `chrome-devtools-mcp` | `1.8.0` | 2026-09-04 |
| `next-devtools-mcp` | `0.4.0` | 2026-09-04 |
| `@supabase/mcp-server-supabase` | `0.11.0` | 2026-09-04 |
| `firebase-tools` | `15.29.0` | 2026-09-04 |
| `ghcr.io/czlonkowski/n8n-mcp` | `2.4.2` | 2026-09-04 |
| ~~`@anthropic-ai/google-workspace-mcp`~~ | **RETIRADO** — npm 404, el paquete no existe | 2026-09-04 |

> Los alias de familia (`opus`, `sonnet`) y las etiquetas móviles son anti-patrón igual que
> en las imágenes Docker: cambian el comportamiento del sistema sin diff, sin regresión y
> sin aprobación. Cambiar una fila de estas tablas es un **CDC completo**.
>
> 🟡 = declarado aquí pero **la configuración vive fuera de este repo** (volúmenes de las
> verticales, `modelo_pref` por tarea). Se declara en vez de fingir que está pineado: el
> pineo aspiracional —declararlo aquí y dejar un alias en la configuración real— es el
> error clásico, y es el que acaba de corregirse en los dos subagentes.

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

### 2026-09-04 — las reglas de gobernanza pasan a Reglas de Código — radio: sistema
- **Cambio**: diez reglas inline en *Reglas de Código* de `CLAUDE.md` (CDC y la
  configuración; pineo y rechazo de alias flotantes; el tag de la imagen de agente; C5 y su
  límite de riesgos infirmables; valores de variables de entorno; respaldo con RPO/RTO
  medidos; canales de chat como entrada NO autenticada; `service_role`; idioma). Dos ramas
  nuevas en el decision tree. `README.md`, `.claude/README.md` y `BUSINESS_LOGIC.md`
  declaran la capa; `BUSINESS_LOGIC.md` gana su sección 8 (C4 y C7).
- **Motivo**: las nueve reglas del bloque de cableado fallaban las dieciocho veces. Vivían
  solo en `GOBERNANZA.md` y por eso no obligaban — el documento explica, las reglas obligan.
- **Decisión sobre `GEMINI.md`**: queda **FUERA** del alcance del verificador en cuanto a
  reglas inline. Es una copia manual que ya divergió del proyecto (se presenta como "SaaS
  Factory V4") y Hermes no tiene generador que la sincronice: no hay `AGENTS.md` raíz del
  que derivarla. Duplicar allí las diez reglas crearía una segunda fuente que se pudre — el
  propio archivo es la prueba. Recibe cabecera que declara su divergencia y **apunta** a
  `CLAUDE.md` y a la capa; el verificador exige ese puntero, sin el cual una sesión con
  Gemini se saltaría la gobernanza entera.
- **Gate aplicado**: diff revisado ☑ · regresión verde ☑ · aprobación humana ☐ · pineo ☑
- **Regresión**: C2 capa A 199/199. Verificador: las nueve anclas en verde.
- **Runtime**: n/a — `CLAUDE.md` no se despliega a ningún volumen.
- **Aprobado por**: _pendiente de firma_

### 2026-09-04 — C2 capa A y reparación de siete contratos — radio: skill
- **Cambio**: `scripts/regresion-skills.mjs` + `contratos.json` con 31 skills contratados
  (61 contratos) sobre los 35. Reparados: `playwright-cli` (sintaxis del CLI), `prp` (C1,
  C3, C4), `new-app` (C4, C7) y `update-sf` (declara el CDC).
- **Motivo**: nadie verificaba a los skills. Un cambio de modelo o la edición de un skill
  podía degradar en silencio lo que la fábrica produce.
- **Contratos ajustados en vez de reparados**: **ninguno.** Los siete se repararon.
- **Hallazgo**: `playwright-cli` no tenía "sintaxis antigua" — tenía sintaxis **inventada**.
  `navigate/click/fill/snapshot` son verbos del MCP y nunca existieron en el CLI, y
  `screenshot` toma `<url> <filename>` posicionales. Verificado contra el binario instalado
  (1.61.1). El reemplazo que propone el template (`playwright cli -s=`) **tampoco existe**
  en esta versión: portar su contrato positivo habría encodeado otra sintaxis falsa. La
  misma forma inventada estaba en `CLAUDE.md` y en `GEMINI.md`.
- **Hallazgo no previsto**: `update-sf` no mencionaba el CDC, y actualizar el template es
  un CDC de radio sistema por definición.
- **Gate aplicado**: diff revisado ☑ · regresión verde ☑ · aprobación humana ☐ · pineo ☑
- **Regresión**: C2 capa A **199/199**. Controles negativos corridos: borrar `RLS` del skill
  `supabase` → rojo nombrando el contrato; reintroducir la sintaxis inventada → los dos
  contratos prohibidos en rojo. Restaurados → verde.
- **Runtime**: n/a
- **Aprobado por**: _pendiente de firma_

### 2026-09-04 — el verificador entra a la ruta de deploy — radio: plantilla
- **Cambio**: `scripts/verifica-gobernanza.mjs` (recortado a lo que este repo tiene),
  `verify:gobernanza` y `regresion` en `package.json`, encadenados en `validate`, y job
  `gobernanza` en `.github/workflows/ci.yml`.
- **Motivo**: Hermes despliega por Vercel y por Docker, no con `npm run deploy`. **Su ruta
  de deploy es el CI**: un gate que no corre ahí no es un gate.
- **Bloques descartados y por qué**: los 25 que vigilan subsistemas que este repo no tiene
  (imprenta de CLIs, routing por nivel, contabilidad de tokens, presupuesto de contexto,
  empaquetador, specs EARS, deploy dimensionado, ancla de imagen del agente, portabilidad
  de arneses). Portarlos dejaría el gate rojo el primer día, y un gate que nace rojo se
  desactiva — el mismo modo de fallo que uno que siempre pasa.
- **Bloque añadido (2b)**: cada control apunta al documento vivo de `businessos/gobernanza/`
  que lo desarrolla. Es la tesis de la capa —indexar, no duplicar— convertida en aserción.
- **Divergencia deliberada sobre las firmas**: el verificador de origen tumba el gate ante
  cualquier entrada sin firmar. Aquí **se listan ruidosamente** y no lo tumban; lo que sí lo
  tumba es una entrada **malformada** (sin campo de firma, o con un marcador no canónico).
  El propósito real del control es que una entrada sin firma no pase desapercibida; tumbarlo
  obligaría a que un agente fabricara la firma —lo que vaciaría C5 de sentido— o a entregar
  la capa en rojo.
- **Gate aplicado**: diff revisado ☑ · regresión verde ☑ · aprobación humana ☐ · pineo ☑
- **Runtime**: n/a
- **Aprobado por**: _pendiente de firma_

### 2026-09-04 — el arnés queda pineado y C1 muerde sobre `.claude/` — radio: sistema
- **Cambio**: (a) los dos subagentes pasan de alias de familia `opus` a `claude-opus-5`;
  (b) los seis servidores MCP del espejo y del `.mcp.json` vivo quedan en versión exacta;
  (c) `scripts/gate-docs-vivos.sh` cambia la **exención de `.claude/*`** por la regla que le
  corresponde: tocar un skill, un subagente, `prp-base.md` o la configuración de MCP
  **exige** entrada en esta bitácora; (d) esta tabla pasa a ser la fuente única de modelos.
- **Motivo**: era el hueco de mayor radio del repo. El código generado pasaba por typecheck,
  build y revisión; el prompt que lo genera —que gobierna todo lo que se produce después— no
  pasaba por nada.
- **Decisión sobre el ruteo**: **NO** se adopta el `routing-modelos.json` del template.
  Hermes ya tiene ruteo propio con exclusión fail-closed que impide arrancar el servicio si
  el mapa nombra un modelo prohibido. Lo que faltaba era la fuente única, no otro esquema.
- **Hallazgo**: `@anthropic-ai/google-workspace-mcp` devuelve **404 en npm**: el paquete no
  existe. Estaba en el espejo con un alias flotante, así que nunca fue instalable y nadie lo
  notó. Retirado, con el motivo declarado en el propio archivo.
- **Gate aplicado**: diff revisado ☑ · regresión verde ☑ · aprobación humana ☐ · pineo ☑
- **Regresión**: control negativo del gate CDC corrido —
  `CHANGED_FILES=".claude/skills/prp/SKILL.md"` sin entrada → **rojo** pidiendo la bitácora;
  con la entrada → **verde**.
- **Runtime**: n/a — los subagentes y los MCP son configuración de esta máquina, no de los
  volúmenes de las verticales.
- **Aprobado por**: _pendiente de firma_

<!-- Añadir aquí las entradas siguientes. NO editar las anteriores. -->
