# ejecutor-a2a — el Ejecutor del trio como agente A2A (Fase 6, PRP-006)
# Escucha en :4100 dentro de hermes-net; sin puertos publicos (ver compose).
#
# CONTEXT DE BUILD: businessos/ (no este directorio) — el contrato del trio
# (trio-contrato/contrato.py) se copia dentro de la imagen:
#   docker build -f ejecutor-a2a/Dockerfile .
#
# MOTOR REAL (EJECUTOR_ENGINE=claude): requiere el CLI de Claude Code (Node +
# `npm i -g @anthropic-ai/claude-code`, instalado aqui abajo) y una credencial
# en runtime — ANTHROPIC_API_KEY (Anthropic directo) o ANTHROPIC_BASE_URL +
# ANTHROPIC_AUTH_TOKEN (seam GLM-5.2 via z.ai). El CLI se instala en TIEMPO DE
# BUILD (no necesita credencial); la credencial se inyecta por env var al
# arrancar el contenedor — decision explicita de la dueña de encenderla
# (ver ROADMAP Fase 6, residual "dogfood real").
FROM python:3.12-slim

# git: el aislamiento por tarea son git worktrees (workspace.py)
# nodejs/npm: soporte del CLI de Claude Code para el motor real
RUN apt-get update && apt-get install -y --no-install-recommends git nodejs npm \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g @anthropic-ai/claude-code

# El repo/worktrees llegan por bind-mount/volumen con uid del host (distinto de
# root): sin esto git aborta con 'dubious ownership'. El contenedor solo ve SUS
# mounts; marcar todo como safe.directory es correcto en este aislamiento.
RUN git config --system --add safe.directory '*'

WORKDIR /app

COPY ejecutor-a2a/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY trio-contrato/contrato.py .
COPY ejecutor-a2a/card.py ejecutor-a2a/executor.py ejecutor-a2a/engine.py \
     ejecutor-a2a/claude_engine.py ejecutor-a2a/workspace.py \
     ejecutor-a2a/estado.py ejecutor-a2a/supervisor_cliente.py \
     ejecutor-a2a/app.py ./

EXPOSE 4100

# slim no trae curl: el healthcheck usa urllib de la stdlib
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:4100/health', timeout=4)"]

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "4100"]
