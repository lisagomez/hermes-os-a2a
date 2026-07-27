# Mapa de capacidades de la familia Claude (fortalezas y debilidades por modelo y dominio)

> Investigacion dedicada de 6 frentes (razonamiento, agentico, vision/contexto/velocidad,
> confiabilidad/debilidades, escritura, doc oficial+precios).
> Proposito: exprimir cada modelo Claude usandolo donde es diferencialmente mejor y evitandolo
> donde falla, para rutear tareas al modelo correcto en vez de usar uno solo por defecto.
> Etiquetas: [V]=vendor (Anthropic, marketing), [I]=independiente verificado, [3o]=agregador no verificado.
> ADVERTENCIA GENERAL: los modelos son recientes (Sonnet 5 y Fable 5 de jun-2026, Opus 5 de jul-2026);
> muchos benchmarks no los cubren aun, hay conflictos entre fuentes (reportados, no resueltos), y parte
> de lo medido como "Fable 5" puede ser Opus 4.8 respondiendo via fallback de clasificadores.
> Revisar/refrescar ~trimestral.
>
> **Opus 5 releva a Opus 4.8 como flagship** (lanzado 2026-07-24, mismo precio $5/$25). Investigado con
> el mismo esquema de 6 frentes. Opus 4.8 SIGUE DISPONIBLE (no deprecado). Hallazgo que cambia el ruteo:
> Opus 5 domina computer use y sube el techo de "inteligencia compuesta", pero NO hereda automaticamente
> el rol de "verificador de confianza" (su propio system card admite una posible regresion de
> alucinacion factual y se contradice en calibracion). Detalle en la seccion 2 (perfil "Opus 5"). Es de
> dia de lanzamiento: varios benchmarks independientes (eqbench, lmarena, METR, HHEM) aun no tienen fila
> para Opus 5; recontactar en 2-3 semanas.
>
> **Verificacion directa en artificialanalysis.ai/models y openrouter.ai/rankings** (paginas propias de
> cada modelo, no agregadores). Refina cifras con numeros exactos de rango (de 190/586 modelos) y agrega
> un eje nuevo: fiabilidad EN PRODUCCION via OpenRouter (uptime, tasa de error de salida estructurada),
> distinto de los benchmarks de laboratorio.

## 1. Tabla maestra: quien gana en cada dominio

| Dominio | #1 familia | #2 | Barato que alcanza | NO usar | Confianza |
|---|---|---|---|---|---|
| Razonamiento cientifico cerrado (GPQA) | Opus 5 (93.7 [I] AA) ~ Opus 4.8/4.7 (~94 [V]) | Fable 5 (92.6) | Sonnet 5 (78, un escalon abajo) | Haiku (67) para ciencia dura | Media (vendor/AA, saturado; Opus 5 no muestra mejora medible sobre 4.8) |
| Matematica de prueba dura (USAMO/FrontierMath) | Opus 4.8 (USAMO 96.7 [3o]) | - | NO: brecha de 17 pts vs Sonnet 5 (79.5); Opus 5 SIN dato en USAMO/FrontierMath aun | Sonnet/Haiku en mate seria | Baja-media |
| Inteligencia compuesta (AA Index v4.1) | Opus 5 (61, #1 de 190 [I], verificado en pagina propia de AA) | Fable 5 con fallback a 4.8 (60, #3 de 190) | Sonnet 5 (53, cerca) | Haiku (24-30) para lo complejo | Alta (AA independiente, verificado directo); OJO invertido: Fable 5 es MAS RAPIDO en tokens/s (69.7 vs 52.3, "notably slow" el calificativo propio de AA para Opus 5), pero Opus 5 es MAS BARATO por tarea de inteligencia ($2.03 vs $2.75 de Fable) y gana el ranking pese a ser mas lento; Opus 5 es ademas el MAS VERBOSO medido (100M tokens en el Index vs 87M de Fable) |
| Coding agentico (SWE-Pro) | Fable 5 (80.0-80.3 [3o/V], sigue liderando) | Opus 5 (79.2 [3o], cerro brecha vs 4.8=69.2) | Sonnet 5 (63.2) | Haiku para codigo complejo multi-paso | Media (SWE-bench de Opus 5 sin confirmacion [V] directa, solo agregadores citando el system card) |
| Codigo "mergeable" (FrontierCode, Cognition, benchmark independiente distinto de SWE-Pro) | Opus 5 (53.4% [I], NUEVO #1, verificado en `cognition.com/blog/frontier-code` y `llm-stats.com/benchmarks/frontiercode`) | Fable 5 (46.3%) | Sonnet 5 (38.8%) | Opus 4.8 (ya no aparece en el leaderboard vigente, su dato historico: Main 34.3%, Diamond 13.4%) | Alta (leaderboard publico verificado directo) |
| Terminal / FrontierBench (benchmark nuevo, sucede a terminal-bench como headline) | Opus 5 (43.3 max [V], FrontierBench v0.1) | Fable 5 (33.7) | Opus 4.8 (18.7, salto grande) | Terminal-bench viejo: Haiku (40-42) | Media (Anthropic cambio de benchmark; terminal-bench viejo da lecturas contradictorias 84.6-89.1 para Opus 5 segun fuente, no resuelto) |
| Computer use (OSWorld 2.0, benchmark actualizado) | Opus 5 (70.6 [V], NUEVO #1, a ~1/3 del costo de Fable: ~$25 vs ~$47/tarea) | Fable 5 (66.1) | Opus 5 ES ahora la opcion racional costo/calidad (desplaza a Sonnet del puesto barato-y-bueno) | Haiku (50.7 en la version vieja, no remedido): NO automatizar navegador con Haiku | Alta (dato oficial [V]; OSWorld 2.0 no es directamente comparable a la version vieja: Opus 4.8 releido baja a 55.7) |
| Investigacion web profunda | Opus 4.6 dato oficial (BrowseComp 86.8 multiagente); presumible Opus 4.8/Fable/Opus 5 | - | Sonnet para el fan-out de busqueda | - | Baja (datos viejos) |
| Escritura creativa/emocional | Fable 5 (todas las tablas [I]; SIN dato de Opus 5 aun en eqbench/lmarena) | Opus 4.8/4.7 | Sonnet 5 para volumen | Haiku para narrativa | Media (senal cualitativa temprana de Opus 5 es NEGATIVA/MIXTA: Every.to "Brilliant in Flashes, Frustrating in Practice"; NO asumir mejora) |
| Vision/documentos (DocVQA/CharXiv) | Opus 4.7/4.8 ([3o], fuente unica) | - | Sonnet: vision NO mejoro vs 4.6 (Roboflow [I]); docs 67% = mediocre | Conteo de objetos: todos malos (Sonnet 20%) | Baja-media (Opus 5: unico dato es MMMU-Pro 84.7 [3o], sin DocVQA/CharXiv comparable) |
| Contexto largo REAL (MRCR multi-aguja) | Opus 4.6 (76-78% @1M [V]) !!! | Sonnet 4.6 (65.8 @1M) | - | Opus 4.7 REGRESION severa (32% @1M); 4.8/Sonnet 5/Fable 5/Opus 5 SIN DATO (el system card de Opus 5 ni lo menciona) | Media (system card citado) |
| Velocidad/latencia (AA [I]) | Haiku (89-94 t/s, TTFT 0.9s) | Sonnet 5 (~70 t/s) | Haiku sin rival para interactivo | Fable (TTFT 128s) y Opus 5 effort alto (49.6-56.8 t/s, TTFT 22-66s, "notably slow" para su precio [3o]) para chat rapido | Alta |
| Spreadsheets/Excel (SpreadsheetBench [I]) | Opus 4.6 unico dato (34.9%: MEDIOCRE absoluto) | - | - | Nadie es "bueno": debugging de formulas 12% | Alta pero vieja |
| Alucinar poco (HHEM/AA [I]) | Haiku 4.5 (9.8% HHEM, el MENOR); Opus 4.8 tenia la mejor abstencion/calibracion medida de la familia | - | Haiku para extraccion factual | Opus 4.7 (12%, el peor medido); OJO Opus 5: su propio system card admite alucinacion factual "up a bit" vs 4.8 y peor ratio acierto/intento que Fable en AA-Omniscience; **CONFIRMADO independiente** via el benchmark AA-Omniscience Non-Hallucination Rate expuesto en OpenRouter: Opus 5 solo **49.9%** (practicamente una moneda al aire de si una respuesta incorrecta es alucinacion o abstencion) | Media-alta (contradiccion interna del system card sin HHEM que la resuelva del todo, pero AA-Omniscience Non-Hallucination YA es un dato [I] independiente que apunta en la misma direccion negativa; ver perfil seccion 2) |
| Instrucciones multilingues (M-IFEval [I]) | SONNET (91.5) > Opus (87.3) | - | Sorpresa: Sonnet gana a Opus | Haiku (82.1, el mas debil): ojo instrucciones complejas en ESPANOL | Media (version de modelos imprecisa) |

## 2. Perfil por modelo (fortalezas, debilidades, cuando NO)

### Haiku 4.5 ($1/$5, 200K contexto, 64K out)
- FORTALEZAS: velocidad sin rival (TTFT ~0.9s); el que MENOS alucina en tablas medidas (9.8% HHEM);
  costo minimo; docs/escritura tecnica suficiente; sub-agentes mecanicos.
- DEBILIDADES: el mas debil en instrucciones multilingues (cuidado con briefs complejos en espanol);
  RAG con fuentes sucias = "confiadamente equivocado" (exigir citas + "no encontrado" explicito);
  computer use malo (50.7); codigo complejo no; razonamiento duro no; solo 200K de contexto.
- NO USAR PARA: automatizar navegador/escritorio, codigo multi-paso, RAG sin citas forzadas,
  instrucciones complejas en espanol, ciencia/mate.

### Sonnet 5 ($2/$10 intro hasta ago-2026, luego $3/$15; 1M, 128K out)
- FORTALEZAS: el caballo de batalla; casi-Opus en agentico (HLE herramientas 57.4 vs 57.9; OSWorld 81.2)
  a fraccion de cuota; gana a Opus en instrucciones multilingues (M-IFEval); menos muletillas de IA que
  Opus en escritura (1 test); input barato para trabajo pesado de lectura.
- DEBILIDADES: quejas tempranas consistentes (jul-2026): pushback/discute ordenes directas, hedging,
  reportes de perdida de contexto en pocos turnos; tokenizer +30-35% tokens (en effort alto puede COSTAR
  MAS que Opus 4.8 por calidad similar: si la tarea es dura, ir directo a Opus puede ser mas barato);
  vision NO mejoro vs 4.6 (Roboflow) y comprension de documentos mediocre (67%); genera 3-4x mas nitpicks
  en code review; razonamiento cerrado un escalon bajo Opus (GPQA 78); mate dura NO (USAMO 79.5 vs 96.7).
- NO USAR PARA: mate/ciencia dura, tareas de maxima obediencia sin friccion, effort alto sostenido si el
  presupuesto es ajustado (pasar a Opus), extraccion critica de documentos escaneados sin verificacion.

### Opus 5 ($5/$25; 1M, 128K out; thinking ON por defecto) - el flagship (releva a 4.8)
- FORTALEZAS: computer use AHORA #1 medido de la familia (OSWorld 2.0: 70.6% [V] vs Fable 5 66.1%, Opus 4.8
  55.7%, GPT-5.6 Sol 62.6%), y a ~1/3 del costo de Fable (~$25 vs ~$47/tarea): la opcion racional para
  automatizar navegador/escritorio. Nuevo techo de "inteligencia compuesta" de la familia (AA Index 61 max,
  empata/supera a Fable 60 [I]). ARC-AGI nuevo SOTA, sobre todo ARC-AGI-3 (30.2%, ~3x el siguiente mejor
  [I]). Clasificadores de seguridad cyber MUCHO menos sobre-disparados que en Fable 5 (falsos positivos
  42%->5%): mejor opcion que Fable para trabajo de seguridad/pentesting legitimo. Sobre-rechazo
  mejorado vs Opus 4.8 y Sonnet 5. Mismo precio que 4.8 ($5/$25), sin recargo por contexto largo.
  Posicionamiento oficial de Anthropic: "frontier coding/enterprise model a mitad del precio de Fable 5"
  (compite con Fable en coding/enterprise, NO se vende como modelo de escritura).
- DEBILIDADES: SEÑAL DE REGRESION en confiabilidad factual, NO RESUELTA (fuente unica: su propio system
  card, sin HHEM independiente aun): admite que "las alucinaciones en preguntas factuales subieron un
  poco" vs Opus 4.8, y en AA-Omniscience responde tanto como Fable 5 pero se equivoca MAS veces (peor ratio
  acierto/intento). El mismo system card se CONTRADICE en calibracion: reporta "near-saturation" en falta
  de sobreconfianza en un benchmark, pero tambien "problemas de sobreconfianza en afirmaciones no
  soportadas" en otro. Por esto, NO asumir que hereda automaticamente el rol de "verificador de confianza"
  de Opus 4.8 hasta que aparezca dato independiente. AA-Omniscience Non-Hallucination Rate (dato [I])
  confirma la señal: solo 49.9%, casi una moneda al aire. El hueco de
  contexto largo real (MRCR@1M) sigue abierto y el system card ni lo menciona (aunque AA-LCR, un benchmark
  DISTINTO de razonamiento en contexto largo, si da 70.0% [I] para Opus 5; no es lo mismo que recuperacion
  multi-aguja, no cierra el hueco). El mas lento medido en su tier segun AA (52.3 tok/s, puesto #120/190,
  "notably slow" es el calificativo propio de AA [I], no anecdotico). Prompting oficial: sobre-verifica y
  delega a subagentes MAS que 4.8 por defecto (podarlo con instrucciones explicitas, ej. "no agregues un
  paso de verificacion"); con thinking desactivado puede filtrar tool calls como texto plano. Sin evidencia
  de mejora en escritura emocional: la unica reseña cualitativa disponible (Every.to) es MIXTA/NEGATIVA
  ("Brilliant in Flashes, Frustrating in Practice": discute instrucciones, se detiene antes de terminar), y
  hay quejas anecdoticas tempranas de verbosidad/slop peor que antes y personalidad "neurotic" (dia de
  lanzamiento, señal debil aun). Sin dato de METR (autonomia), eqbench/lmarena (escritura) ni M-IFEval
  (multilingue) todavia: demasiado reciente.
- FIABILIDAD EN PRODUCCION (OpenRouter, dato [I], eje DISTINTO de los benchmarks de laboratorio
  de arriba): en esta dimension Opus 5 SI gana claro a Fable 5. Uptime promedio de proveedores 99.69% vs
  94.04% de Fable. Tasa de error de salida estructurada (JSON/tool schemas) 3.5-7.2% segun proveedor vs
  8.7-16.2% de Fable (Fable falla el doble o mas). Precio EFECTIVO tras cache (lo que de verdad se paga,
  no el de lista): input ~$1.27/M para Opus 5 vs ~$3.00/M para Fable 5 (ambos ~75% mas baratos que su
  precio de lista gracias al cache, pero Opus 5 sigue mas barato en términos absolutos). Adopcion: Claude
  Code ya genero 25.5B tokens hacia Opus 5 en sus primeras ~48h (vs 312B acumulados de Fable en ~7 semanas
  desde su lanzamiento el 9-jun; ventanas de tiempo distintas, no comparar 1 a 1, pero la velocidad de
  arranque es notable).
- **TABLA DE ESFUERZO de Opus 5** (dato [I], API oficial de Artificial Analysis, no el sitio
  web): confirma la regla practica "techo xhigh, nunca max".

  | Esfuerzo | AA Index | GPQA | TTFT (s) | Tokens/s |
  |---|---|---|---|---|
  | Low | 50.6 | 88.9% | 2.8 | 46.7 |
  | Medium | 56.3 | 91.9% | 9.7 | 55.6 |
  | High | 58.9 | **93.7%** (el mas alto de todos) | 10.1 | 50.1 |
  | Xhigh | 60.1 | 93.7% | 22.6 | 60.4 |
  | Max | 60.7 (el mas alto en indice compuesto) | 93.2% (BAJA vs High/Xhigh) | 28.7 (el mas lento) | 43.9 |

  Lectura: `high` ya saca el MEJOR GPQA de toda la escalera (93.7%, empatado con xhigh) a una fraccion del
  TTFT de `max` (10.1s vs 28.7s, ~2.8x mas rapido) perdiendo apenas 1.8 puntos de indice compuesto. `max`
  incluso BAJA en GPQA especifico (93.2%) pese a ganar el indice agregado. Subir a `max` por defecto es
  pagar 2-3x mas latencia por una ganancia marginal o nula en la metrica que mas importa para razonamiento
  cientifico. **CONTRADICCION sin resolver, no citar un solo numero de velocidad como definitivo:** esta
  tabla (43.9 tok/s para Opus 5 max) viene de la API oficial de AA; el sitio publico artificialanalysis.ai
  mostraba 52.3 tok/s para el MISMO modelo/variante en su resumen. Misma fuente, dos numeros distintos, sin
  explicacion publicada de por que difieren (posible ventana de medicion distinta). Mismo patron en Fable 5:
  API = 58.3 tok/s, sitio web = 69.7 tok/s.
- **AA-LCR (contexto largo, razonamiento) EMPATADO:** Fable 5 = 0.70, Opus 5 (max) = 0.70 (dato exacto de
  la API, cierra parcialmente el hueco de "sin dato de Fable"). OJO:
  AA-LCR es razonamiento sobre contexto largo, NO es lo mismo que recuperacion multi-aguja (MRCR); el hueco
  de MRCR@1M especifico SIGUE abierto para toda la familia.
- NO USAR PARA: escritura emocional/insignia (sin evidencia de mejora, señal temprana en contra; usar
  Fable 5); verificacion critica de hechos como unico gate (calibracion en duda, ver arriba); contexto
  gigante con necesidad de recuperar datos especificos en medio (hueco MRCR persiste); chat interactivo
  rapido (lento).

### Opus 4.8 ($5/$25; 1M, 128K out) - superseded como default por Opus 5; SIGUE DISPONIBLE, no deprecado
- FORTALEZAS: MEJOR PERFIL DE CONFIABILIDAD de la familia (menor tasa de respuestas incorrectas via
  abstencion; 0% en "reportar sin critica resultados con fallas"; sobreconfianza 10x mejor; ~4x menos
  probable dejar pasar un defecto de codigo): el modelo para VERIFICAR y para trabajo donde el error cuesta.
  Razonamiento cerrado top (GPQA ~93.6). Computer use fuerte (83.4, aunque bajo a 55.7 en la relectura con
  OSWorld 2.0, ver perfil de Opus 5). Escritura emocional casi-humana. Sostiene estilo/contexto en sesiones
  largas. Fast mode disponible (2.5x throughput, precio premium).
- DEBILIDADES: el mas caro en cuota; lento en effort alto (TTFT ~28s); narra mas y pregunta mas que 4.7
  (mitigable por prompt); CONTEXTO LARGO SIN DATO (la regresion de 4.7 en MRCR @1M no se sabe si se
  corrigio: NO asumir que traga 500K+ tokens bien, trocear o delegar lectura pesada a Sonnet).
- NO USAR PARA: chat interactivo rapido, volumen masivo (desperdicio de cuota), ingesta de contexto
  gigante sin trocear (hueco de datos).
- **Vigencia:** dado que Opus 5 tiene una señal de regresion de calibracion NO resuelta (ver
  arriba), Opus 4.8 sigue siendo una alternativa valida para verificacion critica hasta que se aclare con
  dato independiente. No descartarlo por "viejo".
- **Restriccion operativa en Claude Code:** un subagente solo se rutea a `opus` / `sonnet` / `haiku` /
  `fable`, y `opus` resuelve al Opus VIGENTE (hoy 5). Opus 4.8 no es seleccionable como subagente por
  nombre: la recomendacion de arriba solo es ejecutable si se abre una ventana en ese modelo directamente
  (si el cliente aun lo ofrece) o se llama la API cruda. Dentro de una sesion de subagentes, la mitigacion
  real para verificacion critica es un segundo lector barato de lente ortogonal (Haiku, el que menos
  alucina) exigiendo evidencia citada por hallazgo.

### Fable 5 ($10/$50 API, fuera de suscripcion; 1M, 128K out; thinking siempre-on)
- FORTALEZAS: techo de la familia en compuesto (AA 60), agentico-coding (SWE-Pro 80.3), terminal,
  escritura creativa/emocional (todas las tablas), precision factual bruta (61% AA-Omniscience),
  horizonte largo/autonomia (vendido para eso; METR sin dato aun), delegacion multiagente confiable.
- DEBILIDADES CRITICAS:
  1. CLASIFICADORES cyber/bio/ML con falsos positivos documentados que RE-ENRUTAN SILENCIOSAMENTE a
     Opus (casos reales: "cancer" marcado bio, CV de "Security Architect" bloqueado, trabajo IA/ML
     legitimo saboteado sin aviso). Para trabajo de SEGURIDAD o ML: ir directo a Opus (5, sus
     propios clasificadores cyber disparan 42%->5% menos falsos positivos que en Fable [V]).
  2. RETENCION OBLIGATORIA de 30 dias, sin ZDR (anula acuerdos ZDR): NO pasar datos sensibles/secretos
     por Fable.
  3. No preserva la voz del autor sin perfil explicito (sin perfil escribe "como Fable").
  4. TTFT enorme (~128s), turnos de minutos: no interactivo.
  5. Calibracion de alucinacion NO publicada (preciso no implica que se abstenga bien).
- NO USAR PARA: seguridad/cyber/bio/ML (fallback silencioso), datos sensibles (retencion), chat rapido,
  volumen (precio), escritura sin perfil de voz.

### Legado util
- Opus 4.7: mas literal de la familia (rompe flujos que dependian de inferencia); PEOR alucinacion medida
  (12% HHEM); posible pico de sobre-rechazo (76.6% [3o], no confirmado); REGRESION de contexto largo.
- Opus 4.6: paradojicamente el MEJOR dato verificado de contexto largo multi-aguja (76-78% @1M) y el unico
  con dato de spreadsheets; opcion si una tarea es 100% "leer 1M de tokens y recuperar agujas".
- Sonnet 4.6: base estable; con perfil de voz casi iguala a modelos superiores en escritura.

## 3. Reglas de maximizacion de la cuota (sintesis operativa)

1. **La cuota es el recurso, no los dolares.** Gasta Opus donde es diferencialmente mejor (verificacion,
   riesgo, razonamiento duro, emocional insignia) y Sonnet/Haiku en todo lo demas. Volumen en Haiku.
2. **Sonnet effort alto puede costar mas que Opus** (tokenizer +30-35%): tarea dura = Opus directo.
3. **Opus 4.8 ERA el VERIFICADOR por defecto** (mejor calibracion/abstencion medida): rol de
   verificador de calidad, revision de codigo, auditorias, decisiones. **Opus 5 NO hereda ese rol
   automaticamente**: su propio system card admite una posible regresion de alucinacion factual y se
   contradice en calibracion (near-saturation en un benchmark, sobreconfianza en otro). Mientras no
   aparezca dato independiente (HHEM u otro), usar Opus 4.8 (sigue disponible) o corroborar con un
   segundo lector para verificacion critica de hechos.
4. **Fable via API = francotirador**: la pieza de escritura que debe ser la mejor (centavos), el problema
   Diamond de codigo/razonamiento largo. NUNCA para seguridad/ML/datos sensibles (clasificadores+retencion).
5. **Contexto gigante**: no asumir que Opus (4.8 o 5) lo maneja (hueco tras la regresion de 4.7, el system
   card de Opus 5 ni lo menciona); trocear, delegar lectura a Sonnet ($ input menor), o considerar Opus 4.6
   si es recuperacion pura multi-aguja.
6. **Espanol con instrucciones complejas**: Sonnet > Opus (M-IFEval, dato de Opus 4.8; Opus 5 sin medir
   aun); Haiku el mas fragil.
7. **Ningun modelo es bueno en**: spreadsheets complejos (34.9% el mejor), conteo de objetos en imagenes,
   OCR critico de escaneados (verificar siempre); no delegar ciegamente esas tareas.
8. **Computer use: Opus 5 es ahora la opcion racional** (OSWorld 2.0 70.6%, a ~1/3 del costo de Fable 5);
   Sonnet 5 (81.2 en la version vieja del benchmark, sin remedir en 2.0) sigue siendo aceptable si Opus 5
   no esta disponible o el presupuesto es corto.

## 4. Huecos y vigilancia (que falta medir)

- Contexto largo de Opus 4.8 / Opus 5 / Sonnet 5 / Fable 5 (MRCR/RULER): CRITICO, vigilar cuando salga (el
  system card de Opus 5 ni siquiera lo menciona).
- METR time-horizon para toda la generacion actual (ultimo solido: Opus 4.5 ~4h49m; Opus 5 sin dato).
- tau-bench independiente post-Sonnet 4.5 (leaderboard congelado); multiagente (sin benchmark).
- Espanol aislado por modelo (nadie lo mide): pendiente eval ciega propia con un juez humano.
- IFEval comparable para los 7; structured-output failure rate por modelo; SpreadsheetBench generacion actual.
- Cifras dudosas detectadas (NO citar sin reverificar): FrontierMath T4 88% de Fable; sobre-rechazo 76.6%
  de Opus 4.7; SWE-Verified de Fable ("95%" solo en titulares).
- **Opus 5 (lanzado 2026-07-24, dia de la investigacion):** SWE-bench Verified/Pro y terminal-bench sin
  confirmacion [V] directa (solo agregadores citando el system card, que no se pudo leer completo por
  tamano/429); METR sin dato; escritura (eqbench, lmarena, M-IFEval) sin fila aun; Epoch Capabilities
  Index con CONTRADICCION no resuelta entre fuentes (159 vs 162.1, vs Fable 161); calibracion/alucinacion
  con contradiccion interna del propio system card, sin HHEM independiente (aunque AA-Omniscience
  Non-Hallucination Rate ya apunta en la misma direccion negativa: 49.9%).
  Recontactar en 2-3 semanas cuando los leaderboards independientes se actualicen.
- **Verificado en paginas propias (no agregadores) de artificialanalysis.ai/models y
  openrouter.ai/rankings:** AA Index exacto (Opus 5 #1/190=61, Fable 5 #3/190=60), costo por tarea
  ($2.03 vs $2.75), velocidad (52.3 vs 69.7 tok/s, Fable gana en velocidad pese a perder en indice), y
  AA-LCR (contexto largo, 70.0% Opus 5, SIN dato equivalente confirmado de Fable 5 en esta pasada porque
  su pagina de OpenRouter mostro por defecto la pestaña "Design Arena" en vez de "Artificial Analysis").
  Nuevo eje agregado: fiabilidad EN PRODUCCION via OpenRouter (uptime, error de salida estructurada), que
  Opus 5 gana claro sobre Fable 5 pese a la duda de calibracion factual de laboratorio (son ejes DISTINTOS,
  no lo confundas: uno es "responde JSON valido", el otro es "el hecho que afirma es correcto").

## Fuentes

- artificialanalysis.ai/models y openrouter.ai/rankings (paginas publicas por modelo).
- System cards oficiales de Anthropic por modelo.
- cognition.com/blog/frontier-code y llm-stats.com/benchmarks/frontiercode (benchmark FrontierCode).
- Agregadores de terceros (marcados [3o]) y cobertura de prensa especializada (Every.to) donde se cita.
