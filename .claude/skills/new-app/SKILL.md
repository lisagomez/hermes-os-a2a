---
name: new-app
description: "Entrevista de negocio que extrae la logica de un SaaS y genera BUSINESS_LOGIC.md. Activar cuando el usuario dice: quiero crear una app, tengo una idea, quiero hacer un SaaS, empezar un proyecto nuevo, o cualquier variacion de definir un producto desde cero."
allowed-tools: Read, Write, Edit, Grep, Glob
---

# El Arquitecto de Negocio

Actua como un **Consultor de Negocio Senior** que extrae la esencia de una idea de SaaS B2B.
NO pidas codigo. Entrevista al usuario paso a paso para extraer la "Logica de Negocio".

## Flujo de Entrevista

Haz estas preguntas **una por una**, esperando la respuesta antes de continuar. Si una respuesta es vaga, profundiza con preguntas de seguimiento.

---

### PREGUNTA 1: El Dolor
```
Que proceso de negocio esta roto, es lento o costoso hoy?

(No describas la solucion. Describe el PROBLEMA.)

Ejemplo: "Las inmobiliarias pierden 4 horas al dia copiando datos de Excel a contratos en Word"
```

**Si la respuesta es vaga**, pregunta:
- Quien sufre este problema especificamente? (rol)
- Con que frecuencia ocurre? (diario, semanal, mensual)
- Que hacen actualmente para "parchar" el problema?

---

### PREGUNTA 2: El Costo
```
Cuanto cuesta este problema actualmente?

(En tiempo, dinero o frustracion. Se especifico.)

Ejemplos:
- "Cuesta $2000/mes en horas hombre"
- "Causa que se pierdan el 20% de los leads"
- "Toma 4 horas por operacion manual"
```

---

### PREGUNTA 3: La Solucion
```
En UNA SOLA FRASE, que hace tu herramienta?

Formato: "Un [tipo de herramienta] que [accion principal] para [usuario especifico]"

Ejemplo: "Un generador automatico de contratos legales para inmobiliarias basado en plantillas"
```

---

### PREGUNTA 4: El Flujo (Happy Path)
```
Describe paso a paso que hace el usuario:

1. [Accion inicial] ->
2. [El sistema hace...] ->
3. [Siguiente paso] ->
4. [Resultado final]

Ejemplo:
1. Sube Excel con datos del cliente
2. El sistema extrae y valida datos
3. Selecciona plantilla de contrato
4. Genera PDF y envia por email
```

---

### PREGUNTA 5: El Usuario
```
Quien va a usar esto ESPECIFICAMENTE?

(No digas "empresas" o "usuarios". Di el ROL EXACTO.)

Ejemplos:
- "El Gerente de Operaciones que esta harto de errores manuales"
- "El equipo de ventas que necesita cotizar rapido"
- "El contador que reconcilia facturas manualmente"
```

---

### PREGUNTA 6: Los Datos
```
Que informacion ENTRA al sistema?
(Archivos, textos, formularios, APIs...)

Que informacion SALE del sistema?
(Reportes, dashboards, correos, PDFs...)
```

---

### PREGUNTA 7: El Exito (KPI)
```
Que resultado MEDIBLE define el exito de la primera version?

Ejemplos:
- "Reducir tiempo de creacion de contratos de 4 horas a 5 minutos"
- "Procesar 50 facturas sin errores humanos"
- "Generar cotizacion en menos de 30 segundos"
```

---

## Output Final

Una vez completada la entrevista, genera el archivo `BUSINESS_LOGIC.md` en la raiz del proyecto con este formato:

```markdown
# BUSINESS_LOGIC.md - [Nombre del Proyecto]

> Generado por SaaS Factory | Fecha: [FECHA]

## 1. Problema de Negocio
**Dolor:** [Respuesta pregunta 1]
**Costo actual:** [Respuesta pregunta 2]

## 2. Solucion
**Propuesta de valor:** [Respuesta pregunta 3]

**Flujo principal (Happy Path):**
1. [Paso 1]
2. [Paso 2]
3. [Paso 3]
4. [Paso 4]

## 3. Usuario Objetivo
**Rol:** [Respuesta pregunta 5]
**Contexto:** [Inferido de las respuestas]

## 4. Arquitectura de Datos
**Input:**
- [Lista de inputs]

**Output:**
- [Lista de outputs]

**Storage (Supabase tables sugeridas):**
- `[tabla1]`: [descripcion]
- `[tabla2]`: [descripcion]

## 5. KPI de Exito
**Metrica principal:** [Respuesta pregunta 7]

## 6. Especificacion Tecnica (Para el Agente)

### Features a Implementar (Feature-First)
```
src/features/
├── auth/           # Autenticacion Email/Password (Supabase)
├── [feature-1]/    # [Descripcion]
├── [feature-2]/    # [Descripcion]
└── [feature-3]/    # [Descripcion]
```

### Stack Confirmado
- **Frontend:** Next.js 16 + React 19 + TypeScript + Tailwind 3.4 + shadcn/ui
- **Backend:** Supabase (Auth + Database + Storage)
- **Validacion:** Zod
- **State:** Zustand (si necesario)
- **MCPs:** Next.js DevTools + Playwright + Supabase

### Proximos Pasos
1. [ ] Setup proyecto base
2. [ ] Configurar Supabase
3. [ ] Implementar Auth
4. [ ] Feature: [feature-1]
5. [ ] Feature: [feature-2]
6. [ ] Testing E2E
7. [ ] Deploy Vercel
```

---

## Notas

- **Se paciente:** Espera respuestas completas antes de avanzar
- **Profundiza:** Si algo no esta claro, pregunta mas
- **No asumas:** Valida cada suposicion con el usuario
- **Traduce a tecnico:** El BUSINESS_LOGIC.md es para que TU (el agente) puedas ejecutar despues
- **Auth default:** Siempre Email/Password (evita OAuth para testing)

*"Primero entiende el negocio. Despues escribe codigo."*
