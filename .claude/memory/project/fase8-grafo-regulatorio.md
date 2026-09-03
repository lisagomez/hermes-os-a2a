---
name: fase8-grafo-regulatorio
description: Fase 8 — nueva dimension "regulatorio" del grafo (permisos/cumplimiento operativo, no solo fiscal); caso ancla drones-delivery MX; COMPLETA y verificada en runtime 2026-07-09
metadata:
  type: project
---

**Motivacion:** el grafo ([[fase2-grafo]], [[fase3-expansion]]) solo respondia
deducibilidad fiscal/contable/contractual. Elisa pidio habilitarlo para
preguntas de permiso/cumplimiento general ("¿esta permitido X?"), empezando por
Mexico y con vocacion de sumar mas paises. Ejemplo ancla que ella propuso:
¿esta permitido el uso de drones para delivery en Mexico?, ¿que regulacion
debe cumplir el seguro de un dron para delivery?

**Decision de diseno (aprobada por Elisa antes de construir):** nueva dimension
`regulatorio` (nombre deliberadamente amplio, no "aeronautico" — sirve a
cualquier actividad con permiso/cumplimiento operativo futuro) con vocabulario
de veredicto propio `permitido`/`no_permitido`, conviviendo con
`deducible`/`no_deducible` sin cruzarse (las categorias ya no cruzan de
dimension desde Fase 3). Tocados 4 lugares con el vocabulario fiscal
hardcodeado: `grafo/schemas.py` (Estado), `grafo/evaluador.py` (ESTADOS),
`grafo/seed/gen_seed_sql.py` (VEREDICTOS), `grafo/seed/01-schema.sql` (CHECK de
`impactos.veredicto_base`).

**Investigacion con fuente primaria (no blogs, no confiar en la NOM a ciegas):**
descargué y parseé (pypdf, sin `pdftotext` disponible) la Ley de Aviación Civil
completa (`diputados.gob.mx/LeyesBiblio/pdf/LAC.pdf`, "Última Reforma DOF
14-11-2025") y NOM-107-SCT3-2019 (`gob.mx/cms/.../nom-107-sct3-2019-201119.pdf`).
Hallazgo que justifica todo el proceso: la NOM (2019) cita el requisito de
seguro como "artículo 72" de la Ley; la Ley VIGENTE hoy lo tiene en el
**Artículo 74** (Capítulo XIII "De los seguros aéreos") tras renumeraciones
posteriores (última reforma de ambos artículos: DOF 03-05-2023). Citar la NOM
a ciegas habría propagado el número equivocado. También se incorporó
NOM-107 num. 4.10.3 ("no dejar caer y/o arrojar objetos... que puedan causar
daño") como requisito directamente relevante al mecanismo de entrega de un
drone de delivery.

**2 reglas MX construidas** bajo categoría `DRONES_DELIVERY`:
- `MX-LAC-30-REGISTRO-RPAS` — registro ante AFAC si el RPAS no presta "servicio
  público"; veredicto `permitido` con checklist (registro SIIAU, NOM-107,
  prohibición de dejar caer objetos, verificar BVLOS).
- `MX-LAC-74-SEGURO-RPAS` — seguro de responsabilidad civil obligatorio +
  aprobación previa de AFAC; bandera explícita sobre la discrepancia de
  numeración Art. 72 (NOM) vs Art. 74 (Ley vigente).

**Tests:** 3 nuevos en `grafo/tests/test_multiambito.py` (veredicto permitido +
fuente correcta; cita exacta Art. 74 no 72; no-cruce con fiscal en ambas
direcciones). 54/54 verdes tras el cambio (51 previos + 3 nuevos), cero
regresión. Un test viejo (`test_endpoint_salud_conocimiento`) tenía
`reglas_total == 24` hardcodeado — actualizado a 26 + ambito `("MX",
"regulatorio")`.

**Runtime (2026-07-09) — migración aditiva pura, sin recrear el volumen:**
1. `ALTER TABLE impactos DROP/ADD CONSTRAINT impactos_veredicto_base_check`
   (amplía el CHECK; constraint se llama asi por default de Postgres, sin
   nombre explicito en el DDL original).
2. Aplicar el `02-seed.sql` regenerado completo contra la BD viva vía
   `docker exec -i grafo-db psql -U grafo -d grafo < 02-seed.sql` — es
   idempotente (`on conflict ... do update`), asi que reafirma las 24 reglas
   viejas sin duplicar y agrega las 2 nuevas. NO fue necesario recrear el
   volumen (a diferencia de lo que decia el comentario original de `db.py`
   sobre "reseed real implica recrear el volumen" — eso aplica a cambios de
   ESQUEMA/tabla, no a agregar filas nuevas via upsert).
3. `schemas.py`/`evaluador.py` cambiaron (Python) → rebuild + redeploy de la
   imagen `grafo` (`docker compose build grafo && docker compose up -d grafo`).
4. **Verificado por DOS canales** (cumple "agente o humano"): `POST
   /evaluaciones` directo vía `docker run --rm --network
   businessos_hermes-net curlimages/curl` (persistido con `id` real en
   `evaluaciones`, veredicto `permitido`, 2 fuentes) Y **A2A real** contra
   `grafo-a2a` con un script ad-hoc calcado del wire format de
   `smoke-trio/runtime.py` (`SendMessageRequest` + `new_data_message` +
   `TaskState.TASK_STATE_COMPLETED` = 3) — mismo resultado, mismas fuentes,
   disclaimer presente.

**"Biblioteca" (pregunta de Elisa) resuelta sin caché de LLM:** la respuesta
repetible no es cachear un texto generado por un modelo — es que la regla ya
vive en el seed, determinista y citada; la segunda vez que se pregunte lo
mismo, la respuesta es instantánea porque no hay investigación de por medio,
solo un match de keywords → regla. Cada evaluación además queda persistida en
`evaluaciones` (tabla ya existente desde Fase 2).

**Obsidian (pregunta de Elisa) — acordado, NO construido:** Obsidian (bóveda de
`personal`) sirve como bitácora de INVESTIGACIÓN/borrador antes de que una
regla entre al seed — nunca como fuente que el grafo consulte en vivo (rompería
el gate de procedencia, que exige `fuente_url` http(s) real por regla). Falta
construir el flujo real (¿quién decide cuándo una nota de Obsidian se
"promueve" a regla del seed? hoy es 100% manual/Claude Code).

**Reference nueva creada:** `.claude/memory` del AUTO-MEMORY de Claude Code
(no de este repo) — [[fuentes-legales-mx]] — diputados.gob.mx/DOF = cita
oficial; mexico.justia.com = navegable por artículo/capítulo, útil para
investigar rápido pero NUNCA como `fuente_url` citada (no es la fuente
oficial).

**Deuda de nombres (no bloqueante):** la tabla `categorias_gasto` sigue
llamándose así (naming fiscal-específico) aunque ahora también guarda
`DRONES_DELIVERY`, que no es un "gasto". Se reusó sin renombrar (KISS, evitar
blast radius de renombrar tabla en producción); reconsiderar si el dominio
regulatorio crece mucho.

**Futuro:** más países/ámbitos sobre esta misma dimensión `regulatorio` (el
código ya es genérico a propósito).

## ACTUALIZACIÓN 2026-07-09 — `#dep-legal` en Slack + gotchas de aprobación de terminal

Segundo canal de Slack agregado (`C0BH2RKA8QG`, fuera del plan original de
[[fase6-departamentos]]): consultas de cumplimiento respondidas por
`hermes-negocio` vía grafo. Patrón additivo en `config.yaml` (no reemplazar
`platforms.slack`, que borraría `#dep-negocio`); `negocio/slack-config-fragment.yaml`
actualizado como fuente de verdad de AMBOS canales (antes solo tenía el
placeholder de uno). El bot NO se auto-une a canales nuevos (sin scope
`channels:join`) — requiere `/invite @Hermes Negocio` manual en Slack.

**Bug real encontrado en `AGENTS.md` (desde hacía semanas):** el `AGENTS.md`
EN VIVO del contenedor estaba desactualizado desde Fase 0 — seguía diciendo
"el grafo NO está desplegado, no ejecutes nada de esta sección", pese a que
el grafo lleva vivo desde Fase 2. `AGENTS.md`, igual que `SOUL.md`/`MEMORY.md`,
es un archivo que se sincroniza A MANO al volumen (`docker exec -u hermes ...`
con base64, mismo patrón); NO se actualiza solo con cambios al repo. Sincronizado
con la versión actual (incluye Fase 2/3/8 del grafo).

**Primera prueba real end-to-end (2026-07-09, pregunta de drones en `#dep-legal`)
funcionó — 2003 caracteres de respuesta citando la Ley de Aviación Civil — pero
con dos fricciones reales, vistas en `/opt/data/logs/agent.log` (NO en
`docker logs`, que trunca las líneas largas):

1. **`jq` no está instalado** en la imagen del contenedor Hermes → el primer
   intento del bot (`curl ... | jq ...`) falla con `exit 127`, gasta un turno y
   una aprobación de seguridad en balde antes de reintentar sin `jq`. Fix:
   `AGENTS.md` ahora instruye leer el JSON crudo directo o con
   `python3 -c "import json..."`, nunca pipear a `jq`.
2. **Cada llamada por terminal a una URL privada (`http://grafo:3000`) dispara
   `security.allow_private_urls: False`** → aviso "[HIGH] Plain HTTP URL in
   execution context" que exige aprobación manual por botón de Slack, cada vez.
   Decisión de la dueña: **allowlist quirúrgico**, no relajar la config global.
   Mecanismo real (leído de `/opt/hermes/tools/approval.py`):
   `command_allowlist` es una lista de patrones **glob** (`fnmatch`, no regex)
   revisada ANTES del escaneo de seguridad (`_command_matches_permanent_allowlist`
   se llama antes de `detect_dangerous_command`) — si el comando calza, nunca se
   dispara el aviso. Gotcha de diseño: comandos con operadores de shell (`|`,
   `&&`, `;`, `<`, `>`, backtick, `$(`) NUNCA califican para el allowlist (anti-bypass
   intencional) — por eso el fix del punto 1 (sin pipe a `jq`) es tambien lo que
   hace esto posible. Patrón agregado: `"*curl*grafo:3000*"` en
   `command_allowlist` de `config.yaml` — verificado programáticamente
   (`approval._command_matches_permanent_allowlist`) que aprueba curl a
   `grafo:3000` pero NO a otros servicios internos (`ejecutor-a2a:4100`, etc.):
   el alcance queda exactamente en el grafo, nada más.

**Verificado (2026-07-09, segunda prueba real):** CERO botones de aprobación —
el fix del `command_allowlist` funcionó. Pero apareció un problema DISTINTO en
el segundo mensaje del mismo hilo ("Mexico, delivery, comercial"): el terminal
intentó crear un **entorno `docker`** (`tools.terminal_tool: Creating new
docker environment for task default`) en vez de `local` — falla total
("Cannot connect to the Docker daemon") porque este runtime no tiene daemon
Docker (mismo problema de fondo que [[hermes-sin-docker-runtime]], pero
aplicado al terminal, no solo al toolset `file`). `env_type` sale de
`os.getenv("TERMINAL_ENV", "local")` pero el MODELO puede pedir un backend
distinto por llamada (parámetros como imagen/entorno aislado) — no es
determinista, es el modelo (Haiku 4.5) eligiendo mal en algunos turnos. Fix
aplicado: regla dura nueva en `AGENTS.md` ("El terminal SIEMPRE es backend
local... NUNCA pidas un entorno aislado"). Es una instrucción, no un bloqueo
técnico — reduce la probabilidad, no la elimina al 100%; si vuelve a pasar,
hace falta un fix más duro (¿deshabilitar los backends container-based a nivel
config, no solo instrucción?). Tambien notado: el primer mensaje del hilo
("puedes revisar la normatividad de los drones") respondió SIN llamar ninguna
herramienta (api_calls=1, tool_turns=0) — el bot puede estar respondiendo de
memoria general en vez de consultar el grafo cuando el mensaje es una apertura
vaga en vez de una pregunta especifica; pendiente confirmar con la dueña si
esa respuesta trajo fuente citada o no (no se pudo leer el texto exacto desde
el log, solo longitud/metadata).

## ACTUALIZACIÓN 2026-07-09 (tarde) — contenido real revisado, PAUSADO hasta mañana

La dueña pegó el texto completo de las dos respuestas reales de `#dep-legal`.
Con eso se pudo reconstruir la cronología exacta contra `agent.log`:

- **Ambos incidentes pasaron ANTES de mi restart de las 13:57:39 UTC** (fix
  "terminal SIEMPRE backend local" en AGENTS.md). El fix sigue SIN probarse.
- **Hallazgo nuevo, más serio**: una vez que el entorno `docker` falla en un
  turno, el error PERSISTE dentro de la misma sesión/hilo — el segundo mensaje
  del mismo hilo heredó el fallo sin loguear un segundo intento de creación de
  entorno (probablemente reusa la referencia ya rota). Un solo tropiezo puede
  "envenenar" el resto del hilo. Implicación práctica: para probar el fix,
  usar un HILO NUEVO, no continuar el hilo dañado.
- **Inconsistencia de comportamiento real detectada**: primera respuesta
  (drones) — el bot dijo honestamente "el grafo no está disponible" pero
  IGUAL dio un "Veredicto: PERMITIDO" completo con checklist (viola la regla
  de nunca responder sin el grafo). Segunda respuesta (agente de seguros) —
  el bot SÍ se negó correctamente y ofreció reintentar. Mismo bot, mismo hilo,
  comportamiento inconsistente ante la misma falla técnica.
- **Verificación de contenido de la primera respuesta** (comparado con las
  2 reglas reales que construí): Art. 30/74 LAC correctos; "licencia de piloto
  RPAS" es plausible (aparece en el texto de NOM-107 que descargué) pero NO
  está en las reglas del grafo todavía (falta agregarla como requisito
  propio); "restricciones en zonas urbanas densas/aeropuertos/zonas militares"
  NO fue verificado en la investigación — posible informacion generica o
  inventada, no confirmar sin pasar por el grafo real.
- **Pregunta nueva descubierta ("agente de seguros que asegura drones
  delivery")**: es intermediación de seguros (CNSF — Comisión Nacional de
  Seguros y Fianzas), un ámbito TOTALMENTE distinto al de `DRONES_DELIVERY`
  (que es del lado operador del dron). No existe ninguna regla para esto en
  el grafo. El bot identificó correctamente a la CNSF como regulador
  (conocimiento general correcto) pero no tiene fuente citada — sería la
  siguiente categoría a investigar/construir si se decide continuar.

**PAUSADO explícitamente por la dueña** ("vamos a dejarlo aquí por la noche lo
revisamos", 2026-07-09). Pendientes para retomar, en orden sugerido:
1. ~~Endurecer AGENTS.md: cuando el grafo no responda, PROHIBIR el formato
   "Veredicto: X" + checklist~~ → **hecho y sincronizado (2026-07-09/10)**:
   regla dura en `negocio/AGENTS.md` bajo "Límites". Sincronizada al volumen
   de Hetzner (`scp` + `sudo cp` al `.hermes/AGENTS.md`, `chown 10000:10000`,
   `docker compose restart hermes-negocio`) y verificada sin diff. Prueba real
   de HILO NUEVO en `#dep-legal` (2026-07-10, mensaje real de Elisa) confirmó
   el fix de terminal ("Creating new local environment", no más fallo Docker)
   — pero destapó el hallazgo #2 de abajo.
2. **Hallazgo nuevo y CERRADO (2026-07-10, "Fase 8b")**: el mensaje real de
   Elisa en el hilo nuevo — *"quiero 1) ser un agente de seguros para drones
   delivery 2) ser cotizador agentic"* — SÍ consultó el grafo (no violó la
   regla del punto 1) pero el grafo clasificó por keyword "drones" →
   `DRONES_DELIVERY` y devolvió un veredicto completo (PERMITIDO + checklist +
   fuentes reales Art. 30/74 LAC) para la pregunta EQUIVOCADA: la pregunta real
   es sobre licencia de AGENTE/INTERMEDIARIO de seguros (CNSF), no sobre
   operar el dron. Root cause en `grafo/evaluador.py::clasificar()`: matcher
   de keywords puro, sin forma de distinguir "operar un dron" de "vender
   seguros que mencionan drones". Peor que "dudoso": se ve autoritativo y cita
   fuentes reales pero responde otra cosa.
   **Fix aplicado** (código, no solo prompt): (a) `clasificar()` ahora soporta
   `exclusiones` por categoría — si el texto casa una exclusión, esa categoría
   se descarta aunque también casen sus keywords (`grafo/evaluador.py`); (b)
   nueva categoría `AGENTES_SEGUROS` con 2 reglas nuevas investigadas con
   fuente primaria (pypdf sobre `diputados.gob.mx/LeyesBiblio/pdf/LISF.pdf`,
   Última Reforma DOF 14-11-2025): `MX-LISF-93-AUTORIZACION-AGENTE` (Art.
   91/93: autorización de CNSF obligatoria; explícitamente NO afirma
   examen/cédula/registro porque la Ley los remite a "el reglamento
   respectivo" de la CNSF, no verificado — no se inventó) y
   `MX-LISF-94-DEBER-INFORMACION-AGENTE` (Art. 94: deberes de información,
   sin veredicto propio, solo aporta checklist/bandera — mismo patrón de
   "impacto general" ya usado). `DRONES_DELIVERY` ganó `exclusiones` con las
   frases de intermediación de seguros.
   **Piezas tocadas en cascada** (una columna nueva en DB, no solo JSON):
   `seed/01-schema.sql` (columna `categorias_gasto.exclusiones text[]`),
   `db.py` (lee y propaga la columna), `seed/gen_seed_sql.py` (valida y
   genera SQL para `exclusiones`), `02-seed.sql` regenerado (28 reglas, 13
   categorías). 4 tests nuevos en `test_multiambito.py` (incluye regresión
   exacta del incidente) + 2 tests viejos ajustados a los nuevos conteos
   (`test_db.py` fixture, `reglas_total` 26→28). 58/58 verdes.
   **Desplegado y verificado en Hetzner (2026-07-10)**: `rsync` de
   `businessos/grafo/` al repo del server (sin commitear en git — mismo
   patrón que la sync de AGENTS.md), `ALTER TABLE categorias_gasto ADD COLUMN
   IF NOT EXISTS exclusiones ...` + reaplicar `02-seed.sql` (idempotente,
   sin recrear volumen — mismo patrón que Fase 8 original), `docker compose
   build grafo && up -d grafo`. Verificado con la pregunta EXACTA del
   incidente vía curl directo en `hermes-net`: ahora clasifica
   `AGENTES_SEGUROS`, cita Art. 91/93 LISF; y no-regresión confirmada (dron
   puro sigue cayendo en `DRONES_DELIVERY`). `grafo` arrancó sin errores.
3. Pendiente aún: probar el HILO NUEVO en `#dep-legal` con la pregunta real
   para confirmar que Slack/el agente ahora presenta la respuesta correcta
   end-to-end (el motor ya está arreglado; falta la prueba conversacional).
4. ~~Decisión pendiente de la dueña: expandir CNSF a más categorías (ramos,
   garantía/fianza de fidelidad del agente)~~ → **hecho (2026-07-10)**:
   - **Ramos** (bien fundamentado): `MX-LISF-25-93-RAMOS-AGENTE` — Art. 25
     LISF trae el catálogo oficial de operaciones/ramos de seguro (Vida;
     Accidentes y enfermedades; Danios con sus 12 subramos); Art. 93 dice que
     la autorización del agente se otorga POR ramo, no genérica. Bandera
     explícita: no existe un ramo "aviación"/"drones" en el catálogo — un
     seguro de RPAS caería en Danios pero el subramo exacto no está en el
     texto de la Ley, hay que confirmarlo con la CNSF/aseguradora.
   - **Garantía/fianza de fidelidad del agente**: investigado a fondo en el
     mismo PDF primario (Título Cuarto, Cap. Segundo, Art. 91-103) y **NO
     encontrado** — las únicas menciones de "fianza de fidelidad" en la Ley
     (Art. 36, 170) son un RAMO DE PRODUCTO que vende una Institución de
     Fianzas, no una garantía que el agente deba constituir. Decisión: NO
     inventar una regla; en vez de eso, el checklist de
     `MX-LISF-93-AUTORIZACION-AGENTE` ahora dice EXPLÍCITAMENTE "no se
     encontró" y apunta a que, si existe, vive en la Circular Única de
     Seguros y Fianzas (CUSF) de la CNSF — secundaria, no verificada aún.
     Mismo principio de "citar fuentes, no inventar" aplicado también a la
     AUSENCIA de una regla, no solo a su presencia.
   - 29 reglas, 32 impactos (antes 28/31). 1 test nuevo de regresión
     (`test_agente_seguros_checklist_incluye_ramos_y_flag_de_garantia_sin_verificar`).
     59/59 verdes. Desplegado en Hetzner: solo datos (sin cambio de esquema
     esta vez) vía `02-seed.sql` reaplicado + `docker compose restart grafo`
     (necesario porque `db.conocimiento()` cachea en memoria con
     `lru_cache` — sin restart, el proceso vivo sigue sirviendo el
     catálogo viejo aunque la fila ya esté en Postgres). Verificado en vivo:
     las 3 fuentes (`RAMOS-AGENTE`, `AUTORIZACION-AGENTE`,
     `DEBER-INFORMACION-AGENTE`) aparecen juntas en la respuesta real.
   - Si en el futuro se decide investigar la CUSF (documento secundario,
     mucho más largo) para completar examen/cédula/garantía con fuente
     primaria real, es un PRP aparte — no bloqueante hoy.

## ACTUALIZACIÓN 2026-07-24 — plantilla de investigación→seed (siguiente dominio: logística)

Elisa trajo un borrador de prompt para investigar la documentación electrónica de
exportación (e-AWB aéreo, BL marítimo, carta porte terrestre; vertical
freight-forwarder/GAL) y alimentar el grafo. Al revisarlo contra el esquema REAL
(`seed/reglas.json` + gate de `gen_seed_sql.py`), el borrador **inventaba un esquema
que el grafo no tiene** — `nodo_id`, `actor_afectado`, `subcategoria`, `nivel_certeza`,
`condicion/evidencia_minima`, y un vocabulario de 12 "veredictos" que mezclaba 5 ejes
(veredicto real + estatus de requisito + dependencia + accesibilidad de datos +
automatización/riesgo). Corrido tal cual habría producido output **no-sembrable**, con
total confianza (el peor fallo: un agente que no conoce el grafo genera el esquema
equivocado sin dudar).

**Entregado:** `grafo/PLANTILLA-INVESTIGACION-SEED.md` (companion del borrador, PR #144)
— trae el esquema correcto ADENTRO: `impactos[]` real, vocab de 3 valores
(`permitido`/`no_permitido`/`dudoso`, fail-safe `dudoso`), categorías por
keywords+exclusiones (recordando la colisión `AGENTES_SEGUROS` vs `DRONES_DELIVERY`),
checklist del gate, crosswalk de campos del borrador→esquema real, y **frontera dura
Salida A vs Salida B**. Ejemplo `EXPORT_AEREO_EAWB` VALIDADO (`gen_seed_sql.py --check`
= OK): veredicto `dudoso` porque estándar sectorial IATA (Res. 672) ≠ exigencia de
autoridad, con base legal MX (Ley Aduanera/RGCE/VUCEM) marcada como hueco de
conocimiento. Aún NO hay reglas de exportación en el seed — es el método, no el seed.

**Aprendizaje reusable (aplica a TODA investigación futura del grafo — seguros,
logística, más países):**
1. El grafo NO tiene entidad `nodo` ni `actor`. Fichas nodo-céntricas = **Salida A**
   (investigación/producto), no sembrables; modelar nodo como `regimen`/`banderas` o
   proponer extensión de esquema = **decisión de la dueña**, no un supuesto.
2. `veredicto_base` = 3 valores por dimensión (regulatorio: permitido/no_permitido/
   dudoso). "obligatorio/condicionado" es estatus de un `requisito` (string), NO un
   veredicto. Automatización/riesgo/transparencia = Salida A, nunca seed.
3. Exportación documental → dimensión `regulatorio`, `regimen: GENERAL` (no cruza a
   fiscal/contable/contractual).
4. Todo prompt de investigación→seed debe traer el esquema real embebido y validarse
   con `gen_seed_sql.py --check` antes de confiar. Ver [[fuentes-legales-mx]].

## Runtime al día (2026-08-04)
El grafo de producción quedó sincronizado con el repo: rebuild de la imagen (endpoints
de lectura App C paso 1, PR #225) + re-seed EN VIVO con `seed/02-seed.sql` (idempotente
por diseño: upserts sobre claves naturales + `_bajas` con cascade). Estado verificado:
33 reglas / 5 dimensiones (entró `datos-personales` del PR #198, que llevaba 3 días
mergeado sin aplicar), LFPDPPP 2010 retirada, 17 `evaluaciones` conservadas. Procedimiento
canónico del re-seed (gate `--check` → psql `ON_ERROR_STOP` → `docker restart grafo` →
smoke): CLAUDE.md aprendizaje 2026-08-04. Recrear el volumen queda como último recurso
(pierde `evaluaciones`).

## Fase A corporativo-mercantil MX (2026-08-07) — primer ámbito nacido de Pre-Discovery
Origen: caso Pre-Discovery de un holding de servicios legales; plan de expansión por
fases (A corporativo → B fiduciario/inmobiliario → C ambiental → D cabildeo; Financial
Consulting requiere dictamen de frontera LMV/CNBV antes de sembrar). Sembradas 9
categorías + 12 reglas (dimensión `regulatorio`, régimen GENERAL): LGSM 2/5/6 (constitución
+ irregulares), 10 (poderes, CCF 2554 como frontera civil), 19-20 (utilidades/reserva 5%
hasta 1/5, SAS exceptuada), 128-129 (registro de acciones + aviso PSM confidencial, reforma
DOF 14-06-2018), 178-182/186 (asambleas; ordinaria ≤4 meses; convocatoria PSM 15 días),
222-225 (fusión, 3 meses oposición), 228 Bis (escisión, 45 días naturales), 260-263 (SAS:
solo personas físicas → NO sirve de vehículo holding; tope $7,678,849.94 por Acuerdo DOF
26-12-2025); CFF 32-B Ter/84-M (beneficiario controlador, por CADA sociedad del grupo);
LFCE 86-90 (concentraciones COFECE). **Gotcha que pagó el cotejo primario**: los umbrales
del Art. 86 LFCE fueron REFORMADOS DOF 16-07-2025 (16M / 30%+16M / 7.4M+40M UMA) — la
memoria del modelo traía los viejos (18M/48M/8.4M); sembrar de memoria habría metido
cifras derogadas. Método: bajar el PDF de LeyesBiblio y extraer con pypdf (instalado en
`businessos/.venv`); scratchpad conserva los .txt de LGSM/CFF/LFCE de esta corrida.
Los tests del grafo fijan `reglas_total` (test_salud_conocimiento): todo cambio de seed
debe actualizar ese conteo en el MISMO cambio. Categorías nuevas verificadas contra el
clasificador real (frontera de palabra, sin colisiones con ARRENDAMIENTO ni
SERVICIOS_PROFESIONALES).

## Fase B fiduciario/sucesorio/inmobiliario MX (2026-08-07)
5 categorías + 8 reglas: LGTOC 381-389 (fideicomiso; fiduciaria AUTORIZADA — un despacho
no puede serlo; inscripción RPP si hay inmuebles; oponibilidad por tipo de bien en muebles),
LGTOC 394 (prohibiciones: secreto, sustituciones por muerte, >50 años con PM privada), CCF
(testamentos 1295-1511; sucesión legítima 1599/1602; compraventa 2317/2320 — umbral en
salarios mínimos pendiente de conversión UMA; registro 3007-3009) y LIE 2-VI/10-14 (zona
restringida 100/50 km: extranjeros solo vía fideicomiso bancario con permiso SRE, 50 años
prorrogables). **Gotcha estructural cazado en dev**: dos impactos con veredictos DISTINTOS
sobre la misma (categoría, régimen) hacen que el evaluador degrade TODO a `dudoso` con
bandera de conflicto — una regla de prohibiciones NO debe llevar `no_permitido` junto al
`permitido` general de su categoría; el patrón correcto es `veredicto_base: null` (aporta
requisitos/banderas sin pelear el veredicto, mismo contrato que ya toleraba el paso 1 de
App C). También: los `regimen` inventados (PROHIBIDOS/INTESTADO/MUEBLES) son impactos
MUERTOS — el evaluador solo casa el régimen del contexto o el wildcard GENERAL; en
dimensión regulatorio todo va en GENERAL. Bandera transversal sembrada: la materia civil
es LOCAL (CCF = referencia federal; cotejar código del estado).

## Fase C ambiental MX (2026-08-07)
5 categorías + 5 reglas: LGEEPA 28/30 (EIA: autorización PREVIA SEMARNAT, 10 fracciones —
inmobiliario costero y humedales son los supuestos que la due diligence pasa por alto),
111 Bis (fuentes fijas federales: lista cerrada de industrias; lo no federal es licencia
LOCAL), 38/38 Bis (auditoría ambiental voluntaria — puerta del servicio preventivo del
despacho), LGPGIR 5/42/44/46 (generadores por volumen: micro ≤400 kg/año, pequeño <10 t,
gran ≥10 t con registro+plan+bitácora+informe; manejo solo con gestores autorizados) y
LFRA 1/10 (responsabilidad objetiva: reparación > compensación; alcanza daño INDIRECTO →
bandera para holdings). Único veredicto `no_permitido` del ámbito: RESPONSABILIDAD_AMBIENTAL
(ocasionar daño genera responsabilidad) — único en su categoría, sin conflicto. Fuentes:
LGEEPA/LGPGIR DOF 19-01-2026, LFRA DOF 14-11-2025, leídas del PDF de Diputados.

## Fase D cabildeo/político MX (2026-08-07) — cierra el plan A-D de Pre-Discovery legal
3 categorías + 4 reglas: RegDip 263-268 (cabildeo con registro público POR LEGISLATURA,
cupos 20/comisión y 2/persona moral — planear qué personas del grupo se acreditan; veto a
servidores públicos y parientes hasta 4º grado; los documentos de cabildeo son PÚBLICOS),
RegSen 298-299 (sin registro formal: control por informes a la Mesa; cero dádivas), LGPP
54-1-f/g (no_permitido ABSOLUTO: personas morales no aportan a partidos/campañas — cubre
interpósita persona y especie; las físicas sí con topes → cotejar; ojo: incisos del 54
tocados por sentencia SCJN DOF 24-11-2023) y LGIPE 159-4/5 (no_permitido: nadie contrata
propaganda electoral en radio/TV; cubre por-cuenta-de-terceros y lo contratado en el
extranjero; redes sociales = régimen distinto, dictamen aparte). Hueco normativo declarado
en bandera: el cabildeo ante el EJECUTIVO federal no tiene registro equivalente. Los dos
no_permitido van únicos en su categoría (lección Fase B: sin conflicto de veredictos).
Con esto el plan A-D del caso Pre-Discovery legal queda sembrado completo; resta el
dictamen de frontera Financial Consulting (LMV/CNBV) antes de sembrar ese ámbito.

## Dictamen de frontera Financial Consulting (2026-08-07) — cierre de la línea Pre-Discovery legal
La etiqueta "Financial Consulting" es NO CONCLUYENTE: el tipo regulado (LMV 225, cotejado
del PDF, últ. reforma DOF 14-11-2025) exige habitual + profesional + sobre VALORES +
individualizada (asesoría) o administración de cartera con decisión por terceros. Reforma
DOF 28-12-2023: el asesor persona moral solo puede ser SC/SA/S de RL con objeto específico
y establecimientos EXCLUSIVOS ⇒ no se "agrega" el servicio a una operativa del holding:
vehículo dedicado. Finanzas corporativas/valuación/planeación/reestructura sin intermediar
valores = NO reservado. Fronteras vecinas más duras como banderas: captación (LIC, delito),
intermediación/fondos, Fintech. Entregables: `grafo/DICTAMEN-FRONTERA-FINANCIAL-CONSULTING.md`
(con 3 preguntas de discovery para la llamada) + regla sembrada MX-LMV-225-ASESOR-INVERSIONES
(categoría ASESORIA_INVERSIONES; keywords incluyen "financial consulting" y "consultoria
financiera" — más largas que la "consultoria" fiscal, ganan por longitud). El grafo cierra
en 63 reglas / 40 categorías; TODO el alcance de las notas del caso quedó cubierto.

## Puente Vercel→grafo (grafo-gate, 2026-08-07)
El bloque regulatorio del meeting-copilot (Vercel) caía al mock fiel porque el grafo vive
en hermes-net sin exposición. Puente construido SIN abrir el grafo crudo: servicio
`businessos/grafo-gate/` (FastAPI ~70 líneas) con token Bearer en comparación de tiempo
constante, fail-closed (sin GRAFO_GATE_TOKEN ≥32 chars NO arranca — verificado con la
imagen real), mínimo privilegio (solo POST /evaluaciones; /reglas y /salud-conocimiento
NO se publican), MAX_BODY 64KB espejado con el request_body del edge, y 502 logueado
(regla best-effort-no-silencioso). Publicado por el edge Caddy existente con site block
`grafo.167-233-233-56.sslip.io` (TLS automático; el 443 ya estaba abierto para ventas).
Los consumidores internos siguen en grafo:3000 sin token. Vercel: GRAFO_URL + GRAFO_TOKEN
(sensitive, server-only — /api/grafo/* además queda detrás del login del copiloto). El
token se genera EN el server (`openssl rand` → .env) y viaja a Vercel por pipe ssh→vercel
env add, sin tocar el transcript. 10 tests del gate + gates del copiloto verdes.

## Sector legal transversal — categoría SERVICIOS_LEGALES (2026-08-08)
El caso Baker (pre-discovery) mostraba VACÍO DEL GRAFO con giro "Legal": las fases A-D
sembraron las ÁREAS DE PRÁCTICA pero nada cubría el hecho transversal de OPERAR como
despacho. Se sembró SERVICIOS_LEGALES (transversal, NO área de práctica — respeta la
doctrina anti-etiquetas-amplias del vocabulario 2026-08-08) con 2 reglas leídas de los
PDF oficiales: MX-LRART5-24-26-EJERCICIO-PROFESIONAL (título registrado + patente de
ejercicio; Art. 26 rechaza asesores sin título; bandera: materia LOCAL, la ley citada es
CDMX; vigente_desde 2018-01-19 = última reforma del texto citado, lo que además la hace
RECTORA del dictamen por encima de la de lavado) y MX-LFPIORPI-17-XI-ACTIVIDAD-VULNERABLE
(servicios profesionales independientes como actividad vulnerable si preparan/ejecutan
operaciones de los incisos a-e por cuenta del cliente; Aviso solo al ejecutar en nombre
del cliente; obligaciones Art. 18; texto vigente últ. reforma DOF 16-07-2025). Grafo:
68 reglas / 43 categorías.

**Lección de keywords (ataque adversarial antes del PR):** la keyword desnuda "legal"
sobre-clasificaba 10 frases adjetivales plausibles ("capacidad legal", "domicilio legal",
"validez legal del contrato" → dictamen de despacho). El discriminador lingüístico que
funcionó: el uso SUSTANTIVO de la práctica legal casi siempre aparece como "de legal"
("Operación de Legal en México", el patrón del concepto del pre-discovery), mientras el
uso adjetival nunca lleva "de" antes. Keyword `de legal` + compuestos = 14/14 en la
sonda (4 positivos, 10 adversariales). En el espejo SECTORES del meeting-copilot, el
regex de sector JS casa por SUBCADENA (a diferencia de `_casa` en python, que tiene
frontera): "ilegales" contiene "legal" → usar `\blegal\b`, y el sector legal va AL FINAL
del arreglo para que logística/seguros/drones ganen con señal propia. El mock fiel de
grafo.ts ganó su regla legal espejo. PENDIENTE runtime: aplicar el seed al grafo vivo
(upsert psql + restart + smoke, procedimiento 2026-08-04) — desde la máquina con SSH.

---

## Comercio exterior MX (2026-09-02) — Ley Aduanera + Ley de Comercio Exterior

Primer ámbito nacido de un **caso de estudio de negocio** (importación-exportación MX con
corredores USA/China/LATAM), no de un Pre-Discovery. Lo disparó una medición: el
clasificador del propio grafo daba **0/24 en conceptos del núcleo aduanero** y 13/18 en la
periferia corporativa. El grafo no podía dictaminar el negocio, y su silencio era
indistinguible de su ignorancia.

**Resultado:** 13 reglas, 10 categorías, seed 68→**81 reglas / 84 impactos / 53
categorías**. Cobertura del dominio **0/24 → 13/24** (los 11 restantes son lo declarado
fuera de alcance). 106 tests del grafo (13 nuevos). Dimensión `regulatorio`, régimen
`GENERAL` — igual que los siete dominios anteriores; el repo **nunca** ha añadido una 6ª
dimensión y la `PLANTILLA-INVESTIGACION-SEED.md` lo prescribe literal para este dominio.

### Método de extracción de fuente primaria (reusable, y ya pagó)

`WebFetch` **no sirve para leer leyes**: devuelve el PDF como binario comprimido
(FlateDecode) y no lo decodifica — correctamente se niega a reconstruirlo de memoria. La
cadena que funciona es: descargar de `diputados.gob.mx/LeyesBiblio/pdf/` + extraer con
**`pypdf`, que está en `businessos/.venv`**.

La diferencia no es cosmética. El índice HTML del sitio, resumido por un modelo pequeño,
daba *"Ley Aduanera, última reforma DOF 27/12/2025"*. El **texto real** dice
`Última reforma publicada DOF 19-11-2025`; el 27-12-2025 es la actualización de cantidades
por Reglas Generales de Comercio Exterior. El resumen conflacionó dos fechas distintas, y
esa fecha habría entrado en `fuente_cita` y `vigente_desde` de **cada** regla del ámbito.
Hermano de la lección 2026-08-02: *nada normativo se transcribe desde un intermediario*.

Gotchas del parseo: **cada ley usa un formato de encabezado distinto** — Ley Aduanera
`ARTICULO 59.` (mayúsculas sin acento, 277 ocurrencias) y LCE `Artículo 15.-` /
`Artículo 1o.-`. Un extractor por regex debe aceptar ambos, y **anclar al encabezado real**:
buscar `ARTICULO 59` a secas engancha la referencia cruzada *"artículo 59-A de la presente
Ley"* dentro de otro artículo. El desempate que funcionó: de todas las apariciones, el
encabezado verdadero es el que abre el **bloque más largo**.

Para artículos sin anotación de reforma, `vigente_desde` sale del transitorio de la propia
ley: Ley Aduanera **1996-01-01**, LCE **1993-07-28** (día siguiente a su publicación).

### `dudoso` DECLARADO vs `dudoso` accidental — la distinción que hay que testear

Dos de las diez categorías salen `dudoso` **a propósito**, y eso es distinto de "sin regla
aplicable": `CLASIFICACION_ARANCELARIA` (la Tarifa de la LIGIE no está sembrada — y es una
tabla, no reglas) y `PRACTICAS_DESLEALES` (que una mercancía concreta esté gravada con
cuota compensatoria depende de una resolución por producto y origen que vive en el DOF).
Ambas devuelven `dudoso` **con fuente y con bandera que nombra el hueco**, no
`razon == "sin regla aplicable"`. Los tests fijan justo esa diferencia, porque es la que
convierte un límite honesto en información útil en vez de un vacío mudo.

`INFRACCIONES_ADUANERAS` es el único `no_permitido` y va **solo en su categoría** — la
lección de Fase B: dos veredictos distintos vivos sobre la misma categoría disparan la
bandera de contradicción. Las cuatro reglas de `REGULACIONES_NO_ARANCELARIAS` comparten
veredicto `permitido` y por eso solo suman checklist, sin conflicto.

### Vocabulario

Cero colisiones entre 35 términos candidatos y las 348 keywords existentes: el dominio
aduanero estaba libre. Convivencia resuelta por longitud: `aduana` (DESPACHO_ADUANERO) y
`valor en aduana` (VALOR_ADUANA) coexisten porque el clasificador toma la keyword **más
larga** — hay test que lo fija. `ORIGEN_MERCANCIAS` excluye *"origen de los recursos"* para
no chocar con el lenguaje de prevención de lavado ya sembrado. Se **descartaron** a
propósito keywords amplias como `importacion` o `exportacion` desnudas: clasificarían
cualquier mención genérica en una sola categoría y darían un dictamen seguro de sí mismo
sobre una pregunta que nadie hizo (doctrina anti-etiquetas-amplias, 2026-08-08).

### Deuda que este trabajo destapó y NO cierra — ✅ CERRADA el mismo día (ver sección siguiente)

El escáner del Pre-Discovery (`meeting-copilot/src/features/pre-discovery/
escaneo-regulatorio.ts`) espera para el sector logística las categorías
`CARGA_AEREA_EAWB` y `AUTOTRANSPORTE_CARGA`, **que no existen en el seed**; su mock
(`grafo.ts`) sí las inventa con citas IATA/LCPAF. Con el grafo real un forwarder sale
`sin regla aplicable`; con el mock sale `permitido` **con fuentes**. Divergencia silenciosa
mock-vs-real en el sector vecino a este ámbito. Salen de Ley de Caminos e IATA, fuera de
las dos leyes sembradas aquí.

**PENDIENTE runtime:** aplicar `02-seed.sql` (idempotente) + `docker restart grafo`
—obligatorio por el `lru_cache` de `db.py`— + smoke de conteos. Bloqueado: el servidor de
Hetzner tiene la red cortada por el proveedor desde ~2026-08-27.

## Logística MX (2026-09-02) — LCPAF + Ley de Aviación Civil, y la deuda que se cierra

Mismo día que comercio exterior, y consecuencia directa suya: al sembrar ese ámbito quedó
nombrada una deuda —el escaneo regulatorio del Pre-Discovery esperaba para el sector
logística las categorías `CARGA_AEREA_EAWB` y `AUTOTRANSPORTE_CARGA`, **el seed no las
tenía**, y su mock sí las dictaminaba **citando IATA Res. 672 sin ningún anclaje en ley
mexicana**. Con el grafo real un forwarder salía `sin regla aplicable`; con el mock salía
`permitido` con fuentes. Divergencia silenciosa, del mismo linaje que el fallback del
Pre-Discovery (2026-08-08).

**Resultado:** 2 reglas, 2 categorías, seed 81→**83 reglas / 86 impactos / 55 categorías**.
Las tres expectativas del sector logística del escáner (`CARGA_AEREA_EAWB`,
`AUTOTRANSPORTE_CARGA`, `AGENTES_SEGUROS`) quedan satisfechas. 119 tests del grafo.

### El hallazgo que cambia el dictamen: la guía aérea SÍ tiene base mexicana

El mock —y la plantilla, que anticipaba `dudoso` por "estándar sectorial ≠ exigencia de
autoridad"— asumían que del lado mexicano no había nada. Leyendo la Ley de Aviación Civil
apareció el **Art. 55**: el contrato de transporte de carga *"deberá constar en una carta
de porte o guía de carga aérea"* que el concesionario expide al embarcador, *"cuyo formato
se sujetará a lo especificado en la norma oficial mexicana respectiva"*.

Eso reordena todo: el veredicto es `permitido` **con base nacional**, y lo que queda como
bandera declarada es la parte que de verdad no se puede afirmar — **que la forma
ELECTRÓNICA (e-AWB) satisfaga el requisito de forma del Art. 55**, porque esa NOM no está
sembrada. La Resolución 672 de IATA baja a donde le corresponde: estándar sectorial que
acredita práctica de la industria, no cumplimiento del Art. 55. Lección: antes de declarar
un hueco de conocimiento, **buscar la ley nacional** — la plantilla acertó en el método y
se equivocó en el supuesto.

### LCPAF: el límite de responsabilidad es una decisión económica

`AUTOTRANSPORTE_CARGA` sale de LCPAF Arts. 8o. fr. I/IV/XI (permiso de la Secretaría para
autotransporte federal de carga, paquetería y mensajería, y transporte privado), 50
(alcance y permiso especial por objetos voluminosos), 66 (responsabilidad desde la
recepción hasta la entrega, con cinco excepciones) y 68 (garantía de daños; en materiales
peligrosos, cobertura de puerta a puerta).

El dato con filo del Art. 66 fr. V: si el usuario **no declara el valor**, la
responsabilidad queda limitada a **15 días de salario mínimo por tonelada**. Declarar el
valor no es un trámite, es una decisión económica. Y el texto refiere el *"salario mínimo
general vigente en el Distrito Federal"*, denominación anterior a la UMA → bandera de
conversión pendiente, mismo patrón que los 365 salarios mínimos del CCF (Fase B).

### Vocabulario: dos modos que comparten término

`carta de porte` la usan LCPAF y LAC ("carta de porte o guía de carga aérea"). Como las
keywords son globalmente únicas, se asignó a `AUTOTRANSPORTE_CARGA` y el aéreo se protege
por dos vías: keyword más larga (`carta de porte aerea` gana a `carta de porte`) y
**exclusiones cruzadas** entre modos, con test que fija ambas. `carta porte` (sin "de") se
añadió a propósito **con su hueco declarado**: el complemento Carta Porte del CFDI es
obligación fiscal de la RMF/RGCE, fuera del grafo — clasificar y nombrar el límite es mejor
que quedarse mudo ante un término que todo transportista usa.

### El mock se alineó, y sus tests cazaron el cambio

`grafo.ts` del copiloto declara en su encabezado ser *"mock FIEL (mismas claves de regla
del seed real)"* y llevaba tiempo sin serlo. Se actualizaron claves, citas y vigencias
(entre ellas LCPAF, que el mock fechaba el 22-12-1993, su publicación, cuando entró en
vigor **al día siguiente**). Dos vitest fijaban las citas viejas y se pusieron rojos — buena
señal: existían para eso. 364 vitest verdes tras actualizarlos.

**PENDIENTE runtime:** igual que comercio exterior, bloqueado por la red cortada del
servidor. Esperado al aplicar: 83 reglas / 55 categorías.


## T-MEC (2026-09-03) — el hueco que las dos siembras anteriores dejaron declarado

La regla doméstica de origen (Ley Aduanera 59 y 36-A) traía una bandera honesta: *"las
reglas de origen concretas viven en cada tratado y NO están sembradas en este grafo"*.
Esta siembra la cierra a medias y **lo dice**: entra el marco del T-MEC (Capítulos 4, 5 y
7), no las reglas por producto. La bandera vieja se reescribió en el mismo cambio, con
test que la fija — una bandera que se vuelve falsa es peor que no tenerla, porque el grafo
sigue sonando seguro mientras miente.

15 reglas y 6 categorías (`TMEC_TRATO_PREFERENCIAL`, `TMEC_CERTIFICACION_ORIGEN`,
`TMEC_REGLAS_ORIGEN`, `TMEC_VERIFICACION_ORIGEN`, `TMEC_ENVIOS_ENTREGA_RAPIDA`,
`TMEC_RESOLUCIONES_ANTICIPADAS`), más un impacto del Art. 7.20 en la categoría existente
`REPRESENTACION_ADUANAL`. Fuente: textos finales de la Secretaría de Economía (gob.mx),
promulgados DOF 29-06-2020, en vigor 01-07-2020; PDF leídos con `pypdf`.

### La numeración real desmiente a los resúmenes

Escribir de memoria habría citado artículos inexistentes: en el T-MEC **5.2 es Solicitudes
de Trato Preferencial**, 5.3 Bases de la Certificación, **5.5 Excepciones** (no 5.3) y
**5.11 Devoluciones** (no 5.5). El hábito del repo —leer el PDF oficial, no el blog— es lo
único que separa una cita correcta de una plausible.

### El invariante que este ámbito casi rompe: un veredicto por categoría

`evaluador.evaluar_concepto` reporta **contradicción** y degrada el dictamen a `dudoso`
cuando dos veredictos distintos viven en la misma categoría. El gate `gen_seed_sql.py
--check` **no puede verlo**: valida regla por regla, y la contradicción solo nace al
juntarlas. Patrón adoptado (que el seed ya usaba en Fase B con las prohibiciones del
LGTOC 394): **una sola regla rectora por categoría** y las complementarias con
`veredicto_base: null` — siguen aportando requisitos, banderas y su fuente al dictamen,
sin votar. Por eso el Art. 7.20 entra sin veredicto en `REPRESENTACION_ADUANAL`: la Ley
Aduanera 40 sigue siendo la rectora y el tratado suma su cita. Verificado en el control de
reversión: al darle veredicto propio a una complementaria, el gate siguió **verde** y dos
tests se pusieron **rojos**.

### Dos `dudoso` por fail-safe declarado

- `TMEC_REGLAS_ORIGEN`: el **Anexo 4-B** (reglas específicas por producto) no está
  sembrado, así que el grafo no puede decir si una mercancía concreta califica. La salida
  útil no es un veredicto: es el checklist + la ruta del Art. 7.5 (resolución anticipada),
  que es exactamente la vía para resolver lo que el grafo no puede.
- `TMEC_ENVIOS_ENTREGA_RAPIDA`: el Art. 7.8 obliga a México a un **piso** (117 USD para
  aranceles, 50 para impuestos), no otorga la exención a un envío concreto; el monto
  aplicable lo fija el ordenamiento doméstico, que ha cambiado varias veces desde 2020.
  Tratar el número del tratado como si fuera la regla vigente es el error típico del tema.

### Vocabulario: el tratado entra por su propia puerta

`certificacion de origen` (T-MEC) y `certificado de origen` (Ley Aduanera) son términos
distintos y así se repartieron; `certificado de origen t-mec` gana por keyword más larga.
Test explícito de que el T-MEC **no le roba** consultas al ámbito doméstico ya sembrado
(pedimento, valor en aduana, carta porte, guía aérea, agente aduanal siguen donde estaban).
En el mock del copiloto el patrón exige vocabulario del tratado: *"exportamos autopartes a
Estados Unidos"* sigue saliendo **sin regla aplicable**, en vez de recibir un dictamen que
nadie pidió.

Seed 83→**98 reglas / 61 categorías**; gate OK; **132 tests** del grafo (13 nuevos) y 366
vitest del copiloto (+2).

**PENDIENTE runtime:** se suma a la cola de comercio exterior y logística, bloqueada por la
red cortada del servidor (Hetzner, `ipv4.blocked` desde ~27-28 de agosto). Esperado al
aplicar: **98 reglas / 61 categorías**, `evaluaciones` intactas.
