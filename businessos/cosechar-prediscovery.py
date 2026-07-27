#!/usr/bin/env python3
"""cosechar-prediscovery.py — los Activos Digitales del Meeting Copilot entran al módulo act.

Puente del patrón pagado del proyecto ("el agente deja un JSON, el host-job de confianza
lo sube", doctrina 2026-06-30): la app Meeting Copilot exporta el activo (caso de
Pre-Discovery o entrevista) como JSON con contrato versionado
(`meeting-copilot/activo-export@1`, botón "Exportar activo" del tab Activo & Costeo) y
este job lo VALIDA y lo registra en `erp.act_activo` + `erp.act_version` + `erp.act_costo`.

Invariantes ACT que respeta A PROPÓSITO (ERP-MAESTRO §4B, mismo molde que
cosechar-activos.py):
  · Escritura en `erp` SIN service_role: psql con login `cli_fin` + `set local role
    rol_exe_fin` + `set local app.cliente_id` — grants y RLS reales en cada operación.
  · Clasificación EN ORIGEN: eje_dei/defensibilidad vienen EN el JSON (los declaró el
    módulo al crear el activo); este job no las reconstruye ni las cambia.
  · El folio ERP (ACT-NNNN) lo asigna la BD; el folio local (ACT-LOC-NNNN) queda como
    `ref_catalogo` (unicidad cliente_id+ref_catalogo = dedupe natural).
  · Versiones y costos APPEND-ONLY; `costo_acumulado` lo recalcula el trigger de la BD.
  · Idempotencia por traza: el bloque entero se salta si `sis_bitacora` ya tiene la
    traza de este export (re-correr el mismo archivo NO duplica costos).
  · Fallo VISIBLE: export inválido = exit 1 con el motivo; jamás se adivina.
  · Ratificar defensibilidad (D-10) y capitalizar (D-07) siguen siendo humanos, fuera
    de este job (estatus_contable nace 'pendiente').

Uso (en la máquina con credenciales cli_fin; ERP_DB_URL + ERP_CLIENTE_CASA en el env):
  python3 cosechar-prediscovery.py ACT-LOC-0001.json --dry-run    # imprime el SQL
  python3 cosechar-prediscovery.py ACT-LOC-0001.json --confirmar  # ejecuta
"""

import hashlib
import json
import os
import subprocess
import sys

ESQUEMA = "meeting-copilot/activo-export@1"
CLASES = {"pre_discovery", "entrevista"}
TIPOS = {"datos", "documento"}
EJES = {"investigacion", "desarrollo"}
COMPONENTES = {"tokens", "horas_humanas", "infraestructura", "fetch"}
# 'fetch' es componente local del copilot; en erp.act_costo se registra como
# 'infraestructura' (el CHECK de la BD no conoce 'fetch').
MAPEO_COMPONENTE = {"fetch": "infraestructura"}


def _sql_str(v):
    if v is None:
        return "null"
    return "'" + str(v).replace("\x00", "").replace("'", "''") + "'"


def validar_export(data: dict) -> list[str]:
    """Valida el contrato del export. Devuelve la lista de errores (vacía = válido)."""
    errores = []
    if data.get("esquema") != ESQUEMA:
        errores.append(f"esquema debe ser '{ESQUEMA}' (recibido: {data.get('esquema')!r})")
        return errores  # sin esquema correcto no se sigue validando
    activo = data.get("activo") or {}
    for campo in ("folio", "clase", "tipo", "nombre", "ubicacion", "ejeDei", "defensibilidad", "versiones", "refs"):
        if not activo.get(campo):
            errores.append(f"activo.{campo} es obligatorio")
    if activo.get("clase") not in CLASES:
        errores.append(f"activo.clase debe ser una de {sorted(CLASES)}")
    if activo.get("tipo") not in TIPOS:
        errores.append(f"activo.tipo debe ser uno de {sorted(TIPOS)}")
    if activo.get("ejeDei") not in EJES:
        errores.append(f"activo.ejeDei debe ser uno de {sorted(EJES)} (clasificación EN ORIGEN)")
    versiones = activo.get("versiones") or []
    if not versiones:
        errores.append("activo.versiones no puede estar vacío (append-only, mínimo v1)")
    for v in versiones:
        if not v.get("hash") or not v.get("version") or not v.get("origen"):
            errores.append(f"versión inválida (hash/version/origen obligatorios): {v}")
    ledger = data.get("ledger")
    if ledger is None:
        errores.append("ledger es obligatorio (puede ser lista vacía)")
        ledger = []
    for i, c in enumerate(ledger):
        if not c.get("fuente"):
            errores.append(f"ledger[{i}].fuente es OBLIGATORIA (doctrina act_costo: el monto declara su origen)")
        if c.get("componente") not in COMPONENTES:
            errores.append(f"ledger[{i}].componente inválido: {c.get('componente')!r}")
        if not isinstance(c.get("montoUsd"), (int, float)) or c["montoUsd"] < 0:
            errores.append(f"ledger[{i}].montoUsd debe ser numérico >= 0")
    suma = round(sum(float(c.get("montoUsd", 0)) for c in ledger), 6)
    declarado = round(float(data.get("costoAcumuladoUsd", -1)), 6)
    if abs(suma - declarado) > 1e-6:
        errores.append(f"costoAcumuladoUsd ({declarado}) no coincide con la SUMA del ledger ({suma}) — el costo se suma, no se declara")
    if "contenido" not in data:
        errores.append("contenido es obligatorio (respalda el hash vigente)")
    return errores


def traza_de(data: dict, crudo: bytes) -> str:
    """Traza idempotente del export: sha1 del archivo (mismo archivo = misma traza)."""
    del data
    return "prediscovery-" + hashlib.sha1(crudo).hexdigest()[:24]


def generar_sql(data: dict, casa: str, traza: str) -> str:
    """SQL de cosecha en UN DO-block idempotente por traza (testeable sin BD)."""
    a = data["activo"]
    vigente = a["versiones"][-1]
    stmts = []

    # Alta del activo (folio ERP asignado por la BD; dedupe por ref_catalogo).
    stmts.append(f"""
  insert into erp.act_activo
    (cliente_id, folio, nombre, tipo, descripcion, ubicacion, hash_vigente, version_vigente,
     responsable, estado, eje_dei, defensibilidad, defensibilidad_estado, ref_catalogo,
     origen_task_id, estatus_contable)
  select '{casa}',
         'ACT-' || lpad((coalesce(max(nullif(substring(folio from 5), '')::int), 0) + 1)::text, 4, '0'),
         {_sql_str(a["nombre"])}, {_sql_str(a["tipo"])},
         {_sql_str('Activo del Meeting Copilot (clase ' + a["clase"] + '), cosechado de ' + a["folio"])},
         {_sql_str(a["ubicacion"])}, {_sql_str(vigente["hash"])}, {_sql_str(vigente["version"])},
         'dep-fin', 'activo', {_sql_str(a["ejeDei"])}, {_sql_str(a["defensibilidad"])}, 'propuesta',
         {_sql_str(a["folio"])}, null, 'pendiente'
  from erp.act_activo where cliente_id = '{casa}'
  on conflict (cliente_id, ref_catalogo) do nothing;""")

    stmts.append(f"""
  select id into v_activo from erp.act_activo
   where cliente_id = '{casa}' and ref_catalogo = {_sql_str(a["folio"])};""")

    for v in a["versiones"]:
        stmts.append(f"""
  insert into erp.act_version (cliente_id, activo_id, version, hash, origen)
  select '{casa}', v_activo, {_sql_str(v["version"])}, {_sql_str(v["hash"])},
         {_sql_str('meeting-copilot: ' + v["origen"])}
  where not exists (select 1 from erp.act_version
                     where activo_id = v_activo and hash = {_sql_str(v["hash"])});""")

    stmts.append(f"""
  update erp.act_activo set hash_vigente = {_sql_str(vigente["hash"])},
         version_vigente = {_sql_str(vigente["version"])}, updated_at = now()
   where id = v_activo and cliente_id = '{casa}';""")

    for c in data["ledger"]:
        componente = MAPEO_COMPONENTE.get(c["componente"], c["componente"])
        stmts.append(f"""
  insert into erp.act_costo (cliente_id, activo_id, componente, monto, moneda, eje_dei,
                             tokens_in, tokens_out, fuente, periodo)
  values ('{casa}', v_activo, {_sql_str(componente)}, {float(c["montoUsd"]):.6f}, 'USD',
          {_sql_str(a["ejeDei"])}, {c.get("tokensIn") if c.get("tokensIn") is not None else "null"},
          {c.get("tokensOut") if c.get("tokensOut") is not None else "null"},
          {_sql_str('meeting-copilot: ' + c["fuente"])}, current_date);""")

    payload = json.dumps(
        {"folio_local": a["folio"], "clase": a["clase"], "refs": a.get("refs", {}),
         "costo_export": data.get("costoAcumuladoUsd"), "entradas_ledger": len(data["ledger"])},
        ensure_ascii=False,
    )
    stmts.append(f"""
  insert into erp.sis_bitacora (cliente_id, traza_id, actor, actor_tipo, modulo, verbo,
                                entidad_tipo, entidad_id, payload, resultado)
  values ('{casa}', '{traza}', 'cosechar-prediscovery(host)', 'sistema', 'act', 'cosechar',
          'act_activo', v_activo::text, {_sql_str(payload)}::jsonb, 'ok');""")

    cuerpo = "\n".join(stmts)
    # Idempotencia por traza: si la bitácora ya la tiene, el bloque completo se salta.
    return f"""do $$
declare v_activo uuid;
begin
  if exists (select 1 from erp.sis_bitacora where traza_id = '{traza}') then
    raise notice 'traza {traza} ya cosechada: no se duplica nada';
    return;
  end if;
{cuerpo}
end $$;"""


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry-run" in sys.argv[1:]
    confirmar = "--confirmar" in sys.argv[1:]
    if len(args) != 1 or (not dry and not confirmar):
        print(__doc__)
        return 2

    crudo = open(args[0], "rb").read()
    try:
        data = json.loads(crudo)
    except json.JSONDecodeError as e:
        print(f"ERROR: el archivo no es JSON válido: {e}")
        return 1

    errores = validar_export(data)
    if errores:
        print("ERROR: el export NO cumple el contrato (no se adivina, no se cosecha):")
        for e in errores:
            print(f"  - {e}")
        return 1

    casa = os.environ.get("ERP_CLIENTE_CASA", "")
    erp_db = os.environ.get("ERP_DB_URL", "")
    traza = traza_de(data, crudo)
    sql = generar_sql(data, casa or "<ERP_CLIENTE_CASA>", traza)
    script = f"begin;\nset local role rol_exe_fin;\nset local app.cliente_id = '{casa or '<ERP_CLIENTE_CASA>'}';\n{sql}\ncommit;\n"

    if dry:
        print(f"— dry-run: SQL propuesto (traza {traza}) —")
        print(script)
        return 0

    if not casa or not erp_db:
        print("ERROR: ERP_DB_URL y ERP_CLIENTE_CASA deben estar en el entorno para --confirmar.")
        return 1
    r = subprocess.run(["psql", erp_db, "-qAt", "-v", "ON_ERROR_STOP=1"],
                       input=script, capture_output=True, text=True, timeout=60)
    if r.returncode != 0:
        print(f"ERROR psql: {r.stderr.strip()[:500]}")
        return 1
    print(f"Cosechado: {data['activo']['folio']} → erp.act_activo (traza {traza})")
    if r.stdout.strip():
        print(r.stdout.strip())
    return 0


if __name__ == "__main__":
    sys.exit(main())
