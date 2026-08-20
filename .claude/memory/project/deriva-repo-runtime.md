# Deriva repo → runtime (detector nocturno)

**Qué es**: la clase de fallo más repetida del proyecto — algo se fusiona a `master` y
nadie lo aplica al runtime. Documentada cuatro veces por separado antes de tener
mecanismo: volumen (2026-07-12), imagen (2026-07-23), migración (2026-08-02), seed del
grafo (2026-08-04).

**Por qué duele**: el síntoma nunca se parece a la causa. El 2026-08-20 el chat de la
landing llevaba 12 días regresando leads a etapa `nuevo` (pisando el avance del equipo en
el CRM) — no porque el código estuviera mal, sino porque su imagen era **18 días anterior
al fix ya fusionado**. Nadie lo reportó: parece error de otra persona.

## El detector

`businessos/drift-runtime.py` — corre en el cron nocturno (`nightly-jobs.sh`), en el
SERVIDOR, sin secretos, solo lectura. Revisa cinco frentes:

| Frente | Compara | Acción que nombra |
|---|---|---|
| `checkout` | `~/repo` contra `origin/master` (de ahí salen todos los crons) | `git pull --ff-only` |
| `imagen` | fecha de la imagen viva contra el último commit de **lo que su Dockerfile COPIA** | `compose up -d --build <svc>` con el servicio ocioso |
| `grafo` | reglas en la BD viva contra `grafo/seed/reglas.json` | aplicar `02-seed.sql` (idempotente) + restart |
| `doctrina` | `SOUL.md`/`AGENTS.md` del volumen contra el repo, ignorando bloques `AUTO` | diffear, copiar, `chown 10000:10000`, restart |
| `host-job` | copias de `~/bin` contra el repo | `cp` tras revisar el diff |

Snapshot en `negocio:/opt/data/workspace/drift-runtime.json` (el bot lo LEE, no lo
calcula). Sale con código 1 si hay deriva, para que destaque en `host-jobs.log`.

**No aplica nada**: nombrar y desplegar son decisiones distintas, y la segunda es humana.

## Gotcha caro del propio detector

Fechar un servicio por su **directorio de contexto** de compose da falsos positivos en
cascada: la mitad de los servicios del trío construyen con contexto `.` o `..` y un
Dockerfile de COPY explícitos, así que cualquier commit del repo los marcaba desfasados
(5 falsos positivos en la primera corrida contra el servidor real). La señal correcta son
las fuentes de los `COPY`, ignorando `--from=` (otra etapa del build) y uniendo las
continuaciones con `\`. Un detector ruidoso muere de desuso — igual que un log que nadie
lee.

## Cómo se usa al empezar sesión

Si el proyecto lleva días sin tocarse, correr el detector ANTES de planear trabajo nuevo:

```bash
ssh hermes@167.233.233.56 'cd ~/repo/businessos && python3 drift-runtime.py'
```

Relacionado: [[fase2-grafo]] (seed idempotente), [[despliegue-hetzner]] (volúmenes y
uid 10000), `CLAUDE.md` 2026-08-20.
