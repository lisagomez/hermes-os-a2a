---
name: despliegue-hetzner
description: Decisión (2026-07-04) — el despliegue de bajo presupuesto de BusinessOS va a Hetzner Cloud (no DigitalOcean); CX32 8GB ~€6.80/mes corre todo incl. grafo. Runbook en businessos/FASE0-hetzner.md.
metadata:
  type: project
---

**Decisión (2026-07-04):** para bajo presupuesto, el servidor de runtime va a
**Hetzner Cloud**, no DigitalOcean. Precios verificados jul-2026:

- **Hetzner CX32** (4 vCPU / 8 GB / 80 GB) ~**€6.80/mes** ← recomendado: corre las
  3 verticales + dashboard + grafo + trío A2A holgado, sin recortar límites. Cuesta
  MENOS que el plan de 4 GB de DO.
- **Hetzner CX22** (2 vCPU / 4 GB) ~**€3.79/mes** ← mínimo; ≈6× más barato que el DO
  4 GB (~$24). Con este, 1 vertical o recortar los `mem_limit` de los 3 `hermes-*`.
- Ubicación para LATAM: **Ashburn, VA (us-east)**.

**Por qué la huella cabe:** los 3 contenedores Hermes (2 GB c/u) dominan; hoy solo
personal (iris) está viva (negocio/clientes con tokens placeholder). Dashboard, grafo,
grafo-a2a, ejecutor, supervisor, grafo-db son ligeros (256 MB–1 GB de límite,
sobre-suscritos). El compose ya avisa: "Si bajas a un solo box chico, reduce estos limits".

**Ventaja técnica de Hetzner:** su **Cloud Firewall filtra a nivel de red** (fuera de la
VM) → SÍ gobierna los puertos que Docker publica, resolviendo de raíz el gotcha
"Docker se salta UFW" del FASE0. Aun así se deja UFW/fail2ban dentro (defensa en profundidad).

**Runbook:** `businessos/FASE0-hetzner.md` es un DELTA sobre `FASE0.md`: reemplaza solo
los pasos 1 (crear servidor), 2 (firewall) y las notas de costo; los pasos 0 y 3–10
(Docker, swap, .env, wizard Hermes, compose up, GitHub cron, verificación) son idénticos.

**CLI de gestión:** `hcloud-pp-cli` IMPRESO 2026-07-04 con Printing Press desde el OpenAPI
oficial de Hetzner (189 ops), Grade A 95/100, shipcheck 7/7; en `~/printing-press/library/hcloud/`
(sin publicar aún). Reemplaza el rol del CLI `digitalocean`. 5 comandos novel (burn/fits/
preflight/idle/snapshots). Es herramienta HOST/dev (Bearer HCLOUD_TOKEN; el agente no la usa por
secret-scrubbing). GOTCHA del generador: casos `switch` duplicados en sync.go (firewalls/servers/
volumes) → deduplicar a mano al reimprimir (candidato a retro). Ver [[cli-printing-press]].

**Arranque escalonado por profiles (2026-07-05):** el `docker-compose.yml` ahora usa
`profiles:` para caber en cajas chicas. `docker compose up -d` (default) levanta SOLO el
núcleo mínimo **hermes-negocio + grafo + grafo-db + a2abot** (~3.5 GB de techo). Decisión:
**empezar por la vertical NEGOCIO** (los dashboards apuntan a ella vía
`GATEWAY_HEALTH_URL=hermes-negocio` y lleva el tracking de presupuesto). Los demás se suman a
demanda: `--profile verticales` (personal+clientes), `--profile trio` (ejecutor+supervisor),
`--profile a2a` (grafo-a2a), `--profile dashboard-nativo` (9119). Con una sola vertical basta
**CX22 (4 GB, €3.79/mes)** + swap; resize en caliente a CX32 al sumar verticales/trío.
`mem_limit` es techo, no reserva → la sobre-suscripción solo muerde si todo pica a la vez.

**PROVISIONADO (2026-07-05):** server `businessos` id **148180293**, tipo **cx33**
(4 vCPU / 8 GB / x86), location **Falkenstein `fsn1`** (EU), IPv4 **167.233.233.56**,
IPv6 2a01:4f8:c015:70b3::. Firewall `businessos-fw` (id 11254884, solo inbound tcp/22) +
SSH key `businessos-key` (id 114714739) inyectada. Creado 100% por CLI (`hcloud-pp-cli`)
con el token en `~/.config/claude/secrets.env` (línea `export HCLOUD_TOKEN=`, largo 64).

**CORRECCIÓN al runbook (el plan cx22/Ashburn era INVIABLE):**
- La línea **CX (barata) es SOLO-Europa**; en Ashburn/Hillsboro (US) solo hay CPX/CCX.
- **US sale ~3.4× más caro** (dato del endpoint `pricing`, moneda USD): cpx21 4 GB =
  $37.49/mes en `ash` vs $10.99 en EU. Descartado US.
- Naming actual (jul-2026): la CX es **cx23** (2vCPU/4GB, $6.49) y **cx33** (4vCPU/8GB,
  $8.99) — NO cx22/cx32. Elegido **cx33**: 8 GB corre todo el stack sin resize por ~$9/mes.
- **ARM (cax) evitado**: la imagen Hermes puede ser solo-x86; no arriesgar.
- Latencia EU→MX ~130ms, irrelevante para bots Telegram + agentes background.
- `hcloud-pp-cli`: `preflight`/`fits` leen del ESPEJO local (corre `sync` antes; aún así
  `ssh_key_exists` dio falso-negativo con la key ya creada) y el flag `--firewalls` mapea a
  escalar (mal) → crear el server con **`--stdin`** y `firewalls:[{"firewall":ID}]`. `--dry-run`
  disponible para verificar el body sin gastar. GOTCHA en secrets.env: una línea con clave SSH
  sin comillas (espacios) rompe el `source` del `.bashrc` — pendiente de encomillar.
- **Runbook `FASE0-hetzner.md` desactualizado**: cambiar CX22/CX32/Ashburn por cx23/cx33/fsn1.

**MIGRACIÓN DE NEGOCIO COMPLETA + VERIFICADA (2026-07-05):** el server ya corre el núcleo
(hermes-negocio + grafo + grafo-db + a2abot, todos Up/healthy). NO fue un deploy nuevo sino una
**migración**: negocio (@a2aTeamBot) estaba VIVO en la máquina de desarrollo (las 3 verticales
corrían ahí — ver corrección en [[maquinas-entornos]]). Pasos hechos: `docker stop hermes-negocio`
en dev (libera token; personal/clientes siguen ahí) → empaquetar `.hermes` (36.8M, uid 10000,
vía contenedor alpine root porque gsore no puede leer 0700) → scp + extraer en server preservando
uid 10000/0700 y limpiando `gateway.lock`/`.dispatcher.lock` → copiar el `.env` del compose de dev
(opaco) → `compose up -d --build`. @a2aTeamBot responde con memoria intacta, `RestartCount=0`.
- **Gotchas resueltos**: (1) `package-lock.json` está en `.gitignore` → NO viaja en `git archive`;
  copiarlo aparte al server (lo pide el Dockerfile de a2abot). (2) `GRAFO_DB_PASSWORD` no existía
  en el `.env` de dev (grafo nunca corrió ahí) → fijar valor nuevo aleatorio en el `.env` del server.
  (3) el build de a2abot corre en el server (contexto = raíz del repo); node/next tardan ~min.
- **Método de migración de volumen sin sudo**: `docker run --rm -v <vol>:/data:ro alpine tar -cpzf`
  lee el 0700/uid-10000 como root del contenedor; el tar sale root:644 (legible para scp).
- **CAVEAT (resuelto 2026-07-06)**: `hermes-negocio` ya NO existe en dev — `docker ps -a` solo
  muestra `hermes-personal` + `hermes-clientes` (Up); el contenedor de origen fue removido tras la
  migración → riesgo de revivir por reboot eliminado. SIGUE EN PIE la regla dura: un
  `docker compose up` de negocio en dev lo RECREARÍA desde el compose y chocaría el token con
  Hetzner → nunca correr el compose de negocio en la máquina local (personal/clientes tienen tokens
  distintos, sí pueden).

**Respaldo nocturno (HECHO 2026-07-06):** cron de `hermes` a las 04:17 corre `~/bin/backup-negocio.sh`
(sin sudo): lee el volumen `.hermes` vía contenedor privilegiado (uid-10000/0700) → tarball, rota los
últimos 7 en `~/backups/`, y espeja off-box al repo privado **`lisagomez/businessos-negocio`** con
historia de 1 commit (tamaño acotado; ~14 MB comprimido). Acceso git aislado por deploy-key write
(`~/.ssh/businessos_negocio_deploy` + Host `github-negocio` en `~/.ssh/config`). Primer respaldo
verificado en GitHub. Restaurar = extraer el `.tgz` en un `.hermes` limpio preservando uid/perms
(mismo patrón que la migración).

**Pendiente (residual):** cerrar root SSH — BLOQUEADO desde esta sesión: `hermes` NO tiene sudo sin
contraseña y entramos solo con llave → editar `sshd_config`/reiniciar sshd requiere root o el password
de sudo de hermes (lo hace la dueña, o darle NOPASSWD sudo). Y migrar personal/clientes cuando se
decida. Ver [[fase0-estado]] y [[maquinas-entornos]].
