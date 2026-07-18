---
name: a2a-factory-design
description: Usa este skill para generar interfaces y assets bien-branded de A2A Factory (fábrica de agentes de IA, CLI-first, gamification con A2A Cards), para producción o para prototipos/mocks desechables. Contiene las guías de diseño, colores, tipografía, fuentes, assets y componentes del UI kit. Triggers: "diseña UI de A2A Factory", "landing de la fábrica", "componentes de marca", "A2A card", "cotizador deck-builder", "on-brand".
user-invocable: true
---

# A2A Factory — Design System (skill)

La fuente de verdad vive en el repo: **`businessos/frontends/design-system/`**.

Antes de diseñar o escribir UI de las superficies de cliente (`cliente-web2`, `cliente-a2a-web3`):

1. Lee `businessos/frontends/design-system/DESIGN-GUIDELINES.md` — reglas de marca completas
   (color, tipografía, iconografía, animación, tono ES/EN, gamification).
2. Revisa `businessos/frontends/design-system/README.md` — qué contiene y cómo consumirlo.
3. Fuente de verdad visual: `businessos/frontends/design-system/landing-reference.dc.html`.
4. Tokens: `businessos/frontends/design-system/tokens/*.css`. Componentes TSX:
   `businessos/frontends/design-system/components/` (barril en `components/index.ts`).

## Reglas rápidas (no romper la marca)

- Fondo casi-negro violáceo `--bg #0B0A10`; **nunca** blanco. Superficies en capas `--surface-1..4`.
- Firma = gradiente `--grad-brand` (violeta `#9F7BFF` → rosa `#FF4D8D`) en CTAs, barras de stats y
  headlines. Dorado = energía/coste; verde = éxito.
- Tipografía: Space Grotesk (display/UI) + JetBrains Mono (labels, datos, terminal, números, comandos).
- Iconografía = glifos unicode mono (◆ ▸ ▶ ⚡ ⚙ ✓ ✕ ●). Sin icon fonts ni SVGs dibujados.
- Bordes 1px blanco translúcido; punteados para "simulado/por definir". Radios 8–22px; pills 999px.
- Vocabulario de juego: carta, mazo, energía ⚡, rareza (RARA/ÉPICA/LEGENDARIA), stats AUT/VEL/INT.
- Tuteo siempre. Bilingüe ES/EN (ES primario). Emoji solo ⚡.

## Uso

- **Producción**: consume `@a2a/design-system` (ver README del design system) — importa tokens en
  `globals.css` y componentes del barril. No hardcodees colores; usa las CSS vars.
- **Artefactos/mocks**: copia los assets necesarios y genera HTML estático autocontenido.

Si el usuario invoca este skill sin más guía, pregunta qué quiere construir, haz un par de
preguntas y actúa como diseñador experto, sacando HTML on-brand o código de producción según el caso.
