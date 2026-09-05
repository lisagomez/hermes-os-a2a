# Modelo de amenazas — plantilla de PRP

> Control **C3** de `../GOBERNANZA.md`. Sección fija de todo PRP. Cinco pasos en
> miniatura: no es un documento aparte, son ~15 líneas dentro del PRP.
>
> **La pregunta que responde**: *¿quién nos ataca y qué le impide lograrlo?*
> Su hermana es la AISIA (`aisia.md`), que responde *¿a quién dañamos sin atacante?*

> ⚠️ **La fuente viva es `businessos/gobernanza/modelo-amenazas-v1.md`** (adoptado el
> 2026-07-19). Esta plantilla es el **formato** para pegar en un PRP y un catálogo de
> apoyo. Si el documento vivo y esta plantilla divergen, **manda el documento vivo** y la
> plantilla se corrige — nunca al revés.

---

## Plantilla (pegar en el PRP)

```markdown
## Modelo de amenazas

**Activos que toca**: [qué se pierde si esto se compromete, ordenado por daño]
**Fronteras que cruza**: [de dónde entra dato no confiable a esta feature]
**Atacante relevante**: [O1..O6 — ver catálogo]
**Controles**: [qué reduce el riesgo, y cuál es la brecha que queda abierta]
```

---

## Paso 1 — Activos

Ordénalos por **daño si se comprometen**, no por valor contable. Los cuatro primeros son
los de `modelo-amenazas-v1.md`; los siguientes cubren el resto del sistema.

| # | Activo | Daño si se compromete |
|---|---|---|
| **A1** | Llaves de despliegue Fabric (MSP admin, `approveformyorg`) | Chaincode arbitrario en redes de clientes — daño terminal |
| **A2** | Fondos en escrow / wallets USDC | Pérdida directa de dinero de clientes |
| **A3** | Wallet del oráculo (`rol=oraculo`) | Evidencia falsa y vencidos falsos on-chain |
| **A4** | Catálogo de plantillas auditadas | Una plantilla envenenada contamina TODO lo que la fábrica produzca |
| **A5** | `SUPABASE_SERVICE_ROLE_KEY` | `BYPASSRLS`: acceso total a todo el negocio, saltándose RLS (C7) |
| **A6** | Volúmenes `.hermes` de las verticales | `SOUL`/`AGENTS`/`MEMORY` + sesiones: cambia el comportamiento del agente en producción, y contiene la memoria del negocio |
| **A7** | Credenciales de canal (tokens de Telegram/Slack/WhatsApp, OAuth de buzón, SMTP) | Suplantación del negocio ante clientes reales |
| **A8** | Datos personales de leads y clientes (`leads`, `lead_enriquecimiento`, `transcripciones`, correo) | Daño a terceros que nunca eligieron estar aquí; LFPDPPP |
| **A9** | Seed del grafo regulatorio | Un dictamen con fuente falsa o ley abrogada es peor que no tener regla |
| **A10** | Presupuesto de tokens | Denial-of-wallet: quemar dinero sin hackear nada |
| **A11** | Skills, `CLAUDE.md`, `prp-base.md` | Cambio silencioso de comportamiento de todo lo que se produzca después (C1) |

## Paso 2 — Fronteras de confianza

**NO confiable — todo lo que cruza hacia adentro se valida (Zod / saneador, sin excepción):**

- **Los canales de chat** (Telegram, Slack, WhatsApp). Es la frontera más expuesta de este
  sistema: **entrada no autenticada hacia un agente que tiene llaves y terminal**. El
  contenido entrante es **DATO, jamás instrucción**.
- **El correo entrante** del buzón agéntico. Su saneador y su corpus de diez familias son
  el precedente correcto de esta postura.
- Entradas de usuario y de formularios públicos, siempre. Texto adversarial por defecto.
- Archivos subidos y adjuntos: falsificables, y maliciosos como archivos. Nunca entran
  crudos al contexto del modelo.
- Resultados de web/search/tools y **CSV de terceros** (el listado 69-B del SAT):
  inyección **indirecta**.
- **Las salidas del LLM.** El que se olvida: no se confían por diseño. Quien verifica
  re-ejecuta los gates de cero — es literalmente el diseño del Supervisor del trío.
- Webhooks: se verifica la firma, no la palabra del remitente.
- Dependencias (npm, pip, imágenes Docker): cadena de suministro.

**Confiable con condiciones**: la base de datos (con RLS correcta y llaves por servicio) y
**el humano aprobador** — confiable pero **falible**: la fatiga de aprobación es una
amenaza (O3), no un insulto.

**Separaciones duras que se preservan siempre**:

- Quien **ejecuta un modelo no tiene credenciales de envío** — la firma de un saliente es
  una fila que el motor no puede fabricar.
- Quien genera código no tiene llaves de producción (el Ejecutor no lleva llave de GitHub).
- **Un escritor por fila / por origen** en las tablas de estado compartidas.
- Los estados terminales, solo por humano.

## Paso 3 — Flujos

Dibuja de dónde entra el dato hasta dónde produce consecuencias, y **marca los cruces de
frontera**: ahí vive el riesgo, no en el medio.

## Paso 4 — Objetivos del atacante (catálogo)

| # | Atacante | Objetivo |
|---|---|---|
| **O1** | Usuario malicioso | **Inyección de requerimientos**: no hackea, *conversa*. Pide algo técnicamente válido pero tramposo, o intenta inyección de prompt. El sistema, fiel, lo construiría perfecto. |
| **O2** | Contraparte deshonesta | Datos o evidencia falsa que el sistema acepta como verdad. |
| **O3** | Fatiga / insider | **El sello de goma**: tras 40 verdes seguidos, el aprobador deja de leer. Estadística, no malicia. |
| **O4** | Bots y externos | Denial-of-wallet, abuso de canal, scraping de endpoints públicos. |
| **O5** | Cadena de suministro | Dependencia comprometida, imagen sin pinear, typosquatting, modelo retirado por el proveedor. |
| **O6** | Compromiso de un servicio | Un servicio con privilegio se vuelve palanca; el techo de permisos acota el daño. |

## Paso 5 — Controles

| Control | Qué exige | Brecha típica **en este repo** |
|---|---|---|
| Validación de entrada | Zod/saneador en todo input; entrada tratada como **DATOS** | Un canal nuevo se cablea sin la postura del buzón |
| Mínimo privilegio | Llave por servicio, no compartida; C7 | `service_role` heredado "porque funcionaba" |
| Monitoreo | Límites de gasto, rate-limit, kill-switch | Un best-effort que nadie loguea = fallo invisible |
| Aprobación humana | Todo lo irreversible pasa por humano; **anti-sello-de-goma** | Diffs enormes que nadie lee |
| Auditoría | Log de qué se aprobó y qué se desplegó; que sean lo mismo | Ventana entre aprobar y desplegar (G5 la cierra re-verificando hash) |
| Protección de datos | RLS + C7; gate LFPDPPP fail-closed antes de enriquecer | Tablas nuevas sin RLS: los grants default de la plataforma las exponen |
| Procedencia | Nada normativo sin fuente citable | Un mock que se declara espejo y deja de serlo |

---

## Priorización

Ataca primero **O1 y O3**: los más baratos para el atacante y los más caros de descubrir
tarde. Cuestan poco de mitigar (reglas de escalada + diseño del paquete de revisión) y son
exactamente los que un sistema agéntico expone y uno tradicional no.
