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

**Pendientes que abre:** (1) el CLI `digitalocean` impreso (Fase 0-1) NO gestiona Hetzner;
si se quiere gestión agente-nativa, imprimir `hcloud` con Printing Press (Go + tokens,
no bloquea). (2) Sigue diferido levantar el runtime hasta decidir provisionar. Ver
[[fase0-estado]] y [[maquinas-entornos]].
