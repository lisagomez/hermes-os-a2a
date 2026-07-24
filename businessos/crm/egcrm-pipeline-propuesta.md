# EG.CRM — Propuesta de Pipeline de CRM Dinámico Multicanal

**Proyecto:** EG.CRM · Pipeline de captación, calificación y cierre de prospectos
**Preparado para:** a2aTeam
**Fecha:** 23 de julio de 2026
**Versión:** 1.0 (borrador para revisión)

---

## 1. Resumen ejecutivo

Esta propuesta describe el diseño de un **pipeline de CRM dinámico** para EG.CRM, orientado a la **captación multicanal de prospectos** y a su avance a través de un proceso de ventas asistido por agentes de IA (**A2A**, agent-to-agent).

El pipeline resuelve cuatro necesidades centrales:

1. **Captación desde múltiples canales** — QR, WhatsApp Business (WAB), chat de página web, landing pages, redes sociales, referidos, llamadas y email/formularios.
2. **Panel de habilitación de canales** operado por humanos, para encender/apagar y configurar cada fuente de captación.
3. **Etiquetado automático de cada lead** con su canal de origen, para trazabilidad de punta a punta.
4. **Medición de conversión por canal**, con KPIs comparativos que permiten optimizar la inversión en cada fuente.

Sobre esa base corre un **flujo de 7 hitos**, en el que agentes A2A automatizan pre-descubrimiento, entrevistas, análisis de factibilidad, generación de propuestas y contratos, mientras el equipo humano conserva el control en los puntos de decisión (habilitación de canales, consenso de procedencia, aprobación del proyecto).

> **Nota de lectura.** Los elementos marcados como _(sugerido)_ son valores propuestos por defecto para su validación; pueden ajustarse sin alterar la arquitectura del pipeline.

---

## 2. Principios de diseño

- **Dinámico y configurable.** Canales, etapas y estatus se administran desde paneles; no están "quemados" en el código.
- **Humano en el centro de las decisiones.** La IA prepara, analiza y propone; los humanos habilitan canales, votan la procedencia y aprueban proyectos.
- **Trazabilidad total del origen.** Todo lead nace etiquetado con su canal, campaña y fecha, de modo que cada conversión sea atribuible.
- **A2A como capa de aceleración.** Los agentes automatizan investigación, transcripción, diagnóstico y documentación, reduciendo el trabajo manual del asesor.
- **Datos de contacto mínimos garantizados.** Todo prospecto incluye **correo electrónico** y **número de WhatsApp Business (WAB)** como campos obligatorios.

---

## 3. Panel de habilitación de canales (administración humana)

Panel operado por el equipo para **activar, desactivar y configurar** las fuentes de captación. Cada canal es un módulo independiente que puede encenderse o apagarse sin afectar al resto.

### 3.1 Canales soportados

| Canal | Descripción | Etiqueta de origen |
|---|---|---|
| **QR** | Códigos QR en material físico/digital que dirigen a un formulario o a WAB. | `qr` |
| **WhatsApp Business (WAB)** | Conversaciones entrantes por WhatsApp Business. | `wab` |
| **Chat de página web** | Widget de chat en el sitio web. | `chat_web` |
| **Landing page** | Formularios de aterrizaje de campañas. | `landing` |
| **Redes sociales** | Facebook / Instagram (Meta Ads, DMs) y TikTok. | `redes_sociales` |
| **Referidos** | Prospectos referidos / boca a boca. | `referido` |
| **Llamadas** | Entradas telefónicas directas. | `llamada_inbound` |
| **Email / formularios** | Campañas de email y formularios de contacto genéricos. | `email_formulario` |

### 3.2 Controles por canal

Para cada canal, el panel permite configurar:

- **Encendido / apagado** (activo, inactivo).
- **Responsable asignado** (agente o equipo que recibe los leads de ese canal).
- **Parámetros del canal** (ej. URL de la landing, número de WAB, token del widget, cuenta de red social, código de campaña).
- **Reglas de enrutamiento** — a qué asesor o bandeja llega el lead (round-robin, por zona, por producto). _(sugerido)_
- **Estado de salud** — indicador de si el canal está recibiendo leads correctamente. _(sugerido)_

### 3.3 Etiquetado automático del lead

Al entrar por cualquier canal, el lead se crea **automáticamente etiquetado** con:

- `origen_canal` — canal de captación (ver tabla anterior).
- `campana` — campaña o material específico (opcional).
- `fecha_captacion` — timestamp de entrada.
- `agente_asignado` — según reglas de enrutamiento.

Esta etiqueta acompaña al lead durante **todo** el pipeline y es la base de la medición de conversión por canal (sección 6).

---

## 4. Ficha de Contacto (prospecto)

Datos base del prospecto, capturados desde el primer contacto:

| Campo | Obligatorio | Notas |
|---|---|---|
| Nombre del prospecto | Sí | — |
| Empresa | Sí | Razón social o nombre comercial. |
| **Número de WhatsApp Business (WAB)** | **Sí** | Campo obligatorio del contacto. |
| **Correo electrónico** | **Sí** | Campo obligatorio del contacto. |
| Teléfono | Opcional | Si es distinto del WAB. |
| Página web / redes sociales | Opcional | URLs; alimentan el pre-descubrimiento A2A. |
| `origen_canal` | Sí (auto) | Etiqueta de canal. |
| Estatus del lead | Sí (auto) | Estado en el pipeline. |
| Agente asignado | Sí (auto) | Responsable. |

---

## 5. Pipeline — Hitos y estatus

El pipeline avanza en **7 hitos**. Cada uno tiene sus propios estatus y, en varios, un agente **A2A** que acelera el trabajo.

### Vista general del flujo

```
[1] CONTACTO
     │  (datos + WAB + correo + etiqueta de canal)
     ▼
[2] LLAMADA (agendado)
     │  Pendiente de agendar → Agendada → Realizada / Cancelada / Reprogramada
     │  Al agendar: captura datos + dispara A2A pre-descubrimiento
     ▼
[3] DESCUBRIMIENTO (visita o llamada)
     │  A2A: entrevista dinámica + speech-to-text
     │  → Evaluación de Factibilidad
     ▼
[4] EVALUACIÓN DE PROCEDENCIA (consenso humano, mayoría simple)
     │  Pendiente / Factible (Prioritario · En espera) /
     │  Puede ser factible / No factible → Reconsiderar más adelante
     ▼  (si Factible + Prioritario)
[5] ANÁLISIS DE PROCESO A PROFUNDIDAD
     │  ¿El proceso existe? → No: feature simple/compleja
     │                        Sí: llamada de descubrimiento profundo + A2A
     │  → Informe de Análisis (con gráficas)
     ▼
[6] PROPUESTA COMERCIAL
     │  A2A genera Propuesta + Cotización + Contrato DNA
     │  → envío al cliente por WAB + correo
     ▼
[7] ENTREGA, RETROALIMENTACIÓN, AJUSTE Y APROBACIÓN
     │  Si se aprueba → paquete → firma de contrato + anticipo
     ▼
   GANADO ✔
```

---

### Hito 1 — Contacto

Punto de entrada del prospecto desde cualquier canal habilitado.

- Se crea la **ficha de contacto** (sección 4) con **WAB** y **correo** obligatorios.
- El lead entra **etiquetado con su canal de origen** de forma automática.
- Se asigna agente según las reglas de enrutamiento del canal.

**Estatus:** `Nuevo lead` → `Contactado`.

---

### Hito 2 — Llamada

La llamada debe quedar **agendada**. El estatus refleja su ciclo de vida:

| Estatus | Significado |
|---|---|
| `Pendiente de agendar` | La llamada aún no tiene fecha/hora. |
| `Agendada` | Hay fecha/hora confirmada. |
| `Realizada` | La llamada se llevó a cabo. |
| `Cancelada` | Se canceló. |
| `Reprogramada` | Se movió a nueva fecha/hora. |

**Regla de vencimiento.** Si llega la fecha/hora agendada y la llamada **no se cumplió**, el sistema pregunta si se desea reagendar, con **dos opciones**:

- **Reagendar** → solicita nueva fecha → vuelve a `Agendada` (marcada como `Reprogramada`).
- **Cancelar** → pasa a `Cancelada`.

```
Llamada
 ├─ Sin fecha ─────────────► [Pendiente de agendar]
 └─ Con fecha ─► [Agendada] ─┬─► se realiza ───────► [Realizada]
                             ├─► se cancela ───────► [Cancelada]
                             └─► vence sin cumplir ─► ¿Reagendar?
                                                       ├─ Reagendar ─► [Reprogramada] → [Agendada]
                                                       └─ Cancelar ──► [Cancelada]
```

**Al momento de AGENDAR** (estado `Agendada`) se recopilan datos y se dispara el pre-descubrimiento A2A:

**Datos capturados:**

- **Agente que atiende** al cliente.
- **Prospecto:** nombre del cliente, **empresa**, **WAB**, y **página web / redes sociales** (si tiene).

**Integración A2A — Pre-descubrimiento (scraping):**

Se dispara un agente A2A que realiza una **búsqueda preliminar** del cliente y genera una **Página / Ficha de Inteligencia del prospecto** para revisión humana **antes** de la llamada, con:

- **Giro / tema** — a qué se dedica el cliente.
- **Dolores identificados** — pain points detectados por el A2A con base en su análisis.
- **Puntos de abordaje** — posibles ángulos para conducir la llamada.

> **Regla de datos faltantes _(sugerido)_.** Si el prospecto no tiene URL de web/redes, el A2A intenta la búsqueda por **nombre de empresa + WAB**; si no obtiene suficiente información, la ficha queda **parcial** y la llamada puede proceder igual.

---

### Hito 3 — Descubrimiento

Entrevista de descubrimiento, alimentada por la ficha de pre-descubrimiento.

**Modalidad:** puede realizarse por **1) Visita** o **2) Llamada**.
**Captura:** nombre del **asesor** que atiende.

**Intervención A2A durante el descubrimiento:**

- **Generador dinámico de entrevista** — arma la guía de preguntas adaptada a cada prospecto (usando la ficha de pre-descubrimiento), para conducir la conversación asesor–cliente con **tono cordial de vendedor**.
- **Speech-to-text** — transcribe la entrevista en tiempo real.
- **Cruce de información** — combina la transcripción con la ficha de pre-descubrimiento para generar el diagnóstico.

**Entregable → Evaluación de Factibilidad de Cliente Prospecto**, que incluye:

- FODA
- Factibilidad
- Tiempo de ejecución
- Propuesta de fases de implementación
- Escalabilidad
- Alianza estratégica B2B
- Costo de implementación propuesta

```
[Descubrimiento] (Visita ó Llamada) ─ captura: asesor
   ├─ A2A genera guía de entrevista dinámica (tono cordial de vendedor)
   ├─ A2A speech-to-text ──► transcripción
   └─ A2A cruza transcripción + ficha pre-descubrimiento
                                   ▼
                 [Evaluación de Factibilidad de Cliente Prospecto]
```

---

### Hito 4 — Evaluación de Procedencia (Consenso)

Con la Evaluación de Factibilidad en mano, se habilita una **votación por consenso (votos de humanos)** para dictaminar la procedencia del proyecto.

- **Método de consenso:** **mayoría simple**.
- **Votantes _(sugerido)_:** asesores + gerencia / comité.

**Estatus de procedencia:**

| Estatus | Significado |
|---|---|
| `Pendiente` | Aún sin dictamen. |
| `Factible` | Procede. Requiere sub-estatus de priorización. |
| `Puede ser factible` | Procede con reservas / requiere más información. |
| `No factible` | No procede en este momento → `Reconsiderar más adelante`. |

**Si es `Factible`**, se agrega sub-estatus de priorización:

- `Prioritario`
- `En espera`

**`No factible`** no se cierra como perdido: pasa a **`Reconsiderar más adelante`** (archivo de reactivación futura, no sale del CRM).

```
Votación (mayoría simple)
   ├─ [Factible] ─► [Prioritario] / [En espera]
   ├─ [Puede ser factible]
   ├─ [Pendiente]
   └─ [No factible] ─► [Reconsiderar más adelante]  (reactivable)
```

---

### Hito 5 — Análisis de Proceso a Profundidad

Se activa para proyectos **`Factible` + `Prioritario`**. Primero se identifica: **¿el proceso del cliente ya existe o no existe?**

**Rama A — El proceso NO existe** → se evalúa el proyecto para clasificarlo:

- `Feature simple`
- `Feature compleja`

**Rama B — El proceso SÍ existe** → se agenda **otra llamada de descubrimiento a mayor profundidad** (reutiliza el ciclo de Llamada del Hito 2) y se habilita un **A2A** que activa la información del cliente y **adapta preguntas más enfocadas** para levantar el detalle del proceso:

- Qué tan **manual** es el proceso.
- Si se puede **agentizar**.
- Qué **herramientas** usa actualmente.
- Qué **conectores externos** usa y sus **restricciones**.
- **Restricciones legales**.
- **Infraestructura**.
- **Escalabilidad**.
- Qué es lo que **realmente quiere** el cliente vs. qué es lo **realmente alcanzable**.
- **Costo–beneficio** — qué beneficio se le da al cliente si se cambia su proceso.
- **Medición y mitigación de riesgo**.
- **Plan de contingencia** — qué pasa si por alguna razón no se pueden activar los agentes.

```
[Análisis de Proceso] ── ¿El proceso existe?
   ├─ NO existe ─► Evaluar proyecto ─► [Feature simple] / [Feature compleja]
   └─ SÍ existe ─► Llamada de descubrimiento a profundidad (ciclo de Llamada)
                     └─ A2A adapta preguntas enfocadas
```

**Entregable → Informe de Análisis**, con:

- **Análisis** del proceso
- **FODA**
- **Factibilidad**
- **Costo–beneficio** (con **gráficas**)
- **Análisis de eficiencia actual vs. eficiencia propuesta** — comparativa en **tiempo–costo** (con **gráficas**)
- **Mitigación de riesgos**
- **Alcances**
- **Fases de implementación**

> Este Informe de Análisis es el sustento del paquete comercial: **el descubrimiento profundo alimenta la Propuesta (Hito 6)**.

---

### Hito 6 — Propuesta Comercial (Paquete + Contrato DNA)

Con el Informe de Análisis listo, se define la **modalidad de contacto** (¿llamada o visita?, reutilizando el ciclo del Hito 2) y se habilita un **A2A** que despliega el **paquete comercial**:

- **Propuesta**
- **Cotización**
- **Contrato preliminar "DNA"**, que incluye:
  - Alcances
  - Asesoría e implementación **"Done With You"**
  - Manejo de incidencias
  - Responsabilidad limitada
  - Escalabilidad
  - Próximos pasos

**Envío del paquete al cliente** por **WhatsApp Business (WAB)** + **correo electrónico**.

**Estatus de seguimiento del paquete _(sugerido)_:**

`Enviado` → `En revisión por el cliente` → `Aceptado` / `Rechazado` / `En negociación`

```
[Factible + Prioritario]
   ├─ ¿Llamada o Visita? ──► recorre ciclo de Llamada (Hito 2)
   └─ A2A genera PAQUETE: Propuesta + Cotización + Contrato DNA
                    ▼
        Envío al cliente ──► WAB + Correo electrónico
```

---

### Hito 7 — Entrega, Retroalimentación, Ajuste y Aprobación

Cierre del ciclo con el cliente:

1. **Entrega** del informe / propuesta.
2. **Retroalimentación** del cliente.
3. **Ajuste** según observaciones.
4. **Aprobación del proyecto.**

**Si se aprueba** → se **genera el paquete** y se entrega al cliente para **firma de contrato** + **anticipo**.

```
[Informe de Análisis] ─► Entrega ─► Retroalimentación ─► Ajuste ─► ¿Aprobado?
                                                                      │
                                              ┌───────────────────────┴─────────┐
                                              ▼                                  ▼
                                        NO ► vuelve a Ajuste            SÍ ► Genera paquete
                                             / retroalimentación             ─► Firma de contrato
                                                                             ─► Anticipo ✔ (GANADO)
```

**Estatus de cierre _(sugerido)_:** `Ganado` al confirmar anticipo · `Perdido` con motivo estandarizado.

---

## 6. Medición de conversión por canal

Como cada lead está **etiquetado con su canal de origen**, todos los KPIs pueden **desglosarse por canal** y compararse entre fuentes.

### 6.1 KPIs principales

| KPI | Definición | Objetivo |
|---|---|---|
| **Leads captados por canal** | Nº de leads generados por cada canal en un periodo. | Volumen de captación. |
| **Tasa de conversión por etapa** | % de leads que avanza de un hito al siguiente, por canal. | Detectar cuellos de botella. |
| **Tasa de conversión global por canal** | % de leads que llega a `Ganado`, por canal. | Rentabilidad del canal. |
| **Tasa de agendado** | % de leads que pasa a `Agendada` (Hito 2). | Calidad del primer contacto. |
| **Tasa de factibilidad** | % de descubrimientos con dictamen `Factible`. | Calidad del lead por canal. |
| **Tiempo por etapa** | Días promedio en cada hito, por canal. | Velocidad del pipeline. |
| **Costo por lead (CPL)** | Inversión del canal ÷ leads captados. _(si hay pauta)_ | Eficiencia de gasto. |
| **Costo por adquisición (CAC)** | Inversión del canal ÷ proyectos ganados. _(si hay pauta)_ | Retorno por canal. |

### 6.2 Embudo comparativo por canal

Cada canal se mide como un embudo independiente, lo que permite comparar dónde pierde o gana cada fuente:

```
Canal → Leads → Contactados → Agendados → Descubrimiento →
        Factibles → Prioritarios → Propuesta → Ganados
```

Ejemplo de tablero comparativo (estructura, datos ilustrativos):

| Canal | Leads | Agendados | Factibles | Ganados | Conv. global |
|---|---|---|---|---|---|
| WAB | — | — | — | — | —% |
| Landing | — | — | — | — | —% |
| QR | — | — | — | — | —% |
| Chat web | — | — | — | — | —% |
| Redes sociales | — | — | — | — | —% |
| Referidos | — | — | — | — | —% |
| Llamadas | — | — | — | — | —% |
| Email / formularios | — | — | — | — | —% |

> Recomendación: acompañar este tablero con **gráficas de embudo por canal** y una **gráfica de barras de conversión global** para lectura rápida.

---

## 7. Modelo de datos (resumen)

Entidades principales y sus campos clave:

**Lead / Contacto**
`id`, `nombre`, `empresa`, `wab` (obligatorio), `correo` (obligatorio), `telefono`, `web_redes`, `origen_canal`, `campana`, `fecha_captacion`, `agente_asignado`, `estatus_pipeline`.

**Canal**
`id`, `nombre`, `activo` (on/off), `responsable`, `parametros`, `reglas_enrutamiento`, `estado_salud`.

**Llamada**
`id`, `lead_id`, `agente`, `fecha_hora`, `modalidad` (llamada/visita), `estatus` (Pendiente de agendar / Agendada / Realizada / Cancelada / Reprogramada), `resultado`.

**Ficha de Inteligencia (A2A pre-descubrimiento)**
`lead_id`, `giro`, `dolores`, `puntos_abordaje`, `estado` (completa/parcial), `fuentes`.

**Evaluación de Factibilidad**
`lead_id`, `foda`, `factibilidad`, `tiempo_ejecucion`, `fases`, `escalabilidad`, `alianza_b2b`, `costo_implementacion`, `transcripcion_id`.

**Dictamen de Procedencia**
`lead_id`, `votos`, `resultado` (Pendiente / Factible / Puede ser factible / No factible), `sub_estatus` (Prioritario / En espera), `metodo` (mayoría simple).

**Informe de Análisis**
`lead_id`, `proceso_existe` (sí/no), `tipo_feature` (simple/compleja), `foda`, `costo_beneficio`, `eficiencia_actual_vs_propuesta`, `mitigacion_riesgos`, `alcances`, `fases`, `graficas`.

**Paquete Comercial**
`lead_id`, `propuesta`, `cotizacion`, `contrato_dna`, `canal_envio` (WAB/correo), `estatus_seguimiento`.

**Cierre**
`lead_id`, `aprobado` (sí/no), `contrato_firmado`, `anticipo`, `estatus_final` (Ganado / Perdido), `motivo`.

---

## 8. Capa de agentes A2A (resumen)

| Agente A2A | Hito | Función |
|---|---|---|
| **Pre-descubrimiento (scraping)** | 2 | Investigación preliminar del prospecto → Ficha de Inteligencia (giro, dolores, puntos de abordaje). |
| **Entrevistador dinámico** | 3 | Genera guía de entrevista adaptada, tono cordial de vendedor. |
| **Speech-to-text** | 3 | Transcribe la entrevista en tiempo real. |
| **Diagnóstico de Factibilidad** | 3 | Cruza transcripción + ficha → Evaluación de Factibilidad. |
| **Descubrimiento profundo** | 5 | Adapta preguntas enfocadas al proceso → Informe de Análisis (con gráficas). |
| **Generador de paquete** | 6 | Arma Propuesta + Cotización + Contrato DNA y envía por WAB/correo. |

---

## 9. Puntos abiertos para validación

Estos elementos están marcados como _(sugerido)_ en el documento y conviene confirmarlos:

1. **Estatus de seguimiento del paquete** (Hito 6): ¿Enviado → En revisión → Aceptado/Rechazado/En negociación?
2. **Votantes del consenso** (Hito 4): ¿asesores + gerencia/comité? ¿quórum mínimo?
3. **Resultado/outcome de la llamada** `Realizada` (Hito 2): ¿se registra interesado/no interesado/no contestó/seguimiento?
4. **Sincronización de calendario** para agendados: ¿Google Calendar / Outlook o solo interno?
5. **Reglas de enrutamiento** de leads por canal (round-robin, por zona, por producto).
6. **Etapa de cierre**: definición de `Ganado` (anticipo confirmado) y catálogo de motivos de `Perdido`.

---

_Documento de trabajo — EG.CRM. Los apartados marcados como (sugerido) son propuestas por defecto para ajuste del equipo._
