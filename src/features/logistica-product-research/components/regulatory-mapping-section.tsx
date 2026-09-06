'use client';

import { useState } from 'react';

interface RegulatoryLevel {
  level: string;
  law: string;
  chapter?: string;
  article?: string;
  description: string;
}

interface KeywordRegulatoryLink {
  keyword: string;
  levels: RegulatoryLevel[];
  scenarios: string[];
}

interface RegulatoryFrameworkSummary {
  totalLevels: number;
  coveredByKeywords: number;
  coveragePercentage: number;
}

interface MappingData {
  keywordRegulatoryLinks: KeywordRegulatoryLink[];
  regulatoryFrameworkSummary: RegulatoryFrameworkSummary;
}

export function RegulatoryMappingSection() {
  const [mappings, setMappings] = useState<MappingData | null>(null);
  const [isMapping, setIsMapping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMapRegulationsClick = async () => {
    setIsMapping(true);
    setError(null);

    try {
      // Simulate regulatory mapping based on extracted keywords
      const mappingData = {
        keywordRegulatoryLinks: [
          {
            keyword: 'Reglas de Origen',
            levels: [
              { level: 'Producto', law: 'T-MEC', chapter: '3', article: '3.4', description: 'Reglas de origen para bienes industriales' },
              { level: 'Contrato y Logística', law: 'T-MEC', chapter: '5', article: '5.2', description: 'Procedimientos de verificación de origen' }
            ],
            scenarios: [
              'Producto ensamblado en México con componentes extranjeros busca beneficiarse del T-MEC',
              'Importación de materia prima para manufactura bajo programa IMMEX',
              'Exportación de productos terminados a EE.UU. bajo trato preferencial'
            ]
          },
          {
            keyword: 'Fraccionamiento',
            levels: [
              { level: 'Producto', law: 'Ley Aduanera', article: '151', description: 'Clasificación arancelaria de mercancías' }
            ],
            scenarios: [
              'Importación de producto terminado vs importación de componentes para ensamble local',
              'Diferencia en arancel entre producto acabado y sus partes componentes',
              'Clasificación incorrecta que resulta en pago de aranceles excesivos'
            ]
          },
          {
            keyword: 'Valor en Aduana',
            levels: [
              { level: 'Producto', law: 'Ley Aduanera', article: '142', description: 'Métodos de valoración en aduana' }
            ],
            scenarios: [
              'Declaración de valor inferior al real para reducir pagos de impuestos',
              'Transfer pricing entre empresas relacionadas afecta valor declarado',
              'Costos de seguros y flete no incluidos en valor declaration'
            ]
          },
          {
            keyword: 'Certificado de Origen',
            levels: [
              { level: 'Producto', law: 'T-MEC', chapter: '3', article: '3.5', description: 'Requisitos del certificado de origen' }
            ],
            scenarios: [
              'Exportación a EE.UU. se beneficia de arancel cero bajo T-MEC',
              'Exportación a Canadá requiere certificado específico para preferencias arancelarias',
              'Falta de certificado resulta en aplicación de arancel MFN más alto'
            ]
          }
        ],
        regulatoryFrameworkSummary: {
          totalLevels: 6,
          coveredByKeywords: 4,
          coveragePercentage: 67
        }
      };

      setMappings(mappingData);
    } catch (err) {
      setError('Failed to map regulations: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsMapping(false);
    }
  };

  if (!mappings) {
    return (
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-semibold text-ink mb-6">
            4. Mapeo Regulatorio
          </h2>
          <p className="text-muted-foreground mb-6">
            Evidenciar la relación entre palabras identificadas y requisitos regulatorios específicos por nivel y por tratado (T-MEC)
          </p>
          <button
            onClick={handleMapRegulationsClick}
            disabled={isMapping}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isMapping ? 'Mapeando...' : 'Mapear Requisitos Regulatorios'}
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
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
          4. Mapeo Regulatorio
        </h2>
        <div className="space-y-8">
          <div className="bg-card p-6 rounded-lg border border-line">
            <h3 className="font-semibold text-ink mb-4">Relación Palabras-Clave ↔ Requisitos Regulatorios</h3>
            <div className="space-y-4">
              {mappings.keywordRegulatoryLinks.map((link, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <h4 className="font-medium text-ink">{link.keyword}</h4>
                  <div className="mt-4">
                    <h5 className="font-medium text-ink mb-2">Niveles Regulatorios Asociados:</h5>
                    <ul className="space-y-2">
                      {link.levels.map((level, lIndex) => (
                        <li key={lIndex} className="flex items-start gap-3">
                          <div className="flex-shrink-0 bg-primary/10 rounded p-2 text-primary">
                            {lIndex + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-ink">{level.law} {level.article || level.chapter}</p>
                            <p className="text-xs text-muted-foreground">{level.description}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-4">
                    <h5 className="font-medium text-ink mb-2">Escenarios de Uso Asociados:</h5>
                    <ul className="space-y-2">
                      {link.scenarios.map((scenario, sIndex) => (
                        <li key={sIndex} className="flex items-start gap-3">
                          <div className="flex-shrink-0 bg-primary/10 rounded p-2 text-primary">
                            •
                          </div>
                          <div className="text-sm text-muted-foreground">{scenario}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card p-6 rounded-lg border border-line">
            <h3 className="font-semibold text-ink mb-4">Resumen de Cobertura Regulatoria</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-ink mb-2">Niveles del Marco Regulatorio</h4>
                <p className="text-sm text-muted-foreground">
                  El marco regulatorio logístico consta de 6 niveles principales:
                  Habilitación, Producto, Operación Aduanera, Contrato y Logística, Dinero y Cumplimiento
                </p>
              </div>
              <div>
                <h4 className="font-medium text-ink mb-2">Cobertura Actual</h4>
                <p className="text-sm text-muted-foreground">
                  {mappings.regulatoryFrameworkSummary.coveredByKeywords} de
                  {mappings.regulatoryFrameworkSummary.totalLevels} niveles
                  cubiertos por las palabras clave identificadas
                  ({mappings.regulatoryFrameworkSummary.coveragePercentage}%)
                </p>
                <div className="mt-3">
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <div
                      className="bg-primary h-2.5 rounded-full"
                      style={{ width: `${mappings.regulatoryFrameworkSummary.coveragePercentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}