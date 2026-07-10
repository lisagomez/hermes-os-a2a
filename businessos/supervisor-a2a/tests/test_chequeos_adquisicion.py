"""Tests de los chequeos comerciales (Fase 9): gates binarios en dominio comercial.

La referencia de verdad (claims/precios/plantilla) vive versionada bajo
adquisicion/ del worktree; su ausencia = no_ejecutable = rechazo, jamas asumido.
"""
import hashlib
import json
import subprocess
from pathlib import Path

import pytest

import chequeos_adquisicion  # noqa: F401 — registra los chequeos en gates.CHEQUEOS
from gates import Gate, correr_gates

PLANTILLA = (
    "# Contrato de servicio white-label\n\n"
    "Cliente: {{cliente}}\n"
    "Precio mensual (USD): {{precio}}\n\n"
    "El servicio se presta bajo supervision con gates y aprobacion humana.\n"
    "Firma del cliente: {{firma_cliente}}\n"
)


@pytest.fixture()
def worktree(tmp_path: Path) -> Path:
    """Repo git plano con la politica comercial YA versionada (commit humano)."""
    wt = tmp_path / "worktree" / "adq-1"
    wt.mkdir(parents=True)
    for cmd in (
        ["git", "init", "-b", "tarea/adq-1"],
        ["git", "config", "user.email", "test@test"],
        ["git", "config", "user.name", "test"],
    ):
        subprocess.run(cmd, cwd=wt, check=True, capture_output=True)
    politica = wt / "adquisicion"
    (politica / "plantillas").mkdir(parents=True)
    (politica / "claims-aprobados.txt").write_text(
        "# claims aprobados (uno por linea)\n"
        "Departamento de software con IA bajo supervision humana\n"
        "Gates deterministas re-ejecutados antes de cada entrega\n"
    )
    (politica / "politica-precios.json").write_text(
        json.dumps({"moneda": "USD", "min": 500, "max": 5000})
    )
    (politica / "plantillas" / "contrato-whitelabel.md").write_text(PLANTILLA)
    subprocess.run(["git", "add", "-A"], cwd=wt, check=True, capture_output=True)
    subprocess.run(["git", "commit", "-m", "politica"], cwd=wt, check=True, capture_output=True)
    return wt


def correr(regla: str, worktree: Path):
    rs = correr_gates([Gate(regla, "estatico", chequeo=regla)], worktree)
    assert len(rs) == 1
    return rs[0]


# ---------- claims_aprobados ----------

def test_claim_aprobado_pasa(worktree):
    (worktree / "material").mkdir()
    (worktree / "material" / "pitch.md").write_text(
        "## Oferta\nCLAIM: Departamento de software con IA bajo supervision humana\n"
    )
    r = correr("claims_aprobados", worktree)
    assert r.estado == "paso"


def test_claim_inventado_falla_con_evidencia(worktree):
    (worktree / "material").mkdir()
    (worktree / "material" / "pitch.md").write_text(
        "CLAIM: El agente lo hace todo solo, sin humanos\n"
    )
    r = correr("claims_aprobados", worktree)
    assert r.estado == "fallo"
    assert "NO aprobado" in r.hallazgos[0]["evidencia"]
    assert r.hallazgos[0]["archivo"] == "material/pitch.md"


def test_lista_de_claims_ausente_es_no_ejecutable(worktree):
    (worktree / "adquisicion" / "claims-aprobados.txt").unlink()
    (worktree / "material").mkdir()
    (worktree / "material" / "pitch.md").write_text("CLAIM: lo que sea\n")
    r = correr("claims_aprobados", worktree)
    assert r.estado == "no_ejecutable"


def test_texto_libre_sin_claims_no_es_hallazgo(worktree):
    (worktree / "material").mkdir()
    (worktree / "material" / "notas.md").write_text("Notas internas sin afirmaciones.\n")
    r = correr("claims_aprobados", worktree)
    assert r.estado == "paso"


# ---------- precio_en_rango ----------

def test_precio_dentro_de_rango_pasa(worktree):
    (worktree / "propuesta-acme.json").write_text(
        json.dumps({"cliente": "ACME", "precio": 1200})
    )
    r = correr("precio_en_rango", worktree)
    assert r.estado == "paso"


def test_precio_fuera_de_rango_falla(worktree):
    (worktree / "propuesta-acme.json").write_text(
        json.dumps({"cliente": "ACME", "items": [{"concepto": "trio", "precio": 99999}]})
    )
    r = correr("precio_en_rango", worktree)
    assert r.estado == "fallo"
    assert "fuera del rango" in r.hallazgos[0]["evidencia"]


def test_politica_de_precios_ausente_es_no_ejecutable(worktree):
    (worktree / "adquisicion" / "politica-precios.json").unlink()
    (worktree / "oferta-x.json").write_text(json.dumps({"precio": 100}))
    r = correr("precio_en_rango", worktree)
    assert r.estado == "no_ejecutable"


def test_propuesta_json_invalido_falla(worktree):
    (worktree / "propuesta-rota.json").write_text("{no es json")
    r = correr("precio_en_rango", worktree)
    assert r.estado == "fallo"
    assert "JSON invalido" in r.hallazgos[0]["evidencia"]


# ---------- plantilla_contrato_intacta ----------

def contrato_relleno(cliente="ACME", precio="1200", firma="") -> str:
    return (
        PLANTILLA.replace("{{cliente}}", cliente)
        .replace("{{precio}}", precio)
        .replace("{{firma_cliente}}", firma or "pendiente de firma")
    )


def test_contrato_que_calza_con_plantilla_pasa(worktree):
    (worktree / "contratos").mkdir()
    (worktree / "contratos" / "acme.md").write_text(contrato_relleno())
    r = correr("plantilla_contrato_intacta", worktree)
    assert r.estado == "paso"


def test_contrato_modificado_fuera_de_campos_falla(worktree):
    (worktree / "contratos").mkdir()
    texto = contrato_relleno().replace(
        "bajo supervision con gates y aprobacion humana",
        "de forma 100% autonoma sin supervision",
    )
    (worktree / "contratos" / "acme.md").write_text(texto)
    r = correr("plantilla_contrato_intacta", worktree)
    assert r.estado == "fallo"
    assert "fuera de los campos variables" in r.hallazgos[0]["evidencia"]


def test_plantilla_ausente_es_no_ejecutable(worktree):
    (worktree / "adquisicion" / "plantillas" / "contrato-whitelabel.md").unlink()
    (worktree / "contratos").mkdir()
    (worktree / "contratos" / "acme.md").write_text(contrato_relleno())
    r = correr("plantilla_contrato_intacta", worktree)
    assert r.estado == "no_ejecutable"


# ---------- salientes_con_aprobacion ----------

def aprobar(worktree: Path, rel: str, rol="PM") -> None:
    contenido = (worktree / rel).read_bytes()
    apr = worktree / "aprobaciones" / f"{rel}.json"
    apr.parent.mkdir(parents=True, exist_ok=True)
    apr.write_text(json.dumps({
        "aprobado_por": rol,
        "fecha": "2026-07-10",
        "sha256": hashlib.sha256(contenido).hexdigest(),
    }))


def test_saliente_con_aprobacion_vigente_pasa(worktree):
    (worktree / "salientes").mkdir()
    (worktree / "salientes" / "correo-acme.md").write_text("Hola ACME\n")
    aprobar(worktree, "salientes/correo-acme.md")
    r = correr("salientes_con_aprobacion", worktree)
    assert r.estado == "paso"


def test_saliente_sin_aprobacion_falla(worktree):
    (worktree / "salientes").mkdir()
    (worktree / "salientes" / "correo-acme.md").write_text("Hola ACME\n")
    r = correr("salientes_con_aprobacion", worktree)
    assert r.estado == "fallo"
    assert "sin registro de aprobacion" in r.hallazgos[0]["evidencia"]


def test_saliente_editado_despues_de_aprobar_falla(worktree):
    (worktree / "salientes").mkdir()
    (worktree / "salientes" / "correo-acme.md").write_text("Hola ACME\n")
    aprobar(worktree, "salientes/correo-acme.md")
    (worktree / "salientes" / "correo-acme.md").write_text("Hola ACME, precio secreto 1 USD\n")
    r = correr("salientes_con_aprobacion", worktree)
    assert r.estado == "fallo"
    assert "sha256" in r.hallazgos[0]["evidencia"]


def test_aprobador_fuera_de_la_matriz_falla(worktree):
    (worktree / "salientes").mkdir()
    (worktree / "salientes" / "correo-acme.md").write_text("Hola ACME\n")
    aprobar(worktree, "salientes/correo-acme.md", rol="becario")
    r = correr("salientes_con_aprobacion", worktree)
    assert r.estado == "fallo"
    assert "aprobado_por invalido" in r.hallazgos[0]["evidencia"]


# ---------- politica_intocable ----------

def test_motor_tocando_la_politica_falla(worktree):
    (worktree / "adquisicion" / "claims-aprobados.txt").write_text(
        "El agente lo hace todo solo\n"  # el motor intenta auto-aprobarse claims
    )
    r = correr("politica_intocable", worktree)
    assert r.estado == "fallo"
    assert r.hallazgos[0]["archivo"] == "adquisicion/claims-aprobados.txt"


def test_cambios_fuera_de_la_politica_pasan(worktree):
    (worktree / "material").mkdir()
    (worktree / "material" / "pitch.md").write_text("borrador\n")
    r = correr("politica_intocable", worktree)
    assert r.estado == "paso"


# ---------- dogfood: la config REAL de adquisicion sobre un worktree completo ----------

def gates_reales_activos():
    from pathlib import Path as P
    from gates import cargar_configs
    configs = cargar_configs(P(__file__).resolve().parent.parent / "reglas")
    return [g for g in configs["adquisicion"] if g.activo]


def test_dogfood_propuesta_buena_todos_los_gates_pasan(worktree):
    """El recorrido de adquisicion-clientes.md §8: propuesta para el lead ACME."""
    (worktree / "material").mkdir()
    (worktree / "material" / "pitch-acme.md").write_text(
        "## Por que nosotros\n"
        "CLAIM: Departamento de software con IA bajo supervision humana\n"
        "CLAIM: Gates deterministas re-ejecutados antes de cada entrega\n"
    )
    (worktree / "propuesta-acme.json").write_text(
        json.dumps({"cliente": "ACME", "precio": 1500, "alcance": "trio white-label"})
    )
    (worktree / "salientes").mkdir()
    (worktree / "salientes" / "correo-acme.md").write_text("Hola ACME, adjunto propuesta\n")
    aprobar(worktree, "salientes/correo-acme.md", rol="PM")

    resultados = correr_gates(gates_reales_activos(), worktree)
    assert all(r.estado == "paso" for r in resultados), [
        (r.regla, r.estado, r.evidencia) for r in resultados if r.estado != "paso"
    ]


def test_dogfood_propuesta_mala_rechazada_con_evidencia(worktree):
    """Claim inventado + precio fuera de rango → los DOS gates fallan con hallazgo."""
    (worktree / "material").mkdir()
    (worktree / "material" / "pitch-acme.md").write_text(
        "CLAIM: El agente lo hace todo solo, sin supervision\n"
    )
    (worktree / "propuesta-acme.json").write_text(json.dumps({"precio": 50000}))

    resultados = {r.regla: r for r in correr_gates(gates_reales_activos(), worktree)}
    assert resultados["claims_aprobados"].estado == "fallo"
    assert resultados["precio_en_rango"].estado == "fallo"
    assert all(r.hallazgos for r in resultados.values() if r.estado == "fallo")
