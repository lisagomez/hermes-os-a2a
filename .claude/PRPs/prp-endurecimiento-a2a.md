# PRP — Fase de endurecimiento del plano A2A

**Estado:** propuesta, pendiente de decisiones de la dueña (§2)
**Origen:** revisión de seguridad del ROADMAP — cuatro huecos identificados
**Ubicación sugerida:** `.claude/PRPs/prp-endurecimiento-a2a.md`
**Documentos hermanos:** `businessos/gobernanza/` (modelo de amenazas), `FASE0-respaldos.md`
**Esfuerzo estimado:** 3–5 semanas de una persona. Casi todo ingeniería propia, ~$0 de OPEX adicional.

---

## 1. Los cuatro huecos

Ninguno es una falla de lo construido; los cuatro son consecuencias de haber diseñado
para **un solo operador de confianza**. Dejan de ser aceptables el día que entra el
primer cliente externo o el primer agente de terceros.

| # | Hueco | Riesgo concreto |
|---|---|---|
| **H1** | Ninguna Agent Card está firmada | Suplantación de agente; imposible abrir A2A a terceros |
| **H2** | Sin autenticación entre agentes internos | `hermes-net` es plana: un contenedor comprometido habla con los doce |
| **H3** | Entrada pública sin frontera explícita | `ventas-a2a` recibe texto de internet que puede llegar a un modelo con herramientas |
| **H4** | Sin correlación forense entre saltos | Un incidente en una cadena de 8 delegaciones es irreconstruible |

**El orden de riesgo no es el orden de construcción.** H1 es el más citado, pero H2 es
el que más superficie abre hoy y H4 es el que hace depurable todo lo demás. La
secuencia de §4 lo refleja.

---

## 2. Decisiones que necesito antes de escribir código

### D1 — Ancla de confianza del plano A2A · **RESUELTA, y movida de fase**

**Resolución: dos anclas independientes.** Raíz A2A propia, sin relación con las CAs
de Fabric. La separación es estructural, no configurada.

> **Esta decisión ya no vive en este PRP.** Es **precondición de la fase 12**, porque
> tiene fecha límite: mientras la ceremonia de llaves de Fabric no ocurra, ambas
> opciones siguen abiertas; en cuanto ocurra con CAs autofirmadas, la raíz compartida
> deja de ser posible sin repetir la ceremonia y reemitir todos los MSP.
>
> Ver `precondicion-fase12-anclas-de-confianza.md` para el razonamiento completo, los
> parámetros criptográficos y el guion de ceremonia.

Lo que este PRP necesita de esa fase es un solo insumo: **la intermedia del plano A2A
emitida y su cadena disponible**. El paso 2 asume que existe.

```
Raíz A2A (fuera de línea)              CA Fabric (fuera de línea)
  └── Intermedia Plano A2A               ├── Operadora MSP
        ├── ejecutor-a2a                 └── Testigo MSP
        ├── grafo-a2a
        ├── ventas-a2a
        └── … los 12 servicios
```

### D2 — ¿mTLS en la aplicación o en un sidecar?

**Recomiendo: en la aplicación, vía un módulo compartido.** Un sidecar por servicio
son doce contenedores más sobre 8 GB de RAM ya sobre-suscritos. El módulo compartido
además da un punto único donde vive la lógica de autorización, consistente con la
disciplina del proyecto.

### D3 — ¿Vigencia de los certificados de servicio?

**Recomiendo 90 días para arrancar, 30 cuando la rotación esté automatizada.** Un
cert corto sin automatización es un incidente programado: todo se cae el día 31 y
nadie recuerda por qué.

---

## 3. Fuera de alcance

Declarado explícitamente para que nadie lo construya "de paso":

- OAuth 2.0 / OIDC para agentes externos (llega con el primer socio A2A real)
- Federación de identidad con clientes
- OpenTelemetry completo — aquí solo se hace `trace_id` propagado (§4 paso 1)
- SIEM externo
- Rotación automática de certificados (paso 6 la deja lista, no la construye)
- **SPIFFE/SPIRE como emisor.** El PRP emite identidad de carga de trabajo
  autoemitida por PKI manual, que es lo correcto para un host y doce servicios: la
  atestación de SPIRE resuelve la distribución de identidad a cargas que no controlas
  físicamente, problema que en un servidor propio no existe, y su servidor más agente
  cuestan 200–400 MB sobre 8 GB ya sobre-suscritos.
  Disparadores para reconsiderarlo: más de un host u orquestador real, más de ~25
  servicios, rotación manual que empiece a fallar, o un cliente que exija atestación
  como control auditado. El SAN SPIFFE del paso 2 deja preparado ese cambio.
- Migración a A2A spec v1.0 si el SDK actual no la implementa — se evalúa en el paso 0

---

## 4. Pasos

### Paso 0 — Inventario y verificación de versión (1 día)

Antes de todo: confirmar qué versión de la **especificación** implementa `a2a-sdk 1.1.0`.
Si es pre-v1.0, la firma de cards (`signatures`), `securitySchemes` con mTLS y los
flujos OAuth modernos pueden no existir en el SDK, y el paso 3 cambia de forma.

Entregable: `businessos/gobernanza/inventario-a2a.md` con los doce servicios, su
puerto, quién los llama, qué skills expone y si son alcanzables desde el edge.

**Gate:** el inventario coincide con `docker compose ps` y con las cards reales.
Si aparece un servicio que nadie recordaba, ese es el hallazgo más valioso del paso.

---

### Paso 1 — H4: correlación de traza (2–3 días)

**Va primero a propósito.** Es barato, no rompe nada, y hace depurable el despliegue
de mTLS de los pasos siguientes. Intentar diagnosticar un fallo de mTLS en un grafo de
ocho saltos sin `trace_id` es innecesariamente doloroso.

- `trace_id` (UUID) se genera en **el punto de entrada** — edge, Telegram, cron — y
  nunca dentro de un agente.
- Viaja en el header `X-Trace-Id` y en `Task.metadata`. Cada agente registra también
  `parent_agent` y `hop` (profundidad).
- Se persiste en `agent.log` (JSON estructurado) y como columna en `token_usage`.
- Cuando exista la capa de tenencia, `tenant_id` viaja por el mismo carril — **y se
  valida en cada salto, no solo se transporta**. La allowlist del paso 3 autoriza
  *qué agente* puede llamar a cuál; no dice nada de *para qué tenant*. Un agente
  autorizado que envía un `tenant_id` que no le corresponde es un pivote entre
  clientes, y mTLS no lo detiene. El agente receptor debe confirmar que el tenant
  declarado es coherente con la cadena de traza, no aceptarlo por venir de un par
  legítimo.

```python
# businessos/a2a_comun/traza.py — módulo compartido, no copiado en cada servicio
def contexto_traza(headers: dict, agente: str) -> dict:
    return {
        "trace_id": headers.get("X-Trace-Id") or str(uuid4()),
        "parent_agent": headers.get("X-Parent-Agent"),
        "hop": int(headers.get("X-Hop", "0")) + 1,
        "agente": agente,
    }
```

**Gate:** una tarea que atraviesa ≥3 agentes se reconstruye completa con una sola
consulta por `trace_id`, en orden y con la profundidad correcta.

**Gotcha:** tope de `hop` (sugerido: 12). Un ciclo de delegación entre agentes es un
DoS autoinfligido, y sin tope no se detecta hasta que el servidor se cae.

---

### Paso 2 — PKI del plano A2A (3–4 días)

**Precondición:** raíz A2A e intermedia ya emitidas en la ceremonia de fase 12. Si la
ceremonia no ha ocurrido, este paso no puede empezar y el PRP se bloquea aquí.

- Emisión de doce certificados de servicio desde la intermedia. CN y SAN DNS = nombre
  del servicio en `hermes-net`, **más un SAN URI en formato SPIFFE**
  (`spiffe://hermes.local/ns/produccion/sa/<servicio>`). Ver §3.2 y §3.3 de la
  precondición: cuesta cero hoy y hace que una migración futura a identidad de carga
  de trabajo atestada sea un cambio de emisor, no una reescritura.
- La llave privada de cada servicio se monta como secreto de Docker, **no** en la
  imagen, **no** en el repositorio, **no** en el respaldo en línea (regla §7 del runbook).
- CRL publicada en un path interno que los agentes consultan al arrancar y cada hora.

**Gate:** simulacro de revocación con **rechazo observado más control positivo** —
mismo estándar que el de Fabric. Se revoca el cert de un servicio de prueba, se
verifica que sus llamadas son rechazadas, y se verifica que un servicio no revocado
sigue funcionando. Ambas mitades son necesarias: sin el control positivo, un fallo
generalizado se confunde con éxito.

---

### Paso 3 — H2: mTLS y autorización por par (1 semana)

El paso de mayor riesgo operativo: toca los doce servicios.

**Módulo servidor** (`a2a_comun/mtls.py`): exige certificado de cliente válido contra
la intermedia A2A, extrae el **SAN URI SPIFFE** (no el CN), y consulta la allowlist.

> Autorizar por el URI y no por el CN es lo que desacopla las reglas del emisor. El
> CN es texto libre heredado; el URI es un identificador con estructura y con
> restricción de nombre que lo respalda.

**Allowlist declarativa** — `businessos/a2a-pares.yaml`, fail-closed:

```yaml
# quién puede llamar a quién, y a qué skill. Ausente = denegado.
grafo-a2a:
  llamadores: [ejecutor-a2a, coordinador-a2a, pm-a2a]
  skills: {evaluar: [ejecutor-a2a, coordinador-a2a], explicar: ["*"]}
ejecutor-a2a:
  llamadores: [coordinador-a2a, supervisor-a2a]
ventas-a2a:
  llamadores: [coordinador-a2a]
  publico: [card]        # única superficie sin cert de cliente
```

**Módulo cliente:** transporte httpx del `a2a-sdk` configurado con el par
cert/llave del servicio y la CA de verificación. Un solo lugar, doce consumidores.

**Gotchas — los tres que van a morder:**

1. **Health checks.** Docker y Caddy sondean `/health` sin certificado de cliente.
   Exime `/health` de mTLS, o dale un cert al sondeo. Si no, los doce servicios
   quedan marcados como no saludables y Compose entra en ciclo de reinicio.
2. **La card pública de `ventas-a2a`.** El descubrimiento externo debe poder leer la
   card **sin** cert de cliente, mientras `rpc` sí lo exige. Son dos clases de
   endpoint en el mismo servicio; el módulo tiene que distinguirlas.
3. **La prueba de opacidad de `grafo-a2a`** va a fallar al cambiar el transporte.
   Actualízala **conservando la aserción** —superficie exactamente `{card, rpc,
   /health}`— no la relajes. Esa prueba es un activo, no un obstáculo.
4. **Caddy pasa a ser un cliente mTLS.** El edge termina TLS público en 443 y hace
   proxy a `ventas-a2a`. En cuanto `rpc` exija certificado de cliente, Caddy necesita
   el suyo (`transport http { tls_client_auth ... }`) emitido desde la misma
   intermedia, con su propia entrada en la allowlist. Sin esto, el único servicio
   público queda inalcanzable desde fuera y el síntoma —502 en el edge— no apunta al
   certificado.
5. **Costo de handshake.** Un grafo de 8 saltos son 8 handshakes TLS por transacción.
   Sin reutilización de conexión, el CPU y la latencia suben de forma notoria sobre
   8 GB ya sobre-suscritos. Configura `keep-alive` y pool de conexiones en el cliente
   httpx compartido, y reanudación de sesión en el servidor. Mide latencia p95 antes
   y después: es la métrica que dice si el despliegue fue transparente o costoso.

**Gate:** un contenedor sin certificado válido en `hermes-net` recibe rechazo de los
doce servicios. Y un llamador con cert válido pero fuera de la allowlist del par
también es rechazado — autenticación y autorización se prueban por separado.

---

### Paso 4 — H1: firma de Agent Cards (3–4 días)

- Firma JWS con canonicalización JCS (RFC 8785) sobre la card, con la llave del
  servicio; cadena en `x5c`.
- El cliente **verifica la firma antes de usar cualquier campo** de una card ajena.
- Card sin firma o con firma inválida → rechazo, registrado con `trace_id`.

**El punto que más se malinterpreta:** verificar la firma prueba **origen**, no
benevolencia. Una card firmada por un tercero legítimo sigue siendo entrada no
confiable: sus campos de texto (`description`, nombres de skills) pasan por la
sanitización del paso 5 antes de acercarse a un modelo. La firma dice quién lo dijo,
no que sea verdad.

**Gate:** card manipulada un byte → rechazada. Card firmada por una CA distinta →
rechazada. Card válida → aceptada, con la verificación registrada.

---

### Paso 5 — H3: frontera de contenido externo (4–5 días)

Aplica **solo** donde entra contenido de fuera. Hoy: `ventas-a2a` vía edge, campos de
texto de cards de terceros, y en el futuro el correo entrante del buzón.

**Tres controles, en orden:**

1. **Normalización**: tope de longitud, eliminación de caracteres de control y
   homoglifos, rechazo de codificaciones anidadas.
2. **Marcado de procedencia**: todo `Part` originado fuera lleva
   `metadata.origen = "externo"` y `fuente`. La marca es **pegajosa**: sobrevive a
   cada salto A2A y a la persistencia.
3. **Regla de exclusión** — extensión natural de la capa que ya tienes en el ruteo de
   modelos, que pregunta qué modelo está *prohibido* antes que cuál conviene:

   > Contenido marcado `origen=externo` nunca se coloca en posición de instrucción, y
   > nunca llega a un modelo con herramientas de escritura sin pasar por clasificador.

El clasificador de inyección corre **solo en la frontera**, no en cada salto. Esa
decisión es la diferencia entre ~$50 y ~$5,000 mensuales de costo variable si el
volumen crece, y no reduce la protección: el contenido ya viene marcado y la marca
viaja con él.

**Gate:** una carga con instrucción embebida entra por `ventas-a2a`, queda marcada, y
se demuestra que no alcanza a `ejecutor-a2a` en posición de instrucción. Batería de
20 cargas conocidas, con línea base medida y documentada.

`grafo-a2a` queda exento por diseño: es determinista, no tiene LLM, y esa propiedad
es precisamente lo que lo hace inmune. Anótalo en el modelo de amenazas para que
nadie le agregue un modelo "para mejorarlo".

---

### Paso 6 — Interruptor de emergencia y simulacro (2 días)

- `businessos/a2a-bloqueados.yaml`: lista consultada en el punto único de
  autorización. Un nombre ahí = ese agente queda aislado en la siguiente petición,
  sin redespliegue.
- Revocación de cert en CRL para el bloqueo definitivo.
- Cancelación de las tareas en vuelo del agente aislado.
- **Simulacro completo, cronometrado**, con salida escrita al registro: se declara un
  agente comprometido, se aísla, se cancelan sus tareas, se verifica que el resto del
  grafo sigue operando, y se mide cuánto tomó.

**Gate:** aislamiento efectivo en menos de 5 minutos, con el resto del sistema
funcionando. Si el aislamiento tumba el grafo entero, el acoplamiento está mal y hay
que arreglarlo antes de cerrar la fase.

**Telemetría de seguridad.** Todo lo construido en esta fase genera rechazos, y un
rechazo sin métrica es invisible. Cuatro contadores, con `trace_id` y agente:

| Métrica | Qué distingue |
|---|---|
| Rechazos por certificado inválido o expirado | Ataque contra rotación mal hecha |
| Rechazos por par fuera de allowlist | Intento de pivote contra despliegue incompleto |
| Firmas de card inválidas | Suplantación contra CA desactualizada |
| Cargas marcadas por el clasificador de frontera | Presión real contra falsos positivos |

Sin estas cuatro, un ataque y una mala configuración se ven idénticos: todo falla y
nadie sabe por qué. Reusa el patrón de `alerta-presupuesto.sh` para avisar cuando
cualquiera se dispare fuera de su línea base.

---

## 5. Reversión por paso

Todo paso que toque los doce servicios necesita camino de vuelta **antes** de
desplegarse. Sin esto, un fallo a las 11 de la noche se resuelve improvisando.

| Paso | Cómo se revierte | Tiempo |
|---|---|---|
| 1 · Traza | Aditivo, no rompe nada. No se revierte | — |
| 3 · mTLS | `A2A_MTLS=permisivo` → registra pero no rechaza. Redespliegue del módulo compartido | < 5 min |
| 4 · Firma | `A2A_VERIFICAR_FIRMA=0` → acepta cards sin verificar | < 5 min |
| 5 · Frontera | Clasificador a modo registro; normalización se queda (es inocua) | < 5 min |
| 6 · Interruptor | Vaciar `a2a-bloqueados.yaml` | inmediato |

**Regla:** cada bandera de reversión tiene fecha de caducidad escrita. Un modo
permisivo que lleva tres meses activo no es una red de seguridad, es la
configuración real y nadie lo sabe.

**Orden de despliegue del paso 3:** permisivo en los doce → verificar que los
registros no muestran rechazos inesperados durante 48 h → estricto por parejas →
estricto en todos. Nunca estricto directo.

---

## 6. Recuperación ante desastre de la PKI

Hueco que esta fase **crea** y que el runbook de respaldos no cubre: hoy si el
servidor arde, restauras volúmenes y arrancas. Después de esta fase, restauras
volúmenes y **nada puede hablar con nada**, porque las llaves de servicio no están en
el respaldo por diseño (regla §7 del runbook).

Eso es correcto — las llaves privadas no deben respaldarse en línea — pero exige que
la reemisión esté documentada y probada, no improvisada durante un incidente.

**Procedimiento de reemisión** (`businessos/gobernanza/reemision-certs.md`):

1. La intermedia A2A **sí** se respalda, cifrada con `age`, con la llave privada en
   la custodia física. Es lo único que evita convocar la ceremonia completa.
2. Con la intermedia recuperada, reemitir los doce certificados de servicio es un
   script: minutos, no horas.
3. Si además se perdió la intermedia, se convoca la ceremonia con la raíz en custodia.
   Objetivo de recuperación en ese caso: 48 h, no 4.

**Gate:** simulacro de reemisión completa en entorno aislado, cronometrado, con el
resultado anotado. Mismo estándar que el GATE 3 del runbook: **una recuperación no
probada no es una recuperación.**

Actualizar el runbook de FASE 0 §7 para reflejar esto: la intermedia cifrada entra al
respaldo; las llaves de servicio y la raíz no.

---

## 7. Pruebas mínimas (negación primero)

Siguiendo el patrón del proyecto: lo que importa es que falle cuando debe fallar.

- Sin cert de cliente → rechazo en los doce servicios
- Cert válido, par fuera de allowlist → rechazo
- Cert revocado → rechazo en menos de una hora
- Card sin firma / firma inválida / CA equivocada → rechazo
- Contenido externo → marcado, y nunca en posición de instrucción
- `hop` > 12 → tarea abortada
- Traza de ≥3 saltos → reconstruible con una consulta
- Opacidad de `grafo-a2a` → sigue siendo `{card, rpc, /health}`, ahora sobre mTLS
- Agente en la lista de bloqueo → aislado, resto operando

---

## 8. Riesgos de la fase

| Riesgo | Mitigación |
|---|---|
| mTLS tumba los doce servicios a la vez | Despliegue por parejas, con modo permisivo temporal (registra pero no rechaza) antes de cerrar |
| Certs expiran sin automatización | 90 días + recordatorio en calendario + tarea de rotación en el paso 6 |
| El SDK no soporta firma de cards | Detectado en el paso 0; alternativa es firmar en una capa propia |
| La prueba de opacidad se relaja "para que pase" | Revisión explícita de ese diff; es la prueba más valiosa del repo |
| El clasificador de frontera genera falsos positivos en leads reales | Modo permisivo primero, línea base medida antes de bloquear |

---

## 9. Orden de valor si hay que recortar

Si la fase se comprime, el orden de abandono es inverso al de construcción:

1. **Paso 1 (traza)** — nunca se recorta. Es barato y habilita todo lo demás.
2. **Paso 3 (mTLS)** — cierra la superficie más grande hoy.
3. **Paso 5 (frontera)** — cierra la entrada más probable.
4. **Paso 4 (firma)** — imprescindible **antes del primer agente de terceros**, no antes.
5. **Paso 6 (interruptor)** — imprescindible antes del primer cliente externo.

---

## 10. Checklist de aceptación

- [ ] Paso 0: inventario de los 12 servicios y versión de spec confirmada
- [ ] D1, D2, D3 decididas y escritas
- [ ] `trace_id` propagado; traza de 3 saltos reconstruible
- [ ] Tope de `hop` activo y probado
- [ ] Intermedia A2A emitida en ceremonia, con bitácora
- [ ] Simulacro de revocación: rechazo observado + control positivo
- [ ] mTLS en los 12 servicios; health checks y card pública exentos correctamente
- [ ] `a2a-pares.yaml` fail-closed, con prueba de par no autorizado
- [ ] Prueba de opacidad actualizada **sin relajar la aserción**
- [ ] Firma JWS+JCS emitida y verificada; card manipulada rechazada
- [ ] Marca `origen=externo` pegajosa a través de ≥2 saltos
- [ ] Batería de 20 cargas de inyección con línea base documentada
- [ ] Interruptor de emergencia probado, aislamiento < 5 min
- [ ] Caddy con certificado de cliente y entrada en la allowlist
- [ ] Latencia p95 medida antes y después del paso 3
- [ ] Banderas de reversión probadas, con fecha de caducidad escrita
- [ ] Simulacro de reemisión de certificados, cronometrado
- [ ] Runbook de FASE 0 §7 actualizado (intermedia cifrada al respaldo)
- [ ] Cuatro métricas de rechazo con línea base
- [ ] Modelo de amenazas actualizado en `businessos/gobernanza/`

---

## 11. Qué queda abierto al cerrar esta fase

Cerrado esto, el plano A2A soporta clientes externos. **No** soporta todavía agentes
de terceros fuera de tu control: eso exige OAuth/OIDC, registro de agentes federado y
acuerdos contractuales, y es una fase propia. La diferencia entre "mis agentes,
varios clientes" y "agentes de otros" es grande, y conviene no cruzarla por accidente.
