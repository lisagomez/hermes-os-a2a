// Tests unitarios de escrow-v1 (PRP-013, Fase 2).
//
// Mocks por EMBEDDING de interfaz: la struct embebe la interfaz (nil) para
// satisfacer el contrato y sobreescribe SOLO los metodos que el chaincode usa
// (GetState/PutState/SetEvent/GetTxTimestamp, GetMSPID/GetAttributeValue).
// Cualquier llamada no prevista panickea el test — eso es una feature: si la
// plantilla empieza a usar mas superficie del stub, el test lo delata.
//
// Estos tests cubren la plantilla base. Los tests de `criterios_aceptacion`
// de cada spec los genera el Engine (Fase 3) con este mismo patron.
package chaincode

import (
	"strings"
	"testing"

	"github.com/hyperledger/fabric-chaincode-go/v2/pkg/cid"
	"github.com/hyperledger/fabric-chaincode-go/v2/shim"
	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// --- mocks -----------------------------------------------------------------

type stubMock struct {
	shim.ChaincodeStubInterface
	estado  map[string][]byte
	eventos map[string][]byte
	ahora   int64 // reloj de la "transaccion"
}

func (m *stubMock) GetState(k string) ([]byte, error)  { return m.estado[k], nil }
func (m *stubMock) PutState(k string, v []byte) error  { m.estado[k] = v; return nil }
func (m *stubMock) SetEvent(n string, p []byte) error  { m.eventos[n] = p; return nil }
func (m *stubMock) GetTxTimestamp() (*timestamppb.Timestamp, error) {
	return &timestamppb.Timestamp{Seconds: m.ahora}, nil
}

type idMock struct {
	cid.ClientIdentity
	msp   string
	attrs map[string]string
}

func (m *idMock) GetMSPID() (string, error) { return m.msp, nil }
func (m *idMock) GetAttributeValue(n string) (string, bool, error) {
	v, ok := m.attrs[n]
	return v, ok, nil
}

type ctxMock struct {
	contractapi.TransactionContextInterface
	stub *stubMock
	id   *idMock
}

func (m *ctxMock) GetStub() shim.ChaincodeStubInterface { return m.stub }
func (m *ctxMock) GetClientIdentity() cid.ClientIdentity { return m.id }

// --- helpers ---------------------------------------------------------------

const t0 int64 = 1_800_000_000 // tiempo base de la "red" en los tests
const limite int64 = t0 + 7*24*3600

func nuevoMundo() *stubMock {
	return &stubMock{estado: map[string][]byte{}, eventos: map[string][]byte{}, ahora: t0}
}

func como(stub *stubMock, msp string, attrs map[string]string) *ctxMock {
	return &ctxMock{stub: stub, id: &idMock{msp: msp, attrs: attrs}}
}

func exigirError(t *testing.T, err error, fragmento string) {
	t.Helper()
	if err == nil {
		t.Fatalf("se esperaba error con %q y no hubo error", fragmento)
	}
	if !strings.Contains(err.Error(), fragmento) {
		t.Fatalf("error sin %q: %v", fragmento, err)
	}
}

// --- criterios de aceptacion de la spec de ejemplo -------------------------

// "comprador puede fondear un deposito creado" + "PagoLiberado se emite al liberar"
func TestHappyPathEscrow(t *testing.T) {
	sc := &SmartContract{}
	mundo := nuevoMundo()
	comprador := como(mundo, "Org1MSP", nil)
	vendedor := como(mundo, "Org2MSP", nil)

	if err := sc.CrearDeposito(comprador, "d1", 1000, "USDC", limite); err != nil {
		t.Fatalf("crear: %v", err)
	}
	if err := sc.Fondear(comprador, "d1"); err != nil {
		t.Fatalf("fondear: %v", err)
	}
	if _, ok := mundo.eventos["DepositoFondeado"]; !ok {
		t.Fatal("no se emitio DepositoFondeado al fondear")
	}
	if err := sc.MarcarEntrega(vendedor, "d1"); err != nil {
		t.Fatalf("marcar_entrega: %v", err)
	}
	if err := sc.LiberarPago(comprador, "d1"); err != nil {
		t.Fatalf("liberar_pago: %v", err)
	}
	if _, ok := mundo.eventos["PagoLiberado"]; !ok {
		t.Fatal("no se emitio PagoLiberado al liberar")
	}
	dep, err := sc.LeerDeposito(comprador, "d1")
	if err != nil || dep.Estado != "liberado" {
		t.Fatalf("estado final esperado 'liberado', llego %+v (err=%v)", dep, err)
	}
}

// "vendedor NO puede liberar_pago"
func TestVendedorNoPuedeLiberar(t *testing.T) {
	sc := &SmartContract{}
	mundo := nuevoMundo()
	comprador := como(mundo, "Org1MSP", nil)
	vendedor := como(mundo, "Org2MSP", nil)

	_ = sc.CrearDeposito(comprador, "d1", 1000, "USDC", limite)
	_ = sc.Fondear(comprador, "d1")
	_ = sc.MarcarEntrega(vendedor, "d1")
	exigirError(t, sc.LiberarPago(vendedor, "d1"), "solo el rol comprador")
}

// "resolver falla fuera del plazo de 30 dias"
func TestResolverFueraDePlazo(t *testing.T) {
	sc := &SmartContract{}
	mundo := nuevoMundo()
	comprador := como(mundo, "Org1MSP", nil)
	arbitro := como(mundo, "Org1MSP", map[string]string{"rol": "arbitro"})

	_ = sc.CrearDeposito(comprador, "d1", 1000, "MXN", limite)
	_ = sc.Fondear(comprador, "d1")
	if err := sc.AbrirDisputa(comprador, "d1"); err != nil {
		t.Fatalf("abrir_disputa: %v", err)
	}
	mundo.ahora = limite + 31*24*3600 // un dia despues del plazo
	exigirError(t, sc.Resolver(arbitro, "d1", "a favor del comprador"), "fuera de plazo")

	mundo.ahora = limite + 29*24*3600 // dentro del plazo: si resuelve
	if err := sc.Resolver(arbitro, "d1", "a favor del comprador"); err != nil {
		t.Fatalf("resolver dentro de plazo: %v", err)
	}
}

// El MSP correcto sin el atributo ABAC NO es arbitro.
func TestArbitroExigeAtributo(t *testing.T) {
	sc := &SmartContract{}
	mundo := nuevoMundo()
	comprador := como(mundo, "Org1MSP", nil)
	impostor := como(mundo, "Org1MSP", nil) // MSP correcto, sin rol=arbitro

	_ = sc.CrearDeposito(comprador, "d1", 500, "USDC", limite)
	_ = sc.Fondear(comprador, "d1")
	_ = sc.AbrirDisputa(comprador, "d1")
	exigirError(t, sc.Resolver(impostor, "d1", "x"), "rol=arbitro")
}

// La maquina de estados no admite atajos: liberar sobre `creado` falla.
func TestTransicionInvalida(t *testing.T) {
	sc := &SmartContract{}
	mundo := nuevoMundo()
	comprador := como(mundo, "Org1MSP", nil)

	_ = sc.CrearDeposito(comprador, "d1", 500, "USDC", limite)
	exigirError(t, sc.LiberarPago(comprador, "d1"), "exige estado")
}

// Validaciones de creacion: moneda, monto, fecha, duplicado.
func TestCrearValida(t *testing.T) {
	sc := &SmartContract{}
	mundo := nuevoMundo()
	comprador := como(mundo, "Org1MSP", nil)
	vendedor := como(mundo, "Org2MSP", nil)

	exigirError(t, sc.CrearDeposito(vendedor, "d1", 100, "USDC", limite), "solo el rol comprador")
	exigirError(t, sc.CrearDeposito(comprador, "d1", 0, "USDC", limite), "mayor a cero")
	exigirError(t, sc.CrearDeposito(comprador, "d1", 100, "EUR", limite), "no permitida")
	exigirError(t, sc.CrearDeposito(comprador, "d1", 100, "USDC", t0-1), "posterior al tiempo")
	if err := sc.CrearDeposito(comprador, "d1", 100, "USDC", limite); err != nil {
		t.Fatalf("crear valido: %v", err)
	}
	exigirError(t, sc.CrearDeposito(comprador, "d1", 100, "USDC", limite), "ya existe")
}
