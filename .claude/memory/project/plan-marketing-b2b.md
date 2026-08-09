# Plan de marketing y funnel B2B/A2A — estado

**Documento:** `businessos/PLAN-marketing-b2b.md` (v1.0, 2026-08-07).
**Estado: PROPUESTA — espera validación de Elisa** (sus decisiones están
listadas en el §16 del propio documento, D1–D7).

## Qué es

La capa de marketing/captación/nutrición SOBRE `businessos/GTM.md` (lo
extiende, no lo reemplaza): 5 líneas de solución, 7 servicios, 5 segmentos
con avatar, pipeline 6 fases ↔ 10 etapas de `leads.etapa`, funnel multicanal
A–F con estado real por canal, 12 lead magnets + 3 ofertas de entrada,
scoring 0–100 propuesto como vista SQL (NO existe columna scoring), plan de
90 días alineado a las 3 olas del GTM, KPIs separados en medibles-hoy vs
bloqueados (CRM-4 / P2 / gates), agencia agéntica como línea de expansión.

Origen: solicitud de Victor (prompt v2 "marketing B2B roadmap6", 2026-08-07,
cerró el hilo de marketing que estaba en pausa).

## Reglas que el documento respeta (y que toda edición futura debe respetar)

- **Semáforo de realidad (§0)**: nada se promete sobre infraestructura no
  viva. Outbound WhatsApp = P2 pendiente; email = gate `enviar-salientes.py`;
  cero tenants CRM reales; dominio propio pendiente; Copilot no escribe
  `leads`; CRM-4 construido sin desplegar.
- **Cero claims nuevos** (solo los 5 de `claims-aprobados.txt`) y **cero
  precios** fuera de referenciar `politica-precios.json`.
- 69-B: el enriquecimiento solo marca el expediente; descartar leads es
  criterio humano (frontera de diseño — no venderlo como automatismo).
- GAL México se cita solo como cliente de branding/diseño, no de CRM/Copilot.

## Memo de decisión para Elisa (2026-08-08)

Las 7 decisiones del §16 (D1–D7) se empaquetaron en un memo autocontenido en
lenguaje no técnico: `docs/planes/memo-decisiones-marketing.html` (versionado
junto a los otros 3 planes HTML pendientes de decisión). Publicado como
artifact privado el 2026-08-08 para compartir con Elisa:
https://claude.ai/code/artifact/bc06af3e-87e0-4266-b3b5-11aedc332469
El memo no añade compromisos nuevos — solo ordena los del plan. Sigue en
**espera de respuesta** (Apruebo / Apruebo con cambios / No por ahora, por
decisión).

## Verificación que ya pasó

Ataque adversarial en dos rondas (plan de trabajo + documento) con acceso al
repo; 2 hallazgos reales corregidos (69-B y GAL); ~40 citas técnicas
verificadas contra migraciones/código; checklist de completitud contra los
mínimos del prompt en verde.

Relacionado: [[fase9-adquisicion]], [[crm0-canales]], [[fase4-dashboard]].
