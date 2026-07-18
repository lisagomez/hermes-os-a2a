# Registro de decisiones (ADR): orquestar-agentes y orquestar-agentes-fable

> Para versiones futuras (agente o humano): este archivo explica POR QUE las skills dicen lo que dicen,
> con los datos numericos que sustentaron cada decision. Si los datos cambian (modelos nuevos, precios
> nuevos, benchmarks nuevos), rehaz el analisis ANTES de cambiar las reglas; no las cambies por intuicion.
>
> Fecha de los datos: 2026-07-01. Decisor: Johann. Proceso: Fable 5 (director L0) propuso, un subagente
> Opus 4.8 ataco adversarialmente el texto existente (10 hallazgos), Johann decidio los 2 puntos abiertos,
> Fable reconcilio y edito. Es el mismo protocolo de la seccion 10 de la skill, aplicado a la propia skill.
>
> **Espejo:** este archivo tambien vive en `C:\OPS\.claude\skills\orquestar-agentes-fable\README.md`
> (OPS, el agente principal — sincronizado el 2026-07-01, ver D9). Son copias, no un link vivo; al
> editar una regla con datos nuevos, actualiza AMBAS copias del ADR y de los SKILL.md correspondientes.

---

## 1. Datos que sustentaron las decisiones

### 1.1 Benchmark FrontierCode v1 (set completo): score % y costo promedio POR TAREA

| Esfuerzo | Fable 5 | Opus 4.8 | Sonnet 5 |
|---|---|---|---|
| low | 37.3% @ ~$4.5 | 25.3% @ ~$2.5 | 18.1% @ ~$0.7 |
| med | 41.1% @ ~$6 | 26.9% @ ~$3.3 | 26.6% @ ~$2.9 |
| high | 42.9% @ ~$8 | 30.3% @ ~$4 | 28.9% @ ~$5.5 |
| xhigh | 46.3% @ ~$10 | 34.3% @ ~$6.5 | 34.0% @ ~$7 |
| max | 44.7% @ ~$16 | 31.3% @ ~$9 | 38.8% @ ~$10 |

Referencias del mismo benchmark:
- Sonnet 4.6 (generacion anterior): 13.2-15.1% en cualquier esfuerzo. La mitad de Sonnet 5.
- GPT-5.5: 21.1-25.5%. Por debajo de toda la familia Claude actual salvo Haiku.
- Precios API por MTok usados en el calculo: Sonnet 5 $3/$15 · Opus 4.8 $5/$25 · Fable 5 $10/$50 · Haiku 4.5 $1/$5.

### 1.2 Subset Diamond (las 50 tareas mas dificiles del benchmark)

- Fable 5: escala de 11.5% (low) a ~29.5% (xhigh) y ~31% (max).
- Opus 4.8: tope ~13.4% (xhigh); max EMPEORA a ~11.4%.
- GPT-5.5: plano en ~5-6% a cualquier esfuerzo.
- Lectura: en lo verdaderamente dificil, Fable a cualquier esfuerzo >= med supera al mejor Opus por mas de 2x.
  No hay sustituto barato para la clase Diamond.

### 1.3 Artificial Analysis (API, consultada 2026-07-01)

| Modelo | Inteligencia (AA) | Coding | Velocidad | TTFT | $/1M in/out |
|---|---|---|---|---|---|
| Fable 5 | 59.9 | 76.5 | 84.8 tok/s | 65.8s | $10 / $50 |
| Opus 4.8 | 55.7 | 74.3 | 66.7 tok/s | 27.8s | $5 / $25 |
| Sonnet 5 | 53.4 | 71.5 | 88.6 tok/s | 201s (a max effort) | $3 / $15 |
| Haiku 4.5 | 29.6 | 43.9 | 151.8 tok/s | 13.4s | $1 / $5 |
| GPT-5.5 (high, ref.) | 53.1 | 71.6 | 63.1 tok/s | 11.8s | $5 / $30 |

---

## 2. Decisiones y su justificacion

### D1. Techo de esfuerzo `xhigh`: ni Opus ni Fable usan `max`

`max` rinde IGUAL O PEOR que `xhigh` en ambos modelos frontera (Fable 44.7% vs 46.3%; Opus 31.3% vs
34.3%) costando 40-60% mas. No es un tradeoff calidad/costo: es pagar mas por menos. Nota: en Sonnet 5
`max` SI mejora (38.8% vs 34.0%), pero ese punto queda dominado por Fable `high` (42.9% @ ~$8 vs
38.8% @ ~$10), asi que tampoco es ruta recomendada.

**Respaldo independiente (2026-07-05), doc oficial de Anthropic:** los numeros de arriba (benchmark
FrontierCode v1) son la UNICA fuente cuantitativa y no tiene trazabilidad de origen (sin link/raw data).
La pagina oficial `https://platform.claude.com/docs/en/build-with-claude/effort` da una guia CUALITATIVA
independiente que apunta en la misma direccion para Opus 4.7/4.8 (misma familia frontera que Opus 4.8):

> `xhigh`: "Start with `xhigh` for coding and agentic use cases, and use `high` as the minimum for most
> intelligence-sensitive workloads. Step down to `medium` for cost-sensitive workloads, **or up to `max`
> only when your evals show measurable headroom at `xhigh`**."
>
> `max`: "Reserve for genuinely frontier problems. **On most workloads `max` adds significant cost for
> relatively small quality gains, and on some structured-output or less intelligence-sensitive tasks it
> can lead to overthinking.**"

Esto NO corrobora los numeros 31.3%/34.3% (Anthropic no publica esa tabla); corrobora la DIRECCION de la
regla: `xhigh` es el default recomendado por el fabricante para Opus en coding/agentico, y `max` se reserva
para casos con evidencia propia (evals) de que rinde mejor, no se sube por defecto. Tratar como dos fuentes
independientes que apuntan igual, no como confirmacion numerica.

### D2. Ruteo L1 por frontera de Pareto (dos rutas)

El costo POR TAREA contradice la intuicion del precio por token: Fable `med` (41.1% @ ~$6) DOMINA a
Opus `xhigh` (34.3% @ ~$6.5) y a Sonnet 5 `xhigh` (34.0% @ ~$7): mas score por menos plata. En tareas
dificiles densas en razonamiento, bajar el esfuerzo del modelo frontera gana a subir el esfuerzo del barato.

- L1 estandar (migracion verificable, integracion acotada) → Opus 4.8 `high` (30.3% @ ~$4, la frontera del riesgo estandar).
- L1 dificil (algoritmos, side cases, contratos multi-modulo) → subagente Fable 5 `low→med`.
- EXCEPCION: trabajo pesado en INPUT (leer repos, muchos archivos). Ahi manda el precio por token
  ($3/M de Sonnet 5 vs $10/M de Fable) y la ruta sigue siendo Sonnet 5/Haiku 4.5 + devolver destilado.
- LOS 3 REGIMENES DE COSTO (Johann, 2026-07-01): estos costos por tarea son a precios de API; el regimen
  vigente cambia el ruteo.
  - A. Suscripcion con Fable incluido (hasta 2026-07-07): aprieta la CUOTA. Sonnet abundante: en paridad
    de score (Sonnet xhigh 34.0% ≈ Opus xhigh 34.3%) exprimir Sonnet y preservar cuota premium. Fable
    dentro de cuota: usarlo para lo dificil sin culpa mientras dure.
  - B. Suscripcion sin Fable (desde 2026-07-08): Fable queda solo por API (dolares reales) mientras
    Opus/Sonnet salen de la cuota ya pagada. Default de lo dificil pasa a Opus xhigh (cuota); escalar a
    Fable API solo si: clase Diamond, Opus fallo tras el circuit breaker, o el costo del error supera
    los ~$5-10 del uso. Pagando API, Fable entra en low-med (el Pareto aplica al esfuerzo).
  - C. API puro: esta tabla manda tal cual (Fable med domina en lo dificil).

### D3. Debate graduado en la variante Fable (seccion 10.2)

El debate adversarial sigue siendo OBLIGATORIO ante cualquier plan ejecutable (decision de Johann:
"todos nos podemos equivocar; para eso es el debate con Opus"). Pero un ataque Opus `xhigh` cuesta
~$6.5 por corrida y dispararlo a un plan trivial contradice el Filtro maestro (seccion 0). Solucion:
se GRADUA el ataque, no se exime:
- Plan simple (pocas piezas, reversible, sin datos/contratos) → Opus 4.8 `high`, ataque corto.
- Plan delicado (multi-fase, esquema/contratos, varios subagentes, caro de revertir) → Opus 4.8 `xhigh`, ataque profundo.

### D4. Generaciones fijadas en todo el texto

"Sonnet" generico podia leerse como Sonnet 4.6, que rinde 13-15% (la mitad de Sonnet 5 en xhigh).
Todas las menciones fijan generacion: Fable 5, Opus 4.8, Sonnet 5, Haiku 4.5. Al salir una generacion
nueva, actualizar las menciones tras validar con datos (ver seccion 4).

### D5. Haiku solo para lo determinista sin juicio

Haiku 4.5 tiene 29.6 de inteligencia (55% de Sonnet 5) pero es el mas rapido (151.8 tok/s, TTFT 13.4s)
y el mas barato ($1/$5). Apto para git ops, formateo, renombrar, extraer. Cualquier tarea con criterio:
Sonnet 5 `low` como minimo.

### D6. Regla de desempate calidad/costo (filosofia del dueño)

La calidad va primero; el costo se optimiza SOLO donde no compra calidad real. Si: mismo resultado mas
barato (paso SCRIPT sin LLM, L2 para lo mecanico, Fable med en vez de Opus xhigh en lo dificil). No:
sacrificar calidad en lo delicado por ahorro, ni pagar saltos de costo desproporcionados por mejoras
marginales (caso max: +60% de costo por MENOS score). Registrada al final de la seccion 6 de ambas skills.

### D7. Porteo selectivo desde coding-orchestra (skill de terceros, 2026-07-01)

Fuente: C:\OPS\skills-de-terceros\seguridad ok\ (auditada LIMPIA por Opus 4.8: sin prompt injection,
sin llamadas de red, sin unicode invisible, verificado byte a byte). Proceso: extraccion de mecanismos
con Sonnet 5 (4 candidatos nuevos de ~15 evaluados), propuesta del director Fable, debate adversarial
con Opus 4.8 (esfuerzo high, plan graduado como simple). El debate tumbo 2 de los 5 puntos tal como
estaban propuestos; reconciliacion:

- PORTADO: Eje 0 LLM/SCRIPT (seccion 6). Etiquetar pasos del plan, agrupar SCRIPT consecutivos, cero
  llamadas en pasos deterministas. Reubicado de la tabla de ruteo (donde rompia el tipo de la tabla:
  su columna Ruta es modelo+esfuerzo) al nuevo Eje 0, con el umbral de >=3 pasos de la fuente para no
  chocar con el Filtro maestro (seccion 0). Delimitado de Haiku low y de Workflow.
- PORTADO: diff real al verificador (seccion 5). git diff --stat + diff acotado al scope, generado por
  comando como paso SCRIPT, efimero, nunca resumido con IA. Marcado como excepcion deliberada a
  "destila, no vuelques" (seccion 3): el diff es evidencia primaria.
- PORTADO: cierre de fase ligero (seccion 8). Fila nueva en la tabla de cadencia existente (<=5 bullets
  en Last checkpoint), reusando el vocabulario de la seccion 8 en vez de crear taxonomia paralela;
  PROGRESS.md sigue siendo el unico artefacto, siempre reanudable.
- DESCARTADO de estas skills: "fase 0 de resolucion de skills por funcion (no por nombre)". Es un
  mecanismo de portabilidad entre repos divergentes, no de orquestacion de un build. CANDIDATO para
  la skill vertical-pack cuando se empaquete la orquestacion para otros repos.
- coding-orchestra NO se adopta como skill activa: cubre el mismo dominio que estas skills y sus
  triggers colisionarian ("orquesta esto", "coordina agentes"). Queda como material de referencia.

### D8. Mecanismo diferido capturado — "fase 0 de resolucion por funcion" (para vertical-pack)

> Destilado el 2026-07-01 (subagente Sonnet 5) ANTES de borrar los archivos de terceros, para no
> depender de la fuente. Este apendice ES la fuente de verdad del mecanismo; con esto se reconstruye
> sin releer coding-orchestra.md. NO se implementa hoy: es doctrina lista para cuando se construya
> `vertical-pack`.

**Problema que resuelve.** Un pack/skill que cita capacidades por NOMBRE (del repo donde se construyo)
falla al instalarse en un repo con otra nomenclatura: delega a una skill que no existe con ese nombre, o
crea un duplicado porque no reconocio que la capacidad ya existia con otro nombre. Se dispara UNA vez al
instalar el pack en un repo nuevo; el resultado se cachea y se reutiliza; solo se re-resuelve una
capacidad puntual si su skill deja de existir en runtime.

**Procedimiento (4 pasos):**
1. **Descubrir el inventario real** del repo destino, en orden: (i) la carpeta de skills real (no asumir
   la convencion de origen), (ii) registros/catalogos si existen (ej. `*registry*.json`), (iii) carpetas
   de commands/agents y sus registros, (iv) el archivo raiz de instrucciones (`CLAUDE.md`/`AGENTS.md`).
   Para cada unidad, leer su DESCRIPCION/proposito, no solo el nombre de archivo.
2. **Emparejar por funcion, no por nombre.** Por cada capacidad abstracta que el pack necesita delegar,
   buscar en el inventario una unidad cuya descripcion FUNCIONAL coincida, sin importar el nombre literal.
   Desempate: una unidad puede cubrir varias capacidades; si hay varios candidatos, elegir el mas
   especifico; ante duda real de equivalencia, NO crear — usar el candidato mas cercano o escalar al
   usuario. (Crear solo porque "no se llama igual" esta PROHIBIDO: produce duplicados.)
3. **Crear solo lo genuinamente ausente**, en la convencion de skills del repo destino, con contenido
   real y operativo (no un "experto hueco") y una descripcion derivada de la funcion que cubre. Si el
   repo tiene catalogo/registro, darla de alta ahi con el mismo formato que las demas entradas.
4. **Registrar y reutilizar.** Persistir el mapeo en un artefacto y, de ahi en adelante, sustituir cada
   nombre de referencia por el nombre resuelto. Si en runtime una skill resuelta ya no existe, re-correr
   la fase solo para esa capacidad.

**Artefacto:** `references/skill-resolution.md` dentro de la carpeta del propio pack. Tabla con una fila
por capacidad: **Capacidad | Nombre de referencia | Estado | Nombre real en el repo** + fecha. Tres
estados: `resuelta` (existe equivalente con otro nombre → se registra el real), `creada` (no existia → se
creo y se registra el nuevo), `ausente-escalada` (no existia y no se creo: duda real o decision del
usuario → sin nombre, escalada). Es la fuente de verdad de la resolucion; se regenera si una entrada
`resuelta` deja de ser valida.

**Por que "por funcion, no por nombre":** dos catalogos que hacen lo mismo casi nunca nombran igual. Buscar
por texto literal falla doble — falso negativo (existe con otro nombre → duplicado) y falso positivo
(nombre parecido, funcion distinta → delegacion errada). La regla obliga a contrastar la descripcion de
cada unidad contra la capacidad abstracta, y fija el default anti-duplicacion: ante ambiguedad, NO crear.

**Generalizacion (del addon):** el mismo "resolver por funcion, no por nombre" aplica no solo a skills sino
a ARCHIVOS de destino (donde vive el archivo raiz de instrucciones, la politica de ejecucion, el mecanismo
de handoff, el archivo de contexto minimo): resolverlos por su funcion en el repo destino antes de
editarlos, en vez de asumir los nombres del repo de origen.

### D9. Sincronizacion OPS ↔ saas-factory (2026-07-01)

Todo lo de D1-D8 se construyo primero aqui (saas-factory, fabrica AI-RRHH) y quedo divergente del
`orquestar-agentes` original de OPS (que se quedo con la doctrina vieja: `Opus alto→max`, sin tabla
Pareto, sin datos). Decision de Johann: OPS es el agente principal (padre de todos los proyectos hijos),
asi que la mejora debe beneficiar a TODOS los proyectos, no solo a saas-factory. Se sincronizaron ambas
skills a OPS: `orquestar-agentes` (mejorado con los mismos datos, voz OPS preservada: referencias a
Johann, `arquitectura.md`/`escalabilidad.md`/`filosofia.md`, Engram) y `orquestar-agentes-fable`
(promovida por primera vez a OPS — antes solo existia aqui). Las skills en ambos lugares son **copias,
no un link vivo** (mismo patron ya usado por el resto de skills de la fabrica, que declaran "adaptado de
OPS" en su pie); mantener ambas copias en sync manualmente cuando se edite una regla con datos nuevos.

### D10. Optimizacion de tokens de salida (2026-07-01)

La salida cuesta ~5x la entrada en toda la familia Claude: es el token mas caro. Debate adversarial
(Opus high) sobre la propuesta inicial: RECHAZO el tope de palabras en briefs (trunca evidencia, es
compresion y no selectividad, reintroduce lo que la seccion 5 prohibe) y detecto que el sintoma real
(verbosidad) vive en el loop principal del dia a dia, no en los retornos de subagentes que ya estaban
apretados. Resultado: una linea en la seccion 3 (razon economica 5x; para apretar retornos pedir FORMATO
estructurado, nunca tope de palabras), PROGRESS.md excluido del alcance (protege la reanudabilidad de la
seccion 8), y la brevedad del loop principal reforzada en la memoria global `formato-escritura` de OPS
(selectividad, no compresion). Nota: PROGRESS.md NO duplica tokens de salida si se sigue la cadencia por
hitos (son 2-3 lineas por checkpoint via Edit, no reescritura); su costo es un seguro que se paga solo al
reanudar sin re-derivar.

### D11. Sello de ejecucion por unidad — dificultad + modelo + auto-check (2026-07-02)

Problema (insight de Johann): quien escribe un plan/PRP/kickoff en modo plan lo hace con todo el contexto y
el modelo de frontera; quien lo ejecuta abre una VENTANA NUEVA y puede ser un modelo mas barato sin ese
contexto, o uno que no vio el hilo del que planeo. La dificultad de cada unidad la conoce solo el que planeo
y se pierde en el salto de ventana si no se escribe (asimetria de informacion). El ruteo por blast radius
(seccion 2) ya existia, pero se quedaba en la cabeza del que planeo.

Decision: nueva subseccion 3.5 en ambas skills. Quien planea estampa, por unidad ejecutable, 4 campos:
Dificultad (Mecanica/Estandar/Delicada-frontera, por CRITERIOS-DELICADOS de seccion 2) · Ejecutar con
(modelo+esfuerzo, el ruteo de seccion 2 decidido con contexto completo) · Por que (1 linea: que la hace
facil/dificil y que cuidar) · Auto-check (el ejecutor declara su modelo al arrancar y AVISA si es mas debil
que el recomendado). El plan NO puede forzar el modelo (lo elige el humano al abrir la ventana); el
auto-check lo vuelve checkpoint activo, mismo patron que el "si eres Fable, debate con Opus". Ubicada en 3.5
(dentro de seccion 3, "arrancan en frio") a proposito: no renumera y no rompe las cross-refs de la seccion
10 de la variante Fable. Aplica a modo plan, PRPs y kickoffs; proporcionalidad (seccion 0): una tarea inline
corta no lo necesita.

Sincronizado en LAS 4 skills (orquestar-agentes + orquestar-agentes-fable, en OPS y saas-factory).
Puntero de descubrimiento anadido desde el feedback `modelo-esfuerzo-por-tarea` de OPS. Primera aplicacion:
los 6 kickoffs de OLA 5 del plan de limpieza de identidad de OPS (con tabla-resumen de modelo por kickoff).

---

## 3. Que cambio en los archivos (2026-07-01)

| Cambio | Donde |
|---|---|
| Techo `xhigh` (residuales `max` eliminados de secciones 1, 6 y 7) | Ambas skills |
| Tabla de ruteo canonica tarea→modelo→esfuerzo | Seccion 2 de ambas |
| Seccion 6 reescrita como frontera de Pareto (no monotona, costo por tarea) | Ambas |
| L1 con dos rutas (Opus `high` estandar, Fable `low→med` dificil) | Seccion 1 de ambas |
| Debate graduado por riesgo del plan | Variante fable, seccion 10.2 |
| Nota: el director puede lanzar OTRA instancia Fable como subagente ejecutor | Variante fable, seccion 10.1 |
| Frontmatters sincronizados con techo y graduacion | Ambas |
| `orquestar-agentes-fable` promovida a OPS (no existia ahi antes) | `C:\OPS\.claude\skills\orquestar-agentes-fable\` |

---

## 4. Como re-evaluar (para versiones futuras)

1. Fuente de precios e indices: API de Artificial Analysis (key en `C:\OPS\.env.ops`; usarla en RUNTIME
   con un script que jamas imprima el valor, solo prefijos. Regla `seguridad-secretos` de OPS).
2. La metrica que manda es COSTO POR TAREA a un score dado, NO el precio por token. Un modelo caro por
   token puede ser el mas barato por tarea (caso Fable med vs Opus/Sonnet xhigh).
3. La escalera de esfuerzo NO se asume monotona: medir cada punto (caso `max` peor que `xhigh`).
4. Si aparece un modelo o esfuerzo nuevo: recalcular la frontera de Pareto, actualizar la tabla de la
   seccion 2 y la guia de la seccion 6 en AMBAS skills (mantener las secciones 0-8 identicas entre si),
   y registrar la decision aqui con sus datos.
