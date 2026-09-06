'use client';

import { useState } from 'react';

interface ResearchInsight {
  insight: string;
  description: string;
  impact: string;
}

interface Requirement {
  regulation: string;
  description: string;
}

interface Risk {
  risk: string;
  description: string;
}

interface RegulatoryScenario {
  scenario: string;
  description: string;
  requirements: Requirement[];
  risks: Risk[];
  opportunities: string[];
}

interface GeneratedScenario {
  id: number;
  title: string;
  description: string;
  basedOnInsight: string;
  basedOnRegulation: string;
  riskMitigation: string[];
  valueProposition: string;
}

interface ScenarioData {
  researchInsights: ResearchInsight[];
  regulatoryScenarios: RegulatoryScenario[];
  generatedScenarios: GeneratedScenario[];
}

export function ScenarioGenerationSection() {
  const [scenarios, setScenarios] = useState<ScenarioData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateScenariosClick = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      // Simulate scenario generation based on research insights and regulatory requirements
      const scenarioData = {
        researchInsights: [
          { insight: 'Dinero antes que mercancía', description: 'Pagos realizados antes de recibir documentación completa', impact: 'Alto riesgo de fraude y pérdida financiera' },
          { insight: 'Mercancía antes que documento', description: 'Mercancía llega antes de que se completen los papeles aduaneros', impact: 'Riesgo de retención y almacenaje costs' },
          { insight: 'Cobro después que todo', description: 'Pagos recibidos después de completar toda la cadena logística', impact: 'Problemas de flujo de capital y financiación' }
        ],
        regulatoryScenarios: [
          {
            scenario: 'Operación bajo T-MEC con reglas de origen',
            description: 'Empresa busca beneficiarse del trato preferencial bajo T-MEC para exportaciones a EE.UU. y Canadá',
            requirements: [
              { regulation: 'T-MEC Cap. 3 Art. 3.4', description: 'Reglas de origen para bienes industriales' },
              { regulation: 'T-MEC Cap. 5 Art. 5.2', description: 'Procedimientos de verificación de origen' }
            ],
            risks: [
              { risk: 'Documental', description: 'Error en certificado de origen pierde beneficios preferenciales' },
              { risk: 'Origen', description: 'Contenido regional insuficiente para calificar bajo T-MEC' }
            ],
            opportunities: [
              'Reducción de aranceles del 0% al MFN típico de 5-25%',
              'Ventaja competitiva frente a productores no beneficiados',
              'Acceso preferencial al mercado norteamericano'
            ]
          },
          {
            scenario: 'Importación de mercancía peligrosa',
            description: 'Empresa importa químicos o materiales que requieren manejo especial',
            requirements: [
              { regulation: 'Ley Aduanera Art. 160', description: 'Mercancías que requieren manejo especial' },
              { regulation: 'Norma Oficial Mexicana NOM-002-STPS-2010', description: 'Sistema Globalmente Armonizado de clasificación' }
            ],
            risks: [
              { risk: 'Tránsito', description: 'Incidente durante transporte que genera responsabilidad ambiental' },
              { risk: 'Cumplimiento', description: 'Multas por incumplimiento de normas de seguridad' }
            ],
            opportunities: [
              'Servicio especializado con márgenes más altos',
              'Barrera de entrada para competidores no certificados',
              'Alianzas estratégicas con productores que requieren el servicio'
            ]
          }
        ],
        generatedScenarios: [
          {
            id: 1,
            title: 'Plataforma de Verificación de Origen Automatizada',
            description: 'Sistema que verifica automáticamente el cumplimiento de reglas de origen T-MEC mediante análisis de documentos y datos de la cadena de suministro',
            basedOnInsight: 'Mercancía antes que documento',
            basedOnRegulation: 'T-MEC Cap. 3 Art. 3.4 y Cap. 5 Art. 5.2',
            riskMitigation: ['Reduce riesgo documental en 80%', 'Evita retenciones por errores en certificado de origen'],
            valueProposition: 'Ahorro promedio de $15,000 por operación en costos de retención y demoras'
          },
          {
            id: 2,
            title: 'Servicio de Finanzas para Comercio Exterior',
            description: 'Solución de financiación que avanza pagos contra documentos logísticos, resolviendo la desalineación dinero-documento',
            basedOnInsight: 'Dinero antes que mercancía',
            basedOnRegulation: 'Ley de Comercio Exterior Arts. 50-55',
            riskMitigation: ['Elimina riesgo de fraude por pago anticipado', 'Proporciona capital de trabajo para operaciones'],
            valueProposition: 'Reduce ciclo de conversión de efectivo de 45 a 15 días'
          }
        ]
      };

      setScenarios(scenarioData);
    } catch (err) {
      setError('Failed to generate scenarios: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsGenerating(false);
    }
  };

  if (!scenarios) {
    return (
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-semibold text-ink mb-6">
            5. Generación de Escenarios
          </h2>
          <p className="text-muted-foreground mb-6">
            Crear casos de uso/escenarios basados en la combinación de insights de investigación y requisitos regulatorios específicos por rol
          </p>
          <button
            onClick={handleGenerateScenariosClick}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isGenerating ? 'Generando escenarios...' : 'Generar Escenarios de Uso'}
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
          5. Generación de Escenarios
        </h2>
        <div className="space-y-8">
          <div className="bg-card p-6 rounded-lg border border-line">
            <h3 className="font-semibold text-ink mb-4">Insights de Investigación Utilizados</h3>
            <div className="space-y-3">
              {scenarios.researchInsights.map((insight, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <h4 className="font-medium text-ink">{insight.insight}</h4>
                  <p className="text-sm text-muted-foreground">{insight.description}</p>
                  <p className="text-xs text-muted-foreground">{insight.impact}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card p-6 rounded-lg border border-line">
            <h3 className="font-semibold text-ink mb-4">Escenarios Basados en Marco Regulatorio</h3>
            <div className="space-y-3">
              {scenarios.regulatoryScenarios.map((scenario, index) => (
                <div key={index} className="p-6 mb-6 border rounded-lg">
                  <h4 className="font-medium text-ink mb-3">{scenario.scenario}</h4>
                  <p className="text-sm text-muted-foreground mb-3">{scenario.description}</p>

                  <div className="space-y-3">
                    <div className="mb-3">
                      <h5 className="font-medium text-ink">Requisitos Regulatorios:</h5>
                      <ul className="space-y-1">
                        {scenario.requirements.map((req, reqIndex) => (
                          <li key={reqIndex} className="flex items-start gap-2">
                            <span className="flex-shrink-0">•</span>
                            <span>{req.regulation}: {req.description}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mb-3">
                      <h5 className="font-medium text-ink">Riesgos Identificados:</h5>
                      <ul className="space-y-1">
                        {scenario.risks.map((risk, riskIndex) => (
                          <li key={riskIndex} className="flex items-start gap-2">
                            <span className="flex-shrink-0">•</span>
                            <span>{risk.risk}: {risk.description}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mb-3">
                      <h5 className="font-medium text-ink">Oportunidades de Negocio:</h5>
                      <ul className="space-y-1">
                        {scenario.opportunities.map((opp, oppIndex) => (
                          <li key={oppIndex} className="flex items-start gap-2">
                            <span className="flex-shrink-0">•</span>
                            <span>{opp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card p-6 rounded-lg border border-line">
            <h3 className="font-semibold text-ink mb-4">Escenarios de Producto Generados</h3>
            <div className="space-y-4">
              {scenarios.generatedScenarios.map((scenario, index) => (
                <div key={scenario.id} className="p-4 border rounded-lg">
                  <h4 className="font-medium text-ink mb-2">{scenario.title}</h4>
                  <p className="text-sm text-muted-foreground mb-2">{scenario.description}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div>
                      <h5 className="font-medium text-ink">Basado en:</h5>
                      <ul className="space-y-1">
                        <li className="flex items-start gap-2">
                          <span className="flex-shrink-0">•</span>
                          <span>Insight: {scenario.basedOnInsight}</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="flex-shrink-0">•</span>
                          <span>Regulación: {scenario.basedOnRegulation}</span>
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium text-ink">Mitigación de Riesgos:</h5>
                      <ul className="space-y-1">
                        {scenario.riskMitigation.map((mitigation, mIndex) => (
                          <li key={mIndex} className="flex items-start gap-2">
                            <span className="flex-shrink-0">•</span>
                            <span>{mitigation}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-3 p-4 bg-primary/10 rounded-lg border border-primary/20">
                    <h5 className="font-medium text-ink">Propuesta de Valor:</h5>
                    <p className="text-sm text-muted-foreground">{scenario.valueProposition}</p>
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