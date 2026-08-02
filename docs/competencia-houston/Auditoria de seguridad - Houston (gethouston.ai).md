# Auditoría de seguridad, Houston (gethouston/houston)

> Auditoría técnica de código (distinta del análisis de mercado en el archivo hermano
> `Competencia - Houston (gethouston.ai).md` de esta misma carpeta). Repo clonado y auditado
> por OPS (Johann) el 2026-07-25, protocolo `repositorios-terceros` (clon `--depth 1`, solo
> lectura, 6 agentes en paralelo por área). Repo público: `https://github.com/gethouston/houston`.
>
> **Por qué importa para este equipo:** si en algún momento nos inspiramos en el código de
> Houston (sandbox de ejecución, escaneo de secretos al publicar al store, estructura de
> agentes/skills), estos son los errores concretos que ELLOS cometieron, para no repetirlos
> aquí. No es una crítica gratuita: el resto del repo tiene higiene de seguridad madura
> (ver "Superficie que salió limpia" abajo).

## Veredicto: SOSPECHOSO (no malicioso)

Sin evidencia de código malicioso intencional (sin backdoors, sin exfiltración a dominios
ajenos, sin prompt injection contra un agente lector, sin secretos reales filtrados, sin
dependencias de fuentes no oficiales). Sí hay defectos reales de seguridad, dos de severidad
alta, en la app de escritorio y en las migraciones de Supabase.

## Hallazgos (para no repetir)

| # | Severidad | Qué | Dónde (en el repo de Houston) | Lección para nosotros |
|---|---|---|---|---|
| 1 | ALTA | Tablas de Supabase con tokens OAuth reales (Anthropic/Codex) y API keys de integraciones (Composio) sin RLS ni REVOKE, a diferencia de tablas hermanas en el mismo repo que sí lo hacen. El propio repo prueba que el grant por defecto del proyecto es amplio (tuvieron que revocar `anon` de `profiles` explícitamente en otra migración, pero no en estas dos). | `supabase/migrations/20260608000000_workspace_credentials.sql`, `20260623000000_integration_credentials.sql` | Toda tabla con credenciales de terceros necesita RLS **y** un `revoke` explícito de `anon`/`authenticated`, no asumir que "nadie la va a consultar directo" es suficiente. Ya tenemos el gotcha hermano `[[revocar-execute-funciones-postgres]]` (funciones); este es el mismo principio aplicado a tablas de credenciales. |
| 2 | ALTA | `open_file`/`reveal_file` (Tauri) unen rutas sin verificar que el resultado siga dentro de la carpeta del agente. Una ruta absoluta o UNC generada por el LLM se renderiza como link clicable en el chat, y un clic ejecuta el binario, sin validación de contención. | `app/src-tauri/src/commands/os.rs:179-204` | Si Hermes o cualquier vertical alguna vez expone un comando que une un `base_path` con una ruta que puede venir de texto generado por el modelo (o de contenido externo que el modelo lea), verificar SIEMPRE `full.starts_with(&root)` sobre la ruta CANONICALIZADA antes de actuar sobre ella. Un `.join()` con una ruta absoluta reemplaza al root silenciosamente (comportamiento estándar de la librería, no un bug obvio a simple vista). |
| 3 | ALTA | `relaunch_app_from_path` ejecuta cualquier ruta local existente recibida por IPC, sin allowlist ni comparación contra el bundle real de la app. | `app/src-tauri/src/commands/update.rs:17-26` | Todo comando expuesto al webview/frontend que termine ejecutando un binario necesita una allowlist explícita, no solo "la ruta existe en disco". |
| 4 | MEDIA | `open_terminal` interpola `dir`/`cmd` sin escapar en AppleScript (inyectable con una comilla simple). Sin caller en el frontend actual (código muerto), pero registrado y expuesto por IPC. | `app/src-tauri/src/commands/terminal.rs:52-130` | El propio repo de Houston SÍ tiene una función de escape correcta en otro archivo (`dialogs.rs`) que simplemente no se reusó aquí. Lección: cuando ya existe un helper de escape en el proyecto, un lint/checklist de "todo string interpolado a un shell externo pasa por el escapador" evita este tipo de fuga por inconsistencia. |
| 5 | BAJA-MEDIA | Sin CSP en la app de escritorio (`"csp": null`). | `app/src-tauri/tauri.conf.json:28` | Defensa en profundidad barata para cualquier app Tauri/Electron que renderice contenido generado por un LLM. |
| 6 | BAJA | Datos reales de sesión de un desarrollador (Julian Arango) commiteados por descuido a la raíz del repo público: username local, notas de memoria de Claude Code sobre el producto, IDs de sesión. Sin contraseñas ni PII de terceros. | `.houston/`, `.claude/projects/-Users-ja-dev-houston/` | Nuestro propio `.claude/memory/`, `.houston`-equivalente (si algún día existe) y cualquier carpeta de estado de sesión SIEMPRE al `.gitignore` explícito, no solo "por convención no se commitea". |
| 7 | BAJA | `curl` seguido de `bash` sin pin de versión para instalar Sentry CLI, inconsistente con el resto del pipeline que sí pinea versiones. | `.github/workflows/release.yml:2051` | Ya lo hacemos bien en nuestros workflows (ver gotchas de este repo sobre Docker/COPY/imágenes pinneadas); mantenerlo también en instaladores de herramientas de terceros dentro de CI. |

## Superficie que salió limpia (vale la pena imitar)

- **Sandbox de ejecución de código** (`packages/code-sandbox`): `spawn` sin shell (nunca `exec`),
  grupo de procesos con SIGKILL para matar sub-hijos, `safeJoin` con validación estricta de
  traversal de rutas, symlinks excluidos al recolectar artefactos, token comparado con
  `timingSafeEqual`. Patrón sólido si algún día construimos algo similar para ejecutar código
  generado por un agente fuera del CLI.
- **Escaneo de secretos al publicar al store** (`packages/agentstore-contract/src/secrets.ts`):
  bloquea publicaciones con claves API/tokens filtrados (AWS, Anthropic, OpenAI, GitHub, Slack,
  Stripe, private keys, JWT) antes de que un usuario suba un agente al marketplace.
- Scripts de build con descarga externa (`frpc`, `whisper.cpp`) **verifican SHA256** contra el
  checksum publicado en el release oficial antes de usar el binario.
- `.env.example`/`.env.development` con placeholders reales, `.gitignore` correcto para
  `.env.local`/`.env.*.local`, Dockerfiles con usuario no-root e imágenes pinneadas.

## En simple, para cualquiera del equipo (sin jerga técnica)

Houston tiene una base de código madura en casi todo, pero dejó dos puertas sin el candado
correcto:

1. **Guardan las claves de acceso de sus usuarios (a Anthropic, a Composio) en una tabla de
   base de datos que no tiene el filtro de "quién puede leer qué".** En otras tablas parecidas
   del mismo proyecto sí pusieron ese filtro; en esta no. Si el permiso general de la base de
   datos sigue tan abierto como en otras partes del mismo repo (no lo confirmamos en vivo,
   solo por el código), cualquier usuario registrado podría, en teoría, leer las claves de
   OTRO usuario.
2. **Su app de escritorio puede abrir un archivo sin comprobar bien la ruta.** Si un agente de
   IA dentro de la app es manipulado (por ejemplo, por texto malicioso que lee de internet)
   para que muestre una ruta con truco, y el usuario le hace clic, la app podría terminar
   ejecutando un programa que no debía, sin que la app se dé cuenta.

Ninguna de las dos es "hackeo" ni mala intención: son errores típicos de un producto que creció
rápido y no cerró el círculo de "quién puede tocar esto". El resto de su código (cómo
sandboxean la ejecución de código de un agente, cómo escanean secretos antes de publicar al
store) está bien hecho, incluso mejor que el promedio.

## Qué errores NO cometer nosotros (checklist)

- [ ] Toda tabla que guarde credenciales/tokens de un usuario (propio o de una integración de
  terceros) lleva RLS **y** `revoke` explícito de `anon`/`authenticated` desde el día en que se
  crea la tabla, no como tarea pendiente. Mismo principio que ya tenemos documentado en
  `[[revocar-execute-funciones-postgres]]` para funciones.
- [ ] Cualquier comando que combine una carpeta base con una ruta que puede venir de texto
  generado por el modelo (o de contenido externo que el modelo lea) valida que el resultado
  siga DENTRO de esa carpeta, sobre la ruta ya resuelta (canonicalizada), antes de actuar.
- [ ] Cualquier comando expuesto al frontend que termine ejecutando un binario tiene una lista
  explícita de qué puede ejecutar, nunca "si el archivo existe, se ejecuta".
- [ ] Si el proyecto ya tiene una función que escapa caracteres peligrosos (para AppleScript,
  shell, etc.), usarla en TODOS los lugares que interpolen ese mismo tipo de dato, no solo en
  el primero que se escribió.
- [ ] Cualquier carpeta de estado de sesión o memoria de agente va al `.gitignore` explícito
  desde que se crea, no "por convención se sabe que no se commitea".

## Oportunidad de posicionamiento (para ventas/marketing, lente growth)

Esto no es para atacar a Houston en público (no hay evidencia de mala fe, y publicar hallazgos
de seguridad de un tercero sin darles tiempo de corregir es mala práctica de comunidad). Es
inteligencia competitiva interna: dónde Hermes ya es objetivamente más fuerte y puede
apoyarse en eso al vender, sobre todo a clientes corporativos/regulados (el segmento donde ya
competimos con el grafo fiscal/legal).

- **Aislamiento real de credenciales, no solo un claim.** Hermes usa el patrón host-job +
  snapshot: el agente NUNCA toca una credencial real, un proceso de confianza del host la usa
  y le entrega al agente solo el resultado (ver gotcha `2026-06-30` en `CLAUDE.md`). Houston
  guarda las credenciales en una tabla que el agente/backend consulta directo. Para un
  comprador corporativo que hace due diligence de proveedores, "el agente nunca ve tu
  credencial" es un argumento de venta concreto y demostrable, no una frase de marketing.
- **Un agente que nunca ejecuta binarios locales por su cuenta** es otra historia de venta
  frente al miedo típico de un comprador corporativo a "agentes autónomos con acceso al
  sistema". El vector de Houston (ruta manipulada → clic → ejecución) es exactamente ese
  miedo materializado.
- Si en una conversación comercial sale la comparación con Houston, la respuesta lista es:
  "nuestros agentes corren en un patrón donde nunca tocan tus credenciales ni tu sistema de
  archivos directo", sin necesidad de mencionar bugs específicos de un tercero.
- **Tarea de higiene propia:** revisar si Hermes tiene alguna tabla equivalente a
  `workspace_credentials` (cualquier tabla con tokens/API keys de integraciones de clientes)
  y confirmar que ya tiene RLS + revoke aplicado. Si el patrón host-job + snapshot cubre el
  100% de los casos, esto es una verificación rápida, no una tarea nueva.

## Accionables concretos

1. **[Ingeniería]** Antes de tomar cualquier patrón de código de Houston como inspiración
   (sandbox, escaneo de secretos, estructura de skills), pasar por el checklist de arriba.
2. **[Ingeniería]** Auditar las tablas propias con credenciales de terceros contra el mismo
   criterio RLS/REVOKE (ver "Tarea de higiene propia" arriba).
3. **[Ventas/Estrategia]** Tener lista la respuesta de posicionamiento de arriba para cuando
   Houston salga en una conversación comercial.
4. **[Comunidad, opcional]** Houston tiene proceso de reporte responsable en su `SECURITY.md`
   (GitHub Security Advisories). Si el equipo quiere ser buena práctica de comunidad, reportar
   los hallazgos 1-3 ahí es una opción, no una obligación; decisión de Johann.

## Decisión de Johann (OPS, 2026-07-25)

El clon completo queda en cuarentena en OPS (`_Revisar seguridad/houston/`, marcado
SOSPECHOSO, no se usa/instala/ejecuta nada de él) para inspiración de patrones. Este documento
es el resumen relevante para el equipo de Hermes OS A2A: qué evitar si algún día tomamos
prestada una idea de arquitectura de Houston.

## Confirmación directa de Houston (2026-08-01, registro nuevo, no reemplaza lo de arriba)

En una llamada, Johann preguntó a Houston cómo protegen la información al conectar las 1000+
herramientas. Respuesta textual que le dieron: *"Utilizamos Composio como gestor de
integraciones. Ellos manejan las credenciales con sus políticas de seguridad y datos. El
agente accede a las herramientas con un token de acceso pero no directamente con tu clave."*

Esto sube el hallazgo #1 de "sospecha por código" a **confirmado por el propio proveedor**:
Houston sí usa Composio (coincide con lo ya encontrado en `packages/agentstore-*`). Pero la
respuesta NO resuelve el hallazgo, solo lo esquiva:

- "Token de acceso, no tu clave" es el comportamiento ESTÁNDAR de cualquier OAuth (Google
  Calendar, HubSpot, todos funcionan así), no una protección especial de Houston. Lo
  presentaron como diferenciador y no lo es.
- No explica por qué Houston, además de lo que gestiona Composio, GUARDA su propia copia del
  payload de Composio (incluye `apiKey`) en su tabla `integration_credentials`, sin RLS ni
  REVOKE (el hallazgo #1 original, arriba, sigue intacto).
- No aclara si el PROCESO del agente puede leer ese token en texto plano mientras corre una
  tarea, que es la diferencia real con nuestro patrón host-job + snapshot (el agente nunca
  toca ni el token). Esto refuerza la oportunidad de posicionamiento de la sección anterior:
  no es solo un claim nuestro, es un hueco verbal real que dejó Houston sin resolver.

Verificado también el mismo día: `https://gethouston.ai/privacy/` no nombra a Composio como
subprocesador, no menciona OAuth ni scopes, y solo promete "credenciales cifradas en sus
servidores" (plan Cloud) o guardadas localmente (app de escritorio); ninguna garantía técnica
específica de aislamiento del token frente al agente.

## Anexo (2026-08-01): su CTO respondió en público la mitad que faltaba

**Fuente:** bootcamp abierto de Houston del 2026-08-01 (sesión en vivo de ~5 horas, con Q&A del
público), abierto por inscripción y con más de 500 asistentes. Las citas de abajo son de ese evento, con
la marca de tiempo de la grabación; son declaraciones de los fundadores en su propio evento, no
material filtrado. No hay transcripción oficial publicada por Houston, así que la evidencia es el
registro de la sesión, no un documento de ellos. Nada de esto cambia el veredicto del 2026-07-25:
lo complementa.

### Lo que dijeron, textual

Johann preguntó al micrófono [3:15:19], partiendo del propio aviso de onboarding de Houston ("los
agentes actúan en tu nombre, pueden ser engañados"), si el token vive en algún proceso que el agente
pueda leer mientras corre una tarea. El encuadre importa porque es el mismo que usamos al vender:

> *"para nosotros el riesgo no es tanto que me roben la contraseña, sino que el agente manipulado,
> bien sea por prompt injection o prompt malicioso, termine usando ese token para algo que no pedí."*

**Respuesta de Julian Arango (cofundador y CTO)** [3:16:45], que es justo la duda que la sección
anterior dejó abierta:

> *"El token tu agente no lo puede ver. En ningún momento el agente va a tener acceso a ese token,
> todo queda separado del agente."*

Y sobre integraciones personalizadas, donde el usuario pega una clave a mano:

> *"eso lo guardamos nosotros en un secret manager en Google Cloud, que es lo más seguro a nivel de
> industria. Así nos aseguramos de que su agente nunca vea esos tokens, porque compartirlos por el
> chat es peligroso."*

**Sobre la tienda de agentes** [3:33:13], al importar un agente publicado por otra persona, Houston
ofrece revisarlo automáticamente *"para evitar temas de inyecciones de prompt o que les estén
intentando sacar seguridad"*.

**Sobre los sellos de seguridad** [3:05:06], el otro cofundador aclaró que Composio tiene una versión
gratuita y una empresarial, que es la que ellos usan: *"la versión gratuita no tiene nada de eso"*.
O sea, el **SOC 2 e ISO 27001 que Houston promociona son del tier empresarial de Composio, su
proveedor, no certificaciones de Houston.**

### Qué cierra y qué no

- **Cierra la mitad de CONFIDENCIALIDAD** del hallazgo #1: hay una afirmación explícita y pública del
  CTO de que el agente no lee la credencial. Sigue siendo un claim verbal, no verificado contra
  código, y **convive sin explicación con el hallazgo #1**: que el agente no lo lea no dice nada
  sobre quién más puede leer la tabla `integration_credentials` (sin RLS ni REVOKE). El hallazgo
  queda intacto.
- **NO responde la mitad de INTEGRIDAD**, que es la que importa para un comprador regulado: un
  agente manipulado por prompt injection usando el acceso que **ya tiene autorizado**. Un secret
  manager no impide que una inyección le diga al agente "manda este documento a tal correo" por la
  integración de Gmail que el usuario ya conectó. Esa superficie sigue sin respuesta pública.
- **Su única mitigación anti-injection visible es de SUMINISTRO, no de EJECUCIÓN.** El escaneo al
  importar un agente de la tienda cubre el marketplace (un agente malicioso publicado); no cubre el
  contenido que el agente lee mientras trabaja (correos, páginas web, comentarios), que es el vector
  real en operación. Son dos superficies distintas y solo tienen resuelta la primera.
- **Pendiente cobrable si el equipo evalúa a Houston:** en el mismo Q&A [3:18:27] Johann pidió el
  contrato y la política de datos de Composio, con el argumento de que el cliente le da acceso a
  Houston pero de paso se lo está dando a un tercero. Julian se comprometió: *"te podríamos compartir
  toda la política de privacidad de data y todos sus certificados."* Al 2026-08-01 no ha llegado ni
  está publicado. Es lo concreto que hay que exigir antes de meter credenciales de un cliente en esa
  cadena.

### Qué cambia para nosotros (posicionamiento)

**El diferenciador se mueve, y para bien.** Ya no es "nosotros aislamos la credencial y ellos no":
ellos ahora afirman en público que la aíslan, y discutir eso nos pone a contradecir un claim que no
podemos verificar. El diferenciador defendible es el siguiente escalón:

> **"Nosotros contenemos al agente manipulado en tiempo de ejecución."**

Es la pregunta que su CTO recibió en abierto y dejó sin responder, y es exactamente el miedo del
comprador corporativo: no que le roben la clave, sino que el agente haga algo que nadie pidió con el
acceso que ya le dieron.

Dos consecuencias prácticas:

1. **[Ingeniería] Antes de usar ese argumento en una venta, hay que poder demostrarlo.** El patrón
   host-job + snapshot cubre la confidencialidad (el agente nunca toca la credencial). La pregunta
   abierta para nosotros es la misma que le hicieron a ellos: qué contiene a nuestro agente cuando el
   contenido que lee intenta manipularlo, y qué de eso está implementado hoy frente a qué es diseño.
   Vale escribir esa respuesta antes de necesitarla en una reunión.
2. **[Ventas] Esto es inteligencia interna, no munición pública.** Sigue en pie lo de la sección de
   posicionamiento: no se atacan hallazgos de un tercero en público, y las citas de arriba no se
   sacan de contexto en una comparación comercial. Sirven para saber qué preguntar y qué prometer.
