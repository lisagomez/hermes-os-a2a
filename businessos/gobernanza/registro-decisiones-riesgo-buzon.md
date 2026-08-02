# Registro de decisiones de riesgo — buzón agéntico

> Documento 2 de 3 exigidos por SPEC-buzon-a2a §7.3.
> ISO/IEC 42001 A.5 (evaluación de impacto) y A.9 (uso responsable).
> Estado: **vivo** — se añade una entrada por cada decisión, nunca se edita una pasada.

## Para qué existe

Un buzón en modo `abierto` acepta procesamiento por agente de correo de
cualquier remitente. Esa es una decisión de riesgo con dueño, no una casilla de
configuración. Aquí queda **quién** la tomó, **cuándo** y con **qué
justificación** — y la base de datos lo exige: `buzones` rechaza una fila en
modo `abierto` sin `riesgo_firmado_por` y `riesgo_firmado_en`.

También se registran aquí las decisiones de riesgo que no son de modo:
ampliaciones de `clases_permitidas`, subidas de cuota, y toda excepción de
destinatarios aprobada explícitamente.

## Formato de entrada (append-only)

```
### <fecha ISO> — <buzón o ámbito> — <tipo de decisión>
- Decisión:
- Riesgo aceptado:
- Mitigaciones vigentes:
- Firmado por (nombre y rol):
- Vigencia / próxima revisión:
```

## Entradas

### 2026-08-02 — ámbito global — activación del servicio
- **Decisión**: construir e integrar `buzon-a2a` con aprobación humana
  obligatoria en el camino crítico (A5 no opcional).
- **Riesgo aceptado**: ninguno en producción todavía. El servicio se entrega
  construido y verificado en dev; **no hay buzón activo**, no hay migración
  aplicada a producción y no hay credenciales de correo configuradas.
- **Mitigaciones vigentes**: `buzones.activo` default `false`; los 11 gates
  corren antes de la bandeja; el canario sin configurar deja el gate en rojo
  (fail-closed); el servicio no se publica por el `edge`.
- **Firmado por**: — (pendiente: la activación del primer buzón requiere firma)
- **Vigencia**: hasta la primera activación, que exige su propia entrada.

<!-- Añadir aquí las decisiones siguientes. NO editar las anteriores. -->

## Decisiones que SIEMPRE requieren entrada firmada

1. Activar un buzón (`activo = true`), cualquiera sea su modo.
2. Poner un buzón en modo `abierto`.
3. Añadir una clase a `clases_permitidas`.
4. Subir `cuota_hora` o `cuota_hilo` por encima de los defaults (10/5).
5. Aprobar explícitamente destinatarios fuera del hilo
   (`destinatarios_aprobados_explicitamente`), caso por caso.
6. Activar el envío real (`ENVIAR_REAL=1`) o registrar los host-jobs en cron.
