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

## Decisión de Johann (OPS, 2026-07-25)

El clon completo queda en cuarentena en OPS (`_Revisar seguridad/houston/`, marcado
SOSPECHOSO, no se usa/instala/ejecuta nada de él) para inspiración de patrones. Este documento
es el resumen relevante para el equipo de Hermes OS A2A: qué evitar si algún día tomamos
prestada una idea de arquitectura de Houston.
