# Departamento: Adquisición de Clientes (paquete de competencias)

> Segundo departamento del trío (ver `SPEC-trio.md` y `desarrollo-software.md`).
> Un departamento = **(1) tareas del Ejecutor + (2) reglas de validación del
> Supervisor + (3) fuentes de conocimiento**. Añadir un departamento = definir
> este paquete, no desplegar agentes nuevos — con UNA excepción deliberada:
> este departamento suma un servicio A2A hermano (`ventas-a2a`, la puerta
> comercial pública), porque recibir interés de terceros es una capacidad
> hacia AFUERA que ningún servicio existente tenía.
>
> **Qué vende:** el white-label (`white-label.md`) — "su departamento de
> software con IA bajo supervisión, con su marca". Adquisición cierra el
> ciclo: encuentra al cliente al que Desarrollo de Software le entrega.

---

## 1. Pipeline end-to-end (la etapa vive en la tabla `leads`)

```
nuevo → calificado → contactado → descubrimiento → propuesta
      → negociacion → contrato → onboarding → ganado | perdido
```

| Etapa | Artefacto verificable | Quién la avanza |
|-------|----------------------|-----------------|
| `nuevo` | fila en `leads` (lead_id, origen, contacto) | `ventas-a2a` (origen a2a) o humano (manual) |
| `calificado` | nota de calificación en `datos` (encaja/no encaja con la oferta) | humano (PM) |
| `contactado` | primer correo en `salientes/` CON aprobación registrada | redacta el Ejecutor, aprueba PM/CEO, envía host-job (futuro) |
| `descubrimiento` | minuta/necesidades en el workspace del lead | humano (PM) con apoyo del Ejecutor |
| `propuesta` | `propuesta-<lead>.json` + material, gates verdes | Ejecutor redacta → Supervisor gatea → PM/CEO aprueba |
| `negociacion` | versiones de propuesta; TODO término dentro de `politica-precios.json` | humano negocia; el Ejecutor solo redacta variantes que pasen gates |
| `contrato` | `contratos/<lead>.md` (plantilla intacta) + validación del grafo + aprobación | Ejecutor rellena → Supervisor gatea → grafo valida → PM/CEO aprueba → **firma SOLO humano** |
| `onboarding` | repo/workspace/reglas del cliente montados (white-label.md §2-3) | Developer + CEO (config de departamentos) |
| `ganado`/`perdido` | fila cerrada con motivo en `datos` | humano |

**Regla transversal:** Slack/A2A NO son el sistema de registro — la verdad
durable del pipeline vive en Supabase `leads` (mismo principio que `tareas`).

---

## 2. Roles (agentes y humanos)

| Rol | Qué hace | Qué NO hace |
|-----|----------|-------------|
| **ventas-a2a** (puerto 4400) | Expone la Agent Card comercial pública; registra interés (leads origen `a2a`); comparte la oferta APROBADA (`oferta.py`, estática y versionada) | No cierra tratos, no fija precios finales, no firma, no envía correos, no genera contenido |
| **Ejecutor** (motor mock hoy) | Redacta material de venta, propuestas y borradores de contrato EN WORKTREE AISLADO, como cualquier tarea del trío (`departamento: "adquisicion"`) | No decide a quién contactar, no envía nada, no se auto-aprueba |
| **Supervisor** | Re-corre los gates comerciales (`reglas/adquisicion.toml`) sobre el worktree | No redacta, no negocia; gate no corrible = rechazo |
| **Hermes-Negocio** | Orquesta: arma tareas con criterios, reintenta con tope, reporta el pipeline en digests | No toca credenciales; lee `leads` vía snapshot del host |
| **PM / CEO** (humanos) | Aprueban TODO lo de cara al cliente: correos, propuestas, contratos (matriz de `equipo-y-slack.md`) | — |
| **CFO** (humano) | Aprueba todo lo que mueva dinero (precio final, descuentos fuera de política) | — |
| **CEO** (humano) | Único que cambia la política comercial (`adquisicion/`) y las reglas del departamento | — |
| **Firma de contrato** | **SOLO humano** — igual que en Fase 3 (grafo valida, humano firma) | — |

---

## 3. Comunicación

- **Card A2A pública** (`ventas-a2a:4400/.well-known/agent-card.json`): la
  puerta para que agentes de terceros descubran la oferta. HOY solo vive en
  `hermes-net` + túnel SSH; exponerla a internet (dominio/TLS/rate limiting)
  es un gate de la dueña. La card declara sus fronteras negativas LITERALES.
- **`#dep-adquisicion` en Slack** (mismo patrón additivo que `#dep-legal`):
  el equipo comenta leads y aprueba por ahí, pero la verdad vive en `leads`.
- **Email saliente**: NO existe todavía. Todo correo redactado muere en
  `salientes/` del worktree hasta que (a) tenga aprobación registrada
  (gate `salientes_con_aprobacion`) y (b) exista el host-job `enviar-salientes.py`
  que verifique la AUTENTICIDAD de esa aprobación contra Supabase antes de
  enviar — fase posterior con gate de la dueña.
- **Negociación A2A autónoma** (agente de tercero negociando términos):
  FUTURO explícito. Requiere política de límites firmada + auth real en la
  card + revisión legal. Hoy `ventas-a2a` solo RECIBE interés.

---

## 4. Contenido y honestidad comercial

Todo material de venta (archivos `material/*.md`, `salientes/*.md`) marca sus
afirmaciones verificables con líneas `CLAIM: <texto>`. El gate
`claims_aprobados` exige que cada claim exista TEXTUAL en
`adquisicion/claims-aprobados.txt` — la lista curada por humanos, derivada de
`white-label.md` §5: **nunca** se vende "el agente lo hace solo"; siempre
"departamento con supervisión automática y humana". Un claim nuevo = PR humano
a la lista (gate CEO), no una ocurrencia del motor.

La oferta pública que comparte `ventas-a2a` (`oferta.py`) usa EXACTAMENTE esos
claims y el rango de `politica-precios.json`; si la política cambia, la oferta
cambia en el MISMO PR.

---

## 5. Contratos white-label

1. La plantilla vive versionada: `adquisicion/plantillas/contrato-whitelabel.md`
   con campos variables `{{cliente}}`, `{{precio}}`, etc.
2. El Ejecutor SOLO rellena campos: el gate `plantilla_contrato_intacta` hace
   fullmatch del borrador contra la plantilla (los `{{campos}}` son grupos de
   captura); cualquier cláusula añadida/quitada/reescrita = rechazo con
   evidencia.
3. El borrador que pasa gates se valida con el **grafo** (dimensión
   `contractual`, ya existe desde Fase 3: `validar-contratos.py`, tabla
   `contratos`) — banderas con fuente citada.
4. Aprobación PM/CEO (y CFO si el precio sale de lo estándar).
5. **La firma es exclusivamente humana.** Ningún agente firma nada, nunca.

---

## 6. Reglas de validación del Supervisor (gates binarios en dominio comercial)

El reto: en software el gate es `npm run build`; aquí hay que fabricar
verificabilidad. La solución: la **referencia de verdad vive versionada en el
repo objetivo bajo `adquisicion/`** y el motor no puede tocarla. Cada gate
sigue siendo (chequeo real → criterio binario → evidencia):

| Gate | Chequeo binario | Referencia ausente |
|------|-----------------|--------------------|
| `claims_aprobados` | toda línea `CLAIM:` en material cambiado existe textual en `claims-aprobados.txt` | `no_ejecutable` → rechazo |
| `precio_en_rango` | todo precio en `propuesta*.json`/`oferta*.json` dentro de [min,max] de `politica-precios.json` | `no_ejecutable` → rechazo |
| `plantilla_contrato_intacta` | `contratos/*.md` calza EXACTO con la plantilla salvo `{{campos}}` (y los campos van rellenos) | `no_ejecutable` → rechazo |
| `salientes_con_aprobacion` | todo cambio bajo `salientes/` tiene `aprobaciones/<ruta>.json` con `{aprobado_por ∈ PM\|CEO\|CFO, fecha, sha256}` y el sha256 recalculado coincide | — |
| `politica_intocable` | NINGÚN archivo cambiado bajo `adquisicion/` (cierra el hueco de que el motor reescriba la política para pasar los otros gates) | — |
| `sin_secretos` | compartido con software | — |
| `tono_de_marca`, `revision_comercial` | runner `modelo`: DECLARADOS, inactivos hasta tener runner real (activarlos sin runner = config inválida, no arranca) | — |

**Límite honesto (integridad vs autenticidad):** `salientes_con_aprobacion`
garantiza que el documento NO cambió después de aprobarse (sha256), no que la
aprobación la registró de verdad un PM/CEO. La autenticidad se verifica en la
frontera de ENVÍO (el host-job futuro consulta el registro de aprobaciones en
Supabase, escrito solo por humanos vía Slack/panel). En el tramo actual no hay
envíos, así que el hueco no es explotable.

Config: `supervisor-a2a/reglas/adquisicion.toml` (el Supervisor carga TODOS los
`reglas/*.toml` y rutea por el campo `departamento` del RESULTADO — Fase 9).

---

## 7. Fuentes de conocimiento

- **`adquisicion/` del repo objetivo** — claims, política de precios, plantilla
  (la verdad comercial versionada).
- **`white-label.md`** — qué se vende y la honestidad comercial (§5).
- **La tabla `leads`** — el estado real del pipeline (vía snapshot para Hermes).
- **El grafo** (dimensión `contractual`) — validación de cláusulas con fuente.
- **RAG por ámbito del prospecto** — FUTURO (mismo pendiente que software).

### 7.1 Paquete de competencias EG.CRM (7 skills, `negocio/skills/adquisicion-*/`)

Los Activos Digitales del pipeline comercial (método diio, CC BY-SA 4.0),
versionados en el repo como fuente de verdad. El documento madre del pipeline
(7 hitos, canales de captación, panel de habilitación, modelo de datos y KPIs
por canal) es `crm/egcrm-pipeline-propuesta.md` (v1.0, borrador para revisión
de la dueña — sus puntos `(sugerido)` siguen abiertos en su §9). Mapa
hito → skill:

| Hito EG.CRM | Skill | Activo Digital |
|-------------|-------|----------------|
| 2 — se agenda la 1ª llamada | `adquisicion-pre-descubrimiento` | Ficha de Inteligencia (fuentes públicas, `observado`/`hipótesis`) |
| 3 — descubrimiento | `adquisicion-entrevista-dinamica` | Guía de entrevista personalizada desde la ficha |
| 3 — descubrimiento | `adquisicion-transcripcion` | Transcripción STT diarizada (puente determinista, cero LLM) |
| 3 — post-entrevista | `adquisicion-diagnostico-factibilidad` | Evaluación de Factibilidad (FODA, regulatorio vía grafo) |
| 3 — post-entrevista (interno) | `adquisicion-coaching-asesor` | Coaching del asesor (rúbrica 7 dimensiones; nunca al cliente) |
| 5 — tras consenso Factible+Prioritario (Hito 4 = votación humana) | `adquisicion-analisis-profundo` | Informe de Análisis (costo-beneficio, contingencias) |
| 6 — propuesta | `adquisicion-paquete-comercial` | Propuesta + Cotización + Contrato DNA (envío = gate humano) |

**Estado:** versionadas en el repo, NO desplegadas al volumen de
Hermes-Negocio (una rutina documentada no es una rutina aplicada: desplegarlas
antes de que existan sus insumos —motor real de `adquisicion`, puente STT—
haría confabular al bot). El despliegue al volumen es parte del gate de la
dueña de §9.

---

## 8. Recorrido de escritorio (dogfood): "propuesta para el lead ACME"

Cero tokens (MockEngine), igual que el dogfood de software:

1. Llega interés por A2A → `ventas-a2a` registra `lead-…` etapa `nuevo` y
   devuelve la oferta pública. *(verificable: fila en `leads` + artifact)*
2. Hermes arma TAREA `departamento: "adquisicion"`, objetivo "propuesta para
   ACME", criterios de aceptación explícitos.
3. El Ejecutor (mock) escribe en su worktree `propuesta-acme.json` (precio en
   rango) y `material/pitch.md` (claims de la lista).
4. El Supervisor corre los gates comerciales → **aprobado** con evidencia.
   Variante: claim inventado o precio fuera de rango → **rechazado** con
   hallazgo y archivo.
5. Hermes propone a PM/CEO; el humano aprueba (registro de aprobación) — y ahí
   muere el tramo actual: no hay envío hasta el host-job con gate de la dueña.

---

## 9. Qué NO existe todavía (y qué gate lo desbloquea)

| Fuera de alcance hoy | Gate de la dueña |
|----------------------|------------------|
| Motor LLM real redactando propuestas/outreach | activar `EJECUTOR_ENGINE=claude` para tareas `adquisicion` (los gates ya están vivos; presupuesto en `token_usage`) |
| Envío real de emails | aprobar host-job `enviar-salientes.py` (autenticidad de aprobación) + dominio/remitente |
| Negociación A2A externa autónoma | política de límites firmada + auth en la card + revisión legal |
| Card en internet (0.0.0.0/TLS) | dominio + rate limiting; hoy solo hermes-net + túnel SSH |
| Cobro (Polar producción) | ya definido en Fase 3 |
| Puente STT (`adquisicion-transcripcion`) — servicio {card, rpc, /health} | elegir motor STT + construir el servicio (patrón grafo-a2a); el skill ya define el contrato |
| Skills EG.CRM activas en el volumen de Hermes-Negocio (§7.1) | motor real `adquisicion` + sync explícito repo→volumen |

---

## 10. Cómo añadir el siguiente departamento

Igual que siempre: definir las 3 listas + su `reglas/<dep>.toml` (el Supervisor
ya es multi-departamento) + añadir el nombre a `DEPARTAMENTOS` en
`trio-contrato/contrato.py`. Solo hace falta un servicio A2A nuevo si el
departamento necesita una capacidad hacia afuera que ninguno tenga (como aquí
la puerta comercial).
