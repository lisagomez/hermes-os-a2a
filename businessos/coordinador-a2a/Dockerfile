# coordinador-a2a — el Coordinador del enjambre como agente A2A (Fase 7, PRP-007)
# Escucha en :4300 dentro de hermes-net; sin puertos publicos (ver compose).
#
# CONTEXT DE BUILD: businessos/ (no este directorio) — el contrato del trio
# (trio-contrato/contrato.py) se copia dentro de la imagen:
#   docker build -f coordinador-a2a/Dockerfile .
#
# PLANNER REAL (COORDINADOR_PLANNER=claude): requiere el CLI de Claude Code (Node +
# `npm i -g @anthropic-ai/claude-code`, instalado aqui abajo) y una credencial en
# runtime — ANTHROPIC_API_KEY (Anthropic directo) o ANTHROPIC_BASE_URL +
# ANTHROPIC_AUTH_TOKEN (seam GLM-5.2 via z.ai). El CLI se instala en TIEMPO DE
# BUILD (no necesita credencial); encenderlo (COORDINADOR_PLANNER=claude) es
# decision explicita de la dueña (default = mock, cero tokens).
FROM python:3.12-slim

# git: la integracion de ramas del enjambre usa git (Fase 4)
# nodejs/npm: soporte del CLI de Claude Code para el planner real
RUN apt-get update && apt-get install -y --no-install-recommends git nodejs npm \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g @anthropic-ai/claude-code

# El repo/worktrees llegan por bind-mount/volumen con uid del host (distinto de
# root): sin esto git aborta con 'dubious ownership'. El contenedor solo ve SUS
# mounts; marcar todo como safe.directory es correcto en este aislamiento.
RUN git config --system --add safe.directory '*'

WORKDIR /app

COPY coordinador-a2a/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY trio-contrato/contrato.py trio-contrato/errores_proveedor.py ./
# OJO: COPY EXPLICITO. Un modulo nuevo sin su linea aqui = ModuleNotFoundError y crash-loop
# en runtime, que los tests de dev NO cazan (2026-07-10). `cola_espera.py` es de PRP-010.
COPY coordinador-a2a/card.py coordinador-a2a/executor.py coordinador-a2a/planner.py \
     coordinador-a2a/claude_planner.py coordinador-a2a/estado.py coordinador-a2a/enjambre.py \
     coordinador-a2a/ejecutor_cliente.py coordinador-a2a/presupuesto.py \
     coordinador-a2a/cola_espera.py \
     coordinador-a2a/integracion.py coordinador-a2a/supervisor_cliente.py coordinador-a2a/app.py ./

# Correr como uid/gid 1000 (= hermes del host). Un solo escritor sobre /repo y
# /workspace: los objetos git que escribe el enjambre quedan owned 1000 (no root),
# asi el cron `git fetch` del host (tambien uid 1000) nunca vuelve a chocar y el
# master no se congela. HOME propio para $HOME/.claude (transcripts del planner).
# PRP-011 (2026-07-18). El uid DEBE ser 1000 para coincidir con el bind-mount.
RUN groupadd -g 1000 app && useradd -m -u 1000 -g 1000 -s /bin/bash app \
    && mkdir -p /workspace && chown 1000:1000 /workspace
ENV HOME=/home/app
USER app

EXPOSE 4300

# slim no trae curl: el healthcheck usa urllib de la stdlib
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:4300/health', timeout=4)"]

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "4300"]
