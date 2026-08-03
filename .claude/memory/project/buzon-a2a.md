# Departamento de Buzón — HERALDO-6 (correo institucional operado por agentes)

> **Este archivo guarda la ARQUITECTURA y las lecciones del build** (PRs **#208**, 92
> archivos, y **#209**, despliegue + migraciones). El **estado operativo vive en
> [[buzon-agentico]]**: primer buzón `atencion@digifixapp.com` dado de alta y en MODO
> ESPEJO con cron desde 2026-08-03. SPEC: `SPEC-buzon-a2a.md` (raíz) · bitácora:
> `PROGRESS-buzon-a2a.md`.

## Qué es

Quinto departamento del trío. **El agente lee correo saneado y redacta borradores; nunca
envía.** La supervisión humana no es una política escrita: es una fila en
`aprobaciones_salientes` que el motor **no puede fabricar porque no tiene credenciales**.
Esa es la propiedad que un auditor puede verificar sin creerle a nadie.

## Piezas

| Pieza | Qué hace |
|---|---|
| `businessos/buzon-a2a/` | Servicio A2A (perfil `a2a`, `127.0.0.1:4900`). `politicas.py` (11 gates puros), `saneado.py`, `correos.py`, `redactor.py` (motor pluggable determinista), card/app/executor. |
| `supervisor-a2a/chequeos_buzon.py` | Adaptador que **vendora** `politicas.py` — una sola implementación, no dos que deriven. `reglas/buzon.toml`: 12 gates activos (+2 de modelo INACTIVOS: sin runner ejecutable, un gate así es config inválida). |
| `ingerir-entrantes.py` | Host-job. 3 adaptadores (IMAP/Graph/Gmail), saneado, hash de evidencia, lead `origen='correo'`, bitácora encadenada. **Dry-run por defecto.** |
| `enviar-salientes.py` | Gates 3 y 4 SOLO para rutas `buzon/<id>`; EG.CRM sin cambio de comportamiento. |
| Frontend (meeting-copilot) | 5 vistas (`/buzon`, hilo, aprobaciones, políticas, bitácora) + `/api/buzon/salud` + 16ª herramienta del launcher. |
| `onboarding.py` (§11) | Asistente de configuración del cliente: modo espejo **no saltable** + relajamiento progresivo. |
| `businessos/gobernanza/` | Los 3 documentos (política de correo agéntico, registro de decisiones de riesgo, procedimiento de incidente de inyección). **Borradores sin firmar a propósito**: la firma es de la dueña/SGSI. |

## Lo que costó y no debe re-aprenderse

- **El corpus encontró lo que 80 tests verdes no**: texto del mismo color que el fondo
  (blanco sobre blanco) sobrevivía al saneado. Cerrado en `saneado.py` con control de
  reversión y dos casos nuevos de corpus (62 casos, 10 familias, 0 escapes).
- **La imagen viva del Supervisor conocía 4 departamentos** y no tenía `chequeos_buzon`:
  una tarea del departamento `buzon` habría sido rechazada por un juez ignorante, con el
  código correcto. Reconstruida con el trío ocioso → 5 departamentos, cero gates faltantes.
- **Un error debe nombrar su causa**: sin Supabase configurado, las lecturas morían con
  "UnsupportedProtocol" (error interno de httpx). Solo se ve **arrancando el servicio de
  verdad**, no en los 97 tests.
- **Verificación de las migraciones en producción**: previa (cero colisiones; el constraint
  vivo de `leads` coincidía con lo esperado) y posterior (8 tablas RLS+FORCE, los cuatro
  candados rechazando de verdad, bitácora append-only probada dentro de una transacción
  revertida). Advisors: 8 INFO `rls_enabled_no_policy` = el diseño buscado.

## Deuda declarada

La política de §11 tiene DOS implementaciones: `onboarding.py` (autoridad, con tests de
límites) y su espejo en TS del frontend mock-first. Duplicación consciente **con fecha de
vencimiento**: cuando la UI llame a `/api/buzon/*` contra el daemon :4900, la copia TS muere.
Cruza lenguajes, por eso no se resolvió vendorando el módulo como con `politicas.py`.

## Gates de la dueña (estado al 2026-08-03 — ver [[buzon-agentico]])

1. Firmar los 3 documentos de gobernanza (§7.3) — **pendiente**.
2. ~~Activar el primer buzón~~ — hecho: `atencion@digifixapp.com` con firma en el
   registro de riesgo (PR #216), en modo espejo.
3. ~~Registrar la ingesta en cron~~ — hecho: cron cada 15 min desde 2026-08-03.
4. Cumplir el mínimo de espejo (7 días Y 20 borradores) y decidir la activación del envío.
