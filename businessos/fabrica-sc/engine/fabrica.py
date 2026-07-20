"""fabrica.py — FabricChaincodeEngine (PRP-013, Fase 3).

Parametriza una plantilla AUDITADA del catalogo a partir de una sc_spec validada.
CERO modelo involucrado: para escrow-v1 la parametrizacion es 100% determinista —
el LLM trabaja rio arriba (conversacion → spec), aqui solo hay datos.

Principios (PRP-013):
- El Engine JAMAS genera codigo libre: verifica que la spec ENCAJA en la maquina
  de estados de la plantilla (que NO es parametrizable) y toca UNICAMENTE los
  puntos de parametrizacion declarados en el bloque `PUNTOS DE PARAMETRIZACION`.
- Spec que no encaja = EngineError con el porque exacto (eso es escrow-v2 o una
  plantilla nueva, no una parametrizacion).
- El diff contra la plantilla queda ACOTADO y va al manifest: la revision humana
  compara spec y diff como dos listas cortas.
- Los tests del paquete generado los produce `testgen.py` desde la spec (los
  tests base de la plantilla usan literales del ejemplo y NO viajan al paquete:
  auditan la plantilla en el repo, no la instancia).
"""
from __future__ import annotations

import hashlib
import json
import re
import shutil
import sys
from pathlib import Path

_AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(_AQUI.parent))  # fabrica-sc/ → contrato_sc importable

from contrato_sc import SpecInvalida, validar_sc_spec  # noqa: E402
from testgen import generar_criterios_test  # noqa: E402

CATALOGO_DIR = _AQUI.parent / "plantillas"


class EngineError(ValueError):
    """La spec no encaja en la plantilla o la plantilla esta corrupta."""


def _exigir(cond: bool, msg: str) -> None:
    if not cond:
        raise EngineError(msg)


# ---------------------------------------------------------------------------
# Contrato estructural de escrow-v1: la maquina de estados de la plantilla.
# Cambiar ESTO es crear una plantilla nueva con auditoria nueva, no parametrizar.
# ---------------------------------------------------------------------------

ESCROW_V1 = {
    "estados": [
        "creado", "fondeado", "entregado", "liberado",
        "disputado", "resuelto", "cancelado",
    ],
    # (de, a, funcion) → roles exigidos (ids CANONICOS de la plantilla)
    "transiciones": {
        ("creado", "fondeado", "fondear"): ("comprador",),
        ("fondeado", "entregado", "marcar_entrega"): ("vendedor",),
        ("entregado", "liberado", "liberar_pago"): ("comprador",),
        ("fondeado", "disputado", "abrir_disputa"): ("comprador", "vendedor"),
        ("disputado", "resuelto", "resolver"): ("arbitro",),
        ("creado", "cancelado", "cancelar"): ("comprador",),
    },
    # roles canonicos; arbitro DEBE traer atributo ABAC
    "roles": ("comprador", "vendedor", "arbitro"),
    "roles_con_atributo": ("arbitro",),
    # hooks de evento: funcion → const del chaincode. La spec DEBE declarar
    # exactamente un evento por hook (1:1 verificable por un humano).
    "eventos": {
        "fondear": "eventoDepositoFondeado",
        "abrir_disputa": "eventoDisputaAbierta",
        "liberar_pago": "eventoPagoLiberado",
    },
    # funcion → (metodo Go, args extra tras (ctx, id))
    "metodos": {
        "fondear": ("Fondear", ()),
        "marcar_entrega": ("MarcarEntrega", ()),
        "liberar_pago": ("LiberarPago", ()),
        "abrir_disputa": ("AbrirDisputa", ()),
        "resolver": ("Resolver", ('"veredicto de prueba"',)),
        "cancelar": ("Cancelar", ()),
    },
    # campos del activo que la plantilla implementa (nombre → tipo exigido)
    "campos_activo": {
        "monto": "uint",
        "moneda": "string",
        "fecha_limite": "timestamp",
    },
    "regla_resolver": re.compile(
        r"^dentro_de_plazo\(fecha_limite \+ (\d+)d\)$"
    ),
}

_MONEDA_RE = re.compile(r"^[A-Z0-9]{2,12}$")


def _verificar_encaje_escrow_v1(spec: dict) -> dict:
    """Devuelve los parametros extraidos o revienta con el porque exacto."""
    c = ESCROW_V1

    _exigir(
        list(spec["estados"]) == c["estados"],
        f"escrow-v1 implementa EXACTAMENTE los estados {c['estados']} en ese "
        f"orden; la spec trae {spec['estados']}. Cambiar la maquina de estados "
        "es una plantilla nueva (escrow-v2), no una parametrizacion.",
    )

    roles_por_id = {r["id"]: r for r in spec["roles"]}
    _exigir(
        set(roles_por_id) == set(c["roles"]),
        f"escrow-v1 exige exactamente los roles {sorted(c['roles'])}; "
        f"la spec trae {sorted(roles_por_id)}.",
    )
    for rid in c["roles_con_atributo"]:
        _exigir(
            "atributo" in roles_por_id[rid],
            f"el rol {rid!r} de escrow-v1 exige atributo ABAC (ej. rol={rid}): "
            "sin atributo, cualquier cliente de su MSP podria ejercerlo.",
        )

    vistos = {}
    for t in spec["transiciones"]:
        vistos[(t["de"], t["a"], t["funcion"])] = tuple(sorted(t["quien"]))
    esperadas = {k: tuple(sorted(v)) for k, v in c["transiciones"].items()}
    _exigir(
        vistos == esperadas,
        "las transiciones de la spec no son 1:1 con escrow-v1.\n"
        f"  esperadas: {sorted(esperadas)}\n  llegaron:  {sorted(vistos)}\n"
        "La maquina de estados de la plantilla NO es parametrizable.",
    )

    regla = next(
        t.get("regla") for t in spec["transiciones"] if t["funcion"] == "resolver"
    )
    _exigir(
        isinstance(regla, str),
        "la transicion `resolver` de escrow-v1 exige la regla "
        "dentro_de_plazo(fecha_limite + Nd)",
    )
    m = c["regla_resolver"].match(regla)
    _exigir(
        bool(m),
        f"regla de `resolver` no soportada por escrow-v1: {regla!r} "
        "(formato exacto: dentro_de_plazo(fecha_limite + Nd))",
    )
    plazo_dias = int(m.group(1))
    _exigir(0 < plazo_dias <= 3650, f"plazo de resolucion fuera de rango: {plazo_dias}d")

    _exigir(
        len(spec["activos"]) == 1,
        "escrow-v1 modela UN activo (el deposito); la spec trae "
        f"{len(spec['activos'])}.",
    )
    activo = spec["activos"][0]
    campos = {cc["nombre"]: cc for cc in activo["campos"]}
    for nombre, tipo in c["campos_activo"].items():
        _exigir(
            nombre in campos and campos[nombre]["tipo"] == tipo,
            f"escrow-v1 exige el campo {nombre!r} de tipo {tipo!r} en el activo "
            f"(llego: { {n: cc['tipo'] for n, cc in campos.items()} }).",
        )
    extras = set(campos) - set(c["campos_activo"])
    _exigir(
        not extras,
        f"escrow-v1 no implementa los campos {sorted(extras)}: campos nuevos = "
        "plantilla nueva.",
    )
    monedas = campos["moneda"].get("enum")
    _exigir(
        bool(monedas),
        "escrow-v1 exige enum de monedas en el campo `moneda` (allowlist "
        "explicita, jamas moneda libre).",
    )
    for mo in monedas:
        _exigir(
            bool(_MONEDA_RE.match(mo)),
            f"moneda invalida para escrow-v1: {mo!r} (mayusculas A-Z0-9, 2-12).",
        )

    eventos_por_funcion = {e["en"]: e["nombre"] for e in spec["eventos"]}
    _exigir(
        set(eventos_por_funcion) == set(c["eventos"]),
        f"escrow-v1 emite eventos exactamente en {sorted(c['eventos'])}; la spec "
        f"declara eventos en {sorted(eventos_por_funcion)} (1:1 obligatorio).",
    )
    for nombre_ev in eventos_por_funcion.values():
        _exigir(
            re.fullmatch(r"[A-Za-z][A-Za-z0-9]{0,63}", nombre_ev) is not None,
            f"nombre de evento invalido para el chaincode: {nombre_ev!r}",
        )

    atributo = roles_por_id["arbitro"]["atributo"]
    clave_attr, valor_attr = atributo.split("=", 1)

    return {
        "msp_comprador": roles_por_id["comprador"]["msp"],
        "msp_vendedor": roles_por_id["vendedor"]["msp"],
        "msp_arbitro": roles_por_id["arbitro"]["msp"],
        "atributo_arbitro": clave_attr,
        "valor_atributo_arbitro": valor_attr,
        "plazo_dias": plazo_dias,
        "monedas": list(monedas),
        "evento_fondear": eventos_por_funcion["fondear"],
        "evento_abrir_disputa": eventos_por_funcion["abrir_disputa"],
        "evento_liberar_pago": eventos_por_funcion["liberar_pago"],
        "prefijo_clave": activo["id"] + ":",
    }


# ---------------------------------------------------------------------------
# Parametrizacion: reemplazos EXACTOS, cada uno debe ocurrir exactamente 1 vez.
# ---------------------------------------------------------------------------

def _sustituciones(p: dict) -> list[tuple[str, str]]:
    monedas_go = ", ".join(f'"{m}"' for m in p["monedas"])
    return [
        ('\tmspComprador = "Org1MSP"', f'\tmspComprador = "{p["msp_comprador"]}"'),
        ('\tmspVendedor  = "Org2MSP"', f'\tmspVendedor  = "{p["msp_vendedor"]}"'),
        ('\tmspArbitro   = "Org1MSP"', f'\tmspArbitro   = "{p["msp_arbitro"]}"'),
        ('\tatributoArbitro      = "rol"',
         f'\tatributoArbitro      = "{p["atributo_arbitro"]}"'),
        ('\tvalorAtributoArbitro = "arbitro"',
         f'\tvalorAtributoArbitro = "{p["valor_atributo_arbitro"]}"'),
        ("\tplazoResolucionSegundos int64 = 30 * 24 * 60 * 60",
         f"\tplazoResolucionSegundos int64 = {p['plazo_dias']} * 24 * 60 * 60"),
        ('\teventoDepositoFondeado = "DepositoFondeado"',
         f'\teventoDepositoFondeado = "{p["evento_fondear"]}"'),
        ('\teventoDisputaAbierta   = "DisputaAbierta"',
         f'\teventoDisputaAbierta   = "{p["evento_abrir_disputa"]}"'),
        ('\teventoPagoLiberado     = "PagoLiberado"',
         f'\teventoPagoLiberado     = "{p["evento_liberar_pago"]}"'),
        ('\tprefijoClave = "deposito:"', f'\tprefijoClave = "{p["prefijo_clave"]}"'),
        ('\tcase "USDC", "MXN":', f"\tcase {monedas_go}:"),
        ('return fmt.Errorf("moneda %q no permitida (validas: USDC, MXN)", moneda)',
         'return fmt.Errorf("moneda %q no permitida (validas: '
         + ", ".join(p["monedas"]) + ')", moneda)'),
    ]


def _parametrizar_chaincode(texto: str, p: dict) -> tuple[str, list[dict]]:
    diff = []
    for viejo, nuevo in _sustituciones(p):
        n = texto.count(viejo)
        _exigir(
            n == 1,
            f"punto de parametrizacion no encontrado exactamente 1 vez ({n}): "
            f"{viejo!r} — la plantilla en disco no coincide con la auditada.",
        )
        if viejo != nuevo:
            diff.append({"antes": viejo.strip(), "despues": nuevo.strip()})
        texto = texto.replace(viejo, nuevo, 1)
    return texto, diff


def _verificar_diff_acotado(original: str, generado: str, diff: list[dict]) -> None:
    """El paquete solo puede diferir de la plantilla en las lineas del diff."""
    a, b = original.splitlines(), generado.splitlines()
    _exigir(len(a) == len(b), "el chaincode generado cambio el numero de lineas")
    permitidas = {d["despues"] for d in diff}
    for i, (la, lb) in enumerate(zip(a, b), start=1):
        if la != lb:
            _exigir(
                lb.strip() in permitidas,
                f"linea {i} difiere fuera de los puntos de parametrizacion: {lb!r}",
            )


def _sha256(datos: bytes) -> str:
    return hashlib.sha256(datos).hexdigest()


def _coleccion_privada_config(spec: dict) -> list[dict] | None:
    """collections_config.json para `peer lifecycle ... --collections-config`."""
    if not spec["datos_privados"]:
        return None
    out = []
    for col in spec["datos_privados"]:
        miembros = ", ".join(f"'{o}.member'" for o in col["organizaciones"])
        out.append({
            "name": col["nombre"],
            "policy": f"OR({miembros})",
            "requiredPeerCount": 0,
            "maxPeerCount": len(col["organizaciones"]),
            "blockToLive": 0,
            "memberOnlyRead": True,
            "memberOnlyWrite": True,
        })
    return out


class FabricChaincodeEngine:
    """Parametriza plantillas del catalogo. Determinista; cero tokens."""

    def __init__(self, catalogo_dir: Path | str = CATALOGO_DIR):
        self.catalogo_dir = Path(catalogo_dir)

    def fabricar(self, spec_cruda: dict, destino: Path | str) -> dict:
        try:
            spec = validar_sc_spec(spec_cruda)
        except SpecInvalida as e:
            raise EngineError(f"spec invalida (contrato_sc): {e}") from e

        plantilla_dir = self.catalogo_dir / spec["plantilla"]
        _exigir(
            plantilla_dir.is_dir(),
            f"plantilla {spec['plantilla']!r} no esta en el catalogo en disco "
            f"({self.catalogo_dir})",
        )
        _exigir(spec["plantilla"] == "escrow-v1",
                f"el Engine v1 solo sabe parametrizar escrow-v1, "
                f"llego {spec['plantilla']!r}")
        params = _verificar_encaje_escrow_v1(spec)

        destino = Path(destino)
        _exigir(
            not destino.exists() or not any(destino.iterdir()),
            f"destino {destino} no esta vacio: la fabricacion no pisa trabajo previo",
        )
        (destino / "chaincode").mkdir(parents=True, exist_ok=True)
        (destino / "cmd").mkdir(exist_ok=True)

        # 1) copiar verbatim lo no-parametrizable
        for rel in ("go.mod", "go.sum", "cmd/main.go"):
            shutil.copy2(plantilla_dir / rel, destino / rel)

        # 2) parametrizar el chaincode (diff acotado, verificado)
        original = (plantilla_dir / "chaincode" / "escrow.go").read_text()
        generado, diff = _parametrizar_chaincode(original, params)
        _verificar_diff_acotado(original, generado, diff)
        (destino / "chaincode" / "escrow.go").write_text(generado)

        # 3) tests de criterios generados desde la spec (autocontenidos)
        tests = generar_criterios_test(spec, params)
        (destino / "chaincode" / "criterios_test.go").write_text(tests)

        # 4) colecciones privadas → artefacto de despliegue (no codigo)
        colecciones = _coleccion_privada_config(spec)
        if colecciones is not None:
            (destino / "collections_config.json").write_text(
                json.dumps(colecciones, indent=2) + "\n"
            )

        # 5) manifest con hashes (la trazabilidad empieza aqui)
        archivos = {}
        for f in sorted(p for p in destino.rglob("*") if p.is_file()):
            archivos[str(f.relative_to(destino))] = _sha256(f.read_bytes())
        paquete = hashlib.sha256()
        for rel, h in archivos.items():
            paquete.update(rel.encode())
            paquete.update(h.encode())
        manifest = {
            "nombre": spec["nombre"],
            "plantilla": spec["plantilla"],
            "canal_destino": spec["canal_destino"],
            "politica_endorsement": spec["politica_endorsement"],
            "parametros": params,
            "diff": diff,
            "archivos": archivos,
            "paquete_sha256": paquete.hexdigest(),
            "criterios_aceptacion": spec["criterios_aceptacion"],
            "engine": "FabricChaincodeEngine/escrow-v1 determinista",
        }
        (destino / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
        return manifest


class MockEngine:
    """Para tests de integracion del servicio: copia la plantilla tal cual.

    Cero validacion de encaje, cero tokens — el paquete resultante compila
    (es la plantilla misma) y trae manifest marcado como mock.
    """

    def __init__(self, catalogo_dir: Path | str = CATALOGO_DIR):
        self.catalogo_dir = Path(catalogo_dir)

    def fabricar(self, spec_cruda: dict, destino: Path | str) -> dict:
        spec = validar_sc_spec(spec_cruda)
        destino = Path(destino)
        shutil.copytree(self.catalogo_dir / spec["plantilla"], destino,
                        dirs_exist_ok=True)
        manifest = {"nombre": spec["nombre"], "plantilla": spec["plantilla"],
                    "mock": True}
        (destino / "manifest.json").write_text(json.dumps(manifest) + "\n")
        return manifest
