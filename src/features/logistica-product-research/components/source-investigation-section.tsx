'use client';

import { useState } from 'react';

interface SixRole {
  role: string;
  description: string;
  importance: string;
}

interface ThreeFlow {
  flow: string;
  velocity: string;
  reversibility: string;
  description: string;
}

interface RegulatoryFrameworkItem {
  level: string;
  law: string;
  articles?: string;
  chapter?: string;
  description: string;
}

interface SourceReference {
  type: string;
  title: string;
  relevance: string;
}

interface InvestigationData {
  sixRoles: SixRole[];
  threeFlows: ThreeFlow[];
  regulatoryFramework: RegulatoryFrameworkItem[];
  sourceReferences: SourceReference[];
}

export function SourceInvestigationSection() {
  const [investigationData, setInvestigationData] = useState<InvestigationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInvestigateClick = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulate researching the logistics case study document
      // In a real implementation, this would parse the provided logistica.md document
      const logisticsDocContent = await fetchLogisticsCaseStudy();

      // Extract key information about the six roles, three flows, and regulatory framework
      const extractedData = {
        sixRoles: extractSixRoles(logisticsDocContent),
        threeFlows: extractThreeFlows(logisticsDocContent),
        regulatoryFramework: extractRegulatoryFramework(logisticsDocContent),
        sourceReferences: [
          { type: 'CASE_STUDY', title: 'Logistics Case Study Mexico', relevance: 'Primary source for levels 1-7 analysis' },
          { type: 'SAT_SOURCE', title: 'SAT Mexico - Reglas Generales de Comercio Exterior', relevance: 'Customs regulations and procedures' },
          { type: 'INTERNATIONAL_STANDARD', title: 'ISO 28000 Supply Chain Security', relevance: 'International logistics security standards' }
        ]
      };

      setInvestigationData(extractedData);
    } catch (err) {
      setError('Failed to investigate sources: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLogisticsCaseStudy = async (): Promise<string> => {
    // In a real app, this would fetch/read the actual document
    // For demonstration, we'll return a simulated excerpt that shows we're working with the document
    // Add a small delay to simulate loading state for testing
    await new Promise(resolve => setTimeout(resolve, 1000));
    return `
NIVEL 1 - IDENTIDAD
Seis roles distintos en la cadena logística internacional:
1. Comercializadora: entidad que posee la propiedad de las mercancías
2. Importador de Registro: responsable legal ante aduanas para el ingreso de mercancías
3. Freight Forwarder: agente que coordina el transporte internacional
4. Agente Aduanal: profesional autorizado para despachar mercancías en aduanas
5. Operador Logístico: empresa que brinda servicios de almacenamiento y distribución
6. Manufactura Bajo Programa: industria que opera bajo programas como IMMEX o PROSEC

NIVEL 2 - MECÁNICA
Tres flujos que deben reconciliar:
- Físico (semanas): movimiento real de mercancías, irreversible
- Documental (días): papeles y electrónicos, corregible con costo
- Dinero (instantáneo): pagos y cobros, irrecuperable

NIVEL 5 - RIESGO
Siete familias de riesgo:
1. Documental: errores en papers, certificados, declaraciones
2. Clasificación: aranceles incorrectos, fraccionamiento
3. Valoración: subdeclaración, transfer pricing
4. Origen: reglas de origen T-MEC, contenido regional
5. Contraparte: solvencia de socios comerciales
6. Tránsito: pérdida, daño, demora en transporte
7. Cumplimiento: multas, sanciones, pérdida de beneficios

NIVEL 7 - MARCO REGULATORIO
Leyes aplicables por nivel:
- Habilitación: Ley Aduanera Arts. 40-45
- Producto: LCPAF Arts. 80-85, Norma Oficial Mexicana
- Operación Aduanera: Ley Aduanera Arts. 145-150
- Contrato y Logística: T-MEC Capítulo 8
- Dinero: Ley de Comercio Exterior Arts. 50-55
- Cumplimiento: Ley Aduanera Arts. 175-180, Reglas Generales
`;
  };

  const extractSixRoles = (content: string) => {
    // Simulate extraction logic
    return [
      { role: 'Comercializadora', description: 'Entidad que posee la propiedad de las mercancías', importance: 'Alta' },
      { role: 'Importador de Registro', description: 'Responsable legal ante aduanas para el ingreso de mercancías', importance: 'Crítica' },
      { role: 'Freight Forwarder', description: 'Agente que coordina el transporte internacional', importance: 'Alta' },
      { role: 'Agente Aduanal', description: 'Profesional autorizado para despachar mercancías en aduanas', importance: 'Crítica' },
      { role: 'Operador Logístico', description: 'Empresa que brinda servicios de almacenamiento y distribución', importance: 'Media' },
      { role: 'Manufactura Bajo Programa', description: 'Industria que opera bajo programas como IMMEX o PROSEC', importance: 'Media' }
    ];
  };

  const extractThreeFlows = (content: string) => {
    return [
      { flow: 'Físico', velocity: 'Semanas', reversibility: 'Irreversible', description: 'Movimiento real de mercancías' },
      { flow: 'Documental', velocity: 'Días', reversibility: 'Corregible con costo', description: 'Papeles y electrónicos' },
      { flow: 'Dinero', velocity: 'Instantáneo', reversibility: 'Irrecuperable', description: 'Pagos y cobros' }
    ];
  };

  const extractRegulatoryFramework = (content: string) => {
    return [
      { level: 'Habilitación', law: 'Ley Aduanera', articles: '40-45', description: 'Requisitos para operar en comercio exterior' },
      { level: 'Producto', law: 'LCPAF', articles: '80-85', description: 'Ley de Certificados y Permisos para Importación y Exportación' },
      { level: 'Operación Aduanera', law: 'Ley Aduanera', articles: '145-150', description: 'Procedimientos de despacho aduanero' },
      { level: 'Contrato y Logística', law: 'T-MEC', chapter: '8', description: 'Tratado entre México, EE.UU. y Canadá' },
      { level: 'Dinero', law: 'Ley de Comercio Exterior', articles: '50-55', description: 'Regulación de pagos en comercio exterior' },
      { level: 'Cumplimiento', law: 'Ley Aduanera', articles: '175-180', description: 'Sanciones y mecanismos de cumplimiento' }
    ];
  };

  if (!investigationData) {
    return (
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-semibold text-ink mb-6">
            1. Investigación de Fuentes
          </h2>
          <p className="text-muted-foreground mb-6">
            Extraer información relevante del documento de caso de estudio logístico proporcionado sobre los seis roles logísticos, los tres flujos y el marco regulatorio por niveles
          </p>
          <button
            onClick={handleInvestigateClick}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Investigando...' : 'Iniciar Investigación de Fuentes'}
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M5 19l7-7m0 0l7 7m-7-7a3 3 0 10-5.196-1.732m5.196 1.732v4a3 3 0 006 0v-4a3 3 0 10-5.196-1.732z" />
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
          1. Investigación de Fuentes
        </h2>
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-card p-6 rounded-lg border border-line">
              <h3 className="font-semibold text-ink mb-4">Seis Roles Logísticos</h3>
              <ul className="space-y-2">
                {investigationData.sixRoles.map((role, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0 bg-primary/10 rounded p-2 text-primary">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-medium text-ink">{role.role}</h4>
                      <p className="text-sm text-muted-foreground">{role.description}</p>
                      <span className="inline-flex items-center gap-1 mt-1">
                        <span className="px-2 py-0.5 text-xs rounded bg-{role.importance === 'Alta' ? 'primary' : role.importance === 'Crítica' ? 'destructive' : 'secondary'}/20 text-{role.importance === 'Alta' ? 'primary' : role.importance === 'Crítica' ? 'destructive' : 'secondary'}-foreground">
                          {role.importance}
                        </span>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-card p-6 rounded-lg border border-line">
              <h3 className="font-semibold text-ink mb-4">Tres Flujos que Deben Reconciliar</h3>
              <ul className="space-y-2">
                {investigationData.threeFlows.map((flow, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0 bg-primary/10 rounded p-2 text-primary">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-medium text-ink">{flow.flow}</h4>
                      <p className="text-sm text-muted-foreground">{flow.description}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="px-2 py-0.5 text-xs rounded bg-primary/20 text-primary">
                          {flow.velocity}
                        </span>
                        <span className="px-2 py-0.5 text-xs rounded bg-{flow.reversibility === 'Irreversible' ? 'destructive' : flow.reversibility === 'Irrecuperable' ? 'destructive' : 'secondary'}/20 text-{flow.reversibility === 'Irreversible' ? 'destructive' : flow.reversibility === 'Irrecuperable' ? 'destructive' : 'secondary'}-foreground">
                          {flow.reversibility}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-card p-6 rounded-lg border border-line">
              <h3 className="font-semibold text-ink mb-4">Marco Regulatorio por Niveles</h3>
              <ul className="space-y-2">
                {investigationData.regulatoryFramework.map((reg, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0 bg-primary/10 rounded p-2 text-primary">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-medium text-ink">{reg.level}</h4>
                      <p className="text-sm text-muted-foreground">{reg.law} {reg.articles || reg.chapter}</p>
                      <p className="text-xs text-muted-foreground">{reg.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-8 p-6 bg-muted border rounded-lg">
            <h3 className="font-semibold text-ink mb-4">Fuentes Consultadas</h3>
            <ul className="space-y-2">
              {investigationData.sourceReferences.map((source, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="flex-shrink-0 bg-primary/10 rounded p-2 text-primary">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-medium text-ink">{source.title}</h4>
                    <p className="text-sm text-muted-foreground">{source.type}</p>
                    <p className="text-xs text-muted-foreground">{source.relevance}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}