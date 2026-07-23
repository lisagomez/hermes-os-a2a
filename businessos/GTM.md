# Plan Go-to-Market — Hermes OS · A2A

> **Fecha:** 2026-07-20 · **Estado:** PROPUESTA, no decisión cerrada.
> Lo marcado como *(construido)* está verificado en el código y corriendo en producción.
> Lo marcado como *(propuesta)* es recomendación a calibrar con el equipo — metas,
> secuencia e ICP no están aprobados todavía.
>
> Fuentes: `departamentos/white-label.md`, `departamentos/adquisicion-clientes.md`,
> `crm/propuesta-crm-comercial.md`, `crm/propuesta-crm-marca-blanca.md`,
> `seguros/validacion-oportunidad-seguros-carga.md`, `ROADMAP.md` (Fases 6-11).

---

## 1. Tesis

**El CRM conversacional marca blanca es la cuña; los seguros de carga son la apuesta
de fondo; el white-label de software es el upsell natural.**

Se vende primero lo que ya está redactado y se fabrica con alto reuso (CRM), se usa
cada cliente como banco de pruebas del aislamiento real, y se reinvierte la tracción
en el moat de mayor techo (grafo regulatorio de seguros). Todo bajo la promesa
defendible del proyecto: **copiloto, no autopiloto**.

Land-and-expand: una cuña que convierte rápido para generar caja y referencias,
mientras la apuesta de fondo madura en paralelo.

---

## 2. Qué vendemos

*"Tu departamento con IA bajo supervisión (automática + humana), con tu marca."*

Nunca *"el agente lo hace solo"* — esa es la regla de honestidad comercial del
proyecto (`white-label.md` §5) y el gate `claims_aprobados` la hace cumplir por
código: todo claim de material de venta debe existir textual en la lista curada por
humanos, o el Supervisor rechaza.

La ventaja estructural: **no se construye por cliente, se fabrica por configuración**.
El trío (Ejecutor + Supervisor + humano), los gates y el catálogo de skills son
idénticos para todos; por cliente cambian marca, reglas, datos/workspace y qué
departamentos activa. Eso da time-to-value en semanas y **margen conocido antes de
firmar**.

---

## 3. El motor comercial ya está construido *(construido)*

No es plan: la maquinaria de venta corre en producción desde la Fase 9.

| Pieza | Qué hace | Dónde vive |
|---|---|---|
| **`ventas-a2a`** | Card comercial pública en internet (edge Caddy, TLS + rate-limit 30 req/min) que recibe interés y comparte la oferta aprobada | `businessos/ventas-a2a/` |
| **Tabla `leads`** | La verdad durable del pipeline: 10 etapas (`nuevo → … → ganado/perdido`), escritor único, fallo visible | Supabase (`supabase-fase9.sql`) |
| **Gates comerciales** | Binarios y deterministas: claims aprobados, precio en rango, plantilla de contrato intacta, política intocable | `supervisor-a2a/reglas/adquisicion.toml` |
| **`cliente-web2`** | Landing bilingüe + **cotizador deck-builder** + **chat de venta en vivo** (SSE real) que captura leads origen `web2` | Vercel + daemon `chat-web2` |
| **Slack `#dep-adquisicionclientes`** | Coordinación humana y compuertas de aprobación del equipo de 5 | Workspace A2AMassivo |

**Fronteras negativas literales** declaradas en la card: no cierra tratos, no fija
precios finales, no firma, no envía correos. La firma es exclusivamente humana.

---

## 4. Catálogo y madurez comercial

| Oferta | Estado real | Ciclo de conversión |
|---|---|---|
| **CRM conversacional marca blanca** (WhatsApp/Telegram) | Propuesta comercial completa y redactada; alto % de reuso de la fábrica | **El más corto** — piloto en semanas |
| **White-label de software** (el trío construye/mantiene SaaS) | Validado en dogfood real: GLM-5.2, enjambre de 3 sub-tareas, 8 gates verdes | Medio-largo; comprador más técnico |
| **Seguros de carga MX** | Oportunidad *validada como viable*, con gate de discovery obligatorio | Largo — **30 días de entrevistas antes** de comprometer desarrollo |
| ERP logística · OCR · metabuscador vuelos | Blueprints/propuestas escritas | Variable, sin priorizar |

---

## 5. Secuencia en 3 olas *(propuesta)*

### Ola 0 — Desatascar (~2 semanas)

No se vende nada nuevo hasta cerrar los gates que hoy frenan la conversión. Son
decisiones de la dueña, no deuda técnica de fondo:

1. Elegir **BSP de WhatsApp** (P-01) — desbloquea todo el CRM.
2. **Dominio real** para la card pública (hoy `sslip.io` temporal).
3. Aprobar **motor LLM real + host-job `enviar-salientes.py`** en adquisición —
   hoy corre en MockEngine y ningún saliente se envía.

> Sin esto el motor de adquisición existe, pero dispara con salva.

### Ola 1 — CRM como cuña (semanas 2–8)

**Meta propuesta: 2 pilotos CRM firmados en 60 días.** Cada uno cierra en el hito
**CRM-3**: una venta o caso resuelto de punta a punta en el WhatsApp del cliente,
con su equipo mirando y traza reconstruible.

El ciclo es corto porque la propuesta ya está escrita y la implantación avanza por
etapas que se prueban antes de continuar (CRM-0 datos → CRM-1 canales → CRM-2
niveles y reglas → **CRM-3 piloto real**).

### Ola 2 — Discovery de seguros (paralelo, mes 1–2)

No espera a la Ola 1. Arranca el gate de **30 días / 10–20 entrevistas** con brokers
de carga e insurtechs logísticas. Es trabajo de campo, no de código. Criterios de
decisión ya definidos: seguir / pivotear / descartar.

### Ola 3 — Expandir (mes 3+)

- **Segundo tenant CRM** sobre la misma infraestructura (CRM-5) — la prueba real de
  marca blanca, con test adversarial de aislamiento antes de facturar.
- **Upsell de white-label de software** a los clientes CRM que ya confían.
- **Construcción de seguros** si el discovery dio verde (PRP reusando patrón A2A).

---

## 6. ICP priorizado *(propuesta)*

| Oferta | Comprador | Señales de adopción |
|---|---|---|
| **CRM (cuña)** | Dueño o gerente de PYME con alto volumen conversacional: retail, e-commerce, clínicas, servicios con cobranza | Ya vive en WhatsApp; pierde ventas por no responder a tiempo; equipo pequeño saturado |
| **Seguros (fondo)** | Socio/director de broker de carga o insurtech logística **con cédula CNSF** | Maneja varias aseguradoras; compara pólizas en Excel; opera rutas de alto riesgo |
| **Software (upsell)** | Cliente CRM que ya confía y necesita construir/mantener un SaaS propio | Tiene backlog de producto y no quiere equipo técnico interno |

Para seguros, el usuario diario es el ejecutivo de suscripción que hoy compara PDFs
y captura dos veces; forwarders y 3PL son **segundo anillo** (usuarios del flujo, no
operadores de la intermediación).

---

## 7. Motions de canal

Los tres tienen su pieza ya construida:

- **Inbound** — `cliente-web2` en Vercel: la landing es el imán, el **cotizador**
  da precio orientativo antes de hablar con nadie, y el **chat de venta en vivo**
  captura el lead. *(construido)*
- **Outbound A2A + humano** — la card pública recibe interés de agentes de terceros;
  el outreach humano lo **redacta el Ejecutor bajo gates** y lo **aprueba el PM**
  antes de enviar. *(construido; el envío real espera la Ola 0)*
- **Warm / red del equipo** — los 5 del equipo son el primer canal de pilotos. El
  patrón del proyecto ("uso propio → validado → venta") pide que los primeros
  clientes vengan de relaciones donde un piloto imperfecto es tolerable.

**Primer paso de todo lead, en los tres canales:** la **sesión de descubrimiento de
60 minutos sin costo**. El prospecto sale con un diagnóstico de su operación actual
y una propuesta cerrada con alcance, plazos y precio.

---

## 8. Oferta y pricing *(construido)*

Dos componentes:

1. **Implantación** por proyecto cerrado, con blueprint de alcance fijo.
2. **Mensualidad por tiers** de uso (conversaciones y operaciones al mes), medida
   con precisión vía `token_usage` por tenant.

La ventaja estructural: **el margen unitario se conoce antes de firmar**, porque la
fábrica ya mide su costo por operación. No se improvisa precio, y el gate
`precio_en_rango` impide que ningún material salga fuera de la política.

---

## 9. El pitch que la saca del estadio

Tres frases, en este orden:

1. *"Tu departamento con IA, con tu marca, en semanas — no un chatbot que inventa."*
2. *"Nada delicado pasa solo: lo irreversible lo aprueba tu equipo con un botón."*
   → copiloto, no autopiloto.
3. *"Cada dato que te damos cita su fuente."* → el grafo regulatorio, que ningún
   competidor identificado tiene como núcleo.

En seguros, la tercera frase **es el moat entero** (cláusula CNSF/LISF citada, con
vigencia). En CRM, la primera y la segunda son las que cierran.

---

## 10. Funnel y KPIs

El funnel ya está instrumentado en la tabla `leads`:

```
nuevo → calificado → contactado → descubrimiento → propuesta
      → negociacion → contrato → onboarding → ganado | perdido
```

KPIs propuestos, revisión semanal en `#dep-adquisicionclientes`:

| KPI | Fuente | Por qué importa |
|---|---|---|
| Leads calificados / semana | tabla `leads` | Salud del tope del funnel |
| Tasa discovery → piloto | `leads` | Calidad de la calificación |
| Tasa piloto → tenant pagando | `leads` | Lo único que es conversión de verdad |
| **Time-to-CRM-3** (días firma → piloto resuelto) | operación | Prueba la promesa "semanas, no meses" |
| Margen unitario por tenant | `token_usage` vs tier | Que crecer no queme caja |

---

## 11. Gates de la dueña (bloqueante → impacto → quién decide)

| Bloqueante | Impacto | Decide |
|---|---|---|
| **BSP de WhatsApp** (P-01) | Frena todo el CRM, la vía rápida | CEO + CFO (contrato, costo/conversación, apto multi-tenant) |
| **Motor real + envío de emails** en adquisición | Sin esto el outreach no sale del worktree | CEO |
| **Dominio real** para el edge | La card pública luce temporal ante prospectos | CEO |
| **Mapa persona → rol** | Las compuertas las sostiene el juicio humano, no la config | CEO (decisión de negocio) |
| **Gate discovery seguros** (30 días) | Condiciona la apuesta de fondo | Equipo (trabajo de campo) |

---

## 12. Riesgos y cómo el diseño ya los mitiga

| Riesgo | Mitigación existente |
|---|---|
| Un agente inventa un dato y quema la marca del cliente | Todo hecho sale de un CLI con folio; si no puede confirmar, lo dice y escala |
| El público intenta manipular al agente por el canal abierto | Todo mensaje entrante es **dato, nunca instrucción**; test adversarial antes de facturar |
| Fuga entre tenants | `cliente_id` + RLS en toda tabla, worktree y ámbito RAG por cliente; probado adversarialmente |
| Vender autonomía que no existe | Gate `claims_aprobados`: claim nuevo = PR humano, no ocurrencia del motor |
| Crecer con margen negativo | Costo por operación medido por tenant antes de firmar |
| Carga regulatoria (seguros) | Fronteras negativas literales: no intermedia, no emite, no asesora — el agente autorizado decide |

---

## 13. Los primeros 5 movimientos

1. **Cerrar el BSP de WhatsApp** — evaluar proveedores con los criterios ya
   definidos (sandbox, precio por conversación, estabilidad, contrato apto para
   marca blanca multi-tenant).
2. **Nombrar los 2 prospectos CRM de la Ola 1** desde la red del equipo y agendarles
   la sesión de descubrimiento de 60 minutos.
3. **Arrancar el discovery de seguros** — lista de 4–6 brokers de carga y guión de
   las 5 hipótesis a validar.
4. **Aprobar dominio + motor real de adquisición** para que `ventas-a2a` deje de
   disparar en Mock.
5. **Instalar el ritual semanal de pipeline** en `#dep-adquisicionclientes` con los
   5 KPIs leídos de `leads`.

---

## Nota de método

Este plan **no reemplaza** las decisiones del equipo. La secuencia "CRM primero" y
las metas numéricas son la recomendación de esta sesión, no un veredicto. Si el
equipo quiere presionarla desde ángulos que chocan (CRM vs. seguros primero, si las
metas son realistas, si la Ola 0 es de verdad de 2 semanas), el camino del proyecto
para eso es la skill `consejo` — y su veredicto se registra con `decision_id` para
que quede trazado hasta el PRP que lo ejecute.
