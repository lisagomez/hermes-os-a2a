#!/usr/bin/env python3
"""Cobros vía Polar (Merchant of Record) — host-job de Fase 3.

Los agentes NO tienen secretos (Hermes scrubbea el sandbox): para cobrar, el agente
deja un request en su volumen y ESTE job (que sí tiene el token) habla con Polar:

    agente deja JSON en /opt/data/workspace/cobros_pending/<nombre>.json
      -> este job crea un Checkout Session en Polar (api.polar.sh/v1/checkouts/)
      -> deja el link en /opt/data/workspace/cobros_links/<nombre>.json (el agente
         lo LEE y se lo pasa al cliente)  ->  fila en Supabase `cobros`
      -> mueve el request a cobros_procesados/.

Forma del request (moneda default USD; product_id default POLAR_PRODUCT_ID, un
producto "pay what you want" creado UNA vez en el dashboard de Polar):
    {"cliente": "ACME S.A.", "concepto": "Consultoria julio", "monto": 1160.00,
     "moneda": "USD", "customer_email": "opcional@acme.com", "product_id": "opcional-uuid"}

Modos:
    python3 businessos/polar-cobros.py            # procesa bandejas (clientes y negocio)
    python3 businessos/polar-cobros.py --dry-run  # valida y muestra, sin tocar nada
    python3 businessos/polar-cobros.py --sync     # refresca estados desde Polar -> Supabase

Env (businessos/.env): POLAR_ACCESS_TOKEN, POLAR_PRODUCT_ID, SUPABASE_URL,
SUPABASE_SERVICE_ROLE_KEY. Opcional POLAR_API=https://sandbox-api.polar.sh/v1 (pruebas).
Costo Polar Starter: 5% + 50¢ por transaccion (planes de pago la bajan).
Payouts a Mexico: soportados via Stripe Connect Express (verificado 2026-07-02).

Para pruebas locales sin Docker: COBROS_DIR=/ruta/local (lee ahi en vez de docker exec).
"""
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

DRY = "--dry-run" in sys.argv[1:]
SYNC = "--sync" in sys.argv[1:]

POLAR_API = os.environ.get("POLAR_API", "https://api.polar.sh/v1").rstrip("/")
LOCAL_DIR = os.environ.get("COBROS_DIR")  # modo prueba local (sin docker)

CONTAINERS = ("hermes-clientes", "hermes-negocio")
PENDING = "/opt/data/workspace/cobros_pending"
LINKS = "/opt/data/workspace/cobros_links"
DONE = "/opt/data/workspace/cobros_procesados"

ESTADOS_POLAR = {"open": "abierto", "confirmed": "confirmado", "succeeded": "pagado",
                 "expired": "expirado", "failed": "fallido"}


def env(nombre):
    val = os.environ.get(nombre, "")
    if not val:
        print(f"ABORT: falta {nombre} en el entorno (source businessos/.env)")
        sys.exit(1)
    return val


def http(url, data=None, headers=None, method=None):
    # Cloudflare (Polar y api.supabase.com) bloquea el UA de urllib con error 1010
    req = urllib.request.Request(url, data=data, method=method,
                                 headers={"User-Agent": "curl/8.0", **(headers or {})})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read().decode()


def polar(path, body=None, method=None):
    token = env("POLAR_ACCESS_TOKEN")
    return json.loads(http(
        f"{POLAR_API}{path}",
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"},
        method=method,
    ))


def sb_headers():
    key = env("SUPABASE_SERVICE_ROLE_KEY")
    return {"apikey": key, "Authorization": "Bearer " + key, "Content-Type": "application/json"}


def valid(f):
    faltan = [k for k in ("cliente", "concepto", "monto") if f.get(k) in (None, "")]
    if faltan:
        return None, "faltan campos: " + ", ".join(faltan)
    try:
        monto = round(float(f["monto"]), 2)
    except (TypeError, ValueError):
        return None, "monto no es numero"
    if monto <= 0:
        return None, "monto debe ser > 0"
    return {
        "cliente": str(f["cliente"]).strip(),
        "concepto": str(f["concepto"]).strip(),
        "monto": monto,
        "moneda": str(f.get("moneda", "USD")).strip().upper(),
        "customer_email": f.get("customer_email"),
        "product_id": f.get("product_id") or os.environ.get("POLAR_PRODUCT_ID", ""),
        "success_url": f.get("success_url"),
    }, None


# ---- bandejas: docker exec (produccion) o directorio local (pruebas) ----------

def dexec(container, cmd, inp=None):
    import subprocess
    return subprocess.run(["docker", "exec", "-i", "-u", "hermes", container, "sh", "-c", cmd],
                          input=inp, capture_output=True, text=True)


def bandejas():
    """[(origen, nombre, contenido_json_str)] de todas las bandejas."""
    items = []
    if LOCAL_DIR:
        for p in sorted(Path(LOCAL_DIR).glob("*.json")):
            items.append(("local", p.name, p.read_text(encoding="utf-8")))
        return items
    for c in CONTAINERS:
        out = dexec(c, f"ls -1 {PENDING}/*.json 2>/dev/null").stdout
        for path in [p for p in out.splitlines() if p.strip()]:
            items.append((c, os.path.basename(path), dexec(c, f"cat {path}").stdout))
    return items


def entregar_link(origen, nombre, payload):
    """Deja el link donde el agente lo lee y archiva el request."""
    data = json.dumps(payload, ensure_ascii=False)
    if LOCAL_DIR:
        destino = Path(LOCAL_DIR) / "links"
        destino.mkdir(exist_ok=True)
        (destino / nombre).write_text(data, encoding="utf-8")
        (Path(LOCAL_DIR) / nombre).rename(Path(LOCAL_DIR) / f"procesado-{nombre}")
        return True
    r1 = dexec(origen, f"mkdir -p {LINKS} {DONE} && cat > {LINKS}/{nombre}", inp=data)
    r2 = dexec(origen, f"mv {PENDING}/{nombre} {DONE}/")
    return r1.returncode == 0 and r2.returncode == 0


# ---- modo sync -----------------------------------------------------------------

def sync():
    url = env("SUPABASE_URL").rstrip("/")
    filas = json.loads(http(
        f"{url}/rest/v1/cobros?estado=in.(link_creado,abierto,confirmado)"
        "&select=id,polar_checkout_id&polar_checkout_id=not.is.null",
        headers=sb_headers()))
    if not filas:
        print("No hay cobros abiertos que sincronizar.")
        return 0
    cambios = errores = 0
    for fila in filas:
        try:
            chk = polar(f"/checkouts/{fila['polar_checkout_id']}")
        except urllib.error.HTTPError as e:
            print(f"  ERROR checkout {fila['polar_checkout_id']}: {e.code}"); errores += 1; continue
        estado = ESTADOS_POLAR.get(chk.get("status"))
        if not estado or estado in ("abierto",):
            continue
        if DRY:
            print(f"  DRY  cobro #{fila['id']} -> {estado}"); cambios += 1; continue
        http(f"{url}/rest/v1/cobros?id=eq.{fila['id']}",
             data=json.dumps({"estado": estado, "updated_at": "now()"}).encode(),
             headers={**sb_headers(), "Prefer": "return=minimal"}, method="PATCH")
        print(f"  OK   cobro #{fila['id']} -> {estado}"); cambios += 1
    print(f"=== sync: {cambios} actualizados, {errores} errores ===")
    return 1 if errores else 0


# ---- modo principal --------------------------------------------------------------

def procesar():
    items = bandejas()
    if not items:
        print("No hay requests de cobro en las bandejas.")
        return 0
    ok = errores = 0
    for origen, nombre, raw in items:
        try:
            f = json.loads(raw)
        except json.JSONDecodeError as e:
            print(f"  SKIP {origen}/{nombre}: JSON invalido ({e})"); errores += 1; continue
        req, err = valid(f)
        if err:
            print(f"  SKIP {origen}/{nombre}: {err}"); errores += 1; continue
        etiqueta = f"{req['cliente']} :: {req['concepto']} ${req['monto']:.2f} {req['moneda']}"
        if DRY:
            print(f"  DRY  {etiqueta}"); ok += 1; continue
        if not req["product_id"]:
            print(f"  SKIP {origen}/{nombre}: sin product_id (define POLAR_PRODUCT_ID)"); errores += 1; continue

        body = {
            "products": [req["product_id"]],
            # amount en centavos; Polar solo lo honra en productos de precio custom (PWYW)
            "amount": int(round(req["monto"] * 100)),
            "metadata": {"cliente": req["cliente"], "concepto": req["concepto"], "origen": origen},
        }
        if req["customer_email"]:
            body["customer_email"] = req["customer_email"]
        if req["success_url"]:
            body["success_url"] = req["success_url"]
        try:
            chk = polar("/checkouts/", body)
        except urllib.error.HTTPError as e:
            print(f"  ERROR {etiqueta}: Polar {e.code} {e.read().decode()[:200]}"); errores += 1; continue

        url_sb = env("SUPABASE_URL").rstrip("/")
        fila = {
            "cliente": req["cliente"], "concepto": req["concepto"],
            "monto": req["monto"], "moneda": req["moneda"],
            "polar_checkout_id": chk["id"], "checkout_url": chk["url"],
            "metadata": {"origen": origen, "archivo": nombre},
        }
        try:
            http(f"{url_sb}/rest/v1/cobros", data=json.dumps(fila).encode(),
                 headers={**sb_headers(), "Prefer": "return=minimal"})
        except urllib.error.HTTPError as e:
            print(f"  WARN {etiqueta}: checkout creado pero Supabase fallo ({e.code})")

        entregado = entregar_link(origen, nombre, {
            "cliente": req["cliente"], "concepto": req["concepto"], "monto": req["monto"],
            "moneda": req["moneda"], "checkout_url": chk["url"], "checkout_id": chk["id"],
        })
        print(f"  OK   {etiqueta} -> {chk['url']}" + ("" if entregado else "  [WARN: link no entregado al volumen]"))
        ok += 1
    print(f"=== cobros: {ok} procesados, {errores} con problema"
          + ("  (DRY-RUN, no se toco Polar ni Supabase)" if DRY else "") + " ===")
    return 1 if errores else 0


sys.exit(sync() if SYNC else procesar())
