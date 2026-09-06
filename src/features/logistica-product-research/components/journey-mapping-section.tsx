'use client';

import { useState } from 'react';

export function JourneyMappingSection() {
  interface CorridorAnalysis {
  USA: {
    preferentialTreatment: string;
    capitalPressure: string;
    dominantRisk: string;
    operationalFriction: string;
  };
  China: {
    preferentialTreatment: string;
    capitalPressure: string;
    dominantRisk: string;
    operationalFriction: string;
  };
  LATAM: {
    preferentialTreatment: string;
    capitalPressure: string;
    dominantRisk: string;
    operationalFriction: string;
  };
}

interface RoleJourney {
  role: string;
  touchpoints: string[];
  painPoints: string[];
  duration: string;
  corridorVariations: {
    USA: string;
    China: string;
    LATAM: string;
  };
}

interface JourneyMapData {
  corridorAnalysis: CorridorAnalysis;
  sixRolesJourney: RoleJourney[];
}

const [journeyMap, setJourneyMap] = useState<JourneyMapData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateJourneyClick = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      // Simulate journey mapping based on the logistics case study
      // Add a small delay to simulate loading state for testing
      await new Promise(resolve => setTimeout(resolve, 1000));

      const journeyData = {
        corridorAnalysis: {
          USA: {
            preferentialTreatment: 'T-MET provides duty-free treatment for qualifying goods',
            capitalPressure: 'Moderate - established logistics infrastructure',
            dominantRisk: 'Tránsito (long distances, varying state regulations)',
            operationalFriction: 'Low - standardized procedures across states'
          },
          China: {
            preferentialTreatment: 'Limited - requires specific certifications',
            capitalPressure: 'High - significant upfront investment needed',
            dominantRisk: 'Origen (strict rules of origin enforcement)',
            operationalFriction: 'High - complex documentation and procedures'
          },
          LATAM: {
            preferentialTreatment: 'Varies by country - bilateral agreements',
            capitalPressure: 'Low-Moderate - growing infrastructure',
            dominantRisk: 'Documental (inconsistent procedures across countries)',
            operationalFriction: 'Medium-High - bureaucratic delays common'
          }
        },
        sixRolesJourney: [
          {
            role: 'Comercializadora',
            touchpoints: ['Sourcing de productos', 'Negociación con proveedores', 'Gestión de inventario'],
            painPoints: ['Fluctuaciones de cambio', 'Calidad inconsistente', 'Demoras en producción'],
            duration: 'Ongoing',
            corridorVariations: {
              USA: 'Estándar alto - enfoque en marca y garantía',
              China: 'Enfoque en costo - negociación dura de precios',
              LATAM: 'Relaciones personales clave - confianza construida con tiempo'
            }
          },
          {
            role: 'Importador de Registro',
            touchpoints: ['Clasificación arancelaria', 'Valoración en aduana', 'Pago de contribuciones'],
            painPoints: ['Cambios frecuentes en regulaciones', 'Retenciones inesperadas', 'Multas por errores'],
            duration: '1-3 días',
            corridorVariations: {
              USA: 'Procedimientos claros - bajo riesgo de retención',
              China: 'Estricto control - alto riesgo de retención',
              LATAM: 'Procedimientos variables - riesgo medio-alto de retención'
            }
          },
          {
            role: 'Freight Forwarder',
            touchpoints: ['Reservación de espacio', 'Documentación de embarque', 'Seguimiento de carga'],
            painPoints: ['Sobrecapacidad en temporadas altas', 'Documentación incompleta', 'Demoras en puertos'],
            duration: 'Variable según ruta',
            corridorVariations: {
              USA: 'Infraestructura robusta - múltiples opciones',
              China: 'Puertos congestionados - planificación crítica',
              LATAM: 'Infraestructura limitada - menos opciones disponibles'
            }
          },
          {
            role: 'Agente Aduanal',
            touchpoints: ['Presentación de pedimento', 'Inspección física si aplica', 'Liberación de mercancía'],
            painPoints: ['Errores en clasificación', 'Falta de documentación requerida', 'Cambios regulatorios repentinos'],
            duration: 'Horas a días',
            corridorVariations: {
              USA: 'Procedimientos estandarizados - bajo riesgo',
              China: 'Revisión exhaustiva - alto riesgo de demora',
              LATAM: 'Procedimientos inconsistentes - riesgo variable'
            }
          },
          {
            role: 'Operador Logístico',
            touchpoints: ['Recepción en almacén', 'Almacenaje y picking', 'Preparación para distribución'],
            painPoints: ['Errores de inventario', 'Demoras en preparación', 'Daño durante manipulación'],
            duration: '1-7 días',
            corridorVariations: {
              USA: 'Tecnología avanzada - alta precisión',
              China: 'Creciente automatización - mejora continua',
              LATAM: 'Procesos manuales comunes - mayor riesgo de error'
            }
          },
          {
            role: 'Manufactura Bajo Programa',
            touchpoints: ['Ensamblaje final', 'Control de calidad', 'Empaque para exportación'],
            painPoints: ['Requisitos de contenido regional', 'Estándares de calidad internacionales', 'Plazos de entrega ajustados'],
            duration: 'Variable según producción',
            corridorVariations: {
              USA: 'Estándares altos - certificación requerida',
              China: 'Requisitos de tecnología transferida',
              LATAM: 'Programas específicos por país - beneficios variables'
            }
          }
        ]
      };

      setJourneyMap(journeyData);
    } catch (err) {
      setError('Failed to generate journey map: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsGenerating(false);
    }
  };

  if (!journeyMap) {
    return (
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-semibold text-ink mb-6">
            2. Journey Mapping
          </h2>
          <p className="text-muted-foreground mb-6">
            Mapear el journey del cliente a través de la cadena de valor logística identificando los seis roles distintos y cómo varían por corredor (USA, China, LATAM)
          </p>
          <button
            onClick={handleGenerateJourneyClick}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isGenerating ? 'Generando...' : 'Generar Journey Map'}
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
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
          2. Journey Mapping
        </h2>
        <div className="space-y-8">
          <div className="bg-card p-6 rounded-lg border border-line">
            <h3 className="font-semibold text-ink mb-4">Análisis por Corredor</h3>
            <div className="space-y-4">
              {['USA', 'China', 'LATAM'].map((corridor) => {
                const data = journeyMap.corridorAnalysis[corridor as keyof typeof journeyMap.corridorAnalysis];
                return (
                  <div key={corridor} className="p-4 border rounded-lg">
                    <h4 className="font-medium text-ink">{corridor}</h4>
                    <div className="mt-2 space-y-1 text-sm">
                      <div className="flex items-start gap-2">
                        <span className="flex-shrink-0">Preferential Treatment:</span>
                        <span>{data.preferentialTreatment}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="flex-shrink-0">Capital Pressure:</span>
                        <span>{data.capitalPressure}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="flex-shrink-0">Dominant Risk:</span>
                        <span>{data.dominantRisk}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="flex-shrink-0">Operational Friction:</span>
                        <span>{data.operationalFriction}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-card p-6 rounded-lg border border-line">
            <h3 className="font-semibold text-ink mb-4">Journey de los Seis Roles Logísticos</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-line">
                <thead>
                  <tr className="bg-muted">
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Touchpoints
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Pain Points
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Duración Típica
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Variaciones por Corredor
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {journeyMap.sixRolesJourney.map((role, index) => (
                    <tr key={index} className="hover:bg-muted">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-ink">{role.role}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <ul className="space-y-1">
                          {role.touchpoints.map((tp, tpIndex) => (
                            <li key={tpIndex} className="flex items-start gap-2">
                              <span className="flex-shrink-0">•</span>
                              <span>{tp}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <ul className="space-y-1">
                          {role.painPoints.map((pp, ppIndex) => (
                            <li key={ppIndex} className="flex items-start gap-2">
                              <span className="flex-shrink-0">•</span>
                              <span>{pp}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {role.duration}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="space-y-1">
                          {Object.entries(role.corridorVariations).map(([corridor, variation], cvIndex) => (
                            <div key={cvIndex} className="flex items-start gap-2">
                              <span className="flex-shrink-0 text-xs">{corridor}:</span>
                              <span className="text-xs">{variation}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}