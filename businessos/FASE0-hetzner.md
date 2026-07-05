# Fase 0 en Hetzner Cloud — variante de bajo presupuesto

Delta sobre `FASE0.md`. **Sigue `FASE0.md` tal cual**, pero reemplaza los pasos
**1** (crear servidor), **2** (el firewall) y las **Notas de costo** por lo de
aquí. Los pasos 0 y 3–10 (bots de Telegram, Docker, swap, carpetas, `.env`,
wizard de Hermes, `compose up`, GitHub cron, verificación) son idénticos: no
dependen del proveedor.

Por qué Hetzner: mismos 4 GB por **~€3.79/mes** vs **~$24** en DO (≈6× más
barato), y su plan de 8 GB (**CX32, ~€6.80/mes**) cuesta menos que el de 4 GB de
DO — así montas TODO incluido el grafo sin apreturas. Precios verificados
jul-2026; confírmalos en hetzner.com/cloud antes de provisionar.

---

## 1'. Crear el servidor (reemplaza el paso 1)

En **Hetzner Cloud Console** → Project → **Add Server**:

- **Location:** **Ashburn, VA (us-east)** es la mejor latencia para casi toda
  LATAM (alternativa oeste: Hillsboro, OR). Las de EU (Nuremberg/Helsinki/
  Falkenstein) son aún más baratas pero con más latencia.
- **Image:** Ubuntu 24.04 LTS.
- **Type:** **Shared vCPU** →
  - **CX32 — 4 vCPU / 8 GB / 80 GB (~€6.80/mes)** ← recomendado: corre las 3
    verticales + dashboard + grafo + trío A2A holgado, sin tocar límites.
  - **CX22 — 2 vCPU / 4 GB / 40 GB (~€3.79/mes)** ← mínimo. Con este NO corras
    las 3 Hermes a la vez sin recortar los `mem_limit` del `docker-compose.yml`
    (3 × 2 GB están sobre-suscritos → OOM). Empieza con 1 vertical (personal) y
    súbete a CX32 al sumar negocio/clientes o el grafo.
- **SSH key:** sube tu llave pública (`~/.ssh/id_ed25519.pub`). Si no tienes:
  `ssh-keygen -t ed25519`.
- **Firewall:** créalo aquí mismo (ver 2'). 
- **Name:** businessos.

> Hetzner NO da los $200 de crédito de DO. Cobro por hora con tope mensual; un
> servidor **apagado sigue cobrando** (igual que DO) — para pausar de verdad:
> snapshot + delete. Aun así, a estos precios 2 meses ≈ lo que 3 días de crédito
> de DO.

Anota la IP pública.

---

## 2'. Firewall + endurecer (reemplaza el paso 2)

**Ventaja real de Hetzner sobre DO:** el **Cloud Firewall es a nivel de red**
(fuera de la VM), así que **SÍ filtra los puertos que Docker publica** —
resuelve de raíz el gotcha "Docker se salta UFW" del `FASE0.md`. Aun así, deja
UFW/fail2ban dentro como defensa en profundidad.

En la Cloud Console → **Firewalls** → crea uno y aplícalo al servidor:

- **Inbound:** permite **solo** `SSH (TCP 22)` desde tu IP (o `0.0.0.0/0` si tu
  IP es dinámica). NO abras 80/443 salvo que expongas algo público; el dashboard
  va por túnel SSH (paso 10). NO abras nunca los puertos del trío/dashboard.
- **Outbound:** permitir todo (default).

Con ese firewall de red, aunque un `ports:` de compose publique en `0.0.0.0`,
Hetzner lo bloquea desde afuera. (Mantén igual el dashboard en `127.0.0.1` del
paso 8: cinturón y tirantes.)

El resto del paso 2 de `FASE0.md` se aplica **idéntico**: usuario `hermes`
no-root, `rsync` de la llave, `ufw`/`fail2ban`/`unattended-upgrades`, verificar
`ssh hermes@IP` y recién entonces cerrar root/password.

> Con CX22 (4 GB) el swap del paso 3 es obligatorio; con CX32 (8 GB) sigue siendo
> buena idea pero holgado.

---

## Notas de costo y operación (reemplazan las de DO)

- **Apagar ≠ dejar de pagar** (Hetzner reserva recursos, igual que DO). Pausa
  real = snapshot + delete; recrear desde snapshot cuando vuelvas.
- **Backups automáticos:** +20% del precio del servidor (~€1.4/mes en CX32).
  Opcional; el modelo de respaldo primario sigue siendo el cron nocturno a
  GitHub por vertical (paso 9).
- **`hcloud` CLI:** Hetzner tiene su propio CLI (`hcloud`). El CLI `digitalocean`
  que imprimiste (Fase 0-1) NO gestiona Hetzner; si quieres gestión agente-nativa
  del servidor, imprime `hcloud` con Printing Press más adelante (Go + tokens) —
  no bloquea nada del despliegue.
- **Escalar:** de CX22 a CX32 es un resize en caliente desde la consola (unos
  minutos de downtime); no hay que reprovisionar.

---

## Qué NO cambia respecto a `FASE0.md`

Pasos **0, 3, 4, 5, 6, 7, 8, 9, 10** completos: son idénticos. En particular el
`docker-compose.yml`, el wizard de Hermes, el `.env`, el túnel SSH del dashboard
y la verificación final se corren igual. Si eliges **CX22**, además recorta los
`mem_limit` de los 3 `hermes-*` en el compose (el archivo ya avisa: *"Si bajas a
un solo box chico, reduce estos limits"*) o corre solo `hermes-personal`.
