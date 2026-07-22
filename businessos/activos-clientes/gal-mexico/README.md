# Activos digitales — Cliente: GAL MEXICO (GAL Logistics)

> Carpeta del cliente GAL MEXICO (vertical **clientes** de Hermes). Aquí viven su
> branding ingerido, sus activos digitales entregables y el ledger de costo en tokens.
> Metodología invocable con la skill `gal-mexico-design`.

## Cómo pedir un activo

Formato de solicitud (en Claude Code):

```
Activo GAL: <qué quieres> — <formato> — <contexto/contenido>
```

Ejemplos:
- `Activo GAL: mock de la home del rediseño web — HTML autocontenido — hero con cotizador de envío y rastreo`
- `Activo GAL: página de servicios (Hand Carry, Charter, Parcel, Express) — HTML`
- `Activo GAL: banner para LinkedIn — imagen 1584x396 — campaña Express Freight`

También disparan la metodología: "diseña … para GAL", "rediseño web GAL", "on-brand GAL".

## Pipeline (lo que hace el agente en cada solicitud)

1. **Cargar marca**: `branding/BRANDING.md` + `branding/gal-tokens.css` (fuente de verdad;
   nunca hardcodear colores fuera de los tokens).
2. **Generar** el activo con la metodología del design system A2A Factory (estructura,
   jerarquía, componentes) pero con la piel GAL (monocromática amarilla, light-first,
   Archivo + IBM Plex).
3. **Etiquetar**: todo archivo lleva el bloque de etiqueta (ver abajo) y el nombre
   `GALMX-NNN-<slug>.<ext>` dentro de `proyectos/<proyecto>/entregables/`.
4. **Registrar costo**: al cierre, una línea en `activos.jsonl` con los tokens estimados
   y el costo. El agente reporta el costo en el chat al entregar.
5. **Verificar**: activos HTML se abren/screenshotean (Playwright) antes de marcar listo.

## Etiqueta de entregable

Todo activo (HTML/CSS/MD) inicia con:

```html
<!-- ═══════════════════════════════════════════════════
     ACTIVO DIGITAL ENTREGABLE AL CLIENTE
     Cliente : GAL MEXICO (GAL Logistics)
     ID      : GALMX-NNN
     Fecha   : YYYY-MM-DD
     Origen  : A2A Factory · Hermes OS
     ═══════════════════════════════════════════════════ -->
```

Para binarios (imágenes), la etiqueta va en un sidecar `GALMX-NNN-<slug>.meta.json`.

## Ledger de costo (`activos.jsonl`)

Una línea JSON por activo:

```json
{"id":"GALMX-001","proyecto":"rediseno-web","fecha":"2026-07-22","tipo":"mock-html",
 "descripcion":"Home rediseño web","archivos":["proyectos/rediseno-web/entregables/GALMX-001-home.html"],
 "modelo":"<modelo de la sesión>","tokens_est":85000,
 "metodo_estimacion":"salida×4chars/token ×1.5 iteración + contexto",
 "costo_usd":1.20,"fuente_costo":"/cost de la sesión","estado":"borrador|entregado"}
```

Reglas de medición:
- **Tokens**: estimación = (caracteres generados ÷ 4) × factor 1.5 de iteración + overhead
  de contexto de la sesión. Si la sesión fue mono-activo, usar el dato real de `/cost`.
- **Costo USD**: preferir el `/cost` real de la sesión; si el activo compartió sesión,
  prorratear. Declarar siempre `fuente_costo` — nunca aparentar precisión que no hay.

## Estructura

```
activos-clientes/gal-mexico/
├── README.md            ← esta metodología
├── CLIENTE.md           ← ficha del cliente (servicios, proyectos, estado)
├── activos.jsonl        ← ledger (id, proyecto, tokens, costo)
├── branding/            ← fuente de verdad de marca (NO entregable)
│   ├── BRANDING.md      ← guía de marca + reglas duras
│   ├── gal-tokens.css   ← tokens CSS (escala 100–950, semántica, fuentes)
│   ├── paleta-gal-referencia.html
│   └── branding-pagina-{1,2}.jpg
└── proyectos/
    └── rediseno-web/
        ├── PROYECTO.md  ← alcance, hitos, estado, gates
        └── entregables/ ← activos etiquetados GALMX-NNN-*
```

> Control multitenant (todos los clientes): `businessos/activos-clientes/README.md`.
