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
# go/gosec (Fase 4, PRP-013): el perfil "fabric" (reglas/contratos_inteligentes.toml)
# declara gates de comando `go build|vet|test`, `go mod verify` y `gosec` sobre
# `paquete-sc/` — sin el toolchain esos gates tambien serian `no_ejecutable`.
# Version PINEADA igual que el go.mod de la plantilla (go 1.24, ver
# fabrica-sc/plantillas/escrow-v1/go.mod); sha256 verificado contra el
# checksum publicado en go.dev/dl. gosec pineado a un tag, nunca @latest.
#
# Playwright browsers (cierre de residual, 2026-07-09): pre-instalados AQUI en
# un path fijo (PLAYWRIGHT_BROWSERS_PATH=/ms-playwright) para que `npx
# playwright test` sobre CUALQUIER worktree los encuentre sin descargarlos en
# cada corrida. El repo objetivo debe fijar la MISMA version de
# `@playwright/test` que la instalada aqui (ver version resuelta en el build)
# para que el cache resuelva; si no coincide, Playwright intenta descargar de
# nuevo en runtime (funciona igual, solo mas lento la primera vez).
FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends git nodejs npm curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npm install -g @playwright/test \
    && npx playwright install --with-deps chromium \
    && npm list -g @playwright/test

# Go 1.24.5 pineado (linux-amd64) con verificacion de checksum explicita.
RUN curl -fsSL -o /tmp/go.tar.gz https://go.dev/dl/go1.24.5.linux-amd64.tar.gz \
    && echo "10ad9e86233e74c0f6590fe5426895de6bf388964210eac34a6d83f38918ecdc  /tmp/go.tar.gz" | sha256sum -c - \
    && tar -C /usr/local -xzf /tmp/go.tar.gz \
    && rm /tmp/go.tar.gz
ENV PATH="/usr/local/go/bin:${PATH}" GOBIN=/usr/local/bin
# gosec pineado a un tag (go install verifica contra sum.golang.org por default).
RUN go install github.com/securego/gosec/v2/cmd/gosec@v2.28.0 \
    && gosec --version

# El repo/worktrees llegan por bind-mount/volumen con uid del host (distinto de
# root): sin esto git aborta con 'dubious ownership'. El contenedor solo ve SUS
# mounts; marcar todo como safe.directory es correcto en este aislamiento.
RUN git config --system --add safe.directory '*'

WORKDIR /app

COPY supervisor-a2a/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY trio-contrato/contrato.py .
# El motor de politicas del buzon se VENDORA (una sola implementacion de los 11
# gates: la misma que corre en buzon-a2a). chequeos_buzon.py la adapta.
COPY buzon-a2a/politicas.py .
COPY supervisor-a2a/card.py supervisor-a2a/executor.py supervisor-a2a/gates.py \
     supervisor-a2a/chequeos_adquisicion.py supervisor-a2a/chequeos_fabric.py \
     supervisor-a2a/chequeos_procesos.py supervisor-a2a/chequeos_buzon.py \
     supervisor-a2a/veredicto.py supervisor-a2a/app.py ./
COPY supervisor-a2a/reglas ./reglas
# Plantillas de referencia del catalogo (Fase 4): el gate diff_acotado_plantilla
# compara el paquete generado contra ESTAS, byte a byte fuera del diff declarado.
# Mismo commit que fabrica-sc/ del Ejecutor — build reproducible desde git.
COPY fabrica-sc/plantillas ./fabrica-sc/plantillas

# Correr como uid/gid 1000 (= hermes del host). El Supervisor hace `git add -A`
# en los worktrees (escribe el index bajo /repo): como uid 1000 esos objetos
# quedan owned 1000 (no root) y el cron `git fetch` del host nunca vuelve a
# chocar. /ms-playwright se chownea por si un mismatch de version dispara
# re-descarga en runtime (owned root fallaria como uid 1000). PRP-011 (2026-07-18).
RUN groupadd -g 1000 app && useradd -m -u 1000 -g 1000 -s /bin/bash app \
    && mkdir -p /workspace && chown 1000:1000 /workspace \
    && chown -R 1000:1000 /ms-playwright
ENV HOME=/home/app
USER app

EXPOSE 4200

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:4200/health', timeout=4)"]

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "4200"]
