# PROGRESS — buzon-a2a (HERALDO-6)   (branch: feat/buzon-a2a | últ. checkpoint: 2026-08-02)

## Objetivo / contexto
- Implementar `SPEC-buzon-a2a.md` (raíz del repo; copia byte a byte de
  `C:\Users\gomez\Downloads\SPEC-buzon-a2a.md`, sha256 2199ea2d…): gestor de correo
  institucional operado por agentes.
  Orden de implementación: SPEC §5.2. Frontend: SPEC §6. Nada se aplica a prod (SQL solo validado
  en Postgres efímero); todo va por PR.

## En curso — §11 (spec actualizada 2026-08-02: asistente de configuración del cliente)
- [ ] §11 asistente de onboarding
  - Last checkpoint: SQL de onboarding validado (4 candados rechazan de verdad) +
    onboarding.py con las 2 reglas de política y control de reversión superado (97 tests)
  - Next action: recibir el asistente de UI del agente → verificar sus gates → commit

## Estado operativo (2026-08-02, fin de sesión)

**EN MODO ESPEJO Y CORRIENDO SOLO** — `atencion@digifixapp.com` desde 2026-08-03T00:14Z.
- Google Workspace conectado (OAuth por buzón; el token NO puede leer otro buzón del
  dominio, verificado por control positivo en dev y desde Hetzner)
- `buzon-jobs.sh` en cron cada 15 min (min 3,18,33,48): ingesta + redacción
- Primera corrida real: 17 entrantes, 2 borradores en `pendiente_aprobacion` con los
  **11 gates en verde**, 15 remitentes automáticos saltados
- **No sale ningún correo**: el envío exige `estado='activo'` + firma + mínimo de espejo
- Decisión firmada en `gobernanza/registro-decisiones-riesgo-buzon.md`

**Cuatro bugs que solo destapó correr el ciclo de verdad** (ninguno lo vieron los 102
tests ni los dry-runs):
1. `AdaptadorGmail` con token estático → los de Gmail caducan en 1h (PR #218)
2. Nadie orquestaba la redacción: la cadena se paraba en `correos_entrantes` (PR #219)
3. `captar_leads` no se leía → 7 leads basura de direcciones noreply (PR #220, borrados)
4. `enviados_ultima_hora` mandaba SQL a PostgREST → HTTP 400 (PR #220)
5. La leyenda de divulgación salía vacía: el compose fija la var vacía y
   `os.environ.get(k, default)` no aplica el default si la clave existe (PR #221).
   **Lo cazó el gate `divulgacion_presente`**, que es exactamente su trabajo.


**Primer buzón dado de alta y configurado** — `atencion@digifixapp.com` (Google Workspace):
- modo `abierto_cuarentena`, plantilla `soporte`, allowlist `digifixapp.com`
- `clases_permitidas = ["acuse_recibo"]` — el agente solo puede acusar recibo; cualquier
  otra clase la rechaza el executor ANTES de redactar
- `captar_leads = false` (buzón de soporte: crear un lead por consulta ensuciaría el embudo)
- `estado = 'borrador'`, `activo = false` → **no puede enviar nada todavía**
- Decisión firmada en `gobernanza/registro-decisiones-riesgo-buzon.md` (PR #216), como exige
  su propia regla al ampliar `clases_permitidas`
- Bitácora con 2 entradas encadenadas y verificadas (cambio de modo + clase): la cadena de
  hash funciona en producción

**Autenticación de correo del dominio, completa** (`digifixapp.com`, DNS en Cloudflare):
- SPF ya existía (`~all`)
- **DMARC en `p=none`** — observación DELIBERADA. La spec pide `p=reject`, pero lo pide para
  un SUBdominio de envío nuevo ("no hay flujo legado que romper"); en el apex, que mueve el
  correo real del negocio, `reject` tumbaría en silencio a cualquier emisor legítimo no
  alineado. Se endurece cuando los informes lo respalden.
- **DKIM 2048 bits, selector `google`, autenticado y verificado por Google**
- Pendiente: crear el buzón `dmarc@digifixapp.com` que recibe los informes agregados

**Gotcha pagado**: la clave DKIM se transcribió desde una CAPTURA y una `l` minúscula se leyó
como `I` mayúscula. La clave resultante pasó todas las validaciones estructurales (RSA 2048
válido) pero era OTRA clave, y solo lo detectó Google al verificar. **Nada criptográfico se
transcribe desde imágenes**: se pide el texto.

## Pendiente (queda para la dueña / despliegue)
- [x] **DESPLEGADO EN HETZNER (2026-08-02)** — repo del servidor a master (venía 16 commits
      atrás); canario generado en el .env (con respaldo, nunca impreso); `buzon-a2a` construido
      y `Up (healthy)` con /health y agent-card. Y se corrigió una DERIVA: la imagen viva del
      supervisor conocía 4 departamentos y no tenía chequeos_buzon (una tarea del depto `buzon`
      habría sido rechazada) → reconstruido con el trío OCIOSO; ahora 5 departamentos, 12 gates
      del buzón, cero faltantes, sano y sin crash-loop. Los 17 contenedores siguen arriba.
- [x] **MIGRACIONES APLICADAS A PRODUCCIÓN (2026-08-02)** — las tres, por management API.
      Verificación previa: cero colisiones de tablas, ninguna función/vista con mis nombres,
      y el constraint vivo de `leads` coincidía con lo que la migración esperaba (los 3 leads
      reales usan orígenes que siguen permitidos → el swap no podía rechazar datos).
      Verificación posterior: 8 tablas con RLS+FORCE, `leads` ya acepta `correo`, los 3 leads
      intactos, y los CUATRO candados rechazando EN PRODUCCIÓN (abierto sin firma, activo sin
      firma, espejo sin fecha, origen inventado) + la bitácora append-only probada dentro de
      una transacción revertida (no persistió nada: 0 filas). Advisors: 8 alertas nuevas, todas
      INFO `rls_enabled_no_policy` = el diseño buscado; ninguna WARN/ERROR.
      Estado: 0 buzones dados de alta. El servicio está vivo pero INERTE, como corresponde.
- [x] **Build y ARRANQUE REAL verificados en LAS DOS imágenes (2026-08-02)** — el daemon de
      Docker local quedó accesible y se cerró el gate de imagen de verdad, no por simulación:
      · `buzon-a2a`: imagen construye · `Up (healthy)` · `/health` 200 · agent-card con la
        skill `mail` · **JSON-RPC de punta a punta** con payload canónico generado por el SDK
        (crea la tarea, la ejecuta, falla visiblemente sin Supabase) · **opacidad sobre el
        servicio VIVO**: /docs /openapi.json /redoc /correos /buzones /gates → 404
      · `supervisor-a2a` (su Dockerfile cambió): imagen construye · politicas.py,
        chequeos_buzon.py y reglas/buzon.toml PRESENTES en /app · los 5 departamentos cargan
        DENTRO del contenedor con 48 gates activos y cero chequeos faltantes · arranca
        `Up (healthy)` sin rejuvenecer (no hay crash-loop) y con el log limpio
      Contenedores e imágenes de prueba borrados al terminar.
- [ ] Deploy a Hetzner (12 contenedores de producción vivos; la rama no está mergeada —
      hacer checkout en ~/repo movería el árbol que el trío monta para sus worktrees)
- [ ] Activar el primer buzón (modo cerrado) — exige firma en el registro de riesgo
- [ ] Registrar ingerir-entrantes.py en cron: DECISIÓN DE LA DUEÑA (mismo gate que
      enviar-salientes.py); el agente no lo auto-registra
- [ ] Firmar los 3 documentos de gobernanza (§7.3)
- [ ] Smoke e2e con correo real (§8, tras activar)

## Completado
- [x] Rama feat/buzon-a2a creada; SPEC copiada de `C:\Users\gomez\Downloads\` (vía /mnt/c)
      a `SPEC-buzon-a2a.md` en la raíz del repo, verificada idéntica por sha256 (2026-08-02)
- [x] 1. supabase-buzon.sql — 5 tablas + vista; VALIDADO en Postgres 18 efímero: 2 corridas
      idempotentes, trigger append-only rechaza UPDATE, constraint buzones_abierto_firmado
      rechaza modo abierto sin firma, RLS enable+FORCE en las 5 (2026-08-02)
- [x] 6. supabase-buzon-leads.sql — origen 'correo'; validado en la cadena real
      crm0→fase12→buzon-leads x2: acepta 'correo', rechaza inventados (2026-08-02)
- [x] 2. ingerir-entrantes.py — 3 adaptadores (IMAP/Graph/Gmail), saneado, hash de evidencia,
      lead origen 'correo' ignore-duplicates, bitácora encadenada, dry-run por defecto
- [x] 3. buzon-a2a/ — politicas.py (11 gates puros), saneado.py, correos.py, redactor.py
      (motor pluggable determinista), card/app/executor, Dockerfile, requirements
- [x] 4. chequeos_buzon.py — ADAPTADOR que vendora politicas.py (una sola implementación);
      reglas/buzon.toml (12 gates activos + 2 de modelo inactivos); COPY en Dockerfile del
      supervisor + import en su executor, MISMO cambio (gotcha 2026-07-10)
- [x] 5. enviar-salientes.py — gates 3 y 4 SOLO para rutas 'buzon/<id>'; gates 1-2 intactos
      y EG.CRM sin cambio de comportamiento
- [x] 7. Compose — buzon-a2a perfil a2a, 127.0.0.1:4900, hermes-net; `config --services` lo resuelve
- [x] 8. Frontend meeting-copilot — 5 vistas (/buzon, [hilo], aprobaciones, politicas, bitacora)
      + /api/buzon/salud + 16ª herramienta en el launcher; máquina de estados con guardas de
      actor; mock-first como agenda. typecheck+lint+build limpios, 219/219 tests (verificado
      por mí, no solo reportado)
- [x] 9. Corpus de inyecciones: 62 casos, 10 familias, 0 escapes contra el saneador real
- [x] HUECO DE SEGURIDAD ENCONTRADO Y CERRADO: texto del mismo color que el fondo (blanco
      sobre blanco) sobrevivía al saneado. Lo destapó el corpus, no los tests. Fix en
      saneado.py (_oculto_por_color, normaliza #fff/white/rgb()), test con control de
      reversión (rojo sin el fix) y 2 casos nuevos de corpus (inj-061/062)
- [x] 10. Gobernanza §7.3 — los 3 documentos en businessos/gobernanza/ (política de correo
      agéntico, registro de decisiones de riesgo, procedimiento de incidente de inyección);
      BORRADORES sin firmar a propósito: la firma es de la dueña/SGSI
- [x] Tests dev: 80 verdes en buzon-a2a; 84 en supervisor; 219 en meeting-copilot
      (test_procesos del supervisor sigue bloqueado por pyyaml ausente del venv —
      PREEXISTENTE, verificado con stash)
- [x] Gate de imagen (parcial): sin acceso al daemon de Docker en esta máquina, se simuló el
      APLANADO de ambas imágenes copiando exactamente lo que declara cada COPY y verificando
      que los imports resuelven y que los 5 departamentos del supervisor cargan con sus 48
      gates activos sin chequeos faltantes. Caza el gotcha 2026-07-10/2026-07-23; NO sustituye
      al build real, que queda pendiente

## Deuda declarada
- La política de §11 (modo espejo no saltable, relajamiento progresivo) tiene DOS
  implementaciones: `buzon-a2a/onboarding.py` (autoridad, con tests de límites) y su
  espejo en TS del frontend mock-first. Es duplicación consciente y con fecha de
  vencimiento: cuando el daemon :4900 quede cableado, la UI llamará a `/api/buzon/*`
  y la copia TS muere. Mientras tanto, las constantes son contrato de la SPEC §11 y
  cambiar una exige cambiar la spec. (No se resolvió como con `politicas.py` —vendorar
  el módulo— porque cruza lenguajes, no servicios.)

## Decisiones (append-only)
- 2026-08-02 §11 llegó como adición pura a la spec (401 líneas, secciones 0-10 sin
  cambios) → lo ya construido y verificado sigue válido; §11 se suma, no rehace : sesión L0
- 2026-08-02 eje_dei del activo = `desarrollo` (verificado contra activos/CATALOGO.md;
  capitalizable sujeto a política auditada, y cumple `vendible ⇒ eje ≠ operacion`) : sesión L0
- 2026-08-02 El costo de CONSTRUCCIÓN tampoco está instrumentado en token_usage (esta
  sesión no es del trío, no hay task_id) → la ficha ACT tiene dos tramos externos, no
  uno; se anotó en su addendum. La opción C (re-derivar) ya no aplica al código : sesión L0
- 2026-08-02 El 1er arranque real destapó un fallo que 97 tests no vieron: sin Supabase
  configurado, las LECTURAS no comprobaban `activo` y morían con "UnsupportedProtocol"
  (error interno de httpx). Un error debe nombrar su causa → guarda en `_req` + test de
  regresión. Solo se ve arrancando el servicio de verdad : sesión L0
- 2026-08-02 La prueba de arranque se hizo en LOCAL, no en Hetzner: el servidor tiene 12
  contenedores de producción vivos y la rama no está mergeada. Copiar la rama allí para
  probar arriesgaba el árbol que el trío monta. Mismo gate cerrado, sin exposición : sesión L0
- 2026-08-02 La spec ES el plan aprobado (goal del usuario); no se re-litiga el diseño : sesión L0
- 2026-08-02 No se aplica NADA a Supabase prod ni se despliega; entrega = PR verificado : doctrina repo
