---
name: eject-sf
description: "DESTRUCTIVO: Eliminar SaaS Factory del proyecto y dejar solo el software funcional. Activar cuando el usuario dice: quiero quitar SaaS Factory, eject, remover el template, limpiar el proyecto, o distribuir el codigo sin la fabrica. SIEMPRE confirmar antes de ejecutar."
allowed-tools: Read, Write, Edit, Bash
---

# Eject SaaS Factory

## ADVERTENCIA

Antes de ejecutar CUALQUIER accion, muestra este mensaje al usuario:

```
ADVERTENCIA: OPERACION DESTRUCTIVA

Este comando eliminara PERMANENTEMENTE:
- .claude/skills/ (skills del proyecto)
- .claude/design-systems/ (sistemas de diseno)
- .claude/skills/ai/references/ (AI templates)
- .claude/PRPs/ (templates PRP)
- .mcp.json (configuracion de MCPs)
- CLAUDE.md (system prompt)
- Referencias a "SaaS Factory" en el codigo

El proyecto quedara como una aplicacion Next.js generica,
lista para distribuir SIN las herramientas de desarrollo.

Esta accion es IRREVERSIBLE.
No podras usar update-sf despues de esto.

Para confirmar, escribe exactamente: EJECT
```

**ESPERA la respuesta del usuario.** Si no escribe exactamente `EJECT`, cancela la operacion.

---

## Proceso (solo si el usuario confirma)

### Paso 1: Limpiar referencias en codigo

Modifica estos archivos para quitar referencias a SaaS Factory:

**`src/app/page.tsx`** - Cambiar el titulo:
```tsx
// ANTES
<h1>SaaS Factory</h1>

// DESPUES
<h1>Mi Aplicacion</h1>
```

**`src/app/layout.tsx`** - Limpiar metadata:
```tsx
// ANTES
export const metadata: Metadata = {
  title: 'SaaS Factory App',
  description: 'Built with SaaS Factory',
}

// DESPUES
export const metadata: Metadata = {
  title: 'Mi Aplicacion',
  description: 'Aplicacion web moderna',
}
```

**`package.json`** - Cambiar el nombre:
```json
// ANTES
"name": "saas-factory-app"

// DESPUES
"name": "mi-aplicacion"
```

### Paso 2: Generar README.md basico

Reemplaza el README.md actual con uno generico:

```markdown
# Mi Aplicacion

Aplicacion web construida con Next.js 16 + Supabase.

## Tech Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS
- Supabase (Auth + Database)

## Quick Start

1. Instalar dependencias:
\`\`\`bash
npm install
\`\`\`

2. Configurar variables de entorno:
\`\`\`bash
cp .env.local.example .env.local
# Editar con tus credenciales de Supabase
\`\`\`

3. Iniciar desarrollo:
\`\`\`bash
npm run dev
\`\`\`

## Estructura

\`\`\`
src/
├── app/          # Next.js App Router
├── features/     # Codigo organizado por funcionalidad
├── shared/       # Codigo compartido
└── lib/          # Configuraciones (Supabase, etc.)
\`\`\`

## Comandos

- `npm run dev` - Servidor de desarrollo
- `npm run build` - Build para produccion
- `npm run start` - Servidor de produccion
- `npm run lint` - Linting

## Deploy

Listo para deploy en Vercel:

\`\`\`bash
npm install -g vercel
vercel
\`\`\`
```

### Paso 3: Eliminar archivos de configuracion

```bash
# Eliminar archivos de SaaS Factory
rm -f .mcp.json
rm -f CLAUDE.md
rm -rf src/features/.template/
rm -f src/features/README.md
rm -f src/shared/README.md
```

### Paso 4: Eliminar .claude/ (auto-destruccion)

Este es el ULTIMO paso porque este skill esta dentro de `.claude/`:

```bash
rm -rf .claude/
```

### Paso 5: Confirmar al usuario

```
Eject completado.

Eliminado:
- .claude/skills/ (skills del proyecto)
- .claude/design-systems/ (sistemas de diseno)
- .claude/skills/ai/references/ (AI templates)
- .claude/PRPs/ (templates PRP)
- .mcp.json (configuracion MCPs)
- CLAUDE.md (system prompt)
- Templates y READMEs internos

Actualizado:
- src/app/page.tsx (titulo limpio)
- src/app/layout.tsx (metadata limpia)
- package.json (nombre generico)
- README.md (documentacion basica)

Tu proyecto esta listo para distribuir.
No queda rastro de SaaS Factory.
```

---

## Notas Importantes

1. **Este skill se auto-destruye** - Despues de ejecutarlo, no existira mas
2. **No hay vuelta atras** - Para recuperar SF, tendrias que volver a ejecutar el alias `saas-factory`
3. **El codigo funcional NO se toca** - Solo se eliminan herramientas de desarrollo
