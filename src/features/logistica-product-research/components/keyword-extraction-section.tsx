'use client';

import { useState } from 'react';

interface RegulatoryTerm {
  term: string;
  frequency: number;
  riskFamilies: string[];
  uxImpact: string;
}

interface RiskMatrixEntry {
  severity: string;
  description: string;
}

interface RiskMatrix {
  Documental: RiskMatrixEntry;
  Clasificación: RiskMatrixEntry;
  Valoración: RiskMatrixEntry;
  Origen: RiskMatrixEntry;
  Contraparte: RiskMatrixEntry;
  Tránsito: RiskMatrixEntry;
  Cumplimiento: RiskMatrixEntry;
}

interface KeywordData {
  regulatoryTerms: RegulatoryTerm[];
  riskMatrix: RiskMatrix;
}

export function KeywordExtractionSection() {
  const [keywords, setKeywords] = useState<KeywordData | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExtractKeywordsClick = async () => {
    setIsExtracting(true);
    setError(null);

    try {
      // Simulate keyword extraction and ranking using UX risk matrix
      // Add a small delay to simulate loading state for testing
      await new Promise(resolve => setTimeout(resolve, 1000));

      const keywordData = {
        regulatoryTerms: [
          { term: 'Reglas de Origen', frequency: 8, riskFamilies: ['Origen', 'Valoración'], uxImpact: 'Alta' },
          { term: 'Fraccionamiento', frequency: 6, riskFamilies: ['Clasificación', 'Valoración'], uxImpact: 'Alta' },
          { term: 'Valor en Aduana', frequency: 9, riskFamilies: ['Valoración', 'Documental'], uxImpact: 'Media' },
          { term: 'Certificado de Origen', frequency: 7, riskFamilies: ['Origen', 'Documental'], uxImpact: 'Media' },
          { term: 'Pedimento Aduanero', frequency: 10, riskFamilies: ['Documental', 'Cumplimiento'], uxImpact: 'Baja' },
          { term: 'Rectificación', frequency: 5, riskFamilies: ['Documental', 'Clasificación'], uxImpact: 'Media' },
          { term: 'Aeronave no tripulada', frequency: 3, riskFamilies: ['Origen', 'Tránsito'], uxImpact: 'Alta' },
          { term: 'Mercancía peligrosa', frequency: 4, riskFamilies: ['Tránsito', 'Cumplimiento'], uxImpact: 'Alta' }
        ],
        riskMatrix: {
          Documental: { severity: 'Media', description: 'Errores en documentación que requieren corrección con costo' },
          Clasificación: { severity: 'Alta', description: 'Aranceles incorrectos que generan pagos excesivos o insucientes' },
          Valoración: { severity: 'Alta', description: 'Subdeclaración o transfer pricing que afecta base imponible' },
          Origen: { severity: 'Alta', description: 'Incumplimiento de reglas de origen que pierde beneficios preferenciales' },
          Contraparte: { severity: 'Media', description: 'Riesgo de insolvencia de socios comerciales' },
          Tránsito: { severity: 'Alta', description: 'Pérdida, daño o demora que afecta cadena de suministro' },
          Cumplimiento: { severity: 'Media', description: 'Multas y sanciones por incumplimiento regulatorio' }
        }
      };

      setKeywords(keywordData);
    } catch (err) {
      setError('Failed to extract keywords: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsExtracting(false);
    }
  };

  if (!keywords) {
    return (
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-semibold text-ink mb-6">
            3. Extracción y Rankeo de Palabras
          </h2>
          <p className="text-muted-foreground mb-6">
            Extraer términos clave de fuentes regulatorias y priorizarlos mediante matriz de riesgo UX considerando las siete familias de riesgo y su nivel de severidad
          </p>
          <button
            onClick={handleExtractKeywordsClick}
            disabled={isExtracting}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isExtracting ? 'Extrayendo...' : 'Extraer y Ranquear Palabras'}
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
          3. Extracción y Rankeo de Palabras
        </h2>
        <div className="space-y-8">
          <div className="bg-card p-6 rounded-lg border border-line">
            <h3 className="font-semibold text-ink mb-4">Matriz de Riesgo UX</h3>
            <div className="space-y-3">
              {Object.entries(keywords.riskMatrix).map(([risk, data]) => (
                <div key={risk} className="p-4 border rounded-lg">
                  <h4 className="font-medium text-ink">{risk}</h4>
                  <p className="text-sm text-muted-foreground">{data.description}</p>
                  <span className="inline-flex items-center gap-1 mt-2">
                    <span className="px-2 py-0.5 text-xs rounded bg-{data.severity === 'Alta' ? 'destructive' : data.severity === 'Media' ? 'warning' : 'secondary'}/20 text-{data.severity === 'Alta' ? 'destructive' : data.severity === 'Media' ? 'warning' : 'secondary'}-foreground">
                      {data.severity}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card p-6 rounded-lg border border-line">
            <h3 className="font-semibold text-ink mb-4">Términos Regulatorios Extraídos y Rankeados</h3>
            <div className="space-y-4">
              {keywords.regulatoryTerms
                .slice()
                .sort((a, b) => b.frequency - a.frequency)
                .map((term, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-ink">{term.term}</h4>
                        <p className="text-sm text-muted-foreground">
                          Aparece {term.frequency} veces en las fuentes investigadas
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {term.riskFamilies.map((family, fIndex) => (
                            <span key={fIndex} className="px-2 py-0.5 text-xs rounded bg-primary/20 text-primary">
                              {family}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-center space-y-2">
                        <div className="text-xl font-bold text-ink">{term.uxImpact}</div>
                        <p className="text-xs text-muted-foreground">Impacto UX</p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="mt-8 p-6 bg-muted border rounded-lg">
            <h3 className="font-semibold text-ink mb-4">Insights de Priorización</h3>
            <p className="text-sm text-muted-foreground">
              Los términos con mayor frecuencia y asociados a riesgos de alta severidad
              (como &apos;Reglas de Origen&apos; y &apos;Fraccionamiento&apos;) reciben prioridad máxima
              debido a su alto impacto en la experiencia del usuario y riesgo de negocio.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}