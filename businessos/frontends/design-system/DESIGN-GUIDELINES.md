# A2A Factory — Design System

Sistema de diseño de **A2A·Factory** (nombre comercial por definir; proyecto "Interfaz Hermes A2A Factory"): una fábrica de agentes de IA que adapta cada proyecto al caso de uso del cliente de principio a fin, con panel operativo/financiero, control de presupuesto y proyección. Dos shoppers: **humano** (contrata vía web/llamada) y **agente A2A** (contrata por protocolo: manifest + RPC + settlement fiat/USDC). Enfoque **CLI-first** y capa de **gamification**: las especialidades se presentan como *A2A Cards* coleccionables y el cotizador es un *deck builder*.

## Fuentes
- Diseño de referencia: `A2A Factory Landing.dc.html` (este proyecto) — fuente de verdad visual.
- Repo mencionado: https://github.com/lisagomez/hermes-os-a2a (no accesible públicamente al momento del setup; pendiente conectar GitHub).
- Referencia de dinamismo: arkham.tech/es/producto (reveals de scroll, tickers, tabs).

## CONTENT FUNDAMENTALS
- **Bilingüe ES/EN** con toggle; el español es el idioma primario.
- **Tono mixto por audiencia**: divertido y cercano para el shopper humano ("Atiende a tus clientes hasta cuando duermes"); técnico y directo para el shopper A2A ("Pipeline autónomo… SLA respuesta < 3 s").
- Tuteo siempre ("tu caso de uso", "arma tu mazo"). Nunca usted.
- Vocabulario de juego consistente: carta, mazo, energía ⚡, rareza (RARA/ÉPICA/LEGENDARIA), stats AUT/VEL/INT.
- Comentarios estilo código para disclaimers: `// widget simulado — en desarrollo se enlaza a Calendly`.
- Comandos CLI como copy: `$ a2a init --caso "ecommerce" --alcance full`.
- Emoji: solo ⚡ (energía) y ocasional en diálogos de demo de clientes. No en headings.
- Mayúsculas: kickers y labels en MAYÚSCULAS mono con tracking amplio; headings en sentence case.

## VISUAL FOUNDATIONS
- **Fondo**: casi-negro violáceo `--bg #0B0A10`, superficies en capas (`--surface-1..4`). Nunca blanco.
- **Color**: dúo violeta `#9F7BFF` + rosa `#FF4D8D`; el gradiente `--grad-brand` (120deg) es LA firma — CTAs, barras de stats, texto degradado en headlines. Dorado = energía/coste; verde = éxito/estado OK. Máx. 1-2 colores de fondo por vista.
- **Tipografía**: Space Grotesk (display/UI) + JetBrains Mono (labels, datos, terminal, kickers). Mono siempre para números, comandos y metadatos.
- **Bordes**: 1px blanco translúcido (`--border-1..3`); bordes punteados para elementos "simulados/por definir".
- **Radios**: 8-22px según jerarquía; pills 999px para toggles y CTAs de nav.
- **Sombras/glow**: sombras negras profundas + glow de color (violeta/rosa/dorado) en elementos interactivos. Orbes radiales (`--orb-*`) como avatares de agentes.
- **Animación**: cursor parpadeante (blink 1s), pulsos en nodos de red, shimmer holo en cartas, floaty en orbes, fade-up ligado a scroll (`animation-timeline: view()`), ticker infinito. Easing suave .25s en hovers.
- **Hover**: elevación (translateY −6/−8px) + borde acento + glow. Press: sin tratamiento específico.
- **Cards**: fondo gradiente sutil hacia surface, borde 1px, radio 16-22px; carta seleccionada = borde dorado.
- **Transparencia/blur**: nav sticky con backdrop-blur; modales con overlay blur.
- **Layout**: contenedor 1240px, padding 32px; grids CSS (3 y 4 columnas).

## ICONOGRAPHY
- **Sin set de iconos**: se usan caracteres unicode como glifos mono: ◆ ▸ ▶ ⚡ ⚙ ✓ ✕ ● ▲ ☎ ⇄ ▦ ⬢ ★ ↻ ⚠. Mantener este sistema; no introducir icon fonts ni SVGs dibujados.
- **Sin logo**: no existe marca gráfica provista. El "logo" actual es un orbe radial violeta + wordmark "A2A·FACTORY" en Space Grotesk 700 con tracking .14em. Cuando se defina el nombre real, sustituir.
- Semáforo mac (rojo/ámbar/verde) en chrome de ventanas terminal.

## Intentional additions
- Set base de componentes (no había inventario fuente): Button, PillToggle, Badge, EnergyChip, StatBar, Tabs + módulos AgentCard, TerminalWindow, KpiCard — todos extraídos 1:1 de la landing construida.

## Índice
- `styles.css` — entry point (importa tokens/).
- `tokens/` — colors, typography, spacing, effects.
- `guidelines/` — specimen cards (Colors, Type, Spacing, Brand).
- `components/core/` — Button, PillToggle, Badge, EnergyChip, StatBar, Tabs.
- `components/modules/` — AgentCard, TerminalWindow, KpiCard.
- `ui_kits/landing/` — recreación de la landing (hero + cards).
- `A2A Factory Landing.dc.html` — diseño vivo original.
- `SKILL.md` — skill para Claude Code.

## Pendientes / caveats
- Fuentes vía Google Fonts CDN (no hay binarios propios). Si se compran webfonts, sustituir en `tokens/typography.css`.
- Nombre de marca por definir; endpoint A2A y URL de calendario simulados (solicitar en desarrollo).

## Excepción aprobada — sprites pixel de la Oficina A2A (2026-07-18)
La regla 'no introducir SVGs/sprites dibujados' tiene UNA excepción aprobada por el dueño: los personajes pixel de la sección Oficina A2A de cliente-web2. Condiciones: (1) se generan in-house desde cliente-web2/scripts/gen_sprites.py (grids de texto editables — nunca packs de terceros), (2) paleta bloqueada a los tokens del sistema, (3) alcance limitado a la escena de oficina — el orbe sigue siendo el avatar oficial del agente en cards, chips y logo.
