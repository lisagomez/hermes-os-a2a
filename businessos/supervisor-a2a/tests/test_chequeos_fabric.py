"""Tests de los chequeos estaticos del departamento contratos_inteligentes
(Fase 4, PRP-013): gates binarios sobre el paquete `paquete-sc/` que el
FabricChaincodeEngine deja en el worktree.

El paquete gateado SIEMPRE sale del engine real de fabrica-sc/ (nunca una
fixture escrita a mano): asi los tests no divergen del formato real del
manifest, y `diff_acotado_plantilla` compara contra la MISMA plantilla
auditada que produjo el paquete (FABRICA_PLANTILLAS -> fabrica-sc/plantillas).
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

import chequeos_fabric  # noqa: F401 — registra los chequeos en gates.CHEQUEOS
from gates import Gate, correr_gates

_FABRICA_SC = Path(__file__).resolve().parent.parent.parent / "fabrica-sc"
for _p in (_FABRICA_SC, _FABRICA_SC / "engine"):
    if str(_p) not in sys.path:
        sys.path.insert(0, str(_p))

from fabrica import FabricChaincodeEngine  # noqa: E402


def spec_escrow() -> dict:
    """Spec minima valida (espejo de la del PRP-013)."""
    return {
        "sc_spec": {
            "version": 1,
            "nombre": "escrow-compraventa-maquinaria",
            "plantilla": "escrow-v1",
            "descripcion": "Deposito en garantia con arbitro.",
            "canal_destino": "canal-clientes-demo",
            "organizaciones": ["Org1MSP", "Org2MSP"],
            "roles": [
                {"id": "comprador", "msp": "Org1MSP"},
                {"id": "vendedor", "msp": "Org2MSP"},
                {"id": "arbitro", "msp": "Org1MSP", "atributo": "rol=arbitro"},
            ],
            "activos": [
                {
                    "id": "deposito",
                    "campos": [
                        {"nombre": "monto", "tipo": "uint", "requerido": True},
                        {"nombre": "moneda", "tipo": "string", "enum": ["USDC", "MXN"]},
                        {"nombre": "fecha_limite", "tipo": "timestamp", "requerido": True},
                    ],
                }
            ],
            "estados": [
                "creado", "fondeado", "entregado", "liberado",
                "disputado", "resuelto", "cancelado",
            ],
            "transiciones": [
                {"de": "creado", "a": "fondeado", "quien": ["comprador"], "funcion": "fondear"},
                {"de": "fondeado", "a": "entregado", "quien": ["vendedor"], "funcion": "marcar_entrega"},
                {"de": "entregado", "a": "liberado", "quien": ["comprador"], "funcion": "liberar_pago"},
                {"de": "fondeado", "a": "disputado", "quien": ["comprador", "vendedor"], "funcion": "abrir_disputa"},
                {"de": "disputado", "a": "resuelto", "quien": ["arbitro"], "funcion": "resolver",
                 "regla": "dentro_de_plazo(fecha_limite + 30d)"},
                {"de": "creado", "a": "cancelado", "quien": ["comprador"], "funcion": "cancelar"},
            ],
            "eventos": [
                {"nombre": "DepositoFondeado", "en": "fondear"},
                {"nombre": "DisputaAbierta", "en": "abrir_disputa"},
                {"nombre": "PagoLiberado", "en": "liberar_pago"},
            ],
            "datos_privados": [],
            "politica_endorsement": "AND('Org1MSP.peer','Org2MSP.peer')",
            "criterios_aceptacion": [
                "comprador puede fondear un deposito creado",
                "vendedor NO puede liberar_pago",
                "resolver falla fuera del plazo de 30 dias",
                "PagoLiberado se emite al liberar",
            ],
        }
    }


@pytest.fixture()
def worktree(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """worktree con paquete-sc/ REAL, fabricado por el engine determinista."""
    wt = tmp_path / "worktree" / "ci-1"
    wt.mkdir(parents=True)
    FabricChaincodeEngine().fabricar(spec_escrow(), wt / "paquete-sc")
    monkeypatch.setenv("FABRICA_PLANTILLAS", str(_FABRICA_SC / "plantillas"))
    return wt


def correr(regla: str, worktree: Path):
    rs = correr_gates([Gate(regla, "estatico", chequeo=regla)], worktree)
    assert len(rs) == 1
    return rs[0]


# ---------- paquete_sc_presente ----------

def test_paquete_completo_pasa(worktree):
    r = correr("paquete_sc_presente", worktree)
    assert r.estado == "paso"


def test_paquete_incompleto_falla_listando_lo_que_falta(worktree):
    (worktree / "paquete-sc" / "manifest.json").unlink()
    r = correr("paquete_sc_presente", worktree)
    assert r.estado == "fallo"
    assert "manifest.json" in r.hallazgos[0]["evidencia"]


def test_paquete_ausente_falla(tmp_path):
    wt = tmp_path / "worktree" / "ci-vacio"
    wt.mkdir(parents=True)
    r = correr("paquete_sc_presente", wt)
    assert r.estado == "fallo"


# ---------- manifest_integro ----------

def test_manifest_integro_pasa_recien_fabricado(worktree):
    r = correr("manifest_integro", worktree)
    assert r.estado == "paso"


def test_archivo_tocado_tras_fabricar_falla_por_sha256(worktree):
    escrow = worktree / "paquete-sc" / "chaincode" / "escrow.go"
    escrow.write_text(escrow.read_text() + "\n// linea colada tras fabricar\n")
    r = correr("manifest_integro", worktree)
    assert r.estado == "fallo"
    assert any("sha256 distinto" in h["evidencia"] for h in r.hallazgos)


def test_archivo_de_contrabando_falla(worktree):
    (worktree / "paquete-sc" / "chaincode" / "extra.go").write_text("package chaincode\n")
    r = correr("manifest_integro", worktree)
    assert r.estado == "fallo"
    assert any("fuera del manifest" in h["evidencia"] for h in r.hallazgos)


def test_manifest_ilegible_falla(worktree):
    (worktree / "paquete-sc" / "manifest.json").write_text("{no es json")
    r = correr("manifest_integro", worktree)
    assert r.estado == "fallo"
    assert "ilegible" in r.evidencia or "ausente" in r.evidencia


# ---------- diff_acotado_plantilla ----------

def test_diff_acotado_contra_la_plantilla_real_pasa(worktree):
    r = correr("diff_acotado_plantilla", worktree)
    assert r.estado == "paso"


def test_linea_fuera_del_diff_declarado_falla(worktree):
    escrow = worktree / "paquete-sc" / "chaincode" / "escrow.go"
    # tocar una linea que NO es punto de parametrizacion (comentario de cabecera)
    texto = escrow.read_text().replace(
        "// Package chaincode — escrow-v1: la plantilla base auditada de la fabrica de SC (PRP-013).",
        "// Package chaincode — TROYANO: nada que ver con la plantilla auditada.",
        1,
    )
    escrow.write_text(texto)
    r = correr("diff_acotado_plantilla", worktree)
    assert r.estado == "fallo"
    assert any("difiere fuera del diff declarado" in h["evidencia"] for h in r.hallazgos)


def test_archivo_verbatim_modificado_falla(worktree):
    (worktree / "paquete-sc" / "go.mod").write_text("module troyano\n\ngo 1.24\n")
    r = correr("diff_acotado_plantilla", worktree)
    assert r.estado == "fallo"
    assert any(h.get("archivo") == "go.mod" for h in r.hallazgos)


def test_plantilla_de_referencia_ausente_es_no_ejecutable(worktree, monkeypatch):
    monkeypatch.setenv("FABRICA_PLANTILLAS", "/no/existe/catalogo")
    r = correr("diff_acotado_plantilla", worktree)
    assert r.estado == "no_ejecutable"


# ---------- determinismo_chaincode ----------

def test_chaincode_generado_real_sin_no_determinismo_pasa(worktree):
    r = correr("determinismo_chaincode", worktree)
    assert r.estado == "paso"


def test_time_now_en_codigo_falla(worktree):
    escrow = worktree / "paquete-sc" / "chaincode" / "escrow.go"
    escrow.write_text(escrow.read_text() + '\nfunc hackTimestamp() int64 { return time.Now().Unix() }\n')
    r = correr("determinismo_chaincode", worktree)
    assert r.estado == "fallo"
    assert any("time.Now(" in h["evidencia"] for h in r.hallazgos)


def test_token_prohibido_solo_en_comentario_no_cuenta(worktree):
    escrow = worktree / "paquete-sc" / "chaincode" / "escrow.go"
    escrow.write_text(escrow.read_text() + "\n// nunca usar time.Now() aqui, ver README\n")
    r = correr("determinismo_chaincode", worktree)
    assert r.estado == "paso"


# ---------- dogfood: los 4 chequeos estaticos sobre un paquete bueno ----------

def test_dogfood_paquete_bueno_los_cuatro_chequeos_pasan(worktree):
    reglas = ["paquete_sc_presente", "manifest_integro", "diff_acotado_plantilla",
              "determinismo_chaincode"]
    resultados = correr_gates([Gate(r, "estatico", chequeo=r) for r in reglas], worktree)
    assert all(r.estado == "paso" for r in resultados), [
        (r.regla, r.estado, r.evidencia) for r in resultados if r.estado != "paso"
    ]
