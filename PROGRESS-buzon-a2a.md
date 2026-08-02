# PROGRESS — buzon-a2a (HERALDO-6)   (branch: feat/buzon-a2a | últ. checkpoint: 2026-08-02)

## Objetivo / contexto
- Implementar `businessos/SPEC-buzon-a2a.md`: gestor de correo institucional operado por agentes.
  Orden de implementación: SPEC §5.2. Frontend: SPEC §6. Nada se aplica a prod (SQL solo validado
  en Postgres efímero); todo va por PR.

## En curso
- [ ] Commit + PR
  - Last checkpoint: TODO implementado y verificado; corpus 62 casos / 0 escapes
  - Next action: commit por capas → push → PR (NUNCA push directo a master)

## Pendiente (queda para la dueña / despliegue)
- [ ] Aplicar supabase-buzon.sql y supabase-buzon-leads.sql a producción (management API)
- [ ] Build real de las imágenes (buzon-a2a y supervisor) — esta máquina no tiene acceso
      al daemon de Docker; se hizo la simulación del aplanado en su lugar (ver abajo)
- [ ] Activar el primer buzón (modo cerrado) — exige firma en el registro de riesgo
- [ ] Registrar ingerir-entrantes.py en cron: DECISIÓN DE LA DUEÑA (mismo gate que
      enviar-salientes.py); el agente no lo auto-registra
- [ ] Firmar los 3 documentos de gobernanza (§7.3)
- [ ] Smoke e2e con correo real (§8, tras activar)

## Completado
- [x] Rama feat/buzon-a2a creada; SPEC copiada a businessos/SPEC-buzon-a2a.md (2026-08-02)
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

## Decisiones (append-only)
- 2026-08-02 La spec ES el plan aprobado (goal del usuario); no se re-litiga el diseño : sesión L0
- 2026-08-02 No se aplica NADA a Supabase prod ni se despliega; entrega = PR verificado : doctrina repo
