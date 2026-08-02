# buzon-a2a — correo institucional operado por agentes (HERALDO-6)

Servicio A2A del buzón. Lee hilos **saneados** y redacta borradores que pasan 11
gates deterministas. **Nunca envía.** Spec completa: `businessos/SPEC-buzon-a2a.md`.

## La frontera, en una línea

Ningún componente que ejecuta un modelo tiene credenciales de correo. Este
contenedor no las ve: la entrada la trae `ingerir-entrantes.py` y la salida es
`enviar-salientes.py`, ambos host-jobs con las llaves fuera de aquí. Toda salida
exige la firma de una persona en `aprobaciones_salientes` — fila que este
servicio no puede fabricar.

## Superficie

Exactamente tres rutas (verificado por `tests/test_opacidad.py`):

| Ruta | Qué es |
|---|---|
| `/.well-known/agent-card.json` | la Agent Card (skill `mail`) |
| `/` | JSON-RPC A2A |
| `/health` | liveness; no reporta nada del interior |

Escucha en `:4900`, solo `127.0.0.1` por el compose (perfil `a2a`). Nunca se
publica por el `edge`.

## Las dos acciones

```json
{"accion": "leer", "hilo_id": "<id>"}
{"accion": "redactar", "correo_entrante_id": "<uuid>", "clase": "acuse_recibo"}
```

`leer` (A2, lector en cuarentena) devuelve extractos saneados con referencias
simbólicas — nunca HTML crudo. `redactar` (A3) produce un borrador, corre los 11
gates y lo persiste: si un gate **CRÍTICO** sale rojo el estado es
`rechazado_gates` y el borrador ni siquiera llega a la bandeja del aprobador.

## Módulos

| Archivo | Qué hace |
|---|---|
| `politicas.py` | los 11 gates, puros y sin dependencias. **También lo vendora el supervisor** (`chequeos_buzon.py`): una sola implementación, no dos que deriven |
| `saneado.py` | aplanar HTML quitando lo invisible, normalizar Unicode, truncar hilo citado, hash de evidencia |
| `correos.py` | acceso PostgREST; escribe solo borradores y bitácora |
| `redactor.py` | motor pluggable. El default es plantilla determinista: cero tokens y estructuralmente incapaz de seguir instrucciones inyectadas |
| `card.py` / `app.py` / `executor.py` | la superficie A2A (patrón `grafo-a2a`) |

## Variables de entorno

| Var | Efecto |
|---|---|
| `BUZON_PUBLIC_URL` | url que anuncia la card (default `http://buzon-a2a:4900`) |
| `BUZON_CANARIO` | token canario del sistema. **Sin valor, el gate `canario_ausente` queda ROJO** (fail-closed): el buzón no redacta a ciegas |
| `BUZON_LEYENDA` | leyenda de agente automatizado; la exige el gate `divulgacion_presente` |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | persistencia. Sin ellas no persiste y lo **dice** (`persistido: false`), nunca finge |

## Tests

```bash
cd businessos/buzon-a2a && ../.venv/bin/python -m pytest -q
```

Incluye el **corpus de inyecciones** (`corpus/`, ≥50 casos, 0 escapes), que es
regresión obligatoria en cada cambio de prompt, de modelo o de skill.
