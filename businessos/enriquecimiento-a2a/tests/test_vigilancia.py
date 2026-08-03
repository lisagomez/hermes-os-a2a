"""vigilancia-69b.py — el PRODUCTOR del gate 69-B (QA PR #210: sin tests no hay
confianza en el componente que puede abrir el gate).

El modulo vive en businessos/ con guion en el nombre: se carga por path.
Sin red: se monkeypatchea vigilancia_69b.http entero.
"""
from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

RUTA = Path(__file__).resolve().parents[2] / "vigilancia-69b.py"
_spec = importlib.util.spec_from_file_location("vigilancia_69b", RUTA)
vig = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(vig)


def csv_sat(filas: list[tuple[str, str]], preambulo: int = 2) -> bytes:
    lineas = [f"linea de preambulo {i}" for i in range(preambulo)]
    lineas.append("No,RFC,Nombre del Contribuyente,Situación del contribuyente")
    lineas += [f"{i},{rfc},EMPRESA {i},{sit}" for i, (rfc, sit) in enumerate(filas, 1)]
    return "\n".join(lineas).encode("utf-8")


# ---- parseo del CSV ----------------------------------------------------------

def test_parsear_listado_salta_preambulo_y_mapea_estatus():
    crudo = csv_sat([("AAA010101AAA", "Definitivo"),
                     ("BBB020202BBB", "Presunto"),
                     ("CCC030303CCC", "Sentencia Favorable"),
                     ("DDD040404DDD", "Desvirtuado")])
    assert vig.parsear_listado(crudo) == {
        "AAA010101AAA": "definitivo", "BBB020202BBB": "presunto",
        "CCC030303CCC": "sentencia_favorable", "DDD040404DDD": "desvirtuado"}


def test_parsear_listado_latin1():
    crudo = ("x\nNo,RFC,Situación del contribuyente\n"
             "1,AAA010101AAA,Presunto").encode("latin-1")
    assert vig.parsear_listado(crudo) == {"AAA010101AAA": "presunto"}


def test_rfc_duplicado_gana_el_mas_severo_en_ambos_ordenes():
    a = csv_sat([("AAA010101AAA", "Presunto"), ("AAA010101AAA", "Definitivo")])
    b = csv_sat([("AAA010101AAA", "Definitivo"), ("AAA010101AAA", "Presunto")])
    assert vig.parsear_listado(a)["AAA010101AAA"] == "definitivo"
    assert vig.parsear_listado(b)["AAA010101AAA"] == "definitivo"


def test_sin_encabezado_revienta():
    import pytest
    with pytest.raises(RuntimeError, match="encabezado"):
        vig.parsear_listado(b"cualquier cosa\nsin,columnas,reales")


# ---- fake de red para main() -------------------------------------------------

class FakeHTTP:
    """Despacha por URL: Supabase (GET paginado + POST) y el CSV del SAT."""

    def __init__(self, sat_csv: bytes, intentos=None, vigilados=None) -> None:
        self.sat_csv = sat_csv
        self.intentos = intentos or []
        self.vigilados = vigilados or []
        self.posts: list[tuple[str, bytes]] = []

    def __call__(self, url, *, headers=None, data=None, method="GET", timeout=120):
        if method == "POST":
            self.posts.append((url, data))
            return 201, b""
        if "enriquecimiento_intento" in url:
            return 200, json.dumps(self.intentos).encode()
        if "contraparte_69b" in url:
            return 200, json.dumps(self.vigilados).encode()
        return 200, self.sat_csv  # el SAT


def correr_main(monkeypatch, fake: FakeHTTP, *argv: str,
                min_filas: str | None = "1") -> int:
    monkeypatch.setenv("SUPABASE_URL", "http://sb")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "k")
    if min_filas is None:
        monkeypatch.delenv("VIGILANCIA_69B_MIN_FILAS", raising=False)
    else:
        monkeypatch.setenv("VIGILANCIA_69B_MIN_FILAS", min_filas)
    monkeypatch.setattr(vig, "http", fake)
    monkeypatch.setattr(sys, "argv", ["vigilancia-69b.py", *argv])
    return vig.main()


# ---- guardas fail-closed (QA PR #210) ----------------------------------------

def test_listado_corto_aborta_sin_escribir_con_el_umbral_default(monkeypatch, capsys):
    # sin env: umbral default 5000 — un CSV con 1 fila JAMAS se escribe
    fake = FakeHTTP(csv_sat([("AAA010101AAA", "Definitivo")]))
    rc = correr_main(monkeypatch, fake, "--rfc", "BBB020202BBB", min_filas=None)
    assert rc == 1
    assert fake.posts == []
    assert "implausiblemente corto" in capsys.readouterr().out


def test_descenso_de_definitivo_aborta_sin_escribir(monkeypatch, capsys):
    # un vigilado definitivo que "desaparece" del listado abriria el gate: NO
    fake = FakeHTTP(csv_sat([("OTR010101OTR", "Presunto")]),
                    vigilados=[{"rfc": "AAA010101AAA", "estatus": "definitivo"}])
    rc = correr_main(monkeypatch, fake)
    assert rc == 1
    assert fake.posts == []
    assert "ABRIRIAN el gate" in capsys.readouterr().out


def test_permitir_descensos_deja_escribir_explicitamente(monkeypatch):
    # solo los OBJETIVOS se dictaminan (vigilados/ledger/--rfc), no todo el CSV
    fake = FakeHTTP(csv_sat([("OTR010101OTR", "Presunto")]),
                    vigilados=[{"rfc": "AAA010101AAA", "estatus": "definitivo"}])
    rc = correr_main(monkeypatch, fake, "--permitir-descensos")
    assert rc == 0
    assert len(fake.posts) == 1
    filas = json.loads(fake.posts[0][1])
    assert {f["rfc"]: f["estatus"] for f in filas} == {
        "AAA010101AAA": "no_listado"}


def test_descenso_a_estado_que_tambien_pasa_no_bloquea(monkeypatch):
    # sentencia_favorable -> no_listado: ambos PASAN el gate, no es fail-open
    fake = FakeHTTP(csv_sat([("OTR010101OTR", "Presunto")]),
                    vigilados=[{"rfc": "AAA010101AAA",
                                "estatus": "sentencia_favorable"}])
    rc = correr_main(monkeypatch, fake)
    assert rc == 0 and len(fake.posts) == 1


def test_dry_run_no_escribe(monkeypatch, capsys):
    fake = FakeHTTP(csv_sat([("AAA010101AAA", "Definitivo")]))
    rc = correr_main(monkeypatch, fake, "--rfc", "AAA010101AAA", "--dry-run")
    assert rc == 0
    assert fake.posts == []
    assert "dry-run" in capsys.readouterr().out


def test_upsert_escribe_estatus_y_no_listado(monkeypatch):
    fake = FakeHTTP(
        csv_sat([("AAA010101AAA", "Definitivo")]),
        intentos=[{"valor": "bbb020202bbb"}],  # la cascada guarda el RFC visto
        vigilados=[{"rfc": "AAA010101AAA", "estatus": "presunto"}],  # empeora: ok
    )
    rc = correr_main(monkeypatch, fake)
    assert rc == 0
    filas = json.loads(fake.posts[0][1])
    por_rfc = {f["rfc"]: f for f in filas}
    assert por_rfc["AAA010101AAA"]["estatus"] == "definitivo"
    assert por_rfc["BBB020202BBB"]["estatus"] == "no_listado"
    assert all(f["consultado_en"] for f in filas)


# ---- paginacion (el max-rows de PostgREST no trunca objetivos) ---------------

def test_supabase_get_pagina_hasta_la_pagina_corta(monkeypatch):
    paginas = [[{"rfc": f"R{i}"} for i in range(vig.PAGINA)],
               [{"rfc": "ULTIMO"}]]
    rangos: list[str] = []

    def fake_http(url, *, headers=None, data=None, method="GET", timeout=120):
        rangos.append(headers["Range"])
        return 200, json.dumps(paginas[len(rangos) - 1]).encode()

    monkeypatch.setattr(vig, "http", fake_http)
    filas = vig.supabase_get("http://sb", "k", "contraparte_69b?select=rfc")
    assert len(filas) == vig.PAGINA + 1
    assert rangos == [f"0-{vig.PAGINA - 1}", f"{vig.PAGINA}-{2 * vig.PAGINA - 1}"]
