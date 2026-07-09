# supervisor-a2a — el Supervisor del trio como agente A2A (Fase 6, PRP-006)
# Escucha en :4200 dentro de hermes-net; sin puertos publicos (ver compose).
# Contenedor FISICAMENTE separado del Ejecutor: juzga de cero, solo comparte
# el volumen trio-workspace (el worktree es la evidencia, no el testimonio).
#
# CONTEXT DE BUILD: businessos/ (no este directorio):
#   docker build -f supervisor-a2a/Dockerfile .
#
# node/npm: los gates reales del departamento software son `npm run build|
# typecheck|lint` y `npx playwright test` — sin node, TODO gate de comando
# seria `no_ejecutable` (= rechazo) y el supervisor no serviria de nada.
#
# Playwright browsers (cierre de residual, 2026-07-09): pre-instalados AQUI en
# un path fijo (PLAYWRIGHT_BROWSERS_PATH=/ms-playwright) para que `npx
# playwright test` sobre CUALQUIER worktree los encuentre sin descargarlos en
# cada corrida. El repo objetivo debe fijar la MISMA version de
# `@playwright/test` que la instalada aqui (ver version resuelta en el build)
# para que el cache resuelva; si no coincide, Playwright intenta descargar de
# nuevo en runtime (funciona igual, solo mas lento la primera vez).
FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends git nodejs npm \
    && rm -rf /var/lib/apt/lists/*

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npm install -g @playwright/test \
    && npx playwright install --with-deps chromium \
    && npm list -g @playwright/test

# El repo/worktrees llegan por bind-mount/volumen con uid del host (distinto de
# root): sin esto git aborta con 'dubious ownership'. El contenedor solo ve SUS
# mounts; marcar todo como safe.directory es correcto en este aislamiento.
RUN git config --system --add safe.directory '*'

WORKDIR /app

COPY supervisor-a2a/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY trio-contrato/contrato.py .
COPY supervisor-a2a/card.py supervisor-a2a/executor.py supervisor-a2a/gates.py \
     supervisor-a2a/veredicto.py supervisor-a2a/app.py ./
COPY supervisor-a2a/reglas ./reglas

EXPOSE 4200

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:4200/health', timeout=4)"]

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "4200"]
