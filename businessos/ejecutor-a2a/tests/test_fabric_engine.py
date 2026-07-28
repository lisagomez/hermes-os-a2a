"""Tests de RouterEngine y FabricPaqueteEngine (PRP-013, Fase 3).

RouterEngine rutea `contratos_inteligentes` SIEMPRE al motor determinista de la
fabrica, sin importar EJECUTOR_ENGINE — es el anti-patron #1 del PRP-013 (jamas
LLM para un contrato inmutable) hecho codigo, no solo docstring. FabricPaqueteEngine
es el adaptador Engine → FabricChaincodeEngine: cero tokens, cero red.
"""
from __future__ import annotations

import asyncio
from pathlib import Path

import pytest

from engine import EngineError, RouterEngine, crear_engine
from fabric_engine import FabricPaqueteEngine


def spec_escrow() -> dict:
    """Spec minima valida (espejo de la del PRP-013 / fabrica-sc/tests)."""
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


def tarea(**contexto) -> dict:
    return {
        "task_id": "t1",
        "departamento": "contratos_inteligentes",
        "objetivo": "fabricar escrow de prueba",
        "criterios_aceptacion": ["compila"],
        "contexto": contexto,
    }


# ---------- RouterEngine ----------

class _EngineEspia:
    """Motor de prueba que solo registra que lo llamaron — dispatch por identidad."""

    def __init__(self, nombre: str) -> None:
        self.nombre = nombre

    async def run(self, tarea: dict, worktree: Path) -> dict:
        return {"artefactos": {"engine": self.nombre}, "notas": ""}


def test_router_rutea_por_departamento(tmp_path):
    default = _EngineEspia("default")
    especial = _EngineEspia("especial")
    router = RouterEngine(default, {"contratos_inteligentes": especial})

    r1 = asyncio.run(router.run({"departamento": "contratos_inteligentes"}, tmp_path))
    r2 = asyncio.run(router.run({"departamento": "software"}, tmp_path))
    r3 = asyncio.run(router.run({}, tmp_path))  # sin departamento -> default

    assert r1["artefactos"]["engine"] == "especial"
    assert r2["artefactos"]["engine"] == "default"
    assert r3["artefactos"]["engine"] == "default"


def test_crear_engine_contratos_inteligentes_va_a_fabrica_siempre(tmp_path):
    """Ni con EJECUTOR_ENGINE=mock el departamento contratos_inteligentes toca el LLM."""
    router = crear_engine("mock")
    assert isinstance(router, RouterEngine)

    # software -> el motor por env (mock: escribe lo que dicta mock_cambios)
    r_software = asyncio.run(router.run(
        {"departamento": "software", "contexto": {"mock_cambios": {"a.txt": "x"}}}, tmp_path
    ))
    assert r_software["artefactos"]["engine"] == "mock"

    # contratos_inteligentes -> SIEMPRE la fabrica determinista, spec real requerida
    r_sc = asyncio.run(router.run(tarea(sc_spec=spec_escrow()["sc_spec"]), tmp_path))
    assert r_sc["artefactos"]["engine"] == "fabric-determinista"


def test_crear_engine_motor_desconocido_revienta():
    with pytest.raises(EngineError, match="desconocido"):
        crear_engine("gpt")


# ---------- FabricPaqueteEngine ----------

def test_fabric_engine_fabrica_paquete_en_worktree(tmp_path):
    engine = FabricPaqueteEngine()
    resultado = asyncio.run(engine.run(tarea(sc_spec=spec_escrow()["sc_spec"]), tmp_path))

    paquete = tmp_path / "paquete-sc"
    assert (paquete / "manifest.json").is_file()
    assert (paquete / "chaincode" / "escrow.go").is_file()
    assert (paquete / "chaincode" / "criterios_test.go").is_file()
    assert resultado["artefactos"]["engine"] == "fabric-determinista"
    assert resultado["artefactos"]["plantilla"] == "escrow-v1"
    assert resultado["artefactos"]["paquete_dir"] == "paquete-sc"
    assert resultado["artefactos"]["paquete_sha256"]


def test_fabric_engine_sin_spec_revienta_sin_gastar_nada():
    engine = FabricPaqueteEngine()
    with pytest.raises(EngineError, match="sc_spec"):
        asyncio.run(engine.run(tarea(), Path("/no/deberia/tocarse")))


def test_fabric_engine_spec_que_no_encaja_revienta_con_el_porque(tmp_path):
    spec = spec_escrow()["sc_spec"]
    spec["estados"][0] = "otro-inicial"
    engine = FabricPaqueteEngine()
    with pytest.raises(EngineError, match="no encaja en la plantilla"):
        asyncio.run(engine.run(tarea(sc_spec=spec), tmp_path))


# ---------- Registro en contratos_sc (Fase 5) ----------

class _RegistroEspia:
    def __init__(self, fallar: bool = False) -> None:
        self.llamadas: list[tuple] = []
        self._fallar = fallar

    @property
    def activo(self) -> bool:
        return True

    async def registrar_fabricacion(self, tarea, manifest, banderas, spec_norm):
        if self._fallar:
            raise RuntimeError("supabase caido")
        self.llamadas.append((tarea, manifest, banderas, spec_norm))


def test_fabricar_registra_fila_con_banderas_y_lineage(tmp_path):
    registro = _RegistroEspia()
    engine = FabricPaqueteEngine(registro=registro)
    ctx_tarea = tarea(sc_spec=spec_escrow()["sc_spec"], solicitante="telegram:123")
    resultado = asyncio.run(engine.run(ctx_tarea, tmp_path))

    assert len(registro.llamadas) == 1
    t, manifest, banderas, spec_norm = registro.llamadas[0]
    assert t["task_id"] == "t1"
    assert manifest["paquete_sha256"] == resultado["artefactos"]["paquete_sha256"]
    # La escrow canonica trae sus 2 banderas conocidas (ver fabrica-sc/tests).
    assert [b["codigo"] for b in banderas] == [
        "condicion_unilateral", "concentracion_poder",
    ]
    assert resultado["artefactos"]["banderas_g1"] == 2
    assert spec_norm["nombre"] == "escrow-compraventa-maquinaria"


def test_fila_de_registro_lleva_hash_origen_y_estado_fabricando():
    """El payload que arma RegistroContratosSC: upsert por task_id, lineage y G5."""
    import httpx

    from contratos_sc import RegistroContratosSC, spec_sha256

    capturas: list[httpx.Request] = []

    async def handler(request: httpx.Request) -> httpx.Response:
        capturas.append(request)
        return httpx.Response(201)

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    reg = RegistroContratosSC(url="https://x.supabase.co", key="k", http_client=client)
    manifest = {"plantilla": "escrow-v1", "paquete_sha256": "abc123",
                "canal_destino": "canal-clientes-demo"}
    spec_norm = {"nombre": "demo"}
    t = tarea(sc_spec={"nombre": "demo"}, solicitante="telegram:123")
    asyncio.run(reg.registrar_fabricacion(t, manifest, [{"codigo": "x"}], spec_norm))

    assert len(capturas) == 1
    req = capturas[0]
    assert "contratos_sc?on_conflict=task_id" in str(req.url)
    assert req.headers["Prefer"] == "resolution=merge-duplicates"
    import json as _json
    fila = _json.loads(req.content)
    assert fila["estado"] == "fabricando"
    assert fila["hash_paquete"] == "abc123"
    assert fila["solicitante"] == "telegram:123"
    assert fila["origen"]["spec_sha256"] == spec_sha256(spec_norm)
    assert fila["banderas"] == [{"codigo": "x"}]


def test_fallo_del_registro_no_tumba_la_fabricacion(tmp_path, capsys):
    """Best-effort logueado: Supabase caido NO detiene el pipeline (2026-07-13)."""
    import httpx

    from contratos_sc import RegistroContratosSC

    async def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("sin red")

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    reg = RegistroContratosSC(url="https://x.supabase.co", key="k", http_client=client)
    engine = FabricPaqueteEngine(registro=reg)
    resultado = asyncio.run(engine.run(tarea(sc_spec=spec_escrow()["sc_spec"]), tmp_path))

    assert resultado["artefactos"]["engine"] == "fabric-determinista"
    assert "fallo al registrar" in capsys.readouterr().err


def test_registro_sin_credenciales_es_noop_pero_avisa(capsys):
    from contratos_sc import RegistroContratosSC

    reg = RegistroContratosSC(url="", key="")
    asyncio.run(reg.registrar_fabricacion(
        {"task_id": "t9", "contexto": {}}, {"plantilla": "escrow-v1",
        "paquete_sha256": "x"}, [], {}))
    assert "NO registrada" in capsys.readouterr().err
