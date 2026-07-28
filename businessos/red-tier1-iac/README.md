# red-tier1 — IaC de la red Fabric tier 1 + Ceremonia de llaves

Kit de infraestructura de la red de producción tier 1 definida en
`arquitectura-red-fabric.md`: 2 organizaciones (Operadora + Testigo), 3 CAs
(TLS + una por org), 1 orderer Raft (SPOF documentado), LevelDB, políticas de
canal a doble firma (MAJORITY con 2 orgs = ambas).

## Orden de ejecución
El orden lo marca **CEREMONIA.md** (léelo completo ANTES de tocar nada):
Fase 0 preparación → `01-cas.sh` → respaldo de raíces → `02-identidades-infra.sh`
→ enroll del admin Testigo EN MÁQUINA B → `03-identidades-servicio.sh` →
sellado de respaldos → `04-red-y-canal.sh <canal>` → unión del peer Testigo por
el admin Testigo → `05-simulacro-revocacion.sh` → acta firmada.

## Requisitos
- Docker + docker compose en la Máquina A (nodo dedicado, ≥4 GB libres).
- Binarios Fabric pineados a `.env` en A y B:
  `curl -sSL https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh \
     | bash -s -- --fabric-version 2.5.9 --ca-version 1.5.12 binary`
- Gestor de contraseñas + 2 USB cifrados (ver CEREMONIA.md).

## Límites conocidos (honestidad de v1)
- **No probado en este entorno** (sin red ni Docker aquí): el primer despliegue
  real requerirá ajustes menores de rutas/SANs — presupuestar media jornada.
  Verificado: sintaxis bash de los 5 scripts, YAML de composes y configtx.
- Orderer único = SPOF conocido; plan de 3 nodos en 2 máquinas al primer cliente
  pagando (arquitectura §5).
- Al primer `docker pull`, fijar el digest sha256 de cada imagen en los composes
  (misma disciplina que Hermes v2026.6.19).

## Integración
- El host-job `desplegar-chaincode.py` (PRP-013 F5) firma con
  `admin-despliegue-op`; la 2ª aprobación la ejecuta el admin Testigo (B).
- `oraculo-pm` → `businessos/pm-a2a/identidad/` (PRP-014).
- `listener-hermes` (solo lectura) para el listener de eventos.
- CDC (gobernanza ciclo de vida): cambios a este kit = cambio de infraestructura
  con PRP y acta, como todo.

## Estado de validación

**VALIDADO en dry-run contra Docker real el 2026-07-28** (nodo Hetzner efímero,
Fabric 2.5.9 / CA 1.5.12): secuencia 01→05 completa, enroll del Testigo desde
"Máquina B" con secreto de un solo uso VERIFICADO (2º enroll falla), canal unido
por ambos peers (la unión Testigo con el MSP nacido en B), y simulacro de
revocación con rechazo OBSERVADO del peer + control positivo. Los 8 hallazgos
del dry-run están corregidos en estos scripts (ver comentarios "dry-run
2026-07-28" en cada fix). Pendiente: la ceremonia REAL (CEREMONIA.md) con
custodia y acta.
