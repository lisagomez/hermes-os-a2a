---
name: ingesta-reunion
description: |
  Analiza una transcripcion de reunion de negocio (hermes-os-a2a / a2a) y sube sus
  accion items a la tabla `tareas_reunion` (Fase 10) para que el cron de alertas avise
  cuando vencen. Activar cuando alguien del equipo (Johann, Luis, Elisa, Victor) diga:
  "ingesta esta reunion", "ingesta la llamada", "procesa esta transcripcion", "sube las
  tareas de la reunion", o pegue/senale un transcript de reunion de negocio pidiendo
  extraer tareas.
  NO USAR para reuniones que no son de negocio (clases, cursos: ver `_LEEME.md` de la
  carpeta de transcripts) ni para reuniones de OTRO negocio del portafolio de Johann
  (Zelandia, VelOS Ambiental): esta skill solo aplica dentro de este repo (a2a).
allowed-tools: Read, Bash(python3 *), Bash(python *)
metadata:
  author: hermes-os-a2a
  version: "1.0"
---

# Ingesta de reunion (a2a) -> `tareas_reunion`

Convierte una transcripcion de reunion de negocio en (a) un acta ejecutiva legible y
(b) filas en la tabla `tareas_reunion` de Supabase, para que el cron diario avise por
Telegram/Slack lo que vence.

## Cuando NO usar esto

- El transcript no vive dentro de una subcarpeta de negocio de
  `C:\OPS\_VelOS\proyectos\Transcript reuniones colaborativas\` (si es una clase o algo
  suelto, no es este flujo).
- La reunion es de OTRO negocio del portafolio de Johann (Zelandia/VelOS Ambiental):
  este skill vive en el repo `hermes-os-a2a` y solo aplica a reuniones de **a2a**. Otro
  negocio usaria el mismo prompt generico pero desde SU propio repo/skill.

## Pasos (los 4, en el mismo turno; no basta con solo correr el script)

1. **Ubicar el transcript** dentro de
   `C:\OPS\_VelOS\proyectos\Transcript reuniones colaborativas\a2a\` (si el usuario no
   dio la ruta exacta, listar esa carpeta y preguntar cual).

2. **Leer las DOS fuentes de contexto** (viven FUERA de este repo a proposito: nunca
   las copies dentro de `hermes-os-a2a`, son compartidas entre negocios/repos):
   - `C:\OPS\_VelOS\proyectos\Transcript reuniones colaborativas\SYSTEM-PROMPT-ingesta-reunion-negocio.md`
     (el prompt generico, con los placeholders `{NEGOCIO}`, `{PARTICIPANTES}`, etc.)
   - `C:\OPS\_VelOS\proyectos\Transcript reuniones colaborativas\a2a\_contexto-negocio.md`
     (los valores de esos placeholders para a2a: participantes, hoja de ruta, reglas de
     canal).

3. **Leer la transcripcion COMPLETA** y aplicar el prompt generico con el contexto de
   a2a insertado (participantes, hoja de ruta, `{CANAL_REGLAS}`). Produce el acta en las
   6 secciones que pide el prompt, terminando SIEMPRE en el bloque maquina:

   ```
   <<<TAREAS_JSON
   {"negocio":"a2a","reunion_id":"a2a-reunion-<AAAA-MM-DD>","generado":"<AAAA-MM-DD>",
    "tareas":[{"id":"T1","tarea":"...","responsable":"...",
               "fecha_limite":"AAAA-MM-DD|sin fecha","canal":"...","fuente":"Nombre [mm:ss]"}]}
   TAREAS_JSON>>>
   ```

   Presenta el acta completa al usuario en el chat (secciones 1-6). El bloque
   `TAREAS_JSON` NUNCA se manda a Slack/Telegram tal cual (es solo para la maquina); en
   el chat puede mostrarse para que el usuario lo revise antes de subir.

4. **Subir las tareas** con el mecanismo de ingesta (`businessos/ingest-reuniones.py`).
   Guarda el bloque `TAREAS_JSON` (solo el JSON, sin los marcadores `<<<`/`>>>` es
   opcional, el script acepta ambos) en un archivo temporal y corre:

   ```bash
   source businessos/.env    # SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (nunca los imprimas)
   python3 businessos/ingest-reuniones.py <archivo-con-el-bloque>.md
   ```

   Revisa la salida: cuantas tareas subieron, cuantas se rechazaron y por que (fecha no
   parseable, falta id/tarea). Si algo se rechazo, dilo explicito al usuario: no lo
   escondas ni lo reintentes adivinando el dato faltante.

   Es **idempotente**: reingerir la misma reunion (mismo `reunion_id`) actualiza las
   filas en vez de duplicarlas (clave natural `reunion_id` + `id` de tarea).

## De donde salen las alertas despues

No hace falta nada mas de tu parte: un cron diario en el servidor
(`businessos/snapshot-tareas-reunion.py` + `businessos/alerta-tareas-reunion.sh`, ver
`businessos/COMO-RETOMAR.md`) revisa `tareas_reunion` cada mañana y avisa por Telegram
(y Slack si el canal ya tiene Channel ID confirmado) lo que vence hoy/mañana o ya
vencio. Tareas con `fecha_limite = "sin fecha"` NUNCA generan alerta (quedan solo en el
acta): es el diseño a proposito del prompt genérico.

## Gotchas

- El script de ingesta corre en la maquina del desarrollador (esta sesion de Claude
  Code), NO dentro del agente Hermes desplegado en el servidor: por eso puede leer
  `businessos/.env` en runtime (regla `seguridad-secretos`: nunca lo imprimas ni lo
  vuelques al chat).
- Si `businessos/.env` no existe o no tiene `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`,
  el script falla con un mensaje claro (no inventa ni se salta la subida).
- El acta completa (secciones 1-6) es para el chat/registro de la sesion; el
  `_contexto-negocio.md` de a2a documenta el historial de reuniones ya ingeridas:
  actualizalo con una linea nueva tras cada ingesta exitosa.
