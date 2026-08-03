#!/usr/bin/env python3
"""obtener-token-gmail.py — ceremonia de consentimiento del buzon (SPEC §5.1).

Se corre UNA VEZ, a mano, en la maquina de quien administra el buzon. Hace tres
cosas y ninguna mas:

  1. Abre el flujo OAuth de escritorio y espera el consentimiento del buzon.
  2. Canjea el codigo por un refresh_token y lo ESCRIBE al .env indicado.
     El token NUNCA se imprime en pantalla (aprendizaje 2026-06-28: pegar un
     secreto en la terminal lo filtra al historial y a cualquier captura).
  3. CONTROL POSITIVO del checklist §8: comprueba que el token puede leer el
     buzon que consintio y que NO puede leer otro del mismo dominio. Si el
     segundo intento tuviera exito, el alcance no esta acotado y el script
     ABORTA en vez de dejar una credencial demasiado amplia.

Por que OAuth por buzon y no delegacion de dominio (que es lo que pide la SPEC):
en Google la delegacion NO se puede acotar por buzon — da los scopes sobre TODOS
los usuarios del dominio. Aqui el alcance lo fija quien consiente.

Uso:
    export BUZON_GMAIL_CLIENT_ID=...      # de la consola de Google Cloud
    export BUZON_GMAIL_CLIENT_SECRET=...  # (app de escritorio)
    python3 obtener-token-gmail.py --buzon atencion@digifixapp.com \
                                   --env /ruta/al/.env
"""

from __future__ import annotations

import argparse
import http.server
import json
import os
import socket
import sys
import threading
import urllib.error
import urllib.parse
import urllib.request
import webbrowser

SCOPE = "https://www.googleapis.com/auth/gmail.modify"
AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
UA = "curl/8.0"


def log(msg: str) -> None:
    print(f"[obtener-token-gmail] {msg}", flush=True)


def env(nombre: str) -> str:
    v = os.environ.get(nombre, "")
    if not v:
        log(f"ABORT: falta {nombre} en el entorno")
        sys.exit(1)
    return v


def http_post(url: str, datos: dict) -> dict:
    req = urllib.request.Request(
        url, data=urllib.parse.urlencode(datos).encode(),
        headers={"User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())


def http_get(url: str, token: str) -> tuple[int, dict]:
    req = urllib.request.Request(
        url, headers={"User-Agent": UA, "Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode())
        except Exception:  # noqa: BLE001
            return e.code, {}


class _Receptor(http.server.BaseHTTPRequestHandler):
    """Recibe el redirect de Google con el codigo de autorizacion."""

    codigo: str | None = None

    def do_GET(self) -> None:  # noqa: N802
        q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        _Receptor.codigo = (q.get("code") or [None])[0]
        error = (q.get("error") or [None])[0]
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        cuerpo = ("<h2>Listo. Puedes cerrar esta pestana.</h2>" if _Receptor.codigo
                  else f"<h2>Consentimiento cancelado: {error}</h2>")
        self.wfile.write(cuerpo.encode())

    def log_message(self, *_args) -> None:  # silencia el log del servidor
        return


def consentir(client_id: str, client_secret: str, buzon: str) -> str:
    """Flujo OAuth de escritorio por loopback. Devuelve el refresh_token."""
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        puerto = s.getsockname()[1]
    redirect = f"http://127.0.0.1:{puerto}"

    params = urllib.parse.urlencode({
        "client_id": client_id,
        "redirect_uri": redirect,
        "response_type": "code",
        "scope": SCOPE,
        "access_type": "offline",     # sin esto NO devuelve refresh_token
        "prompt": "consent",          # fuerza refresh_token aunque ya haya consentido
        "login_hint": buzon,          # preselecciona el buzon correcto
    })
    url = f"{AUTH_URL}?{params}"

    servidor = http.server.HTTPServer(("127.0.0.1", puerto), _Receptor)
    hilo = threading.Thread(target=servidor.handle_request, daemon=True)
    hilo.start()

    log(f"Abre esta URL y consiente COMO {buzon}:")
    print(f"\n{url}\n", flush=True)
    try:
        webbrowser.open(url)
    except Exception:  # noqa: BLE001
        pass
    # En WSL el navegador no se abre solo (gio: Operation not supported): la URL
    # se abre a mano, asi que la espera tiene que dar margen holgado.
    espera = int(os.environ.get("CONSENT_TIMEOUT", "900"))
    log(f"esperando el consentimiento… (hasta {espera // 60} min)")
    hilo.join(timeout=espera)
    servidor.server_close()

    if not _Receptor.codigo:
        log("ABORT: no llego el codigo de autorizacion (timeout o cancelado)")
        sys.exit(1)

    r = http_post(TOKEN_URL, {
        "code": _Receptor.codigo,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect,
        "grant_type": "authorization_code",
    })
    if "refresh_token" not in r:
        log("ABORT: Google no devolvio refresh_token. Revoca el acceso previo en "
            "https://myaccount.google.com/permissions y reintenta.")
        sys.exit(1)
    return r["refresh_token"]


def access_token(client_id: str, client_secret: str, refresh: str) -> str:
    r = http_post(TOKEN_URL, {
        "client_id": client_id, "client_secret": client_secret,
        "refresh_token": refresh, "grant_type": "refresh_token",
    })
    return r["access_token"]


def control_positivo(token: str, buzon: str) -> bool:
    """El token DEBE leer su buzon y NO debe leer otro del dominio.

    Es el control del checklist §8: 'intentar leer un buzon fuera del alcance
    debe fallar'. Un control que solo comprueba el camino feliz no prueba que
    haya restriccion alguna.
    """
    base = "https://gmail.googleapis.com/gmail/v1/users"
    # 'me' es la forma canonica con credenciales de USUARIO; ademas el perfil que
    # devuelve dice QUE buzon consintio, que es justo lo que hay que verificar.
    cod_propio, propio = http_get(f"{base}/me/profile", token)
    quien = propio.get("emailAddress", "")
    ok_propio = cod_propio == 200 and quien.lower() == buzon.lower()
    log(f"lee su propio buzon ({buzon}): {'SI' if ok_propio else 'NO'} (HTTP {cod_propio})")
    if cod_propio == 200 and not ok_propio:
        log(f"  OJO: el consentimiento lo dio {quien!r}, no {buzon!r}")
    if cod_propio != 200:
        err = propio.get("error") or {}
        motivo = str(err.get("message") or propio)[:300]
        log(f"  motivo: {motivo}")

    dominio = buzon.split("@")[1]
    ajeno = f"no-deberia-poder-leer-esto@{dominio}"
    cod_ajeno, _ = http_get(f"{base}/{urllib.parse.quote(ajeno)}/profile", token)
    ok_ajeno = cod_ajeno != 200
    log(f"NO puede leer otro buzon del dominio: {'SI' if ok_ajeno else 'NO'} "
        f"(HTTP {cod_ajeno})")
    return ok_propio and ok_ajeno


def escribir_env(ruta: str, refresh: str) -> None:
    """Añade el refresh_token al .env sin imprimirlo jamas."""
    lineas = []
    if os.path.exists(ruta):
        with open(ruta, encoding="utf-8") as f:
            lineas = [ln for ln in f if not ln.startswith("BUZON_GMAIL_REFRESH_TOKEN=")]
    lineas.append(f"BUZON_GMAIL_REFRESH_TOKEN={refresh}\n")
    with open(ruta, "w", encoding="utf-8") as f:
        f.writelines(lineas)
    os.chmod(ruta, 0o600)
    log(f"refresh_token escrito en {ruta} (perms 600). No se imprime por diseño.")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--buzon", required=True, help="direccion que va a consentir")
    ap.add_argument("--env", required=True, help="ruta del .env donde guardar el token")
    args = ap.parse_args()

    cid, secret = env("BUZON_GMAIL_CLIENT_ID"), env("BUZON_GMAIL_CLIENT_SECRET")
    refresh = consentir(cid, secret, args.buzon)
    token = access_token(cid, secret, refresh)

    log("--- control positivo de alcance ---")
    if not control_positivo(token, args.buzon):
        log("ABORT: el control de alcance FALLO. El token no se guarda.")
        log("Si pudo leer un buzon ajeno, hay delegacion de dominio activa: "
            "revisala antes de seguir (SPEC §5.1 y checklist §8).")
        return 2

    escribir_env(args.env, refresh)
    log("listo: alcance verificado y token guardado.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
