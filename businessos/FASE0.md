# Fase 0 — Infraestructura Hermes OS · A2A

Cimiento técnico: servidor + Docker + los tres contenedores Hermes + sync a
GitHub. Al terminar tendrás las tres verticales corriendo y respondiendo por
Telegram. Sigue los pasos en orden.

> **Proveedor de servidor:** el runtime vive en **Hetzner Cloud**. Los pasos de
> este archivo son independientes del proveedor; los concretos de Hetzner (tipo
> cx33, location, firewall de red, costo) están en **`FASE0-hetzner.md`**, que es
> un delta sobre este documento.

Tiempo estimado: 1.5 – 2.5 horas (la mayoría es esperar instalaciones y correr
los wizards de Hermes).

> **Imagen verificada (2026-06-26).** `nousresearch/hermes-agent` existe en
> Docker Hub; el subcomando `setup`, los comandos `gateway run` / `dashboard`,
> la ruta de datos `/opt/data` y las env vars del dashboard están confirmados
> contra la doc oficial. Tag estable pineado: **`v2026.6.19`**. Antes de
> provisionar, revisa github.com/NousResearch/hermes-agent/releases por si hay
> uno más nuevo. No uses `:latest` / `:main` (apuntan a builds inestables).

---

## Checklist de orden (no te saltes pasos)

- [ ] 0. Antes de empezar: crear los 3 bots de Telegram
- [ ] 1. Crear el servidor (Hetzner — ver FASE0-hetzner.md §1')
- [ ] 2. Primer acceso SSH + endurecer el servidor (incluye lockdown de SSH)
- [ ] 3. Instalar Docker
- [ ] 4. Estructura de carpetas + clonar repos
- [ ] 5. Configurar el .env
- [ ] 6. Correr el wizard de Hermes (1 vez por vertical)
- [ ] 7. Copiar los SOUL.md / AGENTS.md a cada volumen
- [ ] 8. Levantar el stack con docker compose
- [ ] 9. Conectar GitHub + cron de sync nocturno
- [ ] 10. Verificación final

---

## 0. Antes de empezar — los 3 bots de Telegram

Telegram permite solo UNA conexión por token, por eso cada vertical necesita su
propio bot. En Telegram, habla con @BotFather:

1. `/newbot` → nombre "Hermes OS · A2A Personal" → usuario que termine en `bot`.
2. Repite para "Hermes OS · A2A Negocio" y "Hermes OS · A2A Clientes".
3. Guarda los 3 tokens que te da (formato `0000000000:AA...`). Los necesitas
   en el paso 5.

También averigua tu propio chat_id: habla con @userinfobot, te lo da. Lo usarás
para el allowlist (que solo tú puedas hablarle a los bots).

---

## 1. Crear el servidor

El servidor de runtime es **Hetzner Cloud**. Los pasos concretos (tipo cx33,
location `fsn1`, firewall de red) están en **`FASE0-hetzner.md` §1'–2'**; aquí
queda lo independiente del proveedor:

- **Imagen:** Ubuntu 24.04 LTS.
- **Tamaño:** el mínimo realista es **4 GB / 2 vCPU** para 3 contenedores Hermes +
  dashboard; **8 GB** (el cx33 provisionado) corre además el grafo y el trío A2A
  holgado. La doc oficial de Nous recomienda 8 GB.
  > No bajes a 2 GB: los límites del compose (3 × 2 GB) están sobre-suscritos y
  > en 2 GB el stack hace OOM-kill. Aun en 4 GB, el swap del paso 3 es la red de
  > seguridad que absorbe los picos.
- **Autenticación:** SSH key (más seguro que contraseña). Si no tienes una:
  `ssh-keygen -t ed25519` en tu máquina, sube el contenido de
  `~/.ssh/id_ed25519.pub`.
- **Hostname:** businessos.

Anota la IP pública del servidor.

---

## 2. Primer acceso + endurecer

Conéctate por SSH (NO uses la consola web del navegador para pegar comandos con
`:` `@` `=` — los corrompe; usa SSH real):

```bash
ssh root@LA_IP_DEL_SERVIDOR
```

Crea un usuario no-root para correr Hermes (no corras todo como root):

```bash
adduser hermes
usermod -aG sudo hermes
# copia tu llave SSH al nuevo usuario:
rsync --archive --chown=hermes:hermes ~/.ssh /home/hermes
```

Endurecimiento mínimo (firewall + fail2ban + updates automáticos):

```bash
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw --force enable
apt update && apt install -y fail2ban unattended-upgrades
systemctl enable --now fail2ban
dpkg-reconfigure -plow unattended-upgrades   # activa parches de seguridad automáticos
```

> ⚠️ **Docker se salta UFW.** Docker escribe sus propias reglas de iptables e
> **ignora UFW** para cualquier puerto que publique (`ports:` en compose). Es
> decir: habilitar UFW NO protege los puertos de tus contenedores. Por eso en
> este stack publicamos el dashboard solo en `127.0.0.1` (ver paso 8) y lo
> abrimos por túnel SSH (paso 10). Si algún día necesitas exponer un puerto de
> contenedor al internet, instala `ufw-docker` para que UFW realmente lo
> gobierne — no confíes en las reglas `ufw allow` de arriba para eso.

Verifica que puedes entrar como el usuario nuevo ANTES de cerrar el acceso root.
Desconéctate y vuelve a entrar:

```bash
exit
ssh hermes@LA_IP_DEL_SERVIDOR
```

**Solo cuando confirmes que `ssh hermes@...` funciona con tu llave**, cierra el
login root y por contraseña (esto es lo que hace que valga la pena el usuario
no-root):

```bash
sudo sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart ssh
```

A partir de aquí todo se corre como `hermes`.

---

## 3. Instalar Docker

Usa el script oficial (NO el paquete docker.io de Ubuntu, va atrasado):

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

Añade swap (red de seguridad de memoria que absorbe los picos del box de 4 GB,
cuyos límites de compose están a propósito sobre-suscritos — ver paso 1):

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h        # debe mostrar 2.0Gi de Swap
```

Cierra sesión y vuelve a entrar para que el grupo docker tome efecto:

```bash
exit
ssh hermes@LA_IP_DEL_SERVIDOR
docker --version          # debe responder
docker compose version    # debe responder
```

---

## 4. Estructura de carpetas + repos

```bash
mkdir -p ~/businessos/{personal,negocio,clientes}/.hermes
mkdir -p ~/businessos/obsidian/inbox
cd ~/businessos
```

Copia aquí (vía scp desde tu máquina, o git clone de tu propio repo) los
archivos que ya tienes:
- `docker-compose.yml`
- `.env.example`  → lo conviertes en `.env` en el paso 5
- `personal/SOUL.md`, `personal/AGENTS.md`, `personal/MEMORY.md`
- `negocio/SOUL.md`, `negocio/AGENTS.md`, `negocio/MEMORY.md`
- `clientes/SOUL.md`, `clientes/AGENTS.md`, `clientes/MEMORY.md`

Desde TU máquina (no el servidor), ejemplo con scp:

```bash
scp docker-compose.yml hermes@LA_IP:~/businessos/
scp -r personal negocio clientes hermes@LA_IP:~/businessos/
```

> Si clonas tu propio repo aquí, asegúrate de que ese repo **no** contenga el
> `.env` ni secretos (ver paso 5 y 9).

---

## 5. Configurar el .env

En el servidor:

```bash
cd ~/businessos
cp .env.example .env
nano .env
```

Llena:
- `OPENROUTER_API_KEY` — saca una llave en openrouter.ai, carga unos $10 de
  crédito (desbloquea mejores rate limits).
- Los 3 `TELEGRAM_BOT_TOKEN_*` del paso 0.
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — de tu proyecto Supabase
  (Project Settings → API). El service_role bypassa RLS: es llave de servidor,
  solo vive en este `.env`.
- `DASH_USER` / `DASH_PASS` / `DASH_SECRET` (una cadena larga aleatoria, p. ej.
  `openssl rand -hex 32`).

Confirma que ni el `.env` ni los volúmenes con credenciales se suben a git:

```bash
cat >> .gitignore <<'EOF'
.env
**/.hermes/
obsidian/
EOF
```

> Ajusta `obsidian/` si SÍ quieres versionar tus notas; pero nunca incluyas
> `.env` ni `.hermes/` (ahí viven las credenciales que generó el wizard).

---

## 6. Wizard de Hermes (1 vez por vertical)

Esto crea las credenciales y config dentro de cada volumen. Hazlo ANTES del
`docker compose up`. Una vez por vertical (tag pineado a `v2026.6.19`):

```bash
# PERSONAL
docker run -it --rm -v ~/businessos/personal/.hermes:/opt/data \
  nousresearch/hermes-agent:v2026.6.19 setup

# NEGOCIO
docker run -it --rm -v ~/businessos/negocio/.hermes:/opt/data \
  nousresearch/hermes-agent:v2026.6.19 setup

# CLIENTES
docker run -it --rm -v ~/businessos/clientes/.hermes:/opt/data \
  nousresearch/hermes-agent:v2026.6.19 setup
```

En cada wizard:
- Proveedor: **OpenRouter** (o Nous Portal si prefieres OAuth).
- Modelo por defecto: uno barato para empezar (ej. un Haiku o DeepSeek); ya
  afinarás el routing después.
- Telegram: pega el token del bot de ESA vertical.
- Allowlist: agrega tu chat_id para que solo tú puedas usarlos.

---

## 7. Copiar SOUL.md / AGENTS.md / MEMORY.md a cada volumen

Hermes lee estos archivos desde HERMES_HOME (= `/opt/data` dentro del contenedor,
= `~/businessos/<vertical>/.hermes` en el host). Cada vertical lleva los tres:
SOUL.md (persona), AGENTS.md (reglas) y MEMORY.md (hechos estables — presupuesto
en negocio, plantilla de propuestas en clientes, preferencias en personal):

```bash
for v in personal negocio clientes; do
  cp ~/businessos/$v/SOUL.md   ~/businessos/$v/.hermes/SOUL.md
  cp ~/businessos/$v/AGENTS.md ~/businessos/$v/.hermes/AGENTS.md
  cp ~/businessos/$v/MEMORY.md ~/businessos/$v/.hermes/MEMORY.md
done
```

---

## 8. Levantar el stack

Antes de levantar, revisa tu `docker-compose.yml`:

- Cada servicio debe tener **`restart: unless-stopped`** (es lo que hace que los
  contenedores vuelvan solos tras un reboot — se verifica en el paso 10).
- El dashboard debe publicar su puerto **solo en localhost**, no en `0.0.0.0`,
  por el gotcha de Docker+UFW del paso 2:

  ```yaml
  ports:
    - "127.0.0.1:9119:9119"   # accesible solo por túnel SSH, no desde internet
  ```

Luego:

```bash
cd ~/businessos
docker compose up -d
docker compose ps        # los 3 hermes + dashboard deben estar "running"
docker compose logs -f hermes-personal   # revisa que arrancó sin errores (Ctrl-C para salir)
```

Prueba: mándale un mensaje por Telegram al bot Personal. Debe responder con la
voz definida en su SOUL.md.

---

## 9. GitHub + cron de respaldo nocturno (UN host-job, UN repo)

> ⚠️ **Corregido el 2026-07-11.** La doc de Hermes recomienda "un repo por vertical,
> que cada bot haga su propio commit+push por cron". **Aquí NO se hace así.** Ese
> plan (3 repos privados `businessos-{personal,negocio,clientes}`, crons escalonados
> 2:00/2:10/2:20 pedidos al bot en lenguaje natural) **nunca se implementó y quedó
> descartado**. Lo que corre —y lo que debes montar— es lo de abajo. Motivo del
> cambio en la tabla al final de esta sección.

**Modelo real:** el respaldo lo hace **un job de confianza del host**, no el agente.
Los volúmenes `.hermes` son `uid 10000 / 0700`: el bot **no puede leerlos** (y no
debe: ahí viven sus sesiones y su `.env`). El host sí.

**Un solo repo PRIVADO** en GitHub para los respaldos de las tres verticales:

| Qué | Dónde |
|-----|-------|
| Repo de respaldo | `lisagomez/hermes-os-a2a-backups` (privado) |
| Script | `businessos/backup-verticales.sh` (corre como `hermes`, sin sudo) |
| Cron | **04:17** diario, una sola entrada |
| Contenido | tarball de los 3 volúmenes `.hermes` + rotación de los últimos 7 c/u |
| Clon local en el server | `/home/hermes/hermes-os-a2a-backups` |

Cómo funciona (por qué así): lee cada volumen con un contenedor privilegiado
(`docker run --rm -v <vol>:/data:ro alpine tar …`), rota localmente en
`~/backups/`, y espeja off-box al repo con **historia de 1 commit** (rama huérfana
+ `push -f`) para que los blobs viejos se recojan y el repo no crezca sin fin.

Fija la zona horaria del servidor para que la hora signifique lo que crees
(los servidores cloud vienen en UTC por defecto):

```bash
sudo timedatectl set-timezone America/Mexico_City
timedatectl        # verifica Time zone
```

Instalación (una vez, como usuario `hermes` en el server):

```bash
gh repo create hermes-os-a2a-backups --private            # o créalo en la web
git clone git@github.com:lisagomez/hermes-os-a2a-backups.git ~/hermes-os-a2a-backups
crontab -e   # añade:  17 4 * * *  /home/hermes/businessos/backup-verticales.sh
```

Verifica al día siguiente: el último commit del repo debe decir
`backup <STAMP> (N copias, 3 verticales)` y el log vive en `~/backups/backup.log`.

**Por qué se descartó el modelo de la doc:**

| Modelo de la doc (3 repos, el bot pushea) | Modelo real (1 host-job, 1 repo) |
|---|---|
| El bot necesita leer su volumen `.hermes` | Es `0700 uid-10000`: **no puede** — y darle acceso sería darle sus propios secretos |
| 3 crons dentro de 3 agentes = 3 puntos de falla silenciosa | 1 cron del host, 1 log |
| Respalda el *workspace* (archivos sueltos) | Respalda el **volumen entero**: memoria + sesiones (`state.db`) |
| Gasta tokens cada noche | **Cero tokens** |

---

## 10. Verificación final

- [ ] `docker compose ps` muestra 4 servicios running
- [ ] Los 3 bots de Telegram responden y cada uno tiene su personalidad
- [ ] `ssh hermes@IP` funciona con llave y `ssh root@IP` ya **no** (lockdown OK)
- [ ] El dashboard abre por túnel: `ssh -L 9119:localhost:9119 hermes@IP`, luego
      `http://localhost:9119` en tu navegador
- [ ] El cron de respaldo del **host** corre (`crontab -l` como `hermes` muestra
      `17 4 * * * …/backup-verticales.sh`) y el repo `hermes-os-a2a-backups` tiene
      un commit "backup … (N copias, 3 verticales)" de hoy
- [ ] Reinicia el servidor (`sudo reboot`) y confirma que los contenedores
      vuelven solos (`restart: unless-stopped`)
- [ ] `free -h` muestra el swap activo

Si todos pasan: la fase 0 está completa. Siguiente fase: afinar el routing de
modelos (config.yaml) y/o montar el grafo.

---

## Notas de costo y operación

- Las notas de **costo, apagado/pausa y backups** específicas de Hetzner están en
  **`FASE0-hetzner.md`** (apagar ≠ dejar de pagar; pausa real = snapshot + delete;
  backups automáticos +20% del precio del servidor).
- Si algo se rompe en un contenedor, su volumen está intacto: borras el
  contenedor y `docker compose up -d` lo recrea sin perder memoria/skills.
- `unattended-upgrades` aplica parches de seguridad solo; los reinicios de
  kernel siguen siendo manuales (`sudo reboot` cuando lo veas conveniente).
