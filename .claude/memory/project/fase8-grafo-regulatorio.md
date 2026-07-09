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
