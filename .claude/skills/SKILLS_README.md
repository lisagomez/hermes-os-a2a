# Skills System - SaaS Factory V4

> Todo es un Skill. Hot reload. Auto-discovery. Zero config.

---

## Inventario de Skills (25 total)

### Invocables por el Usuario (/)

| Skill | Comando | Descripcion |
|-------|---------|-------------|
| `new-app` | `/new-app` | Entrevista de negocio → BUSINESS_LOGIC.md |
| `landing` | `/landing` | Landing cinematica: scroll-driven video + copy AIDA/PAS + glass-morphism |
| `primer` | `/primer` | Inicializar contexto del proyecto |
| `add-login` | `/add-login` | Auth completo Supabase (login, signup, password reset, profiles, RLS) |
| `add-payments` | `/add-payments` | Pagos con Polar (MoR): checkout, webhooks, suscripciones, acceso |
| `add-emails` | `/add-emails` | Emails transaccionales: Resend + React Email + batch + unsubscribe |
| `add-mobile` | `/add-mobile` | PWA instalable + push notifications (iOS compatible) |
| `eject-sf` | `/eject-sf` | Remover SaaS Factory del proyecto (DESTRUCTIVO) |
| `update-sf` | `/update-sf` | Actualizar a ultima version |
| `bucle-agentico` | `/bucle-agentico` | Bucle Agentico para sistemas complejos (por fases) |
| `sprint` | `/sprint` | Bucle Agentico para tareas rapidas |
| `prp` | `/prp [feature]` | Generar Product Requirements Proposal |
| `ai` | `/ai [template]` | Implementar AI Templates (chat, RAG, vision, tools) |
| `qa` | `/qa [descripcion]` | QA automatizado con Playwright CLI |
| `skill-creator` | `/skill-creator` | Crear nuevos skills |
| `memory-manager` | `/memory-manager` | Memoria persistente por proyecto (reemplaza auto-memory) |
| `image-generation` | `/image-generation` | Generar/editar imagenes con OpenRouter + Gemini |
| `autoresearch` | `/autoresearch [skill]` | Auto-optimizar skills con loop autonomo (Karpathy) |

### Invocables por Claude (automaticos)

| Skill | Se activa cuando... |
|-------|---------------------|
| `backend` | Tareas de Server Actions, APIs, logica de negocio, validaciones |
| `frontend` | UI/UX, componentes React, Tailwind, animaciones |
| `supabase-admin` | Migraciones, RLS, queries SQL, auth config |
| `codebase-analyst` | Analisis de patrones, convenciones, arquitectura |
| `vercel-deployer` | Deploy, env vars, dominios, rollbacks |
| `documentacion` | Actualizar docs despues de cambios en codigo |
| `calidad` | Testing, quality gates, validacion |

---

## Estructura de un Skill

```
skill-name/
├── SKILL.md              # Requerido: frontmatter YAML + instrucciones
├── scripts/              # Opcional: codigo ejecutable (.py, .sh, .js)
├── references/           # Opcional: docs de referencia (>5k palabras)
└── assets/               # Opcional: templates, imagenes, fonts
```

### Frontmatter YAML

```yaml
---
name: skill-name                    # Identificador (lowercase, hyphens, max 64 chars)
description: Que hace               # Claude usa esto para decidir cuando activarlo
argument-hint: "[argumento]"        # Hint en autocomplete (opcional)
user-invocable: false               # Solo Claude puede invocarlo (opcional)
disable-model-invocation: true      # Solo el usuario puede invocarlo (opcional)
allowed-tools: Read, Write, Bash    # Tools permitidos sin pedir permiso (opcional)
model: claude-sonnet-4-6            # Modelo especifico (opcional)
context: fork                       # Ejecuta en subagent aislado (opcional)
agent: Explore                      # Tipo de agente (opcional)
---
```

### Variables de Sustitucion

| Variable | Descripcion |
|----------|-------------|
| `$ARGUMENTS` | Todos los argumentos del usuario |
| `$ARGUMENTS[N]` o `$N` | Argumento por indice (0-based) |
| `${CLAUDE_SESSION_ID}` | ID de sesion actual |
| `${CLAUDE_SKILL_DIR}` | Directorio del skill |
| `` !`comando` `` | Inyeccion de contexto dinamico (ejecuta shell) |

### Progressive Disclosure

1. **Metadata** (~100 palabras) - Siempre en contexto (frontmatter)
2. **SKILL.md** (<5k palabras) - Cuando se activa
3. **Resources** (unlimited) - Bajo demanda (scripts/, references/, assets/)

---

## Memoria Persistente (.claude/memory/)

SaaS Factory incluye un sistema de memoria persistente POR PROYECTO que reemplaza la auto-memory de Claude Code.

**Por que?** La auto-memory de Claude Code guarda notas en `~/.claude/projects/` (local a tu maquina). Eso significa que no viaja con el repo, no es versionado, no es compartido con tu equipo, y Claude decide que guardar sin tu control.

**Como funciona:**
- `.claude/memory/MEMORY.md` es el indice (max 200 lineas, se carga automaticamente)
- Carpetas por tipo: `user/`, `feedback/`, `project/`, `reference/`
- Git-versioned: cada cambio es un commit que puedes revertir
- El skill `memory-manager` gestiona cuando consultar y cuando guardar

**Activacion:** La primera vez que se usa el skill `memory-manager`, automaticamente deshabilita la auto-memory de Claude Code en `.claude/settings.json` y crea la estructura de carpetas.

---

## Recursos Compartidos

Los skills referencian estos directorios (NO se mueven):

| Recurso | Path | Usado por |
|---------|------|-----------|
| PRP Template | `.claude/PRPs/prp-base.md` | Skill `prp` |
| AI Templates | `.claude/skills/ai/references/` | Skill `ai` |
| Design Systems | `.claude/design-systems/` | Directo (5 sistemas) |

---

## Crear un Nuevo Skill

```bash
# Opcion 1: Usar skill-creator
/skill-creator

# Opcion 2: Manual
mkdir .claude/skills/mi-skill
# Crear SKILL.md con frontmatter + instrucciones
```

### Checklist

- [ ] SKILL.md con YAML frontmatter valido (name + description)
- [ ] Contenido <5k palabras, forma imperativa
- [ ] Scripts con --help y manejo de errores
- [ ] References para docs >5k palabras
- [ ] Descripcion clara de cuando usarlo

---

## Migracion V3 → V4

| V3 | V4 |
|----|-----|
| `.claude/commands/*.md` | `.claude/skills/*/SKILL.md` |
| `.claude/agents/*.md` | `.claude/skills/*/SKILL.md` (user-invocable: false, context: fork) |
| `.claude/prompts/*.md` | `.claude/skills/*/SKILL.md` |
| Agentes como archivos sueltos | Frontmatter `agent:` y `context: fork` en skills |
| AI Templates como docs | Skill `/ai` con `references/` colocalizados |
| PRPs como template suelto | Skill `/prp` que genera PRPs con context: fork |

---

*SaaS Factory V4: Todo es un Skill.*
*Basado en Claude Code Skills 2.0 (CC 2.1.0+)*
