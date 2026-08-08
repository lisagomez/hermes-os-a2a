/**
 * ESPEJO A HOJA DE CALCULO — Google Apps Script.
 *
 * Este archivo NO se ejecuta desde el repo: es la referencia de lo que un humano
 * pega en Extensiones > Apps Script de la hoja destino, y despliega como
 * "Aplicacion web" (ejecutar como: yo · con acceso: cualquier persona).
 *
 * Resuelve tres problemas que rompen todo espejo ingenuo a una hoja:
 *   1. CONCURRENCIA — Apps Script no tiene bloqueo nativo. Dos escrituras en el
 *      mismo segundo leen el mismo getLastRow() y una pisa a la otra.
 *      LockService las serializa.
 *   2. DUPLICADOS — permite conservar el reporte periodico como red de
 *      reconciliacion: reenviar el dia completo no duplica lo ya escrito.
 *   3. FECHAS — la hoja autoparsea las fechas a objetos Date; sin normalizar,
 *      la clave de deduplicacion jamas coincide.
 *
 * DOS TOKENS CON PRIVILEGIOS DISTINTOS:
 *   TOKEN       -> lo usa la app automatica. SOLO puede agregar filas.
 *                  Vive en el hosting (variable de entorno).
 *   ADMIN_TOKEN -> uso manual del operador: leer, borrar filas, tocar columnas.
 *                  Vive SOLO en el entorno local. NUNCA en el hosting — subirlo
 *                  ampliaria lo que la app automatica podria hacer sin querer.
 *
 * NUNCA pongas los valores reales en un archivo que se commitea a git.
 * Generalos con: openssl rand -hex 32
 */
const TOKEN = '<TOKEN_ESPEJO — ver entorno local>';
const ADMIN_TOKEN = '<TOKEN_ADMIN — ver entorno local, jamas en el hosting>';

// ---------------------------------------------------------------- utilidades

/** Normaliza un valor para la clave de deduplicacion.
 *  GOTCHA: la hoja devuelve las fechas como Date, no como el string escrito. */
function norm_(x, tz) {
  if (x instanceof Date) return Utilities.formatDate(x, tz, 'yyyy-MM-dd');
  return String(x == null ? '' : x).trim().toLowerCase();
}

/** Clave natural de una fila. La HORA queda fuera a proposito: el empuje
 *  instantaneo usa el reloj del servidor y el periodico la marca de tiempo de
 *  la base — pueden caer en minutos distintos y romper la coincidencia. */
function clave_(fecha, canal, nombre, contacto, tz) {
  return [fecha, canal, nombre, contacto].map(function (v) { return norm_(v, tz); }).join('|');
}

function ok_(obj) {
  return ContentService.createTextOutput(JSON.stringify(Object.assign({ ok: true }, obj)))
    .setMimeType(ContentService.MimeType.JSON);
}

/** OJO: Apps Script responde HTTP 200 incluso aqui. Quien llama DEBE verificar
 *  el cuerpo ('"ok":true'), no solo el codigo de estado. */
function error_(msg) {
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Serializa las ejecuciones concurrentes. Sin esto, dos registros simultaneos
 *  se pisan: ambos leen el mismo lastRow y escriben en la misma fila. */
function conCandado_(fn) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return error_('ocupado');
  }
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function hojaActiva_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return { ss: ss, hoja: ss.getSheets()[0], tz: ss.getSpreadsheetTimeZone() };
}

// ------------------------------------------------------------------ entrada

function doPost(e) {
  if (!e || !e.parameter) return error_('sin_parametros');

  let datos;
  try {
    datos = JSON.parse(e.postData.contents);
  } catch (err) {
    return error_('json_invalido');
  }

  const accion = datos.accion || 'append_leads';

  // GOTCHA CRITICO: e.parameter SOLO se puebla desde query params o
  // form-urlencoded. Un token dentro del body JSON nunca llega aqui.
  // Quien llama debe mandarlo como ?token=...
  if (accion === 'append_leads') {
    if (e.parameter.token !== TOKEN) return error_('no_autorizado');
    return conCandado_(function () { return appendLeads_(datos); });
  }

  // Todo lo demas exige el token de operador.
  if (e.parameter.admin_token !== ADMIN_TOKEN) return error_('no_autorizado_admin');

  return conCandado_(function () {
    switch (accion) {
      case 'leer': return leer_(datos);
      case 'eliminar_fila': return eliminarFila_(datos);
      case 'agregar_columna': return agregarColumna_(datos);
      case 'eliminar_columna': return eliminarColumna_(datos);
      case 'renombrar_columna': return renombrarColumna_(datos);
      default: return error_('accion_desconocida');
    }
  });
}

// ------------------------------------------------------------ append_leads
// La accion por defecto: la usan TANTO el empuje instantaneo COMO el reporte
// periodico. Ambos mandan el mismo formato; la deduplicacion los reconoce
// iguales y por eso el periodico puede reenviar el dia sin duplicar nada.

function appendLeads_(datos) {
  const ctx = hojaActiva_();
  const hoja = ctx.hoja;
  const tz = ctx.tz;

  // Encabezados en la primera escritura. Si cambias estas columnas, cambia
  // tambien el formato que emiten AMBOS caminos (instantaneo y periodico).
  if (hoja.getLastRow() === 0) {
    hoja.appendRow(['Fecha', 'Hora', 'Canal', 'Nombre', 'Contacto', 'Detalle']);
    hoja.getRange(1, 1, 1, 6).setFontWeight('bold');
    hoja.setFrozenRows(1);
  }

  const existentes = {};
  const n = hoja.getLastRow();
  if (n > 1) {
    const previas = hoja.getRange(2, 1, n - 1, 5).getValues();
    previas.forEach(function (p) {
      existentes[clave_(p[0], p[2], p[3], p[4], tz)] = true;
    });
  }

  const filas = datos.filas || [];
  let escritas = 0;
  filas.forEach(function (f) {
    const k = clave_(datos.fecha, f.canal, f.nombre, f.contacto, tz);
    if (existentes[k]) return;
    hoja.appendRow([datos.fecha, f.hora, f.canal, f.nombre, f.contacto, f.detalle]);
    existentes[k] = true;
    escritas++;
  });

  // Fuerza la escritura ANTES de soltar el candado. Sin esto, la siguiente
  // ejecucion puede leer un estado desactualizado.
  SpreadsheetApp.flush();
  return ok_({ filas: escritas, omitidas: filas.length - escritas });
}

// ------------------------------------------------------------------- admin
// Uso manual del operador via curl. NO lo uses como chequeo rutinario: si el
// destino canonico ya contiene estos datos, verifica ahi por consulta directa.
// Estas acciones son para casos puntuales de estructura.

function leer_(datos) {
  const ctx = hojaActiva_();
  const hoja = ctx.hoja;
  const n = hoja.getLastRow();
  const c = hoja.getLastColumn();
  if (n === 0) return ok_({ encabezados: [], filas: [], total: 0 });

  const encabezados = hoja.getRange(1, 1, 1, c).getValues()[0];
  const limite = datos.limite || 50;
  const desde = Math.max(2, n - limite + 1);
  const filas = n >= 2 ? hoja.getRange(desde, 1, n - desde + 1, c).getValues() : [];

  return ok_({
    spreadsheet_nombre: ctx.ss.getName(),
    spreadsheet_url: ctx.ss.getUrl(),
    hoja_nombre: hoja.getName(),
    encabezados: encabezados,
    filas: filas,
    total_filas: n > 0 ? n - 1 : 0,
  });
}

function eliminarFila_(datos) {
  const hoja = hojaActiva_().hoja;
  const n = hoja.getLastRow();
  if (n < 2) return ok_({ eliminadas: 0 });

  if (datos.fila) {
    hoja.deleteRow(datos.fila);
    SpreadsheetApp.flush();
    return ok_({ eliminadas: 1 });
  }

  if (datos.donde) {
    const c = hoja.getLastColumn();
    const encabezados = hoja.getRange(1, 1, 1, c).getValues()[0];
    const colIdx = encabezados.indexOf(datos.donde.columna);
    if (colIdx === -1) return error_('columna_no_existe');

    const valores = hoja.getRange(2, colIdx + 1, n - 1, 1).getValues();
    const buscar = String(datos.donde.valor).trim().toLowerCase();
    let eliminadas = 0;
    // De abajo hacia arriba: borrar filas desplaza los indices siguientes.
    for (let i = valores.length - 1; i >= 0; i--) {
      if (String(valores[i][0]).trim().toLowerCase().indexOf(buscar) !== -1) {
        hoja.deleteRow(i + 2);
        eliminadas++;
      }
    }
    SpreadsheetApp.flush();
    return ok_({ eliminadas: eliminadas });
  }

  return error_('falta_fila_o_donde');
}

function agregarColumna_(datos) {
  const hoja = hojaActiva_().hoja;
  const c = hoja.getLastColumn();
  const posicion = datos.posicion || c + 1;
  if (posicion <= c) hoja.insertColumnBefore(posicion);
  hoja.getRange(1, posicion).setValue(datos.nombre).setFontWeight('bold');
  SpreadsheetApp.flush();
  return ok_({ columna: datos.nombre, posicion: posicion });
}

function eliminarColumna_(datos) {
  const hoja = hojaActiva_().hoja;
  const encabezados = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
  const idx = encabezados.indexOf(datos.nombre);
  if (idx === -1) return error_('columna_no_existe');
  hoja.deleteColumn(idx + 1);
  SpreadsheetApp.flush();
  return ok_({ columna_eliminada: datos.nombre });
}

function renombrarColumna_(datos) {
  const hoja = hojaActiva_().hoja;
  const encabezados = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
  const idx = encabezados.indexOf(datos.actual);
  if (idx === -1) return error_('columna_no_existe');
  hoja.getRange(1, idx + 1).setValue(datos.nuevo);
  SpreadsheetApp.flush();
  return ok_({ de: datos.actual, a: datos.nuevo });
}

/* ---------------------------------------------------------------------------
 * PASOS DEL HUMANO (🙋) PARA DEJARLO FUNCIONANDO
 *
 * 1. Abrir la hoja destino > Extensiones > Apps Script.
 * 2. Pegar este archivo completo, reemplazando TOKEN y ADMIN_TOKEN por valores
 *    generados con `openssl rand -hex 32` (dos distintos).
 * 3. Implementar > Nueva implementacion > tipo "Aplicacion web":
 *      - Ejecutar como: Yo
 *      - Quien tiene acceso: Cualquier persona
 *    Autorizar los permisos que pida.
 * 4. Copiar la URL de la implementacion (termina en /exec).
 * 5. Guardarla como variable de entorno junto al token de espejo.
 *    El token de admin va SOLO en el entorno local.
 * 6. Verificar con una escritura real:
 *      curl -sS -X POST "<URL>/exec?token=<TOKEN>" \
 *        -H 'content-type: application/json' \
 *        -d '{"fecha":"2026-01-01","filas":[{"hora":"10:00","canal":"Prueba",
 *             "nombre":"PRUEBA","contacto":"prueba@ejemplo.test","detalle":"—"}]}'
 *    Esperado: {"ok":true,"filas":1,...}  ← si dice ok:false, el token no llego
 *    (revisa que vaya en la URL, no en el cuerpo).
 * 7. Repetir el mismo curl: debe responder filas:0, omitidas:1 (deduplicacion viva).
 * 8. Borrar la fila de prueba de la hoja.
 *
 * IMPORTANTE: cada vez que edites este script, crea una NUEVA implementacion
 * (o actualiza la existente). Guardar el codigo no cambia lo que sirve la URL.
 * --------------------------------------------------------------------------- */
