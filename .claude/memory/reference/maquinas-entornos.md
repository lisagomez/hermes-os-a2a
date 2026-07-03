# Dos máquinas: runtime vs desarrollo (2026-07-02)

BusinessOS vive repartido en DOS máquinas WSL2 distintas. Verificar en qué máquina
estás ANTES de concluir "esto desapareció" o "esto está roto".

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

## Síntomas de estar en la máquina equivocada
- `docker ps` → "permission denied … docker.sock" (aquí no hay acceso).
- `~/businessos` no existe (no confundir con el gotcha de uid 10000/0700, que da
  "Permission denied" con el directorio SÍ existente).
- `secrets.env` ausente → es que esta máquina aún no tiene el suyo.
