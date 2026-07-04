# coordinador-a2a — el Coordinador del enjambre como agente A2A (Fase 7, PRP-007)
# Escucha en :4300 dentro de hermes-net; sin puertos publicos (ver compose).
#
# CONTEXT DE BUILD: businessos/ (no este directorio) — el contrato del trio
# (trio-contrato/contrato.py) se copia dentro de la imagen:
#   docker build -f coordinador-a2a/Dockerfile .
#
# PLANNER REAL (COORDINADOR_PLANNER=claude): requiere ademas el CLI de Claude Code
# (Node + `npm i -g @anthropic-ai/claude-code`) y ANTHROPIC_API_KEY. Esta imagen
# NO lo trae (default = mock, cero tokens): activar el planner real es decision
# explicita de la dueña (residual runtime, ver ROADMAP Fase 7).
FROM python:3.12-slim

# git: la integracion de ramas del enjambre usa git (Fase 4)
RUN apt-get update && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY coordinador-a2a/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY trio-contrato/contrato.py .
COPY coordinador-a2a/card.py coordinador-a2a/executor.py coordinador-a2a/planner.py \
     coordinador-a2a/estado.py coordinador-a2a/enjambre.py coordinador-a2a/ejecutor_cliente.py \
     coordinador-a2a/presupuesto.py coordinador-a2a/integracion.py \
     coordinador-a2a/supervisor_cliente.py coordinador-a2a/app.py ./

EXPOSE 4300

# slim no trae curl: el healthcheck usa urllib de la stdlib
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:4300/health', timeout=4)"]

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "4300"]
