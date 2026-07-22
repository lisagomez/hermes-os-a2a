# GAL MEXICO (GAL Logistics) — Guía de marca

> Fuente: `Paleta de colores GAL Logistics.zip` + `branding GAL.oxps` (recibidos 2026-07-22).
> Referencia visual: `paleta-gal-referencia.html` (misma carpeta). Tokens: `gal-tokens.css`.

## Identidad

- **Negocio**: logística express — *Hand Carry · Charter · Parcel · Express Freight Services*.
- **Valores** (cada uno mapea a un nivel de la escala): **Seguridad** (950, casi negro),
  **Confianza** (600, medio corporativo), **Productividad** (claros 100/200),
  **Eficiencia** (400, amarillo pleno).
- **Logo**: wordmark tipográfico "GAL Logistics" en Archivo 900, color `--gal-950`.
  No hay imagotipo/isotipo en el material recibido.

## Reglas duras (no romper la marca)

1. **Paleta monocromática**: un único tono amarillo en 6 niveles de luminosidad
   (`#FFFBEC → #2A2205`). **Nunca** introducir otro matiz (ni verdes de éxito ni rojos
   de error genéricos: los estados se resuelven dentro de la escala + iconografía/texto).
2. **Light-first**: fondo base crema `--gal-100`, tinta `--gal-950`. Paneles oscuros
   (`--gal-950`) solo como bloques de contraste (hero, tarjetas "Seguridad"). Es el
   INVERSO del design system A2A (que es dark-first) — no confundir pieles.
3. **Tipografía**: Archivo (display, 800/900, tracking apretado) + IBM Plex Sans (UI/cuerpo)
   + IBM Plex Mono (eyebrows/labels/datos en MAYÚSCULAS con tracking 1.5–3px).
4. **CTAs**: primario = fondo `--gal-400` con texto `--gal-950`; secundario = outline
   sobre fondo del panel.
5. Radios suaves (8–16px, pills para badges de estado tipo "EN TRÁNSITO").
6. Tono de copy: directo, logístico, urgencia serena ("Tu carga, en el próximo vuelo
   disponible."). Español MX primario.

## Qué se hereda del design system A2A Factory

La **metodología y estructura** (tokens CSS-var driven, componentes por capas core/modules,
eyebrows en mono, jerarquía de superficies, referencia visual HTML como fuente de verdad) —
**no** los colores ni las fuentes de A2A. El mapeo semántico de `gal-tokens.css` replica los
nombres de vars del design system A2A para poder reutilizar patrones de componentes.
