# SPEC — `buzon-a2a` · Gestor de correo institucional operado por agentes

> Carta comercial: **HERALDO-6** · Servicio: `buzon-a2a` (:4900) · Nivel SDD: **L3 + gobernanza L4**
> Estado: propuesta. Cierra Fase 1 del pipeline SDD; Fases 2 y 4 pendientes.

---

## 0. Decisiones de nomenclatura

### 0.1 La carta (capa producto — `cliente-web2` / A2A Factory)

La convención observada en la vitrina es: nombre evocador en español + número
opcional, categoría funcional, rareza, tres stats (AUT/VEL/INT), costo en
energía y una línea con humor seco.

```
HERALDO-6
Categoría : Correo / Correspondencia institucional
Rareza    : LEGENDARIA
Energía   : ⚡ 4
Stats     : AUT 5 · VEL 7 · INT 9
Tagline   : "Contesta cada correo como si tu abogado estuviera leyendo.
             Porque sí lo está."
```

**AUT 5 es deliberadamente bajo y es argumento de venta, no debilidad.** Es la
única carta del mazo cuya autonomía está topada por diseño: nada sale sin firma
humana. En la ficha de la carta ese número debe llevar asterisco explicativo
—"autonomía acotada por política de aprobación (ISO/IEC 42001, supervisión
humana)"— porque un prospecto corporativo compra precisamente eso.

Por qué **HERALDO** y no otra cosa:
- `CORREO-1` / `BUZÓN-1` son descriptivos planos; rompen el registro mitológico
  de `ORÁCULO`, `CUSTODIO`, `TESORO`, `MUSA-3`.
- `MENSAJERO` colisiona semánticamente con Hermes (el mensajero) y confundiría
  la marca del OS con una carta del catálogo.
- `HERALDO` conserva el registro, es inequívoco en español y connota
  *anuncio oficial en nombre de alguien* — exactamente lo que hace.
- El `-6` sigue el patrón de sufijo numérico arbitrario ya usado (`VENDO-1`,
  `FLUJO-7`, `MUSA-3`, `EMPATÍA-2`).

Skill declarada en el manifest del endpoint simulado: agregar `"mail"` al array
`skills` de `/.well-known/agent-card.json`.

### 0.2 El servicio (capa runtime — compose)

| Aspecto | Valor | Convención de origen |
|---|---|---|
| Nombre | `buzon-a2a` | `ventas-a2a`, `grafo-a2a`, `transcripcion-a2a`, `pm-a2a` |
| Puerto | `127.0.0.1:4900` | siguiente libre tras `transcripcion-a2a` :4800 |
| Perfil compose | `a2a` | igual que `ventas-a2a` |
| Superficie | `{card, rpc, /health}` | patrón `grafo-a2a` |
| Red | `hermes-net` | todos |
| Exposición pública | **ninguna** | solo el `edge` publica 443 |

Servicios auxiliares (host-jobs, fuera del contenedor del agente):

- `ingerir-entrantes.py` — host-job con credenciales, trae correo y lo sanea.
- `enviar-salientes.py` — **ya existe**, se extiende. Única salida SMTP/API.

### 0.3 La herramienta (capa UI — `meeting-copilot`)

Entrada nueva en el launcher: **Buzón** (pasa de 15 a 16 herramientas).
Slug de ruta: `/buzon`. Icono sugerido: sobre con candado.

---

## 1. Cierre de Fase 1 (SDD)

Respuestas del usuario integradas:

```
A5 (aprobador humano) : OBLIGATORIO en el camino crítico. No opcional.
Contrapartes          : CONFIGURABLE por el cliente, por buzón (§4).
Nivel de riesgo       : L3 + módulo de gobernanza IA de L4.
```

Actores finales:

| ID | Actor | Credenciales | Puede enviar |
|---|---|---|---|
| A1 | Humano externo | ninguna | n/a — no confiable |
| A2 | Agente lector (cuarentena) | **ninguna** | no |
| A3 | Agente redactor (privilegiado) | ninguna de correo | no |
| A4 | `enviar-salientes.py` | SMTP / Graph / Gmail | **sí, única** |
| A5 | Aprobador humano | sesión Supabase autenticada | firma, no envía |
| A6 | Guardian | admin | pausa global |

**Invariante fundacional del diseño:** ningún componente que ejecuta un modelo
tiene credenciales de envío. A4 corre en el host, lee filas `aprobada` y no
acepta instrucciones de nadie. Es el mismo patrón inverso ya usado para
`facturas` e `ingest-token-usage`.

---

## 2. Arquitectura de flujo

### 2.1 Entrada

```
Proveedor (M365 Graph / Gmail API / IMAP)
   │
   ▼  [host-job ingerir-entrantes.py — CON credenciales]
   ├─ verifica alineación DMARC del remitente
   ├─ aplana HTML → texto, elimina display:none, blancos, ancho cero
   ├─ normaliza Unicode (NFKC + strip U+200B/FEFF/E0000-E007F)
   ├─ trunca hilo citado (solo el mensaje nuevo)
   ├─ separa adjuntos a Storage, NO al contexto
   ├─ hash sha256 del cuerpo original (evidencia inmutable)
   ▼
tabla correos_entrantes  ← escritor único, origen 'buzon'
   │
   ▼  [buzon-a2a :4900 — SIN credenciales de correo]
   ├─ A2 lector en cuarentena → salida tipada, referencias simbólicas
   ├─ A3 redactor privilegiado → borrador sobre estructura, no texto crudo
   ▼
tabla correos_salientes (estado: borrador)
```

### 2.2 Aprobación y salida

```
correos_salientes (borrador)
   │
   ▼  [meeting-copilot /buzon/aprobaciones — sesión autenticada]
   ├─ A5 revisa: original saneado | borrador | destinatarios | política aplicada
   ├─ firma → INSERT en aprobaciones_salientes (sha256 del borrador exacto)
   ▼
   [host-job enviar-salientes.py — YA EXISTE]
   ├─ gate 1: integridad sha256 (¿el borrador cambió tras la firma? → RECHAZO)
   ├─ gate 2: autenticidad (¿existe fila de aprobación? el motor no puede
   │          fabricarla, no tiene credenciales → RECHAZO)
   ├─ gate 3 NUEVO: destinatarios ⊆ participantes del hilo (§3)
   ├─ gate 4 NUEVO: cuota por buzón/hora + pausa global del Guardian
   ▼
Envío real (ENVIAR_REAL=1) + bitácora append-only
```

**Lo único que se construye nuevo son los gates 3 y 4.** Los gates 1 y 2 ya
están escritos y probados.

---

## 3. Gates deterministas nuevos (motor de políticas)

Formato `[[gate]]` de `supervisor-a2a/reglas/`, módulo `chequeos_buzon.py`
registrado en `gates.CHEQUEOS` vía adaptador (patrón
`chequeos_adquisicion` / `fabric`).

| Gate | Regla | Violación |
|---|---|---|
| `destinatarios_del_hilo` | `To ∪ Cc ⊆ participantes(hilo)` salvo aprobación explícita marcada | CRÍTICA |
| `sin_bcc` | `Bcc = ∅` siempre | CRÍTICA |
| `sin_reenvio` | ningún saliente puede tener cuerpo derivado de otro hilo | CRÍTICA |
| `adjuntos_de_catalogo` | adjuntos solo por ID de catálogo aprobado, nunca ruta generada | CRÍTICA |
| `urls_de_dominio` | enlaces solo a dominios institucionales listados | ALTA |
| `sin_datos_personales_cruzados` | el borrador no contiene PII presente en otros hilos | CRÍTICA |
| `divulgacion_presente` | todo saliente incluye la leyenda de agente automatizado | ALTA |
| `cuota_por_buzon` | ≤ N envíos/hora/buzón, ≤ M por hilo | ALTA |
| `canario_ausente` | el token canario de sistema NO aparece en el cuerpo | CRÍTICA |
| `auto_submitted_marcado` | cabecera `Auto-Submitted: auto-replied` en automáticos | MEDIA |
| `sin_secretos` | reusa el chequeo base existente | CRÍTICA |

Cualquier gate CRÍTICO en rojo → el borrador ni siquiera llega a la bandeja de
A5. Fallo visible, nunca best-effort silencioso.

---

## 4. Política de contrapartes — configurable por el cliente

**Sí, va como selector en la UI, y por buzón, no por organización.** La
granularidad por organización sería incorrecta: `ventas@` necesita recibir leads
desconocidos, mientras que `reclutamiento@` maneja CVs con datos personales.

### 4.1 Los tres modos

```
○ CERRADO — solo contrapartes conocidas
  Solo se procesan correos de direcciones/dominios en la allowlist.
  Desconocidos → carpeta de revisión humana, cero procesamiento por agente.
  Uso típico: asesor_humano@, legal@, finanzas@

◉ ABIERTO CON CUARENTENA  ← recomendado por defecto
  Cualquiera puede escribir. Los desconocidos operan con restricciones duras:
    · siempre A5 obligatorio, sin excepción por clase de correo
    · sin adjuntos salientes
    · sin datos de la organización más allá del catálogo público aprobado
    · máximo 2 intercambios antes de escalar a humano nombrado
  El primer mensaje crea un lead automáticamente.
  Uso típico: ventas@, contacto@, reclutamiento@

○ ABIERTO — sin restricciones adicionales
  Requiere firma de aceptación de riesgo del responsable del SGSI.
  Se registra quién lo activó, cuándo y con qué justificación.
  No recomendado para ningún buzón que reciba datos personales.
```

### 4.2 Captación de leads (respuesta directa a tu caso)

En modo `abierto_con_cuarentena`, el primer mensaje de un remitente desconocido
dispara el mismo puente que ya construiste para WhatsApp:

```sql
-- extiende supabase-fase12-leads-crm.sql (que hoy tiene 6 orígenes)
ALTER TABLE leads DROP CONSTRAINT leads_origen_check;
ALTER TABLE leads ADD CONSTRAINT leads_origen_check
  CHECK (origen IN ('a2a','manual','web2','crm','copilot','...','correo'));
```

Insert ignore-duplicates que **jamás pisa la etapa del funnel**, escritor único
origen `correo`, con `canal='email'` y la dirección en el campo de contacto.
Idéntico contrato que `crm-canales/leads.py`. Mission Control lo muestra en la
misma tabla, con el canal nuevo.

### 4.3 Persistencia

```sql
CREATE TABLE buzones (
  id              uuid PRIMARY KEY,
  tenant_id       uuid NOT NULL,
  direccion       text NOT NULL,        -- ventas@miempresa.com
  proveedor       text NOT NULL,        -- 'm365' | 'google' | 'imap'
  modo_contraparte text NOT NULL
    CHECK (modo_contraparte IN ('cerrado','abierto_cuarentena','abierto')),
  clases_permitidas jsonb NOT NULL,     -- qué puede redactar el agente
  aprobador_rol   text NOT NULL,        -- A5 responsable
  activo          boolean NOT NULL DEFAULT false,
  riesgo_firmado_por uuid,              -- obligatorio si modo='abierto'
  riesgo_firmado_en  timestamptz,
  UNIQUE (tenant_id, direccion)
);
-- RLS FORCE, sin políticas por defecto. Multi-tenant desde día 1.
```

---

## 5. Backend — pasos de configuración

### 5.1 Adaptadores de proveedor

Interfaz única, dos implementaciones. El resto del sistema no sabe cuál corre.

```python
class ProveedorCorreo(Protocol):
    def listar_nuevos(self, buzon: str, desde: str) -> list[SobreCrudo]: ...
    def enviar(self, sobre: SobreFirmado) -> ResultadoEnvio: ...
    def marcar_leido(self, buzon: str, mensaje_id: str) -> None: ...
```

**Microsoft 365 (`AdaptadorGraph`)**

1. Registrar app en Entra ID. Permisos de **aplicación** (no delegados):
   `Mail.ReadWrite`, `Mail.Send`. Consentimiento de administrador.
2. **Crítico — `ApplicationAccessPolicy`.** Por defecto, un permiso de
   aplicación da acceso a **todos** los buzones del tenant. Restringir con:
   ```powershell
   New-ApplicationAccessPolicy -AppId <app-id> `
     -PolicyScopeGroupId grupo-buzones-agentes@miempresa.com `
     -AccessRight RestrictAccess `
     -Description "Buzones operados por agentes A2A"
   ```
   Omitir este paso es el hallazgo de auditoría más caro de esta integración.
3. Suscripción de cambios (`/subscriptions`) con notificación al host-job, o
   polling delta si prefieres no exponer webhook.
4. Secreto de cliente con caducidad ≤ 12 meses y rotación calendarizada.

**Google Workspace (`AdaptadorGmail`)**

1. Proyecto GCP, habilitar Gmail API.
2. Service account con **delegación a nivel de dominio**, restringida a los
   scopes `gmail.readonly` + `gmail.send` y a los buzones específicos.
3. Alternativa más simple si son pocos buzones: OAuth de escritorio por buzón,
   como hace el skill `google-workspace` de Hermes.
4. Watch + Pub/Sub para notificación, o polling.

**Los secretos NUNCA entran al contenedor del agente.** Van al `.env` del host
donde corren los host-jobs, mismo patrón que las llaves de GitHub que
deliberadamente no viven en el contenedor del trío.

### 5.2 Orden de implementación

```
1. supabase-buzon.sql          → buzones, correos_entrantes, correos_salientes,
                                 buzon_bitacora. RLS FORCE, sin políticas.
                                 Validar idempotente en Postgres efímero.
                                 NO aplicar a prod hasta el gate.
2. ingerir-entrantes.py        → host-job, adaptadores, saneado, hash.
                                 Dry-run por defecto.
3. buzon-a2a/                  → {card, rpc, /health}, patrón grafo-a2a.
                                 A2 cuarentena + A3 redactor. Sin credenciales.
                                 COPY de chequeos_buzon.py en el Dockerfile
                                 EN EL MISMO CAMBIO (gotcha 2026-07-10).
4. chequeos_buzon.py           → los 11 gates de §3 + adaptador a gates.CHEQUEOS
5. enviar-salientes.py         → extender con gates 3 y 4. No tocar 1 y 2.
6. Migración leads             → origen 'correo' (§4.2)
7. Compose                     → servicio en perfil a2a, 127.0.0.1:4900
8. Smoke tiers 1-4             → correo real → borrador → firma → envío
```

### 5.3 Lo que NO se hace

- No se expone `buzon-a2a` por el `edge`. Nada de esto es público.
- No se le da al agente acceso IMAP/Graph directo "para simplificar".
- No se permite que el agente cree buzones ni modifique `modo_contraparte`.
- No se usa `service_role` desde el agente. Puente `cli_fin` + `SET ROLE`.

---

## 6. Frontend — integración en `meeting-copilot`

### 6.1 Rutas nuevas

| Ruta | Contenido | Acceso |
|---|---|---|
| `/buzon` | bandeja unificada, tabs por dirección | equipo |
| `/buzon/[hilo]` | hilo completo: original saneado, borrador, gates, historial | equipo |
| `/buzon/aprobaciones` | cola de A5 — el camino crítico | rol aprobador |
| `/buzon/politicas` | selector de contrapartes, clases permitidas, cuotas | admin |
| `/buzon/bitacora` | log append-only, exportable, filtro por buzón y fecha | auditor |
| `/api/buzon/*` | proxy al daemon :4900 | server-side only |

### 6.2 Reutilización directa

No inventes patrones: ya tienes los tres que necesitas.

- **Auth**: magic link + `PANEL_ALLOWED_EMAILS` fail-closed sobre TODA ruta,
  incluidas las de API. Igual que se hizo con `/api/asesor/*` en PR #183.
- **Bandeja de aprobación**: el flujo de agendamiento (PR #191) ya tiene
  aprobar → cola idempotente → estado firmado por el notificador. La bandeja
  de correo es el mismo componente con otro payload.
- **Máquina de estados explícita**: igual que citas. Estados del hilo alineados
  al ciclo A2A — `submitted → working → input_required → completed`.

### 6.3 Lo que la pantalla de aprobación debe mostrar

Sin esto, A5 firma a ciegas y el control es teatro:

1. Correo original **saneado**, con marca visual de qué se eliminó.
2. Borrador propuesto, con diff si es una revisión.
3. Destinatarios resueltos, y de dónde salió cada uno.
4. Los 11 gates con su resultado individual.
5. Clase de correo y política aplicada.
6. Botón **Rechazar y reportar** que marca el hilo como intento de inyección
   y lo manda al corpus de regresión de §8.

### 6.4 El launcher

```ts
// registro de herramientas del shell
{
  id: 'buzon',
  nombre: 'Buzón',
  descripcion: 'Correo institucional operado por agentes',
  ruta: '/buzon',
  badge: (pendientes) => pendientes > 0 ? `${pendientes} por aprobar` : null,
  rolesRequeridos: ['equipo'],
}
```

El badge de pendientes en el sidebar es lo que hace que A5 funcione en la
práctica. Una bandeja de aprobación sin recordatorio visible se convierte en
cuello de botella en dos semanas y alguien pide desactivar el control.

---

## 7. Mapeo a ISO/IEC 42001 e ISO/IEC 27001

### 7.1 ISO/IEC 42001 — Sistema de gestión de IA

| Cláusula / Anexo A | Evidencia en este diseño |
|---|---|
| A.2 Políticas de IA | `businessos/gobernanza/` + política de correo agéntico |
| A.5 Evaluación de impacto (AIIA) | análisis de peor escenario de Fase 1 SDD |
| A.6 Ciclo de vida del sistema | pipeline SDD completo, Fases 0-7 |
| A.7 Datos para el sistema | saneado §2.1, hash de evidencia, no PII cruzada |
| A.8 Información a partes interesadas | gate `divulgacion_presente` |
| A.9 Uso responsable | A5 obligatorio, modos de contraparte, cuotas |
| A.10 Terceros | adaptadores Microsoft/Google documentados como proveedores |

**Supervisión humana** es el requisito que esta arquitectura satisface de forma
demostrable: no es una política escrita, es una fila en `aprobaciones_salientes`
que el motor no puede fabricar. Eso es lo que un auditor puede verificar.

### 7.2 ISO/IEC 27001:2022 — Anexo A

| Control | Implementación |
|---|---|
| 5.14 Transferencia de información | política de correo saliente, clases permitidas |
| 5.15 Control de acceso | allowlist fail-closed, RLS FORCE, roles por ruta |
| 5.33 Protección de registros | bitácora append-only con hash encadenado |
| 5.34 Privacidad y PII | gate `sin_datos_personales_cruzados`, LFPDPPP |
| 8.12 Prevención de fuga de datos | destinatarios del hilo, sin Bcc, sin reenvío, canario |
| 8.15 Registro de eventos | cada transición con actor, política y resultado de gates |
| 8.16 Actividades de monitoreo | detección de anomalía en secuencias de herramientas |
| 8.24 Criptografía | DKIM en el subdominio, sha256 de integridad, TLS del edge |

### 7.3 Declaración de aplicabilidad — lo que hay que escribir

Tres documentos que el auditor va a pedir y que hoy no existen:

1. **Política de correo agéntico** — qué clases puede redactar cada buzón,
   quién aprueba, qué se prohíbe categóricamente.
2. **Registro de decisiones de riesgo** — cada buzón en modo `abierto` con
   firma, fecha y justificación.
3. **Procedimiento de incidente de inyección** — qué se hace cuando el gate
   `canario_ausente` se dispara. Incluye notificación al titular de los datos
   si hubo exposición de PII.

---

## 8. Verificación (Fase 5 SDD adaptada)

| Original | Aquí |
|---|---|
| Foundry tests | pytest sobre los 11 gates |
| Echidna fuzzing | property-based testing sobre el motor de políticas |
| Halmos symbolic | ejecución exhaustiva de la máquina de estados del hilo |
| Certora | invariantes verificados como asserts en CI |
| Lean 4 | **sin cambios** — modelo abstracto de la máquina de estados |

**Corpus de inyecciones en CI.** Este es el equivalente al fuzzing y es
obligatorio: un directorio de correos con inyecciones conocidas que se corre en
cada cambio de prompt, de modelo o de skill. Sin él, cambiar de `gemini-flash-lite`
a otro modelo puede reabrir vectores cerrados y nadie se entera.

Checklist pre-activación (equivalente L3):

- [ ] 11 gates con prueba unitaria y caso negativo
- [ ] Corpus de inyecciones ≥ 50 casos, 0 escapes
- [ ] Smoke e2e: correo real → borrador → firma → envío verificado
- [ ] `ApplicationAccessPolicy` verificada (intentar leer un buzón fuera del
      grupo debe fallar — control positivo, como en la ceremonia Fabric)
- [ ] Subdominio con SPF/DKIM/DMARC `p=reject` y reportes agregados llegando
- [ ] Interruptor del Guardian probado en simulacro, no solo escrito
- [ ] Auditoría humana del mapeo política → código
- [ ] Los tres documentos de §7.3 firmados

---

## 9. Pipeline de conexión de las otras apps

El problema real: hoy `control-interno`, `cliente-web2`, `meeting-copilot`,
Mission Control y `crm-canales` descubren herramientas cada uno a su manera.
Agregar `buzon-a2a` a mano en cada superficie es deuda que se compone.

### 9.1 Registro único de herramientas

Un solo manifiesto versionado, N superficies que lo renderizan. Es el mismo
principio que ya aplicaste con `cli-manifest`.

```
businessos/herramientas-manifest.json   ← fuente de verdad, versionada
   │
   ├─→ meeting-copilot   → launcher de 16
   ├─→ control-interno   → sidebar de la cabina
   ├─→ Mission Control   → vistas de operación
   └─→ cliente-web2      → mazo de cartas (capa producto, subconjunto público)
```

Entrada del manifiesto:

```json
{
  "id": "buzon",
  "servicio": "buzon-a2a",
  "puerto": 4900,
  "card_url": "http://buzon-a2a:4900/.well-known/agent-card.json",
  "superficies": ["meeting-copilot", "control-interno"],
  "carta_publica": "HERALDO-6",
  "roles": ["equipo", "aprobador", "admin"],
  "requiere_aprobacion_humana": true
}
```

El campo `requiere_aprobacion_humana` reusa el candado que ya existe en la
build-spec del Departamento de Procesos. Una herramienta con ese flag en `true`
**no puede** registrarse en una superficie que no implemente bandeja de
aprobación. El gate es determinista y corre en CI.

### 9.2 Los cuatro pasos para conectar cualquier app nueva

```
1. DECLARAR   → entrada en herramientas-manifest.json + agent-card del servicio
2. GATEAR     → chequeos_<servicio>.py registrado en gates.CHEQUEOS
                (+ COPY en el Dockerfile del supervisor, mismo cambio)
3. EXPONER    → servicio en el compose, perfil correcto, 127.0.0.1 only.
                Público SOLO por el edge, y solo si hay razón de negocio.
4. RENDERIZAR → las superficies leen el manifiesto; cero código por superficie
```

### 9.3 Identidad compartida

Todas las superficies ya usan el mismo Supabase A2ABot con magic link y
allowlist. Extender eso a `buzon-a2a` significa que A5 se autentica una vez y su
firma es válida en toda la fábrica. No montes un segundo sistema de auth.

### 9.4 Orden sugerido

```
buzon-a2a solo, en meeting-copilot          ← empieza aquí, un buzón, modo cerrado
   ↓ 2 semanas de operación sin incidentes
segundo buzón en modo abierto_cuarentena    ← ventas@, con captación de leads
   ↓ corpus de inyecciones estable
manifiesto único + migración de las otras superficies
   ↓
carta HERALDO-6 publicada en cliente-web2   ← vender lo que ya opera, no al revés
```

Publicar la carta antes de que el servicio opere repite exactamente el error que
ya evitaste con las skills EG.CRM: *versionadas ≠ desplegadas*, para que el bot
no prometa capacidades que no existen.

---

## 10. Pendientes del pipeline SDD

Este documento cierra Fase 1 y adelanta Fases 3, 5 y 6. Faltan:

- **Fase 2** — RF/RNF/RR/SA formales. Los SA son críticos aquí: hay que
  documentar explícitamente que el motor de políticas *puede ser modificado por
  quien tenga acceso al servidor*, cosa que en la EVM no pasa. Ese supuesto no
  se puede probar, solo mitigar con control de cambios y bitácora.
- **Fase 4** — invariantes formales con su enunciado Lean 4, incluidas las 7
  propiedades P-GOV de gobernanza IA.
