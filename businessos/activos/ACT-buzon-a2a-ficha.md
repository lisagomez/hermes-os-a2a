# FICHA DE ACTIVO DIGITAL — HERALDO-6 / `buzon-a2a`

> Módulo `act` (ERP-4B) · ciclo DETECTAR → CATALOGAR → REGISTRAR
> Folio padre propuesto: **ACT-0026** (siguiente tras ACT-0025)
> Estado real hoy: **PROPUESTA / detectada** — no concretable hasta merge a master

---

## 0. Advertencia de integridad contable (leer primero)

Este activo tiene un problema que los 23 anteriores no tuvieron, y hay que
resolverlo antes de registrarlo, no después.

**El diseño se produjo fuera de la fábrica instrumentada.** El trigger de
`costo_acumulado` lee de `token_usage.task_id`. Esta especificación se generó en
una sesión externa sin `task_id`, por lo que su costo **no existe en
`token_usage`** y el activo nacería subvaluado.

Tres salidas posibles, en orden de preferencia:

| Opción | Qué implica | Efecto |
|---|---|---|
| **A. Costo cero de diseño** | se registra solo el costo de construcción interno | subvalúa, pero es honesto y no inventa cifras |
| **B. Asiento manual con evidencia** | fila en `act_costo` con `origen='externo'`, adjunto probatorio y firma humana | valuación fiel; exige campo `origen` si no existe |
| **C. Re-derivar internamente** | encolar la spec como tarea del trío para que la fábrica la reproduzca | costo real medido, pero se paga dos veces |

**Recomendación: B**, con la regla dura de que todo `act_costo` con
`origen='externo'` requiere firma humana y evidencia adjunta, igual que
`aprobaciones_salientes` requiere una fila que el motor no puede fabricar. Sin
esa regla, `origen='externo'` se convierte en la puerta trasera por donde entra
cualquier cifra sin respaldo — exactamente lo que el gate `AUDITADA-POR:` de
`exportar-polizas.py` existe para impedir.

Si el campo `origen` no está en `act_costo`, esto es una migración aditiva
pequeña (006) y conviene hacerla ahora, porque el problema se repetirá con cada
diseño hecho fuera del trío.

---

## 1. Identificación

```
FOLIO           : ACT-0026 (padre)
NOMBRE          : Gestor de correo institucional operado por agentes A2A
CARTA COMERCIAL : HERALDO-6
SERVICIO        : buzon-a2a (:4900)
ORIGEN          : diseño externo + construcción en fábrica (mixto — ver §0)
TIPO            : activo compuesto (padre con hijas)
NIVEL SDD       : L3 + gobernanza L4
```

---

## 2. Clasificación en el origen

```yaml
clasificacion:
  vendible: true
  eje_dei: <≠ operacion>     # valor exacto según activos/CATALOGO.md
```

**`vendible: true` es obligatorio, no opcional.** Por la regla de marca blanca
(2026-07-28), toda feature generada en white-label es vendible por definición.
Este activo es marca blanca por construcción: la plantilla de buzón, el modo de
contraparte y la carta HERALDO-6 son parametrizables por tenant desde el diseño.

La regla dura `vendible ⇒ eje ≠ operacion` se cumple: no es infraestructura
interna, es producto que se cotiza en el mazo. El valor concreto del enum sale
de `activos/CATALOGO.md`; aquí solo se verifica la restricción.

**Herencia padre→hijas**: el Coordinador propaga la clasificación a todas las
tareas hijas. Ninguna de las 8 hijas debe encolarse sin ella, o su costo no se
denormaliza en `tareas` y se pierde del `costo_acumulado`.

**Asiento doble obligatorio** (marca blanca): ERP + ledger del cliente, con el
esquema de costeo de `activos/CATALOGO.md` §5 de `departamentos/white-label.md`.

---

## 3. Descomposición en hijas

El patrón de los 23 anteriores fue aproximadamente un folio por componente
desplegable. Aquí van 8, alineadas 1:1 con el orden de implementación de §5.2
del SPEC:

| Folio | Componente | Naturaleza | Defendible |
|---|---|---|---|
| ACT-0027 | `supabase-buzon.sql` (esquema + RLS FORCE) | infraestructura de datos | no |
| ACT-0028 | `ingerir-entrantes.py` (saneado + hash) | host-job | **candidato** |
| ACT-0029 | `buzon-a2a` — cuarentena + redactor | servicio A2A | **candidato** |
| ACT-0030 | `chequeos_buzon.py` — los 11 gates | motor de políticas | **candidato fuerte** |
| ACT-0031 | Extensión de `enviar-salientes.py` (gates 3 y 4) | frontera de envío | **candidato fuerte** |
| ACT-0032 | Adaptadores Graph / Gmail / IMAP | integración | no |
| ACT-0033 | UI Buzón en meeting-copilot (6 rutas) | superficie | no |
| ACT-0034 | Asistente de configuración §11 | superficie | **candidato** |

ACT-0026 (padre) acumula el costo de las 8 más el diseño.

**Nota sobre ACT-0031**: no es un activo nuevo, es una **versión nueva** de un
activo que ya existe (`enviar-salientes.py`, parte del paquete EG.CRM). Debe
registrarse como `act_version` sobre el folio existente, **no** como folio
nuevo. Si se catalogara como activo independiente se duplicaría valor y el
detector `swm-act` lo marcaría CAMBIADO contra un padre equivocado.

---

## 4. Estructura de costeo

### 4.1 Fuentes de costo

```
act_costo (append-only, trigger → costo_acumulado en act_activo)
   │
   ├─ TOKENS DE FÁBRICA          → token_usage.task_id (automático)
   │    · 8 tareas hijas con clasificacion heredada
   │    · incluye retrabajos: el costo real es el gastado, no el ideal
   │
   ├─ TOKENS DE RUNTIME EN GATES → token_usage, tareas de supervisión
   │    · el juez LLM adversarial de sup-crm si se reusa para correo
   │    · los gates deterministas cuestan CERO tokens (así deben quedar)
   │
   ├─ DISEÑO EXTERNO             → origen='externo', firma humana (§0)
   │
   └─ HORAS HUMANAS              → pendiente de política D-07
        · auditoría de la política de correo agéntico
        · ceremonia de verificación de ApplicationAccessPolicy
        · firma del responsable del SGSI
```

### 4.2 El costo que hay que vigilar

Los 23 activos anteriores sumaron $36.32. Este solo probablemente los supere,
por una razón identificable: **el corpus de inyecciones de §8**. Si se genera
con modelo, son ≥50 casos adversariales más su regeneración en cada cambio de
prompt o de modelo. Es costo recurrente, no de construcción.

Recomendación: encolar el corpus como **tarea hija con su propio folio y
clasificación**, para que su costo se vea separado desde el inicio. Si queda
enterrado en ACT-0030, en tres meses nadie sabrá que el mantenimiento del corpus
es lo que mueve la cifra.

Correlato de política: el corpus se ejecuta en CI, y su ejecución debe ser
determinista (comparación de salidas, no juicio de modelo). Ejecutarlo con juez
LLM en cada push convierte un gate en una línea de gasto creciente.

### 4.3 Costo recurrente vs. capitalizable

| Concepto | Naturaleza | ¿Capitaliza? |
|---|---|---|
| Construcción de los 8 componentes | desarrollo | sí, sujeto a D-07 |
| Diseño (spec + §11) | desarrollo | sí, si se resuelve §0 |
| Generación inicial del corpus | desarrollo | sí |
| Regeneración del corpus por cambio de modelo | mantenimiento | **no** — gasto |
| Tokens de redacción en producción | costo de operación del cliente | **no** — COGS |
| Horas de A5 aprobando | costo de operación del cliente | **no** — COGS |

Esta última fila importa para la cotización de la carta: **la carta HERALDO-6
tiene un COGS humano que las otras siete del mazo no tienen.** ⚡4 de energía
cubre tokens, pero el tiempo del aprobador es del cliente y hay que decirlo en
la propuesta comercial. Un cliente que descubre el costo de A5 después de firmar
es una renovación perdida.

---

## 5. Defendibilidad (`act_proteccion`)

De los 8 componentes, dos son genuinamente defendibles y el resto es integración
competente pero replicable. Ser selectivo aquí es lo que da credibilidad a la
cartera: 9 de 23 fue una proporción sana; marcar 8 de 8 la destruiría.

**Defendible fuerte — ACT-0031 · frontera de envío de doble candado**

La propiedad no es "hay aprobación humana", que cualquiera reclama. Es que la
fila de autorización **no puede ser fabricada por el componente que ejecuta el
modelo**, porque no tiene credenciales para escribirla. Es una separación de
capacidades estructural, verificable por un auditor en dos minutos, y es
exactamente la evidencia que ISO/IEC 42001 pide para supervisión humana.

**Defendible fuerte — ACT-0030 · relajamiento progresivo determinista**

25 aprobaciones consecutivas sin edición, 30 días activo, cero gates críticos, y
aun así solo propone; reversión automática a 2 rechazos. Convierte el control
humano en algo que se gana con evidencia registrada, en lugar de un permiso
concedido por criterio. Produce el rastro de auditoría como subproducto del
funcionamiento normal.

**Candidatos a evaluar en sesión de ratificación** — ACT-0028 (saneado con hash
de evidencia previo al modelo) y ACT-0034 (máquina de estados del onboarding con
modo espejo no saltable).

**No defendibles**: esquema SQL, adaptadores de proveedor, rutas de UI. Son
buena ingeniería, no propiedad defendible.

Aplica el pendiente D-12: separación física de repos para los defendibles
ratificados.

---

## 6. Ciclo del módulo `act` — dónde está y qué falta

```
DETECTAR    ✅ este documento es la detección manual
                (el detector swm-act v1 lo marcaría NUEVO en su corrida semanal)

CATALOGAR   🟡 posible hoy como PROPUESTA
                folios reservados, clasificación fijada, costeo estructurado

REGISTRAR   ⬜ BLOQUEADO — requiere:
                · merge a master de cada hija (gate humano → CAS a concretada)
                · resolución de §0 sobre el costo de diseño externo
                · sesión de ratificación de defendibilidad
                · firma AUDITADA-POR del contador sobre act-contable.md
```

**El activo no puede pasar a `concretada` hoy.** El flanco que dispara el
cosechador es `→ aprobada & vendible`, y el merge a master es el gate humano. Un
SPEC sin código es, como máximo, una PROPUESTA. Registrarlo antes rompería la
regla que ya defendiste con las skills EG.CRM: *versionadas ≠ desplegadas*.

---

## 7. Ejecución

### 7.1 Al encolar las tareas (obligatorio)

Cada una de las 8 hijas se encola con la clasificación en el origen. Sin esto no
hay costeo:

```json
{
  "departamento": "software",
  "titulo": "buzon-a2a — chequeos_buzon.py (11 gates)",
  "clasificacion": { "vendible": true, "eje_dei": "<≠operacion>" },
  "contexto": { "activo_padre": "ACT-0026", "spec": "SPEC-buzon-a2a.md §3" }
}
```

### 7.2 Cosecha (tras el primer merge)

```bash
# detectar — flanco →aprobada&vendible
python3 cosechar-activos.py detectar

# concretar — CAS a concretada, solo tras merge a master
python3 cosechar-activos.py concretar ACT-0027

# ratificar defendibilidad — decisión humana explícita
python3 cosechar-activos.py ratificar ACT-0030 ACT-0031 --confirmar
```

Puente `cli_fin` + `SET ROLE`. **Jamás `service_role`.**

### 7.3 Registro del costo externo (si se elige la opción B)

Requiere la migración aditiva 006 con el campo `origen` en `act_costo` y su
regla de firma. No hacerlo por el puente psql interino sin dejar rastro: este
asiento es precisamente el que un auditor va a cuestionar primero.

---

## 8. Este activo hace madurar el módulo

Tres cosas que ACT-0026 fuerza y que estaban pendientes:

1. **Primera cosecha e2e con tarea vendible real** — es el gate de la dueña que
   seguía abierto esperando "la próxima feature con `vendible: true`". Esta lo
   es, y por marca blanca no puede no serlo.
2. **`origen` en `act_costo`** — el problema del costo generado fuera de la
   fábrica se va a repetir con cada diseño externo. Resolverlo aquí lo resuelve
   para siempre.
3. **Primer activo con COGS humano** — obliga a que la política contable D-07
   distinga capitalizable de operación del cliente. Los 23 anteriores no tenían
   esa distinción porque ninguno requería un humano en el camino crítico.

---

## 9. Pendientes antes de registrar

- [ ] Decidir §0: opción A, B o C sobre el costo de diseño externo
- [x] Confirmar el valor exacto de `eje_dei` contra `activos/CATALOGO.md`
      → **`desarrollo`** (beneficio económico identificable → capitalizable sujeto a
      la política auditada; `investigacion` sería GASTO del periodo por NIF C-8).
      Cumple la regla dura `vendible ⇒ eje ≠ operacion`. Resuelto 2026-08-02.
- [ ] Corregir ACT-0031 → `act_version` sobre el folio existente de
      `enviar-salientes.py`, no folio nuevo
- [ ] Separar el corpus de inyecciones como hija con folio propio
- [ ] Encolar las 8 hijas con clasificación heredada
- [ ] Definir el precio de la carta HERALDO-6 con el COGS humano declarado
- [ ] Migración 006 (`origen` en `act_costo`) si se elige la opción B

---

## 10. Addendum de construcción — estado real al 2026-08-02

> Añadido por la sesión que construyó el activo. No modifica el análisis de
> arriba: lo ancla a lo que existe en el repo.

**La construcción ya ocurrió, y no por el trío.** Los 8 componentes de §3 se
construyeron en una sesión de Claude Code y viven en el **PR #208** (rama
`feat/buzon-a2a`). Esto tiene una consecuencia contable directa que agrava el
problema de §0: **el costo de construcción tampoco está en `token_usage`**, por
la misma razón que el diseño — no hubo `task_id` de tarea del trío.

Es decir, el activo tiene *dos* tramos de costo fuera de la fábrica
instrumentada, no uno:

| Tramo | Instrumentado | Nota |
|---|---|---|
| Diseño (spec + §11) | no | el problema original de §0 |
| Construcción de los 8 componentes | **no** | esta sesión, sin `task_id` |
| Operación futura (redacción, gates) | sí, cuando corra | `token_usage` lo captará |

La recomendación de §0 (**opción B**, asiento con `origen='externo'` + firma +
evidencia) sigue siendo la correcta y ahora cubre ambos tramos. La opción C
(re-derivar por el trío) ya no aplica al código: existe y está verificado;
re-derivarlo sería pagar dos veces por algo que ya se puede leer en el PR.

**Cobertura real de las 8 hijas** (todas construidas, ninguna registrada):

| Folio | Componente | Estado en el repo |
|---|---|---|
| ACT-0027 | `supabase-buzon.sql` | construido; validado en Postgres efímero |
| ACT-0028 | `ingerir-entrantes.py` | construido (saneado + hash de evidencia) |
| ACT-0029 | `buzon-a2a` | construido; 97 tests |
| ACT-0030 | `chequeos_buzon.py` (11 gates) | construido; adapta `politicas.py`, no lo duplica |
| ACT-0031 | extensión de `enviar-salientes.py` | construido — **registrar como `act_version`**, ver §3 |
| ACT-0032 | adaptadores Graph/Gmail/IMAP | construidos dentro de ACT-0028 |
| ACT-0033 | UI Buzón (5 rutas + API) | construido |
| ACT-0034 | asistente de configuración §11 | construido |

**Sobre el corpus como hija con folio propio (§4.2):** el corpus existe
(`buzon-a2a/corpus/`, 62 casos) y se generó con modelo, así que la observación
de costo recurrente es correcta. Un dato para la valuación: su ejecución en CI
es **determinista** (compara salidas del saneador y de los gates, sin juez LLM),
tal como pedía §4.2 — el gasto recurrente es la *regeneración* cuando cambie el
modelo, no la ejecución.

**Lo que sigue bloqueando el registro** (sin cambios respecto a §6): el merge a
master del PR #208 es el gate humano. Un SPEC con código en una rama sigue
siendo, como máximo, PROPUESTA.
