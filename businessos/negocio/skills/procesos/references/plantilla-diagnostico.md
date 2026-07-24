# Plantillas del paquete to-be

El Ejecutor deja cuatro artefactos en el worktree. Dos son legibles por máquina
(los gates los parsean): `diagnostico.yaml` y `build-spec.yaml`. Dos son para
humanos: `reporte.md` y `presupuesto.xlsx` (del script). Aquí van las
plantillas de los tres primeros; el esquema de `build-spec.yaml` está en
`disparadores-sdd-skills-cli.md`.

Marca blanca: sustituye `[...]`. El gate `sin_marcadores` rechaza si queda alguno.

---

## `diagnostico.yaml` — estructura legible por máquina

Los gates `estructura_diagnostico`, `esoa_completo`, `cinco_s_aplicado` y
`control_humano_por_automatizacion` dependen de estas llaves. Respétalas.

```yaml
proyecto: comnorte-clasificador-facturas
cliente: "[CLIENTE]"
alcance: mediano                     # chico | mediano | grande
supuestos:                           # si faltó info, decláralo aquí (no lo escondas)
  - "Volumen estimado 1200 facturas/mes (a confirmar)"

linea_base:                          # cuánto vale el proceso HOY (ancla del ROI)
  volumen_mes: 200
  horas_humano_corrida: 1.5
  costo_hora_op_usd: 25
  costo_actual_mensual_usd: 7500     # volumen × horas × costo_hora (o rango)
  costo_actual_anual_usd: 90000
  costo_error: "Un día de retrabajo por lote mal clasificado; ~1/mes."
  es_estimado: true
  supuestos: ["Costo-hora operativo asumido en 25 USD (a validar)"]

pasos_as_is:
  - id: 1
    paso: "Descargar el PDF de la factura del correo"
    responsable: "Auxiliar contable"
    sistema: "Gmail"
    veredicto_esoa: simplificar       # eliminar | simplificar | optimizar | automatizar
    justificacion: "El correo es un handoff manual; se puede recibir en bandeja estándar."
  - id: 2
    paso: "Determinar si el gasto es deducible"
    responsable: "Contador"
    sistema: "Excel + criterio"
    veredicto_esoa: automatizar
    justificacion: "Decisión con reglas fiscales; candidata a agente + grafo."

cinco_s:                              # las cinco, cada una con hallazgo o n/a+razón
  seiri_clasificar: "Se capturan campos que nadie usa (2 columnas del Excel)."
  seiton_ordenar: "Los PDFs viven en correos personales; sin ubicación estándar."
  seiso_limpiar: "RFC falta en ~10% de los PDFs; hay que corregir a mano."
  seiketsu_estandarizar: "Cada proveedor manda formato distinto; sin plantilla."
  shitsuke_disciplina: "Sin validación que sostenga el estándar; se degrada solo."

diseno_a2a:
  - automatizacion: "Clasificación de deducibilidad"
    complejidad: media                # baja | media | alta
    agentes: ["agente-clasificador-fiscal"]
    coordinacion_a2a: "consulta grafo-a2a para la regla fiscal con fuente"
    integraciones: ["Contpaqi API", "grafo"]
    control_humano: "revisar las marcadas 'dudoso' antes de contabilizar"
    manejo_error: "sin regla aplicable → 'dudoso' → escala a humano"

consejo: >-                           # la recomendación (qué hacer, en qué orden)
  Estandarizar la entrada (5S) y luego automatizar la clasificación con revisión
  humana de las dudosas. Empezar por la estandarización; sin ella la
  automatización es cara. Resultado esperado: liberar ~85% del tiempo.

reto_limitantes:                      # el pase adversarial: qué puede hacer que falle
  - "Contpaqi sin API documentada: validar integración antes de cotizar en firme."
  - "10% de PDFs sin RFC: sin Seiso la clasificación falla; incluir normalización."
  - "El criterio fiscal debe citar el grafo; no automatizarlo sin fuente."
  - "Contabilizar es irreversible: gate humano obligatorio en las dudosas."
```

---

## `reporte.md` — el diagnóstico legible (para el decisor)

Prosa profesional con la marca del cliente. Tablas solo donde la comparación lo
pide (ESOA, presupuesto, ROI). Estructura:

```
# Diagnóstico de rediseño de proceso — [Proceso] — [Cliente]
Preparado por [CONSULTORA] · [fecha] · [CONTACTO]

> Si se usaron supuestos por falta de información, decláralos aquí, visibles.

## 1. Resumen ejecutivo
   Autosuficiente, 1 página. Qué encontramos, qué proponemos (rediseño en una
   frase), inversión (rango MXN y USD) y retorno (ahorro anual / tiempo humano
   liberado / payback). El decisor debe poder aprobar leyendo solo esto.

## 2. Proceso actual (as-is)
   Disparador, pasos, responsables, sistemas. Volumen, tiempo y costo actuales.
   Dolores: cuellos de botella, errores, retrabajos y su impacto.

## 2b. Línea base — cuánto vale hoy
   La valuación del proceso as-is: costo actual mensual y anual (MXN y USD) y
   tiempo-humano/mes que consume. Marca qué es dato y qué es supuesto. Es el
   "antes" contra el que se mide todo el ROI. (Cifras del script, hoja
   Linea-base-ROI.)

## 3. Orden y estándar (5S)
   Qué encontramos en la capa de información: clasificación, orden, limpieza,
   estandarización y qué sostiene (o no) el estándar. Qué hay que estandarizar
   antes de automatizar.

## 4. Análisis ESOA
   Tabla paso × veredicto × justificación. El proceso rediseñado to-be.

## 5. Solución A2A propuesta
   Agentes, coordinación A2A, integraciones, complejidad y —explícito— el punto
   de control humano de cada automatización. Manejo de error.

## 6. Alcance y plan
   Alcance elegido y por qué. Fases, entregables, cronograma, supuestos, y qué
   NO incluye.

## 7. Inversión (presupuesto y pricing)
   Presupuesto por fase y rol (del script), MXN y USD. Modelo de pricing
   propuesto y por qué. Precio como rango con supuestos visibles (TC, margen).

## 8. ROI y tiempo humano-agente
   Antes vs después: horas-humano/mes hoy vs horas-agente + supervisión. Ahorro
   mensual/anual (MXN y USD), tiempo humano liberado, reparto humano-agente y
   payback. El argumento de venta: resultado, no horas.

## 9. Consejo y retos (limitantes)
   El consejo: la recomendación clara (qué hacer, en qué orden, resultado
   esperado ligado a la línea base). Los retos: el pase adversarial honesto —
   constraints técnicas, de datos, organizacionales, regulatorias, de alcance y
   de reversibilidad. No validar por cortesía; el reto no va vacío.

## 10. Qué se construye (resumen de la build-spec)
   Lista legible de las automatizaciones a construir, quién las construye (depto
   destino), qué skills/CLIs requieren, con qué stack, y dónde queda el control
   humano. El detalle máquina va en build-spec.yaml.

## 11. Siguientes pasos
   Un solo call-to-action (típico: aprobar el diagnóstico para disparar la
   construcción). Qué se necesita del cliente y en qué plazo.
```

---

## `build-spec.yaml`

Esquema y mecánica de disparo en `disparadores-sdd-skills-cli.md`. Es el
contrato que Hermes-Negocio lee, tras aprobación humana, para encolar la
construcción (SDD / Skills / CLIs) al departamento destino.
