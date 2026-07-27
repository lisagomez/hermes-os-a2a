---
name: hermes-tech-stack-scan
description: Marco tecnológico de un lead con cruce DECLARADO vs ESPERADO (marca blanca, Pre-Discovery) — stack visible observado vs stack esperado para su clase de negocio; los vacíos son oportunidades de automatización con severidad. Usar para el bloque tecnológico de cualquier caso.
---

# Hermes-Tech-Stack-Scan (marca blanca)

> Origen: espejo tecnológico del cruce de `hermes-regulatory-scan` — la misma
> dirección inversa que cazó el e-AWB, aplicada al stack: lo que un negocio de
> su clase DEBERÍA tener y no se observa es el insumo directo del pitch.

## Objetivo

Dos listas honestas y su cruce: (a) stack **VISIBLE** (señales observadas en el
material: portal de clientes, tracking, chat, generador del sitio, formularios,
pasarelas) y (b) stack **ESPERADO** para su clase de negocio (un forwarder
maduro: tracking en línea, EDI con carriers, portal, cotizador; una clínica:
agenda en línea, expediente, recordatorios). Los vacíos, con severidad, son las
**oportunidades de automatización** — el terreno natural de la propuesta.

## Entradas
- Compilación de fuentes + claims técnicos enrutados por `hermes-claims-audit`.
- Mapa de expectativas por clase de negocio (curado, citable — no improvisado).

## Flujo
1. **Observar**: señales técnicas en el material compilado, cada una con cita
   (`hecho`). Sin señales ≠ sin stack: se declara "sin señales observadas".
2. **Esperar**: expectativas de la clase de negocio desde el mapa curado; si la
   clase no está en el mapa → **VACÍO DEL MAPA** declarado (jamás inventar el
   estándar de una industria que no se conoce).
3. **Cruzar** (mismo esquema del regulatory-scan):
   - `evidencia`: esperado y observado.
   - `hipotesis`: señal indirecta (claim técnico sin sistema visible) → pregunta
     de discovery.
   - `vacio`: esperado y ausente → oportunidad de automatización con severidad
     (qué le cuesta hoy no tenerlo).
4. **Salida ejecutiva**: madurez digital (con las señales que la sustentan),
   matriz del cruce, oportunidades rankeadas por severidad — cada una ligada a
   qué la evidencia.

## Reglas no negociables
- Herramienta no observada = `hipotesis` o `vacio`, jamás hecho ("probablemente
  usan Excel" se etiqueta como lo que es: inferencia).
- El mapa de expectativas es artefacto CURADO y versionado — se amplía por
  propuesta revisada (modo `PROPOSED`), no lo improvisa el modelo en caliente.
- Una oportunidad sin vacío que la respalde no entra al reporte: el pitch se
  ancla a huecos observados, no a catálogo de producto.
- Clase de negocio desconocida → VACÍO DEL MAPA + análisis solo-observado.

## Contrato de evidencia (heredado por toda la familia)
- Toda afirmación es `hecho | hipotesis | recomendacion`; hecho sin evidencia → degradado.
- Procedencia visible (`observado | inferido | mock`) y fuente por ítem.
- Fallo declarado, nunca oculto. Retroalimentación a conocimiento solo en modo `PROPOSED`.

## Estado de implementación en la fábrica
- **Implementado** en meeting-copilot (2026-07-27): `escaneo-tecnologico.ts`
  (hermano de `escaneo-regulatorio.ts`, mismo contrato de matriz), adjunto al
  bloque tecnología en todos los caminos del pipeline; mapa curado `CLASES` con
  dos niveles de señal (sistema → evidencia; claim → hipótesis); UI "Declarado
  vs esperado" en el tab Marcos; solo el stack `hecho` cuenta como material
  (una inferencia no se auto-confirma — con test de control). Ampliar una clase
  del mapa = propuesta revisada, y reflejarla en `CLASES`.
- **Uso manual**: pasos 1–4; si no hay mapa curado del sector, construirlo
  primero con fuentes (reportes de industria, sitios de referentes) y dejarlo
  versionado como propuesta.
