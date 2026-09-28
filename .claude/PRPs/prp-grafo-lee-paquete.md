# PRP: El grafo lee el paquete de conocimiento (deja de ser fuente propia)

> **Estado:** APROBADO. El laboratorio cerró la Fase 0 el 2026-09-27. Se ejecuta por fases, y la Fase 4 sigue siendo
> gate humano.
> **Fecha:** 2026-09-27
> **Proyecto:** Hermes OS · A2A · **Servicio:** `businessos/grafo/`
> **Origen:** el congelamiento del seed (PR #317) anunciaba este PRP: «Hermes pasará a leer de ese paquete
> en un PRP aparte, con firma».
> **CDC aplicable:** **sí**, acotado a la Fase 3 (`CLAUDE.md` y una frase del skill `hermes-regulatory-scan`
> dejan de decir «congelado» y pasan a decir «generado desde el paquete»).
> **Coordinación:** con `prp-cola-huecos-regulatorios.md` (#321), la mitad de salida. Los dos usan **una sola
> identidad del conocimiento servido** (§Identidad, más abajo), y los textos del copiloto son del #321.

---

## Objetivo

Que el conocimiento del grafo **deje de sembrarse aquí**. `seed/reglas.json` pasa a **generarse** desde el
paquete de conocimiento `@tu-scope/conocimiento` en una **versión exacta**, recortado a los dominios que Hermes
registra y fijado con su huella sha256. Ese paquete
es la fuente única de las reglas, que vive en el monorepo privado de la fábrica. Hermes lo **lee**: no lo edita,
no lo forkea y no se actualiza solo.

## Por Qué

| Problema | Solución |
|----------|----------|
| Desde el 2026-09-27 hay dos copias del conocimiento: el seed de aquí, congelado, y el paquete, que sigue creciendo. Una misma pregunta puede recibir dos respuestas | Una sola fuente: `reglas.json` se genera del paquete fijado |
| El congelamiento solo **impide** cambiar: el grafo no recibe nunca una regla nueva | Subir el pin del paquete es la forma de recibirlas, con firma |
| El seed de aquí trae dos problemas que el paquete ya corrigió, con firma del laboratorio: la regla de la LFPDPPP de 2010 **borrada** por `_bajas` (un hecho de 2024 se quedó sin regla) y el conflicto permanente de `INTERESES` | Al leer el paquete, el grafo recibe las dos correcciones |

**Valor:** el grafo responde con el mismo conocimiento que cualquier otro proyecto de la fábrica, auditado por un
gate de siembra que el `gen_seed_sql.py` de aquí no tiene: conflictos de veredicto, contención de keywords y un
historial de solo añadir.

## Qué

### Criterios de Éxito
- [ ] `seed/reglas.json` **se genera** del paquete fijado, y editarlo a mano pone rojo el CI (control negativo medido)
- [ ] El pin vive en el repo: nombre, versión y huella del paquete, los dominios que Hermes registra y la huella del
      recorte. La huella del recorte se comprueba en cada PR
- [ ] Solo se publica aquí el **recorte** de los dominios de Hermes, nunca el paquete entero. Hoy, con los 17
      dominios, el recorte es idéntico al paquete (medido el 2026-09-27)
- [ ] Un PR que cambia `PIN.json` sin entrada nueva en `BITACORA-CDC.md` pone rojo `grafo-congelado` (control negativo
      medido)
- [ ] `gen_seed_sql.py --check` en verde con el seed generado: **99 reglas** en la versión 0.2.0
- [ ] `_meta.source_version` del seed generado es exactamente `<nombre>@<versión> sha256:<huella del recorte>`: es la
      identidad del conocimiento servido que lee la cola del #321 (§Identidad)
- [ ] **Diferencias exactas y declaradas.** El motor de aquí, corrido sobre el seed viejo y sobre el generado, cambia
      de contenido **solo** en los casos de las dos correcciones firmadas: 10 de `INTERESES` y 2 de confidencialidad
      antes de 2025. **Ningún estado cambia en ningún caso.** Lo demás es idéntico o igual salvo el orden de sus
      listas: el paquete ordena las reglas por clave
- [ ] pytest del grafo, `grafo-a2a` y `grafo-gate` en verde; las pruebas que fijaban lo que el paquete corrige se
      ajustan **declarándolo** (el conteo pasa de 98 a 99 y `test_bajas` cambia)
- [ ] El job `grafo-congelado` **conserva su nombre**, porque es un check obligatorio de `master`, y comprueba que
      el seed sea el del paquete fijado
- [ ] En runtime (Hetzner): `/health` da `reglas: 99`, `drift-runtime.py` no reporta deriva del grafo, y se
      verifican en vivo los casos de las dos correcciones
- [ ] `verify:gobernanza` y el gate de documentos vivos en verde; entrada de CDC en `BITACORA-CDC.md` para la Fase 3

### Comportamiento Esperado
Nadie siembra en Hermes. Una regla nueva se siembra en la fuente única, que publica una versión. Para recibirla, aquí
un agente **prepara la subida del pin**. Genera el recorte en la fuente única, con los dominios del pin, y corre
`seed/actualiza_paquete.py <recorte>`, que regenera `reglas.json` y `02-seed.sql` y mide las diferencias. El PR se
mezcla solo con la entrada del laboratorio, firmada, en `BITACORA-CDC.md`. Después se aplica en runtime.

## Contexto

### Referencias
- `businessos/grafo/seed/CONGELADO.sha256` y el job `grafo-congelado` (PR #317): el congelamiento que este PRP
  sustituye por «congelado al paquete fijado».
- `businessos/grafo/seed/gen_seed_sql.py`: sigue siendo el generador del SQL, sin cambios.
- `businessos/grafo/evaluador.py`: **no cambia**. El paquete conserva a propósito los nombres de campo de este seed
  (`veredicto_base`, `fuente_cita`, `vigente_desde`…). Ya se midió en la fábrica: este motor lee el paquete **sin
  adaptador** y da las mismas respuestas salvo las dos correcciones firmadas.
- Consumidores del seed que deben seguir funcionando: `gen_seed_sql.py`; las pruebas de `grafo/`, `grafo-a2a/` y
  `flujos-a2a/`; `drift-runtime.py`, que compara la BD viva con el seed; y `revisar-vigencias.py`.
- `prp-cola-huecos-regulatorios.md` (#321): registra huecos solo contra el conocimiento que el grafo declara servir.
  Es dueño de los textos de `escaneo-regulatorio.ts` y `SPEC.md` del copiloto, y del paso 4 del skill
  `hermes-regulatory-scan` (destino de las propuestas). Este PRP no los toca.
- `.claude/memory/project/fase8-grafo-regulatorio.md`: el PENDIENTE de runtime, porque la red del servidor está
  cortada desde ~27-28 de agosto.

### Arquitectura Propuesta
```
businessos/grafo/seed/
├── paquete/recorte.json        # el paquete RECORTADO a los dominios de Hermes, VENDORIZADO tal cual (no se edita)
├── paquete/PIN.json            # { nombre, version, sha256_paquete, dominios, sha256_recorte }
├── desde_paquete.py            # paquete → reglas.json en el formato de siempre (añade _meta; ignora dominios)
├── actualiza_paquete.py        # sube el pin: extrae, comprueba la huella, regenera, mide diferencias
├── reglas.json                 # GENERADO (antes: fuente de verdad editada a mano)
├── 02-seed.sql                 # generado, como siempre
└── CONGELADO.sha256            # pasa a fijar reglas.json + 02-seed.sql GENERADOS del pin (misma mecánica)
```
- `desde_paquete.py` construye `_meta` (con `source_version` = `<nombre>@<versión> sha256:<huella del recorte>`, y
  `regimen_default`), copia jurisdicciones, dimensiones, categorías y reglas, y **no** emite `_bajas`: el paquete no
  borra, cierra vigencias. Los campos que el paquete añade para otros consumidores los ignora este motor, como ya se
  midió.
- **El recorte se genera en la fuente única**, con `seleccionaDominios` del motor: es la única implementación, y
  no se reescribe en Python. La herramienta que lo emite (recorte + `PIN.json`) va en un PR aparte en ese repo
  (Fase 1). Aquí solo se recibe y se comprueba.
- El job `grafo-congelado` gana dos pasos:
  - regenera `reglas.json` desde `paquete/` y exige igualdad byte a byte con el versionado, además de la huella del
    recorte;
  - si `PIN.json` cambia, exige una entrada nueva en `BITACORA-CDC.md`.

### Identidad del conocimiento servido (contrato común con el #321)
Una sola respuesta a «¿qué conocimiento sirve este grafo?», para operar y para la cola de huecos:
- **Qué es:** la `source_version` de las reglas cargadas. `02-seed.sql` la escribe en **cada** regla de la BD y el
  servicio la lee de ahí. Hoy es el texto de procedencia del seed congelado. Cada siembra lo cambió: medido sobre 12
  versiones del seed (de 45 a 98 reglas), dan 12 textos distintos. Así, el runtime de 68 reglas ya se distingue del
  corte congelado. Con este PRP pasa a ser `<nombre>@<versión> sha256:<huella del recorte>`.
- **Cómo se declara:** el servicio la calcula sobre lo que cargó, junto con el conteo de reglas. Si lo cargado tiene
  más de una `source_version` (un seed a medio aplicar, o reglas viejas que el upsert no tocó), la identidad es
  **mixta** y no coincide con ninguna. Va en la respuesta de `POST /evaluaciones`, porque es la única ruta que el
  gate público proxya (el copiloto en Vercel **no** alcanza `/health`), y también en `/health`, para operar.
- **Contra qué se compara:** contra la que el repo genera del seed versionado, **no** contra un `97d9f9e` fijo. El
  copiloto la toma del mismo monorepo. Así, el PR que sube el pin mueve también lo esperado, y la cola no deja de
  registrar en silencio.
- **Fail-safe:** si es «mixta», falta o es distinta de la esperada, la cola **no registra**. Es lo que ya separa al
  runtime de 68 reglas y evita demanda falsa.
- **Pausa, no error:** tras desplegar el copiloto con un pin nuevo, mientras el runtime siga con el viejo, la cola
  queda en pausa hasta que se aplique el seed (Fase 4). La UI lo dice así: «cola en pausa: el grafo sirve X, se
  espera Y».
- **Quién lo construye:** la Fase 2 del #321. Es un cambio de API, que el congelamiento permite. Este PRP solo fija
  el formato de `source_version` desde el pin. Sirve igual en cualquier orden: si el #321 corre primero, declara la
  identidad del seed congelado, y al ejecutar este PRP cambia el valor, no el contrato.

### Modelo de Datos
Sin cambios de esquema. En la BD viva, el upsert de `02-seed.sql` **re-inserta** la regla de 2010, ya cerrada, que
`_bajas` había borrado. `evaluaciones` no se toca.

### Modelo de amenazas (mini)
- **Activos que toca:** la integridad del conocimiento regulatorio (qué se responde y con qué fuente) y el seed de la
  BD `grafo-db`.
- **Fronteras que cruza:** un artefacto que llega de **otro repositorio**: el recorte del paquete. Se valida con la
  huella del pin, se regenera en CI y lo protege un check obligatorio.
- **Atacante relevante:** O5, cadena de suministro: un paquete alterado o una versión que no se revisó.
- **Controles:**
  - versión exacta y huella en `PIN.json`;
  - el CI rehace el seed desde el paquete vendorizado y lo compara;
  - `grafo-congelado` es obligatorio en `master`;
  - subir el pin exige firma y diferencias medidas.
- **Brechas declaradas:**
  - Nada avisa todavía de que existe una versión nueva. Hoy se vigila a mano; un vigilante automático nace cuando
    el paquete se publique en un registro.
  - El CI de este repo público **no puede** comprobar que el recorte salió de esa versión del paquete: el paquete es
    privado. Se comprueba al firmar, del lado de la fuente única. Regenerar el recorte con la versión y los dominios
    del pin debe dar la misma huella, y `versiones.json` guarda, solo añadiendo, la huella de cada versión.
  - El CI comprueba que **hay** una entrada en la bitácora, no quién la escribió. La firma la pone una persona, como en
    el resto del CDC.

### Evaluación de impacto — AISIA
- **Partes afectadas:** quien pregunta por `#dep-legal`, meeting-copilot, `grafo-a2a` o el escaneo regulatorio, y los
  terceros sobre los que se decide (clientes y leads).
- **Daños posibles SIN atacante:**
  1. Durante la transición, repo y runtime responden distinto hasta aplicar el seed. Hoy ya pasa: según la
     memoria, runtime ni siquiera tiene las 98 reglas.
  2. Una subida de pin mal revisada cambia respuestas.
- **Mitigaciones:**
  - las diferencias se miden y se declaran antes de firmar;
  - `drift-runtime.py` reporta la deriva entre repo y BD;
  - las dos correcciones de este cambio **no mueven ningún estado**: cambian una razón y una bandera, y le devuelven
    su regla a un hecho de 2024.

### Confianza del agente
`grafo-a2a` no cambia de contrato ni de superficie.
```
Confianza: Constraint
Justificación: el puente sigue siendo determinista y opaco; lo único que cambia es la procedencia de las reglas, fijada por huella.
```

### ¿Este PRP cambia comportamiento de agentes? (CDC)
- **CDC aplicable:** **sí**, en la Fase 3. `CLAUDE.md` (sección del grafo) y `.claude/skills/hermes-regulatory-scan/SKILL.md`
  hoy dicen «congelado»; pasan a decir «generado desde el paquete fijado; se siembra en la fuente única». Gate
  estándar: diff, regresión y entrada en `BITACORA-CDC.md`.

---

## Blueprint (Assembly Line)

> Solo fases. Las subtareas se generan al entrar a cada una (bucle agéntico).

### Fase 0: Decisiones del laboratorio — GATE ✅ cerrada el 2026-09-27
Medido antes de decidir:
- Las reglas que Hermes usa quedan públicas de todos modos, porque `reglas.json` se versiona aquí.
- Frente al seed congelado, lo nuevo es poco:
  - 1 regla: la ley de 2010, que ya está en el historial;
  - 13 reglas con impactos distintos, por las dos correcciones firmadas;
  - el vocabulario de 5 dimensiones;
  - la procedencia partida por dominio.
- Los 17 dominios declaran su cita pública, y las 98 reglas comunes tienen título, texto, fuente y vigencias
  idénticos.

Decisiones del laboratorio:
1. **Visibilidad: solo los dominios de Hermes.** Se vendoriza el **recorte** de los dominios que Hermes registra,
   nunca el paquete entero. Si no, cada subida del pin publicaría aquí los dominios que otros proyectos siembren en la
   fuente única. Hoy, con los 17 dominios, el recorte es idéntico al paquete. La primera versión de este PRP (#322)
   nombró la ruta del JSON ensamblado y tres campos del paquete. Se quitaron del texto (#323), pero siguen en el
   historial: son nombres de estructura, no contenido.
2. **Canal: vendorizado con pin.** El recorte y `PIN.json` viven aquí, y el CI no necesita credenciales. Hoy el
   paquete no está publicado en ningún registro, y un registro privado exigiría un token en el CI de un repo público.
3. **Check: se conserva `grafo-congelado`.** Es obligatorio en `master`, y renombrarlo obligaría a tocar la
   protección en el mismo paso.
4. **El pin lo sube un agente y lo firma el laboratorio.** El agente prepara el PR y mide y declara las diferencias.
   Se mezcla solo con una entrada firmada por el laboratorio en `BITACORA-CDC.md`, porque cambia lo que el grafo
   responde. `grafo-congelado` lo exige (Fase 2).

**Validación:** decisiones escritas en este PRP y en `DECISIONES.md`; estado APROBADO.

### Fase 1: Vendorizar y generar
**Objetivo:**
- en la fuente única, un PR aparte con la herramienta que emite el recorte y `PIN.json` desde una versión y una lista
  de dominios, usando `seleccionaDominios`;
- aquí: `paquete/` con `recorte.json` y `PIN.json` (0.2.0, los 17 dominios), `desde_paquete.py` y
  `actualiza_paquete.py`, y el `reglas.json` y el `02-seed.sql` regenerados.

**Validación:**
- la huella del recorte vendorizado es la del pin, y regenerarlo en la fuente única con la versión y los dominios del
  pin da la misma;
- `gen_seed_sql.py --check` da 99 reglas;
- el script de diferencias, que corre este motor sobre el seed viejo y sobre el nuevo con las familias de casos del
  corpus de paridad (cada keyword, exclusiones, vigencias, régimen, incidentes), da como contenido distinto
  **exactamente** los 12 casos declarados, y ningún cambio de estado;
- pytest verde, con los ajustes declarados (conteo 99, `test_bajas`, pruebas de orden si las hay).

### Fase 2: El CI fija el seed al paquete
**Objetivo:** `grafo-congelado`, con el mismo nombre, comprueba:
- la huella del recorte;
- que `reglas.json` y `02-seed.sql` sean exactamente los generados;
- que un cambio de `PIN.json` traiga una entrada nueva en `BITACORA-CDC.md`.

`CONGELADO.sha256` se regenera con ellos.

**Validación:** controles negativos en un PR de ensayo. Cada uno de estos cambios pone rojo:
- editar `reglas.json` a mano;
- tocar el recorte vendorizado sin cambiar el pin;
- cambiar el pin sin entrada en la bitácora.

Con todo en su sitio, verde.

### Fase 3: Textos de agentes — CDC
**Objetivo:** documentar cómo se sube el pin y dónde se siembra ahora, en `CLAUDE.md` (sección del grafo),
`businessos/grafo/README.md` y la memoria `fase8-grafo-regulatorio.md`. Del skill `hermes-regulatory-scan` se toca
**una sola frase**: la del paso 4 que dice que `reglas.json` está congelado desde `97d9f9e`, porque deja de ser cierta.
**No se tocan** (son del #321): el resto del paso 4 y el *Uso manual* del skill, `escaneo-regulatorio.ts` y el
`SPEC.md` del copiloto. Si este PRP se ejecuta antes que la Fase 1 del #321, el `destino` viejo del copiloto sigue
como pendiente declarado en `BITACORA-CDC.md` (anotado el 2026-09-27). No se arregla aquí.
**Validación:** diff, regresión y entrada en `BITACORA-CDC.md`, firmada; `verify:gobernanza` en verde. Quien mezcle
segundo rebasa la frase del paso 4, sin duplicarla.

### Fase 4: Runtime — GATE HUMANO (bloqueada mientras la red del servidor siga cortada)
**Objetivo:** aplicar el `02-seed.sql` generado en `grafo-db` con psql (idempotente) y reiniciar `grafo`.
**Validación:**
- `/health` da `reglas: 99`;
- `drift-runtime.py`, sin deriva del grafo;
- en vivo por `POST /evaluaciones`: intereses → `dudoso` sin la bandera de conflicto; confidencialidad con un hecho de
  2024 → la ley de 2010;
- si la Fase 2 del #321 ya corrió: el dictamen declara la identidad del pin (no «mixta») y el copiloto vuelve a
  registrar huecos;
- `evaluaciones` intactas.

### Fase 5: Validación Final
**Objetivo:** el grafo responde desde el paquete, en repo y en runtime.
**Validación:**
- [ ] Criterios de éxito cumplidos, cada uno demostrado por un gate que corre
- [ ] `npm run verify:gobernanza` y la regresión en verde
- [ ] Señal costosa: nada se acepta por promesa

---

## Gotchas conocidos
- **El orden de las listas cambia.** El paquete ordena las reglas por clave, y este motor arma checklist, banderas y
  fuentes en el orden del seed. Una prueba que fije el orden exacto de una lista se ajusta: no es una regresión.
- **`_bajas` desaparece del seed generado.** El mecanismo sigue en `gen_seed_sql.py`, pero el paquete retira cerrando
  `vigente_hasta`. `test_bajas.py` pasa a comprobar eso.
- **La procedencia cambia de forma.** `_meta.source_version` deja de ser un solo texto largo: la procedencia viene
  del paquete, partida por dominio, y aquí se resume como `<nombre>@<versión> sha256:<huella del recorte>`. Ese valor es
  también la identidad del conocimiento servido: cambiarle el formato sin avisar al #321 rompe la comparación de la
  cola.
- **El upsert no borra.** Una regla que salga del seed se queda en la BD con su `source_version` vieja, y la identidad
  pasa a «mixta». Es la señal correcta: el runtime no sirve exactamente lo fijado.
- **Hoy el recorte es idéntico al paquete, y mañana no.** Con los 17 dominios coinciden byte a byte. Dejará de
  pasar en cuanto la fuente única siembre un dominio de otro proyecto, y eso es justo lo que el recorte deja fuera.
- **No se toca `evaluador.py`.** Si hiciera falta, este PRP estaría mal planteado: el paquete se diseñó para que este
  motor lo lea tal cual.

## Anti-Patrones
- NO editar `reglas.json` ni `paquete/recorte.json` a mano: se genera y se vendoriza.
- NO vendorizar el paquete entero: publicaría aquí los dominios de otros proyectos (Fase 0, decisión 1).
- NO reescribir `seleccionaDominios` en Python: el recorte se genera con el motor, en la fuente única.
- NO sembrar una regla aquí «porque es urgente»: se siembra en la fuente única y se sube el pin.
- NO subir el pin sin medir y declarar las diferencias.
- NO renombrar `grafo-congelado` sin actualizar a la vez la protección de `master`.

## Aprendizajes (Self-Annealing)
> Crece con cada error encontrado al ejecutar este PRP.
