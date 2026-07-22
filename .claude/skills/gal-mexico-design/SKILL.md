---
name: gal-mexico-design
description: Genera activos digitales entregables para el cliente GAL MEXICO (GAL Logistics — Hand Carry, Charter, Parcel, Express Freight) usando la METODOLOGÍA del design system A2A Factory con el BRANDING del cliente (paleta monocromática amarilla #F7C948, Archivo + IBM Plex). Todo activo se etiqueta como entregable del cliente y se registra su costo en tokens en el ledger. Triggers: "Activo GAL", "diseña para GAL", "rediseño web GAL", "GAL MEXICO", "GAL Logistics", "on-brand GAL".
user-invocable: true
---

# GAL MEXICO — activos digitales del cliente (skill)

La fuente de verdad vive en el repo: **`businessos/activos-clientes/gal-mexico/`**.

Antes de generar CUALQUIER activo para GAL:

1. Lee `businessos/activos-clientes/gal-mexico/branding/BRANDING.md` — guía de marca y reglas duras.
2. Tokens: `businessos/activos-clientes/gal-mexico/branding/gal-tokens.css` — usa las CSS vars, nunca hardcodees colores.
3. Referencia visual: `branding/paleta-gal-referencia.html` y `branding/branding-pagina-{1,2}.jpg`.
4. Metodología completa (pipeline, etiquetado, ledger): `businessos/activos-clientes/gal-mexico/README.md`.

## Reglas rápidas (no romper la marca GAL)

- Paleta **monocromática**: solo la escala amarilla `--gal-100..950`. NUNCA otro matiz.
- **Light-first**: fondo crema `--gal-100`, tinta `--gal-950`; paneles oscuros `--gal-950` solo como contraste. Es el INVERSO del dark de A2A Factory — no mezclar pieles.
- Tipografía: Archivo (display 800/900) + IBM Plex Sans (UI) + IBM Plex Mono (labels MAYÚSCULAS, tracking 1.5–3px).
- CTA primario: fondo `--gal-400`, texto `--gal-950`. Badges pill (ej. "EN TRÁNSITO").
- Copy: español MX, directo, urgencia logística serena.
- De A2A Factory se hereda la ESTRUCTURA (tokens, capas de componentes, jerarquía, eyebrows mono), no sus colores/fuentes/gamification.

## Obligatorio en cada activo (sin excepción)

1. **Etiqueta** de entregable al inicio del archivo (bloque "ACTIVO DIGITAL ENTREGABLE AL CLIENTE — Cliente: GAL MEXICO", ID `GALMX-NNN` secuencial, fecha). Binarios → sidecar `.meta.json`.
2. **Archivo** en `businessos/activos-clientes/gal-mexico/proyectos/<proyecto>/entregables/GALMX-NNN-<slug>.<ext>` (proyecto por defecto: `rediseno-web`) y actualizar la tabla de entregables del `PROYECTO.md`.
3. **Ledger**: añadir la línea a `activos.jsonl` (con campo `proyecto`, tokens estimados + costo con `fuente_costo` declarada) y REPORTAR el costo en el chat al entregar.
4. **Verificar** activos HTML con Playwright (screenshot) antes de darlos por listos.

Si la solicitud es ambigua, pregunta formato (HTML autocontenido / código de producción / imagen) y contenido antes de generar.
