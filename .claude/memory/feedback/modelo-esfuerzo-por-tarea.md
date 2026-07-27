# Seleccion de modelo y esfuerzo por tarea (no dogma de "un solo modelo para todo")

Al delegar trabajo a subagentes o elegir modelo, buscar el PUNTO DULCE calidad/costo, no minimizar
tokens a ciegas.

## Regla de desempate (la filosofia, en una frase)

La calidad va primero; el costo se optimiza SOLO donde no compra calidad real. Si: mismo resultado mas
barato (paso script sin LLM, modelo mecanico para lo mecanico, bajar el esfuerzo del modelo frontera en
vez de subir el del barato cuando eso rinde MAS por menos). No: sacrificar calidad en lo delicado por
ahorro, ni pagar saltos de costo desproporcionados por mejoras marginales.

Reglas:
- Default: Sonnet 5 para el trabajo de campo (investigar, destilar, escribir, scripts). Subir el
  ESFUERZO de Sonnet (low, medium, high, xhigh) segun la complejidad.
- Contexto: 1M de tokens es ESTANDAR en Sonnet 5, Opus (4.8/5) y Fable 5 (verificado contra la
  referencia oficial de la API); solo Haiku 4.5 se queda en 200K. Para contexto muy grande con tarea
  simple: Sonnet 5 (misma ventana, entrada mas barata: $3/M vs $5/M). La idea de que "1M diferencia a
  Opus" ya no aplica: el 1M dejo de ser exclusivo de un tier.
- Si la tarea es compleja o de alto riesgo (decisiones, integracion delicada, correctitud critica):
  Opus esfuerzo alto.
- Si la tarea es de las MAS dificiles (algoritmos, side cases no obvios, contratos multi-modulo):
  Fable 5 (el modelo de mayor razonamiento), esfuerzo low->medium (ver hallazgo de Pareto abajo).
- **Diseño/implementacion, distinguir dos casos:** (a) diseño/escritura ABIERTA (elegir la direccion
  estetica, redactar el texto insignia) es trabajo de Fable; (b) IMPLEMENTAR una direccion YA DADA en
  codigo (maquetar un HTML/CSS/JS con una referencia visual concreta ya elegida) es una tarea de
  codigo, y ahi gana Opus 5 (53.4% en el benchmark de codigo "mergeable" FrontierCode) sobre Fable 5
  (46.3%). Un plan que pide "rediseño de la pagina" con la referencia ya elegida es el caso (b): rutear
  a Opus, no a Fable por defecto.
- NO sobre-limitar a un solo modelo. Un mal resultado es PEOR que gastar mas tokens; si la calidad lo
  exige, subir de modelo o de esfuerzo.
- **Techo de esfuerzo: `xhigh`, NUNCA `max`**, para Opus y Fable 5. No es solo por costo: en benchmark,
  `max` rinde IGUAL O PEOR que `xhigh` en ambos (Opus 4.8: 31.3% vs 34.3%; Fable 44.7% vs 46.3%) costando
  40-60% mas. Respaldo independiente (doc oficial Anthropic sobre el parametro de esfuerzo): "Start with
  `xhigh`... up to `max` only when your evals show measurable headroom"; "`max`... adds significant cost
  for relatively small quality gains... can lead to overthinking." Confirmado con Opus 5 (API oficial de
  Artificial Analysis): `high` ya saca el MEJOR GPQA de toda su escalera (93.7%, empatado con `xhigh`) a
  10.1s de TTFT, mientras `max` tarda 28.7s (~2.8x mas) y en GPQA especifico incluso BAJA a 93.2%; solo
  gana el indice compuesto agregado por 0.6-1.8 puntos.
- **"Maximizar el uso de un modelo caro" NO es volumen, es criterio.** Usarlo bien significa reservarlo
  para los eslabones de juicio (contraste, decisiones, diseño delicado) y NO quemarlo en trabajo
  mecanico (extraccion estructurada, escritura de ingesta) que un modelo barato hace igual. Repartir el
  fan-out por complejidad de tarea, siempre.
- **Ojo con harnesses/pipelines prehechos que generan sus propios subagentes:** por defecto HEREDAN el
  modelo de la sesion principal en todos sus subagentes. Lanzarlos desde una sesion en un modelo
  frontera manda a ese modelo a hacer trabajo mecanico (buscar web, leer, extraer) y quema cuota/costo
  innecesariamente. Antes de lanzar cualquier pipeline de este tipo: verificar el ruteo interno y, si el
  fan-out es mecanico, fijar explicitamente un modelo barato por agente.
- **Animacion/motion es la excepcion a "modelo fuerte planea, manos baratas ejecutan":** el spec del
  motion (peso, timing, easing, "feel") viaja MAL por brief escrito: cada handoff pierde el gusto. Ahi
  el modelo fuerte debe escribir el codigo de motion Y juzgar los resultados el mismo (bucle
  escribir->grabar->revisar->ajustar); se delega solo lo que si viaja bien por texto: buscar
  referencias, medir metricas (fps/timing), generar variantes exploratorias en paralelo, scaffolding.
- **El atacante/verificador de un debate o revision se elige por LENTE, no por potencia; la diversidad
  se compra barata.** El valor de un verificador viene de que no reciba el rationale del proponente, sea
  read-only, y lleve una pregunta escrita, no de su peso. Entre verificadores, la ganancia por modelo es
  marginal y la ganancia por lente (perspectiva distinta) es grande. Un modelo barato con una pregunta
  concreta encuentra defectos reales que el modelo caro que escribio el plan no vio.
- **Para verificacion critica de hechos (donde el error de calibracion es caro):** el modelo con mejor
  perfil de confiabilidad medido (menor tasa de respuestas incorrectas via abstencion, mejor
  sobreconfianza) no es siempre el mas nuevo. Corroborar con un segundo lector de lente distinta antes
  de confiar en una sola pasada, sobre todo si el modelo mas nuevo aun no tiene benchmark independiente
  de calibracion/alucinacion.

## Hallazgo de Pareto por TAREA de codigo (benchmark FrontierCode v1, publico, Cognition)

La intuicion "modelo barato a esfuerzo alto = mas barato" es FALSA medida por tarea (no por token): Fable 5
`med` (41.1% de score @ ~$6/tarea) DOMINA a Opus 4.8 `xhigh` (34.3% @ ~$6.5) y a Sonnet 5 `xhigh`
(34.0% @ ~$7): mas calidad, menos costo. En tareas dificiles densas en razonamiento, bajar el esfuerzo del
modelo frontera gana a subir el esfuerzo del barato. EXCEPCION: trabajo pesado en INPUT (leer repos, muchos
archivos): ahi manda el precio por token (Sonnet 5 $3/M vs Fable 5 $10/M) y sigue ganando Sonnet/Haiku +
destilado.

El leaderboard de este benchmark evoluciona con el tiempo: una version posterior (v1.1) deprecó el subset
"Diamond" usado en la medicion original, y la version vigente hoy muestra a Opus 5 (53.4%) por ENCIMA de
Fable 5 (46.3%) en codigo "mergeable". Revisar el leaderboard publico antes de citar un numero como
definitivo.

Resumen: modelo y esfuerzo se ajustan a la tarea, medidos por costo POR TAREA (no por token) y por score
real (la escalera de esfuerzo NO es monotona). La meta es el mejor resultado al costo que la calidad exige,
no el costo minimo.

## Ruteo por tarea de ESCRITURA (el Pareto de arriba es de CODIGO, esta escala es OTRA)

Dos hechos que cambian el ruteo respecto a codigo:
1. **La escala de escritura NO es la de codigo.** Fable 5 lidera todas las tablas de escritura
   verificadas de la familia (Creative Writing Elo 2156 vs Opus 4.8 1943 vs Sonnet 5 1827; #1 en
   longform con el slop mas bajo; #1 en inteligencia emocional; #1 en preferencia humana). Y "mas
   nuevo" NO es "mejor": una version de Opus supero a la siguiente en varias tablas de escritura.
2. **La economia es otra:** una pieza de escritura son 1-3k palabras, no 100k tokens de tool-calls.
   Costo por 1.000 palabras: Haiku ~$0.007, Sonnet 5 ~$0.014, Opus ~$0.035, Fable ~$0.07. Escalar al
   modelo mas caro para UNA pieza insignia cuesta centavos.

| Tarea de escritura | Modelo | Por que (evidencia) |
|---|---|---|
| Texto emocional profundo / narrativa / pieza insignia | Opus (cuota) default; Fable 5 cuando la pieza DEBE ser la mejor | Opus: profundidad emocional casi-humana. Fable: mejor prosa cruda de la familia, control por frase, continuidad de libro completo; costo por pieza = centavos |
| Copy de venta de alto impacto (landing, propuesta) | Opus | Matiz y persuasion |
| Volumen: variantes, posts rutinarios, borradores, emails | Sonnet 5 (esfuerzo alto default) | Suficiente; en un test medido tuvo MENOS muletillas de IA que Opus |
| Escritura tecnica/estructurada, resumenes, ingesta, documentacion | Haiku 4.5 | Alcanza y sobra; slop bajo; centavos |
| EDICION preservando una voz propia | Cualquier modelo + perfil de voz explicito obligatorio | Un modelo editando sin perfil de voz tiende a "empujar al promedio" y debilitar matices. El perfil de voz importa MAS que el salto de modelo (modelo barato + perfil ~ modelo caro sin perfil) |

Candados anti-slop (aplican a TODO modelo): (a) evitar el paralelismo negativo "no es X, es Y" como
molde repetido (la muletilla de IA #1 medida; una vez por pieza como recurso deliberado esta bien);
(b) evitar em-dash si el estilo de la casa lo pide; (c) cargar siempre el perfil de voz antes de escribir
para una persona/marca especifica.

Advertencias de la evidencia: los benchmarks de escritura son mas ruidosos que los de codigo (el juez
suele ser el mismo modelo evaluando a otros modelos de su familia, sesgo reconocido por los propios
autores de esos benchmarks; varianza alta run-a-run). Diferencias de pocas decenas de puntos = ruido;
gaps grandes = señal. NO existe evidencia solida por modelo para ESPAÑOL (hueco de toda la industria):
pendiente eval ciega propia con un juez humano.

## Mapa resumen por dominio

| Dominio | Gana | Barato que alcanza | Evitar |
|---|---|---|---|
| Razonamiento cientifico cerrado (GPQA) | Opus | Sonnet 5 (un escalon abajo) | Haiku para ciencia dura |
| Matematica de prueba dura | Opus | - | Sonnet/Haiku en mate seria |
| Coding agentico | Fable 5, Opus muy cerca | Sonnet 5 | Haiku para codigo complejo multi-paso |
| Codigo "mergeable" (benchmark de produccion real) | Opus | Sonnet 5 | - |
| Computer use (automatizar navegador/escritorio) | Opus (mejor costo/calidad del tier) | - | Haiku (no automatizar navegador con Haiku) |
| Escritura creativa/emocional | Fable 5 | Sonnet 5 para volumen | Haiku para narrativa |
| Vision/documentos | Opus | Sonnet no mejoro en vision recientemente | Conteo de objetos: todos los modelos fallan aqui |
| Velocidad/latencia | Haiku (sin rival) | Sonnet 5 | Fable y Opus en esfuerzo alto para chat rapido |
| Instrucciones multilingues complejas | Sonnet (sorprende, gana a Opus) | - | Haiku el mas fragil en español |
| Alucinar poco / extraccion factual | Haiku (el que menos alucina medido) | - | Verificar siempre lo mas nuevo hasta tener benchmark independiente propio |

**Ningun modelo es bueno en:** spreadsheets complejos, conteo de objetos en imagenes, OCR critico de
documentos escaneados. Esas tareas llevan verificacion humana o un paso deterministico, no fe ciega en
el modelo.

**Seguridad/cyber/ML/datos sensibles:** verificar la politica de retencion de datos y los clasificadores
de contenido de cada modelo antes de rutear trabajo sensible: algunos modelos tienen clasificadores de
seguridad con falsos positivos documentados que re-enrutan silenciosamente el trabajo, y politicas de
retencion de datos mas largas que otras; para ese tipo de tarea, preferir el modelo con politica de
retencion mas corta y clasificadores mejor calibrados.
