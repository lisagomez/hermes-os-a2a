# Gotchas verificados en produccion

> Cada uno costo horas o dias reales de depuracion. Todos fueron cazados con dato real en
> produccion, no en teoria. **Leelos antes de escribir el cableado, no despues de que falle.**

---

## 1. Un `200 OK` puede significar "te rechace"

**Sintoma:** el codigo reporta exito, los registros nunca aparecen del otro lado.

**Caso real:** el endpoint de la hoja de calculo devolvia `HTTP 200` con cuerpo
`{"ok":false,"error":"no_autorizado"}`. Como `res.ok` era `true`, el codigo lo dio por bueno
durante dias. Nadie se entero hasta que un humano miro la hoja y la vio vacia.

**Por que pasa:** muchos endpoints (Apps Script, webhooks de terceros, integraciones no-code)
responden `200` siempre y ponen el resultado real en el cuerpo. El codigo HTTP describe *"tu
peticion llego"*, no *"hice lo que pediste"*.

**Regla:** verifica **el cuerpo** de la respuesta.

```ts
const texto = await res.text();
return res.ok && texto.includes('"ok":true');   // NO basta con res.ok
```

Aplica a cualquier destino que no controles. Generalizacion: *un codigo HTTP de exito nunca es
prueba de efecto*. Si el efecto importa, verificalo.

---

## 2. Apps Script solo lee parametros de la URL, nunca del cuerpo JSON

**Sintoma:** el endpoint rechaza el token que sabes que es correcto.

`e.parameter` en Apps Script **solo se puebla desde query params o `form-urlencoded`**. Si
mandas el token dentro de un body JSON, `e.parameter.token` queda `undefined` y el script
responde "no autorizado" — con `200`, ver gotcha #1, que es como los dos se combinan para
crear un fallo perfectamente silencioso.

```ts
// MAL — el token nunca llega
body: JSON.stringify({ token, filas })

// BIEN — pegado a la URL
const url = `${hook}?token=${encodeURIComponent(token)}`;
```

---

## 3. Apps Script no tiene bloqueo nativo: dos escrituras simultaneas se pisan

**Sintoma:** con dos registros en el mismo segundo, uno desaparece.

Cada ejecucion lee `getLastRow()`, obtiene el mismo numero, y ambas escriben en la misma fila.
El segundo sobrescribe al primero. En un evento presencial (varias personas registrandose a la
vez) esto no es un caso borde: es el caso normal.

**Solucion:** `LockService.getScriptLock()` + `waitLock(20000)`, y `SpreadsheetApp.flush()`
**antes** de soltar el candado. Ver `apps-script-espejo.js`.

**Como se prueba de verdad** (la teoria no sirve de arbitro):

```bash
for i in 1 2 3 4 5; do curl -sS -X POST "$URL/api/<captura>" \
  -H 'content-type: application/json' \
  -d "{\"name\":\"PRUEBA $i\",\"email\":\"prueba$i@ejemplo.test\",\"consent\":true}" & done; wait
```
Cuenta despues: deben ser 5 y 5. Ni 4 (perdida) ni 6 (duplicado).

---

## 4. La deduplicacion falla porque las fechas vuelven como objetos, no como texto

**Sintoma:** la deduplicacion nunca encuentra coincidencias y todo se duplica cada noche.

Una hoja de calculo **autoparsea** las fechas: escribes `"2026-08-08"` y `getValues()` te
devuelve un objeto `Date`. Si construyes la clave con `String(valor)`, obtienes
`"Fri Aug 08 2026 00:00:00 GMT-0500..."` y jamas coincide con el string original.

```js
function norm_(x, tz) {
  if (x instanceof Date) return Utilities.formatDate(x, tz, 'yyyy-MM-dd');
  return String(x == null ? '' : x).trim().toLowerCase();
}
```

**Corolario — la hora NO puede entrar en la clave de deduplicacion.** El camino instantaneo
usa el reloj del servidor y el periodico la marca de tiempo de la base; por milisegundos caen
en minutos distintos. Con la hora en la clave, la reconciliacion duplica el dia entero.
Clave correcta: `fecha|canal|nombre|contacto`.

---

## 5. `echo >>` sin salto de linea final corrompe la variable anterior

**Sintoma:** una variable de entorno queda con dos valores pegados en una sola linea.

Si el archivo `.env` no termina en salto de linea, `echo "VAR=x" >> .env` pega el texto nuevo
al final de la ultima linea existente. El resultado es una URL con un token incrustado, y el
error que produce no se parece en nada a la causa.

**Regla:** despues de agregar variables a un archivo de entorno, **leelo** y confirma que cada
una esta en su propia linea. Mejor: escribelas con una herramienta de edicion, no anexando.

---

## 6. Dos variables parecidas apuntando a destinos distintos

**Sintoma:** los avisos llegan, pero al chat equivocado — o no llegan y todo "parece bien".

Caso real: un proyecto tenia `<X>_BOT_TOKEN`/`<X>_CHAT_ID` (chat personal) y se agregaron
`<Y>_BOT_TOKEN`/`<Y>_CHAT_ID` (grupo de trabajo). Un canal usaba las primeras y otro las
segundas. Confundirlas manda informacion comercial al chat equivocado.

**Regla:** en el runbook, documenta **a que destino apunta cada variable**, no solo su nombre.
Y al reutilizar un canal de avisos existente, verifica el destino real antes de asumir.

---

## 7. "No me llego" casi siempre es "estas mirando otro lugar"

**Sintoma:** verificaste por API que el dato se escribio; el humano insiste en que no aparece.

Caso real: se busco un bug durante una sesion entera. No habia bug: el operador miraba un
archivo cuyo nombre habia sido sugerido como ejemplo y que nunca existio con ese nombre. El
archivo real, ya conectado, tenia otro nombre y **si tenia los datos**.

**Regla doble, y las dos mitades importan:**
- Cuando el humano reporta "no llego" sobre algo ya verificado por API, la causa mas probable
  es un desajuste de *que esta mirando*, no que tu verificacion este mal.
- Pero **confirmalo viendolo** (o con una lectura programatica del destino real). No lo
  asumas: la vez que lo asumas sera la vez que si habia bug.

**Prevencion:** anota en el runbook el **identificador exacto** del destino — nombre completo
del archivo, URL, ID del chat, nombre de la tabla. Un nombre aproximado cuesta una sesion.

---

## 8. Un cron que "corre" no prueba que el correo se envio

Los proveedores de correo aceptan un envio (`202`) y lo rebotan despues. Un buzon de prueba
inventado siempre rebota. **Verifica en el panel del proveedor** o con un buzon real.

Ademas: si el plan de hosting limita el numero de tareas programadas, cuentalas antes de
diseñar. Descubrir el limite al desplegar obliga a rediseñar el pipeline entero.

---

## 9. Datos de prueba que se quedan en produccion

Cada verificacion end-to-end crea filas reales en bases reales. **Bortalas al terminar, y
anota cuales no pudiste borrar** (una fila en la hoja del operador la borra el operador).

Un lead de prueba olvidado se convierte en una llamada comercial a un correo inventado, o
peor, contamina las metricas del embudo durante meses.

---

## 10. La promesa de la interfaz es un contrato

**Caso real:** la pantalla decia "te enviamos tu resultado por correo" y el codigo nunca lo
enviaba. El texto legal declaraba esa finalidad. Nadie lo noto durante semanas.

**Regla:** al auditar, **lee lo que la interfaz promete por escrito** y verifica que exista el
codigo que lo cumple. Una promesa incumplida en la UI no es solo mala experiencia: si el aviso
de privacidad declara esa finalidad, es una inconsistencia con el documento legal publicado.
