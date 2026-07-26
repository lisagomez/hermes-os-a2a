# Catálogo de Activos Digitales propios (A2A-NNN)

> **ACTUALIZADO 2026-07-26:** el catálogo migró a la BD — módulo `act` del ERP vivo
> (ACT-0003..0025 vía `ref_catalogo`). La BD es la fuente dinámica; el jsonl queda
> como bootstrap/referencia. Ver `erp-modulo-act.md`.

**Estado (2026-07-26):** creado en `businessos/activos/` — `CATALOGO.md` (fichas) +
`activos.jsonl` (ledger machine-readable). 23 activos: 10 PRODUCTO, 5 FABRICA,
4 CONOCIMIENTO, 2 DISEÑO, 1 COMERCIAL, 1 INFRA.

**Qué es / qué no es:** inventario de activos digitales PROPIOS de la fábrica.
NO duplica `activos-clientes/` (activos DE clientes, GALMX-NNN) ni
`_catalogo/servicios.md` (servicios contratables S-xx). Relación: un S-xx es lo
que el cliente contrata; un A2A-NNN es el medio de producción o producto que lo
hace posible. Cada ficha lista qué S-xx habilita.

**Encaje con el ERP (decisión de diseño clave):** el ERP-MAESTRO §1.6-1.7 ya
define el tratamiento de activos digitales (módulo `act` en el núcleo, detector
`swm-act`, capitalización auditada). Este catálogo es el **bootstrap manual** de
ese módulo — migrable cuando ERP-1+ exista (hoy bloqueado por D-03) — y por eso
lleva los DOS EJES del maestro: **D+I** (investigacion=GASTO NIF C-8 /
desarrollo=capitalizable) y **DEFENSIBILIDAD** (defendible=foso /
reemplazable=velocidad, "prueba del foso": ¿lo reproduce un competidor con
Claude Code en semanas?). ⚠️ Toda clasificación de defensibilidad es PROPUESTA:
asignarla/cambiarla es decisión HUMANA (§1.7-c4), pendiente de Elisa; el D+I
retroactivo lo valida el contador.

**Esquema de costeo (4 componentes, `fuente` obligatoria — herencia del ledger
GAL: nunca aparentar precisión; `no_medido`/`no_estimado` son valores honestos):**
construcción (hundido) · operación mensual · réplica (marginal) · reposición
(reconstruir HOY con la fábrica; referencia medida: feature del trío $1.62
nominal / ~$0.27 real vía z.ai).

**Números ancla (2026-07-26):** sistema completo ≈ $13.2/mes (tokens $4.24 +
Hetzner $8.99); construcción vía trío acumulada $33.29 nominal (27 tareas).

**Lecturas clave:** (a) propuesta de foso: 9 defendibles (grafo+seed, trío+skills,
fábrica SC, ERP know-how, doctrina, marca, patrón verticales) / 14 reemplazables;
(b) **brecha de separación física**: el ERP exige defendibles en repos de acceso
mínimo y HOY todo convive en un repo personal con 4 colaboradores write —
decisión pendiente de la dueña (Organización + separar repos) antes del primer
white-label que entregue algo; (c) deudas señaladas por el costeo:
`evaluar-facturas.py` sin agendar, Mission Control single-tenant.

**Mantenimiento:** alta al nacer un activo; revisión de costos al cierre de cada
fase; `swm-act` lo hará dinámico cuando el ERP viva. Referencia cruzada en
GTM.md §4.
