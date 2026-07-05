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

**Pendiente:** sigue diferido levantar el runtime hasta decidir provisionar; smoke real del
CLI cuando exista el token. Ver [[fase0-estado]] y [[maquinas-entornos]].
