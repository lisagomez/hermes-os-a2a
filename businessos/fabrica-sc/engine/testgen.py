"""testgen.py — genera criterios_test.go desde la sc_spec (PRP-013, Fase 3).

Los tests generados son AUTOCONTENIDOS (mocks propios, prefijo Gen*) y 100%
deterministas: cada transicion de la spec produce su test positivo (cada rol
permitido la ejecuta), sus negativos (MSPs ajenos rechazados; MSP correcto sin
atributo ABAC rechazado donde aplique) y su rechazo por estado invalido; cada
evento declarado se verifica emitido; la regla de plazo se prueba dentro y
fuera de la ventana; el enum de monedas se prueba con una moneda ajena.

Los tests base de la plantilla NO viajan al paquete generado (usan literales
del ejemplo auditado); estos los sustituyen espejando la spec real.
"""
from __future__ import annotations

_CABECERA = '''\
// criterios_test.go — GENERADO por FabricChaincodeEngine desde la sc_spec.
// NO editar a mano: cada test es espejo 1:1 de transiciones/eventos/reglas
// de la spec. El gate fabric del Supervisor los re-ejecuta de cero.
package chaincode

import (
\t"encoding/json"
\t"testing"

\t"github.com/hyperledger/fabric-chaincode-go/v2/pkg/cid"
\t"github.com/hyperledger/fabric-chaincode-go/v2/shim"
\t"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
\t"google.golang.org/protobuf/types/known/timestamppb"
)

// --- mocks autocontenidos (prefijo Gen para no chocar con otros tests) ------

type genStub struct {
\tshim.ChaincodeStubInterface
\testado  map[string][]byte
\teventos map[string][]byte
\tahora   int64
}

func (m *genStub) GetState(k string) ([]byte, error) { return m.estado[k], nil }
func (m *genStub) PutState(k string, v []byte) error { m.estado[k] = v; return nil }
func (m *genStub) SetEvent(n string, p []byte) error { m.eventos[n] = p; return nil }
func (m *genStub) GetTxTimestamp() (*timestamppb.Timestamp, error) {
\treturn &timestamppb.Timestamp{Seconds: m.ahora}, nil
}

type genId struct {
\tcid.ClientIdentity
\tmsp   string
\tattrs map[string]string
}

func (m *genId) GetMSPID() (string, error) { return m.msp, nil }
func (m *genId) GetAttributeValue(n string) (string, bool, error) {
\tv, ok := m.attrs[n]
\treturn v, ok, nil
}

type genCtx struct {
\tcontractapi.TransactionContextInterface
\tstub *genStub
\tid   *genId
}

func (m *genCtx) GetStub() shim.ChaincodeStubInterface  { return m.stub }
func (m *genCtx) GetClientIdentity() cid.ClientIdentity { return m.id }

const genT0 int64 = 1_800_000_000
const genLimite int64 = genT0 + 7*24*3600

func genMundo() *genStub {
\treturn &genStub{estado: map[string][]byte{}, eventos: map[string][]byte{}, ahora: genT0}
}

func genComo(stub *genStub, msp string, attrs map[string]string) *genCtx {
\treturn &genCtx{stub: stub, id: &genId{msp: msp, attrs: attrs}}
}

// sembrar deja un deposito d1 en el estado pedido, sin pasar por transiciones:
// asi cada test prueba SU transicion aislada, no el camino completo.
func sembrar(stub *genStub, estado string) {
\tdep := Deposito{ID: "d1", Monto: 1000, Moneda: "{MONEDA0}", FechaLimite: genLimite, Estado: estado}
\tb, _ := json.Marshal(dep)
\tstub.estado[prefijoClave+"d1"] = b
}

func genExigeError(t *testing.T, err error, contexto string) {
\tt.Helper()
\tif err == nil {
\t\tt.Fatalf("se esperaba rechazo y no hubo error: %s", contexto)
\t}
}

func genEstadoDe(t *testing.T, stub *genStub) string {
\tt.Helper()
\tvar dep Deposito
\tif err := json.Unmarshal(stub.estado[prefijoClave+"d1"], &dep); err != nil {
\t\tt.Fatalf("deposito ilegible: %v", err)
\t}
\treturn dep.Estado
}
'''


def _go_ident(funcion: str) -> str:
    return "".join(p.capitalize() for p in funcion.split("_"))


def _attrs_go(rol: dict, params: dict) -> str:
    if rol.get("atributo"):
        k, v = rol["atributo"].split("=", 1)
        return f'map[string]string{{"{k}": "{v}"}}'
    return "nil"


def _llamada(metodo: str, extra: tuple[str, ...]) -> str:
    args = ", ".join(("ctx", '"d1"') + extra)
    return f"sc.{metodo}({args})"


def _moneda_ajena(monedas: list[str]) -> str:
    for candidata in ("ZZZ", "QQQ", "XX9", "Z9Z9"):
        if candidata not in monedas:
            return candidata
    return "Z" * 12  # enum de 12+ monedas cortas: imposible que este


def generar_criterios_test(spec: dict, params: dict) -> str:
    """Devuelve el contenido de criterios_test.go para el paquete generado."""
    from fabrica import ESCROW_V1  # import tardio: evita ciclo en carga

    roles = {r["id"]: r for r in spec["roles"]}
    monedas = params["monedas"]
    piezas = [_CABECERA.replace("{MONEDA0}", monedas[0])]

    eventos_por_funcion = {e["en"]: e["nombre"] for e in spec["eventos"]}

    for t in sorted(spec["transiciones"], key=lambda x: x["funcion"]):
        funcion = t["funcion"]
        metodo, extra = ESCROW_V1["metodos"][funcion]
        nombre = _go_ident(funcion)
        permitidos = list(t["quien"])
        msps_permitidos = {roles[r]["msp"] for r in permitidos}

        # -- positivos: cada rol permitido ejecuta desde el estado origen -----
        cuerpo = []
        for rid in permitidos:
            r = roles[rid]
            cuerpo.append(f'''\
\t{{ // {rid} puede {funcion}: {t["de"]} -> {t["a"]}
\t\tmundo := genMundo()
\t\tsembrar(mundo, "{t["de"]}")
\t\tctx := genComo(mundo, "{r["msp"]}", {_attrs_go(r, params)})
\t\tif err := {_llamada(metodo, extra)}; err != nil {{
\t\t\tt.Fatalf("{rid} no pudo {funcion}: %v", err)
\t\t}}
\t\tif e := genEstadoDe(t, mundo); e != "{t["a"]}" {{
\t\t\tt.Fatalf("estado esperado {t["a"]!r}, llego %q", e)
\t\t}}
\t}}''')

        # -- negativos: MSP ajeno rechazado -----------------------------------
        for rid, r in sorted(roles.items()):
            if r["msp"] in msps_permitidos:
                continue
            cuerpo.append(f'''\
\t{{ // {rid} (MSP ajeno) NO puede {funcion}
\t\tmundo := genMundo()
\t\tsembrar(mundo, "{t["de"]}")
\t\tctx := genComo(mundo, "{r["msp"]}", {_attrs_go(r, params)})
\t\tgenExigeError(t, {_llamada(metodo, extra)}, "{rid} ejecutando {funcion}")
\t}}''')

        # -- negativo ABAC: MSP correcto sin atributo -------------------------
        if any(rid in ESCROW_V1["roles_con_atributo"] for rid in permitidos):
            rid = next(r for r in permitidos if r in ESCROW_V1["roles_con_atributo"])
            r = roles[rid]
            cuerpo.append(f'''\
\t{{ // MSP de {rid} SIN el atributo ABAC: impostor rechazado
\t\tmundo := genMundo()
\t\tsembrar(mundo, "{t["de"]}")
\t\tctx := genComo(mundo, "{r["msp"]}", nil)
\t\tgenExigeError(t, {_llamada(metodo, extra)}, "impostor sin atributo en {funcion}")
\t}}''')

        # -- negativo de estado: la maquina no admite atajos ------------------
        otro_estado = next(e for e in spec["estados"] if e != t["de"])
        rid0 = permitidos[0]
        r0 = roles[rid0]
        cuerpo.append(f'''\
\t{{ // {funcion} desde estado {otro_estado!r} (invalido) es rechazado
\t\tmundo := genMundo()
\t\tsembrar(mundo, "{otro_estado}")
\t\tctx := genComo(mundo, "{r0["msp"]}", {_attrs_go(r0, params)})
\t\tgenExigeError(t, {_llamada(metodo, extra)}, "{funcion} con estado invalido")
\t}}''')

        # -- evento declarado en esta funcion ----------------------------------
        if funcion in eventos_por_funcion:
            ev = eventos_por_funcion[funcion]
            cuerpo.append(f'''\
\t{{ // evento {ev} se emite en {funcion}
\t\tmundo := genMundo()
\t\tsembrar(mundo, "{t["de"]}")
\t\tctx := genComo(mundo, "{r0["msp"]}", {_attrs_go(r0, params)})
\t\tif err := {_llamada(metodo, extra)}; err != nil {{
\t\t\tt.Fatalf("{funcion} para evento: %v", err)
\t\t}}
\t\tif _, ok := mundo.eventos["{ev}"]; !ok {{
\t\t\tt.Fatal("no se emitio {ev} al ejecutar {funcion}")
\t\t}}
\t}}''')

        # -- regla de plazo -----------------------------------------------------
        if t.get("regla"):
            dias = params["plazo_dias"]
            cuerpo.append(f'''\
\t{{ // regla {t["regla"]}: fuera de la ventana se rechaza, dentro pasa
\t\tmundo := genMundo()
\t\tsembrar(mundo, "{t["de"]}")
\t\tctx := genComo(mundo, "{r0["msp"]}", {_attrs_go(r0, params)})
\t\tmundo.ahora = genLimite + {dias + 1}*24*3600
\t\tgenExigeError(t, {_llamada(metodo, extra)}, "{funcion} fuera de plazo")
\t\tmundo.ahora = genLimite + {dias - 1}*24*3600
\t\tif err := {_llamada(metodo, extra)}; err != nil {{
\t\t\tt.Fatalf("{funcion} dentro de plazo: %v", err)
\t\t}}
\t}}''')

        piezas.append(
            f"\nfunc TestGen{nombre}(t *testing.T) {{\n"
            "\tsc := &SmartContract{}\n" + "\n".join(cuerpo) + "\n}\n"
        )

    # -- creacion: monedas del enum y guarda de rol ---------------------------
    comprador = roles["comprador"]
    ajena = _moneda_ajena(monedas)
    otros = sorted(
        (r for r in roles.values() if r["msp"] != comprador["msp"]),
        key=lambda r: r["id"],
    )
    otro = otros[0] if otros else None
    guarda_rol = ""
    if otro is not None:
        guarda_rol = f'''\
\t{{ // solo el comprador crea depositos
\t\tmundo := genMundo()
\t\tctx := genComo(mundo, "{otro["msp"]}", nil)
\t\tgenExigeError(t, sc.CrearDeposito(ctx, "d1", 100, "{monedas[0]}", genLimite), "crear como {otro["id"]}")
\t}}
'''
    piezas.append(f'''
func TestGenCrearDeposito(t *testing.T) {{
\tsc := &SmartContract{{}}
{guarda_rol}\t{{ // cada moneda del enum es aceptada; una ajena es rechazada
\t\tfor i, m := range []string{{{", ".join(f'"{m}"' for m in monedas)}}} {{
\t\t\tmundo := genMundo()
\t\t\tctx := genComo(mundo, "{comprador["msp"]}", nil)
\t\t\tif err := sc.CrearDeposito(ctx, "d1", 100, m, genLimite); err != nil {{
\t\t\t\tt.Fatalf("moneda %d (%s) del enum rechazada: %v", i, m, err)
\t\t\t}}
\t\t}}
\t\tmundo := genMundo()
\t\tctx := genComo(mundo, "{comprador["msp"]}", nil)
\t\tgenExigeError(t, sc.CrearDeposito(ctx, "d1", 100, "{ajena}", genLimite), "moneda fuera del enum")
\t}}
}}
''')
    return "".join(piezas)
