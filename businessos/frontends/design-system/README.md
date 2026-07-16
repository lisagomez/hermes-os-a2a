# `@a2a/design-system` — Design System de A2A Factory

Fuente de verdad de marca para las **superficies de cliente** del Business OS
(`cliente-web2`, `cliente-a2a-web3`). **No** aplica a `control-interno`, que tiene su propia
marca (Titaniumorphism). Mantiene el patrón del repo: *aislar, no fundir*.

## Procedencia

Adoptado (vendored) del ZIP `Interfaz Hermes A2A Factory.zip` provisto por la dueña
(2026-07-16) — export del skill de diseño de Claude para "A2A Factory". Fuente de verdad
visual original: `landing-reference.dc.html`. Guía completa de marca: `DESIGN-GUIDELINES.md`.

## Qué contiene

| Ruta | Qué es |
|------|--------|
| `tokens/` | Tokens CSS (colors, typography, spacing, effects). `index.css` = entry para bundler (sin @import de fuentes). `styles.css` (raíz) / `typography.css` = variante standalone con Google Fonts. |
| `components/core/` | `Button`, `PillToggle`, `Badge`, `EnergyChip`, `StatBar`, `Tabs` (TSX, CSS-var driven). |
| `components/modules/` | `AgentCard`, `TerminalWindow`, `KpiCard`. |
| `components/index.ts` | Barril de exports. |
| `guidelines/` | Specimen cards (colors/type/spacing/brand) — referencia visual. |
| `ui_kits/landing/` | Recreación estática de la landing. |
| `landing-reference.dc.html` | Diseño vivo original (fuente de verdad). |
| `DESIGN-GUIDELINES.md` | Reglas de marca: color, tipografía, iconografía, animación, tono. |

## Firma de marca (resumen)

- Fondo casi-negro violáceo `--bg #0B0A10`; superficies en capas.
- Dúo violeta `#9F7BFF` + rosa `#FF4D8D`; el gradiente `--grad-brand` es LA firma (CTAs, stats, headlines).
- Space Grotesk (display) + JetBrains Mono (labels, datos, terminal). Mono siempre para números/comandos.
- Iconografía = glifos unicode mono (◆ ▸ ▶ ⚡ ⚙ ✓ ✕). Sin icon fonts ni SVGs.
- Capa de gamification: A2A Cards con rareza/energía/stats.

## Cómo consumirlo (Next.js)

1. `package.json`: `"@a2a/design-system": "file:../design-system"`.
2. `next.config.ts`: `transpilePackages: ['@a2a/design-system']`.
3. En `globals.css`: `@import "@a2a/design-system/tokens.css";` (los tokens quedan como CSS vars).
4. Cargar las fuentes con `next/font` y exponer `--font-display` / `--font-mono` en `:root`/body.
5. Importar componentes: `import { Button, AgentCard } from '@a2a/design-system';`.

Los componentes NO traen sus propias fuentes ni resetean estilos: dependen de los tokens y de
que la app defina las familias tipográficas. Así la marca vive en un solo lugar.
