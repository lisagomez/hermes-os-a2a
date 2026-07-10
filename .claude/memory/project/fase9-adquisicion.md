---
name: fase9-adquisicion
description: Fase 9 — departamento de Adquisicion de Clientes agentico (vende el white-label); nucleo construido en dev 2026-07-10, runtime en Hetzner PENDIENTE
metadata:
  type: project
---

**Decisiones de Elisa (2026-07-10, antes de construir):** (1) el departamento
vende el **white-label** ([[fase6-departamentos]], `white-label.md`) — no
proyectos sueltos; (2) negociacion con humanos hoy, PERO **card A2A publica de
ventas desde el dia 1** (negociacion A2A autonoma = gate futuro); (3) primer
tramo con MockEngine cero tokens; motor real/envios = gates de la dueña.

**Lo construido (todo en dev, 2026-07-10):**
- **Contrato**: `DEPARTAMENTOS = ("software", "adquisicion")`;
  `validar_resultado` gana campo `departamento` (default "software",
  retrocompatible) para que el Supervisor rutee. Ejecutor lo propaga (1 linea).
- **Supervisor multi-departamento**: `gates.cargar_configs(path)` acepta
  directorio (todos los `reglas/*.toml`, indexados por su campo `departamento`)
  o archivo suelto (legado). `SUPERVISOR_REGLAS` default ahora es el DIRECTORIO.
  Departamento sin reglas cargadas = task `failed` "error de despliegue", no un
  veredicto. TOML invalido = no arranca (invariante intacta).
- **Chequeos comerciales** en `supervisor-a2a/chequeos_adquisicion.py`
  (modulo aparte; se REGISTRA en `gates.CHEQUEOS` al importarse — executor.py
  lo importa; import unidireccional chequeos→gates, evita el ciclo). La clave
  del diseño: la referencia de verdad vive VERSIONADA en el repo objetivo bajo
  `adquisicion/` (claims-aprobados.txt, politica-precios.json,
  plantillas/contrato-whitelabel.md) y el gate `politica_intocable` impide que
  el motor la toque (si no, reescribiria los claims para auto-aprobarse).
  Gates: claims_aprobados (linea `CLAIM:` textual en la lista),
  precio_en_rango ([min,max] del json), plantilla_contrato_intacta (fullmatch
  regex con `{{campo}}` como grupos de captura; campos vacios tambien fallan),
  salientes_con_aprobacion (aprobaciones/<ruta>.json con rol PM|CEO|CFO +
  sha256 del contenido ACTUAL), politica_intocable, sin_secretos (reusado).
  **Limite honesto documentado**: sha256 = INTEGRIDAD, no AUTENTICIDAD; la
  autenticidad la verificara el host-job de envio contra Supabase (futuro).
- **`ventas-a2a` (:4400)**: puente determinista sin LLM (patron grafo-a2a).
  Card con fronteras negativas LITERALES ("no cierro tratos, no fijo precios
  finales, no firmo, no envio correos") — testeadas. `oferta.py` = oferta
  APROBADA estatica (mismos claims/rango que los assets; cambiar = mismo PR).
  `leads.py` = escritor unico de `leads` origen 'a2a' con **fallo VISIBLE**
  (decision D6, inversa a estado.py): Supabase configurado + INSERT falla →
  LeadsError → task failed reintentable; sin env → `persistido: false` honesto.
- **Tabla `leads`** (`supabase-fase9.sql`, NO aplicado aun): 10 etapas
  (nuevo→...→ganado|perdido), origen check a2a|manual|slack, RLS sin politicas.
- **Compose**: servicio en profile `a2a`, 127.0.0.1:4400 (nunca 0.0.0.0).
  Smoke runtime extendido (tier 4: card + fronteras + lead con persistido=true).
- **Spec completa**: `businessos/departamentos/adquisicion-clientes.md`
  (pipeline 10 etapas con dueño por etapa, roles, comunicacion, honestidad
  comercial, contratos white-label con validacion del grafo dimension
  contractual + firma SOLO humana, dogfood).

**Tests: 219 verdes** en 6 servicios (trio-contrato 39, supervisor 61 con
dogfood integral aprobado/rechazado, ejecutor 35, coordinador 53, grafo-a2a 17,
ventas-a2a 14). Cero tokens.

**PENDIENTE (runtime, en orden):**
1. Aplicar `supabase-fase9.sql` en Supabase (management API si el MCP esta
   read-only, patron de siempre: UA curl/8.0).
2. rsync de businessos/ (supervisor-a2a, ejecutor-a2a, trio-contrato,
   ventas-a2a, compose, smoke) al server + `docker compose build` supervisor/
   ejecutor + `--profile a2a up -d ventas-a2a` + restart supervisor (carga el
   directorio de reglas con 2 TOMLs).
3. Smoke tier 4 en hermes-net; `ss -tlnp` confirma 4400 solo localhost.
4. Commitear todo (sigue sin commit).

**Gates de la dueña (nada corre solo):** motor LLM real para tareas
adquisicion; host-job `enviar-salientes.py` (email real + autenticidad);
negociacion A2A externa (politica de limites + auth + legal); card en internet;
canal `#dep-adquisicion` en Slack.

**Gotcha de diseño aprendido:** al componer registries entre modulos python
(CHEQUEOS base + adquisicion), el import bidireccional truena segun el orden;
la solucion robusta es unidireccional (el modulo nuevo importa del viejo y se
registra al importarse) con el consumidor (executor.py) importando ambos.
