'use client';

import { useState } from 'react';

interface TechnicalConsiderations {
  escalabilidad: {
    description: string;
    approach: string;
    details: string[];
  };
  arquitectura: {
    description: string;
    approach: string;
    details: string[];
  };
  seguridad: {
    description: string;
    approach: string;
    details: string[];
  };
  trazabilidad: {
    description: string;
    approach: string;
    details: string[];
  };
  dataAnalysis: {
    description: string;
    approach: string;
    details: string[];
  };
  compliance: {
    description: string;
    approach: string;
    details: string[];
  };
  legalConstraints: {
    description: string;
    approach: string;
    details: string[];
  };
}

interface PrototypeSpecification {
  id: number;
  name: string;
  description: string;
  technicalAlignment: string[];
}

interface PrototypeData {
  technicalConsiderations: TechnicalConsiderations;
  prototypeSpecifications: PrototypeSpecification[];
}

export function ProductPrototypingSection() {
  const [prototypes, setPrototypes] = useState<PrototypeData | null>(null);
  const [isPrototyping, setIsPrototyping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGeneratePrototypesClick = async () => {
    setIsPrototyping(true);
    setError(null);

    try {
      // Simulate product prototyping based on scenarios and technical considerations
      const prototypeData = {
        technicalConsiderations: {
          escalabilidad: {
            description: 'Diseñado para manejar múltiples corredores simultáneos (USA, China, LATAM)',
            approach: 'Arquitectura de microservicios con escalado horizontal',
            details: [
              'Cada corredor procesado por servicio independiente',
              'Base de datos distribuida por región para reducir latencia',
              'Caching inteligente de resultados de investigación regulatoria',
              'Colas de procesamiento para picos de demanda'
            ]
          },
          arquitectura: {
            description: 'Microservicios especializados por flujo logístico',
            approach: 'Servicios desacoplados con comunicación mediante eventos',
            details: [
              'Servicio de investigación de fuentes (ingesta y procesamiento de documentos)',
              'Servicio de mapeo de journey (visualización y análisis de roles)',
              'Servicio de extracción de palabras (NLP y análisis de frecuencia)',
              'Servicio de mapeo regulatorio (motor de reglas y vinculador)',
              'Servicio de generación de escenarios (combinatorio y filtrado)',
              'Servicio de prototipado de producto (sintetizador de oportunidades)'
            ]
          },
          seguridad: {
            description: 'Manejo de datos sensibles como RFC, información de contrapartes',
            approach: 'Seguridad por diseño con cifrado y mínimos privilegios',
            details: [
              'Cifrado AES-256 para datos en reposo',
              'TLS 1.3 para datos en tránsito',
              'Autenticación basada en roles con RBAC',
              'Auditoría de acceso a información sensible',
              'Cumplimiento con Ley Federal de Protección de Datos Personales'
            ]
          },
          trazabilidad: {
            description: 'Documental y física a lo largo de la cadena logística',
            approach: 'Tracking end-to-end con identificación única de operaciones',
            details: [
              'Identificador único por operación de comercio exterior',
              'Vinculación de documentos físicos a registros electrónicos',
              'Traceabilidad de mercancía desde origen hasta destino',
              'Registro de todos los touchpoints y sus timestamps'
            ]
          },
          dataAnalysis: {
            description: 'Predictivo de demoras y riesgos',
            approach: 'Machine learning para predicción de tiempos y identificación de patrones de riesgo',
            details: [
              'Modelos de regresión para estimar tiempos de despacho',
              'Clasificación de riesgos basada en histórico de operaciones',
              'Análisis de tendencias estacionales y eventos geopolíticos',
              'Dashboards en tiempo real con alertas proactivas'
            ]
          },
          compliance: {
            description: 'Automatizado basado en reglas regulatorias',
            approach: 'Motor de reglas que valida operaciones contra regulaciones vigentes',
            details: [
              'Base de reglas actualizable con cambios en legislación',
              'Validación automática de documentos requeridos',
              'Verificación de cumplimiento de reglas de origen',
              'Reportes de cumplimiento para autoridades aduaneras'
            ]
          },
          legalConstraints: {
            description: 'Adaptación a constraints legales como reglas de origen T-MEC y cuotas compensatorias',
            approach: 'Motor de reglas parametrizable por tratado y regulación',
            details: [
              'Motor de reglas de origen configurable por tratado (T-MEC, TLCAN, etc.)',
              'Base de datos de cuotas compensatorias por producto y país',
              'Alertas automáticas cuando se acercan límites de cuota',
              'Simulador de impacto de cambios en regulaciones'
            ]
          }
        },
        prototypeSpecifications: [
          {
            id: 1,
            name: 'Motor de Investigación Regulatoria',
            description: 'Servicio que ingesta, procesa y extrae información de fuentes regulatorias públicas y documentos de caso de estudio',
            technicalAlignment: [
              'Escalabilidad: Procesamiento paralelo de múltiples fuentes',
              'Seguridad: Manejo seguro de documentos sensibles',
              'Trazabilidad: Vinculación de información extraída a fuente original',
              'Análisis de datos: Extracción estructurada de datos para análisis posterior',
              'Compliance: Verificación de vigencia y aplicabilidad de regulaciones',
              'Legal Constraints: Adaptación a diferentes tratados y marcos regulatorios'
            ]
          },
          {
            id: 2,
            name: 'Mapa Interactivo de Journey Logístico',
            description: 'Visualización interactiva del journey del cliente a través de los seis roles logísticos con variaciones por corredor',
            technicalAlignment: [
              'Escalabilidad: Carga sobredemandada de visualizaciones complejas',
              'Arquitectura: Componente independiente que consume servicio de journey mapping',
              'Seguridad: No maneja datos sensibles, solo información de journey',
              'Trazabilidad: Tracking de interacciones del usuario para mejora continua',
              'Análisis de datos: Recopilación de métricas de uso para optimización',
              'Compliance: Representación precisa de requisitos regulatorios por rol',
              'Legal Constraints: Fácil actualización para cambios en procedimientos por corredor'
            ]
          },
          {
            id: 3,
            name: 'Matriz de Riesgo UX-Dinámica',
            description: 'Herramienta que extrae términos regulatorios y los prioriza mediante matriz de riesgo enfocada en experiencia de usuario',
            technicalAlignment: [
              'Escalabilidad: Procesamiento eficiente de grandes volúmenes de texto',
              'Arquitectura: Servicio de NLP independiente con API bien definida',
              'Seguridad: Procesamiento de información pública sin exposición de privacidad',
              'Trazabilidad: Vinculación de términos priorizados a fuentes originales',
              'Análisis de datos: Algoritmos de aprendizaje para mejora continua de priorización',
              'Compliance: Actualización automática con cambios en terminología regulatoria',
              'Legal Constraints: Adaptable a diferentes marcos regulatorios y tratados'
            ]
          }
        ]
      };

      setPrototypes(prototypeData);
    } catch (err) {
      setError('Failed to generate prototypes: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsPrototyping(false);
    }
  };

  if (!prototypes) {
    return (
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-semibold text-ink mb-6">
            6. Prototipado de Producto
          </h2>
          <p className="text-muted-foreground mb-6">
            Generar especificaciones de prototipo considerando todos los aspectos técnicos y de compliance mencionados
          </p>
          <button
            onClick={handleGeneratePrototypesClick}
            disabled={isPrototyping}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isPrototyping ? 'Generando prototipos...' : 'Generar Especificaciones de Prototipo'}
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16h.01" />
            </svg>
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16">
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="text-2xl font-semibold text-ink mb-6">
          6. Prototipado de Producto
        </h2>
        <div className="space-y-8">
          <div className="bg-card p-6 rounded-lg border border-line">
            <h3 className="font-semibold text-ink mb-4">Consideraciones Técnicas Abordadas</h3>
            <div className="space-y-4">
              {Object.entries(prototypes.technicalConsiderations).map(([key, consideration]) => (
                <div key={key} className="p-4 border rounded-lg">
                  <h4 className="font-medium text-ink">{consideration.description}</h4>
                  <p className="text-sm text-muted-foreground">{consideration.approach}</p>
                  <ul className="mt-2 space-y-1 text-xs">
                    {consideration.details.map((detail: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="flex-shrink-0">•</span>
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card p-6 rounded-lg border border-line">
            <h3 className="font-semibold text-ink mb-4">Especificaciones de Prototipo Generadas</h3>
            <div className="space-y-4">
              {prototypes.prototypeSpecifications.map((prototype) => (
                <div key={prototype.id} className="p-6 mb-6 border rounded-lg">
                  <h4 className="font-medium text-ink mb-3">{prototype.name}</h4>
                  <p className="text-sm text-muted-foreground mb-3">{prototype.description}</p>

                  <div className="mt-4">
                    <h5 className="font-medium text-ink">Alineación Técnica:</h5>
                    <ul className="space-y-1">
                      {prototype.technicalAlignment.map((alignment, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="flex-shrink-0">•</span>
                          <span>{alignment}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}