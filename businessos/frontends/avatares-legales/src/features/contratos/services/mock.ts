import { desplazarDias, formatearFecha } from '@/shared/fechas'
import type {
  ClausulaSugerida,
  HistorialVersiones,
  OperacionContractual,
  Precedente,
  RiesgoRegulatorio,
} from '@/features/contratos/types'

/**
 * Fixtures del Avatar de Contratos. Datos de MUESTRA con realismo MX;
 * ninguna empresa, operación ni cláusula es real. Las referencias citan
 * normativa VIGENTE (regla de oro del grafo — p. ej. la LFPDPPP publicada en
 * DOF 20-mar-2025, no la abrogada de 2010).
 */

const HOY = new Date()

function fechaEnDias(dias: number): string {
  return formatearFecha(desplazarDias(HOY, dias))
}

/** Tenencia inerte (decisión C3): un solo despacho de muestra. */
const TENENCIA = { tenantId: 'despacho-demo', asociadoId: 'a2a' }

export const OPERACIONES_CONTRACTUALES: OperacionContractual[] = [
  {
    ...TENENCIA,
    id: 'CON-2026-0001',
    nombre: 'Suministro de vidrio templado 2026–2028',
    tipo: 'Suministro',
    partes: ['Grupo Vitral, S.A. de C.V.', 'Cristales Industriales del Centro, S.A.'],
    jurisdicciones: ['México'],
    monto: 'MXN $48,500,000',
    estado: 'en_revision',
    responsable: 'A. Mendoza',
    riesgo: 'alto',
    resumen:
      'Suministro plurianual con volúmenes mínimos garantizados y penas convencionales; en revisión de cláusulas por ambas partes.',
  },
  {
    ...TENENCIA,
    id: 'CON-2026-0002',
    nombre: 'Servicios logísticos portuarios',
    tipo: 'Prestación de servicios',
    partes: ['Naviera del Golfo, S.A.', 'Operadora Portuaria de Tuxpan, S.A.'],
    jurisdicciones: ['México'],
    monto: 'MXN $12,300,000 anual',
    estado: 'borrador',
    responsable: 'L. Serrano',
    riesgo: 'medio',
    resumen:
      'Maniobras y almacenaje; primera redacción a partir del precedente PRE-004.',
  },
  {
    ...TENENCIA,
    id: 'CON-2026-0003',
    nombre: 'Arrendamiento de nave industrial Ramos Arizpe',
    tipo: 'Arrendamiento',
    partes: ['Inmobiliaria Cumbres, S.A. de C.V.', 'TecnoMaquila de Coahuila, S.A. de C.V.'],
    jurisdicciones: ['México'],
    monto: 'USD $68,000 mensual',
    estado: 'aprobado',
    responsable: 'L. Serrano',
    riesgo: 'bajo',
    resumen:
      'Nave de 12,000 m² a 10 años con opción de ampliación; aprobado, pendiente de firma.',
  },
  {
    ...TENENCIA,
    id: 'CON-2026-0004',
    nombre: 'NDA multilateral proyecto "Andamio"',
    tipo: 'Confidencialidad (NDA)',
    partes: ['Grupo Altiplano, S.A. de C.V.', 'Dos coinversionistas'],
    jurisdicciones: ['México'],
    monto: 'No aplica',
    estado: 'firmado',
    responsable: 'A. Mendoza',
    riesgo: 'bajo',
    resumen: 'Intercambio de información para due diligence de coinversión.',
  },
  {
    ...TENENCIA,
    id: 'CON-2026-0005',
    nombre: 'Distribución exclusiva línea dermatológica',
    tipo: 'Distribución',
    partes: ['Distribuidora Farmacéutica Norte, S.A.', 'Laboratorios Andinos S.A.S. (Colombia)'],
    jurisdicciones: ['México', 'Colombia'],
    monto: 'USD $4,200,000 anual',
    estado: 'en_revision',
    responsable: 'A. Mendoza',
    riesgo: 'alto',
    resumen:
      'Exclusividad territorial MX con registro sanitario en trámite; operación multijurisdiccional.',
  },
]

/** Cláusulas sugeridas para la operación en revisión CON-2026-0001. */
export const CLAUSULAS_SUGERIDAS: ClausulaSugerida[] = [
  {
    id: 'CLA-001',
    contratoId: 'CON-2026-0001',
    titulo: 'Objeto y volúmenes mínimos',
    texto:
      'El Proveedor se obliga a suministrar vidrio templado conforme al Anexo A, con un volumen mínimo mensual de 1,200 m². El incumplimiento de dos meses consecutivos faculta al Cliente a resolver el contrato sin responsabilidad.',
    riesgo: 'medio',
    motivoRiesgo:
      'El volumen mínimo sin banda de tolerancia traslada todo el riesgo de demanda al Proveedor; probable contrapropuesta.',
    fuentes: [{ origen: 'grafo', referencia: 'CCom arts. 77–88 (obligatoriedad)' }],
    estado: 'aceptada',
  },
  {
    id: 'CLA-002',
    contratoId: 'CON-2026-0001',
    titulo: 'Pena convencional por retraso',
    texto:
      'Por cada día de retraso en la entrega, el Proveedor pagará una pena convencional del 0.5% del valor de la orden afectada, con tope del 10% del valor anual del contrato.',
    riesgo: 'alto',
    motivoRiesgo:
      'La pena no puede exceder el valor de la obligación principal; el tope anual protege la validez.',
    fuentes: [{ origen: 'grafo', referencia: 'CCF art. 1843 (límite de la pena)' }],
    estado: 'aceptada',
  },
  {
    id: 'CLA-003',
    contratoId: 'CON-2026-0001',
    titulo: 'Límite de responsabilidad',
    texto:
      'La responsabilidad total acumulada de cada parte se limita al monto pagado en los 12 meses previos al evento, excluyendo dolo, negligencia grave y daños a terceros.',
    riesgo: 'medio',
    motivoRiesgo:
      'La exclusión de dolo es irrenunciable; limitarla de otro modo anularía la cláusula.',
    fuentes: [{ origen: 'grafo', referencia: 'CCF art. 2106 (nulidad de renuncia por dolo)' }],
    estado: 'editada',
  },
  {
    id: 'CLA-004',
    contratoId: 'CON-2026-0001',
    titulo: 'Caso fortuito y fuerza mayor',
    texto:
      'Ninguna parte responde por incumplimientos derivados de caso fortuito o fuerza mayor, incluyendo interrupciones de suministro eléctrico regional documentadas por CFE, por hasta 60 días naturales.',
    riesgo: 'bajo',
    motivoRiesgo: 'Redacción estándar del precedente PRE-002 con ventana acotada.',
    fuentes: [{ origen: 'hermes', referencia: 'Precedente PRE-002 (suministro 2024)' }],
    estado: 'sugerida',
  },
  {
    id: 'CLA-005',
    contratoId: 'CON-2026-0001',
    titulo: 'Terminación anticipada por conveniencia',
    texto:
      'El Cliente podrá terminar el contrato sin causa con aviso de 90 días y pago de los pedidos en firme más el 5% del valor anual remanente como gasto de desmovilización.',
    riesgo: 'medio',
    motivoRiesgo:
      'El porcentaje de desmovilización bajo puede leerse como pena encubierta; documentar su base de costos.',
    fuentes: [{ origen: 'hermes', referencia: 'Criterio interno §7.1 (terminaciones)' }],
    estado: 'sugerida',
  },
  {
    id: 'CLA-006',
    contratoId: 'CON-2026-0001',
    titulo: 'Solución de controversias: arbitraje CANACO',
    texto:
      'Toda controversia se resolverá mediante arbitraje administrado por la CANACO Ciudad de México, con un árbitro único, en idioma español y sede en la Ciudad de México.',
    riesgo: 'bajo',
    motivoRiesgo: 'Cláusula modelo CANACO; ejecutable conforme al título cuarto del CCom.',
    fuentes: [{ origen: 'grafo', referencia: 'CCom arts. 1415–1480 (arbitraje comercial)' }],
    estado: 'sugerida',
  },
  {
    id: 'CLA-007',
    contratoId: 'CON-2026-0001',
    titulo: 'Protección de datos personales',
    texto:
      'Las partes tratarán los datos personales intercambiados conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares vigente y sus avisos de privacidad, limitando el tratamiento a la finalidad del contrato.',
    riesgo: 'medio',
    motivoRiesgo:
      'La operación solo intercambia datos de contacto B2B; la cláusula amplia de transferencias es innecesaria para este alcance.',
    fuentes: [{ origen: 'grafo', referencia: 'LFPDPPP (DOF 20-mar-2025)' }],
    estado: 'descartada',
  },
]

export const RIESGOS_REGULATORIOS: RiesgoRegulatorio[] = [
  {
    id: 'RIE-001',
    contratoId: 'CON-2026-0001',
    titulo: 'Exclusividad y volúmenes: revisión de competencia económica',
    descripcion:
      'Los volúmenes mínimos garantizados combinados con exclusividad de facto pueden constituir práctica monopólica relativa si el Proveedor tiene poder sustancial en el mercado relevante.',
    nivel: 'medio',
    fuentes: [{ origen: 'grafo', referencia: 'LFCE arts. 54–56' }],
  },
  {
    id: 'RIE-002',
    contratoId: 'CON-2026-0001',
    titulo: 'Obligaciones denominadas en moneda extranjera',
    descripcion:
      'Los pagos pactados en USD son válidos, pero el deudor puede liberarse pagando el equivalente en moneda nacional al tipo de cambio vigente en el lugar y fecha de pago.',
    nivel: 'bajo',
    fuentes: [{ origen: 'grafo', referencia: 'Ley Monetaria art. 8' }],
  },
  {
    id: 'RIE-003',
    contratoId: 'CON-2026-0001',
    titulo: 'Tratamiento de datos personales del personal asignado',
    descripcion:
      'El intercambio de listas de personal para acceso a plantas implica transferencia de datos personales entre responsables; requiere base de licitud y actualización de avisos de privacidad.',
    nivel: 'medio',
    fuentes: [{ origen: 'grafo', referencia: 'LFPDPPP (DOF 20-mar-2025), arts. 6 y 22' }],
  },
]

export const HISTORIALES_VERSIONES: HistorialVersiones[] = [
  {
    ...TENENCIA,
    contratoId: 'CON-2026-0001',
    nombre: 'Suministro de vidrio templado 2026–2028',
    versiones: [
      {
        id: 'VER-001',
        contratoId: 'CON-2026-0001',
        version: 'v1',
        fecha: fechaEnDias(-21),
        autor: 'A. Mendoza',
        cambios: 'Primera redacción a partir del precedente PRE-002 con anexos técnicos del cliente.',
        estado: 'borrador',
        aprobaciones: [],
      },
      {
        id: 'VER-002',
        contratoId: 'CON-2026-0001',
        version: 'v2',
        fecha: fechaEnDias(-9),
        autor: 'A. Mendoza',
        cambios:
          'Contrapropuesta del Proveedor incorporada: banda de tolerancia de volúmenes (±10%) y límite de responsabilidad a 12 meses.',
        estado: 'en_revision',
        aprobaciones: [],
        comentario:
          'El cliente pide sostener el tope de pena convencional en 10%; el Proveedor propone 6%.',
      },
      {
        id: 'VER-003',
        contratoId: 'CON-2026-0001',
        version: 'v3',
        fecha: fechaEnDias(-2),
        autor: 'Hermes (borrador) / A. Mendoza',
        cambios:
          'Redacción de compromiso en pena convencional (8% con cura de 5 días); cláusula de datos personales acotada al alcance B2B.',
        estado: 'en_revision',
        aprobaciones: [
          { nombre: 'A. Mendoza', rol: 'Socio responsable', fecha: fechaEnDias(-1) },
        ],
        comentario: 'Pendiente visto bueno del director jurídico del cliente.',
      },
    ],
  },
  {
    ...TENENCIA,
    contratoId: 'CON-2026-0004',
    nombre: 'NDA multilateral proyecto "Andamio"',
    versiones: [
      {
        id: 'VER-004',
        contratoId: 'CON-2026-0004',
        version: 'v1',
        fecha: fechaEnDias(-30),
        autor: 'A. Mendoza',
        cambios: 'Redacción inicial sobre plantilla NDA multilateral del despacho.',
        estado: 'borrador',
        aprobaciones: [],
      },
      {
        id: 'VER-005',
        contratoId: 'CON-2026-0004',
        version: 'v2',
        fecha: fechaEnDias(-16),
        autor: 'A. Mendoza',
        cambios:
          'Vigencia de confidencialidad ampliada a 5 años; carve-out para asesores con deber de secreto profesional.',
        estado: 'firmado',
        aprobaciones: [
          { nombre: 'A. Mendoza', rol: 'Socio responsable', fecha: fechaEnDias(-18) },
          { nombre: 'D. Villaseñor', rol: 'Dir. jurídico Grupo Altiplano', fecha: fechaEnDias(-17) },
          { nombre: 'Coinversionistas (2)', rol: 'Representantes legales', fecha: fechaEnDias(-16) },
        ],
      },
    ],
  },
]

export const PRECEDENTES: Precedente[] = [
  {
    ...TENENCIA,
    id: 'PRE-001',
    nombre: 'Servicios administrados de TI (SLA por niveles)',
    tipo: 'Prestación de servicios',
    cliente: 'Financiera Camino',
    anio: 2025,
    etiquetas: ['SLA', 'penas convencionales', 'datos personales'],
    usos: 14,
    ultimaConsulta: fechaEnDias(-3),
    resumen: 'Esquema de niveles de servicio con bonificaciones automáticas.',
  },
  {
    ...TENENCIA,
    id: 'PRE-002',
    nombre: 'Suministro industrial plurianual con volúmenes mínimos',
    tipo: 'Suministro',
    cliente: 'Aceros del Norte',
    anio: 2024,
    etiquetas: ['volúmenes mínimos', 'fuerza mayor', 'arbitraje'],
    usos: 11,
    ultimaConsulta: fechaEnDias(-2),
    resumen: 'Base de la operación CON-2026-0001; banda de tolerancia probada.',
  },
  {
    ...TENENCIA,
    id: 'PRE-003',
    nombre: 'Arrendamiento industrial con opción de compra',
    tipo: 'Arrendamiento',
    cliente: 'Inmobiliaria Cumbres',
    anio: 2023,
    etiquetas: ['opción de compra', 'mejoras', 'USD'],
    usos: 8,
    ultimaConsulta: fechaEnDias(-12),
    resumen: 'Renta en USD con mecánica del art. 8 de la Ley Monetaria.',
  },
  {
    ...TENENCIA,
    id: 'PRE-004',
    nombre: 'Servicios portuarios y maniobras',
    tipo: 'Prestación de servicios',
    cliente: 'Naviera del Golfo',
    anio: 2024,
    etiquetas: ['logística', 'responsabilidad por carga', 'seguros'],
    usos: 6,
    ultimaConsulta: fechaEnDias(-1),
    resumen: 'Matriz de responsabilidad por tramo y seguro de carga.',
  },
  {
    ...TENENCIA,
    id: 'PRE-005',
    nombre: 'NDA multilateral para due diligence',
    tipo: 'Confidencialidad (NDA)',
    cliente: 'Grupo Altiplano',
    anio: 2026,
    etiquetas: ['due diligence', 'multilateral', 'M&A'],
    usos: 9,
    ultimaConsulta: fechaEnDias(-5),
    resumen: 'Carve-outs para asesores y obligación de destrucción certificada.',
  },
  {
    ...TENENCIA,
    id: 'PRE-006',
    nombre: 'Distribución exclusiva con metas de venta',
    tipo: 'Distribución',
    cliente: 'Farmacéutica Norte',
    anio: 2025,
    etiquetas: ['exclusividad', 'metas', 'competencia económica'],
    usos: 7,
    ultimaConsulta: fechaEnDias(-4),
    resumen: 'Exclusividad condicionada a metas; revisada contra LFCE.',
  },
  {
    ...TENENCIA,
    id: 'PRE-007',
    nombre: 'Maquila de manufactura con propiedad intelectual',
    tipo: 'Prestación de servicios',
    cliente: 'TecnoMaquila de Coahuila',
    anio: 2024,
    etiquetas: ['PI', 'maquila', 'confidencialidad'],
    usos: 5,
    ultimaConsulta: fechaEnDias(-20),
    resumen: 'Titularidad de mejoras de proceso y licencia de retorno.',
  },
  {
    ...TENENCIA,
    id: 'PRE-008',
    nombre: 'Suministro de insumos agrícolas estacional',
    tipo: 'Suministro',
    cliente: 'Agroindustrias del Valle',
    anio: 2023,
    etiquetas: ['estacionalidad', 'precios indexados'],
    usos: 3,
    ultimaConsulta: fechaEnDias(-40),
    resumen: 'Precio indexado a referencia pública con banda de ajuste.',
  },
]
