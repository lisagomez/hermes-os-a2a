# Generación automática de CLIs conforme el proyecto madura

Cómo lograr que Hermes OS · A2A imprima sus propios CLIs al avanzar de fase, en lugar
de hacerlo a mano. Tres niveles, de menos a más automático. Empieza por el 1.

## Pieza previa (una sola vez)
Printing Press necesita Claude Code + Go 1.26.4+. Instálalo en la máquina donde
corra el agente que imprimirá (puede ser tu equipo, no el servidor):

    curl -fsSL https://raw.githubusercontent.com/mvanhorn/cli-printing-press/main/scripts/install.sh | bash

Reinicia Claude Code. Verifica con: cli-printing-press --version

## Nivel 1 — Manual asistido (empieza aquí)
Tú decides cuándo, el sistema sabe el qué.

1. Cuando completes una fase del ROADMAP, corre:
       ./print-phase.sh <fase> --emit
2. Eso escribe los prompts de impresión en /tmp/printing-press-fase-<fase>.txt
3. Ábrelo en Claude Code y corre cada /printing-press, o pega el archivo a un
   agente y dile: "imprime estos uno por uno, grado A mínimo".

Por qué empezar aquí: imprimir un CLI consume tokens (es trabajo de Opus/Codex).
Quieres verlo y aprobar el gasto las primeras veces, no que se dispare solo.

## Nivel 2 — Gatillo por fase (cuando confíes en el flujo)
El avance de fase dispara la preparación.

- Añade al cron de Hermes-negocio una skill: "cuando yo marque una fase como
  completada en el ROADMAP (o cuando te lo diga), corre print-phase.sh de la
  SIGUIENTE fase en modo --emit y avísame por Telegram con la lista de CLIs que
  tocaría imprimir, su costo estimado en tokens, y un botón para aprobar."
- Tú apruebas desde Telegram; recién entonces se imprime.

Esto mantiene el control humano (apruebas el gasto) pero quita el trabajo de
acordarte y preparar.

## Nivel 3 — Autónomo con tope (solo si el gasto está acotado)
El sistema imprime sin preguntar, dentro de un presupuesto.

- Define en el SOUL/AGENTS de negocio un tope mensual de tokens dedicado a
  impresión de CLIs (ej. 10 USD/mes).
- Skill: "al detectar una API nueva en el stack (un servicio nuevo en
  docker-compose, una integración nueva) o al completar una fase, imprime su
  CLI automáticamente si el gasto del mes en impresión no excede el tope. Si lo
  excede, encola y avisa."
- Siempre con verify (shipcheck) y grado A mínimo antes de usar el CLI.

Advertencia honesta: el Nivel 3 es cómodo pero puede sorprenderte con gasto si
una API resulta grande. No lo actives hasta tener varios CLIs impresos y saber
cuánto cuesta cada uno en tu caso. El Nivel 1 cubre el 90% del valor.

## Por qué esto encaja con el resto de Hermes OS · A2A
- Mismo principio de eficiencia de tokens: un CLI impreso gasta ~100x menos
  tokens que un MCP pesado cuando un agente lo llama miles de veces.
- Mismo principio de aislar: cada CLI es una herramienta independiente que los
  agentes invocan, no código fundido en Hermes.
- Mismo principio de verificar: shipcheck (dogfood + scorecard + proof) antes de
  confiar en un CLI, igual que el grafo cita fuentes antes de afirmar.

## Mantenimiento
- Cuando una API cambie, reimprime: /printing-press-reprint <api>
- Tras usar un CLI y encontrar fricción: /printing-press-amend lo convierte en
  mejora. Hermes puede correr esto tras detectar errores repetidos de un CLI.
- El manifiesto (cli-manifest.yaml) crece contigo: cada vez que sumes una
  integración al proyecto, añádele su entrada en la fase que corresponda.
