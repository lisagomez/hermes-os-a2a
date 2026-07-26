# Meeting Copilot — Mission Control comercial de reuniones

Copiloto para agentes de ventas / discovery / customer success: audio o transcripción de una
reunión → transcripción diarizada → insights con evidencia citada → score de discovery
explicable → guided meeting (coach) → resumen, follow-up, CRM notes y riesgos — operado desde
un shell **Mission Control** con launcher de herramientas y theming system/light/dark.

Spec completa: [`SPEC.md`](./SPEC.md) · PRP: `.claude/PRPs/prp-meeting-copilot.md`.

## Correr localmente

```bash
cd businessos/frontends/meeting-copilot
npm install
npm run dev        # abre el puerto que indique la consola (auto)
```

MVP 100% local: sin Supabase, sin API keys, cero tokens de LLM. Los datos demo (3 reuniones
es-MX con arcos distintos: discovery bueno ~88, superficial ~35, demo con objeciones ~60)
cargan solos.

## Flujo demo sugerido (2 minutos)

1. **Inicio** → stats y recomendaciones derivadas de los datos reales del workspace.
2. **Herramientas → Voice Transcription** → “Usar audio de demostración” → observa la cola y
   el progreso → “Analizar discovery”.
3. **Insights** → categorías con evidencia clicable (salta al segmento) + score con desglose.
4. **Guided Meeting** → Reproducir (o “Revelar todo”): cobertura del playbook, siguiente
   mejor pregunta con justificación y alertas del coach (prueba con la reunión de Kapital RH,
   que dispara todas).
5. **Resumen** → executive summary, action items, follow-up y CRM notes copiables, riesgos,
   mapa de stakeholders.
6. **Manager** → scorecards comparativos, calidad por agente, huecos recurrentes.
7. Topbar: **⌘K** (command bar), icono de grid (launcher, con pin/recientes/búsqueda) y
   selector de tema (sistema/claro/oscuro).

Para ver el estado de error visible de la cola: sube un archivo cuyo nombre contenga `error`.

## Verificación

```bash
npm run typecheck   # TypeScript strict
npm run lint        # ESLint 9 (flat config nativa de next 16)
npm run test        # vitest: motor de análisis + coach (20 tests)
npm run build       # build de producción
npm run smoke       # Playwright: flujo completo + temas + launcher (levanta su propio server)
```

## Seams (integraciones pluggables)

Regla del proyecto: un valor desconocido en un seam **detiene la app** al arrancar (nunca
degradación silenciosa). Todo por variables de entorno:

| Variable | Default | Valores | Qué conecta |
|---|---|---|---|
| `NEXT_PUBLIC_COPILOT_DATA` | `mock` | `mock` \| `real` | `real` reservado a Supabase (post-MVP): tablas espejo de `transcripciones`/`tareas_reunion`/`leads` del repo |
| `NEXT_PUBLIC_TRANSCRIPTION_PROVIDER` | `mock` | `mock` \| `transcriptor-local` \| `transcripcion-a2a` \| `groq-whisper` | Motor de STT detrás de la interfaz única (`src/features/transcription/providers.ts`) |
| `NEXT_PUBLIC_TRANSCRIPTOR_URL` | `http://localhost:5000` | URL | Flask de [`altaventasllc-source/transcriptor`](https://github.com/altaventasllc-source/transcriptor) (faster-whisper) para el provider `transcriptor-local` |
| `NEXT_PUBLIC_AGENT_ENGINE` | `rules` | `rules` \| `llm` | Motor de los 7 agentes. `rules` = determinista (activo); `llm` = mismo contrato, post-MVP |

### Providers de transcripción

- **mock** (activo): determinista, diarizado, progreso realista; produce la transcripción demo.
- **transcriptor-local**: adapter HTTP real al Flask del repo externo (`POST /upload` → poll
  `GET /status` → parseo de líneas `[M:SS]`). Sin diarización → `hablante: 'desconocido'`,
  confianza fija 0.75 (el motor no la reporta; no se inventa).
- **transcripcion-a2a**: el servicio A2A del repo (`businessos/transcripcion-a2a`, :4800) usa
  el MISMO contrato de segmento — al desplegarse con motor real, el adapter es directo.
- **groq-whisper**: patrón `chat/transcribe` de control-interno (texto plano, server-side).

## Arquitectura

Next 16 + React 19 + TypeScript strict + Tailwind v4 (tokens CSS light/dark + `@theme
inline`) + zustand + lucide. Feature-first (`src/features/*`). El motor de análisis
(`features/insights/engine.ts`) es puro y determinista: 14 categorías de insight (toda
afirmación cita segmento `[mm:ss]`), 8 dimensiones de score con reglas explicables, huecos →
siguiente mejor pregunta del playbook. El coach (`features/guided/coach.ts`) opera sobre el
prefijo revelado (replay = honesto respecto a "tiempo real").

Principios heredados de Hermes OS · A2A: evidencia siempre citada, `[inaudible]` en vez de
adivinar, fallos visibles, motores pluggables mock-first, un escritor por dato.
