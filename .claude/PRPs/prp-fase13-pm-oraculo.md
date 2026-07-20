# PRP-014: Fase 13 — PM A2A · Oráculo de ejecución y ciclo de vida del SC con cliente

> **Estado**: APROBADO (2026-07-19) — decisiones resueltas; sin código aún.
> **Fecha**: 2026-07-19
> **Proyecto**: Hermes OS · A2A
> **Rama sugerida**: `feat/fase13-pm-oraculo`
> **Depende de**: PRP-013 (fábrica de SC) — la fábrica produce; esta fase OPERA lo producido.
> **Departamento**: Contratos Inteligentes (`businessos/departamentos/contratos-inteligentes.md`)
>
> **Nota de numeración**: redactado fuera del repo como "PRP-009 / Fase 9"; reconciliado
> a PRP-014 / Fase 13 al integrarlo (DECISIONES.md 2026-07-19).
>
> **Decisiones — RESUELTAS al aprobar (2026-07-19, por la dueña):**
> 1. **Alcance del oráculo v1**: **transaccional acotado** — identidad propia
>    `rol=oraculo` para `registrar_evidencia` y `declarar_vencido`, con esas dos
>    transiciones como techo duro por certificado. Es lo que hace útil al PM.
> 2. **Acción por defecto de disputa vencida** (default del catálogo, se fija POR SPEC):
>    **`reembolsar_comprador`** — nadie gana por inacción y el vendedor conserva el
>    incentivo de cooperar con el arbitraje.
> 3. **Evidencia**: **hash sha256 on-chain** (vía `registrar_evidencia`) + archivo en
>    Supabase Storage con el hash como nombre — inmutabiliza el expediente.

---

## Objetivo

Cerrar el ciclo de vida completo de un smart contract de cliente: de los **requerimientos**
a la **fabricación** (SDD A2A, PRP-013), de ahí a la **instanciación** con las partes
reales, y de ahí a la **operación** vigilada por un nuevo servicio **`pm-a2a`** (Project
Manager / oráculo) que da seguimiento a la ejecución física del contrato — hitos,
evidencias, plazos — traduce hechos del mundo real a transacciones acotadas en la cadena,
y ante **incumplimiento** ejecuta un catálogo cerrado de acciones (notificar, declarar
vencido, abrir disputa, armar expediente, escalar al árbitro/humano), hasta el **cierre
con acta** auditable. El PM registra hechos; **jamás decide dinero**.

## Por Qué

| Problema | Solución |
|----------|----------|
| Un SC desplegado es un motor apagado: la cadena no sabe si la maquinaria llegó, si el camión se retrasó o si el comprador está ignorando la entrega. Sin puente con el mundo físico, el contrato solo sirve si todas las partes cooperan solas | El **PM A2A** es el puente: escucha los eventos del chaincode (Gateway SDK), lleva la agenda de hitos y plazos de la spec, recolecta evidencia (guía de embarque, foto de recepción, firma) y la **inmutabiliza** (hash on-chain vía `registrar_evidencia`) |
| El oráculo es el punto de confianza más peligroso del sistema: si el agente que "ve" el mundo también puede mover fondos, un bug o una manipulación libera pagos | **Poderes acotados por certificado**: la identidad `rol=oraculo` SOLO puede `registrar_evidencia` y `declarar_vencido`. Liberar es del comprador, resolver del árbitro, y la disputa vencida la resuelve una **regla por defecto escrita en la spec y auditada** — nunca el criterio del agente |
| "Incumplimiento" hoy sería un humano dándose cuenta tarde y peleando por WhatsApp | La spec v2 declara **incumplimientos como datos**: condición → acciones de un catálogo cerrado. El PM los detecta con el reloj de la cadena, ejecuta las acciones off-chain (notificar, recordar, expediente) y las on-chain acotadas, y TODO queda en `sc_incidentes` + Telegram a las partes |
| Si el contrato en operación necesita cambiar (nueva regla, nuevo hito), no hay camino: se parcha a mano o se abandona | El PM abre el ciclo SDD de vuelta: nueva versión de spec → fabricación PRP-013 → aprobación humana → upgrade con `--sequence`+1. **SDD de principio a fin**: el mismo departamento que fabricó, evoluciona |

**Valor de negocio**: el entregable deja de ser "un contrato" y pasa a ser **"un contrato
operado"** — el cliente compra tranquilidad, no código. Es el diferenciador de la carta del
catálogo frente a cualquier generador de SC: nadie más incluye al project manager que
persigue la entrega, arma el expediente y activa las consecuencias. Cobro recurrente
natural (fee de operación mensual vía Polar) encima del fee de fabricación.

## Qué

### Criterios de Éxito

- [ ] **`sc_spec` v2** en `fabrica-sc/contrato_sc.py`: secciones `seguimiento` (hitos con
  evidencia requerida, plazo y gracia), `oraculo` (rol + techo de transiciones permitidas),
  `incumplimientos` (condición → acciones del catálogo cerrado) y `liquidacion`
  (`{rail: x402|manual, endpoint, moneda}` — endpoint obligatorio si rail=x402; ver
  `gobernanza/adenda-web-agentica.md` §4). Validación: toda acción
  ∈ CATALOGO_ACCIONES, todo hito refiere una transición existente, toda condición usa
  plazos declarados. Spec v1 sigue siendo válida (retrocompatible: sin `seguimiento` no
  hay PM, solo fabricación).
- [ ] **`escrow-v2`** (plantilla nueva, re-auditada — NO se parcha escrow-v1): estados
  `vencido` y `reembolsado`; transiciones `registrar_evidencia` (hash + tipo, quien:
  oraculo), `declarar_vencido` (quien: oraculo, regla: tx posterior a plazo+gracia),
  `reembolsar`/`ejecutar_default` (quien: NADIE por identidad — se dispara solo desde
  `vencido`/disputa vencida según la `accion_por_defecto` compilada en el chaincode;
  default del catálogo: `reembolsar_comprador`).
- [ ] **Servicio `pm-a2a`** (`businessos/pm-a2a/`), hermano del trío, con Agent Card
  honesta: "doy seguimiento a hitos y plazos del contrato, registro evidencia y declaro
  vencimientos con identidad acotada; NO libero pagos, NO resuelvo disputas, NO modifico
  el contrato". Listener de eventos del chaincode con reconexión + checkpoint del último
  bloque procesado (los eventos perdidos se re-leen, no se pierden).
- [ ] **Agenda determinista de plazos**: los vencimientos se calculan de la spec y del
  estado on-chain, nunca de memoria del agente; el "cron" es un host-job que consulta la
  agenda y dispara al PM (patrón `evaluar-facturas.py`). La validación final del plazo
  SIEMPRE la hace el chaincode con `GetTxTimestamp` — el PM propone, la cadena verifica.
- [ ] **Motor de incumplimientos**: al cumplirse una condición, el PM ejecuta las acciones
  declaradas EN ORDEN, registra cada una en `sc_incidentes` (qué, cuándo, evidencia,
  resultado) y notifica por Telegram a las partes. Acciones irreversibles fuera del techo
  del oráculo → tarea en la cola para el humano (gate humano intacto).
- [ ] **Evidencia multi-fuente por umbral** (control O2 del modelo de amenazas): cuando el
  monto supere el umbral declarado en la spec, un hito exige DOS tipos de evidencia
  independientes; la firma del receptor es evidencia preferente; el árbitro siempre puede
  pedir más y el expediente lo registra.
- [ ] **Vía de apelación humana ante `declarar_vencido`** (salida de la AISIA de
  escrow-v2, `gobernanza/adenda-iso42001.md` §3): la parte afectada puede apelar dentro
  de la gracia declarada; la apelación abre disputa/expediente en vez de dejar que el
  vencido fluya a la acción por defecto sin mirada humana.
- [ ] **Settlement por allowlist**: el settlement de dinero referencia SIEMPRE un endpoint
  declarado en la spec aprobada (allowlist), jamás descubierto en runtime; el tx-hash del
  settlement queda como evidencia on-chain (`registrar_evidencia`).
- [ ] **Expediente de disputa**: al escalar al árbitro, Mission Control muestra el
  expediente completo (spec, línea de tiempo de eventos on-chain, evidencias con hash
  verificado, incidentes) — el árbitro resuelve con `resolver`, con todo a la vista.
- [ ] **Cierre con acta**: al llegar a estado terminal (`liberado`/`resuelto`/
  `reembolsado`/`cancelado`) el PM genera el acta (markdown: partes, hitos, evidencias,
  incidentes, desenlace, hashes) y la archiva en `contratos_sc` + respaldo nocturno.
- [ ] **Fronteras**: el PM no fabrica (eso es del SDD), no aprueba (humano), no custodia
  llaves de las partes (cada quien firma con su identidad), no decide dinero (partes,
  árbitro o regla por defecto auditada). Un escritor por fila. Aislar, no fundir.

### Comportamiento Esperado (Happy Path + incumplimiento, de principio a fin)

**Fabricación (PRP-013, resumen):**
1. El cliente (comprador) entrega requerimientos por la vertical clientes; Hermes produce
   la `sc_spec` v2 — ahora con hitos, evidencias, gracia e incumplimientos — y el cliente
   la confirma.
2. SDD A2A fabrica (Planner→Ejecutores→Supervisor con gate fabric), la dueña aprueba en
   Mission Control, `desplegar-chaincode.py` hace lifecycle en el canal.

**Instanciación:**
3. Se emiten identidades: comprador (Org1), vendedor (Org2), árbitro (`rol=arbitro`),
   PM (`rol=oraculo`). El comprador ejecuta `CrearDeposito` y `Fondear`.
4. El PM da de alta la instancia en `sc_instancias`, arma la agenda de plazos desde la
   spec y saluda a las partes por Telegram con el calendario de hitos.

**Operación — cumplimiento:**
5. El vendedor envía la maquinaria; sube evidencia (guía de embarque, foto de recepción
   firmada) por su canal. El PM verifica que la evidencia cumple lo declarado en el hito,
   ejecuta `registrar_evidencia` (hash on-chain) y notifica al comprador.
6. El vendedor ejecuta `marcar_entrega`; el PM detecta el evento y recuerda al comprador
   el plazo de liberación.
7. El comprador ejecuta `liberar_pago` → evento `PagoLiberado` → el PM genera el acta de
   cierre y archiva. Fin feliz.

**Operación — incumplimiento (las tres rutas declaradas en la spec de ejemplo):**
- **El vendedor no entrega** al vencer `fecha_limite + gracia`: el PM notifica a ambas
  partes (acción 1), ejecuta `declarar_vencido` (acción 2, on-chain, la cadena re-verifica
  el plazo), abre expediente (acción 3); del estado `vencido` el chaincode habilita la
  `accion_por_defecto` (`reembolsar_comprador`), que requiere confirmación del comprador —
  no del PM.
- **El comprador no libera** tras entrega con evidencia verificada + 72h: el PM recuerda
  (1), a las 72h habilita/sugiere `abrir_disputa` al vendedor (2) y arma el expediente (3).
  El árbitro resuelve con todo a la vista.
- **La disputa no se resuelve** dentro de `fecha_limite + 30d`: la regla por defecto
  compilada en el chaincode toma el control (`reembolsar` o `split`, según la spec);
  el PM solo documenta y notifica el desenlace.

**Evolución (SDD de principio a fin):**
8. Si la operación revela que el contrato necesita cambiar (nuevo hito, nueva gracia),
   el PM abre una tarea al SDD: spec v(n+1) → fabricación → aprobación humana → upgrade
   con `--sequence`+1. El expediente registra el cambio de versión.

---

## Contexto

### Modelo de amenazas (mini — completo en `businessos/gobernanza/modelo-amenazas-v1.md`)

- **Activos que toca**: A3 wallet del oráculo, A2 fondos en escrow (indirecto), A6
  Supabase (`sc_instancias`, `sc_hitos`, `sc_incidentes`).
- **Fronteras que cruza**: mundo físico → cadena vía evidencias (cruce #8-9, el crítico).
- **Atacantes relevantes**: O2 (engañar al oráculo con evidencia falsa), O6 (compromiso
  del servicio pm-a2a).
- **Controles**: techo por certificado (Constraint — comprometer al PM vale, como máximo,
  evidencia falsa detectable, nunca fondos), evidencia multi-fuente por umbral, G6
  (sanitización de archivos antes de que cualquier agente los procese; jamás entran
  crudos al contexto del LLM), monitoreo de frecuencia del oráculo (un oráculo
  hiperactivo es una anomalía).

### Confianza (checklist de la adenda web agéntica)

```
Confianza: Constraint (techo del oráculo por certificado + acción por defecto compilada)
           + Proof (hashes de evidencia on-chain + expediente verificable)
           + gate humano (apelación, árbitro, cola)
Justificación: el PM tiene acceso indirecto a consecuencias de dinero → Claim/Brief no
bastan; el peor caso (PM comprometido) queda degradado a "generar disputas detectables".
```

### Referencias

- `PRP-013` (`prp-fase12-fabrica-sc.md`) — la fábrica; este PRP consume su salida y le
  añade la sección "operación" al ciclo de vida.
- `businessos/fabrica-sc/contrato_sc.py` — el contrato de la spec a extender a v2.
- `businessos/coordinador-a2a/` — patrón de servicio A2A hermano (Agent Card, contrato
  compartido en `trio-contrato/`, cola) para `pm-a2a`.
- `businessos/red-tier1-iac/` — identidades `oraculo-pm` y `listener-hermes` (el listener
  usa la identidad de SOLO lectura, no la del oráculo) + ceremonia de altas por cliente.
- Host-jobs (`evaluar-facturas.py`) — patrón de la agenda de plazos (cron host → PM).
- Fabric Gateway SDK (Go/Node) — `ChaincodeEvents` con checkpoint de bloque para el
  listener resiliente.
- `businessos/clientes/` — canal de las partes (evidencias entran por aquí).
- `businessos/gobernanza/adenda-web-agentica.md` §4 — settlement x402 por allowlist.

### Extensión de la spec (`sc_spec` v2 — secciones nuevas)

```yaml
  # --- NUEVO en v2: lo que el PM opera -------------------------------------
  seguimiento:
    hitos:
      - id: entrega_maquinaria
        transicion: marcar_entrega          # DEBE existir en `transiciones`
        evidencia_requerida: [guia_embarque, foto_recepcion, firma_receptor]
        plazo: fecha_limite                 # campo timestamp del activo
        gracia_horas: 48
      - id: liberacion_pago
        transicion: liberar_pago
        plazo: entrega_verificada           # hito previo como ancla
        gracia_horas: 72

  oraculo:
    rol: oraculo                            # identidad con atributo rol=oraculo
    puede: [registrar_evidencia, declarar_vencido]   # TECHO DURO — nada más

  incumplimientos:
    - id: vendedor-no-entrega
      condicion: hito_vencido(entrega_maquinaria)
      acciones: [notificar_partes, declarar_vencido, abrir_expediente]
    - id: comprador-no-libera
      condicion: hito_vencido(liberacion_pago)
      acciones: [recordar(comprador), habilitar_disputa(vendedor), abrir_expediente]
    - id: disputa-vencida
      condicion: disputa_sin_resolucion(fecha_limite + 30d)
      accion_por_defecto: reembolsar_comprador   # compilada en el chaincode, auditada

  liquidacion:                              # adenda web agéntica §4
    rail: manual                            # x402 | manual; endpoint obligatorio si x402
    moneda: USDC
```

**Catálogo cerrado de acciones** (validado en `contrato_sc.py`; el PM no puede inventar):
`notificar_partes`, `recordar(rol)`, `registrar_evidencia`, `declarar_vencido`,
`habilitar_disputa(rol)`, `abrir_expediente`, `escalar_arbitro`, `escalar_humano`.
Las acciones on-chain (`registrar_evidencia`, `declarar_vencido`) son las ÚNICAS dentro
del techo del oráculo; `accion_por_defecto` (`reembolsar_comprador` | `split_50_50`) no
la ejecuta nadie por identidad: la habilita el propio chaincode al cumplirse la condición
temporal, verificada con el reloj de la transacción. Default del catálogo:
`reembolsar_comprador` (decisión 2026-07-19).

### Modelo de Datos (Supabase)

```sql
CREATE TABLE sc_instancias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_sc_id UUID REFERENCES contratos_sc(id),
  deposito_id TEXT NOT NULL,                -- id del activo on-chain
  partes JSONB NOT NULL,                    -- {comprador: chat_id, vendedor: ..., arbitro: ...}
  agenda JSONB NOT NULL,                    -- plazos calculados de la spec
  origen JSONB NOT NULL DEFAULT '{}',       -- lineage: contrato_sc_id + tx del commit (gobernanza §2)
  estado_onchain TEXT NOT NULL,             -- espejo del último evento procesado
  ultimo_bloque BIGINT NOT NULL DEFAULT 0,  -- checkpoint del listener
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sc_hitos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instancia_id UUID REFERENCES sc_instancias(id),
  hito TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente', -- pendiente|evidencia_recibida|verificado|vencido
  evidencias JSONB DEFAULT '[]',            -- [{tipo, hash_sha256, storage_ref, recibida_en}]
  vence_en TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sc_incidentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instancia_id UUID REFERENCES sc_instancias(id),
  incumplimiento TEXT NOT NULL,             -- id del incumplimiento de la spec
  accion TEXT NOT NULL,                     -- acción del catálogo ejecutada
  resultado TEXT NOT NULL,                  -- ok|fallo|escalado + detalle
  tx_id TEXT,                               -- si la acción fue on-chain
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- RLS en las tres tablas.
```

### Arquitectura propuesta

```
businessos/pm-a2a/
├── app.py / card.py          # servicio A2A (Agent Card honesta)
├── listener.py               # eventos del chaincode + checkpoint de bloque
├── agenda.py                 # plazos deterministas desde spec + estado on-chain
├── incumplimientos.py        # condición → acciones (catálogo cerrado)
├── expediente.py             # arma el paquete para árbitro / acta de cierre
└── identidad/                # wallet SOLO del rol=oraculo (jamás de las partes)
```

---

## Blueprint (Assembly Line)

### Fase 1: Spec v2 en el contrato
**Objetivo**: `contrato_sc.py` valida `seguimiento`/`oraculo`/`incumplimientos`/
`liquidacion` (catálogo cerrado, referencias cruzadas, techo del oráculo). v1
retrocompatible.
**Validación**: suite de contrato en verde con casos v1, v2 y mutaciones rojas
(acción fuera de catálogo, oráculo pidiendo `liberar_pago`, hito sin transición,
rail x402 sin endpoint).

### Fase 2: Plantilla escrow-v2 (re-auditada a mano)
**Objetivo**: estados `vencido`/`reembolsado`, transiciones del oráculo con techo por
atributo, `accion_por_defecto` compilada y verificada con reloj de tx, apelación dentro
de la gracia.
**Validación**: gates fabric verdes; test explícito "el oráculo NO puede liberar_pago";
README de auditoría v2 firmado + AISIA de escrow-v2 firmada (adenda-iso42001 §3).

### Fase 3: Servicio pm-a2a — listener + agenda
**Objetivo**: eventos con checkpoint (reinicio sin perder bloques), agenda determinista,
saludo/calendario a las partes por Telegram.
**Validación**: matar el contenedor a media operación → al volver, re-procesa desde el
checkpoint y la agenda queda íntegra (smoke de runtime, como el de la cola).

### Fase 4: Motor de incumplimientos
**Objetivo**: condición → acciones en orden, todo en `sc_incidentes`, irreversibles a la
cola del humano. Sanitización G6 de archivos de evidencia ANTES de procesarlos.
**Validación**: simular las tres rutas de la spec de ejemplo end-to-end en la red
efímera; cada acción registrada y notificada; ninguna acción fuera de catálogo posible.

### Fase 5: Expediente y acta
**Objetivo**: paquete de disputa en Mission Control (hashes verificados) y acta de cierre
archivada (con lineage `origen` completo).
**Validación**: el árbitro resuelve un caso simulado solo con el expediente; el acta
reconstruye la operación completa sin consultar nada más.

### Fase 6: Validación Final (cliente de principio a fin)
**Objetivo**: requerimientos → fabricación → instanciación → operación con UN
incumplimiento real simulado → resolución → acta.
**Validación**:
- [ ] Las tres rutas de incumplimiento producen exactamente las acciones declaradas.
- [ ] El oráculo intentando `liberar_pago` es rechazado POR EL CHAINCODE (no por cortesía
      del agente).
- [ ] Un upgrade de spec v(n+1) recorre el SDD completo y sube `--sequence`.
- [ ] Criterios de éxito cumplidos.

---

## 🧠 Aprendizajes (Self-Annealing)

*(vacío — sin ejecución aún)*

---

## Gotchas

- [ ] **El oráculo es el nuevo perímetro de seguridad**: su wallet vive solo en
  `pm-a2a/identidad/`, separada de las llaves de despliegue Y de las partes (la ceremonia
  de `red-tier1-iac` lo instituye). Comprometer al PM debe valer, como máximo, evidencia
  falsa — que el expediente y el árbitro pueden detectar — nunca fondos.
- [ ] **No hay cron on-chain**: los plazos los detecta el PM off-chain, pero la cadena
  SIEMPRE re-verifica con `GetTxTimestamp` en `declarar_vencido` y en la acción por
  defecto. El PM que "se adelanta" recibe rechazo del chaincode, no confianza.
- [ ] **Eventos se pierden si el listener duerme sin checkpoint**: guardar
  `ultimo_bloque` por instancia y re-leer desde ahí en cada arranque (mismo espíritu que
  la recuperación de huérfanas de la cola, PRP-010).
- [ ] **Evidencia**: on-chain va el HASH, nunca el archivo (tamaño, privacidad); el
  archivo va a Supabase Storage con el hash como nombre. Verificación = rehash.
  **G6**: sanitizar tipo/tamaño/AV ANTES de que cualquier agente procese el archivo.
- [ ] **Las notificaciones a partes externas salen por la vertical clientes** y heredan
  su regla: borradores sensibles (ej. intimación por incumplimiento) esperan aprobación
  humana antes de enviarse.
- [ ] **Frecuencia del oráculo monitoreada** (O6): tasa anómala de transacciones del
  oráculo = alerta en Mission Control.
- [ ] **RAM**: pm-a2a es liviano (listener + httpx), pero corre 24/7 — sumar al
  presupuesto del nodo de la red tier 1 (ver `arquitectura-red-fabric.md` §6), no al cx33.

## Anti-Patrones

- NO darle al oráculo ninguna transición fuera de su techo declarado en la spec — ni
  "temporalmente", ni "para la demo".
- NO decidir desenlaces de dinero con el modelo: partes, árbitro o regla por defecto
  auditada. El PM documenta y empuja, no juzga.
- NO custodiar llaves de las partes "para facilitarles la vida": cada quien firma.
- NO parchar escrow-v1 para añadir el oráculo: escrow-v2 es plantilla nueva con
  auditoría nueva.
- NO confiar en la memoria del agente para plazos: agenda calculada de spec + cadena,
  verificación final en el chaincode.
- NO descubrir endpoints de pago en runtime: allowlist por spec aprobada, siempre.

---

*PRP aprobado 2026-07-19 (decisiones 1-3 resueltas por la dueña). Ejecución pendiente de
que PRP-013 complete sus Fases 3-6.*
