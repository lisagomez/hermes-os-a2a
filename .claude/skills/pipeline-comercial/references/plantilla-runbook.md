# Molde del RUNBOOK — el entregable de la skill

> Copia esta estructura tal cual y rellenala con lo hallado. El criterio de calidad es duro:
> **alguien que no vio la conversacion debe poder terminar el pipeline solo con este archivo.**
> Si un paso requiere preguntarle algo a quien lo escribio, el paso esta mal escrito.

---

```markdown
# RUNBOOK — Pipeline Comercial de <NEGOCIO>
> Generado por la skill `pipeline-comercial` el <FECHA>. Estado: <N> de <M> canales verificados.

## COMO EMPEZAR (autosuficiente — leelo primero)

**Que es esto:** el mapa de por donde entran los interesados de <NEGOCIO>, a donde va cada uno,
y que falta para que el pipeline quede completo.

**La verdad vive en:** <DESTINO CANONICO — nombre exacto, URL, tabla>.
Cualquier pregunta del tipo "¿cuantos leads llevamos?" se responde **desde ahi**, nunca desde
un espejo.

**Si vas a continuar el trabajo pendiente**, abre un agente y pegale esto:

> Lee `RUNBOOK-PIPELINE-COMERCIAL.md` en la raiz del repo y ejecuta los pasos marcados 🤖 de
> la seccion "Pendientes". Los pasos 🙋 son mios: dime cuando te toque esperar por uno.

**Que es tuyo (🙋) y que del agente (🤖):** los pasos 🙋 requieren una cuenta, una autorizacion,
un pago o un clic en la consola de un tercero — nadie los puede hacer por ti.

---

## 1. El pipeline hoy

```
[<superficie A>] ─┐
[<superficie B>] ─┼──▶ [<CANONICO>] ──┬──▶ <espejo 1>
[<superficie C>] ─┘                   ├──▶ <espejo 2>
                                      └──▶ <reporte de reconciliacion>
```

### Superficies de captura

| # | Superficie | Donde vive | Escribe en | Etiqueta de origen | Estado |
|---|---|---|---|---|---|
| 1 | <nombre> | <url / repo / ruta> | <destino> | `<etiqueta>` | 🟢 verificado |
| 2 | <nombre> | <url> | <destino> | `<etiqueta>` | 🟡 sin verificar |
| 3 | <nombre> | <url> | — | — | 🔴 huerfano |

> 🟢 dato real viajo y se vio llegar · 🟡 el codigo existe pero nadie lo probo (**tratar como
> roto**) · 🔴 no escribe en ningun lado

### Espejos

| Espejo | Destino exacto | Disparado desde | Estado |
|---|---|---|---|
| <aviso en vivo> | <chat / ID exacto> | <archivo:funcion> | 🟢 |
| <hoja de calculo> | "<NOMBRE COMPLETO DEL ARCHIVO>" en <cuenta> | <archivo:funcion> | 🟢 |
| <correo al lead> | — | <archivo:funcion> | 🟡 |
| <reporte periodico> | <correo destino> | cron <horario> | 🟢 |

> Anota el **identificador exacto** de cada destino (nombre completo del archivo, ID del chat,
> nombre de la tabla). Un nombre aproximado cuesta una sesion entera de confusion.

---

## 2. Variables de entorno

| Variable | Para que | Local | Hosting | Apunta a |
|---|---|---|---|---|
| `<VAR>` | <funcion> | ✅ | ✅ | <destino concreto> |
| `<VAR_OPERADOR>` | <funcion admin> | ✅ | ❌ **nunca** | <destino> |

> Las variables de operador (permisos amplios, uso manual) **jamas suben al hosting**: viven
> solo en el entorno local. Subirlas amplia lo que la app automatica puede hacer sin querer.

---

## 3. Pendientes

Cada paso lleva: que hace · donde exactamente · que pegar · **como se verifica** · que se rompe
si nunca se hace.

### P1 · 🙋 <titulo del paso>
- **Que:** <accion concreta en una linea>
- **Donde:** <consola/URL exacta, ruta de menu si aplica>
- **Valor a usar:** `<valor o de donde sacarlo>`
- **Verificacion:** <comando o observacion concreta que prueba que funciono>
- **Si no se hace:** <consecuencia real y concreta>
- **Bloquea a:** <P3, o "nada">

### P2 · 🤖 <titulo del paso>
- **Que:** <accion>
- **Archivos:** `<ruta:linea>`
- **Verificacion:** <comando + resultado esperado>
- **Si no se hace:** <consecuencia>

---

## 4. Como verificar el pipeline completo

```bash
# 1. Registro de prueba identificable
curl -sS -X POST "<URL>/api/<captura>" -H 'content-type: application/json' \
  -d '{"name":"PRUEBA <fecha>","email":"prueba@ejemplo.test","consent":true}'

# 2. Confirmar en el canonico
#    select * from <tabla> where email = 'prueba@ejemplo.test';

# 3. Confirmar en cada espejo (los no consultables los confirma un humano 🙋)

# 4. BORRAR el dato de prueba de todas las bases
```

**Prueba de concurrencia** (obligatoria si habra picos — evento, lanzamiento, campaña):

```bash
for i in 1 2 3 4 5; do curl -sS -X POST "<URL>/api/<captura>" \
  -H 'content-type: application/json' \
  -d "{\"name\":\"PRUEBA $i\",\"email\":\"prueba$i@ejemplo.test\",\"consent\":true}" & done; wait
```
Esperado: 5 filas en el canonico y 5 en el espejo. Ni 4 ni 6.

---

## 5. Decisiones tomadas (no re-litigar sin motivo nuevo)

| Decision | Por que | Fecha |
|---|---|---|
| <CANONICO> es la unica verdad | <razon> | <fecha> |
| <espejo X> no se usa para consultar | <razon> | <fecha> |

---

## 6. Limpieza pendiente

- [ ] 🙋 Borrar la fila de prueba de <destino que solo el operador puede tocar>
- [ ] 🤖 <otra limpieza>
```

---

## Errores frecuentes al escribir el runbook

1. **Marcar un canal como listo sin haberlo verificado.** Es el error mas caro: el operador
   deja de revisar y pierde leads sin enterarse. Ante la duda, 🟡.
2. **Un pendiente sin criterio de verificacion.** "Configurar el webhook" no es un paso; es un
   deseo. ¿Como sabe quien lo haga que quedo bien?
3. **Un pendiente sin consecuencia declarada.** Sin el "si no se hace", nadie lo prioriza y
   queda ahi para siempre.
4. **Nombres aproximados de destinos.** "la hoja de leads" no sirve; el nombre completo si.
5. **Mezclar 🙋 y 🤖 en un mismo paso.** Si un paso tiene las dos cosas, son dos pasos.
