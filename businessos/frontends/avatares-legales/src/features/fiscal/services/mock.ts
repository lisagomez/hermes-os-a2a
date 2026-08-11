import { desplazarDias, formatearFecha } from '@/shared/fechas'
import type {
  AlertaRegulatoria,
  CasoFiscal,
  CriterioFiscal,
} from '@/features/fiscal/types'

/**
 * Fixtures del Avatar Fiscal. Datos de MUESTRA con realismo MX (RFC, CFF,
 * LISR, RMF): el realismo es parte del entregable de venta. Ninguna empresa,
 * persona o referencia de expediente es real.
 *
 * "Hoy" se calcula UNA vez al cargar el módulo (regla del plan): las fechas
 * salen de aquí ya formateadas y solo se renderizan en server components.
 */

const HOY = new Date()

function fechaEnDias(dias: number): string {
  return formatearFecha(desplazarDias(HOY, dias))
}

/** Tenencia inerte (decisión C3): un solo despacho de muestra. */
const TENENCIA = { tenantId: 'despacho-demo', asociadoId: 'a2a' }

export const CASOS_FISCALES: CasoFiscal[] = [
  {
    ...TENENCIA,
    id: 'FIS-2026-0001',
    cliente: 'Grupo Altiplano, S.A. de C.V.',
    rfc: 'GAL010203AB4',
    regimen: 'General de Ley Personas Morales',
    materias: ['ISR'],
    descripcion:
      'Defensa ante rechazo de deducciones de previsión social del ejercicio 2024 (revisión de gabinete).',
    etapa: 'en_defensa',
    riesgo: 'alto',
    responsable: 'L. Fernanda Ríos',
    proximoVencimiento: fechaEnDias(5),
    diasParaVencimiento: 5,
    tareasAbiertas: 4,
    notaSocio:
      'Priorizar: el plazo de pruebas y alegatos no admite prórroga. Revisar integración del expediente laboral.',
  },
  {
    ...TENENCIA,
    id: 'FIS-2026-0002',
    cliente: 'Comercializadora del Bajío, S. de R.L.',
    rfc: 'CBA950612QX8',
    regimen: 'General de Ley Personas Morales',
    materias: ['IVA'],
    descripcion:
      'Solicitud de devolución de saldo a favor de IVA (jun–dic 2025); requerimiento de información en curso.',
    etapa: 'analisis',
    riesgo: 'medio',
    responsable: 'J. Aguirre',
    proximoVencimiento: fechaEnDias(12),
    diasParaVencimiento: 12,
    tareasAbiertas: 3,
  },
  {
    ...TENENCIA,
    id: 'FIS-2026-0003',
    cliente: 'TecnoMaquila de Coahuila, S.A. de C.V.',
    rfc: 'TMC030910KJ2',
    regimen: 'Maquiladora (IMMEX)',
    materias: ['Precios de transferencia', 'ISR'],
    descripcion:
      'Evaluación safe harbor vs. APA para el ejercicio 2026; documentación comparable en preparación.',
    etapa: 'analisis',
    riesgo: 'alto',
    responsable: 'L. Fernanda Ríos',
    proximoVencimiento: fechaEnDias(21),
    diasParaVencimiento: 21,
    tareasAbiertas: 5,
    notaSocio: 'El cliente evalúa expandir línea en Ramos Arizpe: impacto en el estudio.',
  },
  {
    ...TENENCIA,
    id: 'FIS-2026-0004',
    cliente: 'Servicios Hoteleros Pacífico, S.A.P.I.',
    rfc: 'SHP870405RT6',
    regimen: 'General de Ley Personas Morales',
    materias: ['CFDI'],
    descripcion:
      'Regularización de CFDI cancelados sin aceptación del receptor durante 2024.',
    etapa: 'intake',
    riesgo: 'bajo',
    responsable: 'M. Cepeda',
    proximoVencimiento: fechaEnDias(30),
    diasParaVencimiento: 30,
    tareasAbiertas: 2,
  },
  {
    ...TENENCIA,
    id: 'FIS-2026-0005',
    cliente: 'Agroindustrias del Valle, S.P.R. de R.L.',
    rfc: 'AVA920718LM9',
    regimen: 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras',
    materias: ['IEPS'],
    descripcion:
      'Acreditamiento del estímulo de IEPS por diésel agrícola; requerimiento de comprobación.',
    etapa: 'en_defensa',
    riesgo: 'medio',
    responsable: 'J. Aguirre',
    proximoVencimiento: fechaEnDias(8),
    diasParaVencimiento: 8,
    tareasAbiertas: 3,
  },
  {
    ...TENENCIA,
    id: 'FIS-2026-0006',
    cliente: 'Constructora Meseta, S.A. de C.V.',
    rfc: 'CME000229HN1',
    regimen: 'General de Ley Personas Morales',
    materias: ['ISR'],
    descripcion:
      'Discrepancia fiscal notificada a socio persona física; conciliación de depósitos vs. ingresos declarados.',
    etapa: 'analisis',
    riesgo: 'alto',
    responsable: 'M. Cepeda',
    proximoVencimiento: fechaEnDias(14),
    diasParaVencimiento: 14,
    tareasAbiertas: 6,
    notaSocio: 'Coordinar con el área patrimonial antes de responder.',
  },
  {
    ...TENENCIA,
    id: 'FIS-2026-0007',
    cliente: 'Distribuidora Farmacéutica Norte, S.A.',
    rfc: 'DFN110509PW3',
    regimen: 'General de Ley Personas Morales',
    materias: ['ISR', 'IVA'],
    descripcion:
      'Retenciones por servicios a través de plataformas tecnológicas; diagnóstico de cumplimiento 2025.',
    etapa: 'intake',
    riesgo: 'medio',
    responsable: 'J. Aguirre',
    proximoVencimiento: fechaEnDias(18),
    diasParaVencimiento: 18,
    tareasAbiertas: 1,
  },
  {
    ...TENENCIA,
    id: 'FIS-2026-0008',
    cliente: 'Inmobiliaria Cumbres, S.A. de C.V.',
    rfc: 'ICU850101ZZ7',
    regimen: 'General de Ley Personas Morales',
    materias: ['ISR'],
    descripcion:
      'Enajenación de inmueble: determinación del costo comprobado de adquisición actualizado. Cerrado con opinión.',
    etapa: 'cerrado',
    riesgo: 'bajo',
    responsable: 'M. Cepeda',
    proximoVencimiento: null,
    diasParaVencimiento: null,
    tareasAbiertas: 0,
  },
]

export const CRITERIOS_FISCALES: CriterioFiscal[] = [
  {
    ...TENENCIA,
    id: 'CRI-001',
    titulo: 'Previsión social: requisitos y límite de deducibilidad',
    resumen:
      'Las prestaciones de previsión social son deducibles cuando se otorgan de forma general por categoría de trabajadores y constan en planes documentados; exceder la generalidad convierte el gasto en no deducible.',
    materia: 'ISR',
    riesgo: 'medio',
    estadoValidacion: 'validado',
    fuentes: [{ origen: 'grafo', referencia: 'LISR art. 27, fr. XI' }],
    aplicaA: ['Grupo Altiplano, S.A. de C.V.'],
  },
  {
    ...TENENCIA,
    id: 'CRI-002',
    titulo: 'Materialidad de operaciones con proveedores listados (69-B)',
    resumen:
      'Operaciones con contribuyentes en el listado definitivo del 69-B exigen acreditar materialidad con evidencia contemporánea (entregables, bitácoras, logística); la factura y el pago no bastan.',
    materia: 'ISR',
    riesgo: 'alto',
    estadoValidacion: 'validado',
    fuentes: [
      { origen: 'grafo', referencia: 'CFF art. 69-B' },
      { origen: 'hermes', referencia: 'Cruce cartera vs. listado definitivo SAT' },
    ],
    aplicaA: ['TecnoMaquila de Coahuila, S.A. de C.V.', 'Constructora Meseta, S.A. de C.V.'],
  },
  {
    ...TENENCIA,
    id: 'CRI-003',
    titulo: 'Devolución de IVA: integración mínima del expediente',
    resumen:
      'La solicitud debe acompañar papeles de trabajo del saldo a favor, DIOT consistente y contratos de las operaciones principales; inconsistencias DIOT–CFDI son la primera causa de desistimiento.',
    materia: 'IVA',
    riesgo: 'medio',
    estadoValidacion: 'en_revision',
    fuentes: [{ origen: 'grafo', referencia: 'CFF art. 22 y RMF 2026 regla 2.3.4' }],
    aplicaA: ['Comercializadora del Bajío, S. de R.L.'],
  },
  {
    ...TENENCIA,
    id: 'CRI-004',
    titulo: 'Cancelación de CFDI con aceptación del receptor',
    resumen:
      'La cancelación fuera del ejercicio requiere aceptación del receptor y motivo válido; los CFDI de ingresos cancelados sin aceptación se presumen vigentes para efectos del ISR.',
    materia: 'CFDI',
    riesgo: 'bajo',
    estadoValidacion: 'validado',
    fuentes: [{ origen: 'grafo', referencia: 'CFF art. 29-A, cuarto párrafo' }],
    aplicaA: ['Servicios Hoteleros Pacífico, S.A.P.I.'],
  },
  {
    ...TENENCIA,
    id: 'CRI-005',
    titulo: 'Maquiladoras: safe harbor frente a APA',
    resumen:
      'El safe harbor (6.9% activos / 6.5% costos) da certeza inmediata pero puede sobrecargar la base; el APA exige estudio robusto y tiempo de resolución. La elección depende del margen operativo real.',
    materia: 'Precios de transferencia',
    riesgo: 'alto',
    estadoValidacion: 'en_revision',
    fuentes: [{ origen: 'grafo', referencia: 'LISR art. 182' }],
    aplicaA: ['TecnoMaquila de Coahuila, S.A. de C.V.'],
  },
  {
    ...TENENCIA,
    id: 'CRI-006',
    titulo: 'Limitante de deducción de intereses (20% EBITDA fiscal)',
    resumen:
      'Los intereses netos que excedan el 30% de la utilidad fiscal ajustada no son deducibles en el ejercicio; el excedente es acreditable hasta por diez ejercicios siguientes.',
    materia: 'ISR',
    riesgo: 'medio',
    estadoValidacion: 'pendiente',
    fuentes: [{ origen: 'grafo', referencia: 'LISR art. 28, fr. XXXII' }],
    aplicaA: ['Constructora Meseta, S.A. de C.V.', 'Inmobiliaria Cumbres, S.A. de C.V.'],
  },
  {
    ...TENENCIA,
    id: 'CRI-007',
    titulo: 'Criterio interno: soporte documental para gastos mayores a $2 MDP',
    resumen:
      'Política del despacho: todo gasto deducible superior a $2,000,000 MXN se acompaña de contrato firmado, evidencia de entregables y opinión de razón de negocios antes de deducirse.',
    materia: 'ISR',
    riesgo: 'medio',
    estadoValidacion: 'validado',
    fuentes: [{ origen: 'hermes', referencia: 'Manual de criterios del despacho §4.2' }],
    aplicaA: ['Toda la cartera'],
  },
]

export const ALERTAS_REGULATORIAS: AlertaRegulatoria[] = [
  {
    ...TENENCIA,
    id: 'ALR-001',
    fecha: fechaEnDias(-2),
    titulo: 'Listado definitivo 69-B actualizado por el SAT',
    descripcion:
      'Nueva publicación del listado definitivo de contribuyentes con operaciones presuntamente inexistentes. El cruce automático detectó un proveedor recurrente de la cartera.',
    origenPublicacion: 'SAT',
    impacto: 'alto',
    clientesAfectados: ['TecnoMaquila de Coahuila, S.A. de C.V.'],
    fuentes: [{ origen: 'grafo', referencia: 'CFF art. 69-B; listado SAT' }],
  },
  {
    ...TENENCIA,
    id: 'ALR-002',
    fecha: fechaEnDias(-5),
    titulo: 'Segunda Resolución de Modificaciones a la RMF 2026 (DOF)',
    descripcion:
      'Ajustes a reglas de devoluciones y a la regla de previsión social. Revisar impacto en solicitudes en trámite.',
    origenPublicacion: 'DOF',
    impacto: 'medio',
    clientesAfectados: [
      'Comercializadora del Bajío, S. de R.L.',
      'Grupo Altiplano, S.A. de C.V.',
    ],
    fuentes: [{ origen: 'grafo', referencia: 'RMF 2026, 2ª RM' }],
  },
  {
    ...TENENCIA,
    id: 'ALR-003',
    fecha: fechaEnDias(-9),
    titulo: 'Tesis del TFJA sobre materialidad de servicios intangibles',
    descripcion:
      'Criterio jurisdiccional: la evidencia contemporánea de la prestación pesa más que la formalidad del contrato. Refuerza la estrategia probatoria en defensas activas.',
    origenPublicacion: 'Jurisprudencia',
    impacto: 'alto',
    clientesAfectados: ['Constructora Meseta, S.A. de C.V.'],
    fuentes: [{ origen: 'grafo', referencia: 'Tesis TFJA IX-P-2aS' }],
  },
  {
    ...TENENCIA,
    id: 'ALR-004',
    fecha: fechaEnDias(-14),
    titulo: 'Prórroga del complemento Carta Porte 3.1',
    descripcion:
      'Se extiende el periodo de convivencia de versiones para transportistas. Sin multas por errores de llenado durante la transición.',
    origenPublicacion: 'SAT',
    impacto: 'medio',
    clientesAfectados: ['Distribuidora Farmacéutica Norte, S.A.'],
    fuentes: [{ origen: 'grafo', referencia: 'RMF 2026 regla 2.7.7' }],
  },
  {
    ...TENENCIA,
    id: 'ALR-005',
    fecha: fechaEnDias(-20),
    titulo: 'Decreto de estímulos para la región fronteriza norte: renovación',
    descripcion:
      'Renovación de beneficios de IVA e ISR para contribuyentes inscritos en el padrón. Ventana de aviso ante el SAT.',
    origenPublicacion: 'DOF',
    impacto: 'bajo',
    clientesAfectados: [],
    fuentes: [{ origen: 'grafo', referencia: 'DOF, decreto RFN' }],
  },
  {
    ...TENENCIA,
    id: 'ALR-006',
    fecha: fechaEnDias(-27),
    titulo: 'Criterios no vinculativos del SAT: actualización en ISR',
    descripcion:
      'Nuevo criterio sobre esquemas de previsión social instrumentados vía terceros. Coincide con la defensa activa de Grupo Altiplano.',
    origenPublicacion: 'SAT',
    impacto: 'alto',
    clientesAfectados: ['Grupo Altiplano, S.A. de C.V.'],
    fuentes: [{ origen: 'grafo', referencia: 'Anexo 3 RMF 2026' }],
  },
  {
    ...TENENCIA,
    id: 'ALR-007',
    fecha: fechaEnDias(-35),
    titulo: 'Tasas de recargos aplicables al segundo semestre',
    descripcion:
      'Publicación de tasas de recargos por mora y por prórroga. Actualizar papeles de trabajo de autocorrecciones.',
    origenPublicacion: 'DOF',
    impacto: 'bajo',
    clientesAfectados: [],
    fuentes: [{ origen: 'grafo', referencia: 'DOF, tasas de recargos' }],
  },
  {
    ...TENENCIA,
    id: 'ALR-008',
    fecha: fechaEnDias(-45),
    titulo: 'Regla de previsión social modificada en la RMF (3.3.1.29)',
    descripcion:
      'Precisión sobre la generalidad por categoría. Base normativa directa del criterio CRI-001 del despacho.',
    origenPublicacion: 'RMF',
    impacto: 'medio',
    clientesAfectados: ['Grupo Altiplano, S.A. de C.V.'],
    fuentes: [{ origen: 'grafo', referencia: 'RMF 2026 regla 3.3.1.29' }],
  },
]
