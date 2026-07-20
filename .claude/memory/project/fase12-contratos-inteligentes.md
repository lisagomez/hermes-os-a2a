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

**Pendiente**: firma de auditoría de escrow-v1 por la dueña (sin firma NO hay
fabricación real, aunque el pipeline ya funciona técnicamente); Fase 5 (aprobación
humana + `desplegar-chaincode.py` + host-job `verificar-red-efimera.py` — la red
efímera de Fabric NO corre en el contenedor del Supervisor por diseño, sin socket
Docker); Fase 6 (validación end-to-end real); todo el PRP-014 (pm-a2a); nodo Hetzner
del sandbox; ceremonia de llaves; tabla `contratos_sc` en Supabase.

Detalle completo del gotcha de Dockerfiles/imports y la verificación del toolchain: el
propio PRP (`prp-fase12-fabrica-sc.md`, sección Aprendizajes, entrada 2026-07-20).
