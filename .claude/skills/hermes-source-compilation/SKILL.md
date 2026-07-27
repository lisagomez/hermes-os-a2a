---
name: hermes-source-compilation
description: Compilación multi-fuente de un lead (marca blanca, Pre-Discovery) — leer TODAS las fuentes del intake (web, LinkedIn, perfiles, enlaces internos relevantes) declarando el estado de cada una; lo bloqueado se declara, jamás se oculta. Usar al iniciar el análisis de cualquier lead.
---

# Hermes-Source-Compilation (marca blanca)

> Origen: corrección de Victor en el dogfood GAL (2026-07-26) — el análisis
> reflejaba solo parte del sitio y omitía las fuentes de redes del intake.
> Sector-agnóstico: mismo método para logística, salud, financiero, real estate…

## Objetivo

Que TODO lo que el usuario entregó como fuente (web + toda URL en las notas:
LinkedIn de empresa, perfiles de fundadores, directorios) quede **compilado o
declarado como no-compilable** — nunca ignorado en silencio. La compilación es
el insumo de los demás skills de Pre-Discovery: si aquí se pierde una fuente,
todos los análisis aguas abajo nacen ciegos.

## Entradas
- Intake del lead: `web` + `notas` (las URLs se extraen con regex, cualquier formato).
- Opcional: sector esperado (hint, no sustituye la observación).

## Flujo
1. **Extraer el universo de fuentes**: la web + toda URL de las notas (dedupe).
2. **Compilar cada una** (fetch con timeout y cap de tamaño, UA declarado) y
   registrar su estado: `leida` (con tamaño), `bloqueada` (LinkedIn HTTP 999,
   403, login) o `error` (timeout, DNS) — con detalle textual.
3. **Escaneo quirúrgico de enlaces internos**: del sitio leído, sumar los paths
   con señal (`/services`, `/solutions`, `/compliance`, `/certifications`,
   `/legal`, `/about`…) — acotado (máx. 2 extra) y declarado como fuente.
4. **Extraer con evidencia**: servicios, propuesta de valor, claims, segmentos,
   señales de madurez — cada `hecho` con su cita textual de la fuente.
5. **Plasmar el estado de la compilación en la salida**: sección "Fuentes
   compiladas" con las tres categorías; las no-leídas generan ítems de
   `requiereValidacion` (pedir el dato en la entrevista, no adivinarlo).

## Reglas no negociables
- Fuente entregada = fuente en el reporte (leída o declarada como no-leída).
- "No pude leer X" ≠ "X no existe": un perfil bloqueado se reporta bloqueado y
  su contenido queda como hueco explícito, jamás se rellena de memoria.
- Hecho sin cita → se degrada a hipótesis (contrato de evidencia).
- El texto compilado lleva marcadores por fuente (`=== url ===`) para que los
  análisis posteriores puedan citar de dónde salió cada afirmación.

## Contrato de evidencia (heredado por toda la familia)
- Toda afirmación es `hecho | hipotesis | recomendacion`; hecho sin evidencia → degradado.
- Procedencia visible (`observado | inferido | mock`) y fuente por ítem.
- Fallo declarado, nunca oculto. Retroalimentación a conocimiento solo en modo `PROPOSED`.

## Estado de implementación en la fábrica
- **Implementado** en meeting-copilot: `pipeline.ts::extraerUrls/compilarFuentes`
  (estado por fuente + enlaces internos vía `html.ts::extraerEnlacesRelevantes`),
  route `/api/pre-discovery/sitio`, UI "Fuentes compiladas" en el bloque sitio.
- **Uso manual** (Claude Code / otra vertical): mismo flujo con WebFetch;
  entregar la tabla de fuentes con estado como primera sección del análisis.
