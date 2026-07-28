#!/usr/bin/env python3
"""desplegar-chaincode.py — despliegue lifecycle de un contrato APROBADO (PRP-013 F5).

Host-job del nodo que corre la red tier 1 (Operadora + Testigo). Es el brazo
que ejecuta; JAMÁS decide: solo opera filas de contratos_sc en estado
'aprobado' (la aprobación la puso la dueña en Mission Control) y con el doble
candado de Fabric: firma con admin-despliegue-op y la 2ª aprobación
(approveformyorg) del admin Testigo — con LifecycleEndorsement=MAJORITY sobre
2 orgs, el commit NO entra sin las dos (red-tier1-iac/config/configtx.yaml).

Controles duros:
- G5 (modelo de amenazas): el hash del árbol del paquete APROBADO se
  re-verifica AQUÍ, justo antes de `package`/`install` — lo que se despliega
  es bit a bit lo que se aprobó. Hash distinto → 'escalado' + aviso, exit 1.
- El `--sequence` SE LEE de contratos_sc.secuencia, nunca se adivina
  (README-auditoria de escrow-v1).
- Un contrato por corrida (--task obligatorio): desplegar es un acto
  deliberado, no un barrido.

Registra en contratos_sc: estado 'desplegado', `despliegue` (sha256 del
tar.gz, package_id, firmas con identidad y timestamp, salida de
querycommitted) y extiende el lineage `origen` con el commit (gobernanza-
ciclo-de-vida §2). Aviso por Telegram vía el gateway de negocio (hermes send,
sin tokens en el host). Todo fallo se imprime (2026-07-13).

Uso:
  python3 desplegar-chaincode.py --task <task_id> [--dry-run]

Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, WORKTREES_DIR,
RED_TIER1_ORGS (raíz organizaciones/ del kit IaC), FABRIC_BIN (dir de peer),
PEER_OP_PORT=7051, PEER_TG_PORT=9051, ORDERER_PORT=7050,
DESPLIEGUE_DELIVER=telegram:7022378429, DESPLIEGUE_DOCKER_HOST (opcional:
user@host para envolver el aviso en ssh).
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from integridad import verificar_paquete  # noqa: E402

UA = "curl/8.0"
TIMEOUT_HTTP = 30
TIMEOUT_PASO = 900


def env(nombre: str, default: str | None = None) -> str:
    v = os.environ.get(nombre, "" if default is None else default)
    if not v:
        sys.exit(f"falta {nombre} en el entorno (source businessos/.env)")
    return v


def _http(metodo: str, url: str, key: str, cuerpo: dict | None = None) -> list | dict:
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    req = urllib.request.Request(
        url, data=datos, method=metodo,
        headers={
            "apikey": key, "Authorization": f"Bearer {key}",
            "Content-Type": "application/json", "User-Agent": UA,
            "Prefer": "return=representation",
        },
    )
    with urllib.request.urlopen(req, timeout=TIMEOUT_HTTP) as r:
        crudo = r.read()
    return json.loads(crudo) if crudo else []


class RunnerLifecycle:
    """peer lifecycle chaincode contra la red tier 1. Cada comando se loguea.

    Las identidades: 'op' firma package/install/approve/commit; 'tg' SOLO su
    approveformyorg (la 2ª llave). La validación fina contra una red real es
    parte de la Fase 6; el contrato del job se fija en tests con runner espía.
    """

    ORGS = {
        "op": ("OperadoraMSP", "operadora", "admin-despliegue-op", "PEER_OP_PORT", "7051"),
        "tg": ("TestigoMSP", "testigo", "admin-despliegue-tg", "PEER_TG_PORT", "9051"),
    }

    def __init__(self, orgs_dir: Path) -> None:
        self._orgs = orgs_dir

    def _env_org(self, org: str) -> dict:
        msp_id, carpeta, admin, var_puerto, puerto_def = self.ORGS[org]
        raiz = self._orgs / carpeta
        return {
            **os.environ,
            "PATH": f"{os.environ.get('FABRIC_BIN', '')}:{os.environ.get('PATH', '')}",
            "CORE_PEER_TLS_ENABLED": "true",
            "CORE_PEER_LOCALMSPID": msp_id,
            "CORE_PEER_MSPCONFIGPATH": str(raiz / "usuarios" / admin / "msp"),
            "CORE_PEER_TLS_ROOTCERT_FILE": str(raiz / "peer0" / "tls" / "ca.crt"),
            "CORE_PEER_ADDRESS": f"localhost:{os.environ.get(var_puerto, puerto_def)}",
        }

    def _sh(self, org: str, cmd: list[str]) -> subprocess.CompletedProcess:
        print(f"[desplegar] ({org}) $ {' '.join(cmd)}", flush=True)
        return subprocess.run(cmd, capture_output=True, text=True,
                              timeout=TIMEOUT_PASO, env=self._env_org(org))

    def _orderer_flags(self) -> list[str]:
        ca = self._orgs / "orderer" / "tls" / "ca.crt"
        puerto = os.environ.get("ORDERER_PORT", "7050")
        return ["-o", f"localhost:{puerto}", "--tls", "--cafile", str(ca)]

    def _peers_flags(self) -> list[str]:
        flags: list[str] = []
        for org in ("op", "tg"):
            e = self._env_org(org)
            flags += ["--peerAddresses", e["CORE_PEER_ADDRESS"],
                      "--tlsRootCertFiles", e["CORE_PEER_TLS_ROOTCERT_FILE"]]
        return flags

    def package(self, paquete_dir: Path, tar_gz: Path, etiqueta: str) -> dict:
        r = self._sh("op", ["peer", "lifecycle", "chaincode", "package", str(tar_gz),
                            "--path", str(paquete_dir), "--lang", "golang",
                            "--label", etiqueta])
        return {"ok": r.returncode == 0, "detalle": r.stderr[-400:]}

    def install(self, org: str, tar_gz: Path) -> dict:
        r = self._sh(org, ["peer", "lifecycle", "chaincode", "install", str(tar_gz)])
        salida = (r.stderr or "") + (r.stdout or "")
        m = re.search(r"identifier:\s*(\S+)", salida)
        return {"ok": r.returncode == 0, "package_id": m.group(1) if m else None,
                "detalle": salida[-400:]}

    def approveformyorg(self, org: str, canal: str, nombre: str, version: str,
                        secuencia: int, package_id: str, politica: str) -> dict:
        r = self._sh(org, [
            "peer", "lifecycle", "chaincode", "approveformyorg",
            *self._orderer_flags(), "--channelID", canal, "--name", nombre,
            "--version", version, "--sequence", str(secuencia),
            "--package-id", package_id, "--signature-policy", politica,
        ])
        return {"ok": r.returncode == 0, "detalle": r.stderr[-400:]}

    def commit(self, canal: str, nombre: str, version: str,
               secuencia: int, politica: str) -> dict:
        r = self._sh("op", [
            "peer", "lifecycle", "chaincode", "commit",
            *self._orderer_flags(), "--channelID", canal, "--name", nombre,
            "--version", version, "--sequence", str(secuencia),
            "--signature-policy", politica, *self._peers_flags(),
        ])
        m = re.search(r"txid \[([0-9a-f]+)\]", (r.stderr or "") + (r.stdout or ""))
        return {"ok": r.returncode == 0, "txid": m.group(1) if m else None,
                "detalle": (r.stderr or r.stdout)[-400:]}

    def querycommitted(self, canal: str, nombre: str) -> dict:
        r = self._sh("op", ["peer", "lifecycle", "chaincode", "querycommitted",
                            "--channelID", canal, "--name", nombre,
                            "--output", "json"])
        return {"ok": r.returncode == 0, "salida": (r.stdout or r.stderr)[-600:]}


def _ahora_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def desplegar(fila: dict, paquete_dir: Path, runner, tar_gz: Path) -> tuple[str, dict]:
    """Ejecuta el lifecycle. Devuelve (estado_nuevo, despliegue|motivo).

    Precondición del llamador: fila['estado'] == 'aprobado' (el guard duro
    vive en main(), que ademas lo exige en el WHERE del PATCH).
    """
    integridad = verificar_paquete(paquete_dir)
    if not integridad["ok"]:
        return "escalado", {"fase": "G5", "motivo": "paquete alterado respecto a su manifest",
                            "hallazgos": integridad["hallazgos"]}
    if integridad["paquete_sha256"] != fila.get("hash_paquete"):
        return "escalado", {
            "fase": "G5",
            "motivo": (
                f"hash del paquete en disco ({integridad['paquete_sha256'][:16]}…) "
                f"≠ hash APROBADO ({str(fila.get('hash_paquete'))[:16]}…) — lo que se "
                f"despliega debe ser bit a bit lo que se aprobó"
            ),
        }

    canal = fila["canal_destino"]
    nombre = json.loads((paquete_dir / "manifest.json").read_text())["nombre"]
    politica = fila["manifest"]["politica_endorsement"]
    secuencia = int(fila["secuencia"])
    version = f"{secuencia}.0"
    etiqueta = f"{nombre}_{secuencia}"

    r = runner.package(paquete_dir, tar_gz, etiqueta)
    if not r["ok"]:
        return "escalado", {"fase": "package", "motivo": r["detalle"]}
    tar_sha256 = hashlib.sha256(tar_gz.read_bytes()).hexdigest() if tar_gz.is_file() else None

    firmas: dict[str, dict] = {}
    package_id = None
    for org in ("op", "tg"):
        r = runner.install(org, tar_gz)
        if not r["ok"]:
            return "escalado", {"fase": f"install-{org}", "motivo": r["detalle"]}
        package_id = package_id or r.get("package_id")
    if not package_id:
        return "escalado", {"fase": "install",
                            "motivo": "install no devolvio package_id (identifier)"}

    for org, identidad in (("op", "admin-despliegue-op"), ("tg", "admin-despliegue-tg")):
        r = runner.approveformyorg(org, canal, nombre, version, secuencia,
                                  package_id, politica)
        if not r["ok"]:
            return "escalado", {"fase": f"approve-{org}", "motivo": r["detalle"]}
        firmas[org] = {"identidad": identidad, "en": _ahora_iso()}

    r = runner.commit(canal, nombre, version, secuencia, politica)
    if not r["ok"]:
        return "escalado", {"fase": "commit", "motivo": r["detalle"]}
    txid = r.get("txid")

    q = runner.querycommitted(canal, nombre)
    if not q["ok"]:
        return "escalado", {"fase": "querycommitted",
                            "motivo": "commit reportado pero querycommitted fallo: " + q.get("salida", "")}

    return "desplegado", {
        "canal": canal, "chaincode": nombre, "version": version,
        "secuencia": secuencia, "package_id": package_id,
        "paquete_tar_sha256": tar_sha256, "tx_commit": txid,
        "firmas": firmas, "querycommitted": q["salida"],
    }


def _avisar(mensaje: str) -> None:
    destino = os.environ.get("DESPLIEGUE_DELIVER", "telegram:7022378429")
    exec_cmd = ["docker", "exec", "hermes-negocio", "hermes", "send",
                "-t", destino, mensaje]
    host = os.environ.get("DESPLIEGUE_DOCKER_HOST")
    cmd = ["ssh", host, " ".join(exec_cmd)] if host else exec_cmd
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if r.returncode != 0:
            print(f"[desplegar] aviso Telegram fallo: {r.stderr[-200:]}", file=sys.stderr)
    except OSError as e:
        print(f"[desplegar] aviso Telegram fallo: {e}", file=sys.stderr)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--task", required=True, help="task_id del contrato a desplegar")
    ap.add_argument("--dry-run", action="store_true",
                    help="verifica G5 e imprime lo que haria; no toca red ni BD")
    args = ap.parse_args()

    url = env("SUPABASE_URL").rstrip("/")
    key = env("SUPABASE_SERVICE_ROLE_KEY")

    filas = _http(
        "GET",
        f"{url}/rest/v1/contratos_sc?task_id=eq.{urllib.parse.quote(args.task)}"
        "&select=id,task_id,estado,hash_paquete,canal_destino,manifest,secuencia,origen",
        key,
    )
    if not filas:
        sys.exit(f"[desplegar] {args.task}: sin fila en contratos_sc")
    fila = filas[0]
    if fila["estado"] != "aprobado":
        sys.exit(
            f"[desplegar] RECHAZO: {args.task} esta en estado {fila['estado']!r}, "
            f"no 'aprobado'. Este job SOLO opera filas aprobadas (doble candado "
            f"humano, PRP-013 F5)."
        )

    paquete_dir = Path(env("WORKTREES_DIR")) / args.task / "paquete-sc"
    if not paquete_dir.is_dir():
        sys.exit(f"[desplegar] paquete ausente en {paquete_dir}")

    if args.dry_run:
        integridad = verificar_paquete(paquete_dir)
        print(json.dumps({
            "task_id": args.task, "g5_ok": integridad["ok"]
            and integridad["paquete_sha256"] == fila["hash_paquete"],
            "hash_disco": integridad["paquete_sha256"],
            "hash_aprobado": fila["hash_paquete"],
            "canal": fila["canal_destino"], "secuencia": fila["secuencia"],
        }, indent=2))
        return 0

    runner = RunnerLifecycle(Path(env("RED_TIER1_ORGS")))
    tar_gz = paquete_dir.parent / f"{args.task}-sc.tar.gz"
    estado, detalle = desplegar(fila, paquete_dir, runner, tar_gz)

    cuerpo: dict = {"estado": estado, "updated_at": "now()"}
    if estado == "desplegado":
        cuerpo["despliegue"] = detalle
        cuerpo["desplegado_en"] = "now()"
        cuerpo["origen"] = {**(fila.get("origen") or {}),
                            "tx_commit": detalle.get("tx_commit")}
    else:
        cuerpo["despliegue"] = detalle
    # WHERE estado=eq.aprobado: si alguien movio la fila entre el GET y ahora,
    # el PATCH no pega (0 filas) — el guard no es solo del GET.
    actualizadas = _http(
        "PATCH",
        f"{url}/rest/v1/contratos_sc?id=eq.{fila['id']}&estado=eq.aprobado",
        key, cuerpo,
    )
    if not actualizadas:
        print(f"[desplegar] OJO: el PATCH no pego (la fila ya no estaba en "
              f"'aprobado') — verificar contratos_sc a mano", file=sys.stderr)
        return 1

    if estado == "desplegado":
        _avisar(f"✅ Chaincode desplegado: {detalle['chaincode']} en "
                f"{detalle['canal']} (seq {detalle['secuencia']}, "
                f"tx {str(detalle.get('tx_commit'))[:12]}…)")
        print(f"[desplegar] {args.task}: desplegado y registrado")
        return 0
    _avisar(f"🔴 Despliegue ESCALADO: {args.task} fase {detalle.get('fase')} — "
            f"{str(detalle.get('motivo'))[:160]}")
    print(f"[desplegar] {args.task}: escalado en fase {detalle.get('fase')}",
          file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
