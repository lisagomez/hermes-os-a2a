---
name: prp
description: "Planificar una feature compleja antes de implementarla. Genera un PRP (Product Requirements Proposal) con objetivo, comportamiento, modelo de datos, y fases. Activar SIEMPRE antes de bucle-agentico, o cuando el usuario dice: planea esto, necesito un sistema de X, quiero agregar algo grande."
context: fork
allowed-tools: Read, Write, Edit, Grep, Glob
---

# Skill: Generar PRP (Product Requirements Proposal)

> Generar un PRP para: $ARGUMENTS

---

## Que es un PRP

Un PRP (Product Requirements Proposal) es el **blueprint de una pieza de tu software**. Define QUE construir antes de escribir una sola linea de codigo.

Es el contrato humano-IA. El humano define el objetivo y el por que. La IA investiga contexto, propone la arquitectura, y genera el plan de fases. Juntos validan antes de ejecutar.

**Sin PRP**: vibe coding al aire, codigo espagueti, features que no encajan.
**Con PRP**: arquitectura clara, fases definidas, aprendizajes que persisten.

---

## Proceso

### Paso 1: Leer el template

Lee el template base de PRP:

```
.claude/PRPs/prp-base.md
```

Este archivo contiene la estructura completa, las secciones obligatorias, y ejemplos de cada campo. Usalo como referencia para generar el PRP.

### Paso 2: Entrevistar al usuario

Si `$ARGUMENTS` no tiene suficiente detalle, haz preguntas cortas y directas para clarificar:

1. **Objetivo**: Que quieres construir? (estado final en 1-2 oraciones)
2. **Por que**: Que problema resuelve? Cual es el valor de negocio?
3. **Criterios de exito**: Como sabes que esta terminado? (3-5 checkboxes medibles)
4. **Restricciones**: Hay algo que NO deba hacer o alguna dependencia critica?

NO hagas las 4 preguntas si el usuario ya dio suficiente contexto. Usa el juicio. Si el objetivo es claro, pregunta solo lo que falta.

### Paso 3: Investigar contexto

Antes de escribir el PRP, investiga el codebase:

- **Grep/Glob**: Buscar codigo existente relacionado con la feature
- **Read**: Leer archivos relevantes para entender patrones actuales
- **Supabase**: Si involucra BD, verificar tablas y estructura existente

Esto alimenta las secciones de Contexto, Referencias, y Arquitectura del PRP.

### Paso 4: Generar el PRP

Crea el archivo PRP siguiendo el template de `prp-base.md`:

**Nombre del archivo**: `.claude/PRPs/prp-{feature-name}.md`

Donde `{feature-name}` es el nombre de la feature en kebab-case.

**Contenido obligatorio**:
- Objetivo (1-2 oraciones)
- Por Que (tabla problema/solucion + valor de negocio)
- Criterios de Exito (checkboxes medibles)
- Comportamiento Esperado (happy path)
- Contexto (referencias, arquitectura propuesta, modelo de datos)
- Blueprint (SOLO fases, sin subtareas)
- **Modelo de amenazas** (C3) — activos que toca, fronteras que cruza, atacante relevante
  (O1-O6), controles y la brecha que queda abierta. Plantilla:
  `.claude/gobernanza/plantillas/modelo-amenazas.md`; catalogo vivo:
  `businessos/gobernanza/modelo-amenazas-v1.md`
- **Evaluacion de impacto — AISIA** (C4) — a quien podemos dañar SIN atacante, con el
  sistema operando bien. Plantilla: `.claude/gobernanza/plantillas/aisia.md`
- **Declaracion de CDC aplicable** (C1) — ¿este PRP cambia comportamiento de agentes
  (modelo, skill, subagente, SOUL/AGENTS, plantilla, config)? si/no, y que gate toca
- Secciones vacias de Aprendizajes, Gotchas, y Anti-Patrones

> Las tres ya viven en `prp-base.md`: un PRP que las omita no esta completo. Este skill las
> pide explicitamente porque tenerlas en la plantilla no basta — el skill no las nombraba y
> un PRP generado podia saltarselas sin que nada fallara.

### Paso 5: Presentar al usuario

Muestra un resumen del PRP generado:
- Objetivo
- Numero de fases
- Decisiones de arquitectura clave
- Pregunta si quiere ajustar algo antes de aprobar

**NO implementes nada todavia.** El PRP debe ser aprobado antes de ejecutar.

---

## Despues del PRP

Una vez aprobado, la implementacion se hace con el skill `/bucle-agentico`, que usa el PRP como guia para ejecutar fase por fase con mapeo de contexto just-in-time.

Los aprendizajes descubiertos durante la implementacion se documentan de vuelta en el PRP (seccion Aprendizajes) para que el conocimiento persista.

---

## Reglas

- SIEMPRE leer `prp-base.md` antes de generar, y las plantillas de
  `.claude/gobernanza/plantillas/` antes de llenar amenazas e impacto
- NUNCA generar subtareas dentro de las fases (eso lo hace Blueprint)
- NUNCA implementar codigo en este skill (solo generar el documento)
- SIEMPRE investigar el codebase antes de proponer arquitectura
- El PRP se crea en estado `PENDIENTE` hasta que el usuario apruebe
