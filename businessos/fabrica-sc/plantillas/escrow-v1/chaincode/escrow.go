// Package chaincode — escrow-v1: la plantilla base auditada de la fabrica de SC (PRP-013).
//
// Deposito en garantia: el comprador fondea, el vendedor entrega, el comprador
// libera; ante disputa, un arbitro resuelve dentro del plazo. Maquina de estados
// 1:1 con la sc_spec de ejemplo del PRP-013 (contrato_sc.validar_sc_spec).
//
// DETERMINISMO (regla de oro del chaincode — ver Gotchas del PRP-013):
//   - Tiempo: SOLO ctx.GetStub().GetTxTimestamp(). JAMAS time.Now() — cada peer
//     endosaria con un reloj distinto y el read/write set divergiria.
//   - Sin aleatoriedad, sin llamadas externas, sin iterar mapas para escribir.
//   - Los errores son strings fijos: el mensaje tambien es parte del endorsement.
package chaincode

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
)

// ---------------------------------------------------------------------------
// PUNTOS DE PARAMETRIZACION — lo UNICO que el FabricChaincodeEngine puede tocar.
// Todo lo demas es la plantilla auditada: se parametriza, no se reescribe.
// ---------------------------------------------------------------------------

const (
	// Roles → MSP (de sc_spec.roles)
	mspComprador = "Org1MSP"
	mspVendedor  = "Org2MSP"
	mspArbitro   = "Org1MSP"

	// ABAC del arbitro (de sc_spec.roles[arbitro].atributo "rol=arbitro")
	atributoArbitro      = "rol"
	valorAtributoArbitro = "arbitro"

	// Regla de la transicion `resolver`: dentro_de_plazo(fecha_limite + 30d)
	plazoResolucionSegundos int64 = 30 * 24 * 60 * 60

	// Nombres de eventos (de sc_spec.eventos)
	eventoDepositoFondeado = "DepositoFondeado"
	eventoDisputaAbierta   = "DisputaAbierta"
	eventoPagoLiberado     = "PagoLiberado"

	prefijoClave = "deposito:"
)

// Monedas permitidas (de sc_spec.activos[deposito].campos[moneda].enum)
func monedaPermitida(m string) bool {
	switch m {
	case "USDC", "MXN":
		return true
	}
	return false
}

// ---------------------------------------------------------------------------
// Estados y activo (de sc_spec.estados / sc_spec.activos) — NO parametrizable
// sin re-auditar: la maquina de estados ES la plantilla.
// ---------------------------------------------------------------------------

const (
	estadoCreado    = "creado"
	estadoFondeado  = "fondeado"
	estadoEntregado = "entregado"
	estadoLiberado  = "liberado"
	estadoDisputado = "disputado"
	estadoResuelto  = "resuelto"
	estadoCancelado = "cancelado"
)

// Deposito es el activo del escrow. Serializacion JSON con claves fijas:
// el orden de campos de encoding/json sobre struct es determinista.
type Deposito struct {
	ID          string `json:"id"`
	Monto       uint64 `json:"monto"`
	Moneda      string `json:"moneda"`
	FechaLimite int64  `json:"fecha_limite"` // unix segundos, fijado al crear
	Estado      string `json:"estado"`
	Resolucion  string `json:"resolucion,omitempty"` // veredicto del arbitro
}

// SmartContract implementa el escrow.
type SmartContract struct {
	contractapi.Contract
}

// ---------------------------------------------------------------------------
// Helpers (identidad, tiempo de tx, estado del ledger, maquina de estados)
// ---------------------------------------------------------------------------

func exigirMSP(ctx contractapi.TransactionContextInterface, msp, rol string) error {
	quien, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("no se pudo leer el MSP del cliente: %w", err)
	}
	if quien != msp {
		return fmt.Errorf("solo el rol %s (%s) puede ejecutar esta transicion; el cliente es de %s", rol, msp, quien)
	}
	return nil
}

func exigirArbitro(ctx contractapi.TransactionContextInterface) error {
	if err := exigirMSP(ctx, mspArbitro, "arbitro"); err != nil {
		return err
	}
	valor, existe, err := ctx.GetClientIdentity().GetAttributeValue(atributoArbitro)
	if err != nil {
		return fmt.Errorf("no se pudo leer el atributo %q del certificado: %w", atributoArbitro, err)
	}
	if !existe || valor != valorAtributoArbitro {
		return fmt.Errorf("solo el rol arbitro puede ejecutar esta transicion: el certificado no trae %s=%s", atributoArbitro, valorAtributoArbitro)
	}
	return nil
}

// txAhora: el UNICO reloj valido del chaincode (identico en todos los peers).
func txAhora(ctx contractapi.TransactionContextInterface) (int64, error) {
	ts, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return 0, fmt.Errorf("no se pudo leer el timestamp de la transaccion: %w", err)
	}
	return ts.GetSeconds(), nil
}

func (s *SmartContract) leer(ctx contractapi.TransactionContextInterface, id string) (*Deposito, error) {
	datos, err := ctx.GetStub().GetState(prefijoClave + id)
	if err != nil {
		return nil, fmt.Errorf("error leyendo el ledger: %w", err)
	}
	if datos == nil {
		return nil, fmt.Errorf("el deposito %s no existe", id)
	}
	var dep Deposito
	if err := json.Unmarshal(datos, &dep); err != nil {
		return nil, fmt.Errorf("deposito %s corrupto en el ledger: %w", id, err)
	}
	return &dep, nil
}

func (s *SmartContract) guardar(ctx contractapi.TransactionContextInterface, dep *Deposito) error {
	datos, err := json.Marshal(dep)
	if err != nil {
		return fmt.Errorf("no se pudo serializar el deposito: %w", err)
	}
	return ctx.GetStub().PutState(prefijoClave+dep.ID, datos)
}

// transicionar valida `de → a` contra el estado real. La maquina de estados de
// la spec se aplica AQUI, en un solo lugar: una funcion = una transicion.
func transicionar(dep *Deposito, de, a, funcion string) error {
	if dep.Estado != de {
		return fmt.Errorf("%s exige estado %q y el deposito %s esta en %q", funcion, de, dep.ID, dep.Estado)
	}
	dep.Estado = a
	return nil
}

func emitir(ctx contractapi.TransactionContextInterface, nombre string, dep *Deposito) error {
	carga, err := json.Marshal(dep)
	if err != nil {
		return fmt.Errorf("no se pudo serializar el evento %s: %w", nombre, err)
	}
	if err := ctx.GetStub().SetEvent(nombre, carga); err != nil {
		return fmt.Errorf("no se pudo emitir el evento %s: %w", nombre, err)
	}
	return nil
}

// ---------------------------------------------------------------------------
// Transiciones (1:1 con sc_spec.transiciones)
// ---------------------------------------------------------------------------

// CrearDeposito — estado inicial `creado`. Quien: comprador.
// fechaLimite viaja como argumento (dato del acuerdo, no del reloj del peer)
// pero se valida contra el tiempo de LA TRANSACCION, no contra time.Now().
func (s *SmartContract) CrearDeposito(ctx contractapi.TransactionContextInterface, id string, monto uint64, moneda string, fechaLimite int64) error {
	if err := exigirMSP(ctx, mspComprador, "comprador"); err != nil {
		return err
	}
	if id == "" {
		return fmt.Errorf("id vacio")
	}
	if monto == 0 {
		return fmt.Errorf("monto debe ser mayor a cero")
	}
	if !monedaPermitida(moneda) {
		return fmt.Errorf("moneda %q no permitida (validas: USDC, MXN)", moneda)
	}
	ahora, err := txAhora(ctx)
	if err != nil {
		return err
	}
	if fechaLimite <= ahora {
		return fmt.Errorf("fecha_limite (%d) debe ser posterior al tiempo de la transaccion (%d)", fechaLimite, ahora)
	}
	existente, err := ctx.GetStub().GetState(prefijoClave + id)
	if err != nil {
		return fmt.Errorf("error leyendo el ledger: %w", err)
	}
	if existente != nil {
		return fmt.Errorf("el deposito %s ya existe", id)
	}
	return s.guardar(ctx, &Deposito{
		ID: id, Monto: monto, Moneda: moneda,
		FechaLimite: fechaLimite, Estado: estadoCreado,
	})
}

// Fondear — creado → fondeado. Quien: comprador. Evento: DepositoFondeado.
func (s *SmartContract) Fondear(ctx contractapi.TransactionContextInterface, id string) error {
	if err := exigirMSP(ctx, mspComprador, "comprador"); err != nil {
		return err
	}
	dep, err := s.leer(ctx, id)
	if err != nil {
		return err
	}
	if err := transicionar(dep, estadoCreado, estadoFondeado, "fondear"); err != nil {
		return err
	}
	if err := s.guardar(ctx, dep); err != nil {
		return err
	}
	return emitir(ctx, eventoDepositoFondeado, dep)
}

// MarcarEntrega — fondeado → entregado. Quien: vendedor.
func (s *SmartContract) MarcarEntrega(ctx contractapi.TransactionContextInterface, id string) error {
	if err := exigirMSP(ctx, mspVendedor, "vendedor"); err != nil {
		return err
	}
	dep, err := s.leer(ctx, id)
	if err != nil {
		return err
	}
	if err := transicionar(dep, estadoFondeado, estadoEntregado, "marcar_entrega"); err != nil {
		return err
	}
	return s.guardar(ctx, dep)
}

// LiberarPago — entregado → liberado. Quien: comprador. Evento: PagoLiberado.
func (s *SmartContract) LiberarPago(ctx contractapi.TransactionContextInterface, id string) error {
	if err := exigirMSP(ctx, mspComprador, "comprador"); err != nil {
		return err
	}
	dep, err := s.leer(ctx, id)
	if err != nil {
		return err
	}
	if err := transicionar(dep, estadoEntregado, estadoLiberado, "liberar_pago"); err != nil {
		return err
	}
	if err := s.guardar(ctx, dep); err != nil {
		return err
	}
	return emitir(ctx, eventoPagoLiberado, dep)
}

// AbrirDisputa — fondeado → disputado. Quien: comprador O vendedor. Evento: DisputaAbierta.
func (s *SmartContract) AbrirDisputa(ctx contractapi.TransactionContextInterface, id string) error {
	errComprador := exigirMSP(ctx, mspComprador, "comprador")
	errVendedor := exigirMSP(ctx, mspVendedor, "vendedor")
	if errComprador != nil && errVendedor != nil {
		return fmt.Errorf("solo comprador (%s) o vendedor (%s) pueden abrir disputa", mspComprador, mspVendedor)
	}
	dep, err := s.leer(ctx, id)
	if err != nil {
		return err
	}
	if err := transicionar(dep, estadoFondeado, estadoDisputado, "abrir_disputa"); err != nil {
		return err
	}
	if err := s.guardar(ctx, dep); err != nil {
		return err
	}
	return emitir(ctx, eventoDisputaAbierta, dep)
}

// Resolver — disputado → resuelto. Quien: arbitro (MSP + atributo).
// Regla: dentro_de_plazo(fecha_limite + 30d), medido con el reloj de la tx.
func (s *SmartContract) Resolver(ctx contractapi.TransactionContextInterface, id string, resolucion string) error {
	if err := exigirArbitro(ctx); err != nil {
		return err
	}
	if resolucion == "" {
		return fmt.Errorf("resolucion vacia: el veredicto del arbitro es obligatorio")
	}
	dep, err := s.leer(ctx, id)
	if err != nil {
		return err
	}
	ahora, err := txAhora(ctx)
	if err != nil {
		return err
	}
	limite := dep.FechaLimite + plazoResolucionSegundos
	if ahora > limite {
		return fmt.Errorf("fuera de plazo: resolver exige tx antes de fecha_limite+30d (%d) y la transaccion es de %d", limite, ahora)
	}
	if err := transicionar(dep, estadoDisputado, estadoResuelto, "resolver"); err != nil {
		return err
	}
	dep.Resolucion = resolucion
	return s.guardar(ctx, dep)
}

// Cancelar — creado → cancelado. Quien: comprador.
func (s *SmartContract) Cancelar(ctx contractapi.TransactionContextInterface, id string) error {
	if err := exigirMSP(ctx, mspComprador, "comprador"); err != nil {
		return err
	}
	dep, err := s.leer(ctx, id)
	if err != nil {
		return err
	}
	if err := transicionar(dep, estadoCreado, estadoCancelado, "cancelar"); err != nil {
		return err
	}
	return s.guardar(ctx, dep)
}

// LeerDeposito — consulta (sin transicion, sin restriccion de rol: las tres
// organizaciones del canal pueden leer; los terminos sensibles van en la
// coleccion privada, no aqui).
func (s *SmartContract) LeerDeposito(ctx contractapi.TransactionContextInterface, id string) (*Deposito, error) {
	return s.leer(ctx, id)
}
