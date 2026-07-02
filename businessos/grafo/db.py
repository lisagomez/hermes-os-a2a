"""db.py — acceso a postgres del grafo (Fase D). Lazy por diseno:

importar este modulo NO abre conexiones (gotcha PRP-002: el openapi.json se
genera sin DB). Cada funcion conecta al llamarse; el conocimiento (reglas +
categorias) se cachea en memoria tras la primera carga — solo cambia con un
reseed, y un reseed real implica recrear el volumen y reiniciar el servicio.
"""
from __future__ import annotations

import json
import os
from functools import lru_cache
from typing import Any

import psycopg
from psycopg.rows import dict_row


def _dsn() -> str:
    dsn = os.environ.get("GRAFO_DATABASE_URL")
    if not dsn:
        raise RuntimeError("GRAFO_DATABASE_URL no definida")
    return dsn


def _conectar() -> psycopg.Connection:
    return psycopg.connect(_dsn(), row_factory=dict_row, connect_timeout=5)


def ensamblar_conocimiento(
    categorias: list[dict], reglas: list[dict], impactos: list[dict]
) -> dict[str, Any]:
    """Arma la forma anidada que consume evaluador.py (pura, testeable sin DB).

    Fechas llegan como date (psycopg) o str (tests); salen como ISO str.
    """
    def iso(v: Any) -> str | None:
        return None if v is None else (v if isinstance(v, str) else v.isoformat())

    por_regla: dict[int, list[dict]] = {}
    for imp in impactos:
        por_regla.setdefault(imp["regla_id"], []).append({
            "categoria": imp["categoria"],
            "regimen": imp["regimen"],
            "veredicto_base": imp["veredicto_base"],
            "tope_monto": None if imp["tope_monto"] is None else float(imp["tope_monto"]),
            "tope_pct": None if imp["tope_pct"] is None else float(imp["tope_pct"]),
            "requisitos": imp["requisitos"],
            "banderas": imp["banderas"],
            "parametros": imp["parametros"],
        })

    return {
        "categorias": [
            {
                "clave": c["clave"],
                "nombre": c["nombre"],
                "descripcion": c["descripcion"],
                "keywords": list(c["keywords"]),
            }
            for c in categorias
        ],
        "reglas": [
            {
                "clave": r["clave"],
                "jurisdiccion": r["jurisdiccion"],
                "dimension": r["dimension"],
                "titulo": r["titulo"],
                "texto_resumen": r["texto_resumen"],
                "fuente_cita": r["fuente_cita"],
                "fuente_url": r["fuente_url"],
                "source_version": r["source_version"],
                "vigente_desde": iso(r["vigente_desde"]),
                "vigente_hasta": iso(r["vigente_hasta"]),
                "impactos": por_regla.get(r["id"], []),
            }
            for r in reglas
        ],
    }


@lru_cache(maxsize=1)
def conocimiento() -> dict[str, Any]:
    with _conectar() as conn:
        categorias = conn.execute(
            "select clave, nombre, descripcion, keywords from categorias_gasto order by clave"
        ).fetchall()
        reglas = conn.execute(
            "select id, clave, jurisdiccion, dimension, titulo, texto_resumen, fuente_cita,"
            "       fuente_url, source_version, vigente_desde, vigente_hasta"
            "  from reglas order by clave"
        ).fetchall()
        impactos = conn.execute(
            "select regla_id, categoria, regimen, veredicto_base, tope_monto, tope_pct,"
            "       requisitos, banderas, parametros from impactos order by id"
        ).fetchall()
    return ensamblar_conocimiento(categorias, reglas, impactos)


def contar_reglas() -> int:
    with _conectar() as conn:
        fila = conn.execute("select count(*) as n from reglas").fetchone()
        return int(fila["n"])


def guardar_evaluacion(contexto: dict, entrada: list[dict], salida: dict) -> str | None:
    """Persiste la evaluacion; best-effort (una DB caida no tumba el dictamen)."""
    try:
        with _conectar() as conn:
            fila = conn.execute(
                "insert into evaluaciones (contexto, entrada, salida)"
                " values (%s::jsonb, %s::jsonb, %s::jsonb) returning id",
                (
                    json.dumps(contexto, ensure_ascii=False),
                    json.dumps(entrada, ensure_ascii=False),
                    json.dumps(salida, ensure_ascii=False),
                ),
            ).fetchone()
            conn.commit()
            return str(fila["id"])
    except Exception:
        return None
