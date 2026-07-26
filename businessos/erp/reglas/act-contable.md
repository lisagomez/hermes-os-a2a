# Política de capitalización de activos digitales (módulo act) — BORRADOR para auditoría

> **D-07 del ERP-MAESTRO.** Esta política es el criterio con el que un activo digital
> del inventario (`erp.act_activo`) sube al balance como intangible, se reconoce como
> gasto, o se da de baja. La redactó dep-fin (borrador 2026-07-26, generado por la
> fábrica) y **NO TIENE EFECTO hasta que el contador la audite** — su firma es la
> línea `AUDITADA-POR:` del final, y `exportar-polizas.py` se NIEGA a proponer o
> aprobar pólizas mientras esa línea esté vacía (validación (d) de ERP-4B:
> *"un intento de capitalizar sin política auditada, rechazado"*).
>
> Claves parseables (las lee `exportar-polizas.py`): `UMBRAL-MATERIALIDAD-USD`,
> `VIDA-UTIL-<tipo>`, `METODO-AMORTIZACION`, `AUDITADA-POR`.

## 1. Criterio rector: el eje D+I (nace en el origen)

El `eje_dei` del activo — heredado del encargo/tarea que lo produjo, jamás
reconstruido después — ES el criterio rector (ERP-MAESTRO §1.7 / §4B paso 5):

| eje_dei | Tratamiento | Base |
|---|---|---|
| `investigacion` | **GASTO del periodo, sin excepción** | NIF C-8: los desembolsos de investigación se reconocen como gasto cuando se incurren |
| `desarrollo` | **CAPITALIZABLE solo si cumple TODOS los criterios de §2** | NIF C-8 (activos intangibles generados internamente, fase de desarrollo) |

Trabajo de `operacion` no llega a este inventario (el contrato del trío impide
`vendible=true` con eje `operacion`).

## 2. Criterios de capitalización (NIF C-8 — todos, no algunos)

Un activo de `desarrollo` se capitaliza SOLO si:

1. **Identificabilidad** — es separable (se puede vender, licenciar o instanciar por
   sí solo) o surge de derechos; la ficha del catálogo y `ubicacion` lo delimitan.
2. **Control** — la fábrica restringe el acceso de terceros al beneficio (repo
   privado, secreto industrial, expediente en `act_proteccion` para defendibles).
3. **Beneficios económicos futuros probables** — hay servicio S-xx que habilita,
   cliente/pipeline identificado, o uso interno que reduce costo medible.
4. **Factibilidad técnica demostrada** — el activo está `produccion` o `beta` con
   gates verdes (una tarea APROBADA por el Supervisor es evidencia de fábrica).
5. **Intención y capacidad de completarlo y usarlo o venderlo** — consta en el
   catálogo/ROADMAP.
6. **Costo medible con fiabilidad** — `act_costo` con fuente declarada;
   `token_usage.task_id` es el soporte primario (§4B: *"el costo no se estima de
   memoria: se suma de datos que el sistema ya mide"*).

Si CUALQUIERA falla → **gasto del periodo**. En caso de duda → gasto (prudencia).

## 3. Umbral de materialidad

Un activo de desarrollo con costo acumulado por debajo del umbral se manda a
gasto por practicidad administrativa (el costo de amortizarlo excede el beneficio
informativo). **El contador fija el umbral definitivo al auditar.**

UMBRAL-MATERIALIDAD-USD: 100

## 4. Vida útil y método de amortización (propuesta por tipo)

Meses de vida útil propuestos por `tipo` de activo; el contador los valida o
corrige. Método único mientras no exista `ctb` (ERP-5B automatizará el asiento
periódico):

VIDA-UTIL-software: 36
VIDA-UTIL-config_agentica: 24
VIDA-UTIL-datos: 24
VIDA-UTIL-documento: 24
VIDA-UTIL-infraestructura: 36
VIDA-UTIL-licencia_suscripcion: 12
METODO-AMORTIZACION: linea_recta

Nota sobre `datos` (seed regulatorio, inteligencia de mercado): su vida útil real
la gobierna la VIGENCIA de las fuentes (cron `revisar-vigencias.py`); 24 meses es
el techo contable, la baja anticipada procede si el conocimiento caduca.

## 5. Moneda y soporte

- Todo en **USD** (act_costo lo fuerza por CHECK) hasta que exista `ctb`/`mon`.
- Soporte documental por póliza: la ficha del activo, el desglose de `act_costo`
  con sus fuentes, y (si nació de tarea) el ledger `token_usage.task_id`. La
  evidencia para estímulos fiscales de I+D (EFIDT, D-11) sale de estos mismos
  datos: `eje_dei` en el origen + costo por tarea.

## 6. Baja contable

Dar de baja un activo capitalizado (obsolescencia, reemplazo, venta) exige
aprobación humana (`--confirmar`), deja el remanente no amortizado como pérdida
del periodo en la póliza de baja, y NUNCA borra la fila: `estado='baja'` +
bitácora (el verbo cancelar ≠ eliminar, §2.1 del maestro).

## 7. Flujo operativo (interino, hasta ctb)

1. `exportar-polizas.py proponer` genera la PÓLIZA PROPUESTA por activo
   (folio `POL-`, CSV+MD) — solo con esta política AUDITADA.
2. Elisa aprueba con `exportar-polizas.py aprobar ACT-NNNN --confirmar`
   (queda `estatus_contable`, fecha, vida útil y aprobador en BD + bitácora).
3. El paquete exportado se entrega al contador para el registro externo.
   Cuando `ctb` exista (ERP-5B), el asiento se registra dentro con la misma
   compuerta.

---

**Auditoría del contador** — al validar esta política, escribir nombre y fecha
(formato: `AUDITADA-POR: <nombre> <YYYY-MM-DD>`). Sin esta línea completa, el
sistema rechaza toda capitalización:

AUDITADA-POR:
