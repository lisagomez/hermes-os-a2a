# SPEC — Meeting Copilot (Mission Control comercial de reuniones)

> Estado: Fase 2 (especificación) · Rama `feat/meeting-copilot-mvp` · 2026-07-25
> Nombre de trabajo: **Meeting Copilot**. El shell interno del producto se llama **Mission Control**
> (no confundir con el Mission Control de infra del repo raíz — son productos distintos).
> PRP hermano: `.claude/PRPs/prp-meeting-copilot.md`. Fuente de decisiones: Fase 1 (conversación 2026-07-25).

---

## 1. Visión del producto

Los equipos comerciales pierden el conocimiento de sus reuniones: el discovery depende de la
memoria y experiencia de cada vendedor, las notas van incompletas al CRM y nadie sabe qué tan
buena fue una llamada hasta que el deal muere. Meeting Copilot convierte **audio o transcripción
de una reunión** en **conocimiento accionable y verificable**: insights con evidencia citada,
score de discovery explicable, siguiente mejor pregunta, resumen, follow-up y notas de CRM —
operado desde un shell central (Mission Control) con herramientas lanzables y agentes
especializados.

Es una mezcla de meeting copilot + sales discovery workspace + Mission Control de agentes,
concebido como base seria para SaaS real (línea white-label de Hermes OS · A2A).

**Principios heredados del proyecto (no negociables):**
- Todo output cita su fuente (referencia a segmento `[mm:ss]`); nada se afirma sin evidencia.
- Nunca se adivina: baja confianza → `[inaudible]`, dato faltante → hueco declarado.
- Motores pluggables y mock-first: el flujo completo se valida con motores deterministas
  (cero tokens); LLM/STT reales entran por seams sin rehacer arquitectura.
- Fallos visibles: ningún `catch` silencioso; estados de error renderizados en UI.
- Score = gates explicables (patrón sup-crm): mismo input → mismo output → mismo porqué.

## 2. Perfiles de usuario

| Perfil | Necesidad principal |
|---|---|
| SDR / BDR | Calificar rápido, no olvidar preguntas clave, pasar contexto limpio al AE |
| Account Executive | Discovery profundo, riesgos del deal, siguiente paso que avance la venta |
| Customer Success Manager | Contexto de la cuenta, compromisos y señales de churn |
| Solutions Consultant | Necesidades técnicas explícitas/implícitas, herramientas actuales |
| Research / UX discovery | Extracto estructurado de entrevistas con evidencia |
| Manager comercial | Calidad de discovery por agente, adherencia al playbook, coaching |
| Líder comercial | Capa central de operación: pipeline de reuniones, patrones, comparativos |

## 3. Jobs to be done

1. "Cuando termino una llamada, quiero el resumen/insights/acciones sin transcribir a mano,
   para dedicar mi tiempo a vender."
2. "Cuando estoy en discovery, quiero saber qué me falta preguntar, para no salir de la
   reunión con huecos."
3. "Cuando preparo la siguiente reunión, quiero los riesgos y preguntas abiertas del deal,
   para llegar con un plan."
4. "Cuando reviso a mi equipo, quiero comparar llamadas con criterios objetivos, para
   hacer coaching con evidencia y no con opiniones."
5. "Cuando actualizo el CRM, quiero notas estructuradas por etapa, para que el pipeline
   refleje la realidad."

## 4. User stories (MVP)

- Como AE, subo un audio (o pego una transcripción) y veo su progreso de procesamiento hasta
  tener la transcripción diarizada con timestamps.
- Como AE, veo insights en 14 categorías, cada uno con su evidencia clicable que salta al
  segmento de la transcripción.
- Como AE, veo el score de discovery 0–100 con desglose por dimensión y qué evidencia (o
  ausencia) lo explica.
- Como AE, abro el modo Guided Meeting y, mientras la conversación avanza (replay), el coach
  me marca cobertura del playbook, me sugiere la siguiente mejor pregunta con justificación y
  me alerta cuando el discovery va superficial.
- Como AE, al cerrar el análisis obtengo executive summary, draft de follow-up, notas de CRM,
  riesgos y action items con responsable.
- Como manager, comparo los scorecards de varias llamadas, veo preguntas faltantes recurrentes
  y adherencia al playbook por agente.
- Como usuario, abro cualquier herramienta desde el launcher (grid estilo Google apps) o desde
  el command bar (Cmd+K), fijo mis favoritas y busco por nombre.
- Como usuario, cambio el tema entre system/light/dark y toda la app responde coherente.

## 5. Alcance del MVP

**Dentro:** shell Mission Control completo; ingesta por audio/pegar texto/"reunión virtual"
simulada; Voice Transcription tool (provider `mock` + adaptadores diseñados); Discovery
Analyzer determinista; score explicable; Guided Meeting en modo replay; workspace
post-reunión; vista Manager; playbooks/templates editables en UI (persistencia local);
launcher; theming; datos demo realistas (3 reuniones es-MX); build/lint/typecheck/smoke verdes.

**Fuera (diseñado, con seam listo):** STT real (faster-whisper / Groq / transcripcion-a2a),
diarización real, LLM en agentes, Supabase, Zoom/Meet/Teams, envío real de correos (frontera
futura: `aprobaciones_salientes`), auth multi-tenant (patrón magic link + allowlist del repo
raíz, apagado en MVP), guided meeting con audio en vivo.

## 6. Pantallas

| # | Ruta | Pantalla | Contenido clave |
|---|---|---|---|
| 1 | `/` | Mission Control (home) | Saludo + stats compactas (reuniones semana, score promedio, acciones vencidas, follow-ups pendientes), tabla operativa de reuniones recientes, panel Recomendaciones, Actividad reciente, accesos a agentes |
| 2 | `/reuniones` | Reuniones | Tabla densa: título, cuenta, tipo, fecha, estado del ciclo, score chip, acciones por fila |
| 3 | `/reuniones/nueva` | Nueva conversación | 3 tabs: Subir audio · Pegar transcripción · Reunión virtual (simulada: Zoom/Meet/Teams con estado "próximamente", genera demo) |
| 4 | `/herramientas/transcripcion` | Voice Transcription | Dropzone, cola de jobs con progreso, resultados, enviar a Analyzer / Guided / resumen rápido |
| 5 | `/reuniones/[id]/transcripcion` | Transcripción | Segmentos por speaker con timestamps, chips `[inaudible]`, confianza global, player simulado, búsqueda en texto |
| 6 | `/reuniones/[id]/insights` | Panel de insights | 14 categorías + huecos; cada insight con evidencia clicable; score resumido con link al desglose |
| 7 | `/reuniones/[id]/guiada` | Guided Meeting | Transcript en vivo (replay), checklist de cobertura del playbook, siguiente mejor pregunta con porqué, alertas del coach, notas rápidas |
| 8 | `/reuniones/[id]/resumen` | Workspace post-reunión | Executive summary, discovery summary, action items con owner, draft follow-up, CRM notes, riesgos, score + confianza del discovery, recomendaciones próxima reunión |
| 9 | `/manager` | Manager / Scorecards | Scorecard por llamada, comparativo entre reuniones, preguntas faltantes recurrentes, patrones de objeciones, adherencia al playbook por agente |
| 10 | `/playbooks` | Playbooks & Templates | Playbooks por tipo de reunión (dimensiones, pesos, banco de preguntas), templates de salida |
| 11 | `/herramientas` | Launcher (página) | Grid completo: búsqueda, Fijadas / Recientes / Todas |
| 12 | `/grabacion` | Grabación en-app | Grabadora con micrófono del navegador (MediaRecorder): grabar/pausar/detener, cronómetro, playback, renombrar, descargar y enviar a la cola de Voice Transcription (el binario viaja al provider); permiso denegado = error visible |

Todas las pantallas definen su **estado vacío** con criterio (qué hacer a continuación, nunca
un hueco gris) y su estado de error visible.

## 7. Arquitectura funcional

```
src/
├── app/                          # App Router (rutas de §6) + layout shell
├── features/
│   ├── shell/                    # Mission Control: sidebar, topbar, command-bar, theme, launcher-popover
│   ├── launcher/                 # catálogo de herramientas, pins, recientes, página /herramientas
│   ├── meetings/                 # lista, detalle, ciclo de vida de reunión
│   ├── ingestion/                # nueva conversación (audio / texto / virtual)
│   ├── transcription/            # jobs, providers pluggables, viewer de transcripción
│   ├── insights/                 # extractor determinista + score + panel
│   ├── guided/                   # guided meeting engine (replay) + coach
│   ├── workspace/                # summary, follow-up, crm-notes, riesgos, acciones
│   ├── manager/                  # scorecards y comparativos
│   ├── playbooks/                # playbooks + templates + editor
│   └── agents/                   # contratos y orquestación de agentes (motor rules / LLM seam)
└── shared/                       # theme-context, stores zustand, ui (Button, Card, Table, Badge, Chip, Tabs, Dialog, EmptyState), lib
```

- **Capa de servicios** con el patrón `getDataSource()` del repo raíz: `COPILOT_DATA=mock|real`
  (default `mock`; `real` reservado a Supabase futuro). Badge de fuente visible en la topbar.
- **Agent orchestration layer**: cada agente es un módulo con contrato tipado
  (`inputs → outputs`) y dos motores: `rules` (default, determinista) y `llm` (seam,
  `AGENT_ENGINE=rules|llm`; valor desconocido → error al arrancar, nunca degradar en silencio).
- **Estado**: zustand por feature + persistencia localStorage (prefs UI, pins, playbooks
  editados, reuniones creadas por el usuario). Fixtures demo en `src/features/*/fixtures/`.

## 8. Modelo de datos (contratos TypeScript del MVP)

```ts
type TipoReunion = 'discovery' | 'demo' | 'negociacion' | 'revision_tecnica' | 'cierre';
type EstadoReunion = 'capturada' | 'transcrita' | 'analizada' | 'revisada' | 'cerrada';

interface Participante { nombre: string; rol: string; lado: 'interno' | 'cliente'; }

interface Reunion {
  id: string;                    // ulid
  titulo: string;
  cuenta: string;                // empresa
  tipoReunion: TipoReunion;
  participantes: Participante[];
  asesor: string;                // dueño interno de la reunión
  fecha: string;                 // ISO
  duracionS: number | null;
  origen: 'audio' | 'texto' | 'virtual';
  leadId?: string;               // ancla opcional al embudo (tabla leads futura)
  estado: EstadoReunion;
}

interface ArchivoAudio {
  id: string; reunionId: string; filename: string; mime: string;
  tamanoBytes: number; duracionS: number | null; sha256: string;
}

type EstadoJob = 'pendiente' | 'procesando' | 'completado' | 'fallido';
interface TrabajoTranscripcion {
  id: string; audioId: string; motor: string;      // 'mock' | 'transcriptor-local' | ...
  estado: EstadoJob; progreso: number;             // 0..100
  idioma: string;                                  // default 'es-MX'
  intentos: number; error: string | null;          // error SIEMPRE visible en UI
  creadoAt: string; actualizadoAt: string;
}

interface Segmento {
  inicioS: number; finS: number;
  hablante: string;              // nombre del participante o 'desconocido'
  texto: string;                 // '[inaudible]' si confianza < 0.5 (nunca se adivina)
  confianza: number;             // 0..1
}

interface Transcripcion {
  id: string; reunionId: string; motor: string;
  confianzaGlobal: 'alta' | 'media' | 'baja';      // promedio ≥0.9 / ≥0.7 / resto
  contenido: string;             // formato fijo: líneas "[mm:ss] Hablante: texto"
  segmentos: Segmento[];
}

type CategoriaInsight =
  | 'pain' | 'objetivo' | 'necesidad_explicita' | 'necesidad_implicita' | 'riesgo'
  | 'objecion' | 'herramienta_actual' | 'competidor' | 'stakeholder' | 'presupuesto'
  | 'urgencia' | 'proceso_decision' | 'senal_compra' | 'proximo_paso' | 'pregunta_sin_responder';

interface Evidencia { segmentoIdx: number; inicioS: number; cita: string; }
interface Insight {
  id: string; reunionId: string; categoria: CategoriaInsight;
  texto: string;                 // enunciado del hallazgo
  evidencia: Evidencia[];        // ≥1 SIEMPRE (regla de oro); sin evidencia no hay insight
  confianza: 'alta' | 'media';   // media = inferido de mención indirecta
  extra?: Record<string, string>; // p.ej. stakeholder: { rol, influencia }
}

type DimensionId = 'problema' | 'impacto' | 'urgencia' | 'proceso_decision'
  | 'stakeholders' | 'presupuesto' | 'competencia' | 'proximos_pasos';
interface DimensionScore {
  dimension: DimensionId; peso: number;
  estado: 'cubierta' | 'parcial' | 'faltante';
  evidencia: Evidencia[];        // vacía si faltante
  explicacion: string;           // el porqué en una frase (transparencia)
}
interface ScoreDiscovery {
  reunionId: string; total: number;             // 0..100 = Σ puntos
  dimensiones: DimensionScore[];                // cubierta=peso, parcial=peso/2, faltante=0
  conducta: {                                   // score de calidad de la llamada (informativo)
    ratioHablaInterno: number;                  // ideal < 0.45
    preguntasAbiertas: number;
    segmentosInaudibles: number;
  };
  huecos: HuecoDiscovery[];
}
interface HuecoDiscovery {
  dimension: DimensionId; motivo: string;
  preguntaSugerida: string; justificacion: string;   // "no se validó impacto: ..."
}

interface Accion {                // espejo de tareas_reunion (migración aditiva futura)
  id: string;                    // 'T1', 'T2'... correlativo por reunión
  reunionId: string; tarea: string;
  responsable: string | null; fechaLimite: string | null;   // null = sin fecha
  fuente: string;                // "Hablante [mm:ss]"
  estado: 'pendiente' | 'en_curso' | 'hecha' | 'cancelada';
}

interface Playbook {
  id: string; tipoReunion: TipoReunion; nombre: string;
  dimensiones: { dimension: DimensionId; peso: number; critica: boolean }[];  // Σ pesos = 100
  bancoPreguntas: Record<DimensionId, string[]>;    // ordenadas por prioridad
  umbralSuperficial: number;     // alerta del coach si score proyectado < umbral a mitad de reunión
}

type EstadoHerramienta = 'active' | 'beta' | 'soon';
interface Herramienta {
  slug: string; nombre: string; descripcion: string;
  categoria: 'captura' | 'analisis' | 'ejecucion' | 'supervision' | 'configuracion';
  icono: string;                 // nombre de icono lucide
  estado: EstadoHerramienta; ruta: string;
}
// prefs UI (localStorage): { theme: 'system'|'light'|'dark', pinned: string[],
//                            recientes: {slug, ts}[], sidebarColapsado: boolean }
```

**Mapeo a Supabase (roadmap, migración aditiva):** `Transcripcion` → tabla `transcripciones`
existente (cambiando ancla `lead_id` → `reunion_id`, mismo shape de `segmentos`);
`Accion` → `tareas_reunion` tal cual; `Reunion.leadId` → `leads.lead_id`. Un escritor por
tabla, RLS on, service_role — doctrina del repo.

## 9. Agentes especializados (contratos completos)

Formato común: cada agente corre bajo `AGENT_ENGINE` (`rules` en MVP). Reglas universales:
citar evidencia siempre; declarar huecos en vez de rellenar; ningún agente escribe fuera de su
salida (un escritor por dato); toda excepción se reporta en UI.

### 9.1 Discovery Analyst
- **Objetivo:** convertir la transcripción en insights estructurados de las 14 categorías + huecos.
- **Inputs:** `Transcripcion`, `Playbook` del tipo de reunión, `Participante[]`.
- **Outputs:** `Insight[]`, `HuecoDiscovery[]`.
- **Reglas:** solo segmentos con `confianza ≥ 0.5`; necesidad *implícita* exige marcar
  `confianza: 'media'` y citar la mención indirecta; un stakeholder solo existe si fue nombrado.
- **Calidad:** 0 insights sin evidencia; categorías vacías se muestran como vacías (no se inventan).
- **Activación:** al completarse una transcripción o al pegar texto normalizado.
- **No debe:** parafrasear alterando el sentido; deducir presupuesto de señales ambiguas sin marcarlo.

### 9.2 Meeting Coach
- **Objetivo:** guiar la reunión (replay): cobertura, siguiente mejor pregunta, alertas.
- **Inputs:** segmentos acumulados hasta el instante t, `Playbook`, insights parciales.
- **Outputs:** checklist de cobertura, `preguntaSugerida + justificacion`, alertas tipadas:
  `superficial` (pain sin impacto), `monologo` (>90 s continuos del lado interno),
  `dimension_critica_pendiente` (crítica sin tocar pasada la mitad), `objecion_sin_respuesta`.
- **Reglas:** máx. 1 sugerencia activa a la vez; prioridad de huecos: problema → impacto →
  urgencia → proceso_decision → stakeholders → presupuesto → competencia → proximos_pasos.
- **Calidad:** cada sugerencia lleva su porqué citando lo dicho (o lo no dicho).
- **Activación:** modo Guided Meeting.
- **No debe:** sugerir preguntas ya respondidas; interrumpir con más de una alerta simultánea.

### 9.3 Follow-up Writer
- **Objetivo:** draft de correo de seguimiento listo para editar.
- **Inputs:** insights, acciones, score, template `followup` del playbook.
- **Outputs:** asunto + cuerpo (agradecimiento, lo entendido [con los pains en palabras del
  cliente], compromisos con fechas, siguiente paso propuesto).
- **Reglas:** solo compromisos que existan como `Accion`; tono profesional es-MX, trato de usted.
- **Activación:** workspace post-reunión. **No debe:** enviar nada (el envío real pasará por
  `aprobaciones_salientes` — frontera futura); prometer alcances no discutidos.

### 9.4 CRM Notes
- **Objetivo:** notas estructuradas listas para pegar en CRM.
- **Inputs:** insights, score, `Reunion` (+ etapa del lead si `leadId`).
- **Outputs:** bloque markdown: contexto de cuenta, pains priorizados, stakeholders con roles,
  presupuesto/urgencia, próximos pasos, etapa sugerida del embudo (de las 10 canónicas de `leads`).
- **Reglas:** sin narrativa — bullets telegráficos; sugiere etapa solo con evidencia.
- **Activación:** workspace. **No debe:** duplicar el executive summary; cambiar etapa por sí solo.

### 9.5 Risk Reviewer
- **Objetivo:** riesgos del deal con severidad.
- **Inputs:** insights (objeciones, competidores, proceso de decisión, urgencia), score.
- **Outputs:** riesgos `{tipo: champion_ausente | sin_presupuesto | sin_urgencia | competidor_activo |
  proceso_desconocido | discovery_incompleto, severidad: alta|media|baja, evidencia, mitigacion}`.
- **Reglas:** severidad por reglas fijas (p. ej. `proceso_decision` faltante + señal de compra → alta).
- **Activación:** post-análisis. **No debe:** opinar sin evidencia; inflar severidad.

### 9.6 Stakeholder Mapper
- **Objetivo:** mapa de participantes e influencia.
- **Inputs:** participantes, insights `stakeholder`, menciones de terceros no presentes.
- **Outputs:** nodos `{nombre, rol, presente: bool, influencia: decisor|influenciador|usuario|
  desconocida, evidencia}` + relaciones mencionadas.
- **Reglas:** `influencia: 'desconocida'` es un valor legítimo y visible (hueco a resolver).
- **Activación:** post-análisis. **No debe:** asumir jerarquías no mencionadas.

### 9.7 Transcript QA
- **Objetivo:** calidad de la captura antes de analizar.
- **Inputs:** `Transcripcion`, `TrabajoTranscripcion`.
- **Outputs:** `confianzaGlobal`, % segmentos `[inaudible]`, bloques de silencio/baja claridad,
  advertencia si la calidad compromete el análisis (badge en insights).
- **Reglas:** si >20% inaudible → el análisis se marca "confianza reducida" en todas las vistas.
- **Activación:** al completar un job. **No debe:** corregir texto adivinando.

### 9.8 Motor `llm` — CONECTADO (siguiente mejor pregunta + Discovery Analyst)

**Discovery Analyst IA** (`/api/asesor/insights`): con `AGENT_ENGINE=llm`, al abrir
Insights/Resumen de una reunión la IA analiza la transcripción REAL una vez (caché por
transcripción): extrae insights de las 14 categorías y evalúa las 8 dimensiones. Contrato
duro (`prompt-insights.ts::validarAnalisisIA`): todo hallazgo referencia el `segmentoIdx`
que lo respalda; evidencia inválida → hallazgo DESCARTADO; dimensión no-faltante sin
respaldo → degradada a faltante — **la IA propone, el contrato verifica**. La fusión
(`insights/ia.ts::fusionarAnalisis`) deja mandar a la IA en dimensiones/insights pero
conserva los pesos del playbook, la aritmética del score, los riesgos y el mapa de
stakeholders del motor determinista. Estado siempre visible (chips análisis IA /
analizando… / IA no disponible — reglas, con hallazgos descartados declarados).

`NEXT_PUBLIC_AGENT_ENGINE=llm` activa la redacción con IA de la siguiente mejor pregunta
(Prompter de Grabación y Guided Meeting, MISMO hook `usePreguntaIA`). División deliberada:
el motor determinista decide QUÉ dimensión falta (explicable y testeado); la IA solo REDACTA
la pregunta enganchada al contexto (últimas 24 frases), sin repetir las ya sugeridas.
Ruta server-side `/api/asesor/pregunta` (OPENROUTER_API_KEY solo en servidor; modelo
`ASESOR_LLM_MODEL`, default gemini-2.5-flash-lite; timeout 9 s; máx 220 tokens; caché por
dimensión+banco+ventana de 5 frases; debounce 700 ms). La UI declara la fuente (chip IA /
banco / redactando… / "IA no disponible — banco" con el error en tooltip): sin clave o sin
red el flujo JAMÁS se rompe. Prompt en `features/agents/prompt-pregunta.ts` (puro, con tests
de parseo defensivo: respuesta sin JSON válido → banco, nunca se adivina).

### Prompts internos sugeridos (para extender el motor `llm` al resto de agentes)

Plantilla común (system): *"Eres {agente} de un copiloto comercial. Trabajas SOLO con la
transcripción provista. Toda afirmación cita segmento [mm:ss]. Si un dato no está en la
transcripción, decláralo como faltante — NUNCA lo inventes. Respondes JSON válido conforme al
schema {schema}. Idioma: es-MX."* + user: transcripción normalizada + playbook + instrucción
específica del agente (sus Reglas de arriba, literales). Los schemas son los tipos de §8 —
el contrato NO cambia entre motor `rules` y `llm` (mismo shape, misma UI).

## 10. Reglas de scoring (transparencia total)

**Pesos default (playbook discovery):** problema 20 · impacto 15 · proceso_decision 15 ·
urgencia 10 · stakeholders 10 · presupuesto 10 · competencia 10 · proximos_pasos 10 = 100.
Críticas: problema, impacto, proximos_pasos.

**Detección determinista por dimensión (motor `rules`):** cada dimensión tiene familias
léxicas es-MX + condiciones estructurales:

| Dimensión | `cubierta` exige | `parcial` si |
|---|---|---|
| problema | ≥1 pain con causa o contexto ("nos pasa X porque Y") | pain mencionado sin contexto |
| impacto | costo/consecuencia cuantificada o cualitativa explícita | "nos duele" sin dimensionar |
| urgencia | plazo o disparador explícito ("antes de", "este trimestre") | deseo sin plazo |
| proceso_decision | quién decide + cómo (pasos/comité/firma) | solo quién O solo cómo |
| stakeholders | ≥2 roles identificados o decisor confirmado | 1 rol sin confirmación de decisor |
| presupuesto | monto, rango o proceso presupuestal mencionado | señal indirecta ("tenemos partida") |
| competencia | herramienta actual o competidor + estado (evalúa/usa/descartó) | mención sin estado |
| proximos_pasos | acción + responsable + fecha | acción sin fecha o sin responsable |

Puntos: cubierta = peso; parcial = peso/2; faltante = 0. **El desglose completo (estado +
evidencia + explicación por dimensión) siempre es visible** — el número nunca aparece solo.
`conducta` (ratio de habla, preguntas abiertas, inaudibles) se muestra como contexto de calidad
de la llamada, no suma al score (para no mezclar calidad de venta con calidad de captura).

**Next best question:** primer hueco en el orden de prioridad del playbook → primera pregunta
no respondida de su banco → `justificacion` generada de la regla que falló (p. ej. *"Mencionaron
retrabajos [04:12] pero no cuánto les cuestan — valida impacto"*).

## 11. Mission Control shell

- **Sidebar** persistente colapsable (patrón control-interno): Inicio, Reuniones,
  Conversaciones, Herramientas, Playbooks, Manager, Configuración; botón búsqueda (Cmd+K);
  lockup del producto; sección inferior: tema, ajustes.
- **Topbar:** command bar global (buscar reuniones/herramientas/acciones + paleta de comandos),
  botón **launcher** (icono grid), badge fuente de datos (mock/real), selector de tema, avatar.
- **Área central modular:** home con widgets en grid reordenable simple (orden persistido):
  stats, tabla de reuniones, recomendaciones, actividad, accesos a agentes.
- **Alerts/recomendaciones:** derivadas de datos reales del workspace ("2 reuniones analizadas
  sin follow-up", "3 acciones vencen esta semana") — nunca decorativas.

## 12. Tools Launcher (estilo Google apps)

Popover desde la topbar (y página `/herramientas`): búsqueda arriba, secciones **Fijadas /
Recientes / Todas** (por categoría), tarjetas compactas: icono lucide, nombre, descripción de
una línea, chip de categoría, badge de estado, estrella para fijar. Catálogo inicial (15):

| Herramienta | Categoría | Estado | Ruta |
|---|---|---|---|
| Transcripts | captura | active | /reuniones?vista=transcripciones |
| Voice Transcription | captura | active | /herramientas/transcripcion |
| Grabación | captura | active | /grabacion |
| Meetings | captura | active | /reuniones |
| Conversations | captura | active | /reuniones?vista=conversaciones |
| Discovery Analyzer | analisis | active | /reuniones/[última]/insights |
| Deal Risks | analisis | active | /reuniones/[última]/resumen#riesgos |
| Stakeholder Map | analisis | active | /reuniones/[última]/resumen#stakeholders |
| Scorecards | supervision | active | /manager |
| Analytics | supervision | beta | /manager#analytics |
| Guided Meeting | ejecucion | active | /reuniones/[última]/guiada |
| Follow-up Writer | ejecucion | active | /reuniones/[última]/resumen#followup |
| CRM Notes | ejecucion | active | /reuniones/[última]/resumen#crm |
| Tasks | ejecucion | active | /reuniones?vista=acciones |
| Playbooks | configuracion | active | /playbooks |
| Templates | configuracion | active | /playbooks#templates |

Diseñado para escalar: el catálogo es data (`Herramienta[]`), no JSX; `soon` renderiza
deshabilitado con tooltip honesto.

## 13. Voice Transcription tool

**Piezas:** Upload/ingestion layer (dropzone multi-archivo + validación mime/tamaño) →
`TrabajoTranscripcion` (cola FIFO serial, como el transcriptor externo) → Transcript viewer →
Output normalizer (`Segmento[]` + `contenido` formato `[mm:ss] Hablante: texto`) → Bridge
(botones: enviar a Discovery Analyzer / abrir en Guided Meeting / resumen rápido).

**Máquina de estados del job:** `pendiente → procesando (progreso 0-99) → completado | fallido`;
`fallido` guarda `error` legible y permite reintento (`intentos++`, máx 3 — el fallo nunca es
silencioso). Providers (`TRANSCRIPTION_PROVIDER`, default `mock`; valor desconocido → error al
arrancar):

| Provider | Qué hace | Diarización | Estado MVP |
|---|---|---|---|
| `mock` | Determinista desde fixtures; progreso simulado realista | Sí (por participante) | **Implementado** |
| `transcriptor-local` | Adapter HTTP al Flask de `altaventasllc-source/transcriptor` (`POST /upload` → poll `GET /status` → parsear líneas `[M:SS]`) | No → heurística de turnos, `hablante: 'desconocido'` | Interfaz + adapter documentado |
| `transcripcion-a2a` | JSON-RPC al servicio A2A del repo (`:4800`) — contrato nativo idéntico | La que traiga su motor | Interfaz diseñada |
| `groq-whisper` | Patrón `chat/transcribe` de control-interno; texto plano | No | Interfaz diseñada |

El contrato de salida es el mismo para los 4 — conectar el real jamás toca UI ni análisis.

## 13.1 Grabación + modo asesor (Prompter embebido)

**Qué es:** Prompter NO es una sección nueva — es una capacidad avanzada de Grabación
(`/grabacion`): un panel embebido que guía al entrevistador en vivo. Restricción de diseño:
misma vista, mínima fricción, lectura rápida durante una entrevista real.

**Selector "Modo asesor":** switch visible en el flujo de grabación (no en settings), con
estado claro (activo/apagado), operable antes de grabar y también durante la sesión
(encenderlo a media grabación arranca la guía al vuelo). La preferencia persiste
(localStorage).

**Paridad con Guided Meeting — mismo motor, cero duplicación:** el Prompter llama
`evaluarCoach` + `extraerInsights` (el motor de Guided Meeting) a través de la capa pura
`features/recording/prompter.ts::estadoPrompter`, que solo añade la adaptación al contexto
en vivo: overrides manuales del asesor y rotación de preguntas. Un test fija la paridad:
sin overrides, el estado del Prompter es EXACTAMENTE el del coach de Guided Meeting.
Diferencia = presentación (compacta, embebida) y contexto, no dos sistemas.

**Fuentes de señales en vivo** (`features/recording/fuentes-vivo.ts`, arquitectura lista
para streaming real — cualquier fuente emite `Segmento`):
- `microfono`: **Web Speech API** del navegador (transcripción en vivo REAL, es-MX; requiere
  conexión). Identificación de interlocutores en dos modos (selector en el contexto de sesión):
  - **Automática por voz (default, beta)**: diarización heurística en el navegador —
    clustering online del tono fundamental (F0 por autocorrelación sobre el stream del mic,
    `features/recording/diarizacion.ts`, núcleo puro con tests). La voz del asesor se calibra
    con la apertura de la llamada; cada frase se asigna al centroide más cercano; sin voz
    clara → `desconocido` y cae al modo manual (nunca adivina). **Corrección de un clic**:
    tocar el nombre en la transcripción en curso reasigna la frase Y re-entrena al
    diarizador. Honestidad declarada en UI: voces muy parecidas pueden confundirse. El seam
    para diarización ML real (pyannote vía transcripcion-a2a) es el mismo contrato
    `Segmento.hablante`.
  - **Manual**: switch **¿Quién habla?** con los nombres reales del contexto de sesión.
- `demo`: reproduce la conversación demo (etiquetada como demo) — permite probar el modo
  asesor sin micrófono/red y alimenta el smoke.

**Capacidades cuando el modo asesor está activo:** salud de la entrevista (score/dimensiones
cubiertas), cobertura del playbook con etiqueta "crítica", siguiente mejor pregunta con
justificación y acciones (La usé / Otra pregunta / Tema cubierto), alerta prominente del
coach, feed de señales (pains, presupuesto, objeciones, competidores, stakeholders, próximos
pasos…) con pin, ocultar/mostrar guía, y enlace al Guided Meeting completo.

**Modelo de datos de la sesión** (`features/recording/live-store.ts`):
- Persistente: `asesorActivo`, `fuente` (preferencias).
- Temporal por sesión: `segmentos` vivos, `temasCubiertosManual` (override de PRESENTACIÓN —
  el motor sigue puro), `preguntasDescartadas`, `senalesFijadas`, `hablanteActual`, `errorVivo`.
- Al terminar: **nada se pierde** — "Guardar sesión analizada" convierte los segmentos vivos
  en `Reunion` + `Transcripcion` normales (motor `en-vivo (web-speech|demo)`) y todo el flujo
  post-reunión (insights, score, resumen, follow-up) se recalcula determinísticamente de esos
  mismos segmentos. "Enviar a transcripción" sigue mandando el audio a la cola normal.

**Estados:** antes de grabar (asesor on) → cobertura en faltante + pregunta de apertura
("la guía arranca con la grabación"); grabando sin señales aún → mensaje orientador; asesor
off → grabación normal sin guía; error de transcripción en vivo (permiso/red/no soportado) →
visible con alternativa (fuente demo); sesión terminada → acciones de guardado explicadas.

**Contexto de la sesión (campos del modo asesor):** al activar el modo asesor, el card del
selector expone **Nombre del asesor** y **Nombre del lead entrevistado** (no en settings:
configuración contextual de la entrevista). Se capturan antes de grabar (se bloquean durante
la sesión porque fijan la atribución de hablantes); el nombre del asesor persiste como
preferencia, el del lead es por sesión. Alimentan: hablantes de la transcripción en vivo
(switch ¿Quién habla? muestra los nombres reales), participantes/título/cuenta de la reunión
guardada, la bitácora, y por tanto todo el flujo posterior (insights/summary/follow-up).
Estado visible: "contexto completo" vs "sin nombres — la sesión usará Yo/Cliente".

**Transcripción en curso (bloque central, bajo la grabadora):** refleja los segmentos
parciales en vivo con timestamps y hablante, marcado "parcial · en vivo", con estados:
no disponible (asesor off, con el porqué), esperando voz, escuchando/transcribiendo,
en pausa, interrumpida (error con alternativa). Contrato para streaming real: cualquier
`FuenteVivo` que emita `Segmento` lo alimenta sin cambios.

**Bitácora de grabaciones (panel secundario, al final de la vista):** registro por
grabación con título, fecha/hora, duración, estado (`lista` / `en_transcripcion` /
`sesion_guardada`), origen (grabación / con asesor), asesor y lead. Acciones SIEMPRE
visibles: **Descargar** y **Compartir** (Web Share con archivo si el navegador lo permite;
fallback: enlace/resumen al portapapeles) + "Ver transcripción" cuando hay reunión ligada.
Persistencia honesta: la metadata persiste (localStorage, últimos 30); el binario vive en la
memoria de la sesión del navegador — tras recargar, Descargar se deshabilita con explicación
(el enlace a la transcripción sigue). Durante una sesión activa la bitácora se atenúa para
no competir con el flujo de grabación.

## 14. Theming system

- **Mecanismo** (probado en control-interno): `ThemeProvider` tri-estado
  (`system|light|dark`), `resolvedTheme` respeta `prefers-color-scheme` y reacciona a cambios
  del SO; clase `.dark` + `data-theme` + `color-scheme` en `<html>`; script inline anti-flash
  que lee localStorage antes del primer paint; toggle en topbar (Monitor/Sol/Luna) + atajo.
- **Tokens** (CSS vars en `:root` = light, override completo en `.dark`, mapeados a utilidades
  con `@theme inline` de Tailwind v4): `--background`, `--surface`, `--surface-raised`,
  `--surface-muted`, `--line`, `--line-subtle`, `--ink`, `--ink-secondary`, `--ink-muted`,
  `--accent` (azul ejecutivo sobrio), `--accent-hover`, `--accent-muted`, `--accent-ink`,
  `--success/warning/danger/info` (+ variantes `-muted` para chips y callouts; el score no
  tiene tokens propios — usa estos tonos vía `tonoScore()`: `>=70` success, `>=50` warning,
  resto danger), sombras `--shadow-1/2`, radios `--radius-s` (0.5rem — botones, inputs, nav;
  utilidad `rounded-s`) y `--radius-m` (0.625rem — cards; `rounded-m`), tipografía operativa
  `--font-sans` (Inter vía `next/font`, escala compacta para tablas densas) y `--font-mono`
  (`ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`) — token de marca de los
  timestamps `[mm:ss]` en transcripciones, señales y crono.
- **Light** (default): ejecutivo estilo Apollo — superficies blancas/gris cálido, chips suaves,
  densidad útil. **Dark:** neutro elevado (grises azulados), sin neón ni violeta gaming.
  Paleta propia — NO se usa el `@a2a/design-system` (dark-only, gamificado). Extensible a
  branding white-label cambiando solo tokens.

## 15. Datos demo

3 reuniones es-MX realistas con arcos distintos (para que manager compare de verdad):
1. **Discovery bueno** (~score 80): logística/transporte — pains con impacto cuantificado,
  decisor identificado, próximos pasos con fecha. Con audio demo → flujo Voice Transcription.
2. **Discovery superficial** (~score 45): SaaS RH — pains sin impacto, sin proceso de decisión,
  monólogo del vendedor → dispara todas las alertas del coach en replay.
3. **Demo con objeciones** (~score 60, tipo `demo`): objeciones de precio/competidor sin
  responder → alimenta Risk Reviewer y patrones del manager.
Personajes coherentes con el universo comercial del repo (freight forwarder estilo ficha GAL,
sin datos reales de clientes).

## 16. Roadmap futuro (post-MVP)

1. **STT real:** desplegar `transcripcion-a2a` con faster-whisper (gate existente de la dueña) y
  conectar el provider; diarización (pyannote) detrás del mismo contrato.
2. **Motor LLM** en agentes (`AGENT_ENGINE=llm` vía OpenRouter/GLM, gate de caché+tools como
  doctrina `probe-glm`).
3. **Supabase:** migración aditiva (`reuniones`, ancla `reunion_id` en `transcripciones`,
  `tareas_reunion` compartida), auth magic link + allowlist, multi-tenant white-label
  (patrón `crm_tenants`).
4. **Integraciones:** Zoom/Meet/Teams (webhook → ingestion), envío real de follow-ups vía
  `aprobaciones_salientes` (gate humano), push a CRM (etapas de `leads`).
5. **Guided Meeting en vivo real** (audio streaming + STT incremental).
6. **Departamento A2A:** exponer el Analyzer como servicio A2A hermano (patrón del repo) para
  que Hermes Negocio lo consuma desde Slack/Telegram.

## 17. Criterios de aceptación (contrato de cierre)

1. `SPEC.md` (este archivo) versionado.
2. MVP navegable local (`npm run dev`) — 11 pantallas sin rutas rotas.
3. Transcripción demo cargable (pegar texto) Y audio demo por Voice Transcription.
4. Voice Transcription integrada: launcher + navegación + flujo + bridge a Analyzer/Guided.
5. Mission Control = shell real (sidebar + topbar + command bar + widgets + estado).
6. Launcher estilo app-launcher: búsqueda, pin, recientes, categorías, estados.
7. Insights visibles con evidencia clicable (14 categorías + huecos).
8. Guided Meeting sugiere siguiente mejor pregunta con justificación citada.
9. Score con desglose por dimensión + explicación (nunca el número solo).
10. Resumen + follow-up + CRM notes generados desde los datos de la reunión.
11. Theme system/light/dark funcional y coherente en todas las vistas (sin flash).
12. UI densa, ejecutiva, estados vacíos con criterio — demo-ready.
13. Verificación ejecutable: `npm run build` + `typecheck` + `lint` verdes + smoke Playwright
   del flujo completo (audio → transcripción → insights → guided → resumen → manager) +
   validación de los 3 temas + launcher.
14. `README.md` del producto documenta cómo correr, providers y seams.
15. *(Extra del pedido)* `businessos/negocio/SOUL.md` con sección "Enfoque de ventas"
   (vendedor profesional estratégico), antes del bloque AUTO `TRIO-DOGFOOD`, con nota de
   sync a volumen pendiente como paso operativo.

---

## 18. Pre-Discovery (sección de Mission Control)

**Qué es:** el paso entre la captación del lead y la entrevista. Un caso de Pre-Discovery
toma el intake mínimo del lead (teléfono, correo, web, tamaño, giro, país, notas), corre un
pipeline de análisis por bloques y produce el **brief del asesor** que alimenta la
entrevista (Prompter del modo asesor, Guided Meeting y CRM notes). Rutas: `/pre-discovery`
(lista), `/pre-discovery/nuevo` (intake), `/pre-discovery/[id]` (workspace con tabs:
Resumen · Sitio y servicios · Benchmark · Estrategia · Marcos · Brief · Activo & Costeo ·
CLIs), `/pre-discovery/admin` (panel admin del módulo). En Sidebar, launcher y ⌘K.

**Journey:** lead captado → caso (intake+análisis) → asesor revisa brief → entrevista con
el brief inyectado → CRM notes con hipótesis a contrastar → activos digitales trazables.

### 18.1 Pipeline por bloques (real → mock declarado)

8 bloques en orden: `perfil → sitio → competencia → diferenciacion → foda → regulatorio →
tecnologia → brief` (`pipeline.ts`), cada uno re-ejecutable ("Regenerar") y cola-friendly
(el batch futuro no requiere rediseño). Con `AGENT_ENGINE=llm`: fetch REAL del sitio
(`/api/pre-discovery/sitio`: timeout 8 s, cap 500 KB, HTML→texto) + análisis IA por bloque
(`/api/pre-discovery/analizar`, prompts en `agents/prompt-prediscovery.ts`). Ante
503/error → **mock determinista fiel** con `procedencia.metodo:'mock'` y el motivo
declarado. Cada bloque muestra **confidence & provenance** (observado/inferido/mock +
fuente + confianza) y su lista `requiereValidacion`.

**Separación dura hecho/hipótesis/recomendación:** todo ítem lleva `naturaleza`; el
validador (`validarBloqueIA`) degrada a hipótesis cualquier "hecho" sin evidencia citada
(contado y declarado en UI) y rechaza formas inválidas — la IA propone, el contrato
verifica. El benchmark actúa como analista (arquetipos con confianza declarada cuando no
hay señal de nombres reales; comparativa con LECTURA, no dumping).

### 18.2 Marco regulatorio (grafo) y tecnológico

El bloque regulatorio consulta el **grafo regulatorio** vía `/api/grafo/evaluaciones`
(proxy server a `GRAFO_URL`; respuesta sin `disclaimer` o sin fuentes → RECHAZADA, patrón
grafo-a2a). Sin `GRAFO_URL` → mock FIEL al contrato (`pre-discovery/grafo.ts`): mismo
fail-safe (`dudoso` + "sin regla aplicable" + `fuente:null`), citas con clave/URL/vigencia
y el disclaimer EXACTO del grafo — siempre visible, `dudoso` marcado "requiere revisión
posterior". El marco tecnológico es inferencial y así se etiqueta.

**Hermes-Regulatory-Scan (cruce DECLARADO vs ESPERADO)** — `escaneo-regulatorio.ts`,
adjunto al dictamen en todos los caminos (grafo/mock/fallback). Dada la clase de servicio
del lead, lista las categorías que el grafo ESPERA y las cruza con lo observado:
`evidencia` (declarado + dictaminado con fuente), `hipotesis` (señal indirecta sin
categoría en el dictamen → validar en entrevista), `vacio` (el sector lo espera y el
sitio calla — el vacío ES el hallazgo, con severidad). Salidas ejecutivas: cobertura
alta/media/baja, chip **ALTA OPACIDAD REGULATORIA** (cero evidencias) y **VACÍO DEL
GRAFO** (sector sin categorías → jamás se inventan marcos). La retroalimentación al
grafo sale SOLO como export JSONL en modo `PROPOSED` (`propuestasSeed`: tipos
`nueva_senal | validar_regla | nuevo_ambito`, evidencia con URL) rumbo a
`grafo/seed/reglas.json` vía revisión humana + gate de procedencia — nunca escritura
directa. La compilación además lee hasta 2 **enlaces internos relevantes** del sitio
(`/services`, `/compliance`, `/legal`… — `extraerEnlacesRelevantes`), declarados como
fuentes. Doctrina completa: `.claude/skills/hermes-regulatory-scan/SKILL.md`.

**Hermes-Tech-Stack-Scan** — `escaneo-tecnologico.ts`, hermano del regulatorio (mismo
contrato de matriz), adjunto al bloque tecnología en todos los caminos. Matiz propio:
señal de SISTEMA observada → `evidencia`; un CLAIM ("tracking personalizado") →
`hipotesis` (declarado por el lead, por validar: ¿sobre qué corre?); silencio →
`vacio` con severidad = **oportunidad de automatización** (el pitch se ancla a huecos
observados, no a catálogo). Solo el stack observado (`hecho`) cuenta como material —
una inferencia jamás se auto-confirma. Clase de negocio fuera del mapa curado →
**VACÍO DEL MAPA** (no se inventa el estándar de una industria desconocida). Doctrina:
`.claude/skills/hermes-tech-stack-scan/SKILL.md`.

### 18.3 Activo Digital (espejo del módulo ACT del ERP)

Cada caso y cada ENTREVISTA se catalogan como `ActivoDigitalLocal`
(`features/activos/`): folio `ACT-LOC-NNNN`, clase (`pre_discovery`|`entrevista`),
`ubicacion` verificable (`meeting-copilot://caso/<id>`), **clasificación declarada EN
ORIGEN** (eje D+I desde el admin del módulo), defensibilidad `propuesta` (ratificar =
humano, en el ERP), **versiones APPEND-ONLY** (hash sha256 del contenido; regenerar solo
versiona si el hash cambió) y **costo = SUMA del ledger** (espejo del trigger
`act_actualiza_costo`; jamás a mano). Ledger `CostoEntrada` con `fuente` OBLIGATORIA:
`openrouter_usage·tarifa <modelo>` (usage real de las rutas IA) o `estimado_mock` /
`no_medido` (huecos declarados, jamás inventados). UI ejecutiva en Activo & Costeo:
desglose por componente + chip real/mock + ledger expandible.

**Cosecha al ERP real:** botón "Exportar activo" → JSON con contrato versionado
(`meeting-copilot/activo-export@1`) → host-job **`businessos/cosechar-prediscovery.py`**
(patrón "el agente deja un JSON, el host-job de confianza lo sube"): valida el contrato
(export inválido = exit 1), registra en `erp.act_activo`+`act_version`+`act_costo` vía
`psql` + `SET ROLE rol_exe_fin` + `app.cliente_id` (jamás service_role), folio ERP
asignado por la BD (el local queda como `ref_catalogo`), idempotente por traza en
`sis_bitacora`. `--dry-run` imprime el SQL; la corrida real es post-merge en la máquina
con credenciales `cli_fin`. Tests en `businessos/tests/test_cosechar_prediscovery.py`.

### 18.4 Costeo

Tarifas por modelo con FUENTE declarada, editables en el admin (quedan marcadas "editada
en admin"); modelo sin tarifa → `no_medido` declarado. Presupuesto BLANDO por caso
(aviso). El costo real sale del `usage` de OpenRouter capturado por las rutas
`/api/pre-discovery/analizar` y `/api/asesor/insights` (las entrevistas cargan su costo IA
a su propio activo).

### 18.5 Reuso en la entrevista (regla de integración)

- **Grabación (modo asesor):** "Lead entrevistado" es combo de leads del CRM local; con
  caso listo aparece la Card **"Prep del asesor"** (resumen, hipótesis, temas sensibles) y
  el brief compacto alimenta a `usePreguntaIA` (`briefContexto`) — las preguntas IA se
  redactan sabiendo qué hipótesis validar.
- **Guided Meeting:** misma Card + mismo `briefContexto` si `reunion.leadId` tiene caso.
- **CRM notes:** sección "Contexto Pre-Discovery" (hipótesis del brief) visible y INCLUIDA
  al copiar las notas.

### 18.6 Admin del módulo (`/pre-discovery/admin`)

Misma plantilla que `/configuracion` + cards Manager: estado del módulo y seams
(motor/GRAFO_URL/fetch), parámetros de costeo (tarifas), límites (presupuesto por caso),
clasificación en origen (eje D+I), histórico de activos del módulo y **auditoría**
(bitácora append-only local, espejo `sis_bitacora`: crear/analizar/regenerar/exportar/
editar settings).

### 18.7 CLIs

Tab CLIs del caso: comandos COPIABLES reales (curl a las rutas del caso, consulta al
grafo, comando de cosecha del host-job, `/printing-press` del CLI del grafo pendiente).
Doctrina Printing Press respetada: imprimir binarios es acto humano en Claude Code; la app
declara — no finge. `businessos/cli-manifest.yaml` ganó la entrada `meeting-copilot`
(fase copilot, source sniff).

### 18.8 Estados con criterio

Web inválida → el análisis continúa sin sitio, declarado en `requiereValidacion`;
competencia insuficiente → `no_concluyente` con instrucción ("no se inventa"); costo sin
tarifa → `no_medido`; regulatorio `dudoso` → "requiere revisión posterior"; análisis
parcial → estado por bloque + "Re-analizar todo".

### 18.9 Modelo de datos (resumen)

`Lead` (espejo `public.leads`, 10 etapas, origen `copilot`) · `CasoPreDiscovery`
(intake + `Record<BloqueId, Bloque<T>>`, estado derivado de los bloques) ·
`Bloque<T>` (estado/confianza/procedencia/requiereValidacion) · `Item` (naturaleza +
evidencia) · `EvaluacionGrafo` (contrato exacto del grafo + `conexion`) ·
`ActivoDigitalLocal` + `CostoEntrada` + `ExportActivo` (espejo ACT) · `AdminSettings` +
`BitacoraModulo`. Persistencia: casos/activos/ledger/settings en localStorage (usuario;
fixtures por merge); nada toca Supabase/erp desde la app.

### 18.10 Criterios de aceptación de la sección

1. Sección real en Mission Control (sidebar/launcher/⌘K) con la plantilla panel-adm. ✔
2. Intake mínimo del lead + alta de lead. ✔ 3. Análisis del sitio (real con clave; mock
declarado). ✔ 4. Benchmark de competidores con lectura de analista y fallback honesto. ✔
5. Diferenciación + FODA con naturaleza separada. ✔ 6. Marco regulatorio vía grafo
(proxy + mock fiel, fail-safe y disclaimer) y marco tecnológico. ✔ 7. Guía accionable +
preguntas para la entrevista (brief consumible en minutos). ✔ 8. Activo Digital con
lógica ACT (origen, versiones append-only, costo=SUMA, cosecha real vía host-job). ✔
9. Costeo claro y ejecutivo con fuentes declaradas. ✔ 10. CLIs donde aplican. ✔
11. Panel admin coherente. ✔ 12. Salida reutilizada en Grabación/Guided/CRM. ✔
13. Entrevistas modeladas como activos trazables. ✔ 14. Smoke Playwright (3 escenarios
nuevos) + tests unitarios del contrato. ✔
