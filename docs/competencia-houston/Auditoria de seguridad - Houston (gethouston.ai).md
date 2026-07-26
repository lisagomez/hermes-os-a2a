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
