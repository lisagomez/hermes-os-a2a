# Dos máquinas: runtime vs desarrollo (2026-07-02)

Hermes OS · A2A vive repartido en DOS máquinas WSL2 distintas. Verificar en qué máquina
estás ANTES de concluir "esto desapareció" o "esto está roto".

## CORRECCIÓN 2026-07-05: la máquina "de desarrollo" ES runtime (verticales vivas ahí)

La nota de 2026-07-02 quedó DESACTUALIZADA y confundió el despliegue. Realidad al
2026-07-05: en `DESKTOP-R7QROKM` (WSL, la de "desarrollo") corren las TRES verticales
en Docker (`hermes-personal/negocio/clientes`, Up días) y gsore SÍ tiene acceso a docker
(`docker ps` funciona). Los volúmenes `~/businessos/<vertical>/.hermes` existen (uid 10000,
0700). O sea: esta máquina ha sido el runtime de facto.
- **negocio MIGRADO a Hetzner el 2026-07-05** (ver [[despliegue-hetzner]]): se paró aquí y
  su `.hermes` se copió al server; @a2aTeamBot ahora vive en Hetzner. personal + clientes
  SIGUEN corriendo aquí (tokens distintos, sin conflicto).
  **No correr `docker compose up` de negocio en esta máquina** (recrearía el gateway y
  chocaría el token con Hetzner). Idealmente `docker rm hermes-negocio` aquí.

### (histórico 2026-07-02, ya no vigente) original inaccesible
Se creyó que la runtime era otra máquina "original" inaccesible y que aquí no había runtime.
Falso: el runtime está aquí. Se conserva la nota para trazabilidad.

## Máquina RUNTIME (la original, 2026-06-27 →)
- Ahí viven: los contenedores Docker (`hermes-personal/negocio/clientes`, y grafo
  cuando suba), los volúmenes `~/businessos/<vertical>/.hermes`, el usuario en el
  grupo `docker`, y el `businessos/.env` de esa máquina.
- TODO lo que sea runtime se hace ahí: `docker exec/run`, levantar gateways,
  correr host-jobs contra los contenedores (tramo `docker exec` de
  `polar-cobros.py`, `ingest-*.py`, etc.), leer `agent.log`.

## Máquina DESARROLLO (esta; detectada 2026-07-02)
- Solo el repo git + Claude Code. NO hay: `~/businessos`, instalación Hermes,
  acceso a docker (daemon activo pero usuario fuera del grupo `docker`),
  ni los volúmenes.
- Aquí SÍ: código, seeds del grafo, docs/memoria, pruebas con bandeja local
  (`COBROS_DIR`/`CONTRATOS_DIR`), llamadas directas a APIs (Supabase, Polar).
- `~/.config/claude/secrets.env` (sbp_) recreado aquí el 2026-07-02.

## Cómo viajan los cambios entre máquinas
- **Código y memoria**: por git (commit → PR → pull en la runtime). Único canal.
- **`businessos/.env` NO viaja** (git-ignored): cualquier variable nueva hay que
  agregarla A MANO en el .env de la runtime. Pendiente de esto: las líneas de
  Polar (`POLAR_ACCESS_TOKEN`, `POLAR_PRODUCT_ID`, `POLAR_API` sandbox) que hoy
  solo existen en el .env de desarrollo.
- **`secrets.env` tampoco viaja**: uno por máquina.

## Pytest en esta máquina de desarrollo (2026-07-04)
- venv git-ignored en `businessos/.venv` (Python 3.14). Correr tests:
  `cd businessos/<servicio> && ../.venv/bin/python -m pytest -q`.
- Gotcha 3.14: `python3 -m venv` falla ("ensurepip is not available"). Bootstrap:
  `python3 -m venv --without-pip .venv` + `curl -A curl/8.0 -fsSL
  https://bootstrap.pypa.io/get-pip.py | .venv/bin/python -`. Luego
  `pip install pytest -r <servicio>/requirements.txt`.
- Deps A2A pesadas (`a2a-sdk[http-server]`, `claude-agent-sdk`) ya instaladas en ese
  venv. Verde al 2026-07-04: ejecutor-a2a 35, coordinador-a2a 41, trio-contrato 36.

## Síntomas de estar en la máquina equivocada
- `docker ps` → "permission denied … docker.sock" (aquí no hay acceso).
- `~/businessos` no existe (no confundir con el gotcha de uid 10000/0700, que da
  "Permission denied" con el directorio SÍ existente).
- `secrets.env` ausente → es que esta máquina aún no tiene el suyo.

## ACTUALIZACIÓN 2026-07-08 — ya NO hay verticales en WSL2

Las 3 verticales (negocio, personal, clientes) viven en **Hetzner**. En la máquina
de desarrollo NO debe correrse `docker compose up` de NINGUNA vertical (choque de
token Telegram). Los volúmenes locales `~/businessos/*/.hermes` quedan solo como
respaldo histórico de la migración. El runtime se opera por SSH
(`ssh hermes@167.233.233.56`, ver `businessos/COMO-RETOMAR.md`).
