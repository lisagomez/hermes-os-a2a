# Dictamen de frontera: "Financial Consulting" vs LMV/CNBV

> **Fecha**: 2026-08-07 · **Origen**: caso Pre-Discovery de holding de servicios legales
> (notas del intake: expertise "Financial Consulting"). Cierra el último pendiente del
> plan A-D de expansión del grafo.
> **Fuente primaria**: Ley del Mercado de Valores, texto vigente, última reforma DOF
> 14-11-2025 (Art. 225 con párrafo reformado DOF 28-12-2023), leída del PDF oficial de
> Diputados (LeyesBiblio). Cero afirmaciones de memoria.

## La pregunta

¿Ofrecer "Financial Consulting" desde un holding de servicios profesionales pisa una
actividad **reservada** que exige registro/autorización ante la CNBV?

## La frontera (LMV Art. 225)

Es **asesor en inversiones** — y por tanto DEBE registrarse ante la CNBV — quien, sin ser
intermediario del mercado de valores:

1. proporciona **de manera habitual y profesional** servicios de **administración de
   cartera de valores tomando decisiones de inversión a nombre y por cuenta de
   terceros**, o
2. otorga **de manera habitual y profesional asesoría de inversión en valores, análisis y
   emisión de recomendaciones de inversión de manera individualizada**.

Los dos gatillos son acumulativos en sus calificadores: **habitual + profesional +
sobre valores + individualizada** (en el caso de la asesoría). Lo que no reúna esos
elementos no encuadra en el tipo del 225.

## Lo que SÍ cae del lado regulado (requiere registro CNBV)

- Recomendar a clientes específicos comprar/vender acciones, deuda listada, ETFs o
  cualquier "valor" de forma recurrente y remunerada.
- Administrar portafolios de inversión de clientes con facultad de decisión.
- Cobrar por análisis de valores con recomendaciones individualizadas.

**Condiciones del registro que importan al diseño societario del holding** (Art. 225,
párrafo reformado DOF 28-12-2023 y fracciones I-V): la persona moral debe ser sociedad
civil, S.A. o S. de R.L. cuyo **objeto social prevea esas actividades**, con
**establecimientos físicos destinados exclusivamente** a ese objeto, revelación de la
estructura de capital y origen de recursos, y manual de conducta con políticas de
conflictos de interés. Las personas físicas requieren honorabilidad, historial crediticio
satisfactorio y **certificación ante organismo autorregulatorio** reconocido por la CNBV.

→ Consecuencia práctica: **no se puede "agregar" asesoría de inversiones a una sociedad
operativa multi-servicios del holding**. Si el cliente quiere ese servicio, exige un
**vehículo dedicado y registrado**.

En la prestación del servicio aplican además las obligaciones del Art. 226 (mandato o
autorización contractual frente a intermediarios, documentación de operaciones a nombre
del cliente, conservación de recomendaciones) y la cancelación del registro del Art. 227
Bis. La CNBV supervisa también en materia de PLD (transitorios de la reforma).

## Lo que queda del lado NO reservado (financial consulting general)

Con la definición del 225 a la vista, NO encuadran en el tipo (y por tanto no requieren
registro CNBV) mientras no crucen los gatillos:

- Finanzas corporativas: valuación de empresas, estructuración de M&A, due diligence
  financiera (conecta con `CONCENTRACIONES_COFECE` cuando hay adquisición).
- Planeación financiera y presupuestal de negocios; modelado; tesorería.
- Reestructura de deuda y negociación con acreedores (sin intermediar valores).
- Asesoría fiscal-financiera (dimensión fiscal del grafo).
- Educación financiera y análisis **no individualizado** (reportes generales).

## Fronteras VECINAS más duras (no cubiertas por este dictamen — banderas)

- **Captación de recursos del público** (LIC): recibir dinero de clientes para
  gestionarlo/prestarlo sin autorización es territorio de **delito financiero** — si el
  "financial consulting" toca dinero de terceros, dictamen aparte URGENTE.
- **Intermediación de valores** (casa de bolsa) y **fondos de inversión**: autorizaciones
  distintas y más pesadas que el registro de asesor.
- **Fintech** (fondeo colectivo, activos virtuales): Ley Fintech, régimen propio.

## Veredicto

**La etiqueta "Financial Consulting" del lead es, por sí sola, NO CONCLUYENTE** — cubre
un espectro que va de lo libre (finanzas corporativas) a lo reservado (asesoría de
inversiones habitual e individualizada). La frontera es nítida en la ley y **se sembró en
el grafo** (regla `MX-LMV-225-ASESOR-INVERSIONES`, categoría `ASESORIA_INVERSIONES`) para
que el bloque regulatorio la dictamine con fuente en cada caso.

## Preguntas de discovery para el asesor (llevar a la llamada)

1. ¿El servicio financiero incluye **recomendar inversiones concretas** a clientes o
   **administrar su dinero/portafolios**? (Sí → vehículo dedicado + registro CNBV.)
2. ¿Reciben o recibirían **dinero de clientes** para gestionarlo? (Sí → frontera LIC,
   dictamen aparte antes de cualquier otra cosa.)
3. Si es finanzas corporativas puras: ¿emiten opiniones de valor sobre valores listados?
   (Zona gris → documentar el carácter no individualizado.)
