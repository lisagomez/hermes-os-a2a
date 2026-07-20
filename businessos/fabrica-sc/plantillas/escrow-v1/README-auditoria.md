# escrow-v1 — README de auditoría (PRP-013, Fase 2)

> **Estado de auditoría**: PENDIENTE (firma de la dueña al pie tras revisión línea por línea)
> Esta plantilla es EL ACTIVO de la fábrica: el Engine parametriza, jamás reescribe.

## Qué es

Chaincode Go (fabric-contract-api v2) de depósito en garantía, 1:1 con la
`sc_spec` de ejemplo del PRP-013: 7 estados, 6 transiciones con dueño por rol,
3 eventos, plazo de resolución arbitral verificado con el reloj de la
transacción.

## Layout

```
escrow-v1/
├── go.mod                    # módulo; correr `go mod tidy` en el primer build
├── cmd/main.go               # arranque contractapi
└── chaincode/
    ├── escrow.go             # la plantilla (parametrización arriba del archivo)
    └── escrow_test.go        # tests base (mocks por embedding de interfaz)
```

## Puntos de parametrización (lo ÚNICO que el Engine toca)

Bloque `PUNTOS DE PARAMETRIZACION` al inicio de `escrow.go`:
MSPs por rol, atributo ABAC del árbitro, plazo de resolución, enum de monedas,
nombres de eventos. **La máquina de estados NO es parametrizable** sin
re-auditar: cambiarla es crear `escrow-v2`, no parametrizar `escrow-v1`.

## Checklist de determinismo (revisar en CADA cambio)

- [ ] Cero `time.Now()` — solo `GetTxTimestamp()` (grep obligatorio en el gate).
- [ ] Cero `math/rand`, `crypto/rand`, UUIDs generados en el chaincode.
- [ ] Cero llamadas de red / filesystem / variables de entorno.
- [ ] Cero iteración de mapas que termine en `PutState`/`SetEvent` (orden no
      determinista). La serialización es siempre `json.Marshal` sobre struct.
- [ ] Errores con mensajes fijos (el mensaje forma parte del endorsement).

## Cómo validar (los mismos gates que correrá el Supervisor)

```bash
cd plantillas/escrow-v1
go mod tidy                       # primer build: fija versiones y go.sum
go build ./... && go vet ./...
gosec ./...
go test ./chaincode/ -v
```

Despliegue manual en la red de pruebas (fabric-samples, Fabric 2.5 LTS pineado):

```bash
cd fabric-samples/test-network
./network.sh up createChannel -c canal-clientes-demo
./network.sh deployCC -c canal-clientes-demo -ccn escrow-v1 \
  -ccp /ruta/a/plantillas/escrow-v1 -ccl go \
  -ccep "AND('Org1MSP.peer','Org2MSP.peer')"
```

El árbitro necesita una identidad con atributo `rol=arbitro` emitida por la CA
de Org1 (`fabric-ca-client register/enroll` con `--id.attrs 'rol=arbitro:ecert'`).

## Notas para el host-job de despliegue

- Cada re-despliegue: `--sequence` incrementado y coherente entre orgs; el
  host-job lo lee de `contratos_sc`, nunca lo adivina.
- Las identidades admin de `approveformyorg` viven SOLO en el volumen del
  host-job. El contenedor que genera código no despliega.

## Decisiones de diseño auditables

1. **Una función = una transición** (espejo de `validar_sc_spec`): la revisión
   humana compara spec y código como dos listas del mismo largo.
2. **`fecha_limite` como argumento, validada contra el reloj de la tx**: el dato
   es del acuerdo comercial; el chaincode solo verifica coherencia temporal.
3. **`LeerDeposito` sin restricción de rol**: los términos sensibles van en la
   colección privada (`terminos-comerciales`), no en el estado público.
4. **`AbrirDisputa` solo desde `fondeado`** (fiel a la spec): un depósito ya
   `entregado` se disputa fuera de banda o en escrow-v2 — no se inventa aquí.

---

**Firma de auditoría**: ____________________  **Fecha**: ____________
