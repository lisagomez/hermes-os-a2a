---
name: ai
description: "Agregar capacidades de IA a la app usando templates de Vercel AI SDK v5 + OpenRouter. Activar cuando el usuario dice: quiero un chat, agregar IA, analizar imagenes, buscar en internet, generar texto, chatbot, asistente, RAG, embeddings, o cualquier feature que involucre un modelo de lenguaje."
argument-hint: "[template-name: setup-base|chat|action-stream|web-search|historial|vision|tools|rag|single-call|structured-outputs|generative-ui]"
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Skill: AI Templates

> Implementar: $ARGUMENTS

Stack: **Vercel AI SDK v5 + OpenRouter (300+ modelos) + Supabase**

---

## Templates Disponibles

### Secuencia de Agentes (chat path)

Construir en orden. Cada template asume que el anterior ya esta implementado.

| # | Template | Descripcion |
|---|----------|-------------|
| 00 | **setup-base** | Configuracion inicial: OpenRouter provider, variables de entorno, dependencias |
| 01 | **chat** | Chat con streaming completo. UI de mensajes + input + respuesta en tiempo real |
| 02 | **web-search** | Agregar busqueda web al agente. Grounding con resultados de internet |
| 03 | **historial** | Persistir conversaciones en Supabase. Historial por usuario |
| 04 | **vision** | Analisis de imagenes. Upload + descripcion/analisis con modelos vision |
| 05 | **tools** | Function calling. El agente puede ejecutar funciones definidas por ti |
| 06 | **rag** | Retrieval Augmented Generation. Embeddings + busqueda semantica en Supabase |

### Secuencia Alternativa (action path)

Usa `action-stream` en vez de `chat` cuando necesitas server actions en vez de API routes.

| # | Template | Descripcion |
|---|----------|-------------|
| 00 | **setup-base** | Mismo setup base |
| 01-ALT | **action-stream** | Streaming via server actions (useAction). Sin API route |
| 02+ | Los demas son iguales | web-search, historial, vision, tools, rag |

### Standalone (independientes)

No requieren la secuencia. Se pueden usar solos.

| Template | Descripcion |
|----------|-------------|
| **single-call** | Una sola llamada al modelo sin streaming. Para tareas simples (clasificar, resumir, extraer) |
| **structured-outputs** | Respuestas con schema Zod. JSON tipado garantizado del modelo |
| **generative-ui** | El modelo genera componentes React en tiempo real. UI dinamica |

---

## Dos Caminos

```
Chat Path:          00 -> 01 -> 02 -> 03 -> 04 -> 05 -> 06
Action Path:        00 -> 01-ALT -> 02 -> 03 -> 04 -> 06
```

**Chat path**: Cuando necesitas una UI de chat con API route (`/api/chat`).
**Action path**: Cuando prefieres server actions (`useAction`) sin exponer un endpoint.

---

## Mapa de Argumentos a Archivos

Todos los templates viven en `${CLAUDE_SKILL_DIR}/references/`.

| Argumento | Archivo |
|-----------|---------|
| `setup-base` o `setup` | `references/agents/00-setup-base.md` |
| `chat` | `references/agents/01-chat-streaming.md` |
| `action-stream` | `references/agents/01-alt-action-stream.md` |
| `web-search` | `references/agents/02-web-search.md` |
| `historial` | `references/agents/03-historial-supabase.md` |
| `vision` | `references/agents/04-vision-analysis.md` |
| `tools` | `references/agents/05-tools-funciones.md` |
| `rag` | `references/agents/06-rag-basico.md` |
| `single-call` | `references/single-call.md` |
| `structured-outputs` | `references/structured-outputs.md` |
| `generative-ui` | `references/generative-ui.md` |
| (indice completo) | `references/_index.md` |

---

## Como Usar

### Si se proporciono un argumento (`$ARGUMENTS`)

1. Mapear el argumento al archivo en `${CLAUDE_SKILL_DIR}/references/` usando la tabla
2. Leer el archivo completo del template
3. Seguir las instrucciones paso a paso para implementar en el proyecto
4. El template contiene codigo copy-paste listo, adaptarlo al proyecto actual

### Si NO se proporciono argumento

1. Leer `${CLAUDE_SKILL_DIR}/references/_index.md` para ver el catalogo completo
2. Preguntar al usuario que capacidad de IA necesita
3. Sugerir empezar por `setup-base` si no tiene OpenRouter configurado todavia

### Si el usuario describe lo que quiere sin saber el nombre

Mapear su descripcion al template correcto:
- "quiero un chat" → `chat` (o `action-stream`)
- "que busque en internet" → `web-search`
- "que recuerde conversaciones" → `historial`
- "que analice fotos/imagenes" → `vision`
- "que pueda hacer cosas" → `tools`
- "que busque en mis documentos" → `rag`
- "una sola respuesta sin chat" → `single-call`
- "que me de datos estructurados" → `structured-outputs`
- "que genere interfaz dinamica" → `generative-ui`

---

## Reglas

- SIEMPRE empezar por `setup-base` (00) si el proyecto no tiene OpenRouter configurado
- SIEMPRE leer el template completo antes de implementar
- NUNCA hardcodear API keys en el codigo (usar variables de entorno)
- NUNCA saltar templates en la secuencia (cada uno depende del anterior)
- Si el usuario pide algo que requiere multiples templates, implementar uno a la vez en orden
