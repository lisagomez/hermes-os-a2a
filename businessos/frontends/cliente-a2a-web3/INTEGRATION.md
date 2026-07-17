# cliente-a2a-web3 — contrato de integración A2A

Cómo esta superficie (cuando pase de scaffold a app) habla con el backend. La conexión es el
**protocolo A2A** (agente-a-agente), no HTTP a medida. Puerta pública hoy: `edge:443 → ventas-a2a`.

## Estado

**Scaffold.** Existe el esqueleto Next.js con el design system (`@a2a/design-system`) cableado y
hereda la paleta/interacción de `design/demo-a2acard.html`. La app en vivo (cliente A2A real) es
el siguiente pase.

## El protocolo (a2a-sdk v1)

Cada servicio A2A del backend expone la MISMA superficie (Starlette puro, sin `/docs`):

| Ruta | Qué es |
|------|--------|
| `GET /.well-known/agent-card.json` | Agent Card (skills, versión, transporte) |
| `POST /` | JSON-RPC 2.0, método `message/send` |
| `GET /health` | liveness |

Puerta pública de cara al cliente web3: **`ventas-a2a`** (skill `recibir-interes`, abre un lead
white-label), servida por `edge:443` (`businessos/edge/Caddyfile`, rate-limit 30/min, body 64KB).
Los demás servicios (grafo-a2a, ejecutor, supervisor, coordinador) están dentro de `hermes-net`,
no expuestos.

## Cómo llamar (dos caminos)

### A) Con el SDK `a2a` (recomendado)
Un cliente Node/Python del SDK descubre la card y hace `message/send` con un `Message` de `parts`.
El SDK maneja el handshake (encolar `Task` antes del primer status update) y la versión.
Ejemplos en el repo: `businessos/ejecutor-a2a/supervisor_cliente.py`,
`businessos/coordinador-a2a/ejecutor_cliente.py`.

### B) JSON-RPC crudo (sin SDK) — OJO con los gotchas
Si se habla JSON-RPC a mano (fetch/curl), tres trampas documentadas
(`.claude/memory` + CLAUDE.md 2026-07-03):
1. **El método es `message/send`** (el dispatcher REST usa otros nombres → -32601 si te
   equivocas). Verificar contra la card instalada, no contra blogs: "el SDK instalado manda".
2. Algunas versiones exigen el header **`A2A-Version: 1.0`** (si no, -32009).
3. **`Part.data` es un Struct directo**: el payload va como `{ "parts": [{ "data": { ... } }] }`,
   NO `{ "data": { "data": {...} } }`. Además protobuf Struct convierte **todo número JSON a
   float** (`3 → 3.0`): normaliza enteros en los contratos.

Payload canónico verificado: `businessos/negocio/skills/trio-software/SKILL.md`. Ante duda,
imprimir `MessageToDict(new_data_message(x))` del SDK y copiar eso.

## Pagos / settlement

- **Fiat**: Polar (Merchant of Record), como el resto de la fábrica.
- **USDC / Circle / escrow on-chain**: **capa futura** del roadmap (Circle Agent Wallets, escrow
  programable, verificación). No hay endpoints ni contratos todavía — no fingir on-chain.

## Referencias

- Diseño base: `design/demo-a2acard.html` (gafete, operación, sabotaje rechazado, traza).
- Wire format y card: `businessos/grafo-a2a/README.md`, `businessos/grafo-a2a/executor.py`.
- Puerta pública: `businessos/edge/Caddyfile`, `businessos/ventas-a2a/`.
- Contrato del daemon (si además se quiere chat web2-style): `../cliente-web2/` + `../DEPLOY-web2.md`.
