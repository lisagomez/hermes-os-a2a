---
name: hermes-claims-audit
description: Auditoría quirúrgica de claims de un lead (marca blanca, Pre-Discovery) — cada promesa/certificación/capacidad del sitio se interroga (¿qué implicaría que sea verdad?) y se enruta a marco regulatorio, técnico o pregunta de discovery. Usar tras compilar las fuentes de cualquier lead.
---

# Hermes-Claims-Audit (marca blanca)

> Origen: el gotcha e-AWB de GAL (2026-07-27) — el claim *"Elaborate Electronics
> AWB"* estaba CAPTURADO pero nadie lo interrogaba, y el marco regulatorio que
> implicaba (IATA 672 / Montreal / EDI) se quedó fuera hasta que Victor lo
> señaló. Este skill es el multiplicador de la familia: convierte marketing en
> agenda de trabajo para los demás skills.

## Objetivo

Extraer TODOS los claims del material del lead y, a cada uno, hacerle la
pregunta quirúrgica: **¿qué tendría que ser verdad para que este claim sea
verdad?** La respuesta enruta el claim a quien lo procesa.

## Entradas
- Compilación de fuentes (`hermes-source-compilation`): claims con cita.

## Flujo
1. **Inventario de claims**: promesas ("24/7/365", "230 países"), capacidades
   ("tracking personalizado", "torre de control", "Electronics AWB"),
   certificaciones/membresías ("ISO", "partner de X", "miembro de Y"),
   superlativos ("líderes en…"). Cada uno con su cita textual.
2. **Interrogatorio por claim** — ¿qué implicaría que sea verdad?:
   - **Implicación regulatoria** (licencia, permiso, adhesión, registro) →
     enrutar a `hermes-regulatory-scan` como concepto a dictaminar.
   - **Implicación técnica** (sistema, integración, EDI, plataforma) → enrutar
     a `hermes-tech-stack-scan` como capacidad esperada.
   - **Implicación operativa/comercial** → pregunta de discovery para la
     entrevista ("¿su 'Electronics AWB' corre sobre EDI real o la elaboran a
     mano?") → insumo de `hermes-advisor-brief`.
3. **Clasificar el estatus de cada claim**: `declarado_verificable` (hay cómo
   comprobarlo: registro público, membresía consultable), `declarado_por_validar`
   (solo su palabra) o `inconsistente` (choca con otra evidencia del material).
4. **Salida**: tabla claim → cita → implicaciones → ruta → estatus → pregunta
   sugerida. Los claims con implicación de severidad alta van primero.

## Reglas no negociables
- Un claim JAMÁS se toma como capacidad verificada: su estatus nato es
  "declarado por el lead, por validar".
- Ningún claim capturado se queda sin interrogar — la lección e-AWB: capturar
  sin interrogar es casi tan ciego como no capturar.
- Las implicaciones regulatorias no se dictaminan aquí: se ENRUTAN al
  regulatory-scan (que tiene el fail-safe y las fuentes); este skill no opina
  de marcos, los detecta.
- Un claim inconsistente es un hallazgo de primera clase (y un tema sensible
  para el brief, con tacto).

## Contrato de evidencia (heredado por toda la familia)
- Toda afirmación es `hecho | hipotesis | recomendacion`; hecho sin evidencia → degradado.
- Procedencia visible (`observado | inferido | mock`) y fuente por ítem.
- Fallo declarado, nunca oculto. Retroalimentación a conocimiento solo en modo `PROPOSED`.

## Estado de implementación en la fábrica
- **Implementado (parcial)** en meeting-copilot: los claims se capturan con cita
  (bloque sitio) y alimentan el dictamen regulatorio
  (`pipeline.ts::conceptosRegulatorios` deriva conceptos de claims — el fix
  e-AWB). El interrogatorio completo (paso 2 con las 3 rutas y la tabla del
  paso 4) es hoy **manual** con este skill; candidato natural a bloque nuevo o
  a prompt del analizador si el dogfood lo pide.
- **Uso manual**: correr pasos 1–4 sobre la compilación; entregar la tabla y
  pasar las filas regulatorias/técnicas a sus skills.
