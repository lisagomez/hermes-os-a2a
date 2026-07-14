# Frontends del Business OS — tres superficies

El Business OS se opera desde **tres frontends distintos**, uno por tipo de usuario y
canal. Todos son *espejo* del sistema agéntico (la UI muestra y entiende; el agente opera);
comparten el backend (Hermes / trío A2A / grafo / ERP) pero se **aíslan** entre sí ("aislar,
no fundir"). Mapean a la estrategia de superficies del maestro (Slack interno · Web propia del
cliente · A2A).

| Dir | Superficie | Para quién | Canal / stack | Estado |
|-----|-----------|-----------|---------------|--------|
| `control-interno/` | **Control interno** | el equipo (operar el Business OS) | Next.js + Supabase + Tauri (Titaniumorphism) | ✅ integrado (vendored de `daniel-carreon/business-os-new`; ver `control-interno/VENDORED-FROM.md`) |
| `cliente-web2/` | **Cliente web2** | clientes finales, web tradicional | web2, marca blanca | 🚧 en desarrollo (aún no integrado) |
| `cliente-a2a-web3/` | **Cliente A2A-card web3** | clientes vía A2A card / web3 | web3 + A2A card (identidad de agente) | 🎨 diseño (demo funcional de la Tarjeta A2A; app pendiente) |

## Rol de cada superficie

- **Control interno** — la cabina del equipo: board, calendario, canvas, conversaciones,
  finanzas, segundo cerebro. Uso interno, NO de cara al cliente. Es el panel humano que el
  maestro pone junto a Slack para el equipo.
- **Cliente web2** — el producto de cara al cliente final por web tradicional (marca blanca,
  aislamiento por tenant). El canal "Web propia" del maestro.
- **Cliente A2A-card web3** — la superficie web3 donde el cliente interactúa vía **A2A card**
  (la tarjeta de agente del protocolo agente-a-agente) — el puente hacia el pago/identidad
  agéntica (Circle/USDC, contratos, verificación) que el roadmap contempla como capa futura.

## Cómo se conectan al backend

Los tres consumen el mismo **contrato de daemon** (HTTP: `/chat/stream` SSE + webhooks
`/api/openclaw/action`, auth por `OPENCLAW_GATEWAY_TOKEN`). El daemon es Hermes/A2A. Cada
superficie usa su propio token y su propio alcance de tenant; el aislamiento entre clientes
es el mismo RLS + tarjeta de agente de la fábrica.

> Cuando lleguen `cliente-web2` y `cliente-a2a-web3`, se integran con el mismo patrón que
> `control-interno`: copia adoptada (vendored) con su nota de procedencia, o su propio repo,
> según se decida al momento.
