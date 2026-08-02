# Procedimiento de incidente de inyección — buzón agéntico

> Documento 3 de 3 exigidos por SPEC-buzon-a2a §7.3.
> Dispara cuando el gate `canario_ausente` se activa, o ante cualquier señal de
> que un correo entrante intentó dirigir al agente.
> ISO/IEC 27001 A.5.24-A.5.28 (gestión de incidentes), A.8.12 (fuga de datos).

## Qué cuenta como incidente

1. **Canario en un saliente** (`canario_ausente` en rojo) — el token de sistema
   apareció en un borrador. Es la señal más fuerte: significa que el contenido
   del prompt llegó al texto de salida.
2. **Rechazar y reportar** — un aprobador (A5) marcó un borrador como intento de
   inyección desde la bandeja.
3. **Gate CRÍTICO en rojo con patrón sospechoso** — destinatario fuera del hilo,
   Bcc, adjunto por ruta, PII cruzada o secreto en el cuerpo.
4. **Sospecha sin gate** — cualquier persona del equipo detecta un correo
   entrante con instrucciones dirigidas al agente, aunque ningún gate saltara.

El caso 4 importa tanto como los otros tres: un vector que ningún gate cazó es
precisamente el que hay que cerrar.

## Contención (primeros minutos)

1. **Pausar** — `buzon_control.pausa_global = true` (UI de admin). Con la pausa,
   el gate `cuota_por_buzon` sale en rojo y nada sale, esté aprobado o no. Ante
   la duda se pausa: reanudar es barato, un envío no se deshace.
2. **No responder al hilo.** Ni siquiera manualmente, hasta clasificar.
3. **Congelar la evidencia** — anotar el `id` del entrante y su `hash_original`
   (sha256 del cuerpo crudo, inmutable) y el `id` del saliente afectado.

## Clasificación

| Pregunta | Si la respuesta es sí |
|---|---|
| ¿Salió algún correo? | Es fuga potencial: ir a "Exposición" |
| ¿El borrador contenía datos de otro hilo o PII? | Es fuga potencial aunque no saliera |
| ¿El gate lo detuvo antes de la bandeja? | Es un **intento contenido**: documentar y cerrar |
| ¿Ningún gate lo detectó? | Es un **vector abierto**: escalar, no cerrar |

Consultar `buzon_bitacora` (append-only, hash encadenado) para reconstruir la
secuencia completa: quién hizo qué, con qué política y con qué resultado de
gates. Y `correos_salientes.historial` para las transiciones del borrador.

## Exposición de datos personales

Si hubo envío con datos personales de un tercero:

1. Determinar **qué** datos, de **quién** y a **quién** llegaron (bitácora +
   `correos_salientes.destinatarios`).
2. Notificar al titular de los datos. En México aplica la LFPDPPP; el plazo y la
   forma los fija el responsable del SGSI, no este documento.
3. Registrar la notificación en el registro de decisiones de riesgo.

No se omite la notificación porque "fue poco" o "fue a alguien conocido": esa
valoración le toca al responsable, con el hecho documentado delante.

## Cierre — el paso que no se salta

**Todo incidente termina con un caso nuevo en el corpus de inyecciones**
(`buzon-a2a/corpus/casos.json`). Se toma el correo real, se anonimiza lo que
haga falta, y se declara qué debe eliminar el saneador o qué gate debe ponerse
rojo. Si el vector no lo cazaba ningún gate, el cierre incluye **el gate nuevo**
o la mejora del saneador — con su prueba y su caso negativo.

Un incidente cerrado sin caso de regresión no está cerrado: está olvidado, y
volverá en el próximo cambio de modelo.

## Reanudar

Levantar `pausa_global` solo cuando: la causa está identificada, el caso está en
el corpus, la suite de regresión pasa con 0 escapes, y el responsable del SGSI
lo autoriza. La reanudación se anota en el registro de decisiones de riesgo.
