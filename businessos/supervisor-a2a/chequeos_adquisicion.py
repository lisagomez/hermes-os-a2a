"""chequeos_adquisicion.py — chequeos estaticos del departamento ADQUISICION (Fase 9).

El reto del dominio comercial: los gates deben seguir siendo (chequeo real →
criterio binario → evidencia), como en software. La referencia de verdad
(claims aprobados, politica de precios, plantilla de contrato) vive VERSIONADA
en el repo objetivo bajo `adquisicion/` y el motor NO puede tocarla (gate
`politica_intocable` cierra el hueco de reescribirla para pasar los demas).

Limite honesto (spec §6): `salientes_con_aprobacion` garantiza INTEGRIDAD (el
documento no cambio tras aprobarse — sha256), no AUTENTICIDAD (que el aprobador
sea quien dice ser); la autenticidad se verifica en la frontera de envio
(host-job contra Supabase, fase posterior). En el tramo 1 no hay envios.

Import unidireccional: este modulo importa de `gates` y SE REGISTRA en
`gates.CHEQUEOS` al importarse (executor.py lo importa). gates.py no lo conoce.
"""
from __future__ import annotations

import fnmatch
import hashlib
import json
import re
from pathlib import Path

import gates
from gates import Gate, ResultadoGate

ROLES_APROBADORES = ("PM", "CEO", "CFO")  # matriz de equipo-y-slack.md

DIR_POLITICA = "adquisicion"
RUTA_CLAIMS = f"{DIR_POLITICA}/claims-aprobados.txt"
RUTA_PRECIOS = f"{DIR_POLITICA}/politica-precios.json"
RUTA_PLANTILLA = f"{DIR_POLITICA}/plantillas/contrato-whitelabel.md"

_CLAIM_RE = re.compile(r"^\s*CLAIM:\s*(.+?)\s*$", re.MULTILINE)
_CAMPO_RE = re.compile(r"\{\{[a-zA-Z0-9_]+\}\}")
_CLAVES_PRECIO = ("precio", "precio_usd", "monto", "importe", "total")


def _rel(archivo: Path, worktree: Path) -> str:
    return str(archivo.relative_to(worktree))


def _paso(gate: Gate, descripcion: str, n: int) -> ResultadoGate:
    return ResultadoGate(
        regla=gate.regla, estado="paso",
        evidencia=f"{descripcion}: {n} archivo(s) revisados, sin hallazgos",
    )


def _fallo(gate: Gate, descripcion: str, hallazgos: list[dict]) -> ResultadoGate:
    return ResultadoGate(
        regla=gate.regla, estado="fallo",
        evidencia=f"{descripcion}: {len(hallazgos)} hallazgo(s)",
        hallazgos=hallazgos,
    )


def _no_ejecutable(gate: Gate, evidencia: str) -> ResultadoGate:
    return ResultadoGate(
        regla=gate.regla, estado="no_ejecutable", evidencia=evidencia,
        hallazgos=[{"regla": gate.regla, "evidencia": evidencia}],
    )


def _sin_git(gate: Gate) -> ResultadoGate:
    return _no_ejecutable(gate, "git no pudo listar los archivos cambiados del worktree")


# ---------- claims_aprobados ----------

def _claims_aprobados(gate: Gate, worktree: Path, archivos: list[Path] | None) -> ResultadoGate:
    """Toda linea `CLAIM: ...` en material cambiado existe TEXTUAL en la lista aprobada."""
    if archivos is None:
        return _sin_git(gate)
    lista = worktree / RUTA_CLAIMS
    if not lista.is_file():
        return _no_ejecutable(gate, f"lista de claims aprobados ausente: {RUTA_CLAIMS}")
    aprobados = {
        linea.strip() for linea in lista.read_text(encoding="utf-8").splitlines()
        if linea.strip() and not linea.lstrip().startswith("#")
    }
    hallazgos, revisados = [], 0
    for archivo in archivos:
        rel = _rel(archivo, worktree)
        if not (rel.startswith(("material/", "salientes/")) and rel.endswith(".md")):
            continue
        if not archivo.is_file():
            continue
        revisados += 1
        texto = archivo.read_text(encoding="utf-8")
        for m in _CLAIM_RE.finditer(texto):
            claim = m.group(1)
            if claim not in aprobados:
                linea = texto[: m.start()].count("\n") + 1
                hallazgos.append({
                    "regla": gate.regla, "archivo": rel,
                    "evidencia": f"claim NO aprobado en linea {linea}: {claim!r} "
                                 f"(no existe textual en {RUTA_CLAIMS})",
                })
    if hallazgos:
        return _fallo(gate, "claims contra lista aprobada", hallazgos)
    return _paso(gate, "claims contra lista aprobada", revisados)


# ---------- precio_en_rango ----------

def _precios_de(obj: object, ruta: str = "") -> list[tuple[str, float]]:
    """Recorre el JSON y junta (ruta, valor) de toda clave que parezca precio."""
    out: list[tuple[str, float]] = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            aqui = f"{ruta}.{k}" if ruta else k
            if k in _CLAVES_PRECIO and isinstance(v, (int, float)) and not isinstance(v, bool):
                out.append((aqui, float(v)))
            else:
                out.extend(_precios_de(v, aqui))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            out.extend(_precios_de(v, f"{ruta}[{i}]"))
    return out


def _precio_en_rango(gate: Gate, worktree: Path, archivos: list[Path] | None) -> ResultadoGate:
    """Todo precio en propuestas/ofertas cambiadas cae dentro de la politica [min,max]."""
    if archivos is None:
        return _sin_git(gate)
    politica_path = worktree / RUTA_PRECIOS
    if not politica_path.is_file():
        return _no_ejecutable(gate, f"politica de precios ausente: {RUTA_PRECIOS}")
    try:
        politica = json.loads(politica_path.read_text(encoding="utf-8"))
        p_min, p_max = float(politica["min"]), float(politica["max"])
    except (json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
        return _no_ejecutable(gate, f"politica de precios ilegible ({RUTA_PRECIOS}): {exc}")

    hallazgos, revisados = [], 0
    for archivo in archivos:
        rel = _rel(archivo, worktree)
        nombre = archivo.name
        if not (fnmatch.fnmatch(nombre, "propuesta*.json") or fnmatch.fnmatch(nombre, "oferta*.json")):
            continue
        if not archivo.is_file():
            continue
        revisados += 1
        try:
            datos = json.loads(archivo.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            hallazgos.append({
                "regla": gate.regla, "archivo": rel,
                "evidencia": f"JSON invalido (imposible verificar precios): {exc}",
            })
            continue
        for ruta_clave, valor in _precios_de(datos):
            if not (p_min <= valor <= p_max):
                hallazgos.append({
                    "regla": gate.regla, "archivo": rel,
                    "evidencia": f"{ruta_clave}={valor} fuera del rango autorizado "
                                 f"[{p_min}, {p_max}] ({RUTA_PRECIOS})",
                })
    if hallazgos:
        return _fallo(gate, "precios contra politica", hallazgos)
    return _paso(gate, "precios contra politica", revisados)


# ---------- plantilla_contrato_intacta ----------

def _regex_de_plantilla(plantilla: str) -> re.Pattern:
    """La plantilla literal, con cada `{{campo}}` como grupo de captura no vacio."""
    partes, pos = [], 0
    for m in _CAMPO_RE.finditer(plantilla):
        partes.append(re.escape(plantilla[pos:m.start()]))
        partes.append(r"(.+?)")
        pos = m.end()
    partes.append(re.escape(plantilla[pos:]))
    return re.compile("".join(partes), re.DOTALL)


def _primera_divergencia(plantilla: str, texto: str) -> str:
    """Punto aproximado donde el contrato se aparta de la plantilla (evidencia)."""
    # compara fuera de los campos variables: usa el prefijo hasta el primer {{
    prefijo = plantilla.split("{{")[0]
    comun = 0
    for a, b in zip(prefijo, texto):
        if a != b:
            break
        comun += 1
    linea = texto[:comun].count("\n") + 1
    return f"diverge de la plantilla alrededor de la linea {linea}"


def _plantilla_contrato_intacta(gate: Gate, worktree: Path, archivos: list[Path] | None) -> ResultadoGate:
    """Todo contratos/*.md cambiado calza EXACTO con la plantilla salvo {{campos}}."""
    if archivos is None:
        return _sin_git(gate)
    plantilla_path = worktree / RUTA_PLANTILLA
    if not plantilla_path.is_file():
        return _no_ejecutable(gate, f"plantilla de contrato ausente: {RUTA_PLANTILLA}")
    plantilla = plantilla_path.read_text(encoding="utf-8")
    patron = _regex_de_plantilla(plantilla)

    hallazgos, revisados = [], 0
    for archivo in archivos:
        rel = _rel(archivo, worktree)
        if not (rel.startswith("contratos/") and rel.endswith(".md")):
            continue
        if not archivo.is_file():
            continue
        revisados += 1
        texto = archivo.read_text(encoding="utf-8")
        m = patron.fullmatch(texto)
        if m is None:
            hallazgos.append({
                "regla": gate.regla, "archivo": rel,
                "evidencia": f"modificado fuera de los campos variables: "
                             f"{_primera_divergencia(plantilla, texto)} "
                             f"(plantilla: {RUTA_PLANTILLA})",
            })
        else:
            vacios = [i + 1 for i, g in enumerate(m.groups()) if not g.strip()]
            if vacios:
                hallazgos.append({
                    "regla": gate.regla, "archivo": rel,
                    "evidencia": f"campos variables sin rellenar (grupos {vacios})",
                })
    if hallazgos:
        return _fallo(gate, "contratos contra plantilla", hallazgos)
    return _paso(gate, "contratos contra plantilla", revisados)


# ---------- salientes_con_aprobacion ----------

def _salientes_con_aprobacion(gate: Gate, worktree: Path, archivos: list[Path] | None) -> ResultadoGate:
    """Todo cambio bajo salientes/ exige aprobaciones/<ruta>.json con sha256 vigente."""
    if archivos is None:
        return _sin_git(gate)
    hallazgos, revisados = [], 0
    for archivo in archivos:
        rel = _rel(archivo, worktree)
        if not rel.startswith("salientes/"):
            continue
        if not archivo.is_file():
            continue  # borrado: nada que enviar, nada que aprobar
        revisados += 1
        aprobacion_path = worktree / "aprobaciones" / f"{rel}.json"
        if not aprobacion_path.is_file():
            hallazgos.append({
                "regla": gate.regla, "archivo": rel,
                "evidencia": f"sin registro de aprobacion: falta aprobaciones/{rel}.json",
            })
            continue
        try:
            apr = json.loads(aprobacion_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            hallazgos.append({
                "regla": gate.regla, "archivo": rel,
                "evidencia": f"aprobacion ilegible (aprobaciones/{rel}.json): {exc}",
            })
            continue
        rol = apr.get("aprobado_por")
        if rol not in ROLES_APROBADORES:
            hallazgos.append({
                "regla": gate.regla, "archivo": rel,
                "evidencia": f"aprobado_por invalido: {rol!r} (roles: {ROLES_APROBADORES})",
            })
            continue
        if not str(apr.get("fecha", "")).strip():
            hallazgos.append({
                "regla": gate.regla, "archivo": rel,
                "evidencia": "aprobacion sin fecha",
            })
            continue
        sha_actual = hashlib.sha256(archivo.read_bytes()).hexdigest()
        if apr.get("sha256") != sha_actual:
            hallazgos.append({
                "regla": gate.regla, "archivo": rel,
                "evidencia": "sha256 de la aprobacion NO coincide con el contenido actual "
                             "(el documento cambio despues de aprobarse)",
            })
    if hallazgos:
        return _fallo(gate, "salientes con aprobacion registrada", hallazgos)
    return _paso(gate, "salientes con aprobacion registrada", revisados)


# ---------- politica_intocable ----------

def _politica_intocable(gate: Gate, worktree: Path, archivos: list[Path] | None) -> ResultadoGate:
    """El motor NUNCA toca adquisicion/ (cambiar la politica = PR humano, gate CEO)."""
    if archivos is None:
        return _sin_git(gate)
    hallazgos = []
    for archivo in archivos:
        rel = _rel(archivo, worktree)
        if rel.startswith(f"{DIR_POLITICA}/"):
            # aplica tambien a borrados/renombrados: la RUTA basta como violacion
            hallazgos.append({
                "regla": gate.regla, "archivo": rel,
                "evidencia": f"la politica comercial ({DIR_POLITICA}/) solo cambia por "
                             "PR humano con aprobacion del CEO — el motor no la toca",
            })
    if hallazgos:
        return _fallo(gate, "politica comercial intocable", hallazgos)
    return _paso(gate, "politica comercial intocable", len(archivos))


CHEQUEOS_ADQUISICION = {
    "claims_aprobados": _claims_aprobados,
    "precio_en_rango": _precio_en_rango,
    "plantilla_contrato_intacta": _plantilla_contrato_intacta,
    "salientes_con_aprobacion": _salientes_con_aprobacion,
    "politica_intocable": _politica_intocable,
}

# Registro en el catalogo del motor: importar este modulo = chequeos disponibles.
gates.CHEQUEOS.update(CHEQUEOS_ADQUISICION)
