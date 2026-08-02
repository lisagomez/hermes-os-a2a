import type { Herramienta } from '@/features/domain/types'

// El catálogo es DATA, no JSX: escalar = añadir una fila.
// Las rutas con [ultima] se resuelven en runtime a la última reunión analizada.
export const CATALOGO_HERRAMIENTAS: Herramienta[] = [
  { slug: 'transcripts', nombre: 'Transcripts', descripcion: 'Todas las transcripciones con su confianza y speakers', categoria: 'captura', icono: 'FileText', estado: 'active', ruta: '/reuniones?vista=transcripciones' },
  { slug: 'voice-transcription', nombre: 'Voice Transcription', descripcion: 'Sube audio y conviértelo en transcripción diarizada', categoria: 'captura', icono: 'AudioLines', estado: 'active', ruta: '/herramientas/transcripcion' },
  { slug: 'grabacion', nombre: 'Grabación', descripcion: 'Graba la reunión desde la app con tu micrófono', categoria: 'captura', icono: 'Mic', estado: 'active', ruta: '/grabacion' },
  { slug: 'meetings', nombre: 'Meetings', descripcion: 'Pipeline de reuniones y su estado de análisis', categoria: 'captura', icono: 'CalendarDays', estado: 'active', ruta: '/reuniones' },
  { slug: 'conversations', nombre: 'Conversations', descripcion: 'Historial de conversaciones por cuenta', categoria: 'captura', icono: 'MessagesSquare', estado: 'active', ruta: '/reuniones?vista=conversaciones' },
  { slug: 'pre-discovery', nombre: 'Pre-Discovery', descripcion: 'Inteligencia del lead antes de la entrevista: benchmark, FODA, marcos y brief', categoria: 'analisis', icono: 'Telescope', estado: 'active', ruta: '/pre-discovery' },
  { slug: 'discovery-analyzer', nombre: 'Discovery Analyzer', descripcion: 'Insights estructurados con evidencia citada', categoria: 'analisis', icono: 'ScanSearch', estado: 'active', ruta: '/reuniones/[ultima]/insights' },
  { slug: 'deal-risks', nombre: 'Deal Risks', descripcion: 'Riesgos comerciales detectados y su mitigación', categoria: 'analisis', icono: 'ShieldAlert', estado: 'active', ruta: '/reuniones/[ultima]/resumen#riesgos' },
  { slug: 'stakeholder-map', nombre: 'Stakeholder Map', descripcion: 'Participantes, roles e influencia en el deal', categoria: 'analisis', icono: 'Network', estado: 'active', ruta: '/reuniones/[ultima]/resumen#stakeholders' },
  { slug: 'scorecards', nombre: 'Scorecards', descripcion: 'Calidad de discovery por llamada y por agente', categoria: 'supervision', icono: 'ClipboardCheck', estado: 'active', ruta: '/manager' },
  { slug: 'analytics', nombre: 'Analytics', descripcion: 'Patrones de objeciones y tendencias del equipo', categoria: 'supervision', icono: 'BarChart3', estado: 'beta', ruta: '/manager#analytics' },
  { slug: 'guided-meeting', nombre: 'Guided Meeting', descripcion: 'Conduce la reunión con el coach en vivo', categoria: 'ejecucion', icono: 'Compass', estado: 'active', ruta: '/reuniones/[ultima]/guiada' },
  { slug: 'follow-up-writer', nombre: 'Follow-up Writer', descripcion: 'Draft de correo de seguimiento desde la reunión', categoria: 'ejecucion', icono: 'MailPlus', estado: 'active', ruta: '/reuniones/[ultima]/resumen#followup' },
  { slug: 'crm-notes', nombre: 'CRM Notes', descripcion: 'Notas estructuradas listas para el CRM', categoria: 'ejecucion', icono: 'NotebookPen', estado: 'active', ruta: '/reuniones/[ultima]/resumen#crm' },
  { slug: 'tasks', nombre: 'Tasks', descripcion: 'Action items con responsable y fecha', categoria: 'ejecucion', icono: 'ListChecks', estado: 'active', ruta: '/reuniones?vista=acciones' },
  { slug: 'asesores', nombre: 'Asesores', descripcion: 'Catálogo de asesores humanos e IA con su disponibilidad', categoria: 'agendamiento', icono: 'Users', estado: 'active', ruta: '/asesores' },
  { slug: 'citas', nombre: 'Citas', descripcion: 'Tablero de seguimiento de citas con estado y acción de llamada', categoria: 'agendamiento', icono: 'CalendarCheck', estado: 'active', ruta: '/citas' },
  { slug: 'servicios', nombre: 'Servicios', descripcion: 'Marketplace: servicio rápido o sesión parametrizada (discovery)', categoria: 'agendamiento', icono: 'Layers', estado: 'active', ruta: '/servicios' },
  { slug: 'calendario', nombre: 'Google Calendar', descripcion: 'Próximos eventos sincronizados desde Google Calendar (mirror compartido con control-interno)', categoria: 'google', icono: 'CalendarClock', estado: 'active', ruta: '/herramientas/calendario' },
  { slug: 'llamadas', nombre: 'Llamadas', descripcion: 'Herramienta de llamadas integrada (el tablero de citas ya enlaza tel/WhatsApp)', categoria: 'agendamiento', icono: 'Phone', estado: 'soon', ruta: '/citas' },
  { slug: 'pre-discovery-admin', nombre: 'Admin Pre-Discovery', descripcion: 'Costeo, seams, clasificación en origen y auditoría del módulo', categoria: 'configuracion', icono: 'SlidersHorizontal', estado: 'active', ruta: '/pre-discovery/admin' },
  { slug: 'playbooks', nombre: 'Playbooks', descripcion: 'Dimensiones, pesos y banco de preguntas por tipo de reunión', categoria: 'configuracion', icono: 'BookOpenCheck', estado: 'active', ruta: '/playbooks' },
  { slug: 'templates', nombre: 'Templates', descripcion: 'Plantillas de salida: follow-up, CRM notes, resumen', categoria: 'configuracion', icono: 'LayoutTemplate', estado: 'active', ruta: '/playbooks#templates' },
]

export const ETIQUETA_CATEGORIA_HERRAMIENTA: Record<Herramienta['categoria'], string> = {
  captura: 'Captura',
  analisis: 'Análisis',
  ejecucion: 'Ejecución',
  supervision: 'Supervisión',
  configuracion: 'Configuración',
  agendamiento: 'Agendamiento',
  google: 'Google Workspace',
}
