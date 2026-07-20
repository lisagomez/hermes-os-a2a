# ADENDA — Metodología Web Agéntica aplicada a Hermes OS (actualiza PRP-013 y PRP-014)

> **Estado**: ADOPTADA el 2026-07-19 (fundación del departamento de Contratos Inteligentes; no modifica código)
> **Fecha**: 2026-07-19
> **Alcance**: posicionamiento estratégico + 2 extensiones concretas al roadmap
> **Fuente**: marco "Agentic Web" (Web1 read → Web2 read+write → Web3 read+write+own →
> Agentic Web read+write+own+**reason+act**) + estado del arte de protocolos 2025-2026
> (A2A, AP2, x402, ERC-8004) y taxonomía de modelos de confianza inter-agente
> (Brief/Claim/Proof/Stake/Reputation/Constraint — Hu & Rong, arXiv:2511.03434).

---

## 1. Tesis: dónde está parado el proyecto

La web agéntica agrega **Reason + Act** encima del **Own** de la Web3: agentes autónomos
que ejecutan objetivos. Hermes OS ya vive en esa intersección:

| Capa de la web agéntica | Protocolo del ecosistema | Lo que Hermes OS ya tiene |
|---|---|---|
| Comunicación | A2A (Google) | Enjambre coordinador-a2a, servicios A2A con Agent Cards |
| Descubrimiento | Agent Cards / registries | Agent Cards honestas por servicio; catálogo de agentes |
| Identidad y confianza | ERC-8004 (registros on-chain) | Identidades MSP + ABAC en Fabric (permisionado) — **hueco: registro de reputación** |
| Autorización | AP2 (mandatos firmados) | **Equivalencia directa**: spec aprobada ≈ Intent Mandate; `aprobada` en la cola ≈ Cart Mandate |
| Pagos | x402 (settlement HTTP 402 + stablecoins) | Fase 5 (Circle/USDC Agent Wallets) — **hueco: rail estándar** |
| Ejecución con consecuencias | Smart contracts + oráculos | Fábrica de SC (PRP-013) + PM/oráculo (PRP-014) |
| Gobernanza | Human-in-the-loop | Doble gate humano (cola + lifecycle Fabric) |

**Principio rector adoptado** (de la literatura): en la web agéntica *la confianza migra
de la supervisión humana al diseño del protocolo*. Hermes ya practica los dos modelos de
confianza más fuertes de la taxonomía:

- **Constraint**: techo del oráculo por certificado, política de endorsement, catálogo
  cerrado de acciones, techo de transiciones. La confianza no depende del buen
  comportamiento del agente sino de lo que el protocolo le PERMITE.
- **Proof**: hashes de evidencia on-chain, gates re-ejecutados de cero por el Supervisor,
  expediente verificable.

Lo que NO practica todavía y la metodología recomienda añadir: **Reputation** (historial
verificable de desempeño de cada agente/contraparte) — ver §3.

## 2. Regla metodológica nueva (aplica a TODOS los PRPs desde ya)

**Checklist de confianza por agente**: todo servicio A2A nuevo (y toda plantilla de SC
nueva) declara en su PRP qué modelo(s) de confianza lo sostienen y por qué bastan:

```
Confianza: [Constraint | Proof | Reputation | Stake | Brief | Claim]
Justificación: <por qué este modelo basta para el peor caso de este agente>
```

Regla de mínimos: ningún agente con acceso a acciones irreversibles puede sostenerse
solo en *Claim* (auto-proclamación) o *Brief* (credencial de terceros): necesita
*Constraint* on-chain o gate humano. El PM/oráculo del PRP-014 es el ejemplo canónico:
Constraint (techo por certificado) + Proof (hashes) + gate humano.

**Vocabulario AP2 adoptado**: en documentación y contratos con clientes, los dos gates
humanos se describen como mandatos — "Mandato de Intención" (la spec confirmada: qué
puede hacer la fábrica/el agente y bajo qué condiciones) y "Mandato de Ejecución" (la
aprobación en la cola: autorización explícita para ESTE artefacto/acción concreta).
Alinea el producto con el estándar que Google/PayPal empujan, sin cambiar una línea de
código: ya funcionaba así.

## 3. Extensión al roadmap A: Registro de Identidad y Reputación de Agentes
**(nueva plantilla del catálogo de la fábrica — espejo permisionado de ERC-8004)**

ERC-8004 estandariza tres registros on-chain para agentes: Identidad (metadata y
endpoints), Reputación (desempeño histórico y feedback) y Validación (verificación de
terceros para tareas de alto riesgo). Hermes construye el equivalente **permisionado en
Fabric** como plantilla `registro-agentes-v1`:

- **Identidad**: hash de la Agent Card + endpoint + organización MSP responsable.
- **Reputación**: por cada tarea concretada, el veredicto del Supervisor y el resultado
  del gate humano se registran como feedback firmado (¡el dato YA existe en `tareas` y
  `sc_incidentes`! — solo se ancla on-chain su hash).
- **Validación**: para contratos de alto valor, terceros (árbitros, auditores) firman
  validaciones.

Doble uso:
1. **Interno**: el Coordinador consulta reputación antes de asignar sub-tareas; el PM
   consulta reputación de contrapartes (¿este vendedor ha incumplido antes?) al armar
   expedientes.
2. **Producto**: carta nueva del catálogo — "registro de agentes/proveedores confiables"
   para consorcios (cadena de suministro, marketplaces B2B). Mismo pipeline de fábrica:
   spec → gates → aprobación → lifecycle.

Entra al blueprint como plantilla #2 del catálogo (después de escrow-v2), con su propio
README de auditoría.

## 4. Extensión al roadmap B: liquidación x402 para el escrow
**(actualiza la Fase 5 del roadmap general y el PRP-014)**

x402 es hoy el rail de settlement con más tracción del ecosistema agéntico (V2 dic-2025;
Stripe sobre Base feb-2026; Cloudflare lo soporta; facilita pagos stablecoin nativos de
HTTP sin relación previa entre las partes). Integración propuesta, mínima y por capas:

- El escrow de Fabric sigue siendo la **verdad del acuerdo** (estados, evidencia, regla
  por defecto). x402/USDC es la **capa de movimiento de dinero**: `Fondear` y
  `liberar_pago`/`reembolsar` disparan (vía el PM, DENTRO de su techo... no: vía la
  PARTE correspondiente o un host-job aprobado) la instrucción de settlement x402, y el
  tx-hash del settlement se registra en el escrow como evidencia (`registrar_evidencia`).
- Regla de oro intacta: el agente que ve el mundo no mueve dinero. El settlement lo
  firma la wallet de la parte (Circle Agent Wallets con mandato AP2) o un host-job tras
  `aprobada` — nunca el PM.
- **Gotcha de seguridad documentado en la literatura** (ataques a x402, arXiv:2605.11781):
  la capa de descubrimiento es atacable (Sybil flooding, manipulación de metadatos que
  sesga a los agentes hacia endpoints maliciosos ANTES de pagar; el facilitador off-chain
  no es verificable por protocolo). Mitigación Hermes: allowlist de endpoints de pago por
  spec (el endpoint de settlement es DATO de la spec aprobada, no algo que el agente
  descubre en runtime), y verificación del settlement por tx-hash on-chain, no por
  palabra del facilitador.

## 5. Qué NO adoptamos (y por qué)

- **Stake económico como modelo de confianza** para agentes internos: innecesario en un
  entorno permisionado con Constraint fuerte; complejidad sin retorno por ahora.
- **Descubrimiento abierto de agentes de pago en runtime** (estilo Bazaar): superficie de
  ataque documentada; en Hermes el descubrimiento de contrapartes de pago es estático y
  aprobado por spec.
- **Registro público en Ethereum L2 (ERC-8004 literal)**: se evalúa DESPUÉS de que el
  registro permisionado opere; un puente Fabric↔L2 sería su propio PRP con su propia
  auditoría.

## 6. Cambios puntuales a los PRPs existentes

- **PRP-013 → Por Qué**: añadir fila — "La web agéntica necesita contratos que agentes y
  humanos puedan firmar con confianza de protocolo (Constraint+Proof); la fábrica produce
  exactamente esa infraestructura".
- **PRP-013 → Contexto**: catálogo objetivo v2: `escrow-v2`, `registro-agentes-v1`.
- **PRP-014 → Criterios de Éxito**: añadir — "el settlement de dinero referencia SIEMPRE
  un endpoint declarado en la spec (allowlist), jamás descubierto en runtime; el tx-hash
  del settlement queda como evidencia on-chain".
- **PRP-014 → Contexto/spec v2**: campo nuevo `liquidacion: {rail: x402|manual, endpoint,
  moneda}` validado en `contrato_sc.py` (endpoint obligatorio si rail=x402).
- **Catálogo comercial**: la narrativa de venta se actualiza — no vendemos "smart
  contracts", vendemos **infraestructura de confianza para la web agéntica**: contratos
  operados donde humanos Y agentes pueden transaccionar con garantías de protocolo.

---

*Adenda pendiente de aprobación. Referencias: Hu & Rong (arXiv:2511.03434, modelos de
confianza inter-agente); ataques a x402 (arXiv:2605.11781); ERC-8004 (EF/MetaMask/
Google/Coinbase, mainnet ene-2026); AP2 (Google/PayPal, mandatos firmados); x402
(Coinbase/Cloudflare Foundation).*
