# Sistema PRP (Product Requirements Proposal)

> **Los Blueprints de la Fábrica** - Contrato humano-IA antes de escribir código

---

## 🏭 Qué es un PRP (Analogía Tesla Factory)

Un PRP es el **blueprint de una pieza de la fábrica**. Define QUÉ construir antes de escribir una sola línea de código.

| Sección | Propósito | Responsable |
|---------|-----------|-------------|
| **Objetivo** | Qué se construye (estado final) | Humano define |
| **Por Qué** | Valor de negocio | Humano define |
| **Qué** | Comportamiento + criterios de éxito | Humano + IA |
| **Contexto** | Docs, referencias, código existente | IA investiga |
| **Blueprint** | Fases de implementación (sin subtareas) | IA genera |
| **Aprendizajes** | Self-Annealing - errores y fixes | IA actualiza |

---

## 🔄 Flujo de Trabajo

```
1. Humano: "Necesito [feature]"
2. IA: Investiga contexto y viabilidad
3. IA: Genera PRP-XXX-nombre.md usando este template
4. Humano: Revisa y aprueba
5. IA: Ejecuta Blueprint fase por fase (skill `/bucle-agentico`)
6. IA: Documenta aprendizajes en el PRP (Self-Annealing)
```

---

## 📝 Nomenclatura

- Archivos: `PRP-[NUMERO]-[descripcion-kebab].md`
- Estados: `PENDIENTE` → `APROBADO` → `EN PROGRESO` → `COMPLETADO`

---

# TEMPLATE PRP

```markdown
# PRP-XXX: [Título]

> **Estado**: PENDIENTE
> **Fecha**: YYYY-MM-DD
> **Proyecto**: [nombre]

---

## Decisión del Consejo (opcional)

> Solo si esta feature nace de un veredicto del skill `consejo`. Si no, eliminar esta sección.

- **decision_id**: `[YYYY-MM-DD-slug]`
- **Veredicto en 2 líneas**: [recomendación del Chairman resumida]
- **Registro completo**: `.claude/memory/decisiones/[decision_id].md`

> Al crear este PRP desde una decisión, registrar el traspaso en
> `businessos/trazas-decisiones.jsonl`:
> `{"decision_id": "...", "evento": "prp", "ref": "PRP-XXX-nombre.md", "fecha": "YYYY-MM-DD"}`

## Objetivo

[Qué se construye - estado final deseado en 1-2 oraciones]

## Por Qué

| Problema | Solución |
|----------|----------|
| [Dolor del usuario] | [Cómo lo resuelve esta feature] |

**Valor de negocio**: [Impacto medible - conversiones, tiempo, dinero]

## Qué

### Criterios de Éxito
- [ ] [Criterio medible 1]
- [ ] [Criterio medible 2]
- [ ] [Criterio medible 3]

### Comportamiento Esperado
[Descripción del flujo principal - Happy Path]

---

## Contexto

### Referencias
- `src/features/[existente]/` - Patrón a seguir
- [URL de docs] - API reference

### Arquitectura Propuesta (Feature-First)
```
src/features/[nueva-feature]/
├── components/
├── hooks/
├── services/
├── store/
└── types/
```

### Modelo de Datos (si aplica)
```sql
CREATE TABLE [tabla] (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE [tabla] ENABLE ROW LEVEL SECURITY;
```

### Modelo de amenazas (mini — obligatorio desde 2026-07-19)

> Metodología completa en `businessos/gobernanza/modelo-amenazas-v1.md`. 5 pasos en
> miniatura: ¿qué protege, qué cruza, quién ataca, qué lo frena?

- **Activos que toca**: [A1..A10 del modelo, o nuevos]
- **Fronteras que cruza**: [qué entra sin confianza y dónde se valida]
- **Atacante relevante**: [O1..O6 aplicable]
- **Controles**: [G1..G6 existentes que aplican + brechas nuevas]

### Evaluación de impacto — AISIA (si el sistema toma decisiones que afectan personas)

> Hermana del modelo de amenazas: protege a las PERSONAS del sistema, incluso sin
> atacante. Plantilla completa en `businessos/gobernanza/adenda-iso42001.md` §3.

- **Partes afectadas**: [quién recibe consecuencias]
- **Daños posibles SIN atacante**: [decisión errónea del sistema operando "bien"]
- **Mitigaciones**: [gate humano / gracia / vía de apelación / comunicación]

### Confianza del agente (si este PRP crea o modifica un servicio A2A / plantilla SC)

> Taxonomía en `businessos/gobernanza/adenda-web-agentica.md` §2. Regla de mínimos:
> nada irreversible se sostiene solo en Claim/Brief — exige Constraint o gate humano.

```
Confianza: [Constraint | Proof | Reputation | Stake | Brief | Claim]
Justificación: [por qué este modelo basta para el peor caso de este agente]
```

### ¿Este PRP cambia comportamiento de agentes? (CDC)

> Cambiar modelo, SOUL, prompt de sistema o plantilla del Engine = cambio del sistema
> de IA → gate CDC proporcional al radio (`businessos/gobernanza/gobernanza-ciclo-de-vida.md` §3).

- **CDC aplicable**: sí/no — [si sí: qué gate corresponde (completo/estándar/bitácora)]

---

## Blueprint (Assembly Line)

> IMPORTANTE: Solo definir FASES. Las subtareas se generan al entrar a cada fase
> siguiendo el bucle agéntico (mapear contexto → generar subtareas → ejecutar)

### Fase 1: [Nombre]
**Objetivo**: [Qué se logra al completar esta fase]
**Validación**: [Cómo verificar que está completa]

### Fase 2: [Nombre]
**Objetivo**: [Qué se logra]
**Validación**: [Cómo verificar]

### Fase N: Validación Final
**Objetivo**: Sistema funcionando end-to-end
**Validación**:
- [ ] `npm run typecheck` pasa
- [ ] `npm run build` exitoso
- [ ] Playwright screenshot confirma UI
- [ ] Criterios de éxito cumplidos

---

## 🧠 Aprendizajes (Self-Annealing / Neural Network)

> Esta sección CRECE con cada error encontrado durante la implementación.
> El conocimiento persiste para futuros PRPs. El mismo error NUNCA ocurre dos veces.

### [YYYY-MM-DD]: [Título del aprendizaje]
- **Error**: [Qué falló]
- **Fix**: [Cómo se arregló]
- **Aplicar en**: [Dónde más aplica este conocimiento]

---

## Gotchas

> Cosas críticas a tener en cuenta ANTES de implementar

- [ ] [Gotcha 1 - ej: "Chart.js requiere dynamic import por SSR"]
- [ ] [Gotcha 2 - ej: "Supabase RLS debe habilitarse en producción"]

## Anti-Patrones

- NO crear nuevos patrones si los existentes funcionan
- NO ignorar errores de TypeScript
- NO hardcodear valores (usar constantes)
- NO omitir validación Zod en inputs de usuario

---

*PRP pendiente aprobación. No se ha modificado código.*
```

---

## 🎯 Stack (Golden Path)

| Capa | Tecnología |
|------|------------|
| Framework | Next.js 16 + React 19 + TypeScript |
| Estilos | Tailwind CSS 3.4 |
| Backend | Supabase (Auth + DB) |
| Validación | Zod |
| Estado | Zustand |
| Testing | Playwright CLI + MCP |
