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
