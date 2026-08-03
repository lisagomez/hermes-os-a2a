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

### 2026-08-02 — atencion@digifixapp.com — alta, modo de contraparte y clase permitida
- **Decisión**: dar de alta el primer buzón (`atencion@digifixapp.com`, Google Workspace),
  ponerlo en modo `abierto_cuarentena` y habilitarle una única clase: `acuse_recibo`.
- **Riesgo aceptado**: el buzón recibe correo de remitentes desconocidos (es el buzón de
  atención al cliente, esa es su función), y el agente puede redactar un acuse de recibo
  sobre ese correo. El vector real es la inyección de prompt desde un correo entrante.
- **Mitigaciones vigentes**:
  - A5 obligatorio: ningún acuse sale sin firma humana; el motor no puede fabricar la fila
    de aprobación porque no tiene credenciales.
  - Los 11 gates corren sobre cada borrador; un CRÍTICO en rojo no llega a la bandeja.
  - Cuarentena para desconocidos: sin adjuntos salientes, sin datos fuera del catálogo
    público, máximo 2 intercambios antes de escalar a una persona nombrada.
  - `acuse_recibo` es una plantilla determinista que no incorpora texto del correo entrante:
    no puede repetir ni obedecer lo que venga dentro.
  - El buzón sigue en `estado='borrador'` y `activo=false`: hoy no envía nada. El modo
    espejo exigirá 7 días y 20 borradores antes de que la activación sea siquiera posible.
  - Autenticación del dominio en su sitio: SPF, DKIM (2048 bits) y DMARC publicados.
- **Firmado por**: Elisa (dueña) — autorización dada en sesión del 2026-08-02.
- **Vigencia / próxima revisión**: al término del modo espejo, antes de activar el envío
  real. Ampliar `clases_permitidas` más allá de `acuse_recibo` exige una entrada nueva.

### 2026-08-02 — atencion@digifixapp.com — modo espejo y host-jobs en cron
- **Decisión**: poner el buzón en `estado='espejo'` con `activo=true`, y registrar
  `buzon-jobs.sh` en cron cada 15 minutos (ingesta + redacción de borradores).
- **Riesgo aceptado**: el sistema lee correo real de forma desatendida y genera
  borradores sin intervención humana previa. Es la exposición que el modo espejo
  existe para acotar: se observa antes de decidir.
- **Mitigaciones vigentes**:
  - **No sale ningún correo.** El envío exige `estado='activo'`, que a su vez exige
    firma (`buzones_activo_firmado`) y haber cumplido el mínimo de espejo. El job de
    cron no invoca `enviar-salientes.py` en ningún caso.
  - Mínimo de espejo verificado en código (`onboarding.py::puede_listo`): ≥7 días
    naturales **y** ≥20 borradores. No hay flag ni atajo.
  - Los 11 gates corren sobre cada borrador; un CRÍTICO en rojo lo deja fuera de la
    bandeja de A5.
  - No se responde a remitentes automáticos (`buzon_comun.py`), lo que evita bucles
    de auto-respuesta entre sistemas (RFC 3834).
  - Credenciales de Gmail solo en el `.env` del host, con alcance verificado por
    control positivo: el token no puede leer otro buzón del dominio.
  - Interruptor del Guardian disponible: `buzon_control.pausa_global`.
- **Firmado por**: Elisa (dueña) — autorización dada en sesión del 2026-08-02.
- **Vigencia / próxima revisión**: al cumplirse el mínimo de espejo, antes de
  cualquier activación de envío real.

<!-- Añadir aquí las decisiones siguientes. NO editar las anteriores. -->

## Decisiones que SIEMPRE requieren entrada firmada

1. Activar un buzón (`activo = true`), cualquiera sea su modo.
2. Poner un buzón en modo `abierto`.
3. Añadir una clase a `clases_permitidas`.
4. Subir `cuota_hora` o `cuota_hilo` por encima de los defaults (10/5).
5. Aprobar explícitamente destinatarios fuera del hilo
   (`destinatarios_aprobados_explicitamente`), caso por caso.
6. Activar el envío real (`ENVIAR_REAL=1`) o registrar los host-jobs en cron.
