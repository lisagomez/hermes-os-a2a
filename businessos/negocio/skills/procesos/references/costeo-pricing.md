# Costeo, presupuesto y pricing (MXN y USD)

Modelo de referencia para cotizar un proyecto de diagnóstico + implementación
A2A. **Todos los números son valores por defecto configurables**, no precios
oficiales. Ajústalos a la realidad de la consultora y del mercado antes de
comprometer cifras con un cliente. El script `scripts/genera_presupuesto.py`
usa exactamente estas mismas cifras, así que si cambias una, cámbiala en ambos
lados o pasa un `--config` propio.

## Convención de moneda

- La base se define en **USD**. El monto en **MXN = USD × tipo de cambio (TC)**.
- TC por defecto: **18.5 MXN/USD** — es solo referencia. **Confírmalo el día que
  se cotiza**, porque mueve todas las cifras.
- Si la consultora tiene tarifas en pesos que no son una simple conversión,
  puede fijarlas por separado con un `--config`.

## 1. Tarifas por rol (USD/hora)

`Costo` = costo interno de la consultora. `Venta` = costo × (1 + margen), con
margen por defecto **0.35** (35 % sobre costo).

| Rol                                   | Costo | Venta (×1.35) |
|---------------------------------------|------:|--------------:|
| Consultor líder / Arquitecto de procesos IA | 90 | 121.50 |
| Ingeniero de agentes de IA            |   70 |         94.50 |
| Especialista en integración (APIs/datos) | 65 |         87.75 |
| QA / Validación                       |   45 |         60.75 |
| Gestión de proyecto (PM)              |   55 |         74.25 |
| Change management / Adopción          |   50 |         67.50 |

En MXN, multiplica por el TC (p. ej. Consultor líder venta = 121.50 × 18.5 ≈
$2,248 MXN/hora).

## 2. Fases del proyecto y rol responsable

| # | Fase                                  | Rol para costeo                 |
|---|---------------------------------------|---------------------------------|
| 1 | Descubrimiento y diagnóstico (ESOA)   | Consultor líder                 |
| 2 | Diseño de solución A2A                | Consultor líder / Arquitecto    |
| 3 | Implementación (build de agentes)     | Ingeniero de agentes            |
| 4 | Integración de sistemas y datos       | Especialista en integración     |
| 5 | Pruebas y validación                  | QA / Validación                 |
| 6 | Despliegue y adopción                 | Change management               |
| 7 | Soporte / hypercare (post-lanzamiento)| Ingeniero de agentes            |

- **PM** es transversal: se estima como **15 %** de la suma de horas de las
  fases, a tarifa de PM.
- **Herramientas / infraestructura** (LLM, plataforma de agentes, licencias,
  setup): línea aparte, monto fijo por alcance (ver abajo).
- **Contingencia**: **10 %** sobre (mano de obra + herramientas).

## 3. Esfuerzo por alcance (horas por fase)

Elige el alcance según la complejidad del análisis A2A (ver niveles de
complejidad en `metodologia-esoa-5s.md`).

| Fase                         | Chico | Mediano | Grande |
|------------------------------|------:|--------:|-------:|
| 1. Descubrimiento/diagnóstico|    16 |      32 |     60 |
| 2. Diseño solución A2A        |    12 |      28 |     55 |
| 3. Implementación agentes     |    24 |      70 |    160 |
| 4. Integración sistemas/datos |    12 |      40 |    110 |
| 5. Pruebas y validación       |    10 |      28 |     65 |
| 6. Despliegue y adopción      |     8 |      20 |     45 |
| 7. Soporte / hypercare        |     8 |      16 |     40 |
| **Horas de fases**            | **90**| **234** |**535** |
| Herramientas/infra (USD)      |   500 |   1,500 |  4,000 |

**Definición de cada alcance:**

- **Chico:** un proceso, 1–2 pasos automatizados, complejidad baja, 0–1
  integración, un agente. Diagnóstico + automatización acotada.
- **Mediano:** un proceso, 3–5 pasos, complejidad media, 2–3 integraciones,
  coordinación entre ~2 agentes, revisión humana en puntos definidos.
- **Grande:** proceso complejo (o varios), complejidad alta, 4+ integraciones o
  sistemas legados, múltiples agentes coordinados, alto manejo de excepciones o
  regulación.

## 4. Cálculo del presupuesto (fórmula)

```
mano_de_obra   = Σ (horas_fase × costo_rol_fase)
pm             = 0.15 × Σ horas_fase × costo_PM
subtotal       = mano_de_obra + pm + herramientas_infra
contingencia   = 0.10 × subtotal
COSTO          = subtotal + contingencia
PRECIO         = COSTO × (1 + margen)          # margen por defecto 0.35
PRECIO_MXN     = PRECIO × TC
```

### Cifras de referencia (margen 0.35, TC 18.5)

| Alcance  | Costo USD | Precio USD | Precio MXN |
|----------|----------:|-----------:|-----------:|
| Chico    |    ~8,400 |    ~11,300 |   ~209,000 |
| Mediano  |   ~21,700 |    ~29,300 |   ~542,000 |
| Grande   |   ~49,600 |    ~67,000 | ~1,239,000 |

(Redondeadas; el script da el detalle exacto por fase y rol.)

## 5. Modelos de pricing

Elige según cuánta certeza hay sobre el alcance y qué prefiere el cliente:

- **Precio fijo por alcance** (recomendado cuando el diagnóstico ya acotó el
  trabajo): el `PRECIO` de la tabla. Da certeza al cliente y protege el margen
  si estimaste bien.
- **Tiempo y materiales (T&M):** cobras las horas reales a tarifa de **venta**.
  Útil cuando el alcance es incierto; traslada el riesgo al cliente.
- **Diagnóstico como puerta de entrada (paid discovery):** cobra solo la Fase 1
  como servicio de entrada (≈ precio de Fase 1). Baja la barrera y suele ser
  **acreditable** al proyecto si el cliente avanza. Excelente para procesos que
  hoy operan sin A2A y el cliente aún no se compromete.
- **Basado en valor / éxito:** cobras un porcentaje del ahorro anual estimado
  (típico **15–25 %** del ahorro del primer año), o un fee base + variable
  ligado a resultados. Alinea incentivos pero exige medir bien el ROI.
- **Retainer mensual (soporte/optimización continua):** post-implementación,
  **10–15 % del precio del proyecto al mes**, o una bolsa de horas. Cubre
  monitoreo de agentes, ajustes y nuevas excepciones.

Combinación común: *paid discovery* → precio fijo para la implementación →
retainer para el soporte.

## 6. Tiempo humano-agente y ROI

Es la parte que vende el proyecto. Se mide en dos planos:

### a) En la operación (después de implementar) — el argumento de ROI

Parámetros por corrida del proceso:

- `N` = número de corridas al mes.
- `H_h` = horas-humano por corrida **hoy** (as-is).
- `H_s` = horas-humano de **supervisión** por corrida **después** (el humano ya
  no ejecuta, solo revisa/aprueba).
- `costo_hora_op` = costo por hora del personal que hoy hace el trabajo
  (del cliente).

```
ahorro_horas_mes = N × (H_h − H_s)
ahorro_$_mes     = ahorro_horas_mes × costo_hora_op
ahorro_$_año     = ahorro_$_mes × 12
% agente         = (H_h − H_s) / H_h        # del trabajo antes humano, cuánto ejecuta el agente
% humano         = H_s / H_h                # cuánto queda como supervisión
payback_meses    = PRECIO / ahorro_$_mes
ROI_año1         = (ahorro_$_año − PRECIO) / PRECIO
```

**Ejemplo (mediano):** N=200 corridas/mes, H_h=1.5 h, H_s=0.2 h,
costo_hora_op=$25 USD.
- ahorro = 200 × 1.3 × 25 = **$6,500 USD/mes** ≈ $78,000/año.
- Reparto: **~87 % lo ejecutan agentes, ~13 % supervisión humana.**
- Con precio ~$29,300: payback ≈ **4.5 meses**, ROI año 1 ≈ **+166 %**.

Presenta el ahorro también en MXN (× TC) y como *tiempo humano liberado*
(ahorro_horas_mes), que a los decisores les dice más que el dinero.

### b) En la entrega (durante el proyecto) — cómo se reparte el trabajo del build

Cada vez más del build se hace con asistencia de agentes/IA, no a puro humano.
Reporta, por transparencia, el estimado de **horas-humano de consultoría**
(las que se cobran, tabla de esfuerzo) y una nota de que la ejecución se
acelera con herramientas de IA internas. No cobres "horas-agente" de build como
si fueran humanas; el valor está en el resultado y el tiempo de entrega, no en
inflar horas.

## 7. Notas de uso

- Redondea precios al presentar (p. ej. millares) pero conserva el detalle por
  si el cliente pide desglose.
- Haz visibles los supuestos (TC, volumen, tarifas, margen). Un presupuesto sin
  supuestos visibles no se puede negociar.
- Si el cliente pide bajar el precio, negocia **alcance** (menos pasos, menos
  integraciones, fases por etapas), no margen a ciegas.
- Marca blanca: revisa que ninguna tarifa por defecto llegue al cliente sin
  haberse validado.
