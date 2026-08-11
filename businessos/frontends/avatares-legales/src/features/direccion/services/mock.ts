import { desplazarDias, formatearFecha } from '@/shared/fechas'
import type {
  AlertaEjecutiva,
  ClienteEstrategico,
  DepartamentoTrio,
  PanoramaDespacho,
} from '@/features/direccion/types'

/**
 * Fixtures del Avatar Director. Datos de MUESTRA; las métricas y bitácoras
 * ilustran la operación de un despacho multipráctica sobre Hermes OS.
 * "Hoy" se calcula UNA vez al cargar el módulo (regla del plan).
 */

const HOY = new Date()

function fechaEnDias(dias: number): string {
  return formatearFecha(desplazarDias(HOY, dias))
}

const PERIODO = new Intl.DateTimeFormat('es-MX', {
  month: 'long',
  year: 'numeric',
}).format(HOY)

/** Tenencia inerte (decisión C3): un solo despacho de muestra. */
const TENENCIA = { tenantId: 'despacho-demo', asociadoId: 'a2a' }

export const PANORAMA: PanoramaDespacho = {
  ...TENENCIA,
  periodo: PERIODO,
  ingresosMes: 'MXN $9,840,000',
  variacionMensual: '+6.2% vs. mes anterior',
  casosActivos: 47,
  casosRiesgoAlto: 6,
  horasFacturables: 3120,
  practicas: [
    {
      practica: 'Fiscal',
      casosActivos: 12,
      ingresosMes: 'MXN $3,410,000',
      utilizacion: 84,
      riesgoAgregado: 'alto',
    },
    {
      practica: 'Litigio',
      casosActivos: 18,
      ingresosMes: 'MXN $2,980,000',
      utilizacion: 91,
      riesgoAgregado: 'medio',
    },
    {
      practica: 'Corporativo / contratos',
      casosActivos: 11,
      ingresosMes: 'MXN $2,650,000',
      utilizacion: 76,
      riesgoAgregado: 'medio',
    },
    {
      practica: 'Laboral (asesoría)',
      casosActivos: 6,
      ingresosMes: 'MXN $800,000',
      utilizacion: 62,
      riesgoAgregado: 'bajo',
    },
  ],
}

export const DEPARTAMENTOS_TRIO: DepartamentoTrio[] = [
  {
    ...TENENCIA,
    id: 'DEP-001',
    nombre: 'Vigilancia regulatoria',
    descripcion:
      'Monitorea DOF, SAT y jurisprudencia; cruza cada cambio contra la cartera y redacta alertas con fuente.',
    estado: 'activo',
    tareasMes: 62,
    aprobacionPrimerIntento: 94,
    costoMes: 'USD $38',
    decisiones: [
      {
        id: 'DEC-001',
        fecha: fechaEnDias(-1),
        actor: 'supervisor',
        resumen:
          'Alerta 69-B validada: las 3 fuentes citadas existen y el cruce con la cartera es correcto.',
        resultado: 'aprobado',
      },
      {
        id: 'DEC-002',
        fecha: fechaEnDias(-3),
        actor: 'ejecutor',
        resumen:
          'Borrador de alerta sobre la 2ª RM RMF 2026 generado con impacto por cliente.',
        resultado: 'aprobado',
      },
      {
        id: 'DEC-003',
        fecha: fechaEnDias(-6),
        actor: 'supervisor',
        resumen:
          'Alerta rechazada: citaba una regla derogada; se regeneró contra el grafo actualizado.',
        resultado: 'rechazado',
      },
    ],
  },
  {
    ...TENENCIA,
    id: 'DEP-002',
    nombre: 'Intake y conflictos',
    descripcion:
      'Recibe solicitudes, verifica conflictos de interés contra la cartera histórica y arma el expediente inicial.',
    estado: 'activo',
    tareasMes: 38,
    aprobacionPrimerIntento: 89,
    costoMes: 'USD $24',
    decisiones: [
      {
        id: 'DEC-004',
        fecha: fechaEnDias(-2),
        actor: 'hermes',
        resumen:
          'Posible conflicto detectado en solicitud nueva (contraparte es cliente activo de litigio); escalado a socios.',
        resultado: 'escalado',
      },
      {
        id: 'DEC-005',
        fecha: fechaEnDias(-5),
        actor: 'supervisor',
        resumen: 'Expediente inicial de FIS-2026-0007 validado y asignado.',
        resultado: 'aprobado',
      },
    ],
  },
  {
    ...TENENCIA,
    id: 'DEP-003',
    nombre: 'Cobranza y facturación',
    descripcion:
      'Emite facturas, concilia pagos y da seguimiento a cartera vencida con recordatorios escalonados.',
    estado: 'activo',
    tareasMes: 51,
    aprobacionPrimerIntento: 97,
    costoMes: 'USD $31',
    decisiones: [
      {
        id: 'DEC-006',
        fecha: fechaEnDias(-1),
        actor: 'ejecutor',
        resumen: 'Corte de facturación del mes emitido: 34 CFDI timbrados sin rechazo.',
        resultado: 'aprobado',
      },
      {
        id: 'DEC-007',
        fecha: fechaEnDias(-8),
        actor: 'hermes',
        resumen:
          'Cliente con 60 días de atraso: propuesta de convenio de pago enviada a revisión del socio.',
        resultado: 'escalado',
      },
    ],
  },
  {
    ...TENENCIA,
    id: 'DEP-004',
    nombre: 'Comunicación con clientes',
    descripcion:
      'Redacta actualizaciones de caso y recordatorios; todo borrador sale solo tras aprobación humana.',
    estado: 'pausado',
    tareasMes: 0,
    aprobacionPrimerIntento: 92,
    costoMes: 'USD $0',
    decisiones: [
      {
        id: 'DEC-008',
        fecha: fechaEnDias(-12),
        actor: 'supervisor',
        resumen:
          'Departamento pausado por decisión de socios durante la migración del canal de correo.',
        resultado: 'aprobado',
      },
    ],
  },
]

export const ALERTAS_EJECUTIVAS: AlertaEjecutiva[] = [
  {
    ...TENENCIA,
    id: 'AEX-001',
    fecha: fechaEnDias(-1),
    categoria: 'regulatorio',
    titulo: 'Cliente estratégico expuesto al listado 69-B',
    descripcion:
      'Un proveedor recurrente de TecnoMaquila entró al listado definitivo. La práctica fiscal ya prepara la defensa de materialidad; impacto potencial en ingresos del cliente.',
    impacto: 'alto',
    fuentes: [{ origen: 'grafo', referencia: 'CFF art. 69-B; listado SAT' }],
  },
  {
    ...TENENCIA,
    id: 'AEX-002',
    fecha: fechaEnDias(-2),
    categoria: 'operativo',
    titulo: 'Litigio al 91% de utilización',
    descripcion:
      'La práctica de litigio opera cerca del tope: riesgo de calidad y de plazos si entran 2+ asuntos grandes. Considerar redistribuir o contratar.',
    impacto: 'medio',
    fuentes: [{ origen: 'hermes', referencia: 'Métricas de utilización del mes' }],
  },
  {
    ...TENENCIA,
    id: 'AEX-003',
    fecha: fechaEnDias(-4),
    categoria: 'hito',
    titulo: 'Departamento de cobranza: primer mes con 97% de aprobación',
    descripcion:
      'El trío cerró el corte de facturación sin rechazos del Supervisor; el costo del departamento fue USD $31 en el mes.',
    impacto: 'bajo',
    fuentes: [{ origen: 'hermes', referencia: 'Bitácora del trío DEP-003' }],
  },
  {
    ...TENENCIA,
    id: 'AEX-004',
    fecha: fechaEnDias(-7),
    categoria: 'regulatorio',
    titulo: 'Reforma procesal en materia laboral: entrada en vigor escalonada',
    descripcion:
      'Los nuevos plazos procesales aplican a asuntos iniciados a partir del siguiente trimestre; requiere actualizar las plantillas de checklist de litigio laboral.',
    impacto: 'medio',
    fuentes: [{ origen: 'grafo', referencia: 'DOF, decreto de reforma procesal' }],
  },
  {
    ...TENENCIA,
    id: 'AEX-005',
    fecha: fechaEnDias(-10),
    categoria: 'operativo',
    titulo: 'Conflicto de interés detectado en intake',
    descripcion:
      'El departamento de intake escaló una solicitud cuya contraparte es cliente activo. Pendiente decisión de socios para aceptar o declinar.',
    impacto: 'medio',
    fuentes: [{ origen: 'hermes', referencia: 'Bitácora del trío DEP-002' }],
  },
]

export const CLIENTES_ESTRATEGICOS: ClienteEstrategico[] = [
  {
    ...TENENCIA,
    id: 'CLI-001',
    nombre: 'Grupo Altiplano, S.A. de C.V.',
    industria: 'Consumo / manufactura',
    serviciosActivos: ['Fiscal', 'Penal', 'NDA / M&A'],
    ingresosAnuales: 'MXN $4,100,000',
    riesgo: 'alto',
    oportunidad:
      'Coinversión "Andamio" abre trabajo corporativo recurrente (due diligence + contratos).',
    responsable: 'L. Fernanda Ríos',
  },
  {
    ...TENENCIA,
    id: 'CLI-002',
    nombre: 'TecnoMaquila de Coahuila, S.A. de C.V.',
    industria: 'Manufactura de exportación',
    serviciosActivos: ['Fiscal', 'Precios de transferencia', 'Arrendamiento'],
    ingresosAnuales: 'MXN $3,650,000',
    riesgo: 'alto',
    oportunidad: 'Expansión en Ramos Arizpe: obra, permisos y laboral colectivo.',
    responsable: 'L. Fernanda Ríos',
  },
  {
    ...TENENCIA,
    id: 'CLI-003',
    nombre: 'Financiera Camino, S.A. de C.V., SOFOM',
    industria: 'Servicios financieros',
    serviciosActivos: ['Litigio mercantil', 'Contratos de TI'],
    ingresosAnuales: 'MXN $2,890,000',
    riesgo: 'medio',
    oportunidad:
      'Cartera vencida creciente: paquete de recuperación judicial estandarizado.',
    responsable: 'C. Fuentes',
  },
  {
    ...TENENCIA,
    id: 'CLI-004',
    nombre: 'Distribuidora Farmacéutica Norte, S.A.',
    industria: 'Farmacéutica',
    serviciosActivos: ['Administrativo (COFEPRIS)', 'Distribución internacional'],
    ingresosAnuales: 'MXN $2,120,000',
    riesgo: 'medio',
    oportunidad:
      'Entrada a Colombia: asesoría regulatoria multijurisdicción con el grafo MX/CO.',
    responsable: 'A. Mendoza',
  },
  {
    ...TENENCIA,
    id: 'CLI-005',
    nombre: 'Inmobiliaria Cumbres, S.A. de C.V.',
    industria: 'Inmobiliario',
    serviciosActivos: ['Civil (arrendamientos)', 'Fiscal'],
    ingresosAnuales: 'MXN $1,480,000',
    riesgo: 'bajo',
    oportunidad: 'Portafolio industrial en crecimiento: contratos estandarizados.',
    responsable: 'L. Serrano',
  },
  {
    ...TENENCIA,
    id: 'CLI-006',
    nombre: 'Naviera del Golfo, S.A.',
    industria: 'Logística portuaria',
    serviciosActivos: ['Mercantil', 'Contratos de servicios'],
    ingresosAnuales: 'MXN $960,000',
    riesgo: 'bajo',
    oportunidad:
      'Cliente nuevo con potencial de litigio marítimo y seguros; segundo contrato en borrador.',
    responsable: 'L. Serrano',
  },
]
