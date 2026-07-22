# PROYECTO — Rediseño web · Cliente: gal-mexico

| Campo | Valor |
|-------|-------|
| **proyecto_id** | `gal-mexico/rediseno-web` |
| Servicios (catálogo) | S-01 (rediseño web), S-02 (branding, ✅ hecho) |
| Estado | **en_curso** (alcance aprobado por Elisa 2026-07-22) |
| Inicio | 2026-07-22 |
| Presupuesto tokens | pendiente de fijar (se propone tope al aprobar alcance) |
| Gate de salida | **Nada llega al cliente sin OK de Elisa** |

## Objetivo

Rediseñar la página web de GAL Logistics con su branding monocromático nuevo, comunicando
sus 4 valores (Seguridad, Confianza, Productividad, Eficiencia) y sus servicios express.

## Alcance

**Incluye (aprobado 2026-07-22):**
- Home con hero, propuesta de valor y CTAs "Cotizar envío" / "Rastrear" (patrón de la
  lámina de aplicación del branding).
- Página/sección de servicios: Hand Carry · Charter · Parcel · Express Freight.
- Mocks HTML autocontenidos primero (aprobación) → código de producción después.

**NO incluye** (hasta acordarse explícitamente):
- Backend de cotización/rastreo real (integración = S-09, proyecto aparte).
- Hosting/dominio del cliente (definir quién lo opera).
- Contenido fotográfico propio (pendiente del cliente).

## Criterios de terminado (binarios)

- [ ] Mocks de todas las páginas del alcance aprobados por Elisa (y cliente).
- [ ] Cada entregable etiquetado (GALMX-NNN) y registrado en el ledger con tokens.
- [ ] Verificación visual Playwright de cada HTML antes de marcar listo.
- [ ] Costo total del proyecto sumado y reportado al cierre.

## Hitos

| # | Hito | Entregables (IDs) | Estado | Fecha |
|---|------|-------------------|--------|-------|
| 1 | Alcance aprobado (páginas + contenido) | — | ✅ hecho | 2026-07-22 |
| 2 | Mock de home | GALMX-001 | ✅ hecho (OK Elisa) | 2026-07-22 |
| 3 | Mocks páginas restantes | GALMX-002+ | pendiente | — |
| 4 | Aprobación del cliente | — | pendiente | — |
| 5 | (Si aplica) código de producción | — | pendiente | — |

## Entregables

| ID | Descripción | Archivo | Estado | Tokens | OK Elisa |
|----|-------------|---------|--------|--------|----------|
| GALMX-001 | Mock home (desktop+móvil verificados Playwright) | `entregables/GALMX-001-home.html` | **entregado** | ~27,400 est | ✅ 2026-07-22 |

## Riesgos / notas

- Sin logo vectorial: los mocks usan wordmark tipográfico (Archivo 900) — pedir vector
  al cliente antes de producción.
- El contenido real (textos de servicios, fotos, datos de contacto) debe venir del
  cliente; los mocks arrancan con copy propuesto marcado como borrador.
