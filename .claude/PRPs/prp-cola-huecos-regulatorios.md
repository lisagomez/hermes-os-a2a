# PRP: Cola de huecos regulatorios del Pre-Discovery hacia el laboratorio (lado Hermes)

> **Estado**: PENDIENTE
> **Fecha**: 2026-09-27
> **Proyecto**: hermes-os-a2a · `businessos/frontends/meeting-copilot` + Supabase compartido (A2ABot)
> **Contraparte**: el consumidor del laboratorio vive en el monorepo **privado** de la fábrica y
> es **otro PRP, allá**. Este PRP no escribe una línea en ese repo: solo publica, del lado de
> Hermes, una lectura acotada y un canal de estado de vuelta. La propuesta para el laboratorio
> está en el PR #161 de ese repo (sin aplicar, espera su visto bueno).
> **Origen**: pendiente anotado el 2026-09-27 en `BITACORA-CDC.md` y en el ROADMAP (§Línea Grafo):
> *"`meeting-copilot` sigue etiquetando sus propuestas con `destino: grafo/seed/reglas.json`; va en
> su propio PR, junto al PRP que haga leer a Hermes de la fuente única"*. Este PRP cubre la mitad
> de **salida** (Hermes → laboratorio). La mitad de **entrada** (Hermes lee la fuente única) sigue
> siendo un PRP aparte, con firma: `prp-grafo-lee-paquete.md` (#322).
> **Coordinación con el #322**: los dos usan **una sola identidad del conocimiento servido**, definida
> en su §Identidad. Donde este PRP dice «corte congelado», léase «la identidad que el repo fija»: hoy
> `97d9f9e`, y tras ejecutar el #322, la del pin del paquete. Los textos del copiloto
> (`escaneo-regulatorio.ts`, su `SPEC.md`) y el paso 4 del skill son de **este** PRP; el #322 solo
> cambia la frase del paso 4 que dice que `reglas.json` está congelado.

---

## Objetivo

Que cada hueco regulatorio que el Pre-Discovery detecte contra el grafo **real** quede registrado
en una cola de Supabase, **agrupada por demanda** (tipo + sector + categoría) y **desidentificada**
en todo lo que sale. El laboratorio la consume **por pull** con un rol que solo puede leer esa cola
y marcar su estado (en investigación / sembrada vX / descartada), y ese estado se ve de vuelta en
el caso. Ningún dato del lead viaja, y sembrar sigue siendo un acto humano en la fuente única.

## Por Qué

| Problema | Solución |
|----------|----------|
| Las propuestas de seed solo existen mientras alguien tiene el caso abierto: se calculan en el navegador y salen por una descarga JSONL manual. Nadie sabe cuántos leads chocaron con el mismo hueco | Cola persistente con conteo de **casos distintos** por demanda: el laboratorio prioriza por evidencia de demanda, no por el último caso que alguien exportó |
| El JSONL lleva `leadId`, las URLs del sitio del lead y, en `nuevo_ambito`, el giro literal del intake. Reenviarlo al laboratorio saca datos de terceros hacia otro repo | Lo que sale es un contrato **cerrado**: tipo, sector, categoría, conteo, semanas y corte. La traza hacia el caso se queda en Hermes |
| El `destino` sigue apuntando a `grafo/seed/reglas.json`, que está congelado desde `97d9f9e` | El destino pasa a la fuente única (PRP-005) |
| No hay vuelta: el equipo de Hermes no sabe si un hueco se está investigando, ya se sembró o se descartó | Estado de vuelta escrito por un rol acotado del laboratorio, visible en el caso y en la bandeja del módulo |
| Hoy el escaneo genera huecos **falsos**: se compara contra un espejo de 11 categorías y contra un runtime atrasado (ver *Estado actual*) | Solo se registra lo observado contra el grafo real, con el corte congelado y fuera del espejo |

**Valor de negocio**: la inversión en investigación regulatoria (cara: cada regla se lee de fuente
primaria) se dirige a lo que los leads reales piden, medido. Los asesores dejan de tener que
explicar "no lo cubrimos" sin saber si alguien lo está resolviendo, y los datos de los leads no
salen del perímetro de Hermes para lograrlo.

## Qué

### Criterios de Éxito

- [ ] Un caso real, analizado contra el grafo real con el corte congelado, registra sus huecos en
      la cola **sin acción manual**. Regenerarlo N veces deja el conteo en **1 caso**
      (idempotencia por `(clave, caso)`).
- [ ] **Cero registros** desde: el mock del grafo, un caso demo (incluida su copia al regenerarlo),
      un runtime que no sirva el corte congelado y un hueco del espejo `SECTORES`. Cada exclusión
      tiene su prueba y su control de reversión (quitar el filtro pone la prueba en rojo).
- [ ] La salida hacia el laboratorio tiene **exactamente** las columnas del contrato. Una prueba
      falla si aparece cualquier columna fuera de esa lista. Otra siembra un caso con una URL y un
      giro "trampa" y comprueba que ninguno de los dos aparece en la salida.
- [ ] El rol del laboratorio **puede** leer la cola y marcar estado. **Falla por el motivo
      correcto** (`permission denied for …`, no un error de conexión) al leer ocurrencias, `leads`
      o cualquier otra tabla, y al escribir en la cola o en las ocurrencias.
- [ ] `anon` y `authenticated` no ejecutan ninguna función nueva ni leen ninguna tabla nueva.
      Verificado en el efímero, y con `get_advisors` en producción antes y después, sin alertas
      nuevas.
- [ ] El `destino` apunta a la fuente única (PRP-005): **cero** apariciones de
      `grafo/seed/reglas.json` como destino en `src/` y en el `SPEC.md` del copiloto.
- [ ] El estado de vuelta se ve en el caso: *en investigación*, *sembrada vX* o *descartada* con su
      motivo. *Sembrada vX* lleva la advertencia de que Hermes sigue sirviendo el corte congelado
      hasta el PRP de lectura.
- [ ] **Vía de apelación**: la vista del laboratorio muestra la demanda **posterior** al último
      estado. Un hueco descartado que sigue acumulando casos vuelve a la vista sin que nadie lo pida.
- [ ] Un `nuevo_ambito` **no se publica** sin una etiqueta de sector puesta por el equipo en
      `/pre-discovery/admin`. El giro del lead nunca se convierte en etiqueta por sí solo.
- [ ] El Copilot en Vercel **no gana ninguna variable de entorno nueva** ni credencial alguna hacia
      el laboratorio o su repo.
- [ ] Gates verdes: `grafo-congelado` (cero diff en el seed), tenencia (`replay.sh` +
      `control-reversion.sh`) con las tablas nuevas clasificadas, `verify:gobernanza` (declaración
      C7 nueva), `npm run regresion`, y en el copiloto `typecheck`, `lint`, `build` y `test`.
- [ ] **Aplicado** a producción y verificado: sondeo 404→200 de cada tabla, rol creado, control
      positivo y negativo con la credencial real. Una migración mergeada no es una migración
      aplicada.

### Comportamiento Esperado

**Camino feliz**

1. El asesor analiza un caso. El bloque regulatorio sale del grafo real (`conexion: 'grafo'`) y
   el dictamen declara que sirve el corte congelado.
2. El escaneo *declarado vs esperado* corre igual que hoy. Además, separa lo que es hueco **del
   grafo** de lo que es hueco **del espejo** `SECTORES`.
3. El navegador envía al servidor del copiloto solo `caso_id`, el corte y la lista de huecos en
   vocabulario cerrado: tipo, `sector_id` del mapa y categoría del seed.
4. El servidor exige sesión con allowlist, valida con Zod contra ese vocabulario (cualquier texto
   libre da 400) y llama a la RPC de registro, que es la **única** pluma de la cola.
5. El caso muestra un chip por hueco: *registrado en la cola del laboratorio · N casos con esta
   demanda*.
6. Un `nuevo_ambito` cae en una bandeja de triage de `/pre-discovery/admin`. Alguien del equipo le
   asigna una etiqueta del vocabulario de sectores y solo entonces se vuelve visible para el
   laboratorio.
7. El laboratorio, desde su repo y con su credencial, llama a la función de lectura y recibe la
   cola desidentificada. Investiga desde **fuente primaria**: la demanda es el disparador, no la
   fuente. Si siembra, lo hace en la fuente única con su propio gate y su firma humana.
8. El laboratorio marca el estado con la función de escritura. La fila de estado es append-only y
   su único escritor es el laboratorio.
9. El caso y la bandeja muestran el estado. Si es *sembrada vX*, el copy dice que Hermes lo
   servirá cuando lea esa versión (PRP aparte), y lista qué casos conviene regenerar entonces.

**Caminos no felices (todos visibles, ninguno silencioso)**

- Dictamen desde el mock → *"no se registró: el dictamen salió del mock"*. Es lo que ocurre
  **hoy**: el servidor tiene la red cortada y el copiloto cae al mock.
- Runtime con otro corte, o sin declarar el suyo → *"no se registró: el grafo en runtime no sirve
  el corte congelado"*. Esto además revela la deriva de despliegue desde el propio caso.
- Caso demo → no se registra, y la UI no ofrece hacerlo.
- Supabase no configurado → 503 declarado. Falla la RPC → chip de error en el caso y `console.error`
  en el servidor: un best-effort que nadie loguea es un fallo invisible.

### Fuera de alcance

- El consumidor del laboratorio (su job de pull, su investigación y su siembra). Es un PRP del repo
  privado.
- Que Hermes lea de la fuente única o descongele su seed: el #322, con firma del laboratorio.
- Aplicar el seed de 98 reglas al runtime. Es un pendiente existente, bloqueado por la red del
  servidor, y lo detecta `drift-runtime.py`.
- Reescribir el mapa `SECTORES` para cubrir las 61 categorías. Aquí solo se deja de confundir su
  hueco con un hueco del grafo.

---

## Contexto

### Estado actual (medido el 2026-09-27, no supuesto)

| Hecho | Dónde |
|---|---|
| `propuestasSeed` se calcula **en el navegador** y solo sale por descarga JSONL. No se persiste en ningún lado; los casos viven en `localStorage` (zustand `persist`) | `bloques-ui.tsx:313-322`, `store.ts` |
| El JSONL lleva `leadId`, `casoId`, `evidencia[].fuente` (URLs del sitio del lead) y un `motivo` que en `nuevo_ambito` **incrusta el giro literal** del intake | `escaneo-regulatorio.ts::propuestasSeed` y la rama `!def` de `escaneoRegulatorio` |
| `destino` apunta a `grafo/seed/reglas.json`, congelado desde `97d9f9e` | `escaneo-regulatorio.ts`, `SPEC.md` §Hermes-Regulatory-Scan |
| El escaneo se adjunta en **todos** los caminos, mock incluido (`conexion: 'mock'`) | `pipeline.ts:338`, `grafo.ts` |
| `SECTORES` espeja **11 categorías en 4 sectores**; el seed congelado tiene **61 categorías / 98 reglas**. "VACÍO DEL GRAFO" se decide contra el **espejo**: un agente aduanal o un caso T-MEC daría `nuevo_ambito` aunque el grafo sí lo cubra | `escaneo-regulatorio.ts::SECTORES`; `grafo/seed/reglas.json` |
| El runtime sirve **68 reglas / 43 categorías** (aplicado el 2026-08-20). `CARGA_AEREA_EAWB` y `AUTOTRANSPORTE_CARGA` entraron después (83→98), así que hoy un forwarder genera `nueva_senal`/`validar_regla` **falsos** | ROADMAP §Línea Grafo |
| `POST /evaluaciones` **no declara** qué conocimiento sirve, y el gate público solo proxya esa ruta (`/salud-conocimiento` no es alcanzable desde Vercel) | `businessos/grafo/schemas.py`, `businessos/edge/Caddyfile:73-76` |
| El servidor tiene la red cortada desde ~27-28 de agosto: el copiloto cae al mock | ROADMAP §Línea Grafo |
| `caso.leadId` del copiloto (`nuevoId('lead')`) **no es** el `lead_id` del CRM (`copilot-pd-<hash>`). El vínculo del lado del servidor es `leads.datos->>'casoId'` | `NuevoCaso.tsx:97`, `crm/lead-prediscovery.ts` |
| Un caso demo (`caso-gal`) se **copia a `casosUsuario` con el mismo id** al regenerarlo (copy-on-write) | `store.ts::actualizarBloque`, `fixtures.ts:313` |
| El copiloto ya usa `service_role` del lado del servidor para el CRM, declarado en C7 | `crm/data.ts`, `superficies-service-role.json` |
| El CI **no corre** los tests del copiloto: `verify` corre la raíz | `.github/workflows/ci.yml` |
| Toda tabla nueva de `public` debe clasificarse (T5) y su migración entrar a `orden.txt`; una tabla tenant nueva necesita el trigger `tenant_captura` | `supabase-organizaciones.sql` bloques 1 y 8, `tenancy/orden.txt` |

### Referencias

- `src/features/pre-discovery/escaneo-regulatorio.ts`: el cruce y `propuestasSeed`, que es lo que
  se parte en dos (interno / lo que viaja).
- `src/app/api/crm/leads/route.ts`: patrón de ruta interna (login + allowlist + Zod +
  `crmDisponible()` → 503 declarado + error logueado).
- `businessos/migrations/supabase-crm-movimientos.sql`: patrón de RPC auditada `security definer`
  con `search_path = ''` y `revoke` explícito.
- `businessos/erp/migrations/004_seguridad.sql` (comentario de `cli_fin`): patrón de rol `NOLOGIN`
  con grants + login creado a mano, con la contraseña fuera del repo.
- `.claude/skills/hermes-regulatory-scan/SKILL.md`: doctrina del paso 4, que cambia (CDC).
- `businessos/grafo/README.md`: el congelamiento **no bloquea** tocar el motor ni la API, solo el
  conocimiento.
- `businessos/gobernanza/decision-service-role.md` y `.claude/gobernanza/superficies-service-role.json`.

### Arquitectura propuesta

```
[navegador · caso Pre-Discovery]
   │  escaneo + huecos (cómputo local, como hoy)
   │  ✂ se registra SOLO si: conexion='grafo' ∧ corte == congelado ∧ caso ∉ demo ∧ hueco ∉ espejo
   ▼  POST /api/pre-discovery/huecos   { caso_id, corte, huecos:[{tipo, sector_id, categoria}] }
═══════════ FRONTERA 1: cliente → servidor (Zod, vocabulario CERRADO, sin texto libre) ═══════════
[copiloto · servidor Vercel]  login + allowlist · service_role YA existente (declarado C7)
   ▼  rpc public.registrar_huecos(...)          ← única pluma de la cola y de las ocurrencias
[Supabase Hermes]
   huecos_regulatorios            demanda agregada, SIN columnas del lead por construcción (global)
   huecos_regulatorios_ocurrencias (clave, caso_id)  traza interna — JAMÁS sale (tenant)
   huecos_regulatorios_estado     append-only · único escritor: el laboratorio (global)
   ── esquema `lab`, NO expuesto por PostgREST ──
   lab.leer_huecos()         → returns table(<contrato cerrado>)   security definer
   lab.marcar_hueco(...)     → valida estado/versión/motivo         security definer
═══════════ FRONTERA 2: Hermes → laboratorio (pull, rol acotado, solo lo desidentificado) ═══════════
   rol_lab_huecos (NOLOGIN: EXECUTE en las 2 funciones, nada más)
      ▲ miembro: cli_lab_huecos (LOGIN · contraseña creada a mano, vive SOLO en el entorno del laboratorio)
[laboratorio · repo privado]  job de pull + investigación en fuente primaria + siembra con firma (su PRP)
═══════════ FRONTERA 3: laboratorio → Hermes (estado: enum + versión validada + nota ≤280, es DATO) ═══════════
```

Tres decisiones de forma que sostienen las restricciones:

- **La desidentificación es por construcción, no por filtro.** La tabla agregada no tiene columna
  donde quepa un lead. La traza (`caso_id`) vive en otra tabla a la que el rol del laboratorio no
  tiene ningún grant. Ni siquiera se guarda el `lead_id`: el caso se resuelve hacia el CRM del
  lado de Hermes por `leads.datos->>'casoId'`.
- **Un escritor por tabla.** La RPC de Hermes escribe la cola y las ocurrencias; el laboratorio
  escribe **solo** su tabla de estado. Nadie comparte fila.
- **Pull, no push.** Nada en Hermes conoce la dirección, el repo ni una llave del laboratorio. El
  laboratorio tiene una credencial que solo alcanza dos funciones.

### Modelo de datos (forma, no implementación: nombres y detalle se fijan en la Fase 3)

```sql
-- 1 · Demanda agregada. Lo ÚNICO sobre lo que se construye la salida al laboratorio.
create table public.huecos_regulatorios (
  clave        text primary key,       -- 'tipo|sector_id|categoria', determinista
  tipo         text not null check (tipo in ('nueva_senal','validar_regla','nuevo_ambito')),
  sector_id    text,                   -- slug del mapa SECTORES o etiqueta de TRIAGE del equipo.
                                       -- Jamás texto del lead.
  categoria    text,                   -- categoría del seed congelado, o null (nuevo_ambito)
  corte_grafo  text not null,          -- contra qué conocimiento se observó
  publicable   boolean not null,       -- false: bandeja de triage de nuevo_ambito (no sale)
  creado_en    timestamptz not null default now()
);
-- El conteo y las fechas se DERIVAN de las ocurrencias: no se guardan dos veces.

-- 2 · Traza interna. Nunca tiene grant para el laboratorio.
create table public.huecos_regulatorios_ocurrencias (
  clave         text not null references public.huecos_regulatorios(clave),
  caso_id       text not null,         -- seudónimo; el lead se resuelve del lado de Hermes
  observado_en  timestamptz not null default now(),
  primary key (clave, caso_id)         -- idempotencia: regenerar no infla la demanda
  -- + tenant_id uuid (capa de tenencia: clasificación en tablas_tenant + trigger tenant_captura)
);

-- 3 · Estado de vuelta. Append-only; el estado vigente es la última fila.
create table public.huecos_regulatorios_estado (
  id             bigint generated always as identity primary key,
  clave          text not null references public.huecos_regulatorios(clave),
  estado         text not null check (estado in ('en_investigacion','sembrada','descartada')),
  version        text,                 -- obligatoria si 'sembrada', con formato validado
  motivo         text check (motivo in ('ya_cubierto','fuera_de_alcance','sin_fuente_primaria',
                                        'duplicado','ruido_del_escaneo')),  -- obligatorio si 'descartada'
  nota           text check (char_length(nota) <= 280),
  actor          text not null,        -- 'laboratorio:<nombre>'
  registrado_en  timestamptz not null default now()
);

-- Las tres: RLS habilitada aunque no tengan políticas (sin ella, los grants default de la
-- plataforma las dejan legibles por anon) + revoke all from anon, authenticated.
```

**Contrato de salida de `lab.leer_huecos()`**: es la lista cerrada que la prueba de columnas
verifica. Solo devuelve filas con `publicable = true`.

| Columna | Qué es |
|---|---|
| `clave`, `tipo`, `sector_id`, `categoria` | La demanda, en vocabulario cerrado |
| `casos` | Casos **distintos** que la observaron |
| `casos_desde_ultimo_estado` | La vía de apelación: demanda posterior al último estado |
| `primera_semana`, `ultima_semana` | Truncadas a semana ISO: no correlacionan con el alta de un lead concreto |
| `corte_grafo` | Contra qué conocimiento se observó |
| `estado`, `version`, `motivo`, `estado_en` | El estado vigente |

`motivo = ruido_del_escaneo` es la retroalimentación del laboratorio hacia Hermes: le dice que el
espejo o las señales del escaneo están generando demanda falsa.

### Decisiones abiertas (Fase 0: humanas, con recomendación)

| # | Decisión | Recomendación | Alternativa y su costo |
|---|---|---|---|
| D1 | ¿Registro automático o con botón? | **Automático**, idempotente y visible. Un conteo manual mide cuántas veces alguien se acordó, no la demanda | Botón: menos piezas, conteo sesgado. Es la costumbre que la doctrina desaconseja |
| D2 | ¿`validar_regla` viaja al laboratorio? | **Sí, con prioridad baja**: no es un hueco de conocimiento, pero su conteo dice qué reglas conviene re-verificar primero | Que quede interno: menos ruido para el laboratorio, se pierde esa señal |
| D3 | ¿Cómo se sabe contra qué conocimiento se observó? | **El grafo declara la identidad de lo que sirve** en `POST /evaluaciones`: la `source_version` única de las reglas cargadas, más su conteo, o «mixta» si hay más de una (contrato común con el #322, §Identidad). La calcula el servicio sobre lo que cargó; el seed no se toca. El copiloto la compara con la que el repo genera del seed versionado, **no** con `97d9f9e` fijo: cuando el #322 suba el pin, lo esperado se mueve en el mismo PR. Si no coincide o falta, **no registra**. Es cambio de API, no de conocimiento: el README del congelamiento lo permite | Registrar con `corte: desconocido` y que el laboratorio descarte a mano: ruido, fatiga (O3) y demanda falsa de las categorías que el runtime aún no tiene |
| D4 | La credencial del laboratorio: ¿quién la custodia, dónde vive y cada cuánto rota? | Login de Postgres por el pooler, patrón `cli_fin`. Vive **solo** en el entorno del laboratorio: nunca en este repo, nunca en Vercel, nunca en `businessos/.env`. Rotación declarada; si no se declara, va a C5 | PostgREST con JWT propio: exige firmar con el secreto del proyecto, que es una llave maestra. **Descartado** |
| D5 | El vocabulario de etiquetas de sector para el triage de `nuevo_ambito` | Lista corta que mantiene el equipo, extensible desde la bandeja | Texto libre del equipo: fragmenta la demanda ("Aduanas" vs "aduanero") |
| D6 | Granularidad temporal de la salida | **Semana ISO** | Día exacto: mejor para el laboratorio, correlacionable con el CRM |

### Modelo de amenazas (C3)

- **Activos que toca**:
  - **A8** (datos de leads): el principal. El riesgo es que el giro, las URLs del sitio o un
    identificador del lead salgan hacia otro repo. Mientras D-12 siga abierto (¿el template es
    público o privado?), cualquier cosa que el laboratorio persista podría acabar publicada.
  - **A9** (integridad del conocimiento), de forma indirecta: la cola decide **qué** se investiga,
    no **qué** se siembra.
  - **A5** (`service_role`): una ruta nueva la usa. La llave ya está en el entorno, así que el
    alcance crece pero la superficie de secretos no.
  - **Activo nuevo**: la credencial `cli_lab_huecos`. Su techo es leer demanda desidentificada y
    falsificar estados.
- **Fronteras que cruza**:
  1. **Navegador → servidor**. Los huecos se calculan en el cliente, así que se tratan como no
     confiables: Zod con vocabulario cerrado (`tipo`, `sector_id` del mapa, `categoria` del seed) y
     sin un solo campo de texto libre.
  2. **Hermes → laboratorio**. Solo el contrato cerrado de la salida. El sitio del lead es el
     disparador, nunca la fuente: ninguna URL ni cita viaja.
  3. **Laboratorio → Hermes**. El estado es **dato**: enum, versión con formato validado y nota de
     280 caracteres como máximo, que React renderiza como texto.
- **Atacante relevante**:
  - **O1**. Un lead redacta su giro o su sitio para inyectar instrucciones en el agente que
    investiga en el laboratorio. Se cierra por construcción: nada del lead viaja, y la etiqueta de
    `nuevo_ambito` la escribe el equipo.
  - **O3**. Fatiga en los dos lados: el laboratorio descarta en masa, o el equipo etiqueta sin leer.
  - **O6**. Se compromete la credencial del laboratorio. Puede leer demanda desidentificada y marcar
    estados falsos, que solo informan: no tocan el grafo ni ningún veredicto.
  - **O4**. Alguien del equipo infla la demanda creando casos. Hace falta una sesión con allowlist
    y el conteo es por caso: el valor para un atacante es bajo.
- **Controles**:
  - desidentificación por construcción (ninguna columna del lead en la cola) y prueba de columnas
    de la salida;
  - funciones en un esquema **no expuesto** por PostgREST, con `revoke execute` a `public`, `anon`
    y `authenticated`;
  - RLS habilitada en las tres tablas;
  - rol `NOLOGIN` con `EXECUTE` en dos funciones y nada más;
  - controles negativos en el efímero, más `get_advisors` antes y después;
  - declaración C7 de la ruta nueva;
  - clasificación de tenencia (T5);
  - historial de estado append-only con `actor`.
- **Brechas que quedan abiertas**:
  1. La credencial del laboratorio es compartida: la base no distingue a la persona detrás de
     `actor`.
  2. El conteo de demanda es inteligencia de negocio. No es dato personal, pero es confidencial, y
     su destino depende de D-12.
  3. La ruta nueva usa `service_role`. Su migración entra con el resto de las superficies en el
     alta del segundo tenant (C7).

### Evaluación de impacto — AISIA (C4)

- **Partes afectadas**:
  - los **leads**, que nunca eligieron alimentar la investigación de nadie;
  - el **equipo de Hermes**, que decide qué decirle a un lead;
  - el **laboratorio**, que invierte horas de investigación según la cola;
  - y, detrás, **quien reciba un dictamen** construido sobre lo que se siembre.
- **Daños posibles SIN atacante** (el sistema operando exactamente como se diseñó):
  1. **Demanda falsa por el espejo**: el laboratorio investiga, o peor, siembra un dominio que el
     grafo ya cubre, y nacen dos fuentes para lo mismo.
  2. **Demanda falsa por un runtime atrasado**: se piden categorías que ya están en el corte
     congelado.
  3. **"Sembrada vX" leído como "Hermes ya lo cubre"**: un asesor le dice a un lead que ya está
     cubierto mientras Hermes sigue sirviendo `97d9f9e`. Es *mergeado ≠ corriendo*, ahora entre
     dos repos.
  4. **Demanda inflada** por regeneraciones o por casos demo, y el laboratorio prioriza mal.
  5. **Exclusión**: un sector fuera del mapa depende de que alguien haga el triage. Si la bandeja
     se abandona, esa demanda es invisible.
  6. **Descarte sin apelación**: un hueco que sí importaba se descarta y nadie vuelve a mirarlo.
- **Severidad × probabilidad × reversibilidad**:

  | Daño | Severidad | Probabilidad | ¿Reversible? |
  |---|---|---|---|
  | Demanda falsa por el espejo o por el runtime | Media | **Alta** hoy (11/61 categorías; runtime en 43/61) | Sí, pero cuesta horas de investigación |
  | "Sembrada" leído como cobertura | **Alta**: contenido regulatorio de cara al cliente | Media | Depende de qué decidió el lead |
  | Demanda inflada | Baja-media | Media | Sí |
  | Triage abandonado | Media | Media | Sí, si se ve |
  | Descarte sin apelación | Media | Media | Sí, con la vía declarada |

- **Mitigaciones**:
  1. Los filtros de registro (espejo, corte, mock, demo), cada uno con su control de reversión.
  2. El copy obligatorio de *sembrada vX*: *"sembrada en la fuente única vX; Hermes sirve
     <identidad servida> hasta leer esa versión"*. La identidad sale del dictamen, no de un texto fijo.
  3. Idempotencia por caso.
  4. Contador visible de pendientes de triage en el módulo.
  5. `casos_desde_ultimo_estado` como vía de apelación automática.
  6. El motivo `ruido_del_escaneo`, que devuelve el problema a su origen.
- **Decisión**: **mitigar**. Que un dato de un lead salga hacia otro repo **no se acepta con una
  firma de C5**: es un daño que recae en terceros que no firmaron, así que se evita por diseño. Si
  un control de la Fase 3 no puede demostrarse en rojo, la feature no se promueve.

### Confianza del agente

No aplica: este PRP no crea ni modifica un servicio A2A ni una plantilla SC. El laboratorio consume
la cola con un job suyo. Su contenido es vocabulario cerrado, así que la superficie de inyección
hacia cualquier agente que la lea es, por construcción, la del vocabulario.

### ¿Este PRP cambia comportamiento de agentes? (CDC)

- **CDC aplicable: sí. Radio: skill.** Cambian el paso 4 y el *Uso manual* de
  `.claude/skills/hermes-regulatory-scan/SKILL.md`: el JSONL deja de llevar lead y URLs, el
  destino pasa a la fuente única y lo que sale hacia el laboratorio va desidentificado. Se añade
  un contrato de C2 que vigila esa regla, más un contrato **prohibido** que caza la forma vieja
  (`evidencia con URL`) si vuelve.
  - **Gate**: diff revisado + `npm run regresion` (C2 capa A) + `npm run verify:gobernanza` +
    entrada **nueva** en `BITACORA-CDC.md`, que cierra el pendiente anotado ahí el 2026-09-27.
  - **Runtime**: n/a. El skill corre en Claude Code y ningún volumen lo lleva.
- **No se tocan**: modelos, `SOUL`/`AGENTS`, `settings.json`, `.mcp.json` ni `prp-base.md`.
- **El cambio de API del grafo (D3) no es CDC**: añade un campo a la respuesta, compatible hacia
  atrás. Sí exige reconstruir el servicio, que hoy está bloqueado por la red.
- **C7**: la ruta nueva entra a `superficies-service-role.json` con su clase y su mitigación. Sin
  eso, `verify:gobernanza` se pone en rojo.

---

## Blueprint (Assembly Line)

> Solo fases. Las subtareas se generan al entrar a cada fase (bucle agéntico: mapear el contexto
> real → generar subtareas → ejecutar).

### Fase 0: Decisiones humanas
**Objetivo**: D1-D6 respondidas por Elisa o el laboratorio. D4 incluye quién custodia la
credencial y su rotación.
**Validación**: respuestas escritas en este PRP y en `DECISIONES.md`, y el PRP pasa a APROBADO. Si
D4 queda sin rotación, hay entrada en `REGISTRO-RIESGO.md`.

### Fase 1: Contrato desidentificado y filtros de registro (puro, en el copiloto)
**Objetivo**:
- `PropuestaSeed` se parte en **lo interno** y **lo que viaja**;
- clave de demanda estable, sobre slugs y no sobre etiquetas legibles;
- `destino` a la fuente única;
- las cuatro exclusiones: mock, demo, corte y espejo;
- "VACÍO DEL GRAFO" se distingue de "VACÍO DEL ESPEJO", y el mensaje ya no afirma que el grafo no
  tiene categorías cuando el dictamen sí clasificó algo;
- prueba guardiana: toda categoría de `SECTORES` existe en el seed congelado.

**Validación**: `npm test` del copiloto en verde, con un control de reversión por exclusión y por
la lista de claves de lo que viaja. Si borro el filtro, la prueba se pone en rojo.

### Fase 2: Identidad del conocimiento observado (según D3)
**Objetivo**: el dictamen del grafo declara qué conocimiento sirve, con el contrato común del #322
(§Identidad), y el copiloto lo compara con la identidad que el repo genera del seed versionado. Si
falta, es «mixta» o no coincide, no registra y dice por qué.
**Validación**:
- pruebas del grafo y del contrato del copiloto (`validarRespuestaGrafo` tolera el campo nuevo);
- `grafo-congelado` en verde, con **cero diff** en `seed/`;
- la prueba cubre los tres casos: un runtime con otra identidad no registra, uno «mixto» tampoco,
  y uno con la identidad fijada sí.

### Fase 3: Esquema, funciones y rol (migración)
**Objetivo**:
- las tres tablas, la RPC de registro y triage, y las dos funciones del esquema `lab`;
- `rol_lab_huecos` como `NOLOGIN`;
- clasificación de tenencia (dos globales y una tenant con `tenant_captura`) y su entrada en
  `orden.txt`.

**Validación**:
- `replay.sh` y `control-reversion.sh` en verde, con **sabotajes nuevos** que el ciclo debe cazar:
  quitar un `revoke`, añadir una columna a la salida y darle al rol del laboratorio lectura sobre
  las ocurrencias;
- suite SQL de la cola, con los controles positivos y negativos del rol y con la trampa de URL y
  giro.

### Fase 4: Ingesta desde el copiloto
**Objetivo**:
- la ruta `/api/pre-discovery/huecos` (login + allowlist + Zod cerrado + 503 declarado + error
  logueado);
- el disparo automático tras un bloque regulatorio que pase los filtros;
- el chip de estado de registro en el caso;
- la declaración C7.

**Validación**:
- pruebas de la ruta: 401 sin sesión, 400 ante texto libre o categoría fuera del seed, 503 sin
  Supabase, idempotencia;
- `verify:gobernanza` en verde;
- **cero** variables de entorno nuevas en el copiloto.

### Fase 5: Estado de vuelta y triage en Hermes
**Objetivo**:
- el caso muestra el estado vigente de cada hueco, con el copy honesto de *sembrada vX*;
- `/pre-discovery/admin` tiene la bandeja de triage de `nuevo_ambito`, el contador de pendientes y
  la lista de casos que conviene regenerar cuando algo se siembra.

**Validación**: prueba con navegador contra datos sembrados en el efímero o en dev (la suite
`tests-e2e`, fuera del gate sin navegador), más la revisión con `hermes-design-integrity`.

### Fase 6: Doctrina y documentos vivos (CDC)
**Objetivo**:
- el skill `hermes-regulatory-scan` actualizado, con su contrato C2 nuevo y su contrato prohibido;
- `SPEC.md` del copiloto;
- entrada nueva en `BITACORA-CDC.md`;
- ROADMAP (cierra el pendiente de §Línea Grafo), `DECISIONES.md` y la memoria del copiloto.

**Validación**:
- `npm run regresion` y `verify:gobernanza` en verde, con un control negativo: devolver al skill
  la frase vieja lo pone en rojo;
- una cabecera `### ` nueva en la bitácora;
- gate `docs-vivos` en verde.

### Fase 7: Producción y entrega del contrato al laboratorio
**Objetivo**:
- migración aplicada al Supabase compartido;
- login `cli_lab_huecos` creado **a mano** (la contraseña no pasa por el repo ni por el transcript);
- contrato de pull documentado para el PRP del laboratorio: forma y funciones, sin secretos.

**Validación**:
- sondeo 404→200 de cada tabla;
- `get_advisors` antes y después, sin alertas nuevas;
- con la credencial real, desde la máquina del laboratorio: `lab.leer_huecos()` responde y leer
  `huecos_regulatorios_ocurrencias` falla con `permission denied`.

El registro de extremo a extremo con el grafo real **depende del servidor**: red, seed de 98 reglas
aplicado y grafo reconstruido con la Fase 2. Mientras tanto, la cola está vacía **por diseño**, y la
UI lo dice.

### Fase 8: Validación final
**Objetivo**: sistema funcionando de extremo a extremo.
**Validación**:
- [ ] `npm run typecheck`, `lint`, `build` y `test` del copiloto: se corren a mano y se citan en el
      PR, porque el CI no los corre;
- [ ] `grafo-congelado`, tenencia, `verify` y `gobernanza` en verde en el PR;
- [ ] prueba con navegador que confirma el chip de registro, el estado de vuelta y la bandeja de
      triage;
- [ ] cada criterio de éxito demostrado por un diff o por un gate que corre, nunca por promesa;
- [ ] `drift-runtime.py` sin deriva nueva atribuible a este cambio.

---

## Aprendizajes (Self-Annealing)

> Esta sección crece con cada error encontrado durante la implementación.

---

## Gotchas

- [ ] **`create function` concede `EXECUTE` a `PUBLIC` por defecto.** Sin `revoke` explícito a
      `public`, `anon` y `authenticated`, una función en un esquema expuesto es alcanzable por
      PostgREST con la llave anónima. Hace falta una prueba que lo demuestre en rojo.
- [ ] Las funciones `security definer` van con `set search_path = ''` y nombres calificados.
- [ ] La salida es un `returns table(...)` **explícito**. Un `setof` sobre la tabla o un `select *`
      filtraría la próxima columna que alguien añada.
- [ ] RLS habilitada en las tres tablas aunque no tengan políticas: sin ella, los grants default de
      la plataforma las exponen (aprendizaje del 2026-08-06).
- [ ] Una tabla tenant nueva sin clasificar en `tablas_tenant`, o sin re-aplicar
      `supabase-organizaciones.sql`, deja sin trigger `tenant_captura`, y el `NOT NULL` mata al
      escritor (2026-08-08).
- [ ] `postgres` no puede hacer `SET ROLE` a un rol nuevo sin membresía. Para los controles
      negativos por la API de management: `grant rol_lab_huecos to postgres`, documentado, y
      verificar que el rojo sea `permission denied for table`, no `permission denied to set role`
      (2026-07-26).
- [ ] El host del pooler lo dicta la API (`GET /config/database/pooler`); adivinarlo da un error
      que parece de credencial.
- [ ] La contraseña del login **jamás** va en la migración ni en este repo público. Se verifica por
      formato y largo, sin imprimirla.
- [ ] Un caso demo se copia a `casosUsuario` **con su mismo id**: se excluye por pertenencia a
      `CASOS_DEMO`, no por "es de usuario".
- [ ] `caso.leadId` no es el `lead_id` del CRM: no guardar ninguno. `caso_id` basta, y el vínculo
      es `leads.datos->>'casoId'`.
- [ ] El runtime del grafo **no** sirve el corte congelado (43 frente a 61 categorías) hasta que se
      aplique el seed. Sin la Fase 2, la cola se llena de demanda falsa de logística.
- [ ] "Sembrada vX" en la fuente única **no** significa que Hermes lo sirva: son dos repos y dos
      runtimes.
- [ ] El CI no corre los tests del copiloto: el gate de esta feature se corre a mano y se cita.
- [ ] Una migración mergeada no está aplicada: sondear antes y después, y `get_advisors` como
      línea base.
- [ ] Mover una ocurrencia de la bandeja de triage a su hueco etiquetado cambia su `clave`. La
      idempotencia `(clave, caso_id)` debe sobrevivir a ese movimiento.

## Anti-Patrones

- NO enviar al laboratorio nada que venga del lead (texto, URL, identificador), ni siquiera "solo
  como contexto".
- NO usar el sitio del lead como fuente de una regla: es el disparador de la investigación.
- NO escribir en el seed congelado ni en la fuente única desde Hermes. Sembrar es un acto humano
  del laboratorio.
- NO darle al copiloto una llave hacia el laboratorio, ni al laboratorio `service_role`.
- NO registrar demanda contra el mock, ni contra un runtime cuyo corte no se conoce.
- NO poner dos escritores en una misma tabla: el estado del laboratorio va aparte.
- NO crear políticas "para que funcione el cliente" en tablas que son de servidor.
- NO crear nuevos patrones si los existentes funcionan (ruta de `crm/leads`, RPC de
  `crm-movimientos`, rol de `cli_fin`).
- NO ignorar errores de TypeScript; NO omitir la validación Zod en ninguna entrada.

---

*PRP pendiente de aprobación. No se ha modificado código.*
