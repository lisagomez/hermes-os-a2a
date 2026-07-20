# Arquitectura de Red Fabric — decisiones de referencia (actualiza PRP-013 y PRP-014)

> **Estado**: ADOPTADO el 2026-07-19 (fundación del departamento de Contratos Inteligentes). Las adendas citadas viven en `businessos/gobernanza/`.
> **Fecha**: 2026-07-19
> **Alcance**: baja los "componentes núcleo" de Fabric (organizaciones, identidades,
> CAs, ordering, ledger) a decisiones concretas por tier de servicio. Cero abstracciones:
> cada componente tiene dueño, tamaño y porqué.

---

## 1. Mapeo componente → decisión

| Componente | Qué es | Decisión v1 |
|---|---|---|
| **Organizaciones** | Los dueños de la confianza; quienes endosan y aprueban chaincode | Mínimo **2 por red** siempre (una sola org = base de datos cara, no blockchain). Tier 1: Org-Operadora + Org-Testigo (ambas tuyas, separadas de verdad — ver §3). Tier 2+: la segunda org es del cliente |
| **Identidades** | Certificados X.509 emitidos por la CA de cada org; los atributos (ABAC) llevan los roles | Tabla completa en §4. Regla: **una identidad = un propósito**; jamás reutilizar |
| **Certificate Authority** | Emite y revoca identidades; una por org + TLS CA separada | **Fabric CA** (no cryptogen en nada que toque producción: cryptogen no revoca). TLS CA separada de la CA de identidades |
| **Ordering Service** | Ordena transacciones en bloques; el metrónomo de la red | **Raft**. Dev/gate: 1 nodo. Producción: 3 nodos (ver §5 para la honestidad sobre HA en tu infra) |
| **Ledger** | World state + blockchain de bloques por canal | **LevelDB** en v1: el escrow lee/escribe por clave directa, no necesita queries ricas. CouchDB solo si una plantilla futura exige queries JSON — y es +RAM que hoy no sobra |
| **Canal** | Aislamiento de ledger entre subconjuntos de orgs | La unidad de aislamiento por cliente en tier 1 y 2; los términos sensibles SIEMPRE en colecciones privadas aunque el canal ya aísle |

## 2. Topología por tier (conecta con los tiers del PRP-013)

### Tier Gate (red efímera del Supervisor)
`fabric-samples/test-network`: 2 orgs, 1 orderer, LevelDB, TLS on, sin CA persistente
(aquí cryptogen sí es aceptable: la red muere con el test). Levantar → desplegar →
ejecutar criterios → destruir. Presupuesto: ~2-3 GB RAM por corrida.

### Tier 1 — SaaS compartido (canal por cliente)
- **Org-Operadora**: tu org de operación — peer, CA, y las identidades de fábrica
  (despliegue, oráculo, listener).
- **Org-Testigo**: segunda org TUYA pero **separada de verdad**: llaves en máquina/HSM
  distinto, aprobador humano distinto (o la misma dueña con ceremonia separada y
  registrada). Su función: que `AND('Operadora.peer','Testigo.peer')` signifique algo —
  comprometer una máquina no falsifica endorsement.
- Un **canal por cliente** (`canal-<cliente>`); chaincode por canal con su `--sequence`
  propio.
- **Honestidad comercial**: en este tier el cliente confía en ti como operador; el valor
  es el ledger auditable + la operación del PM, no la descentralización. Se dice así en
  el contrato.

### Tier 2 — Canal dedicado con peer del cliente
El cliente levanta Org-Cliente (su CA, su peer, sus llaves — típicamente con tu
asistencia vía IaC). El endorsement pasa a `AND('Operadora.peer','Cliente.peer')`:
**ahora el cliente co-firma el chaincode y ninguna de las partes puede actuar sola**.
Este es el tier donde el pitch de "web agéntica con confianza de protocolo" es
literalmente cierto.

### Tier 3 — Red del cliente
Red completa en infraestructura del cliente (Bevel/operador K8s); tú eres una org
invitada (Operadora como org de servicio: oráculo + fábrica) o solo proveedor del
software con soporte. Contrato de marca blanca (molde `propuesta-crm-marca-blanca.md`).

## 3. Por qué Org-Testigo y no "una org y ya" (decisión de diseño)

Con una sola org, el lifecycle de Fabric aprueba con una firma: el doble candado del
PRP-013 (cola humana + `approveformyorg`) colapsa a un candado. Org-Testigo cuesta un
peer más (~1 GB) y compra: endorsement real, aprobación de chaincode a dos firmas, y un
camino de migración limpio a tier 2 (el cliente sustituye a Testigo sin rediseñar nada).
Es el mínimo honesto entre "demo" y "consorcio".

## 4. Tabla de identidades (quién es quién, emitida por cuál CA)

| Identidad | CA emisora | Atributos | Puede | Jamás |
|---|---|---|---|---|
| `admin-despliegue-op` | CA Operadora | `hf.Admin` | package/install/approve/commit | operar contratos |
| `admin-despliegue-tg` | CA Testigo | `hf.Admin` | approveformyorg (2ª firma) | vivir en la misma máquina que la anterior |
| `oraculo-pm` | CA Operadora | `rol=oraculo` | registrar_evidencia, declarar_vencido | liberar, resolver, desplegar |
| `arbitro-<n>` | CA Operadora (t1) / CA neutral (t2+) | `rol=arbitro` | resolver | todo lo demás |
| `listener-hermes` | CA Operadora | `rol=lector` | leer eventos/estado | escribir cualquier cosa |
| `comprador-<cliente>` | CA Operadora (t1) / CA Cliente (t2) | — | sus transiciones de la spec | ser custodiada por Hermes |
| `vendedor-<cliente>` | ídem | — | ídem | ídem |

Reglas: revocación probada ANTES del primer cliente real (emitir → revocar → verificar
rechazo); las llaves de partes las custodian las partes (wallet propia o app), nunca el
servidor de Hermes — ya es anti-patrón del PRP-014, aquí se vuelve topología.

## 5. Ordering service: la verdad incómoda

Raft con 3 nodos tolera la caída de 1 — pero 3 ordenadores en la MISMA máquina Hetzner
toleran la caída de cero máquinas. Decisión honesta por etapa:
- **Ahora (pre-clientes)**: 1 orderer, documentado como SPOF conocido.
- **Primer cliente pagando**: 3 orderers repartidos en 2 nodos Hetzner (el del sandbox
  fabric del PRP-013 + el principal) — HA parcial real, no teatro.
- **Tier 2+**: el cliente puede aportar un orderer; Raft entre orgs es soportado y es
  un punto de venta.

## 6. Presupuesto de RAM (actualiza el Gotcha del PRP-013 con números)

| Pieza | RAM aprox |
|---|---|
| Peer Operadora + Peer Testigo (LevelDB) | ~1.5-2 GB |
| 1 orderer | ~0.5 GB |
| 2 Fabric CA + TLS CA | ~0.5 GB |
| pm-a2a + listener | ~0.3 GB |
| **Total red tier 1 estable** | **~3 GB** |
| Red efímera del gate (picos) | +2-3 GB |

Conclusión: la red estable tier 1 CABE en un nodo dedicado pequeño (cx32/cx33); la red
efímera del gate NO debe compartir nodo con ella (los picos del gate matarían la red de
clientes). Confirma la recomendación del PRP-013: nodo aparte para el sandbox.

## 7. Integración con la planeación

- **PRP-013 · decisión 1 (ubicación del sandbox)**: respondida — nodo aparte; la red
  estable tier 1 en su propio nodo con los números de §6.
- **PRP-013 · Fase 5**: el host-job de despliegue firma con `admin-despliegue-op` y
  requiere la 2ª firma de Testigo (ceremonia registrada en `contratos_sc`).
- **PRP-014 · identidades**: la tabla de §4 sustituye la lista informal; `listener-hermes`
  (solo lectura) es identidad nueva — el listener NO usa la del oráculo.
- **Modelo de amenazas · G2**: Org-Testigo materializa la separación de llaves (A1);
  añadir a activos: llaves de `admin-despliegue-tg` con la regla de máquina separada.
- **Adenda Web Agéntica**: el tier 2 es el argumento de venta de "confianza de
  protocolo" — endorsement AND con el cliente = Constraint verificable por el cliente.

---

*Pendiente de aprobación. Siguiente paso natural: IaC de la red tier 1 (docker-compose o
Bevel) como PRP propio, con la ceremonia de llaves documentada paso a paso.*
