# PRP-013: Fase 12 — Fábrica de Smart Contracts (Hyperledger Fabric)

> **Estado**: EN PROGRESO — Fases 1-4 construidas, integradas y verificadas en el repo
> (rama `feat/fase12-fabrica-sc`, 2026-07-19/20); Fases 5-6 pendientes. Auditoría humana
> de escrow-v1 SIN firmar (bloquea fabricación real, no el trabajo de fábrica/gates).
> **Fecha**: 2026-07-19 (actualizado 2026-07-20)
> **Proyecto**: Hermes OS · A2A
> **Rama sugerida** (Fases 3-6): `feat/fase12-fabrica-sc`
> **Depende de**: PRP-006 (trío Hermes→Ejecutor→Supervisor) y PRP-007 (Coordinador/enjambre) — YA construidos. PRP-010 (cola) para la espera de turno.
> **Departamento**: Contratos Inteligentes (`businessos/departamentos/contratos-inteligentes.md`)
>
> **Nota de numeración**: este PRP se redactó fuera del repo como "PRP-008 / Fase 8";
> esa numeración ya estaba ocupada (Fase 8 = grafo regulatorio, PRPs hasta 012) y se
> reconcilió a PRP-013 / Fase 12 al integrarlo (DECISIONES.md 2026-07-19).
>
> **Decisiones — RESUELTAS al aprobar (2026-07-19):**
> 1. **Ubicación del sandbox Fabric**: nodo Hetzner aparte para la red efímera de pruebas
>    (los picos de ~2-3 GB del gate no deben competir con la red tier 1 estable ni con la
>    cola del cx33 — ver `departamentos/contratos-inteligentes/arquitectura-red-fabric.md` §6-7).
> 2. **Lenguaje del chaincode v1**: Go (madurez, gosec). Construido.
> 3. **Primera plantilla del catálogo**: escrow de pago condicionado — confirmada y construida
>    (`businessos/fabrica-sc/plantillas/escrow-v1/`).

---

## Objetivo

Que el sistema fabrique **chaincode de Hyperledger Fabric a partir de requerimientos en
lenguaje natural**, con el mismo patrón de garantías del trío: un humano alimenta los
requerimientos por la vertical clientes, Hermes los convierte a una **spec YAML validada
por contrato**, el enjambre genera el chaincode **sobre plantillas auditadas** (no código
libre), el Supervisor lo re-gatea de cero incluyendo pruebas en una **red Fabric
efímera**, y **nada se despliega sin doble aprobación humana**: la cola (`aprobada` por la
dueña o el cliente autorizado) y el propio lifecycle de Fabric 2.x
(`approveformyorg` → `commit`), que exige aprobación organizacional a nivel protocolo.

## Por Qué

| Problema | Solución |
|----------|----------|
| Un cliente que quiere un smart contract hoy necesita un desarrollador blockchain: caro, lento, y el resultado es una caja negra que el cliente no puede auditar ni repetir | La **fábrica** convierte requerimientos conversacionales en chaincode generado sobre plantillas auditadas, con diff acotado, reportes de gates y explicación del agente — revisable por un humano en Mission Control antes de existir en la red |
| Generar código libre con un modelo para un contrato inmutable es un riesgo inaceptable: un bug desplegado en Fabric no se "parchea en caliente" | El Engine **solo parametriza plantillas del catálogo** (v1: escrow). La superficie de error se reduce a los parámetros y la lógica acotada de cada plantilla; lo demás está probado de antemano |
| Aunque el código compile y pase tests unitarios, el comportamiento real depende de la red: endorsement, MVCC, datos privados. Confiar en gates locales sería un sello de goma | El Supervisor gana un **perfil de gates "fabric"**: compilación, gosec, tests unitarios generados desde la spec, y despliegue en una **red efímera** (fabric-samples test network en Docker) donde se ejecutan las transiciones de la spec de punta a punta. Gate rojo = escalada, jamás "aprobado por partes" |
| El despliegue a una red real es un acto irreversible, como cobrar o firmar | El despliegue es un **host-job** (`desplegar-chaincode.py`, patrón `polar-cobros.py`): solo corre sobre filas con `aprobada` en la cola Y ejecuta el lifecycle de Fabric, que a su vez exige `approveformyorg` de las organizaciones — el candado humano existe dos veces, una en Hermes OS y otra en el protocolo |
| La web agéntica necesita contratos que agentes y humanos puedan firmar con **confianza de protocolo** (Constraint + Proof), no de promesas | La fábrica produce exactamente esa infraestructura: techos por certificado, política de endorsement, hashes verificables — ver `businessos/gobernanza/adenda-web-agentica.md` |

**Valor de negocio**: una nueva carta del catálogo ("Fábrica de Smart Contracts") con dos
modelos de venta: **servicio** (el cliente describe, la fábrica entrega) y, en fase
posterior, **marca blanca / SaaS** (el cliente crea sus propios SC en su canal, molde
comercial ya probado en `propuesta-crm-marca-blanca.md`). Además es dogfood del roadmap
propio: la plantilla escrow es la pieza que la Fase 5 (Circle/USDC, economía agéntica)
necesita para que los agentes transaccionen valor con reglas verificables. El costo exacto
de fabricar cada contrato ya es medible vía `token_usage.task_id` → pricing con datos.

## Qué

### Criterios de Éxito

- [x] **Spec de SC como contrato de datos**: `businessos/fabrica-sc/contrato_sc.py` con
  `validar_sc_spec` (mismo patrón `_exigir`/stdlib de `trio-contrato/contrato.py`, como
  módulo hermano — no se engorda el contrato del trío) y el esquema YAML de abajo
  (activos, roles, transiciones, política de endorsement, eventos, colecciones privadas).
  Spec inválida = rechazo inmediato con el porqué, cero tokens gastados en generar.
  **HECHO — 23 tests verdes (`fabrica-sc/tests/`).**
- [ ] **Captura conversacional**: la vertical **clientes** convierte una conversación de
  requerimientos en una `sc_spec` YAML y la presenta al humano para confirmar ANTES de
  encolar la tarea padre (`tipo: "fabricar_sc"`). Lo que entra al enjambre es la spec
  confirmada, no la conversación.
- [ ] **`FabricChaincodeEngine`** en el Ejecutor (mismo patrón pluggable/mockeable que
  `Engine`): recibe la spec, selecciona la plantilla del catálogo
  (`businessos/fabrica-sc/plantillas/`), la parametriza y produce el chaincode Go + sus
  tests unitarios generados desde los criterios de la spec. `MockEngine` para tests: cero
  tokens.
- [ ] **Perfil de gates "fabric" en el Supervisor** (sin tocar los gates existentes):
  `go build` + `go vet` + `gosec` + **escaneo de dependencias** (control O5 del modelo de
  amenazas) + tests unitarios + **gate de red efímera** — levanta la test network,
  despliega el chaincode, ejecuta cada transición declarada en la spec con
  los roles declarados, verifica eventos emitidos y casos negativos (rol sin permiso NO
  puede ejecutar la transición). Todo o escalada.
- [ ] **Doble aprobación humana**: la fila padre en la cola solo llega a `aprobada` desde
  Mission Control con el paquete de revisión completo (spec original, diff contra la
  plantilla base, reportes de gates, explicación del agente por decisión, y las banderas
  G1 arriba del paquete — anti-sello-de-goma G4). El host-job
  `desplegar-chaincode.py` solo empaqueta/instala/despliega filas `aprobada`, y el
  `commit` en Fabric exige la política de endorsement — nunca despliegue silencioso.
- [ ] **Trazabilidad total**: tabla `contratos_sc` en Supabase con la spec, el hash del
  paquete de chaincode, quién solicitó, quién aprobó, en qué canal/red se desplegó, el
  costo (`token_usage` por `task_id`) y la columna `origen` (lineage: IDs del eslabón
  anterior — `businessos/gobernanza/gobernanza-ciclo-de-vida.md` §2). Un contrato en la
  red siempre es rastreable a su spec, a su aprobador y a la conversación que lo originó.
- [ ] **Fronteras preservadas**: el Coordinador NO genera código, el Ejecutor NO se
  auto-aprueba, el Supervisor NO despliega, el host-job NO decide. Un escritor por fila.
  Aislar, no fundir.

### Comportamiento Esperado (Happy Path)

1. El cliente (o la dueña) describe por Telegram a la vertical clientes: "necesito un
   contrato donde el comprador deposita, el vendedor entrega, y un árbitro puede resolver
   disputas en 30 días".
2. Hermes-clientes itera preguntas faltantes (¿quién puede cancelar? ¿qué evento notifica
   la entrega?) y produce la `sc_spec` YAML; el humano la confirma por Telegram.
3. Hermes encola la tarea padre `fabricar_sc` con la spec en `contexto`. El Coordinador
   la descompone (generar chaincode → generar tests → gate fabric) respetando la cola
   (concurrencia 1, PRP-010).
4. El Ejecutor con `FabricChaincodeEngine` parametriza la plantilla escrow; el Supervisor
   re-gatea de cero incluyendo la red efímera.
5. Mission Control muestra el paquete de revisión; la dueña aprueba (`aprobada`).
6. `desplegar-chaincode.py` empaqueta, instala en los peers, ejecuta
   `approveformyorg` por las organizaciones configuradas y `commit` en el canal destino.
   Registra todo en `contratos_sc` y avisa por Telegram con el hash del paquete.

---

## Contexto

> La operación post-despliegue (PM/oráculo, hitos, incumplimientos) es del **PRP-014**
> (`prp-fase13-pm-oraculo.md`): la fábrica produce; el PM opera lo producido.

### Modelo de amenazas (mini — el completo vive en `businessos/gobernanza/modelo-amenazas-v1.md`)

- **Activos que toca**: A1 llaves de despliegue, A4 catálogo de plantillas, A5 specs
  aprobadas, A6 Supabase (`contratos_sc`).
- **Fronteras que cruza**: texto adversarial → spec (cruce #1); salida de LLM → código;
  humano aprobador → despliegue irreversible.
- **Atacantes relevantes**: O1 (inyección de requerimientos), O3 (fatiga del aprobador),
  O5 (cadena de suministro).
- **Controles**: G1 (spec = DATOS, banderas de cláusulas sospechosas), G4
  (anti-sello-de-goma en el paquete de revisión), G5 (re-verificación del hash aprobado
  antes de `install`), catálogo cerrado + `go.sum` pineado + gosec (O5).

### Confianza (checklist de la adenda web agéntica)

```
Confianza: Constraint (catálogo cerrado + política de endorsement + lifecycle a dos orgs)
           + Proof (gates re-ejecutados de cero + hash del paquete)
Justificación: el peor caso (chaincode malicioso o defectuoso) exige derrotar a la vez
el catálogo auditado, los gates del Supervisor, dos aprobaciones humanas y la política
de endorsement — ningún agente individual puede desplegarlo solo.
```

### Referencias

- `businessos/coordinador-a2a/` — Planner/Executor/Supervisor/cola/presupuesto: se
  extienden, no se tocan sus fronteras.
- `businessos/trio-contrato/contrato.py` — el contrato compartido del trío; patrón de
  validación (`_exigir`, stdlib pura) que `fabrica-sc/contrato_sc.py` replica como módulo
  hermano del departamento.
- `businessos/fabrica-sc/` — lo ya construido: `contrato_sc.py` + tests,
  `plantillas/escrow-v1/` (chaincode Go + tests + README-auditoria).
- `businessos/red-tier1-iac/` — kit IaC de la red tier 1 (Operadora + Testigo) +
  `CEREMONIA.md` (ceremonia de llaves con acta).
- `businessos/departamentos/contratos-inteligentes.md` — el departamento (paquete de
  competencias) y `departamentos/contratos-inteligentes/arquitectura-red-fabric.md`
  (tiers, identidades, RAM).
- `businessos/clientes/` (SOUL/AGENTS/MEMORY) — la vertical que captura requerimientos;
  su regla "todo lo que sale hacia un cliente espera aprobación humana" aplica intacta.
- Host-jobs existentes (`polar-cobros.py`, `validar-contratos.py`,
  `evaluar-facturas.py`) — patrón del nuevo `desplegar-chaincode.py`.
- `businessos/catalogo-agentes.md` — carta #20 evolucionada: de "settlement cripto" a
  Fábrica de Smart Contracts (entregable auditable).
- `businessos/crm/propuesta-crm-marca-blanca.md` — molde comercial para la fase de marca
  blanca (fuera de alcance de este PRP).
- Catálogo objetivo v2 (post escrow): `escrow-v2` (PRP-014) y `registro-agentes-v1`
  (espejo permisionado de ERC-8004 — `gobernanza/adenda-web-agentica.md` §3).
- https://github.com/hyperledger/fabric — Fabric 2.x; lifecycle de chaincode
  (`peer lifecycle chaincode package|install|approveformyorg|commit`).
- https://github.com/hyperledger/fabric-samples — `test-network/` como base de la red
  efímera del gate.

### Esquema de la spec (`sc_spec` v1)

> Este YAML es el CONTRATO entre la conversación y la fábrica. Todo lo que el Engine
> genera y todo lo que el gate fabric verifica sale de aquí. Validación estricta en
> `fabrica-sc/contrato_sc.py` (ids únicos, roles referenciados existen, estados
> alcanzables desde el inicial, plantilla ∈ catálogo).

```yaml
sc_spec:
  version: 1
  nombre: escrow-compraventa-maquinaria      # kebab, único por tenant
  plantilla: escrow-v1                        # DEBE existir en el catálogo
  descripcion: >
    Depósito en garantía: el comprador fondea, el vendedor entrega,
    un árbitro resuelve disputas dentro del plazo.

  canal_destino: canal-clientes-demo          # canal Fabric donde vivirá
  organizaciones: [Org1MSP, Org2MSP]          # quiénes deben approveformyorg

  roles:
    - id: comprador
      msp: Org1MSP
    - id: vendedor
      msp: Org2MSP
    - id: arbitro
      msp: Org1MSP
      atributo: rol=arbitro                   # ABAC vía atributo del certificado

  activos:
    - id: deposito
      campos:
        - {nombre: monto, tipo: uint, requerido: true}
        - {nombre: moneda, tipo: string, enum: [USDC, MXN]}
        - {nombre: fecha_limite, tipo: timestamp, requerido: true}

  estados: [creado, fondeado, entregado, liberado, disputado, resuelto, cancelado]

  transiciones:
    - {de: creado,    a: fondeado,  quien: [comprador], funcion: fondear}
    - {de: fondeado,  a: entregado, quien: [vendedor],  funcion: marcar_entrega}
    - {de: entregado, a: liberado,  quien: [comprador], funcion: liberar_pago}
    - {de: fondeado,  a: disputado, quien: [comprador, vendedor], funcion: abrir_disputa}
    - {de: disputado, a: resuelto,  quien: [arbitro],   funcion: resolver,
       regla: dentro_de_plazo(fecha_limite + 30d)}
    - {de: creado,    a: cancelado, quien: [comprador], funcion: cancelar}

  eventos:                                    # emitidos por el chaincode
    - {nombre: DepositoFondeado, en: fondear}
    - {nombre: DisputaAbierta,   en: abrir_disputa}
    - {nombre: PagoLiberado,     en: liberar_pago}

  datos_privados:                             # private data collections (opcional)
    - nombre: terminos-comerciales
      organizaciones: [Org1MSP, Org2MSP]
      campos: [monto, moneda]

  politica_endorsement: "AND('Org1MSP.peer','Org2MSP.peer')"

  criterios_aceptacion:                       # el gate fabric los ejecuta literal
    - "comprador puede fondear un deposito creado"
    - "vendedor NO puede liberar_pago"
    - "resolver falla fuera del plazo de 30 dias"
    - "PagoLiberado se emite al liberar"
```

### Modelo de Datos (Supabase)

```sql
CREATE TABLE contratos_sc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL,                    -- fila padre en `tareas` (costo exacto vía token_usage)
  solicitante TEXT NOT NULL,                -- chat_id / cliente
  spec JSONB NOT NULL,                      -- la sc_spec confirmada
  origen JSONB NOT NULL DEFAULT '{}',       -- lineage: ids de chat → hash spec (gobernanza §2)
  plantilla TEXT NOT NULL,
  hash_paquete TEXT,                        -- sha256 del .tar.gz del chaincode
  canal_destino TEXT,
  estado TEXT NOT NULL DEFAULT 'fabricando',-- fabricando|en_revision|aprobado|desplegado|rechazado|escalado
  aprobado_por TEXT,
  aprobado_en TIMESTAMPTZ,
  desplegado_en TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE contratos_sc ENABLE ROW LEVEL SECURITY;
```

### Arquitectura propuesta

```
businessos/fabrica-sc/
├── contrato_sc.py            # validar_sc_spec (HECHO, Fase 1)
├── tests/                    # suite del contrato (HECHO, 23 verdes)
├── plantillas/
│   └── escrow-v1/            # chaincode Go parametrizable + tests base + README de auditoría (HECHO, firma pendiente)
├── engine/                   # FabricChaincodeEngine (Fase 3, se registra en el Ejecutor)
├── gates/                    # perfil "fabric" del Supervisor (Fase 4, red efímera incluida)
└── desplegar-chaincode.py    # host-job (Fase 5): package → install → approveformyorg → commit

businessos/red-tier1-iac/     # red tier 1 de producción (Operadora+Testigo) + CEREMONIA.md
```

---

## Blueprint (Assembly Line)

> Solo FASES; las subtareas se generan al entrar a cada fase con el bucle agéntico.

### Fase 1: Contrato de la spec — ✅ HECHA (integrada 2026-07-19)
**Objetivo**: `validar_sc_spec` en `fabrica-sc/contrato_sc.py` + la spec escrow de ejemplo validando.
**Validación**: tests de contrato (specs válidas pasan, 10+ casos inválidos rechazan con
mensaje claro). Cero modelo involucrado. → 23 tests verdes en dev.

### Fase 2: Plantilla escrow-v1 auditada (a mano, sin modelo) — 🟡 CÓDIGO HECHO, AUDITORÍA PENDIENTE
**Objetivo**: chaincode Go del escrow completo, parametrizable, con tests propios,
revisado por la dueña línea por línea UNA vez. Es el activo de la fábrica.
**Validación**: `go build` + `go vet` + `gosec` + tests verdes — ✅ CORRIDO en dev el
2026-07-19 (go 1.24.5: build OK, vet OK, gosec 0 issues/350 líneas, 6/6 tests PASS;
`go.sum` pineado y versionado — control O5); despliegue manual en la test network local
PENDIENTE (no hay red Fabric en dev); **README de auditoría firmado por la dueña**
(falta la firma: hasta entonces la plantilla NO habilita fabricación real).

### Fase 3: FabricChaincodeEngine — ✅ HECHA (integrada y verificada 2026-07-19/20)
**Objetivo**: Engine pluggable que parametriza escrow-v1 desde una spec y genera los
tests de `criterios_aceptacion`. MockEngine para tests.
**Validación**: spec de ejemplo → chaincode que compila y cuyos tests generados pasan;
diff contra la plantilla base acotado a los puntos de parametrización. →
`fabrica-sc/engine/fabrica.py` + `testgen.py`, 12 tests en `fabrica-sc/tests/test_engine.py`
(specs que encajan fabrican; specs que no encajan revientan con el porqué exacto ANTES de
escribir un archivo). `ejecutor-a2a/fabric_engine.py` + `RouterEngine` en `engine.py` cablean
el departamento `contratos_inteligentes` al Ejecutor: va SIEMPRE a la fábrica determinista,
nunca al LLM, sin importar `EJECUTOR_ENGINE` — 9 tests en `tests/test_fabric_engine.py`.
**Verificación real del toolchain (2026-07-20, no solo unit tests)**: con Go 1.24.5 (mismo
pin que el Dockerfile) sobre un paquete recién fabricado por el Engine: `go build` OK,
`go vet` OK, `go mod verify` OK, `go test` → 7/7 verdes, `gosec` → 0 issues/350 líneas
(mismo número que la auditoría manual de Fase 2). El paquete generado compila y pasa de
verdad, no solo en teoría.

### Fase 4: Perfil de gates "fabric" en el Supervisor — ✅ HECHA (lado Supervisor; red efímera es Fase 5)
**Objetivo**: el Supervisor re-gatea de cero: build, gosec, escaneo de dependencias,
tests, red efímera con las transiciones y casos negativos de la spec.
**Validación**: chaincode bueno → verde end-to-end; chaincode saboteado (transición sin
control de rol) → gate rojo con hallazgo, escalada. →
`supervisor-a2a/chequeos_fabric.py` (4 chequeos estáticos: paquete presente, manifest
íntegro por sha256, diff acotado contra la plantilla auditada, cero tokens de
no-determinismo) + `reglas/contratos_inteligentes.toml` (capa 2: `go build|vet|test`,
`go mod verify`, `gosec` como gates de comando). 15 tests en
`tests/test_chequeos_fabric.py` sobre paquetes fabricados de verdad (no fixtures a mano),
incluida una sabotaje-de-línea-fuera-del-diff y un `time.Now()` colado. La **red efímera**
(desplegar en `fabric-samples/test-network` y ejecutar las transiciones/negativos de la
spec) NO corre en el contenedor del Supervisor por diseño (sin socket Docker, aislamiento
del juez) — es el host-job `verificar-red-efimera.py` de la Fase 5, antes de la aprobación
humana. Ese gate sigue pendiente.

### Fase 5: Aprobación humana + despliegue lifecycle — ✅ HECHA en dev (2026-07-27); runners contra red real = Fase 6
**Construido**: `supabase-fase12-contratos-sc.sql` (APLICADA a producción; un
escritor por transición: Ejecutor crea `fabricando` → red efímera pasa a
`en_revision` → humana decide → host-job despliega; lineage `origen`);
`fabrica-sc/banderas.py` (G1 ejecutable: plazo sospechoso, concentración de
poder, condición unilateral — la escrow canónica levanta 2 A PROPÓSITO);
`ejecutor-a2a/contratos_sc.py` (registro best-effort LOGUEADO desde
`fabric_engine`); `fabrica-sc/integridad.py` (espejo de la fórmula del
manifest, compartido por ambos host-jobs); `fabrica-sc/verificar-red-efimera.py`
(plan puro: CADA transición sobre instancia fresca + negativos solo con
credencial que de verdad no autoriza; runner fabric-samples pluggable);
`fabrica-sc/desplegar-chaincode.py` (G5 + doble firma op/tg + secuencia de la
fila + WHERE estado=aprobado también en el PATCH); vista `/contratos` en
Mission Control (banderas ARRIBA, renglón O1, decisión con sesión autenticada,
tiempo-en-revisión como métrica G4). 35 tests nuevos.
**Objetivo original**: paquete de revisión en Mission Control (banderas G1 arriba);
`desplegar-chaincode.py` operando solo sobre `aprobada`, firmando con
`admin-despliegue-op` y exigiendo la 2ª firma del admin Testigo (ceremonia registrada
en `contratos_sc`); **G5**: re-verificar el sha256 del paquete APROBADO justo antes de
`install` — lo que se despliega es bit a bit lo que se aprobó; registro en
`contratos_sc` (con `origen`); aviso por Telegram.
**Validación**: intento de desplegar una fila NO aprobada → rechazo del host-job;
paquete con hash distinto al aprobado → rechazo; flujo aprobado → chaincode `commit`
en el canal y consultable con `peer lifecycle chaincode querycommitted`.
→ Las dos primeras FIJADAS en tests (runner espía); la tercera (commit real)
exige la red tier 1 viva — es parte de la Fase 6 en el nodo sandbox.

### Fase 6: Validación Final (end-to-end real)
**Objetivo**: de un mensaje de Telegram a un contrato vivo en el canal de demo.
**Validación**:
- [ ] Conversación → spec confirmada → fabricación → gates verdes → aprobación → despliegue.
- [ ] `contratos_sc` con trazabilidad completa (lineage `origen` incluido) y costo del task visible.
- [ ] Un rechazo humano en Mission Control detiene todo (nada llega a la red).
- [ ] Criterios de éxito cumplidos.

---

## 🧠 Aprendizajes (Self-Annealing)

> Crece durante la implementación. El mismo error nunca ocurre dos veces.

- **2026-07-28 (sandbox)**: (1) el supuesto de COSTO de una decisión caduca — la
  línea CX de Hetzner ($6.49) se agotó globalmente y el nodo fijo pasaba a
  $22.99 (3.5×): verificar el precio VIVO antes de ejecutar una decisión vieja,
  y si la base cambió, volver a preguntar (la dueña eligió efímero). (2) Un
  recurso efímero exige DELETE VERIFICADO: el primer smoke dejó un huérfano
  porque `servers delete --id` (sintaxis inventada) fallaba en silencio bajo
  `>/dev/null || true` — la verificación post-borrado y el modo `status` son el
  fusible, y todo delete imprime su resultado. (3) En el CLI impreso de hcloud
  los recursos van top-level y `delete` es posicional.

- **2026-07-27 (Fase 5)**: (1) una heurística de "cláusula sospechosa" que marca
  la prerrogativa acotada del árbitro (resolver CON regla de plazo) es ruido que
  diluye la señal G4 — "condición unilateral" exige poder SIN condición: salidas
  sin regla controladas por un solo rol; el par de banderas que la escrow
  canónica sí levanta (comprador concentra desenlaces; `entregado` sin
  contra-jugada) es un hallazgo REAL de la plantilla, y los tests lo fijan a
  propósito para que nadie lo "arregle" en silencio. (2) Un caso negativo de la
  red efímera solo vale si la credencial presentada de verdad NO autoriza: con
  control por MSP, un rol del MISMO MSP que el autorizado "pasaría" el rechazo
  por razones equivocadas — el plan lo omite y lo declara (`sin_negativo`).
  (3) La regla `react-hooks/purity` de ESLint (Next 16) prohíbe `Date.now()` en
  render de server components: para métricas por-request en páginas
  force-dynamic, disable puntual documentado en la línea inmediata (el
  directive NO salta líneas de comentario). (4) Backticks en `git commit -m`
  con comillas dobles ejecutan sustitución de comando y se comen palabras del
  mensaje — mensajes multilínea SIEMPRE con `-F -` + heredoc quoted.

- **2026-07-19 (integración)**: material redactado fuera del repo llegó numerado
  "Fase 8/PRP-008" cuando el repo ya iba por la Fase 11/PRP-012 — todo artefacto
  redactado fuera del repo debe reconciliar su numeración contra ROADMAP y
  `.claude/PRPs/` ANTES de integrarse (aquí: PRP-013/Fase 12). También citaba
  `coordinador-a2a/contrato.py`, que no existe: el contrato del trío vive en
  `trio-contrato/contrato.py` — verificar referencias contra el árbol real.

- **2026-07-20 (Fases 3-4, cierre del residual "código escrito, nunca corrido")**:
  el trabajo de Fase 3/4 llegó completo en código pero SIN correr contra el árbol real
  — mapear contexto (bucle agéntico) encontró tres huecos del mismo patrón, ya
  documentados en `CLAUDE.md` para otros departamentos pero repetidos aquí:
  (1) `chequeos_fabric.py` (nuevo módulo) nunca se importó en `supervisor-a2a/executor.py`
  → `gates.CHEQUEOS` nunca se poblaba con sus 4 chequeos → `ConfigInvalida` AL ARRANCAR
  el servicio (mismo patrón que `chequeos_adquisicion`, gotcha "todo módulo nuevo se
  registra por import expreso"). (2) los Dockerfiles de `ejecutor-a2a` y `supervisor-a2a`
  no tenían el `COPY` de los archivos nuevos (`fabric_engine.py`, `chequeos_fabric.py`) NI
  del directorio `fabrica-sc/` que ambos requieren en runtime (`fabric_engine.py` lo carga
  de `/app/fabrica-sc`; `chequeos_fabric.py` compara contra `/app/fabrica-sc/plantillas`) —
  sin esto el Ejecutor entra en crash-loop al primer arranque (`RouterEngine` construye
  `FabricPaqueteEngine()` SIEMPRE, en `Worker.__init__`, no perezoso) y el gate
  `diff_acotado_plantilla` sale `no_ejecutable` siempre en producción. El Dockerfile de
  `supervisor-a2a` tampoco traía el toolchain Go/gosec que sus propios gates de comando
  declaran (`go build|vet|test`, `go mod verify`, `gosec`) — los 5 gates de comando
  habrían sido `no_ejecutable` = rechazo automático de TODO paquete, bueno o malo.
  (3) dos tests preexistentes (`ejecutor-a2a/tests/test_claude_engine.py::test_fabrica_por_env`,
  `supervisor-a2a/tests/test_config.py::test_directorio_real_carga_ambos_departamentos`)
  quedaron con aserciones desactualizadas tras envolver el engine en `RouterEngine` y
  sumar el tercer departamento — pytest los corrió y fallaron, es exactamente el trabajo
  de "mapear contexto real antes de avanzar de fase" del bucle agéntico.
  **Fix**: import expreso en `executor.py` (mismo patrón); Go 1.24.5 pineado con sha256
  verificado contra el checksum publicado en go.dev/dl (no solo confiar en la descarga) +
  gosec pineado a un tag (`go install` ya verifica contra sum.golang.org); `COPY` explícito
  de `fabric_engine.py`/`chequeos_fabric.py`/`fabrica-sc/{contrato_sc.py,engine,plantillas}`
  en ambos Dockerfiles; tests actualizados a la conducta nueva (no revertida). Verificación
  real (no solo `py_compile`): Go 1.24.5 + gosec v2.28.0 instalados en la máquina de dev
  (mismos pines del Dockerfile) corriendo build/vet/mod-verify/test/gosec sobre un paquete
  recién fabricado — los 5 comandos que el Supervisor correrá en producción, verificados
  antes de que corran en producción por primera vez.
  **Aplicar en**: toda fase que llegue "completa" desde fuera de una sesión de bucle
  agéntico — el mapeo de contexto (Paso 2 del blueprint) incluye correr los tests
  existentes de los servicios tocados, no solo los del código nuevo, y si el perfil de
  gates declara comandos de un toolchain nuevo (Go, aquí), ese toolchain es parte de la
  definición de "Dockerfile terminado" (hermano del gotcha 2026-07-10 de CLAUDE.md).

## Gotchas

- [x] **RAM**: decidido — nodo Hetzner aparte para el gate fabric (la red efímera pica
  2-3 GB; los números por pieza están en `arquitectura-red-fabric.md` §6). La red tier 1
  estable tampoco comparte nodo con el gate.
- [ ] **Determinismo del chaincode**: nada de `time.Now()`, mapas iterados sin ordenar,
  aleatoriedad ni llamadas externas dentro del chaincode — el endorsement diverge y las
  transacciones se invalidan (MVCC). La plantilla lo resuelve (timestamps del tx context),
  y el gate debe verificarlo con gosec + reglas propias.
- [ ] **Versionado del lifecycle**: cada re-despliegue requiere `--sequence` incrementado
  y coherente entre organizaciones; el host-job lo lee de `contratos_sc`, nunca lo adivina.
- [ ] **Credenciales MSP**: las identidades de admin para `approveformyorg` son llaves de
  despliegue — viven en el volumen del host-job, jamás en git ni en el contenedor del
  Ejecutor (el que genera código NO debe poder desplegar). La separación física
  Operadora/Testigo la fija `red-tier1-iac/CEREMONIA.md`.
- [ ] **G5 — ventana aprobación→despliegue**: el hash del paquete aprobado se re-verifica
  en el host-job antes de `install` (control del modelo de amenazas; cierra el hueco de
  sustituir el artefacto después del OK humano).
- [ ] **Imagen pineada**: igual que Hermes `v2026.6.19`, pinear la versión de Fabric
  (2.5.x LTS) en el gate y en producción; nunca `latest`. El kit IaC ya pinea 2.5.9 /
  CA 1.5.12 en su `.env` (fijar digests sha256 al primer pull).

## Anti-Patrones

- NO generar chaincode libre fuera del catálogo de plantillas (v2 podrá ampliar el
  catálogo, no relajar el principio).
- NO auto-aprobar: ni el Coordinador, ni el Supervisor, ni el host-job deciden — deciden
  la dueña/el cliente autorizado y la política de endorsement.
- NO desplegar "porque los gates pasaron": gates verdes es condición necesaria, la
  aprobación humana es la suficiente.
- NO mezclar credenciales de fabricación con credenciales de despliegue.
- NO crear un servicio nuevo si el patrón Engine/gate existente alcanza (aislar, no
  fundir; extender, no duplicar).

---

*PRP aprobado 2026-07-19 con decisiones resueltas. Fases 1-2 integradas; Fases 3-6 pendientes.*
