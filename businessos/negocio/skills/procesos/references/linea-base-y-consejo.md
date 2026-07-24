# Línea base y Consejo + reto (limitantes)

Dos piezas obligatorias del diagnóstico. La **línea base** ancla todo el ROI:
sin saber cuánto vale el proceso hoy, el ahorro es una frase sin número. El
**Consejo + reto** cierra el diagnóstico con una recomendación clara y un pase
adversarial honesto de sus límites — "verificar antes de confiar".

---

## Parte A — Línea base: cuánto vale el proceso HOY

La línea base es la valuación del proceso *as-is*: lo que cuesta operarlo hoy,
antes de tocar nada. Es el "antes" contra el que se mide el rediseño. Regla de
oro heredada del taller: **no hay rediseño sin diagnóstico, y no hay diagnóstico
sin datos.** El orden es sagrado.

### Qué medir

- **Volumen:** cuántas veces se corre el proceso al mes (`N`).
- **Tiempo-humano por corrida:** horas activas de persona por corrida (`H_h`).
- **Costo por hora del personal** que hoy lo hace (`costo_hora_op`).
- **Costo de error/retrabajo:** cuánto cuesta cuando algo sale mal y con qué
  frecuencia (aparte del tiempo; a veces es multa, recargo, cliente perdido).

### Cómo se calcula (lo hace el script, determinista)

```
horas_humano/mes  = N × H_h
costo_actual/mes  = horas_humano/mes × costo_hora_op
costo_actual/año  = costo_actual/mes × 12
```

El script `genera_presupuesto.py` emite estas cifras en la hoja
`Linea-base-ROI` (MXN y USD). El gate `linea_base_cuantificada` exige que
`diagnostico.yaml` traiga la línea base con al menos un costo (mensual o anual).

### Qué hacer cuando faltan datos (regla del taller)

- **Tiempo y costo faltantes** → continúa con **rangos conservadores**,
  **documenta los supuestos** y **pide validación**. No te detienes, pero no
  escondes que es un estimado.
- **Descripción del proceso incompleta** → pregunta lo específico que necesitas,
  **máximo 5 preguntas a la vez**.
- **Información contradictoria** → señálala explícitamente. **No construyas la
  línea base sobre datos que no cuadran.**

Toda estimación de la línea base va en `supuestos` del diagnóstico, visible. El
decisor tiene que poder ver qué es dato y qué es supuesto — es lo que hace la
línea base negociable y creíble.

### En el reporte

La línea base es su propia sección ("cuánto vale hoy") y es la base de la
sección de ROI: el ahorro es *línea base − costo después*. Preséntala también
como **tiempo-humano/mes** (no solo dinero): "hoy este proceso consume 300
horas-persona al mes" pega más fuerte que el peso.

---

## Parte B — Consejo + reto (limitantes)

Después del rediseño to-be y antes de la build-spec, el diagnóstico produce dos
cosas juntas, nunca una sola:

### 1. Consejo (la recomendación)
Una recomendación clara y accionable: qué debería hacer el cliente, en qué
orden, y por qué. No es un menú de opciones sin postura — es un consejo con
dueño. Incluye la secuencia recomendada (qué primero) y el resultado esperado
(ligado a la línea base y al ROI).

Si el proyecto pasa por el **Consejo** formal de Hermes OS (la instancia de
decisión, corriente Análisis y planeación), este consejo del diagnóstico es el
insumo y viaja con su `decision_id` → PRP → tarea padre → gasto. El diagnóstico
no reemplaza al Consejo; lo alimenta.

### 2. Reto / limitantes (el pase adversarial)
El reto es la parte honesta: **qué puede hacer que esto falle**. No es decorado
— es un listado explícito de constraints y riesgos. Categorías útiles:

- **Datos/evidencia:** qué se asumió por falta de datos y qué habría que validar.
- **Técnicas:** sistemas legados sin API, integraciones frágiles, calidad de
  datos (lo que el 5S/Seiso encontró).
- **Organizacionales:** resistencia al cambio, dependencia de una persona,
  capacitación necesaria.
- **Regulatorias:** lo fiscal/legal que hay que consultar en el grafo antes de
  automatizar.
- **De alcance/presupuesto:** qué queda fuera, qué sube el costo, qué supuesto
  rompe el número si no se cumple.
- **De reversibilidad:** qué pasos son irreversibles y por tanto exigen gate
  humano.

Regla del taller aplicada: **no validas un proceso deficiente por cortesía.** Si
algo es ineficiente, lo dices — con datos. Si algo funciona bien, también lo
dices. El reto no es pesimismo; es la lista de lo que hay que vigilar para que
el consejo se cumpla.

### En el reporte
Van juntos en la sección "Consejo y retos (limitantes)": primero el consejo
(qué hacer), luego los retos (qué vigilar). El gate `consejo_y_reto` exige que
ambos estén presentes y que el reto **no esté vacío** — un diagnóstico sin
límites declarados es un diagnóstico que no se revisó a sí mismo.

---

## Dónde viven en `diagnostico.yaml`

```yaml
linea_base:
  volumen_mes: 200                 # N corridas/mes
  horas_humano_corrida: 1.5        # H_h
  costo_hora_op_usd: 25
  costo_actual_mensual_usd: 7500   # N × H_h × costo_hora_op (o rango)
  costo_actual_anual_usd: 90000
  costo_error: "Un día de retrabajo por lote mal clasificado; ~1/mes."
  es_estimado: true                # si viene de supuestos, decláralo
  supuestos: ["Costo-hora operativo asumido en 25 USD (a validar)"]

consejo: >-
  Estandarizar la entrada (5S) y automatizar la clasificación de deducibilidad
  con revisión humana de las dudosas; empezar por la estandarización porque sin
  ella la automatización es cara. Resultado esperado: liberar ~85% del tiempo.

reto_limitantes:
  - "Contpaqi sin API pública documentada: validar integración antes de cotizar en firme."
  - "10% de PDFs sin RFC: sin Seiso la clasificación fallará; incluir normalización."
  - "Clasificación fiscal debe citar el grafo; no automatizar el criterio sin fuente."
  - "Contabilizar es irreversible: gate humano obligatorio en las dudosas."
```
