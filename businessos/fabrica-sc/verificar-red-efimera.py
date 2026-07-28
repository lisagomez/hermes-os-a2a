#!/usr/bin/env python3
"""verificar-red-efimera.py — gate de red efímera del trío (PRP-013, Fase 5).

Host-job. Corre en la máquina con fabric-samples + Docker (nodo sandbox por
decisión 2026-07-19; en dev sirve para specs de demo). JAMÁS dentro del
contenedor del Supervisor: el juez no lleva socket Docker por diseño.

Flujo por candidato (contratos_sc.estado='fabricando' cuya tarea del trío ya
salió 'aprobada' de los gates estáticos):
  1. Re-verifica la integridad del paquete contra su manifest (integridad.py)
     ANTES de gastar red: paquete alterado → 'escalado', ni un contenedor.
  2. Genera el plan determinista (red_efimera.py). Spec no ejecutable en la
     test network → 'escalado' con el motivo (nunca aparentar verificación).
  3. Ejecuta el plan con el runner de fabric-samples; el primer paso que
     falla corta (red_down siempre se intenta). Verde → 'en_revision' (+
     en_revision_desde, arranca la métrica G4 de fatiga); rojo → 'escalado'.
  4. El resultado íntegro queda en contratos_sc.red_efimera — el paquete de
     revisión de Mission Control lo muestra.

Un escritor por transición: este job SOLO escribe fabricando→{en_revision,
escalado}. Todo fallo se imprime (un best-effort silencioso es invisible,
aprendizaje 2026-07-13).

Uso:
  python3 verificar-red-efimera.py                # procesa candidatos
  python3 verificar-red-efimera.py --task <id>   # solo esa tarea
  python3 verificar-red-efimera.py --dry-run     # imprime el plan, no toca red ni BD

Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (source businessos/.env),
WORKTREES_DIR (raíz de worktrees del trío; el paquete vive en
<WORKTREES_DIR>/<task_id>/paquete-sc), FABRIC_SAMPLES_DIR (checkout de
fabric-samples con test-network).
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from integridad import verificar_paquete  # noqa: E402
from red_efimera import plan_red_efimera  # noqa: E402

UA = "curl/8.0"  # Cloudflare 1010 con el UA de urllib (aprendizaje 2026-07-02)
TIMEOUT_HTTP = 30
TIMEOUT_PASO = 900  # red up + deploy tardan minutos; jamas 30s (2026-07-12)


def env(nombre: str) -> str:
    v = os.environ.get(nombre, "")
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


class RunnerFabricSamples:
    """Ejecuta pasos del plan contra la test network de fabric-samples.

    Cada método devuelve {"ok": bool, "detalle": str}. Todo comando se loguea.
    La validación fina de estos comandos contra una red real es parte de la
    Fase 6 (nodo sandbox); la estructura y el contrato del job se fijan aquí.
    """

    def __init__(self, samples_dir: Path, paquete_dir: Path) -> None:
        self._red = samples_dir / "test-network"
        self._paquete = paquete_dir
        self._canal = ""
        self._chaincode = ""

    def _sh(self, cmd: list[str], cwd: Path | None = None,
            extra_env: dict | None = None) -> subprocess.CompletedProcess:
        print(f"[red-efimera] $ {' '.join(cmd)}", flush=True)
        return subprocess.run(
            cmd, cwd=cwd or self._red, capture_output=True, text=True,
            timeout=TIMEOUT_PASO, env={**os.environ, **(extra_env or {})},
        )

    def _env_identidad(self, como: str) -> dict:
        """Env del peer CLI para el MSP del rol (test network: Org1/Org2)."""
        org = "org1" if self._msp_de(como) == "Org1MSP" else "org2"
        puerto = "7051" if org == "org1" else "9051"
        raiz = self._red / "organizations" / "peerOrganizations" / f"{org}.example.com"
        msp_dir = self._identidades.get(como) or (
            raiz / "users" / f"Admin@{org}.example.com" / "msp"
        )
        return {
            "PATH": f"{self._red.parent / 'bin'}:{os.environ.get('PATH', '')}",
            "FABRIC_CFG_PATH": str(self._red.parent / "config"),
            "CORE_PEER_TLS_ENABLED": "true",
            "CORE_PEER_LOCALMSPID": self._msp_de(como),
            "CORE_PEER_MSPCONFIGPATH": str(msp_dir),
            "CORE_PEER_TLS_ROOTCERT_FILE": str(
                raiz / "peers" / f"peer0.{org}.example.com" / "tls" / "ca.crt"
            ),
            "CORE_PEER_ADDRESS": f"localhost:{puerto}",
        }

    def preparar(self, roles: dict[str, str]) -> None:
        """roles: rol → msp (del plan); identidades con atributo se registran aparte."""
        self._roles = roles
        self._identidades: dict[str, Path] = {}

    def _msp_de(self, rol: str) -> str:
        return self._roles[rol]

    def _orderer_flags(self) -> list[str]:
        ca = (self._red / "organizations" / "ordererOrganizations" / "example.com"
              / "orderers" / "orderer.example.com" / "msp" / "tlscacerts"
              / "tlsca.example.com-cert.pem")
        return ["-o", "localhost:7050", "--ordererTLSHostnameOverride",
                "orderer.example.com", "--tls", "--cafile", str(ca)]

    def ejecutar(self, paso: dict) -> dict:
        try:
            return getattr(self, f"_paso_{paso['tipo']}")(paso)
        except subprocess.TimeoutExpired:
            return {"ok": False, "detalle": f"timeout de {TIMEOUT_PASO}s en {paso['tipo']}"}

    def _paso_red_up(self, paso: dict) -> dict:
        self._canal = paso["canal"]
        r = self._sh(["./network.sh", "up", "createChannel", "-c", self._canal, "-ca"])
        return {"ok": r.returncode == 0, "detalle": r.stderr[-400:] if r.returncode else "red arriba"}

    def _paso_desplegar(self, paso: dict) -> dict:
        self._chaincode = paso["chaincode"]
        r = self._sh([
            "./network.sh", "deployCC", "-c", self._canal,
            "-ccn", self._chaincode, "-ccp", str(self._paquete), "-ccl", "go",
            "-ccep", paso["politica_endorsement"],
        ])
        return {"ok": r.returncode == 0, "detalle": r.stderr[-400:] if r.returncode else "chaincode desplegado"}

    def _paso_identidad(self, paso: dict) -> dict:
        """Registra y enrola una identidad CON atributo en la CA de su org."""
        org = "org1" if paso["msp"] == "Org1MSP" else "org2"
        puerto_ca = "7054" if org == "org1" else "8054"
        raiz = self._red / "organizations" / "peerOrganizations" / f"{org}.example.com"
        nombre = f"verif-{paso['rol']}"
        clave, valor = paso["atributo"].split("=", 1)
        home = {"FABRIC_CA_CLIENT_HOME": str(raiz)}
        tls = str(self._red / "organizations" / "fabric-ca" / org / "ca-cert.pem")
        r1 = self._sh([
            "fabric-ca-client", "register", "--caname", f"ca-{org}",
            "--id.name", nombre, "--id.secret", f"{nombre}pw", "--id.type", "client",
            "--id.attrs", f"{clave}={valor}:ecert", "--tls.certfiles", tls,
        ], extra_env=home | {"PATH": f"{self._red.parent / 'bin'}:{os.environ.get('PATH', '')}"})
        if r1.returncode != 0 and "already registered" not in r1.stderr:
            return {"ok": False, "detalle": r1.stderr[-400:]}
        msp_dir = raiz / "users" / f"{nombre}@{org}.example.com" / "msp"
        r2 = self._sh([
            "fabric-ca-client", "enroll",
            "-u", f"https://{nombre}:{nombre}pw@localhost:{puerto_ca}",
            "--caname", f"ca-{org}", "-M", str(msp_dir), "--tls.certfiles", tls,
        ], extra_env=home | {"PATH": f"{self._red.parent / 'bin'}:{os.environ.get('PATH', '')}"})
        if r2.returncode != 0:
            return {"ok": False, "detalle": r2.stderr[-400:]}
        cfg = raiz / "msp" / "config.yaml"
        if cfg.is_file():
            (msp_dir / "config.yaml").write_bytes(cfg.read_bytes())
        self._identidades[paso["rol"]] = msp_dir
        return {"ok": True, "detalle": f"identidad {nombre} ({paso['atributo']}) enrolada"}

    def _paso_invoke(self, paso: dict) -> dict:
        cuerpo = json.dumps({"function": paso["funcion"], "Args": paso["args"]})
        r = self._sh([
            "peer", "chaincode", "invoke", *self._orderer_flags(),
            "-C", self._canal, "-n", self._chaincode, "-c", cuerpo,
            "--waitForEvent",
        ], extra_env=self._env_identidad(paso["como"]))
        exito = r.returncode == 0
        if paso["espera"] == "exito":
            return {"ok": exito, "detalle": (r.stderr or r.stdout)[-400:]}
        # espera == rechazo: el CHAINCODE debe rechazar (returncode != 0)
        if exito:
            return {"ok": False,
                    "detalle": f"{paso['funcion']} como {paso['como']} debia ser "
                               f"rechazada y ENTRO — control de rol roto"}
        return {"ok": True, "detalle": f"rechazo correcto: {(r.stderr or r.stdout)[-200:]}"}

    def _paso_query(self, paso: dict) -> dict:
        cuerpo = json.dumps({"function": paso["funcion"], "Args": paso["args"]})
        r = self._sh([
            "peer", "chaincode", "query", "-C", self._canal, "-n", self._chaincode,
            "-c", cuerpo,
        ], extra_env=self._env_identidad(paso["como"]))
        if r.returncode != 0:
            return {"ok": False, "detalle": r.stderr[-400:]}
        try:
            estado = json.loads(r.stdout).get("estado")
        except json.JSONDecodeError:
            return {"ok": False, "detalle": f"query no devolvio JSON: {r.stdout[-200:]}"}
        if estado != paso["espera_estado"]:
            return {"ok": False,
                    "detalle": f"estado {estado!r}, esperado {paso['espera_estado']!r}"}
        return {"ok": True, "detalle": f"estado verificado: {estado}"}

    def _paso_red_down(self, _paso: dict) -> dict:
        r = self._sh(["./network.sh", "down"])
        return {"ok": r.returncode == 0, "detalle": "red abajo" if r.returncode == 0 else r.stderr[-200:]}


def ejecutar_plan(plan: dict, runner) -> dict:
    """Corre los pasos; primer fallo corta (red_down siempre se intenta)."""
    roles = plan.get("roles", {})
    if hasattr(runner, "preparar"):
        runner.preparar(roles)
    ejecutados: list[dict] = []
    verde = True
    for paso in plan["pasos"]:
        if not verde and paso["tipo"] != "red_down":
            continue
        r = runner.ejecutar(paso)
        ejecutados.append({
            "paso": {k: v for k, v in paso.items()},
            "ok": bool(r.get("ok")), "detalle": str(r.get("detalle", ""))[:400],
        })
        if not r.get("ok"):
            verde = False
            print(f"[red-efimera] ROJO en {paso['tipo']} "
                  f"{paso.get('funcion', '')}: {r.get('detalle', '')[:200]}",
                  file=sys.stderr)
    return {"verde": verde, "pasos": ejecutados, "resumen": plan.get("resumen", {})}


def procesar_candidato(fila: dict, paquete_dir: Path, runner, ahora: int) -> tuple[str, dict]:
    """Devuelve (estado_nuevo, red_efimera). Puro salvo el runner inyectado."""
    integridad = verificar_paquete(paquete_dir)
    if not integridad["ok"]:
        return "escalado", {
            "verde": False, "fase": "integridad",
            "motivo": "paquete alterado respecto a su manifest (ni un contenedor se gasto)",
            "hallazgos": integridad["hallazgos"],
        }
    if integridad["paquete_sha256"] != fila.get("hash_paquete"):
        return "escalado", {
            "verde": False, "fase": "integridad",
            "motivo": "hash del paquete distinto del registrado en contratos_sc",
        }
    manifest = json.loads((paquete_dir / "manifest.json").read_text())
    spec = _spec_normalizada(fila)
    plan = plan_red_efimera(spec, manifest, ahora)
    if "no_ejecutable" in plan:
        return "escalado", {
            "verde": False, "fase": "plan", "motivo": plan["no_ejecutable"],
        }
    plan["roles"] = {r["id"]: r["msp"] for r in spec["roles"]}
    resultado = ejecutar_plan(plan, runner)
    resultado["fase"] = "red"
    return ("en_revision" if resultado["verde"] else "escalado"), resultado


def _spec_normalizada(fila: dict) -> dict:
    import contrato_sc  # noqa: PLC0415 — mismo dir (sys.path ya primado)

    return contrato_sc.validar_sc_spec(fila["spec"])


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--task", help="procesar solo esta task_id")
    ap.add_argument("--dry-run", action="store_true",
                    help="imprime el plan; no toca red ni BD")
    args = ap.parse_args()

    url = env("SUPABASE_URL").rstrip("/")
    key = env("SUPABASE_SERVICE_ROLE_KEY")
    worktrees = Path(env("WORKTREES_DIR"))

    filtro = f"&task_id=eq.{urllib.parse.quote(args.task)}" if args.task else ""
    candidatas = _http(
        "GET",
        f"{url}/rest/v1/contratos_sc?estado=eq.fabricando{filtro}"
        "&select=id,task_id,spec,hash_paquete,plantilla&order=created_at.asc",
        key,
    )
    if not candidatas:
        print("[red-efimera] sin candidatas en estado fabricando")
        return 0

    task_ids = ",".join(urllib.parse.quote(f'"{c["task_id"]}"') for c in candidatas)
    aprobadas = {
        t["task_id"]
        for t in _http(
            "GET",
            f"{url}/rest/v1/tareas?task_id=in.({task_ids})"
            "&estado=eq.aprobada&select=task_id",
            key,
        )
    }

    fallo = 0
    for fila in candidatas:
        task_id = fila["task_id"]
        if task_id not in aprobadas:
            print(f"[red-efimera] {task_id}: su tarea aun no esta aprobada por el "
                  f"Supervisor — se queda en fabricando")
            continue
        paquete_dir = worktrees / task_id / "paquete-sc"
        if not paquete_dir.is_dir():
            print(f"[red-efimera] {task_id}: paquete ausente en {paquete_dir}",
                  file=sys.stderr)
            fallo = 1
            continue
        if args.dry_run:
            spec = _spec_normalizada(fila)
            manifest = json.loads((paquete_dir / "manifest.json").read_text())
            plan = plan_red_efimera(spec, manifest, int(time.time()))
            print(json.dumps({"task_id": task_id, "plan": plan},
                             indent=2, ensure_ascii=False))
            continue
        runner = RunnerFabricSamples(Path(env("FABRIC_SAMPLES_DIR")), paquete_dir)
        estado, resultado = procesar_candidato(fila, paquete_dir, runner, int(time.time()))
        cuerpo = {"estado": estado, "red_efimera": resultado, "updated_at": "now()"}
        if estado == "en_revision":
            cuerpo["en_revision_desde"] = "now()"
        _http("PATCH", f"{url}/rest/v1/contratos_sc?id=eq.{fila['id']}", key, cuerpo)
        print(f"[red-efimera] {task_id}: {estado} "
              f"({'verde' if resultado.get('verde') else resultado.get('motivo', 'rojo')})")
        if estado == "escalado":
            fallo = 1
    return fallo


if __name__ == "__main__":
    sys.exit(main())
