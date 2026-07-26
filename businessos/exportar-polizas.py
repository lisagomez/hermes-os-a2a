#!/usr/bin/env python3
"""exportar-polizas.py — pólizas propuestas del módulo act (interino hasta ctb, ERP-4B paso 5).

Con la política contable AUDITADA (`erp/reglas/act-contable.md`) y el costo acumulado
de cada activo, genera la PÓLIZA PROPUESTA (folio POL-, CSV+MD para el contador) y
registra la aprobación humana: capitalización o gasto según el eje D+I.

GATE CONTABLE DURO (validación (d) de ERP-4B): si la política no tiene la línea
`AUDITADA-POR: <nombre> <fecha>`, este script se NIEGA a proponer y a aprobar —
*"un intento de capitalizar sin política auditada, rechazado"*. Solo `--dry-run`
(vista previa marcada BLOQUEADO) funciona sin firma.

La aprobación es DECISIÓN HUMANA (comando con --confirmar; la credencial del host es
la autoridad — sin app Slack de ERP-3 no se fingen botones). Deja `estatus_contable`,
`fecha_alta_contable`, vida útil/método (capitalización) y bitácora con aprobador.

Uso (en el servidor):
  cd ~/repo/businessos && set -a && . ./.env && set +a
  python3 exportar-polizas.py proponer [ACT-NNNN|--todas] [--dry-run]
  python3 exportar-polizas.py aprobar  ACT-NNNN [--vida-util N] [--metodo linea_recta] \
      [--actor elisa] --confirmar
"""
import csv
import io
import json
import os
import re
import subprocess
import sys
import uuid
from datetime import date
from pathlib import Path

ERP_DB_URL = os.environ.get("ERP_DB_URL", "")
CASA = os.environ.get("ERP_CLIENTE_CASA", "")
POLITICA = Path(os.environ.get("ACT_CONTABLE_MD",
                               os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                            "erp", "reglas", "act-contable.md")))
SALIDA_DIR = Path(os.environ.get("POLIZAS_DIR", "/home/hermes/state/polizas"))
DRY = "--dry-run" in sys.argv[1:]

_FOLIO_RE = re.compile(r"^ACT-\d{4}$")


def _sql_str(v: str | None) -> str:
    if v is None:
        return "null"
    return "'" + str(v).replace("\x00", "").replace("'", "''") + "'"


def erp_sql(cuerpo: str, rol: str = "rol_exe_fin") -> tuple[bool, str]:
    script = (f"begin;\nset local role {rol};\n"
              f"set local app.cliente_id = '{CASA}';\n{cuerpo}\ncommit;\n")
    r = subprocess.run(["psql", ERP_DB_URL, "-qAt", "-v", "ON_ERROR_STOP=1"],
                       input=script, capture_output=True, text=True, timeout=60)
    return (r.returncode == 0,
            (r.stdout if r.returncode == 0 else r.stderr).strip()[:400])


# ---------- la política: parseo + gate ----------

def politica() -> dict:
    """Lee las claves parseables. `auditada` es el GATE: nombre+fecha o nada."""
    try:
        texto = POLITICA.read_text(encoding="utf-8")
    except FileNotFoundError:
        sys.exit(f"GATE: no existe la política {POLITICA} — sin política no hay pólizas")
    m = re.search(r"^AUDITADA-POR:\s*(\S.*)$", texto, re.MULTILINE)
    claves = {"auditada": (m.group(1).strip() if m else "")}
    um = re.search(r"^UMBRAL-MATERIALIDAD-USD:\s*([\d.]+)", texto, re.MULTILINE)
    claves["umbral"] = float(um.group(1)) if um else 0.0
    claves["vida_util"] = {t: int(v) for t, v in
                           re.findall(r"^VIDA-UTIL-(\w+):\s*(\d+)", texto, re.MULTILINE)}
    mm = re.search(r"^METODO-AMORTIZACION:\s*(\S+)", texto, re.MULTILINE)
    claves["metodo"] = mm.group(1) if mm else "linea_recta"
    return claves


def exigir_auditada(pol: dict) -> None:
    if not pol["auditada"]:
        sys.exit("RECHAZADO: la política contable NO está auditada — falta la línea "
                 f"'AUDITADA-POR: <nombre> <fecha>' en {POLITICA}. Capitalizar sin "
                 "política auditada está prohibido (D-07 / validación (d) de ERP-4B). "
                 "Vista previa: --dry-run.")


# ---------- datos del activo ----------

def activo(folio: str) -> dict | None:
    ok, out = erp_sql(
        "select json_build_object('folio', folio, 'nombre', nombre, 'tipo', tipo, "
        "'eje_dei', eje_dei, 'estatus', estatus_contable, 'costo', costo_acumulado, "
        "'defe', defensibilidad, 'defe_estado', defensibilidad_estado, 'id', id) "
        f"from erp.act_activo where folio = {_sql_str(folio)};", "rol_swm")
    if not ok or not out:
        return None
    return json.loads(out.splitlines()[-1])


def pendientes() -> list[str]:
    ok, out = erp_sql("select folio from erp.act_activo "
                      "where estatus_contable = 'pendiente' and estado = 'activo' "
                      "order by folio;", "rol_swm")
    return out.splitlines() if ok and out else []


def costos_detalle(folio: str) -> list[dict]:
    ok, out = erp_sql(
        "select json_build_object('componente', c.componente, 'monto', c.monto, "
        "'fuente', c.fuente, 'tokens_in', c.tokens_in, 'tokens_out', c.tokens_out) "
        "from erp.act_costo c join erp.act_activo a on a.id = c.activo_id "
        f"where a.folio = {_sql_str(folio)} order by c.id;", "rol_swm")
    return [json.loads(l) for l in out.splitlines()] if ok and out else []


# ---------- pólizas ----------

def veredicto_politica(a: dict, pol: dict) -> tuple[str, str]:
    """(destino, razón) según la política: capitalizado | gasto."""
    if a["eje_dei"] == "investigacion":
        return "gasto", "eje investigacion → gasto del periodo, sin excepción (NIF C-8)"
    if float(a["costo"]) < pol["umbral"]:
        return "gasto", (f"desarrollo bajo el umbral de materialidad "
                         f"(${a['costo']} < ${pol['umbral']}) → gasto por practicidad")
    return "capitalizado", ("desarrollo sobre el umbral; capitalizable si cumple "
                            "NIF C-8 §2 de la política (verificación humana al aprobar)")


def render_poliza(pol_folio: str, a: dict, destino: str, razon: str,
                  detalle: list[dict], pol: dict) -> tuple[str, str]:
    hoy = date.today().isoformat()
    vida = pol["vida_util"].get(a["tipo"], 24)
    if destino == "capitalizado":
        cargo = f"Activo intangible — {a['tipo']} (cuenta la asigna el contador)"
        abono = "Desembolsos de desarrollo del periodo (reclasificación a intangible)"
    else:
        cargo = "Gasto de investigación y desarrollo del periodo"
        abono = "Desembolsos acumulados del activo (reconocimiento a resultados)"
    md = io.StringIO()
    md.write(f"# Póliza propuesta {pol_folio} — {a['folio']} · {a['nombre']}\n\n")
    md.write(f"- Fecha propuesta: {hoy} · Tipo: diario · Moneda: USD\n")
    md.write(f"- Eje D+I: **{a['eje_dei']}** → destino **{destino.upper()}**\n")
    md.write(f"- Razón: {razon}\n")
    if destino == "capitalizado":
        md.write(f"- Vida útil propuesta: {vida} meses · Método: {pol['metodo']}\n")
    md.write(f"- Política: {POLITICA.name} — AUDITADA-POR: {pol['auditada'] or 'PENDIENTE'}\n\n")
    md.write(f"| Cuenta (propuesta) | Cargo | Abono |\n|---|---|---|\n")
    md.write(f"| {cargo} | ${a['costo']} | |\n| {abono} | | ${a['costo']} |\n\n")
    md.write("## Soporte (act_costo, fuente declarada)\n\n")
    for c in detalle:
        toks = (f" ({c['tokens_in']}/{c['tokens_out']} tok)"
                if c.get("tokens_in") or c.get("tokens_out") else "")
        md.write(f"- {c['componente']}: ${c['monto']}{toks} — {c['fuente']}\n")
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["poliza", "fecha", "activo", "nombre", "destino", "cuenta", "cargo", "abono"])
    w.writerow([pol_folio, hoy, a["folio"], a["nombre"], destino, cargo, a["costo"], ""])
    w.writerow([pol_folio, hoy, a["folio"], a["nombre"], destino, abono, "", a["costo"]])
    return md.getvalue(), buf.getvalue()


def proponer(argv: list[str]) -> None:
    pol = politica()
    objetivos = [a for a in argv if _FOLIO_RE.match(a)]
    if "--todas" in argv or not objetivos:
        objetivos = pendientes()
    print(f"{len(objetivos)} activo(s) pendientes de póliza"
          + ("" if pol["auditada"] else " — política SIN AUDITAR"))
    if not DRY:
        exigir_auditada(pol)
        SALIDA_DIR.mkdir(parents=True, exist_ok=True)
    for folio in objetivos:
        a = activo(folio)
        if not a or a["estatus"] != "pendiente":
            print(f"  {folio}: no existe o ya no está pendiente — se salta")
            continue
        destino, razon = veredicto_politica(a, pol)
        if DRY:
            marca = "" if pol["auditada"] else " [BLOQUEADO: política sin auditar]"
            print(f"  [dry-run]{marca} {folio} → {destino} — {razon}")
            continue
        ok, pol_folio = erp_sql(f"select erp.siguiente_folio('{CASA}'::uuid, 'POL');")
        if not ok:
            print(f"  {folio}: folio POL falló — {pol_folio}")
            continue
        pol_folio = pol_folio.splitlines()[-1].strip()
        md, csvtxt = render_poliza(pol_folio, a, destino, razon, costos_detalle(folio), pol)
        (SALIDA_DIR / f"{pol_folio}-{folio}.md").write_text(md, encoding="utf-8")
        (SALIDA_DIR / f"{pol_folio}-{folio}.csv").write_text(csvtxt, encoding="utf-8")
        traza = str(uuid.uuid4())
        erp_sql("insert into erp.sis_bitacora (cliente_id, traza_id, actor, actor_tipo, "
                "modulo, verbo, entidad_tipo, entidad_id, payload, resultado) values "
                f"('{CASA}', '{traza}', 'exportar-polizas(host)', 'sistema', 'act', "
                f"'exportar', 'act_activo', {_sql_str(folio)}, "
                f"{_sql_str(json.dumps({'poliza': pol_folio, 'destino': destino}))}::jsonb, 'ok');")
        print(f"  {folio} → {pol_folio} ({destino}) exportada a {SALIDA_DIR}/")
    print("Aprobar (humano): exportar-polizas.py aprobar ACT-NNNN --confirmar")


def aprobar(argv: list[str]) -> None:
    pol = politica()
    exigir_auditada(pol)  # el gate duro también (y sobre todo) aquí
    folio = next((a for a in argv if _FOLIO_RE.match(a)), None)
    if not folio:
        sys.exit("uso: aprobar ACT-NNNN [--vida-util N] [--metodo X] [--actor quien] --confirmar")
    a = activo(folio)
    if not a:
        sys.exit(f"{folio}: no existe en este tenant")
    if a["estatus"] != "pendiente":
        sys.exit(f"{folio}: ya está '{a['estatus']}' — nada que aprobar")
    destino, razon = veredicto_politica(a, pol)
    actor = (argv[argv.index("--actor") + 1] if "--actor" in argv else "elisa(host)")
    vida = int(argv[argv.index("--vida-util") + 1]) if "--vida-util" in argv \
        else pol["vida_util"].get(a["tipo"], 24)
    metodo = (argv[argv.index("--metodo") + 1] if "--metodo" in argv else pol["metodo"])
    if "--confirmar" not in argv:
        print(f"[sin --confirmar] {folio} → {destino} ({razon}); no se escribe")
        return
    extra = (f", vida_util_meses = {vida}, metodo_amortizacion = {_sql_str(metodo)}"
             if destino == "capitalizado" else "")
    traza = str(uuid.uuid4())
    ok, out = erp_sql(
        f"update erp.act_activo set estatus_contable = {_sql_str(destino)}, "
        f"fecha_alta_contable = current_date{extra}, updated_at = now() "
        f"where folio = {_sql_str(folio)} and estatus_contable = 'pendiente' "
        f"returning folio;\n"
        "insert into erp.sis_bitacora (cliente_id, traza_id, actor, actor_tipo, modulo, "
        "verbo, entidad_tipo, entidad_id, payload, resultado, aprobado_por) values "
        f"('{CASA}', '{traza}', {_sql_str(actor)}, 'humano', 'act', 'aprobar', "
        f"'act_activo', {_sql_str(folio)}, "
        f"{_sql_str(json.dumps({'destino': destino, 'razon': razon}))}::jsonb, 'ok', "
        f"{_sql_str(actor)});")
    if not ok or folio not in out:
        sys.exit(f"aprobar FALLÓ: {out}")
    print(f"{folio} → estatus_contable = {destino} (aprobado por {actor})"
          + (f"; vida útil {vida} meses, {metodo}" if destino == "capitalizado" else ""))


def main() -> None:
    argv = sys.argv[1:]
    sub = argv[0] if argv else ""
    if not (ERP_DB_URL and CASA):
        sys.exit("faltan ERP_DB_URL / ERP_CLIENTE_CASA en el entorno")
    if sub == "proponer":
        proponer(argv[1:])
    elif sub == "aprobar":
        aprobar(argv[1:])
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
