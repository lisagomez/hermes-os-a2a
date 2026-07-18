"""integracion.py — integra las ramas aprobadas del enjambre (PRP-007, Fase 4).

El Ejecutor de Fase 6 STAGEA pero NO commitea: el trabajo de cada sub-tarea vive
como `git diff --cached` (ya viaja en resultado.diff), y la rama tarea/<task_id>
se queda en main. Por eso la integración faithful es **aplicar los diffs aprobados
en orden topológico** sobre un worktree de integración fresco (`git apply`), no
mergear ramas sin commits. Un diff que NO aplica limpio ES el conflicto → se escala
con el conflicto como hallazgo (SPEC-trio §7.4: un modelo NO resuelve el conflicto
en v1; "verificar antes de confiar").

Salida: un RESULTADO integrado ({worktree: worktree/<parent_id>, diff del todo,
archivos, artefactos}) que el Coordinador entrega al Supervisor para la
verificación FINAL — el todo se re-gatea de cero, independiente de los veredictos
por parte.
"""
from __future__ import annotations

import subprocess
from pathlib import Path

from contrato import validar_resultado


class IntegracionError(RuntimeError):
    """No se pudo integrar el enjambre; `.hallazgos` trae el conflicto estructurado."""

    def __init__(self, hallazgos: list[dict]) -> None:
        self.hallazgos = hallazgos
        super().__init__("; ".join(h.get("evidencia", "") for h in hallazgos) or "integración fallida")


def _git(cwd: Path, *args: str, entrada: str | None = None) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["git", "-C", str(cwd), *args],
        input=entrada, capture_output=True, text=True, timeout=120,
    )


def _preparar_rama_integrada(repo: Path, workspace_root: Path, parent_id: str) -> Path:
    """Worktree de integración FRESCO en tarea/<parent_id> desde HEAD (main)."""
    destino = workspace_root / "worktree" / parent_id
    # Fresco cada corrida: retira worktree/rama previos (best-effort) para no arrastrar estado.
    _git(repo, "worktree", "remove", "--force", str(destino))
    _git(repo, "worktree", "prune")
    _git(repo, "branch", "-D", f"tarea/{parent_id}")
    destino.parent.mkdir(parents=True, exist_ok=True)
    r = _git(repo, "worktree", "add", "-b", f"tarea/{parent_id}", str(destino))
    if r.returncode != 0:
        raise IntegracionError([{
            "regla": "integracion",
            "evidencia": f"no se pudo crear la rama integrada: {(r.stderr or r.stdout).strip()[:300]}",
        }])
    return destino


def diff_de_worktree(workspace_root, task_id: str) -> tuple[str, list[str]]:
    """El diff REAL de una sub-tarea, leido de git — nunca de la fila de `tareas`.

    Trampa que esto evita (PRP-010, Fase 7): `estado.py` recorta el diff a 20.000 chars
    para meterlo en el jsonb. Ese recorte esta bien para trazabilidad, pero la INTEGRACION
    hace `git apply`: un diff truncado no aplica (o peor, aplica a medias). El Coordinador
    monta el MISMO volumen que el Ejecutor, asi que puede leer la verdad donde vive.
    Es la misma doctrina de siempre: el diff sale de git, no del testimonio de nadie.
    """
    wt = Path(workspace_root) / "worktree" / task_id
    if not wt.is_dir():
        raise IntegracionError([{
            "regla": "integracion",
            "evidencia": f"worktree ausente para {task_id}: {wt} (¿lo limpio alguien?)",
        }])
    _git(wt, "add", "-A")  # idempotente: el worker ya lo dejo staged
    r = _git(wt, "diff", "--cached")
    if r.returncode != 0:
        raise IntegracionError([{
            "regla": "integracion",
            "evidencia": f"git diff fallo en {task_id}: {(r.stderr or '').strip()[:200]}",
        }])
    archivos = [l for l in _git(wt, "diff", "--cached", "--name-only").stdout.splitlines() if l.strip()]
    return r.stdout, archivos


def integrar(repo, workspace_root, parent_id: str, orden: list[str], sub_resultados: dict) -> dict:
    """Aplica los diffs aprobados en `orden` topológico. Devuelve el RESULTADO integrado."""
    repo, workspace_root = Path(repo), Path(workspace_root)
    if not repo.is_dir():
        raise IntegracionError([{"regla": "integracion", "evidencia": f"repo objetivo no existe: {repo}"}])

    destino = _preparar_rama_integrada(repo, workspace_root, parent_id)
    integradas: list[str] = []
    for tid in orden:
        salida = sub_resultados.get(tid)
        if not salida:
            continue
        diff = (salida.get("resultado") or {}).get("diff", "")
        if not diff.strip():
            integradas.append(tid)  # sub-tarea sin cambios: nada que aplicar
            continue
        r = _git(destino, "apply", "--index", "-", entrada=diff if diff.endswith("\n") else diff + "\n")
        if r.returncode != 0:
            raise IntegracionError([{
                "regla": "integracion",
                "evidencia": (
                    f"el diff de la sub-tarea '{tid}' no aplica limpio sobre el todo "
                    f"integrado (conflicto): {(r.stderr or '').strip()[:300]}"
                ),
            }])
        integradas.append(tid)

    diff_total = _git(destino, "diff", "--cached").stdout
    archivos = [l for l in _git(destino, "diff", "--cached", "--name-only").stdout.splitlines() if l.strip()]
    return validar_resultado({
        "task_id": parent_id,
        "worktree": f"worktree/{parent_id}",
        "diff": diff_total,
        "archivos": archivos,
        "artefactos": {"engine": "enjambre", "sub_tareas_integradas": integradas},
        "notas": f"Integracion de {len(integradas)} sub-tarea(s) en orden topologico: {integradas}",
    })
