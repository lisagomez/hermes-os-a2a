# Procedimiento de incidente

> Control **C6** de `../GOBERNANZA.md`. Aplica a fugas, roturas en producción, cobros
> indebidos, correo indebido y a cualquier señal de que una entrada intentó **dirigir** al
> agente.
>
> ⚠️ **Para el vector de inyección por correo, la fuente es
> `businessos/gobernanza/procedimiento-incidente-inyeccion.md`**, con sus cuatro
> disparadores y el gate `canario_ausente`. Ese documento manda en su dominio. Este cubre
> el resto del sistema — y el incidente se registra **igual** en `../INCIDENTES.md`, para
> que el repositorio tenga una sola línea de tiempo.

---

## 1. Qué cuenta como incidente

1. **Fuga o exposición**: dato de un cliente alcanzable por otro; secreto en un log, en el
   cliente, en el transcript o en un repo.
2. **Acción irreversible no autorizada**: se escribió, borró, envió o cobró sin el gate
   humano que correspondía.
3. **Inyección detectada**: una entrada logró que un agente hiciera algo fuera de su
   catálogo de acciones — aunque no haya causado daño.
4. **Sospecha sin gate**: alguien del equipo detecta algo raro y **ningún control saltó**.

> El caso 4 importa tanto como los otros tres: un vector que ningún gate cazó es
> precisamente el que hay que cerrar.

**No es incidente** un fallo de herramienta o de configuración (una tool que falla, un
contenedor en crash-loop): eso se arregla y, si enseñó algo, va a Aprendizajes. Un fallo de
tooling **jamás se le escala a la dueña como si fuera su bug**.

## 2. Contención (primeros minutos)

1. **Pausar.** Deshabilita el flujo, revoca la llave, baja el job, activa `pausa_global`
   del buzón si aplica. Ante la duda se pausa: reanudar es barato; un dato filtrado, un
   correo enviado o un cobro no se deshacen.
2. **No "arreglar" en caliente.** El primer parche destruye evidencia.
3. **Congelar evidencia**: logs (`agent.log`, `gateway.log`, `docker compose logs`), IDs de
   las filas afectadas, hash o copia del input original, hora exacta, imagen/commit
   desplegado. Ojo: `docker logs` no trae el detalle de las plataformas.

## 3. Clasificación

| Pregunta | Si la respuesta es sí |
|---|---|
| ¿Salió dato fuera de su dueño? | Es fuga: ir a §4 |
| ¿Se ejecutó algo irreversible? | Alcance y reversión primero, causa después |
| ¿Un gate lo detuvo antes de consecuencias? | **Intento contenido**: documentar y cerrar (§5) |
| ¿Ningún gate lo detectó? | **Vector abierto**: escalar, no cerrar |

## 4. Exposición de datos personales

1. Determinar **qué** datos, de **quién**, y a **quién** llegaron.
2. Notificar al titular. En México aplica la **LFPDPPP**; el plazo y la forma los fija la
   persona responsable, no este documento.
3. Registrar la notificación en `../REGISTRO-RIESGO.md`.

> No se omite la notificación porque "fue poco" o "fue a alguien conocido". Esa valoración
> le toca a la responsable, con el hecho documentado delante.

## 5. Cierre — el paso que no se salta

Todo incidente se anota en **`../INCIDENTES.md`** (append-only) y termina con **tres
cosas**, no con una:

1. **Un caso nuevo en la regresión** (C2), con su entrada y su salida esperada — en la
   rama `golden-sets`, nunca en el árbol de trabajo. Si el vector no lo cazaba ningún
   gate, el cierre incluye **el gate nuevo**, con su prueba y su **caso negativo**.
2. **Una entrada en Aprendizajes** de `CLAUDE.md` o del PRP relevante: error, fix, dónde
   más aplica.
3. **Una entrada en `../REGISTRO-RIESGO.md`** si al reanudar queda algún riesgo aceptado.

> Un incidente cerrado sin caso de regresión no está cerrado: está olvidado, y volverá en
> el próximo cambio de modelo.

## 6. Reanudar

Solo cuando: la causa está identificada, el caso está en la suite, la suite pasa en verde,
y la persona responsable lo autoriza. La reanudación se anota.

**Y si el arreglo tocó una imagen, un volumen o un seed**: no está desplegado hasta que el
runtime lo refleje. Verificar, no suponer.
