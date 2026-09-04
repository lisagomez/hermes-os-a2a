# Registro de decisiones de riesgo — proyecto

> Control **C5** de `GOBERNANZA.md`. **Append-only**: se añade una entrada por decisión;
> **nunca se edita una pasada**. Si una decisión cambia, se escribe una entrada nueva que
> la supersede.

## Para qué existe

Aceptar un riesgo conocido es una decisión con dueño, no una casilla de configuración.
Aquí queda **quién** la tomó, **cuándo** y con **qué justificación**. Sin eso, dentro de
seis meses nadie recuerda si algo fue una decisión o un descuido — y esa diferencia es
justo lo que un auditor pregunta.

## Su relación con el registro del buzón

Este registro es **de proyecto** y **supersede en alcance —no borra—** a
`businessos/gobernanza/registro-decisiones-riesgo-buzon.md`, que sigue siendo la fuente
para las decisiones del buzón agéntico y **conserva su mecanismo**: la tabla `buzones`
rechaza una fila en modo `abierto` sin `riesgo_firmado_por`. Ese constraint es lo único
que hace real a un registro, y no se toca.

## Formato

```markdown
### <fecha ISO> — <ámbito> — <tipo de decisión>
- **Decisión**:
- **Riesgo aceptado**:
- **Mitigaciones vigentes**:
- **Firmado por** (nombre y rol):
- **Vigencia / próxima revisión**:
```

> **Sobre el append-only**: completar la firma de una entrada **no** cuenta como editarla
> — el campo existe para llenarse. Cambiar su decisión, su riesgo o sus mitigaciones sí:
> eso exige una entrada nueva que supersede a la anterior.

## Decisiones que SIEMPRE requieren entrada firmada

1. Poner algo en producción con un control conocido pendiente.
2. Ampliar los permisos de un agente o de un rol.
3. Usar `service_role` en una superficie de negocio (C7).
4. Desactivar o saltarse un gate, aunque sea "temporalmente".
5. Subir límites de gasto o de cuota por encima de los defaults.
6. Habilitar cualquier acción irreversible sin gate humano.

## El límite: lo que NO se firma aquí

Cuando el daño recae sobre terceros que nunca firmaron —datos personales de clientes,
dinero ajeno, seguridad de un usuario final— **ninguna firma lo autoriza: se rediseña o
no se hace.** No se ofrece la vía del registro para esa clase, porque ofrecerla sugiere
que una firma bastaría.

> Este archivo hereda la visibilidad del repositorio y describe deuda de seguridad real de
> un sistema con tenants, rutas y credenciales concretas. Revísalo **antes** de publicarlo
> o de entregarlo a un cliente.

---

## Entradas

### 2026-09-04 — C2 capa B — control declarado, no construido
- **Decisión**: adoptar la capa de gobernanza con la **capa A** de C2 (contratos
  estructurales, determinista, en cada PR) y **sin la capa B** (casos-trampa contra el
  agente), que se construye después con espacio de identificadores propio `HT-nn` y rama
  `golden-sets`.
- **Riesgo aceptado**: la capa A verifica que un skill **declare** sus reglas no
  negociables, no que las **cumpla** al ejecutarse. Un skill puede satisfacer su contrato
  y aun así comportarse mal. Hasta que exista la capa B, **nadie prueba el comportamiento
  de los 35 skills** ante entradas adversariales, y un CDC de radio "sistema" (cambio de
  modelo) se apoya solo en el diff, la capa A y la aprobación humana.
- **Mitigaciones vigentes**: la capa A caza el 100% de las regresiones por borrado o
  reescritura de una regla declarada, y corre en cada PR; el CDC (C1) deja diff y entrada
  en `BITACORA-CDC.md`, así que todo cambio es rastreable aunque no esté probado; el
  corpus adversarial del buzón (diez familias, cero escapes) cubre **el saneador de
  correo**, que es la superficie de ingesta de terceros más expuesta; los gates del
  Supervisor siguen verificando artefactos.
- **Firmado por** (nombre y rol): _pendiente de firma_
- **Vigencia / próxima revisión**: **antes del primer CDC de radio "sistema"** — un cambio
  de modelo del motor del trío, del ruteo de Hermes o de los subagentes. Construir la capa
  B durante una migración obligatoria de modelo es exactamente el peor momento.

### 2026-09-04 — ámbito global — alcance por fases: `businessos/` fuera del gate
- **Decisión**: cablear la capa a la **raíz y `.claude/`**, con el corpus del buzón como
  **primer y único puente** a `businessos/`. El resto de `businessos/` —que es el **79 %
  del repositorio**: 1357 de 1723 archivos, quince `requirements.txt`, siete
  `package.json`, un compose de 29 servicios, diecisiete Dockerfiles, 34 migraciones—
  queda **fuera del gate de gobernanza** en esta adopción.
- **Riesgo aceptado**: **97 archivos de pytest y 55 pruebas de los frontends no corren en
  ningún CI**, y siguen sin correr después de esta adopción. Un cambio que rompa un
  servicio A2A, un host-job o un frontend puede fusionarse sin que ningún gate lo vea; se
  descubre en runtime, que es donde este repo ya ha pagado esa factura varias veces
  (`ModuleNotFoundError` del supervisor, el COPY aplanado, el fetch fantasma). La
  regresión de skills tampoco alcanza a los agentes de las verticales.
- **Mitigaciones vigentes**: el gate de **tenencia** (`tenencia.yml`) corre en todo PR sin
  filtro de rutas, con control de reversión de seis sabotajes; `gate-docs-vivos` obliga a
  tocar documento vivo; el corpus del buzón entra a CI en esta misma adopción; el
  Supervisor del trío re-corre los gates reales sobre todo lo que produce el motor; y
  `drift-runtime.py` (cron nocturno) detecta lo mergeado-y-no-corriendo. **El alcance
  declarado es preferible al gate que nace rojo**: un gate rojo desde el primer día se
  desactiva, y entonces no queda ninguno.
- **Firmado por** (nombre y rol): _pendiente de firma_
- **Vigencia / próxima revisión**: **2026-12-04** (tres meses), o antes si (a) se suma un
  segundo tenant real, (b) un incidente nace en un archivo de `businessos/` sin cobertura,
  o (c) se entrega el repo a un cliente. En la revisión se decide qué porción de
  `businessos/` entra al gate, empezando por lo que más duela según los incidentes reales.

### 2026-09-04 — C2 / buzón — el corpus entra a CI con 40 de 62 casos sin ejecutar
- **Decisión**: cablear a CI el corpus de inyecciones del buzón tal y como está
  (`tests/test_corpus.py`), sin extenderlo, y declarar su alcance real en vez de
  presentarlo como "62 casos en verde".
- **Riesgo aceptado**: de los 62 casos, unos 22 ejercitan de verdad el **saneador** (que el
  contenido oculto no sobreviva) y los **~40 restantes son "solo gate"**: el test comprueba
  que el gate que declaran exista, pero **nunca los ejecuta contra él**. La razón es de
  forma, no de descuido: los gates reciben un `borrador` (correo saliente) y el corpus
  guarda `correo` (entrante), así que ejecutarlos exigiría inventar un borrador por caso —
  y un test cuyos datos inventa quien lo escribe se acerca peligrosamente al test que
  reproduce la lógica que prueba. Mientras tanto, **la mitad de la defensa declarada del
  buzón no está verificada por ningún gate**.
- **Mitigaciones vigentes**: los ~22 casos de saneado sí corren en cada PR y su criterio es
  cero escapes (fue este corpus el que destapó el texto blanco-sobre-blanco que 80 tests
  verdes no vieron); el test valida que **todo** caso declare expectativa y que las diez
  familias tengan al menos un caso, así que el corpus no puede vaciarse en silencio; los
  gates sí se ejecutan en producción sobre cada saliente real, con aprobación humana
  obligatoria detrás; y el buzón sigue en **modo espejo** (no envía).
- **Firmado por** (nombre y rol): _pendiente de firma_
- **Vigencia / próxima revisión**: **antes de activar el envío real** del buzón (hoy exige 7
  días y 20 borradores). Ese es el momento en que los 40 casos de gate dejan de ser teoría.

### 2026-09-04 — C7 — el detector del segundo tenant existe pero NO está verificando
- **Decisión**: entregar el detector cableado al workflow de tenencia con
  `continue-on-error: true` y **sin los secretos configurados**, en vez de (a) dejarlo sin
  cablear o (b) meter la llave de servicio en los secretos del repositorio por iniciativa
  del agente.
- **Riesgo aceptado**: mientras `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` no estén en los
  secretos, **el detector devuelve "no se pudo comprobar" en cada corrida y la condición de
  incumplimiento de C7 sigue sin vigilarse**. Si mañana se da de alta un segundo tenant, el
  sistema no avisa: exactamente el estado que este control venía a corregir. La diferencia
  con ayer es que ahora el hueco tiene nombre, salida ruidosa en CI y esta entrada — pero un
  control que no puede mirar no informa, y eso no cambia por estar declarado.
- **Por qué no lo decide el agente**: poner la llave que **bypassa RLS** en los secretos de
  un repositorio con cuatro colaboradores con permiso de escritura amplía el radio de esa
  credencial. Es una decisión de alcance de credencial de la dueña, no una tarea pendiente.
  Alternativas que ella puede preferir: una llave de solo lectura acotada a `organizaciones`,
  o correrlo como host-job en el servidor (hoy incomunicado) en vez de en CI.
- **Mitigaciones vigentes**: la línea base está tomada contra producción (**1 tenant**, hoy),
  así que el estado de partida es conocido y no supuesto; el alta de un tenant no es un
  accidente silencioso —hay que crearlo— y el ROADMAP ya lista la tenencia entre las
  decisiones abiertas; la lista de superficies queda **congelada** por el bloque 7b, así que
  la exposición no crece mientras tanto; y activar el detector es quitar una línea
  (`continue-on-error`) una vez exista el secreto.
- **Firmado por** (nombre y rol): _pendiente de firma_
- **Vigencia / próxima revisión**: **antes de dar de alta el segundo tenant** — o al decidir
  el alcance de la credencial, lo que ocurra primero.

<!-- Añadir aquí las decisiones siguientes. NO editar las anteriores. -->

---

## Pendientes de enrutar (no son entradas todavía)

Los hallazgos de seguridad de §7 del plan de alineación
(`docs/planes/ALINEACION-GOBERNANZA-hermes-os-a2a.md`) **no son trabajo de gobernanza** y
no se resuelven aquí, pero tampoco se quedan sin dueño: cada uno entra como entrada
firmada o como AISIA pendiente conforme se aborde.

⚠️ **Tres de ellos tocan datos de terceros y, por el límite de C5 declarado arriba, NO son
firmables**: se rediseñan o no se hacen. Enumerarlos aquí es el punto — taparlos con una
firma sería usar la gobernanza al revés.
