---
name: adquisicion-transcripcion
description: >-
  Activo Digital del departamento de Adquisición de Clientes (Hermes OS · A2A, Fase 9). Puente
  determinista de speech-to-text que transcribe la entrevista de descubrimiento (Hito 3 del pipeline de
  EG.CRM) —visita o llamada— y deja la transcripción con marcas de tiempo anclada a la fila del lead
  (hablantes solo si el motor los distingue: el motor real groq/whisper NO diariza), sin pasar por un LLM (cero tokens por consulta, patrón grafo-a2a/ventas-a2a). Usa este skill
  siempre que haya audio de una entrevista/llamada que transcribir, o cuando alguien pida "transcribir la
  entrevista", "pasar el audio a texto", "speech to text" o "minuta de la llamada", aunque no se nombre.
tipo_activo: Activo Digital
objetivo: >-
  Convertir el audio del descubrimiento en una transcripción fiel y con tiempos (atribución por
  hablante solo cuando el motor diariza; groq/whisper no lo hace), lista para que el diagnóstico la
  cruce — de forma determinista y sin gastar tokens de modelo.
---

# Adquisición · Transcripción (speech-to-text)

**Activo Digital:** Transcripción de la entrevista de descubrimiento.
**Objetivo:** convertir el audio en texto fiel con marcas de tiempo, anclado al lead y listo para el diagnóstico. La atribución de hablantes depende del motor: el real (groq/whisper) no diariza y cada tramo sale como `Voz`.

## Encuadre en Hermes OS (ROADMAP)

- **Puente determinista, cero tokens LLM.** Igual que `grafo-a2a` y `ventas-a2a`: la superficie es exactamente **{card, rpc, /health}**, la conversión audio→texto la hace un motor STT, no un modelo de lenguaje. *(Eficiencia por routing: esto ni siquiera toca un LLM.)*
- **Fidelidad, no interpretación.** Transcribe lo dicho; **no** resume, opina ni completa. El análisis es tarea de otro skill. *(Citar fuentes, no inventar: la transcripción ES la fuente.)*
- **Persistencia con escritor único.** La transcripción se guarda ligada al `lead_id`; si el guardado falla, la tarea sale `failed` reintentable. *(Verificar antes de confiar.)*
- **Aislar, no fundir:** servicio acotado; solo transcribe.

## Entradas

Audio de la entrevista (visita o llamada), `lead_id`, identidad del **asesor** (metadato de la fila; el motor real no diariza), idioma (por defecto es-MX).

## Proceso

1. **Recibe el audio** por el rpc del servicio (o referencia al archivo en el volumen).
2. **Transcribe con el motor STT**, con **marcas de tiempo**. Diarización solo si el motor la da: el mock la simula (asesor/cliente); el motor real (groq/whisper-large-v3) **no diariza** y todo tramo sale como `Voz` — degradación aceptada en la Adopción 1 del PRP Makeflowia, no se finge.
3. **Marca incertidumbre:** segmentos de baja confianza se etiquetan `[inaudible]` o `[?]` en vez de adivinar.
4. **Persiste** la transcripción anclada al `lead_id` y devuelve el artifact.

## Salida — Transcripción (formato fijo)

```
# Transcripción — Descubrimiento [Empresa]
Lead: [lead_id] · Modalidad: [visita|llamada] · Idioma: es-MX
Confianza global: [alta|media|baja]

[00:00] Asesor: ...
[00:14] Cliente: ...
[01:02] Cliente: ... [inaudible]

> Transcripción literal. Sin resumen ni interpretación.
```

## Reglas

- **Nada de invención:** lo dudoso se marca, no se completa.
- **Sin LLM en la ruta de conversión:** si el patrón lo exige, el motor STT es la única dependencia; se preserva el cero-tokens.
- **Privacidad:** el audio y la transcripción viven en el volumen del lead. Con el motor mock nada sale del perímetro; con `STT_ENGINE=groq` el audio **sí viaja a api.groq.com** para transcribirse — activar ese motor es **decisión de la dueña**, previa verificación de la política de retención de datos de Groq (ZDR o equivalente) para la cuenta usada.

## Método diio aplicado ("Guía de supervivencia para vender con IA")

- **Etiqueta el tipo de reunión** (discovery / demo / negociación / revisión técnica / cierre): *"la AI mejora mucho cuando sabe qué tipo de interacción está analizando"* (diio, cap. 7). Va como metadato del artifact.
- **Conserva quién habla y cuándo** cuando el motor lo permite: aguas abajo importa "quién mueve la conversación". Con el motor real (sin diarización) los skills consumidores (`adquisicion-coaching-asesor`, `adquisicion-diagnostico-factibilidad`) reciben tramos `Voz` sin atribución — deben tratar la atribución como **no disponible**, nunca adivinarla; recuperarla (pyannote u otro diarizador) es un gate futuro de la dueña.
- **Campos operables a marcar** para el diagnóstico (diio, cap. 13, la conversación "trabajada", no solo registrada): dolores, presupuesto, riesgos, competidores, stakeholders, compromisos, próximos pasos y señales. Aquí solo se **marcan/anclan** en el transcript; interpretarlos es tarea de los skills siguientes.
- **Salida multi-audiencia opcional** (práctica 10): de un mismo transcript, derivar nota CRM + resumen para el líder + nota de "qué falta validar", cada una priorizando lo que importa a esa audiencia — sin dejar de ser fiel al literal.

## Integración

Corre en paralelo con `adquisicion-entrevista-dinamica`. Su salida es insumo directo de `adquisicion-diagnostico-factibilidad` y de `adquisicion-coaching-asesor`.

---
*Método basado en "Guía de supervivencia para vender con IA" (diio.com), CC BY-SA 4.0.*
