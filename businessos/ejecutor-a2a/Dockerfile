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

COPY trio-contrato/contrato.py trio-contrato/errores_proveedor.py ./
# OJO: el COPY es EXPLICITO. Un modulo nuevo sin su linea aqui = ModuleNotFoundError y
# crash-loop en runtime, y los tests de dev NO lo cazan (paso el 2026-07-10). Los cuatro
# ultimos son la COLA (PRP-010): cola, worker, pipeline y su tope de gasto. fabric_engine.py
# es el motor del departamento contratos_inteligentes (Fase 3, PRP-013).
COPY ejecutor-a2a/card.py ejecutor-a2a/executor.py ejecutor-a2a/engine.py \
     ejecutor-a2a/claude_engine.py ejecutor-a2a/workspace.py \
     ejecutor-a2a/estado.py ejecutor-a2a/supervisor_cliente.py \
     ejecutor-a2a/cola.py ejecutor-a2a/worker.py ejecutor-a2a/pipeline.py \
     ejecutor-a2a/presupuesto.py ejecutor-a2a/fabric_engine.py \
     ejecutor-a2a/contratos_sc.py ejecutor-a2a/app.py ./

# La fabrica de contratos inteligentes (Fase 3, PRP-013): FabricPaqueteEngine la
# carga desde /app/fabrica-sc por defecto (env FABRICA_SC_DIR la override). Sin
# esto, crear_engine() truena AL CONSTRUIRSE (config invalida, no fallo silencioso
# en runtime) porque contratos_inteligentes esta SIEMPRE en DEPARTAMENTOS. Solo el
# catalogo (contrato + engine + plantillas), no sus tests.
# OJO gotcha COPY multi-fuente: un directorio como fuente copia su CONTENIDO,
# no el directorio → engine/ y plantillas/ quedaban aplanados y _cargar_fabrica()
# no encontraba engine/fabrica.py (crash-loop, visto 2026-07-23). Una linea por dir.
COPY fabrica-sc/contrato_sc.py fabrica-sc/banderas.py ./fabrica-sc/
COPY fabrica-sc/engine ./fabrica-sc/engine
COPY fabrica-sc/plantillas ./fabrica-sc/plantillas

# Correr como uid/gid 1000 (= hermes del host). Un solo escritor sobre /repo y
# /workspace: los objetos git que escribe el trio quedan owned 1000 (no root),
# asi el cron `git fetch` del host (tambien uid 1000) nunca vuelve a chocar y el
# master no se congela. HOME propio para $HOME/.claude (transcripts del motor).
# PRP-011 (2026-07-18). El uid DEBE ser 1000 para coincidir con el bind-mount.
RUN groupadd -g 1000 app && useradd -m -u 1000 -g 1000 -s /bin/bash app \
    && mkdir -p /workspace && chown 1000:1000 /workspace
ENV HOME=/home/app
USER app

EXPOSE 4100

# slim no trae curl: el healthcheck usa urllib de la stdlib
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:4100/health', timeout=4)"]

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "4100"]
