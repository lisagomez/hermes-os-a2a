---
name: fase9-adquisicion
description: Fase 9 — departamento de Adquisicion de Clientes agentico (vende el white-label); nucleo VIVO en runtime Hetzner 2026-07-10; motor real/envios = gates de la dueña
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

**RUNTIME CERRADO (2026-07-10):**
1. `supabase-fase9.sql` aplicado en prod via management API (HTTP 201); `leads`
   verificada por MCP read-only (RLS on, sin alertas nuevas en advisors).
2. rsync + rebuild supervisor/ejecutor + `--profile a2a up -d ventas-a2a` en
   Hetzner: los 3 healthy. **Gotcha real**: el Dockerfile del supervisor NO
   copiaba `chequeos_adquisicion.py` → crash-loop ModuleNotFoundError; los 219
   tests de dev no lo cazan (corren desde el directorio fuente). Regla: modulo
   python nuevo en un servicio = su COPY en el Dockerfile es parte de la
   definicion de terminado (hermano del gotcha "compose es parte del terminado").
3. Smoke runtime tiers 1-4 TODO en verde dentro de hermes-net: card+opacidad de
   los 5 servicios, grafo-a2a con fuentes+disclaimer, trio con rechazo honesto
   (gates npm reales), y tier 4: lead `persistido=true` + fila real en `leads`
   de prod (verificada por SQL). `ss -tlnp`: 4000-4400 SOLO en 127.0.0.1.
4. Nucleo commiteado en `2f217dc`; el cierre de runtime (Dockerfile fix + docs)
   en el commit siguiente.

**Gates de la dueña (nada corre solo):** motor LLM real para tareas
adquisicion; host-job `enviar-salientes.py` (email real + autenticidad);
negociacion A2A externa (politica de limites + auth + legal); card en internet;
canal `#dep-adquisicion` en Slack.

**Gotcha de diseño aprendido:** al componer registries entre modulos python
(CHEQUEOS base + adquisicion), el import bidireccional truena segun el orden;
la solucion robusta es unidireccional (el modulo nuevo importa del viejo y se
registra al importarse) con el consumidor (executor.py) importando ambos.
