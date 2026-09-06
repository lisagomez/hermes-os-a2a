'use client';

import { useState } from 'react';

interface ValidationCategory {
  status: string;
  evidence: string;
  details: string[];
}

interface ValidationData {
  escalabilidad: ValidationCategory;
  arquitectura: ValidationCategory;
  seguridad: ValidationCategory;
  trazabilidad: ValidationCategory;
  dataAnalysis: ValidationCategory;
  compliance: ValidationCategory;
  legalConstraints: ValidationCategory;
}

export function NFRValidationSection() {
  const [validations, setValidations] = useState<ValidationData | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleValidateNFRsClick = async () => {
    setIsValidating(true);
    setError(null);

    try {
      // Simulate NFR validation based on the prototype specifications
      const validationData = {
        escalabilidad: {
          status: 'addressed',
          evidence: 'Arquitectura de microservicios permite escalado horizontal independiente por corredor geográfico',
          details: [
            'Servicios desplegables independientemente en contenedores o funciones serverless',
            'Escalado automático basado en métricas de demanda por corredor',
            'Base de datos distribuida reduce latencia y cuello de botella geográfico',
            'Caching de resultados de investigación reduce carga computacional repetitiva'
          ]
        },
        arquitectura: {
          status: 'addressed',
          evidence: 'Servicios especializados por flujo logístico con comunicación mediante eventos',
          details: [
            'Desacoplamiento permite desarrollo, despliegue y escalado independiente',
            'Patrón de publicación/suscripción para comunicación entre servicios',
            'Cada servicio tiene responsabilidad única y bien definida',
            'Facilita mantenimiento y evolución tecnológica independiente'
          ]
        },
        seguridad: {
          status: 'addressed',
          evidence: 'Seguridad por diseño con cifrado, mínimos privilegios y auditoría',
          details: [
            'Cifrado AES-256 para todos los datos en reposo en base de datos y almacenamiento',
            'TLS 1.3 obligatorio para todas las comunicaciones externas e internas',
            'Control de acceso basado en roles (RBAC) con permisos granulares',
            'Registro de auditoría completo para acceso a información sensible como RFC',
            'Cumplimiento verificable con Ley Federal de Protección de Datos Personales'
          ]
        },
        trazabilidad: {
          status: 'addressed',
          evidence: 'Tracking end-to-end con identificador único de operación de comercio exterior',
          details: [
            'Identificador UUID generado al inicio de cada operación de investigación',
            'Vinculación bidireccional entre documentos físicos y registros electrónicos',
            'Traceabilidad completa de mercancía desde origen proveedor hasta destino final',
            'Registro de timestamps, responsables y resultados en cada touchpoint del journey'
          ]
        },
        dataAnalysis: {
          status: 'addressed',
          evidence: 'Machine learning para predicción de demoras y identificación de patrones de riesgo',
          details: [
            'Modelos de regresión entrenados con datos históricos de operaciones logísticas',
            'Clasificación supervisada para identificación temprana de riesgos potenciales',
            'Análisis de series temporales para detección de patrones estacionales y eventos',
            'Dashboard en tiempo real con métricas clave y alertas proactivas configurables'
          ]
        },
        compliance: {
          status: 'addressed',
          evidence: 'Motor de reglas que valida operaciones contra regulaciones vigentes',
          details: [
            'Base de reglas centralizada y versionada para fácil actualización',
            'Validación automática de documentos requeridos según rol y operación',
            'Verificación en tiempo real de cumplimiento de reglas de origen T-MEC',
            'Generación automática de reportes de cumplimiento para autoridades aduaneras',
            'Alertas proactivas cuando se detectan desviaciones de regulaciones aplicables'
          ]
        },
        legalConstraints: {
          status: 'addressed',
          evidence: 'Motor de reglas parametrizable por tratado y regulación con adaptabilidad dinámica',
          details: [
            'Motor de reglas de origen configurable por tratado (T-MEC, TLCAN, otros)',
            'Base de datos actualizable de cuotas compensatorias por producto y país',
            'Sistema de alertas automáticas cuando se acercan límites de cuota aplicables',
            'Simulador de impacto que modela consecuencias de cambios en regulaciones',
            'Capacidad para extender fácilmente a nuevos marcos regulatorios y tratados'
          ]
        }
      };

      setValidations(validationData);
    } catch (err) {
      setError('Failed to validate NFRs: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsValidating(false);
    }
  };

  if (!validations) {
    return (
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-semibold text-ink mb-6">
            7. Validación de Requisitos No Funcionales
          </h2>
          <p className="text-muted-foreground mb-6">
            Documentar cómo el prototipo aborda escalabilidad, arquitectura, seguridad, trazabilidad, data analysis, compliance y legal constraints
          </p>
          <button
            onClick={handleValidateNFRsClick}
            disabled={isValidating}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isValidating ? 'Validando...' : 'Validar Requisitos No Funcionales'}
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
          7. Validación de Requisitos No Funcionales
        </h2>
        <div className="space-y-8">
          <div className="bg-card p-6 rounded-lg border border-line">
            <h3 className="font-semibold text-ink mb-4">Escalabilidad</h3>
            <p className="text-sm text-muted-foreground">{validations.escalabilidad.evidence}</p>
            <ul className="mt-2 space-y-1 text-xs">
              {validations.escalabilidad.details.map((detail, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="flex-shrink-0">•</span>
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
            <span className="inline-flex items-center gap-1 mt-3">
              <span className="px-2 py-0.5 text-xs rounded bg-success/20 text-success">
                {validations.escalabilidad.status}
              </span>
            </span>
          </div>

          <div className="bg-card p-6 rounded-lg border border-line">
            <h3 className="font-semibold text-ink mb-4">Arquitectura</h3>
            <p className="text-sm text-muted-foreground">{validations.arquitectura.evidence}</p>
            <ul className="mt-2 space-y-1 text-xs">
              {validations.arquitectura.details.map((detail, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="flex-shrink-0">•</span>
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
            <span className="inline-flex items-center gap-1 mt-3">
              <span className="px-2 py-0.5 text-xs rounded bg-success/20 text-success">
                {validations.arquitectura.status}
              </span>
            </span>
          </div>

          <div className="bg-card p-6 rounded-lg border border-line">
            <h3 className="font-semibold text-ink mb-4">Seguridad</h3>
            <p className="text-sm text-muted-foreground">{validations.seguridad.evidence}</p>
            <ul className="mt-2 space-y-1 text-xs">
              {validations.seguridad.details.map((detail, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="flex-shrink-0">•</span>
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
            <span className="inline-flex items-center gap-1 mt-3">
              <span className="px-2 py-0.5 text-xs rounded bg-success/20 text-success">
                {validations.seguridad.status}
              </span>
            </span>
          </div>

          <div className="bg-card p-6 rounded-lg border border-line">
            <h3 className="font-semibold text-ink mb-4">Trazabilidad</h3>
            <p className="text-sm text-muted-foreground">{validations.trazabilidad.evidence}</p>
            <ul className="mt-2 space-y-1 text-xs">
              {validations.trazabilidad.details.map((detail, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="flex-shrink-0">•</span>
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
            <span className="inline-flex items-center gap-1 mt-3">
              <span className="px-2 py-0.5 text-xs rounded bg-success/20 text-success">
                {validations.trazabilidad.status}
              </span>
            </span>
          </div>

          <div className="bg-card p-6 rounded-lg border border-line">
            <h3 className="font-semibold text-ink mb-4">Análisis de Datos</h3>
            <p className="text-sm text-muted-foreground">{validations.dataAnalysis.evidence}</p>
            <ul className="mt-2 space-y-1 text-xs">
              {validations.dataAnalysis.details.map((detail, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="flex-shrink-0">•</span>
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
            <span className="inline-flex items-center gap-1 mt-3">
              <span className="px-2 py-0.5 text-xs rounded bg-success/20 text-success">
                {validations.dataAnalysis.status}
              </span>
            </span>
          </div>

          <div className="bg-card p-6 rounded-lg border border-line">
            <h3 className="font-semibold text-ink mb-4">Compliance</h3>
            <p className="text-sm text-muted-foreground">{validations.compliance.evidence}</p>
            <ul className="mt-2 space-y-1 text-xs">
              {validations.compliance.details.map((detail, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="flex-shrink-0">•</span>
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
            <span className="inline-flex items-center gap-1 mt-3">
              <span className="px-2 py-0.5 text-xs rounded bg-success/20 text-success">
                {validations.compliance.status}
              </span>
            </span>
          </div>

          <div className="bg-card p-6 rounded-lg border border-line">
            <h3 className="font-semibold text-ink mb-4">Constraints Legales</h3>
            <p className="text-sm text-muted-foreground">{validations.legalConstraints.evidence}</p>
            <ul className="mt-2 space-y-1 text-xs">
              {validations.legalConstraints.details.map((detail, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="flex-shrink-0">•</span>
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
            <span className="inline-flex items-center gap-1 mt-3">
              <span className="px-2 py-0.5 text-xs rounded bg-success/20 text-success">
                {validations.legalConstraints.status}
              </span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}