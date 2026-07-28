# Departamento: Contratos Inteligentes (paquete de competencias)

> Departamento del trío (ver `SPEC-trio.md`). Un departamento = **(1) tareas del
> Ejecutor + (2) reglas de validación del Supervisor + (3) fuentes de conocimiento**.
> Añadir un departamento = definir este paquete, no desplegar agentes nuevos.
>
> **Estado (2026-07-27): Fases 1-5 del PRP-013 construidas y verificadas en dev.**
> El departamento está dado de alta en `trio-contrato/contrato.py::DEPARTAMENTOS`
> (alta al cerrar Fase 4, 2026-07-20). El pipeline completo existe: spec → Engine
> determinista → gates fabric del Supervisor → `contratos_sc` → gate de red efímera
> (host-job) → aprobación humana en Mission Control (`/contratos`) → despliegue con
> doble firma (host-job). **Aún NO opera contratos reales**: falta la firma de
> auditoría de escrow-v1 (bloquea fabricación real), el nodo sandbox con
> fabric-samples y la ceremonia de llaves tier 1 — todo converge en la Fase 6.

---

## Qué vende este departamento

**Contratos operados, no código.** La fábrica convierte requerimientos conversacionales
en chaincode de Hyperledger Fabric generado sobre **plantillas auditadas** (jamás código
libre), verificado en una **red efímera**, desplegado solo con **doble aprobación
humana** (cola + lifecycle de Fabric a dos organizaciones). Después, el **PM/oráculo**
(PRP-014) opera el contrato: hitos, evidencias con hash on-chain, incumplimientos con
catálogo cerrado de acciones, expediente y acta.

Narrativa comercial (adenda web agéntica): no vendemos "smart contracts", vendemos
**infraestructura de confianza para la web agéntica** — contratos donde humanos Y
agentes transaccionan con garantías de protocolo (Constraint + Proof), con fee de
fabricación + fee recurrente de operación (Polar).

## Quién hace qué (las dos verticales + la dueña)

| Actor | Rol en el departamento | Qué JAMÁS hace |
|-------|------------------------|----------------|
| **Hermes Clientes** | Captura requerimientos conversacionales del cliente y los convierte en `sc_spec` YAML; presenta la spec al humano para confirmar ANTES de encolar. Canal de evidencias en operación | Encolar sin confirmación humana; enviar nada sensible sin aprobación |
| **Hermes Negocio** | Encarga y orquesta la fabricación (patrón skill `trio-software`: arma la tarea, la encola al trío, reporta acuse y estado). Reporta costo por `token_usage.task_id` | Escribir código; aprobar; tocar credenciales |
| **Trío/enjambre** (Coordinador→Ejecutor→Supervisor) | Descompone, parametriza plantillas con `FabricChaincodeEngine`, re-gatea de cero con el perfil "fabric" | El Ejecutor no se auto-aprueba; el Supervisor no despliega; el Coordinador no genera código |
| **La dueña** | Audita y FIRMA cada plantilla del catálogo una vez; aprueba cada contrato en Mission Control; oficia la ceremonia de llaves | Aprobar por fatiga: el paquete de revisión pone las banderas G1 arriba (anti-sello-de-goma G4) |
| **Host-job `verificar-red-efimera.py`** (Fase 5) | Antes de la aprobación: test network real, CADA transición con los roles declarados + negativos; `fabricando → en_revision` o `escalado` | Aprobar; correr en el contenedor del juez |
| **Host-job `desplegar-chaincode.py`** (Fase 5) | package → install → approveformyorg (op **y** tg) → commit, SOLO sobre filas `aprobado`, re-verificando el hash aprobado (G5); `--sequence` leído de `contratos_sc` | Decidir; correr sobre filas no aprobadas |

## 1. Tareas que sabrá hacer el Ejecutor (cuando el pipeline esté vivo)

| Tarea | Apoyo |
|-------|-------|
| Fabricar chaincode desde una `sc_spec` confirmada | `FabricChaincodeEngine` (Fase 3): parametriza plantillas del catálogo, jamás reescribe |
| Generar tests de `criterios_aceptacion` de la spec | Mismo patrón de mocks por embedding de `escrow_test.go` |
| Evolucionar un contrato en operación (spec v(n+1)) | Ciclo SDD completo de vuelta + `--sequence`+1 (PRP-014 §evolución) |

**Catálogo de plantillas** (crece SOLO con auditoría humana firmada):
1. `escrow-v1` — depósito en garantía con árbitro. ✅ **Auditada y FIRMADA** (Elisa, 2026-07-28; riesgo #1 aceptado para v1 — acta en README-auditoria).
2. `escrow-v2` — + oráculo acotado, vencimientos, acción por defecto (PRP-014).
3. `registro-agentes-v1` — identidad/reputación/validación de agentes, espejo
   permisionado de ERC-8004 (adenda web agéntica §3).

## 2. Reglas de validación del Supervisor (perfil "fabric", Fase 4 — pendiente)

`go build` → `go vet` → `gosec` → escaneo de dependencias (O5) → tests unitarios →
**gate de red efímera**: levantar test network, desplegar, ejecutar CADA transición de
la spec con los roles declarados, verificar eventos y casos negativos (rol sin permiso
rechazado POR EL CHAINCODE). Todo o escalada — jamás "aprobado por partes".

Reglas propias del dominio (además de los gates):
- Checklist de determinismo del chaincode (README-auditoria de cada plantilla): cero
  `time.Now()`, cero aleatoriedad, cero red/fs/env, cero iteración de mapas hacia el
  estado; el único reloj es `GetTxTimestamp`.
- El diff contra la plantilla base debe quedar acotado a los puntos de parametrización.
- Un gate que el juez corre incondicionalmente es requisito del contrato: los criterios
  de la tarea siempre lo mencionan (aprendizaje 2026-07-12 del repo).

## 3. Fuentes de conocimiento

| Artefacto | Dónde | Estado |
|-----------|-------|--------|
| PRP de la fábrica (Fase 12) | `.claude/PRPs/prp-fase12-fabrica-sc.md` | EN PROGRESO (F1-2 hechas) |
| PRP del PM/oráculo (Fase 13) | `.claude/PRPs/prp-fase13-pm-oraculo.md` | APROBADO |
| Contrato de la spec + tests | `businessos/fabrica-sc/contrato_sc.py` + `tests/` | ✅ 23 tests verdes |
| Plantilla escrow-v1 | `businessos/fabrica-sc/plantillas/escrow-v1/` | 🟡 código hecho, firma de auditoría PENDIENTE |
| Arquitectura de red (tiers, identidades, RAM) | `departamentos/contratos-inteligentes/arquitectura-red-fabric.md` | Adoptada |
| Kit IaC red tier 1 + ceremonia de llaves | `businessos/red-tier1-iac/` (+ `CEREMONIA.md`) | Escrito; NO probado contra Docker real |
| Modelo de amenazas (O1-O6, G1-G6) | `businessos/gobernanza/modelo-amenazas-v1.md` | Vivo |
| Web agéntica (confianza, AP2, x402, ERC-8004) | `businessos/gobernanza/adenda-web-agentica.md` | Adoptada |
| ISO 42001 / AISIA | `businessos/gobernanza/adenda-iso42001.md` | Adoptada (AIMS-lite pendiente) |
| Gobernanza de ciclo de vida (CDC, regresión de agentes, lineage) | `businessos/gobernanza/gobernanza-ciclo-de-vida.md` | Adoptada (controles pendientes de construir) |

## Topología de red por tier (resumen; detalle en arquitectura-red-fabric.md)

- **Tier Gate**: red efímera (test-network, muere con el test). En nodo Hetzner
  aparte y **EFÍMERO** (decisión 2026-07-19, ajustada 2026-07-28 al agotarse la
  línea CX: el nodo se crea/corre/destruye por corrida con
  `fabrica-sc/sandbox-efimero.sh`, ~$0.04 y ~2 min por ciclo; cero costo fijo,
  cero competencia de RAM con el cx33).
- **Tier 1**: SaaS compartido, canal por cliente. Org-Operadora + **Org-Testigo**
  (llaves separadas de verdad — la ceremonia lo garantiza); honestidad comercial: el
  valor es el ledger auditable + operación del PM, no descentralización.
- **Tier 2**: el cliente aporta su org y co-firma el chaincode — confianza de protocolo
  literal (argumento de venta de la web agéntica).
- **Tier 3**: red del cliente, marca blanca.

## Decisiones fundacionales (2026-07-19, registradas en DECISIONES.md)

1. Sandbox Fabric en nodo Hetzner aparte (no en el cx33).
2. Chaincode v1 en Go; primera plantilla: escrow.
3. Oráculo v1 transaccional acotado (techo: `registrar_evidencia` + `declarar_vencido`).
4. Default de disputa vencida: `reembolsar_comprador`.
5. Evidencia: hash sha256 on-chain + archivo en Supabase Storage.
6. Numeración reconciliada: fábrica = Fase 12/PRP-013; PM/oráculo = Fase 13/PRP-014
   (el material externo llegó como "Fase 8/9, PRP-008/009").

## Qué falta para operar (en orden)

1. ~~Firma de auditoría de escrow-v1~~ ✅ (Elisa, 2026-07-28 — acta con riesgo #1
   aceptado para v1; la fabricación real queda DESBLOQUEADA).
2. ~~Fases 3-5 del PRP-013~~ ✅ (Engine 07-20; gates fabric 07-20; aprobación+
   despliegue 07-27). Queda la Fase 6 (e2e real: Telegram → contrato vivo).
3. ~~Alta del departamento~~ ✅ (2026-07-20). Skill de encargo (patrón
   `trio-software`) pendiente de la Fase 6.
4. ~~Nodo Hetzner del sandbox~~ ✅ efímero operativo (2026-07-28, smoke verde).
   Queda la ceremonia de llaves de la red tier 1 (`CEREMONIA.md`, 2-3 h, con acta).
5. PRP-014 completo (pm-a2a).

## Anti-patrones del departamento

- NO activar el departamento en el contrato del trío antes de que el Supervisor tenga
  gates fabric ejecutables (config inválida por diseño).
- NO generar chaincode fuera del catálogo auditado, nunca.
- NO mezclar credenciales de fabricación con credenciales de despliegue.
- NO custodiar llaves de las partes.
- NO prometer rutinas/capacidades en AGENTS/SOUL de las verticales antes de que existan
  (aprendizaje 2026-07-12: documentado ≠ aplicado).
