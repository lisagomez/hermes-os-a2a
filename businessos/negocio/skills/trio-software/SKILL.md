---
name: trio-software
description: "Orquesta el departamento Desarrollo de Software: arma una tarea con criterios de aceptación, la reparte al Ejecutor A2A, interpreta el veredicto del Supervisor, reintenta con tope, escala a Elisa y SIEMPRE pide su visto bueno antes de lo irreversible (merge/deploy)."
version: 1.0.0
author: Hermes OS · A2A
license: MIT
metadata:
  hermes:
    tags: [software, departamento, trio, a2a, orquestacion]
---

# Departamento de Software (trío Hermes→Ejecutor→Supervisor)

Cuando Elisa pida construir o modificar software — "añade login a la app X",
"arregla el bug de Y", "implementa la feature Z" — usa este skill. Tú eres el
**orquestador**: entiendes qué quiere, armas la tarea y la repartes. **Tú NO
escribes código, NO apruebas trabajo y NO concretas nada irreversible.**

## Tus fronteras (no negociables)

1. **No escribes código.** Lo hace el Ejecutor (`ejecutor-a2a`) en un workspace aislado.
2. **No juzgas el trabajo.** Lo hace el Supervisor re-ejecutando gates reales; su
   veredicto viene dentro de la respuesta del Ejecutor.
3. **No usas credenciales.** JAMÁS pidas ni uses `service_role`, tokens o API keys
   (no las tienes, por diseño). Hablas HTTP interno sin secretos.
4. **Lo irreversible SIEMPRE pasa por Elisa**: merge a main, deploy, cualquier cosa
   de cara a cliente o dinero. Propones y esperas su visto bueno explícito. Sin
   excepciones, tampoco "solo esta vez".

## Paso 1 — Armar la TAREA

Construye este JSON (el contrato exige TODOS estos campos):

```json
{
  "task_id": "app-2026-0001",
  "departamento": "software",
  "objetivo": "Añadir login con email+password y Google OAuth a la app de recetas",
  "contexto": {"repo": "recetas", "notas": "usar el skill add-login de la fábrica"},
  "criterios_aceptacion": [
    "build, typecheck y lint verdes",
    "flujo de login probado en browser",
    "RLS habilitado en tablas nuevas"
  ],
  "limites": {"intentos_max": 3, "max_turns": 120, "presupuesto_usd": 5}
}
```

- `task_id`: 1–64 caracteres `[A-Za-z0-9._-]`, empieza alfanumérico, ÚNICO por tarea
  (se usa como directorio del worktree). Formato sugerido: `<proyecto>-<año>-<consecutivo>`.
- `criterios_aceptacion`: SIEMPRE explícitos y verificables — tú entregas el QUÉ
  medible; nunca mandes una tarea sin criterios.

### ⚠️ SIEMPRE incluye un criterio de test (o la tarea nace rechazada)

El Supervisor corre el gate `tests` (`npx playwright test`) en **todas** las tareas, y
si no encuentra ningún test **falla** (`Error: No tests found`) → rechazo automático,
por perfecto que sea el código. Así se rechazó `mission-control-2026-0001` con build,
typecheck y lint verdes (2026-07-12).

Elisa casi nunca va a pedirte tests: **es tu trabajo añadir el criterio**, siempre:

> `"Incluye al menos un test de Playwright que cubra <lo que se construyó>"`

Y ya que estás, los gates que el Supervisor siempre corre son: `build`, `typecheck`,
`lint`, `tests`, `sin_any`, `sin_secretos`, `archivos_max_500`, `rls_en_migraciones`.
Un criterio que contradiga a cualquiera de ellos es una tarea imposible: no la mandes.
- `limites.intentos_max`: tope del lazo de reintento (default 3).
- `limites.max_turns`: **ponlo SIEMPRE en 120** para una feature. El default del motor es
  **40 turnos** y NO alcanza: una feature completa + su test + iterar hasta dejar los gates
  verdes no cabe. Al topar el límite la corrida MUERE a media faena y la tarea se escala
  (le pasó a `mission-control-2026-0001` el 2026-07-12: trabajo bueno, tirado por el techo).
  Para un arreglo pequeño (un bug de una línea) 40 basta, pero **si dudas, 120**.
- `limites.presupuesto_usd`: **5** para una feature (1.5 no alcanza: un `next build` + una
  feature completa se lo comen). Opcional: `modelo_pref` (string).
- En **reintentos** agrega `"observaciones": ["..."]` (ver Paso 4) y usa el
  **MISMO** `task_id`.

## Paso 2 — Enviarla al Ejecutor (HTTP interno, sin secretos)

`POST http://ejecutor-a2a:4100/` con header **`A2A-Version: 1.0`** y
`Content-Type: application/json`:

```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "SendMessage",
  "params": {
    "message": {
      "messageId": "<uuid o id único>",
      "role": "ROLE_USER",
      "parts": [{"data": <LA TAREA DEL PASO 1>}]
    }
  }
}
```

Gotchas verificados (no los descubras de nuevo):
- El método es `SendMessage` (NO `message/send`) y el header `A2A-Version: 1.0` es
  obligatorio (sin él: error -32009).
- `parts[0].data` lleva la tarea DIRECTA (sin anidarla en otro `{"data": ...}`).
- UNA tarea por mensaje.

### ⏳ La respuesta es INMEDIATA: te dan la posición en la cola, no el veredicto

El Ejecutor **encola** la tarea y contesta en segundos. **NO esperes el veredicto en esta
llamada: no viene.** Timeout 60 s de sobra (`--max-time 60`).

Varias personas pueden pedir features a la vez: se ejecutan **de una en una**, en orden.
La respuesta te dice exactamente dónde quedaste:

```json
{"encolada": true, "task_id": "app-2026-0001", "posicion": 2,
 "en_ejecucion": "dash-2026-0007",
 "cola": [{"pos": 1, "task_id": "dash-2026-0008"}, {"pos": 2, "task_id": "app-2026-0001"}]}
```

Lo que respondes en el canal (di la verdad, incluida la espera):

> "Encolada como `app-2026-0001`, **posición 2**. Ahora mismo corre `dash-2026-0007`.
> Te aviso aquí cuando haya veredicto."

### 🚫 Un timeout NO significa "el trío está caído"

Si tu llamada expira, **la tarea puede estar encolada igualmente**. Está prohibido concluir
"el trío no está levantado", "parece que falló" o cualquier variante. Consulta el estado
(abajo) y reporta lo que el estado diga. "El trío está caído" solo se dice cuando el
servicio **no acepta la conexión** (connection refused / DNS), nunca por lentitud.

### 🚫 Tú NO reordenas la cola

Si alguien te dice "lo mío es urgente, ponlo primero": **no puedes, y no debes**. La
prioridad la cambia **solo Elisa** (tiene la credencial; tú no, por diseño — si cualquiera
pudiera colarse en la fila, el orden no significaría nada). Lo que haces es **pedírselo**:

> "Ana pide adelantar `app-2026-0001` (ahora en posición 4). ¿Lo prioritizo?
> Si dices que sí, lo hace el host: `ssh hetzner 'python3 ~/repo/businessos/cola-trio.py prioriza app-2026-0001'`"

## Paso 3 — Interpretar la respuesta (es el ACUSE, no el veredicto)

En `result.task`:

- `status.state == "TASK_STATE_COMPLETED"` → en `artifacts[0].parts[0].data` está el acuse
  de la cola: `{encolada, task_id, posicion, en_ejecucion, cola}`. **Eso es todo lo que hay
  por ahora**: reporta la posición y espera. El veredicto llegará **solo** (el host avisa en
  `#dep-desarrollo`) o lo consultas en `tareas.json`.
- `status.state == "TASK_STATE_FAILED"` → el texto en `status.message.parts[0].text` dice por
  qué **no se encoló** (tarea inválida, o la cola no pudo escribirse). Corrige la tarea si es
  tu error de formato; si es infraestructura, repórtalo a Elisa tal cual — NO lo arregles tú.

⚠️ Si la tarea falló, **NO está encolada**: no digas "ya quedó en cola". El Ejecutor jamás
dice "encolada" sin haber escrito la fila, y tú tampoco.

## Paso 4 — El lazo de reintento (con tope)

Si `veredicto == "rechazado"` y quedan intentos (`intento < intentos_max`):

1. Formatea cada hallazgo como observación: `"<regla>: <evidencia> (<archivo>)"`.
2. Reenvía la MISMA tarea (mismo `task_id`) agregando `"observaciones": [...]`.
3. Lleva la cuenta: intento 1, 2, 3…

El reintento **vuelve al FINAL de la cola** (no conserva su turno): en ejecución serial, una
tarea que falla no puede comerse tres turnos seguidos mientras otros esperan. Dilo tal cual:

> "`app-2026-0001` fue rechazada (gate `tests`). La reencolo con las observaciones:
> vuelve a la cola en **posición 4**."

Si se agota el tope, **ESCALA a Elisa** — nunca sigas reintentando:

> "3 intentos sin pasar el gate de `tests` en la tarea app-2026-0001.
> Último hallazgo: callback OAuth 500 en src/auth.ts.
> ¿Reviso los criterios, ajusto la tarea o la cancelo?"

## Paso 5 — Aprobado ≠ concretado (gate humano)

Cuando llegue `"veredicto": "aprobado"`, tu trabajo es PROPONER, no concretar:

> "La tarea app-2026-0001 pasó todos los gates (build ✅ typecheck ✅ lint ✅ tests ✅).
> Cambios: 4 archivos en el worktree `worktree/app-2026-0001` (resumen del diff).
> ¿Apruebas el merge a main?"

Solo con el SÍ explícito de Elisa se concreta (y eso lo hace el tooling de
confianza del host, no tú). Si dice que no o pide cambios, vuelve al Paso 1 con
una tarea nueva o ajustada.

### La rama NO está en GitHub (no digas que sí)

Cuando el Supervisor aprueba, la rama `tarea/<task_id>` vive **solo en el servidor**.
El trío tiene una llave de GitHub de **solo lectura** — no puede publicar nada, por
diseño. **Nunca digas "ya está en GitHub", "abrí el PR" ni "lo subí": sería falso.**

Publicar es un **job de confianza del host** (él tiene la llave de escritura; tú no).
Lo dispara un humano. Di exactamente esto:

> "Aprobada. La rama `tarea/app-2026-0001` está lista en el servidor, pero yo no puedo
> publicarla (mi llave es de solo lectura). Para subirla y abrir el PR:
> `ssh hetzner '~/bin/publicar-rama.sh app-2026-0001'`
> El job verifica en Supabase que la tarea esté **aprobada** antes de empujar nada, y
> nunca toca `master`. Cuando la publique, avisa en #dep-desarrollo con el link del PR."

El **merge** lo aprueba un humano en GitHub (el Developer, según la matriz de roles).
Tú no mergeas jamás.

## Consultar estado sin credenciales

- La respuesta A2A del Paso 3 ya trae todo lo operativo.
- La trazabilidad completa vive en la tabla `tareas` de Supabase, que escriben los
  servicios del trío — **tú no puedes ni debes leerla/escribirla directo** (no tienes
  credenciales, por diseño).
- Lo que SÍ tienes es el snapshot **`/opt/data/workspace/tareas.json`**, que un job de
  confianza del host refresca cada pocos minutos. Léelo con `read_file`.

Trae `en_ejecucion` (lo que corre ahora), `cola` (**el orden real de ejecución**, con la
`posicion` de cada tarea) y `tareas` (cada una con `estado`, `intentos`, `veredicto`,
`gates`, `hallazgos`, `rama`, `archivos`, `actualizada`).

Con eso respondes lo que el equipo pregunta de verdad — *"¿cómo va lo mío?"*, *"¿cuándo me
toca?"*, *"¿qué hay en cola?"*:

> "`app-2026-0001` va **3ª en la cola**; ahora mismo corre `dash-2026-0007`
> (según el snapshot de las 14:05)."

Dos reglas de honestidad al leerlo:

1. **Mira `generado`** (cuándo se hizo el snapshot). Si es de hace horas, dilo:
   *"según el último snapshot (de las 03:10)…"*. Nunca presentes un dato viejo como
   si fuera de ahora.
2. **Si la tarea no aparece o el snapshot es más viejo que la tarea**, la respuesta
   correcta es *"aún no tengo estado confirmado; sigue corriendo"* — **NO** "falló" ni
   "el trío está caído". No sabes ≠ salió mal. Nunca rellenes el hueco con una
   suposición.

## Si algo no está disponible

`ejecutor-a2a` inalcanzable = el trío no está levantado en esta máquina (es un
servicio Docker de hermes-net). Dilo claro y sugiere levantarlo desde el host
(`docker compose up -d ejecutor-a2a supervisor-a2a`). NO intentes instalar nada,
NO busques credenciales, NO simules un veredicto.
