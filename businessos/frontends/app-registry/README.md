# @a2a/app-registry

Registro **canónico** de las apps del ecosistema (waffle/App Launcher) + schema de la
**navegación jerárquica** (Sección → Página → Subpágina, máx 3 niveles, breadcrumb
derivado). **Datos puros**: cero JSX, cero dependencias — se comparte el DATO, nunca el
componente ("aislar, no fundir"). El launcher y el sidebar se pintan POR app con sus
tokens locales.

## Alta de una app nueva

1. Fila en `src/apps.ts` con `audiencia: 'interna' | 'publica'` decidida **al nacer**
   — las públicas jamás pintan launcher (`appsParaLauncher()` filtra internas).
2. Subir `REGISTRY_VERSION` + línea en `CHANGELOG.md`.
3. `node scripts/sync-vendored.mjs` — **en el MISMO commit**.
4. La app nueva define su árbol en su propio `nav.config.ts` (tipado con `NavArbol`,
   validado con `validarArbol` en sus tests) y monta sus componentes locales de
   launcher/sidebar/breadcrumb (copiar el patrón de cualquiera de las 3 integradas).

## Consumo

- **Vendored (default)**: copia en `src/shared/app-registry/` de cada app, escrita por
  `scripts/sync-vendored.mjs`. Cero costo de deploy. El modo `--check` va cableado a los
  tests de cada app: el drift es gate rojo, nunca silencioso.
- **`file:` (apps futuras cuyo deploy ya suba `frontends/`)**: `"@a2a/app-registry":
  "file:../app-registry"` + `transpilePackages` + `turbopack.root` al ancestro común
  (patrón cliente-web2/design-system, con sus minas documentadas en DEPLOY-web2 §0).

### URLs por entorno

`resolverUrlApp(app, { overrides, produccion })`. GOTCHA Next: `process.env[dinámico]`
no se inline-a en cliente — cada app declara su mapa ESTÁTICO:

```ts
const OVERRIDES_URL = {
  'control-interno': process.env.NEXT_PUBLIC_APP_CONTROL_INTERNO_URL,
  'meeting-copilot': process.env.NEXT_PUBLIC_APP_MEETING_COPILOT_URL,
  // …claves literales por app
}
```

Una URL rota en producción se corrige EN CALIENTE con la env var del deploy afectado;
el canónico se corrige después con calma.

## Estados de tile del launcher (mismos en todas las apps)

| Estado | Condición | Comportamiento |
|---|---|---|
| actual | id === app propia | Resaltada, no-link |
| activa | URL resuelta | Link normal (`target="_self"`) |
| acceso-especial | URL + `nota` | Clickeable; la nota se pinta (p. ej. "vía túnel SSH") |
| en-construccion | `urlProd: ''` sin override | Deshabilitada, chip "En construcción", link "saber más" si hay `docUrl` |

## Protocolo de drift (`--check` rojo)

- **Quién corrige**: el autor del cambio al registro que no sincronizó; drift huérfano →
  responsable de frontends/dep-desarrollo. JAMÁS se escala a la dueña (es tooling).
- **Cómo**: `node scripts/sync-vendored.mjs` + commit `chore(app-registry): sync vN` en
  el MISMO PR rojo. Prohibido editar la copia vendored a mano.
- **Registro**: etiqueta `registry-drift` en el PR + línea en CHANGELOG al resolver. Al
  ROADMAP solo si el drift llegó a producción (URL rota desplegada).

## Fase X (futura) — unificación a paquete compartido

Disparadores (2 de 4): ≥4 consumidores en frontends/ · `--check` rojo ≥2 veces/trimestre ·
deploy de meeting-copilot ya migrado a upload-root `frontends/` · control-interno con
build de imagen. Precondiciones: copilot → Root Directory por API (patrón DEPLOY-web2
§0.1); control-interno → Dockerfile con COPY de app + app-registry. Mission Control queda
vendored PERMANENTE (vive en la raíz; su `.vercelignore` excluye `businessos/`).

## Auth y cookies (gate duro)

El launcher NO introduce auth: cada app conserva su puerta y un tile hacia una app sin
acceso termina en el rechazo de la app destino (honesto). Hoy cada app vive en su
dominio; **si algún día se unifican dominios**, revisar el scope de las cookies Supabase
ANTES (incidente 2026-07-28: dos apps compartieron cookie). Requisito: ningún PR que
unifique dominios o toque config de cookies/auth se mergea sin el smoke
`businessos/smoke-auth-superficies.py` verde contra un preview (candado sin sesión +
sesión mintada por admin API + asserts de Set-Cookie host-only y nombres `sb-<ref>-*`
sin colisión).
