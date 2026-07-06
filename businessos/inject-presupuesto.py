#!/usr/bin/env python3
# Inyecta el presupuesto actual en la MEMORY del agente (contexto siempre cargado),
# para que el bot lo reporte SIN herramientas de archivo (este runtime no tiene Docker).
# Corre DENTRO del contenedor hermes-negocio (docker exec -u hermes ... python3 - ).
import json, re, pathlib, sys

SNAP = pathlib.Path("/opt/data/workspace/presupuesto.json")
MEM = pathlib.Path("/opt/data/SOUL.md")  # SOUL.md SÍ se inyecta al system prompt (AGENTS/MEMORY no)
START = "<!-- PRESUPUESTO:AUTO:START -->"
END = "<!-- PRESUPUESTO:AUTO:END -->"

if not SNAP.exists():
    print("sin snapshot presupuesto.json; nada que inyectar"); sys.exit(0)
d = json.loads(SNAP.read_text())
por = ", ".join(f"{k} ${v:.4f}" for k, v in d.get("por_vertical", {}).items()) or "s/d"
alerta = " ⚠️ SUPERASTE EL 80% DEL PRESUPUESTO." if d.get("alerta_80pct") else ""
block = (
    f"{START}\n"
    f"## Presupuesto actual (dato automático — corte {d.get('generado','?')})\n"
    f"Gasto de {d.get('mes','?')}: **${d.get('costo_total_usd',0):.4f} de "
    f"${d.get('presupuesto_usd',0):.0f} ({d.get('pct_presupuesto',0)}%)**.{alerta}\n"
    f"Por vertical: {por}.\n"
    f"REGLA ESTRICTA: cuando Elisa pregunte por presupuesto/gasto/tokens/costo de IA, "
    f"responde DE INMEDIATO en TEXTO con estos números — ya los tienes aquí. "
    f"PROHIBIDO ejecutar herramientas para esto (ni terminal, ni cat, ni read_file, ni "
    f"execute_code): no hacen falta y quedan feas en el chat. Solo redacta la respuesta.\n"
    f"{END}"
)
txt = MEM.read_text() if MEM.exists() else ""
pat = re.compile(re.escape(START) + r".*?" + re.escape(END), re.S)
txt = pat.sub(block, txt) if pat.search(txt) else (txt.rstrip() + "\n\n" + block + "\n")
MEM.write_text(txt)
print(f"{MEM.name}: presupuesto inyectado ({d.get('mes')}: ${d.get('costo_total_usd',0):.4f})")
