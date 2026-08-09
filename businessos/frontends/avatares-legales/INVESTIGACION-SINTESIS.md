# Síntesis de investigación — avatares legales

Fuente: *"Buyer persona legal para A2A (fiscales, litigio, corporativo comercial
y multipráctica)"* (investigación v2, jul-2026) + prompt del equipo
(`prompt-claude-code-frontends-A2A-v2.md`). Este archivo es la trazabilidad que
pide el §2 del prompt: cada pantalla de la app responde a un dolor identificado
aquí. Los planes completos viven en `docs/planes/` (plan del equipo, plan bufete
B2B y adenda de conciliación).

## Contexto del mercado (§1, §5.1, §9 de la investigación)

Los despachos enfrentan presión por eficiencia, transparencia y rapidez, con
clientes más digitales y regulación cambiante. La mayoría opera con procesos
manuales, dispersión documental y baja estandarización: intake, seguimiento de
casos, control de vencimientos y reportes al cliente siguen fragmentados entre
correos, mensajería y hojas de cálculo. Segmentos prioritarios para A2A:
despachos fiscales medianos-grandes, bufetes multipráctica con visión de
transformación digital y firmas corporativas con volumen de contratos; litigio
es puerta de entrada con módulos acotados de agenda y flujos.

## Por segmento: persona → dolor → oportunidad → front-end

### 1. Fiscal (§3.1, §4.2, §5.2)

- **Persona**: socio fiscal — técnico, reputación consolidada; cuida calidad
  jurídica, riesgo ante autoridades y relación con clientes clave.
- **Dolores**: tiempo perdido en revisar documentos repetitivos; dificultad para
  escalar conocimiento a equipos junior; falta de visibilidad rápida sobre los
  casos con mayor riesgo o urgencia; presión constante de cambios normativos
  (leyes, misceláneas, criterios, jurisprudencia).
- **Condición de adopción**: exige **trazabilidad, fuentes y auditoría** — teme
  a la automatización excesiva y a la confidencialidad. Sin indicadores de
  confianza no adopta.
- **Front-end (§8.2)**: intake guiado de casos, panel de criterios aplicables
  (con nivel de riesgo, referencias y estado de validación humana), alertas y
  línea de tiempo regulatoria, resumen de caso.

### 2. Litigio (§3.2, §4.3, §5.2)

- **Persona**: coordinador de litigio — administra expedientes, asigna casos,
  controla agendas, reporta a socios y clientes.
- **Dolores**: riesgo de perder plazos (un error de calendario es catastrófico);
  sin vista única del pipeline de casos; información procesal dispersa.
- **Disparador de compra**: el volumen de casos y la presión de errores se
  vuelven insostenibles, o el despacho quiere profesionalizarse ante clientes
  corporativos.
- **Front-end (§8.2)**: pipeline por etapas (intake → estrategia → juicio →
  sentencia → ejecución), agenda de audiencias y plazos, checklists por tipo de
  juicio con responsables, comunicación estructurada con clientes.

### 3. Contratos / corporativo-comercial (§3.3, §5.2)

- **Persona**: abogados corporativos de firmas con clientela empresarial, muchas
  veces multijurisdiccional.
- **Dolores**: flujos de revisión/firma/archivado lentos; poca trazabilidad de
  cláusulas y versiones; precedentes sin repositorio útil; coordinación difícil
  entre áreas (mercantil, fiscal, regulatorio).
- **Madurez**: media — usan suites y repositorios, pero sin automatización que
  traduzca conocimiento regulatorio en reglas operativas.
- **Front-end (§8.2)**: intake de operación contractual, generación/revisión de
  cláusulas con riesgos y referencias (aceptar/editar/descartar), versiones y
  aprobaciones (borrador → en revisión → aprobado → firmado), repositorio de
  precedentes con etiquetas.

### 4. Dirección multipráctica (§3.4, §4.4, §5.2)

- **Personas**: socios de bufete multipráctica y gerente de operaciones. El
  gerente es el aliado clave de la automatización: ve el impacto en margen y en
  escalar sin crecer proporcionalmente en plantilla.
- **Dolores**: conocimiento y flujos fragmentados entre áreas; sin métricas
  transversales (casos por área, productividad, facturación, riesgo agregado);
  gobernanza débil sobre datos y documentos.
- **Front-end (§8.2)**: vista 360 del despacho, gestión de departamentos
  operados por el trío Hermes→Ejecutor→Supervisor (activar/pausar, bitácora de
  decisiones), alertas ejecutivas, clientes estratégicos con oportunidades.

## Principios de UI que gobiernan la app (§8.1, §8.3 + prompt §3-§4)

1. **Sobriedad profesional**: los clientes juzgan credibilidad por diseño y
   claridad; usuarios internos toleran densidad (tablas, filtros) pero exigen
   consistencia visual y flujos simples.
2. **Indicadores de confianza en todo output del sistema**: fuente citada,
   disclaimer, estado "validado por humano". Es la condición de adopción del
   socio fiscal y la regla de oro del grafo (nada afirma sin fuente).
3. **Secciones etiquetadas "Hermes" y "Grafo"** para que la conexión conceptual
   con la plataforma sea visible en la UI.
4. **Claridad de estado sobre todo** en litigio: reducir errores de calendario
   es el valor número uno.
5. **Nombres de componente explícitos** (`FiscalCaseIntakeForm`,
   `LitigationPipelineBoard`…) y APIs hipotéticas documentadas como
   integraciones futuras (`fetchFiscalCriteria()`…).

## Lista priorizada de funcionalidades (día 1)

| Prioridad | Avatar | Funcionalidad | Dolor que ataca |
|---|---|---|---|
| 1 | Litigio | Agenda de plazos con alertas | Perder un plazo es catastrófico |
| 2 | Fiscal | Panel de criterios con fuente + validación humana | Confianza; escalar conocimiento a juniors |
| 3 | Litigio | Pipeline único de casos | Sin vista única del estado |
| 4 | Fiscal | Intake guiado | Procesos de entrada manuales y fragmentados |
| 5 | Contratos | Cláusulas con riesgo y referencia | Trazabilidad de cláusulas |
| 6 | Dirección | Panorama 360 con riesgo agregado | Sin métricas transversales |
| 7 | Contratos | Versiones y aprobaciones | Quién aprobó qué |
| 8 | Dirección | Departamentos del trío | Operación agéntica visible y gobernable |

## Decisiones de diseño derivadas (esta app)

- **Color = riesgo, nada más** (decisión C4 de la adenda, resuelta en F1): la
  escala semáforo `--risk-*` es la única codificación por color; plazos van con
  tipografía/posición; validación humana con fichas neutras/acento. Detalle en
  `src/app/tokens.css`.
- **Datos de muestra con costura de integración**: `services/` expone funciones
  asíncronas con la firma de la API futura que hoy resuelven fixtures; la
  procedencia (`mock`) se declara en la UI con una insignia visible.
- **Contrato del grafo reutilizado, no inventado** (C1/C2 de la adenda): los
  tipos de evaluación regulatoria espejean `pre-discovery/grafo.ts` (5 estados,
  fail-safe `dudoso`); "sin cobertura" es un hecho del catálogo estático de
  expertises, no un veredicto del grafo.
