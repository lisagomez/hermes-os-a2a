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
  "limites": {"intentos_max": 3}
}
```

- `task_id`: 1–64 caracteres `[A-Za-z0-9._-]`, empieza alfanumérico, ÚNICO por tarea
  (se usa como directorio del worktree). Formato sugerido: `<proyecto>-<año>-<consecutivo>`.
- `criterios_aceptacion`: SIEMPRE explícitos y verificables — tú entregas el QUÉ
  medible; nunca mandes una tarea sin criterios.
- `limites.intentos_max`: tope del lazo de reintento (default 3). Opcionales:
  `modelo_pref` (string) y `presupuesto_usd` (número).
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

### ⏳ El timeout: mínimo 900 s (NO negociable)

Una corrida dura **minutos**: el motor escribe código y el Supervisor re-ejecuta
build + typecheck + lint + tests sobre el resultado. **Usa timeout ≥ 900 s (15 min)
en la llamada HTTP.** Con `curl`: `--max-time 1800`. Con Python: `timeout=1800`.

Si dejas el timeout por default (30 s) **matas la corrida**: así se perdió la primera
tarea real (`mission-control-2026-0001`, 2026-07-12) — el código estaba bien escrito y
el sistema lo tiró a la basura.

### 🚫 Un timeout NO significa "el trío está caído"

Si tu llamada expira, **la tarea SIGUE VIVA en el servidor** (el Ejecutor está blindado:
tu desconexión ya no la mata). Está prohibido concluir "el trío no está levantado",
"parece que falló" o cualquier variante. Lo que haces es **consultar el estado** (ver
"Consultar estado sin credenciales") y reportar lo que el estado diga:

> "La tarea `app-2026-0001` lleva más de 15 minutos; sigue corriendo en el servidor.
> Te aviso en cuanto haya veredicto."

"El trío está caído" solo se dice cuando el servicio **no acepta la conexión**
(connection refused / DNS), nunca por lentitud.

## Paso 3 — Interpretar la respuesta

En `result.task`:

- `status.state == "TASK_STATE_COMPLETED"` → hay veredicto en
  `artifacts[0].parts[0].data`, con dos llaves:
  - `resultado`: lo que hizo el Ejecutor (`worktree`, `diff`, `archivos`, `notas`).
  - `veredicto`: el juicio del Supervisor — `veredicto` (`aprobado`/`rechazado`),
    `gates` (regla, estado, evidencia) y `hallazgos` (regla, evidencia, archivo).
- `status.state == "TASK_STATE_FAILED"` → el texto en `status.message.parts[0].text`
  dice por qué (tarea inválida, workspace roto, motor caído, supervisor caído).
  Corrige la tarea si es tu error de formato; si es infraestructura, repórtalo a Elisa
  tal cual — NO lo intentes arreglar tú.

## Paso 4 — El lazo de reintento (con tope)

Si `veredicto == "rechazado"` y quedan intentos (`intento < intentos_max`):

1. Formatea cada hallazgo como observación: `"<regla>: <evidencia> (<archivo>)"`.
2. Reenvía la MISMA tarea (mismo `task_id`) agregando `"observaciones": [...]`.
3. Lleva la cuenta: intento 1, 2, 3…

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

Cada tarea trae: `estado`, `en_curso`, `intentos`, `veredicto`, `gates`, `hallazgos`,
`rama`, `archivos` y `actualizada`. Úsalo para responder "¿cómo va X?" y **siempre que
tu llamada HTTP expire**.

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
