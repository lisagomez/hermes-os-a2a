#!/usr/bin/env python3
"""cosecha-inicial-activos.py — one-off: el catálogo bootstrap A2A-NNN entra al ERP.

Migra los 23 activos de `businessos/activos/activos.jsonl` (PR #159) a
`erp.act_activo` vía `ref_catalogo` (mapeo A2A-NNN → ACT-NNNN). Es la COSECHA
INICIAL de la validación (b) de ERP-4B: el inventario arranca completo y el
detector/cosechador lo mantienen dinámico desde aquí.

Reglas de la migración (DD-12 del plan):
  · TODA clasificación entra como PROPUESTA — ratificar la defensibilidad es
    decisión humana (D-10); el aviso de Slack trae el comando por activo.
  · `act_costo` registra SOLO costo INCURRIDO (construcción): los componentes
    operación/réplica/reposición del catálogo son estimaciones, no ledger.
    `no_medido` entra como monto 0 con la fuente declarada — jamás se inventa.
  · Idempotente por `ref_catalogo` (unique por tenant): re-correr no duplica.
  · El responsable inicial es 'dep-fin' (inventario); Elisa reasigna después.

Uso (en el servidor):
  cd ~/repo/businessos && set -a && . ./.env && set +a
  python3 cosecha-inicial-activos.py [--dry-run] [--jsonl <ruta>]
"""
import json
import os
import subprocess
import sys
import uuid

ERP_DB_URL = os.environ.get("ERP_DB_URL", "")
CASA = os.environ.get("ERP_CLIENTE_CASA", "")
REPO_HOST = os.environ.get("REPO_HOST", "/home/hermes/repo")
DRY = "--dry-run" in sys.argv[1:]

# clase del catálogo → tipo del módulo act (por activo donde la clase no basta)
TIPO_POR_ID = {
    "A2A-001": "config_agentica",  # verticales: SOUL/AGENTS/skills + volumen
    "A2A-013": "config_agentica",  # skills de la fábrica
    "A2A-016": "datos",            # seed regulatorio (la procedencia ES el activo)
    "A2A-017": "datos",            # inteligencia de mercado
    "A2A-018": "documento",        # gobernanza
    "A2A-019": "documento",        # doctrina
    "A2A-021": "documento",        # metodología branding
    "A2A-022": "documento",        # blueprints comerciales
    "A2A-023": "infraestructura",  # blueprint de operación
}
TIPO_POR_CLASE = {"PRODUCTO": "software", "FABRICA": "software", "CONOCIMIENTO": "datos",
                  "DISEÑO": "software", "COMERCIAL": "documento", "INFRA": "infraestructura"}


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


def cargar_jsonl() -> list[dict]:
    for a in sys.argv[1:]:
        if a.startswith("--jsonl="):
            return [json.loads(l) for l in open(a.split("=", 1)[1]) if l.strip()]
    if "--jsonl" in sys.argv:
        ruta = sys.argv[sys.argv.index("--jsonl") + 1]
        return [json.loads(l) for l in open(ruta) if l.strip()]
    # default: SIEMPRE fresco desde origin/master (el fetch corre cada 5 min);
    # el checkout local del repo del host puede estar viejo.
    r = subprocess.run(["git", "-C", REPO_HOST, "show",
                        "origin/master:businessos/activos/activos.jsonl"],
                       capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f"no pude leer activos.jsonl de origin/master: {r.stderr.strip()[:200]}")
    return [json.loads(l) for l in r.stdout.splitlines() if l.strip()]


def main() -> None:
    if not (ERP_DB_URL and CASA):
        sys.exit("faltan ERP_DB_URL / ERP_CLIENTE_CASA en el entorno")
    activos = cargar_jsonl()
    print(f"{len(activos)} activos en el catálogo bootstrap")
    altas = saltados = fallos = 0
    for a in activos:
        ref = a["id"]
        ok, ya = erp_sql(f"select folio from erp.act_activo where ref_catalogo = {_sql_str(ref)};",
                         "rol_swm")
        if ok and ya:
            print(f"  {ref}: ya migrado como {ya} — se salta (idempotencia)")
            saltados += 1
            continue
        clasif = a.get("clasificacion_erp") or {}
        eje = clasif.get("di", "desarrollo")
        defe = clasif.get("defensibilidad", "reemplazable")
        tipo = TIPO_POR_ID.get(ref) or TIPO_POR_CLASE.get(a.get("clase", ""), "software")
        cc = a.get("costo_construccion") or {}
        monto = cc.get("usd") or 0
        fuente = cc.get("fuente") or "no_medido"
        servicios = ",".join(a.get("servicios") or []) or None
        desc = (f"[{a.get('clase')}·{a.get('estado')}] "
                + (f"habilita {servicios}. " if servicios else "")
                + f"Migrado del catálogo bootstrap (businessos/activos/) el {a.get('fecha_alta')}.")
        if DRY:
            print(f"  [dry-run] {ref} → tipo={tipo} eje={eje} defe={defe}(propuesta) "
                  f"costo=${monto} ({fuente[:50]}…)")
            continue
        traza = str(uuid.uuid4())
        sql = f"""
with alta as (
  insert into erp.act_activo (cliente_id, folio, nombre, tipo, descripcion, ubicacion,
                              version_vigente, responsable, eje_dei, defensibilidad,
                              ref_catalogo)
  values ('{CASA}', erp.siguiente_folio('{CASA}'::uuid, 'ACT'), {_sql_str(a['nombre'])},
          {_sql_str(tipo)}, {_sql_str(desc)}, {_sql_str(a.get('ubicacion') or 'ver catálogo')},
          'v1', 'dep-fin', {_sql_str(eje)}, {_sql_str(defe)}, {_sql_str(ref)})
  returning id, folio
),
ver as (
  insert into erp.act_version (cliente_id, activo_id, version, origen)
  select '{CASA}', id, 'v1', 'cosecha-inicial' from alta returning activo_id
),
costo as (
  insert into erp.act_costo (cliente_id, activo_id, componente, monto, eje_dei, fuente)
  select '{CASA}', id, 'tokens', {float(monto)}, {_sql_str(eje)}, {_sql_str(str(fuente))}
  from alta returning activo_id
),
bit as (
  insert into erp.sis_bitacora (cliente_id, traza_id, actor, actor_tipo, modulo, verbo,
                                entidad_tipo, entidad_id, payload, resultado)
  select '{CASA}', '{traza}', 'cosecha-inicial(host)', 'sistema', 'act', 'registrar',
         'act_activo', folio,
         {_sql_str(json.dumps({"ref_catalogo": ref, "defensibilidad_propuesta": defe}))}::jsonb,
         'ok'
  from alta returning id
)
select folio from alta;"""
        ok, salida = erp_sql(sql)
        if not ok:
            print(f"  {ref}: FALLO — {salida}")
            fallos += 1
            continue
        folio = salida.splitlines()[-1].strip()
        print(f"  {ref} → {folio} ({defe}, propuesta)")
        altas += 1
    print(f"altas={altas} saltados={saltados} fallos={fallos}")
    if fallos:
        sys.exit(1)


if __name__ == "__main__":
    main()
