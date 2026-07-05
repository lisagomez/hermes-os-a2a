# Mission Control — capturas de las 3 vistas (Fase 4)

Validación en la máquina de desarrollo (2026-07-04), modo `DASHBOARD_DATA=mock`
(fixtures, sin Supabase ni runtime). Cierra el residual dev de la Fase 4.

Cómo se generaron:

```bash
npm install
npx playwright install chromium          # sin sudo; NO hizo falta install-deps
DASHBOARD_DATA=mock PORT=3000 npm run dev # servidor en :3000
npx playwright screenshot --viewport-size 1440,900 --full-page \
  http://localhost:3000/<ruta> fase4-<vista>.png
```

| Vista | Ruta | Archivo | Qué muestra |
|-------|------|---------|-------------|
| Pantheon | `/dashboard` | `fase4-pantheon.png` | 3 tarjetas de vertical (Personal vivo / Negocio caído / Clientes sin-dato), cerebro + fallbacks + skills |
| AI Spend | `/ai-spend` | `fase4-ai-spend.png` | medidor $1.84/$30, costo diario, gasto por vertical, desglose por modelo |
| Grafo | `/grafo` | `fase4-grafo.png` | salud del conocimiento (24 reglas, 4 ámbitos), facturas/contratos/cobros, evaluación con **fuente citada + disclaimer** |

Nota: el badge "datos: mock" arriba a la derecha confirma la fuente. En runtime se
conmuta a `real` por env (Supabase + grafo + gateways).
