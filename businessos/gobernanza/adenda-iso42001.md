# ADENDA — ISO/IEC 42001 aplicado a Hermes OS (AIMS-ready)

> **Estado**: ADOPTADA el 2026-07-19 (fundación del departamento de Contratos Inteligentes)
> **Fecha**: 2026-07-19
> **Veredicto**: APLICABLE por partida doble — (1) Hermes ES un sistema de IA de alto
> impacto (agentes que fabrican contratos, actúan de oráculo y orbitan dinero); (2) el
> mercado objetivo (tier 2, consorcios, marca blanca) pedirá el sello.
> **Decisión recomendada**: construir "42001-ready" DESDE YA (costo marginal bajo: mucho
> ya existe); certificar DESPUÉS, cuando un cliente enterprise lo exija o se venda a
> regulados. La certificación cuesta auditoría acreditada en 2 etapas + vigilancia anual:
> gasto que hoy no retorna, mañana sí.

---

## 1. Qué exige el estándar (mapa mínimo)

- **Cláusulas 4-10** (estructura armonizada ISO): contexto, liderazgo, planificación,
  soporte, operación, evaluación del desempeño, mejora.
- **Anexo A**: 38 controles en 9 objetivos (A.2 políticas de IA, A.3 organización
  interna, A.4 recursos, A.5 evaluación de impacto, A.6 ciclo de vida, A.7 datos,
  A.8 información a interesados, A.9 uso, A.10 terceros), seleccionados y justificados
  en un **Statement of Applicability (SoA)**.
- **Certificación**: auditoría etapa 1 (documental) + etapa 2 (implementación);
  certificado 3 años, vigilancia anual.
- **Parientes útiles**: ISO/IEC 23894 (gestión de riesgo de IA — nuestro modelo de
  amenazas dialoga con él), ISO/IEC 42005 (guía de evaluación de impacto). Alineación
  natural con EU AI Act y NIST AI RMF (el trabajo se hace una vez).

## 2. Gap analysis: qué ya existe, qué es parcial, qué falta

| Requisito 42001 | Artefacto Hermes existente | Estado |
|---|---|---|
| Gestión de riesgos de IA (Cl. 6, A.5 parcial) | `modelo-amenazas-v1.md` (5 pasos, priorizado) | ✅ Existe (formalizar ciclo de revisión) |
| Supervisión humana (A.9) | Doble gate (cola + lifecycle), techo del oráculo, mandatos AP2 | ✅ Existe — fortaleza diferencial |
| Trazabilidad y logging (A.6) | Supabase (`tareas`, `contratos_sc`, `sc_incidentes`, `token_usage`) + hashes on-chain + actas | ✅ Existe |
| Ciclo de vida del sistema de IA (A.6) | Metodología PRP (spec → fases → gates → validación final) | ✅ Existe (nombrarlo como lifecycle) |
| Mejora continua (Cl. 10) | Self-Annealing ("el mismo error nunca dos veces") + aprendizajes por PRP | ✅ Existe — es literalmente la cláusula 10 |
| Gestión de incidentes (Cl. 10, A.9) | `sc_incidentes`, escalada, estados terminales por humano | 🟡 Parcial: falta proceso formal de no-conformidad y acción correctiva documentada |
| Terceros y cadena de suministro (A.10) | Pineo de imágenes/deps, gosec, catálogo cerrado, allowlist x402 | 🟡 Parcial: falta registro de proveedores de IA (Anthropic/modelos, Circle, Supabase) con evaluación |
| Gobernanza de datos (A.7) | RLS, colecciones privadas, evidencia hash-on-chain/archivo-off-chain, G6 | 🟡 Parcial: falta política de datos escrita (procedencia, retención, calidad) |
| Roles y responsabilidades (Cl. 5, A.3) | Fronteras duras entre servicios; "un escritor por fila" | 🟡 Parcial: está en código, falta en papel (quién es accountable de qué sistema de IA) |
| **Política de IA y alcance del AIMS (Cl. 4-5, A.2)** | — | ❌ Falta (documento corto: 2-3 páginas) |
| **Evaluación de impacto del sistema de IA (A.5)** | — | ❌ Falta — ver §3, es EL entregable nuevo |
| **Statement of Applicability** | — | ❌ Falta (se deriva del gap: 1 día de trabajo) |
| **Auditoría interna + revisión por dirección (Cl. 9)** | Mission Control (métricas) | ❌ Falta el rito: revisión trimestral registrada (adaptable a operación unipersonal: checklist + acta breve) |
| Competencias y registros (Cl. 7) | SOULs/AGENTS por vertical | 🟡 Parcial: documentar qué debe saber el humano aprobador (y el árbitro) |

**Lectura del gap**: ~60% construido sin buscarlo, porque los principios del repo
(verificar antes de confiar, gates, trazabilidad, escalada) SON controles 42001. Lo que
falta es mayormente papel bien hecho, no ingeniería.

## 3. El entregable nuevo: Evaluación de Impacto (AISIA) — hermana del modelo de amenazas

Distinción clave que el estándar obliga a hacer:

- `modelo-amenazas-v1.md` protege **al sistema de los atacantes**.
- La **AISIA** protege **a las personas del sistema**: individuos y sociedad afectados
  por decisiones del AI, incluso sin ningún atacante presente.

Plantilla AISIA por sistema de IA (se llena una por: fábrica de SC, PM/oráculo, vertical
clientes, y una por PLANTILLA de SC del catálogo):

```
AISIA — <sistema/plantilla>
1. Partes afectadas: quién recibe consecuencias (partes del contrato, terceros,
   no-usuarios).
2. Daños posibles SIN atacante: decisión errónea del sistema operando "bien".
   Ej. escrow-v2: vencido declarado con evidencia real pero contexto injusto
   (huelga, desastre); contrato leonino técnicamente válido; árbitro con
   expediente incompleto; parte sin acceso digital que no puede ejecutar su
   transición a tiempo.
3. Severidad × probabilidad, y reversibilidad del daño.
4. Mitigaciones: qué gate humano, qué plazo de gracia, qué vía de apelación,
   qué comunicación a la parte afectada (A.8: información a interesados).
5. Decisión: aceptar / mitigar / rediseñar / no ofrecer.
Firmada por la dueña; se revisa al cambiar la plantilla o tras un incidente.
```

Integración inmediata: `prp-base.md` gana la sección "Evaluación de impacto" junto a la
de "Modelo de amenazas" (adenda anterior). Un PRP nuevo responde ambas: ¿quién nos ataca?
y ¿a quién podemos dañar sin que nadie nos ataque?

## 4. Plan por etapas (costo honesto)

**Etapa 0 — ya hecho sin saberlo**: threat model, gates, trazabilidad, self-annealing,
mandatos. Costo: 0.

**Etapa 1 — AIMS-lite (2-3 semanas de ratos, sin auditor)**:
1. Política de IA + alcance del AIMS (2-3 páginas: qué sistemas cubre, principios —
   ya están escritos en los PRPs, es compilarlos).
2. AISIA de los 3 sistemas + plantilla escrow (con la plantilla de §3).
3. SoA inicial: los 38 controles con existe/parcial/excluido y su evidencia (la tabla
   de §2 es el 80%).
4. Rito trimestral de revisión (acta de 1 página en Mission Control).
5. Registro de proveedores de IA y política de datos breve.

**Etapa 2 — pre-certificación (cuando haya cliente que lo pida)**: auditoría interna
formal (puede ser consultor externo puntual), cerrar no-conformidades, elegir
certificadora acreditada.

**Etapa 3 — certificación**: etapas 1+2 del auditor, vigilancia anual. Se activa por
disparador comercial (tier 2 / marca blanca / cliente regulado), no por calendario.

## 5. Valor comercial inmediato (sin esperar el certificado)

Desde la Etapa 1 el pitch puede decir, con verdad: *"operamos bajo un sistema de gestión
de IA alineado a ISO/IEC 42001: supervisión humana obligatoria en toda acción
irreversible, evaluación de impacto por contrato, trazabilidad completa on-chain y
mejora continua documentada"*. Para el comprador enterprise, "alineado y auditable"
abre la puerta; el certificado la cierra. Y en marca blanca, entregar al socio el
paquete AIMS (política, AISIA, SoA) como parte del producto es diferenciador puro:
nadie más vende una fábrica de smart contracts CON su sistema de gestión de IA.

## 6. Integración con la planeación existente

- **prp-base.md**: + sección "Evaluación de impacto (AISIA)" junto a "Modelo de amenazas".
- **PRP-013**: la AISIA de cada plantilla del catálogo es requisito de la auditoría de
  Fase 2 (junto al README-auditoria: uno mira el código, la otra mira a las personas).
- **PRP-014**: la vía de apelación humana ante `declarar_vencido` (salida de la AISIA de
  escrow-v2) entra a Criterios de Éxito.
- **Modelo de amenazas**: referencia cruzada — amenazas (atacante) + impactos (sin
  atacante) = riesgo completo, que es exactamente lo que la cláusula 6 pide tratar.
- **Adenda Web Agéntica**: el checklist de confianza por agente gana la línea "AISIA:
  sí/no + fecha".

---

*Pendiente de aprobación. Primer paso si se aprueba: redactar la Política de IA (2-3
páginas) y la AISIA de escrow-v2 — el resto del AIMS-lite se deriva de documentos que
ya existen.*
