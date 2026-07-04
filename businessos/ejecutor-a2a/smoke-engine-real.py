#!/usr/bin/env python3
"""smoke-engine-real.py — smoke OPCIONAL del motor real (QUEMA TOKENS).

Gated por diseño (PRP-006 Fase 4): solo corre con EJECUTOR_SMOKE_REAL=1 explicito.
Jamas lo invoca pytest ni ningun cron — es decision de la dueña.

Uso (con ANTHROPIC_API_KEY o login del CLI en la maquina):
    EJECUTOR_SMOKE_REAL=1 .venv/bin/python smoke-engine-real.py

Crea un repo temporal + worktree, pide al motor real UNA tarea trivial y muestra
el diff real y el gasto. No toca Supabase salvo que SUPABASE_URL/KEY esten en env.
"""
from __future__ import annotations

import asyncio
import os
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "trio-contrato"))

if os.environ.get("EJECUTOR_SMOKE_REAL") != "1":
    print("smoke real deshabilitado: exporta EJECUTOR_SMOKE_REAL=1 para correrlo (quema tokens)")
    sys.exit(0)

import workspace as ws  # noqa: E402
from claude_engine import ClaudeAgentEngine  # noqa: E402
from contrato import validar_tarea  # noqa: E402

TAREA = validar_tarea({
    "task_id": "smoke-0001",
    "objetivo": "Crea un archivo hola.txt en la raiz con el texto exacto: hola trio",
    "criterios_aceptacion": ["existe hola.txt con el contenido 'hola trio'"],
    "limites": {"intentos_max": 1, "max_turns": 8, "presupuesto_usd": 0.5},
})


async def main() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        repo = Path(tmp) / "repo"
        repo.mkdir()
        for cmd in (["git", "init", "-b", "main"],
                    ["git", "config", "user.email", "smoke@trio"],
                    ["git", "config", "user.name", "smoke"]):
            subprocess.run(cmd, cwd=repo, check=True, capture_output=True)
        (repo / "README.md").write_text("smoke\n")
        subprocess.run(["git", "add", "-A"], cwd=repo, check=True, capture_output=True)
        subprocess.run(["git", "commit", "-m", "init"], cwd=repo, check=True, capture_output=True)

        worktree = ws.preparar(repo, Path(tmp) / "espacio", TAREA["task_id"])
        salida = await ClaudeAgentEngine().run(TAREA, worktree)

        print("artefactos:", salida["artefactos"])
        print("notas:", salida["notas"][:300])
        print("--- diff real del worktree ---")
        print(ws.diff_de(worktree)[:2000])
        contenido = (worktree / "hola.txt").read_text().strip() if (worktree / "hola.txt").exists() else "(NO EXISTE)"
        print(f"hola.txt → {contenido!r}")


asyncio.run(main())
