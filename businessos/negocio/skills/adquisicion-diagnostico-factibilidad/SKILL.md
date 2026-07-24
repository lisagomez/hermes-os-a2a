---
name: adquisicion-diagnostico-factibilidad
description: >-
  Activo Digital del departamento de Adquisición de Clientes (Hermes OS · A2A, Fase 9). Produce la
  "Evaluación de Factibilidad de Cliente Prospecto" (Hito 3 del pipeline de EG.CRM): cruza la
  transcripción del descubrimiento con la Ficha de Inteligencia y devuelve FODA, factibilidad, tiempo de
  ejecución, fases de implementación, escalabilidad, alianza estratégica B2B y costo de implementación.
  Toda afirmación fiscal/contable/contractual se valida contra el grafo (grafo-a2a) con fuente citada.
  Corre como competencia del Ejecutor, con re-gateo del Supervisor. Usa este skill siempre que exista un
  descubrimiento por diagnosticar, o cuando pidan "evaluación de factibilidad", "diagnóstico del
  prospecto", "FODA del cliente" o "vale la pena este proyecto", aunque no se nombre.
tipo_activo: Activo Digital
objetivo: >-
  Convertir el descubrimiento en un dictamen de factibilidad honesto y accionable, con lo regulatorio
  citado desde el grafo y fail-safe a "dudoso" cuando falta evidencia — para que el consenso humano
  decida sobre base sólida.
---

# Adquisición · Diagnóstico de Factibilidad

**Activo Digital:** Evaluación de Factibilidad de Cliente Prospecto.
**Objetivo:** cruzar transcripción + ficha y emitir un diagnóstico (FODA, factibilidad, tiempos, fases, escalabilidad, alianza B2B, costo) con lo regulatorio citado y fail-safe cuando falte evidencia.

## Encuadre en Hermes OS (ROADMAP)

- **Competencia del Ejecutor** (departamento Adquisición), re-verificada por el **Supervisor** con los gates comerciales deterministas (`reglas/adquisicion.toml`: claims aprobados, sin invención, sin secretos). *(Verificar antes de confiar.)*
- **Regla de oro:** cero afirmación sin fuente. Todo lo **fiscal/contable/contractual** (deducibilidad, cumplimiento, cláusulas) se consulta al **grafo vía `grafo-a2a`** (país del cliente) y se cita; si no hay regla aplicable, **fail-safe a `dudoso`** con disclaimer. Nunca se inventa un número regulatorio.
- **Routing:** razonamiento de diagnóstico → modelo capaz (perfil pesado, p. ej. sonnet), no el loop barato. *(Eficiencia por routing: lo importante a modelos capaces.)*
- **El sistema señala, el humano decide:** el dictamen alimenta el consenso, no lo sustituye.

## Entradas

Transcripción (`adquisicion-transcripcion`), Ficha de Inteligencia (`adquisicion-pre-descubrimiento`), país del cliente, datos del lead.

## Proceso

1. **Cruza** transcripción + ficha: separa hechos dichos por el cliente de inferencias propias.
2. **Arma el FODA** y estima factibilidad, tiempo de ejecución, fases, escalabilidad, encaje de alianza B2B y costo de implementación propuesto.
3. **Valida lo regulatorio contra el grafo:** cualquier supuesto fiscal/contable/contractual → `grafo-a2a` (dimensión y país correctos) → cita la fuente y su vigencia. Sin regla aplicable → `dudoso`.
4. **Marca la confianza** de cada estimación (`observado` | `hipótesis`) y deja disclaimer.

## Salida — Evaluación de Factibilidad (formato fijo)

```
# Evaluación de Factibilidad — [Empresa]
Lead: [lead_id] · País: [MX|CO|...] · Confianza global: [alta|media|baja]

## FODA
Fortalezas / Oportunidades / Debilidades / Amenazas

## Factibilidad
[factible | puede ser factible | dudoso] — razonamiento

## Tiempo de ejecución
## Fases de implementación
## Escalabilidad
## Alianza estratégica B2B
## Costo de implementación (propuesto)

## Notas regulatorias (grafo)
- [Afirmación] — fuente citada [ley/artículo, vigencia] — veredicto grafo

> Diagnóstico de apoyo. Disclaimer: señala, no asesora. El consenso humano decide.
```

## Reglas de oro

- **Sin fuente no se afirma** en lo regulatorio; se cita el grafo o se marca `dudoso`.
- **Hecho vs. inferencia** explícito en cada estimación.
- **Fail-safe:** ante duda, `dudoso` con disclaimer — nunca un "factible" optimista sin respaldo.

## Método diio aplicado ("Guía de supervivencia para vender con IA")

- **Separa en 3 capas** (guardrail anti-alucinación, diio cap. 7, paso 3): (1) hechos explícitos dichos por el cliente, (2) inferencias razonables, (3) vacíos a validar. Nunca mezclar lo que sabemos con lo que creemos haber entendido.
- **Detector de no-decisión** (práctica 2): busca frases ambiguas, baja urgencia, ausencia de sponsor, dificultad para dimensionar impacto, exploración sin compromiso. *"La no decisión no es un accidente; tiene patrones."*
- **Entusiasmo ≠ avance:** descuenta "reuniones animadas que no mueven nada". *"No confundas amabilidad con avance."*
- **Hipótesis competidoras** (diio p. 97): entrega 3 lecturas del caso (p. ej. falta de urgencia / problema político / poca claridad de valor) con las señales que apoyan cada una — no un veredicto único.
- **Riesgos invisibles** (práctica 5): champion sin densidad política, nadie quiere ser dueño del proyecto, otra prioridad mayor, la empresa "no está lista para cambiar". *"Muchas oportunidades no se rompen por lo obvio; se rompen por lo no conversado."*
- **Anti "claridad aparente" (Trampa 1):** un dictamen puede verse sólido y descansar en supuestos débiles. Marca el nivel de confianza y pide evidencia, no certezas.

## Integración

Su salida entra al **Hito 4 (Evaluación de Procedencia)**: votación humana por **mayoría simple** (`Factible` [Prioritario|En espera] · `Puede ser factible` · `Pendiente` · `No factible` → `Reconsiderar más adelante`). Si resulta `Factible`+`Prioritario`, dispara `adquisicion-analisis-profundo`.

---
*Método basado en "Guía de supervivencia para vender con IA" (diio.com), CC BY-SA 4.0.*
