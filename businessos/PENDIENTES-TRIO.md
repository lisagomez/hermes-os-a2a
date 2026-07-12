# Pendientes del trío — hallazgos de la 1ª corrida real desde Slack (2026-07-12)

> Primera vez que el equipo le encarga software al trío desde `#dep-desarrollo`.
> Tarea: `mission-control-2026-0001` (página `/desarrollo` en Mission Control).
> **Resultado: `escalada` sin veredicto.** El motor (GLM-5.2) escribió el código
> correctamente; el sistema lo mató. Los 5 hallazgos son de DISEÑO NUESTRO, no del
> modelo ni del código generado.

## Qué pasó, con evidencia

```
1. El log del Ejecutor NO tiene la línea del POST        → la petición nunca terminó
   (solo el GET del agent-card y los health checks)
2. La transcripción del CLI acaba en "last-prompt"       → el proceso murió a media faena
   (sin entrada "result": nunca cerró)
3. token_usage: CERO filas para esta task_id             → reventó antes de registrar el gasto
4. tareas: estado=escalada, resultado=null               → abortó sin entregar nada
5. El worktree tiene los archivos correctos, a medias    → GLM sí estaba haciendo el trabajo
```

**Causa raíz: el bot llamó al Ejecutor con un timeout de 30 s.** La ejecución dura
minutos (motor + gates). Al cerrarse la conexión, el servidor canceló la petición y
con ella el proceso del motor. Y el bot **reportó lo contrario de lo que pasó**:
*"probablemente el trío no está levantado"* — cuando él mismo lo había abortado.

## Los 5 arreglos (en orden de importancia)

1. **Un cliente que se desconecta JAMÁS debe matar el trabajo del servidor.**
   `asyncio.shield` alrededor de `self._engine.run(...)` en `ejecutor-a2a/executor.py`.
   Es el bug estructural: hoy cualquier cliente impaciente destruye una corrida de minutos.
2. **El skill `trio-software` debe exigir timeout ≥ 900 s** en la llamada HTTP, y
   **PROHIBIR** explícitamente concluir "el trío está caído" por un timeout (la tarea
   sigue viva: hay que consultar el estado, no adivinar).
3. **El error del motor no queda en NINGÚN log.** El Ejecutor solo lo manda por A2A; si
   el cliente ya se fue, se pierde. Loguear a stdout en `_fallar()` (sin esto, cada fallo
   es una autopsia a ciegas — esta nos costó media hora).
4. **`token_usage` no se escribe si la corrida falla.** `claude_engine.py` promete en un
   comentario que "el gasto se registra SIEMPRE (también en error)" y **no lo hace**: el
   `raise EngineError` del `except` ocurre ANTES del `registrar()`. Tokens quemados que
   no aparecen en el presupuesto.
5. **El bot no puede consultar el estado de una tarea** (no tiene credenciales, por diseño).
   Falta un snapshot `tareas.json` en el volumen — el patrón que ya usan `presupuesto.json`
   y `cli-audit.json` (host-job escribe, agente lee).

## Para retomar

- El código de GLM sigue en el worktree `/workspace/worktree/mission-control-2026-0001`
  (rama `tarea/mission-control-2026-0001`), a medias pero bien encaminado: creó
  `src/app/(main)/desarrollo/`, sus componentes, y tocó `services/{index,real,mock}.ts`,
  `types/index.ts` y el `layout.tsx` de navegación — exactamente lo que pedían los criterios.
- Tras los arreglos: relanzar la tarea (mismo `task_id`) con presupuesto realista
  (**$5**, no $1.50 — `next build` + una feature completa no caben en $1.50) y dejar que
  llegue a los gates.
