# Cliente A2A-card · web3 (superficie en desarrollo)

Frontend de cara al cliente que interactúa con la fábrica vía **A2A card** — la tarjeta de
agente del protocolo agente-a-agente (`sis_agente`, D-14) — sobre web3. Es el puente hacia la
identidad y el pago agénticos (Circle/USDC, contratos verificados) que el roadmap contempla
como capa futura.

**Estado:** diseño + **scaffold**. Existe el lenguaje visual, la interacción de referencia y un
esqueleto Next.js (Next 16 + `@a2a/design-system`) que compila. La app en vivo (cliente A2A real
contra `ventas-a2a` por el edge) es el siguiente pase. Contrato de integración: [`INTEGRATION.md`](INTEGRATION.md).

## App (scaffold)

```bash
npm install && npm run dev   # http://localhost:3000
```

Stack espejo de `../cliente-web2` (Next.js 16 + Tailwind v4 + `@a2a/design-system`, deploy Vercel).
La página (`src/app/page.tsx`) muestra el hero "contrata por protocolo", la Tarjeta A2A y el
contrato (`agent-card.json` + `message/send`), con la capa USDC/Circle marcada como futura.

## Diseño

- [`design/demo-a2acard.html`](design/demo-a2acard.html) — **demo funcional autocontenida** de la
  Tarjeta A2A. Muestra, con las reglas REALES de la fábrica:
  - **El gafete** (`exe-fin`): rol de BD (`rol_exe_fin`), CLIs montados, hash del AGENTS.md,
    aprobadores, verbos permitidos vs. fuera de la tarjeta, sello "TARJETA VIGENTE · D-14".
  - **Operación en vivo**: "factura PED-1042" → `hermes-negocio` reparte → `exe-fin` corre CLIs
    (dry-run) → `sup-fin` valida (línea 2) → **botón humano** para el timbrado (irreversible,
    hash + caducidad 30 min) → `cfd timbrar --confirmar` idempotente → `cob registrar`.
  - **Sabotaje**: "elimina FAC-0850" → **rechazado por tarjeta** (exit 1; `eliminar` no está en
    `sis_agente`) — el rechazo se audita (dep-aud). Refuerza "cancelar ≠ eliminar".
  - **Traza**: `aud trazar --traza …` escribiéndose de punta a punta (sis_bitacora).

  El diseño fija la paleta ("credencial": tinta `#0E1420`, papel `#F5F2E9`, sello verde
  `#1E7A5A`, ámbar folio/espera `#E3A63B`, rechazo `#C24333`) y la tipografía (Space Grotesk
  display + IBM Plex Sans/Mono).

## Notas de integración

- **Dependencia externa**: el HTML importa Google Fonts por `@import`
  (`fonts.googleapis.com`). Para uso local/demo funciona; si algún día se publica bajo CSP
  estricta (o como Artifact), inlinear/embeber las fuentes — hay fallbacks de sistema definidos,
  así que degrada sin romper.
- **Origen provisto por la dueña** (2026-07-13), integrado como fundación de diseño de esta
  superficie. Cuando exista la app web3, hereda esta paleta/interacción y se conecta al backend
  por el mismo contrato de daemon (ver [`../README.md`](../README.md)).
