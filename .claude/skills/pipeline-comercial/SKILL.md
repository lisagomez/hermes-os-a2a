---
name: pipeline-comercial
description: |
  Traza y cablea el pipeline comercial completo de una startup: descubre TODAS las superficies
  donde entra un interesado (formularios, WhatsApp, diagnosticos, apps de enganche, eventos),
  audita cuales ya escriben en algun lado y cuales estan huerfanas, elige un destino canonico
  (CRM) y cablea los espejos que faltan (aviso en vivo, hoja de calculo, correo al lead,
  reporte de reconciliacion). Entrega un RUNBOOK con el paso a paso de cada conexion,
  separando lo que hace el agente de lo que debe hacer un humano.
  Usar cuando el negocio ya tiene demanda entrando por varios lados y no hay una sola verdad
  de donde vienen los leads, o cuando se acaba de construir una superficie nueva de captura.
  Triggers: pipeline comercial, traza el pipeline, cablear canales, conectar el CRM, de donde
  vienen mis leads, auditar canales, se me pierden leads, conectar whatsapp al crm, espejo en
  sheets, unificar leads, embudo comercial, captura de leads, canales desconectados, un solo
  lugar con todos los leads, reporte diario de leads.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Pipeline Comercial — Trazar y Cablear los Canales de un Negocio

> Destilado de una operacion real: 4 canales en produccion, probados con concurrencia real
> (5 registros en el mismo segundo, 0 perdidas, 0 duplicados) antes de un evento presencial.
> Lo que sigue son los invariantes y los gotchas que costaron dias de depuracion.

---

## La tesis de esta skill

Un negocio con demanda real casi nunca tiene UN canal. Tiene cinco, crecidos en momentos
distintos, y **nadie sabe con certeza cual escribe donde**. El sintoma no es "no capturamos
leads": es *"tengo leads en cuatro lugares y ninguno cuadra con otro"*.

Tres reglas gobiernan todo lo demas:

1. **Un solo destino canonico.** Un lugar es la verdad (normalmente el CRM). Todos los demas
   son **espejos desechables**. Sin esta regla acabas con cuatro fuentes que se contradicen
   y nadie sabe cual creer.
2. **Ningun espejo puede tumbar la captura.** Si el CRM, el correo o la hoja fallan, el lead
   igual queda guardado. Un espejo caido jamas devuelve un error al usuario final.
3. **Cableado sin verificar no es cableado.** Un endpoint puede responder `200 OK` y no haber
   escrito nada (ver `references/gotchas-verificados.md` §1). Un canal solo cuenta como
   conectado cuando un dato real viajo de punta a punta y se vio del otro lado.

---

## Fase 0 — Leer el negocio antes de proponer nada

**No impongas un catalogo de canales. Derivalos del negocio.** Un SaaS B2B enterprise no
necesita una app de enganche de feria; un negocio que vive de eventos presenciales, si.

Lee, en este orden, lo que exista:

| Archivo | Que sacas |
|---|---|
| `BUSINESS.md` / `BUSINESS_LOGIC.md` | Que se vende, a quien, ticket, ciclo de venta |
| `CLAUDE.md` (raiz y app) | Reglas de arquitectura no negociables del repo |
| `HANDOFF.md` / `PROGRESS.md` | Que ya existe y que se intento antes |
| Memoria del proyecto (`.claude/memory/`) | Decisiones ya tomadas que NO se re-litigan |
| `README.md`, `/PRPs/*` | Superficies publicas y planes en curso |

De ahi extrae y **escribe explicitamente** (lo vas a necesitar en la Fase 3):

- **Ciclo de venta:** transaccional (el lead compra solo) vs consultivo (alguien llama).
  Determina si hace falta aviso en vivo o basta un resumen diario.
- **Volumen esperado:** decenas/mes vs cientos/dia. Determina si el espejo instantaneo
  necesita candado de concurrencia o es sobre-ingenieria.
- **Quien opera:** un fundador con el celular en la mano vs un equipo con CRM. Determina el
  destino canonico y el formato del aviso.
- **Presencialidad:** si hay ferias, stands o eventos, hay una superficie de captura con
  picos de concurrencia brutales en minutos concretos.
- **Marco legal aplicable** (Ley 1581 CO / LFPDPPP MX / GDPR EU): sin consentimiento
  registrado no hay fila. Ver `compliance`.

> Si estos archivos no existen o estan vacios, **para y entrevista al humano**. No inventes
> el negocio: un pipeline construido sobre un negocio imaginado se cablea al lugar equivocado.

---

## Fase 1 — Inventario de superficies de captura

Una **superficie** es cualquier lugar por donde un humano interesado puede dejar rastro.
Barre el repo y el mundo real; casi siempre hay mas de las que el operador recuerda.

```bash
# Formularios y endpoints de captura
grep -rIl --exclude-dir=node_modules -E "lead|contact|registr|suscri|waitlist|demo|brief" src/ app/
# Webhooks entrantes (WhatsApp, Meta, Telegram, tipeform, etc.)
find . -path "*/api/*" -name "route.*" -not -path "*/node_modules/*"
# Integraciones externas ya declaradas
grep -rn --exclude-dir=node_modules -iE "mail|sms|whatsapp|telegram|slack|sheet|crm|hubspot|salesforce|webhook|api_key|token" .env* 2>/dev/null | sed 's/=.*/=<oculto>/'
```

Y pregunta al humano por las que **no viven en este repo** (son las que mas se pierden):
subdominios aparte, landings en otro stack, formularios de terceros, el WhatsApp Business,
el DM de redes, la hoja donde alguien apunta a mano lo de la feria.

Arquetipos frecuentes y que canal los sirve bien: `references/arquetipos-de-canal.md`.

---

## Fase 2 — Auditoria empirica del cableado real (NO leas solo el codigo)

**Esta es la fase que ahorra el trabajo, y la que casi todo el mundo se salta.** El resultado
mas probable es que **ya existe mas cableado del que el operador cree**. Cablear encima de
algo ya conectado produce filas duplicadas en el destino canonico — un dano real, no teorico.

Por cada superficie de la Fase 1, responde con **evidencia**, no con lectura de codigo:

| Pregunta | Como se responde de verdad |
|---|---|
| ¿Escribe en algun lado? | Consulta el destino y mira si hay filas de ese origen |
| ¿Con que etiqueta de origen? | `SELECT DISTINCT canal_origen, count(*) ... GROUP BY 1` |
| ¿Cuando fue la ultima? | `max(created_at)` por canal — un canal "conectado" sin filas en 3 meses esta roto |
| ¿Avisa a alguien? | Busca el envio en el codigo Y confirma con el humano que le llega |

```sql
-- Molde: el mapa real de donde vienen los leads, ordenado por frescura
select canal_origen, count(*) as total, max(created_at) as ultimo
from <tabla_canonica>
group by 1
order by ultimo desc nulls last;
```

Clasifica cada superficie en **tres** estados (dos no alcanzan — el peligro vive en el medio):

- 🟢 **conectado-verificado** — hay filas recientes y se confirmo de punta a punta.
- 🟡 **cableado-sin-verificar** — el codigo existe pero nadie vio el dato llegar.
  **Tratalo como roto hasta probarlo.**
- 🔴 **huerfano** — no escribe en ningun lado, o escribe en un silo que nadie consulta.

---

## Fase 3 — Elegir el destino canonico y dibujar el grafo objetivo

**Elige UN destino canonico** con este criterio, en orden:

1. El que ya recibe **mas canales** (menos trabajo, menos migracion).
2. El que el humano **ya consulta a diario** (si nadie lo mira, no es canonico aunque sea el mejor).
3. El que soporta consulta programatica (SQL/API), no solo lectura humana.

Todo lo demas se declara **espejo**, y los espejos son desechables por definicion: si se
pierde una fila en la hoja de calculo no pasa nada, porque la verdad esta en el canonico.

> **Regla anti-deriva:** cuando alguien pregunte "¿cuantos leads llevamos?", la respuesta se
> saca del canonico. Nunca del espejo. Si te ves consultando el espejo para responder, el
> espejo se volvio una segunda verdad y el pipeline ya esta roto.

Dibuja el grafo objetivo — superficies a la izquierda, canonico al centro, espejos a la derecha:

```
[superficie A] ─┐
[superficie B] ─┼──▶ [DESTINO CANONICO] ──┬──▶ aviso en vivo (operador)
[superficie C] ─┘         (la verdad)     ├──▶ hoja de calculo (espejo)
                                          ├──▶ correo al propio lead
                                          └──▶ reporte de reconciliacion (red de seguridad)
```

Los cuatro tipos de espejo y para que sirve cada uno: `references/arquetipos-de-canal.md` §2.

---

## Fase 4 — Cablear lo que falta

Codigo generico listo para adaptar: `references/patrones-de-cableado.md`.
Apps Script del espejo de hoja de calculo (con candado y deduplicacion):
`references/apps-script-espejo.js`.

**Invariantes no negociables al escribir el codigo:**

1. **Un unico punto de escritura** por superficie. Un solo archivo toca la base; los espejos
   se disparan desde ahi. Nunca dos rutas escribiendo la misma tabla.
2. **Todo espejo se ejecuta en paralelo y ninguno puede lanzar.** `Promise.allSettled`, cada
   funcion devuelve `boolean` y captura sus propios errores. Timeouts cortos (3-8 s).
3. **Lo que no debe hacer esperar al usuario va despues de responder** (`after()` en Next.js,
   cola o `waitUntil` en otros runtimes). El candado de una hoja de calculo jamas puede
   agregarle latencia a la pantalla de alguien en una fila fisica.
4. **Idempotencia en el canonico:** indice unico sobre la clave natural (p. ej. `email` +
   `campaña`) y trata el conflicto como exito, no como error.
5. **Consentimiento antes de la fila**, y guarda *que version del texto* se acepto. Sin eso no
   tienes prueba de autorizacion. Ver `compliance`.
6. **Reconciliacion:** si un espejo es instantaneo, deja un proceso periodico que reenvie el
   dia completo. Solo funciona si **ambos caminos producen el formato identico** y el destino
   deduplica; si no, duplicas todo cada noche.
7. **Secretos server-only.** La llave de servicio jamas viaja al cliente. Un token de operador
   (permisos de escritura amplios) nunca se sube al hosting: vive solo en el entorno local.

---

## Fase 5 — Verificar cada canal con dato real, y limpiar

Un canal pasa a 🟢 solo cuando **un dato real viajo y se vio llegar**. Por cada uno:

1. Dispara un registro de prueba identificable (`PRUEBA <fecha>`).
2. Confirma en el **destino canonico** por consulta directa.
3. Confirma en **cada espejo** — y en los que no puedes consultar (una hoja del operador, un
   chat), pide al humano que lo **vea con sus ojos** y lo confirme.
4. **Borra los datos de prueba** de todas las bases. Nunca dejes basura en produccion.

**Si hay picos de concurrencia** (evento, lanzamiento, campaña), prueba de verdad:

```bash
# 5 registros en el mismo segundo — la unica forma de saber si el candado sirve
for i in 1 2 3 4 5; do curl -sS -X POST "$URL/api/<captura>" \
  -H 'content-type: application/json' \
  -d "{\"name\":\"PRUEBA $i\",\"email\":\"prueba$i@ejemplo.test\",\"consent\":true}" & done; wait
```
Luego cuenta filas en el canonico y en el espejo: deben ser 5 y 5. Ni 4 (perdida) ni 6 (duplicado).

> **Cuando el humano diga "no me llego" sobre algo que ya verificaste por API con exito,** la
> causa mas probable es que esta mirando otro lugar (otro archivo, otro chat, otra pestaña) —
> pero **confirmalo viendolo, no lo asumas.** Ese malentendido costo una sesion entera.

---

## Fase 6 — El entregable: el RUNBOOK

**El output final de esta skill es un archivo markdown**, no un resumen en el chat. Escribelo
en la raiz del repo o junto a la documentacion de producto:

```
RUNBOOK-PIPELINE-COMERCIAL.md
```

Usa el molde exacto de `references/plantilla-runbook.md`. Debe contener, si o si:

1. Un bloque **COMO EMPEZAR** autosuficiente al inicio: alguien que no vio esta conversacion
   debe poder ejecutar el resto sin contexto adicional.
2. El **grafo del pipeline** (superficies → canonico → espejos) con el estado 🟢/🟡/🔴 de cada uno.
3. **Un paso a paso numerado por cada conexion**, separando explicitamente:
   - 🤖 **agente** — lo que se hace con codigo/API (y ya quedo hecho o queda listo para hacerse).
   - 🙋 **humano** — lo que requiere una cuenta, una autorizacion, un pago, un dispositivo o
     un clic en una consola de terceros.
4. Por cada paso 🙋: **que hace, donde exactamente, que valor pegar y como se verifica que
   funciono.** Un paso pendiente sin criterio de verificacion no esta especificado.
5. La tabla de **variables de entorno** con donde vive cada una (local / hosting / ambas) y
   cuales son de operador y jamas suben al hosting.
6. **Que queda pendiente y que se rompe si nunca se hace.** Un pendiente sin consecuencia
   declarada se ignora para siempre.

> **Es correcto y esperado que queden conexiones manuales pendientes.** Lo inaceptable es que
> queden pendientes *sin quedar escritas*, o marcadas como listas sin verificar. Un pipeline
> a medias que el operador cree completo es peor que no tener pipeline: deja de revisar y
> pierde leads sin enterarse.

---

## Reglas de oro

1. **Audita antes de cablear.** Lo mas probable es que la mitad ya este conectada.
2. **Un canonico, muchos espejos desechables.** Nunca dos verdades.
3. **Ningun espejo tumba la captura.** `allSettled`, timeouts cortos, nunca lanza.
4. **Verifica el cuerpo de la respuesta, no solo el codigo HTTP.** Un `200` puede ser un `no`.
5. **Instantaneo + reconciliacion periodica**, con formato identico y deduplicacion.
6. **Sin consentimiento registrado no hay fila** (y guarda la version del texto aceptado).
7. **Prueba con concurrencia real** si va a haber picos; la teoria no sirve de arbitro.
8. **Limpia los datos de prueba** de todas las bases antes de cerrar.
9. **El entregable es el runbook**, y los pendientes 🙋 van escritos con su criterio de verificacion.
