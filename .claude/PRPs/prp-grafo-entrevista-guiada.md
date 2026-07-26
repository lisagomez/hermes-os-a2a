# PRP — Grafo regulatorio en la entrevista guiada (Meeting Copilot)

> Estado: PENDIENTE de aprobación · Rama propuesta: `feat/copilot-grafo-regulatorio` · 2026-07-26
> Base: master `6cff781` (limpio). PRP hermano: `.claude/PRPs/prp-meeting-copilot.md`.
> Superficie: `businessos/frontends/meeting-copilot/`. Servicio consumido: `businessos/grafo/`.
> **Nada implementado.** Este documento es plan; requiere aprobación de la dueña antes de código.

---

## Objetivo

Que la entrevista guiada de Meeting Copilot pueda, **cuando el lead opera en un dominio regulado
ya sembrado en el grafo**, (1) derivar preguntas de descubrimiento desde los `requisitos[]` de la
norma —con cita y vigencia— y (2) convertir `banderas` y veredictos `no_permitido`/`dudoso` en
`RiesgoDeal` con fuente citada. El grafo entra como **tercera fuente en un seam angosto**, junto al
motor determinista (qué falta del método) y la IA redactora (cómo se dice), **sin invadir a ninguno
de los dos**.

## Por qué

| Problema | Solución |
|----------|----------|
| El banco de preguntas del playbook es genérico: en una venta a un negocio regulado el vendedor no sabe qué preguntar y descubre el bloqueador regulatorio después de la propuesta | Los `requisitos[]` de la categoría del lead se vuelven preguntas de descubrimiento **con autoridad externa citable** (ley + artículo + vigencia) |
| Los `RiesgoDeal` de hoy salen del método de venta: ninguno puede decir *por qué* según una fuente | Las `banderas` del grafo producen riesgos **con `fuente`**, algo que el motor determinista no puede producir por diseño |
| El conocimiento regulatorio del negocio vive en el grafo (ya construido, ya verificado, cero tokens) pero ninguna superficie comercial lo consume | Una ruta proxy replica el patrón `/api/asesor/*` ya probado; sin secretos, sin arquitectura nueva |

**Valor de negocio**: acelerador **por vertical regulada**. En un discovery a un operador de
drone-delivery o a una correduría de seguros, el vendedor llega con las preguntas que la AFAC/CNSF
obligan a responder. Convierte el grafo (activo ya pagado) en diferenciador comercial demostrable.

### Frontera decidida (NO re-abrir en implementación)

El grafo es **complemento en un seam angosto, jamás reemplazo del motor determinista**. Razones,
comprimidas, para que nadie las vuelva a litigar a mitad de una fase:

1. **Ejes distintos.** La entrevista responde *"¿qué le falta a ESTA conversación?"* — verdad
   metodológica, propiedad del equipo comercial, ajustable por playbook. El grafo responde
   *"¿qué dice la norma?"* — autoridad externa, citable, con vigencia. Nadie puede contestar la
   pregunta del otro.
2. **`parcial` ≠ `dudoso`.** `parcial` es cobertura a medias de una dimensión del score;
   `dudoso` es el fail-safe *"no sé / sin regla aplicable"* del grafo. El grafo **no tiene
   cobertura parcial y es a propósito** (`evaluador.py`: lo no clasificable sale `dudoso`).
3. **El grafo no tiene las primitivas.** No conoce cursor/prefijo de segmentos revelados, ni lado
   `interno`/`cliente`, ni evidencia por segmento con timestamp, ni pesos de dimensión, ni
   `ORDEN_PRIORIDAD`, ni alertas de conducta (monólogo >90 s, objeción sin respuesta ≥3 segmentos).
4. **Cierre del argumento — el gate de procedencia.** `grafo/seed/gen_seed_sql.py` exige fuente
   primaria con URL y vigencia para toda regla. *"El impacto se mencionó sin cifras"* no tiene cita
   del DOF: meter el método de venta en el seed lo haría **rechazar el gate, y con razón**.

Esto reproduce la división que el motor `llm` ya estableció y que está documentada como deliberada
en `src/features/agents/prompt-pregunta.ts` (*"el motor determinista decide QUÉ dimensión falta; la
IA solo REDACTA"*). Queda: **el determinista decide qué falta del método, el grafo aporta qué falta
de la norma, la IA redacta. Tres fuentes, tres responsabilidades, cada una citando lo suyo.**

### Costo que hay que decir en voz alta

El grafo tiene **29 reglas / 32 impactos**, y en `regulatorio MX` cubre **solo dos categorías**:
`DRONES_DELIVERY` e `AGENTES_SEGUROS`. Para el lead típico devuelve `dudoso · sin regla aplicable`
**sin requisitos**: la feature no aporta nada visible. Esto es un **acelerador por vertical, no una
feature general**; cada dominio nuevo cuesta una investigación→seed real (método en
`grafo/PLANTILLA-INVESTIGACION-SEED.md`, PR #144), no una tarde de código.

**Si no hay vertical regulada donde A2A Factory venda de verdad, esto es infraestructura sin
cliente y no se debe construir.** Por eso la Fase 0 es un go/no-go con criterio explícito.

## Qué

### Criterios de Éxito

- [ ] **C1 — Go/no-go documentado**: existe una vertical elegida con los 4 criterios de Fase 0
      respondidos por escrito y aprobados por la dueña; si ninguno se cumple, el PRP se cierra en
      Fase 0 sin escribir código (resultado válido).
- [ ] **C2 — Input explícito, nunca inferido**: el grafo se consulta **solo** con un campo de
      operación del lead capturado a mano; existe un test que falla si algún código pasa texto de
      transcripción a `descripcion` del concepto.
- [ ] **C3 — Score intacto**: `calcularScore()` devuelve **exactamente el mismo total y las mismas
      dimensiones** con el grafo activo, caído o apagado (test de no-contaminación).
- [ ] **C4 — Disclaimer y fuente siempre en la UI**: toda pregunta o riesgo de origen regulatorio
      renderiza `cita` + `url` + vigencia y el `disclaimer` del grafo; existe un test que falla si
      un veredicto (`permitido`/`no_permitido`) llega al Prompter como afirmación.
- [ ] **C5 — Salida en forma de pregunta**: un validador rechaza toda redacción regulatoria que no
      sea pregunta o que contenga léxico afirmativo normativo ("es legal", "está permitido", "no
      requiere permiso"); test con caso rojo.
- [ ] **C6 — Degradación visible**: la UI distingue tres estados: *sin categoría aplicable*,
      *el grafo no respondió* y *categoría con requisitos*. Ningún `catch` silencioso; el error
      viaja al panel con su motivo.
- [ ] **C7 — Fixture real end-to-end**: la reunión demo de la vertical elegida produce ≥1 pregunta
      con cita y ≥1 `RiesgoDeal` con `fuente`, verificado por smoke Playwright.
- [ ] **C8 — Gates verdes**: `npm run build`, `typecheck`, `lint`, vitest y smoke Playwright del
      copilot; `python3 grafo/seed/gen_seed_sql.py --check` verde si se tocó el seed.

### Comportamiento Esperado (happy path)

1. Al crear la reunión, el asesor captura el **giro/operación del lead** en un campo explícito
   ("reparto de última milla con drones en CDMX") y su jurisdicción (`MX`). Sin ese campo, la
   feature permanece dormida y la entrevista se comporta exactamente como hoy.
2. Al abrir `/reuniones/[id]/guiada`, la app pide **una vez** `POST /api/regulatorio`; la ruta
   server-side puentea a `POST grafo:3000/evaluaciones` con
   `contexto:{jurisdiccion, dimension:"regulatorio", regimen:"GENERAL", fecha}` y un único concepto
   = el texto capturado.
3. El grafo devuelve categoría (`DRONES_DELIVERY`), veredicto, `checklist`/`requisitos`, `banderas`,
   `fuentes` y `disclaimer`.
4. Aparece un **panel aparte "Cumplimiento del lead (señala riesgos, no asesora)"** con las
   preguntas derivadas de los requisitos, cada una con su chip de fuente
   (`LAC Art. 30 · vigente desde 2023-05-03`) y el disclaimer al pie.
5. La primera pregunta regulatoria pendiente puede ocupar el slot de *siguiente mejor pregunta*
   **solo si** el hueco metodológico prioritario ya está cubierto — y llega **siempre** como
   pregunta con su chip de fuente, nunca como veredicto.
6. Las `banderas` y un veredicto `no_permitido`/`dudoso` producen `RiesgoDeal` con `fuente`, que
   aparecen en el workspace post-reunión junto a los riesgos de venta, **visualmente separados**.
7. Si el grafo no responde: el panel muestra *"El grafo no respondió (timeout 6 s) — la entrevista
   sigue sin la capa regulatoria"* con botón de reintento. El score y el coach no cambian.

---

## Contexto

### Referencias (código real, leído)

**Lado copilot** (`businessos/frontends/meeting-copilot/`):
- `src/features/guided/coach.ts` — `evaluarCoach(reunion, transcripcion, playbook, cursor)`; una
  sugerencia y una alerta activas; prioridad objeción > monólogo > superficial > crítica.
- `src/features/insights/engine.ts` — motor determinista; `evaluarRiesgos(score, insights)`
  (línea 384) es el punto de extensión de riesgos; `calcularScore`, `extraerInsights`.
- `src/features/playbooks/defaults.ts` — `ORDEN_PRIORIDAD` + `BANCO_BASE` (banco estático que pasa
  a poder ser **derivado**).
- `src/features/agents/prompt-pregunta.ts` / `usePreguntaIA.ts` — patrón "el determinista decide,
  la IA redacta" + parseo defensivo.
- `src/app/api/asesor/pregunta/route.ts` — patrón de ruta server-side: zod del cuerpo, timeout con
  `AbortController`, error con código y motivo, **clave solo en servidor**.
- `src/shared/lib/config.ts` — convención de seams: valor desconocido → `throw` al cargar el módulo
  ("un seam mal configurado detiene la app en vez de degradar en silencio").
- `src/features/domain/types.ts` — `Reunion` (hoy: `cuenta`, `tipoReunion`; **ningún giro**),
  `RiesgoDeal`, `Playbook`, `Evidencia`.
- `src/features/insights/ia.ts` — patrón de fusión: la IA aporta, el **contrato valida**
  (`validarAnalisisIA` descarta lo no respaldado) y la aritmética del score no se toca.

**Lado grafo** (`businessos/grafo/`):
- `app.py` — `POST /evaluaciones`, `GET /health`, `GET /salud-conocimiento`.
- `schemas.py` — `Contexto{jurisdiccion,dimension,regimen,fecha}`, `Concepto{descripcion,importe}`,
  `ConceptoEvaluado{categoria,estado,razon,fuente,banderas,checklist}`, `EvaluacionResponse{estado,
  conceptos,banderas_rojas,checklist,fuentes,disclaimer}`.
- `evaluador.py` — `clasificar()` por keyword más larga con frontera de palabra + `exclusiones`;
  fail-safe `dudoso · sin regla aplicable`; `DISCLAIMER` constante.
- `seed/reglas.json` — 29 reglas / 32 impactos. `regulatorio MX`: `MX-LAC-30-REGISTRO-RPAS`,
  `MX-LAC-74-SEGURO-RPAS` (DRONES_DELIVERY), `MX-LISF-93/94/25-93` (AGENTES_SEGUROS).
- `seed/gen_seed_sql.py` — gate de procedencia. `PLANTILLA-INVESTIGACION-SEED.md` — método
  investigación→seed (Salida A vs Salida B).
- `businessos/docker-compose.yml` — `grafo` en `hermes-net`, publicado **solo** en
  `127.0.0.1:3000`. **El navegador nunca lo alcanza**: por eso hay ruta proxy.

**Ejemplo real del seed que justifica la feature** (`MX-LAC-30-REGISTRO-RPAS`):
requisito *"Confirmar si la ruta de entrega requiere operación BVLOS (más allá de línea de vista)"*
→ pregunta de discovery *"¿sus entregas van más allá de la línea de vista del piloto?"*
(fuente: Ley de Aviación Civil Art. 30 / NOM-107-SCT3-2019).

### Los CUATRO invariantes duros

> Si alguno se rompe, **la integración es peor que no hacerla**. Cada uno tiene su gate de fase.

**(a) El input NO es la transcripción.**
`clasificar()` está diseñado para descripciones limpias tipo *"Hospedaje en hotel, viaje a
Monterrey"*: no maneja negación ni menciones de terceros — *"un cliente nuestro usa drones"*
clasificaría igual que *"operamos drones"*. El campo `exclusiones` existe por el incidente
2026-07-10 (*"agente de seguros para drones"*) y eso fue **con conceptos limpios**. El seam es un
**campo explícito de la operación del lead**, capturado por una persona. Hoy no existe: `Reunion`
solo tiene `cuenta` y `tipoReunion`.

**(b) Disclaimer y fuente viajan a la UI, o no se integra.**
El contrato del grafo es *"señala riesgos; NO asesora"*. El Prompter es la superficie **más
peligrosa** del producto: está optimizada para que el vendedor lea una línea y la diga en voz alta.
Un `permitido` suelto se vuelve *"sí, es legal"* dicho por un vendedor a media junta. La salida
regulatoria se formula **siempre como pregunta que hacer, jamás como respuesta que dar**, y la IA
redactora **nunca recibe el veredicto** — solo el texto del requisito.

**(c) NO suma al score.**
El SPEC ya tomó esta decisión con `conducta` (se muestra, no suma, *"para no mezclar calidad de
venta con calidad de captura"*). Riesgo regulatorio del negocio del cliente y calidad del discovery
del vendedor son **ejes distintos con dueños distintos**. Panel aparte; dimensión de playbook solo
si una vertical real lo pide, y sería otro PRP.

**(d) Degradación VISIBLE.**
Si el grafo no responde, la entrevista sigue — pero un checklist vacío debe ser **distinguible** de
*"el grafo no contestó"*. Doctrina del repo: el fetch fantasma (2026-07-13, un best-effort que
nadie loguea es un fallo invisible) y `fuente_impresos` del auditor de CLIs (2026-07-12,
*"no sé qué hay impreso" ≠ "no hay nada impreso"*).

### Arquitectura propuesta (Feature-First, aditiva)

```
src/features/regulatorio/            # NUEVA — toda la capa vive aquí
├── tipos.ts                         # ConsultaRegulatoria, EstadoRegulatorio, PreguntaNorma
├── cliente.ts                       # store zustand: una consulta por reunión (patrón ia.ts)
├── derivar.ts                       # PURO: requisitos[] -> PreguntaNorma[]; banderas -> RiesgoDeal
├── validar.ts                       # PURO: rechaza redacción no-interrogativa o afirmativa
└── PanelCumplimiento.tsx            # panel aparte + chips de fuente + disclaimer + estados

src/app/api/regulatorio/route.ts     # proxy server-side -> POST ${GRAFO_URL}/evaluaciones
```

Puntos de contacto con lo existente (mínimos, todos aditivos):
- `domain/types.ts`: campo `perfilRegulatorio?` en `Reunion`; campo `fuente?` en `RiesgoDeal`.
- `shared/lib/config.ts`: seam `NEXT_PUBLIC_REGULATORIO` ∈ `off` | `grafo` (default `off`).
- `guided/GuidedMeeting.tsx`: monta `PanelCumplimiento` en la columna derecha (debajo de cobertura).
- `insights/engine.ts`: **no se modifica su lógica**; los riesgos regulatorios se concatenan fuera,
  en la capa de presentación/workspace, para que el test de no-contaminación del score sea trivial.

### Modelo de Datos

MVP sin Supabase (igual que el PRP hermano). Contratos TS:

```ts
// Capturado a mano. Sin este objeto, la capa regulatoria NUNCA se activa.
export interface PerfilRegulatorio {
  operacion: string        // texto explícito del giro: "reparto de última milla con drones"
  jurisdiccion: 'MX' | 'CO'
  capturadoPor: string     // quién lo escribió (trazabilidad del input)
}

export type EstadoRegulatorio =
  | { estado: 'apagado' }                                   // seam off o sin perfil
  | { estado: 'cargando' }
  | { estado: 'sin_regla'; razon: string; disclaimer: string } // dudoso · sin regla aplicable
  | { estado: 'listo'; categoria: string; preguntas: PreguntaNorma[];
      riesgos: RiesgoNorma[]; fuentes: Fuente[]; disclaimer: string }
  | { estado: 'error'; error: string }                       // SIEMPRE visible, con motivo

export interface PreguntaNorma {
  texto: string            // termina en '?' — lo garantiza validar.ts
  requisitoOriginal: string
  fuente: Fuente           // clave, cita, url, vigencia{desde,hasta}
}
```

Forma aditiva futura (cuando exista Supabase): `reuniones.perfil_regulatorio jsonb` +
`riesgos_deal.fuente jsonb`. Nada de esto se implementa en este PRP.

### Modelo de amenazas (mini)

- **Activos que toca**: contenido de reuniones y perfil del lead (sin PII nueva); la **reputación
  legal** de lo que el vendedor repite en voz alta; el grafo como servicio interno.
- **Fronteras que cruza**: navegador → ruta server-side Next → `GRAFO_URL` interno. Entran sin
  confianza: (1) el texto de operación escrito por el asesor → zod (`min 3`, `max 300`, sin
  URLs/secretos) antes de salir; (2) la respuesta del grafo → se **renderiza**, nunca se ejecuta ni
  se interpola como HTML; (3) la redacción del LLM → `validar.ts` la rechaza si no es pregunta.
- **Atacante relevante**: usuario interno que intente usar el proxy como **SSRF** hacia otro host.
  Control: `GRAFO_URL` viene **solo de env**, jamás del request; el cuerpo aceptado no incluye
  destino ni ruta. La ruta no maneja secretos (el grafo es lectura sin credenciales), así que un
  abuso no filtra llaves.
- **Controles**: seam fail-fast (`config.ts`), zod en la ruta, timeout 6 s con `AbortController`,
  sin persistencia local de la respuesta, sin `dangerouslySetInnerHTML`, un único upstream.

### Evaluación de impacto — AISIA

- **Partes afectadas**: el **prospecto** (podría tomar una decisión operativa por lo que el
  vendedor le dijo en la junta) y el **asesor** (podría afirmar algo falso de buena fe).
- **Daños posibles SIN atacante**: el sistema operando "bien" muestra `permitido` para
  `DRONES_DELIVERY`; el vendedor lo lee como *"tu operación es legal"* y el prospecto no consulta a
  su abogado. También el inverso: un `dudoso` presentado como *"no se puede"* mata un deal por un
  hueco de conocimiento del seed, no de la ley.
- **Mitigaciones**: solo preguntas, nunca veredictos, en la superficie de habla (invariante b);
  disclaimer del grafo renderizado íntegro en el panel; cita + URL + vigencia en cada ítem;
  `sin_regla` se comunica como *"el grafo no tiene reglas para este giro"* (nunca "no aplica");
  el panel lleva el rótulo *"señala riesgos, no asesora"*. Vía de apelación: el asesor puede
  descartar cualquier pregunta regulatoria sin consecuencia para el score (no suma, invariante c).

### Confianza del agente

```
Confianza: Constraint (camino grafo → UI) + Claim verificado por Constraint (redacción LLM)
Justificación: lo que llega del grafo trae fuente y vigencia verificables y es determinista
(cero tokens, mismo input → mismo output). La única pieza no determinista es la redacción de la
pregunta, y pasa por validar.ts, que la rechaza si no es interrogativa o si afirma norma — mismo
patrón que validarAnalisisIA en insights/ia.ts ("la IA propone, el contrato verifica"). Peor caso
del agente: proponer una pregunta irrelevante que el asesor descarta. Nada irreversible: no
escribe, no envía, no decide.
```

### ¿Este PRP cambia comportamiento de agentes? (CDC)

**Sí, acotado** — gate **estándar**: (1) el prompt del Prompter recibe un motivo de origen
regulatorio y una prohibición explícita de afirmar norma; (2) aparece `validar.ts` como filtro
nuevo de su salida. **No toca** SOUL/AGENTS/MEMORY de ninguna vertical Hermes en producción, ni el
motor del trío, ni el ruteo de modelos. Registro en bitácora + revisión humana en el PR. Si en el
futuro este conocimiento se cablea a un bot de Telegram/Slack, **eso es otro PRP con CDC completo**
(y recordar: editar un `.md` del repo NO lo despliega al volumen — doctrina 2026-07-12).

---

## Blueprint (Assembly Line)

> Solo FASES. Las subtareas se generan al entrar a cada fase (bucle agéntico).

- **Fase 0 — Go/no-go de vertical (SIN código).** Elegir la primera vertical regulada a sembrar (o
  concluir que no hay). **Criterio de elección, los 4 en verde o no se arranca**:
  (1) *cliente real*: existe al menos un lead/deal vivo o pipeline nombrado en esa vertical —
  no un mercado hipotético; (2) *densidad regulatoria*: la operación tiene requisitos previos
  (permiso, registro, póliza, autorización) que **condicionan la compra**, no solo buenas prácticas;
  (3) *fuente primaria accesible*: existe ley/NOM/DOF citable con URL y vigencia — si el
  conocimiento vive solo en circulares no publicadas, el gate de procedencia lo va a rechazar;
  (4) *costo acotado*: la investigación→seed cabe en un esfuerzo delimitado con la plantilla
  (≤ ~2 categorías y ~6 reglas).
  Candidatos por default: `DRONES_DELIVERY` y `AGENTES_SEGUROS` **ya sembrados** (permiten construir
  y probar todo el camino con cero costo de seed).
  **Gate**: documento de decisión con los 4 criterios respondidos y aprobado por la dueña.
  Si ninguno pasa → el PRP se cierra aquí (resultado válido, no fracaso).

- **Fase A — Contrato y seams.** `PerfilRegulatorio` en `Reunion`, `fuente?` en `RiesgoDeal`,
  seam `NEXT_PUBLIC_REGULATORIO` (+ `GRAFO_URL` server-side), captura del campo en
  `/reuniones/nueva` y edición en el detalle.
  **Gate**: `typecheck` verde; test que un seam inválido **truena al cargar**; test que sin
  `perfilRegulatorio` la app **nunca** llama a la ruta (invariante a).

- **Fase B — Ruta proxy `/api/regulatorio` + cliente con estados.** Patrón
  `api/asesor/pregunta/route.ts`: zod, timeout 6 s, error con motivo. Store zustand con una consulta
  por reunión (patrón `insights/ia.ts`).
  **Gate**: tests con grafo simulado — respuesta íntegra (disclaimer + fuentes presentes),
  `dudoso · sin regla aplicable` → estado `sin_regla`, upstream caído → estado `error` con motivo,
  y **test que distingue `sin_regla` de `error`** (invariante d). Test de que `GRAFO_URL` no puede
  venir del request.

- **Fase C — Requisitos → preguntas (banco derivado).** `derivar.ts` puro: cada `requisito` se
  convierte en `PreguntaNorma` con su `Fuente`; `validar.ts` garantiza forma interrogativa. El
  `bancoPreguntas` estático sigue intacto cuando no hay categoría.
  **Gate**: fixture de la vertical elegida produce ≥1 pregunta citando su norma (p. ej. LAC Art. 30
  / NOM-107-SCT3-2019); `ORDEN_PRIORIDAD` del playbook **inalterado**; test rojo si `validar.ts`
  deja pasar una redacción afirmativa (invariante b).

- **Fase D — Banderas y veredicto → `RiesgoDeal` con fuente.** `no_permitido` → severidad alta;
  `dudoso` con banderas → media; cada bandera lleva su `Fuente`. Se concatenan **fuera** de
  `evaluarRiesgos` para no tocar el motor.
  **Gate**: test de **no-contaminación** — `calcularScore()` idéntico con grafo activo, caído y
  apagado (invariante c). Riesgos regulatorios visualmente separados de los de venta.

- **Fase E — UI: panel de cumplimiento + Prompter con chip de fuente.** `PanelCumplimiento` en la
  columna derecha de `GuidedMeeting`; disclaimer íntegro al pie; chips `cita · vigente desde`;
  botón de reintento en `error`; una pregunta regulatoria puede ocupar el slot de sugerencia solo
  con su chip, nunca con veredicto.
  **Gate**: smoke Playwright con grafo simulado **arriba y abajo**; captura muestra disclaimer y
  cita; test que ningún string `permitido`/`no_permitido` llega al slot del Prompter.

- **Fase F — Siembra de la vertical (solo si Fase 0 eligió una NO sembrada).** Investigación→seed
  con `grafo/PLANTILLA-INVESTIGACION-SEED.md`: Salida B en el esquema real, editando **solo**
  `seed/reglas.json`.
  **Gate**: `python3 seed/gen_seed_sql.py --check` verde (gate de procedencia: fuente primaria +
  URL + vigencia en toda regla); reseed verificado y `GET /salud-conocimiento` sin reglas vencidas
  nuevas.

- **Fase G — Validación final y docs vivas.**
  **Gate**:
  - [ ] `npm run build`, `npm run typecheck`, `npm run lint`, vitest y smoke Playwright verdes
  - [ ] Los 8 criterios de éxito demostrados por un test o una captura — **nada por promesa**
        (decisión `2026-07-20-ensayo-doctrina`)
  - [ ] `SPEC.md` del copilot + `README` del grafo + `businessos/ROADMAP.md` + memoria del proyecto
        actualizados en el mismo PR
  - [ ] PR con evidencia; merge por el procedimiento estándar (nunca `git push origin master`)

---

## 🧠 Aprendizajes (Self-Annealing)

> Vacío a propósito: crece durante la implementación. El mismo error nunca dos veces.

---

## Gotchas conocidos (heredados del repo)

- [ ] **`clasificar()` no entiende negación ni terceros**: keyword más larga con frontera de
      palabra; `exclusiones` es un parche por colisión de dominio (incidente 2026-07-10), no un
      analizador semántico. Solo se le dan textos limpios y explícitos.
- [ ] **El navegador NO alcanza el grafo**: `127.0.0.1:3000` en el servidor, `http://grafo:3000`
      dentro de `hermes-net`. Todo pasa por la ruta server-side. En dev hay que levantarlo
      (`docker compose up -d grafo grafo-db`) o abrir túnel SSH — y el smoke debe correr también
      **sin** grafo para probar la degradación.
- [ ] **Hay impactos con `veredicto_base: null`** (p. ej. `MX-LISF-94`, `MX-LISF-25-93`): aportan
      **solo requisitos y banderas**, con fuente. La UI debe tolerarlos — y son exactamente el caso
      más valioso para esta feature.
- [ ] **`dudoso` es fail-safe, no "no aplica"**: renderizarlo como "no hay problema" invierte su
      significado.
- [ ] **Vocabulario de `Estado` mezclado**: `deducible`/`no_deducible` (fiscal/contable/contractual)
      y `permitido`/`no_permitido` (regulatorio) conviven en el mismo `Literal`. Esta feature usa
      **solo** `dimension: "regulatorio"`.
- [ ] **Reseed del grafo exige volumen virgen** (initdb) o aplicar `02-seed.sql` con psql
      (upsert idempotente); reseeding borra el histórico de `evaluaciones`.
- [ ] **`02-seed.sql` es generado**: se edita `seed/reglas.json` y se corre `gen_seed_sql.py`.
- [ ] **Ningún `catch` silencioso**: un best-effort que nadie loguea es un fallo **invisible**
      (2026-07-13). El error del proxy se loguea en el servidor **antes** de viajar al cliente.
- [ ] **Seam desconocido = la app no arranca** (`config.ts`), nunca degradación silenciosa.
- [ ] **Monorepo + Turbopack**: `turbopack.root` / `outputFileTracingRoot` ya fijados en el copilot;
      no tocarlos (si no, arrastra el `middleware.ts` de la app raíz).
- [ ] **eslint-config-next@16 es flat nativo** (sin `FlatCompat`).
- [ ] Editar un `.md` del repo **no lo despliega** a ningún volumen (2026-07-12).

## Anti-Patrones

- **NO** meter el método de venta (dimensiones, pesos, huecos) en `seed/reglas.json`: el gate de
  procedencia lo rechaza y tiene razón.
- **NO** clasificar desde la transcripción, ni "ayudar" al usuario autocompletando el giro desde lo
  que dijo el cliente.
- **NO** sumar el resultado regulatorio al score de discovery.
- **NO** mostrar veredicto sin fuente, ni fuente sin disclaimer, ni pregunta que no sea pregunta.
- **NO** renderizar un panel vacío cuando el grafo falló.
- **NO** duplicar la lógica de `evaluarRiesgos`: extender por concatenación, no por copia.
- **NO** usar `any`; **NO** omitir zod en el cuerpo de la ruta; **NO** hardcodear la URL del grafo.

## Stack (Golden Path)

Next.js 16 + React 19 + TypeScript strict + Tailwind v4 + zustand + zod + lucide-react + vitest +
Playwright, dentro de `businessos/frontends/meeting-copilot/`. Upstream: FastAPI del grafo
(HTTP solo-lectura, sin secretos). Sin Supabase. Sin `any`.

---

*PRP pendiente de aprobación. No se ha modificado código de producción.*
