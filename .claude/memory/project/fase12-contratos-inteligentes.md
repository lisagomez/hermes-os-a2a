# Fase 12 — Departamento de Contratos Inteligentes (fábrica de Smart Contracts, Fabric)

Departamento fundado 2026-07-19 integrando un paquete redactado fuera del repo
(numeración real: Fase 12/PRP-013 la fábrica, Fase 13/PRP-014 el PM/oráculo — el
material externo llegó mal numerado como "Fase 8/9"). PRP:
`.claude/PRPs/prp-fase12-fabrica-sc.md`. Departamento:
`businessos/departamentos/contratos-inteligentes.md`.

**Qué hace**: convierte requerimientos conversacionales en una `sc_spec` YAML
validada en frío, que el `FabricChaincodeEngine` materializa **parametrizando
plantillas auditadas** (jamás código libre — v1: `plantillas/escrow-v1/`, chaincode Go
determinista con tests generados desde la spec), el Supervisor re-gatea de cero, y el
despliegue exige doble candado humano (cola de Hermes OS + lifecycle de Fabric a dos
organizaciones, Operadora + Testigo).

**Estado 2026-07-20 (rama `feat/fase12-fabrica-sc`)**: Fases 1-4 integradas y
verificadas.
- Fase 1 (contrato de la spec) y Fase 2 (plantilla escrow-v1) ya estaban hechas.
- Fase 3 (`FabricChaincodeEngine` en el Ejecutor, vía `RouterEngine`: el departamento
  contratos_inteligentes va SIEMPRE a la fábrica determinista, nunca al LLM) y Fase 4
  (perfil de gates "fabric" en el Supervisor: 4 chequeos estáticos + build/vet/gosec/
  mod-verify/test de Go) llegaron completas en código pero SIN correr contra el árbol
  real. Al mapear contexto se encontraron y corrigieron 3 bugs reales: un módulo nuevo
  (`chequeos_fabric.py`) sin su import expreso (`ConfigInvalida` al arrancar el
  Supervisor); los Dockerfiles del Ejecutor y el Supervisor sin el `COPY` de los
  archivos/directorio `fabrica-sc/` nuevos NI el toolchain Go/gosec que sus propios
  gates declaran (habría sido crash-loop / rechazo automático en producción); y dos
  tests preexistentes con aserciones desactualizadas.
- Verificación real (no solo unit tests de Python): Go 1.24.5 + gosec v2.28.0
  (mismos pines ahora en el Dockerfile del Supervisor, checksum del tarball de Go
  verificado contra go.dev/dl) corriendo sobre un paquete recién fabricado por el
  Engine — build/vet/mod-verify OK, 7/7 tests generados, gosec 0 issues/350 líneas
  (igual que la auditoría manual de Fase 2).
- 281 tests verdes en los 5 servicios tocados (fabrica-sc, trio-contrato, ejecutor-a2a,
  supervisor-a2a, coordinador-a2a). `trio-contrato/contrato.py::DEPARTAMENTOS` ya
  incluye `contratos_inteligentes` (activado al cerrar Fase 4, como estaba previsto).

**Fase 5 HECHA (2026-07-27, rama `feat/fase12-fase5-aprobacion-despliegue`)**:
- `contratos_sc` APLICADA a producción. **Un escritor por transición**: Ejecutor
  crea `fabricando` (con manifest, hash G5, banderas G1, lineage `origen`);
  `verificar-red-efimera.py` → `en_revision`/`escalado`; la dueña decide en
  Mission Control `/contratos`; `desplegar-chaincode.py` → `desplegado`.
- Banderas G1 por fin EN CÓDIGO (`fabrica-sc/banderas.py`): plazo sospechoso,
  concentración de poder, condición unilateral (= poder SIN regla; el resolver
  del árbitro con plazo NO es bandera). La escrow canónica levanta 2 a
  propósito — hallazgos reales de la plantilla, fijados en tests.
- Gate de red efímera: plan PURO (cada transición sobre instancia fresca por
  BFS + negativos solo con credencial que de verdad no autoriza + query de
  estado tras cada transición) + runner fabric-samples pluggable. Specs con
  MSPs fuera de Org1/Org2 → `no_ejecutable` → escala (nunca aparentar).
- `desplegar-chaincode.py`: solo filas `aprobado` (guard también en el WHERE
  del PATCH), G5 antes de package/install, doble firma op+tg (MAJORITY),
  secuencia leída de la fila, aviso por `hermes send`.
- `/contratos` en Mission Control: banderas ARRIBA (G4), renglón O1, decisión
  con sesión autenticada (aprobado_por de la sesión, jamás del form), rechazo
  con motivo obligatorio, tiempo-en-revisión como métrica de fatiga.
- 440 tests python + 35 MC verdes; imagen del Ejecutor reconstruida (gate).

**Firma de auditoría de escrow-v1: HECHA** (Elisa Gómez Quäly, 2026-07-28, sesión
guiada: gates frescos en el toolchain del juez + sha256 repo↔imagen idéntico;
riesgo #1 —`entregado` sin contra-jugada del vendedor— ACEPTADO para v1 con
mitigación fuera de cadena; disputa desde `entregado` = alcance escrow-v2).
La fabricación real queda desbloqueada.

**Pendiente**: Fase 6 (e2e real: los runners de red efímera y lifecycle
contra una red Fabric VIVA — nodo sandbox con fabric-samples + ceremonia de
llaves tier 1 + skill de encargo patrón trio-software); todo el PRP-014
(pm-a2a). Gotchas nuevos en el PRP (aprendizajes 2026-07-27).

Detalle completo del gotcha de Dockerfiles/imports y la verificación del toolchain: el
propio PRP (`prp-fase12-fabrica-sc.md`, sección Aprendizajes, entrada 2026-07-20).

**Sandbox EFÍMERO (2026-07-28)**: la línea CX ($6.49/mes) se agotó en toda la
nube Hetzner (solo CPX/CCX a 3.5×) → decisión de Elisa: nada de nodo fijo a
$22.99/mes; `fabrica-sc/sandbox-efimero.sh` crea un cpx22 (nbg1) con cloud-init
(docker + Go 1.24.5 checksum-pineado + Fabric 2.5.9), corre el gate y lo
DESTRUYE con verificación en vivo (trap EXIT + modo `status` para huérfanos).
Smoke verde: ciclo completo ~2 min, cloud-init 1:35, ~$0.04/corrida. Gotchas
del CLI impreso hcloud: recursos top-level (`servers list`, NO `api servers
list`), `delete` POSICIONAL (`delete <id>` — `--id` falla), y el primer
huérfano sobrevivió porque el delete estaba silenciado con `>/dev/null || true`
(reincidencia del 2026-07-13: todo best-effort imprime; la verificación de
borrado lo cazó). El HCLOUD_TOKEN vive SOLO en dev; jamás viaja al sandbox.

**Kit de ceremonia VALIDADO en dry-run (2026-07-28, nodo efímero)**: 01→05
verdes end-to-end con los 8 hallazgos corregidos EN el kit: (1) registros sin
`--id.maxenrollments 1` — el "secreto de un solo uso" servía 2 veces; (2) 03
pedía `--enrollment.attrs "rol=oraculo"` (nombre con =valor, bug de recorte) —
se quitó: `:ecert` ya embebe el atributo, y ahora se VERIFICA en el cert;
(3+6) hoja-como-raíz DOS veces: tls-cert.pem (hoja del server CA) copiado como
cacert del MSP (orderer paniquea "failed to traverse chain") y como tlscacert
(join block rechazado "CA Certificate did not have the CA attribute") — usar
SIEMPRE ca-cert.pem; (4) orderer sin `ORDERER_GENERAL_BOOTSTRAPMETHOD=none`
paniquea buscando genesisblock (la red une por participación/osnadmin);
(5) `--tls.certfiles` RELATIVO se resuelve contra FABRIC_CA_CLIENT_HOME (no
CWD) — el bloque de Máquina B ahora exige path absoluto; (7) `peer` exige
core.yaml (default /opt/fabric-samples/config vía CORE_YAML_DIR); (8) la CRL
debe publicarse en el MSP LOCAL del peer (peer0/msp/crls), no solo en el de
org — sin eso el rechazo de revocados jamás se observa. Verificación final:
identidad revocada → access denied DEL PEER + control positivo verde. Un
rechazo por la razón equivocada no prueba nada (el primer intento falló por
NodeOUs del cliente, no por la CRL).
