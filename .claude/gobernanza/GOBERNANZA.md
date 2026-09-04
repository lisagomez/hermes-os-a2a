# Gobernanza Agéntica — capa base de Hermes OS · A2A

> **Estado**: ADOPTADA · **Fecha**: 2026-09-04 · **Ámbito**: este repositorio.
> **Tesis**: Hermes **no necesita más doctrina de gobernanza**. Tiene nueve documentos
> propios y buenos en `businessos/gobernanza/`, un `prp-base.md` con sus secciones fijas,
> un corpus adversarial de diez familias y un gate de tenencia con control de reversión.
> Lo que falta es que esa doctrina **dispare**. El propio repo se escribió el criterio el
> 2026-08-02 — *"una doctrina sin gate es una costumbre"* — y de sus nueve documentos
> solo uno lo pasa.

Esta capa **no sustituye** a `businessos/gobernanza/`. Declara los siete controles, dice
dónde vive cada uno, y aporta lo único que faltaba: **el cableado y el verificador**. Cada
control apunta al documento de Hermes que ya lo desarrolla. Duplicar doctrina sería crear
dos verdades que divergen — el hallazgo exacto que un auditor busca.

---

## 0. Los tres huecos que esta capa cierra

Son invisibles justamente porque no rompen nada el día que se descuidan. Rompen semanas
después, sin ruido.

| # | Hueco | Por qué duele **aquí** |
|---|---|---|
| 1 | **Ningún gate para cambios de comportamiento** | `gate-docs-vivos.sh` exime `.claude/*` — justo el material que C1 vigila. Un skill, un subagente o `prp-base.md` se editan sin que nada lo note. Lo dice el propio `gobernanza-ciclo-de-vida.md` §3: *"el hueco — hoy sin gate"*. |
| 2 | **Nadie verifica a los agentes** | Se verifican artefactos (219+ tests, gates del Supervisor, corpus del buzón) pero no skills. Nadie sabe si `prp` sigue exigiendo el modelo de amenazas tras un cambio de modelo. Y el corpus del buzón, que **sí** existe y es bueno, **no lo corre nadie**. |
| 3 | **`service_role` anula la regla de RLS** | Mission Control renderiza todo el negocio con `SUPABASE_SERVICE_ROLE_KEY`, y los host-jobs escriben con la misma llave. `decision-service-role.md` ya lo dice sin adornos. Mientras eso siga, "SIEMPRE habilitar RLS" es decorativo. |

---

## 1. Los siete controles

| # | Control | Disparador | Dónde vive **la doctrina** | Dónde vive **el registro** |
|---|---------|-----------|---|---|
| **C1** | Cambio de Comportamiento (CDC) | Tocas modelo, skill, subagente, `SOUL.md`/`AGENTS.md`, plantilla o configuración del agente | §2 + `businessos/gobernanza/gobernanza-ciclo-de-vida.md` §3 | `BITACORA-CDC.md` |
| **C2** | Suite de regresión de skills | Cualquier CDC de radio ≥ skill | §3 + `gobernanza-ciclo-de-vida.md` §4 | `golden-sets/contratos.json` + rama `golden-sets` |
| **C3** | Modelo de amenazas | Cada PRP nuevo | §4 + **`businessos/gobernanza/modelo-amenazas-v1.md`** | Sección fija de cada PRP |
| **C4** | Evaluación de impacto (AISIA) | Cada PRP nuevo y cada feature con consecuencias sobre personas | §5 + **`businessos/gobernanza/adenda-iso42001.md`** §3 | Sección fija de cada PRP |
| **C5** | Registro de decisiones de riesgo | Aceptas un riesgo conocido en vez de mitigarlo | §6 | `REGISTRO-RIESGO.md` (proyecto) + `registro-decisiones-riesgo-buzon.md` (buzón) |
| **C6** | Procedimiento de incidente | Algo se rompe, se filtra o alguien lo intenta | §7 + **`businessos/gobernanza/procedimiento-incidente-inyeccion.md`** | `INCIDENTES.md` |
| **C7** | Regla `service_role` / RLS | Cualquier acceso a datos de negocio | §8 + **`businessos/gobernanza/decision-service-role.md`** | `REGISTRO-RIESGO.md` |

> **Los nueve documentos de `businessos/gobernanza/` no se mueven ni se copian.** Esta
> tabla es el índice; ellos siguen siendo la fuente. Los que no aparecen arriba
> —`adenda-web-agentica.md`, `anclas-de-confianza.md`, `politica-correo-agentico.md`—
> son doctrina de dominio, no controles transversales, y se quedan tal cual.

---

## 2. C1 · Cambio de Comportamiento (CDC)

**El problema en una línea**: cambiar el modelo, editar un skill o retocar un `AGENTS.md`
altera el comportamiento de TODO lo que el sistema produce después.

Los prompts y skills ya viven en git. El CDC añade que se **revisan** como código: nadie
los edita en caliente —ni la dueña— sin que quede diff, regresión y aprobación.

El gate es **proporcional al radio**:

| Cambio | Radio | Gate requerido |
|---|---|---|
| Versión de modelo (motor del trío, ruteo Hermes, subagentes) | Todo el sistema | CDC completo: diff + regresión (C2) verde + aprobación humana + **pineo** en `BITACORA-CDC.md` |
| Skill, `CLAUDE.md`, `SOUL.md`, `AGENTS.md` de una vertical | Ese skill / esa vertical y todo lo que produce | CDC estándar: diff revisado + regresión de ese skill + aprobación |
| `prp-base.md`, plantillas, design-system | Todo lo futuro que use esa plantilla | Re-auditoría registrada en la bitácora |
| **Configuración del agente** (`.claude/settings.json`, campo `model`, `.mcp.json`, permisos, `subagentes`) | Todo el sistema | CDC completo. **Se nombra explícitamente porque no disparaba**: una petición de config no se lee como cambio de comportamiento, y lo es |
| Parámetros menores (temperatura, límites, timeouts) | Acotado | Entrada en bitácora + revisión trimestral |

**Reglas duras**

- El modelo en producción **SIEMPRE está pineado**. `latest` es anti-patrón aquí igual que
  en las imágenes Docker — y este repo ya lo tiene escrito en cuatro sitios, uno de ellos
  diciendo literalmente *"fijar digest sha256 tras el primer pull"*. Nunca se fijó.
- Un CDC sin regresión verde **no se promueve**. Sin excepciones y sin "se ve bien".
- Todo PRP responde en su encabezado: *¿este PRP cambia comportamiento de agentes?
  → CDC aplicable: sí/no*. `prp-base.md` ya lo trae.

> **El cable que hace que C1 muerda**: `scripts/gate-docs-vivos.sh`. Un PR que toca
> `.claude/skills/`, `.claude/agents/`, `.claude/PRPs/prp-base.md` o `.mcp.json` **exige**
> entrada en `BITACORA-CDC.md`. Sin ese cable, C1 es un documento.

### El runtime también cuenta

Aprendizaje propio del repo (2026-07-12): **editar un `AGENTS.md`/`SOUL.md` en el repo no
lo despliega** — el runtime lee el volumen. Un CDC sobre doctrina de una vertical **no
está cerrado** hasta que el volumen lo refleje y el contenedor se reinicie. La entrada de
bitácora lo declara: repo ✅ / volumen ✅.

---

## 3. C2 · Suite de regresión de skills (golden sets)

El Supervisor de los que no escriben código.

**Forma**: se compara por **match estructural, no textual**. No importa que las palabras
cambien; importa que `supabase` siga emitiendo RLS en toda tabla, que `prp` siga exigiendo
modelo de amenazas y AISIA, que `orquestar-agentes` siga declarando su exclusión
fail-closed de modelos.

### Las dos capas

| Capa | Qué comprueba | Cuándo corre | Comando |
|---|---|---|---|
| **A · Contratos** | Que cada `SKILL.md` siga declarando sus reglas no negociables. Determinista, sin invocar al modelo | **Cada build**, dentro de `validate`, y en cada PR | `npm run regresion` |
| **B · Casos-trampa** | Que entradas adversariales produzcan escalada o negativa, no salida limpia. Requiere modelo | **Cada CDC**, en sesión limpia | `npm run regresion -- --trampa` |

La capa A verifica que un skill **declare** sus reglas, no que las **cumpla** al
ejecutarse. Esa distinción es el riesgo firmado de esta capa, no un descuido.

**Verde = promovible. Rojo = el cambio no se promueve**, sin excepciones.

### El material que Hermes ya tiene (y que no se duplica)

- **El corpus del buzón** (`businessos/buzon-a2a/corpus/`, diez familias de inyección,
  criterio de cero escapes) prueba **el saneador**, no a los agentes. Es un artefacto
  excelente y **no lo corre nadie**: cablearlo a CI es el gate más barato del plan.
- **El corpus de casos-trampa de C2 prueba al agente.** Es otra cosa. Hermes construye el
  suyo, con **espacio de identificadores propio: `HT-01`, `HT-02`, …**

> ⚠️ **Por qué el prefijo propio**: la regla de trazo grueso del protocolo ciego prohíbe
> que cualquier archivo versionado contenga un identificador de caso. Con el espacio de
> identificadores del template original, **27 archivos versionados de este repo la
> romperían** — el ROADMAP, `CLAUDE.md`, componentes y pruebas de un frontend, y hasta uno
> de los propios documentos de gobernanza. `HT-` es un espacio limpio en este árbol.

### El protocolo ciego

Heredado con su motivo: dos contaminaciones lo enseñaron en el proyecto de origen. Un
agente **encontró el corpus** y reconoció que lo evaluaban; en la corrida siguiente otro
**decodificó el base64 "antes de darse cuenta de lo que era"**. La ofuscación no basta: el
archivo seguía ahí, y leerlo es lo que hace un agente que explora el directorio.

Reglas, sin matices (las versiones matizadas exigían un juicio en cada frase y fallaron
cada vez):

1. **El corpus no vive en el árbol de trabajo.** Rama propia `golden-sets`; se lee con
   `git show golden-sets:casos-trampa.md`.
2. **Fuera de esa rama no aparece ningún identificador `HT-nn`, ni uno.** La traza es el
   commit de `corridas.md`; en la bitácora quedan el veredicto y esa referencia.
3. Entrada **verbatim**, sin marco ni aviso de que es una prueba; **sesión fría**, sin el
   contexto del cambio; evaluación **estructural** — importa que escale, se niegue o marque
   la bandera, no cómo lo diga.

Lo que **no** se relaja al adaptar el prefijo: que el corpus no viva en el árbol. Esa es
la comprobación que lo protege.

> Los golden sets son un activo: envenenarlos ciega la regresión.

---

## 4. C3 · Modelo de amenazas (sección fija de todo PRP)

Cinco pasos en miniatura: **activos → fronteras → flujos → objetivos del atacante →
controles**.

> **La fuente es `businessos/gobernanza/modelo-amenazas-v1.md`** (adoptado el 2026-07-19,
> vivo, con sus activos A1–A4 y su catálogo). La plantilla de
> `plantillas/modelo-amenazas.md` es el formato para pegar en un PRP; el catálogo de
> atacantes y activos sale del documento vivo, **no de la plantilla**. Si divergen, manda
> el documento vivo y la plantilla se corrige.

Fronteras: **todo lo que cruza hacia adentro se valida**. Entradas de usuario, archivos
subidos, resultados de web/search y —lo que suele olvidarse— **las salidas del LLM**: no
se confían por diseño; quien verifica re-ejecuta los gates de cero.

### La frontera propia de Hermes: los canales de chat

Hermes opera **Telegram, Slack y WhatsApp**. Cada uno es **entrada no autenticada hacia un
agente que tiene llaves**. Es la superficie de mayor exposición del sistema y no aparecía
en ninguna regla que dispare. Concretamente:

- Un grupo de Telegram sin `require_mention` hace que el agente conteste **cada** mensaje
  (su default es `false` — aprendizaje 2026-07-12).
- El acceso por membresía de grupo delega la autorización en quien administre el grupo.
- Todo contenido entrante es **DATO, jamás instrucción**. El saneador del buzón es el
  precedente correcto; los canales de chat necesitan la misma postura.

---

## 5. C4 · Evaluación de Impacto (AISIA)

La distinción explícita:

- El **modelo de amenazas** protege **al sistema de los atacantes**.
- La **AISIA** protege **a las personas del sistema**: daños que ocurren con el sistema
  operando *bien*, sin ningún atacante.

Un PRP nuevo responde ambas: *¿quién nos ataca?* y *¿a quién podemos dañar sin que nadie
nos ataque?*

> Doctrina en `businessos/gobernanza/adenda-iso42001.md` §3 (A.5 evaluación de impacto).
> Plantilla y ejemplo en `plantillas/aisia.md`. `prp-base.md` **ya trae el anclaje**: es
> el activo más valioso que este repo tenía antes de esta capa.

---

## 6. C5 · Registro de decisiones de riesgo

Aceptar un riesgo es una decisión con dueño, no una casilla de configuración. Queda
**quién** la tomó, **cuándo** y con **qué justificación**, en `REGISTRO-RIESGO.md`,
**append-only**.

### Dos registros, un solo criterio

| Registro | Ámbito | Su mecanismo |
|---|---|---|
| `REGISTRO-RIESGO.md` (este) | **Proyecto** | El verificador comprueba que existe y que las entradas están firmadas |
| `businessos/gobernanza/registro-decisiones-riesgo-buzon.md` | **Buzón agéntico** | La tabla `buzones` **rechaza** una fila en modo abierto sin `riesgo_firmado_por` |

El de proyecto **supersede en alcance, no borra**, al del buzón. El del buzón conserva su
constraint de base de datos — que es su mecanismo, y lo único que lo hace real. Un
registro sin mecanismo es una lista de buenas intenciones; el del buzón es el mejor
ejemplo del repo de cómo se hace bien.

### El límite: riesgos infirmables

C5 no es una llave maestra. **El dueño acepta riesgos propios, no los de otros.** Cuando
el daño recae sobre terceros que nunca firmaron —datos personales de clientes, dinero
ajeno, seguridad de un usuario final— **ninguna firma lo autoriza: se rediseña o no se
hace.**

Ahí no se ofrece la vía del registro, porque ofrecerla sugiere que una firma bastaría.
Pero sí se explica por qué esa clase es distinta: una negativa sin motivo se lee como
capricho, y entonces se hace por fuera, que es el peor desenlace.

Se cruza con C4: si un riesgo necesita AISIA, probablemente no sea firmable con C5.

Siempre exigen entrada firmada:

1. Poner algo en producción con un control conocido pendiente.
2. Ampliar permisos de un agente o un rol.
3. Usar `service_role` en una superficie de negocio (C7).
4. Desactivar o saltarse un gate, aunque sea "temporalmente".
5. Subir límites de gasto o de cuota por encima de los defaults.
6. Habilitar cualquier acción irreversible sin gate humano.

> **Visibilidad**: este registro describe deuda de seguridad real de un sistema con
> tenants, rutas y credenciales concretas. Revisarlo **antes** de publicar el repo o de
> entregar a un cliente.

---

## 7. C6 · Procedimiento de incidente

**Contención → clasificación → cierre.** Formato general en `plantillas/incidente.md`;
los incidentes se registran en `INCIDENTES.md` (append-only).

> **Para el vector de inyección por correo, la fuente es
> `businessos/gobernanza/procedimiento-incidente-inyeccion.md`**, que ya define sus cuatro
> disparadores y su gate `canario_ausente`. Ese documento manda en su dominio; éste cubre
> el resto del sistema (fugas, roturas, cobros, acciones irreversibles no autorizadas).

- **Contener primero**: ante la duda se pausa. Reanudar es barato; un correo enviado, un
  dato filtrado o un deploy roto no se deshacen.
- **Congelar la evidencia** antes de tocar nada. El primer parche la destruye.
- **El paso que no se salta**: todo incidente termina con **un caso nuevo en la regresión**
  (C2) y una entrada en Aprendizajes de `CLAUDE.md`. Cuando ningún gate lo cazó, el cierre
  incluye **el gate nuevo**, con su prueba y su caso negativo.

> Un incidente cerrado sin caso de regresión no está cerrado: está olvidado, y volverá en
> el próximo cambio de modelo.

---

## 8. C7 · La regla `service_role` / RLS

**El hecho incómodo**: en Supabase `service_role` tiene `BYPASSRLS`. Las políticas RLS
**no lo detienen. Ninguna.** Mientras una superficie conecte con esa llave, el aislamiento
entre clientes vive **exclusivamente** en el código de la aplicación.

> **La fuente es `businessos/gobernanza/decision-service-role.md`** (2026-08-05, decidida,
> con disparador duro). Su regla es casi literal a este control, y trae la consulta SQL de
> incumplimiento. Es **el control mejor cubierto** de los siete en este repo.

Habilitar RLS igual es obligatorio y compra tres cosas, todas necesarias y ninguna
suficiente: el dato queda etiquetado, las políticas quedan puestas y probadas para el día
que la app cambie de rol, y la deuda no crece en silencio.

**Reglas**

1. Las superficies de negocio **no usan `service_role`** para dato de negocio. Usan la
   llave anónima con sesión de usuario, y RLS hace el trabajo.
2. `service_role` queda para lo que de verdad lo necesita: migraciones, webhooks
   verificados y jobs de plataforma que operan *sobre* todos los usuarios. Cada uno
   **declarado**, no heredado.
3. `SUPABASE_SERVICE_ROLE_KEY` jamás se expone al cliente ni lleva prefijo `NEXT_PUBLIC_`.
4. **El disparador no es una fecha: es el alta del segundo tenant.** Con un solo tenant no
   hay dato ajeno que filtrar; el riesgo nace exactamente en el alta del segundo, y ahí ya
   es tarde para diseñar.
5. La prueba vive **del lado de la aplicación**: la base no puede verificar quién se
   conectó con qué llave.

> **Estado real hoy**: producción tiene **un solo tenant**; los dos nombres que aparecen en
> las pruebas de aislamiento son fixtures del esquema efímero. El trabajo de C7 es
> **preventivo e instrumental**, no una migración de emergencia — y los dos gates que
> faltan (detector del segundo tenant, test de arquitectura) son justo los que avisan
> cuando deje de serlo.

---

## 9. Principios rectores

No negociables. Aplican más allá de los siete controles, y varios ya son doctrina escrita
de este repo — aquí quedan en un solo sitio.

| Principio | Qué significa en la práctica |
|---|---|
| **Verificar antes de confiar** | Las salidas del LLM no se confían por diseño. Quien verifica re-ejecuta los gates de cero, no relee la conclusión. |
| **Un control no probado no cuenta como control** | Un respaldo no probado no es un respaldo. Un gate que nunca se ha visto en rojo no informa. |
| **Control negativo, no solo positivo** | Toda garantía se demuestra también con algo que **DEBE fallar**, y el fallo esperado se anota. |
| **Si depende de que nadie se equivoque, es una costumbre** | Se prefiere la separación estructural sobre la configuración correcta. (Este repo lo aprendió con el worker "serial por construcción" que necesitó un `asyncio.Lock`.) |
| **Una doctrina sin gate es una costumbre** | Aprendizaje propio, 2026-08-02. Antes de dar una regla por vigente, pregunta qué la haría fallar en rojo — y si nada puede, no está vigente. |
| **Todo best-effort imprime** | Un fallo que nadie loguea es un fallo **invisible**, y lo invisible es lo que muerde en producción. (El `git fetch` fantasma, 2026-07-13.) |
| **Mergeado ≠ corriendo** | Una migración, un seed o un `AGENTS.md` en `master` no están aplicados. El runtime se verifica, no se supone. |
| **La fatiga se combate con diseño** | Diffs chicos y banderas primero, no regaños al aprobador. |
| **Un control escrito solo en el documento no dispara** | El documento explica; las reglas obligan. Por eso C1–C7 se cablean a `CLAUDE.md`, `prp-base.md` y CI, no solo aquí. |
| **El documento y el código son un solo cambio** | Cambiar un gate sin declararlo aquí deja el papel y el sistema divergentes. Por eso existe §11. |

---

## 10. Qué NO está en esta capa (y cuándo entra)

Esto es **etapa 1: AIMS-lite**. Lo siguiente se activa por **disparador comercial**
(primer cliente enterprise, marca blanca en producción, sector regulado), nunca por
calendario. `adenda-iso42001.md` lo desarrolla.

- Auditoría interna formal y cierre de no-conformidades.
- Statement of Applicability completo de los 38 controles del Anexo A de ISO/IEC 42001.
- Certificación acreditada (2 etapas + vigilancia anual).
- Registro formal de proveedores de IA con evaluación.

### Y lo que queda fuera **por alcance declarado**

`businessos/` es el **79 % del repositorio** (1357 de 1723 archivos) y `ci.yml` solo cubre
el dashboard de la raíz: **97 archivos de pytest y 55 pruebas de los frontends no corren
en ningún CI**. Extender el gate a cuatro quintos del sistema de golpe lo haría nacer
rojo, y un gate que nace rojo se desactiva.

Por eso se cablea la raíz y `.claude/` ahora, el corpus del buzón es el **primer y único
puente** a `businessos/`, y **el resto queda declarado como riesgo aceptado firmado** en
`REGISTRO-RIESGO.md`, con fecha de revisión. Declararlo no es taparlo: es la diferencia
entre una laguna con dueño y una laguna en silencio.

---

## 11. Verificación de esta capa

Esta capa se verifica a sí misma:

```bash
npm run verify:gobernanza
```

Falla (exit ≠ 0) si el papel y el código divergen: si falta un control, si `CLAUDE.md`
dejó de referenciar la gobernanza, si `prp-base.md` perdió sus secciones, si una plantilla
referenciada no existe, o si un identificador de caso aparece en el árbol de trabajo.

Va incluido en:

```bash
npm run validate     # typecheck + lint + build + verify:gobernanza + regresion
```

Y **su casa es el CI**: Hermes despliega por Vercel y por Docker, no por `npm run deploy`.
El job de `.github/workflows/ci.yml` que corre estos comandos en cada PR a `master` es el
equivalente al `predeploy` de otros proyectos. Un gate que no está en la ruta de deploy no
es un gate.

> Aplicando el principio de §9: este verificador se prueba con **control negativo** — se
> rompe un cable a propósito y se confirma que falla, nombrándolo. Un verificador que
> siempre pasa porque no verifica nada aprobaría igual.

---

*Documento vivo. Los incidentes reales lo corrigen. El mismo error nunca sorprende dos veces.*
