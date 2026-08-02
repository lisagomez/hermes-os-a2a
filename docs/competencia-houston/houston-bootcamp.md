# Bootcamp de Houston, "Construye agentes de IA para tu empresa, de 0 a 1" (2026-08-01)

> **Qué es este archivo y por qué está en el repo.** Houston (`https://gethouston.ai`) es un
> competidor directo de Hermes OS · A2A, y **su propio CEO lo dice en público**. El 1 de agosto de
> 2026 dieron un bootcamp abierto de 5 horas ante más de 500 asistentes de toda Latinoamérica: cinco
> horas del CEO y el CTO de un competidor mostrando su arquitectura, sus precios, su stack real de
> herramientas, su programa de canal y su máquina de adquisición completa. Este documento es el
> **análisis** de esas 5 horas, con la **transcripción íntegra anexada al final** para que cualquier
> cita se pueda verificar sin depender de nadie.
>
> **La frase que ordena todo** [0:45:38]: *"Hermes tiene otros protocolos de automemoria, tiene
> protocolos de automejorarse... Hermes es una carrocería, Hermes es como Houston."* Y en la encuesta
> de apertura [0:26:00], **95 de ~460 asistentes** dijeron haber oído hablar de OpenClaw/Hermes.
>
> **Los cuatro del equipo estuvimos conectados**, así que todo lo de aquí se puede contrastar con lo
> que cada uno oyó en vivo.

## Cómo leerlo

| Si quieres... | Ve a |
|---|---|
| **Qué implica para a2a** | la sección **ATERRIZAJE A a2a**, justo abajo. Si solo lees una parte, esa |
| La respuesta del CTO sobre credenciales y prompt injection | sección **12.6** |
| Precios, licencias y el programa de partners | secciones **13** y **12.12** |
| Lo que dijeron textual, para verificar una cita | el **ANEXO: transcripción íntegra**, al final |

**Las marcas de tiempo.** Cada `[h:mm:ss]` es el punto de la grabación donde se dice o se muestra lo
que está al lado. No son enlaces: la grabación es un archivo, no un video publicado. **Ojo al buscar
en el anexo:** la transcripción numera en **minutos acumulados** (`[300:24]` = 5h 00m 24s), no en
`h:mm:ss`. Para cruzar hay que convertir: `1:23:30` de este análisis es `[83:30]` en el anexo.

**Cómo se produjo.** Transcripción local del audio con whisper `large-v3-turbo` (sin corregir a
mano), más 234 fotogramas de la pantalla compartida para lo que se mostró y no se dijo. El análisis
es una lectura completa y en orden de las 15.252 líneas de la transcripción, no un resumen
automático.

> **Frontera.** Este documento se preparó para el repo: no lleva contexto personal ni financiero de
> nadie del equipo, ni datos que identifiquen a otros asistentes del bootcamp más allá del nombre de
> pila con que intervinieron en público. Las citas son de un evento abierto por inscripción, no
> material filtrado.

---

## Lo que hay que saber si solo lees una cosa

1. **La definición que ordena todo:** chatbot **responde**, co-worker **asiste**, agente **hace el
   trabajo**. La diferencia no es el modelo, es si ejecuta acciones en tus sistemas y tú gestionas
   resultados en vez de pasos. [0:39:02]
2. **Todo agente tiene 5 piezas:** identidad, habilidades, herramientas, memoria y el modelo.
   Ese es el esqueleto del método completo. [0:41:18]
3. **La mejor forma de crear una habilidad no es escribirla, es trabajar acompañando al agente y
   después decirle "conviértelo en una habilidad".** [0:55:30]
4. **Orden para conectar herramientas: ¿existe MCP? úsalo. ¿No hay? mira si hay CLI. ¿Tampoco? ahí sí,
   API.** [1:04:54]
5. **Más ventana de contexto no es más memoria.** Un estudio con 18 modelos muestra que todos empeoran
   a medida que crece la entrada, mucho antes de tocar el límite. [1:14:56]
6. **Regla de oro operativa: un agente nuevo no manda nada solo. Primero propone, tú revisas y
   apruebas.** [1:49:46]
7. **La demo que prueba el punto:** el agente extrajo **264 comentaristas** de un post de LinkedIn a
   una hoja de cálculo, en vivo, en unos 9 minutos. [1:39:16 a 1:48:08]

---

## DOCUMENTO HERMANO: la auditoría de seguridad de su código

> **Antes de usar este documento para decidir algo, lee también su hermano en esta misma carpeta:**
>
> ```
> docs/competencia-houston/Auditoria de seguridad - Houston (gethouston.ai).md
> ```
>
> Es la **auditoría de seguridad del repo público de Houston** (`github.com/gethouston/houston`),
> hecha el 2026-07-25 con 6 agentes en paralelo. Veredicto **SOSPECHOSO** (no malicioso): 7
> hallazgos, tres de severidad ALTA. El #1 es directamente relevante aquí: **guardan su propia copia
> del payload de Composio, con `apiKey`, en una tabla de Supabase sin RLS ni REVOKE**, a diferencia
> de tablas hermanas del mismo repo que sí lo hacen.
>
> **Los dos se complementan y hay que leerlos juntos:** la auditoría mira **el código** y dejó
> abierta la pregunta de si el proceso del agente puede leer el token en ejecución; este documento
> trae **la respuesta pública del CTO** a esa pregunta exacta (sección 12.6), más los precios, la
> arquitectura declarada y el motor comercial, que el código no muestra.
>
> **Ojo con el sesgo de fuente:** lo de allá es evidencia leída del código; lo de aquí son
> afirmaciones verbales de los fundadores en un evento de venta. **No pesan igual.**

## ATERRIZAJE A a2a

> Lo de abajo es **mi lectura**, no lo que dice Felipe. Lo que él dice va citado y con marca de tiempo
> en el cuerpo del destilado. Separo las dos voces a propósito.

### A. Dónde queda a2a frente a Houston

Houston se ubicó a sí mismo contra ustedes [2:55:11] y reclamó dos fosos: **arrancar multijugador** y
**estar enfocado 100% en no técnicos**. Los dos son atacables:

- **El multijugador no está en el plan gratuito.** Julián lo corrige en vivo [4:10:30]: el espacio
  personal, que es el gratis, **no tiene colaboración**. O sea, el foso es una función de pago, no una
  propiedad de la arquitectura. Y si a2a es Telegram-first, la colaboración viene incluida por el
  medio: un grupo de Telegram ya es multijugador sin construir un tablero Kanban.
- **"Enfocado en no técnicos" les costó la versión local.** Migraron a la nube porque *"a muchas
  personas no les estaba funcionando el local por sus computadores"* [2:26:52]. Es una concesión, no
  una ventaja: perdieron el acceso a archivos locales del usuario, y lo declaran como deuda a
  recuperar. Telegram evita ese problema entero.

**Lo que sí tienen y a2a no:** la **tienda de agentes** con importación de un clic y revisión
anti-injection [3:32:22], el catálogo de **9.000+ skills "Powered by Vercel"** [1:35:32], y **~1.000
integraciones compradas a Composio**. Las tres son fosos de distribución, no de tecnología, y dos de
las tres son compradas.

### B. Lo que contradice supuestos nuestros (la parte más incómoda y la más útil)

1. **Local-first tiene un costo de adopción que todavía no hemos pagado.** Houston era una app local
   y **la abandonó al chocar con usuarios no técnicos a escala**: *"a muchas personas no les estaba
   funcionando el local por sus computadores"* [2:26:52]. Lo declaran como deuda a recuperar, no como
   mejora. Para a2a, que apunta a marca blanca para empresas, es un dato duro y no una anécdota: la
   pregunta que deja abierta es si **resolvemos** el soporte de lo local o lo **evitamos** como ellos.
2. **"Un agente = un rol" es su heurística explícita, y va contra el agente generalista** [1:01:35]:
   meter habilidades de áreas distintas produce *un agente general con peores resultados*, y lo
   correcto es pensar por roles (un vendedor, un asistente contable). Si nuestro diseño mete muchas
   capacidades en un mismo agente, la defensa tiene que ser consciente y no asumida: carga perezosa
   por descripción (su propio modelo de 3 niveles). **Si alguna vez el ruteo por descripción falla,
   su objeción se vuelve nuestro síntoma.**
3. **Composio es la pregunta de responsabilidad, no solo de seguridad.** Ellos resolvieron las
   integraciones **comprando** un custodio de credenciales de terceros. Para a2a, que manejaría
   credenciales de CLIENTES, la pregunta no es solo "¿es seguro?", es **"¿de quién es la
   responsabilidad cuando no lo sea?"**. Se les pidió el contrato y la política de datos de Composio
   en público [3:18:27] y **no han llegado**.
4. **Confirma tres cosas que ya suponíamos**, y confirmarlas desde afuera vale: que más ventana de
   contexto no es más memoria [1:14:56]; que **un agente nuevo propone y el humano aprueba** antes de
   actuar [1:49:46]; y que el guion largo delata texto de IA [1:17:37].

### C. Accionables concretos

1. **Cobrar el contrato de Composio.** Es un compromiso público de Julián hacia ti [3:18:27]. Si a2a
   evalúa comprar la capa de integraciones, ese documento es el insumo; si no, sigue siendo debida
   diligencia sobre a quién le estás dando acceso.
2. **La superficie de prompt injection en runtime está sin respuesta pública.** Houston tiene el gate
   de importación de la tienda, no el de ejecución. **Si a2a resuelve y demuestra la contención en
   tiempo de ejecución, es un diferenciador real frente a un competidor al que ya le preguntaron en
   público delante de 500 personas y contestó la mitad.**
3. **Anclas de precio para la conversación de pricing de a2a:** 15 a 25 USD por licencia; mínimo
   empresarial 2.500 USD/año; programa pymes 299 USD/año hasta 20 licencias; implementación de 4
   agentes 10.000 USD (promo 2.500, reserva 500); mantenimiento 500 USD/mes.
4. **El motor de adquisición es replicable y está medido**, y es lo mejor construido del negocio:
   bootcamp gratis de 4h → post en vivo pidiendo comentar una palabra → el propio agente prospecta a
   los comentaristas en pantalla → grupo de WhatsApp antes de cerrar Zoom. Números: **500+ asistentes,
   264 prospectos en 9 minutos, 215 comentarios en 2 minutos, 328 personas al WhatsApp**. El demo *es*
   el anuncio.
5. **Mirar Chroma ya, no "vigilarla".** Es lo más relevante del video para el grafo regulatorio de
   Hermes: colombianos, ya conectados a **Rama Judicial, SECOP, Superfinanciera, Registraduría,
   Policía Nacional, Contraloría y RUNT** [4:52:41], vendido como integración lista. Dos lecturas
   opuestas y hay que elegir: **o es un proveedor que le ahorra a a2a construir los conectores del
   Estado colombiano, o es quien se está quedando con esa capa antes que ustedes.** Houston ya eligió:
   los integra y hace taller conjunto.
6. **El modelo de canal de Houston es replicable y conviene entenderlo** [4:57:58]: el partner se queda
   con **el 100% de la implementación** y Houston cobra la licencia recurrente más una comisión. Si
   a2a es marca blanca, ese es exactamente el modelo natural, y Houston ya lo tiene armado y con
   partners entrando.
6. **Robarse el stack anti-baneo**: Anakin.io y kernel.sh para navegación a nivel de red. Aplica a
   cualquier cosa que a2a quiera automatizar contra plataformas con antibots.

### D. Qué NO cubre este destilado

- **La lectura E2E está completa:** las 15.252 líneas del transcript, de `[00:10]` a `[300:25]`, leídas
  en orden por el agente principal, sin delegar la comprensión. Ningún tramo quedó sin cubrir.
- **No vi el deck completo**: son 49 páginas y en pantalla aparecieron ~25. Lo que no se mostró, no se
  destila.
- **No verifiqué ninguna afirmación de Houston contra fuente independiente.** Los certificados SOC 2 e
  ISO 27001, el millón de dólares levantado, las 9.000 skills y los "400 modelos" son **lo que ellos
  dicen**, no lo que yo comprobé.
- **No cubre el chat de Zoom completo**, solo lo que quedó visible en los frames y lo que Felipe leyó
  en voz alta.

---

## 1. Apertura y calentamiento [0:00:00 a 0:31:00]

Media hora de sala llenándose. Felipe deja entrar gente y calienta con una encuesta de Mentimeter
(`https://www.menti.com/alio7mmqnyja`, código 1315 8562) mientras la asistencia sube: 256 personas a
los 90 segundos [0:01:24], 360 a los 5 minutos [0:05:25], 422 a los 9 [0:09:47], y pasa de **500 en
Zoom** hacia el minuto 27 [0:26:52].

Lo que sale de la encuesta, que es el retrato de quién asiste:

- **De dónde:** Bogotá, Cali, Bucaramanga, Medellín, Cartagena, Chía, Barichara, Querétaro,
  Guadalajara, Ciudad de México, Playa del Carmen, Panamá, El Salvador, Caracas, Maracaibo, Quito,
  Lima, Santiago, Dallas, Chicago, Miami, Sri Lanka, Brisbane y Sídney. [0:16:21], [0:18:33]
- **Roles:** docente, contador, auxiliar contable, CEO, comercial, consultor, gerente, director,
  ingeniero, founder, software developer, arquitecto. Público mayoritariamente **no técnico**.
  [0:19:00]
- **Qué quieren automatizar** (la lista más útil del bloque, es la demanda real del mercado
  latinoamericano en una pantalla): prospección y búsqueda de leads, cotizaciones y propuestas
  comerciales, conciliación de cuentas, causar facturas de compra, cierre contable, registro de
  gastos, cuentas de cobro, atención al cliente, gestión de correo, reclutamiento, agendamiento de
  citas, generación de informes y reportes, avances de obra, cronogramas de proyecto, creación de
  contenido y campañas, publicar en LinkedIn. **Prospección y cotizar son los dos que más se
  repiten.** [0:20:46 a 0:22:23]
- **Qué usan hoy:** Gemini es el más conocido; en uso diario ganan ChatGPT y Claude, seguidos de
  Copilot (que Felipe no había puesto como opción y salió mucho por el chat). Minoría "hacker"
  mencionando Kimi, Qwen, DeepSeek y Llama. [0:25:53], [0:29:51]

**Preguntas de logística que ya se responden aquí:** se puede con cuenta paga de Gemini pero recomienda
ChatGPT o Claude [0:07:26]; Houston **no funciona en iPad, necesita computador** [0:11:56]; la alerta de
virus al instalar en Windows es normal porque el certificado es reciente [0:28:12]; Houston estaba en
**beta cerrada con código de invitación** y ese día lo abren para los asistentes [0:27:40].

## 2. Quiénes son, la promesa y las reglas del juego [0:31:00 a 0:38:40]

- **Los fundadores:** dos colombianos en San Francisco. Felipe Salinas viene de Mastercard, Red Bull y
  el fondo Latitud; **Julian Arango** es ingeniero y filósofo de la Universidad Nacional, y antes de
  Houston era Machine Learning Engineer Lead en una empresa de videojuegos en Los Ángeles. [0:32:45]
- **Tracción declarada:** llevan **dos años** en Silicon Valley, levantaron **cerca de un millón de
  dólares**, equipo en Latinoamérica, y **lanzaron Houston en Boston hace unas ocho semanas**
  (o sea, alrededor de junio de 2026). Cobertura de Forbes Colombia: "Colombianos lanzan en Harvard una
  plataforma para crear agentes de IA sin programar". [0:33:31], [0:32:45]
- **La promesa:** salir con un agente funcionando **y** con el método para construir cualquier otro,
  sin saber programar. Textual: más que copiar y pegar sus cosas, darles el marco de pensamiento para
  sentarse con su equipo. [0:34:26]
- **El bono por quedarse hasta el final:** el agente de Felipe con todas sus skills y herramientas,
  certificado de participación, **75 dólares de crédito en Apify** más créditos de OpenRouter (el deck
  dice **85 USD en total**), y la guía y la grabación. [0:35:02]
- **Los acuerdos, y el más honesto de ellos:** "esto no es un podcast", participar activamente, ser
  curiosos, y **avisar de frente que va a vender**. Textual: *"Mi apuesta es que yo les dé tanto valor
  en estas 4 horas que ustedes digan, ok, es justo que nos cuente de su empresa 10 minutos."*
  [0:37:35]

## 3. Desmitificar la palabra "agente" [0:38:52 a 0:41:10]

El bloque que más ordena el vocabulario. Tres categorías, y la industria las mezcla todas:

| | Qué hace | Quién manda | Ejemplos que él da |
|---|---|---|---|
| **Chatbot** | Responde preguntas. Reactivo y **sin memoria** | Tú preguntas | ChatGPT, Claude y DeepSeek cuando se usan solo como chat |
| **Co-worker** | Asiste: toma acción con herramientas, pero **tú revisas** cada salida | Tú eres el piloto | ChatGPT Work, Claude Cowork, Gemini Spark |
| **Agente** | **Razona, decide y ejecuta** a través de tus sistemas. Gestionas resultados, no pasos | El agente, en piloto automático | Houston, Claude Code usado automatizado, Hermes, OpenClaw |

Su predicción, marcada como tal: **"en los próximos 24 meses todas las personas del planeta van a tener
un agente de IA trabajando con ellas"**, y la razón que da es que los tres laboratorios grandes
(Anthropic, OpenAI, Google) ya están lanzando agentes o herramientas para construirlos. [0:40:50]

Aclaración útil del chat: **n8n no entra en ninguna de las tres**, es una plataforma de automatización
de pasos rígidos. [0:41:08]

## 4. La anatomía: las 5 piezas y la analogía del carro [0:41:18 a 0:45:25]

**Todo agente se compone de cinco cosas:** identidad (quién es), habilidades (qué sabe hacer),
herramientas (qué usa), memoria (qué recuerda) y el modelo de IA (el cerebro que razona y decide).

**La analogía que hay que llevarse, y el frame más valioso de la hora teórica** [0:43:33]:

> Un aplicativo para crear agentes es **un carro**. El modelo de IA es **el motor**. Un carro no es
> solo el motor: es el volante (**la identidad**, que decide a dónde va), la palanca de cambios (**las
> habilidades**, las maniobras que sabe ejecutar), las ruedas (**las herramientas**, donde el agente
> toca la calle, o sea tus aplicaciones) y el tablero con el GPS (**la memoria**). *"La terminología
> correcta es un **arnés**, que es lo que está agarrando todo alrededor."*

De ahí sale la respuesta más útil del bloque, porque es la pregunta que todo el mundo tiene [0:44:52]:

| | Arnés (el carro) | Motor (el modelo) | ¿Puedes cambiar el motor? |
|---|---|---|---|
| **Claude Cowork** | Cowork | Claude Code, de Anthropic | **No.** El arnés es del dueño del modelo |
| **Houston** | Houston | El que tú le pongas, más de 400 | **Sí**, y hasta uno distinto por cada chat |
| **Hermes / OpenClaw** | Sí, son arneses | Configurable | Sí |

Su argumento comercial completo cabe en una frase: **"Houston no le pertenece a ningún laboratorio de
IA, entonces ustedes le pueden cambiar el motor a su gusto."** [0:45:15]

Sobre Hermes, preguntado por un asistente: comparte los mismos principios que Cowork, pero **Hermes
trae protocolos propios de auto-memoria y de auto-mejora**; es un arnés, como Houston. [0:45:38]

## 5. Pieza 1, la identidad: dónde se juega la calidad [0:46:30 a 0:49:45]

Una buena identidad tiene **cinco ingredientes: rol, comportamiento, reglas duras, vocabulario y
tono**. Y la razón por la que importa: *"esto es lo que hace que dos agentes con el mismo modelo se
sientan totalmente distintos"*. [0:46:45]

El contraste que muestra en pantalla es el material más copiable de toda la sesión [0:47:28]:

**Malas instrucciones** (falla porque no tiene alcance, ni reglas, ni vocabulario; el agente se
inventa precios y manda correos que no aprobaste):
```
# Agente de ventas
Eres un agente de ventas.
Ayúdame a conseguir más clientes.
Escribe correos de prospección.
Sé profesional.
```

**Buenas instrucciones** (la estructura, con el contenido real de su agente):
```markdown
# Operador comercial
## Rol            Prospección, pipeline, reuniones, propuestas y CRM.
## Comportamiento Redactas. Nunca envías. Si te falta un dato, preguntas una sola vez.
## Reglas duras   Nunca envías un correo sin mi aprobación. Nunca mueves etapas del CRM
                  ni cambias precios. Si la fuente es débil, marcas TBD. No inventas.
## Vocabulario    VERDE = asignar. AMARILLO = nutrir. ROJO = soltar.
                  Cliente ideal = empresas de 20 a 200 empleados.
## Tono           Directo, sin tecnicismos. Sin nombres de archivos.
```

Dónde vive en el producto: pestaña **Configuración > Instrucciones** del agente. [0:48:36]
Aclaración del chat: hoy la identidad **se define por agente, no por organización**, aunque una empresa
puede crear un agente y compartirlo con sus colaboradores. [0:47:53]

## 6. Pieza 2, las habilidades: el corazón del método [0:49:47 a 1:01:10]

**Qué es, sin misticismo:** *"una habilidad o una skill no es más que un archivo de texto con
instrucciones. El agente lo lee cuando lo necesita."* [0:51:05]

**Los tres niveles de carga** (y por qué importan para el consumo de tokens) [0:51:17]:

1. **Nombre y descripción.** Es lo único que el agente lee **siempre**, y con eso decide si usa la
   habilidad o no. *"Hay que ser súper intencionales en hacer esto."*
2. **El cuerpo, el archivo `SKILL.md`.** Se carga **solo cuando la habilidad se activa**. Reglas,
   proceso y ejemplos. **Menos de 500 líneas.**
3. **Recursos opcionales.** Plantillas y documentos de referencia que se leen solo bajo demanda,
   *"para que no se esté consumiendo tokens mientras ustedes están hablando con su agente"*.

**Cómo se crea una habilidad, en orden de preferencia:**

- **La mejor forma es trabajando, no escribiendo** [0:55:08]. Paso 1: haz el trabajo con el agente la
  primera vez, no lo delegues, acompáñalo. Paso 2: dale feedback en el momento ("faltó el
  responsable", "así no"), y cada corrección se vuelve regla. Paso 3: dile literalmente **"guarda esto
  como un skill"** y él la escribe con todo lo que aprendió. Dato de producto: cuando una tarea
  termina, Houston lee el chat y va convirtiendo lo aprendido en habilidades. [0:56:22]
- **La segunda mejor es darle los documentos que ya tienes** [0:58:14]: manual de procedimientos, guía
  de inducción del practicante, plantillas, checklists, políticas de calidad. Súbelo tal cual y pídele
  que lo vuelva habilidad. La frase que resume el argumento de venta a una empresa: **"Casi todas las
  empresas ya tienen algún proceso escrito. Lo que no tienen es quién lo ejecute igual todas las
  veces."** [0:58:41]
- **Y el paso que la gente se salta: agrega lo que el papel no dice** [1:00:00]. *"El modelo ya es
  inteligente, no le repitan lo que ya sabe. El modelo ya sabe qué es un acta; lo que no sabe es cómo
  se escribe un acta en la empresa de ustedes."* Las excepciones y el criterio son el aporte humano.

**La heurística de alcance, que responde la pregunta de arquitectura del día** ("¿un agente con muchas
skills o varios agentes?") [1:01:35]: piénsalo como contratar a una persona. Si le metes habilidades
de áreas distintas **terminas con un agente general y los resultados empeoran**. La recomendación es
**pensar por roles**: un vendedor, un asistente contable, alguien de marketing.

**Sobre tokens y ventana de contexto** [0:52:57]: la ventana es la capacidad por chat, hoy llegando al
millón de tokens en los modelos grandes; cada mensaje, archivo y skill cargada la consume. El límite
lo pone el modelo, no Houston. Y confirmado en el chat: **el agente compacta cuando la ventana se
llena**, no la deja desbordar. [1:01:25]

Consejo sobre sesiones largas, respondiendo a un asistente que pregunta si son 4 horas o minutos
[0:57:24]: *"yo me he pasado 48 horas seguidas trabajando con la IA"*, pero no dependa de las horas
sino del contexto. Haz **algo muy específico y conviértelo en habilidad**; después puedes pedirle que
funda varias habilidades en una grande.

## 7. Pieza 3, las herramientas: API, MCP y CLI [1:03:56 a 1:10:33]

*"Sin herramientas, su agente es un chatbot glorioso."* [1:04:15]

| Protocolo | Qué es | A favor | En contra | Cuándo |
|---|---|---|---|---|
| **API** | La conexión cruda: le das dirección y llave, el agente llama directo | Casi toda app tiene una; control total; sirve para tus sistemas internos | Hay que programarla y mantenerla; se rompe cuando la app cambia | Cuando **no existe** un conector listo |
| **MCP** | El enchufe universal. **Lo inventó Anthropic y se volvió estándar de industria**; lo adoptaron OpenAI, Google y los demás. La app se presenta sola | Lo conectas una vez y sirve para cualquier agente y cualquier modelo; es lo más fácil para alguien no técnico | Alguien tiene que ofrecer el servidor; **con muchos MCP conectados el agente se confunde** | **Por defecto. Si existe, úsalo** |
| **CLI** | Comandos a la terminal del computador | Ya está instalado y con la sesión abierta; rápido y potente | Necesita un computador con acceso; **más riesgo: puede borrar cosas por error** | Tareas técnicas o cargas masivas de datos |

**La regla de orden, textual: "¿Existe un MCP? Úsenlo. ¿No hay? Mírense si hay un CLI. ¿Tampoco? Ahí
sí, una API."** [1:09:10]

Matiz honesto que él mismo introduce [1:07:19]: hay un debate abierto sobre MCP, porque **se comen
muchos tokens al estar siempre conectados** aunque solo se necesiten a ratos. Los protocolos están
migrando rápido.

**En Houston:** pestaña Integraciones, cerca de 1.000 apps con login de un clic (Notion, Slack,
Shopify, Outlook, Asana, Facebook, LinkedIn, Instagram). Lo que no esté, se agrega por **"integración
personalizada"**: se abre un chat, le pasas la URL de la documentación de la API y **lo conectas en
lenguaje natural**, sin programar. [1:09:22]

Y el cierre del bloque, que es la observación más valiosa para alguien que ya sabe de esto:
**"El problema no es conectar las herramientas. El problema es saber cuáles existen."** [1:10:33]

### 7.1 Su stack real de ventas, herramienta por herramienta [1:10:50 a 1:13:30]

Lo comparte explícitamente para que nadie reinvente la rueda. **"Hagan que sus agentes funcionen con
las herramientas que ya existen. No se pongan a inventarse todo un CRM."**

| Función | Lo que él usa | Alternativas que menciona |
|---|---|---|
| Scraping web | **Apify** (más de 1.000 "actores"; extrae de cualquier sitio aunque no tenga API) | |
| Enriquecimiento de datos (correo, cargo, empresa, teléfono) | **Apollo** | Hunter, FullEnrich, Lusha, Clay |
| CRM | **HubSpot** | Salesforce, Data CRM, Asana, Monday |
| Secuencias de correo en frío | **Instantly** | Secuenciadores de HubSpot, de Apollo, LeadShark |
| Responder lead magnets de LinkedIn | **LeadShark** (cuando alguien comenta su post, arma campaña y responde por interno) | |
| Secuencias en LinkedIn (invitar, mensajear, seguimiento) | **Waalaxy** | |

Por qué usa LeadShark en vez de construirlo: *"para no tener que crearme una habilidad ni ponerme a
ver cómo eran los temas de seguridad con LinkedIn"*. Es un criterio de comprar-vs-construir aplicado.

**Seguridad, lo que afirma** [1:13:38]: las ~1.000 integraciones vienen preconectadas con **SOC 2** e
**ISO 27001 en la capa de integración y datos**, y declara **cero retención de datos**: *"nosotros no
vemos nada de eso"*. (El detalle de cómo lo implementan, vía Composio, sale más tarde en el chat, ver
sección 11.)

## 8. Pieza 4, la memoria: el bloque con mejor argumento técnico [1:14:15 a 1:20:26]

**La distinción central:** la ventana de contexto **no es memoria**. La analogía que usa: es una
persona con amnesia que solo retiene un millón de tokens; le cuentas tu vida y al llegar al límite te
dice "hola, ¿cómo estás? me llamo Felipe" otra vez. [1:15:00]

Tres cosas que hay que saber, y la segunda es contraintuitiva:

1. **Qué es la ventana:** todo lo que el modelo ve de una vez, junto: conversación, documentos e
   instrucciones. Los modelos grandes rondan el millón de tokens.
2. **Más ventana no es mejor memoria.** *"Inclusive hay unos que son hasta peores, porque ya almacenan
   tantas cosas que comienzan a no retener de la manera indicada."* El deck respalda esto con un
   estudio de **18 modelos que empeoran a medida que crece la entrada, mucho antes de tocar el
   límite**, incluso en tareas triviales. [1:14:56]
3. **Se borra al cerrar la sesión.** *"Ese escritorio se despeja todas las noches."*

**Las tres formas de darle memoria de verdad**, de menos a más sofisticada:

| Forma | Quién la usa | A favor | En contra |
|---|---|---|---|
| **Archivos de memoria** (texto plano) | **Houston, OpenClaw, Hermes** | Es tuyo, lo abres y lo corriges, y **te lo puedes llevar** | Cabe poco; hay que ser específico; un archivo suelto no sabe de los otros |
| **Memoria del producto** | ChatGPT, Claude | Cero configuración; la ves y la borras desde ajustes | Vive en el servidor del proveedor, es caja negra; **en Claude toca activarla, no viene por defecto** |
| **Segundo cerebro** | Obsidian, Supermemory | Guarda mucho más; Obsidian dibuja el grafo de relaciones entre archivos | **El grafo lo tejes a mano** |

**El dato incómodo que dice en voz alta** [1:18:51]: en las versiones **gratuitas** de ChatGPT y Claude
*"están entrenando sus modelos con todo eso que aprenden de ustedes"*; en las versiones de Teams y
profesionales, no.

**Portabilidad, y es un compromiso concreto:** *"el día que ustedes se quieran ir de Houston, se pueden
descargar toda su memoria y se la llevan al lugar que quieran."* [1:18:00]

**Ejemplo real de una memoria suya, que vale la pena para ti en particular** [1:17:37]: le enseñó a su
agente que **nunca use guion largo**, ni en chat, ni en correos, ni en publicaciones, ni en documentos,
y que reformule con comas. Su razón textual: *"todo lo que lleva como una rayita en la mitad se ve que
lo escribió IA"*. Es exactamente la misma regla que tú tienes en tu propio arnés, descubierta de forma
independiente.

## 9. Pieza 5, el modelo: por qué un arnés y no un chat [1:20:26 a 1:23:20]

*"Ningún modelo es el mejor en todo. Escojan el mejor para cada tarea."* Con ChatGPT solo usas modelos
de OpenAI; con Claude Cowork solo modelos de Anthropic; con un arnés (Houston, OpenClaw, Hermes)
conectas hasta 400. Proveedores que menciona en pantalla: Google Gemini, GitHub Copilot, Amazon
Bedrock, modelos locales, DeepSeek, Fireworks, Grok, Minimax, Moonshot, Hugging Face, Mistral, NVIDIA.

**Su predicción, y la etiqueta es suya, no mía** [1:22:16]: *"hacia donde yo creo que va el futuro es
que las personas se van a mudar a usar arneses para poder utilizar siempre el mejor modelo, y los
modelos van a ser de código abierto, van a correr local y gratis. Las personas no van a pagar ni
siquiera por IA, pero van a necesitar un arnés."* Vale leerla como lo que es: la tesis de negocio de
alguien que vende el arnés, no un pronóstico neutral. Coincide, eso sí, con la dirección del mercado.

**OpenRouter, la pieza práctica:** una sola cuenta recargada con tarjeta da acceso a más de 400 modelos
(OpenAI, Anthropic, DeepSeek, Mistral, Kimi Code) sin abrir cuenta en cada proveedor. **A los que se
queden hasta el final les dan un código con 10 dólares de OpenRouter.** OpenCode funciona igual, por
suscripción. [1:22:42]

## 10. La demo en vivo: de un post de LinkedIn a 264 prospectos [1:25:00 a 1:48:08]

El momento que justifica el bootcamp entero, y está montado para ser irrefutable: **todo ocurre en
directo, sin nada preparado**, y el material de entrada lo genera la propia audiencia.

**El montaje** [1:26:00]: se toma una foto de la galería de Zoom, publica en LinkedIn ahí mismo, pide
que todos comenten la palabra "HOUSTON", y luego le pide a su agente que prospecte a los
comentaristas. Su razón declarada de por qué lo hace así: *"no porque me encante que todo el mundo
publique en mi LinkedIn, sino porque me gusta que ustedes vean que estas cosas pasan en vivo"*.
[1:27:03]

**El ritmo, que es el dato de marketing** [1:31:45 a 1:34:33]: publica el post, manda el enlace por el
chat de Zoom, y los comentarios suben a **114 en el primer minuto, 190, 214, 243 y 268 cuando lanza el
agente**. En la llamada hay **557 personas** en ese momento.

**La configuración exacta con la que lanza la misión** (esto es lo replicable) [1:36:55 a 1:38:00]:

- **Modo de trabajo:** Houston ofrece tres, *preguntar antes*, *planificador* y **piloto automático**.
  Elige piloto automático a propósito, *"porque quiero que ustedes se lleven la experiencia de cómo
  trabaja un agente de manera autónoma"*.
- **Modelo:** Anthropic, **Opus 5**. Recuerda que ese es "el motor".
- **La instrucción completa, y es una sola frase:** *"quiero que prospectes esta publicación"* más el
  enlace. Nada más. **Y esa es la lección**: *"la razón por la cual no le voy a decir nada más es
  porque en este skill está todo lo que yo ya le enseñé a hacer"*.

**Lo que el agente hace solo, paso a paso, narrándolo en pantalla** [1:38:38 a 1:48:08]:

1. Lee la habilidad completa antes de actuar ("I'll load the skill first").
2. Crea una hoja de Google Sheets nueva y **manda el enlace al chat de inmediato**, con las columnas
   ya formateadas: Name, Headline, Company, LinkedIn URL, Comment, Reactions, Email.
3. Llama a **Apify** (actor de scraping) contra la publicación de LinkedIn.
4. Escribe los comentaristas **por lotes**, no fila por fila, para que se vea llenarse en vivo.
5. Al terminar los nombres, arranca el enriquecimiento: *"Emails en camino, lote a lote"*, usando
   Apollo y Hunter.io.

**El resultado medido en los frames: la hoja se detiene en la fila 265, o sea 264 comentaristas, en
unos 9 minutos.** [1:48:08]

Notas de producto que suelta mientras el agente trabaja:
- **Puedes tener varios chats corriendo a la vez, con modelos distintos, haciendo cosas distintas.**
  [1:40:13]
- La habilidad es un ejemplo, no un límite: *"le pueden decir que prospecte en Instagram, que entre a
  bases de datos del gobierno, que entre a noticias"*. [1:35:55]
- Sobre HubSpot, respondiendo a un asistente: lo tiene conectado y así **crea pipelines, actualiza
  deals y hace seguimiento automáticamente**. [1:41:09]
- DeepSeek y otros modelos sueltos: funcionan si los conectas vía OpenRouter, y varios se pueden
  conectar directo. [1:40:24]

### 10.1 Lo que se aprende mientras el agente trabaja (el mejor Q&A de la sesión)

**Cobertura real de correos en Latinoamérica, y es un número que nadie suele decir** [1:42:15]:
Apollo encuentra *"probablemente el 40 o el 50% de los correos"* en Latinoamérica. Su método para
subir: encadenar herramientas, lo que una no encuentra lo busca la siguiente (Hunter, Lusha,
FullEnrich), y así llega **al 60, 70 y a veces 80%**. Si vas a montar prospección automatizada en la
región, esa es la expectativa realista, no el 100%.

**Por qué usar Apify y no dejar que el modelo navegue solo** [1:45:40], que es la respuesta más útil
para cualquiera que quiera hacer scraping: los modelos **sí pueden** navegar, pero no están entrenados
para eso, así que entran como un robot, toman capturas y navegan a ojo. **LinkedIn e Instagram tienen
antibots y te pueden banear la cuenta.** Herramientas como **Apify, Anakin.io y kernel.sh** hacen
scraping **a nivel de red**, no de navegación, y ya resolvieron el problema. Muchos de esos scrapers
son gratis.

**Cómo probar una habilidad antes de dejarla en producción** [1:47:13]: abres cualquier chat y dices
"quiero testear este skill". Y si la traes de Claude Code, Claude Cowork o ChatGPT, **la exportas como
texto, la pegas y le dices "quiero programar este skill"**. O sea, las habilidades son portables entre
arneses porque al final son texto.

**Sobre qué modelo pagar** [1:41:28]: *"el mejor modelo hoy no es el mejor modelo en una semana"*, así
que toca investigar constantemente. Él personalmente paga **Anthropic y OpenAI**. Para quien arranca,
su recomendación: **una suscripción de 20 dólares al mes**, o los 10 de OpenRouter. Su afirmación de
venta, que conviene leer como tal: *"hoy en día alguien que tenga 20 dólares al mes rinde 10x que un
humano que no"*.

**La advertencia que repite tres veces, y es lo contrario de lo que vende la industria** [1:43:18],
[1:45:05]: *"no es magia. Tú le vas a tener que enseñar a hacer eso la primera vez."* Ante la pregunta
"¿puedo pedirle que prospecte gerentes de restaurantes en Bogotá?", la respuesta es sí, pero hay que
darle el paso a paso (entra a Google Maps, usa Apify para scrapearlo, busca si están en LinkedIn, si
no busca Instagram) hasta que eso se convierta en habilidad. **"Es como un practicante: si le dices
'tráeme clientes', va a estar perdido."**

## 11. El método MUUDS: de un problema ambiguo a un agente [1:48:40 a 2:30 aprox.]

El bloque estratégico, y el que Felipe presenta como el verdadero regalo (*"es simple pero es
poderoso"*). Nace de una situación que él plantea así [1:49:54]: **tu jefe te dice "quiero que me
construyas un agente para mejorar la empresa" y no dice nada más**. O peor, te lo dices tú mismo.

**Los pasos, en orden, y se hacen en vivo con la sala** [1:50:18], [1:53:02]:

| # | Paso | La pregunta que responde |
|---|---|---|
| 01 | **Misión** | ¿Qué logra tu agente para la empresa? |
| 02 | **Usuario** | ¿Quién trabaja con el agente cada día? Piénsalo como un **rol**, no como un área. *"Ventas no es suficiente: es un vendedor, es un gerente comercial"* |
| 03 | **Caso de uso** | ¿Qué tarea concreta resuelve? Qué hace esa persona en su día a día |
| 04 | **Dolores** | ¿Qué le duele hoy a ese usuario dentro de ese caso de uso? |
| 05 | **Soluciones** | ¿Cómo resuelve el agente cada dolor? |
| 06 | **Métricas** | ¿Cómo mides que funcionó? |

> **Corrección, y explica el nombre del método.** La slide 34 del deck muestra **cinco** columnas y
> arranca en "Usuario". **El tablero real de Miro tiene seis** y abre con **Misión** [1:53:02]. Con esa
> columna el acrónimo cierra: **M**isión, **U**suario, **U**so, **D**olores, **S**oluciones (Métricas
> es el cierre de medición). Quien se guíe solo por el deck se salta el primer paso, que es
> justamente el que ancla el agente a un resultado de negocio.

De ahí, y solo de ahí, se escriben los procedimientos y las skills del agente.

**El truco de facilitación que vale la pena robarse** [1:54:01]: lo corre con la sala entera vía
Mentimeter mientras él arma el tablero en Miro en vivo. En **un minuto** mapea **178 roles** de las
537 personas conectadas. Y lo dice explícito: *"si ustedes están facilitando este mismo taller dentro
de su empresa, pueden invitar a toda su empresa y en un minuto ya tienen esto"*. Es el método
entregado como herramienta de facilitación, no solo como teoría.

En la ronda con la sala se prioriza el rol **comercial** (por votación implícita: es el que más se
repite), y los casos de uso que salen son prospectar, cotizar, hacer seguimiento, alimentar el CRM,
calificar leads y elaborar propuestas.

### 11.1 El ejemplo trabajado completo, que es la plantilla a reusar [1:56:00 a 2:13:00]

En **15 minutos y con más de 200 ideas de la sala**, la cadena queda así:

```
USUARIO         Representante comercial (de 178 roles mapeados en 1 minuto)
   ↓
CASO DE USO     Prospectar (de 225 casos de uso recogidos: cotizar, analizar mercado,
                alimentar CRM, hacer seguimiento, agendar citas, calificar leads)
   ↓
DOLOR           No tener bases de datos
                (otros que salieron: no tener datos de contacto, no tener un perfil claro
                de a quién prospectar, no tener capacidad operativa, baja tolerancia al
                rechazo, no poder contestar rápido, no saber manejar objeciones)
   ↓
SOLUCIÓN        Crear la base de datos desde LinkedIn con un lead magnet
                (otras: scrapear Instagram, ir a eventos y scrapear la lista de asistentes,
                cámaras de comercio, webinars, referidos, WhatsApp en frío, comprar bases)
   ↓
MÉTRICAS        Número de personas encontradas en LinkedIn · Número de correos encontrados
                · % de correos válidos · % de leads calificados · % de contactos efectivos
                · % de tomadores de decisión encontrados · Tasa de respuesta
```

**Dos correcciones de facilitación que él hace en vivo, y son buen criterio de análisis:**

1. **"Tiempo no es un dolor."** Cuando la sala responde "tiempo", corrige: *"díganme cuál es el dolor.
   Un dolor es algo que le duele a uno."* Fuerza a pasar de la categoría al síntoma concreto ("me
   duele no encontrar a los clientes", "me duele pasar todo el día buscando"). [1:58:29]
2. **Distingue métrica directa de indirecta.** Cuando alguien propone "número de ventas cerradas",
   acepta pero marca: *"esas son metas indirectas para medir si nuestro agente está creando las bases
   de datos de manera correcta o no"*. La métrica tiene que medir **lo que el agente hace**, no el
   resultado de negocio corriente abajo. [2:10:21]

**Y el punto que él subraya al cerrar el ejercicio** [2:12:32]: *"ojo que no hemos pasado a la parte
de construir la solución. Estamos priorizando **qué** construir."* Ese es el valor real del método: no
es cómo construir un agente, es cómo decidir cuál construir.

Su propio ejemplo de prospección en eventos, dicho al pasar y que vale como táctica [2:05:44]: cuando
va a un evento en Estados Unidos, **scrapea la lista de asistentes, los busca en LinkedIn, encuentra
sus correos y les manda una agenda personalizada** proponiendo verse allá.

## 12. El resultado real del demo, incluido lo que falló [2:15:20 a 2:18:30]

Vale la pena registrarlo con precisión, porque es más informativo que un demo perfecto:

- **268 comentarios recolectados, 264 únicos** (4 duplicados), con nombre, titular, empresa, link y
  comentario. La hoja quedó renombrada "Bootcamp Agentes IA Latam".
- **Los correos quedaron incompletos.** El propio agente lo reporta en la columna "necesita tu
  atención": *"el enriquecimiento sí corrió para las 264 personas, pero las respuestas llegaron
  demasiado grandes para procesarlas en esta sesión y no pude recuperar la mayoría. Se puede volver a
  correr."* Felipe lo asume en vivo: *"como Houston tuvo un error y yo no le di feedback para que lo
  corrigiera, ahora le dije corrígelo y está volviendo a correrlos todos."* [2:17:58]

Ese fallo es el mejor ejemplo de la tesis del propio curso: el agente **detectó y declaró** su límite
en vez de entregar una hoja a medias como si estuviera completa, y el humano cerró el bucle con una
instrucción. Es exactamente la "regla de oro" que él enseña.

**La generalización que deja, y es la más aprovechable de todo el bootcamp** [2:18:14]: *"esta no
tiene que ser la publicación de LinkedIn de ustedes. Si no tienen bases de datos y encuentran un líder
de su industria que tiene un montón de gente comentando algo, copian esa publicación y le dicen a
Houston créame una base de datos."* Es decir, **la audiencia de otro se puede convertir en tu lista de
prospectos**. Táctica potente y con implicaciones éticas que él no discute.

## 12.5 Cómo se posiciona Houston contra Cowork, y contra Hermes [2:52:19 a 2:55:26]

**Este es el bloque más importante del video para a2a**, y sale de una pregunta de un asistente
técnico que está construyendo skills para su equipo y le mandaron a mirar Houston.

**Las tres diferencias que Felipe da contra Claude Cowork**, textuales:

1. **Multimodelo.** *"Si estás en Cowork estás obligado y supeditado a usar únicamente los modelos de
   Anthropic."* Y el argumento del miedo, que es lo que de verdad vende: *"si mañana pasa lo que pasó
   hace unos días, que Anthropic dijo voy a cobrar 20x por Fable 5, y tú tienes toda tu vida ahí, te
   pone una pistola en la cabeza y te toca pagarlo."* Segundo golpe: *"si te banean la cuenta por
   alguna razón, y tenías todas tus automatizaciones ahí, como le ha pasado a algunas personas, chao,
   no puedes hacer nada."*
2. **Multijugador.** Al estar en la nube, creas un agente y lo compartes con el equipo; **cinco
   personas en el mismo tablero, y hasta en el mismo chat**.
3. **Gobernanza.** *"Las integraciones, los skills, la gobernanza es tuyo. Te lo llevas cuando
   quieras, o le enchufas cualquier modelo de IA cuando quieras."*

**Y la frase directa sobre Hermes y OpenClaw** [2:55:11], respondiendo a Álvaro que pregunta si se
pueden comparar:

> *"Sí, exacto, lo puedes comparar con un Hermes y con un OpenClaw. Y la gran diferencia con ellos es
> que **arrancamos siendo multijugador** y estamos **enfocados 100% en personas no técnicas**."*

Esa es su lectura de dónde están parados frente a ustedes, dicha sin que nadie lo presionara. Vale más
que cualquier análisis de mercado de segunda mano.

**Composio, confirmado en voz alta** [2:58:02]: *"Composio es nuestro proveedor de integraciones para
poder utilizar las herramientas ya preconectadas."* Durante la instalación le piden al usuario que
apruebe los permisos de Composio. O sea: **las 1.000 integraciones no las construyó Houston, las
compró**, y el SOC 2 e ISO 27001 que promocionan son en buena parte de su proveedor.

**Detalles de instalación y acceso** [2:47:56 a 3:01:00]: se baja de `gethouston.ai`, hay versión para
**Windows, Mac y Linux**, y el código de beta cerrada del evento es literalmente **"get shit done"**.
La versión que reparten es la **Cloud / Pro / multijugador**, distinta de la versión **local** que
habían mostrado en las sesiones anteriores con Platzi y Lab10. Aviso que dan a los de Windows: como la
certificación es reciente, **Windows la marca como aplicación desconocida** y hay que forzar la
ejecución.

**Sin límite de agentes ni de chats por ahora** [3:01:55].

### 12.6 Tu intervención al micrófono, y lo que el CTO no respondió [3:15:19 a 3:19:00]

**Es el intercambio técnico más denso de las 5 horas, y lo abriste tú.** Vale reproducirlo con
precisión porque el mismo problema lo tiene a2a.

**Tu pregunta, textual** [3:15:19]: partiendo del propio aviso de onboarding de Houston ("los agentes
actúan en tu nombre, pueden ser engañados"), preguntaste: *"mientras el agente está corriendo una
tarea, ¿el token vive en algún proceso que el agente pueda leer? Lo pregunto porque para nosotros el
riesgo no es tanto que me roben la contraseña, sino que el agente manipulado, bien sea por prompt
injection o prompt malicioso, termine usando ese token para algo que no pedí."*

**La respuesta de Julian Arango (CTO)** [3:16:45]:
- *"El token tu agente no lo puede ver. En ningún momento el agente va a tener acceso a ese token,
  todo queda separado del agente."*
- Para integraciones custom: *"el agente les va a mostrar una cajita donde pueden poner la clave, el
  token, etcétera, y eso lo guardamos nosotros en un **secret manager en Google Cloud**, que es lo más
  seguro a nivel de industria. Así nos aseguramos de que su agente nunca vea esos tokens, porque
  compartirlos por el chat es peligroso."*

**Lo que quedó sin responder, y es justo la mitad que preguntaste.** Julián contestó la pregunta de
**confidencialidad** (el agente no ve la credencial) pero no la de **integridad** (el agente engañado
usa su acceso legítimo para hacer algo que nadie pidió). Que el token esté en un secret manager no
impide que un prompt injection le diga al agente "manda este documento a tal correo" usando la
integración de Gmail que ya está autorizada. **Esa es la superficie real de ataque y quedó abierta en
el video.** Tu pregunta era la correcta y no tiene respuesta pública todavía.

**Tu segunda pregunta, que abrió un compromiso que sigue pendiente** [3:18:27]: pediste el contrato de
Composio, con este razonamiento: *"una cosa es el acceso que yo le doy a Houston, que es con quien
estoy haciendo el negocio, pero también le estoy dando acceso a un tercero que es Composio. Me
gustaría leer el contrato con ellos, qué pasa con esa data que va a un tercero."* Julián respondió:
*"te podríamos compartir toda la política de privacidad de data y todos sus certificados."*
**Nadie te lo ha enviado. Es un pendiente cobrable.**

**Dato que soltó Felipe sobre Composio, y matiza el sello de seguridad** [3:05:06]: existe **Composio
4U (gratuita)** y la **empresarial**, que es la que usa Houston. *"La versión gratuita no tiene nada
de eso"*; la empresarial es la que trae **SOC 2 e ISO 27001**, y la usan **Glean, Amazon y Zoom**. O
sea: el sello de seguridad que Houston promociona **es del proveedor y del tier que pagan**, no de
Houston.

### 12.12 El cierre: modelo de canal, Chroma con datos del Estado, y dogfooding [4:44:00 a 5:00:26]

**El programa de partners, con su economía explícita** [4:57:58], que es la respuesta a "¿cómo hago
negocio con esto?": *"ustedes van y hacen las implementaciones, **el 100% de las implementaciones para
ustedes**, y hay **una comisión de cuando se vende Houston**. Y las empresas pagan sus licencias de
Houston."* El agente que construye el partner **queda privado suyo** y lo comparte solo con los
clientes que quiera. O sea: Houston no compite con su canal por el servicio, se queda con la licencia
recurrente. Es un modelo de canal limpio y agresivo.

**Chroma, y aquí está el dato que más le sirve a a2a** [4:52:41]: son *"unos colombianos muy pilos"*
ya conectados a data del Estado colombiano. Felipe lo busca en vivo y lee el catálogo en pantalla:
**Rama Judicial, SECOP, Superfinanciera, Registraduría, Policía Nacional, Contraloría**, y **RUNT**,
que *"acaban de lanzar"*. Van a hacer un taller conjunto. **Alguien ya resolvió el acceso programático
a las fuentes públicas colombianas y lo vende como integración.**

**El caso de uso que se arma en vivo con un asistente** (empresa de trámites vehiculares) es el mejor
ejemplo de rutinas de todo el video [4:53:30]: el cliente manda placa y cédula por correo → el agente
lee el correo → consulta el RUNT → llena las plantillas → devuelve los formularios por correo. Y
encima, **como rutina programada**: *"todos los días a las 8 de la mañana ve y mira qué pasó en el
RUNT"*. Felipe reconoce que eso quedó fuera del taller *"porque era un poquito más avanzado"*.

**Dogfooding, y es un detalle revelador** [4:59:10]: *"yo tengo conectado Houston con Zoom. Le voy a
decir que me haga una base de datos con todas las preguntas del chat e intentar responderlas."* Usan
el producto para procesar su propio evento.

**Higiene de seguridad que sí hizo bien** [4:40:55]: crea una API key de OpenRouter en pantalla
compartida y avisa *"voy a borrar ya mismo esta llave porque es un ejemplo, no quiero que nadie tenga
esto"*. Buen reflejo delante de 300 personas.

**Cierre y números finales:** quedan **217 personas** a las 5 horas (de 500+ al pico); el grupo de
WhatsApp llega a **360**; prometen certificado por correo a los asistentes; y **las 10 implementaciones
arrancan el 1 de septiembre**. Última frase: *"nos vemos en LinkedIn, agréguenme, cuéntenle a alguien
más de Houston"*.

**Fricciones que quedaron sin resolver en vivo:** el código de OpenRouter agotado o con error
[4:41:03]; Apollo bloqueando MCP y API por permisos de administrador en cuentas gratuitas [4:44:16];
WhatsApp Business exigiendo cuenta de Facebook, WhatsApp Business ID y número verificado, *"Meta es
bastante complicado, a mí me tocó autodebuguearme con Houston"* [4:46:50]; y la publicación de agentes
a la tienda con UX confusa, que Felipe reconoce en vivo: *"eso puede ser algo, Juli, que revisemos para
que sea más claro para las personas humanas"* [4:57:36].

### 12.11 Su stack real de navegación programática, regalado al final [4:24:00 a 4:29:00]

Lo dice porque "se quedaron hasta el final". **Es la parte más técnicamente útil de todo el video** y
resuelve el problema que cualquiera se encuentra al automatizar prospección.

**La regla:** *"yo no conectaría a Houston directamente a la web a navegar LinkedIn, porque te va a
gastar un montón de tokens"* y sobre todo **te banean**: *"cuando tú utilizas un Claude Code o un
Houston para simplemente entrar y hacer cosas, eso lo pillan de una como un bot y te dicen, ¿sabes
qué? baneada."*

**Las herramientas que usa en su lugar**, con su función exacta:

| Herramienta | Para qué | Nota |
|---|---|---|
| **Waalaxy** | Secuencias por LinkedIn (invitar, mensajear, seguimiento) | *"ya resolvió todos los temas de seguridad"* |
| **LeadShark** | Cuando el origen es un lead magnet en LinkedIn | |
| **Anakin.io** | **Navega la web a nivel de RED**, no de navegador. *"Vuelve cualquier página web como si tuviera una API"* | |
| **kernel.sh** | Igual: navegación programática sin ser detectado como bot. **Resuelve captchas** | **Gratis 5 USD de crédito al mes**, o 30 USD |

Su frase sobre estas dos últimas: *"ya descifraron cómo no ser detectadas como bots, y de hecho están
siendo pioneros en la navegación programática. Todas estas son las herramientas que utilizan acá en
Silicon Valley."* **Houston solo orquesta**; el trabajo sucio lo hacen estas.

**Y de paso describe su servicio de consultoría, que es el producto de 10.000 USD** [4:28:37]:
*"venimos y decimos: ¿qué es lo que necesitas hacer? Mira, este es el stack de 20 herramientas que
podrías usar, ven, te las ayudo a utilizar. No es 've y búscate la vida', es: nosotros todo el día
automatizamos un montón de vainas, ven y te hacemos tu primer agente, conéctate a este y a este, y
estos son los actores que funcionan, te lo dejo funcionando."* **El valor que venden no es el software,
es saber qué herramienta existe.** Coherente con su propia frase de la hora 1.

**Anuncio con implicación directa para a2a** [4:19:37]: *"a los que están en Colombia, en unos días
vamos a hacer un taller más corto de cómo utilizar una herramienta que se llama **Chroma** para
conectarse con toda la **data pública del gobierno**, para por ejemplo **licitaciones con el
SECOP**."* Van hacia el mismo terreno del **grafo regulatorio multi-país** de Hermes.

**Cómo crear un agente desde cero, que es lo que faltó del taller** [4:22:00]: nombrarlo, conectar
modelo, y luego pedirle al propio agente que se configure. Su guion literal: *"hey, quiero que te
escribas tu propia descripción del rol, tú vas a ser un contador. Investiga las descripciones del rol
de un contador y escríbete tus propias instrucciones. Y sabes qué, **proponme 10 habilidades que
podríamos hacer juntos**."* El agente se autoconfigura y tú solo aportas tus formatos y tu proceso.

**Límite del producto que reconoce** [4:16:09]: los créditos consumidos **solo se ven para los modelos
de IA**, no por herramienta; para Apify o Apollo toca ir a cada plataforma. *"No lo había pensado,
mándalo como feedback."* También: **no todas las apps tienen MCP**; Apollo sacó el suyo hace poco y él
ni lo había conectado.

**WhatsApp Business:** se puede conectar pero *"es un tema, porque Meta es complicado"* [4:19:20].

### 12.10 El Q&A abierto: donde se afloja el guion [4:00:00 a 4:15:00]

**El matiz que desmonta media promesa de "multijugador"** [4:10:30 a 4:12:20]. Miguel pregunta cómo
compartir agentes con su equipo de tres, y en el intento en vivo Felipe se enreda; **entra Julián a
corregirlo**: *"en este momento tú estás mostrándoles un perfil **personal**, que toda la gente va a
tener personal gratis. **En este no hay colaboración, por eso es personal.** Para comenzar a colaborar
tienes que crear un equipo."* La ruta real es Configuración → Espacio de trabajo → Administración →
Personas → invitar.

> **Lectura mía:** el "multijugador desde el momento cero" que venden como el foso frente a Hermes y
> OpenClaw **no está en el plan gratuito**. Es la función que separa el tier gratis del pago. Coherente
> como negocio, pero conviene no comprarles el titular sin la letra pequeña.

**Y la declaración más audaz de las 5 horas, de Julián** [4:12:57]: *"sabemos que es algo nuevo que
está saliendo en Houston, sabemos que es algo que **jamás se ha usado con agentes de inteligencia
artificial**. **No conocemos ninguna empresa que esté haciendo esto de manera exitosa.**"* Está
reclamando ser los primeros en agentes colaborativos multijugador. Es una afirmación falsable y es
justo el terreno donde a2a puede competir o diferenciarse.

**Privacidad y publicación de agentes propios** [4:02:35]: lo que creas es 100% privado. Con los tres
puntos puedes **exportar una copia**, descargarlo para dárselo a alguien, o publicarlo en la tienda
**público** o **privado por enlace**. O sea, la tienda ya soporta distribución privada, no solo
pública.

**Programa de partners y embajadores, abierto** [4:07:48]: ante la pregunta de un asistente venezolano
sobre representar el producto, Felipe confirma *"tenemos un grupo de partners abierto, tú aplicas y
nos cuentas por qué quieres ser partner o embajador"*. Es un canal de distribución que ya existe.

**Multi-cuenta por integración** [4:14:15]: puedes conectar varios correos o varias cuentas de Apollo
a la misma integración, *"le puedes conectar 10 si quieres"*, pero avisa el costo real: **"tu agente
se va a comenzar a confundir cuál usa y cuál no"**. Es el mismo problema que ya había señalado con los
MCP de más.

**Dos frases de tesis suyas, útiles como posicionamiento** [4:08:00], [4:05:24]:
- *"En la época de IA ya no es el ingeniero el que trae más valor necesariamente, sino la persona que
  tiene mucha experiencia de industria y puede con lenguaje natural hacer estas automatizaciones."*
- *"La ingenuidad es una ventaja en el mundo de la IA, porque las personas que saben mucho dicen 'eso
  no se puede', y las que no, preguntan 'oiga, ¿será que puedo hacer esto?'."*

**Señal de carga operativa:** Julián responde en vivo que está *"respondiendo 400 WhatsApps"*
[4:11:48]. El equipo que sostiene el evento son tres o cuatro personas.

### 12.9 El recorrido del producto completo, y la pieza que faltaba: Rutinas [3:44:00 a 3:52:00]

El inventario de lo que tiene Houston hoy, tal como lo recorre en pantalla:

| Zona | Qué hace |
|---|---|
| **Agentes** (panel izquierdo) | La lista; él tiene ~10 trabajando en paralelo |
| **Espacio de trabajo** | Tablero **Kanban** por agente, con las columnas En curso / Necesita tu atención / Listo, donde se invita al equipo |
| **Misiones** | Cada misión es un chat con un modelo dentro de ese agente. Varias en paralelo |
| **Actividad** | Historial de lo que hicieron los agentes |
| **Configuración** | Instrucciones, habilidades, memoria |
| **Integraciones** | Las ~1.000 preconectadas, más las personalizadas por chat |
| **Modelos de IA** | 22 proveedores, filtrables por **suscripción** o **pago por uso** |
| **Archivos** | Todo lo que el agente va generando |
| **Tienda de agentes** | El marketplace |
| **RUTINAS** | **Trabajo programado, por tiempo o por evento.** Ejemplo suyo: "todas las mañanas, hacerle seguimiento a los clientes abiertos en el CRM" |

**Rutinas es la pieza que convierte el asistente en operación**, y es la que menos tiempo recibió en el
bootcamp pese a ser la que sostiene el argumento de "agentes que trabajan solos". [3:44:19]

**Detalle de conexión que vale doble:** Anthropic, GitHub Copilot, Qwen, OpenRouter y OpenCode se
conectan **por suscripción con un login**, no con API key. Textual: *"así de fácil se me conectó mi
ChatGPT Plus"* [3:46:56]. Solo Apollo y algunos otros exigen API key.

**Consejo operativo que él da y contradice lo que hizo en su propia demo** [3:55:29]: *"cuando uno está
arrancando yo normalmente lo pongo en **preguntar antes**, para que me haga preguntas cuando no esté
seguro y yo le pueda dar buen feedback."* En la demo lo puso en piloto automático a propósito, para el
efecto escénico. Para uso real, su recomendación es la contraria.

**Detalle honesto sobre el onboarding** [3:57:19]: el chat del onboarding **no usa tus modelos**, es
*"una simulación de la experiencia"* prediseñada. Solo cuando entras de verdad corre con lo que
conectaste.

**Apollo**: cuenta gratis con **100 créditos** para empezar [3:54:17].

**Su muletilla de soporte, repetida cinco veces:** ante cualquier duda técnica, *"pregúntenle a
Houston"*, incluso para encontrar dónde está la API key de otra herramienta. Es el argumento de
"diseñado para usuarios 100% no técnicos" convertido en canal de soporte de primer nivel.

### 12.7 La logística del evento, que también es información competitiva [3:03:00 a 3:29:00]

Los tres regalos y sus fricciones reales:

| Regalo | Cómo se entrega | Qué falló |
|---|---|---|
| Houston Cloud gratis | `gethouston.ai`, código de beta **"get shit done"** | En Windows sale como aplicación desconocida; varios no pudieron instalar |
| **75 USD en Apify**, válidos 2 meses | QR, o cupón **`houston_rocket`** en Billing > Suscripción > Add promo code | Era para usuarios nuevos; con el cupón funciona también en cuentas existentes |
| **10 USD en OpenRouter** | `openrouter.ai/redeem`, código **`OR_GETHOUSTON`** | **Solo para las primeras 250 personas y se agotó en vivo** [3:27:50]. Además Houston muestra 0,00 USD porque solo lee créditos comprados, no promocionales [3:19:11] |

### 12.8 La tienda de agentes, y su gate anti prompt-injection [3:32:22 a 3:41:00]

**La pieza con más potencial competitivo de todo el producto**, y la lanzaron **el día anterior**
(*"esto lo acabamos de lanzar ayer, así que les pido paciencia"* [3:34:33]; de hecho se les rompió en
vivo y tocó reintentar).

**Cómo funciona:** panel izquierdo → **Tienda de agentes** → buscar el autor (en el evento, "Felipe")
→ el agente "vendedor" → **"Probar ahora"**. Al importar, el autor decide **qué skills comparte** y el
que importa decide **qué memorias se trae**. Llega el agente completo: instrucciones, habilidades y
aprendizajes.

**Y aquí está la respuesta parcial a tu pregunta de seguridad** [3:33:13]: al importar un agente
ajeno, Houston pregunta *"este es un agente que alguien te compartió, ¿quieres que Houston lo revise?"*
y corre una revisión automática. Textual de Felipe: *"esto es precisamente para evitar temas de
**inyecciones de prompt** o que les estén intentando sacar seguridad. Es un agente de IA que está
revisando para temas de ciberseguridad."*

> **Lectura mía, separada de lo que dice el autor:** ese gate cubre el **prompt injection de
> suministro** (un agente malicioso publicado en la tienda), que es un riesgo real de cualquier
> marketplace. **No cubre** el que tú planteaste, que es el injection **en tiempo de ejecución** a
> través del contenido que el agente lee mientras trabaja (un correo, una página web, un comentario
> de LinkedIn). Son dos superficies distintas y ellos tienen resuelta la primera.

**Privacidad del agente importado**, respondiendo a Daniel P. [3:39:42]: *"nada de lo que tú pongas en
tu espacio es compartido con el que hizo el agente. Todo esto son archivos de texto que ahora viven en
**tu máquina virtual de Houston** y en tu cuenta. Yo no tengo acceso a ninguna de tus memorias."*
Confirma además la arquitectura: **una VM aislada por usuario**, en Google Cloud.

**El modelo de negocio que anuncian para la tienda** [3:36:38]: hoy los agentes se comparten gratis y
solo publican los fundadores, pero *"en el futuro incluso puedan cobrar por hacer agentes y
compartirlos con más personas"*. O sea, van hacia un **marketplace con monetización para terceros**.

**Nota de operación que dice mucho de la madurez del producto** [3:42:16]: a mitad del taller, con 500
personas conectadas y varias trabadas en el tutorial por no haber dado permisos de Gmail, Felipe
anuncia en vivo: *"estoy en este momento sacando una actualización para Houston que debe estar más o
menos en una hora, para que vean debajo de la tarjeta algo que dice saltar tutorial"*. **Están
desplegando a producción durante el webinar.**

**Y el movimiento de retención más importante del evento** [3:20:00 a 3:26:35]: montan un **grupo de
WhatsApp** en vivo y meten a **328 de las ~486 personas** conectadas. La razón que dan es
operativa y honesta: *"cuando Zoom se cierre se pierde todo el chat"*. Juan Salinas además fija un
mensaje con su número personal invitando a escribirle por privado. O sea: el evento no termina en
Zoom, **termina con un canal permanente y un número de teléfono**, que es donde se hace el
seguimiento comercial.

## 13. El bloque comercial: qué vende Houston y a qué precio [2:19:59 a 2:26:00]

Anunciado como lo acordado al inicio ("10 minutos de mi empresa"), y es el bloque con más información
accionable si en algún momento evalúas la herramienta o el modelo de negocio.

**Houston vende dos cosas:**

1. **Implementaciones de IA a la medida.** Entran a la empresa, mapean procesos y construyen los
   agentes operativos con sus integraciones. Son horas de ingenieros.
2. **Licencias empresariales** de la plataforma para que el equipo cree y opere sus propios agentes.

**Los precios, textuales** [2:22:59 a 2:24:46]:

| Concepto | Precio normal | Precio del evento |
|---|---|---|
| Implementación (4 agentes) | **10.000 USD** (~2.500 USD por agente, horas de ingeniería) | **2.500 USD**, solo para **10 empresas**, se reserva con 500 USD |
| Licencia individual | 15 a 25 USD por licencia | |
| Plan empresarial anual (mínimo) | **2.500 USD/año** | |
| **Programa Houston para pymes** | (se lanza ese mismo día) | **299 USD/año hasta 20 licencias**, con las 1.000 herramientas preconectadas y soporte por WhatsApp, Slack o Teams |
| Uso personal | **Gratis hasta 3 licencias**, siempre | |

**Condiciones:** la oferta de pymes se abre **por 48 horas**; las 10 implementaciones se limitan porque
*"estamos priorizando las empresas grandes, trabajando con un par de empresas de mil empleados para
arriba, pero queremos ayudar a las pymes también"*. Los enlaces son el **formulario**
(`https://forms.gle/VcyJ21j2xzoK2nEF8`) y el **checkout de Stripe**
(`https://buy.stripe.com/28E14p8YicAjc1UfzAfw403`), que aparecen como QR en pantalla desde 2:22:51.

**Dato de producto importante que sale en el Q&A** [2:26:52]: **Houston era una app local y la
migraron a la nube; la versión local está deshabilitada hoy.** La razón que da: *"a muchas personas no
les estaba funcionando el local por sus computadores"*. Promete que en el mediano plazo volverá a
funcionar en local y en la nube. Consecuencia práctica: **hoy no puede tocar archivos locales de tu
computador**; para trabajar un Excel hay que subirlo, dejar que lo procese y descargarlo, o conectar
la versión online de Excel u OneDrive.

---

# ANEXO: transcripción íntegra del bootcamp

> **Qué es.** La transcripción completa de las 5 horas, generada localmente del audio con whisper
> `large-v3-turbo` y **sin corregir a mano**: hay errores de reconocimiento, nombres mal escritos y
> puntuación irregular. Se incluye tal cual a propósito, para que cualquier cita del análisis de
> arriba se pueda verificar contra la fuente sin depender de nadie ni pedir la grabación.
>
> **Las marcas de aquí son MINUTOS ACUMULADOS**, no `h:mm:ss`. `[300:24]` son 5h 00m 24s. Para
> encontrar una cita del análisis, convierte: `1:23:30` de allá es `[83:30]` aquí.
>
> **Intervenciones de asistentes.** El evento era abierto y varias personas preguntaron en público.
> Aparecen con el nombre de pila con el que se presentaron; no se añadió ningún dato de contacto,
> empresa ni perfil de nadie.


> Transcrito local con faster-whisper (modelo `large-v3-turbo`, `cuda`/`int8`). Sin corregir a mano: puede tener errores de reconocimiento (nombres propios, cifras, jerga tecnica).

---

[00:10] Recording in progress.
[00:46] Bogotá, Querétaro, Bogotá, Bucaramanga, en Colombia también, genial, listo, voy a poner ahí mientras la gente se une, les voy a volver a poner mi música, ahí, Bogotá, listo, para todos los que se van uniendo, le vamos a dar 5 minutos a todas las personas que están acá para que se unan, las personas que se están uniendo y arrancamos esta sesión de hoy, mientras tanto vayan poniendo por el chat desde donde se conectan y manden sus links así nos conectamos entre todos.
[01:24] A ver, voy leyendo, desde Guadalajara, listo, ya somos 256, desde Venezuela, dice Paolo, desde Cali, desde Bogotá, desde Bucaramanga, desde Panamá, increíble, tenemos gente de toda Latinoamérica, desde Chía, muy bien, Barichara, Chía, desde El Salvador, Rebeca, te vemos, listo, se sigue uniendo gente,
[02:13] los que se van uniendo, estamos dándole unos 5 minutos a todas las personas que se están uniendo porque se sigue uniendo mucha gente, vayan poniéndonos por el chat desde donde se conectan y manden su LinkedIn para que nos conectemos.
[02:24] Y vayan prendiendo sus cámaras, que ya los veo por acá, veo a Ana Rodríguez, veo a Shaila Rodríguez, a Rafael Osorio, a Usuario, Usuario, cámbiate el nombre,
[02:37] Mauricio Álvarez, te veo, Alfredo Jiménez, te veo, Rebeca Nieto, un gusto verte, Elber Rubio, te veo, un gusto, iPad, cámbiate el nombre porque si no te puedo llamar por tu nombre,
[02:52] Felipe Londoño, te veo, Jorge Fernández, te veo, Sandra, ¿cómo estás? Bienvenidas, Andrés Ceballos, bienvenido.
[03:00] Todos los que no han puesto cámara, por favor pongan cámara porque se van a dar cuenta que esta asesina es bastante interactiva.
[03:06] Se vale estar en pijama, se vale estar con la mascota, se vale estar con la familia, se vale estar comiendo, se vale todo.
[03:13] Muy buenos días, muy buenos días para todos.
[03:15] Hola, ¿qué tal? 8513989, cámbiate el nombre para que te podamos llamar por tu nombre.
[03:21] Ok, perfecto.
[03:23] Listo, vamos a darle, estamos dándole 5 minutos a todos los que se van uniendo y arrancamos.
[03:29] Vayan mientras tanto prendiendo sus cámaras y mandando desde donde se conectan.
[03:33] Buenos días, Felipe.
[03:34] Hola, José, buenos días.
[03:37] Hola, ¿todo bien?
[03:38] Perfecto, listo, ahora sí, desde Bogotá.
[03:40] Sergio, un gusto, yo estoy basado en San Francisco, California.
[03:44] Genial.
[03:46] Así que son las 7 y 5 de la mañana para mí, estoy bastante energizado, ustedes son las primeras personas que vean un sábado,
[03:51] así que les voy a dar toda mi energía.
[03:55] Buenas noches desde Bogotá.
[03:57] Desde Bogotá, muchísimas gracias, vayan mandando ahí por el chat, vayan mandando ahí por el chat, por favor,
[04:03] para que los podamos leer, manden desde donde se conectan y si pueden...
[04:06] Buenas noches desde Bogotá.
[04:09] Desde Bogotá, listo, genial.
[04:13] Hola, Felipe, desde Bogotá.
[04:16] Desde Bogotá, manden ahí por el chat y yo los leo.
[04:20] Playa del Carmen.
[04:25] Playa del Carmen, muy bien.
[04:27] Listo, son las 9 y 5 de la Colombia, 65 de la San Francisco, 5 minutos más, a las 10 de la arrancamos, listo.
[04:34] Sigan mandando ahí por el chat, please.
[04:36] Buenos días, desde Medellín.
[04:38] Hola, Nicole, gracias por reportarte.
[04:40] Vayan poniéndolo ahí por el chat.
[04:42] Hola, Felipe, ¿cómo estás?
[04:44] Hermán, ¿cómo está? Un gusto verlo.
[04:46] Bien.
[04:47] Por acá.
[04:50] Buenos días.
[04:53] Gracias, gracias.
[04:54] Vayan poniendo ahí por el chat, que yo los leo por el chat.
[04:56] Dicen, desde Bogotá, desde Cota.
[05:07] Desde Bogotá, llegando a la OFI para tomar la sesión.
[05:10] Gina Paula, genial.
[05:12] Desde Cali.
[05:15] Jessica Pérez, desde México.
[05:17] Desde Dallas, Texas, dice Ramos Commercial Group.
[05:20] Desde Bucaramanga, muy bien.
[05:25] Listo, ya tenemos 360 personas.
[05:28] Veo que se siguen uniendo.
[05:31] Sigan mandando ahí por el chat, los que se están uniendo apenas.
[05:34] Vamos a darle 4 minutos más a las personas que se están uniendo.
[05:37] Por favor, vayan poniendo desde el chat, desde donde se conectan.
[05:39] Pongan en el chat, desde donde se conectan y manden su link para que podamos hablar con ustedes.
[05:54] Listo.
[05:56] Sigan por ahí, sigan por ahí.
[05:58] Manden por el chat, por favor.
[06:05] Manden por el chat, desde donde se conectan.
[06:11] Como somos tantas personas en esta llamada, voy a deshabilitar temporalmente que se puedan desmutear
[06:15] para evitar que los micrófonos se desmuteen por accidente.
[06:18] Y cuando vayamos a interactuar, yo se los voy, se los voy habilitando, ¿les parece?
[06:24] Eso, veo manitos por ahí.
[06:25] Bueno, reaccionen.
[06:27] Hacemos las cosas para reaccionar por ahí.
[06:30] Eso, veo por ahí que están ahí manitos, manitos, manitos.
[06:34] 3 minutos y arrancamos.
[06:46] Listo.
[06:46] A los que se van uniendo, bienvenidos y bienvenidas los que se van uniendo, vayan poniendo por el chat desde donde se conectan.
[06:53] En 2 minutos vamos a arrancar.
[06:55] Ya somos acá casi 400 personas en esta llamada y se sigue uniendo gente.
[07:18] Listo, dicen, lo sigo leyendo.
[07:24] Por acá me van haciendo preguntas.
[07:26] ¿Se puede hacer el taller con la cuenta paga de Gemini?
[07:30] Se puede, lo podrías conectar.
[07:32] Yo recomiendo que tengan al menos un chat GPT o que tengan al menos una cuenta de Cloud.
[07:39] Pero se puede.
[07:41] Natalia García, hola, ¿nos pueden enviar la grabación?
[07:44] Sí, pero va a tomar un tiempo mientras la podamos procesar.
[07:49] ¿Es chat GPT Plus?
[07:50] Dice Palo Ortega.
[07:53] Idealmente, lo puedes hacer con la gratuita, pero idealmente.
[07:55] Cloud Pro sirve, es excelente.
[07:58] ¿Vamos a usar Houston?
[07:59] Sí, vamos a usar Houston.
[08:01] Pero igual todo lo que les voy a enseñar hoy lo pueden usar con otros agentes también.
[08:05] Pero principalmente vamos a usar Houston.
[08:15] Ok.
[08:17] Indícanos, necesitamos un ejecutable, lo vamos a regresar en la nube.
[08:20] Todo va a ser en la nube.
[08:23] Listo.
[08:26] Lo sigo leyendo.
[08:33] Dice Mireya, descargando el Houston siempre se demora como 15 minutos.
[08:36] Dependiendo de la calidad del internet, se debe demorar más o menos.
[08:42] Listo.
[08:42] Yo creo que vamos arrancando para ser respetuosos con el tiempo de la gente.
[08:48] Veo Juan que se sigue uniendo mucha gente, que se sigan uniendo y nosotros vamos arrancando.
[08:52] ¿Listo?
[09:00] Bueno, listo.
[09:01] Muchísimas gracias a todos y todas por estar acá.
[09:04] Para mí es un gusto saludarlos hoy y que se hayan tomado un sábado de su vida.
[09:08] Lo valoro muchísimo y también les voy a dar toda mi energía el día de hoy.
[09:11] Les propongo, voy a compartir mi pantalla y vamos a arrancar con un ejercicio para entrar en calor.
[09:19] Así que lo primero que quiero que hagan es, les voy a compartir mi pantalla.
[09:27] Quiero que todos saquen su celular y escaneen este código QR.
[09:32] ¿Listo?
[09:35] Quiero que lo escaneen, quiero que lo escaneen.
[09:37] Mientras se siguen uniendo las personas, quiero que lo escaneen.
[09:42] Lo que vamos a hacer es, esto es lo que nos va a permitir estar participando hoy siendo tantas personas.
[09:47] Somos 422 o 23 personas en esta llamada.
[09:51] Esto es lo que nos va a permitir colaborar.
[09:53] Así que, por favor, saquen su celular y apúntenlo a este QR.
[09:58] Prontamente vamos a comenzar.
[10:02] ¿Listo?
[10:03] Ahí veo que se sigue uniendo un montón, un montón de gente.
[10:05] Ya veo que tenemos a 200 personas acá, participantes activos, en la llamada de 425.
[10:12] Vayan uniéndose, les doy 30 segundos.
[10:18] Y se sigue uniendo gente.
[10:20] Oigan, yo creo que toca darle unos 5 minutos más a las personas.
[10:23] Creo que se sigue uniendo mucha, mucha, mucha gente.
[10:28] ¿Listo?
[10:28] Veo ya, tenemos 256 personas activas en el Menti.
[10:33] Síganse uniendo.
[10:34] Saquen el celular, por favor, y escaneen este código QR.
[10:37] Es lo que nos va a permitir participar a todos hoy.
[10:44] ¿Listo?
[10:44] Los que se van uniendo, los que se van uniendo, por favor, uno, vayan diciendo de qué ciudad del mundo se unen por el chat.
[10:50] Y vamos a comenzar en 5 minutos.
[10:53] Vayan escaneando este código QR.
[10:55] Acá hay 289 personas ya.
[10:57] En esta llamada hay 436 personas.
[11:00] Así que, por favor, escaneense este código QR que voy a hacerlos interactuar a través de esta plataforma.
[11:11] Listo, ya veo que tenemos 300.
[11:13] Nos faltan 141.
[11:16] Los que se van uniendo, por favor, escaneense ese código QR.
[11:21] Y, si pueden, por favor, prendan sus cámaras.
[11:24] Yo estoy viéndolos acá.
[11:25] Tengo una pantalla donde están todos ustedes.
[11:27] Así que los voy a ir llamando también, muy seguramente.
[11:34] Listo.
[11:34] Síganse, se siguen uniendo.
[11:36] Hay 321 personas que están acá ya.
[11:39] En esta llamada hay 445 personas.
[11:41] Por favor, la instrucción es escaneen este código QR con su celular.
[11:45] Y esa es la plataforma que vamos a utilizar para interactuar hoy.
[11:52] Listo.
[11:56] Dice Laura Betancourt.
[11:58] Se me quedó el computador en la oficina.
[11:59] ¿Puedo acceder a Houston desde el iPad?
[12:01] En este momento no, Laura.
[12:03] Necesitas un computador.
[12:06] La respondo para todos.
[12:09] Listo.
[12:09] Veo 338 personas.
[12:11] Nos faltan 100 personas en esta plataforma.
[12:14] La instrucción es, todos los que se van uniendo, por favor, escaneen este código QR con el celular.
[12:19] Y quédense ahí un segundo.
[12:21] Esta es la plataforma que vamos a estar utilizando para interactuar hoy en este taller.
[12:32] Los veo que se siguen uniendo.
[12:38] Listo.
[12:39] Se siguen uniendo.
[12:40] Se siguen uniendo.
[12:43] 357 personas.
[12:44] Nos hacen falta 100 personas.
[12:46] La instrucción para los que no han escuchado por ahí, por favor, escaneen este código QR, que es la plataforma que vamos a utilizar durante el taller.
[12:56] ¿Listo?
[12:57] Si no están ahí, no van a poder participar.
[13:05] Listo.
[13:06] Los veo, los veo, los veo.
[13:08] 364.
[13:09] Cuando lleguemos a 400, arrancamos.
[13:11] Hay 464 personas que están en esta llamada.
[13:14] 445.
[13:16] Nos hacen falta casi 100 personas por unirse a este menti.com.
[13:25] A todos los que hayan tenido problemas descargándose de Houston, no se preocupen.
[13:28] Ahorita, en la segunda parte, que es completamente práctica de este taller, vamos a estar acá con el equipo.
[13:33] El equipo les va a ayudar a resolver problemas.
[13:36] Van a estar pendientes ahí por el chat también.
[13:38] ¿Listo?
[13:38] Jaime Leonardo dice, cuál es la versión más antigua de Maco, es que soporta Houston.
[13:46] Jaime, en la nueva versión, soporta todas.
[13:53] Listo.
[13:54] Somos 377 personas acá en el menti.
[13:57] Por favor, todos los que se siguen uniendo, veo que acá se siguen uniendo personas.
[14:01] Por favor, entren a este código QR que están viendo.
[14:05] Escaneenlo.
[14:06] Es una plataforma online que vamos a utilizar para estar interactuando hoy juntos.
[14:15] ¿Listo?
[14:18] Listo.
[14:19] Vamos a darles 5 minutos más a los que no se han unido porque nos faltan 100 personas por unirse.
[14:24] De los que están en el Zoom, 100 de ustedes no se han unido hasta al menti todavía.
[14:28] Por favor, váyanse uniendo.
[14:29] Ahí, mientras le seguimos dando entrada a la gente que sigue entrando, mucha gente, antes de que arranquemos el taller.
[14:34] Listo, gente que está mandando ahí reacciones.
[14:38] Ya tenemos 390.
[14:40] Nos faltan unos 60 acá.
[14:42] Cuando lleguemos a 400 en este número que está aquí abajo a la derecha, arrancamos.
[14:47] Mientras tanto, Juan Vélez, veo que tienes tu mano levantada.
[14:51] ¿Puedes mandar tu pregunta por el chat?
[14:56] O espérate a ver, ya, creo que ya te puedo dar que te desmutes.
[15:00] Déjame saber si te...
[15:02] Listo.
[15:03] Hola, sí.
[15:04] Gracias, buenos días.
[15:05] Hola, Juan.
[15:05] Bueno, gracias por el espacio.
[15:08] Esperemos que podamos sacarle mucho provecho a todos los que estamos acá.
[15:11] Tengo una pequeña inquietud frente a la conexión.
[15:15] Yo conecté Gemini AI.
[15:18] No lo he usado.
[15:19] Pero me está pareciendo el uso de 55.000 tokens.
[15:24] ¿Es porque se relaciona todo lo que consumo desde el modelo o es el consumo netamente de Houston?
[15:31] No, todo es consumo del modelo, pero si quieres te propongo que cuando lleguemos a la parte táctica para no confundir a todo el mundo, le abrimos el micrófono a los ingenieros del equipo y resolvemos todas esas cosas.
[15:42] ¿Te parece?
[15:43] Ah, ok.
[15:44] Dale, dale.
[15:44] Listo, dale.
[15:46] Listo.
[15:46] Ya somos 404 personas en este mente.
[15:50] Arranquemos con la primera parte y es vamos a calentar motores antes de ponernos todo el mundo a trabajar hoy.
[15:57] Listo.
[15:59] Listo.
[15:59] No está congelada.
[16:00] Es que no hemos arrancado.
[16:01] Listo.
[16:03] Listo.
[16:04] Todos los que están acá, por favor, lo primero que quiero que hagan es, quiero que respondan esta primera pregunta.
[16:10] Vamos a ir respondiendo preguntas con el celular.
[16:13] Vayan a su celular, los que se están uniendo, vayan y escaneense este código QR que está acá y los vamos a leer.
[16:20] ¿Desde qué ciudad del mundo se conectan?
[16:21] Dicen por acá, Bogotá, Bogotá, Bucaramanga, Chía, Envigado, Barranquilla, Finlandia, Quindío, Tunjaoyacasi, Paquirá, Sabaneta, Quito, Ecuador, Mexico City, Querétaro, Guadalajara, Miami.
[16:37] Listo.
[16:38] Ya he respondido 200.
[16:39] Vamos, vamos que somos 419 los que están acá.
[16:42] Y mientras tanto, todos los que se están uniendo también, por favor, vayan escaneándose este código QR y vayan siguiendo las instrucciones que les salen ahí.
[16:53] Listo.
[16:53] Los sigo leyendo.
[16:54] 249, 244 respuestas.
[16:58] Bogotá, Bogotá, Cartagena, Barichara, Santiago de Chile, Brisbane, Australia, Lima, Perú, Maracaibo, Sydney, Australia, Acacias Meta, La Calera con Dinamarca, Chicago, Caracas, Punza.
[17:16] Muy bien.
[17:17] A todos los que se están uniendo, por favor, vayan escaneando este código QR.
[17:22] Voy a poner acá, voy a poner acá 30 segundos y pasamos a la siguiente pregunta.
[17:29] Faltan de los 424 que están acá, hace falta más o menos que 100 respondan.
[17:36] Por favor, quiero que estén muy presentes.
[17:39] Presentes.
[17:41] Listo.
[17:41] 300.
[17:42] ¿Listo?
[17:42] Dicen, siguen por acá.
[17:43] Bueno, ok.
[17:49] Bueno, ok.
[17:54] Hay bastantes personas en Bogotá, en Cali, en Bucaramanga.
[17:57] Listo.
[17:59] Listo.
[18:00] Pasaron 30 segundos.
[18:01] Voy a pasar a la siguiente pregunta.
[18:03] Necesito que estén acá muy pendientes, muy pendientes.
[18:08] Les doy acá.
[18:09] Bueno, les vamos a dar 30 segunditos más para que respondan los que no han respondido.
[18:13] De las 430 personas, 320 ya respondieron, casi.
[18:18] Y los que se siguen uniendo, por favor, escaneen este código QR.
[18:22] Lo primero que estamos haciendo es poniéndonos, poniéndonos en calor, entrando en calor con la plataforma que vamos a usar para colaborar hoy.
[18:32] Listo.
[18:33] Los sigo leyendo.
[18:33] Dicen, de Bogotá, de Dallas, Sri Lanka.
[18:37] Wow.
[18:38] Está Bogotá, un town.
[18:40] Muy bien, muy bien.
[18:42] Listo.
[18:43] Vamos a la siguiente pregunta.
[18:44] Ya veo que hay 435 personas que están acá.
[18:47] No todas han respondido.
[18:48] Vayan respondiendo, por favor.
[18:51] Siguiente pregunta.
[18:52] ¿A qué se dedican?
[18:53] ¿Cuál es su rol?
[18:54] Vayan otra vez a su celular y ahí les va a salir para que puedan volver a responder.
[19:00] Docente.
[19:00] Auxiliar contable.
[19:02] Docente.
[19:02] CEO.
[19:03] Comercial.
[19:04] Consultor.
[19:05] Asistente administrativo.
[19:06] Director.
[19:06] Ingeniero.
[19:08] Founder.
[19:10] Ingeniero de sistemas.
[19:11] Software developer.
[19:15] Listo.
[19:15] Vamos acá.
[19:16] Les voy a poner un minuto para que vayamos respondiendo.
[19:23] Somos 440 que ya estamos en este mente.
[19:26] Tienen que llegar por lo menos a 300 respuestas a esto para que avancemos.
[19:51] Listo.
[19:52] 305.
[19:53] Consultor.
[19:53] Gerente.
[19:54] Docente.
[19:55] Ventas.
[19:55] Contador.
[19:56] Wow.
[19:56] Bueno.
[19:57] Ya pueden ustedes ver acá quienes nos acompañan a esto.
[20:00] Es un mundo de gente el que está aquí hoy.
[20:03] Arquitecto.
[20:05] Administrativo.
[20:06] Diseño humano.
[20:07] Listo.
[20:08] Sigan respondiendo por favor y se sigue llenando esto acá.
[20:11] Seguimos, seguimos, seguimos.
[20:12] En 7 segundos seguimos.
[20:16] 330 de ustedes ya respondieron.
[20:18] Faltan unos 100 por responder, por favor.
[20:21] Quiero verlos acá a todos súper presentes.
[20:24] Les voy a dar toda mi energía.
[20:25] Quiero que estén acá.
[20:28] Listo.
[20:30] Vamos con la siguiente.
[20:33] Quiero que me pongan acá en un minuto.
[20:36] ¿Cuál es una tarea repetitiva que les gustaría automatizar con el IA?
[20:40] Mientras se siguen uniendo las personas y ya les prometo que acaban estas preguntas
[20:43] y arrancamos con toda la sesión de hoy.
[20:46] Conciliar.
[20:47] Causar facturas de compra.
[20:48] Cotizaciones.
[20:49] Edición de videos.
[20:50] Todavía no sé.
[20:51] Creación de campañas.
[20:53] Campañas de marketing.
[20:54] Prospección.
[20:55] Hacer cuenta de cobra a clientes.
[20:56] Registro de gastos.
[20:57] Convocatorias.
[20:58] Propuestas comerciales.
[20:59] Cierre contable.
[21:01] Contestar correo electrónico.
[21:02] Cotizar.
[21:03] Dice Ana Rodríguez.
[21:05] Atención al cliente.
[21:07] Prospección.
[21:08] Encontrar leads.
[21:09] Reclutamiento.
[21:10] Todo en mi trabajo.
[21:13] Cotizaciones.
[21:13] Búsqueda leads.
[21:14] Insight sales.
[21:15] Agendamiento de citas.
[21:16] Prospección.
[21:19] Búsqueda de nuevos proyectos.
[21:21] Seguimiento de leads.
[21:23] Cronograma de proyectos.
[21:24] Generar impuestos.
[21:25] Dice Valentina Durán.
[21:26] Wow.
[21:27] Generación de leads.
[21:28] La creación de contenido.
[21:30] Hacer cotizaciones.
[21:31] Inventarios.
[21:31] Generación de informes.
[21:33] Reportes.
[21:34] Correo electrónico.
[21:36] Prospectar.
[21:36] Servicio al cliente.
[21:37] Gestión de pipeline.
[21:38] Sigan.
[21:39] Sigan.
[21:39] Sigan que somos 452.
[21:41] Voy a ponerles acá 30 segundos más.
[21:47] 30 segundos más.
[21:48] Vamos a poner que igual se sigue uniendo gente.
[21:54] Listo.
[21:55] Llevamos 286.
[21:56] 287 respuestas.
[21:59] Respuestas.
[22:01] Dice responder mails y mensajes por Instagram.
[22:03] Informes.
[22:04] Prospección.
[22:05] Publicar en LinkedIn.
[22:06] Avances de obra.
[22:08] Conciliar cuentas.
[22:11] Calificar leads.
[22:12] Gestión de correos.
[22:13] Envídeo de correos.
[22:14] Reacción de documentos y corrección de código.
[22:18] Calificar leads.
[22:19] Elaborar cotizaciones.
[22:21] Propuestas comerciales.
[22:23] Listo.
[22:24] Vamos.
[22:26] Se sigue uniendo gente.
[22:27] Los que se están uniendo.
[22:29] Lo que estamos haciendo es estamos respondiendo algunas preguntas para familiarizarnos con la plataforma
[22:32] que estamos, que vamos a utilizar hoy para colaborar en uno de los talleres.
[22:36] Así que por favor escaneen este código QR y sigan respondiendo por acá desde su celular.
[22:42] ¿Listo?
[22:43] Listo.
[22:43] Veo que algunos están todavía ya mandando manitos, manitos.
[22:45] Sigamos leyéndolos.
[22:48] Legalización y cronogramas.
[22:49] Campañas de marketing.
[22:50] Contacto con cliente.
[22:52] Insights.
[22:52] Verificación de información.
[22:54] Cotizar.
[22:54] Propuestas comerciales.
[22:56] Cotizar.
[22:57] Prospección.
[22:58] Generación.
[22:58] Leads.
[23:00] Automatizar diagnóstico empresarial.
[23:02] GRC.
[23:02] Dice Carlos.
[23:04] Listo.
[23:06] Veo que hay 460 que ya están en el mente y 321 han contestado.
[23:10] Los otros 100, por favor saquen su celular y respondan las preguntas.
[23:16] Listo.
[23:17] La gente sigue respondiendo.
[23:18] Siguen respondiendo.
[23:24] Siguen respondiendo por acá.
[23:25] Les voy a dar ahí un momento más.
[23:29] Listo.
[23:30] Ya 328 han respondido.
[23:32] Vamos a la siguiente pregunta.
[23:33] Después de que haya 330, voy a ir avanzando.
[23:37] Uy.
[23:39] Perdón.
[23:40] Que me entré a uno.
[23:41] Listo.
[23:43] Listo.
[23:44] Si han construido algo con IA, quiero que me cuenten por ahí.
[23:46] Esta sí la vamos a hacer más corta.
[23:47] 30 segundos.
[23:48] Cuenten por ahí.
[23:49] Si han construido algo con IA, que han construido para que los demás podamos aprender de ustedes.
[23:53] No, nada.
[23:54] Dicen conectar el correo.
[23:55] Nada, no.
[23:56] Mi página web.
[23:57] Nada, no.
[23:58] Informes.
[24:00] Agentes de IA.
[24:01] Agentes de Gemini.
[24:02] Dashboards.
[24:03] Apps.
[24:03] Una startup.
[24:05] Actualización de informes mensuales de obra.
[24:07] Wow, Juan Felipe, esto está cool.
[24:10] Nada, no.
[24:11] Absolutamente nada.
[24:12] Landings.
[24:13] Webpage.
[24:14] No, aún nada.
[24:15] Plataformas robustas.
[24:16] Posts para redes.
[24:17] Nada.
[24:17] Copies.
[24:18] Páginas web.
[24:19] Listo.
[24:20] Si no han construido nada, no se preocupen.
[24:21] Espero que al final de este taller puedan salir con las bases para irse y crearse algo.
[24:27] Listo.
[24:28] Acá, lo sigo leyendo.
[24:29] Agentes, cotizador, agente para escuelas deportivas.
[24:33] Listo.
[24:35] Listo.
[24:35] Vamos a la siguiente pregunta.
[24:37] Los que se van uniendo.
[24:38] Se sigue uniendo, gente.
[24:39] Por favor, escaneense este código QR.
[24:42] Los que se siguen uniendo.
[24:43] Por favor, escaneense el código QR que está acá.
[24:45] Estamos utilizando una plataforma con la que vamos a colaborar a través del taller y el bootcamp hoy.
[24:50] Listo.
[24:52] Listo.
[24:52] Los sigo leyendo.
[24:53] Dicen, no han construido nada.
[24:54] Un bot de Telegram.
[24:55] Nada.
[24:56] Startup.
[24:57] Apps.
[24:58] Listo.
[24:59] No, dice Luzdari González.
[25:01] No te preocupes, Luzdari.
[25:02] Estamos acá por eso hoy.
[25:03] Listo.
[25:04] Vamos a la siguiente pregunta.
[25:07] Vayan a su celular, por favor.
[25:08] Los que se están uniendo.
[25:09] Escaneen este código que es con el que estamos colaborando hoy.
[25:13] Quiero que me digan cuál de los siguientes modelos y sistemas han escuchado hablar.
[25:17] Listo.
[25:17] Vamos a ver cuáles han escuchado hablar.
[25:19] Cuáles.
[25:20] Los que no, no se preocupen.
[25:24] Listo.
[25:24] Se van llenando.
[25:25] Voy poniendo ahí un minuto.
[25:26] Un minuto para que todos colaboremos.
[25:44] Listo.
[25:45] Los veo.
[25:45] Ya hay 250, 260 personas que están respondiendo.
[25:50] Los que más han usado.
[25:51] Los que más han escuchado hablar.
[25:53] Está por acá.
[25:54] ChatGPT Work.
[25:55] Cloud Co-Work.
[25:57] Gemini.
[25:57] Wow.
[25:58] Gemini es el ganador.
[25:59] OpenCloy Hermes.
[26:00] Lo han escuchado hablar.
[26:01] 95 los que están acá.
[26:02] Houston, 167.
[26:04] Cloud Code, 209.
[26:07] 115.
[26:07] Codex.
[26:08] Listo.
[26:08] Sigan.
[26:08] Sigan respondiendo.
[26:09] Quiero entender cuáles sistemas y modelos han escuchado hablar.
[26:17] Listo.
[26:19] Mi equipo de Houston y mi cofundador están en el chat.
[26:22] Así que si ustedes también están mandando preguntas por el chat de Zoom.
[26:25] Ahí el equipo les va contestando cosas también.
[26:27] ¿Listo?
[26:28] Listo.
[26:29] Por acá veo que Gemini es uno de los más conocidos por todos los que están acá.
[26:34] Y que han escuchado hablar otros.
[26:36] Quiero que los que están respondiendo otro manden por el chat de Zoom.
[26:39] ¿Cuáles son esos otros que han escuchado hablar?
[26:41] Para que podamos aprender de ustedes también.
[26:44] Listo.
[26:45] La siguiente pregunta.
[26:47] Y para los que se están uniendo en este momento.
[26:49] Por favor, vayan escaneándose este código.
[26:52] Hay 500 personas en el Zoom.
[26:54] Los que han entrado y si están perdidos, no se preocupen.
[26:57] Escaneense este código que está al lado derecho.
[26:59] Estamos utilizándolo para familiarizarnos con la plataforma que vamos a usar hoy durante el bootcamp.
[27:06] Listo.
[27:08] Por favor, los que dijeron que otros han escuchado hablar otros.
[27:10] Kimi, Kuen, Dipsic, Lama, Kuen, Kimi, Dipsic.
[27:13] Ok, acá son los hackers.
[27:15] Kimi K3.
[27:16] Listo.
[27:16] No se preocupen que los que están avanzados también los van a ver dentro de Houston.
[27:21] Listo.
[27:21] Quiero que ahora me pongan cuál de las siguientes se utilizan en su día a día.
[27:25] No de cuáles escucharon hablar.
[27:26] Cuáles se están utilizando en su día a día.
[27:28] Listo.
[27:32] Y los que dicen otro, lo mismo.
[27:34] Si dijeron otro, vayan en el chat de Zoom y pónganme cuáles se están utilizando en su día a día.
[27:40] Oscar Contreras dice, ¿por qué me pide código de invitación para entrar a Houston?
[27:44] No se preocupen.
[27:44] Ahorita más tarde les vamos a dar acceso a todos.
[27:47] La razón por la cual tiene un código de invitación es porque estaba en un beta cerrado todavía.
[27:51] Dicen por acá, Copilot.
[27:54] IBM Bob, dice John Morales.
[27:57] Copilot, Copilot.
[27:59] Vale, veo que hay varios que utilizan Copilot.
[28:01] Eleven Labs, The Magnific.
[28:03] Copilot, dice Carlos Corcho.
[28:05] Wow, hay hartos que utilizan Copilot y no lo teníamos acá como una opción.
[28:09] La buena noticia es que Copilot sirve dentro de Houston también.
[28:12] Dicen por acá, ¿la alerta de virus al instalar Houston es normal?
[28:19] Oscar, la respuesta es sí.
[28:20] Nos acaban de dar nuestro certificado de Windows hace poco y le tienes que dar más información y que te la deje ejecutar.
[28:27] Y a medida que más personas lo hagan, va a desaparecer ese mensaje.
[28:30] Pero no se preocupen, vamos ahorita en la segunda parte, vamos a hacer una sesión de instalar las herramientas, instalar todo.
[28:39] Listo, hay 476 personas acá.
[28:41] Por favor, vayan a su celular y terminen de responder para saber que están acá presentes.
[28:48] Listo, dicen por acá, Copilot, The Ser Empresarial, Google, Magnific, Queen, Quen, Química 3, DeepSeq, Quen.
[28:57] Wow, hay hartos que son bastante hackers.
[29:00] Listo, ¿cuál de los siguientes se utilizan en su día a día?
[29:04] Le voy a dar 30 segundos más.
[29:06] Hay personas que se siguen, un minuto más, hay personas que se siguen uniendo.
[29:09] Así que si están perdidas o perdidos, lo que estamos haciendo es, estamos utilizando esta plataforma para entrar en calor con lo que vamos a utilizar hoy.
[29:19] Listo, pónganlo por acá.
[29:21] Escaneen esto con su celular y con el celular pueden ir participando.
[29:25] Genspark, dice David.
[29:27] Los que están teniendo temas y no han podido descargar Houston, no se preocupen, lo vamos a hacer juntos y les va a abrir su micrófono y está el equipo de ingeniería acá.
[29:39] Vamos a tocar el tema de seguridad.
[29:41] Eso me inquieta y no tener control.
[29:42] Sí, sí, vamos a tocar el tema de seguridad.
[29:44] Efraín, si quieres también guarda tu pregunta, vayla mandando por el chat.
[29:49] Listo, y 19 segundos más.
[29:51] Listo, los ganadores son, aparentemente, ChatGPT Work.
[29:55] Bueno, muy bien a todos los que usan ChatGPT, ChatGPT Work.
[29:59] Cloud Co-Work.
[30:00] Gemini, sin duda.
[30:01] Open Cloud.
[30:02] Ahí veo que hay un par de hackers acá adentro.
[30:05] Cloud Code, Codex y otro.
[30:07] Y veo que han mandado muchísimo Copilot por acá.
[30:11] Listo, bueno, sigamos entonces.
[30:20] Listo, entonces voy a dejar de compartir esto.
[30:22] Muchísimas gracias a todos por participar en la primera parte.
[30:25] No hemos arrancado acá en el taller.
[30:27] Un segundito por acá.
[30:29] Un aplauso para todos ustedes por participar.
[30:31] Muchísimas gracias.
[30:33] Creo que ya estamos listos y ya están como familiarizados con la herramienta.
[30:36] Así que antes de arrancar, nosotros siempre hacemos este tipo de cosas.
[30:40] Quiero que todos se pongan de pie.
[30:42] Por favor, párense un segundo.
[30:43] Vamos a hacer un stop.
[30:44] Párense.
[30:46] Pongan sus cámaras que los quiero ver.
[30:48] Y vamos a mover la energía del cuerpo.
[30:50] Para mí son las 7 y 30 de la mañana en San Francisco, California.
[30:52] Quiero que todo el mundo levante los brazos.
[30:56] Que se estiren para un lado.
[30:58] Que se estiren para el otro.
[31:00] Porque vamos a hacer bloques de dos horas.
[31:04] Eso.
[31:04] Listo.
[31:06] Se van a dar cuenta que en la mitad de la sesión les voy a decir que vamos a hacer un stop.
[31:09] Cuando yo les diga que vamos a hacer un stop, significa que vamos a hacer esto.
[31:12] Listo.
[31:13] Y los que van entrando y se sienten perdidos y ven a todo el mundo,
[31:16] ¿por qué está estirando todo el mundo?
[31:17] Es porque estamos a punto de comenzar y estamos actiando la energía del cuerpo.
[31:23] Listo.
[31:24] Les comparto mi pantalla y arrancamos.
[31:32] Les comparto mi pantalla y arrancamos.
[31:38] Listo.
[31:39] Mil gracias a todos los que participan en el stop.
[31:44] Listo.
[31:45] Vamos acá.
[31:46] Full screen mode.
[31:47] Quiero que por favor me confirmen ahí por el chat.
[31:50] Manden si están viendo la pantalla.
[31:51] Manden una manito.
[31:53] Manden un número uno.
[31:54] Y yo los voy ahí viendo.
[31:57] ¿Listo?
[31:58] Listo.
[31:59] Ahí van reaccionando.
[32:00] Van reaccionando.
[32:01] Los veo.
[32:01] Los veo.
[32:01] Los veo.
[32:02] Los veo.
[32:04] Listo.
[32:05] Quiero que sepan que yo estoy leyendo el chat constantemente.
[32:07] ¿Listo?
[32:09] Uno.
[32:09] Uno.
[32:09] Uno.
[32:10] Manitos.
[32:10] Manitos.
[32:10] Listo.
[32:11] Listo.
[32:12] Bienvenidos a todos a este bootcamp de hoy que se llama Construye agentes de IA para tu empresa de 0 a 1.
[32:17] La idea de hoy es que ustedes construyan su primer agente con sus propias manos y también se lleven el método que nosotros utilizamos para que puedan construir los de ustedes también.
[32:26] Listo.
[32:26] Que se puedan construir cualquiera.
[32:28] Hemos recibido muchísimos comentarios de gente preguntándonos que si les voy a compartir, que si les voy a enseñar a usar el agente que yo les mostré durante los demos.
[32:36] Muchos de ustedes vieron el demo.
[32:38] La respuesta es sí.
[32:39] Se los voy a entregar hoy y lo vamos a usar.
[32:40] Les voy a usar ese como ejemplo.
[32:43] Uno de los ejemplos hoy.
[32:44] ¿Listo?
[32:46] Antes de arrancar, ¿quiénes somos nosotros?
[32:48] Quiero tomar un paso atrás porque pronto nos presentamos en alguno de los keynotes que hicimos con Platzi, con LabDS, con Dan Macías, con 30X.
[32:55] Pero somos un equipo de dos colombianos que estamos basados en San Francisco, California.
[33:00] Mi nombre es Felipe Salinas.
[33:02] Tengo experiencia en empresas como Mastercard, como Red Bull y en fondos de inversión como Latitude.
[33:06] Y Julián Mico, fundador, es ingeniero y filósofo de la Universidad Nacional.
[33:11] Antes de trabajar en Houston, era Machine Learning Engineer Lead en una empresa de videojuegos en Los Ángeles, del creador de las primeras 14 aplicaciones de iPhone en la aplicación del App Store.
[33:22] Y, bueno, somos dos colombianos que están basados en Silicon Valley y con ganas de aportarle muchísimo valor a Latinoamérica.
[33:31] Houston es nuestra empresa.
[33:32] Nosotros lanzamos Houston en Boston hace unas cuatro o seis semanas ya largas.
[33:39] Perdón, como unas ocho semanas.
[33:40] Ya estamos en agosto.
[33:42] Y, bueno, eso es lo que les vamos a contar hoy.
[33:44] Bueno, gracias por los comentarios por ahí.
[33:48] Qué privilegio.
[33:49] Privilegio para mí también estar acá con ustedes.
[33:50] ¿Listo?
[33:51] Esto es un poco de quiénes somos nosotros.
[33:54] Y, bueno, estamos trabajando en Inteligencia Artificial hace, en Silicon Valley hace dos años.
[33:59] Levantamos una ronda de inversión.
[34:00] Levantamos cerca de un millón de dólares en Silicon Valley.
[34:02] Y tenemos un equipo que está en Latinoamérica.
[34:04] ¿Listo?
[34:06] Listo.
[34:07] Antes de arrancar, también quiero recordarles que nosotros estamos en una misión.
[34:10] Nosotros estamos en una misión de darles un agente de Inteligencia Artificial a cada persona y a cada empresa del planeta.
[34:16] Hoy estamos empezando con ustedes, las empresas que mueven Latinoamérica.
[34:20] Cada gente que ustedes construyen y cada cosa que hacen con Houston nos ayudan a llegar a esa misión.
[34:26] ¿Listo?
[34:26] Al final de este taller, ustedes van a salir con un agente funcionando y van a salir con la metodología clara para poder crear cualquier agente de día sin saber programar.
[34:34] Cuando estábamos preparando este bootcamp, más que darle solo la opción de que copien y peguen nuestras cosas,
[34:40] es darles nuestro marco de pensamiento para que ustedes se puedan sentar con sus equipos y decir, bueno,
[34:44] ¿cómo convertimos un problema en vivo en un agente que nos pueda resolver cosas?
[34:48] Un agente de día.
[34:49] ¿Listo?
[34:52] Listo.
[34:52] Dicen acá por el chat, unos duros trabajando con otros duros.
[34:55] Orgullo colombiano.
[34:56] Muchísimas gracias, Claudia.
[34:58] Listo.
[34:59] Los que se queden hasta el final se van a llevar las siguientes cosas.
[35:02] Lo primero, se van a llevar mi agente con todos los skills y herramientas.
[35:06] Lo segundo, se van a llevar un certificado de participación por haber estado acá.
[35:09] Los que se queden hasta el puro final.
[35:10] Tercero, los que se queden acá, tenemos dos obsequios de dos partners que tenemos.
[35:16] Uno es un código de Appify.
[35:18] Appify es una de las herramientas que utilizamos para hacer scraping en la web.
[35:22] Tienen 75 dólares de Appify en los que se queden hasta el final.
[35:25] Y Open Router, que es un proveedor de modelos de inteligencia de IA.
[35:28] También les vamos a dar unos créditos para que puedan hacerlo.
[35:31] Y les vamos a pasar toda la guía y grabación.
[35:33] ¿Listo?
[35:34] Muy seguramente al final lo que vamos a hacer o en la mitad de esta sesión,
[35:36] hacemos algo por WhatsApp, Juan, o algo para que les podamos mandar esto más fácil a todo el mundo.
[35:41] ¿Listo?
[35:42] Así que esto responde a algunas de las preguntas.
[35:46] Vayan mandando ahí por el chat las cosas, las preguntas que vayan teniendo.
[35:50] ¿Listo?
[35:51] Listo.
[35:52] Un poco la agenda de hoy.
[35:54] Lo primero que vamos a hacer es, vamos a arrancar, arrancamos hoy a las 9 en Puntura Colombia.
[35:58] Arrancamos con un ejercicio de calentamiento porque se seguía viniendo mucha gente.
[36:02] La primera fase va a ser teoría y la segunda va a ser 100% práctica.
[36:07] Así que, por favor, quiero que estén en un lugar cómodo, tengan un computador, tengan acceso a internet.
[36:12] Y si no lo tienen, por favor, corran a la oficina, conéctense y para que lo puedan hacer.
[36:17] ¿Listo?
[36:17] El primer bloque va a ser pura teoría.
[36:19] Les voy a contar el qué.
[36:21] Les voy a contar todas las bases.
[36:22] Si se sienten perdidos en algún momento, vayan diciendo por el chat.
[36:27] Y luego vamos a arrancar a la parte 100% práctica.
[36:30] Más o menos en unas dos horas vamos a estar arrancando la construcción guiada
[36:34] después de haberles mostrado toda la parte de teoría para que nos alineamos.
[36:37] ¿Listo?
[36:41] Sigan haciendo sus preguntas por acá.
[36:43] Sigan haciendo sus preguntas por acá.
[36:46] Hacen preguntas por ahí.
[36:47] Vamos a tener acceso a un año para Houston, ¿es verdad?
[36:49] Vamos a darles unos accesos a Houston gratuitos y hay un programa de Houston que les vamos a contar.
[36:56] Desde el momento uno, quiero ser también súper transparente con ustedes.
[37:00] Yo les voy a dar toda mi energía.
[37:02] Y ahora vamos a hacer unos acuerdos primero.
[37:05] Lo primero, hagamos unos acuerdos.
[37:08] Yo estoy acá, me levanté a las 6 de la mañana, ahora San Francisco, con toda la energía del mundo.
[37:12] No quiero estar acá en un podcast.
[37:14] Quiero que estemos participando.
[37:15] Ustedes dieron cuenta que hay dinámicas que tenemos para este bootcamp.
[37:18] Les pido, por favor, que participen activamente.
[37:21] Que sean curiosos y que se diviertan.
[37:23] Por favor, cuando yo les haga preguntas por el chat, respondan por el chat porque yo los leo y eso me energiza de vuelta y me siento que estoy en un taller con ustedes acá y no estoy en modo podcast.
[37:34] ¿Listo?
[37:35] Y quiero que hablemos súper claro desde ya.
[37:37] Yo hoy les voy a entregar mucho valor.
[37:38] Vamos a estar conectados 4 horas.
[37:40] Les voy a enseñar todo, que lo puedan usar con Houston, sin Houston.
[37:43] Pero también voy a hablar de nuestra empresa.
[37:45] Quiero que lo sepan desde el momento 1.
[37:46] Mi apuesta es que yo les dé tanto valor en estas 4 horas que ustedes digan, ok, es justo que nos cuente de su empresa 10 minutos.
[37:53] ¿Listo?
[37:53] Si están de acuerdo, vamos a hacer estos acuerdos.
[37:57] Quiero que manden por el chat.
[37:59] Estoy de acuerdo y yo arranco.
[38:02] Los acuerdos para hoy es, esto no es un podcast, vamos a participar activamente.
[38:05] Sean curiosos, pregunten un montón.
[38:08] Y yo les voy a dar 4 horas de puro valor a cambio de 10 minutos de contarles también lo que estamos haciendo en nuestra empresa.
[38:15] Y de frente les voy a decir eso para que ninguno sienta que no fue claro desde el principio.
[38:20] ¿Listo?
[38:20] Los sigo leyendo y hay gente que sí sigue uniendo.
[38:23] Los que se van uniendo.
[38:24] Estamos haciendo unos acuerdos antes de comenzar.
[38:27] Listo, los estoy leyendo.
[38:28] De acuerdo, de acuerdo, de acuerdo, de acuerdo.
[38:29] Listo.
[38:30] Estamos de acuerdo.
[38:31] Sí a todo, dicen por acá.
[38:32] Gracias, muchas gracias.
[38:33] Acepto.
[38:34] De acuerdo.
[38:35] Eche.
[38:35] De acuerdo.
[38:36] De acuerdo.
[38:36] Listo.
[38:37] Vamos a arrancar entonces.
[38:40] Los que se siguen uniendo.
[38:41] Los que se están uniendo media hora.
[38:50] Arranquemos con la parte teórica.
[38:52] Para los que se van uniendo vamos a hacer una parte teórica.
[38:54] Y después de este bloque vamos a hacer una parte 100% práctica.
[38:57] ¿Listo?
[38:58] Lo primero es que quiero que arranquemos desmitificando los agentes porque esta industria llama la palabra agentes para todo.
[39:06] Esto es lo que realmente hace cada uno.
[39:09] Por un lado, ustedes tienen los chatbots.
[39:11] Los chatbots son reactivos y no tienen memoria.
[39:15] Acá caben los chat GPTs del mundo.
[39:17] Acá caben los chat de Antropic cuando solo era chat.
[39:22] Acá caben los dipsticks del mundo cuando solo usan chat.
[39:25] ¿Listo?
[39:26] Es reactivo y no tiene memoria.
[39:28] Es muy útil cuando ustedes ya saben qué preguntar.
[39:30] Muchas de las personas los agarran acá.
[39:32] Lo cogen de Google, ¿no?
[39:34] Le preguntan cosas.
[39:37] Le pasan un PDF y le dicen, hey, ¿cuál es nuestra política de evoluciones?
[39:40] Y les puede responder.
[39:42] En una segunda instancia están todas estas aplicaciones que ya pueden ser co-workers o asistentes del humano.
[39:49] Acá está chat GPT Work.
[39:51] Acá está Cloud Co-Work.
[39:54] Y acá está Gemini Spark.
[39:56] Ustedes ya le pueden decir a la inteligencia que les haga, les tome acción a través de herramientas.
[40:01] Pero ustedes siguen siendo el director.
[40:04] Ustedes siguen siendo el piloto.
[40:05] Ustedes están revisando los borradores.
[40:07] Están revisando los correos.
[40:09] ¿Listo?
[40:09] Como que siguen co-trabajando.
[40:10] Como si tuvieran un co-worker.
[40:12] Y luego, número tres, están los agentes.
[40:15] Los agentes de IA pueden razonar.
[40:17] Pueden decidir.
[40:18] Pueden ejecutar acciones a través de sistemas.
[40:20] Y ustedes gestionan los resultados.
[40:22] No los pasos.
[40:23] ¿Listo?
[40:24] Acá ustedes lo ponen en modo piloto automático.
[40:26] Como lo pueden poner en Houston.
[40:27] Y ustedes le dicen, quiero que hagas A.
[40:30] Y él va y hace A, B, C, E, D, E.
[40:32] Toma decisiones.
[40:34] Entra herramientas.
[40:35] Entra bases de datos.
[40:36] ¿Listo?
[40:37] Acá están los Houston del mundo.
[40:39] Acá está Cloud Code.
[40:41] Las personas que lo utilizan ya de manera más automatizada.
[40:44] Acá están los Hermes del mundo.
[40:46] Acá están los Open Cloud del mundo.
[40:47] Y acá están muchos más que van a seguir saliendo.
[40:50] En los próximos 24 meses,
[40:52] todas las personas del planeta van a tener un agente de IA
[40:54] trabajando con ellos.
[40:55] Por el simple hecho de que los laboratorios más grandes del mundo,
[40:59] Antropic, ChatGPT y Google,
[41:02] todos están ya lanzando agentes de IA
[41:04] o están lanzando cosas para hacerse sus propios agentes de IA.
[41:07] ¿Listo?
[41:08] Preguntan por acá, ¿dónde queda N8N?
[41:10] N8N es una plataforma para hacer automatizaciones.
[41:13] Normalmente son de pasos rígidos.
[41:16] ¿Listo?
[41:18] ¿Listo?
[41:20] Toda gente está compuesto de cinco cosas.
[41:23] ¿Listo?
[41:24] La primera es la identidad.
[41:26] ¿Quién es?
[41:26] ¿Cuál es su rol?
[41:27] ¿Cuáles son las barreras operativas?
[41:29] Lo segundo es las habilidades.
[41:31] ¿Qué sabe hacer?
[41:32] Las habilidades de un agente son estos procedimientos que son
[41:34] componibles.
[41:35] El agente los puede ejecutar.
[41:37] Se construyen una vez y se reutilizan entre equipos.
[41:39] Vamos a entrar a...
[41:40] En un momento vamos a entrar a todos estos.
[41:43] Dicen, ¿nos pueden compartir la presentación?
[41:44] Sí, se las vamos a compartir.
[41:45] Número tres.
[41:49] Un agente tiene que poder utilizar herramientas.
[41:51] Si un agente no utiliza herramientas de inteligencia...
[41:54] Un agente de inteligencia artificial no utiliza herramientas,
[41:58] no es un agente, es un chatbot.
[42:00] ¿Herramientas cuáles son?
[42:01] Que pueda entrar a su Slack, que pueda entrar a su WhatsApp,
[42:04] que pueda entrar a su Telegram, que pueda entrar a su Salesforce,
[42:06] que pueda entrar a su HubSpot, que pueda entrar a su Telegram.
[42:10] ¿Listo?
[42:11] Herramientas.
[42:12] Sistemas.
[42:12] Que son sistemas externos o internos que puede utilizar.
[42:16] Número cuatro.
[42:17] Un agente de IA tiene que tener memoria.
[42:19] Y memoria acá se refiere a tener contexto persistente entre sesiones.
[42:24] Ahorita vamos a entrar en profundidad, pero les voy a mostrar que los agentes de IA,
[42:28] los modelos de inteligencia artificial, no traen memoria per se.
[42:32] Traen algo que se llama una ventana de contexto.
[42:34] A medida que ustedes van hablando, hablando, hablando, se va llenando y se resetea y se le olvida todo.
[42:38] ¿Listo?
[42:39] Todo agente está compuesto de cinco cosas.
[42:42] Identidad, habilidad, herramientas, memoria y de último está el cerebro de IA.
[42:48] Es la quinta pieza, es la más importante.
[42:50] Es el modelo que ustedes utilizan y les da la opción a su agente para que razone y para que decida.
[42:56] Ningún modelo de IA es el mejor en todo.
[42:58] Hay modelos que son mejores en video, hay modelos mejores en fotos,
[43:02] hay modelos mejores en investigación, hay modelos mejores en escritura.
[43:05] ¿Listo?
[43:06] En Houston, ustedes pueden utilizar más de 400 que ustedes tengan.
[43:10] ¿Listo?
[43:13] Dicen por acá qué bases de datos debe utilizar.
[43:16] ¿Pueden ser libros de Excel?
[43:17] Sí, puede conectarse a Excel.
[43:19] Dicen por acá, ¿se puede conectar al RP de la empresa?
[43:22] La respuesta es sí.
[43:23] Juan Salinas está contestando por ahí, pero si tiene un RP o un MSP, se puede conectar.
[43:29] ¿Listo?
[43:31] Quiero que ustedes se lleven esta analogía en la cabeza.
[43:33] Y pueden ir haciéndole pantallazos a esto, si les ayuda a ubicarse también, le pueden ir haciendo pantallazos.
[43:40] Si les puedo dar una analogía, tener un aplicativo de crear agentes de IA es como tener un carro donde el modelo de IA es el motor.
[43:53] ¿Listo?
[43:53] El modelo de IA puede ser Antropic, puede ser los modelos de Antropic que son Cloth, puede ser los modelos de OpenAI, puede ser Gemini.
[44:00] Acá pueden estar los modelos chinos, Deep Seek, QM, Kimi K3, todos los demás.
[44:06] Pero un agente de IA necesita muchas más cosas, es como un carro.
[44:10] Un carro no es solo el motor, un carro es el motor, las llantas, el volante, la palanca.
[44:15] Eso es lo que es Houston, Houston es el carro.
[44:18] La terminología correcta es un arnés, que es lo que está agarrando a todo alrededor.
[44:24] Entonces, un arnés como estos, un carro como Houston, tiene el volante, es donde está la identidad, que es el que conduce, a dónde va.
[44:31] Tiene la palanca de cambios, que son las habilidades, le da las maniobras para saber ejecutar.
[44:35] Tiene las ruedas, que son las herramientas donde la gente toca la calle, o sea, sus aplicaciones.
[44:40] Tiene memoria, que es el tablero y el GPS.
[44:44] Y tiene el motor, que es el cerebro, el cerebro de IA.
[44:47] El cerebro puede ser Cloth, puede ser Antropic, los modelos de Antropic, OpenAI.
[44:52] ¿Qué pasa?
[44:52] Muchos preguntan, ¿cuál es la diferencia entre utilizar algo como Houston y utilizar Cloud Cowork?
[44:56] Cloud Cowork es el arnés y Cloud Code es el motor.
[45:01] Cloud Cowork es la carrocería que tiene todo esto y el motor que puede utilizar son los motores de Antropic, que es el dueño de Cloud.
[45:10] Si ustedes quisieran cambiarle este motor dentro de Cloud Cowork, no pueden.
[45:15] ¿Listo?
[45:15] La diferencia de Houston es que Houston no le pertenece a ningún modelo de, a ningún laboratorio de IA.
[45:20] Entonces, ustedes le pueden cambiar este motor a su gusto.
[45:22] O inclusive, por cada uno de los chats le pueden conectar un motor diferente.
[45:25] ¿Listo?
[45:28] Listo, váyanle tomando acá.
[45:29] Dice, Cloud Cowork reemplaza a Hermes.
[45:33] Comparten los mismos principios, Andrés.
[45:37] ¿Listo?
[45:38] La gran diferencia es que Hermes tiene otros protocolos de automemoria, tiene protocolos de, sí, de automejorarse, tiene otro tipo de cosas.
[45:50] Pero Hermes es un, una carrocería.
[45:53] Hermes es como Houston.
[45:54] ¿Listo?
[45:54] ¿Listo?
[45:56] ¿Pueden conectar varios motores?
[45:57] Sí, se pueden conectar advertores.
[45:59] Si digo Cloud Pro y Chat GPT Plus.
[46:01] Houston, ¿qué motor de los dos escoge?
[46:03] El que tú le pongas, Jorge.
[46:04] ¿Listo?
[46:04] ¿Listo?
[46:05] Listo.
[46:06] Vayan poniendo preguntas por el chat que nosotros los leemos, el equipo también los lee y vamos respondiendo.
[46:12] ¿Listo?
[46:15] Listo.
[46:15] Sigamos.
[46:17] Veamos las piezas de cada uno de estos en detalle.
[46:19] ¿Listo?
[46:20] Primero se las voy a explicar y luego les voy a mostrar cada una cómo se ve en una aplicación como Houston.
[46:24] ¿Listo?
[46:25] Para que vayamos haciendo el paralelo todo el tiempo.
[46:27] ¿Listo?
[46:28] Entonces arranquemos con las piezas en detalle.
[46:30] La primera pieza y más importante es definir la identidad de la gente.
[46:35] Es definir cuál es el rol, cuál es la voz, cuáles son las barreras operativas.
[46:40] Es definir de qué es responsable y cómo nos representa.
[46:44] ¿Listo?
[46:45] Una buena identidad tiene cinco ingredientes.
[46:47] Tiene un rol, tiene un comportamiento, tiene unas reglas duras, tiene unas reglas de vocabulario y tiene un tono.
[46:56] ¿Listo?
[46:56] Esto es lo que hace que un agente de IA que tiene, o que dos agentes de IA con el mismo modelo se sientan totalmente diferentes.
[47:04] ¿Listo?
[47:04] Esto es lo que hace que el agente Juan Vélez sea diferente al agente de Felipe Salinas o el agente de Henry López sea diferente al de Felipe Londoño.
[47:13] ¿Listo?
[47:13] El mismo agente puede tener dos instrucciones diferentes y ustedes van a tener resultados completamente distintos.
[47:21] Les voy a mostrar cómo se ve un ejemplo de unas malas instrucciones y cómo se ve un ejemplo de unas buenas instrucciones.
[47:27] ¿Listo?
[47:28] Un ejemplo de unas malas instrucciones para un agente.
[47:31] Eres un agente de ventas.
[47:32] Ayúdame a conseguir más clientes.
[47:33] Escribe correos de prospección.
[47:34] Sé profesional.
[47:35] No tiene ni el rol, no tiene ni el comportamiento, no tiene ni reglas duras, no tiene ni vocabulario, no tiene tono.
[47:42] ¿Listo?
[47:43] Falla porque no tiene el alcance, no tiene las reglas, no tiene el vocabulario.
[47:47] El agente se puede inventar precios, puede mandar correos que ustedes no aprobaron.
[47:50] ¿Listo?
[47:53] Listo.
[47:53] Dice, esto se define por agente o se puede definir por organización para todos los agentes.
[47:56] Dice Pablo Molano.
[47:57] Bueno, en este momento se define por agente, pero una empresa puede crearle un agente para compartir con sus colaboradores.
[48:04] ¿Listo?
[48:05] Listo.
[48:06] Les voy a mostrar acá mientras, les voy a mostrar acá un segundo, cómo se va viendo eso escrito.
[48:14] Les voy a mostrar acá ejemplo, les voy a ir mostrando para irles haciendo el paralelo entre el lab.
[48:19] ¿Listo?
[48:19] En Houston, ustedes entran, yo tengo un agente que es el que les voy a compartir hoy, que es el SDR o el representante de ventas.
[48:28] Se lo voy a mostrar acá, que está más limpio.
[48:31] Y en la parte, la voy a poner en español para que todos lo hagamos en español.
[48:36] Dentro de Houston, ustedes siempre lo van a ver en configuración.
[48:39] Unas buenas instrucciones tiene que tener un rol, comportamiento, reglas duras, vocabulario y el tono.
[48:46] Bueno, ustedes van a ver acá que cuando entran dentro de Houston, más adelante cuando entremos en la parte de práctica,
[48:52] en la sección de configuración van a ver instrucciones y acá está el rol.
[48:56] Soy un operador comercial, redacto, nunca envío, para empezar, cómo te hablo, mis habilidades, configuración, ritmo diario,
[49:05] cómo prospecto en outbound.
[49:08] ¿Listo?
[49:08] Ahí está todo.
[49:11] ¿Listo?
[49:11] Entonces, hago una recapitulación.
[49:13] Un agente tiene cinco piezas, tiene identidad, tiene habilidades, tiene herramienta, tiene memoria
[49:19] y tiene un modelo de ida que es el motor del carro.
[49:23] El carro completo es un arnés, el modelo es el motor.
[49:27] ¿Listo?
[49:30] Listo.
[49:30] Sigan poniendo acá sus preguntas que ya los debemos.
[49:33] ¿Listo?
[49:34] Listo.
[49:35] Identidad.
[49:36] ¿Quién es?
[49:37] ¿Listo?
[49:37] Le pueden tomar acá pantallazo a esto.
[49:39] Les vamos a pasar esto para enseñarles a escribir las instrucciones de manera, unas buenas instrucciones.
[49:45] ¿Listo?
[49:47] Segundo, están las habilidades.
[49:49] Las habilidades es de las partes más importantes que tiene que tener un agente.
[49:53] Ustedes la escriben una vez y la pueden reutilizar miles de veces o pueden hacer que Houston siga aprendiendo sobre esa habilidad.
[49:59] Una habilidad no es más que un procedimiento componible que el agente puede ejecutar.
[50:04] Ustedes lo construyeron una vez y lo pueden reutilizar en agentes y en equipos.
[50:08] Dentro de Houston, ustedes como empresa pueden crearse un skill y compartírselo a todos los miembros de su empresa.
[50:13] O lo pueden compartir con diferentes agentes.
[50:16] ¿Listo?
[50:17] Una habilidad o un skill puede ser enseñarle a prospectar a su agente.
[50:21] Oigan, paso uno, yo prospecto así, me meto a la página web del prospecto, miro su página web, analizo esto,
[50:28] luego consigo su correo utilizando Apolo o Instantly.
[50:31] ¿Listo?
[50:32] Luego me meto a Appify y lo utilizo para scrapear tal cosa.
[50:36] Luego le mando a las personas de mi equipo un mensaje por Teams o por Slack.
[50:40] ¿Listo?
[50:43] Listo, preguntan por acá.
[50:45] ¿El numeral que está ahí es indispensable?
[50:47] No, no es indispensable en las instrucciones.
[50:50] Yo lo pongo porque ayuda a ordenar la información y la gente lo puede leer.
[50:56] ¿Listo?
[50:57] Una habilidad es un archivo con instrucciones.
[50:59] Cuando alguien les hable de skills y ustedes se pierdan y piensen que eso está por allá en la estratosfera,
[51:05] quiero que bajen a la tierra y se den cuenta que una habilidad o una skill no es más que un archivo con instrucciones.
[51:11] Es un archivo de texto con instrucciones.
[51:14] El agente lo lee cuando lo necesita.
[51:17] Entonces, hay tres niveles de carga que utiliza un agente antes de leerse su skill o leerse su habilidad.
[51:23] Lo primero es que, y muy importante, lee el nombre y lee la descripción de ese skill.
[51:28] ¿Listo?
[51:29] Siempre está leyendo con texto.
[51:31] Es lo único que la gente ve antes de decidir si utiliza esa habilidad o no.
[51:35] Para no leerse todo el archivo de texto, lee el nombre y lee la descripción.
[51:39] Hay que ser súper intencionales en hacer esto.
[51:42] Es esta parte que ustedes ven acá.
[51:44] Lo segundo es que el cuerpo es un archivo que se llama un skill MD.
[51:48] Y esto es un archivo de texto que está guardado en su computador o está guardado en un computador en la nube,
[51:53] dependiendo del prioridad que estén utilizando.
[51:55] Y se lee cada vez que se va a utilizar.
[51:58] ¿Listo?
[51:59] Se carga únicamente cuando la habilidad se activa.
[52:02] ¿Listo?
[52:02] Ahí tienen sus reglas, tiene el proceso, tiene los ejemplos y normalmente tiene menos de 500 líneas.
[52:07] Número tres, recursos opcionales.
[52:11] Ustedes le pueden poner en ese skill, le pueden poner plantillas, le pueden poner documentos de referencia,
[52:17] que únicamente los lea cuando ustedes quieren que haga eso para que no se esté consumiendo tokens
[52:21] mientras ustedes están hablando con su agente IA.
[52:23] Es decir, ustedes le dicen, quiero que hagas una propuesta y cada que hagas una propuesta,
[52:28] quiero que la utilices utilizando la habilidad de diseño de propuestas en mi empresa.
[52:33] Acá esa habilidad tiene un ejemplo de cómo se ven las propuestas.
[52:37] Entonces, va a utilizar ese skill y siempre va a reutilizar eso de manera ordenada.
[52:43] ¿Listo?
[52:43] Es simplemente un archivo de texto.
[52:46] ¿Listo?
[52:47] Preguntan por acá, ¿Houston tiene agentes predefinidos?
[52:50] Sí, hay un par que les vamos a entregar de predefinidos.
[52:55] ¿Qué son tokens en IA?
[52:57] Preguntan por acá, ¿cómo funciona el consumo de tokens?
[53:01] Listo, les voy a dar un ejemplo súper específico.
[53:05] El consumo de tokens y los tokens funcionan diferente dependiendo de cada modelo de IA que ustedes estén utilizando.
[53:11] Si están utilizando algo como Cloud o como ChatGPT, ellos tienen algo que se llama una ventana de contexto.
[53:17] Una ventana de contexto es la capacidad que tienen por chat, si lo quieren ver de esa manera.
[53:22] Cada que ustedes van hablando con ese chat, él va procesando información.
[53:26] Cada procesada esa información consume algo y ellos lo denominan en tokens.
[53:29] Tokens es la manera en que ellos están midiendo ese consumo del chat.
[53:34] Se los voy a poner así más fácil.
[53:36] A medida que ustedes hablan con un chat, van hablando, hablando, hablando, hablando, se va llenando.
[53:40] Y la ventana de contexto, dependiendo del modelo que ustedes estén utilizando, hoy está llegando a un millón de tokens.
[53:45] Cada mensaje que ustedes mandan, se consume un token, se consume otro token, otro token.
[53:49] Si están mandando el archivo, pues comen tokens para procesar ese archivo.
[53:53] Si está cargando un skill, está comiéndose ese token para procesar ese skill.
[53:57] ¿Listo?
[53:58] ¿Cómo se ve eso dentro de Houston hoy?
[54:01] Si ustedes van al, lo vamos a hacer en la parte práctica, pero si ustedes están acá en la sección de configuración del agente,
[54:08] pueden ver cuáles skills tiene este agente instalados.
[54:11] Yo en este momento solo le tengo una habilidad para tenerlo más limpio.
[54:14] Y cuando ustedes entran a esta habilidad, esto se ve algo como lo siguiente.
[54:19] ¿Cuál es el nombre de esta habilidad?
[54:20] Es comentarios de LinkedIn a un Google Sheets en vivo.
[54:23] ¿Cuál es la descripción?
[54:24] Cuando me pasen una URL, una publicación en LinkedIn, voy a crear una Google Sheets formateada.
[54:30] Voy a traerme los primeros mil comentarios.
[54:33] ¿Sí?
[54:33] Acá está todo.
[54:34] Voy a utilizar Appify para scrapear LinkedIn.
[54:38] Y está todo.
[54:39] ¿Para qué sirve?
[54:40] Esta es una habilidad.
[54:41] Demos en vivo.
[54:43] ¿Listo?
[54:43] ¿Listo?
[54:44] Y se los estoy mostrando de esta manera porque si ustedes están utilizando Cloud Cowork
[54:49] o están utilizando, por ejemplo, otros modelos de IA, lo van a ver así, en texto.
[54:54] En la manera en que nosotros creamos habilidades es, o se las damos para que las editen, es desde un chat.
[55:02] Es muy fácil.
[55:02] Pueden hablar y pueden crearlas ahí diciendo, esto es lo que quiero hacer.
[55:05] Ayúdenme a crearla.
[55:07] ¿Listo?
[55:08] Eso me lleva a la siguiente parte y es,
[55:11] la mejor forma de crear una habilidad es trabajando, no escribiendo.
[55:16] ¿Listo?
[55:17] No es necesario que ustedes se vuelvan locos diciendo,
[55:20] Felipe, pásenme el, pásenme por favor la plantilla para ir copiar y pegarle el paso a paso.
[55:25] No.
[55:25] La manera más fácil de crearse una habilidad ustedes es trabajando con el modelo de IA con el que ustedes están trabajando.
[55:34] Si están trabajando con Cloud Cowork, hagan toda una habilidad, o sea, co-trabajen y díganle, créeme, esto es una habilidad.
[55:40] Si están trabajando, de pronto puede funcionar.
[55:42] Dentro de Houston, ustedes co-trabajan, hacen el trabajo muy bien la primera vez, no lo deleguen, no le manden cualquier cosa, sino trabajen, le piden el resumen, la lista, el reporte, lo que sea, y le dicen, le dan feedback.
[55:57] Oye, no, esto sí, esto no, faltó el responsable, cámbiale esto, conéctate mejor a esto, ¿listo?
[56:03] Y luego que ustedes le hayan dado feedback y estén seguros de que esa habilidad les funciona, ustedes le van a pedir que se las cree como un skill.
[56:10] Y la manera de pedírselo es en el chat, ustedes le dicen, por favor, guarda esto como un skill y ya, les quedó listo como un skill.
[56:18] ¿Listo?
[56:19] Queda guardada y queda lista para reutilizar cuando quieras.
[56:22] Esto es un protocolo que nosotros estamos usando para que la gente vaya a aprender a medida que las personas lo van usando.
[56:28] También cuando una tarea pasa terminada, Houston lee todo y va aprendiendo de todo lo que aprende en el chat, lo vuelven a las habilidades.
[56:36] ¿Listo?
[56:39] ¡Listo! Váyanme poniendo ahí por el chat, vayan reaccionando con la manito, siguen ahí, están despiertos, vayan reaccionando, los voy leyendo.
[56:49] Dicen, me piden el código, sí, sí, listo, los veo.
[56:52] No quiero que se duerman esta parte teórica y vamos a pasar a la parte práctica después de esto, no se preocupen.
[56:57] ¿Cuál es el límite de tokens en la ventana de contexto de cada chat con un agente de IA en Houston?
[57:02] Pregunta Daniel Acosta.
[57:04] Daniel, eso depende directamente del modelo que estés utilizando.
[57:07] Si estás utilizando un modelo que solo tiene un millón de tokens, es un millón.
[57:10] Si estás utilizando uno de 250 mil, uno de 250 mil.
[57:13] Eso depende directamente del modelo de IA que estemos utilizando.
[57:16] ¿Listo?
[57:18] Listo, sigan mandando preguntas por acá.
[57:22] ¿Qué tanto tiempo es lo mejor para trabajar al lado de la IA?
[57:24] Ejemplo, ¿cuatro horas enseñando una habilidad o es prudente hacer un tema de minutos?
[57:29] Esa es una excelente pregunta, Mauricio.
[57:31] Yo me he pasado 48 horas seguidas trabajando con la IA.
[57:34] Creo que eso no depende tanto de las horas, sino depende del contexto,
[57:38] qué tanto se va llenando y qué tan complejo es.
[57:40] Yo lo que te diría es, sé detallado con una IA,
[57:44] co-trabaja en algo específico y dile, conviertanme en esto en una estabilidad.
[57:49] Porque si no, lo que va a pasar es que va a intentar leer muchas cosas diferentes.
[57:51] Entonces, hagan algo muy específico, conviertanlo en una habilidad.
[57:55] Hagan algo muy específico, conviertanlo en una habilidad.
[57:57] Hices una serie de habilidades, después le pueden decir a Houston,
[58:00] oye, conviertanme todas estas habilidades en una gran habilidad.
[58:03] ¿Listo?
[58:05] Listo, sigan acá preguntando, por favor, y Julián, Daniel y Juan de mi equipo
[58:09] puedan respondiendo las que vayan pudiendo responder.
[58:11] ¿Listo?
[58:14] La segunda mejor forma de crear habilidades dentro de cualquier modelo de estos,
[58:19] específicamente de un arnés como Houston, es denle documentos de lo que ustedes ya tienen.
[58:25] ¿Listo?
[58:26] Muchos de ustedes en sus empresas ya tienen cosas como manual de procedimiento de operaciones,
[58:31] tienen guías de inducciones que le dieron al practicante o a la persona que contrataron,
[58:35] tienen una plantilla con formatos que ustedes ya utilizan,
[58:38] tienen checklists y políticas de calidad.
[58:41] ¿Listo?
[58:41] Casi todas las empresas ya tienen algún proceso escrito,
[58:44] lo que no tienen es quién lo ejecute igual todas las veces.
[58:47] ¿Listo?
[58:47] Eso es la segunda mejor manera, agarren un PDF, se lo ponen en el chat,
[58:52] oye, quiero crear una habilidad a partir de este procedimiento y refinémoslo.
[58:56] ¿Listo?
[58:57] ¿Cómo funciona?
[58:58] Ustedes literalmente suben el documento o se lo compartan online,
[59:02] vienen acá, abren un nuevo chat y le dicen,
[59:05] vengo acá, adjunto un archivo y le dicen,
[59:09] este es el bootcamp de Houston,
[59:12] quiero que crees unas habilidades a partir de esto,
[59:14] o este es el manual de procedimientos para hacer esta tarea,
[59:18] y se lo botan en el chat y le dicen,
[59:20] crea una habilidad y ya está.
[59:23] ¿Listo?
[59:25] Segundo,
[59:27] pídanle que le vuelva una habilidad,
[59:28] les voy a decir,
[59:29] Houston les saca el paso a paso,
[59:30] les va a sacar las reglas y les va a sacar los formatos,
[59:33] y les va a sacar todo en el archivo de texto
[59:36] para que la habilidad pueda funcionar por ustedes.
[59:39] Ustedes no van a tener que meterse a hacer todo manual como,
[59:41] paso uno, paso dos,
[59:42] no, ustedes simplemente co-trabajen y le dicen,
[59:44] ponemos esta habilidad,
[59:45] y Houston,
[59:46] la manera en que está construido es,
[59:48] se lee eso y ya nosotros tenemos súper bien delimitado,
[59:51] ok,
[59:52] cómo escribir el paso a paso,
[59:53] cuáles son las reglas,
[59:54] cuáles son los formatos,
[59:55] cuál es el archivo que tiene que tener,
[59:56] ¿listo?
[59:58] Lo más importante es,
[60:00] traten estos modelos como que los modelos ya son inteligentes.
[60:06] Ustedes,
[60:06] esto me lleva al paso tres,
[60:08] agreguen lo que el papel no dice,
[60:10] agreguen las excepciones,
[60:11] agreguen los criterios,
[60:12] agreguen lo que ustedes llevan años haciendo,
[60:14] ¿no?
[60:15] El modelo ya es inteligente,
[60:16] no le repitan lo que ya sabe.
[60:18] Ejemplo,
[60:18] el modelo ya sabe que es un acta,
[60:20] lo que el modelo no sabe es,
[60:22] cómo se escribió un acta en la empresa de ustedes.
[60:25] Entonces,
[60:25] pásenle un ejemplo de cómo se hace,
[60:27] para que él aprende,
[60:28] diga,
[60:28] ah,
[60:29] ya sé que en esta empresa,
[60:30] el logo va a la izquierda,
[60:31] siempre lo numeran así,
[60:33] utilizan tal fuente,
[60:34] siempre le ponen fotos,
[60:36] lo que ustedes necesitan,
[60:38] ¿listo?
[60:38] Y traten a estos agentes de IA como agentes muy inteligentes,
[60:41] pero es como un practicante que le tienen que dar feedback
[60:43] hasta que quede bien hecha.
[60:45] ¿Listo?
[60:46] La buena noticia es que si ustedes están acá
[60:48] y saben en lenguaje natural explicar lo que quieren,
[60:51] le van a poder enseñar a un agente de IA hoy,
[60:53] lo que necesitan.
[60:55] Hace seis meses tenían que saber código,
[60:57] y tenían que saber cómo ejecutar los archivos,
[61:00] y cómo se tenían que vincular uno con otro.
[61:02] Hoy no,
[61:02] hoy simplemente tienen que subirle archivos,
[61:04] o co-trabajar,
[61:05] y decirle,
[61:05] conviertes esto en una habilidad,
[61:06] y lo va a saber utilizar.
[61:08] ¿Listo?
[61:11] ¡Listo!
[61:11] Hasta ahí.
[61:13] Vayan todavía poniendo preguntas.
[61:15] Vuelvan a reaccionar por ahí.
[61:17] Dicen,
[61:18] Feli,
[61:18] voy a leer algunas preguntas.
[61:20] ¿El agente va compactando
[61:22] o solo va llenando el contexto?
[61:23] Me refiero a un chat en una misión,
[61:24] dice Andrés Solano.
[61:25] Va compactándose cada que se llena
[61:27] toda la ventana de contexto.
[61:31] Listo.
[61:32] Vamos a ver,
[61:33] por acá,
[61:34] por acá.
[61:35] ¿Cómo puedo saber si una tarea
[61:37] hace parte de las funciones del agente o no?
[61:38] Ejemplo,
[61:39] tengo una gente que manda tasas de cambio
[61:40] por un grupo de WhatsApp.
[61:41] Ese mismo debería contestar preguntas
[61:43] o macroeconomía y temas de inversión.
[61:45] Excelente pregunta.
[61:46] Devolvámonos acá.
[61:48] ¿Cómo saber qué habilidades darle
[61:50] y qué no darle?
[61:51] Yo les diría que piensen esto
[61:53] como si ustedes acaban de contratar
[61:55] a un humano en su empresa.
[61:57] Si yo soy una persona
[61:58] que contrataron para hacer ventas,
[61:59] probablemente voy a poder hacer
[62:00] todas las cosas relacionadas a ventas.
[62:03] Pero si ustedes me ponen a hacer temas
[62:04] ya específicos de finanzas
[62:06] y recursos humanos,
[62:07] probablemente voy a comenzar
[62:09] a no hacerlo de manera específica,
[62:11] no voy a tener los ejemplos.
[62:13] Estos modelos de IA son inteligentes
[62:14] y se van a poder hacer cosas.
[62:15] Lo que pasa es que si ustedes
[62:16] le meten muchísimas habilidades
[62:18] de diferentes cosas,
[62:18] se vuelve terminando
[62:19] un agente general
[62:20] y comienza a tener peores resultados.
[62:24] Entonces,
[62:25] mi recomendación
[62:27] de lo que hemos visto
[62:28] que está funcionando mejor
[62:29] es la heurística
[62:31] que se ve en su cabeza
[62:32] es piensa en un agente IA
[62:33] como si fuera una persona.
[62:35] Entonces,
[62:36] piénselo como roles,
[62:36] piénselo como un vendedor,
[62:38] piénselo como un asistente
[62:40] de contabilidad,
[62:42] piénselo como un asistente comercial,
[62:44] piénselo como alguien de marketing.
[62:45] ¿Listo?
[62:46] Piénselo por roles.
[62:47] ¿Listo?
[62:48] ¿Listo?
[62:49] Listo.
[62:50] Seguimos,
[62:50] seguimos,
[62:51] seguimos.
[62:52] Reaccionan ahí por el chat
[62:53] para saber que seguimos por acá,
[62:55] que no están dormidos.
[62:56] Yo lo sigo leyendo.
[63:00] Listo,
[63:00] lo sigo leyendo.
[63:01] Va a leer más preguntas.
[63:03] ¿Puedo crear una skill
[63:03] para interactuar con un navegador?
[63:06] Dice Andrés Paez.
[63:08] Andrés,
[63:09] la respuesta es
[63:09] lo puedes hacer,
[63:10] pero la respuesta corta es
[63:12] ya existen herramientas
[63:14] para que un agente IA
[63:16] pueda utilizar cualquier navegador
[63:18] como pueden utilizar un API.
[63:20] Yo se las voy a compartir
[63:21] acá en la parte práctica.
[63:23] Les voy a compartir
[63:23] mi stack que yo utilizo
[63:24] para no tener que volverse
[63:26] a inventar la rueda.
[63:27] Ya hay gente que se dedicó
[63:28] a crear herramientas
[63:29] que se dedican a navegar la web
[63:31] de manera programática
[63:32] y ponen un MCP
[63:33] o ponen un API
[63:34] para que se puedan conectar.
[63:35] ¿Listo?
[63:37] Listo,
[63:38] siguen por acá.
[63:39] Si tengo
[63:40] Standard Operating Procedures
[63:42] de cargos
[63:43] de mi empresa,
[63:46] ¿puedo interactuar
[63:46] con otra gente IA?
[63:48] Es que se me fue.
[63:50] Especializados
[63:50] que ya se tengan
[63:50] dentro de Houston.
[63:51] Sí,
[63:52] todo esto es texto,
[63:53] todo esto lo pueden editar.
[63:54] ¿Listo?
[63:56] Listo,
[63:57] vamos a hablar
[63:57] de las herramientas.
[63:58] Las herramientas
[63:59] son los sistemas externos
[64:00] con los que la gente
[64:00] lee y escribe.
[64:02] Un agente es como un humano,
[64:04] puede hacer,
[64:04] en vez de hacer clics,
[64:05] se conecta
[64:06] a través de unos protocolos
[64:08] que les voy a contar,
[64:09] pero toma acciones
[64:09] y lee o escribe.
[64:11] ¿Listo?
[64:12] Sin herramientas,
[64:13] el agente
[64:13] solo puede hablar.
[64:15] ¿Ok?
[64:15] Sin herramientas,
[64:16] su agente
[64:17] es un chatbot
[64:18] glorioso,
[64:19] pero con herramientas
[64:20] puede tomar acciones.
[64:22] ¿Listo?
[64:22] En Houston,
[64:23] ¿cómo se ve esto?
[64:25] Ustedes van
[64:26] y tienen una pestaña
[64:27] que dice integraciones
[64:28] y dentro de Houston
[64:30] nosotros ya nos tomamos
[64:31] el trabajo
[64:33] de integrar
[64:34] mil herramientas
[64:35] para que ustedes
[64:35] se lo tengan que ir
[64:36] y hacer login.
[64:38] Está Notion,
[64:38] está Slack,
[64:39] está Shopify,
[64:40] está Outlook,
[64:41] está Zana,
[64:41] está Facebook,
[64:42] está LinkedIn,
[64:42] está Instagram.
[64:44] Están,
[64:44] bueno,
[64:45] mil aplicaciones.
[64:46] Todo lo que ustedes
[64:47] no encuentren ahí,
[64:49] hay una sección
[64:49] que se llama
[64:50] integraciones personalizadas
[64:51] y ya les voy a mostrar
[64:52] cómo se usa.
[64:53] ¿Listo?
[64:55] Algo que tienen que saber
[64:56] es que un agente
[64:57] se conecta al mundo
[64:58] de diferentes maneras
[64:59] y cada una
[65:01] tiene un momento.
[65:02] Lo primero
[65:03] y más común
[65:04] que ustedes se van a encontrar
[65:05] allá afuera
[65:05] son las APIs.
[65:07] Esto es la conexión
[65:08] más cruda
[65:09] que ustedes van a encontrar.
[65:10] Esto ustedes
[65:10] le dan una dirección
[65:11] y le dan una llave
[65:12] de una aplicación
[65:13] y el agente
[65:14] se conecta
[65:15] de manera directa.
[65:16] ¿Ok?
[65:17] Algunas cosas
[65:18] que tienen a favor
[65:19] es que la mayoría
[65:20] de las aplicaciones
[65:21] hoy en día
[65:22] tienen una API.
[65:23] Por allá
[65:24] los softwares
[65:24] que son más legacy
[65:25] no tienen,
[65:27] pero la ventaja
[65:29] es que la mayoría
[65:30] de aplicaciones
[65:30] ya tienen APIs,
[65:31] les dan control total
[65:32] y les sirve
[65:33] para sus sistemas internos
[65:35] inclusive.
[65:40] Hay que programar
[65:41] y la tienen que mantener.
[65:42] Muchas veces
[65:43] se rompe
[65:43] cuando la aplicación
[65:45] cambia
[65:45] y la tienen que mantener.
[65:47] ¿Listo?
[65:47] Así que
[65:48] ¿cuándo es muy bueno
[65:50] utilizar una conexión
[65:51] vía API
[65:51] cuando no existe
[65:52] un conector listo
[65:53] para su sistema?
[65:55] ¿Listo?
[65:55] Cuando no hay
[65:56] un conector
[65:57] que ya simplemente
[65:57] sea un one click,
[65:59] pues vayan y pregunten
[66:00] oigan,
[66:01] denme una API,
[66:02] denme una llave
[66:02] y díganme
[66:03] qué acciones
[66:04] puede tomar
[66:04] mi agente
[66:05] vía API.
[66:06] ¿Listo?
[66:07] Si esto les suena
[66:07] chino,
[66:08] a los que les suenan
[66:08] chino,
[66:09] no se preocupen.
[66:10] ¿Listo?
[66:11] Lo segundo
[66:12] es un MSP
[66:13] o un MCP
[66:14] en inglés.
[66:16] Esto es un
[66:16] conector universal
[66:17] o esto es un enchufe
[66:18] universal que se inventó
[66:19] Antropic,
[66:20] que es el dueño
[66:21] de Cloud Code
[66:21] y de Cloud Cowork
[66:22] y cuando se lo inventaron
[66:24] se volvió
[66:25] estándar de industria
[66:26] y todos los demás
[66:27] lo adoptaron.
[66:28] Lo adoptó
[66:28] OpenAI,
[66:29] lo adoptó Google,
[66:30] lo adoptaron
[66:30] todos los demás.
[66:31] En un MCP
[66:33] la app se presenta
[66:34] sola.
[66:34] El agente
[66:35] de una vez
[66:36] ve qué puede hacer
[66:36] sin que nadie
[66:37] programe eso
[66:38] por él.
[66:39] ¿Listo?
[66:40] A favor que tiene,
[66:41] ustedes lo conectan
[66:42] una vez
[66:42] y sirve para cualquier
[66:43] agente
[66:43] con cualquier modelo.
[66:45] En contra
[66:46] que tiene,
[66:47] alguien tiene que
[66:47] ofrecerles
[66:48] un servidor.
[66:49] Es decir,
[66:49] eso está alojado
[66:50] en algún lado
[66:50] y les tiene que decir
[66:51] mira,
[66:51] este es el enlace
[66:52] para que se pueda
[66:53] conectar.
[66:54] ¿Listo?
[66:55] Algunos
[66:56] contras.
[66:57] Cuando hay muchos
[66:58] MCPs,
[66:58] el agente
[67:00] si no tiene
[67:00] muy delimitada
[67:01] que tiene acceso
[67:02] se puede confundir.
[67:03] ¿Listo?
[67:04] ¿Cuándo usarlo?
[67:05] Por defecto
[67:06] úsenlo.
[67:07] Si existe,
[67:08] úsenlo.
[67:08] Es la manera
[67:08] más sencilla
[67:09] que un usuario
[67:10] no técnico
[67:10] se puede conectar
[67:11] a otra aplicación.
[67:12] ¿Listo?
[67:13] Un MSP.
[67:14] Tómenle un pantallazo
[67:15] a esto
[67:15] para que se lo lleven
[67:17] como heurística.
[67:18] ¿Listo?
[67:19] Esto ya también
[67:20] está,
[67:21] estos protocolos
[67:22] de conexión
[67:23] están migrando muchísimo.
[67:24] Hay unos que dicen
[67:24] que los MCPs
[67:25] fueron muy famosos
[67:27] pero que se tragan
[67:28] muchos tokens
[67:29] para conectarse
[67:29] porque están siempre
[67:30] conectados
[67:31] y siempre enchufados
[67:31] cuando solo
[67:33] los necesitan usar.
[67:34] Hay como un debate
[67:35] pero se están mejorando
[67:36] cada vez más.
[67:38] ¿Listo?
[67:39] Y tercero,
[67:40] está algo que se llama
[67:41] un CLI
[67:42] o CLI.
[67:43] Esto en inglés
[67:44] traduce
[67:45] Command Line Interface
[67:46] y es básicamente
[67:47] que se le pueda
[67:49] hablar por líneas
[67:51] de comandos
[67:52] a la terminal
[67:53] del computador.
[67:54] Normalmente
[67:55] los ingenieros
[67:56] les encanta
[67:57] abrir una terminal
[67:58] y en vez de utilizar
[67:59] el teclado
[67:59] para hablar normal
[68:00] le hacen comandos
[68:01] y le hablan directamente
[68:02] al cerebro del computador.
[68:04] Hay herramientas
[68:04] que ya están diseñadas
[68:05] para que se puedan hablar
[68:06] como herramienta
[68:08] a cerebro del computador.
[68:09] Este es el CLI.
[68:11] Muchísimas aplicaciones
[68:12] están comenzando
[68:12] a sacar del CLI
[68:13] porque es muchísimo
[68:14] más eficiente
[68:15] pero
[68:16] pues es más técnico.
[68:17] ¿Ok?
[68:18] A favor
[68:19] ya está instalado
[68:20] y con la sesión abierta
[68:21] es rápido
[68:22] es potente.
[68:23] En contra
[68:24] necesita un computador
[68:25] con acceso.
[68:26] ¿Listo?
[68:27] Una herramienta
[68:29] de CLI
[68:29] tiene que estar
[68:30] instalada
[68:31] en el computador
[68:31] de la persona
[68:32] que lo está utilizando
[68:33] o en nuestro caso
[68:34] por ejemplo
[68:34] en el computador
[68:35] en la nube.
[68:36] ¿Listo?
[68:36] Otras cosas
[68:39] puede tener más riesgo
[68:40] como tiene más acceso
[68:42] al computador
[68:43] puede tomar acciones
[68:44] que por error
[68:45] les borren cosas.
[68:46] ¿Listo?
[68:47] ¿Cuándo utilizarlo?
[68:48] Si ustedes son más técnicos
[68:49] por ejemplo
[68:50] o si tienen tareas
[68:51] que tengan cargas masivos
[68:52] de datos
[68:52] que necesiten más eficiencia
[68:54] busquen una herramienta
[68:57] que tenga un CLI.
[68:58] Hasta ahora
[68:59] las herramientas
[69:00] y los aplicativos
[69:00] están sacando
[69:01] sus CLIs.
[69:02] No todos los disponibilizan
[69:03] porque hasta hace muy poco
[69:05] eso solo lo utilizaban
[69:06] los ingenieros.
[69:07] ¿Listo?
[69:09] ¿Listo?
[69:10] ¿En qué orden
[69:11] deberíamos usarlo?
[69:12] La heurística
[69:12] debería ser la siguiente.
[69:13] ¿Existe un MSP?
[69:14] Úsenlo.
[69:15] No hay.
[69:16] Mírense si hay un CLI.
[69:17] Tampoco utilicen una API.
[69:19] ¿Listo?
[69:21] ¿Listo?
[69:22] ¿Cómo se ve eso
[69:23] dentro de Houston?
[69:24] Ustedes tienen una sección
[69:25] que se llama integraciones.
[69:26] En integraciones
[69:27] ustedes únicamente
[69:29] tienen que ir
[69:29] a hacer clic
[69:30] a la integración
[69:31] que quieran conectar
[69:32] y hacer login.
[69:33] No tienen que conectar
[69:34] nada más.
[69:35] Pero si hay algo
[69:36] que no esté dentro
[69:36] de esas mil integraciones
[69:37] ustedes vienen acá
[69:38] y le dicen
[69:39] agregar integración
[69:40] personalizada
[69:41] y les dice
[69:42] ¿para quién lo quieren?
[69:44] Ustedes pueden seleccionar
[69:45] el agente para el cual
[69:46] lo quieren.
[69:47] Y acá le dicen
[69:47] ¿listo?
[69:49] Se les abre un chat
[69:49] y les dice
[69:50] ¿listo?
[69:51] Te puedo ayudar a conectar
[69:52] a cualquier herramienta
[69:53] que no esté en el catálogo.
[69:54] y les comienza a hacer
[69:55] preguntas.
[69:57] ¿Listo?
[69:57] Y acá ustedes les dicen
[69:59] qué es lo que quieren hacer
[70:00] y ustedes simplemente
[70:01] le ponen
[70:01] la página web
[70:02] con la documentación
[70:03] que le quieren conectar
[70:04] y lo van conectando
[70:05] a puro
[70:06] lenguaje natural.
[70:08] ¿Listo?
[70:09] Acá pueden conectar
[70:09] los CRMs
[70:10] personales
[70:11] que ustedes usen.
[70:12] Acá pueden conectar
[70:13] los CRPs.
[70:14] ¿Listo?
[70:15] Por acá preguntan
[70:18] siguen haciendo preguntas
[70:19] que el equipo va respondiendo.
[70:20] Todo esto
[70:21] se maneja de manera segura.
[70:22] Si ustedes comparten
[70:23] esto por acá
[70:24] Houston está almacenando
[70:25] todo de manera segura
[70:26] nada se revela
[70:27] nada queda expuesto.
[70:28] ¿Listo?
[70:29] Ahí están respondiendo
[70:29] por el chat.
[70:30] ¿Listo?
[70:33] El problema
[70:34] no es conectar
[70:35] las herramientas
[70:36] el problema es saber
[70:37] cuáles herramientas
[70:38] existen.
[70:40] ¿Listo?
[70:40] Quiero ser súper enfático
[70:41] porque ustedes pueden tener
[70:42] mil herramientas
[70:43] que conectar
[70:44] e estar igual de perdidos.
[70:46] El problema no siempre
[70:47] es solo conectar
[70:48] las herramientas
[70:48] es saber cuáles existen.
[70:50] Este es el stack
[70:51] de herramientas
[70:51] que yo utilizo
[70:52] para mi agente de ventas
[70:54] con el que les voy a dar
[70:55] hoy y que hagamos el demo
[70:56] y veamos funcionando
[70:57] nuevamente.
[70:58] Pero yo utilizo
[70:59] Appify para hacer
[71:01] un scraping web.
[71:02] A todos los que se queden
[71:03] hasta el final
[71:03] de esta llamada
[71:04] les vamos a dar 75 dólares
[71:05] en Appify
[71:06] para que jueguen
[71:06] con Appify.
[71:07] Appify tiene más
[71:08] de mil actores
[71:08] que ustedes pueden utilizar
[71:09] para hacer cosas.
[71:11] Extrae datos
[71:11] de cualquier página web
[71:12] aunque no tenga
[71:13] una API.
[71:14] Para enriquecimiento
[71:15] de datos
[71:16] utilizo herramientas
[71:17] como Apolo
[71:18] utilizo herramientas
[71:20] como Hunter
[71:20] como Full Enrich
[71:21] como Lusha
[71:22] como Clay.
[71:24] ¿Qué es enriquecer datos?
[71:25] Pedirle que me consiga
[71:26] los correos
[71:26] pedirme que me consiga
[71:27] los cargos,
[71:28] las empresas,
[71:28] los teléfonos.
[71:30] De CRM
[71:31] yo utilizo HubSpot
[71:32] pero ustedes pueden utilizar
[71:33] otros CRM
[71:34] pueden utilizar
[71:34] Salesforce
[71:35] pueden utilizar
[71:36] Data CRM
[71:37] pueden utilizar
[71:38] Asana,
[71:39] Monday
[71:39] lo que ustedes quieran.
[71:41] En secuencias de Outbound
[71:42] yo personalmente
[71:43] utilizo Instantly
[71:44] que es para enviar
[71:46] secuencias de correo
[71:47] pero ustedes pueden utilizar
[71:48] por ejemplo
[71:49] otros secuenciadores de correo
[71:50] pueden utilizar
[71:50] los secuenciadores
[71:51] de los de HubSpot
[71:53] los de Apolo
[71:54] pueden utilizar
[71:54] los secuenciadores
[71:56] de LeadShark
[71:57] ¿Listo?
[72:00] Listo
[72:00] Yo utilizo por ejemplo
[72:03] para responder
[72:04] a los Lead Magnets
[72:05] de LinkedIn
[72:05] utilizo LeadShark
[72:07] LeadShark
[72:08] es una aplicación
[72:09] y es una herramienta
[72:10] que cuando la gente
[72:11] me comenta
[72:12] en una publicación
[72:12] yo la conecto a Houston
[72:13] y le digo
[72:13] montate una campaña
[72:14] y responde a todo el mundo
[72:15] y él va
[72:16] y responde los comentarios
[72:18] y le responde por interno
[72:19] a las personas
[72:20] ¿Listo?
[72:21] ¿Para qué?
[72:22] Para que yo no me tuviera
[72:22] que crear ni una habilidad
[72:24] ni tuviera que
[72:24] ponerme a ver
[72:25] cómo eran los temas
[72:26] de seguridad con LinkedIn
[72:27] o sea
[72:28] esto es una herramienta
[72:28] en la cual yo tengo
[72:29] una cuenta
[72:30] y simplemente la conecté
[72:31] a mi Houston
[72:32] y todo es un sistema
[72:33] que funciona junto
[72:34] y utilizo otras herramientas
[72:36] como Wallaxi
[72:37] Wallaxi
[72:38] es otra herramienta
[72:39] que me permite hacer
[72:40] secuencias
[72:41] a través de LinkedIn
[72:42] ejemplo
[72:43] paso 1
[72:43] agrega a esta persona
[72:44] paso 2
[72:45] mandale un mensaje
[72:46] personalizado
[72:47] paso 3
[72:48] mandale a los dos días
[72:49] si no nos ha respondido
[72:50] otro mensaje
[72:51] paso 3
[72:52] mandale otro mensaje
[72:53] paso 4
[72:54] escribirle por correo
[72:56] ¿listo?
[72:58] la mejor manera
[73:00] si ustedes me preguntan
[73:01] a mí
[73:01] es
[73:02] hagan que sus agentes
[73:03] de IA
[73:03] funcionen con las herramientas
[73:05] que ya existen
[73:05] no se puedan inventarse
[73:07] las ruedas de ceros
[73:08] de ponerse
[73:09] a inventarse
[73:09] todo un CRM
[73:10] o inventarse
[73:11] toda una herramienta
[73:12] de enriquecimiento
[73:13] de datos
[73:13] o toda una herramienta
[73:15] para prospectar
[73:16] el LinkedIn
[73:16] no
[73:17] conecten
[73:18] 10 herramientas
[73:19] algunas
[73:20] muchas tienen
[73:21] sus suscripciones
[73:21] gratuitas
[73:22] las que no
[73:23] simplemente
[73:24] paguen la cuenta
[73:25] que
[73:25] valga lo menos
[73:27] si quieren arrancar
[73:28] y
[73:28] conectenlas
[73:29] ¿listo?
[73:30] dentro de Houston
[73:31] ya hay mil aplicaciones
[73:33] que ustedes pueden utilizar
[73:34] y todas estas herramientas
[73:35] están preconectadas
[73:36] con
[73:37] un certificado de seguridad
[73:38] que en Estados Unidos
[73:39] se llama SOC 2
[73:40] para temas sensibles
[73:41] de data
[73:42] por ejemplo
[73:42] contable
[73:43] y
[73:44] tiene también
[73:45] ISO 27001
[73:46] en la capa
[73:47] de integración y datos
[73:48] esto quiere decir
[73:49] que nosotros tenemos
[73:49] por ejemplo
[73:50] cero retención
[73:51] de data
[73:52] de todo lo que ustedes
[73:53] conecten
[73:53] nosotros no vemos
[73:54] nada de eso
[73:55] ustedes lo conectan
[73:55] y todo eso está
[73:56] con protocolos
[73:57] de SOC 2
[73:58] y ISO 27001
[74:00] ¿listo?
[74:01] suele decir
[74:01] a la parte de integraciones
[74:02] y conectarse
[74:03] ¿listo?
[74:07] listo
[74:08] vamos
[74:08] seguimos por acá
[74:10] seguimos por acá
[74:10] y por último
[74:15] la parte más importante
[74:16] y con esto
[74:17] vamos a terminar
[74:17] la parte teórica
[74:19] y arrancamos
[74:19] la parte práctica
[74:20] una gente
[74:22] tiene que tener
[74:24] memoria
[74:24] tiene que tener
[74:25] contexto persistente
[74:27] entre las sesiones
[74:27] tiene que entender
[74:28] cuáles fueron
[74:29] las decisiones previas
[74:29] tiene que entender
[74:30] la terminología
[74:31] tiene que entender
[74:32] preferencias y relaciones
[74:33] ¿listo?
[74:34] sin memoria
[74:35] cada conversación
[74:36] empieza desde cero
[74:37] acuérdense que yo les conté
[74:39] que un modelo de IA
[74:41] tiene algo que se llama
[74:42] una ventana de contexto
[74:44] uy perdón
[74:45] tiene algo que se llama
[74:46] una ventana de contexto
[74:47] que ustedes a medida
[74:48] que van hablando
[74:48] se va consumiendo
[74:49] consumiendo
[74:49] consumiendo
[74:50] y cuando se queda
[74:51] llega al límite de tokens
[74:52] que puede ser un millón de tokens
[74:53] se resete
[74:54] y se le olvida todo
[74:55] ¿listo?
[74:57] los modelos
[74:58] como les decía
[74:58] tienen algo llamado
[74:59] ventana de contexto
[75:00] pero esta ventana de contexto
[75:01] no es memoria
[75:02] hagan de cuenta
[75:03] que esto es como
[75:03] una persona
[75:04] que tiene amnesia
[75:05] y esta amnesia
[75:06] le dura
[75:07] solo puede retener
[75:08] un millón de tokens
[75:10] en su cabeza
[75:10] entonces ustedes
[75:11] le hablan
[75:11] le cuentan toda su vida
[75:12] y al millón de tokens
[75:13] se ven
[75:13] hola ¿cómo estás?
[75:14] me llamo Felipe
[75:15] otra vez
[75:15] y ustedes
[75:16] pero oiga
[75:16] si llevamos hablando
[75:17] cuatro horas
[75:17] como así que yo
[75:18] ¿quién soy?
[75:19] ¿no?
[75:20] entonces
[75:23] en su escritorio
[75:25] tiene la conversación
[75:26] los documentos
[75:26] que ustedes le pasaron
[75:27] las instrucciones
[75:28] tiene todo junto
[75:29] se miden tokens
[75:30] y los modelos grandes
[75:31] rondan en un millón
[75:33] ¿listo?
[75:33] en un millón de tokens
[75:34] lo segundo es
[75:37] no significa
[75:38] que una mayor
[75:39] ventana de contexto
[75:40] sea mejor
[75:41] para la memoria
[75:42] inclusive
[75:43] hay unos que
[75:43] son hasta peores
[75:44] porque ya
[75:45] almacenan tantas cosas
[75:46] que comienzan
[75:47] a no retener
[75:47] de la manera
[75:48] indicada
[75:48] las cosas
[75:49] y lo tercero
[75:51] es recordarles
[75:52] que se borra
[75:52] después de cada sesión
[75:53] ¿listo?
[75:55] ese escritor
[75:55] se despeja
[75:56] todas las noches
[75:57] así que
[75:57] les voy a contar
[75:59] cuáles son
[75:59] las diferentes maneras
[76:00] en que los diferentes
[76:01] modelos de IA
[76:01] y los diferentes agentes
[76:03] tienen protocolos
[76:04] de memoria
[76:04] ¿listo?
[76:07] lo primero es que
[76:08] hay tres formas
[76:08] de darle memoria
[76:09] se puede con
[76:10] archivos de ustedes
[76:11] teniendo archivos
[76:12] de ustedes propios
[76:13] se puede con
[76:14] las de los
[76:15] modelos de IA
[76:16] ellos tienen sus propios
[76:17] protocolos de memoria
[76:18] o se puede tener algo
[76:19] que algunos denominan
[76:20] el segundo cerebro
[76:22] ¿listo?
[76:23] voy a arrancar
[76:24] de lo menos sofisticado
[76:26] a lo más sofisticado
[76:27] por un lado
[76:28] están protocolos
[76:29] de memoria
[76:30] que utilizan
[76:30] aplicaciones como
[76:31] Houston
[76:32] como OpenClaw
[76:33] como Hermes
[76:34] que es
[76:35] almacenan en archivos
[76:37] de texto plano
[76:37] lo que van aprendiendo
[76:39] de ustedes
[76:40] a medida cuando
[76:40] ustedes trabajan
[76:41] quiénes son ustedes
[76:42] su tono
[76:43] sus clientes
[76:44] o cuando ustedes
[76:44] les dicen recuerda
[76:45] él hace un archivo
[76:47] de texto
[76:47] que está guardando
[76:48] en el computador
[76:49] y dice
[76:49] ok
[76:49] cada que arranquemos
[76:51] una conversación
[76:52] leamos las cosas
[76:53] básicas de memoria
[76:53] ¿listo?
[76:55] la ventaja
[76:56] de esto
[76:56] es que
[76:57] es texto plano
[76:58] y vive
[76:59] son archivos
[77:00] que ustedes
[77:00] se pueden llevar
[77:01] el día de mañana
[77:01] para otro lado
[77:02] ¿listo?
[77:03] ejemplo
[77:04] ya se los voy a mostrar
[77:05] funcionando
[77:05] dentro de Houston
[77:06] lo malo de esto
[77:08] es que
[77:08] cada memoria
[77:09] pues
[77:10] le cabe poco
[77:11] es un archivo suelto
[77:12] y no pueden almacenar
[77:13] tampoco
[77:14] 10.000 cosas
[77:15] tienen que ser específicos
[77:16] en las memorias
[77:17] les voy a mostrar
[77:17] esto dentro de Houston
[77:18] nuevamente
[77:19] cuando ustedes
[77:19] entran
[77:20] a un agente
[77:22] en la parte
[77:23] de configuración
[77:23] nosotros lo mostramos
[77:25] como memoria
[77:25] cada uno de estos
[77:27] es un aprendizaje
[77:29] que Houston
[77:30] con el modelo
[77:31] de protocolo
[77:31] de memoria
[77:32] ha ido
[77:32] aprendiendo
[77:33] de la manera
[77:34] en que yo trabajo
[77:34] les voy a mostrar uno
[77:35] esto es simplemente
[77:37] texto
[77:37] esto es una
[77:39] memoria
[77:41] trabajando conmigo
[77:43] sabe que yo nunca
[77:43] utilizo guiones
[77:44] no utilizo
[77:45] en textos cortos
[77:46] ni en textos largos
[77:47] no lo utilizo
[77:47] ni en chat
[77:48] ni en correos
[77:48] ni en publicaciones
[77:49] ni en documentos
[77:50] lo reformulo
[77:51] con comas
[77:52] ¿por qué?
[77:52] porque yo sé
[77:53] que todo lo que lleva
[77:54] como una rayita
[77:55] en la mitad
[77:55] se ve que lo escribió
[77:56] IA
[77:56] yo le dije un día
[77:58] nunca las vuelvas a utilizar
[77:59] recuerda
[78:00] esto en tu memoria
[78:00] el día que ustedes
[78:02] se quieran ir
[78:03] de Houston
[78:04] se pueden descargar
[78:05] toda su memoria
[78:06] y se la llevan
[78:07] al lugar que ustedes quieran
[78:09] ¿listo?
[78:10] esa es la diferencia
[78:11] con el segundo
[78:12] que voy a explicarles
[78:13] y es la memoria
[78:14] que está
[78:15] embedida
[78:16] en los modelos de IA
[78:18] la memoria
[78:19] del producto
[78:20] chat GPT
[78:21] y cloud
[78:21] lo manejan
[78:22] de manera diferente
[78:23] no necesitan
[78:24] tener configuración
[78:25] pero ustedes
[78:25] en algunos casos
[78:27] la tienen que habilitar
[78:28] o ni siquiera
[78:29] la pueden ver
[78:29] es como una caja negra
[78:31] por allá atrás
[78:31] no tiene configuración
[78:33] ustedes las ven
[78:34] y las borran
[78:35] entrada
[78:35] desde ajustes
[78:37] y
[78:38] la parte negativa
[78:40] de eso
[78:41] es que eso vive
[78:41] por allá
[78:41] en un servidor
[78:42] vive en el computador
[78:45] de Antropic
[78:45] o vive en el computador
[78:46] de chat GPT
[78:47] y no les dicen a ustedes
[78:48] eso que es
[78:49] en las versiones gratuitas
[78:51] están entrenando
[78:52] inclusive sus modelos
[78:53] con todo eso
[78:53] que aprenden de ustedes
[78:54] en las versiones
[78:56] de Teams
[78:57] y profesionales
[78:58] no lo hacen
[78:59] pero en las versiones
[79:00] personales
[79:00] sí
[79:00] entonces por ejemplo
[79:02] ellos están aprendiendo
[79:02] cosas de ustedes
[79:03] todo el tiempo
[79:04] ¿listo?
[79:06] en cloud
[79:07] toca activarla
[79:08] cloud no la trae
[79:09] o no la traía
[79:10] hasta hace poco
[79:10] no la trae
[79:11] activada por default
[79:12] ustedes la tienen que ir
[79:13] a ajustes
[79:13] y decir
[79:13] sí quiero que recuerdes
[79:14] cosas
[79:24] los Obsidian del mundo
[79:25] ahí están los
[79:26] Super Memories
[79:27] del mundo
[79:28] y son
[79:28] unas bases de datos
[79:31] que funcionan
[79:31] de manera estructurada
[79:33] y que comienzan a relacionar
[79:34] los archivos
[79:35] entre sí
[79:35] para darles
[79:36] un segundo cerebro
[79:37] guardan mucho más
[79:38] les sirve mejor
[79:39] aplicaciones como Obsidian
[79:41] lo guardan
[79:41] en unos
[79:42] hacen un dibujo
[79:43] de los grafos
[79:44] para que ustedes vean
[79:45] cómo están conectados
[79:46] todos los puntos
[79:47] entre ellos
[79:47] y hay como un
[79:48] hay una gráfica
[79:49] entre todos los puntos
[79:50] conectados entre sí
[79:51] y ellos lo que hacen
[79:52] es agarran los archivos
[79:53] los ponen en archivos
[79:55] de texto plano
[79:56] y los comienzan a relacionar
[79:57] entre ellos
[79:57] como si tuvieran
[79:58] hipervínculos
[79:59] cuando ustedes les dicen
[80:00] recuerda algo
[80:01] de mi empresa
[80:02] él dice
[80:02] ah la empresa se llama tal
[80:03] y dentro de ese archivo
[80:04] hay otro enlace
[80:05] a otro archivo
[80:06] dentro de ese archivo
[80:06] hay otro enlace
[80:07] a otro archivo
[80:07] y tienen
[80:07] un segundo cerebro gigante
[80:09] ¿listo?
[80:11] la parte
[80:12] la parte retadora
[80:13] es que ese grafo
[80:14] se va creando
[80:15] a mano
[80:16] ¿listo?
[80:17] ustedes tienen que crearlo
[80:18] para que les quede bien hecho
[80:19] tienen que hacer bien
[80:20] las relaciones
[80:20] tienen que decir
[80:21] lo que lo recuerde
[80:21] de la manera indicada
[80:22] ¿listo?
[80:26] y por último
[80:27] ningún modelo
[80:28] bueno
[80:29] hasta ahí
[80:29] quiero que
[80:30] sé que llevamos
[80:31] casi una hora
[80:32] de pura teoría
[80:33] ya vamos a pasar
[80:34] a la práctica
[80:34] quiero hacer
[80:35] una recapitulación
[80:37] para todos los que
[80:38] están entrando
[80:38] estamos viendo
[80:39] las cinco partes
[80:40] a profundidad
[80:41] en teoría
[80:41] que compone un agente
[80:42] vimos las instrucciones
[80:43] vimos las habilidades
[80:45] vimos las herramientas
[80:47] y estamos viendo
[80:48] la memoria
[80:49] en este momento
[80:49] y por último
[80:51] vamos a hablar
[80:51] del cerebro
[80:52] que es el modelo
[80:52] de IA
[80:53] ¿listo?
[80:54] ningún modelo
[80:55] es el mejor
[80:55] en todo
[80:56] escojan el mejor
[80:57] para cada tarea
[80:58] cuando ustedes
[80:59] están utilizando
[81:00] un aplicativo
[81:01] como ChatGPT
[81:02] solo están usando
[81:03] los modelos
[81:03] de ChatGPT
[81:04] los de OpenAI
[81:04] cuando están utilizando
[81:06] un aplicativo
[81:06] como Cloud Cowork
[81:07] únicamente están utilizando
[81:09] los modelos
[81:09] de Antropic
[81:09] pero en Silicon Valley
[81:11] en el mundo
[81:11] cada semana
[81:12] están saliendo
[81:12] modelos diferentes
[81:13] y no todos
[81:14] son iguales
[81:15] para todo
[81:15] en un arnés
[81:18] como Houston
[81:19] como OpenClaw
[81:20] como Hermes
[81:21] ustedes pueden conectar
[81:22] hasta 400 modelos
[81:23] ¿listo?
[81:27] les voy a mostrar
[81:28] esto como se ve
[81:29] cuando ustedes vienen
[81:29] acá a la izquierda
[81:30] les voy a mostrar
[81:31] cuáles son los modelos
[81:32] de IA
[81:32] yo acá tengo conectados
[81:34] un par de proveedores
[81:35] tengo conectados
[81:36] Antropic
[81:36] tengo conectado
[81:37] OpenAI
[81:38] y tengo conectados
[81:39] otros dos proveedores
[81:40] que se llaman
[81:41] OpenCode
[81:41] y OpenRouter
[81:42] que se los voy a mostrar
[81:43] ahorita
[81:43] y de hecho
[81:44] les vamos a dar créditos
[81:45] para OpenRouter
[81:45] esta gente
[81:46] lo que hizo fue
[81:47] ya se preconectó
[81:48] a 400 modelos
[81:50] si ustedes no necesitan
[81:51] tener una cuenta
[81:51] en 400 modelos
[81:53] ustedes se abren
[81:54] una cuenta
[81:54] una vez
[81:55] y dentro de Houston
[81:56] aplicativos como Houston
[81:58] pueden utilizar
[81:58] 400 modelos
[82:00] diferentes
[82:00] ahorita les voy a mostrar
[82:01] pero acá está
[82:02] Google, Gemini
[82:03] los proveedores
[82:04] Gemini, Copilot
[82:05] Amazon Bedrock
[82:06] modelos locales
[82:07] DeepSeq
[82:08] los chinos
[82:09] Fireworks
[82:10] Grok
[82:10] Minimax
[82:11] Moonshot
[82:11] Hugging Face
[82:12] Mistral
[82:13] los de NVIDIA
[82:13] los de X
[82:15] listo
[82:16] mi recomendación
[82:19] es
[82:19] hacia donde yo creo
[82:21] que va a ir el futuro
[82:22] es las personas
[82:23] se van a mudar
[82:24] a usar
[82:24] arneses
[82:25] como Houston
[82:26] para que puedan utilizar
[82:27] siempre
[82:27] el mejor modelo de IA
[82:29] y hasta donde yo creo
[82:30] que va a ir
[82:30] los modelos
[82:31] van a ser
[82:31] de código abierto
[82:33] y van a correr
[82:33] de manera local
[82:34] de manera gratuita
[82:35] y la gente
[82:35] en el futuro
[82:36] las personas
[82:36] no van a pagar
[82:37] ni siquiera por IA
[82:38] pero van a necesitar
[82:39] un arnés
[82:39] que les ayude
[82:40] a tener agentes
[82:40] listo
[82:41] no necesitan
[82:43] 400 cuentas
[82:44] con una sola
[82:45] llegan a más
[82:46] de 400 modelos
[82:47] yo personalmente
[82:48] tengo conectada
[82:49] una cuenta
[82:49] de un proveedor
[82:51] que se llama
[82:51] Open Router
[82:52] ustedes la recargan
[82:53] una vez
[82:54] la recargan
[82:54] con tarjeta de crédito
[82:55] y pueden utilizar
[82:56] Open AI
[82:56] pueden utilizar
[82:57] Antropic
[82:58] pueden utilizar
[82:58] DeepSeq
[82:59] Mistral
[82:59] pueden utilizar
[83:00] Kimi Code
[83:01] que está súper famoso
[83:02] últimamente
[83:03] listo
[83:04] a los que se queden
[83:06] al final
[83:06] en la parte práctica
[83:07] les vamos a dar
[83:08] también
[83:08] un código
[83:09] de invitación
[83:10] para Open Router
[83:11] para que tengan
[83:11] 10 dólares
[83:12] y desde ya
[83:13] puedan utilizarlo
[83:14] también
[83:14] dentro de Houston
[83:15] listo
[83:15] también está
[83:16] Open Code
[83:17] funciona igualito
[83:18] que Open Router
[83:19] listo
[83:20] listo
[83:22] lo sigo leyendo
[83:23] vayan mandando
[83:24] preguntas
[83:24] preguntas
[83:25] vayan mandando acá
[83:26] y
[83:27] vayan mandando
[83:28] preguntas
[83:28] listo
[83:30] listo
[83:32] vamos a hacer
[83:33] una pausa
[83:34] antes de
[83:34] verlo
[83:35] en Houston
[83:36] todos en vivo
[83:37] vamos a hacer
[83:38] un stop
[83:38] llevamos
[83:39] una hora
[83:40] de teoría
[83:41] quiero que todos
[83:41] se pongan de pie
[83:42] pónganse de pie
[83:43] por favor
[83:43] de pie
[83:43] de pie
[83:44] de pie
[83:44] de pie
[83:44] los veo
[83:45] los tengo en pantalla
[83:46] si fue una hora
[83:49] un ladrillo
[83:49] de solo teoría
[83:50] no se preocupen
[83:51] listo
[83:51] manos arriba
[83:52] vamos a
[83:52] vamos a
[83:54] activar el cuerpo
[83:55] vamos a activar el cuerpo
[83:56] vamos a hacer que la energía
[84:00] corra
[84:00] listo
[84:03] vamos a estirar
[84:03] los brazos
[84:04] Felipe Londoño
[84:05] te tengo mi pantalla
[84:06] arriba
[84:07] te tengo mi pantalla
[84:09] arriba
[84:10] vamos a estirarnos
[84:11] Andrés
[84:11] listo
[84:14] vayan prendiendo
[84:15] sus cámaras
[84:15] que yo los estoy viendo
[84:16] veo a Rebeca
[84:20] Juan Vélez
[84:21] Jovan Erazo
[84:22] listo
[84:24] los veo
[84:25] los veo
[84:25] actívense
[84:26] Diana Algarra
[84:27] te veo
[84:27] muy bien
[84:28] Iñaki
[84:29] te veo
[84:30] todos los demás
[84:32] que están sin cámara
[84:33] por favor pongan sus cámaras
[84:34] que yo los veo
[84:35] y me energizo
[84:36] viéndolos
[84:36] nuestro acuerdo fue
[84:37] les doy toda mi energía
[84:39] quiero su energía
[84:39] de vuelta
[84:40] Julio César
[84:42] te veo
[84:43] Yasmín
[84:43] te veo
[84:44] Viviana Rodríguez
[84:46] te veo
[84:46] bien
[84:47] los que no tienen su cámara puesta
[84:50] y los que entraron tarde
[84:51] al principio hicimos un acuerdo
[84:52] y es
[84:52] vamos a estar participando
[84:54] activamente
[84:55] yo les estoy dando
[84:55] toda mi energía
[84:56] los quiero ver
[84:57] los quiero llamar
[84:58] quiero participar con ustedes
[84:59] listo
[84:59] listo
[85:03] listo
[85:06] vamos a hacer
[85:08] dos cosas más
[85:10] listo
[85:11] como ya les mostré
[85:13] toda la parte teórica
[85:13] muchos de ustedes
[85:15] estuvieron en los demos
[85:16] quiero que
[85:17] quiero que los que están acá
[85:19] quiero que pongan por el chat
[85:21] quién no
[85:22] estaba en un demo en vivo
[85:23] de una gente trabajando
[85:24] para entender
[85:25] quiénes sí
[85:25] quiénes no
[85:26] quiénes no
[85:27] estuvieron en alguna
[85:28] de las sesiones que hicimos
[85:29] con Platzi
[85:29] con Lab10
[85:30] con 30x
[85:32] con
[85:33] quiénes no lo han visto
[85:34] y ponemos a la gente
[85:35] a trabajar
[85:35] no
[85:37] no
[85:37] no
[85:37] no
[85:37] no
[85:38] no
[85:38] no
[85:38] primera vez
[85:39] primera vez
[85:39] listo
[85:40] listo
[85:40] entendido
[85:41] listo
[85:43] no
[85:43] no
[85:44] no
[85:44] no
[85:44] primera vez
[85:45] listo
[85:45] como hay muchos
[85:46] que están llegando
[85:47] por primera vez
[85:48] vamos a repetir el demo
[85:49] que hicimos
[85:49] para que vean a una gente
[85:50] trabajando
[85:51] en la vida real
[85:52] los que ya vieron
[85:53] a este agente
[85:54] trabajando
[85:55] les pido que participen
[85:56] y que con mucha paciencia
[85:58] aguanten a los que no lo han visto
[86:00] listo
[86:01] entonces
[86:02] lo primero que vamos a hacer
[86:04] es
[86:04] nos vamos a tomar
[86:05] una foto
[86:06] y yo la voy a publicar
[86:08] en linkedin
[86:09] y la voy a pedir
[86:09] les voy a pedir a todos ustedes
[86:11] que comenten en esa publicación
[86:12] y luego voy a abrir houston
[86:14] y le voy a pedir a mi houston
[86:15] representante de ventas
[86:16] que vaya y se los prospecte a todos
[86:17] listo
[86:18] que quiere decir
[86:19] que los encuentre
[86:20] agarre todos los datos
[86:21] de ustedes
[86:22] los pongan una base de datos
[86:23] vaya y me enriquezca la data
[86:25] y me encuentre los correos
[86:26] y que al final de esto
[86:27] les mandemos un correo a todos
[86:29] agradeciéndoles por venir
[86:30] y luego se los voy a enseñar
[86:32] a usar en la parte
[86:33] 100% práctica
[86:34] a ustedes
[86:35] les voy a compartir
[86:36] todas las habilidades
[86:36] y les voy a enseñar
[86:38] también la metodología
[86:38] con la cual lo construí
[86:39] para que ustedes
[86:40] se lleven también
[86:40] la metodología
[86:41] listo
[86:42] así que por favor
[86:43] prendan sus cámaras
[86:44] necesito que
[86:45] pongan su mejor sonrisa
[86:48] y voy a hacer
[86:49] una publicación
[86:50] en linkedin
[86:50] listo
[86:51] acá
[86:51] acá
[86:52] acá todos
[86:52] a ver otra vez
[86:56] que me quedo acá
[86:56] un comentario
[86:57] que hizo la gente
[86:58] listo
[86:59] última
[87:00] 3
[87:00] 2
[87:01] 1
[87:01] listo
[87:03] quiero que vean
[87:05] que yo hago este ejercicio
[87:07] no porque me encanta
[87:08] que todo el mundo publique
[87:09] en mi linkedin
[87:09] y se me vuelvan locas
[87:10] mis notificaciones
[87:11] sino porque me gusta
[87:12] que ustedes vean
[87:12] que estas cosas
[87:13] pasan en vivo
[87:14] listo
[87:15] listo
[87:17] voy a compartir
[87:18] mi pantalla
[87:19] y listo
[87:22] voy a abrir acá
[87:22] antes de pasar al taller
[87:23] en vivo
[87:24] voy a abrir mi linkedin
[87:25] les estoy compartiendo
[87:27] mi pantalla
[87:28] voy a hacer todo esto
[87:29] en vivo y en directo
[87:30] le voy a hacer una publicación
[87:32] voy a decir
[87:34] voy a subir esta foto
[87:36] que nos acabamos de tomar
[87:37] voy a subir esta foto
[87:40] un segundo
[87:41] y lo que vamos a hacer
[87:44] es
[87:44] voy a poner el demo
[87:45] se los voy a explicar
[87:45] lo voy a poner a correr
[87:46] y mientras Houston trabaja
[87:48] voy a ponerme a
[87:49] les voy a explicar todo
[87:52] listo
[87:55] a ver un segundo
[87:56] que si esté subiendo
[87:58] la correcta
[87:59] listo
[88:05] listo
[88:07] Álvaro
[88:08] Germán
[88:09] Andrés Solano
[88:09] Sandra
[88:10] Tomás
[88:11] Fuescún
[88:11] Henry López
[88:12] Ana Rodríguez
[88:13] son los afortunados
[88:15] de quedar en la foto
[88:16] de esta publicación
[88:16] listo
[88:17] y la voy a hacer
[88:18] 100% en vivo
[88:19] para que ustedes vean
[88:19] que este es
[88:20] 100% real
[88:21] les voy a decir
[88:21] hoy estuvimos
[88:23] hoy estuvimos
[88:27] hoy estuvimos
[88:29] en un bootcamp
[88:30] intensivo
[88:32] hoy estuvimos
[88:33] en un bootcamp
[88:34] intensivo
[88:35] con
[88:36] más de 500 personas
[88:38] en Latinoamérica
[88:39] Latinoamérica
[88:42] aprendiendo
[88:43] aprendiendo
[88:45] de cómo
[88:45] ir de cero
[88:46] a uno
[88:47] en agentes
[88:48] de inteligencia artificial
[88:49] de inteligencia
[88:52] artificial
[88:54] les compartí
[88:56] la parte teórica
[88:57] y la parte práctica
[89:01] que ya la vamos a hacer
[89:02] con esto
[89:03] la parte
[89:04] y la parte práctica
[89:05] y la parte práctica
[89:09] ay
[89:10] y la parte práctica
[89:12] como
[89:16] 500 personas
[89:19] no es suficiente
[89:22] para impactar
[89:23] 437 millones
[89:25] de personas
[89:26] que vienen
[89:27] en Latinoamérica
[89:27] en Latinoamérica
[89:31] voy a compartir
[89:33] todo
[89:34] todo
[89:35] si quieren
[89:37] que se los comparta
[89:38] que les comparta
[89:41] las memorias
[89:43] del taller
[89:43] o las memorias
[89:44] del bootcamp
[89:45] comenten
[89:47] Houston
[89:48] y se las envío
[89:49] envío
[89:51] por DM
[89:52] ¿listo?
[89:53] envío
[89:54] envío
[89:56] por DM
[89:57] ¿listo?
[89:59] seguimos
[90:00] impactando
[90:02] y compartiendo
[90:04] en la Tama
[90:05] ¿listo?
[90:07] ¿lo acabo de escribir
[90:09] en vivo
[90:09] y esta foto
[90:10] es en ustedes
[90:10] ¿sí o no?
[90:11] quiero que me digan
[90:12] ahí por el chat
[90:13] no, no
[90:14] no tienen que comentar
[90:14] en el chat de Zoom
[90:15] van a comentar
[90:16] en esta publicación
[90:16] de LinkedIn
[90:17] ¿listo?
[90:18] yo se las voy a mandar
[90:18] el enlace
[90:19] apenas public
[90:20] ¿listo?
[90:21] ¿es en vivo
[90:22] o no es en vivo?
[90:23] respondan ahí
[90:24] los que ya vieron
[90:24] este demo
[90:25] por favor
[90:26] paciencia
[90:27] para que pasamos
[90:29] a la parte práctica
[90:30] ¿listo?
[90:31] voy a hacer
[90:31] esta publicación
[90:32] y les voy a pasar
[90:34] el enlace
[90:35] por el
[90:36] chat
[90:37] de Zoom
[90:38] ¿listo?
[90:39] les voy a pasar
[90:41] acá
[90:41] el enlace
[90:42] dicen
[90:44] falta
[90:45] ah, listo
[90:45] gracias al que
[90:46] me hizo
[90:47] que me faltaba
[90:48] listo
[90:52] un segundo
[90:53] un segundo
[90:53] ahí la voy a mandar
[90:54] listo
[90:55] por favor
[90:58] les voy a mandar
[90:58] el enlace
[90:59] a la publicación
[91:00] se los voy a enviar
[91:00] por el chat
[91:02] de Zoom
[91:02] todos vayan
[91:03] la instrucción
[91:04] es
[91:04] necesito que comenten
[91:06] Houston
[91:06] como la ciudad
[91:07] Houston
[91:10] y yo se las envío
[91:13] por DM
[91:13] ¿listo?
[91:14] lo que voy a hacer
[91:15] es
[91:15] envío en directo
[91:16] les voy a mostrar
[91:17] mi agente de prospección
[91:18] que yo les voy a compartir
[91:19] a ustedes
[91:19] con todos los skills
[91:20] todas las herramientas
[91:21] todo para que ustedes
[91:22] también lo usen
[91:23] y vamos a hacer el demo
[91:24] todos juntos hoy
[91:25] con esta misma publicación
[91:26] vayan y comenten
[91:28] ahí en esta publicación
[91:29] ¿listo?
[91:31] la instrucción es
[91:32] vamos a hacer
[91:34] un demo
[91:35] de Houston
[91:36] lo vamos a poner
[91:37] a funcionar en vivo
[91:38] antes de construirlo juntos
[91:39] por favor
[91:40] vayan
[91:41] a esta publicación
[91:42] de LinkedIn
[91:43] que les estoy mandando
[91:43] por el chat
[91:44] de Zoom
[91:45] hagan clic
[91:46] en esa publicación
[91:47] y van a comentar
[91:48] Houston
[91:49] en la publicación
[91:51] de LinkedIn
[91:51] no lo hagan
[91:52] en el chat
[91:53] de Zoom
[91:53] lo van a hacer
[91:54] dentro de la publicación
[91:54] de LinkedIn
[91:55] ¿ok?
[91:57] listo
[91:58] veo que 114 personas
[91:59] ya han comentado
[92:00] y en esta llamada
[92:01] somos
[92:02] 557
[92:05] así que
[92:05] quiero verlos
[92:07] 140 comentarios
[92:08] Houston
[92:09] Houston
[92:10] Houston
[92:10] Stephanie
[92:11] Yepes
[92:12] Daniel Meléndez
[92:12] Miguel Ángel Miranda
[92:13] Daniela García
[92:16] Diego Zapata
[92:17] que gusto
[92:18] de verlo por acá
[92:18] Daniel Pinilla
[92:20] Claudia Cañón
[92:21] Luz Dari
[92:22] Omar Ochoa
[92:23] listo
[92:24] vayan comentando
[92:25] por favor
[92:25] los que ya estuvieron
[92:26] presentes en algunas
[92:27] de los demos
[92:28] paciencia
[92:29] y los que no
[92:30] ya les vamos a ver
[92:30] Houston trabajando
[92:31] ¿listo?
[92:33] listo
[92:34] ya tenemos
[92:34] 190 comentarios
[92:35] por favor
[92:36] sigan
[92:37] somos 557 personas
[92:39] en esta llamada
[92:39] por favor
[92:40] comenten acá
[92:40] que quiero poner
[92:41] a prospectar
[92:43] a mi Houston
[92:43] y por favor
[92:45] si quieren conectarse
[92:47] conmigo
[92:47] pues de una vez
[92:48] inviten
[92:48] mándenme una solicitud
[92:49] a conectar
[92:50] y cuéntenme
[92:50] que nos vimos
[92:51] en el bootcamp
[92:51] y yo los acepto
[92:52] ¿listo?
[92:56] listo
[92:57] ya veo 214 comentarios
[92:59] y para los que están
[93:00] entrando en este momento
[93:01] les voy a hacer una
[93:01] recapitulación
[93:02] de lo que estamos haciendo
[93:03] acabamos de ver
[93:04] toda la parte teórica
[93:05] de que es un agente
[93:06] yo les voy a mostrar
[93:07] un demo
[93:07] de un agente funcionando
[93:08] para que ustedes
[93:09] puedan tangibilizarlo
[93:10] y luego vamos a pasar
[93:11] a la parte práctica
[93:12] de contarles
[93:13] cómo es el proceso
[93:14] de pensamiento
[93:15] para crearse
[93:15] un agente de estos
[93:16] y pasarles
[93:17] todo el agente
[93:17] funcional a ustedes
[93:18] ¿listo?
[93:20] ¿puedes mandar
[93:20] el link otra vez?
[93:21] claro que sí
[93:22] lo estoy mandando
[93:22] por el chat
[93:23] de Zoom
[93:23] ahí está
[93:24] listo
[93:27] ahí lo estoy mandando
[93:27] ahí lo estoy mandando
[93:28] listo
[93:32] ahí veo
[93:33] 215 comentarios
[93:34] vamos
[93:35] vamos
[93:36] que somos 500
[93:36] en esta llamada
[93:39] somos 550
[93:40] de hecho en esta llamada
[93:41] solo de 234 comentarios
[93:42] el que está perdido
[93:44] esto es lo que estamos
[93:45] haciendo
[93:45] les estoy mandando
[93:47] un enlace
[93:47] de LinkedIn
[93:48] por el grupo
[93:49] por el chat
[93:50] de Zoom
[93:51] ustedes van a comentar
[93:52] Houston
[93:53] en esa publicación
[93:54] y yo le voy a pedir
[93:55] a mi Houston
[93:56] que se los prospecte
[93:56] ¿listo?
[93:57] y luego
[93:58] esa es la publicación
[93:59] que vamos a utilizar
[94:00] para que ustedes mismos
[94:00] corran este demo
[94:01] también
[94:02] y lo hagamos
[94:03] listo
[94:04] 243
[94:05] lleguemos a 250
[94:06] y pongo a correr a Houston
[94:08] listo
[94:14] acá hay 260 personas
[94:16] en esta llamada
[94:16] hay 560 personas
[94:17] vamos
[94:19] vamos
[94:19] vamos
[94:20] listo
[94:23] estamos a uno
[94:23] uno más
[94:24] uno más
[94:26] uno más
[94:26] uno más
[94:27] listo
[94:30] 153
[94:31] listo
[94:33] quiero que todos
[94:34] vuelvan aquí
[94:34] a mi pantalla
[94:35] nuevamente
[94:37] una recapitulación
[94:38] toda la parte teórica
[94:39] vimos de que está compuesto
[94:40] un agente
[94:40] vimos las instrucciones
[94:41] vimos las integraciones
[94:43] vimos los skills
[94:43] vimos la memoria
[94:44] ahora sí se los voy a mostrar
[94:45] funcionando
[94:46] ¿listo?
[94:47] entonces en este caso
[94:48] yo tengo un agente
[94:50] que cree para esta sesión
[94:51] de hoy
[94:51] que se los voy a compartir
[94:52] cuando ustedes entran
[94:54] a Houston
[94:54] Houston es uno
[94:55] de los tantos aplicativos
[94:56] para crear
[94:58] agentes de inteligencia artificial
[95:00] en nuestro caso
[95:01] esta es la que nosotros
[95:02] usamos porque
[95:02] es nuestra compañía
[95:03] y es nuestra aplicación
[95:04] ustedes entran acá
[95:06] al lado izquierdo
[95:07] tienen a su representante
[95:09] de ventas
[95:09] en el lado
[95:11] les voy a mostrar
[95:12] cómo está configurado
[95:13] tiene sus instrucciones
[95:14] es un operador comercial
[95:15] que sabe prospectar
[95:16] tiene habilidades
[95:18] estas habilidades
[95:19] ustedes
[95:19] o le pueden añadir
[95:20] habilidades
[95:21] simplemente dándole más
[95:22] o
[95:22] tienen una habilidad
[95:24] que yo que
[95:25] co-creé
[95:25] trabajando
[95:26] ¿listo?
[95:27] esta habilidad
[95:27] se llama
[95:28] de comentarios
[95:29] de Linkedin
[95:30] a una prospección
[95:31] en Google Sheets
[95:31] ¿listo?
[95:33] luego en memoria
[95:34] tiene todas las memorias
[95:35] y yo como trabajo
[95:36] y listo
[95:38] entonces
[95:39] lo que va a pasar
[95:39] en este momento
[95:40] es que
[95:41] yo le voy a pedir
[95:42] a Houston
[95:43] que los prospecte
[95:44] y lo que va a ocurrir
[95:45] en este momento
[95:45] no es magia
[95:46] yo tengo una habilidad
[95:48] que es
[95:49] le enseñé a Houston
[95:50] yo como prospecto
[95:51] cuando viene
[95:52] de un lead magnet
[95:53] en Linkedin
[95:54] pero esto puede ser
[95:55] de cualquier manera
[95:55] ustedes le pueden decir
[95:56] que prospecte en Instagram
[95:57] le pueden decir
[95:57] que prospecte entrando
[95:58] a bases de datos
[95:59] del gobierno
[96:00] le pueden decir
[96:01] que entre a noticias
[96:02] le pueden decir
[96:03] como ustedes quieran
[96:03] este es solo un ejemplo
[96:04] del mío
[96:05] mi Houston
[96:06] yo lo tengo integrado
[96:07] con distintas herramientas
[96:09] lo tengo integrado
[96:09] con Appify
[96:10] lo tengo integrado
[96:11] con Google Calendar
[96:13] lo tengo integrado
[96:14] con Apolo
[96:15] que es el que utilizo
[96:16] para traerme
[96:17] los correos de las personas
[96:18] lo tengo integrado
[96:19] con Hunter.io
[96:20] o sea lo tengo integrado
[96:21] con un montón de cosas
[96:22] entonces yo
[96:23] en vez de decirle
[96:24] a Houston
[96:24] de la nada
[96:25] consígueme clientes
[96:26] le voy a decir
[96:27] prospecta
[96:28] pero prospecta
[96:29] con lo que yo ya
[96:30] te enseñé a hacer
[96:31] entonces voy a utilizar esto
[96:32] voy a venir
[96:34] a mostrarles
[96:34] como lo hice
[96:34] esto yo se los voy a compartir
[96:36] y ustedes lo van a poder utilizar
[96:37] en unos minutos
[96:38] ustedes vienen acá
[96:39] le dicen
[96:40] una nueva misión
[96:41] y acá les va a salir
[96:43] todas las habilidades
[96:44] que ustedes tienen
[96:44] y acá les van a salir
[96:46] también todas las habilidades
[96:47] que ustedes tengan
[96:47] en este caso
[96:48] yo quería este agente
[96:49] para esta sesión
[96:50] ¿listo?
[96:53] y acá ustedes
[96:54] le pueden dar
[96:54] las diferentes maneras
[96:55] de trabajar
[96:55] o que les pregunte antes
[96:57] o que sea un planificador
[97:00] o que lo pongan
[97:01] en piloto automático
[97:02] yo lo voy a poner
[97:03] en piloto automático
[97:04] porque quiero que ustedes
[97:05] se lleguen la experiencia
[97:05] de cómo trabaja
[97:06] a un agente
[97:06] de manera autónoma
[97:07] y acá al lado
[97:08] me dice
[97:09] ¿y qué modelo
[97:09] quieres utilizar?
[97:10] yo tengo conectado
[97:11] Antropic
[97:12] tengo conectado
[97:13] OpenAI
[97:13] tengo conectado
[97:14] OpenRouter
[97:15] que me permite
[97:16] conectarme a 400 modelos
[97:18] incluyendo modelos
[97:19] gratuitos
[97:19] ¿listo?
[97:21] yo para este ejemplo
[97:22] le voy a decir
[97:22] hagámoslo con Antropic
[97:24] y hagámoslo con
[97:25] Opus 5
[97:26] si ustedes se acuerdan
[97:27] este es el motor
[97:29] le estoy conectando
[97:30] ese motor
[97:30] a los que se queden
[97:32] a la parte práctica
[97:33] les vamos a dar
[97:34] en la sección de
[97:34] cuando estemos
[97:35] seteando las herramientas
[97:36] vamos a abrir
[97:36] las cuentas juntos
[97:37] cuentas de OpenRouter
[97:38] y cuentas de AppTiFi
[97:39] yo le voy a decir
[97:40] en este momento
[97:41] le voy a decir
[97:41] utilízate la habilidad
[97:43] de comentarios
[97:44] de LinkedIn
[97:44] a Google Sheets
[97:45] y le voy a decir
[97:46] que se tome
[97:49] este enlace
[97:50] de esta publicación
[97:51] donde hay 268 comentarios
[97:53] le voy a decir
[97:55] tómate este enlace
[97:57] a esta publicación
[97:57] y le voy a decir
[97:58] quiero que
[98:01] quiero que
[98:03] quiero que
[98:05] prospectes
[98:06] esta publicación
[98:08] y no le voy a decir
[98:10] nada más
[98:11] la razón por la cual
[98:12] no le voy a decir
[98:13] nada más
[98:13] es porque ya
[98:14] en este skill
[98:14] está todo lo que
[98:16] yo ya le enseñé a hacer
[98:17] él ya sabe entrar
[98:18] él sabe que tiene que utilizar
[98:19] AppTiFi
[98:20] AppTiFi utiliza
[98:21] un actor de scraping
[98:22] va a la publicación
[98:23] luego él sabe
[98:24] que tiene que ir
[98:25] a mi Google Sheets
[98:27] que ya tengo conectado
[98:28] crearse una base
[98:29] de datos nueva
[98:30] ¿listo?
[98:32] uy creo que por acá
[98:33] hay gente
[98:33] explorando Houston
[98:35] porque por ahí
[98:35] vi un nombre
[98:36] listo
[98:38] eso los voy a mostrar
[98:39] en vivo
[98:40] en este momento
[98:41] lo que Houston
[98:42] me está diciendo
[98:43] es
[98:43] este agente
[98:44] representante comercial
[98:45] lo que está haciendo
[98:47] venir y decir
[98:48] déjame leo
[98:49] toda la habilidad
[98:50] y me dice
[98:50] listo
[98:51] por favor
[98:52] los que están ahí
[98:53] anotando cosas
[98:54] Juan si me ayuda
[98:56] a borrar ahí
[98:56] exacto
[98:57] ah listo
[99:00] yo también
[99:01] podría utilizar
[99:02] las noticas
[99:03] voy a trámelo
[99:04] para acá
[99:05] él me está diciendo
[99:06] listo
[99:06] ya estoy
[99:07] leyéndome el skill
[99:08] y me dice
[99:09] lo primero que voy a hacer
[99:10] es crearte la hoja
[99:11] de cálculo
[99:12] y la abro acá
[99:13] entonces
[99:14] él se fue a mi Google Sheets
[99:15] mi Google Sheets
[99:16] yo ya lo tengo conectado
[99:17] está acá en integraciones
[99:19] yo tengo Google Sheets
[99:21] conectado
[99:21] le di los permisos
[99:22] correspondientes
[99:23] y él dice
[99:24] listo
[99:24] ya lo creé
[99:25] ahora me voy a jalar
[99:26] a todos los comentaristas
[99:27] para que observes
[99:28] cómo se llena
[99:28] listo
[99:29] entonces
[99:29] él vino acá
[99:30] y me creó
[99:30] esta base de datos
[99:31] que se llama
[99:31] comentadores del bootcamp
[99:33] agentes de IALATAM
[99:34] me creó
[99:37] oye
[99:37] me va a traer el nombre
[99:38] me va a traer la compañía
[99:39] me va a traer el headline
[99:40] me va a traer el link en URL
[99:41] me va a traer
[99:42] los comentarios que pusieron
[99:43] me va a traer
[99:44] cuántas reacciones
[99:44] tiene ese comentario
[99:45] y me voy a buscar el email
[99:47] de esta persona
[99:48] listo
[99:49] listo
[99:51] y ahí
[99:52] él está trabajando
[99:53] ok
[99:54] voy a dejar que Houston
[99:56] trabaje
[99:57] y mientras Houston
[99:58] trabaja
[99:59] voy a responder
[100:02] algunas preguntas
[100:02] voy a ir respondiendo
[100:05] algunas preguntas
[100:06] los que ya lo vieron
[100:07] trabajar en las sesiones
[100:07] pasadas
[100:08] un poco de paciencia
[100:08] los que no
[100:09] pues Houston
[100:10] está trabajando aquí
[100:10] listo
[100:12] él trabaja en vivo
[100:13] ustedes pueden tener
[100:14] múltiples chats
[100:15] al mismo tiempo
[100:16] con diferentes modelos
[100:17] haciendo diferentes cosas
[100:18] listo
[100:19] listo
[100:21] voy a leer
[100:21] algunas preguntas
[100:22] Deepseek
[100:24] Flash
[100:25] Hi3 Preview
[100:27] Silicon Flow
[100:28] funcionan en Houston
[100:30] si los conectas
[100:31] a través de
[100:32] Open Router
[100:33] los puedes utilizar
[100:34] de una
[100:35] y si no
[100:35] los que encuentres acá
[100:36] por ejemplo
[100:37] Deepseek
[100:37] lo puedes conectar
[100:38] de manera directa
[100:39] bueno
[100:39] hay varios que puedes
[100:40] conectar de manera directa
[100:41] listo
[100:42] voy a seguir respondiendo
[100:43] preguntas
[100:43] mientras
[100:44] mientras Houston
[100:45] trabaja acá
[100:46] listo
[100:48] se me queda
[100:50] en Mentimeter
[100:51] y nos sigue
[100:51] no se preocupen
[100:52] vamos a volver
[100:53] al Mentimeter
[100:54] ahorita
[100:54] está bien
[100:54] que nos siga
[100:55] ¿cuál es el link
[100:57] de Houston
[100:58] y cómo ingreso?
[100:59] ya vamos a hacer
[100:59] en la siguiente parte
[101:01] vamos a hacer la parte práctica
[101:02] les vamos a dar acceso
[101:02] a las herramientas
[101:03] ¿cómo me puede ayudar
[101:06] a Houston
[101:06] si lo quiero integrar
[101:07] o realizar
[101:07] trabajos con HubSpot?
[101:08] ¿es recomendable?
[101:09] sí
[101:09] 100% recomendable
[101:10] yo lo tengo conectado
[101:11] acá en integraciones
[101:13] lo tengo conectado
[101:13] a HubSpot
[101:14] de hecho
[101:15] así es que
[101:15] yo creo
[101:16] los pipelines
[101:17] actualizo
[101:18] los deals
[101:20] les hago
[101:21] seguimiento
[101:22] automatizadamente
[101:23] Esteban Ocampo
[101:25] pregunta
[101:25] ¿cuál es el mejor
[101:26] motor
[101:27] y para qué usar
[101:27] cada uno?
[101:28] yo creo
[101:29] Esteban
[101:29] que ahí sí
[101:29] toca estar
[101:30] investigando
[101:30] constantemente
[101:31] porque el mejor modelo
[101:32] hoy no es el mejor modelo
[101:33] en una semana
[101:33] y la semana
[101:35] entrante puede salir
[101:35] un mejor modelo
[101:36] para fotos
[101:37] otro para video
[101:37] ¿listo?
[101:39] yo normalmente
[101:40] los dos que utilizo
[101:41] son
[101:41] yo pago una cuenta
[101:42] en Antropic
[101:43] y en ChatGPT
[101:44] en OpenAI
[101:45] ¿puedo integrar
[101:48] Office o Google Drive
[101:48] a Houston?
[101:49] sí
[101:49] sí se puede
[101:50] yo tengo conectado
[101:50] a mi Google Drive
[101:51] acá
[101:51] listo
[101:54] si tengo germes
[101:55] ¿cómo podría ponerlo
[101:56] a tratar juntos
[101:57] con Houston?
[101:58] los agentes
[101:59] de Houston
[101:59] tienen una sección
[102:00] donde tú
[102:01] lo puedes conectar
[102:02] en configuración
[102:03] los puedes conectar
[102:04] vía API
[102:04] ese es un poco
[102:05] más avanzado
[102:06] no lo vamos a ver hoy
[102:07] ¿el email
[102:09] donde lo busca?
[102:10] ¿es necesario
[102:11] Apify y Apolo
[102:12] para que es cada uno
[102:12] las plataformas
[102:13] de scraping
[102:13] de correos
[102:14] funcionan bien
[102:14] en la TAM?
[102:15] buena pregunta
[102:16] Apify
[102:18] es una herramienta
[102:20] que yo utilizo
[102:20] para que vaya
[102:21] entre a LinkedIn
[102:22] y encuentre
[102:23] a todas las personas
[102:23] que comentaron
[102:24] luego yo voy
[102:25] y utilizo otra aplicación
[102:27] que se llama Apolo
[102:28] que es con la que
[102:28] hay bases de correos
[102:30] en Latinoamérica
[102:31] va a encontrar
[102:32] probablemente
[102:33] el 40
[102:33] el 50%
[102:34] de los correos
[102:35] y el resto
[102:36] toca utilizar
[102:36] otras herramientas
[102:37] está Hunter
[102:38] está Lusha
[102:39] está Full & Rich
[102:40] yo cuando prospecto
[102:41] en la vida real
[102:42] lo que hago
[102:42] es todos los que no encuentren
[102:43] una
[102:43] que los busquen otra
[102:44] que los busquen otra
[102:45] que los busquen otra
[102:46] y así encuentro
[102:47] hasta el 60
[102:47] 70% de los correos
[102:49] o el 80%
[102:49] de los correos
[102:50] a veces
[102:50] ¿listo?
[102:52] listo
[102:53] miren lo que está haciendo
[102:54] él está trabajando
[102:55] y ya ha encontrado
[102:56] a varias de las personas
[102:57] que han comentado
[102:58] ¿listo?
[103:00] voy a poner esto
[103:01] un poco más grande
[103:02] y los voy a ir llamando
[103:03] a los que están por acá
[103:04] dice Malvin
[103:06] ¿podemos integrar
[103:07] las aplicaciones
[103:07] de Microsoft Office?
[103:09] la respuesta es sí
[103:10] si se puede
[103:10] ¿puedo hacer
[103:12] un agente similar
[103:13] y pedirle
[103:13] busque y prospecta
[103:14] a los gerentes
[103:15] o administradores
[103:15] de restaurantes
[103:16] en Bogotá?
[103:16] Laura la respuesta es sí
[103:18] pero lo que te digo es
[103:19] no es magia
[103:20] tú le vas a tener
[103:20] que enseñar
[103:21] a hacer eso
[103:21] la primera vez
[103:22] ejemplo
[103:22] ¿tú cómo buscas
[103:23] esos restaurantes?
[103:24] entras a Google Maps
[103:25] entonces dile
[103:26] utiliza Appify
[103:27] para scrapear
[103:27] Google Maps
[103:28] y traer restaurantes
[103:29] o
[103:29] haz una búsqueda avanzada
[103:31] en internet
[103:31] para encontrar
[103:32] y hazme una lista
[103:33] de restaurantes
[103:33] luego
[103:34] busca si están en LinkedIn
[103:35] si no están en LinkedIn
[103:36] búscame los perfiles
[103:37] de Instagram
[103:38] tienes que
[103:39] darle paso por paso
[103:41] hasta que se convierta
[103:42] en una habilidad
[103:43] es como un practicante
[103:43] imagínate que tú
[103:44] contratas un practicante
[103:45] de cero
[103:45] si le dices
[103:46] tráeme clientes
[103:47] el practicante
[103:48] va a estar perdido
[103:49] ¿listo?
[103:50] listo
[103:53] acá yo voy llamando
[103:54] algunos
[103:55] acá mi Houston
[103:56] ya los va poniendo
[103:56] Andrés Ceballos
[103:57] Jairo Murcia
[103:58] Jacqueline Duran
[104:01] ahí los está poniendo
[104:03] Esteficio Rilla
[104:05] estás por aquí
[104:06] si estás por aquí
[104:07] comenta en el chat
[104:08] mi Houston
[104:08] te encontró
[104:09] vamos a ver
[104:09] si encuentra tu correo
[104:10] para enviarte una secuencia
[104:12] Ángela Mendoza
[104:14] si estás por aquí
[104:15] repórtate por el chat
[104:16] Houston me encontró
[104:20] listo
[104:21] mírense
[104:21] comenten por el chat
[104:23] si Houston los encontró
[104:24] por favor
[104:24] listo
[104:25] Houston sigue trabajando
[104:28] ok
[104:28] acá
[104:29] él los está trabajando
[104:30] como son 200 comentarios
[104:31] y yo estoy prospectando
[104:32] en vivo de verdad
[104:33] está poniéndolos por
[104:35] baches de
[104:37] 118
[104:39] ya hay 118 personas acá
[104:40] listo
[104:42] la primera parte
[104:43] es que él va
[104:44] utiliza Appify
[104:45] que es una herramienta
[104:46] que se usa para scraping
[104:47] yo le enseñé a utilizarla
[104:48] como literalmente
[104:50] en lenguaje natural
[104:51] ayúdame a encontrar
[104:52] cuál es el mejor actor
[104:53] recomiéndame
[104:53] listo
[104:55] listo
[104:58] siguen las
[104:59] me dice
[105:00] las filas fluyendo a la hoja
[105:01] escribo el primer bloque
[105:02] y sigo jalando
[105:03] listo
[105:05] nada de lo que está pasando
[105:07] es magia
[105:09] ni es que los modelos
[105:10] ya vengan todos
[105:11] para hacer esto
[105:11] ustedes le tienen que enseñar
[105:12] esto es una habilidad
[105:13] que yo diseñé
[105:15] creé
[105:15] cotrabajé
[105:16] literalmente
[105:17] como yo les dije
[105:18] en la parte teórica
[105:19] yendo paso por paso
[105:20] paso por paso
[105:21] listo
[105:23] dice Julieta Manzano
[105:24] viví en Houston
[105:25] Texas
[105:26] ahora Houston
[105:26] me encontró
[105:27] increíble
[105:28] si está bien
[105:29] genial
[105:30] listo
[105:33] hay unos que tienen dudas
[105:35] vayan poniendo por acá
[105:36] ¿qué tan necesario
[105:37] es unir
[105:38] appify
[105:39] para hacer web scraping?
[105:40] la idea que se use
[105:40] no lo haría por defecto
[105:42] ¿cuál sería la ventaja
[105:42] de unir appify?
[105:43] Estefanía
[105:44] esa es una excelente pregunta
[105:46] los modelos de idea
[105:48] sí pueden hacer scraping
[105:49] pero como no están
[105:50] entrenados para hacer eso
[105:52] probablemente
[105:52] utilizarán
[105:53] diferentes metodologías
[105:54] por ejemplo
[105:55] entran
[105:56] miran tu pantalla
[105:58] toman fotos
[105:59] traen cosas
[106:00] navegan
[106:01] como si fueran un robot
[106:02] y estas páginas
[106:03] como LinkedIn
[106:04] como Instagram
[106:05] ya tienen cosas
[106:05] para antirobots
[106:07] y te pueden
[106:07] banear tu cuenta
[106:08] aplicaciones como
[106:10] appify
[106:10] como Anakin
[106:11] IO
[106:12] como kernel SH
[106:13] que son algunas de las
[106:13] que les voy a pasar
[106:14] más adelante
[106:15] son herramientas
[106:16] que hacen scraping
[106:17] a nivel
[106:17] de la red
[106:19] no a nivel
[106:19] como de la navegación
[106:21] entonces ya
[106:21] ellos ya resolvieron
[106:22] todos sus temas
[106:23] de seguridad
[106:23] ya resolvieron
[106:24] los temas
[106:24] de navegación
[106:25] para que puedan
[106:25] entrar a páginas
[106:26] para que puedan
[106:26] hacer esto
[106:27] de manera estructurada
[106:28] rápida
[106:28] y ustedes no se lo tengan
[106:30] que reinventar
[106:30] muchos de esos scrapers
[106:32] son gratis
[106:32] appify
[106:33] y ustedes pueden
[106:33] arrancar gratis
[106:34] hoy les vamos a dar
[106:35] 75 dólares
[106:35] que les van a durar
[106:37] un montón de tiempo
[106:38] a menos de que estén
[106:38] scrapeando cosas
[106:39] a nivel industrial
[106:40] ¿listo?
[106:42] listo
[106:43] por acá
[106:44] mi Houston
[106:44] sigue prospectando
[106:45] tenemos ya
[106:47] 265 personas
[106:49] ¿listo?
[106:53] listo
[106:54] sigamos
[106:56] me dice
[106:56] mira
[106:57] ya tengo
[106:58] el primer bloque
[106:58] ahora me voy a traer
[106:59] los emails
[107:00] de las personas
[107:01] si ustedes ven acá
[107:02] Houston está utilizando
[107:03] las herramientas
[107:04] que están en este skill
[107:05] está utilizando
[107:06] Apolo
[107:06] ¿listo?
[107:09] Felipe consulta
[107:10] ¿se puede testear
[107:11] un skill en Houston
[107:12] antes de que esté funcional?
[107:13] ¿desde dónde?
[107:14] desde cualquier chat
[107:15] tú puedes testearla
[107:16] abres un chat
[107:17] y le dices
[107:18] quiero testear
[107:19] este skill
[107:20] y
[107:22] lo seleccionas
[107:23] o
[107:24] si te lo estás
[107:25] trayendo
[107:25] de Cloud Code
[107:26] Cloud Cowork
[107:27] Chat GPT
[107:28] simplemente
[107:29] exportalo como texto
[107:30] se lo copias
[107:30] y se lo pegas
[107:31] y le dices
[107:31] quiero programar
[107:32] este skill
[107:32] ¿listo?
[107:35] dice William Ruiz
[107:36] hay que utilizar
[107:36] todos los motores
[107:37] de pago
[107:37] William
[107:38] no hay que utilizar
[107:38] todos los motores
[107:39] de pago
[107:39] pero a medida que
[107:40] tu agente
[107:40] comience a trabajar
[107:41] pues si no tienes
[107:42] algo pago
[107:43] te vas a quedar
[107:44] en o modelos
[107:45] que son
[107:45] no los más avanzados
[107:46] o
[107:47] se te van a acabar
[107:48] el uso muy rápido
[107:49] porque ellos te dan
[107:49] solo una prueba
[107:50] mi recomendación
[107:52] es
[107:52] súbete a cualquier
[107:53] suscripción
[107:54] de 20 dólares
[107:55] de los modelos
[107:55] de guía
[107:56] o
[107:56] suscríbete
[107:57] Open Router
[107:58] que te vamos a dar
[107:58] 10 dólares hoy
[107:59] y arranca a probarlo
[108:00] o sea
[108:00] hoy en día
[108:01] alguien que tenga
[108:02] 20 dólares al mes
[108:03] rinde 10x
[108:05] que un humano
[108:05] que no
[108:06] ¿listo?
[108:08] listo
[108:09] vamos a ver
[108:09] está consiguiendo
[108:10] los correos
[108:10] también
[108:11] listo
[108:12] y a medida que
[108:13] los vaya trayendo
[108:14] los va a traer
[108:15] en el lote
[108:15] entonces
[108:16] vamos a dejar
[108:17] a Houston
[108:18] trabajando
[108:18] vamos a dejar
[108:19] ahí a Houston
[108:20] trabajando
[108:20] y vamos a volver
[108:21] todos a
[108:21] mi pantalla
[108:23] a
[108:23] participar
[108:24] en contarles
[108:25] cómo fue que lo construí
[108:27] antes de darle acceso
[108:28] a que ustedes mismos
[108:29] lo instalen
[108:29] ¿les parece?
[108:32] listo
[108:32] si están por ahí
[108:33] reaccionen
[108:33] hagan algo
[108:34] háganme saber
[108:34] que están ahí
[108:35] listo
[108:36] están ahí
[108:36] veo que Tomás
[108:37] reaccionó
[108:38] listo
[108:40] listo
[108:42] aquí están
[108:44] listo
[108:45] quiero que
[108:46] les voy a contar
[108:49] cuál es
[108:51] el marco
[108:51] de pensamiento
[108:52] con el que ustedes
[108:53] pueden abordar
[108:53] cualquier problema
[108:54] en vivo
[108:55] y convertirlo
[108:56] en un agente
[108:57] de IA
[108:57] les voy a mostrar
[108:58] la parte estratégica
[108:59] y lo vamos a hacer
[109:00] al tiempo
[109:00] en 10 o 15 minutos
[109:02] para que ustedes
[109:02] se vean
[109:02] o sea
[109:03] es simple
[109:04] pero es poderoso
[109:04] ¿listo?
[109:05] y después
[109:05] no se preocupen
[109:06] vamos a entrar
[109:07] todos a Houston
[109:08] ustedes les voy a dar
[109:09] mi agente
[109:10] les voy a dar
[109:10] mis skills
[109:11] ustedes les vamos
[109:12] a dar los códigos
[109:12] no se preocupen
[109:13] ¿listo?
[109:14] entonces
[109:15] lo primero
[109:17] que quiero que hagan
[109:18] es
[109:18] vamos a volver
[109:20] todos al
[109:21] menti
[109:22] que tenemos
[109:23] por acá
[109:23] ¿listo?
[109:26] les voy a enseñar
[109:27] un modelo
[109:28] de pensamiento
[109:29] que viene
[109:29] del área
[109:30] de producto
[109:30] veo que hay
[109:32] algunos por acá
[109:32] de la época
[109:33] de soy startup
[109:33] que estaban
[109:34] seguramente
[109:35] en esta sesión
[109:35] de este producto
[109:36] y lo reconocerán
[109:36] pero
[109:37] este taller
[109:38] es para convertir
[109:39] un problema
[109:39] en vivo
[109:40] en un agente
[109:41] con impacto
[109:41] un problema
[109:43] como el siguiente
[109:44] que les voy a mostrar
[109:45] un segundo
[109:48] un segundo
[109:48] ya
[109:51] acá
[109:54] imagínense que
[109:57] su jefe
[109:58] les dice
[109:59] oiga
[110:00] quiero que me construya
[110:01] un agente
[110:02] para mejorar
[110:03] la empresa
[110:03] y no les dice
[110:04] nada más
[110:04] ¿no?
[110:05] que sabe
[110:07] que quiere utilizar
[110:07] IA
[110:08] pero no tiene
[110:08] ni idea
[110:09] y ustedes también
[110:09] oigan
[110:10] quiero crearme
[110:11] un agente
[110:11] IA
[110:11] y no tengo
[110:11] ni idea
[110:12] para qué
[110:12] entonces
[110:13] hay un modelo
[110:15] de pensamiento
[110:15] que
[110:16] es el siguiente
[110:18] lo primero
[110:20] es que
[110:21] aborden un problema
[110:23] con una mentalidad
[110:24] del producto
[110:24] lo primero
[110:25] es siempre
[110:25] entender
[110:26] quién es el usuario
[110:27] que va a trabajar
[110:28] con el agente
[110:29] en el día a día
[110:29] piensen
[110:30] esto como roles
[110:31] piensen
[110:32] quién es
[110:33] es el gerente general
[110:33] es el gerente comercial
[110:35] es el vendedor
[110:36] es el de logística
[110:38] es el de operaciones
[110:38] es el administrativo
[110:39] piensen siempre
[110:41] si les dicen
[110:42] hágame un agente IA
[110:43] y no saben por dónde arrancar
[110:44] arranquen listo
[110:44] cuáles son los usuarios
[110:45] en mi empresa
[110:46] y yo qué tipo de rol tengo
[110:47] lo segundo que ustedes
[110:48] van a pensar es
[110:49] cuál es el caso de uso
[110:51] yo para
[110:51] qué hago en mi día a día
[110:52] para qué utilizo
[110:53] para qué quisiera utilizar
[110:54] IA
[110:54] qué son las cosas que hago
[110:56] por ejemplo
[110:56] prospecto
[110:57] mando cotizaciones
[110:59] mando propuestas comerciales
[111:01] hago seguimiento
[111:01] actualizo temas
[111:03] de la DIAN
[111:03] me meto a plataformas
[111:06] del gobierno
[111:07] cuál es el caso de uso
[111:08] luego de eso
[111:09] luego del caso de uso
[111:11] lo que hacen es
[111:12] van a identificar
[111:13] cuáles son los dolores
[111:15] dentro de ese caso de uso
[111:16] ok
[111:17] cuando estoy prospectando
[111:18] lo que más me duele
[111:19] es que
[111:19] no encuentro los correos
[111:20] o que no puedo calificarlo
[111:21] suficientemente rápido
[111:23] o
[111:23] los dolores
[111:24] luego que tienen los dolores
[111:26] van a pasar a
[111:28] hacer una ayuda
[111:29] de ideas de soluciones
[111:29] para ese dolor específico
[111:31] que priorizaron
[111:32] y luego de toda esa ayuda
[111:33] de soluciones
[111:34] ahí es que vamos a escribir
[111:35] la serie de procedimientos
[111:37] y skills
[111:37] para nuestro agente
[111:38] y las métricas
[111:39] con las que la vamos a medir
[111:40] ¿listo?
[111:42] no se preocupen
[111:43] vamos a hacerlo
[111:44] en vivo
[111:44] y en directo
[111:45] ¿listo?
[111:46] uy
[111:47] acá
[111:48] acá
[111:48] un segundo
[111:49] ¿listo?
[111:51] quiero que todos vayan
[111:52] y vamos a hacerlo
[111:53] paso por paso
[111:54] quiero que todos vuelvan
[111:55] vayan a mi pantalla
[111:56] y vayan a este menti
[111:57] van a escanear
[111:58] este código QR
[111:59] y pónganme
[112:00] cuál es el usuario
[112:02] dentro de la empresa
[112:02] que va a trabajar
[112:03] con el agente
[112:03] dentro de su empresa
[112:04] ¿qué rol tienen ustedes?
[112:07] sean específicos
[112:08] imagínense que están
[112:09] contratando una persona
[112:10] ¿listo?
[112:11] ¿cuál es el usuario
[112:12] que va a trabajar
[112:13] con el agente?
[112:15] ventas no es suficiente
[112:16] es un vendedor
[112:17] el que trabaja
[112:18] es un gerente comercial
[112:20] el que trabaja
[112:21] ¿listo?
[112:22] listo
[112:23] vamos leyendo
[112:23] somos 500 personas
[112:25] que están en este menti
[112:26] por favor agarren su celular
[112:28] escane en este código QR
[112:29] y vamos a hacerlo en vivo
[112:30] ¿listo?
[112:39] listo
[112:39] a todos los que están entrando
[112:41] hasta ahora
[112:42] y están un poquito perdidos
[112:43] estamos enseñándoles
[112:44] una metodología
[112:45] para agarrar
[112:46] cualquier problema ambiguo
[112:47] y convertirlo
[112:48] en un agente con skills
[112:49] ¿listo?
[112:51] veo 143 personas
[112:52] listo
[112:53] ventas
[112:53] ventas
[112:54] ventas
[112:54] asistente
[112:56] CEO
[112:56] vendedor
[112:57] co-founder
[112:58] CEO
[112:59] founder
[112:59] entonces mientras
[113:00] todos van respondiendo
[113:01] yo voy pasando
[113:02] un par acá
[113:02] en mi tablero
[113:04] ¿listo?
[113:05] y voy a ir poniendo
[113:06] un par acá
[113:06] voy a poner acá
[113:09] voy a poner acá
[113:13] los que me van poniendo
[113:14] CEO
[113:15] vendedor
[113:19] comercial
[113:20] pusieron por acá
[113:21] listo
[113:24] vamos viendo
[113:24] ¿qué más ponen?
[113:26] marketing manager
[113:27] voy a poner acá un par
[113:28] ¿listo?
[113:30] voy a poner acá un par
[113:31] marketing manager
[113:34] listo
[113:36] y voy a poner uno más
[113:37] líder comercial
[113:40] consultor
[113:41] analista
[113:41] auxiliar contable
[113:43] me gusta este
[113:44] Gustavo Daza dice
[113:46] auxiliar contable
[113:47] ¿listo?
[113:49] entonces la idea es que
[113:50] cuando ustedes estén con su equipo
[113:51] mapeense
[113:52] todos estos roles
[113:53] ¿a quién le quieren construir?
[113:56] ¿o qué rol tienen ustedes?
[113:57] auxiliar
[113:58] contable
[113:59] ¿listo?
[114:01] piense cómo
[114:02] en 30 segundos
[114:03] o en un minuto
[114:04] tenemos
[114:05] 274
[114:06] o 178
[114:08] roles que acabamos de mapear
[114:09] si ustedes están facilitando
[114:11] este mismo taller
[114:12] dentro de su empresa
[114:12] pueden invitar a toda su empresa
[114:14] y en
[114:14] un minuto
[114:15] ya tienen esto
[114:16] ¿listo?
[114:18] listo
[114:18] sigamos
[114:19] vamos a priorizar uno
[114:20] supongamos que
[114:21] este es el
[114:22] vendedor
[114:24] comercial
[114:25] vamos a poner acá
[114:26] comercial
[114:26] ¿listo?
[114:28] entonces me voy a llevar este acá
[114:29] y voy a priorizarme
[114:31] al comercial
[114:31] ¿listo?
[114:33] el comercial
[114:33] listo
[114:36] vamos a priorizar
[114:37] a una persona
[114:38] en comercial
[114:39] porque
[114:39] tenemos los skills
[114:41] y tenemos un montón
[114:42] de gente interesada
[114:42] en ver este tema
[114:43] comercial
[114:44] vamos a la segunda parte
[114:46] quiero que ustedes
[114:47] me ayuden a pensar
[114:48] cuál es el caso
[114:48] de uso
[114:49] de un usuario
[114:50] un vendedor
[114:51] un representante
[114:52] comercial
[114:52] piensen en cosas
[114:54] que hace este rol
[114:54] pongan ahí
[114:55] por el chat
[114:56] cuáles son las cosas
[114:57] que hace un representante
[114:58] comercial en una empresa
[114:59] o un vendedor
[115:00] prospectar
[115:02] conseguir clientes
[115:04] encontrar clientes
[115:05] cotizaciones
[115:05] prospectar
[115:06] cerrar
[115:07] sean lo más específico
[115:08] que puedan
[115:09] imagínense que acaban
[115:10] de contratar
[115:10] un vendedor
[115:10] en su empresa
[115:11] que le están pidiendo
[115:12] que haga
[115:12] tiene que hacer
[115:13] estrategias de venta
[115:14] tiene que calificar
[115:15] leads
[115:16] tiene que realizar
[115:17] un esquema básico
[115:18] tiene que elaborar
[115:21] cotizaciones
[115:21] tiene que asistir
[115:22] a eventos
[115:23] tiene que alimentar
[115:23] el CRM
[115:24] tiene que hacer
[115:25] procesos de setter
[115:26] ¿listo?
[115:27] sigan poniendo
[115:28] y yo voy poniendo
[115:28] algunas cosas acá
[115:29] de las cosas
[115:30] que me van diciendo
[115:30] ustedes
[115:31] ¿listo?
[115:31] entonces por ejemplo
[115:33] hacer cotizaciones
[115:38] tiene que
[115:41] acá
[115:42] un segundo
[115:43] cotizaciones
[115:45] hacer seguimiento
[115:46] veamos
[115:48] que más van poniendo
[115:49] ustedes
[115:49] alimentar el CRM
[115:51] alimentar CRM
[115:54] hacer seguimiento
[115:58] listo
[116:00] vamos
[116:00] vamos poniendo
[116:01] cotizar
[116:03] vamos a ver
[116:04] acá parece que
[116:05] este cotizar
[116:05] es bastante
[116:06] allá lo tenemos
[116:07] cotizar
[116:08] listo
[116:09] sigo leyéndolos
[116:11] 173 personas
[116:13] de 537
[116:14] han respondido
[116:15] por favor
[116:16] los que están
[116:16] en el zoom
[116:17] todavía
[116:17] los veo
[116:18] somos 548 personas
[116:19] agarren su celular
[116:21] si están perdidos
[116:22] lo que estamos haciendo
[116:23] es
[116:23] estamos
[116:23] aprendiendo
[116:25] una metodología
[116:25] para convertir
[116:26] cualquier problema
[116:27] ambiguo
[116:27] en un agente
[116:28] de día
[116:29] la parte estratégica
[116:30] listo
[116:32] ¿cuál es el caso
[116:32] de este usuario?
[116:33] buscar clientes
[116:35] prospectar
[116:36] sales enablement
[116:37] cotizaciones
[116:38] analizar mercado
[116:39] listo
[116:39] voy poniendo acá
[116:40] analizar mercado
[116:41] analizar mercado
[116:44] listo
[116:47] listo
[116:48] más cosas
[116:49] agendar citas
[116:51] agendar citas
[116:53] listo
[116:56] ¿qué más?
[116:56] ¿qué más?
[116:57] prospectar
[116:57] conseguir clientes
[116:58] calificar
[116:59] listo
[117:00] vamos acá
[117:00] calificar prospectos
[117:05] listo
[117:08] hacer cotizaciones
[117:11] hacer cotizaciones
[117:15] listo
[117:16] y por acá
[117:17] tenía uno más
[117:18] que era prospectar
[117:19] voy a ponerlo
[117:19] por acá arriba
[117:20] porque salió
[117:20] varias veces
[117:21] prospectar
[117:22] prospectar
[117:25] prospectar
[117:29] listo
[117:30] volvamos acá
[117:30] entonces fíjense
[117:32] cómo en otro minuto
[117:33] de manera colaborativa
[117:35] tenemos 225
[117:37] casos de uso
[117:38] que si los agrupamos
[117:39] seguramente
[117:39] no serán 225
[117:41] pero estas son
[117:42] todas las cosas
[117:42] que tiene que hacer
[117:43] un agente
[117:44] de IA
[117:45] listo
[117:46] imagínense que
[117:47] esto es un taller
[117:47] que estuvieran facilitando
[117:48] dentro de su propia empresa
[117:49] colaborativamente
[117:50] muy rápido
[117:51] lo van a sacar
[117:51] listo
[117:52] listo
[117:54] vamos a la siguiente
[117:54] pregunta
[117:55] vamos a prospectar
[117:58] vamos a
[117:59] vamos a elegir
[118:00] una dimensión
[118:01] y a todos los que están
[118:02] entrando
[118:02] lo que estamos haciendo
[118:03] es estamos utilizando
[118:04] una metodología
[118:04] para identificar
[118:05] usuarios
[118:06] casos de uso
[118:07] dentro de esos casos
[118:08] de uso
[118:08] vamos a priorizar
[118:10] uno que es prospectar
[118:11] y dentro de prospectar
[118:13] quiero que me ayuden
[118:14] a hacer un brainstorm
[118:15] de cuáles son los dolores
[118:16] específicos
[118:17] que tiene un representante
[118:19] comercial
[118:19] cuando está prospectando
[118:21] listo
[118:22] ayúdenme
[118:23] ayúdenme
[118:24] ayúdenme
[118:24] a saber
[118:25] cuáles son los dolores
[118:26] que tiene un usuario
[118:27] cuando está prospectando
[118:29] tiempo no es un dolor
[118:30] díganme cuál es el dolor
[118:32] no tiene tiempo
[118:33] le consume mucho tiempo
[118:35] o sea porque tiempo
[118:35] es solo un
[118:36] no sé
[118:37] eso es un pronombre
[118:38] un atetivo
[118:39] un elemento
[118:41] listo
[118:43] no sabe
[118:44] priorizar ventas
[118:45] revisar cumplimiento
[118:46] del plan de producción
[118:47] no sabe cuáles son
[118:50] los leads calificados
[118:51] prospectar
[118:52] es un dolor de cabeza
[118:53] dice Juan Pablo
[118:53] no tiene un perfil claro
[118:55] listo
[118:56] vamos poniendo por acá
[118:57] listo
[118:57] vamos poniendo los dolores
[118:58] que me ponen acá
[118:59] y voy a poner
[118:59] acabamos de priorizar
[119:01] prospectar
[119:03] listo
[119:04] vayan respondiendo
[119:06] por la app de menti
[119:07] en sus celulares
[119:08] cuáles son los dolores
[119:10] que tiene un representante
[119:11] comercial
[119:11] cuando está prospectando
[119:13] y acá va a poner acá
[119:14] los que van saliendo
[119:16] listo
[119:19] entonces dice
[119:20] no tener tiempo
[119:22] para hacerlo
[119:24] voy a poner algo
[119:26] por acá más
[119:27] por ejemplo
[119:27] baja tolerancia
[119:30] al rechazo
[119:30] baja tolerancia
[119:32] al rechazo
[119:33] a ver
[119:35] que hayan puesto
[119:36] por acá
[119:36] no tener bases
[119:38] de datos
[119:39] listo
[119:40] no tener bases
[119:41] de datos
[119:41] no tener
[119:44] tener
[119:46] no tener
[119:47] bases
[119:47] de datos
[119:48] listo
[119:52] acá
[119:52] cuál otro
[119:55] dicen
[119:56] no tener
[119:56] un perfil claro
[119:57] no tener
[119:58] un perfil
[119:59] claro
[119:59] para prospectar
[120:00] listo
[120:03] sigamos viendo
[120:04] los dolores
[120:04] no tener
[120:08] capacidad
[120:08] operativa
[120:09] dicen por acá
[120:10] que me parece
[120:11] capacidad operativa
[120:12] para prospectar
[120:12] tengo muchas cosas
[120:13] que hacer
[120:13] y no me da
[120:14] el día
[120:15] capacidad
[120:16] operativa
[120:18] listo
[120:19] a ver
[120:20] datos de contacto
[120:22] no tengo datos
[120:22] de contacto
[120:23] esa es muy buena
[120:24] no tengo datos
[120:26] de contacto
[120:27] no tengo datos
[120:28] de contacto
[120:29] listo
[120:31] listo
[120:32] que más
[120:33] falta de respuesta
[120:38] que no saben
[120:39] qué es la audiencia
[120:40] encontrar el contacto
[120:42] falta de conocimiento
[120:43] del tiempo
[120:44] precisión
[120:45] buscar la información
[120:46] pónganlo
[120:47] que un dolor
[120:48] un dolor es algo
[120:49] que le duele a uno
[120:50] no no
[120:50] solo me pongan
[120:51] como el tema
[120:52] sino algo
[120:52] que les duela
[120:53] piénselo
[120:54] ustedes mismos
[120:55] oigan
[120:55] me duele
[120:55] no encontrar
[120:56] a los clientes
[120:57] me duele
[120:57] no tener información
[120:58] me duele
[120:58] pasar todo el día
[121:00] listo
[121:02] somos 550 personas
[121:04] en esta llamada
[121:05] por favor
[121:06] los que están perdidos
[121:07] saquen su celular
[121:08] escaneen este código QR
[121:11] y les hago una recapitulación
[121:12] de lo que estamos haciendo
[121:13] les estoy enseñando
[121:14] una metodología
[121:15] de pensamiento
[121:16] para que puedan convertir
[121:17] cualquier problema
[121:17] ambiguo
[121:18] en un agente
[121:18] con habilidades
[121:19] listo
[121:20] dijimos que
[121:22] hay varios roles
[121:25] dentro de una empresa
[121:25] ustedes hicieron
[121:26] un brainstorm
[121:27] SEO
[121:27] comercial
[121:28] marketing manager
[121:29] elegimos al comercial
[121:31] dentro del comercial
[121:32] hay un montón de casos
[121:33] de uso
[121:34] prospectar
[121:34] hacer cotizaciones
[121:35] analizar el mercado
[121:36] alimentar CRM
[121:37] hacer seguimiento
[121:37] decidimos priorizar
[121:39] el prospección
[121:40] y dentro del prospección
[121:41] queremos identificar
[121:42] los dolores
[121:43] cuáles son los dolores
[121:44] al prospectar
[121:45] listo
[121:46] los datos
[121:48] no son
[121:48] los datos
[121:49] no son claros
[121:50] conseguir los correos
[121:51] no cierran las ventas
[121:53] conseguir datos
[121:55] del cliente
[121:55] manejo de objeciones
[121:56] esa está buena
[121:57] voy a poner esa
[121:58] también acá
[121:59] el dolor
[122:02] ahí cuál sería
[122:02] no saber manejar
[122:03] las objeciones
[122:04] listo
[122:06] voy a poner acá
[122:07] voy a poner
[122:09] no puedo contestar
[122:12] rápido
[122:13] rápido
[122:14] rápido
[122:15] un segundo
[122:18] que se me cambió
[122:19] listo
[122:21] listo
[122:23] a ver
[122:26] qué más
[122:27] no tengo datos
[122:27] de contacto
[122:28] no tengo la capacidad
[122:29] operativa
[122:29] listo
[122:30] vamos a llevarnos
[122:31] este que es
[122:32] no tener bases
[122:33] de datos
[122:33] y ahora lo que quiero
[122:36] que hagamos
[122:36] es
[122:37] en la próxima
[122:38] lo que vamos a hacer
[122:39] es
[122:39] vamos a agarrar
[122:41] esta que es
[122:42] el problema
[122:43] y los vamos a ir conectando
[122:45] si ustedes se dan cuenta
[122:46] elegimos a una persona
[122:49] que es un representante
[122:50] comercial
[122:51] este comercial
[122:52] tiene unos dolores
[122:53] y tiene unos casos
[122:54] de uso
[122:54] el caso de uso
[122:55] que elegimos
[122:56] fue prospectar
[122:57] dentro de prospectar
[122:58] tiene un dolor
[122:59] que es
[123:00] no tener bases
[123:01] de datos
[123:01] listo
[123:02] ahora lo que vamos a hacer
[123:03] es
[123:03] en la próxima pregunta
[123:04] es listo
[123:05] y cómo podemos
[123:06] solucionar
[123:06] de manera creativa
[123:08] que no tengan bases
[123:09] de datos
[123:09] listo
[123:11] entonces ahora vamos
[123:12] y vamos a responder esto
[123:13] de qué manera podría
[123:14] un representante comercial
[123:16] que cuando está prospectando
[123:17] no tiene bases de datos
[123:19] sean creativos
[123:20] de qué manera podría
[123:21] este representante comercial
[123:22] generarse
[123:26] sus propias bases de datos
[123:27] yo voy a poner
[123:29] la propia mía
[123:30] oiga
[123:30] crearse un lead magnet
[123:31] en linkedin
[123:32] y escribirle a toda esa gente
[123:34] voy a poner
[123:37] lead magnet
[123:38] de linkedin
[123:39] voy a poner por acá
[123:43] yo también voy a participar
[123:44] lead magnet
[123:46] magnet
[123:47] linkedin
[123:48] listo
[123:53] esto puede ser
[123:54] una base
[123:54] una publicación mía
[123:56] o esto puede ser
[123:56] una publicación
[123:57] de un tercero
[123:58] ahorita les voy a mostrar
[123:58] y quiero que todos ustedes
[123:59] se creen su propia base de datos
[124:00] con mi publicación
[124:01] listo
[124:03] listo
[124:04] van 68
[124:05] de 552 personas
[124:07] que estamos en esta llamada
[124:08] de qué manera
[124:09] podría resolver
[124:10] un usuario
[124:12] que es
[124:12] un representante comercial
[124:14] que
[124:15] quiere utilizar
[124:16] una gente
[124:16] ya para prospectar
[124:17] y no tiene bases de datos
[124:19] ese es su dolor
[124:19] ayudémosle a
[124:21] hacer un brainstorm
[124:22] de soluciones
[124:22] dice
[124:24] Tatiana Pérez
[124:25] usar
[124:25] dorks
[124:26] usar
[124:27] apify
[124:27] dice
[124:28] janet
[124:28] cifuentes
[124:29] capacitación permanente
[124:31] pinterest
[124:32] me gusta
[124:32] monica
[124:33] me gusta
[124:34] no hubiera pensado
[124:34] en pinterest
[124:35] piensen
[124:37] piensen
[124:37] de qué manera
[124:37] se puede crear
[124:38] esta persona
[124:39] por ejemplo
[124:39] podría ir a eventos
[124:40] podría pedir referidos
[124:42] podría meterse
[124:43] a linkedin
[124:44] podría escapear
[124:44] noticias
[124:45] podría meterse
[124:46] a bases de datos
[124:46] del gobierno
[124:47] podría compararse
[124:48] a las cámaras
[124:48] de comercio
[124:49] ayúdenme
[124:50] ayúdenme acá
[124:50] con ideas
[124:51] filtrar datos
[124:54] de valor
[124:54] voy a ir poniendo
[124:55] entonces por acá
[124:55] entonces
[124:56] linkedin
[125:00] voy a poner acá
[125:01] crear
[125:02] crear con
[125:03] prospectar
[125:04] por linkedin
[125:05] crearla con linkedin
[125:06] crear por linkedin
[125:07] linkedin
[125:10] pero esto también
[125:11] pero esto también
[125:12] podría ser
[125:12] si alguien vende
[125:13] por redes sociales
[125:13] crear por instagram
[125:15] scrapearse perfiles
[125:17] miremos qué más
[125:19] recoger información
[125:23] en eventos
[125:23] sí
[125:23] esa es la más
[125:24] común
[125:26] vamos acá
[125:28] crear
[125:31] asistir a eventos
[125:33] y crear bases
[125:34] de datos
[125:34] vamos poniéndolas
[125:35] asistir
[125:37] a eventos
[125:38] y crear
[125:39] bases de datos
[125:40] o eventos
[125:42] voy a poner acá
[125:42] eventos
[125:43] yo por ejemplo
[125:44] en Estados Unidos
[125:45] cuando voy a eventos
[125:45] me escapeo
[125:46] toda la lista
[125:47] de asistentes
[125:47] los busco en linkedin
[125:48] encuentro sus correos
[125:49] les mando
[125:50] una agenda
[125:51] personalizada
[125:52] y les digo
[125:53] veámonos en el evento
[125:54] por ejemplo
[125:54] comprar bases de datos
[125:57] sí
[125:57] filtrando por linkedin
[126:01] sí
[126:01] procrastinación
[126:02] en contactar
[126:03] no Andrés
[126:03] no podemos procrastinar
[126:04] le estamos ayudando
[126:05] a solucionar
[126:05] a esta persona
[126:06] listo
[126:08] crear su propia base
[126:09] sí
[126:09] pero cómo
[126:10] lead magnet
[126:13] en linkedin
[126:14] acá estoy yo
[126:14] consultar
[126:15] y filtrar
[126:15] otras bases
[126:16] de datos
[126:16] por ejemplo
[126:17] la cámara de comercio
[126:18] de Bogotá
[126:18] así es
[126:19] cámaras de comercio
[126:20] cámaras de comercio
[126:22] listo
[126:25] acá
[126:25] cámaras de comercio
[126:26] cámaras de comercio
[126:30] listo
[126:32] qué más
[126:33] qué más
[126:33] vamos a ver
[126:34] 167 personas
[126:35] han respondido
[126:36] si están perdidos
[126:37] les hago una recapitulación
[126:38] de lo que estamos haciendo
[126:39] estamos haciendo
[126:40] un ejercicio
[126:41] para que ustedes aprendan
[126:42] la parte metódica
[126:43] de convertir
[126:44] cualquier problema
[126:45] en vivo
[126:45] en un agente
[126:47] que pueda
[126:48] solucionarles cosas
[126:49] para este ejemplo
[126:50] arrancamos
[126:51] identificando
[126:52] a los usuarios
[126:52] ustedes mismos
[126:53] dijeron que
[126:53] hayan diferentes
[126:54] CEOs
[126:55] comercial
[126:55] marketing manager
[126:56] auxiliares
[126:56] contables
[126:57] luego
[126:58] priorizamos
[126:59] ese usuario
[127:00] y hicimos
[127:00] una lluvia
[127:01] de ideas
[127:01] de cuáles
[127:02] son los casos
[127:02] de uso
[127:03] que estas personas
[127:03] tienen
[127:04] prospectar
[127:05] hacer cotizaciones
[127:06] analizar el mercado
[127:06] hacer seguimiento
[127:07] agendar citas
[127:08] luego de eso
[127:09] priorizamos
[127:10] el caso de uso
[127:11] de prospección
[127:12] y estamos
[127:12] identificamos
[127:13] ya los dolores
[127:14] no tiene tiempo
[127:15] para hacerlo
[127:15] no tiene bases
[127:16] de datos
[127:17] tiene baja tolerancia
[127:18] al rechazo
[127:18] no puede contestar
[127:19] rápido
[127:20] no tiene capacidad
[127:20] operativa
[127:21] luego de eso
[127:22] priorizamos el dolor
[127:23] de no tener
[127:24] una base de datos
[127:25] y estamos
[127:25] en el paso
[127:26] de ok
[127:27] cómo podemos
[127:28] solucionar
[127:28] el tema
[127:28] de no tener
[127:29] bases de datos
[127:30] por ejemplo
[127:30] crear una
[127:31] por linkedin
[127:32] crear una
[127:32] por instagram
[127:33] ir a eventos
[127:34] comprar las cámaras
[127:34] de comercio
[127:35] lo sigo leyendo
[127:38] listo
[127:40] hay 174 personas
[127:42] que han contestado
[127:43] de las 552
[127:44] que estamos acá
[127:45] presentes
[127:46] por favor
[127:47] saquen su celular
[127:48] y
[127:49] ayúdenle a la persona
[127:51] que está en comercial
[127:52] a resolver este problema
[127:53] cómo podrían
[127:54] crearse una base
[127:55] de datos
[127:55] para prospectar
[127:56] me encantó
[127:58] esta de pinterest
[127:59] listo
[128:03] sigamos
[128:06] sigamos
[128:07] sigamos
[128:07] listo
[128:10] hay 178
[128:11] cuando lleguemos
[128:12] a 200
[128:12] sigo
[128:13] pedir fondos
[128:16] para comprarlas
[128:17] ir a eventos
[128:17] hacer un webinar
[128:18] esa me gusta
[128:19] webinars
[128:20] webinars
[128:23] si
[128:24] social selling
[128:27] a ver
[128:30] qué más
[128:30] por acá
[128:30] a ver
[128:34] a ver
[128:34] a ver
[128:34] a ver
[128:34] a ver
[128:35] scrapear
[128:37] con un agente
[128:38] sí señor
[128:39] mandando mensajes
[128:41] rápidos
[128:42] o notas
[128:42] por whatsapp
[128:43] con fotos
[128:43] de soporte
[128:44] para que la gente
[128:44] registre
[128:45] así está chévere
[128:46] por whatsapp
[128:47] en frío
[128:47] por whatsapp
[128:48] en frío
[128:50] por whatsapp
[128:51] listo
[128:52] listo
[128:55] ocho más
[128:55] y seguimos
[128:56] ocho más
[128:56] los que no han participado
[128:57] somos 555
[128:59] referidos
[129:00] voy a ponerla
[129:01] por acá
[129:01] referidos
[129:02] yo sé que hay
[129:02] hartas personas
[129:03] en cargos comerciales
[129:04] acá
[129:04] referidos
[129:07] listo
[129:09] listo
[129:12] una más
[129:16] una más
[129:16] una más
[129:16] una más
[129:17] listo
[129:20] 202
[129:21] listo
[129:22] y el siguiente paso
[129:23] y muy importante
[129:24] es definir
[129:25] las métricas
[129:26] si vamos a
[129:27] hacer uno
[129:28] por ejemplo
[129:28] yo voy a poner acá
[129:29] no tener bases de datos
[129:31] y voy a decir
[129:32] creación por
[129:34] linkedin
[129:35] es el que vamos a
[129:36] priorizar
[129:37] bases de datos
[129:39] crear
[129:39] crear bases de datos
[129:41] con linkedin
[129:42] listo
[129:47] cómo podrían ser
[129:50] una manera
[129:50] en la que yo
[129:51] los puedo medir
[129:52] ejemplo
[129:52] cómo le puedo
[129:53] poner una métrica
[129:54] que me ayude a medir
[129:55] o de producto
[129:55] de negocio
[129:56] si mi agente
[129:56] está haciendo bien
[129:57] el trabajo
[129:58] o no
[129:58] les doy un ejemplo
[129:59] número
[130:01] de personas
[130:03] encontradas
[130:05] en linkedin
[130:05] si
[130:09] número de correos
[130:10] número de correos
[130:12] encontrados
[130:13] número de correos
[130:15] encontrados
[130:16] listo
[130:21] listo
[130:24] pónganme por acá
[130:25] porcentaje de leads
[130:26] calificados
[130:27] buenísima
[130:28] porcentaje de leads
[130:29] calificados
[130:30] porcentaje de leads
[130:35] calificados
[130:36] listo
[130:38] vamos a poner más
[130:39] contactos efectivos
[130:41] está buena esa
[130:41] contactos efectivos
[130:43] porcentaje de contactos
[130:46] efectivos
[130:46] listo
[130:52] vamos a ver
[130:53] vamos a ver
[130:54] número de eventos
[130:56] encontrados
[130:56] esa está muy buena
[130:57] aunque no estamos
[130:59] hablando de eventos
[130:59] pero
[131:00] número de eventos
[131:02] encontrados
[131:02] cargos de personas
[131:05] encontradas
[131:06] porcentaje
[131:07] mail válidos
[131:08] muy buena
[131:08] mails
[131:10] válidos
[131:11] listo
[131:13] porcentajes de mails
[131:15] válidos
[131:15] número de ventas
[131:18] cerradas
[131:18] claro
[131:19] si uno está vendiendo
[131:20] número de ventas
[131:20] cerradas
[131:21] aunque
[131:24] esas son metas
[131:26] indirectas
[131:26] para medir
[131:27] si nuestra gente
[131:28] está creando
[131:28] las bases de datos
[131:29] de manera correcta
[131:30] o no
[131:30] número de tomadores
[131:32] de decisión
[131:33] encontrados
[131:33] esa está buenísima
[131:34] yo le pondría
[131:35] inclusive un porcentaje
[131:37] porcentaje
[131:39] de tomadores
[131:39] de decisión
[131:40] encontrados
[131:40] listo
[131:44] y una más
[131:45] una más
[131:46] lleguemos a 100
[131:48] lleguemos a 100
[131:48] son 558 personas
[131:50] acá
[131:50] vayan al celular
[131:51] y respondan
[131:52] cantidad de prospectos
[131:59] encontrados
[132:00] número de visitas
[132:01] agendamiento
[132:01] OnlyFans
[132:02] no esa no
[132:03] esa no
[132:04] ticket promedio
[132:05] respondió
[132:10] no respondió
[132:10] listo
[132:11] tasa de respuesta
[132:11] listo
[132:13] tasa de respuesta
[132:14] tasa de respuesta
[132:18] listo
[132:21] ya tenemos
[132:21] 107
[132:22] listo
[132:24] listo
[132:29] vuelvan a mi pantalla
[132:30] fácil
[132:32] o difícil
[132:33] en 15 minutos
[132:34] tenemos más de 200 ideas
[132:36] para
[132:36] a nivel estratégico
[132:38] entender
[132:38] cómo ir desde un usuario
[132:39] a cuáles son los problemas
[132:40] cuáles son las soluciones
[132:41] ojo que
[132:42] no hemos pasado
[132:43] a la parte
[132:43] de construir la solución
[132:44] estamos priorizando
[132:46] qué construir
[132:46] listo
[132:47] si su jefe
[132:49] les dice
[132:49] quiero que me construya
[132:51] una gente
[132:51] ya para la empresa
[132:52] y no les dice nada más
[132:52] espérenme un segundito
[132:54] saco un marco de pensamiento
[132:56] y digo
[132:56] ok
[132:56] para quién estoy construyendo
[132:58] cuáles son los casos de uso
[132:59] espérenme
[133:00] pero hicimos un caso de uso
[133:01] oiga
[133:02] cuáles son mis dolores
[133:02] dentro de ese caso de uso
[133:04] dentro de los dolores que tengo
[133:05] ahora sí
[133:06] cómo lo podría solucionar
[133:08] y dentro de cómo lo podría solucionar
[133:10] ahora sí
[133:10] oiga
[133:11] qué puede hacer
[133:12] un agente
[133:13] por mí
[133:13] listo
[133:15] hasta ahí
[133:16] me siguen
[133:17] o no me siguen
[133:18] listo
[133:21] manden ahí
[133:22] manden ahí
[133:22] por el chat
[133:23] listo
[133:27] sigan por acá
[133:27] los sigo leyendo
[133:28] hay preguntas
[133:29] hay preguntas
[133:30] vamos a hacer una ronda de preguntas ahorita
[133:32] listo
[133:34] los veo
[133:35] los veo
[133:35] voy a ir a la parte de abajo
[133:37] sigan reaccionando
[133:38] que yo estoy viendo
[133:38] quienes están acá
[133:39] conectados con la cámara
[133:40] no se preocupen
[133:42] que
[133:42] en 10 minutos
[133:44] vamos a hacer un break
[133:45] de 10 minutos
[133:45] y entramos a la parte práctica
[133:47] nuevamente
[133:48] listo
[133:48] Sandra
[133:49] pones unos ojitos
[133:50] como
[133:50] no
[133:52] tranquila
[133:53] tranquila
[133:53] todo esto igual
[133:54] les vamos a mandar guías
[133:55] paso a paso
[133:56] no se preocupen
[133:57] listo
[133:58] en whatsapp business
[133:59] hay que tener un número nuevo
[134:01] o uno ya existente
[134:02] un número nuevo
[134:04] Sandra
[134:05] si estás perdida
[134:05] no te preocupes
[134:06] de pronto entraste a la mitad
[134:07] voy a hacer una recapitulación
[134:09] de todo lo que ha pasado
[134:10] hasta el momento
[134:10] arrancamos con una parte
[134:12] 100% teórica
[134:14] les conté que los agentes
[134:15] tienen 5 partes
[134:16] tienen instrucciones
[134:17] tienen habilidades
[134:18] tienen herramientas
[134:20] tienen memoria
[134:20] tienen un modelo de IA
[134:22] les conté también
[134:23] que es como un carro
[134:25] que el motor
[134:26] es el modelo de IA
[134:27] pero el resto del carro
[134:28] es el arnés
[134:29] Houston es ese carro
[134:30] también les conté
[134:33] entramos en detalle
[134:35] cada una
[134:35] cómo crear
[134:36] unas buenas instrucciones
[134:37] cómo crear una buena habilidad
[134:39] los diferentes tipos de memoria
[134:41] las diferentes maneras
[134:42] de conectarse
[134:42] con integraciones
[134:43] yo se las voy a mandar
[134:44] los que entraron tarde
[134:45] no se preocupen
[134:46] los van a ver
[134:47] y luego acabamos de hacer
[134:50] hicimos un demo en vivo
[134:51] quiero que volvamos
[134:52] al demo en vivo
[134:52] todos ustedes comentaron
[134:53] quiero ver qué pasó
[134:54] con mi Houston
[134:55] y luego les enseñé
[134:56] el modelo de pensamiento
[134:57] con el cual llegué
[134:58] a esa solución
[134:59] de Houston
[135:00] específica
[135:01] de cómo prospectar
[135:02] en LinkedIn
[135:03] un lead magnet
[135:04] porque yo tenía el problema
[135:05] también como ustedes
[135:06] bueno y dónde me levanto
[135:07] una lista para prospectar
[135:08] oigan no en LinkedIn
[135:09] ya hay un montón de gente
[135:10] haciendo lead magnets
[135:11] comenta, comenta, comenta
[135:12] pues vamos a ver
[135:13] si se los puede scrapear
[135:14] o yo me puedo hacer uno mismo
[135:15] también para hacer bases de datos
[135:16] ¿listo?
[135:17] y así ocurrió
[135:18] les voy a mostrar rápidamente
[135:21] veamos la recapitulación
[135:23] a ver un segundo
[135:24] sí
[135:25] veamos qué pasó con Houston
[135:27] yo les había pedido
[135:31] a todos ustedes
[135:31] que entraran
[135:32] a una publicación de LinkedIn
[135:33] hagamos una recapitulación
[135:34] ustedes entraron
[135:35] a esta publicación de LinkedIn
[135:36] nos tomamos una foto
[135:37] la mayoría de ustedes
[135:39] comentaron
[135:40] 283 personas comentaron
[135:44] Houston, Houston, Houston, Houston
[135:45] yo agarré
[135:47] le copié
[135:47] le pegué esto
[135:48] y se lo pasé a mi Houston
[135:49] y le dije
[135:50] quiero que utilices
[135:51] la habilidad
[135:52] para prospectar
[135:53] lead magnets
[135:54] en LinkedIn
[135:55] y me lo conviertas
[135:56] en una campaña
[135:57] de outbound
[135:58] esta habilidad
[135:59] lo que hace es
[136:00] utiliza una herramienta
[136:01] que se llama Appify
[136:02] encuentra a todas las personas
[136:03] que comentaron
[136:03] me las pone en un Google Sheets
[136:05] que él mismo crea
[136:06] luego ha utilizado
[136:07] otra herramienta
[136:08] en la que yo ya tengo
[136:08] una cuenta
[136:08] que se llama Apolo
[136:09] y va y me consigue
[136:10] los correos de las personas
[136:11] ¿listo?
[136:12] entonces vamos a ver
[136:14] yo lo había dejado trabajando
[136:15] mientras estábamos
[136:15] haciendo el taller
[136:18] él me dijo
[136:19] mira
[136:19] acá hice la hoja
[136:20] tengo 268 comentarios
[136:22] que recolecté
[136:23] 264 son únicos
[136:24] habían 4 duplicados
[136:26] creé las columnas
[136:28] nombre
[136:28] titular
[136:29] empresa
[136:29] link
[136:29] en comentario
[136:30] renombré la hoja
[136:32] a bootcamp
[136:33] agentes de ya en la TAM
[136:35] y me dice
[136:36] lo que necesita
[136:37] tu atención
[136:37] los emails
[136:38] quedaron incompletos
[136:39] solo desde filas
[136:40] los tienen
[136:41] enriquecimiento
[136:41] si corrió
[136:42] para las 264 personas
[136:43] pero las respuestas
[136:44] llegaron demasiado grandes
[136:45] para procesarlas
[136:46] en esta sesión
[136:47] y no pude recuperar
[136:47] la mayoría
[136:48] se puede volver a correr
[136:49] para llenar la columna
[136:50] correcta
[136:50] lo va a decir
[136:51] vuelve a correrlos
[136:53] y trae
[136:54] los demás
[136:55] pero vamos a ver
[136:57] qué me hizo
[136:58] él comenzó
[137:00] a agarrar
[137:01] la lista que tenía acá
[137:02] seguramente
[137:02] como siguieron personas
[137:03] comentaron en desorden
[137:04] él trabajó
[137:05] y no los encontró
[137:06] en ese momento
[137:06] pero
[137:08] vamos a ver
[137:09] qué hizo
[137:09] él vino acá
[137:12] y utilizó a polo
[137:13] y me encontró
[137:13] algunos correos
[137:14] Alfredo Gómez
[137:16] si estás por acá
[137:17] repórtate en el chat
[137:18] mi Houston te encontró
[137:19] probablemente te va a llegar
[137:20] una secuencia
[137:21] de correos mías
[137:21] Álvaro Bedoya
[137:24] repórtate por el chat
[137:25] mi Houston te encontró
[137:27] álvaro
[137:27] arroa
[137:28] colombia online
[137:29] listo
[137:31] quién más
[137:32] me trajo por acá
[137:33] a ver
[137:35] a ver
[137:35] a ver
[137:36] Angélica Duque
[137:37] mi Houston te encontró
[137:38] me dice que eres
[137:40] la CEO
[137:40] en Kila
[137:41] listo
[137:42] mi Houston te encontró
[137:43] y trajo el correo
[137:44] miremos
[137:46] quién más
[137:47] Johanna Romero
[137:49] si estás por ahí
[137:50] repórtate por el chat
[137:51] Women IT
[137:52] co-founder
[137:53] I was there
[137:54] Johanna.romero
[137:56] te encontró
[137:57] mi Houston
[137:57] listo
[137:58] como Houston
[138:01] tuvo un error
[138:01] y yo no le di feedback
[138:02] para que lo corrigiera
[138:03] pues ahora le dije
[138:04] corrígelo
[138:05] y está volviendo
[138:05] a correrlos todos
[138:06] y va a encontrar
[138:06] todos los correos
[138:07] de los que no encontró
[138:08] pero así es como yo
[138:09] prospecto
[138:10] a partir de
[138:11] una publicación
[138:13] de LinkedIn
[138:13] ojo
[138:14] esta no tiene que ser
[138:15] la publicación
[138:16] de LinkedIn
[138:16] de ustedes
[138:17] esto puede ser
[138:17] la publicación
[138:17] de LinkedIn
[138:18] de alguien más
[138:18] si ustedes no tienen
[138:20] bases de datos
[138:20] y encuentran un líder
[138:21] de su industria
[138:22] que le comentó
[138:23] un montón de gente
[138:23] en algo
[138:24] díganle
[138:24] muchísimas gracias
[138:26] le dan la mano
[138:26] virtual
[138:27] agarran
[138:28] copian y pegan
[138:29] esa publicación
[138:29] y le dicen a Houston
[138:30] créanme una base de datos
[138:31] y a prospectarse
[138:31] dijo
[138:32] listo
[138:33] eso es solo
[138:34] una de las maneras
[138:35] listo
[138:36] listo
[138:38] ahí solo me trajo
[138:38] estos
[138:39] dejé a Houston
[138:39] trabajando nuevamente
[138:40] me está diciendo
[138:40] voy a traerlos
[138:41] por otra vía
[138:42] voy a buscar
[138:43] si con el mismo
[138:44] scraper
[138:44] puedo traerlos
[138:45] y listo
[138:46] ok
[138:47] volvamos acá
[138:49] un buen agente
[138:52] empieza con un dolor
[138:53] no en la tecnología
[138:54] ok
[138:55] un buen dolor
[138:57] como se ve
[138:58] es un dolor
[138:58] que ustedes tienen
[138:59] de manera frecuente
[139:00] es un dolor
[139:00] que ustedes tienen
[139:01] de manera repetitiva
[139:02] es algo
[139:03] que puedan arrancar
[139:04] que sea de bajo riesgo
[139:05] y que ustedes puedan medir
[139:06] por eso les mostré
[139:07] toda la metodología
[139:08] para llegar a un dolor
[139:09] pero si les puedo ayudar
[139:11] a priorizar
[139:12] prioricen los dolores
[139:13] de esta manera
[139:13] listo
[139:14] listo
[139:16] acá
[139:17] tómenle un pantallazo
[139:19] a esto
[139:20] y vamos a
[139:21] la mitad del taller
[139:23] y arrancamos
[139:23] con la segunda parte
[139:24] del taller
[139:24] listo
[139:25] listo
[139:28] hasta ahí como van
[139:29] reaccionen
[139:30] reaccionen
[139:31] reaccionen
[139:31] por ahí
[139:31] los quiero ver
[139:32] hay 543 personas
[139:35] en la llamada
[139:36] te veo
[139:36] jose
[139:37] te veo
[139:37] ana
[139:37] te veo
[139:38] claudia
[139:38] listo
[139:40] reaccionen
[139:40] ahí
[139:41] pongan
[139:41] por el chat
[139:42] están dormidos
[139:43] están vivos
[139:44] listo
[139:46] aplausitos
[139:46] por ahí
[139:47] tomás
[139:48] dice que está
[139:48] ahí
[139:49] henry
[139:49] dice que está
[139:49] ahí
[139:50] listo
[139:52] los demás
[139:52] están en modo
[139:53] podcast
[139:53] o en que
[139:54] están
[139:54] listo
[139:57] listo
[139:59] estamos en este
[140:01] momento
[140:01] en
[140:01] la mitad
[140:03] del taller
[140:03] ya
[140:04] acabamos de terminar
[140:05] toda la parte
[140:06] teórica
[140:07] y vamos a arrancar
[140:08] muy pronto
[140:09] a toda la parte
[140:09] práctica
[140:10] en uno de nuestros
[140:11] acuerdos
[140:12] yo les dije
[140:12] yo les voy a entregar
[140:13] toda mi energía
[140:14] les voy a entregar
[140:15] muchísimo valor
[140:16] y les voy a hablar
[140:17] 10 minutos de Houston
[140:18] de mi empresa
[140:19] este es el acuerdo
[140:20] que yo hice
[140:21] ustedes estaban de acuerdo
[140:22] así que en este momento
[140:23] les voy a hablar
[140:24] 10 minutos de Houston
[140:25] todos los que están acá
[140:27] van a poder seguir
[140:28] usando Houston
[140:29] gratuito
[140:29] no se preocupen
[140:30] pero les quiero contar
[140:31] cómo podemos trabajar
[140:32] Houston
[140:32] y qué es Houston
[140:34] lo primero es que
[140:35] en Houston
[140:36] hacemos dos cosas
[140:37] lo primero es que
[140:38] hacemos implementaciones
[140:39] de IA
[140:40] a la medida
[140:41] entramos a la empresa
[140:42] de cada uno
[140:43] mapeamos los procesos
[140:44] y construimos
[140:45] los agentes
[140:46] que estén
[140:47] operativos
[140:47] en su empresa
[140:48] de verdad
[140:48] con las integraciones
[140:50] con las herramientas
[140:51] con los procesos
[140:52] ok
[140:52] nosotros
[140:53] construimos
[140:54] eso
[140:55] paso por paso
[140:56] con ustedes
[140:56] lo segundo
[140:58] lo segundo
[140:58] que hacemos
[140:59] en Houston
[140:59] es
[140:59] tenemos licencias
[141:01] de Houston
[141:01] empresariales
[141:02] esta es la
[141:03] plataforma
[141:03] donde su equipo
[141:04] puede crear
[141:04] y operar
[141:05] sus propios
[141:05] agentes
[141:06] sin saber
[141:06] programar
[141:07] ok
[141:08] Houston
[141:09] es gratis
[141:10] hasta tres
[141:11] licencias
[141:11] hoy
[141:12] todos los que
[141:13] están acá
[141:13] les vamos a dar
[141:14] acceso gratuito
[141:14] a Houston
[141:15] para que lo puedan
[141:15] utilizar
[141:16] no tienen que
[141:17] haberlo comprado
[141:18] pueden utilizarlo
[141:19] para ustedes mismos
[141:19] si lo quieren utilizar
[141:20] para su empresa
[141:21] lo pueden utilizar
[141:22] hasta tres licencias
[141:23] y si lo quieren utilizar
[141:24] para más de tres licencias
[141:25] Houston es pago
[141:26] nosotros somos una empresa
[141:27] como cualquier otra empresa
[141:28] de las que están acá
[141:29] esto que estamos haciendo
[141:30] les estamos entregando
[141:31] un montón de valor
[141:32] pero pues igual
[141:32] nosotros somos una empresa
[141:34] y también vendemos
[141:34] ok
[141:35] y las dos cosas que vendemos
[141:37] son implementaciones
[141:38] de ya la medida
[141:39] y las licencias de Houston
[141:40] para las versiones
[141:41] empresariales
[141:42] ok
[141:42] ¿cómo podemos trabajar
[141:44] hoy?
[141:46] o que se llevan
[141:46] o antes de eso
[141:47] que es Houston
[141:48] y que se llevan
[141:48] por estar aquí hoy
[141:49] se van a llevar
[141:50] la aplicación de Houston
[141:51] se van a llevar
[141:52] la versión gratuita
[141:53] de Houston
[141:53] para todos los que están acá
[141:54] para que la usen
[141:55] a nivel personal
[141:56] y lo van a usar
[141:57] hasta tres licencias
[141:58] muchas son pymes
[141:59] que son una persona
[142:00] dos personas
[142:01] tres personas
[142:01] pero si ya son
[142:02] más de tres personas
[142:03] Houston es pago
[142:05] para que puedan compartir
[142:06] entre todos
[142:07] y hoy
[142:08] a todos los que están acá
[142:09] los vamos a dar acceso
[142:11] al programa de Houston
[142:12] para pymes
[142:13] que es el programa
[142:14] de Houston para pymes
[142:15] que puedan pagar
[142:16] el equivalente
[142:16] a un número de licencias
[142:18] y puedan tener
[142:18] hasta 20 cupos
[142:19] para que no tengan
[142:20] que estar
[142:20] rotándose cuentas
[142:22] ni nada
[142:22] sino
[142:22] oigan
[142:22] por estar acá
[142:23] por el precio
[142:24] de tres licencias
[142:25] van a tener acceso
[142:26] hasta 20 licencias
[142:27] para todo su equipo
[142:28] ok
[142:29] yo les dije
[142:31] hablemos clarísimo
[142:32] Houston es una empresa
[142:33] durante la presentación
[142:34] vamos a montar
[142:34] les iba a compartir
[142:35] nuestros servicios
[142:36] estos son
[142:37] este es el único bloque
[142:38] comercial que vamos a tener
[142:39] para los que
[142:40] quieran saber más
[142:41] ya les voy a entregar
[142:42] los enlaces
[142:43] en los que pueden saber más
[142:44] y al final
[142:45] también nos vamos a quedar
[142:46] con los que estén
[142:46] interesados
[142:53] hay
[142:54] para los que quieran
[142:55] construir agentes
[142:56] para su operación
[142:57] normalmente
[142:57] como Houston funciona
[142:58] es
[142:59] hacemos implementaciones
[143:00] que cuestan
[143:01] 10 mil dólares
[143:02] y hacemos cuatro agentes
[143:03] cada agente
[143:04] es
[143:05] o sea
[143:05] tenemos cuatro agentes
[143:06] cada uno
[143:07] más o menos
[143:07] vale 2 mil 500 dólares
[143:08] porque cobramos por horas
[143:10] estas son horas
[143:10] de ingenieros
[143:11] que van a su
[143:11] empresa
[143:12] y van con ustedes
[143:13] mapeamos el proceso
[143:14] conectamos todo
[143:15] ayudamos a que
[143:16] las cosas estén corriendo
[143:17] hoy
[143:18] solo por estar acá
[143:19] a todos los que están acá
[143:20] en el programa de Houston
[143:21] para pymes
[143:22] este
[143:23] estar en ese programa
[143:24] les cuesta
[143:25] 2 mil 500 dólares
[143:26] y les dejamos
[143:27] los cuatro agentes
[143:27] que su empresa
[143:28] necesite
[143:29] solo lo podemos hacer
[143:31] para 10 empresas
[143:31] hay 500 empresas
[143:32] acá
[143:33] la razón por la cual
[143:34] solo lo podemos hacer
[143:35] de manera directa
[143:36] para 10 empresas
[143:37] es porque
[143:37] estamos priorizando
[143:38] las empresas grandes
[143:39] en este momento
[143:39] estamos trabajando
[143:40] con un par de empresas
[143:41] de mil empleados
[143:42] para arriba
[143:42] pero pues queremos
[143:43] ayudar a las pymes
[143:44] también
[143:45] así que
[143:46] si están interesados
[143:47] escaneen este formulario
[143:48] y inscribanse ahí
[143:50] no tienen que pagar
[143:52] nada todavía
[143:52] en ese formulario
[143:53] si lo quieren reservar
[143:55] van a tener que reservarlo
[143:56] con 500 dólares
[143:57] pero esto es un
[143:58] esto es un formulario
[143:59] para que se puedan
[143:59] inscribir ahí
[144:00] y mi equipo
[144:01] se va a poner en contacto
[144:02] con ustedes
[144:03] les va a resolver
[144:03] todas las preguntas
[144:04] qué incluye
[144:05] qué no incluye
[144:06] cuánto tiempo dura
[144:06] cuáles son los temas
[144:08] de seguridad
[144:08] cuáles son los contratos
[144:10] todo
[144:11] listo
[144:11] y por el otro lado
[144:13] están las licencias
[144:14] de Houston
[144:15] ustedes también pueden utilizar
[144:16] Houston por su cuenta
[144:17] si son unos duros
[144:18] en automatizaciones
[144:19] o lo quieren hacer
[144:19] por su cuenta
[144:20] no tienen que comprarnos
[144:21] una
[144:21] una implementación
[144:23] de guía
[144:24] ustedes lo pueden hacer
[144:25] una licencia
[144:27] de Houston
[144:27] más o menos
[144:28] está entre 15
[144:28] y 25 dólares
[144:29] hoy
[144:29] si ustedes
[144:31] hoy
[144:31] se meten a Houston
[144:33] les va a costar
[144:34] 299 dólares
[144:35] para 20
[144:36] hasta 20 personas
[144:37] de su equipo
[144:37] es el rango
[144:38] de 10 a 20 personas
[144:39] normalmente
[144:40] comprar Houston
[144:41] anual para empresas
[144:42] vale
[144:42] el precio mínimo
[144:44] el plan mínimo
[144:44] es de 2.500 dólares
[144:46] estamos literalmente
[144:47] hoy
[144:48] lanzando el programa
[144:49] para pymes
[144:49] y la única razón
[144:50] es porque
[144:51] queremos que más gente
[144:52] pueda tener acceso
[144:53] a esto
[144:53] si ustedes solo son
[144:54] una persona
[144:55] dos o tres
[144:56] lo van a poder utilizar
[144:56] gratis
[144:57] no se preocupen
[144:58] pero si tienen
[144:58] tres o más
[144:59] el programa
[145:00] de Houston
[145:01] para pymes
[145:02] es de
[145:02] 299 dólares
[145:04] al año
[145:04] lo vamos a tener
[145:06] abierto
[145:06] por 48 horas
[145:07] así que
[145:08] escaneen esto acá
[145:09] igual se los podemos
[145:10] mandar por
[145:11] un grupo de whatsapp
[145:13] o hagamos un grupo
[145:13] de whatsapp al final
[145:14] todas las personas
[145:16] que escaneen este código
[145:17] y se inscriban
[145:18] al Houston
[145:18] para pymes
[145:19] hoy
[145:20] o a la versión
[145:21] de licencias
[145:21] también
[145:22] les vamos a respetar
[145:23] por un año
[145:23] para todo su equipo
[145:25] y les vamos a dar
[145:25] hasta 20 licencias
[145:26] ok
[145:26] les viene la plataforma
[145:28] completa
[145:28] les viene 20 licencias
[145:29] y vienen las mil
[145:31] herramientas
[145:31] preconectadas
[145:32] y les viene
[145:32] soporte
[145:32] de nuestro equipo
[145:33] van a tenerlos
[145:34] en un whatsapp
[145:35] en un slack
[145:35] o en un teams
[145:36] si ustedes utilizan
[145:37] teams
[145:37] y les vamos a poder
[145:38] ayudar con lo que
[145:39] ustedes necesiten
[145:39] listo
[145:40] listo
[145:43] los que estén
[145:43] interesados
[145:43] como empresa
[145:44] escaneen acá
[145:45] y nosotros
[145:45] los llamamos
[145:47] listo
[145:49] manden su
[145:51] una manito
[145:53] si están acá
[145:53] todavía
[145:54] listo
[146:00] los veo
[146:00] los veo
[146:03] listo
[146:03] vamos a pasar
[146:03] a la parte práctica
[146:04] 100%
[146:05] en exactamente
[146:06] 10 minutos
[146:08] listo
[146:08] barles
[146:09] hagamos un par de preguntas
[146:10] tomémonos
[146:11] un par de minutos
[146:12] para preguntas
[146:13] Miguel Zamaca
[146:15] te abro tu micrófono
[146:16] y pregunta
[146:17] hola
[146:22] gracias por toda
[146:23] la información
[146:23] quería consultar
[146:25] un poco
[146:25] cuando yo tengo
[146:26] por ejemplo
[146:27] un flujo
[146:28] donde
[146:28] mi agente
[146:29] lee lo que es
[146:31] la información
[146:31] de contexto
[146:32] que tengo almacenada
[146:33] en mi
[146:33] OneDrive
[146:34] y sobre ese contexto
[146:36] me crea
[146:37] presentaciones
[146:38] me crea
[146:38] directamente
[146:39] imágenes
[146:39] o me crea
[146:40] algún tipo
[146:41] archivo
[146:41] él mismo
[146:42] lo puede guardar
[146:43] directamente
[146:43] dentro
[146:44] de la gente
[146:45] de Houston
[146:45] o me lo guarda
[146:46] en las carpetas
[146:47] y si yo tengo
[146:48] guardado
[146:50] algún archivo
[146:50] por ejemplo
[146:51] un Excel
[146:51] y lo quiero
[146:52] modificar
[146:52] Houston
[146:53] puede entrar
[146:54] a modificar
[146:54] archivos
[146:55] dentro de mis
[146:55] carpetas
[146:56] locales
[146:56] esas
[146:58] te las voy a responder
[146:59] de dos maneras
[146:59] la primera
[147:00] es si tienes
[147:00] todo tu contexto
[147:01] en el OneDrive
[147:02] y quieres que Houston
[147:03] lo beba de ahí
[147:03] si lo puedes conectar
[147:05] conectas tu OneDrive
[147:05] y le dices
[147:06] quiero que vayas
[147:06] y tomes
[147:07] todo el contexto
[147:07] que tengo
[147:08] en el OneDrive
[147:08] y inscríbete
[147:09] tus instrucciones
[147:10] inscríbete
[147:10] ayúdame a escribir
[147:11] habilidades
[147:12] le tienes que conectar
[147:13] el OneDrive
[147:14] primero
[147:14] lo segundo
[147:16] tú que me preguntaste
[147:17] puede
[147:17] puede trabajar
[147:19] en archivos locales
[147:20] de Excel
[147:20] que esté viviendo
[147:21] en tu computador
[147:22] en este momento
[147:23] tenemos deshabilitada
[147:24] la versión local
[147:25] Houston era local
[147:26] principalmente
[147:27] ahora lo llevamos
[147:28] a Cloud
[147:28] puede entrar a Excel
[147:30] lo puedes conectar
[147:31] Excel también
[147:31] en una versión online
[147:32] lo que podrías hacer
[147:33] es subir el Excel
[147:34] trabajar
[147:35] él lo trabaja ahí
[147:36] y vuelves
[147:37] y lo descargas
[147:37] por ahora
[147:38] en el mediano plazo
[147:39] vamos a tener nuevamente
[147:40] que trabaje en local
[147:41] y trabaje en la nube
[147:42] la razón por la cual
[147:43] lo migramos a la nube
[147:44] es porque a muchas personas
[147:45] no les estaba funcionando
[147:46] ni el local
[147:46] por sus computadores
[147:47] y les queremos
[147:48] dar la oportunidad
[147:49] de que les funcione
[147:50] ¿listo?
[147:53] listo
[147:53] pueden ir mandando
[147:54] sus preguntas
[147:55] ahí por el chat
[147:56] y los vamos leyendo
[147:57] a todos también
[147:58] antes de arrancar
[147:59] con la parte práctica
[148:00] listo
[148:04] vayan mandando acá
[148:05] vamos a tomarnos
[148:05] 10 minutos
[148:06] para hacer preguntas
[148:07] hacemos una pausa
[148:08] de unos 5 minutos
[148:09] y arrancamos
[148:10] con la parte
[148:10] 100% práctica
[148:12] dice Vicky
[148:15] ¿se puede hacer
[148:17] lead magnet
[148:18] en LinkedIn
[148:18] con los que reaccionaron
[148:19] sin comentario?
[148:20] ¿se puede con los que reaccionaron?
[148:22] sí
[148:22] tú le dices a la gente
[148:24] que sea con los que reaccionaron
[148:25] listo
[148:26] Andrés Moncada
[148:28] si quieres
[148:28] te abro para que abras
[148:29] tu micrófono
[148:30] y quedémonos acá
[148:31] 5 minutos
[148:32] y seguimos
[148:33] Andrés Moncada
[148:35] te di la posibilidad
[148:37] de que te conectes
[148:37] ahí hola
[148:39] ¿qué tal?
[148:41] bueno
[148:42] no pues
[148:42] muy interesante
[148:43] Houston
[148:44] quería preguntar
[148:45] era
[148:45] si yo tengo los proyectos
[148:47] yo he venido cargando
[148:47] en Cloud
[148:48] cada proyecto
[148:50] que voy armando
[148:50] como de unos pisos
[148:51] inmobiliarios
[148:52] ¿puedo conectar
[148:54] también Houston
[148:55] para que el contexto
[148:57] o la memoria
[148:57] sea todo lo que he cargado
[148:59] en cada uno
[148:59] de estos proyectos?
[149:01] mira
[149:02] te lo voy a responder
[149:02] de dos maneras
[149:03] si tú estás utilizando
[149:05] la aplicación de Cloud
[149:06] eso se está guardando
[149:07] todo en tu computadora
[149:08] aunque no lo sepas
[149:08] son carpetas
[149:09] que se están guardando
[149:10] ahí dentro
[149:11] lo que puedes hacer
[149:12] es buscar esas carpetas
[149:13] o decirle a Cloud
[149:14] que te las ayude a descargar
[149:15] y se las pasas a Houston
[149:16] antes
[149:18] en el Houston
[149:18] que teníamos habilitado
[149:19] en el local
[149:20] simplemente era decirle
[149:20] búscala en mi computador
[149:22] ahora como Houston
[149:23] está en la nube
[149:23] está en un computador
[149:24] que no tiene acceso
[149:25] a tus archivos locales
[149:26] lo que tienes que hacer
[149:27] es decirle a Cloud
[149:28] Cowork
[149:28] oye
[149:29] ayúdame a descargar
[149:30] los archivos de mi proyecto
[149:31] para que lo pueda conectar
[149:33] con Houston
[149:33] para poderse los pasar a Houston
[149:35] y se los pasas a Houston
[149:36] y se aprende todo tú
[149:37] se aprende todo tú
[149:38] lo que tengas ahí
[149:39] o si los tienes en una nube
[149:40] súbelos a un
[149:41] un Google Drive
[149:42] o a un OneDrive
[149:43] y le conectas a Houston
[149:44] ¿listo?
[149:46] y desde
[149:48] y para
[149:49] si los quiero utilizar
[149:50] a través de una VPS
[149:51] es lo mismo
[149:52] o sea
[149:52] solamente hago como
[149:53] la conexión
[149:55] sí
[149:56] en este caso
[149:57] es que Houston
[149:58] ya no es local
[149:59] antes tú le podías conectar
[150:00] una VPS a Houston
[150:01] pero si la vas a conectar
[150:02] no sé
[150:03] la VPS se la vas a conectar
[150:04] a Cloud
[150:04] o se la quieres conectar
[150:05] a Houston
[150:06] pues yo actualmente
[150:09] uso de Cermes
[150:10] pero pues
[150:10] si quisiera
[150:11] pues de pronto
[150:12] ver
[150:12] más bien la opción
[150:13] de comenzar a probar
[150:14] con Houston
[150:14] Houston ya no necesitas
[150:16] una VPS
[150:17] que es una
[150:18] es básicamente
[150:19] un computador en la nube
[150:20] porque Houston
[150:20] ya lo trae integrado
[150:21] o sea
[150:22] Houston ya trae
[150:23] cada gente
[150:24] está en una VPS
[150:25] por llamarlo así
[150:25] en este momento
[150:26] y nosotros
[150:29] y el espacio
[150:29] del almacenamiento
[150:30] en donde
[150:30] también dentro de Houston
[150:32] dentro de Houston
[150:33] y está en Google Cloud
[150:34] y cada persona
[150:34] tiene su propia instancia
[150:36] y está completamente
[150:37] isolado
[150:38] de todos los demás
[150:39] y listo
[150:42] gracias
[150:42] y pero de todas maneras
[150:43] y Juli
[150:44] si estás por acá
[150:45] ayúdame
[150:46] ahorita más tarde
[150:47] a contestar esa
[150:48] porque también
[150:48] lo podemos conectar
[150:49] a tu
[150:50] o sea
[150:51] a tus servidores
[150:52] o a tu tema
[150:54] de almacenamiento
[150:54] también
[150:55] super bien
[150:56] listo
[150:57] vayan por favor
[150:58] mandando las preguntas
[150:59] por acá
[150:59] por el chat
[151:00] les propongo
[151:01] que hagamos
[151:02] algo
[151:02] les propongo
[151:05] que nos tomemos
[151:05] cinco minutos
[151:07] voy a poner acá
[151:08] un
[151:08] voy a poner acá
[151:10] un timer
[151:11] y les propongo
[151:12] que nos tomemos
[151:12] cinco minutos
[151:14] y arrancamos
[151:14] con la parte
[151:15] 100% práctica
[151:16] ¿les parece?
[151:18] listo
[151:19] voy a poner acá
[151:19] en mi
[151:20] voy a poner acá
[151:21] una aplicación
[151:21] con un
[151:22] hermoso
[151:23] reloj
[151:24] a ver
[151:26] a ver
[151:26] a ver
[151:26] acá
[151:27] un segundo
[151:30] voy a poner acá
[151:31] un reloj
[151:34] listo
[151:35] son las y 33
[151:36] les propongo
[151:37] tomen unos siete minutos
[151:38] a las y 40
[151:39] arrancamos
[151:40] y yo voy poniendo acá
[151:41] un timer
[151:42] voy a poner acá
[151:43] que sean siete minutos
[151:44] por favor
[151:45] lleguen puntuales
[151:46] vayan al baño
[151:47] tomen agua
[151:47] saluden a la familia
[151:49] díganles que van a estar
[151:51] aprendiendo y ejecutando
[151:52] durante los próximos
[151:52] siete minutos
[151:53] listo
[151:55] ahí deberían ver
[151:56] mi pantalla
[151:57] listo
[151:57] sigo contestando
[151:58] preguntas
[151:59] mientras tanto
[151:59] si quieres
[152:00] Ana Rodríguez
[152:01] te cedo el micrófono
[152:03] por favor
[152:04] cuéntame tu pregunta
[152:05] hola
[152:09] ¿me escuchas?
[152:10] sí
[152:10] fuerte y claro
[152:11] que más Felipe
[152:12] ve ayer
[152:13] tienes más de mil
[152:14] herramientas
[152:15] ¿cierto?
[152:16] en la biblioteca
[152:17] de Houston
[152:18] uno
[152:18] elige la herramienta
[152:20] es decir
[152:20] hay una biblioteca
[152:21] o alguna consulta
[152:22] en que uno
[152:22] le pide a Houston
[152:23] búscame una herramienta
[152:26] que
[152:26] o mi agente
[152:27] definió
[152:28] que necesito
[152:29] esta herramienta
[152:30] ¿podrías ir a la biblioteca
[152:31] y decirme
[152:31] qué herramienta
[152:32] es la más apropiada?
[152:33] esa es una buena manera
[152:34] de hacerlo
[152:35] o sea yo te diría
[152:36] que
[152:36] la primera heurística
[152:37] de pensamiento
[152:38] es conéctale
[152:39] con las que tú ya
[152:39] trabajas en la vida real
[152:40] ¿ok?
[152:41] o sea no intentes
[152:42] como
[152:42] volverte
[152:43] súper loca
[152:44] conectando todo
[152:45] de una
[152:45] sino
[152:45] conéctate
[152:47] las personas
[152:47] con las que tú
[152:47] trabajas en tu día a día
[152:48] y luego
[152:49] dile
[152:50] agárrate a Houston
[152:51] y le pones una misión
[152:52] y le dices mira
[152:53] estoy intentando
[152:54] hacer esto
[152:55] quiero
[152:56] quiero poderme
[152:57] traer bases de datos
[152:58] de Instagram
[152:59] pero no tengo ni idea
[152:59] cómo
[153:00] ayúdame a encontrar
[153:01] una herramienta
[153:02] que pueda utilizar
[153:03] y que pueda conectarla
[153:04] a Houston
[153:04] que tenga un MSP
[153:05] o tenga una API
[153:06] y ahí arranca
[153:07] todo un tema
[153:08] de investigación
[153:08] donde el propio agente
[153:09] te puede proponer cosas
[153:10] nosotros todo el tiempo
[153:12] estamos descubriendo
[153:12] cosas así
[153:13] y se las conectamos
[153:14] a Houston
[153:14] pero todo arranca
[153:17] desde cuál es el objetivo
[153:18] que tú quieres cumplir
[153:19] porque si no
[153:21] uno se vuelve loco
[153:22] intentando saber
[153:23] bueno y cuáles son
[153:23] todas las herramientas
[153:24] que existen allá afuera
[153:25] o sea si yo soy comercial
[153:26] me sé las cinco comerciales
[153:27] pero no sé operaciones
[153:28] no sé
[153:29] o sea un montón de cosas más
[153:30] perfecto
[153:32] listo Felipe
[153:33] gracias
[153:33] dale
[153:34] yo sigo acá
[153:35] si quieres te doy
[153:36] la palabra
[153:36] Camila
[153:38] te doy acá
[153:39] la palabra
[153:40] para que te desmutes
[153:41] tienes la manito levantada
[153:44] no Camila
[153:53] te vemos
[153:53] ahí te estoy mandando
[153:57] una solicitud
[153:57] para que
[153:58] y ahí Mauricio
[153:59] te veo también
[153:59] sí Camila
[154:02] te escucho
[154:02] dale
[154:03] cuál es tu pregunta
[154:03] entonces
[154:04] yo estoy
[154:05] pues yo manejo
[154:06] marketing
[154:07] y básicamente
[154:08] redes sociales
[154:09] entonces
[154:10] a mí me interesa
[154:10] a mí me interesa
[154:13] más principalmente
[154:14] que me ayuda
[154:16] a generar contenido
[154:17] pero no sé muy bien
[154:18] cómo hacerlo
[154:20] ¿cómo lo haces hoy en día?
[154:23] ¿cómo lo hago hoy en día?
[154:25] no
[154:25] pues yo hago
[154:26] individualmente
[154:26] y lo subo
[154:28] no tiene mucha ciencia
[154:29] entonces no sé muy bien
[154:31] cómo automatizar eso
[154:32] si tú partes el paso a paso
[154:34] seguramente tienes un proceso
[154:35] que tú ya sigues
[154:36] ejemplo
[154:36] todas las mañanas
[154:38] me hago una pequeña investigación
[154:40] de qué está pasando allá afuera
[154:41] tengo referentes de Pinterest
[154:43] tengo referentes de Instagram
[154:45] tengo referentes de XYZ
[154:47] ¿no?
[154:48] ese es el primer paso
[154:49] el segundo paso es
[154:50] me organizo todo mi contenido
[154:52] en un board
[154:53] lo tengo en Miro
[154:54] lo tengo en Sheets
[154:55] lo tengo en no sé qué
[154:56] o lo tengo en Figma
[154:57] ¿no?
[154:59] tercero
[154:59] y sigues como un proceso creativo
[155:00] que tiene un paso a paso
[155:01] entonces mapeate
[155:03] cuál es ese paso a paso
[155:04] y comienza a trabajarlo con Houston
[155:05] si yo fuera a crear contenido
[155:07] lo que haría es
[155:07] te voy a contar un caso de uso
[155:09] que yo hago
[155:09] yo estoy creando contenido
[155:10] a todos los que
[155:12] me quieren seguir
[155:13] les voy a pasar
[155:14] mi Instagram
[155:15] para que me sigan
[155:16] es en inglés
[155:17] pero
[155:18] se los recomiendo
[155:20] se los paso acá por el chat
[155:21] síganme por acá
[155:23] yo cuando arranqué
[155:25] a crear contenido
[155:26] por ejemplo Camila
[155:27] no tenía ni idea
[155:27] de cómo crear contenido
[155:28] entonces cogí a Houston
[155:29] y le dije
[155:29] lo conecté a Apify
[155:31] y le dije
[155:32] quiero entender
[155:32] cuáles son los creadores
[155:33] de contenido
[155:34] que hay en mi nicho
[155:34] primero
[155:35] eso es lo primero
[155:36] pum
[155:36] me hice una base de datos
[155:37] de 100 creadores de contenido
[155:38] luego le dije
[155:39] quiero que te analices
[155:41] todos los videos de ellos
[155:42] y me digas
[155:43] cuáles son los que más comentarios
[155:44] tienen
[155:44] cuáles son los que más reacciones
[155:45] tienen
[155:45] y cuáles son los que se han vuelto
[155:47] más virales
[155:47] en términos de compartidos
[155:48] tráeme los 5 más virales
[155:50] me traje mil videos
[155:53] luego un tercer paso
[155:54] le dije
[155:55] quiero que te saques
[155:56] el transcript del video
[155:58] y me traigas todo el
[156:00] me traigas todo el
[156:02] como el guión del video
[156:05] luego
[156:05] en otro paso
[156:07] quiero que me lo analices
[156:08] a la luz
[156:08] de cómo escribir
[156:09] un buen hook
[156:09] de Alex Ormosi
[156:11] y lo fui guiando
[156:12] paso por paso
[156:13] y luego me creé
[156:14] puras skills de Genesis
[156:15] pues un skill
[156:16] que se llama
[156:17] crear guiones de video
[156:18] entonces va
[156:19] se busca todo lo que está pasando
[156:20] en mi nicho
[156:21] paso por paso
[156:22] y me deja un guión
[156:23] para que yo me graba
[156:23] a mí mismo
[156:24] si tú vas a crear
[156:27] contenido gráfico
[156:28] pásale por ejemplo
[156:28] ejemplos de tu brand book
[156:30] pásale
[156:30] conectalo a Figma
[156:32] o sea
[156:32] hazlo paso por paso
[156:34] e intenta
[156:35] suplir el proceso
[156:36] que tú haces
[156:37] con IA
[156:37] hay modelos buenísimos
[156:39] hay modelos como
[156:40] sit dance
[156:40] para creación de videos
[156:42] o sea
[156:42] hay un montón de cosas
[156:43] que solo sigue el paso a paso
[156:45] con curiosidad
[156:46] o pregúntale a Houston
[156:47] como
[156:47] oye no tengo ni idea
[156:48] de cómo crear contenido
[156:49] ¿me enseñas?
[156:50] ayúdame
[156:50] cómo lo puedo hacer
[156:51] cómo lo están haciendo
[156:52] allá afuera
[156:52] ok
[156:53] listo
[156:54] gracias
[156:54] dale
[156:55] listo
[156:57] queda un minuto
[156:58] voy a darle la palabra
[157:01] por aquí
[157:02] a Mauricio Álvarez
[157:03] que habías hecho así
[157:04] y los demás
[157:04] que tienen la manito levantada
[157:05] pueden ir mandando
[157:06] su pregunta
[157:07] por el chat
[157:09] por favor
[157:09] y las vamos respondiendo
[157:10] ya te doy la palabra
[157:14] Mauricio
[157:15] un segundo
[157:15] ya
[157:16] te debería dejar
[157:16] desmontear
[157:17] hola Felipe
[157:20] muchas gracias
[157:21] por toda la información
[157:22] que nos estás compartiendo
[157:23] una pregunta
[157:24] es que
[157:24] yo tengo conectado
[157:26] mi cloud code
[157:27] o mi cloud
[157:29] lo tengo conectado
[157:30] con un ERP
[157:31] que se llama
[157:31] Odu
[157:32] y ha sido
[157:34] la locura
[157:35] para mí
[157:36] porque yo
[157:37] por ejemplo
[157:37] en este momento
[157:38] estoy arreglando
[157:39] toda la parte contable
[157:40] y me pertenece
[157:41] incluso hasta auditorías
[157:43] entonces la pregunta
[157:44] pero eso
[157:44] lo tengo solamente
[157:45] yo en mi equipo
[157:47] pero me gustaría
[157:48] que mi equipo
[157:48] de contabilidad
[157:49] pues pudiera
[157:51] para arreglar
[157:52] de pronto
[157:52] escuadres
[157:53] y todo esto
[157:53] consultándole la IA
[157:56] con una conexión
[157:58] pues va
[157:58] se conecta
[158:00] pues a ERP
[158:00] ve las entrañas
[158:01] del ERP
[158:02] y ya nos ayuda
[158:03] a nosotros
[158:03] a resolver
[158:04] muchas cosas
[158:04] y hemos ahorrado
[158:06] una cantidad
[158:06] de tiempo
[158:07] con eso
[158:07] la pregunta
[158:08] que tengo
[158:08] es
[158:09] que tan seguro
[158:09] es si yo
[158:10] conecto
[158:11] a Houston
[158:12] a mi ERP
[158:13] para que me haga
[158:15] eso
[158:15] y darle
[158:16] como esas habilidades
[158:17] pero yo tengo
[158:17] una habilidad
[158:18] que se llama
[158:18] Odoo Helper
[158:19] que sabe
[158:21] a qué campo
[158:21] y qué tiene que hacer
[158:23] pues en Odoo
[158:24] para la respuesta
[158:26] y todas las inquietudes
[158:27] que tengamos
[158:28] pero la preocupación
[158:29] que tengo
[158:29] es más de seguridad
[158:30] claro
[158:31] específicamente
[158:32] cuál es tu preocupación
[158:33] de seguridad
[158:33] tipo manejo
[158:34] de la data
[158:35] y me puedan sacar
[158:37] la llave
[158:38] porque yo le tengo
[158:39] aplicada una llave
[158:40] tengo una llave
[158:41] de solo lectura
[158:42] no de escritura
[158:43] para que haga consulta
[158:44] básicamente
[158:44] sí
[158:45] entonces mira
[158:46] te la respondo
[158:47] de las dos maneras
[158:48] lo primero
[158:48] es que
[158:48] todas nuestras
[158:49] integraciones
[158:50] la manera
[158:50] en que manejamos
[158:51] nuestras integraciones
[158:51] que ya están
[158:52] preconectadas
[158:53] da un segundo
[158:56] que paro esto
[158:57] que si no
[158:58] el tiempo
[158:58] sigue corriendo
[158:59] todas las integraciones
[159:01] tienen manejos
[159:02] de seguridad
[159:03] de la data
[159:03] con SOC 2
[159:04] y ISO 27001
[159:06] si son las que ya
[159:07] vienen preconectadas
[159:08] eso quiere decir
[159:09] que en Estados Unidos
[159:09] específicamente
[159:10] por ejemplo
[159:10] para temas
[159:11] de contables
[159:12] y todos los temas
[159:13] de compliance
[159:14] cumple con eso
[159:15] toda la parte
[159:16] de manejo
[159:16] de credenciales
[159:17] de aplicaciones
[159:19] que no estén ahí
[159:20] también las almacenamos
[159:21] de manera segura
[159:22] todas
[159:23] o sea
[159:23] nosotros
[159:23] tenemos una política
[159:24] de cero retención
[159:25] de data
[159:26] nosotros no vemos
[159:26] nada de tu data
[159:27] y todos tus llaves
[159:29] y esto lo estamos
[159:29] guardando de manera segura
[159:31] el agente
[159:32] solo va a tener acceso
[159:33] a lo que tú le des acceso
[159:34] vía esa API
[159:34] igualito que Cloud Code
[159:35] acuérdate que
[159:36] el motor
[159:37] de que trabaja en Houston
[159:38] sigue siendo
[159:40] ok
[159:42] y para esto que tú
[159:44] hablas de con tu equipo
[159:45] Houston es multijugador
[159:47] ya les voy a mostrar
[159:47] pero lo chévere de Houston
[159:49] es que tú puedes invitar
[159:51] la gente
[159:51] a las personas
[159:52] de tu equipo
[159:52] prendas nuestro rápido
[159:53] acá antes de arrancar
[159:54] la parte
[159:54] el taller
[159:57] cuando tú estás
[159:58] en Houston
[159:59] tú tienes un agente
[160:01] que tú creas
[160:02] por ejemplo
[160:02] este se puede llamar
[160:03] el asistente contable
[160:04] que tú tienes
[160:05] y le compartes
[160:07] a tu equipo
[160:07] acá los invitas
[160:08] dices invitar compañeros
[160:09] cuando los invitas
[160:11] los estás invitando
[160:12] o los puedes invitar
[160:13] al espacio de trabajo
[160:14] o los puedes invitar
[160:16] a ese agente
[160:16] para que solo puedan ver
[160:18] las cosas contables
[160:19] y las integraciones
[160:19] de ese agente
[160:20] de pronto hay personas
[160:21] que tú sí quieres
[160:22] entrando al ERP
[160:23] y hay personas
[160:23] que no quieres
[160:23] entrando al ERP
[160:24] entonces dentro de Houston
[160:25] tú le das acceso
[160:26] a solo ese agente
[160:27] a estas personas
[160:27] y todos van a ver
[160:29] este tablero
[160:30] cada uno puede tener
[160:30] una tarea diferente
[160:31] o inclusive
[160:32] una persona puede arrancar
[160:33] una tarea
[160:34] y la otra puede seguir
[160:35] la misma tarea
[160:35] ¿listo?
[160:37] Houston está diseñado
[160:38] para colaborar
[160:39] multijugador
[160:39] desde el momento cero
[160:40] esa es otra gran diferencia
[160:42] de algunos que están
[160:43] por ahí
[160:43] por ejemplo
[160:44] Cowork
[160:45] que es buenísimo
[160:45] pero está diseñado
[160:47] para trabajar localmente
[160:48] eso es como
[160:48] la diferencia
[160:49] entre trabajar local
[160:50] y en la nube
[160:50] es como el que trabaja
[160:51] en Excel
[160:52] en su computador
[160:52] y el que trabaja
[160:53] en Google Sheets
[160:54] colaborativamente
[160:55] el que trabaja
[160:55] en Word
[160:56] y el que trabaja
[160:56] en Google Doc
[160:57] ¿listo?
[160:59] ok
[160:59] listo
[161:01] demos de 3 minutos más
[161:03] a las personas
[161:03] que se siguen uniendo
[161:04] voy a poner el micrófono
[161:06] el timer acá
[161:07] y por favor
[161:08] quiero que
[161:09] si necesitan ir al baño
[161:11] tomar agua
[161:12] lo que sea
[161:12] por favor
[161:13] es momento de que vayan ya
[161:14] yo voy a ir por agua
[161:16] y
[161:16] seguimos
[161:17] ¿les parece?
[161:19] listo
[161:19] acá los dejo
[161:20] 3 minutos
[161:22] puse acá
[161:22] nos vemos en 3 minutos
[161:27] listo
[164:49] vamos volviendo por acá
[164:50] bueno
[164:54] ok
[164:54] hay personas que tienen
[164:55] todavía la manito levantada
[164:56] si quieren por favor
[164:58] vayan poniéndola
[164:59] vayan poniendo sus preguntas
[165:01] por el chat
[165:01] vamos a responder
[165:02] todas las preguntas
[165:03] y al final
[165:05] igual nos vamos a quedar
[165:06] nos vamos a quedar
[165:07] por acá
[165:07] Julián
[165:09] que es el CTO
[165:10] y cofundador de Houston
[165:11] está acá respondiendo
[165:12] Daniel
[165:12] que es ingeniero
[165:13] del equipo también
[165:14] listo
[165:17] un segundo
[165:20] ya les comparto mi pantalla
[165:21] y vamos a seguir de nuevo
[165:22] listo
[165:29] esta parte
[165:30] que viene del taller
[165:31] requiere muchísima concentración
[165:33] para que ustedes
[165:34] no se vayan a perder
[165:35] de todas maneras
[165:36] voy a intentar
[165:37] enviarles una guía
[165:38] que puedan tener
[165:38] al tiempo
[165:39] de las herramientas
[165:40] un segundo
[165:42] la voz que se las mando
[165:44] un segundo
[165:47] segundo
[165:48] listo
[165:53] acá en español
[165:53] listo
[165:54] listo
[165:57] concentración absoluta
[165:58] si se pierden
[165:59] no se preocupen
[166:00] esta parte
[166:01] cuando somos tantos
[166:02] se siente un poco caótica
[166:04] a veces
[166:04] así que
[166:05] es normal
[166:06] porque vamos a entrar
[166:06] a la parte
[166:07] 100% práctica
[166:08] listo
[166:09] listo
[166:12] antes de arrancar
[166:13] quiero que todos
[166:14] se paren otra vez
[166:15] y vamos a
[166:17] a mover la energía
[166:18] del cuerpo
[166:19] todos arriba
[166:20] no se preocupen
[166:21] Germán
[166:22] te veo en mi pantalla
[166:23] Pablo
[166:24] Alberto Bedoya
[166:26] Camilo Ríos
[166:26] para arriba
[166:27] todo el mundo
[166:28] estírense
[166:30] de lado a lado
[166:31] vamos a
[166:32] hacer que fluya
[166:34] la energía
[166:34] y el cuerpo
[166:34] porque van a estar
[166:35] sentados
[166:36] otra hora y media
[166:36] listo
[166:40] todo el mundo
[166:40] para arriba
[166:41] todo el mundo
[166:41] para arriba
[166:42] y voy a resetear
[166:45] acá el timer
[166:46] listo
[166:47] listo
[166:50] genial
[166:51] genial
[166:51] los veo
[166:52] muchas gracias
[166:53] listo
[166:55] los veo
[166:56] los veo
[166:57] listo
[166:59] a los que tienen
[167:00] la mano levantada
[167:01] la mano virtual
[167:01] levantada
[167:02] por favor
[167:02] manden de una vez
[167:03] su pregunta
[167:03] por el chat
[167:04] y todo mi equipo
[167:05] lo está respondiendo
[167:06] está Daniel
[167:07] está Juan
[167:08] está Julián
[167:09] listo
[167:10] pueden tener
[167:11] preguntas
[167:12] de lo que sea
[167:12] y ahorita
[167:13] van a salir
[167:14] muchas preguntas
[167:14] técnicas
[167:15] cosas quizás
[167:16] se van a romper
[167:16] cosas no van a funcionar
[167:18] no importa
[167:18] las solucionamos en vivo
[167:19] listo
[167:20] listo
[167:22] aquí voy
[167:23] lo primero que vamos a hacer
[167:28] es
[167:28] asegúrense que ustedes
[167:31] ya tengan una cuenta
[167:32] de chat
[167:32] GPT o Cloud a la mano
[167:33] de que tengan
[167:34] un computador cargado
[167:35] y que tengan
[167:36] al menos
[167:36] un Google Chrome
[167:37] listo
[167:38] vamos a arrancar
[167:40] a instalar
[167:40] las herramientas
[167:41] del taller
[167:41] mi objetivo
[167:42] es que todos
[167:43] ustedes que están acá
[167:44] hasta que nos dé
[167:45] la hora que nos dé
[167:46] salgan con una gente
[167:47] funcionando
[167:48] y yo compartirles
[167:49] todos mis skills
[167:49] para que ustedes
[167:50] salgan también
[167:50] con una metodología
[167:51] de pensamiento
[167:52] y una gente
[167:52] funcionando
[167:53] para que ustedes
[167:53] se vayan
[167:53] y experimenten
[167:54] lo primero
[167:56] que vamos a hacer
[167:56] vamos a entrar
[167:57] a esta página
[167:58] que se llama
[167:59] gethouston.ai
[168:00] todos los que
[168:02] no la han descargado
[168:02] por favor
[168:03] vayan
[168:04] se las estoy enviando
[168:05] por el chat
[168:06] van a
[168:08] un segundo
[168:10] ahí las estoy
[168:11] mandando
[168:11] por el chat
[168:12] por favor
[168:14] vayan a
[168:14] gethouston.ai
[168:16] y cuando estén
[168:19] ahí
[168:19] van a poner
[168:20] el siguiente código
[168:21] van a ir
[168:22] a poner
[168:22] les va a aparecer
[168:25] esta página
[168:25] y ustedes van a poner
[168:27] descargar aplicación
[168:29] como ustedes
[168:31] hacen parte
[168:31] de hoy
[168:32] de un beta cerrado
[168:33] y hacen parte
[168:34] de este bootcamp
[168:35] esto no está abierto
[168:37] para el público
[168:37] todavía
[168:38] para ustedes
[168:38] sí
[168:39] van a poner
[168:40] la siguiente
[168:41] clave mágica
[168:42] que les voy a mandar
[168:43] por acá
[168:43] se llama
[168:44] get shit done
[168:46] la estoy mandando
[168:47] por el chat
[168:48] de zoom
[168:48] para que la copien
[168:49] y la peguen
[168:49] y la voy a dejar
[168:50] ahí
[168:50] 30 segundos
[168:51] listo
[168:54] voy a poner acá
[168:56] y vamos a ir
[168:56] paso por paso
[168:57] lo primero es
[168:58] vamos a instalar
[168:59] Houston
[169:00] está disponible
[169:01] para Windows
[169:01] está disponible
[169:02] para Mac
[169:03] y está disponible
[169:03] para Linux
[169:04] si ya lo tenemos
[169:07] descargado
[169:07] no hay problema
[169:08] no no hay problema
[169:09] los que ya lo tienen
[169:09] descargado
[169:10] por favor
[169:10] vayan mandando
[169:11] ahí por el chat
[169:11] que ya lo tienen
[169:12] listo
[169:17] ya lo tienen
[169:18] ya lo tienen
[169:19] listo
[169:19] los que no
[169:20] vamos a darles
[169:21] 30 segundos
[169:24] veo que ya hay
[169:24] muchos que ya lo tienen
[169:25] ¿cómo lo puedo
[169:26] descargar para Linux?
[169:28] estando en Mac
[169:28] Julián te puede
[169:30] responder esa pregunta
[169:31] y listo
[169:33] ya lo tienen
[169:34] ya lo tienen
[169:34] hay muchos que
[169:35] si lo descargaron
[169:36] cuando estuvieron
[169:37] en la versión de Platzi
[169:38] o en la versión
[169:39] del App 10
[169:39] era la versión
[169:40] de Houston
[169:40] que corría a nivel local
[169:41] esta es la versión
[169:42] de Houston
[169:43] que es la versión
[169:44] Pro
[169:44] que es la versión
[169:44] Cloud
[169:45] que es la versión
[169:46] multijugador
[169:47] esta es la versión
[169:48] en la que
[169:48] les vamos a dar
[169:49] acceso gratis
[169:49] hoy
[169:49] esta es la versión
[169:50] por la que
[169:50] las personas
[169:51] pagarían entre 15
[169:52] y 25 dólares
[169:52] ustedes tienen
[169:54] acceso gratis
[169:55] hoy por estar
[169:56] hoy acá
[169:56] listo
[170:00] hay unos que dicen
[170:01] ya actualizado
[170:01] ya descargué
[170:02] la nueva en Cloud
[170:03] listo
[170:03] voy a dejarlo ahí
[170:04] vamos a ponerlo
[170:05] les propongo
[170:07] que dejemos esto
[170:07] 5 minutos
[170:09] y vamos respondiendo
[170:10] preguntas al tiempo
[170:11] les parece
[170:12] listo
[170:15] vamos a poner
[170:16] listo
[170:18] vamos respondiendo
[170:20] preguntas
[170:20] si quieren
[170:21] mientras las personas
[170:21] van instalando
[170:22] les damos
[170:23] ahí 5 minutos
[170:24] a las personas
[170:24] que lo van instalando
[170:25] si quieres
[170:26] Andrés
[170:28] tienes tu manito
[170:29] levantada
[170:30] se ve el micrófono
[170:31] cuál es tu pregunta
[170:32] Andrés Moncada
[170:41] si estás por ahí
[170:41] te acabo de dar
[170:42] la palabra
[170:43] para que la puedas
[170:44] puedas tomar el micrófono
[170:46] ay perdón
[170:49] no yo ya había preguntado
[170:49] voy a bajar
[170:50] la mano
[170:51] va tu manito virtual
[170:52] entonces
[170:52] todos los que
[170:53] no quieren preguntar
[170:54] bajen su manito virtual
[170:55] todos los que si quieren
[170:56] seguir preguntando
[170:57] dejen su manito virtual
[170:58] y mientras los demás
[170:59] van instalado
[170:59] van instalando
[171:02] para comenzar
[171:03] respondemos
[171:04] algunas preguntas
[171:05] entonces
[171:05] Hayward
[171:06] si quieres
[171:07] abre tu micrófono
[171:08] y haz tu pregunta
[171:10] mientras van instalando
[171:11] Houston
[171:12] y acá yo tengo
[171:13] un contador de tiempo
[171:14] no te deja
[171:19] ahí te estoy
[171:20] te estoy pasando
[171:21] Hayward
[171:21] para que te
[171:22] listo
[171:22] ahí te dejo
[171:22] listo
[171:24] hola Felipo
[171:25] hola a todas
[171:25] pues una pregunta
[171:28] que tengo
[171:29] es un poquito más
[171:30] como la diferencia
[171:31] de esto
[171:32] con los otros agentes
[171:33] creo que has venido
[171:34] respondiéndola
[171:35] un poco
[171:36] también con lo de
[171:37] multiplayer
[171:37] creo que se llama
[171:38] el feature
[171:39] pero es básicamente
[171:41] eso
[171:42] es
[171:42] como entender
[171:44] y a ver si lo estoy
[171:44] entendiendo bien
[171:45] cuál es la diferencia
[171:46] de Houston
[171:46] con por ejemplo
[171:47] Cloud Cowork
[171:48] o Coex
[171:49] que yo
[171:50] desde el lado técnico
[171:51] estoy construyendo
[171:52] los skills
[171:52] y un set de skills
[171:53] a mi equipo
[171:53] de hecho
[171:54] pues es un poquito tarde
[171:55] porque fue como
[171:56] el equipo comercial
[171:57] que me dijo
[171:57] ven
[171:57] mírate Houston
[171:58] a ver si nos sumas
[172:00] cierto
[172:00] entonces para entenderlo
[172:01] un poco más
[172:02] es
[172:02] es tener lo mismo
[172:04] por decirlo así
[172:05] cierto
[172:05] esos skills
[172:06] y esas habilidades
[172:07] y esos agentes
[172:08] pero compartidos
[172:10] para mi equipo
[172:11] y centralizados
[172:12] en una sola aplicación
[172:13] y me solucionan
[172:15] también como el tema
[172:15] de distribución
[172:16] de actualización
[172:17] y demás
[172:18] sí
[172:19] te va a dar
[172:20] tres diferencias
[172:21] muy específicas
[172:22] la primera es que
[172:23] si tú estás en Cloud Cowork
[172:25] estás obligado
[172:26] y supeditado
[172:27] a únicamente usar
[172:28] los modelos de Antropic
[172:28] ok
[172:29] si mañana
[172:31] pasa lo que pasa
[172:31] hace unos días
[172:32] que Antropic dijo
[172:33] voy a cobrar 20x
[172:34] por Fable 5
[172:35] y tú tienes
[172:36] todo tu vida
[172:37] ahí
[172:37] te pone una pistola
[172:38] en la cabeza
[172:39] y te toca pagarlo
[172:40] y no te puedes migrar
[172:41] o te toca migrarte
[172:42] manualmente
[172:43] si pasa lo que pasó
[172:46] hace dos semanas
[172:46] que OpenAI
[172:47] dice
[172:47] ahora nuestro modelo
[172:48] es el mejor
[172:48] de todo el mercado
[172:49] tú dices
[172:49] me toca migrar
[172:50] todo a OpenAI
[172:51] o si sale
[172:52] que se lo hace
[172:52] una semana
[172:53] de Química 3
[172:54] que ahora es más barato
[172:55] y es el mejor
[172:56] me toca migrar
[172:57] entonces
[172:58] la primera diferencia
[172:59] es que Houston
[173:00] es por default
[173:01] es multimodelo
[173:02] no estás amarrado
[173:03] a ningún proveedor de IA
[173:04] toda la gobernanza
[173:06] de los skills
[173:06] de las integraciones
[173:07] de la data
[173:08] es tuya
[173:09] vive en un arnés
[173:11] que tú puedes controlar
[173:12] si el día de mañana
[173:14] Antropic
[173:14] tú tienes todo
[173:15] Antropic es buenísimo
[173:16] no me lo interpretes
[173:17] yo lo uso también
[173:18] si el día de mañana
[173:20] tú
[173:21] te banean la cuenta
[173:22] por alguna razón
[173:23] y tú tenías
[173:23] todas tus automatizaciones
[173:24] ahí
[173:24] como le ha pasado
[173:25] a algunas personas
[173:26] chao
[173:26] no puedes hacer nada
[173:27] ¿listo?
[173:29] esa es la primera
[173:29] la segunda es que
[173:31] como Houston
[173:32] está hosteada
[173:33] en la nube
[173:33] desde ahora
[173:35] es multijugador
[173:36] tú puedes crearte
[173:38] un agente
[173:39] y compartírselo
[173:40] a todo tu equipo
[173:41] tú tienes acá
[173:41] el agente
[173:42] representante de ventas
[173:43] y acá
[173:43] invitas a las cinco
[173:44] personas de tu equipo
[173:45] y las cinco
[173:46] están en el mismo
[173:46] tablero trabajando
[173:47] las cinco
[173:48] pueden trabajar
[173:48] en el mismo chat
[173:49] por ejemplo
[173:49] ¿listo?
[173:51] entonces la segunda
[173:52] es que es multijugador
[173:53] multimodelo
[173:53] multijugador
[173:54] y la tercera
[173:55] yo te diría
[173:55] tienes control
[173:57] sobre las integraciones
[173:58] las skills
[173:59] la gobernanza
[174:00] es tuyo
[174:00] te lo llevas
[174:01] cuando quieras
[174:01] o le enchufas
[174:02] cualquier modelo
[174:02] de IA
[174:03] cuando tú quieras
[174:04] ¿sí?
[174:08] listo
[174:09] vamos acá
[174:11] quedan
[174:12] un minuto
[174:13] veintiséis
[174:14] quiero que me digan
[174:15] por favor
[174:15] si no han podido
[174:17] instalarla
[174:18] por favor
[174:18] manden
[174:20] un mensajito
[174:21] ahí
[174:21] que no han podido
[174:22] y el equipo
[174:23] está con ustedes
[174:23] queda un minuto
[174:24] les doy un minuto más
[174:25] los que no recuerdan
[174:27] cómo es
[174:28] estamos yendo
[174:28] a gethuston.ai
[174:30] y lo que tienen
[174:33] que hacer es
[174:34] le dan clic
[174:35] en descargar
[174:36] la aplicación
[174:36] y le ponen
[174:37] este código mágico
[174:38] que se llama
[174:38] get shit done
[174:40] listo
[174:43] la estamos mandando
[174:44] ahí
[174:44] estoy mandando
[174:45] la página web
[174:46] para que vayan
[174:46] y la descarguen
[174:50] dice Ana María
[174:50] no me puedo instalar
[174:51] me dice que me envían
[174:52] un código a mi email
[174:53] y no me llegó
[174:53] seguramente tú pusiste
[174:55] unirte a la lista
[174:56] espera
[174:56] lo que tienes que hacer
[174:57] es poner el código
[174:58] que te estoy mandando acá
[174:59] pon por favor
[175:01] este código
[175:02] get shit done
[175:03] listo
[175:07] dice por acá
[175:11] Álvaro
[175:11] entonces podemos
[175:11] comparar Houston
[175:12] con Hermes
[175:13] OpenClaw
[175:14] aunque tengan
[175:15] sus propias
[175:15] características
[175:16] sí
[175:16] exacto
[175:17] lo puedes comparar
[175:18] con un Hermes
[175:19] y con un OpenClaw
[175:19] y la gran diferencia
[175:20] con ellos es que
[175:21] arrancamos
[175:22] siendo multijugador
[175:23] y estamos enfocados
[175:24] 100% en personas
[175:25] no técnicas
[175:26] listo
[175:30] algunos está generando error
[175:31] lo que necesitamos es
[175:32] vayan y
[175:33] descarguenlo
[175:35] les voy a pasar
[175:36] esta guía
[175:36] por el chat
[175:38] de Zoom
[175:38] para los que se están
[175:40] perdiendo
[175:40] pueden ir
[175:42] y en esta guía
[175:42] paso por paso
[175:43] está antes de empezar
[175:44] que necesitan
[175:45] cómo instalar Houston
[175:46] listo
[175:47] se las acaba de pasar
[175:47] por el chat
[175:48] si ustedes van
[175:50] a gethuston.ai
[175:51] y miran
[175:52] en recursos
[175:53] guías
[175:54] acaban de encontrarse
[175:55] la guía
[175:56] de cómo instalar
[175:56] el SDR
[175:57] listo
[175:58] ahí les estoy pasando
[176:00] por el chat
[176:01] de Zoom
[176:02] les estoy pasando
[176:02] el enlace
[176:04] la guía
[176:04] hay algunos
[176:08] que les está saliendo
[176:09] un error al conectar
[176:10] cloud
[176:10] ahí está
[176:11] Julián y Daniel
[176:11] de mi equipo
[176:12] ayudando a todo el mundo
[176:13] listo
[176:15] les estoy pasando
[176:17] la guía
[176:17] Viviana pregunta
[176:21] esta versión gratuita
[176:22] es para hasta
[176:23] tres usuarios
[176:23] deben
[176:25] ingresar
[176:27] con el mismo correo
[176:28] o pueden vincularse
[176:28] con tres correos
[176:29] corporativos diferentes
[176:30] ya les voy a mostrar
[176:31] con tres correos
[176:31] diferentes
[176:32] la razón por la cual
[176:34] tú no vas a querer
[176:34] que todos entren
[176:35] con la misma cuenta
[176:36] es porque el día de mañana
[176:37] tú no quieres
[176:37] que todos los empleados
[176:38] tengan el acceso
[176:39] a las mismas cuentas
[176:40] que otros
[176:41] sí
[176:41] o sea de pronto
[176:42] algunos tienen que tener
[176:43] acceso al sistema
[176:43] contable
[176:44] otros al sistema
[176:45] de ventas
[176:46] no vas a querer
[176:47] o sea es lo mismo
[176:47] que los humanos
[176:48] no
[176:49] algunos les das acceso
[176:50] a algunas cosas
[176:50] y otros no
[176:51] listo
[176:54] por ahora
[176:55] solo necesito
[176:56] que la descarguen
[176:58] ok
[176:58] vayan descargándola
[177:00] sigan el tutorial
[177:04] los que ya la descargaron
[177:05] hay un tutorial
[177:06] síganlo
[177:06] les va a pedir
[177:07] que conecten
[177:08] una de las dos cuentas
[177:09] y les va a pedir
[177:09] que hagan alguna conexión
[177:10] listo
[177:12] cuál cuenta
[177:17] de correo
[177:17] es recomendable usar
[177:18] tipo
[177:18] auto corporativo
[177:19] o gmail
[177:19] cualquiera les funciona bien
[177:21] Sandra
[177:22] Johanna
[177:22] instalado
[177:23] voy iniciando sesión
[177:24] o espero
[177:24] los que ya lo instalaron
[177:26] vayan iniciando sesión
[177:27] y vayan siguiendo
[177:28] el tutorial
[177:28] listo
[177:29] vayan siguiendo
[177:29] el tutorial
[177:30] para llegar
[177:30] hasta este tablero
[177:32] cuando lleguen
[177:33] a este tablero
[177:33] díganme
[177:34] estoy acá
[177:35] ya en el tablero
[177:36] y vamos a esperar
[177:37] ok
[177:38] como hay personas
[177:39] que hasta ahora
[177:39] lo están descargando
[177:40] debemos de un poco
[177:41] de paciencia
[177:42] les vamos a dar
[177:42] 5 minutos más
[177:44] a estas personas
[177:44] con mucha paciencia
[177:46] listo
[177:50] listo
[177:54] listo
[177:55] dicen algunos
[177:55] necesitan ayuda
[177:56] ahí está
[177:56] Julián y Daniel
[177:57] pregunta
[178:02] en este ítem
[178:03] dejamos todo
[178:03] seleccionado
[178:04] en servicios
[178:04] que puede acceder
[178:05] Composio
[178:06] sí
[178:06] Composio es nuestro
[178:07] proveedor de integraciones
[178:08] para poder utilizar
[178:10] las herramientas
[178:10] ya preconectadas
[178:11] por favor
[178:11] dénle permiso
[178:12] Juan Quiceno
[178:14] necesito algún código
[178:15] el código que necesitas
[178:16] está acá
[178:17] en mi pantalla
[178:18] se los mando
[178:19] por acá
[178:20] otra vez
[178:20] listo
[178:22] a los que se van perdiendo
[178:23] les mando esta guía
[178:24] para que la puedan
[178:25] seguir a su ritmo
[178:26] también por acá
[178:27] a Juan Holmes
[178:37] le sale
[178:37] no se puede completar
[178:38] la operación
[178:39] porque no tienes
[178:39] permiso
[178:39] para acceder a Houston App
[178:40] me dice
[178:41] ok
[178:42] yo les propongo que
[178:43] a los que no los deja
[178:45] yo les propongo que
[178:46] antes de que se acabe
[178:47] esta llamada
[178:47] hagamos un WhatsApp
[178:49] de todos los que estén acá
[178:49] y a todos les vamos a dar
[178:51] soporte
[178:51] a todo lo que reporten
[178:53] ¿listo?
[178:55] listo
[178:55] Sergio Rico dice
[178:56] si tengo open code
[178:57] en vez de cloud
[178:58] ¿se puede conectar?
[178:59] sí Sergio
[178:59] se puede conectar
[179:00] ahorita les voy a mostrar
[179:01] para la gente
[179:03] que quiera resolver
[179:04] un problema
[179:04] creando un agente
[179:05] en Houston
[179:05] ¿tiene algún asistente
[179:06] que le ayude a cualquier persona
[179:07] a crear automáticamente
[179:08] el agente de IA?
[179:09] sí
[179:09] ¿cuánto cuesta mensualmente
[179:11] el mantenimiento
[179:12] de esos cuatro agentes
[179:13] de la promo?
[179:14] esa es una buena pregunta
[179:15] Daniel
[179:15] normalmente
[179:17] cobramos 500 dólares
[179:18] por mantener
[179:18] los cuatro agentes
[179:19] para la versión
[179:21] de Houston
[179:23] para pymes
[179:23] es algo que tenemos
[179:24] que definir todavía
[179:25] el mantenimiento
[179:26] si los mantienen ustedes
[179:28] no les cobramos
[179:28] nada de mantenimiento
[179:29] listo
[179:35] dicen ya lo instalé
[179:36] ya lo instalé
[179:37] ¿dónde se ingresa
[179:38] para permisos
[179:39] a la aplicación?
[179:41] José
[179:41] estamos acá
[179:42] en esta página web
[179:43] para todos
[179:44] los que están perdidos
[179:44] estamos descargando
[179:46] en gethuston.id
[179:48] getsheddone
[179:49] es el código
[179:50] que tienen que usar
[179:51] si se pierden
[179:52] pueden ir a su ritmo
[179:53] en esta guía
[179:54] que les estoy
[179:55] mandando
[179:57] ¿ok?
[179:57] Paula Camacho
[180:00] pregunta
[180:00] ¿cómo conecto
[180:01] Composio?
[180:02] no lo tienes
[180:02] que conectar
[180:02] Paula
[180:03] ya viene
[180:03] preconectado
[180:04] ¿se inicia sesión
[180:07] con el mismo
[180:08] correo de cloud?
[180:09] Alejandra
[180:09] no necesariamente
[180:10] le puedes conectar
[180:11] el correo
[180:11] que tú quieras
[180:12] Giovanna Romero
[180:14] no entiendo
[180:15] lo descargo
[180:15] y parece que instalo
[180:16] pero no lo veo
[180:16] en las apps
[180:17] del Mac
[180:17] tienes que
[180:18] cuando lo descargas
[180:19] tienes que arrastrarlo
[180:21] de
[180:21] mira
[180:23] voy a descargarlo
[180:24] acá
[180:24] cuando lo descargas
[180:27] mira
[180:28] lo voy a abrir
[180:29] y cuando lo descargues
[180:34] mira
[180:35] te va a abrir
[180:36] acá
[180:36] te abre una
[180:37] te abre una carpeta
[180:39] donde tú lo tienes
[180:40] que arrastrar acá
[180:41] ¿ok?
[180:42] lo tienen que arrastrar
[180:43] y le dicen
[180:45] reemplazar
[180:45] o mantener
[180:46] y ahí está
[180:47] yo como ya la tengo
[180:48] pues no la vuelven a instalar
[180:49] ¿ok?
[180:52] Juan Holmes
[180:53] si no te deja instalar
[180:54] y dice que error persistente
[180:55] ya el equipo
[180:59] ya te ayudamos
[181:00] te ayudamos por interno
[181:01] ¿listo?
[181:04] ¡listo!
[181:05] les voy a pasar
[181:05] la guía paso a paso
[181:06] para que ustedes
[181:07] o sea
[181:08] para que podamos seguir
[181:08] para que podamos seguir
[181:10] ¿ok?
[181:12] si necesitan ir a su ritmo
[181:13] ahí está todo en la guía
[181:14] Alfredo Gómez
[181:15] ahí está
[181:15] les paso la guía
[181:16] ahí está
[181:17] cómo descargárselo
[181:18] ahí está el código
[181:19] que necesitan usar
[181:20] ¿listo?
[181:25] si están en Windows
[181:26] debo advertirles
[181:27] que como nos acaban
[181:27] de dar nuestra certificación
[181:28] les va a salir algo
[181:29] que es
[181:30] les va a salir
[181:31] probablemente
[181:31] que puede ser
[181:32] una aplicación desconocida
[181:34] le tienen que dar
[181:34] más información
[181:35] le tienen que dar a aceptar
[181:36] ¿ok?
[181:39] ¡listo!
[181:40] hay algunos errores
[181:40] que están saliendo
[181:41] error en la Zarcha GPT
[181:43] error en la Zaran Tropic
[181:45] listo
[181:46] no se preocupen
[181:47] ¿hay un número
[181:52] límite de agentes
[181:53] y de chats
[181:54] para cada gente
[181:54] en Houston?
[181:55] en este momento
[181:56] no
[181:57] Houston
[181:59] we have landed
[181:59] buenísimo Daniel
[182:01] dice visual cohete
[182:04] ay se me fue
[182:05] una pregunta
[182:08] quiero añadir
[182:09] a una persona
[182:09] de mi grupo
[182:09] de desarrollo de agentes
[182:10] pero no puedo agregar
[182:11] otro correo
[182:11] listo
[182:12] ya les enseñamos
[182:12] por ahora
[182:13] solo necesito
[182:14] que descarguen
[182:15] Houston
[182:15] y lleguen acá
[182:15] ¿ok?
[182:18] listo
[182:18] vamos a seguir
[182:20] vamos a seguir
[182:21] listo
[182:22] lo segundo
[182:23] es que
[182:23] les voy a mandar
[182:24] un enlace
[182:25] para que se armen
[182:26] una cuenta
[182:27] en
[182:27] Appify
[182:29] ¿ok?
[182:29] esta cuenta
[182:30] les va a dar
[182:31] 75 dólares
[182:32] para que ustedes
[182:33] se puedan crear
[182:33] una cuenta
[182:34] y puedan utilizarla
[182:35] para scrapear
[182:36] se las voy a mandar
[182:37] acá por el chat
[182:38] listo
[182:40] a todos
[182:41] a todos
[182:42] los que están acá
[182:43] les vamos a dar
[182:44] 75 dólares
[182:45] en Appify
[182:45] por el simple hecho
[182:46] de haber estado acá
[182:47] listo
[182:51] ahí voy a poner
[182:53] 5 minutos
[182:54] aquí les estoy
[182:56] mandando por el chat
[182:56] de Zoom
[182:57] a todos
[182:57] por favor
[182:58] hagan clic ahí
[182:59] dice Johan
[183:03] si para mi empresa
[183:04] LinkedIn
[183:04] no es la mejor
[183:05] fuente de bases
[183:05] de datos
[183:05] que hago
[183:06] a Johanna
[183:07] Johanna
[183:07] puedes utilizar
[183:08] la fuente
[183:08] que tú utilices
[183:09] Instagram
[183:10] correos
[183:11] noticias
[183:11] o sea
[183:12] yo simplemente
[183:13] hice un ejemplo
[183:13] con LinkedIn
[183:14] mi red estrella
[183:16] es Instagram
[183:16] le puedes conectar
[183:18] Appify
[183:18] tiene un montón
[183:19] de scrapers
[183:20] para Instagram
[183:21] o si lo quieres
[183:22] conectar
[183:23] también lo puedes
[183:23] conectar
[183:24] directamente
[183:24] en la sección
[183:25] de integraciones
[183:25] ahorita vamos
[183:26] para allá
[183:26] ¿ok?
[183:27] Instagram
[183:27] se puede conectar
[183:28] listo
[183:32] todos vayan
[183:32] por favor
[183:33] a abrirse
[183:35] una cuenta
[183:35] en Appify
[183:37] listo
[183:39] estamos abriendo
[183:39] las cuentas
[183:41] acá se los pongo
[183:42] para que lo puedan
[183:43] inclusive hacer
[183:44] con el celular
[183:44] por favor
[183:46] quiero que todos
[183:46] vayan ahora
[183:47] para Appify
[183:50] le pide el número
[183:50] de Appi
[183:51] Diana
[183:51] ya
[183:52] por ahora
[183:53] abrete la cuenta
[183:53] y ahorita
[183:54] les enseño
[183:54] a conectarla
[183:55] porque Appify
[183:56] se puede conectar
[183:56] por Appi
[183:57] o se puede conectar
[183:58] vía MSP
[183:59] Gustavo Rodríguez
[184:01] dice
[184:02] no me carga el cupón
[184:03] ya tenía una
[184:03] el cupón
[184:04] es
[184:05] Houston
[184:05] Raya
[184:05] al Piso
[184:06] Rocket
[184:06] y si ya tenías
[184:08] una cuenta
[184:08] después te la enseñó
[184:09] a usar
[184:10] en la guía
[184:11] que les estoy
[184:12] compartiendo
[184:12] está
[184:12] listo
[184:15] voy a poner
[184:15] cinco minutos
[184:16] sé que esta parte
[184:17] es un poco tediosa
[184:18] para todos
[184:18] pero necesitamos
[184:19] necesitamos esto
[184:20] esos 75 dólares
[184:23] son para usuarios nuevos
[184:24] originalmente
[184:25] son para usuarios nuevos
[184:25] pero si tú le pones
[184:26] este cupón
[184:27] de Houston Rocket
[184:27] en tu consola
[184:28] y le das
[184:29] añadir cupón
[184:30] te lo va a añadir
[184:30] ¿dónde colocó
[184:34] el código?
[184:35] mira
[184:35] escanea
[184:36] escanea
[184:36] este código QR
[184:37] y ya te va a llevar
[184:38] directamente
[184:39] el enlace
[184:39] para crear una cuenta
[184:40] y
[184:41] para tener
[184:43] también el código
[184:44] tener el cupón
[184:46] listo
[184:49] te dicen por ahí
[184:52] está muy demorado
[184:53] en descargar
[184:54] e instalar
[184:54] de pronto
[184:55] tiene que ver
[184:55] con la red
[184:56] de internet
[184:56] que tienes
[184:57] Marta
[184:57] listo
[184:59] todo hasta
[184:59] Appify
[185:00] pero en Composio
[185:01] no le doy permiso
[185:01] para redactar
[185:02] enviar
[185:02] y eliminar
[185:02] correos
[185:03] por seguridad
[185:03] y recomendación
[185:04] de la App10
[185:04] al iniciar
[185:05] con una herramienta
[185:06] Tomás
[185:06] te doy la diferencia
[185:08] de Composio
[185:09] 4U
[185:09] que es la versión
[185:10] gratuita
[185:10] y la versión
[185:11] empresarial
[185:12] que es la que usamos
[185:12] nosotros
[185:13] la versión
[185:13] empresarial
[185:14] de Composio
[185:15] es una versión
[185:15] que tiene
[185:16] todos los estándares
[185:17] de calidad
[185:17] y seguridad
[185:18] lo utilizan
[185:19] Glean
[185:19] lo utiliza Amazon
[185:20] lo utiliza Zoom
[185:22] y lo utiliza Houston
[185:23] ok
[185:23] esta es una versión
[185:24] que es paga
[185:25] y ustedes la están
[185:26] teniendo gratis
[185:26] entonces
[185:27] la versión
[185:28] de Composio
[185:29] gratuita
[185:30] que es 4U
[185:30] no tiene nada
[185:32] de eso
[185:32] la versión
[185:32] empresarial
[185:33] que es la que nosotros
[185:33] estamos utilizando
[185:34] ahora en Houston Cloud
[185:35] viene
[185:36] SOC2 compliant
[185:37] e ISO 27001 compliant
[185:38] así que
[185:39] es segura de usar
[185:40] listo
[185:42] si se perdieron
[185:45] vamos a hacer una recapitulación
[185:46] no ha pasado nada
[185:47] Sandra
[185:47] estamos haciendo
[185:48] una parte
[185:49] que es la instalación
[185:50] de las herramientas
[185:51] para poder hacer el taller
[185:52] dijimos
[185:54] lo primero es instalar Houston
[185:56] es entrar a
[185:57] gethuston.ai
[185:58] lo segundo
[185:59] es entrar a crearse
[186:00] una cuenta en Appify
[186:01] escaneen este código QR
[186:03] y les da 75 dólares
[186:04] y lo tercero
[186:06] si ya hicieron eso
[186:07] van a abrirse una cuenta
[186:08] en Open Router
[186:09] este es el tercer regalo
[186:10] que tenemos para ustedes
[186:11] Open Router
[186:13] es este proveedor
[186:14] de modelos
[186:14] de IA
[186:15] que les da acceso
[186:16] a 400 modelos
[186:18] van a tener
[186:18] 10 dólares
[186:19] para probarlo
[186:20] y conectarlo
[186:20] en Houston
[186:21] ok
[186:22] dice que el código
[186:25] Open Router
[186:25] no funciona
[186:26] déjame reviso
[186:27] déjame lo reviso
[186:31] porque
[186:31] debería estar funcionando
[186:33] dame un segundito
[186:33] a ver
[186:35] tenlo ahí
[186:37] y yo voy verificándolo
[186:38] el código Open Router
[186:39] ok
[186:39] a ver
[186:47] déjenme
[186:47] el código
[186:50] en Open Router
[186:51] es
[186:51] todo en mayúscula
[186:53] o r
[186:54] raya
[186:55] get
[186:55] Houston
[186:56] lo que tienen que hacer es
[186:59] entran primero acá
[187:01] en Open Router
[187:03] no les va a decir
[187:05] no los va a llevar
[187:06] directamente a aplicar
[187:07] el código
[187:07] tienen que darle
[187:08] check out
[187:08] y en el check out
[187:09] ponen el código
[187:10] listo
[187:12] Gustavo Rodríguez dice
[187:15] para los que ya teníamos
[187:16] cuenta
[187:16] donde se ingresa
[187:17] el código
[187:18] de Appify
[187:19] te doy
[187:19] les muestro
[187:20] Appify
[187:22] tú vienes acá
[187:23] y tienen algo
[187:24] que se llama
[187:24] Billing
[187:25] en Billing
[187:27] tú vas a algo
[187:29] que se llama
[187:30] suscripción
[187:32] y abajo
[187:34] dices
[187:35] add promo code
[187:36] y ahí lo pegas
[187:40] y ya tenías
[187:41] ok
[187:41] la URL
[187:46] Open Router
[187:47] aquí está
[187:47] por favor
[187:47] háganle clic
[187:48] ya se las mando
[187:49] acá por el chat
[187:50] también
[187:50] ok
[187:51] ya se las mando
[187:55] acá por el chat
[187:56] acá se las mando
[187:59] listo
[187:59] la URL
[188:00] Open Router
[188:01] se las paso
[188:01] acá por el chat
[188:02] ahí está
[188:03] todas las aplicaciones
[188:06] las pueden
[188:07] instalar
[188:07] aquí
[188:08] agarren el celular
[188:10] y escaneen
[188:11] este código
[188:11] y este código
[188:12] y se crean
[188:14] una cuenta
[188:15] o
[188:15] se la pueden crear
[188:17] acá
[188:18] por el chat
[188:19] de Zoom
[188:19] les estoy mandando
[188:20] donde ingresa
[188:25] el código
[188:25] de Appify
[188:26] si ustedes ya
[188:26] tienen una cuenta
[188:27] Andrés
[188:28] lo que tienes que ir
[188:29] es a
[188:29] Billing
[188:31] suscripción
[188:32] y abajo
[188:35] en suscripción
[188:35] dice
[188:36] añadir promo code
[188:37] dice Sandra
[188:43] todos los usuarios
[188:44] deben ser los mismos
[188:44] no Sandra
[188:45] no tienen que ser
[188:45] los mismos
[188:46] o sea
[188:46] tú solo necesitas
[188:47] tu cuenta
[188:48] en Houston
[188:48] que es el arnés
[188:49] y le puedes conectar
[188:50] cuentas que tú tengas
[188:51] en otros lados
[188:52] yo creo que
[188:53] en general
[188:53] yo intento
[188:54] mantenerlo personal
[188:55] personal
[188:55] y profesional
[188:56] profesional
[188:56] pero a veces
[188:57] se me mezcla
[188:57] porque ya tengo
[188:58] cuentas personales
[188:59] en Appify
[188:59] cuentas
[189:00] entonces está bien
[189:01] tus cuentas
[189:02] de las herramientas
[189:02] pueden ser
[189:03] donde las tengas
[189:04] el código
[189:07] de Appify
[189:08] les voy a mandar
[189:08] nuevamente
[189:09] si ustedes
[189:10] vienen acá
[189:11] a la guía
[189:11] paso a paso
[189:12] ahí está
[189:13] como descargarse
[189:14] Appify
[189:15] y acá
[189:18] ya les dejo
[189:18] igualmente
[189:19] ¿cuál es el
[189:20] promo code
[189:21] de
[189:21] Open Router?
[189:24] gracias Jaime
[189:24] Amaya
[189:25] por responderlo
[189:26] ¿cómo se ingresa
[189:29] código
[189:29] sin ser QR?
[189:33] ¿dónde meto
[189:34] el código?
[189:35] el código
[189:35] de Appify
[189:35] dura dos meses
[189:36] Oscar
[189:37] sí
[189:37] le digo
[189:39] Open Router
[189:40] ¿cuánto
[189:40] individual
[189:41] y de organización?
[189:43] ponlo
[189:44] individual
[189:45] Joana
[189:45] bacano
[189:49] ese Appify
[189:50] es bacano
[189:50] para scrapear
[189:51] maps
[189:51] listo
[189:54] Andrés Solano
[189:54] ya tiene
[189:55] sus
[189:56] 10 dólares
[189:57] de Open Router
[189:58] buenísimo
[189:58] el código
[189:59] Open Router
[189:59] ¿dónde lo coloco?
[190:00] ya tenía
[190:01] ya tenía
[190:02] la cuenta
[190:02] ¿cuándo lo vas
[190:04] a recargar?
[190:05] cuando lo vas
[190:05] a recargar
[190:06] Gustavo
[190:06] te debe salir
[190:07] ¿cuánto quieres
[190:08] recargar?
[190:08] o te sale
[190:09] un código
[190:10] promocional
[190:11] ahí ponlo ahí
[190:11] listo
[190:14] les voy a dar
[190:14] 5 minutos más
[190:15] voy a dejar
[190:16] esto acá
[190:16] 5 minutos
[190:17] este pedazo
[190:18] es un poco
[190:19] caótico
[190:19] para todos
[190:20] yo lo sé
[190:21] y vamos a dar
[190:24] estos 5 minutos
[190:25] voy a dejar
[190:25] esto acá
[190:25] proyectando
[190:26] para que podamos
[190:27] para que podamos
[190:29] dice José Ruiz
[190:31] ¿cómo puedo cambiar
[190:32] el correo registrado?
[190:33] ¿en Houston
[190:33] o en dónde?
[190:36] ¿puedes enviar
[190:37] de nuevo
[190:37] lo de la gente?
[190:38] sí
[190:38] en Appify
[190:41] le dice
[190:41] que dura
[190:42] dos meses
[190:42] el código
[190:43] sí
[190:43] el código
[190:44] dura
[190:44] dos meses
[190:45] es un código
[190:45] promocional
[190:46] quedan 75 dólares
[190:47] para que lo puedan usar
[190:48] me dice
[190:50] que cuando
[190:51] quiero cargar
[190:51] el agente
[190:52] hay un error
[190:52] Tala
[190:53] sí
[190:54] por favor
[190:54] en la guía
[190:55] no instalen
[190:56] el agente
[190:57] todavía
[190:57] porque acabamos
[190:58] de cambiar
[190:58] ayer
[190:58] la manera
[190:59] de instalar
[190:59] el agente
[191:00] se los voy a enseñar
[191:00] a instalar
[191:01] directamente
[191:01] y tenemos
[191:02] que instalar
[191:02] tenemos
[191:03] que actualizar
[191:03] la guía
[191:04] gracias
[191:05] por
[191:05] por decirme
[191:07] me indican
[191:09] por favor
[191:10] como
[191:10] listo
[191:11] el código
[191:11] open router
[191:12] el código
[191:16] open router
[191:17] es este
[191:17] que está acá
[191:17] or
[191:18] raya
[191:18] get
[191:20] Houston
[191:20] open router
[191:22] raya
[191:22] al piso
[191:22] eh perdón
[191:23] raya
[191:23] al medio
[191:24] Houston
[191:24] la manera
[191:26] de abrirte
[191:27] tu cuenta
[191:27] es
[191:28] vayan
[191:28] escaneen
[191:28] esto
[191:29] y vayan
[191:30] al checkout
[191:31] y pongan
[191:32] eso
[191:32] listo
[191:37] a los que se están
[191:38] adelantando
[191:38] en Houston
[191:39] o les está saliendo
[191:40] que no tiene
[191:40] permisos
[191:41] seguramente
[191:41] no le dieron
[191:41] permisos
[191:42] en la sección
[191:42] de integraciones
[191:43] no se preocupen
[191:44] simplemente
[191:44] sigan
[191:45] y ya les enseño
[191:45] el link
[191:48] de open router
[191:49] ya se los paso
[191:50] escaneen esto
[191:54] que está acá
[191:55] pero si no
[191:55] igual
[191:55] ya se los paso
[191:56] por acá
[191:56] listo
[191:57] ahí les voy pasando
[192:01] este es el
[192:01] este es el código
[192:03] y este es
[192:05] el
[192:06] enlace
[192:07] para open router
[192:08] seguramente
[192:13] en open router
[192:13] les pide
[192:13] escenar un método
[192:14] de pago
[192:14] pero
[192:15] ponganle el cupón
[192:16] Robinson González
[192:19] ¿cuál es el cupón
[192:20] de Appify?
[192:20] lo estoy proyectando
[192:21] en mi pantalla
[192:22] aquí está
[192:22] Houston
[192:23] real
[192:23] piso
[192:23] rocket
[192:23] o
[192:24] escaneate
[192:25] este código
[192:26] QR
[192:26] y te va a llevar
[192:27] directamente
[192:27] y ya está
[192:28] aplicado
[192:28] Gustavo
[192:30] Daza
[192:30] aquí está
[192:33] el código
[192:33] de Appify
[192:34] crea tu cuenta
[192:35] en Appify
[192:35] a Marta
[192:38] a Marta Sierra
[192:38] no le acepta
[192:39] el cupón
[192:39] sí
[192:41] aquí
[192:42] ¿qué paso sigue?
[192:43] dale
[192:43] next
[192:44] Adriana
[192:44] Escorcia
[192:45] dale
[192:45] next
[192:45] Colombia
[192:49] en Tour
[192:50] dice
[192:50] open router
[192:51] individual
[192:51] sí
[192:51] vayan al
[192:52] individual
[192:52] por ahora
[192:56] o si lo van a compartir
[192:58] con una organización
[192:59] pues
[192:59] con organización
[193:00] link de la guía
[193:02] ya se los mando
[193:04] nuevamente
[193:04] en la guía
[193:06] se van a dar cuenta
[193:07] del paso a paso
[193:08] de cómo hacer todo esto
[193:09] ok
[193:09] la guía
[193:11] toca actualizarle
[193:12] una cosa
[193:13] es que acabamos
[193:13] de cambiar
[193:13] la manera
[193:14] de añadir agentes
[193:15] que ya se las voy a enseñar
[193:16] en vivo
[193:16] y toca
[193:17] actualizar la guía
[193:19] y les va a botar
[193:20] un error
[193:20] si están intentando
[193:21] importar a la gente
[193:22] Patricia Riveros
[193:25] ¿dónde está la guía?
[193:26] la estoy mandando aquí
[193:27] mira
[193:27] la acaba de mandar
[193:27] por el chat
[193:28] ¿por qué no se conecta
[193:37] el correo
[193:37] en Claude
[193:38] en Houston?
[193:39] no entiendo
[193:40] dice Daniel
[193:43] coloco aquí
[193:44] sí
[193:44] el código
[193:45] dale
[193:45] seguir
[193:46] save payment method
[193:47] y ahorita te va a poner
[193:48] el código para el checkout
[193:49] sí
[193:51] seguramente les estaba haciendo
[193:52] poner una tarjeta
[193:53] pero ahorita en el checkout
[193:54] les muestra un código
[193:55] les va a pedir
[193:57] les va a dar un código
[193:59] en Appify
[194:06] perdón
[194:07] a la mayoría
[194:08] en open router
[194:09] les va a salir
[194:10] el checkout
[194:11] de una vez
[194:12] denle
[194:13] siérrenlo
[194:15] y en el panel izquierdo
[194:17] de la pantalla
[194:18] hay una pestaña
[194:19] que dice créditos
[194:20] ahí le dan
[194:21] y a ella
[194:22] pueden poner el código
[194:23] es que siempre
[194:24] les va a aparecer
[194:25] el checkout
[194:26] gracias
[194:27] es que
[194:28] no sé
[194:29] es que
[194:29] tienen que entrar
[194:30] a openrouter.ai
[194:32] y
[194:33] slash
[194:34] redeem
[194:34] debería llevarlos
[194:36] directamente acá
[194:37] pero si no
[194:37] lo que tú dices acá
[194:39] en credits
[194:39] Miguel
[194:40] listo
[194:46] acá tienen que pegar
[194:47] este código
[194:47] que es
[194:48] el código
[194:50] de
[194:50] or
[194:52] raya
[194:53] get
[194:53] houston
[194:53] si están perdidos
[194:55] no se preocupen
[194:56] no hemos hecho nada
[194:56] todavía
[194:57] lo que estamos haciendo
[194:58] es conectar
[194:59] las herramientas
[195:00] es posible cambiar
[195:03] los correos
[195:04] para houston
[195:05] ingresé primero
[195:07] con mi cuenta
[195:07] personal
[195:07] pero después
[195:08] quiero ingresar
[195:08] con mi cuenta
[195:09] de empresa
[195:09] andrés
[195:10] si es posible
[195:11] pero también
[195:12] te puedes crear
[195:13] un espacio
[195:14] de trabajo
[195:14] personal
[195:14] y un espacio
[195:15] de trabajo
[195:15] empresarial
[195:16] ahorita te muestro
[195:17] como
[195:17] listo
[195:19] sp
[195:20] johan valderrama
[195:21] tienes alguna pregunta
[195:22] si
[195:24] ahora si me escucho
[195:26] que tienes tu micrófono
[195:27] tienes tu manito levantada
[195:28] hello
[195:30] si
[195:34] si si te tenía
[195:34] una preguntita
[195:36] era que estaba
[195:37] viendo acá
[195:37] cuando estaba
[195:39] abriendo houston
[195:40] que me dice
[195:40] bueno
[195:41] puede ser
[195:42] que los agentes
[195:43] algunas cosas
[195:43] que debes saber
[195:44] los agentes
[195:45] actuales no en tu nombre
[195:46] pueden ser engañados
[195:47] bueno
[195:47] y ahí da unos términos
[195:49] pero
[195:49] ya me ha preguntado
[195:50] sobre
[195:51] sobre el tema
[195:52] de seguridad
[195:52] entonces
[195:52] me decían
[195:54] que la gente
[195:54] accede a las herramientas
[195:55] con un token
[195:56] de acceso
[195:56] pero
[195:57] pues no va
[195:58] directamente
[195:58] con mi clave
[195:59] yo puedo entender
[196:00] el tema
[196:00] del token
[196:01] tiene sentido
[196:02] pero
[196:03] mientras la gente
[196:04] está corriendo
[196:05] una tarea
[196:06] el token
[196:06] vive en algún
[196:07] proceso
[196:08] que la gente
[196:08] pueda leer
[196:09] lo pregunto
[196:10] porque pues
[196:11] para nosotros
[196:11] el riesgo
[196:12] no es tanto
[196:12] que me roben
[196:13] la contraseña
[196:14] en este caso
[196:14] sino que la gente
[196:15] manipulada
[196:16] otra vez
[196:16] bien sea
[196:16] de prom injection
[196:17] o prom malicioso
[196:18] pues termine
[196:20] usando ese token
[196:20] para algo
[196:21] que no pedí
[196:21] que sería
[196:22] el punto 2
[196:23] que me dice
[196:23] la aplicación
[196:24] pueden ser engañados
[196:25] si
[196:26] entonces
[196:26] voy a darle
[196:27] la palabra
[196:27] a Julián
[196:28] mi confundador
[196:29] y CTO
[196:30] y que él
[196:31] te responda
[196:32] eso
[196:32] y les propongo
[196:33] que todos
[196:34] los que quieran
[196:34] quedémonos
[196:35] al final
[196:35] y contestemos
[196:36] todas las preguntas
[196:37] para darle
[196:37] tramite al ejercicio
[196:38] pero entonces
[196:38] Juli dale
[196:39] gracias
[196:40] Julián
[196:43] tenías tu mano
[196:44] levantada
[196:44] y te di
[196:45] permiso
[196:45] de desmutearte
[196:46] déjame
[196:47] te nombro
[196:47] acá
[196:49] te volví
[196:51] co-host
[196:52] Juli
[196:52] para que puedas
[196:53] estar
[196:53] listo
[196:55] ahí te
[196:55] quito
[196:55] el mute
[196:56] listo
[196:57] no que pena
[196:58] es que me desmuteaste
[196:58] y me volví a mutear
[196:59] mientras él acababa
[197:00] entonces
[197:02] tú estabas preguntando
[197:03] tema de seguridad
[197:04] hay dos niveles
[197:06] el que mencionabas bien
[197:07] es
[197:07] cuando utilizamos
[197:08] las integraciones
[197:09] dentro de Houston
[197:09] lo que nos estamos asegurando
[197:11] es no darle ninguna clave
[197:12] al agente
[197:13] entonces
[197:14] quedan tus claves
[197:15] absolutamente seguras
[197:16] guardadas con todos
[197:17] los estándares de seguridad
[197:18] para manejo de claves
[197:19] entonces
[197:19] tú le estás dando acceso
[197:21] a tu agente
[197:21] pero tú me decías
[197:22] bueno
[197:23] pero
[197:24] hay un segundo problema
[197:25] y es
[197:25] si igual
[197:26] mi agente tiene acceso
[197:27] al correo
[197:27] si llega a tener
[197:28] una interacción maliciosa
[197:30] pues puedes soltar
[197:31] data sensible
[197:32] a mi correo
[197:32] ¿cierto?
[197:33] esa era tu pregunta
[197:33] sí
[197:34] que el token
[197:35] como si vivía
[197:36] en algún proceso
[197:36] que la gente pudiera leer
[197:38] y pues si lo puede leer
[197:39] es susceptible
[197:40] a promyjection
[197:41] porque lo puede usar
[197:42] no pero
[197:42] entonces
[197:42] hay dos cosas
[197:43] el token
[197:44] tu agente no lo puede ver
[197:45] entonces
[197:46] en ningún momento
[197:47] el agente va a tener acceso
[197:48] a ese token
[197:48] todo queda
[197:49] separado de la gente
[197:50] y ya
[197:52] creo que si esa era la pregunta
[197:53] no hay ningún momento
[197:55] y también cuando se hagan integraciones
[197:56] se pueden hacer integraciones
[197:58] aparte de las que están en Houston
[198:00] por ejemplo
[198:01] no sé
[198:01] sigo
[198:01] cosas más
[198:02] específicas
[198:03] de cada una de sus industrias
[198:05] el ERP que ustedes utilicen
[198:06] si no están las integraciones
[198:07] se puede hacer una integración
[198:08] custom
[198:09] y el agente les va a mostrar
[198:11] una cajita
[198:11] donde pueden poner
[198:12] la clave
[198:13] el token
[198:14] etcétera
[198:14] y eso lo guardamos nosotros
[198:15] en un secret manager
[198:16] en Google Cloud
[198:18] que es lo más seguro
[198:19] a nivel de industria
[198:20] entonces su agente
[198:21] así nos aseguramos
[198:22] que su agente
[198:22] nunca vea esos tokens
[198:23] porque compartirlos
[198:24] por el chat
[198:24] es peligroso
[198:25] claro
[198:25] sí
[198:26] y lo otro que no vi ahí
[198:27] en la página
[198:27] que me compartiste
[198:28] de privacidad
[198:29] es como
[198:30] un acceso al contrato
[198:32] de compost
[198:32] o no sé si cuando
[198:33] bueno es que ahorita
[198:34] que le di como estaba
[198:35] haciendo esto rápido
[198:35] para poder reclamar
[198:36] las cosas
[198:37] no tuve tiempo
[198:38] como de leer
[198:39] cuáles serían
[198:40] como porque pues listo
[198:41] una cosa es el acceso
[198:42] que yo le doy a Houston
[198:43] que es con quien
[198:44] está haciendo directamente
[198:45] el negocio
[198:45] pero pues también
[198:46] le estoy dando acceso
[198:48] a un tercero
[198:48] que es compost
[198:49] entonces sí me gustaría
[198:50] como leer el contrato
[198:51] con ellos
[198:51] de pues qué pasa
[198:52] con esa data
[198:53] que va un tercero
[198:54] que no son ustedes
[198:55] y no son ellos
[198:55] pero sí
[198:56] yo creo que
[198:58] te podríamos compartir
[198:59] como toda la política
[199:00] de privacidad
[199:00] de data
[199:01] y todo lo que ellos
[199:02] ya traen
[199:03] y todos sus certificados
[199:04] creo que todos podemos compartir
[199:06] listo Darío
[199:07] gracias
[199:07] listo
[199:08] una cosa
[199:10] todos los que se están
[199:11] conectando
[199:11] dicen que no ven
[199:12] los créditos
[199:13] en Open Router
[199:13] tenemos un tema
[199:15] y es que Open Router
[199:16] tiene créditos
[199:17] que son promocionales
[199:18] y tiene otros créditos
[199:19] que son los que uno paga
[199:20] entonces dentro de Houston
[199:22] cuando ustedes conecten
[199:23] Open Router
[199:24] les va a salir
[199:24] como si tuvieran cero
[199:25] porque hasta ahorita
[199:26] estamos mostrando
[199:26] solo los que
[199:27] ustedes son pagos
[199:28] acá dice Purchased
[199:29] cero cero cero
[199:30] esto es lo que va a salir
[199:31] en Houston
[199:31] pero total disponibles
[199:33] tienen $9.92
[199:34] entonces estamos trabajando
[199:35] en mostrar los dos
[199:36] desde Houston
[199:36] pero para que
[199:37] para que lo sepan
[199:38] o sea si les va a dar
[199:39] los créditos
[199:39] están acá en la cuenta
[199:40] Open Router
[199:41] dice
[199:41] tengo $9.92
[199:43] listo
[199:43] listo
[199:45] sigamos
[199:46] les propongo que sigamos
[199:48] yo sé que hay varios
[199:51] que están perdidos
[199:52] se han quedado
[199:53] por favor
[199:53] les voy a volver a mandar
[199:54] la guía
[199:55] al menos para que vayan
[199:56] conectando a Pify
[199:57] todos los que se queden
[199:59] quédense hasta el final
[200:00] Juan Salinas
[200:01] si podemos
[200:01] mandemos un grupo
[200:02] de Whatsapp
[200:03] y hagamos que la gente
[200:03] se una
[200:03] para poderles dar soporte
[200:04] por ahí también
[200:05] cuando se acabe
[200:05] esta llamada
[200:06] de Zoom
[200:06] mandémoslo por ahí
[200:08] para que todos se unan
[200:09] es más
[200:11] si quieren de una vez
[200:12] denme un segundo
[200:13] y yo abro esto
[200:14] voy a hacer esto
[200:17] voy a pedir
[200:18] voy a abrir
[200:19] el grupo de Whatsapp
[200:19] que tenemos
[200:20] y voy a hacer
[200:21] que todos se unan ya
[200:22] para que podamos
[200:23] después de esta llamada
[200:24] poder seguirles dando soporte
[200:25] ok
[200:25] listo
[200:26] aquí ya está
[200:26] acá la mandó
[200:27] Juan Salinas
[200:27] por el chat
[200:28] listo
[200:29] y yo voy a compartir
[200:30] ese chat
[200:31] aquí
[200:31] voy a compartir
[200:32] un segundo
[200:33] el QR
[200:33] para que todos se unan
[200:34] es la única manera
[200:36] en que les vamos
[200:37] a poder ayudar
[200:37] les vamos a compartir
[200:38] todo por ahí
[200:38] nuevamente
[200:39] allá me está cargando
[200:41] el
[200:42] allá me está cargando
[200:44] listo
[200:48] tenganme ahí
[200:50] un minuto de paciencia
[200:51] mientras me carga
[200:52] Whatsapp Web
[200:52] listo
[200:54] por ahora
[200:57] solo necesito
[200:58] que se descarguen
[200:59] las tres cosas
[200:59] y entren a Houston
[201:01] ok
[201:01] Juan Salinas
[201:05] vamos mandando
[201:05] nuevamente
[201:06] vamos a mandar
[201:06] el grupo
[201:07] el chat
[201:08] mientras me carga
[201:09] mi Whatsapp Web
[201:10] copy link
[201:11] listo
[201:13] únanse acá
[201:14] por favor
[201:14] para que les podamos
[201:15] enviar
[201:15] todos los códigos
[201:17] todas las guías
[201:18] todo el soporte
[201:19] se los podamos dar ahí
[201:20] y sepamos que son los
[201:21] que ustedes están acá
[201:21] como intentando
[201:22] trabajar
[201:23] listo
[201:26] listo
[201:27] ahí ya me está abriendo
[201:28] en mi computador
[201:28] para yo poder compartir
[201:29] la pantalla
[201:30] y hacer
[201:31] un código QR
[201:33] rápidamente
[201:33] ok
[201:38] por favor
[201:39] vayanse uniendo
[201:39] a ese grupo
[201:40] de Whatsapp
[201:40] lo vamos a usar
[201:41] únicamente
[201:41] para temas relacionados
[201:42] a este
[201:43] Bootcamp
[201:44] ok
[201:44] mandarles las memorias
[201:45] que ustedes van a hacer
[201:47] troubleshooting
[201:47] por ahí
[201:48] listo
[201:50] ahí me está abriendo
[201:50] listo
[201:53] ahí estoy entrando
[201:54] los voy a invitar
[201:56] acá
[201:57] un segundo
[201:58] un segundo
[202:00] un segundo
[202:01] un segundo
[202:01] vía QR
[202:08] copiar link
[202:09] ah
[202:11] no me está dando
[202:11] copiar el QR
[202:12] ya
[202:15] ok
[202:16] voy a
[202:17] pedir a Houston
[202:18] que me haga un QR
[202:19] rápidamente
[202:19] y por favor
[202:23] unancia a ese QR
[202:24] listo
[202:33] listo
[202:37] no ha pasado nada
[202:38] hasta el momento
[202:38] solo estamos instalando
[202:40] las herramientas
[202:40] los que están
[202:41] perdiéndose
[202:41] por favor
[202:42] no se preocupen
[202:43] ya vamos a arrancar
[202:46] a hacer el build
[202:47] juntos
[202:47] vayanse uniendo
[202:48] a este grupo
[202:49] de Whatsapp
[202:49] que estamos poniendo
[202:50] en el chat
[202:51] ahí vamos a
[202:52] seguirles dando
[202:53] soporte
[202:53] después de
[202:54] esta
[202:55] llamada
[202:57] que si no les funcionan
[202:59] los créditos
[203:00] que de Appify
[203:00] que de Open Router
[203:01] no se preocupen
[203:02] les vamos a dar
[203:02] soporte ahí
[203:03] ok
[203:04] y
[203:06] listo
[203:08] acá
[203:08] para todos
[203:09] por favor
[203:10] vengan
[203:10] y escaneense
[203:11] este código QR
[203:13] para entrar al grupo
[203:13] de Whatsapp
[203:14] les voy a poner ahí
[203:14] 30 segundos
[203:15] para que podamos seguir
[203:16] somos
[203:18] 490 personas
[203:22] en esta llamada
[203:22] por favor
[203:23] escaneense
[203:23] este QR
[203:25] de Whatsapp
[203:25] les voy a mandar
[203:26] todo por ahí
[203:27] les voy a mandar
[203:27] las guías
[203:28] los códigos
[203:28] las grabaciones
[203:29] todas las memorias
[203:30] se las voy a mandar
[203:31] por ahí
[203:31] a los que están
[203:31] en este momento
[203:32] acá
[203:32] listo
[203:33] vayanse uniendo
[203:36] veo que hay 196
[203:37] miembros
[203:38] en el grupo
[203:38] de Whatsapp
[203:39] somos
[203:40] 500 personas
[203:41] en esta llamada
[203:42] por favor
[203:43] escaneense
[203:43] este QR
[203:44] escaneense
[203:47] escaneense
[203:48] escaneense
[203:48] esto
[203:49] ya los ayudamos
[203:53] William
[203:53] ya el equipo
[203:55] te ayuda
[203:55] Alejandra
[203:59] si no te deja
[204:00] poner en Open Router
[204:01] déjame ver
[204:04] qué pasó
[204:04] déjame lo guardo
[204:10] y se lo pido
[204:11] a la persona
[204:11] Open Router
[204:12] intenta quizás
[204:13] desde otro computador
[204:14] o desde tu celular
[204:17] perdón
[204:17] listo
[204:19] hay 200 personas
[204:20] en el grupo
[204:20] de Whatsapp
[204:20] por favor
[204:21] somos 500 personas
[204:22] en esta llamada
[204:23] de Zoom
[204:23] por favor
[204:24] escaneen este código QR
[204:27] para poderles ayudar
[204:28] listo
[204:31] hay unos que dice
[204:31] has reached the limit
[204:33] no imposible
[204:33] si solo
[204:34] si solo son 200
[204:36] y los límites
[204:36] son de 1000
[204:37] intenten por favor
[204:40] en un par de minutos
[204:42] listo
[204:45] los que están perdidos
[204:46] no se preocupen
[204:47] estamos uniéndonos
[204:48] a un grupo de Whatsapp
[204:49] para poderles dar
[204:50] detalles
[204:51] de las aplicaciones
[204:53] Appify
[204:54] Open Router
[204:55] las guías
[204:56] la grabación
[204:57] listo
[204:58] darle soporte
[204:59] bajarlo ahí
[205:01] 30 segundos más
[205:01] y arrancamos
[205:02] listo
[205:03] listo
[205:05] este dice por ahí
[205:07] que no puede continuar
[205:08] George García
[205:11] está escribiendo por ahí
[205:12] que si alguien tiene
[205:13] el código promocional
[205:14] de Open Router
[205:14] por otro grupo
[205:15] sí
[205:15] ya vamos a mandar
[205:16] todo por el grupo
[205:17] de Whatsapp
[205:17] también
[205:17] listo
[205:18] listos
[205:20] veo que se sigue
[205:20] uniendo gente
[205:21] ya van 290
[205:22] siganse uniendo
[205:22] por favor
[205:23] 30 segundos más
[205:24] hay 500 personas
[205:26] en esta llamada
[205:27] quiero que se una
[205:30] la mayor cantidad
[205:31] posible
[205:31] para que después
[205:32] podamos
[205:32] hacerles soporte
[205:34] y poderles mandar
[205:35] todas las cosas
[205:35] por ahí
[205:35] probablemente
[205:37] ya estamos
[205:37] en otros grupos
[205:38] de Whatsapp
[205:38] pero los que están acá
[205:39] son los que están
[205:40] en el Bootcamp
[205:40] todos ustedes
[205:41] entonces probablemente
[205:41] están al mismo ritmo
[205:42] van a tener problemas
[205:43] similares
[205:43] les podemos ayudar
[205:44] listo
[205:45] listo
[205:48] 3 minutos más
[205:50] 3 minutos más
[205:50] ya hay 316 personas
[205:52] en este grupo
[205:53] del Bootcamp
[205:54] vayan mandando
[205:56] y reportando
[205:57] todo lo que les está
[205:57] saliendo por ahí
[205:58] y Julián
[205:59] y Daniel
[206:00] de nuestro equipo
[206:01] y Juan
[206:02] están ayudando
[206:02] a responder cosas
[206:03] por ahí
[206:03] eso nos va a quedar
[206:04] ahí todas las fotos
[206:06] y les podemos solucionar
[206:06] mejor por ahí
[206:07] porque cuando Zoom
[206:08] se cierre
[206:08] se pierde todo el chat
[206:09] oigan y también
[206:10] creo que va a ser
[206:12] mucho más sencillo
[206:13] yo piné
[206:14] arriba del grupo
[206:15] un mensaje
[206:16] que decís
[206:16] escríbanme por privado
[206:17] ese es mi número
[206:18] de Whatsapp
[206:18] escríbanme los que estén
[206:19] teniendo problemas
[206:20] por ahí
[206:20] así les puedo ayudar
[206:21] uno a uno
[206:22] a resolverlo
[206:22] que seguro es más sencillo
[206:24] genial
[206:24] probablemente
[206:25] este te va a enloquecer
[206:26] el Whatsapp
[206:26] en 30 segundos
[206:27] pero vamos
[206:28] para adelante
[206:29] listo
[206:30] ya veo 328 personas
[206:32] somos 486
[206:34] en este Zoom
[206:34] y solo hay 328
[206:35] en el Whatsapp
[206:36] por favor escaneen
[206:39] este código
[206:39] con su celular
[206:40] y únanse
[206:40] y comiencen a mandar cosas
[206:41] ahora en su Whatsapp
[206:42] web en su computador
[206:43] también
[206:43] listo
[206:44] listo
[206:45] más adelante
[206:46] vuelvo y lo proyecto
[206:47] entonces volvamos acá
[206:48] recapitulo
[206:50] no ha pasado
[206:51] nada
[206:51] estamos instalando
[206:52] las herramientas
[206:52] del taller
[206:53] estamos instalando
[206:54] Houston
[206:55] estamos instalando
[206:56] Appify
[206:56] y estamos instalando
[206:57] Open Router
[206:58] los que se están
[206:59] sintiendo perdidos
[207:00] no se preocupen
[207:01] les vamos a mandar
[207:02] una guía
[207:03] como estas
[207:03] que les estoy mandando
[207:04] acá
[207:04] para que vayan
[207:06] y se descarguen
[207:07] las cosas
[207:07] listo
[207:09] ahí les vamos a mandar
[207:11] información
[207:12] de los códigos
[207:13] para redimir
[207:14] de cómo trabajar
[207:15] con nosotros
[207:15] todos se los voy a mandar
[207:16] por ahí
[207:16] listo
[207:17] listo
[207:19] quiero que vuelvan
[207:20] todos a mi pantalla
[207:21] en este momento
[207:22] listo
[207:22] antes de eso
[207:23] unas manitos
[207:24] levantadas
[207:25] unas manitos virtuales
[207:26] voy a llamar
[207:27] a estas tres personas
[207:28] y seguimos
[207:30] con la parte
[207:30] con la parte
[207:32] práctica
[207:32] listo
[207:33] Carlos Villamizar
[207:34] por favor
[207:34] abre tu micrófono
[207:35] te acabo el permiso
[207:36] para que
[207:36] te desmutes
[207:37] hola
[207:40] buenas
[207:40] tardes
[207:41] días
[207:42] en San Francisco
[207:44] no el problema
[207:45] es el código
[207:46] para redención
[207:47] me aparece
[207:48] ese mensaje
[207:49] de error
[207:49] listo
[207:50] el código
[207:51] era para
[207:52] las primeras
[207:53] 250 personas
[207:54] voy a revisar
[207:55] si ya
[207:55] las 250
[207:55] lo redimieron
[207:56] y si no
[207:57] le escribo
[207:57] al equipo
[207:58] de Open Router
[207:58] más tarde
[207:59] y
[208:00] les pido
[208:01] el favor
[208:01] que arreglen
[208:01] el código
[208:02] no se preocupen
[208:02] únanse al grupo
[208:03] de Whatsapp
[208:04] que estamos ahí
[208:04] pasando por el
[208:05] chat de Zoom
[208:06] y todos los que estén ahí
[208:07] no se preocupen
[208:08] se los vamos a volver a mandar
[208:09] listo
[208:10] dale
[208:11] Sandra
[208:12] Johanna
[208:12] tienes tu monitoreo
[208:13] cuéntame
[208:14] te voy a pedir
[208:15] que te desmutes
[208:16] ay hola
[208:23] hola
[208:24] muchas gracias
[208:25] por todo
[208:26] pero
[208:27] ya instalé
[208:29] ya instalé
[208:30] la aplicación
[208:31] de Houston
[208:32] ya las conecté
[208:34] me quedé
[208:35] en la instalación
[208:36] de Appify
[208:36] y de Router
[208:37] o sea
[208:38] escaneé los códigos
[208:39] con mi
[208:40] celular
[208:41] y allí
[208:42] allí hice
[208:44] la inscripción
[208:45] bueno
[208:46] todo el tema
[208:46] en Router
[208:48] me pidió
[208:48] el tema
[208:50] de mi tarjeta
[208:50] se los di
[208:51] pero
[208:52] ahora me perdí
[208:53] porque
[208:53] no ha pasado nada
[208:55] Sandra
[208:55] no te preocupes
[208:56] solo era abrirse
[208:57] las cuentas
[208:57] solo teníamos
[208:58] que abrir las cuentas
[208:59] y hasta ahora
[209:00] vamos a comenzar
[209:00] a usarlas
[209:01] ok
[209:01] pero no sé
[209:03] si abrió
[209:05] o no
[209:05] abrí las cuentas
[209:06] como hago
[209:06] para buscar
[209:07] nuevamente
[209:07] o para tenerlo
[209:08] todo en el computador
[209:10] pues ábrete
[209:11] Appify
[209:11] en el computador
[209:12] pon en Google
[209:13] Appify
[209:14] y login
[209:15] y haz login
[209:15] con la misma cuenta
[209:16] y la vas a encontrar
[209:17] si te pierdes
[209:19] no te preocupes
[209:19] los cupones
[209:21] ok
[209:23] ya
[209:24] a todos los que no han podido
[209:26] con los cupones
[209:26] les propongo que
[209:27] tomo un par de pantallazos
[209:29] y
[209:30] o si Julio o Daniel
[209:31] me ayudan a
[209:32] mostrarles por el
[209:33] grupo de WhatsApp
[209:34] como tienen que ir
[209:35] porque simplemente ir a
[209:36] sé que es un poquito
[209:38] enredado
[209:38] puede ser enredado
[209:39] pero tienen que ir a la parte
[209:40] de
[209:41] billing
[209:42] suscripción
[209:44] añadir código de promoción
[209:47] les podemos mandar
[209:48] un par de
[209:48] les voy a mandar
[209:50] acá
[209:50] este pantallazo
[209:51] acá
[209:51] rápidamente
[209:53] para que lo puedan ver
[209:54] donde es
[209:55] y acá
[209:56] les voy a mandar
[209:57] ahí por el grupo
[209:58] listo
[209:59] ok
[210:00] listo
[210:02] por ahí hay personas
[210:04] que están pidiendo
[210:04] el enlace
[210:05] si podemos ayudarlos
[210:06] por favor
[210:06] con el enlace
[210:07] Juan
[210:07] listo
[210:10] voy a
[210:11] seguir
[210:12] ok
[210:13] listo
[210:15] voy a seguir
[210:15] les estoy mandando
[210:16] ahí por el chat
[210:17] y les va a llegar
[210:19] todos mis códigos
[210:20] que ya expiraron
[210:20] también
[210:21] listo
[210:24] ahí a la izquierda
[210:26] donde dice
[210:26] billing
[210:26] suscripción
[210:27] y ahí
[210:28] eso
[210:29] y los que ya pudieron
[210:29] redimir
[210:30] por favor
[210:30] vayan mandando
[210:31] vayan mandando
[210:33] como lo hicieron
[210:33] y ayuden a que los demás
[210:35] aprendan en comunidad
[210:35] listo
[210:36] listo
[210:38] volvamos acá
[210:39] primer paso
[210:40] instalamos las herramientas
[210:43] no se preocupen
[210:44] que si no van a su mismo ritmo
[210:45] vamos a crear una guía
[210:46] para que lo puedan hacer
[210:47] a su propio ritmo
[210:47] y les grabamos
[210:48] yo que saliendo acá
[210:49] de aquí a 48 horas
[210:51] unos par de videitos
[210:53] como paso uno
[210:53] paso dos
[210:54] paso tres
[210:54] para que lo puedan hacer
[210:55] listo
[210:55] listo
[210:58] ahora
[210:59] vamos a instalar
[211:00] el agente
[211:00] necesito que todos
[211:01] los que ya tienen
[211:02] Houston
[211:02] vuelvan aquí
[211:03] por favor
[211:04] vuelvan
[211:04] vuelvan
[211:05] vuelvan
[211:05] a mi pantalla
[211:05] los que no han podido
[211:07] redimir
[211:07] Apify
[211:08] y Open Router
[211:09] no se preocupen
[211:10] que igualmente
[211:11] vamos a aprender
[211:12] de los que ya lo lograron
[211:13] y lo están mandando
[211:14] por el grupo de Whatsapp
[211:15] y les vamos a mandar
[211:16] pantallazos y guías
[211:17] listo
[211:18] les propongo que
[211:19] de ahora en adelante
[211:20] todas las cosas que tengan
[211:21] vayan mandándolo también
[211:22] por
[211:22] por acá
[211:25] por el chat
[211:25] dice Felipe
[211:26] deberías hacer el ejercicio
[211:27] de cómo hacer
[211:28] si se registra
[211:29] con una cuenta nueva
[211:29] para que todos vean
[211:30] porque no se ha avanzado
[211:31] y así creo que la gente
[211:32] puede ver todo
[211:33] si Miguel
[211:35] estoy de acuerdo
[211:36] el único tema
[211:38] es que si me voy
[211:39] a una cuenta nueva
[211:40] no voy a poder
[211:40] compartirles mi agente
[211:41] entonces les voy a compartir
[211:42] primero mi agente
[211:43] y luego si quieren
[211:44] hacemos todo el proceso
[211:45] ¿les parece?
[211:47] entonces
[211:47] lo único que necesito
[211:48] es todos los que ya
[211:49] se descargaron
[211:50] Houston
[211:50] necesito que
[211:52] lleguen a esta pantalla
[211:54] que está acá
[211:54] ¿ok?
[211:56] al lado izquierdo
[211:57] vuelvan todos
[211:58] a mi pantalla
[211:58] por favor
[211:59] vuelvan todos
[211:59] vuelvan todos
[212:00] vuelvan todos
[212:00] vuelvan todos
[212:04] les doy ahí
[212:07] cinco minutos
[212:07] vuelvan todos
[212:08] por favor
[212:08] listo
[212:09] ya que todos
[212:10] están acá
[212:10] en mi pantalla
[212:11] listo
[212:15] vuelvan todos
[212:16] cuando lleguen acá
[212:17] estén en Houston
[212:18] la manera más fácil
[212:21] de descubrir agentes
[212:22] va a ser la que
[212:23] les voy a contar
[212:23] acá al lado izquierdo
[212:25] tenemos algo que se llama
[212:26] la tienda de agentes
[212:28] ustedes le van a hacer
[212:30] clic ahí
[212:30] y ahí les van a comenzar
[212:31] a hacer los agentes
[212:32] que los demás
[212:33] comenzamos a crear
[212:34] en el momento
[212:35] Julián y yo
[212:36] somos los que estamos
[212:36] publicando estos agentes
[212:38] pero en un futuro
[212:39] muy cercano
[212:40] las personas de la comunidad
[212:41] que creen agentes
[212:42] los van a poder publicar
[212:43] aquí y compartir
[212:44] con otros
[212:48] agentes
[212:49] lo único que tienen que hacer
[212:50] es ir acá
[212:50] a la tienda de agentes
[212:51] tienen que ir acá
[212:54] a la tienda de agentes
[212:54] se van a poner
[212:55] Felipe
[212:56] y se van a encontrar
[212:58] con este que se llama
[212:58] vendedor
[213:00] le van a hacer clic
[213:01] lo van a revisar
[213:02] y le van a decir
[213:02] prueba la hora
[213:04] y le van a decir
[213:06] él te va a decir
[213:08] este es un agente
[213:09] que alguien te compartió
[213:10] quieres que Houston
[213:11] lo revise
[213:12] le eche un vistazo
[213:13] o confían
[213:13] esto es para precisamente
[213:15] evitar temas
[213:16] de inyecciones
[213:17] de prompt
[213:18] o que les estén
[213:18] intentando sacar seguridad
[213:19] ustedes les dicen
[213:20] sí que lo revise
[213:21] y Houston
[213:22] revisa todo
[213:23] esto es un
[213:25] agente de IA
[213:26] que está revisando
[213:27] para temas de ciberseguridad
[213:28] todo tal
[213:29] y una vez que ustedes
[213:30] ya tengan eso
[213:30] le dan
[213:31] continuar
[213:31] y le dan un nombre
[213:32] yo acá le voy a poner
[213:33] acá
[213:33] Pedro Vendedor
[213:35] me imagino
[213:36] cualquier cosa
[213:37] yo normalmente
[213:39] les pongo el rol
[213:41] para el cual
[213:41] yo los tengo
[213:42] y le dan
[213:43] continuar
[213:44] y acá le va a decir
[213:46] oigan
[213:46] este agente
[213:47] tiene unas skills
[213:49] yo creé
[213:49] este agente
[213:50] únicamente
[213:50] para esta sesión
[213:51] solo les compartí
[213:52] un skill
[213:53] si tuviera más skills
[213:55] yo podría decidir
[213:56] qué compartir
[213:57] y decir que no
[213:57] podría compartirlo
[213:59] sin skills
[213:59] pero se los voy a compartir
[214:00] con el skill
[214:01] de la publicación
[214:01] de LinkedIn
[214:02] ok
[214:02] le dan continuar
[214:04] también
[214:06] eligen
[214:07] ustedes eligen
[214:08] qué aprendizajes
[214:09] quieren traerse
[214:10] yo ya le tengo
[214:10] un montón
[214:10] de aprendizajes
[214:11] cómo funcionan
[214:12] las herramientas
[214:13] cuáles son
[214:14] errores
[214:14] errores
[214:15] que han tenido
[214:16] que ya le he mejorado
[214:18] entonces yo les diría
[214:18] a ustedes
[214:19] pues tráganle
[214:19] todas las memorias
[214:20] y ya
[214:22] se traen su agente
[214:23] y cuando ustedes
[214:25] se traigan el agente
[214:26] él en este momento
[214:27] Houston
[214:28] lo está
[214:28] lo está
[214:30] importando
[214:31] esto lo acabamos
[214:33] de lanzar
[214:34] ayer
[214:34] así que
[214:34] les pido paciencia
[214:35] si tenemos
[214:36] algunos
[214:36] temitas
[214:38] que se demora
[214:38] y cuando él
[214:40] se trae acá
[214:41] fíjense que yo me acabo
[214:42] a traer a Pedro
[214:42] vendedor
[214:43] y me dice
[214:44] en configuración
[214:45] seguramente
[214:48] él se va a traer
[214:48] todas las cosas
[214:49] bueno acá
[214:50] tuvo un problema
[214:50] pero él se va a traer
[214:53] todo mi agente
[214:54] se va a traer
[214:55] mi agente
[214:55] con instrucciones
[214:56] se va a traer
[214:56] mi agente
[214:57] con habilidades
[214:58] se va a traer
[214:59] mi agente
[214:59] con todo
[215:00] listo
[215:02] creo que
[215:02] al cambiarle
[215:03] el nombre
[215:03] creo que
[215:04] se me pasó
[215:05] sin
[215:05] se va a demorar
[215:07] 30 segundos
[215:08] 30 segundos
[215:09] listo
[215:09] como esto está
[215:10] en la nube
[215:10] está trayendo
[215:11] todo
[215:11] y se está
[215:12] seteando
[215:12] listo
[215:13] así de fácil
[215:15] es que ustedes
[215:16] se traigan
[215:16] mi agente
[215:18] ok
[215:18] mi agente
[215:19] que ya tiene
[215:19] todos los skills
[215:20] que yo les pasé
[215:21] con las instrucciones
[215:23] con las herramientas
[215:24] que tienen que utilizar
[215:25] listo
[215:27] revisemos
[215:28] listo
[215:31] genial
[215:31] gracias Juli
[215:32] por darme
[215:33] el
[215:34] recorderiz
[215:35] si ustedes ven
[215:36] yo me acabo
[215:37] de traer a este
[215:37] Pedro Vendedor
[215:38] y él
[215:39] en su configuración
[215:40] ustedes ya se traen
[215:40] todas las instrucciones
[215:41] que yo escribí
[215:42] se traen los skills
[215:44] solo les pasé uno
[215:45] se traen todas
[215:48] mis memorias
[215:49] y lo podrían
[215:51] comenzar a utilizar
[215:52] en un chat
[215:52] inmediatamente
[215:53] listo
[215:55] voy a repetir
[215:58] lo que hice
[215:59] si se están perdiendo
[216:01] vuelvan a mi pantalla
[216:03] un segundo
[216:03] por favor
[216:04] estos son los pasos
[216:06] para traerse la gente
[216:07] y tengo que actualizar
[216:08] la guía
[216:08] porque la guía
[216:09] que ustedes tienen
[216:09] ya está desactualizada
[216:11] es
[216:12] vienen a la tienda
[216:12] de agentes
[216:13] en la tienda
[216:15] de agentes
[216:15] van a buscar
[216:16] mi nombre
[216:16] Felipe
[216:17] van a darse cuenta
[216:20] que yo soy
[216:20] el cofundador
[216:21] de Houston
[216:22] y tengo
[216:22] un agente
[216:23] que tengo compartido
[216:24] en la
[216:24] en la
[216:24] en la
[216:25] agent store
[216:25] que es como
[216:26] el app store
[216:26] y le dicen
[216:28] probar ahora
[216:28] y ya
[216:29] le dicen
[216:29] que lo revise
[216:30] que continúe
[216:31] y lo agregan
[216:32] listo
[216:33] y así de fácil
[216:36] ustedes se acaban
[216:37] de traer
[216:37] mi agente
[216:38] la idea es que
[216:39] a medida que más personas
[216:40] utilicen Houston
[216:41] y suban
[216:42] agentes
[216:43] en este momento
[216:44] los puedan compartir
[216:45] gratuitamente
[216:45] pero en el futuro
[216:46] inclusive
[216:46] puedan cobrar
[216:47] por hacer
[216:48] agentes
[216:49] y compartirlos
[216:49] con más personas
[216:50] listo
[216:51] voy a darles
[216:53] tres minutos
[216:54] quiero que vayan
[216:55] por favor
[216:56] a la tienda
[216:56] de agentes
[216:57] y busquen
[216:58] Felipe
[216:58] y van a añadir
[217:00] van a añadir
[217:02] mi agente
[217:02] ok
[217:03] para hacerlo
[217:04] abren Houston
[217:05] tienda de agentes
[217:06] y en la barra
[217:07] buscan
[217:07] Felipe
[217:08] solo hay un Felipe
[217:09] en este momento
[217:09] soy yo
[217:10] dice
[217:12] Johanna
[217:13] no me sale
[217:14] la tienda
[217:14] de agentes
[217:15] tienes la última
[217:16] versión
[217:17] Johanna
[217:17] por favor
[217:18] reviste
[217:18] tienes la última
[217:18] versión
[217:26] puedo suplantar
[217:27] por algo más
[217:27] lo puedes cambiar
[217:29] por algo más
[217:29] yo lo exporté
[217:31] con Apolo
[217:31] usando Apolo
[217:32] pero tú puedes
[217:33] usar lo que tú utilices
[217:34] y si no tienes cuenta
[217:35] él te va a decir
[217:35] no tengo cuenta Apolo
[217:36] créate una
[217:37] o conéctala
[217:38] listo
[217:39] listo
[217:42] voy a ir abriendo acá
[217:43] para preguntas
[217:45] hay unas personas
[217:46] que no han podido
[217:46] terminar de instalar
[217:48] Houston
[217:49] no se preocupen
[217:50] mándelo por el chat
[217:51] de Whatsapp
[217:52] y ya nosotros
[217:52] vamos revisando
[217:53] listo
[217:58] hay alguien que dice
[217:58] connect your AI
[217:59] para todas las personas
[218:01] que hasta ahora
[218:02] siguen instalando
[218:02] Houston
[218:03] y no le pasa más
[218:05] por favor
[218:06] váyanlo mandando ahí
[218:07] ya nuestro equipo
[218:08] está revisando
[218:09] internamente
[218:09] debería dejarte
[218:12] conectarle
[218:13] una cuenta
[218:14] cubricil
[218:17] SAS
[218:17] debería dejar
[218:18] conectarte una cuenta
[218:19] listo
[218:20] listo
[218:25] hasta ahora
[218:25] estamos
[218:26] trayéndonos
[218:26] el agente
[218:27] ok
[218:27] dice
[218:31] una duda
[218:32] en el último apartado
[218:33] que dice
[218:33] elige que aprendizajes
[218:34] conservar
[218:35] es posible
[218:35] hacer una modificación
[218:36] para cambiar
[218:37] una de las órdenes
[218:37] o solo se pueden apagar
[218:38] Nicolás
[218:40] tráetelas todas
[218:41] y luego
[218:41] cuando ya lo tengas
[218:43] siempre las puedes cambiar
[218:45] acá en configuración
[218:46] en memoria
[218:46] la traes y la puedes
[218:48] o borrar
[218:48] o la puedes
[218:49] simplemente editar
[218:50] entonces yo te diría
[218:51] tráetelas todas
[218:52] y si necesitas editarla
[218:54] le pones el lápiz
[218:55] y las editas
[218:56] ok
[218:56] tráete todas las memorias
[219:00] Nicolás
[219:00] listo
[219:02] Colombia Tour
[219:03] código beta
[219:04] hay videos tutoriales
[219:05] de cómo usar
[219:06] Houston
[219:06] si Pablo
[219:07] se los mandamos
[219:08] por
[219:08] se los mandamos
[219:10] por el grupo
[219:10] de Whatsapp
[219:10] Carolina Hoyos
[219:14] no le sale
[219:14] de la tienda
[219:15] de agentes
[219:15] por favor
[219:16] intenta
[219:17] con la última
[219:19] versión
[219:19] de la aplicación
[219:20] o sea
[219:21] si tenías
[219:21] una versión
[219:22] de antes
[219:22] métete a la página
[219:24] web
[219:24] descárgate la última
[219:25] versión
[219:25] y ahí te debería salir
[219:26] si no
[219:27] por favor
[219:28] escríbenos ahí
[219:28] por el grupo
[219:29] de Whatsapp
[219:29] y te ayudamos
[219:29] Daniel P dice
[219:33] al traer a la gente
[219:34] uno trae todo lo que lo compone
[219:35] pero cuando ya trabaja
[219:36] sobre la cuenta de uno
[219:37] ya empieza a crear
[219:38] sus memorias
[219:38] y sus datos propios
[219:39] o son compartidos
[219:40] también con
[219:41] con quien hizo la gente
[219:42] Daniel
[219:43] nada de lo que tú
[219:44] pongas en tu espacio
[219:45] es compartido
[219:45] con el que hizo la gente
[219:46] todo esto es tuyo
[219:47] tú podrías elegir
[219:48] no ponerle ninguna memoria
[219:50] lo que pasa es que
[219:50] yo ya tuve unas memorias
[219:51] y te las compartí
[219:52] pero todo esto
[219:53] son archivos de texto
[219:53] que ahora viven
[219:54] en tu máquina virtual
[219:55] de Houston
[219:56] y en tu cuenta
[219:56] yo no tengo acceso
[219:58] a ninguna de tus memorias
[219:59] ok
[219:59] Efraín Duarte
[220:05] por favor escríbenos
[220:06] por Whatsapp
[220:06] por el grupo
[220:07] Sandra Vargas
[220:11] te dice que Houston
[220:12] necesita quien dice
[220:13] sesión en Antropic
[220:13] antes de responder
[220:14] si entonces
[220:15] hasta ahora trajimos
[220:16] el agente
[220:17] ok
[220:18] acabamos de traer
[220:19] al agente
[220:19] pero imagínense
[220:21] que cuando uno
[220:22] se trae un agente
[220:22] pues igualmente
[220:23] toca conectarle
[220:24] modelos de IA
[220:25] si ustedes no tienen
[220:26] ningún modelo de IA
[220:26] conectado todavía
[220:27] el agente
[220:28] no tiene ningún motor
[220:29] para pensar
[220:30] entonces asegúrense
[220:32] que acá
[220:32] donde dice
[220:33] modelos de IA
[220:34] tengan alguna
[220:35] de estas cuentas
[220:36] conectadas
[220:36] Antropic
[220:38] ChatGPT
[220:39] OpenRouter
[220:39] que les acabamos
[220:40] de dar 10 dólares
[220:41] y de hecho
[220:42] OpenRouter
[220:43] tiene algunos modelos
[220:44] que son gratuitos
[220:44] o pueden conectar
[220:47] cualquiera
[220:47] de estos proveedores
[220:48] que hay acá
[220:48] 22 proveedores
[220:50] ok
[220:54] listo
[221:00] voy a hacer
[221:00] una recapitulación
[221:01] de lo que estamos
[221:01] haciendo
[221:02] ustedes en este momento
[221:03] están instalando
[221:04] el agente
[221:05] están yendo
[221:06] están yendo
[221:07] a Houston
[221:07] a la aplicación
[221:08] de Houston
[221:08] están yendo
[221:09] al lado izquierdo
[221:10] donde dice
[221:11] tienda
[221:11] el agent store
[221:12] en el agent store
[221:14] están buscando
[221:15] mi nombre
[221:15] que es Felipe
[221:16] y en Felipe
[221:17] les va a salir
[221:18] el único agente
[221:18] que yo estoy compartiendo
[221:19] en el store
[221:20] que es el vendedor
[221:21] ok
[221:21] y ahí le van a dar
[221:23] pruébalo
[221:23] ahora
[221:24] se van a traer
[221:25] la gente
[221:25] con todos sus skills
[221:26] con toda su memoria
[221:27] con todas sus
[221:29] skills
[221:30] ok
[221:30] listo
[221:35] voy a leer
[221:36] algunas de las cosas
[221:37] que están preguntando
[221:38] no pudo
[221:41] el quien caballero
[221:42] dice
[221:42] no pude enviar
[221:43] gmail
[221:43] rechazo el envío
[221:44] por permisos
[221:45] insuficientes
[221:45] en la conexión
[221:46] a todos los que
[221:47] hayan tenido
[221:47] problemas de permisos
[221:49] pueden ir siempre
[221:50] a integraciones
[221:51] buscar la integración
[221:53] que no se conectó
[221:53] bien
[221:54] y hacerle click
[221:55] y le dicen
[221:55] desconectar
[221:56] y luego le pueden
[221:57] reconectar
[221:58] ok
[221:58] y también
[221:59] al respecto de esto
[222:01] sé que hay varias
[222:02] personas que me están
[222:02] escribiendo por whatsapp
[222:03] que están en el
[222:04] están en el
[222:05] tutorial
[222:06] y les pasó esto
[222:08] entonces están
[222:08] trabados
[222:08] y no pueden avanzar
[222:09] porque la gente
[222:10] está
[222:10] o sea
[222:11] para poder avanzar
[222:12] les tiene que mandar
[222:13] el correo
[222:13] pero no pusieron
[222:14] los permisos
[222:15] y no pueden volver
[222:16] estoy en este momento
[222:17] sacando una actualización
[222:18] para Houston
[222:19] que debe estar
[222:19] más o menos
[222:19] en una hora
[222:20] para que todas las
[222:21] personas que les pasó
[222:22] eso van a ver
[222:23] debajo de la tarjetica
[222:24] algo que dice
[222:24] saltar tutorial
[222:25] y así van a poder
[222:27] saltarse el tutorial
[222:27] y llegar ahorita
[222:28] donde está Felipe
[222:28] ok
[222:30] gracias por
[222:31] reportarlo
[222:33] listo
[222:38] donde encuentro
[222:39] el API key
[222:40] de Open Router
[222:40] para hacer la integración
[222:41] en Houston
[222:42] listo
[222:43] Juan Diego
[222:44] todos los que ya
[222:45] sigamos
[222:46] todos los que ya
[222:47] tienen el agente
[222:47] acá al lado izquierdo
[222:49] ustedes siempre van a
[222:50] encontrar todo lo más
[222:51] importante que tienen
[222:52] que hacer
[222:53] dentro de Houston
[222:54] si en algún momento
[222:56] están perdidos
[222:56] siempre hay algo acá
[222:58] que dice
[222:59] cuando entren un agente
[223:00] les va a decir
[223:01] guíame
[223:02] a verlo
[223:06] abro por acá
[223:07] creo que lo quitamos
[223:08] Juli
[223:08] el guíame
[223:10] bueno
[223:11] los guío yo
[223:12] el botón de guíame
[223:14] ah
[223:15] vea configuración
[223:16] aquí
[223:17] y ahí sale
[223:18] arriba
[223:18] de primero
[223:19] de primerísimo
[223:20] ah listo
[223:21] es que creo que lo quitamos
[223:22] de donde lo teníamos acá
[223:24] listo
[223:25] acá van a tener espacios
[223:27] todos
[223:28] síganme acá un momento
[223:29] al lado izquierdo
[223:31] van a vivir
[223:32] sus agentes
[223:33] acá en la mitad
[223:37] tienen
[223:37] el espacio
[223:39] de trabajo
[223:39] de los agentes
[223:40] este es un tablero
[223:41] Kanban
[223:41] donde ustedes pueden
[223:42] invitar a las personas
[223:44] de su equipo
[223:44] acá pueden iniciar
[223:48] una nueva misión
[223:48] un nuevo chat
[223:49] acá arriba
[223:50] van a tener la actividad
[223:51] acá el panel
[223:56] de configuración
[223:56] donde están
[223:57] las instrucciones
[223:57] las habilidades
[223:58] la memoria
[223:59] todos sus agentes
[224:01] las integraciones
[224:04] acá tienen
[224:04] mil integraciones
[224:05] preconectadas
[224:06] en Houston
[224:06] que ustedes ya van
[224:07] a poder utilizar
[224:08] para que ustedes
[224:09] puedan solo conectarse
[224:11] y ya está
[224:11] también ahí mismo
[224:13] le pueden conectar
[224:14] cosas que no estén ahí
[224:15] las pueden conectar
[224:15] de manera segura
[224:16] a través de un chat
[224:17] tienen algo
[224:19] que se llama
[224:19] rutinas
[224:20] rutinas
[224:20] es trabajo
[224:21] que se puede
[224:21] programar
[224:22] o con tiempo
[224:23] o basado en eventos
[224:24] por ejemplo
[224:24] todas las mañanas
[224:25] programar
[224:26] que le haga seguimiento
[224:27] a los clientes
[224:28] que están abiertos
[224:28] en el CRM
[224:29] archivos
[224:33] todos los archivos
[224:33] que la gente
[224:34] vaya generando
[224:35] el centro de misiones
[224:37] donde van a ver
[224:38] todas las diferentes
[224:39] misiones
[224:39] de los diferentes agentes
[224:40] yo acá tengo
[224:40] unos 10 agentes
[224:41] trabajando conmigo
[224:42] en integraciones
[224:45] nuevamente
[224:45] pueden ver
[224:46] todas las integraciones
[224:47] que están conectadas
[224:48] en el espacio
[224:48] en los modelos
[224:51] de IA
[224:51] acá al lado izquierdo
[224:52] Juan Diego
[224:53] tú que estabas
[224:53] preguntando
[224:54] acá en los modelos
[224:55] de IA
[224:55] pueden encontrar
[224:56] todos los proveedores
[224:57] incluyendo
[224:57] Open Router
[224:58] y Open Code
[224:59] ahí simplemente
[225:01] le dan un clic
[225:02] y lo conectan
[225:03] y en configuración
[225:05] ustedes pueden
[225:06] volver a ver el tour
[225:07] pueden cambiar
[225:08] el idioma
[225:09] pueden ponerlo
[225:10] en modo oscuro
[225:10] pueden invitar
[225:11] personas a su espacio
[225:12] de trabajo
[225:12] ¿listo?
[225:14] acá al lado izquierdo
[225:16] con la
[225:16] con el simbolito
[225:18] de más
[225:18] pueden agregar
[225:19] a otro agente
[225:20] cuando lo agregan
[225:22] ya hay
[225:23] algunos que están
[225:24] algunos ejemplos
[225:25] en la biblioteca
[225:26] pueden usar
[225:27] esa biblioteca
[225:27] ¿ok?
[225:28] ya tienen
[225:29] algunas instrucciones
[225:30] tienen algunas herramientas
[225:31] en esta biblioteca
[225:32] y
[225:35] ese es como
[225:37] el viaje
[225:37] que pueden hacer
[225:38] con Houston
[225:38] ¿ok?
[225:39] entonces
[225:40] voy a volver acá
[225:41] a la parte
[225:41] de la tienda de agentes
[225:42] por favor
[225:43] vayan a
[225:44] tienda de agentes
[225:45] y busquen
[225:45] Felipe
[225:46] y quiero que
[225:47] por favor
[225:47] instalen el agente
[225:49] para que podamos
[225:50] hacer el
[225:50] ustedes mismos
[225:51] puedan hacer el demo
[225:52] ¿listo?
[225:54] hay varias manos
[225:55] levantadas
[225:56] y veo que el chat
[225:57] está
[225:57] veo que el chat
[225:59] está
[226:00] hay varias preguntas
[226:01] acá preguntan
[226:01] y el rincón
[226:02] oigan
[226:03] tengo que conectar
[226:04] vía API
[226:04] o vía suscripción
[226:05] chat GPT
[226:06] y Antropic
[226:07] se conectan
[226:08] vía suscripción
[226:09] simplemente
[226:09] tienen que hacer
[226:10] login
[226:10] si están viendo
[226:11] mi pantalla
[226:11] le dan conectar
[226:12] y conectar
[226:13] y simplemente
[226:14] le van a tener
[226:14] que dar
[226:15] login
[226:15] ¿ok?
[226:17] acá en modelos
[226:18] de guía
[226:19] les voy a mostrar
[226:20] voy a desconectar
[226:21] uno
[226:21] voy a cerrar sesión
[226:22] para que puedan
[226:23] ver el proceso
[226:23] si yo me quisiera
[226:27] conectar
[226:27] a OpenAI
[226:28] que es con
[226:29] la suscripción
[226:30] ustedes acá
[226:31] pueden filtrarlo
[226:32] cuáles son modelos
[226:33] de suscripción
[226:33] o cuáles son
[226:34] pago por uso
[226:35] en suscripción
[226:36] tenemos a
[226:37] Antropic
[226:37] tenemos a
[226:38] GitHub
[226:38] tenemos a
[226:39] Copilot
[226:40] tenemos a
[226:41] Quen
[226:41] tenemos a
[226:42] Open Router
[226:43] y Open Code
[226:44] entonces acá
[226:45] en OpenAI
[226:45] yo me voy a conectar
[226:46] le voy a decir
[226:47] me voy a conectar
[226:48] y me dice
[226:51] a cuál te quieres
[226:51] conectar
[226:52] y le voy a decir
[226:52] a esta cuenta
[226:53] listo
[226:55] conectar
[226:56] y así de fácil
[226:58] se me conectó
[226:59] a mi chat GPT Plus
[227:01] listo
[227:02] y ya está listo
[227:03] para ser usado
[227:03] dentro de mis agentes
[227:05] listo
[227:08] vamos
[227:08] quedan
[227:09] quiero que me pongan
[227:12] en el chat
[227:13] quienes ya pudieron
[227:15] instalar
[227:15] el agente
[227:17] quiero que me manden
[227:18] acá por el chat
[227:19] yo
[227:21] yo
[227:21] yo
[227:21] lista
[227:22] todo que
[227:22] ya
[227:22] ya
[227:23] ya
[227:23] ya
[227:23] ya
[227:23] ya
[227:23] ya
[227:24] ya
[227:24] ya
[227:24] wow
[227:24] bueno listo
[227:25] hay un montón de gente
[227:25] listo
[227:27] listo
[227:28] hay los que no lo han podido
[227:30] instalar
[227:30] pónganlo por el chat
[227:31] de Whatsapp
[227:32] para tenerlos
[227:33] mapeados
[227:34] listo
[227:35] listo
[227:39] veo que hay un montón de gente
[227:40] que ya lo pudo conectar
[227:41] y otros que no
[227:42] los que no lo han podido
[227:43] conectar
[227:43] manden por el chat
[227:44] de Whatsapp
[227:45] para que nuestro equipo
[227:46] los pueda mapear
[227:47] y los que sí lo pudieron conectar
[227:49] manden acá por el chat
[227:50] de Zoom
[227:50] que sí
[227:50] listo
[227:53] vamos ahora sí
[227:55] a la hora de la verdad
[227:56] quiero que todos vayan
[227:58] a su agente
[228:00] que es el representante
[228:02] de ventas
[228:03] que acabamos de hacer
[228:04] y lo que van a hacer
[228:06] es que
[228:06] van a ir
[228:07] y van a copiarse
[228:08] mi publicación de LinkedIn
[228:09] que se las voy a pasar acá
[228:10] por el grupo de Whatsapp
[228:12] y por el chat
[228:13] de Zoom
[228:13] y lo que quiero que hagan
[228:17] es
[228:18] quiero que se abran
[228:19] una nueva misión
[228:20] ah
[228:23] antes de eso
[228:23] antes de eso
[228:24] tienen que tener
[228:25] asegúrense que ya
[228:26] las integraciones
[228:27] están también conectadas
[228:28] por favor
[228:29] busquen Appify
[228:30] Appify los deja conectarse
[228:34] por
[228:34] vía API
[228:35] o vía MSP
[228:36] la más fácil es MSP
[228:37] conéctense con el MSP
[228:39] y conéctense
[228:41] a Google Sheets
[228:42] listo
[228:43] conéctenle
[228:44] Google Sheets
[228:44] también
[228:45] conéctenle
[228:49] esas dos herramientas
[228:50] listo
[228:52] dicen por ahí
[228:53] hay algún manual o guía
[228:54] de uso de Houston
[228:55] estamos subiendo
[228:56] videos tutoriales
[228:57] a YouTube
[228:57] ¿cómo saco el MSP?
[229:04] váyanse a la sección
[229:04] de integraciones
[229:05] de su agente
[229:06] seleccionen el agente
[229:07] que acaban de instalar
[229:08] váyanse a la sección
[229:10] de configuraciones
[229:11] perdón
[229:11] de integraciones
[229:12] y busquen acá
[229:14] Google Sheets
[229:15] acá en la barra de búsqueda
[229:17] pongan
[229:17] Google Sheets
[229:19] e instalen
[229:19] Google Sheets
[229:20] váyanse también
[229:22] a Appify
[229:22] y busquen el MSP
[229:24] de Appify
[229:24] listo
[229:28] conecten Google Sheets
[229:31] y conecten Appify
[229:32] listo
[229:34] los que están conectando
[229:35] a Appify
[229:36] vía API
[229:37] les va a pedir
[229:37] que pongan una API
[229:39] pero hay un MSP
[229:41] también
[229:41] conéctense con el MSP
[229:42] aquí abajo
[229:43] busquen Appify
[229:44] en la barra de búsqueda
[229:45] vayan a integraciones
[229:46] de su agente
[229:46] métanse a la gente
[229:48] váyanse a integraciones
[229:49] y búsquense acá
[229:52] Appify MSP
[229:54] ahí le dan click
[229:55] le dan conectar
[229:56] y lo único
[229:58] que les va a pedir
[229:59] es que ustedes
[229:59] se conecten
[230:00] a la cuenta
[230:00] con la que abrieron
[230:01] una
[230:01] con la que abrieron
[230:03] una cuenta
[230:04] y ahí se las va a mostrar
[230:04] listo
[230:05] conecten las cuentas
[230:10] conecten las cuentas
[230:10] por favor
[230:11] listo
[230:15] una vez tengan ahí
[230:16] conectado
[230:17] Appify
[230:17] y tengan conectado
[230:18] Google Sheets
[230:19] si les está pidiendo
[230:21] un token
[230:22] o les está pidiendo
[230:24] un API key
[230:24] es porque están conectando
[230:25] a Appify
[230:26] vía API
[230:26] si les está pidiendo
[230:28] vía MSP
[230:29] es esta que ya veo
[230:30] que Arturo García
[230:31] mandó
[230:32] muy bien
[230:32] ya tienes todo
[230:33] conectado Arturo
[230:34] conectenla ahí
[230:37] y ahí ustedes
[230:39] ya la van a poder utilizar
[230:40] listo
[230:40] listo
[230:43] sé que estamos cerca
[230:44] al tiempo
[230:45] nos vamos a demorar
[230:46] unos 15 minutos más
[230:47] mientras terminamos esto
[230:48] porque arrancamos
[230:49] 30 minutos tarde
[230:50] porque las personas
[230:51] o personas que eran tarde
[230:52] nos vamos a pasar
[230:54] unos 15 minutos
[230:55] quiero que
[230:57] los que ya tienen
[230:58] el agente
[230:59] y las integraciones
[231:00] quiero que hagan
[231:01] lo siguiente
[231:01] se van a ir a
[231:03] en curso
[231:03] se van a abrir
[231:05] una nueva tarea
[231:06] una nueva misión
[231:07] van a seleccionar
[231:09] esta habilidad
[231:11] que les va a salir
[231:12] que dice
[231:12] comentarios de LinkedIn
[231:13] a Google Sheets
[231:14] y le van a pegar
[231:15] el
[231:16] enlace
[231:18] de mi publicación
[231:19] de LinkedIn
[231:20] que se las pasé
[231:21] por el chat
[231:22] de WhatsApp
[231:22] ok
[231:22] si les está pidiendo
[231:26] un token
[231:26] de API
[231:27] de Appify
[231:28] es porque
[231:29] lo están utilizando
[231:29] con la API
[231:30] y no con el MSP
[231:31] es más fácil
[231:33] conectarle el MSP
[231:34] si no saben
[231:36] cómo encontrarlo
[231:36] pregúntenle a Houston
[231:37] ¿dónde encuentro
[231:38] ese token
[231:39] de la API?
[231:41] listo
[231:41] todo lo que no sepan
[231:42] ustedes se lo pueden
[231:42] preguntar a Houston
[231:43] en lenguaje natural
[231:44] explícame
[231:45] cómo hacerlo
[231:46] si no
[231:47] acá ustedes se van a dar
[231:48] cuenta que hay una cosa
[231:48] que dice
[231:49] Appify MSP
[231:50] lo conectan ahí
[231:51] le hacen click
[231:52] y conectarlo
[231:53] es tan sencillo
[231:54] como
[231:54] hacer login
[231:55] en su cuenta
[231:56] de Appify
[231:56] ok
[231:57] listo
[232:03] esto es lo que vamos a hacer
[232:04] pongan acá
[232:06] pongan mi comentario
[232:07] y pongan mi
[232:08] publicación de LinkedIn
[232:09] con esa habilidad
[232:10] y pónganlo a correr
[232:12] ok
[232:12] repítelo el MCP
[232:18] vayan a integraciones
[232:19] en integraciones
[232:21] ponen Appify
[232:22] y en Appify
[232:23] les sale acá
[232:23] Appify MSP
[232:25] ¿lo ven?
[232:32] Appify MSP
[232:33] ahí estoy repitiéndole
[232:35] el MSP
[232:35] voy a hacer
[232:37] toda una guía
[232:37] de todo esto
[232:38] paso por paso
[232:39] para que ustedes mismos
[232:40] puedan ir a su ritmo
[232:40] no se preocupen
[232:41] listo
[232:45] para que ustedes mismos
[232:45] lo puedan conectar
[232:46] listo
[232:51] por ahí veo que una persona
[232:53] está mandando
[232:54] que utilizo esto
[232:57] Colombia
[232:58] en Tour
[232:58] veo que lo mandaste
[233:00] sin utilizar
[233:01] la habilidad
[233:03] si no estoy mal
[233:04] acuérdense que
[233:05] no solamente
[233:06] mandarle por el chat
[233:07] sino que tienen que hacer
[233:08] de click
[233:09] a el skill
[233:10] que quieren utilizar
[233:11] ok
[233:12] o le tienen que decir
[233:14] oigan
[233:14] quiero que
[233:16] quiero que
[233:18] crees
[233:20] una base
[233:21] de datos
[233:23] de comentarios
[233:24] de LinkedIn
[233:25] basado en este post
[233:28] listo
[233:31] y acuérdense que
[233:33] en la parte teórica
[233:34] yo les dije
[233:34] que
[233:35] un agente
[233:36] primero
[233:37] cuando ustedes le dicen esto
[233:38] va y lee la descripción
[233:39] de los skills
[233:40] que tiene
[233:40] y toma la decisión
[233:41] si las usa o no
[233:42] ahí
[233:43] él la usaría
[233:43] ok
[233:44] para algunos
[233:49] se les está trabando
[233:50] en la parte de signing
[233:51] con Antropic
[233:52] ya lo está arreglando
[233:53] el equipo
[233:53] y lo vamos a sacar
[233:54] en la próxima actualización
[233:55] para que lo puedan
[233:56] utilizar bien
[233:57] ok
[233:58] Apolo también pide
[234:01] API Key
[234:01] si
[234:02] Apolo
[234:03] si toca por API Key
[234:05] díganle a Houston
[234:06] enséñame
[234:07] cómo encontrar
[234:07] la API Key
[234:08] de Apolo
[234:09] y muy seguramente
[234:10] lo que tienen que hacer
[234:11] les muestro
[234:12] es
[234:12] entra en Apolo
[234:13] les voy a mostrar
[234:16] se abren una cuenta
[234:17] en Apolo
[234:17] es gratis
[234:18] es gratis
[234:19] la primera cuenta
[234:20] la pueden abrir
[234:20] les da hasta 100 créditos
[234:22] acá al lado izquierdo
[234:24] van a encontrar
[234:25] una sección
[234:26] que se llama
[234:27] acá
[234:30] Admin Settings
[234:31] ven todos los
[234:33] ven todos los settings
[234:34] y acá
[234:36] por acá abajo
[234:37] está
[234:38] integraciones
[234:39] y en integraciones
[234:41] les dice
[234:41] MSP
[234:42] API Keys
[234:43] yo lo que les recomiendo
[234:45] es que
[234:46] si ustedes no tienen
[234:46] ni idea
[234:47] que es una API
[234:47] o una MSP
[234:48] y no tienen ni idea
[234:49] dónde encontrarlo
[234:49] pregúntenle a Houston
[234:50] oye
[234:51] dónde puedo encontrar esto
[234:52] ayúdame a encontrarla
[234:53] en la web
[234:54] y él les pasa
[234:54] la documentación
[234:55] y les pasa todo
[234:56] listo
[234:56] listo
[234:59] preguntan por acá
[235:00] vamos a abrir
[235:00] unas preguntas
[235:02] vamos a abrir
[235:02] el espacio
[235:02] para preguntas
[235:03] ¿qué es eso
[235:05] en curso
[235:05] necesita tu atención
[235:07] y listo
[235:08] esto es un espacio
[235:09] de trabajo
[235:10] cada una de estas
[235:11] es una misión
[235:11] diferente
[235:12] una misión
[235:13] es un chat
[235:14] que tú tienes
[235:15] con un
[235:15] modelo de IA
[235:17] dentro de ese agente
[235:18] eso es una tarea
[235:19] que le pusiste a la gente
[235:20] cada una de estas
[235:21] es una tarea
[235:22] diferente
[235:22] por ejemplo
[235:23] yo acá estaba
[235:23] generando un código
[235:25] de Whatsapp
[235:25] acá estaba
[235:26] con los comentarios
[235:27] de LinkedIn
[235:27] cuando el agente
[235:29] tú lo tienes
[235:30] en una opción
[235:30] que se llama
[235:31] preguntar antes
[235:32] cada que él
[235:34] necesite tu atención
[235:34] siempre va a estar acá
[235:35] en necesito tu atención
[235:36] si tú lo pones
[235:38] en piloto automático
[235:39] él simplemente
[235:39] va a seguir
[235:40] y va a hacer todo
[235:41] ¿ok?
[235:42] cuando uno está arrancando
[235:43] yo normalmente
[235:43] lo pongo en preguntar antes
[235:45] para que me haga preguntas
[235:46] cuando no esté seguro
[235:47] y yo le puedo dar
[235:47] buen feedback
[235:48] ¿ok?
[235:50] open router
[235:50] se debe integrar
[235:51] la respuesta es
[235:53] a través de
[235:55] el
[235:55] modelo de IA
[235:57] en modelos de IA
[235:58] tú le das conectar
[235:58] cuando lo conectes
[236:00] él te va a pedir
[236:01] una API key
[236:02] y es lo mismo
[236:03] dile
[236:04] ¿dónde consigo
[236:05] esa API key?
[236:07] normalmente
[236:07] todas las plataformas
[236:09] lo tienen acá
[236:09] al lado izquierdo
[236:10] tú vas a algo
[236:11] que se llama
[236:11] settings
[236:13] o acá dice
[236:13] acá clarito
[236:14] API keys
[236:15] y tú te metes
[236:16] y creas
[236:17] una nueva API key
[236:18] le pones un nombre
[236:21] y la creas
[236:23] y la copias
[236:24] y la pegas
[236:25] y se la pones acá
[236:26] cuando él te la pida
[236:27] de manera segura
[236:27] ¿listo?
[236:30] cualquier cosa
[236:30] que ustedes no sepan
[236:31] o se sientan perdidos
[236:33] no se preocupen
[236:33] pregúntenle a Houston
[236:34] directamente
[236:35] Houston está diseñado
[236:36] para que pueda ser
[236:37] utilizado por usuarios
[236:38] 100% no técnicos
[236:40] ¿listo?
[236:42] cualquier cosa
[236:42] que ustedes no hayan
[236:43] podido hacer
[236:44] díganle
[236:44] no he podido hacer esto
[236:45] ¿cómo hago esto?
[236:47] y él lo va a poder hacer
[236:48] dice
[236:51] conecté por el MCP
[236:52] pero la gente me pidió
[236:52] ahora conectar por el API
[236:53] César
[236:54] la razón por la cual
[236:56] te voy a estar pidiendo eso
[236:57] es porque
[236:58] mi agente
[236:59] yo lo conecté
[237:00] vía API
[237:00] y no vía MCP
[237:01] debe ser por eso
[237:02] y a mí se me olvidó
[237:03] ponerlo conectarlo
[237:04] con MCP
[237:04] y tú lo conectaste
[237:05] y te pedí a la API
[237:06] gracias
[237:06] dile por el chat
[237:08] oye
[237:08] cámbiame la API
[237:09] para que funcione
[237:10] con el MSP
[237:11] de Appify
[237:12] listo
[237:14] Houston
[237:15] ¿qué modelo de LLM
[237:16] utiliza cuando se le pregunta algo?
[237:19] elige que tú
[237:20] le preguntes
[237:21] si estás en el onboarding
[237:22] este es un onboarding
[237:23] que tenemos prediseñado ya
[237:24] esto es una
[237:25] al principio
[237:27] es una simulación
[237:28] de la experiencia
[237:30] pero cuando tú ya entras
[237:31] es con los modelos
[237:32] que tengas conectados
[237:33] ¿listo?
[237:36] listo
[237:37] voy a volver por acá
[237:38] listo
[237:43] yo les voy a pasar
[237:44] todo esto también
[237:45] voy a abrir el espacio
[237:47] para preguntas
[237:47] sé que estamos
[237:48] en el tiempo
[237:50] yo quiero ser respetuoso
[237:51] del tiempo
[237:51] de todos ustedes
[237:52] yo me voy a quedar acá
[237:53] respondiendo las preguntas
[237:55] que ustedes tengan
[237:56] con mi equipo
[237:56] sin problema
[237:58] me puedo quedar
[237:58] los próximos 20 o 30 minutos
[238:01] entonces antes de eso
[238:02] lo primero es que les quiero dar
[238:04] gracias por estar acá
[238:05] en este bootcamp de hoy
[238:06] gracias por pasarse
[238:08] cuatro horas de su sábado
[238:10] cuando podrían estar
[238:10] en un parque
[238:12] viendo películas
[238:12] con la familia
[238:13] haciendo otra cosa
[238:14] están acá
[238:14] aprendiendo de inteligencia artificial
[238:16] quiero que se den un aplauso
[238:17] a todos ustedes
[238:18] porque
[238:19] ustedes
[238:20] hacen parte
[238:21] del 90%
[238:21] de la población
[238:22] o más bien
[238:23] hacen parte
[238:24] del 1%
[238:25] de la población
[238:25] que está aprendiendo
[238:26] de ella
[238:26] y que va más adelante
[238:28] que todos los demás
[238:29] les agradezco muchísimo
[238:31] por estar acá
[238:32] nuevamente
[238:34] les recuerdo que
[238:35] en este grupo de whatsapp
[238:37] a todos los que no les logró avanzar
[238:38] reporten todo lo que les está pasando
[238:40] en ese grupo
[238:41] en ese grupo
[238:42] les voy a compartir otra vez
[238:43] los códigos
[238:44] las guías
[238:45] cuando hagamos los videos
[238:46] los videos
[238:47] les voy a compartir todo
[238:48] o sea
[238:49] todos los que están acá
[238:49] les vamos a compartir eso
[238:51] en la entrada gratuita
[238:52] Houston también
[238:53] y quiero recordarles
[238:54] que somos una empresa
[238:55] también
[238:55] o sea
[238:56] nosotros nos dedicamos
[238:56] a hacer implementaciones
[238:58] de guía en empresas
[238:59] y nos dedicamos
[239:00] a vender las licencias
[239:01] a nivel empresarial también
[239:02] así que
[239:03] si en sus empresas
[239:04] están teniendo algún tema
[239:06] en el que están pensando
[239:07] en hacer implementaciones
[239:08] de guía
[239:08] quiero que nos tengan
[239:09] en su mente
[239:10] para que nos llamen
[239:12] listo
[239:14] abramos el espacio
[239:15] para preguntas
[239:16] yo sé que hay algunos
[239:17] que siguen por ahí
[239:18] siguen por ahí
[239:19] sé que fue pesado
[239:20] esto es todo un tema
[239:21] no se preocupen
[239:22] si se perdieron
[239:22] ir de 0 a 1
[239:23] en 4 horas
[239:24] es difícil
[239:25] vamos a dejar tutoriales
[239:27] paso a paso
[239:27] listo
[239:28] voy a comenzar
[239:29] a abrir los micrófonos
[239:30] de cada uno
[239:31] para que
[239:32] podamos hacer preguntas
[239:33] ¿les parece?
[239:35] Alejandra Rincón
[239:36] te tengo en mi
[239:37] en mi pantalla
[239:39] si quieres
[239:39] abre tu micrófono
[239:40] por favor
[239:41] y voy a llamar
[239:42] a todos los que tengan
[239:43] la mano y todo levantado
[239:44] y les voy a dejar
[239:45] esto acá
[239:45] para que
[239:46] hola
[239:48] hola
[239:50] hola
[239:52] uy tienes como un
[239:53] como un
[239:54] reverberación
[239:55] bueno vamos con
[240:01] otra persona
[240:01] mientras que
[240:02] arreglan ese temita
[240:03] ITS Javier González
[240:05] si quieres
[240:06] abre tu micrófono
[240:07] y
[240:07] haznos
[240:09] ¿cuál es tu pregunta?
[240:17] espérate
[240:17] te dejo abrir el micrófono
[240:18] ya
[240:18] voy a darle el premiso
[240:20] a las personas
[240:21] que se puedan desmutear solas
[240:22] hola Felipe
[240:22] buenas tardes
[240:23] hola ¿qué tal?
[240:24] ¿cómo estás?
[240:25] bien
[240:25] es que tengo
[240:26] varias preguntas
[240:27] uno es que
[240:28] se instala
[240:29] el
[240:30] Houston
[240:31] y comienza a conectar
[240:33] digamos conecté
[240:34] el correo
[240:34] conecté
[240:35] con el
[240:37] OpenAI
[240:38] y luego
[240:39] pues él
[240:41] mantiene como una ventana
[240:42] pero ustedes han hablado
[240:43] de que
[240:43] toda la versión actual
[240:45] es
[240:46] en web
[240:47] entonces no sé si es que
[240:48] hice algo más
[240:49] pero a mí pues
[240:49] siempre me sale
[240:50] es
[240:50] como la pantalla
[240:51] donde está todo lo de Houston
[240:53] eso es correcto ¿cierto?
[240:55] si eso es correcto
[240:56] o sea
[240:56] lo único que va a pasar
[240:57] es que se va a enchufar
[240:58] al modelo de OpenAI
[240:59] pero lo vas a utilizar
[241:01] dentro de Houston
[241:01] de acuerdo
[241:03] listo
[241:03] y ya luego
[241:04] quisiera es como
[241:06] tener una guía
[241:06] porque pues la verdad
[241:07] no había trabajado
[241:09] esta parte
[241:09] entonces ¿dónde puedo
[241:10] encontrar una guía
[241:11] donde tenga el paso a paso
[241:13] porque no pude conectar
[241:14] el API
[241:14] y nada
[241:15] les estoy mandando
[241:18] por el grupo de WhatsApp
[241:19] en nuestra página
[241:20] estamos subiendo las guías
[241:21] lo que pasa es que
[241:22] acabamos de hacer una actualización
[241:23] al producto ayer
[241:24] y la guía quedó
[241:25] desactualizada hoy
[241:26] pero acá tú te metes
[241:27] a la página web
[241:28] y hay guías
[241:29] en español
[241:30] tengo
[241:30] tenemos dos montadas
[241:31] te la voy a pasar
[241:33] acá por el grupo
[241:34] o sea las voy a pasar
[241:35] por el grupo de WhatsApp
[241:36] se los voy a pasar
[241:37] todo ordenado
[241:37] y tenemos
[241:39] un tutorial
[241:40] de YouTube
[241:41] donde puedes ir
[241:41] paso por paso
[241:42] a tu ritmo
[241:43] vamos a actualizar
[241:44] esta guía
[241:44] y antes del lunes
[241:45] seguramente
[241:45] la van a tener
[241:46] ¿te parece?
[241:47] eso
[241:47] y lo tercero
[241:49] era que pues
[241:49] obviamente
[241:50] no tuve la opción
[241:52] de acceder
[241:53] a los
[241:53] a los códigos
[241:54] de
[241:55] se los pasamos
[241:56] todos en la guía
[241:57] tú los vas a ver acá
[241:58] crea tus cuentas
[242:00] acá están todos los enlaces
[242:01] vamos a añadir
[242:02] OpenRouter
[242:03] para que sigan todos los pasos
[242:04] para poder hacerlo
[242:04] a su ritmo
[242:06] esa
[242:06] esa OpenRouter
[242:07] y la otra
[242:07] que ustedes decían
[242:08] que tenía créditos
[242:09] Appify y OpenRouter
[242:10] Appify tiene 75 dólares
[242:12] te sirve dos meses
[242:14] y OpenRouter
[242:14] tienes 10
[242:15] de acuerdo
[242:16] listo
[242:17] muchas gracias
[242:18] con gusto
[242:19] listo
[242:20] sigamos por acá
[242:21] Carlos Villamizar
[242:22] por favor abre tu micrófono
[242:24] y cuéntanos
[242:25] cuál es tu pregunta
[242:26] nuevamente
[242:28] gracias Felipe
[242:29] la consulta es la siguiente
[242:30] entiendo que
[242:31] con Houston
[242:31] yo puedo crear
[242:33] mis propios agentes
[242:34] ¿correcto?
[242:35] correcto
[242:36] y esos agentes
[242:37] que creo
[242:38] quedan en la biblioteca
[242:39] de agentes de Houston
[242:41] disponibles
[242:42] solo para mí
[242:43] no
[242:43] solo son privados
[242:45] o sea
[242:45] mira
[242:46] este es tu espacio personal
[242:48] cuando tú los crees
[242:49] te van a quedar aquí al lado
[242:51] si tú quieres invitar
[242:52] miembros de tu equipo
[242:52] los invitas
[242:53] invitando compañeros
[242:55] listo
[242:56] y si tú el día de mañana
[242:58] quisieras publicarlo
[242:59] a la tienda de Houston
[243:00] le das
[243:00] los tres punticos
[243:01] le das
[243:02] exportar una copia
[243:03] y los puedes actualizar
[243:05] los puedes publicar
[243:06] en la tienda
[243:07] o los podrías descargar
[243:08] para dárselos
[243:09] a alguien
[243:10] pero
[243:10] no
[243:12] o sea
[243:12] todo esto es 100% privado
[243:13] y también
[243:16] en la tienda
[243:16] o sea
[243:17] hay varias opciones
[243:18] en la tienda
[243:18] tú lo puedes poner
[243:19] para que sea público
[243:19] para todo el mundo
[243:20] o lo puedes subir
[243:21] en la tienda
[243:22] para que sea privado
[243:23] y compartírselo
[243:23] a un amigo
[243:24] o colega
[243:24] lo que sea
[243:25] con un enlace
[243:26] entonces
[243:26] nadie más lo puede ver
[243:27] solo la gente
[243:28] la que tú le des acceso
[243:28] o los puedes tener
[243:29] también subidos
[243:30] en la tienda
[243:30] en caso que no sé
[243:31] quieras tenerlos
[243:32] en varias cuentas tuyas
[243:33] o sea
[243:34] porque estás en varios equipos
[243:35] pero quieres solamente
[243:36] tú verlos
[243:37] eso también es posible
[243:38] sí
[243:40] listo
[243:43] sigamos acá
[243:44] te propongo
[243:45] Ana Rodríguez
[243:46] por favor
[243:47] abre tu micrófono
[243:48] y cuéntanos
[243:48] cuál es tu pregunta
[243:49] hola Felipe
[243:52] oye
[243:52] gracias
[243:53] qué productazo
[243:54] es súper sencilla
[243:56] me quedé
[243:58] en la instrucción
[243:59] para
[243:59] la gente
[244:01] el skill de la gente
[244:02] porque le pegué
[244:03] directamente tu link
[244:04] pero teníamos que acompañarlo
[244:05] con una instrucción
[244:06] ¿me recuerdas
[244:07] esa parte?
[244:09] mira
[244:09] te la recuerdo
[244:10] claro que sí
[244:11] para añadir mi agente
[244:13] lo único que tienes que hacer
[244:14] es
[244:14] vas a Houston
[244:15] vas a la tienda
[244:17] agentes
[244:17] todo lo tengo
[244:19] ahora ya estoy pegando
[244:20] el link
[244:20] en el skill
[244:22] de
[244:22] el ultimito
[244:25] abres una nueva misión
[244:27] y lo que haces es
[244:29] ahí te va a salir
[244:29] la única skill
[244:30] que está dentro
[244:31] de esa gente
[244:31] que yo compartí
[244:32] le das click
[244:32] ahí estoy
[244:33] y le dices
[244:34] quiero que crees
[244:35] una base de datos
[244:36] y acá está
[244:36] te la va a pasar
[244:37] acá por el chat
[244:38] de Zoom
[244:38] este es el enlace
[244:39] de mi publicación
[244:40] de link
[244:40] pero lo que tú puedes hacer
[244:42] es ve y encuéntrate
[244:43] cualquier publicación
[244:44] de link
[244:44] que tenga comentarios
[244:45] en tu industria
[244:46] y pégasela también
[244:47] y ahí arranca
[244:49] todo el proceso
[244:50] y si él no tiene
[244:51] las integraciones
[244:52] te va a decir
[244:52] oye Ana
[244:53] conéctame a Google Sheets
[244:54] oye Ana
[244:55] conéctame a Appify
[244:56] oye Ana
[244:56] conéctame
[244:57] y te va a ayudar
[244:57] a conectarlo
[244:58] increíble
[245:01] bueno
[245:01] feliz
[245:01] no lo volverá a hacer
[245:04] porque me quemo
[245:04] otra vez todos mis créditos
[245:05] no no no
[245:06] era solo eso
[245:08] me faltaba
[245:08] esa instrucción
[245:10] pero hazlo
[245:12] y si tú tienes
[245:13] otras redes
[245:13] como Instagram
[245:14] como TikTok
[245:14] dile oye
[245:15] que podría hacer
[245:16] algo similar
[245:17] en Instagram
[245:17] ayúdame a montarme
[245:18] algo
[245:18] o en TikTok
[245:19] o como
[245:20] y comienza a chatear
[245:21] con Houston
[245:22] y a preguntarle
[245:22] cosas como
[245:23] deja tu curiosidad
[245:24] que te guíe
[245:25] y creo que la ingenuidad
[245:27] es una ventaja
[245:28] en el mundo
[245:29] de la IA
[245:29] porque las personas
[245:30] que saben mucho
[245:31] dicen no
[245:31] eso no se puede
[245:32] las que no tienen IA
[245:33] preguntan
[245:33] oiga será
[245:34] que puedo hacer esto
[245:35] y Houston
[245:36] te va a decir
[245:36] mira existe
[245:36] esta herramienta
[245:37] esta herramienta
[245:37] esta herramienta
[245:38] esta herramienta
[245:38] conéctalas
[245:39] Pablo
[245:41] listo
[245:42] muchísimas gracias
[245:43] increíble
[245:43] con gusto
[245:44] gracias por venir
[245:45] Pablo
[245:46] donguia
[245:47] por favor
[245:47] abre tu micrófono
[245:48] tenemos 21 manitas
[245:50] levantadas
[245:50] así que los voy a llamar
[245:51] a todos
[245:52] todos están muy bienvenidos
[245:53] a quedarse
[245:54] si seguimos aprendiendo
[245:55] unos los otros
[245:55] saludo
[245:58] desde Venezuela
[245:59] bueno tenía varias
[246:00] inquietudes
[246:01] una es la posibilidad
[246:02] de generar API
[246:03] o soluciones
[246:04] con Houston
[246:05] la otra es
[246:07] si yo puedo usar
[246:08] Gemini
[246:08] como tutor
[246:09] como guía
[246:10] aunque Houston
[246:11] tiene su facilitador
[246:13] o su tutor
[246:14] interno
[246:14] pero de repente
[246:16] en la fase inicial
[246:17] mientras instalo
[246:18] yo pudiera
[246:18] con una guía
[246:19] que ustedes nos suministren
[246:20] adjuntarla en Gemini
[246:22] o en Notebook LM
[246:24] y generar
[246:25] como un paso a paso
[246:26] ante trabas
[246:28] en el proceso previo
[246:29] o para
[246:31] robustecer
[246:32] ese agente
[246:32] interno
[246:33] que tienes tú
[246:34] como facilitador
[246:35] la otra es
[246:37] yo vengo
[246:38] del mundo Echo
[246:38] y en el mundo Echo
[246:40] están los software
[246:41] de modelado 3D
[246:42] hay mucho software
[246:44] yo vengo
[246:45] de la
[246:45] yo soy del lado
[246:46] abierto
[246:47] del OpenBee
[246:48] ok
[246:49] entonces
[246:49] yo puedo integrar
[246:51] ese agente
[246:52] mediante API
[246:53] para solicitarle
[246:55] reportes de data
[246:56] sobre todo
[246:57] de Big Data
[246:58] en cuanto a
[246:59] cantidades materiales
[247:01] computométricos
[247:02] hacer análisis
[247:03] procesos
[247:04] de
[247:05] de
[247:06] de integración
[247:07] ¿no?
[247:07] y
[247:08] hay una opción
[247:10] también
[247:10] sobre
[247:11] desempeñarse
[247:12] como
[247:12] Chief Digital Office
[247:14] ante organizaciones
[247:16] del sector
[247:16] a Echo
[247:17] que
[247:18] que no han
[247:18] empezado
[247:19] el mundo digital
[247:20] que tienen
[247:21] gran temor
[247:22] y uno
[247:23] por más que sea
[247:24] es acucioso
[247:25] y trata de
[247:26] de meterse
[247:27] en esas honduras
[247:28] pero no tiene
[247:28] las fortalezas
[247:29] que pueden tener
[247:30] un programador
[247:31] sí
[247:31] entonces
[247:32] existe la posibilidad
[247:34] de
[247:35] establecer
[247:36] alianzas
[247:37] tipo
[247:37] embajador
[247:38] de marca
[247:39] tipo
[247:40] de representante
[247:41] de producto
[247:41] para
[247:43] apoyar
[247:44] y robustecer
[247:45] la gestión
[247:45] como Chief
[247:46] Digital Officer
[247:47] sí
[247:48] te las mandamos
[247:49] por el grupo
[247:50] de WhatsApp
[247:50] tenemos un grupo
[247:51] de partners
[247:51] abierto
[247:52] tú aplicas
[247:53] y nos cuentas
[247:53] por qué quieres
[247:54] ser partner
[247:54] o embajador
[247:55] y ya está
[247:56] nos ponemos en contacto
[247:57] contigo
[247:57] Pablo
[247:58] genial
[247:59] creo que
[248:00] en la época
[248:01] de día
[248:01] ya no es el ingeniero
[248:04] el que tiene
[248:05] trae más valor
[248:06] necesariamente
[248:06] sino la persona
[248:07] que tiene mucha
[248:08] experiencia
[248:08] de industria
[248:08] y puede
[248:09] con lenguaje
[248:09] natural
[248:10] hacer todas
[248:11] estas automatizaciones
[248:12] y agentes
[248:12] creería yo
[248:13] correcto
[248:15] el pensamiento crítico
[248:16] la expertise
[248:17] ayuda mucho
[248:17] con la inteligencia
[248:19] artificial
[248:19] correcto
[248:21] bueno
[248:21] tenemos por acá
[248:22] Andrés Solano
[248:24] un gustazo
[248:25] verte por acá
[248:25] cuatro horas
[248:26] abre tu micrófono
[248:28] cuéntale a la gente
[248:29] desde dónde te conectas
[248:30] a qué te dedicas
[248:30] y cuál es tu pregunta
[248:31] ahí estás
[248:35] no te escuchamos
[248:36] aún
[248:38] desconectale los audífonos
[248:44] de pronto
[248:44] no Andrés
[248:48] no te escuchamos
[248:49] ah ya
[248:51] ahora sí
[248:51] ahora sí
[248:51] ahí ya me escuchan
[248:54] ya
[248:54] no felicitarlos
[248:57] primero
[248:57] por este contenido
[248:58] tan valioso
[248:59] me conecto
[249:00] desde Medellín
[249:01] Antioquia
[249:02] y ahora estoy
[249:03] haciendo consultoría
[249:04] de analítica
[249:05] y esto
[249:06] pues
[249:06] abre muchas
[249:08] posibilidades
[249:08] para poder
[249:09] hacerlo
[249:10] de la mejor
[249:10] forma
[249:11] y
[249:14] no me acuerdo
[249:16] qué era lo que
[249:17] estaba haciendo
[249:17] la pregunta
[249:20] entonces
[249:20] nada
[249:21] solamente
[249:21] como felicitarlos
[249:23] listo Andrés
[249:24] yo sé que tú eres
[249:25] un usuario
[249:25] bastante sofisticado
[249:26] usas modelos locales
[249:27] un montón de cosas
[249:28] así que
[249:29] úsala
[249:29] y cuéntanos
[249:30] denos contando por ahí
[249:32] gracias por estar acá
[249:33] lo valoro mucho
[249:33] dale
[249:34] listo
[249:35] vamos a darle
[249:36] la palabra
[249:37] a más personas
[249:37] los que ya
[249:39] los que no tienen
[249:40] preguntas
[249:40] por favor
[249:40] bajen la manito
[249:41] virtual
[249:41] porque si la tienen
[249:42] arriba
[249:42] yo sigo
[249:43] llamándolos
[249:44] Miguel Miranda
[249:45] abre tu micrófono
[249:46] por favor
[249:47] y
[249:48] cuál es tu pregunta
[249:50] hola
[249:54] Felipe
[249:55] bueno
[249:56] primero pues
[249:57] darle las gracias
[249:58] por
[249:59] este
[250:00] este espacio
[250:01] yo
[250:01] ya vengo
[250:02] siguiéndolos
[250:03] ya
[250:03] por el lado
[250:04] de Martín
[250:05] y Salomón
[250:06] mi pregunta
[250:09] es
[250:09] bueno
[250:10] yo tengo
[250:10] un equipo
[250:11] ahorita
[250:11] de trabajo
[250:12] de dos
[250:14] personas más
[250:15] y yo
[250:15] pues en total
[250:16] tres
[250:16] pues la idea
[250:17] es
[250:17] incluir más
[250:19] hay posibilidad
[250:21] de
[250:21] de incluir
[250:23] de compartir
[250:23] estos
[250:24] estos agentes
[250:25] pues a mi equipo
[250:26] de trabajo
[250:26] tengo entendido
[250:27] que sí
[250:28] pero no me quedo
[250:29] muy claro
[250:29] cómo
[250:29] Miguel
[250:31] gracias por esa
[250:32] pregunta
[250:32] les voy a mostrar
[250:33] a todos
[250:33] cuando tú te armas
[250:34] un agente
[250:35] y esa es una
[250:36] esa es una
[250:37] gran pregunta
[250:37] cuando tú te armas
[250:39] un agente
[250:39] todos tienen
[250:41] ustedes una manera
[250:42] de añadir personas
[250:43] a su equipo
[250:43] o a ese agente
[250:44] acá donde
[250:45] dice todos
[250:46] le dicen
[250:48] invitar compañeros
[250:49] y ahí les dice
[250:51] a qué espacio
[250:52] de trabajo
[250:52] los quieres
[250:52] los quieres invitar
[250:55] yo acá tengo
[250:56] Houston
[250:56] y tengo
[250:57] otros que estoy
[250:57] probando
[250:58] les dicen
[250:59] Houston
[251:00] le dice
[251:01] ah tendría que
[251:01] mover a la gente
[251:02] entonces
[251:02] ok
[251:03] producto
[251:03] es que ya ni me acuerdo
[251:05] en cuál de los
[251:05] espacios estoy yo
[251:07] estoy en el personal
[251:07] bueno
[251:09] ustedes le dirían
[251:09] invitar acá
[251:10] le dicen
[251:11] crear un espacio
[251:12] de trabajo nuevo
[251:13] un equipo
[251:13] nuevo
[251:14] y ahí mismo
[251:15] tú le mandas
[251:15] las invitaciones
[251:16] a esa persona
[251:17] sino también
[251:18] acá en configuración
[251:19] te vas a dar cuenta
[251:20] que
[251:21] bueno
[251:22] acá les va a salir
[251:23] cuando ya lo vuelves
[251:24] un espacio de trabajo
[251:25] de equipo
[251:25] ahí te sale
[251:26] aquí
[251:27] te va a salir
[251:28] si quieres
[251:29] invitar a personas
[251:30] al equipo
[251:31] pero si no
[251:32] lo que te diría
[251:32] es créate un agente
[251:33] y acá dale
[251:34] invitar compañeros
[251:36] ok
[251:37] y ahí en invitar
[251:38] compañeros
[251:39] ellos llegan acá
[251:40] y todos van a caer
[251:41] a este tablero
[251:42] vale
[251:42] o Juli
[251:48] si estás por ahí
[251:48] también
[251:49] bienvenido
[251:49] si
[251:51] me puedes repetir
[251:52] es como estoy
[251:52] respondiendo
[251:53] 400 whatsapps
[251:54] ah ya
[251:55] que como útil
[251:55] como pueden añadir
[251:57] al multiplayer
[251:57] entonces la manera
[251:58] que yo les estoy diciendo
[251:59] es acá
[251:59] invitar compañeros
[252:01] entonces
[252:01] en este momento
[252:03] tú estás mostrándoles
[252:04] un perfil
[252:05] personal
[252:05] que toda la gente
[252:06] va a tener personal
[252:07] gratis
[252:07] en este no hay colaboración
[252:08] por eso es personal
[252:09] ah ya ya
[252:10] para comenzar a colaborar
[252:11] tienes que crear un equipo
[252:12] ahí lo crean
[252:13] Felipe ya tiene creados varios
[252:14] puedes abrir cualquiera
[252:15] los que tengas creados
[252:16] y una vez entras ahí
[252:18] entra a los
[252:20] a los que dice product
[252:20] que es los que
[252:21] tú creaste
[252:22] que es los que tú
[252:23] eres el dueño
[252:23] ah listo
[252:23] dale dale
[252:24] entonces ustedes crean
[252:25] un equipo
[252:26] y allá a la izquierda
[252:27] se van a
[252:28] doyce settings
[252:29] puedes cambiarlo a español
[252:30] para que sea más claro
[252:31] este pequeño momento
[252:32] entonces van a doyce configuración
[252:34] y si bajan
[252:35] hay algo que va a decir
[252:36] bajan un poquito
[252:37] más
[252:38] es que creo que
[252:39] esto los creé justo antes
[252:40] y me pasó a mi personal
[252:41] ah
[252:42] pero no
[252:43] acá
[252:44] ya
[252:44] ya
[252:45] ya te entiendo
[252:46] acá
[252:48] espacio de trabajo
[252:49] dice administración
[252:50] sí
[252:51] dice equipo
[252:53] administración
[252:53] y ahí dice personas
[252:54] y ahí puedes invitar
[252:56] a tus compañeros
[252:57] para esto vamos a sacar
[252:58] también varias guías
[252:59] porque sabemos que es algo
[253:00] nuevo que está saliendo
[253:01] en Houston
[253:02] sabemos que es algo que
[253:02] jamás
[253:03] se ha usado con agentes
[253:05] de inteligencia artificial
[253:06] no conocemos ninguna empresa
[253:07] que esté haciendo esto
[253:08] de manera exitosa
[253:09] entonces justo
[253:10] vamos a mandarles
[253:12] todas las guías
[253:12] para que entiendan
[253:13] cómo poder tener agentes
[253:14] y colaborar en equipo
[253:15] sí
[253:16] yo lo que diría
[253:17] es como
[253:17] créate unos agentes
[253:18] creo que lo tengo
[253:20] ya
[253:21] créate un agente
[253:22] y invítate a la gente
[253:24] a compartirle a esa gente
[253:25] invítate a tus compañeros
[253:26] de trabajo
[253:26] ¿listo?
[253:30] listo
[253:30] listo
[253:32] sigo llamando
[253:33] personas por acá
[253:34] que veo con la mano
[253:34] hay 21 personas
[253:36] con las manos levantadas
[253:37] si hay 21 personas
[253:38] nos quedamos
[253:39] con las 21 personas
[253:40] listo
[253:41] Daniel Niego
[253:44] por favor
[253:44] abre tu micrófono
[253:45] y haz tu pregunta
[253:48] hola
[253:49] ¿qué tal?
[253:50] muchas gracias por todo
[253:51] yo soy de Perú
[253:52] mi pregunta es
[253:54] ¿qué pasa si en Apolo
[253:56] estoy con un correo
[253:58] en Apify
[253:59] estoy con otro correo
[254:00] y en Houston
[254:01] estoy con otro correo
[254:02] lo primero es
[254:04] ¿se puede?
[254:05] ¿hay algún problema?
[254:06] y lo segundo es
[254:07] ¿en algún momento
[254:08] puedo cambiar los correos
[254:09] o tengo que crearme
[254:10] cuentas nuevas en cada uno?
[254:12] listo
[254:12] te voy a responder
[254:12] de la manera personal
[254:14] y la manera empresarial
[254:15] a nivel Houston
[254:16] no pasa nada
[254:16] tú puedes tener
[254:18] múltiples cuentas
[254:19] con diferentes correos
[254:19] y está bien
[254:20] a nivel personal
[254:21] pues
[254:22] mantenerse organizado
[254:23] va a ser un reto
[254:24] tú
[254:25] en cada integración
[254:26] vas a darte cuenta
[254:28] que por ejemplo
[254:28] te voy a mostrar
[254:29] Gmail
[254:30] yo ya la tengo conectada
[254:31] con un correo
[254:32] le puedes conectar
[254:33] múltiples correos
[254:34] como múltiples cuentas
[254:35] ya lo tengo con
[254:36] mi cuenta de Houston
[254:37] pero le podría poner
[254:38] mi personal
[254:39] le podría poner 5 cuentas
[254:40] lo mismo con
[254:41] hay otras aplicaciones
[254:42] las que te permitan
[254:42] múltiples cuentas
[254:43] le puedes conectar
[254:44] múltiples cuentas
[254:45] por ejemplo acá
[254:46] yo tengo una conectada
[254:48] a Apolo
[254:48] pero le podría conectar
[254:49] otra
[254:49] ok
[254:51] le puedes conectar
[254:51] 10 si quieres
[254:52] el tema comienza a ser
[254:54] tu agente se va a comenzar
[254:55] a confundir
[254:55] cuál usa y cuál no
[254:57] pero le puedes conectar
[254:59] las que quieras
[255:00] listo
[255:00] responde tu pregunta
[255:02] Daniel
[255:02] listo
[255:07] espero que sí
[255:07] listo
[255:09] Nicolás Márquez
[255:10] tienes tu manito
[255:11] virtual
[255:11] levanta
[255:12] ah Daniel
[255:13] Diego dice que está
[255:14] en mute
[255:14] listo
[255:15] Nicolás Márquez
[255:16] por favor
[255:17] abre tu micrófono
[255:18] te acaba de dar
[255:19] ahí el
[255:19] el
[255:21] tengo dos preguntas
[255:24] uno
[255:24] hay alguna forma
[255:25] en la que uno
[255:25] pueda ver cuántos
[255:26] créditos ha gastado
[255:27] de
[255:28] de Appify
[255:29] dentro del mismo
[255:30] dentro del mismo
[255:31] herramienta de Houston
[255:32] o toca directamente
[255:33] a
[255:34] a
[255:35] a la plataforma
[255:35] o sea porque
[255:36] vi que si se puede revisar
[255:37] cuando uno hace
[255:38] lo de
[255:38] models
[255:39] con
[255:39] con
[255:40] ajá
[255:41] esa es la primera
[255:42] y la segunda
[255:43] es cada vez que estoy
[255:45] intentando como
[255:45] vincular uno
[255:46] de las integraciones
[255:47] me está pidiendo
[255:48] siempre
[255:48] el
[255:49] el key
[255:50] no sé
[255:51] hay alguna forma
[255:52] en la que
[255:52] la pueda quitar
[255:53] o sea
[255:54] porque digamos
[255:54] con lo de Apolo
[255:55] me toca buscar
[255:55] siempre Apolo
[255:56] o Apolo
[255:57] lo de MSP
[255:57] o no lo otro
[255:58] que explicaste
[255:58] ahorita más temprano
[256:00] es que no todas
[256:00] las aplicaciones
[256:01] tienen un MSP
[256:02] eso es lo que pasa
[256:03] ahora
[256:04] hay unas que nosotros
[256:05] integramos
[256:06] que cuando las
[256:07] integramos
[256:07] solo tener una Api
[256:08] hoy en día Apolo
[256:09] ya sacó un MSP
[256:10] entonces yo me metería
[256:10] Apolo
[256:11] o le diría en un chat
[256:13] realmente
[256:13] yo le diría en un chat
[256:14] a Houston
[256:14] ayúdame a conectarme
[256:15] al MSP de Apolo
[256:16] acá está
[256:17] lo sacaron
[256:18] hace relativamente poco
[256:19] yo no lo he conectado
[256:20] porque cuando lo conecté
[256:21] solo había Apis
[256:22] pero le podrías decir
[256:24] a Houston
[256:24] ayúdame a conectar
[256:25] literalmente
[256:26] el que no sepa
[256:27] hacer algo
[256:27] ayúdame
[256:29] por favor
[256:31] o inclusive
[256:31] si no quieren hablarle
[256:32] escrito
[256:33] le pone el micrófono acá
[256:35] oye
[256:36] quiero reemplazar
[256:36] el API
[256:37] de Apolo
[256:38] por el MSP de Apolo
[256:40] me ayudas
[256:40] y ahí
[256:43] él lo procesa
[256:44] y lo va a mandar
[256:45] literalmente
[256:46] en lenguaje natural
[256:47] si ustedes
[256:48] pueden hablarle
[256:48] a un practicante
[256:50] le pueden hablar
[256:50] a Houston
[256:51] lo van a poder lograrle
[256:52] si lo pueden escribir
[256:53] acá creo que
[256:54] estamos teniendo
[256:55] un temita
[256:55] Juli
[256:56] o se está demorando
[256:57] por alguna razón
[256:58] pero
[256:58] se demora
[257:00] cargando
[257:00] creo
[257:00] ya
[257:01] ah
[257:02] es que lo dicen
[257:03] si es que
[257:04] yo lo tengo configurado
[257:05] en inglés
[257:06] y me lo estaba traduciendo
[257:08] pero
[257:08] para que lo revisemos
[257:10] pero para hacerte
[257:11] la respuesta sencilla
[257:12] nada
[257:13] vete acá
[257:14] en el chat
[257:14] y le dices
[257:15] quiero reemplazar
[257:15] el API de Apolo
[257:16] por un MCP
[257:17] que tengo que hacer
[257:18] y ya está
[257:18] ok
[257:19] super
[257:19] listo
[257:20] y para ver los créditos
[257:21] se puede
[257:22] o tocar directamente
[257:23] como en la otra plataforma
[257:23] los créditos de que
[257:26] ah
[257:28] para ver los créditos
[257:29] en este momento
[257:30] te toca ir directamente
[257:31] a cada aplicación
[257:32] lo único que tenemos
[257:33] habilitado
[257:34] para que veas el uso
[257:35] es de los modelos
[257:36] de inteligencia artificial
[257:36] pero creo que estaría
[257:38] muy cool
[257:38] poder ver los límites
[257:40] de cada aplicación
[257:40] no lo había pensado
[257:42] pero
[257:42] mándalo ahí
[257:43] como feedback
[257:44] por el grupo de WhatsApp
[257:44] y lo miramos
[257:46] perfecto
[257:47] gracias
[257:47] dale
[257:48] listo
[257:49] sigo llamando
[257:50] a personas
[257:50] que tengo por acá
[257:51] los que ya hablaron
[257:53] y no tienen más preguntas
[257:54] por favor
[257:54] bajen su manito virtual
[257:55] Yuleni Osorio López
[257:58] por favor
[257:58] abre tu micrófono
[257:59] y
[258:00] dinos desde dónde te conectas
[258:02] a qué te dedicas
[258:02] y cuál es tu pregunta
[258:03] hola
[258:05] buenas tardes
[258:06] bueno
[258:06] yo soy estratega
[258:07] de marketing digital
[258:08] quería consultarte
[258:09] simplemente
[258:10] si es posible
[258:12] conectar
[258:12] dentro de un mismo agente
[258:14] diferentes cuentas
[258:15] como por ejemplo
[258:17] de Google Ads
[258:17] o de Meta
[258:18] de Facebook
[258:19] listo
[258:20] te lo voy a mostrar
[258:20] imagínate que tú acá
[258:21] tienes un analista
[258:22] de Ads
[258:23] imagínate que ese es
[258:24] tu
[258:24] tu agente
[258:27] te vienes a integraciones
[258:29] y le pones acá
[258:30] Meta Ads
[258:31] y simplemente le das click
[258:33] y te conectas
[258:34] y una vez ya estás conectada
[258:36] le quieres conectar
[258:37] a otra cuenta
[258:37] se la puedes conectar
[258:38] es lo mismo
[258:38] como lo que yo estaba
[258:39] mostrando acá
[258:40] de Apolo
[258:40] que me dice
[258:41] añadir otra cuenta
[258:43] añades otra cuenta
[258:44] ok perfecto
[258:45] super super
[258:46] buenísimo
[258:47] solo era eso
[258:48] mi pregunta
[258:49] resto lo he podido
[258:50] hacer todo super bien
[258:50] y yo les diría
[258:52] no hay pregunta boba
[258:54] y menos para una
[258:54] a una IA
[258:55] pregúntenle a Houston
[258:56] oye no tengo ni idea
[258:57] de qué es esto
[258:58] qué es un API
[258:59] qué es un MSP
[259:00] dónde encuentro esto
[259:01] oye qué otras herramientas
[259:02] hay afuera
[259:02] hazme una investigación
[259:04] tráemelas
[259:05] y el mismo
[259:06] esto está diseñado
[259:07] para que Houston mismo
[259:08] los guíe a ustedes
[259:10] a cuadrarlo
[259:11] ok
[259:11] si en algún momento
[259:12] una integración
[259:13] está rara
[259:13] está difícil
[259:14] díganle
[259:15] explícame paso por paso
[259:16] cómo hacerlo
[259:16] listo
[259:18] sé que hay una
[259:19] que es compleja
[259:20] que es la de WhatsApp Business
[259:21] ese WhatsApp Business
[259:22] es un tema
[259:23] porque meta
[259:24] es complicado
[259:24] pero se puede conectar
[259:26] ustedes vienen acá
[259:27] y le ponen WhatsApp
[259:28] WhatsApp Business
[259:31] y ahí la pueden conectar
[259:33] listo
[259:33] listo
[259:37] a los que están en Colombia
[259:38] en unos días
[259:39] vamos a hacer
[259:39] un taller
[259:41] más corto
[259:42] de cómo utilizar
[259:43] una herramienta
[259:44] que se llama
[259:45] Chroma
[259:45] para conectarse
[259:47] con toda la data
[259:48] pública del gobierno
[259:49] para por ejemplo
[259:50] licitaciones
[259:51] con el Secop
[259:51] bueno
[259:52] otro par de cosas ahí
[259:54] los que estén interesados
[259:55] por ahí
[259:56] les escribimos
[259:57] por el grupo
[259:57] para que se inscriban
[259:58] listo
[259:58] listo
[260:00] Hernán L
[260:01] por favor
[260:02] abre tu micrófono
[260:03] desde donde te conectas
[260:04] a qué te dedicas
[260:05] cuál es tu pregunta
[260:06] hola Felipe
[260:10] bueno
[260:10] ¿me escuchas?
[260:12] fuerte y claro
[260:13] Felipe
[260:14] muchas gracias
[260:15] felicitaciones
[260:15] por el producto
[260:16] creo que para los que
[260:17] hemos estado inquietos
[260:18] con esos temas
[260:19] de automatización
[260:20] en mi caso
[260:20] hace 8 años
[260:21] con RPAs
[260:22] pero ahorita con IA
[260:24] creo que esto
[260:25] nos da
[260:26] mucha más velocidad
[260:27] y es mucho más
[260:29] intuitivo
[260:30] ¿no?
[260:31] esto
[260:31] entonces felicitaciones
[260:32] y creo que vamos a usar
[260:33] mucho tu producto
[260:34] la pregunta es
[260:36] pues
[260:37] terminamos usando
[260:39] un agente
[260:40] que tú tenías
[260:41] pero
[260:41] quisiera
[260:42] ver si hay posibilidad
[260:44] no sé
[260:44] seguramente en la guía
[260:45] pero poder
[260:46] tener los pasos
[260:48] para crear
[260:49] esperaba hoy
[260:49] poderlo hacer
[260:50] crear los agentes
[260:51] ¿no?
[260:51] porque aquí
[260:52] nos saltamos
[260:52] un poquito
[260:53] de
[260:53] llegamos
[260:54] al Houston
[260:55] con las conexiones
[260:56] y las integraciones
[260:57] pero luego
[260:58] para hacerlo
[260:59] eventualmente
[261:00] pues ahí
[261:01] es donde va a estar
[261:01] como lo interesante
[261:02] para desarrollar
[261:03] los otros
[261:04] agentes
[261:05] y eso
[261:07] eso como
[261:07] me quedo ahí
[261:09] como pendiente
[261:10] a ver qué me recomiendas
[261:11] o digamos
[261:12] si va a haber
[261:13] alguna sesión
[261:14] o qué han pensado
[261:15] vamos
[261:15] o sea
[261:15] yo te voy a pasar
[261:16] tutoriales
[261:17] las guías
[261:17] pero
[261:18] lo que quiero que te digas
[261:20] de esta sesión
[261:20] es
[261:21] lo más importante
[261:22] es
[261:22] para crear un agente
[261:24] antes
[261:25] tú tenías que tener
[261:26] todas las partes
[261:27] en tu cabeza
[261:27] de saber
[261:28] cómo se conectaba
[261:29] todo
[261:29] hoy en día no
[261:29] hoy en día
[261:30] en Houston
[261:30] tú simplemente le dices
[261:31] crear nueva gente
[261:32] le dices
[261:33] o añadirme
[261:34] algunos de la biblioteca
[261:35] como algunas instrucciones
[261:36] de la biblioteca
[261:37] o arrancar de ceros
[261:38] y cuando tú arrancas de ceros
[261:40] le pones un nombre
[261:41] y ya cuando lo has nombrado
[261:43] ya tienes un agente
[261:44] le tienes que haber conectado
[261:46] claramente
[261:46] los modelos de IA
[261:47] si no tiene uno
[261:48] él te va a pedir
[261:49] que lo conectes
[261:50] y acá
[261:51] él te va a decir
[261:51] tienes que ponerle instrucciones
[261:53] tienes que ponerle habilidades
[261:54] pero
[261:55] todo lo vas a poder hacer
[261:56] con lenguaje natural
[261:57] cuando vienes a la sección
[261:59] de habilidades
[261:59] acá tenemos
[262:00] un millón de habilidades
[262:01] que tú puedes de una vez
[262:02] ya buscar
[262:03] en una barra de búsqueda
[262:04] y le puedes añadir
[262:05] cosas de una vez
[262:06] o sea
[262:07] crearte un agente
[262:08] antes
[262:09] era complejo
[262:11] hoy es literalmente
[262:12] tan fácil
[262:12] como venir acá
[262:13] y decirle
[262:13] nueva gente
[262:14] darle sus instrucciones
[262:16] todo
[262:16] yo les paso
[262:17] como las buenas prácticas
[262:18] y es ponerte
[262:19] a trabajar con el agente
[262:20] o sea
[262:21] la gente
[262:21] va a aprender
[262:22] a medida que tú
[262:23] trabajes con él
[262:24] y le conectes
[262:26] herramientas
[262:26] y le ayudes
[262:28] a hacer cosas
[262:28] creo que
[262:30] no hay que sobrecomplicar
[262:33] en la cabeza
[262:33] de uno
[262:34] lo que es un agente
[262:34] en este momento
[262:35] porque ya te lo estamos
[262:36] dando todo
[262:37] a un clic de instalación
[262:38] vale
[262:40] si no
[262:40] yo creo que
[262:41] Houston
[262:42] ayuda mucho
[262:43] a hacerlo
[262:45] y vamos a trabajarlo
[262:46] entonces
[262:46] a ver cómo nos va
[262:47] con la creación
[262:49] de esos agentes
[262:49] lo que te diría
[262:50] es
[262:51] ábrete
[262:51] un agente
[262:52] y acá en el chat
[262:53] le dices
[262:54] hey
[262:54] quiero que te escribas
[262:56] tu propia descripción
[262:56] del rol
[262:57] y tú vas a ser
[262:58] un contador
[262:59] si no sabes
[263:01] si no tienes
[263:01] la descripción
[263:02] de un cargo
[263:02] dile por el chat
[263:03] quiero que te investigues
[263:04] las descripciones
[263:05] del rol
[263:05] de un contador
[263:06] y te escribas
[263:06] tus propias instrucciones
[263:07] y sabes qué
[263:09] proponme
[263:10] 10 habilidades
[263:11] que podríamos hacer juntos
[263:12] y él te va a decir
[263:13] mira te puedo enseñar
[263:13] a conciliar
[263:14] te puedo enseñar
[263:15] a no sé qué
[263:15] y luego ya tú
[263:16] lo adaptas a tus cosas
[263:17] le pasas tus formatos
[263:19] le pasas tu proceso
[263:20] pero imagínate
[263:21] que lo tienes acá
[263:22] y le puedes decir
[263:23] enséñame
[263:24] ayúdame
[263:24] ayúdame
[263:25] a setearte
[263:26] y él te va a ayudar
[263:27] a setearse solo
[263:27] vale
[263:30] listo
[263:30] de todas maneras
[263:31] es un gran avance
[263:33] porque vamos a estar
[263:34] más cerca
[263:34] y seguro que vamos
[263:35] a cacharrear
[263:36] y estaremos ahí
[263:37] en contacto Felipe
[263:38] felicitaciones
[263:38] muchas gracias
[263:39] listo dale
[263:40] gracias
[263:40] Tala García
[263:42] te tengo en mi
[263:42] en mi pantalla
[263:44] cuéntamelo todo
[263:45] cuál es tu
[263:46] desde dónde te conectas
[263:46] a qué te dedicas
[263:47] cuál es tu pregunta
[263:48] estás
[263:52] ah espérate
[263:53] ya ya
[263:53] déjame
[263:54] ahora sí
[263:54] hola Felipe
[263:58] bueno gracias
[263:59] por toda la información
[264:00] felicitaciones
[264:01] me uno
[264:02] a todos
[264:02] que te están
[264:03] felicitando a ti
[264:04] y a Juan
[264:04] también obviamente
[264:05] tengo un tema
[264:08] cuéntame
[264:11] y ahí quedé un poco
[264:11] barato
[264:12] me dice que
[264:12] cuando pues estaba
[264:14] haciendo toda la parte
[264:15] desde la gente
[264:15] que nos compartiste
[264:16] me dice que
[264:17] el token
[264:17] sigue entrando inválido
[264:19] me habla
[264:20] de un token
[264:21] que no
[264:22] que no pasa
[264:22] y que no pasa
[264:23] desde
[264:24] desde la publicación
[264:25] y el ejercicio
[264:25] que estábamos haciendo
[264:26] desde tu
[264:27] LinkedIn
[264:27] y luego
[264:29] me dice
[264:30] que el token
[264:31] sigue bloqueando
[264:32] pero que además
[264:34] alcance un límite
[264:35] de la velocidad
[264:36] de la API
[264:37] de OpenAI
[264:39] ¿tú tienes
[264:40] una cuenta
[264:41] gratuita?
[264:43] no
[264:43] ¿tienes cuenta
[264:45] paga
[264:45] de OpenAI?
[264:47] sí tengo cuenta
[264:47] paga
[264:47] si quieres
[264:49] nos puedes escribir
[264:50] ahí por el chat
[264:50] de Whatsapp
[264:51] y que
[264:52] Juli
[264:52] mi cofundadora
[264:53] y CTO
[264:54] o Daniel
[264:54] te puedan
[264:55] revisar el caso
[264:56] específico
[264:57] de que puede estar
[264:57] pasando
[264:57] sino lo que yo te diría
[264:59] es pregúntale
[264:59] en un chat
[265:00] a Houston
[265:00] como
[265:00] ayúdame a entender
[265:01] que está pasando
[265:02] para poderle mandar
[265:02] al equipo
[265:03] no
[265:04] no sabe decirte
[265:05] específicamente
[265:05] que pasa
[265:05] sí
[265:07] pregúntale a Houston
[265:08] como
[265:08] explícame
[265:09] qué es lo que está pasando
[265:10] para mandarle
[265:11] al equipo de desarrollo
[265:11] y él te va a decir
[265:12] vi esto
[265:13] vi esto
[265:13] y te puede decir
[265:14] lo puedo arreglar
[265:15] yo mismo
[265:15] o no lo puedo arreglar
[265:16] de pronto lo puede arreglar
[265:17] el mismo
[265:17] vale
[265:19] perfecto
[265:19] y tenía otra pregunta
[265:20] en el tema
[265:22] de Appify
[265:23] hay alguna
[265:24] o sea
[265:24] sé que estás
[265:25] en toda la parte
[265:25] de web
[265:26] desde LinkedIn
[265:26] pero
[265:27] existe alguna manera
[265:29] de que
[265:29] desde un ABM
[265:30] o cuentas muy pequeñas
[265:32] tú puedas escribir
[265:33] directamente
[265:33] el agente
[265:34] te puede escribir
[265:35] a mensajes directos
[265:36] de LinkedIn
[265:37] o simplemente
[265:38] nos ayuda
[265:39] a la prospección
[265:41] sin escritura
[265:42] te lo voy a responder
[265:44] de dos maneras
[265:45] la respuesta
[265:46] es sí se puede
[265:47] la segunda respuesta
[265:48] es tienes que tener
[265:48] las herramientas correctas
[265:50] Houston
[265:51] no lo va a hacer
[265:51] directamente
[265:52] o sea
[265:52] yo no lo haría
[265:54] no conectaría
[265:55] a Houston
[265:55] directamente
[265:56] a la web
[265:57] a navegar
[265:57] a LinkedIn
[265:57] porque te va a gastar
[265:58] un montón de tokens
[265:59] les voy a mostrar
[266:00] dos o tres
[266:01] herramientas
[266:02] a los que se quedaron
[266:03] acá hasta el final
[266:03] les voy a contar
[266:04] mi stack personal
[266:04] y háganme las preguntas
[266:05] que quieran
[266:06] entonces te voy a mostrar
[266:07] la primera
[266:08] Tala
[266:08] hay una herramienta
[266:09] que se llama
[266:10] Wallaxi
[266:11] que está diseñada
[266:13] para hacer
[266:15] secuencias
[266:15] por LinkedIn
[266:16] entonces yo
[266:17] en vez de conectar
[266:18] directamente
[266:19] a Houston
[266:20] a
[266:21] eh
[266:22] voy a buscar
[266:22] acá el chat
[266:23] en vez de conectarlo
[266:24] directamente
[266:24] a que vaya
[266:25] y haga cosas
[266:25] como un loco
[266:26] en LinkedIn
[266:26] lo conecto a Wallaxi
[266:27] que ya resolvió
[266:28] todos los temas
[266:29] de seguridad
[266:29] y desde Wallaxi
[266:30] envío esas cosas
[266:31] cuando
[266:33] es un tema
[266:34] de
[266:35] cuando es un tema
[266:38] de que tengo
[266:39] un lead magnet
[266:39] en LinkedIn
[266:40] lo conecto a esta
[266:41] que se llama
[266:42] Lead Shark
[266:43] estoy mandando todo
[266:44] por el chat
[266:45] de Zoom en este momento
[266:45] entonces yo
[266:47] conecto Houston
[266:48] a estos
[266:48] y desde Houston
[266:49] orquestro todo
[266:50] eso es lo que yo haría
[266:52] un humano en mi equipo
[266:53] haría normalmente
[266:53] ¿sí?
[266:55] entonces la respuesta
[266:56] es sí
[266:56] si lo puedo hacer
[266:57] hay otras dos herramientas
[266:59] muy poderosas
[266:59] esta se llama
[267:00] Anakin.io
[267:02] esta es una herramienta
[267:05] que lo que hace es
[267:07] navega la web
[267:09] de una manera
[267:10] desde el
[267:11] desde el nivel
[267:13] de la red
[267:14] en vez de ir
[267:15] y gastar tokens
[267:16] como mirando
[267:17] tomando screenshots
[267:18] no sé qué
[267:19] esto se está conectando
[267:20] de cuenta
[267:20] como al nivel de red
[267:21] y vuelve cualquier página web
[267:23] como si tuviera una API
[267:24] es decir
[267:25] como si
[267:25] le enseñe a una gente
[267:27] a navegarla
[267:27] de manera programática
[267:28] entonces yo
[267:29] ¿qué hice?
[267:30] me abrí una cuenta
[267:30] en Anakin
[267:31] y la conecté
[267:32] a Houston
[267:32] hay otra
[267:34] ok
[267:35] se llama
[267:36] kernel.sh
[267:37] es otra
[267:37] en la que yo tengo
[267:38] otra cuenta
[267:39] todas estas son las herramientas
[267:41] que utilizan
[267:41] acá en Silicon Valley
[267:42] esto también
[267:45] hace que
[267:45] los agentes
[267:46] puedan navegar
[267:46] internet
[267:47] de manera programática
[267:48] sin ser
[267:49] detectados
[267:50] como un bot
[267:51] la diferencia
[267:52] entre cuando tú
[267:53] utilizas un cloud
[267:54] code
[267:54] o un Houston
[267:55] para simplemente
[267:56] entrar y hacer cosas
[267:57] eso lo pillan
[267:58] de una como un bot
[267:58] y te dicen
[267:59] ¿sabes qué tal?
[268:00] baneada
[268:00] esto no
[268:01] esto son herramientas
[268:03] que van al nivel
[268:03] de la red
[268:04] y son
[268:05] o sea
[268:06] ya descifraron
[268:07] cómo no ser detectadas
[268:08] como bots
[268:08] y de hecho
[268:08] están siendo pioneros
[268:10] en la navegación
[268:11] programática
[268:12] entonces tú
[268:13] a esta gente
[268:14] tú los conectas
[268:15] yo me abrí
[268:15] una cuenta acá
[268:16] de hecho
[268:16] las pueden abrir
[268:17] gratis
[268:18] les dan 5 dólares
[268:20] de créditos al mes
[268:21] y si no les cuesta
[268:22] 30
[268:22] y lo que haces
[268:23] es que tu agente
[268:24] puede comenzar
[268:25] a navegar internet
[268:25] puede resolver captchas
[268:27] puede
[268:28] hablar por ejemplo
[268:30] en chats
[268:31] puede hacer un montón
[268:32] de cosas
[268:32] entonces la respuesta
[268:33] es
[268:34] sí, sí puedes
[268:35] ¿listo?
[268:37] solo que necesitas
[268:37] las herramientas correctas
[268:38] es lo que nosotros
[268:39] venimos y en una consultoría
[268:40] en la vida real
[268:41] venimos y decimos
[268:42] oye
[268:42] ¿qué es lo que necesitas hacer?
[268:43] mira
[268:44] este es el stack
[268:44] de 20 herramientas
[268:45] que podrías usar
[268:46] ven
[268:47] te las ayuda
[268:47] a utilizar
[268:49] o sea
[268:50] no solo es como
[268:51] ve y
[268:52] búscate la vida
[268:53] sino como
[268:53] oye
[268:53] nosotros todo el día
[268:54] automatizamos un montón
[268:55] de vainas
[268:55] ven y te hacemos
[268:57] tu primera gente
[268:58] y te decimos
[268:59] mira
[268:59] conéctate a este
[269:00] a este
[269:00] a este
[269:01] a este
[269:01] y estos son los actores
[269:02] que funcionan
[269:02] ven
[269:03] te lo dejó funcionando
[269:03] acá
[269:04] pues ustedes se quedaron
[269:05] hasta el final
[269:06] yo les estoy contando
[269:07] mi stack personal
[269:08] de trabajo
[269:09] porque les quiero
[269:10] aportar valor
[269:10] es espectacular
[269:13] gracias Felipe
[269:14] súper
[269:15] con mucho gusto
[269:16] listo
[269:17] Andrés Herrera
[269:18] por favor
[269:18] abre tu micrófono
[269:19] y haz tu pregunta
[269:20] cuál es tú por acá
[269:22] ¿ya me escuchan?
[269:23] sí
[269:24] creo que sí
[269:24] fuerte y claro
[269:25] bueno
[269:26] mi nombre es Andrés
[269:27] tengo 20 años
[269:29] tremendo
[269:30] sí
[269:31] ahorita estoy
[269:32] estudiando en la universidad
[269:33] todavía estoy estudiando
[269:34] administración
[269:34] y digamos que me quiero
[269:36] empezar como a meter
[269:36] un poco más en los agentes
[269:37] pero también estoy trabajando
[269:38] con una empresa
[269:39] es una marca de ropa
[269:40] pero pues estamos
[269:40] como empezando a explorar
[269:42] todo el tema
[269:42] de utilizar inteligencia artificial
[269:44] para utilizar procesos
[269:46] y que sea un poco más rápido
[269:47] entonces pues yo te había
[269:48] hecho la pregunta
[269:49] de que pues en Houston
[269:50] AI
[269:50] en Houston perdón
[269:52] había como solamente
[269:53] metido como mi
[269:54] mi cuenta por ahora
[269:56] como para hacer las pruebas
[269:57] y después quiero
[269:58] añadir como la cuenta
[269:59] empresarial
[270:00] como pues ya el correo
[270:01] como de la empresa
[270:01] y todo
[270:02] pero tú
[270:02] esto puede llegar
[270:04] a confundirse
[270:04] entonces como que
[270:05] puede empezar
[270:05] a como cruzarse
[270:06] entonces uno
[270:07] pues para preguntarte
[270:08] cómo
[270:08] cómo evitar
[270:10] un poco esto
[270:10] y dos
[270:11] también
[270:12] cómo pueden
[270:13] cómo empezar
[270:14] como a aprender
[270:15] un poco más
[270:16] de agentes
[270:17] y cómo utilizarlo
[270:18] como más como
[270:19] para poder aprovechar
[270:20] esto al máximo
[270:20] de una
[270:21] entonces yo te diría
[270:22] te voy a responder
[270:23] las dos preguntas
[270:24] cómo evitar que la gente
[270:24] se confunda
[270:25] es
[270:26] yo intentaría
[270:28] tener espacios separados
[270:29] o sea
[270:29] acá tú te puedes crear
[270:31] un workspace personal
[270:31] y uno de trabajo
[270:32] a todo lo de trabajo
[270:33] de la universidad
[270:34] conéctale
[270:34] créate uno nuevo
[270:35] y te creas
[270:36] todos tus agentes
[270:36] de la universidad
[270:37] y sólo le conectas
[270:38] tu cuenta
[270:38] a la universidad
[270:39] no sé qué
[270:40] yo acá
[270:41] tengo mi personal
[270:43] es con el que yo trabajo
[270:44] de verdad
[270:44] estos son mis agentes
[270:45] reales todos
[270:46] lo que yo te diría
[270:48] es créate espacios
[270:49] de trabajo
[270:49] créate un espacio
[270:50] para las cosas
[270:51] de empresariales
[270:52] de tu marca de ropa
[270:53] y otro para los personales
[270:54] y así no se te mezclan
[270:55] a veces hay gente
[270:57] que le gusta tener todo
[270:58] y pues ya está
[270:59] le conecta
[271:00] el correo de la universidad
[271:01] el correo del trabajo
[271:01] y el personal
[271:02] entonces el día de mañana
[271:03] que tú le digas
[271:04] estoy prospectando
[271:05] te va a decir
[271:05] de cuál lo mando
[271:06] del de la universidad
[271:07] del de no sé qué
[271:08] o sea
[271:08] se puede confundir
[271:09] no significa que
[271:10] no vaya a aprender
[271:12] tú le puedes decir
[271:13] oye siempre que te hable
[271:14] de mi marca
[271:14] mándalo de este
[271:15] pero pues se complejiza
[271:16] la ejecución
[271:17] lo segundo
[271:19] es donde puedo aprender
[271:20] de IA
[271:20] estás acá
[271:21] estás aprendiendo de IA
[271:22] o sea
[271:22] yo te estoy compartiendo
[271:23] literalmente
[271:24] lo que yo estoy aprendiendo
[271:26] en Silicon Valley
[271:26] en este momento
[271:27] o sea
[271:27] ustedes no tienen
[271:28] nada diferente hoy
[271:29] a lo que están usando
[271:30] acá en este momento
[271:31] en la vida real
[271:31] todas estas herramientas
[271:32] que les acabo de mostrar
[271:33] todas las mejores prácticas
[271:34] que Julián está implementando
[271:36] son las que están implementando
[271:37] acá como
[271:37] cutting edge
[271:38] en Silicon Valley
[271:39] pero de IA
[271:41] solo se aprende
[271:42] ejecutando con IA
[271:43] uno puede ir a 20.000 cursos
[271:45] puede ver 20.000 videos
[271:46] pero si no te creas
[271:47] tu primera
[271:48] tu primera misión
[271:50] y fallas
[271:50] y le das feedback
[271:51] nunca vas a tener una gente
[271:52] nunca vas a saber
[271:53] de qué es capaz
[271:54] entonces
[271:55] solo te diría
[271:57] te acabamos de dar
[271:58] una sesión
[271:59] te acabamos de dar
[272:00] una licencia
[272:01] de Houston gratis
[272:02] que te costaría
[272:03] 25 dólares al mes
[272:04] te acabamos de dar
[272:04] 75 dólares de Appify
[272:06] te acabamos de dar
[272:06] 10 dólares de Open Router
[272:08] yo de ti
[272:09] le diría a mis amigos
[272:10] oigan
[272:10] gracias por la invitación
[272:11] de esta noche
[272:12] no puedo ir a comer
[272:13] me voy a gastar
[272:13] otros 50 dólares
[272:14] en herramientas
[272:15] esta noche
[272:15] en vez de irme a comer
[272:16] y a tomar
[272:17] y me quedaba
[272:18] hasta las 3 de la mañana
[272:19] dándole a esto
[272:20] porque si no mañana
[272:23] se te pasa la emoción
[272:24] y pasado mañana
[272:24] ya no te acuerdas
[272:25] pero si hoy
[272:26] pasando este taller
[272:28] literalmente almuerzas
[272:29] te vas a hacer cosas
[272:30] mañana vas a estar obsesionado
[272:31] y te vas a dar cuenta
[272:32] que cuando menos pienses
[272:33] estas Coding Edge
[272:34] ¿listo?
[272:37] listo
[272:38] gracias
[272:38] sigo por acá
[272:39] Felipe Díaz
[272:40] por favor abre tu micrófono
[272:41] muy cool
[272:43] tus gafas
[272:43] buenas gafas
[272:45] ¿a qué te dedicas?
[272:46] hola Felipe Díaz
[272:46] ¿cómo vas?
[272:48] estoy bien
[272:48] ¿me escuchas?
[272:50] sí
[272:50] fuerte y claro
[272:51] listo
[272:52] perfecto
[272:52] mira acá tengo
[272:53] un par de preguntas
[272:54] inicialmente
[272:56] cuando tú hablas
[272:56] que se le pueden hacer
[272:58] preguntas
[272:58] a Houston
[273:00] directamente
[273:01] ¿en qué sector
[273:03] exactamente lo haces?
[273:04] porque ¿qué pasa?
[273:04] si uno lo hace
[273:05] directamente
[273:06] en alguno
[273:07] de los agentes
[273:07] ese agente
[273:08] pues está especializado
[273:09] en algo muy específico
[273:11] ¿sí?
[273:11] valga la redundancia
[273:12] entonces si yo le hago
[273:13] una pregunta
[273:14] como necesito saber
[273:15] cómo integrar
[273:16] tal aplicación
[273:17] de la
[273:18] el mismo
[273:19] plataforma de Houston
[273:21] ¿me responde
[273:22] dentro de esa
[273:23] dentro de ese agente
[273:24] o tengo que crear
[273:25] un agente diferente
[273:26] para ese tipo de preguntas
[273:27] o que me
[273:28] no
[273:29] mira
[273:29] debajo
[273:30] de Houston
[273:32] siempre van a estar
[273:32] el motor
[273:33] que es el modelo de IA
[273:34] el modelo de IA
[273:34] es bastante inteligente
[273:36] y a nivel general
[273:37] conoce demasiado
[273:38] entonces
[273:38] en el que tú le preguntes
[273:40] te lo va a responder
[273:40] lo que pasa es que
[273:41] a medida que tú
[273:42] comienzas a trabajar
[273:42] más con un agente
[273:43] se va especializando
[273:44] se va especializando
[273:45] en formatos
[273:45] en integraciones
[273:46] en memoria
[273:47] es como que se va
[273:48] especializando
[273:49] pero no significa
[273:49] que dejó de saber
[273:50] de lo que ya sabía
[273:51] también
[273:52] entonces le puedes preguntar
[273:53] yo me abrí uno
[273:54] que se llama
[273:55] software developer
[273:56] y todas mis preguntas
[273:57] técnicas de integraciones
[273:58] yo se las voy pasando ahí
[273:59] porque además
[274:00] me ayuda a mantenerme
[274:01] organizado
[274:02] perfecto
[274:03] tengo como un
[274:04] un software
[274:05] un software developer
[274:06] acá dentro de Houston
[274:07] y acá
[274:08] le pregunto cosas
[274:09] me integro
[274:10] experimento
[274:11] cosas como más técnicas
[274:12] pero acá también
[274:14] tú le puedes decir
[274:15] oye
[274:15] explícame esto
[274:16] y te lo voy a explicar
[274:16] sin problema
[274:17] bien
[274:18] entonces ahora
[274:19] otra pregunta
[274:20] con respecto al tema
[274:23] del feedback
[274:24] que tú le vas a hacer
[274:25] dependiendo
[274:26] de las tareas
[274:27] que le vayas dando
[274:28] ¿cómo llegas a hacer
[274:31] el feedback
[274:32] de algo que
[274:32] de pronto tú digas
[274:33] no me está funcionando
[274:34] muy bien esto
[274:35] o necesito ajustar
[274:35] este tipo de detalles
[274:36] ¿cómo dentro
[274:38] hacer el feedback
[274:39] de esos procesos?
[274:41] sí
[274:41] yo te voy a dar
[274:42] como la manera
[274:42] en la que yo trabajo
[274:43] después de haber trabajado
[274:44] como que me he dado cuenta
[274:45] que funciona muy bien
[274:46] y es
[274:46] imagínate que tú tienes
[274:48] un practicante
[274:49] y le dices
[274:49] véndame más
[274:50] y el practicante
[274:51] va a hacer lo que sea
[274:52] por vender más
[274:52] pero no significa
[274:53] que lo haga bien
[274:54] ¿no?
[274:55] entonces yo lo que
[274:56] me he dado cuenta
[274:56] que funciona muy bien
[274:57] es cuando voy
[274:58] paso por paso
[274:59] y le explico
[274:59] qué quiero lograr
[275:00] y le digo
[275:01] por ejemplo
[275:01] oye
[275:02] quiero encontrar esto
[275:03] oye
[275:03] créame este sheet
[275:04] oye
[275:05] créame estos deals
[275:06] dicen en mi hotspot
[275:07] por ejemplo
[275:08] yo utilizo mucho esto
[275:09] para hotspot
[275:09] no los pasaste mal
[275:11] entonces ahí
[275:12] como en la tarea específica
[275:13] le voy dando feedback
[275:14] como en el momento
[275:15] y en el momento
[275:16] en el momento
[275:17] y cuando ya estoy satisfecho
[275:18] digo como listo
[275:19] guarda esto en tu memoria
[275:19] y guarda esto en tus skills
[275:20] y luego sigo trabajando
[275:23] directamente se lo escribo
[275:24] con lenguaje natural
[275:25] como ok
[275:26] todo esto que hemos hablado
[275:28] guárdamelo como un skill
[275:29] o guárdamelo en memoria
[275:31] ya me busco uno
[275:32] donde yo haya trabajado
[275:33] para mostrarte que
[275:36] mira este por ejemplo
[275:37] este yo lo tengo en inglés
[275:39] ah espérate
[275:41] es que quiero buscar uno
[275:42] donde lo haya hecho recientemente
[275:44] acá
[275:49] cómo crear links de Stripe
[275:51] yo tengo conectada
[275:52] la cuenta de Stripe
[275:52] entonces estuve trabajando
[275:54] y le conecté mi cuenta
[275:55] de a poquitos
[275:56] le dije cuál era mi cuenta
[275:57] fuimos probando
[275:58] probando
[275:58] probando
[275:59] probando
[275:59] y después de último
[276:01] le dije
[276:01] a ver
[276:03] dónde está esto
[276:04] o sea
[276:05] ahí mismo
[276:05] en el chat
[276:06] tú le escribes
[276:06] ahí mismo
[276:07] después de trabajar
[276:08] procura no utilizar
[276:09] este tipo de comunicación
[276:10] cámbialo por tal cosa
[276:11] literalmente
[276:13] o sea
[276:13] imagínate que tú le estás dando
[276:14] feedback a una persona
[276:15] ah perfecto
[276:16] o sea
[276:17] literalmente
[276:17] yo le digo
[276:18] en un lugar específico
[276:20] no
[276:20] los feedbacks
[276:21] o algo así
[276:22] no
[276:23] o sea
[276:24] sobre la misma tarea
[276:25] tú le dices
[276:26] hey novel
[276:26] vas a hacer esto
[276:27] guarda
[276:27] por ejemplo
[276:28] vamos a hacerlo acá
[276:28] en vivo
[276:29] te voy a mostrar
[276:29] ¿cómo es?
[276:32] ya no me aparece tu nombre
[276:32] ¿Juan?
[276:34] Felipe
[276:34] ah Felipe
[276:35] por favor
[276:36] saluda
[276:38] de doctor
[276:39] cada que le vayamos
[276:43] a enviar
[276:44] un correo
[276:46] ¿es tu apellido
[276:46] es Díaz?
[276:48] ¿cómo perdón?
[276:49] ¿es tu apellido
[276:50] es Díaz?
[276:50] es que no me sale
[276:51] en la pantalla
[276:51] en esta venta
[276:51] Díaz con Z
[276:52] Díaz con Z
[276:52] ah Díaz con Z
[276:54] listo
[276:55] guarda esto
[276:56] en tu memoria
[276:57] ¿listo?
[277:01] literalmente
[277:01] en lenguaje natural
[277:02] por favor
[277:02] saluda doctor
[277:03] cada que le vayamos
[277:04] a enviar un correo
[277:04] a Felipe Díaz
[277:05] guarda esto en tu memoria
[277:06] me dice
[277:06] listo
[277:07] lo voy a recordar
[277:08] cada que le escribamos
[277:08] un correo
[277:08] a Felipe Díaz
[277:09] lo saludo
[277:10] como doctor
[277:10] guardada
[277:11] si nos vamos
[277:13] a la sección
[277:13] de settings
[277:14] configuración
[277:15] en memoria
[277:16] él acabo de añadir
[277:18] una memoria
[277:18] que dice
[277:19] en los correos
[277:20] dirigidos a
[277:21] Felipe Díaz
[277:22] saludarlo siempre
[277:22] como doctor
[277:23] por ejemplo
[277:24] hola doctor Díaz
[277:25] muy bien
[277:27] le va a decir
[277:28] pásame tu correo
[277:29] por acá
[277:29] le vamos a decir
[277:30] que te envíe un correo
[277:31] le va a decir
[277:32] por favor
[277:33] mándale
[277:34] un correo
[277:36] agradeciéndole
[277:37] a Felipe Díaz
[277:39] mándamelo aquí
[277:43] por el chat
[277:43] de Zoom
[277:43] y yo lo
[277:44] y que te diga
[277:46] un correo
[277:46] o le va a pedirse
[277:48] lo que lo redacta acá
[277:49] redacta acá
[277:49] y lo revisamos
[277:50] redactalo
[277:51] acá
[277:52] y
[277:52] a ver
[277:54] solo redactalo
[277:56] le va a decir
[277:56] redactalo
[277:57] él en teoría
[277:59] lo que va a ir a hacer
[278:00] es
[278:01] se va a leer la descripción
[278:02] y el título
[278:03] del skill
[278:04] y dice
[278:04] ah de la memoria
[278:05] dice
[278:05] ah es Felipe Díaz
[278:07] tenemos que decirle
[278:08] doctor Díaz
[278:08] si por alguna razón
[278:10] él no hace esto
[278:10] bien
[278:11] yo le debería dar
[278:12] feedback acá
[278:12] oye Felipe Díaz
[278:13] era doctor
[278:14] porque no te referiste
[278:15] a él como doctor
[278:15] ok
[278:17] y ahí él está
[278:18] viendo varias cosas
[278:19] él ahí ya
[278:21] si tuviste
[278:21] estaba revisando
[278:22] qué herramientas tenía
[278:23] ya revisó Gmail
[278:24] se ha revisado
[278:25] un par de herramientas
[278:27] y me dice
[278:27] te pregunté
[278:27] un par de cosas
[278:28] en la tarjeta
[278:28] para redactarlo bien
[278:29] ¿por qué le agradeces
[278:31] a Felipe Díaz
[278:31] por la reunión
[278:32] o por la llamada
[278:33] o así le por la reunión
[278:34] ah y te da
[278:35] también automáticamente
[278:36] esos complementos
[278:38] antes de ejecutar
[278:40] la tarea
[278:40] sí
[278:41] porque lo tengo
[278:42] en preguntar antes
[278:43] muy bien
[278:44] tu correo es
[278:45] callhouse
[278:46] máquina
[278:47] arroba Gmail
[278:47] sí
[278:48] es de la empresa
[278:49] ah
[278:49] te encontró
[278:50] te encontró
[278:50] seguramente
[278:51] del ejercicio anterior
[278:52] como yo te he conectado
[278:54] a mi Gmail
[278:54] seguramente
[278:55] entonces me dice
[278:55] sí es ese
[278:56] entonces va a ir
[278:57] y te lo va a escribir
[278:57] mira yo lo tengo acá
[278:59] en preguntar primero
[279:01] ven lo pongo en español
[279:01] rápido
[279:02] pero yo tengo acá
[279:05] a mi representante
[279:05] de ventas
[279:06] estoy escribiéndote
[279:07] un correo
[279:07] y me dice
[279:08] este es el borrador
[279:10] para Felipe Díaz
[279:11] asunto
[279:11] gracias por tu tiempo
[279:12] hola Felipe
[279:13] quería agradecerte
[279:13] por la reunión de hoy
[279:14] me pareció muy valioso
[279:15] entender cómo están
[279:16] trabajando hoy
[279:16] y dónde ven las mayores
[279:17] oportunidades de mejora
[279:18] me quedo con los puntos
[279:19] que conversamos
[279:19] y te comparto
[279:20] en los próximos días
[279:21] una propuesta concreta
[279:21] con los siguientes pasos
[279:22] si te ocurre cualquier duda
[279:23] mientras tanto
[279:24] escríbeme sin problema
[279:24] si yo lo hubiera tenido
[279:26] en piloto automático
[279:27] le hubiera dicho
[279:28] listo
[279:28] mándalo
[279:29] listo
[279:29] mándalo
[279:30] te va a llegar
[279:31] un correo mío
[279:32] que te va a decir eso
[279:32] ok
[279:33] super
[279:34] listo
[279:35] ¿por qué?
[279:35] porque tengo a mi gente
[279:36] lo tengo conectado al correo
[279:38] todo
[279:38] buenísimo
[279:39] buenísimo
[279:40] genial
[279:40] es que claro
[279:42] hay cosas que van quedando
[279:43] como muy en el aire
[279:44] y uno no entiende
[279:45] muy bien el proceso
[279:47] porque claro
[279:48] tú lo conoces
[279:49] de memoria
[279:50] entonces tú no
[279:50] pasas esto
[279:51] de eso
[279:51] ta ta ta ta
[279:52] entonces se le quedan
[279:53] a uno ahí
[279:53] como cosas volando
[279:54] otra cosa
[279:55] el tema de la integración
[279:58] de Open Router
[279:59] lo tengo ahora
[280:01] pues
[280:02] un poco complicado
[280:03] porque estoy pidiéndole
[280:04] la llave
[280:06] y me aparece
[280:08] la llave
[280:08] pero no la puedo copiar
[280:10] para pegarla
[280:11] en Open Router
[280:13] dices
[280:14] sí
[280:15] en Open Router
[280:15] ya
[280:16] sí
[280:20] sí se puede
[280:20] mira
[280:20] te explico
[280:21] mira la API
[280:22] tú creas una nueva API
[280:23] le va a decir
[280:24] esto es un ejemplo
[280:25] y va a decir
[280:27] que expira en una hora
[280:28] y
[280:31] crear
[280:32] ahí te debería salir esto
[280:34] y acá le das copiar
[280:35] ok
[280:37] ¿listo?
[280:39] o sea
[280:39] le creé una nueva
[280:40] o sea
[280:41] la que está por default
[280:42] no me chirpe
[280:43] pues es que por default
[280:45] no hay ninguna
[280:45] te va a pedir una
[280:46] te va a pedir una
[280:47] cuando te conectes
[280:48] te va a pedir
[280:48] sí claro
[280:50] le tienes que crear
[280:51] una API
[280:52] en Open Router
[280:52] por seguridad
[280:53] listo
[280:55] y yo voy a borrar
[280:56] ya mismo esta llave
[280:57] porque es un ejemplo
[280:58] pero pues
[280:59] no quiero que nadie
[281:00] tenga esto
[281:00] listo
[281:02] ok
[281:03] y la última
[281:04] es el tema
[281:05] del código
[281:06] promocional
[281:07] me parece que ya
[281:07] no hay disponibilidad
[281:08] con ese código
[281:09] van a
[281:10] van a pasarnos
[281:11] alguno nuevo
[281:11] el de Open Router
[281:12] déjame yo
[281:13] reviso qué pasó
[281:14] porque
[281:15] teníamos 250
[281:16] y no creo que 250
[281:17] hayan redimido
[281:18] pero si
[281:19] era para los primeros
[281:20] 250
[281:21] si ya se agotaron
[281:22] déjame yo
[281:22] algo con la persona
[281:23] de Open Router
[281:24] pero a lo mejor
[281:25] yo creo que es que
[281:26] está teniendo un error
[281:27] yo no creo que
[281:27] hayan redimido 250
[281:28] personas
[281:29] no sé
[281:30] voy a revisar
[281:30] o si nos puedes
[281:32] confirmar nuevamente
[281:33] el código
[281:34] les voy a mandar
[281:36] todo por el grupo
[281:37] de Whatsapp
[281:37] sé que
[281:38] vimos tantas cosas hoy
[281:39] que si uno no estaba
[281:40] completamente pendiente
[281:41] se pierde rápido
[281:42] no te preocupes
[281:44] vamos a mandar
[281:45] todo otra vez
[281:46] por acá
[281:47] Juan de mi equipo
[281:48] está acá
[281:49] Juan ayúdeme a mandar
[281:50] please
[281:51] todo
[281:51] mandemos esto
[281:52] mandemos las guías
[281:54] vamos a organizar
[281:55] todo ahorita
[281:55] en un debrief
[281:56] y les mandamos
[281:56] ¿les parece?
[281:58] perfecto
[281:58] listo Felipe
[281:59] te agradezco mucho
[282:00] bueno listo
[282:01] sigamos por acá
[282:02] les propongo que
[282:04] o sea es que
[282:05] todavía quedan 283 personas
[282:07] así que
[282:07] valoro muchísimo su tiempo
[282:08] yo estoy acá disponible
[282:10] y quiero responder
[282:10] las preguntas que tengamos
[282:11] les propongo que
[282:13] nos quedemos 17 minutos más
[282:15] y puedan almorzar
[282:16] porque si no
[282:16] listo
[282:18] y los que se tienen que ir
[282:20] con toda tranquilidad
[282:21] váyanse retirando
[282:22] les agradezco por estar acá
[282:24] no van a herir mis sentimientos
[282:25] si se van ya
[282:26] les doy el permiso explícito
[282:28] y los que se quieran quedar
[282:28] los invito a quedarse
[282:29] ¿listo?
[282:30] listo
[282:31] Ana Rodríguez
[282:32] tienes tu mano levantada
[282:33] ¿tienes una pregunta?
[282:35] no ya no
[282:36] listo
[282:36] bájala
[282:37] listo
[282:38] Giovanna Romero
[282:40] tienes tu mano levantada
[282:41] todavía tienes una pregunta
[282:42] Giovanna Romero
[282:49] hola
[282:50] hola
[282:50] hola
[282:50] hola
[282:50] sí
[282:50] acá estoy
[282:51] dale
[282:52] bueno Felipe
[282:54] muchas gracias
[282:54] primero
[282:55] espectacular
[282:56] ya los había visto
[282:57] en el iSummit
[282:57] pero fue tan rápido
[282:58] que no logré
[282:59] cómo hacer nada
[283:00] en ese momento
[283:00] entonces
[283:01] tengo dos preguntas
[283:03] y sobre todo
[283:04] cuando yo empiezo a lanzar
[283:05] todas las plataformas
[283:07] entonces
[283:07] si yo voy a Polo
[283:09] con una de correo
[283:11] que
[283:11] es con la que me logué
[283:13] en Houston
[283:13] pero no es la que yo
[283:15] con la que yo uso
[283:16] LinkedIn
[283:18] ¿es algún problema?
[283:20] o sea
[283:20] tengo una confusión
[283:21] con el tema de los correos
[283:22] porque también
[283:23] en Houston
[283:24] creé la cuenta
[283:25] con un correo
[283:25] que es distinto
[283:26] al que quiero que salgan
[283:27] los correos
[283:28] por ejemplo
[283:28] listo
[283:30] entonces te explico
[283:31] abrirte una cuenta
[283:33] en Houston
[283:33] es como abrirte una cuenta
[283:34] en cualquier aplicación
[283:35] entonces
[283:36] el correo que tú utilizaste
[283:37] es tu correo
[283:38] que vas a tener
[283:38] para hacer login
[283:39] pero no es
[283:40] ese correo
[283:41] no está
[283:41] tus agentes
[283:42] no están usando ese correo
[283:43] todavía para nada
[283:44] es simplemente
[283:44] tu cuenta de Houston
[283:46] cuando tú te crees
[283:47] un agente
[283:48] te vas a integraciones
[283:49] y en integraciones
[283:51] déjamelo
[283:52] pongo en español
[283:52] nuevamente
[283:53] y en integraciones
[283:55] acá
[283:56] tú las puedes conectar
[283:58] o para todo tu espacio
[283:59] de trabajo
[284:00] o simplemente
[284:00] por agente
[284:01] que hayas creado
[284:02] vienes acá
[284:03] y le dices
[284:03] Gmail
[284:04] y buscas Gmail
[284:05] y acá tú le das click
[284:08] y le dices conectar
[284:09] y le puedes conectar
[284:10] múltiples cuentas
[284:11] si tú quieres
[284:11] y estas son las que
[284:13] tu agente va a utilizar
[284:14] como herramienta
[284:17] ok
[284:17] es decir
[284:19] por agente
[284:19] yo puedo decir
[284:20] para representante comercial
[284:22] quiero que salga
[284:22] por ese correo
[284:23] y para otra agente
[284:24] puedo usar otro correo
[284:25] literalmente
[284:26] literalmente
[284:27] ok
[284:28] super gracias
[284:29] ahora lo otro
[284:30] es que con Apolo
[284:30] estoy teniendo
[284:31] un problema
[284:32] que no entiendo
[284:33] porque tengo la cuenta
[284:34] si es una cuenta
[284:35] gratuita
[284:36] cuando intento integrar
[284:37] me dice
[284:38] MSP está bloqueado
[284:39] y cuando intento
[284:40] hacerlo por API
[284:41] me dice que no tengo
[284:42] permisos
[284:42] para crearlo
[284:43] porque no tengo
[284:44] permisos de administrador
[284:45] entonces yo digo
[284:46] no, no entiendo
[284:47] tú eres la dueña
[284:48] del espacio
[284:49] en tu empresa
[284:49] sí
[284:51] sí
[284:51] es una cuenta mía
[284:53] gratuita en Apolo
[284:55] pero entonces
[284:55] no sé
[284:56] yo he visto esto pasar
[284:57] cuando uno entra en Apolo
[284:58] tú tienes que venir acá
[285:00] a donde dice
[285:01] settings
[285:02] probablemente
[285:02] o sea
[285:04] a mí me pasó eso
[285:04] y yo lo arreglé
[285:05] con Houston
[285:05] literal
[285:06] como ayúdame a entender
[285:07] dónde cambio eso
[285:08] porque a veces
[285:08] uno está acá
[285:09] y dice
[285:09] usuarios y equipos
[285:10] debe estar por ahí
[285:13] y te dice
[285:14] si tú eres el administrador
[285:15] o no
[285:15] si tú no estás tú misma
[285:17] como administradora
[285:18] tienes que editar el perfil
[285:19] y autoponerte
[285:20] como administradora
[285:21] del espacio de Apolo
[285:22] puede que tú no seas
[285:26] la administradora
[285:27] y de pronto
[285:28] alguien de tu empresa
[285:29] lo abrió por ti
[285:30] y es el administrador
[285:32] ok
[285:34] está extraño
[285:35] pregúntale a Houston
[285:36] mándale screenshots
[285:38] dile guíame
[285:39] dónde encuentro esto
[285:40] dame el paso a paso
[285:41] bueno bien
[285:44] muchas gracias
[285:45] con gusto
[285:46] buena tarde
[285:46] chao
[285:47] a ti también
[285:47] listo
[285:48] vamos por acá
[285:49] seguimos llamando
[285:49] Ernesto Ramírez
[285:51] estás por acá
[285:51] abre tu micrófono
[285:52] por favor
[285:53] hola hola
[285:56] sí
[285:57] ¿me escuchas?
[285:58] sí
[285:58] fuerte claro
[285:59] perfecto
[286:01] oye
[286:01] fíjate que
[286:03] pude conectar todo
[286:04] y me funcionó de maravilla
[286:06] está
[286:07] ya encontré
[286:09] negocios
[286:10] en donde puedo
[286:11] mandar
[286:12] mis servicios
[286:14] y le preguntaba
[286:16] a
[286:17] a este
[286:18] a Houston
[286:19] que me gustaría
[286:21] más bien
[286:21] que él me
[286:22] llevara
[286:23] el tema
[286:24] de mis
[286:24] whatsapp
[286:25] entonces me
[286:25] dice
[286:26] ok
[286:26] perfecto
[286:27] pues
[286:27] vayamos
[286:28] a conectarlo
[286:29] a whatsapp
[286:29] y ahí es
[286:31] donde me atoré
[286:31] quiero preguntarte
[286:32] si tienes
[286:33] experiencia con
[286:34] whatsapp
[286:35] porque me estaba
[286:36] preguntando
[286:37] una cosa
[286:38] que se llama
[286:39] guapa
[286:41] o un código
[286:42] o si hay alguna
[286:44] otra manera
[286:44] de hacerlo
[286:45] más fácil
[286:46] tú tienes
[286:47] whatsapp business
[286:48] Ernesto
[286:49] sí tengo
[286:49] whatsapp business
[286:50] es que
[286:51] nosotros
[286:51] ahora solo
[286:51] tenemos
[286:52] por ahora
[286:52] solo tenemos
[286:53] habilitado
[286:53] whatsapp business
[286:54] y whatsapp business
[286:56] meta es bastante
[286:57] complicado
[286:58] a mí de hecho
[286:58] me tocó
[286:59] autodebuguearme
[287:00] con Houston
[287:00] de que paso
[287:02] por paso
[287:02] pero
[287:03] ellos tienen
[287:04] tienes que tener
[287:06] una cuenta
[287:06] de facebook
[287:07] creada
[287:07] y esa cuenta
[287:09] de facebook
[287:09] tiene un código
[287:10] que se llama
[287:11] el whatsapp business
[287:12] id
[287:13] no sé qué
[287:13] y ahí se lo vas
[287:14] poniendo
[287:14] eso todo
[287:17] lo vas a ver
[287:18] en tu cuenta
[287:18] de meta
[287:19] eso todo
[287:20] está ahí
[287:20] entonces tu número
[287:21] tiene que estar
[287:22] verificado
[287:22] o sea
[287:23] tienes que pasar
[287:23] ciertos pasos
[287:24] porque como
[287:25] esos ya
[287:25] es temas
[287:25] de automatizaciones
[287:26] le ponen
[287:28] un poco más
[287:28] de trabas
[287:28] al usuario
[287:29] ok
[287:30] perfecto
[287:31] entonces eso
[287:32] más bien es
[287:32] primero tengo
[287:33] que sacar
[287:34] mi guapa
[287:34] exacto
[287:36] pregúntale a Houston
[287:37] cómo hacerlo
[287:38] si estás usando
[287:39] cloud code
[287:40] también
[287:40] si estás usando
[287:41] chat gpt work
[287:41] hay veces
[287:42] que yo me trago
[287:43] y uso
[287:43] chat gpt
[287:44] que coja el control
[287:45] de mi computador
[287:46] y vaya
[287:46] y haga las cosas
[287:47] por mí
[287:47] algunas
[287:49] tips
[287:50] que te puedo dar
[287:51] vale
[287:52] muy bien
[287:53] listo
[287:54] dale Ernesto
[287:55] listo
[287:55] sigo llamando
[287:56] a personas
[287:56] por acá
[287:57] sé que hay varios
[287:58] que tienen la mano
[287:58] levantada
[287:58] hace tiempo
[287:59] estoy intentando
[288:00] ver acá
[288:00] los que están
[288:01] en mi pantalla
[288:02] como en el orden
[288:02] listo
[288:04] los que ya
[288:05] hablaron
[288:05] y no tienen
[288:06] más preguntas
[288:06] por favor
[288:07] bajen
[288:07] las
[288:07] manos
[288:09] listo
[288:11] Rodrigo
[288:12] Reyes
[288:12] Restrepo
[288:13] por favor
[288:13] abre tu micrófono
[288:14] y cuéntanos
[288:15] desde dónde te conectas
[288:16] qué pregunta tienes
[288:17] hola Felipe
[288:19] y equipo
[288:19] gracias por la sesión
[288:20] espectacular
[288:21] ya estoy usando
[288:22] justo desde el
[288:23] desde el jueves pasado
[288:24] buenísimo
[288:24] ya lo cuentan a poro
[288:26] ya hago postulación
[288:26] con a poro
[288:27] pero la pregunta
[288:28] es muy puntual
[288:28] y era
[288:29] para el API key
[288:30] estoy creando
[288:30] un API key nuevo
[288:31] y quería validar
[288:33] que el tipo
[288:34] de API key
[288:35] fuera
[288:35] mixed people
[288:37] o sea
[288:37] search mixed people
[288:38] o cuál es el tipo
[288:39] de API key
[288:39] para
[288:39] no recuerdo
[288:41] pero creo que
[288:42] ellos tienen algo
[288:42] que se llama
[288:42] search database
[288:43] o algo así
[288:44] ven te busco
[288:45] en API keys
[288:47] tienen
[288:48] search accounts
[288:49] contacts
[288:49] tienen email
[288:50] campaign
[288:51] pues tienen
[288:51] API key
[288:53] voy a poner un ejemplo
[288:54] si le pongo acá
[288:56] set as master key
[288:57] y yo le pongo
[288:58] un set
[288:58] un master key
[288:59] que pueda ser todo
[289:00] claro
[289:01] sino que yo tengo
[289:02] el master key
[289:02] para otra cosa
[289:03] entonces
[289:04] ya
[289:04] pero hay varios
[289:06] que pueden ser
[289:06] master keys
[289:07] mira
[289:07] todo el montón
[289:08] de master keys
[289:08] que tengo
[289:09] ah
[289:10] la puedo con master key
[289:11] entonces
[289:12] perfecto
[289:12] listo
[289:13] y ahí te va a decir
[289:14] pero creo que te da
[289:14] el ejemplo
[289:15] y creo que es un
[289:15] no me acuerdo
[289:16] si es search
[289:17] database
[289:17] o algo así
[289:18] pero
[289:18] es search
[289:20] si no estoy mal
[289:21] y si no
[289:22] pregúntale literalmente
[289:23] a Houston
[289:23] es que yo la verdad
[289:24] es que lo conecté
[289:24] hace tiempo
[289:24] si no tengo
[289:25] como súper presente
[289:26] cuál de todas será
[289:28] ya con esto
[289:29] queda todo terminado
[289:30] Felipe
[289:30] gracias por todo
[289:31] con muchísimo gusto
[289:32] listo
[289:33] sigamos por acá
[289:34] José Antonio Castañeda
[289:35] por favor
[289:36] abre tu micrófono
[289:37] y cuál es tu pregunta
[289:38] que te dedicas
[289:38] y dónde estás
[289:39] buenas tardes
[289:43] muchas gracias
[289:44] estoy aquí en Colombia
[289:46] me conecté con
[289:49] con ustedes
[289:50] por
[289:50] por el evento
[289:52] de la cámara de comercio
[289:53] que los conocí
[289:54] super
[289:54] genial
[289:55] muchas gracias
[289:56] la verdad
[289:56] gracias por estar acá
[289:57] soy ingeniero industrial
[289:59] y
[290:00] es un diplomado
[290:01] en inteligencia artificial
[290:02] y pues
[290:03] rico toda la analogía
[290:05] que tú pusiste
[290:06] me educaste
[290:07] muy bien
[290:08] por lo del carro
[290:09] lo del
[290:09] estoy
[290:11] tengo una empresa
[290:11] de trámites vehiculares
[290:13] en la que
[290:13] le prestamos
[290:14] a aseguradoras
[290:16] y a concesionales
[290:17] de vehículos
[290:18] y estamos
[290:18] automatizando
[290:20] la parte de los trámites
[290:21] lo que gasto
[290:23] de dinero
[290:24] y también
[290:24] gestión documental
[290:25] entonces
[290:26] yo decía
[290:27] bueno
[290:27] aquí tengo
[290:28] que poner
[290:29] un agente
[290:30] que me
[290:30] me una
[290:32] cada cosa
[290:33] y estaba
[290:34] dialogando
[290:35] con
[290:35] con
[290:35] Houston
[290:36] me parece
[290:36] o sea
[290:37] claro
[290:38] lo que tengo que hacer
[290:39] es conectar una herramienta
[290:41] que cuando yo
[290:42] llegue ahí
[290:42] vaya a usar la herramienta
[290:44] y me la ubique
[290:45] es decir
[290:46] cuando por ejemplo
[290:47] una los PDFs
[290:48] porque uno
[290:48] puede unir PDFs
[290:50] en internet
[290:50] pero
[290:51] debo
[290:53] automatizar
[290:53] entonces
[290:54] yo preguntaba
[290:55] aquí puedo colocar
[290:56] un agente
[290:56] para eso
[290:57] cierto
[290:57] un agente
[290:58] de gestión
[290:58] documental
[290:59] que
[290:59] conecte las cosas
[291:02] y las lleve
[291:03] a donde yo
[291:04] quiera que las lleve
[291:05] de manera
[291:05] 100%
[291:06] le puedes decir
[291:07] entra acá
[291:08] sácamelas del Runt
[291:09] y metelas
[291:10] en este Google Drive
[291:11] y luego
[291:12] cuando las tengas
[291:12] córtalas
[291:13] ponlas así
[291:14] y tal
[291:14] ponlas bonitas
[291:15] luego
[291:15] mándamelas
[291:16] por correo
[291:16] o sea
[291:17] todo eso
[291:18] lo puedes hacer
[291:18] lo que antes
[291:19] tomaba
[291:20] conocimiento técnico
[291:21] para hacer
[291:26] todo esto
[291:27] hoy
[291:27] con lenguaje natural
[291:28] una persona
[291:29] los puede hacer
[291:29] sin necesitar
[291:30] un ingeniero
[291:30] tú lo puedes hacer
[291:32] perfectamente
[291:32] y si no sabes
[291:33] cómo hacer algo
[291:33] simplemente
[291:34] abre una misión
[291:35] y preguntarle a Houston
[291:35] ¿cómo harías esto?
[291:37] ayúdame a investigar
[291:37] qué herramientas
[291:38] hay allá afuera
[291:39] si se está volviendo
[291:41] y por otra parte
[291:42] me gusta mucho
[291:43] la astronomía
[291:43] cuando estoy pintando
[291:45] este error
[291:46] yo estoy
[291:47] el telescopio
[291:49] pues la verdad
[291:49] todos los días
[291:50] estoy fregando
[291:51] con imágenes
[291:52] de la NASA
[291:52] de la ESC
[291:53] muchas gracias
[291:54] también
[291:54] y lo otro es
[291:55] el web scrapping
[291:56] pues yo tengo
[291:57] o sea
[291:58] tengo empleados
[291:59] que digamos
[292:00] ya tengo automatizado
[292:01] para generar formularios
[292:02] de manera
[292:03] con AppSheet
[292:04] y todo esto
[292:05] con lo que
[292:07] podríamos hablar
[292:07] determinísticamente
[292:08] todo esto
[292:09] pero
[292:10] he venido como
[292:11] mirando la parte
[292:12] del web scrapping
[292:14] este Appify
[292:15] también
[292:15] con el
[292:16] cuando llaman
[292:18] no soy robot
[292:18] eso también
[292:19] lo maneja él
[292:21] o eso
[292:22] por ejemplo
[292:22] con el run
[292:24] por ejemplo
[292:24] sí
[292:26] yo creo que
[292:27] probablemente sí
[292:28] sino herramientas
[292:29] como esta que les mostré
[292:30] que se llama
[292:30] kernel.sh
[292:31] él ya puede manejar
[292:33] todo eso
[292:33] no soy robot
[292:34] lo puede manejar
[292:34] perfectamente
[292:35] acá dice
[292:35] mira
[292:36] resolvemos
[292:36] captchas
[292:37] o sea
[292:38] qué más
[292:40] por ejemplo
[292:41] esta gente
[292:41] de croma
[292:42] son unos colombianos
[292:43] muy pilos
[292:44] ya tú lo podrías
[292:47] integrar
[292:48] a Houston
[292:48] y ellos ya están
[292:49] conectados
[292:49] a un montón
[292:50] de data gubernamental
[292:51] no sé si el run
[292:52] está
[292:53] o sea
[292:53] me tocaría mirar
[292:54] busquemos
[292:58] croma
[292:59] data
[293:00] gobierno
[293:00] colombia
[293:01] run
[293:01] dice
[293:05] dice
[293:05] dice
[293:06] government data
[293:07] for Appy
[293:07] dice
[293:09] mira
[293:10] ramas judicial
[293:11] si
[293:12] sac
[293:13] superfinanciera
[293:14] registraduría
[293:15] policía nacional
[293:15] contratoría
[293:16] seco
[293:16] ah mira
[293:17] yo lo vi ahí
[293:17] por ahí
[293:18] se me
[293:19] corrió
[293:20] el run
[293:22] ya están con el run
[293:23] acaban de lanzar
[293:24] vamos a hacer
[293:25] un taller
[293:26] con ellos
[293:26] de cómo hacer
[293:27] temas
[293:28] del gobierno
[293:28] colombiano
[293:29] con Houston
[293:30] usando esta herramienta
[293:31] entonces
[293:32] por qué
[293:32] pregunto esto
[293:33] porque
[293:33] yo tengo
[293:33] automatizado
[293:34] gran parte
[293:35] del proceso
[293:36] solo que
[293:36] digamos
[293:37] los sábados
[293:37] y los domingos
[293:38] que son cuando
[293:38] venden más carros
[293:39] en los concesionarios
[293:40] entonces dicen
[293:41] necesito unos
[293:42] formularios
[293:42] para este carro
[293:43] entonces
[293:43] le pregunta
[293:45] alguien de nuestra
[293:46] empresa
[293:46] y se conectan
[293:47] al run
[293:47] entonces
[293:48] ellos solamente
[293:49] con la placa
[293:49] y la cédula
[293:50] este podría
[293:52] ir allá
[293:53] y me toma
[293:54] la información
[293:55] y las variables
[293:56] que yo ya tengo
[293:57] en las plantillas
[293:58] pues sencillamente
[293:59] péguelas ahí
[294:00] y tome
[294:00] su
[294:01] tome su
[294:02] tome sus
[294:04] formularios
[294:04] eso es lo que pretendo
[294:05] o sea
[294:06] yo lo que haría
[294:07] es lo conectaría
[294:07] al run
[294:08] lo conectaría
[294:08] es que esa base
[294:09] de datos
[294:09] estuviera en Google Sheets
[294:10] y que siempre estuviera
[294:11] generando temas
[294:13] en automático
[294:13] por ejemplo
[294:14] acá
[294:15] no lo vimos
[294:15] en esta sesión
[294:16] porque era un poquitico
[294:17] más avanzado
[294:17] pero se pueden
[294:18] generar rutinas
[294:19] y es tú
[294:19] creas la automatización
[294:20] una vez
[294:20] y le dices
[294:21] crea esto
[294:22] como una rutina
[294:22] quiero que todos los días
[294:23] a las 8 de la mañana
[294:24] vayas y mires
[294:25] qué pasó en el run
[294:25] y me hagas esto
[294:26] o todos los sábados
[294:28] y los domingos
[294:28] una vez a la semana
[294:29] quiero que hagas
[294:30] A, B, C, D
[294:30] ok
[294:32] pero creo que eso es como
[294:33] para un módulo más avanzado
[294:34] dentro de
[294:35] sí
[294:35] no claro
[294:36] esa es más avanzada
[294:38] y es muy chévere
[294:38] porque
[294:38] yo incluso
[294:40] alguien hablaba ahorita
[294:41] del Whatsapp
[294:41] y yo decía
[294:42] no pues tan sencillo
[294:43] que él me mande
[294:44] a un correo
[294:44] con la placa
[294:45] y la cédula
[294:46] a la persona
[294:46] y ya
[294:47] era agente
[294:48] recibe el correo
[294:49] toma esa información
[294:51] va al run
[294:52] crea la información
[294:52] y se le devuelve
[294:54] por correo
[294:54] así es
[294:57] así es
[294:57] Antonio
[294:58] y pues muchas gracias
[294:59] por la herramienta
[295:00] la verdad
[295:00] desde que
[295:01] el momento en que la vi
[295:02] yo decía
[295:02] sí
[295:03] o sea
[295:04] porque
[295:04] tengo la visión
[295:06] de mi empresa
[295:07] de saber
[295:07] qué voy a colocar
[295:08] qué voy a poner
[295:09] y qué
[295:09] qué herramientas
[295:11] voy a usar
[295:11] para
[295:12] pues no reemplazar
[295:13] a las personas
[295:13] sino para
[295:14] ayudarles mucho
[295:15] y para poder
[295:16] tener otros negocios
[295:17] que es lo que me interesa
[295:18] claro
[295:18] sí
[295:19] creo que nunca
[295:20] un mejor momento
[295:21] para ser una empresa pequeña
[295:22] porque con 10 agentes
[295:23] puedes rendir más
[295:24] que una empresa gigante
[295:25] así que bueno
[295:27] listo
[295:28] José Antonio
[295:28] muchas gracias
[295:29] vamos a buscar aquí
[295:30] por acá
[295:30] vamos a mirar
[295:32] John Morales
[295:33] te tengo en la lista
[295:34] de manitos levantadas
[295:35] por favor dime
[295:36] cuál es tu pregunta
[295:37] y los demás
[295:38] por favor hagan la pregunta
[295:39] por el chat
[295:40] de whatsapp
[295:41] si no se han unido
[295:42] ya les paso nuevamente
[295:43] el enlace
[295:43] porque estamos a 3 minutos
[295:46] John ya te doy
[295:49] dame un segundo
[295:49] ya te doy la palabra
[295:50] John
[295:50] que se me desaparece el chat
[295:51] listo
[295:53] John
[295:53] te acaba de pedir
[295:54] que por favor
[295:55] desmutees tu micrófono
[295:57] listo
[296:03] ahí te escuchamos
[296:04] ¿sí me escucha?
[296:05] sí ya fuerte y claro
[296:06] ah listo
[296:08] Felipe gracias
[296:08] felicitaciones
[296:09] es una plataforma excelente
[296:10] tengo un par de preguntas
[296:13] entendería que
[296:14] si yo utilizo esto
[296:16] para
[296:16] digamos que creo un agente
[296:17] vi que hay una tienda
[296:18] de agentes
[296:19] si yo creo un agente
[296:22] este quedaría automáticamente
[296:24] quedaría en esa tienda
[296:25] o quedaría en mi
[296:26] como en mi
[296:27] en mi espacio de trabajo
[296:29] y si necesitara
[296:31] de pronto usar
[296:33] no sé
[296:35] más capacidades
[296:35] eso cambiaría
[296:37] la suscripción
[296:37] hacia Houston
[296:38] o hacia las
[296:39] o hacia las
[296:41] digamos
[296:41] la integración
[296:42] de otras plataformas
[296:43] esa sería una
[296:45] y si yo quisiera
[296:45] crear un
[296:47] yo en este momento
[296:48] soy independiente
[296:49] y veo una necesidad
[296:51] importante en el mercado
[296:53] donde pues
[296:54] creería que
[296:55] crear un agente
[296:55] para una necesidad
[296:57] puntual
[296:57] en tema
[296:58] por ejemplo
[296:59] de ciberseguridad
[296:59] mirando
[297:00] todo lo que es
[297:01] el modelo de madurez
[297:02] y si quisiera
[297:04] ponerlo al servicio
[297:05] de empresas
[297:06] ¿cómo lo tendría que hacer?
[297:07] ¿la empresa se suscribe
[297:09] debe suscribirse
[297:10] a Houston
[297:10] debe entrar a la tienda
[297:12] y yo pongo
[297:13] la
[297:13] el agente
[297:14] para que la empresa
[297:15] los consuma
[297:16] o simplemente
[297:17] es un servicio
[297:18] que yo podría usar
[297:18] ¿cómo sería
[297:19] como el modelo
[297:20] de negocio
[297:20] para mí
[297:20] para sacarle
[297:21] provecho
[297:22] a Houston
[297:23] hacia
[297:24] algo comercial?
[297:26] Listo
[297:26] te respondo
[297:27] las dos
[297:27] todos los agentes
[297:28] que tú creas
[297:29] son privados
[297:30] y son personales
[297:30] a menos de que tú
[297:31] explícitamente
[297:32] le digas
[297:33] clic derecho
[297:33] exportar una copia
[297:34] y publicar
[297:35] en la tienda
[297:36] de agentes
[297:36] creo que eso
[297:37] puede ser algo
[297:38] Juli
[297:38] mi cofundador
[297:39] que revisemos
[297:40] para que sea más
[297:41] claro para la gente
[297:41] para las personas
[297:42] humanas
[297:43] eso es una cosa
[297:45] si tú estás
[297:46] interesado
[297:46] en ser partner
[297:47] de Houston
[297:48] a nivel de automatizaciones
[297:49] donde tú
[297:50] traes tu expertise
[297:51] y le haces
[297:51] automatizaciones
[297:52] a clientes tuyos
[297:54] podemos hablar
[297:55] yo te puedo mandar
[297:55] por el grupo de WhatsApp
[297:56] a los que estén interesados
[297:57] para que sean
[297:58] partners de Houston
[297:58] tenemos un programa
[298:00] de partners
[298:01] es muy sencillo
[298:01] las personas
[298:02] ustedes van
[298:03] y hacen las implementaciones
[298:04] el 100%
[298:05] de las implementaciones
[298:05] para ustedes
[298:06] y hay una comisión
[298:08] de cuando se vende Houston
[298:09] y ya está
[298:10] ok
[298:11] y las empresas
[298:13] pagan sus licencias
[298:13] de Houston
[298:14] ah ok
[298:16] listo
[298:16] yo creo la gente
[298:18] la empresa me lo paga
[298:19] pues yo soy partner tuyo
[298:20] y utilizo la plataforma
[298:22] sería así ¿cierto?
[298:23] yo pongo un precio
[298:24] ok
[298:25] y ese agente
[298:26] es privado tuyo
[298:27] y tú se lo compartes
[298:28] a las empresas
[298:28] a las que tú
[298:29] se lo quieras compartir
[298:30] ok listo
[298:32] perfecto
[298:33] bueno me interesa mucho
[298:34] el tema
[298:34] de partnership
[298:35] con Houston
[298:37] buenísimo
[298:38] escrírenos ahí
[298:38] por WhatsApp
[298:39] por favor
[298:39] por el grupo
[298:40] dinos que estás interesado
[298:41] y te mandamos
[298:41] por interno
[298:42] ok listo
[298:43] gracias
[298:43] gracias Felipe
[298:45] con muchísimo gusto
[298:46] listo
[298:47] yo sé que hay preguntas
[298:48] hay más
[298:49] más preguntas
[298:49] seguimos acá
[298:52] 217
[298:53] si quieren me quedo
[298:55] 5 minutos más
[298:56] y escucho
[298:56] pero me gustaría
[298:57] que vayan mandando
[298:58] me gustaría
[299:00] que vayan mandando
[299:01] por el grupo
[299:02] de WhatsApp
[299:02] las preguntas
[299:03] para que las podamos
[299:03] guardar
[299:04] y las podamos responder
[299:05] yo saliendo
[299:06] de esta llamada
[299:06] me voy a bajar
[299:07] con mi equipo
[299:07] voy a mirar
[299:08] todas las preguntas
[299:08] que hicieron
[299:09] en el chat
[299:09] le vamos a pedir
[299:10] a Houston
[299:10] yo tengo conectado
[299:11] Houston con Zoom
[299:12] le voy a decir
[299:13] que me haga una base
[299:14] de datos
[299:14] con todas las preguntas
[299:15] e intentar responderlas
[299:16] listo
[299:17] tienen comunidad
[299:18] si tenemos una comunidad
[299:19] vente
[299:20] comparto
[299:21] les compartimos
[299:22] por el grupo
[299:22] de WhatsApp
[299:23] les podemos compartir
[299:23] hay usuarios
[299:24] que lo están usando
[299:25] de todas maneras
[299:26] todos los que vinieron
[299:27] a este bootcamp
[299:27] y están en ese grupo
[299:28] de WhatsApp
[299:28] hay 360 personas
[299:30] esto de por sí
[299:31] también ya es gente
[299:32] que está aprendiendo
[299:32] está usando
[299:33] por ahí
[299:34] mandenlo
[299:34] listo
[299:35] les quiero agradecer
[299:36] a todos muchísimo
[299:37] les voy a mandar
[299:38] nuevamente
[299:39] cómo pueden trabajar
[299:40] con nosotros
[299:40] las empresas
[299:41] que ya nos están
[299:41] escribiendo
[299:42] que quieren trabajar
[299:42] con nosotros
[299:43] tenemos 10 cupos
[299:44] para empezar
[299:45] el 1 de septiembre
[299:46] y para obtener
[299:47] el certificado
[299:48] cómo sería
[299:48] listo
[299:49] miremos los que se quedaron
[299:50] acá Juan
[299:51] y hagamos el certificado
[299:52] a los que asistieron
[299:53] y se los mandamos
[299:54] por correo
[299:56] les mandamos
[299:56] de una manera
[299:56] acceder
[299:57] ¿les parece?
[300:00] listo
[300:00] muchísimas gracias
[300:01] que estén muy bien
[300:02] les deseo
[300:03] todo lo mejor
[300:03] y a mi equipo
[300:05] de Houston
[300:05] nos vemos en Slack
[300:07] en un par de minutos
[300:08] listo
[300:09] abrazo
[300:11] que estén muy bien
[300:12] que estén muy bien
[300:12] que estén muy bien
[300:13] chao
[300:14] chao
[300:14] chao
[300:14] nos vemos en LinkedIn
[300:17] agréguenme
[300:18] cuéntenle a alguien más
[300:19] de Houston
[300:19] listo
[300:24] terminaré esta llamada
[300:25] aquí
[300:25] un abrazo
