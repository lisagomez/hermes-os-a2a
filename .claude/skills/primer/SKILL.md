---
name: primer
description: "Cargar contexto completo del proyecto al inicio de una conversacion. Lee BUSINESS_LOGIC.md, estructura de features, estado de la BD, y configuracion actual. Activar cuando el agente no tiene contexto del proyecto o el usuario dice: que tenemos, donde estamos, dame contexto, resumeme el proyecto."
allowed-tools: Read, Grep, Glob, Bash
---

# Primer: Contexto SaaS Factory

Este proyecto fue creado con **SaaS Factory**, una template optimizada para desarrollo Agent-First. Al ejecutar este skill, el agente entiende inmediatamente que tiene disponible y como trabajar.

## Lo Que Ya Sabes (SaaS Factory DNA)

### Golden Path (Stack Fijo)
No hay decisiones tecnicas que tomar. El stack esta definido:

| Capa | Tecnologia | Notas |
|------|------------|-------|
| Framework | Next.js 16 + Turbopack | App Router, Server Components |
| UI | React 19 + TypeScript | Strict mode |
| Styling | Tailwind CSS 3.4 | Sin CSS custom |
| Backend | Supabase | Auth + PostgreSQL + Storage + RLS |
| Validation | Zod | Schemas compartidos client/server |

### Arquitectura Feature-First
```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Route group: paginas sin sidebar
│   ├── (main)/            # Route group: paginas con sidebar
│   └── api/               # API Routes
├── features/              # Todo colocalizado por feature
│   └── [feature-name]/
│       ├── components/    # UI de la feature
│       ├── services/      # Logica de negocio
│       ├── hooks/         # React hooks
│       └── types/         # TypeScript types
├── components/            # Componentes compartidos (Sidebar, etc.)
└── lib/
    └── supabase/          # Clients (client.ts, server.ts)
```

### MCPs Disponibles
Tienes 3 MCPs conectados. Usalos:

| MCP | Comandos Clave | Cuando Usar |
|-----|----------------|-------------|
| **Supabase** | `list_tables`, `execute_sql`, `apply_migration`, `get_logs` | SIEMPRE para BD. No uses CLI. |
| **Next.js DevTools** | `nextjs_index`, `nextjs_call`, `browser_eval` | Debug errores, ver estado del servidor |
| **Playwright** | `browser_navigate`, `browser_snapshot`, `browser_click` | Validacion visual, testing UI |

### Skills Disponibles
Delega tareas complejas usando los skills especializados:

| Skill | Responsabilidad |
|-------|-----------------|
| `frontend` | UI/UX, componentes, Tailwind, animaciones |
| `backend` | Server Actions, APIs, logica de negocio |
| `supabase-admin` | Migraciones, RLS policies, queries complejas |
| `calidad` | Tests, quality gates, verificacion |
| `vercel-deployer` | Deploy, env vars, dominios |
| `documentacion` | README, docs tecnicos |
| `codebase-analyst` | Patrones, convenciones del proyecto |

### Skills Slash Disponibles
- `primer` - Este skill (contexto inicial)
- `prp` - Generar Product Requirements Proposal
- `new-app` - Crear nueva aplicacion desde cero
- `landing` - Crear landing page de alta conversion
- `add-login` - Inyectar sistema de autenticacion completo
- `eject-sf` - Eliminar configuracion SaaS Factory
- `update-sf` - Actualizar a la ultima version

---

## Proceso de Contextualizacion

### 1. Leer Identidad del Proyecto

Lee `CLAUDE.md` y extrae:
- **Nombre del proyecto**
- **Problema que resuelve** (propuesta de valor)
- **Usuario target** (avatar)
- **Reglas de negocio especificas**

### 2. Mapear Estado de BD (via Supabase MCP)

Ejecuta `list_tables` para ver:
- Que tablas existen
- Cuantos registros tiene cada una
- Si RLS esta habilitado
- Relaciones entre tablas (foreign keys)

### 3. Escanear Features Implementadas

Revisa `src/app/` y `src/features/` para entender:
- Que paginas existen
- Que features estan construidas
- Que API endpoints hay

### 4. Entregar Resumen

```markdown
# [Nombre del Proyecto]

## Template
SaaS Factory v4.0 (Next.js 16 + Supabase)

## Proposito
[Que problema resuelve en 1-2 lineas]

## Estado Actual

### Base de Datos
| Tabla | Registros | RLS |
|-------|-----------|-----|
| ... | ... | SI/NO |

### Rutas Implementadas
- `/` -> [descripcion]
- `/dashboard` -> [descripcion]
- ...

### API Endpoints
- `POST /api/xxx` -> [que hace]
- ...

## MCPs Activos
SI Supabase | SI Next.js DevTools | SI Playwright

## Comandos
- `npm run dev` -> Desarrollo
- `npm run build` -> Build

## Listo para trabajar
En que te ayudo?
```

---

## Filosofia SaaS Factory

### El Humano Decide QUE, Tu Ejecutas COMO
- El humano define el problema de negocio
- Tu traduces a codigo usando el Golden Path
- No preguntas "que stack usar?" - ya esta decidido

### Velocidad = Inteligencia
- Turbopack permite 100 iteraciones en 30 segundos
- Usa Playwright para validar visualmente -> codigo -> screenshot -> iterar
- No planifiques de mas, ejecuta y ajusta

### MCPs son tus Sentidos
- **Supabase MCP** = Tu conexion a la BD (no uses CLI)
- **Next.js DevTools** = Tus ojos en errores/logs
- **Playwright** = Tu validacion visual

---

**Objetivo**: De 5-10 minutos de explicacion a 30 segundos de contexto automatico.

*SaaS Factory: Agent-First Development*
