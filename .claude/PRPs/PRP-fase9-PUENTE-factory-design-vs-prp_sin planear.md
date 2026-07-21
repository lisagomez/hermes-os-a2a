# Puente de reconciliacion — A2A Factory (Claude Design) ↔ PRP Frontend Hermes OS A2A

> **Proposito:** enlazar las dos ramas que evolucionaron en paralelo: (a) el sistema de diseno
> "A2A Factory" exportado de Claude Design (`Interfaz_Hermes_A2A_Factory.zip`) y (b) el PRP del
> frontend Web2+Web3 de este chat. **Este documento se lleva a la sesion de Claude Design** para
> que incorpore las decisiones y guardrails que no vio. Tambien alimenta el PRP (ya actualizado).
>
> Estado: recomendaciones del reconciliador. Las marcadas ⚑ requieren ratificacion del equipo.

---

## 1. Arquitectura de superficies (decision estructural)

**Son DOS superficies de un mismo sistema, no una:**

| | A2A Factory | Mission Control (PRP) |
|---|---|---|
| Rol | Cara **comercial**: marketplace/fabrica, cotizador deck-builder | Cara **operativa**: dashboard de agentes trabajando |
| Audiencia | Shopper humano + shopper A2A (prospectos/clientes) | Operador/dueno del sistema |
| Que muestra | **Capacidad prometida** (specs de producto) | **Desempeno verificado** (datos reales, fuente citada) |
| Web3 | Punto de contrato del shopper A2A (manifest + RPC + settlement) → toca T3 | T1 ship read-only; T2 cableado; T3 gate humano |
| Relacion con el plan del Consejo | ES la "vitrina de venta del white-label" (Etapa 3) | El runtime cuya trazabilidad la vitrina exhibe |

Consecuencia: ninguna absorbe a la otra. Comparten **tokens, diccionario y guardrails**; difieren
en registro (ludico vs tecnico) y en que datos pueden mostrar.

## 2. Paleta ⚑ (requiere ratificacion — Neural Nexus fue votada por el equipo)

Dos candidatas de la misma familia (violeta + rosa sobre casi-negro):

| Rol | Neural Nexus (votada) | Factory (evolucion Design) |
|---|---|---|
| Fondo | `#121214` | `#0B0A10` |
| Violeta | `#7C3AED` | `#9F7BFF` (+ deep `#4B23D6`, core `#5B34E8`, lilac `#B9A6FF`) |
| Rosa/magenta | `#EC4899` | `#FF4D8D` (+ soft/pale/deep) |
| Texto | `#E5E7EB` | `#EDEAF4` (+ escala text-1..dim) |

**Recomendacion:** ratificar UNA como paleta de marca. Opinion tecnica: la de Factory esta mas
desarrollada (escalas de superficie, texto, rareza, energia, semantica) y es superset conceptual de
Neural Nexus; adoptar Factory como "Neural Nexus v2" seria la ruta de menor friccion — pero la
votacion del equipo manda. **Mientras se ratifica:** ambas superficies consumen tokens con los
MISMOS NOMBRES (`--bg`, `--accent`, `--accent-alt`, `--text-1`...); cambiar de paleta = editar
`tokens/colors.css`, cero refactor.

## 3. Diccionario unificado (un concepto, dos registros)

| Concepto canonico | Registro Factory (ludico) | Registro operativo (tecnico) | Fuente del dato |
|---|---|---|---|
| Tier de autonomia | Energia ⚡ / Rareza | Nivel (1-3) | Definicion de producto (spec) |
| Capacidad prometida | Stats AUT/VEL/INT | — (no existe en ops) | Spec de producto — **hard-code legitimo** |
| Desempeno verificado | — (no existe en venta) | Tareas aprobadas, gasto auditado, historial on-chain | Supervisor + `token_usage` + cadena — **jamas hard-code** |
| Accion pasiva | Habilidad (sin costo ⚡) | Habilidad (sin gas, no dispara gate) | — |
| Accion que mueve valor | "Invocar" (cotiza/contrata) | Ataque (T3, gate humano) | — |
| Honestidad de limites | (pendiente en Factory) | Fortaleza / Debilidad | Historial real o "en construccion" |
| Identidad | Codigo `LEG-014` + orbe | Codigo + identidad on-chain (T2) | Read-model → ERC-6551 cuando viva |

**Regla que resuelve el conflicto de stats:** AUT/VEL/INT en Factory = *specs de la carta en su
empaque* (promesa de producto, hard-code aceptable, como los stats impresos de una carta Pokemon).
La reputacion operativa = *desempeno ganado* (solo datos reales). Nunca usar la misma forma visual
para ambas sin etiqueta: en Factory rotular "specs"; en ops rotular "verificado".

## 4. Guardrails que Claude Design DEBE incorporar (no los vio)

1. **Reputacion nunca inventada** en superficie operativa. Nada de "98%" ni stats de relleno
   presentados como historial. Dia-1 = metricas proxy reales (tareas aprobadas, gasto auditado) +
   "historial on-chain: en construccion, X de N hitos" (progresion, no vacio).
2. **No reemplazar el login humano por wallet-only.** SIWE solo en la superficie agentica y para
   autorizar sesiones (T3). El auth humano existente (Fase 4) se conserva.
3. **Badge "verificado on-chain" solo cuando la fuente on-chain este viva.** No anunciar
   DID/ERC-6551 certificado en T1.
4. **La cadena no se fija por diseno.** Decision bloqueante aparte (default recomendado: Base,
   checklist de 6 dependencias en el PRP §7). Ni "Polygon" ni ninguna otra heredada de maquetas.
5. **El shopper A2A con settlement (fiat/USDC) toca T3:** cualquier flujo donde el agente comprador
   contrata/paga pasa por el gate (sesiones ERC-4337: umbral + ventana). El diseno de ese flujo debe
   mostrar el gate, no esconderlo.
6. **Linea Habilidad/Ataque = linea T1/T3.** No inventar tercera categoria.

## 5. Que se adopta del trabajo de Factory hacia el PRP (para no repetir)

- **Sistema de tokens completo** (`tokens/`): estructura de superficies, escalas de texto,
  radios, efectos. El PRP lo referencia como base; Mission Control lo consume.
- **Componentes core reutilizables:** Badge, StatBar, EnergyChip, Tabs, Button, PillToggle,
  KpiCard, TerminalWindow. La A2A Card operativa se construye COMO variante del `AgentCard` de
  Factory (mismo esqueleto, distinto contenido segun §3), no desde cero.
- **Tipografia:** Space Grotesk (display/UI) + JetBrains Mono (datos, hashes, comandos). Mono
  siempre para numeros, txHash y metadatos — encaja perfecto con la verificabilidad del PRP.
- **Direccion CLI-first y comentarios-como-disclaimer** (`// simulado — en desarrollo se enlaza…`):
  patron util para marcar en la UI lo que es T2 (cableado pero apagado).
- **Bordes punteados = "simulado/por definir":** adoptado como convencion para features T2 detras
  de flag.

## 6. Que le falta a Factory (backlog para la sesion de Design)

1. Variante operativa del `AgentCard` (contenido de la card del PRP §5: SOUL.md, Habilidad/Ataque
   con gate visible, Fortaleza/Debilidad, reputacion verificable, link a explorador). Referencia:
   mockup ya generado en este chat.
2. Micro-estados de tx (Enviada=pulso violeta / Pendiente=linea magenta parpadeante /
   Confirmada=brillo estatico) como componentes del sistema.
3. Medidor de gas/presupuesto con alerta de recarga.
4. Flujo del gate humano (autorizar sesion: umbral + ventana) — la pieza T3 mas importante.
   **RESUELTO: spec completa en §8 de este documento.** A Design le queda implementarla con los
   componentes del sistema.
5. Estado "wallet desconectada / red incorrecta / sin fondos" (superficie agentica).
6. Fortaleza/Debilidad en la card de Factory (honestidad tambien vende: diferencia vs competencia).

## 7. Pendientes de decision del equipo ⚑

1. Paleta unica: Neural Nexus vs Factory (§2).
2. Nombre comercial (el readme de Factory lo deja abierto; el repo ya es "Hermes OS · A2A" — ¿la
   cara comercial es "A2A Factory" como marca separada o se unifica?).
3. Cadena/L2 (PRP §7, default Base).
4. Ratificar el mapeo del diccionario (§3), en especial que Energia⚡ = Nivel.

## 8. SPEC — Flujo del gate humano (autorizacion de sesion de agente, T3)

> Diseno aprobado en sesion de planeacion (mockup interactivo de referencia generado en el chat
> fuente de este documento). Mecanismo tecnico: ERC-4337 con session keys; Safe como cuenta
> pagadora. Corresponde a las tareas C3 (interfaz) y G1 (implementacion, Diamante) del PRP.

### 8.1 Principios no negociables

1. **Consentimiento de 5 preguntas.** La pantalla de autorizacion muestra simultaneamente: QUIEN
   (agente + codigo + motivo declarado), QUE (alcance: lista explicita de acciones permitidas),
   CUANTO (umbral de gasto), CUANTO TIEMPO (ventana), DONDE (cuenta pagadora + cadena). Si falta
   una, no hay ceremonia valida.
2. **Default deny visible.** El alcance muestra tambien lo denegado ("todo lo demas: denegado",
   chip punteado). Se aprueban acciones especificas, nunca "que el agente opere".
3. **Nada pre-marcado, sin "aprobar todo", sin sesiones infinitas.** El humano ajusta umbral y
   ventana activamente; no acepta defaults generosos. Ventanas ofrecidas: 4h / 24h / 72h (72h es
   el techo de UI; mas requiere justificacion fuera de banda).
4. **La advertencia dice la verdad incomoda**, en la propia pantalla: "dentro de este umbral y
   ventana el agente opera solo, sin volver a preguntar; fuera de eso, todo se deniega". Es el
   nucleo del consentimiento, no letra pequena.
5. **Revocar siempre a un toque.** Mientras la sesion vive, el boton de revocacion es permanente y
   visible en la card de sesion activa. Corte inmediato, registrado on-chain.
6. **Renovar = nueva ceremonia.** Jamas auto-renovacion (una sesion que se auto-renueva es una
   sesion infinita disfrazada).
7. **Rastro verificable.** Toda sesion deja sessionKey + txHash enlazados al explorador.

### 8.2 Estados del ciclo de vida (4 salidas, colores distintos)

| Estado | Color | Semantica | Comportamiento |
|---|---|---|---|
| Sesion activa | verde | operando dentro de limites | Muestra gasto consumido vs umbral (barra) + countdown de ventana + boton Revocar |
| Expirada | gris neutro | salida esperada por tiempo | Agente vuelve a modo denegado; renovar = nueva ceremonia |
| Umbral agotado | ambar | gasto llego al tope ANTES de expirar | Se detiene aunque quede tiempo; el ambar invita a revisar que paso antes de renovar |
| Revocada | rojo | corte manual del humano | Inmediato, registrado on-chain |

**Expirada ≠ agotada es deliberado:** el humano razona distinto ante cada una y la UI debe
diferenciarlas (neutral vs. senal de revision).

### 8.3 Anatomia de la pantalla de autorizacion

1. Header: avatar/orbe del agente + "{CODIGO} solicita una sesion" + motivo declarado en 1 linea.
2. Alcance: chips de acciones permitidas (check) + chip punteado de denegacion global.
3. Controles: slider de umbral (con moneda explicita, ej. USDC) + selector de ventana (4/24/72h).
4. Cuenta pagadora: direccion resumida del Safe + cadena, en mono.
5. Advertencia ambar (principio 4).
6. Acciones: "Denegar" (secundario) / "Autorizar sesion firmada" (primario). El primario nombra la
   consecuencia (firma), no un generico "Aceptar".

### 8.4 Anatomia de la card de sesion activa

Gasto "X de Y {moneda}" + barra de consumo + "Expira en Hh Mm" + boton Revocar en rojo suave.
El patron es el mismo del medidor de gas del agente: la autorizacion es combustible que se agota
a la vista.

### 8.5 Fuera de alcance de esta spec

- La implementacion criptografica (session keys, validacion en el Safe) es G1 del PRP (Diamante,
  debate adversarial obligatorio, gate humano para encender).
- Notificaciones push/Telegram al expirar/agotarse: definir en la etapa de implementacion.
