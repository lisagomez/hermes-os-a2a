# ejecutor-a2a — el Ejecutor del trio como agente A2A (Fase 6, PRP-006)
# Escucha en :4100 dentro de hermes-net; sin puertos publicos (ver compose).
#
# CONTEXT DE BUILD: businessos/ (no este directorio) — el contrato del trio
# (trio-contrato/contrato.py) se copia dentro de la imagen:
#   docker build -f ejecutor-a2a/Dockerfile .
#
# MOTOR REAL (EJECUTOR_ENGINE=claude): requiere ademas el CLI de Claude Code
# (Node + `npm i -g @anthropic-ai/claude-code`) y ANTHROPIC_API_KEY. Esta imagen
# NO lo trae (default = mock, cero tokens): activar el motor real es decision
# explicita de la dueña (residual runtime, ver ROADMAP Fase 6).
FROM python:3.12-slim

# git: el aislamiento por tarea son git worktrees (workspace.py)
RUN apt-get update && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*

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
