# Fase 0 — Infraestructura Hermes OS · A2A

Cimiento técnico: Droplet + Docker + los tres contenedores Hermes + sync a
GitHub. Al terminar tendrás las tres verticales corriendo y respondiendo por
Telegram. Sigue los pasos en orden.

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
- [ ] 1. Crear el Droplet en DigitalOcean
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

## 1. Crear el Droplet

En DigitalOcean → Create → Droplet:

- **Imagen:** Ubuntu 24.04 LTS
- **Plan:** Basic → Regular → **4 GB / 2 vCPU** (~$28/mes). Es el mínimo
  realista para 3 contenedores Hermes + dashboard. La doc oficial de Nous
  recomienda 8 GB; con 4 GB vas cómodo para empezar y subes a 8 GB cuando
  montes el grafo.
  > No bajes a 2 GB: los límites del compose (3 × 2 GB) están sobre-suscritos y
  > en 2 GB el stack hace OOM-kill. Aun en 4 GB, el swap del paso 3 es la red de
  > seguridad que absorbe los picos.
- **Región:** la más cercana a ti (para LATAM, normalmente NYC o el datacenter
  con mejor latencia a tu país).
- **Autenticación:** SSH key (más seguro que contraseña). Si no tienes uno:
  `ssh-keygen -t ed25519` en tu máquina, pega el contenido de
  `~/.ssh/id_ed25519.pub`.
- **Hostname:** businessos

Cuentas nuevas traen $200 de crédito por 60 días — cubre los primeros 2 meses.

Anota la IP pública del Droplet.

---

## 2. Primer acceso + endurecer

Conéctate por SSH (NO uses la consola web del navegador para pegar comandos con
`:` `@` `=` — los corrompe; usa SSH real):

```bash
ssh root@LA_IP_DEL_DROPLET
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
ssh hermes@LA_IP_DEL_DROPLET
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
ssh hermes@LA_IP_DEL_DROPLET
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

## 9. GitHub + cron de sync nocturno (un repo por vertical)

Esto es lo PRIMERO que recomienda la doc de Hermes tras el setup: te da skill +
cron + respaldo de un solo prompt.

**Modelo de respaldo:** cada vertical solo monta su propio volumen, así que cada
una respalda SU workspace a SU repo privado, con horarios escalonados para que
no choquen. Crea **3 repos PRIVADOS** en GitHub y dale acceso a Hermes (token en
el wizard, o por MCP):

| Vertical | Repo | Hora del cron |
|----------|------|---------------|
| personal | `businessos-personal` | 2:00 |
| negocio  | `businessos-negocio`  | 2:10 |
| clientes | `businessos-clientes` | 2:20 |

Fija la zona horaria del servidor para que las horas signifiquen lo que crees
(los Droplets vienen en UTC por defecto):

```bash
sudo timedatectl set-timezone America/Mexico_City
timedatectl        # verifica Time zone
```

Abre una sesión con **cada** vertical (o por Telegram a cada bot) y dile, en
lenguaje natural, ajustando repo y hora según la tabla:

> "Cada noche a las 2:00 hora de México, haz commit y push de los cambios de mi
> espacio de trabajo a este repo de GitHub: <URL_DE_businessos-personal>. No
> incluyas el archivo .env, la carpeta .hermes, ni ningún secreto. Configúralo
> como cron recurrente."

Repite con negocio (2:10 → `businessos-negocio`) y clientes (2:20 →
`businessos-clientes`). Hermes crea la skill y el cron solo. Verifica con:
pídele a cada uno "muéstrame los cron jobs activos".

---

## 10. Verificación final

- [ ] `docker compose ps` muestra 4 servicios running
- [ ] Los 3 bots de Telegram responden y cada uno tiene su personalidad
- [ ] `ssh hermes@IP` funciona con llave y `ssh root@IP` ya **no** (lockdown OK)
- [ ] El dashboard abre por túnel: `ssh -L 9119:localhost:9119 hermes@IP`, luego
      `http://localhost:9119` en tu navegador
- [ ] Cada vertical tiene su cron de sync (personal 2:00, negocio 2:10, clientes
      2:20) — pídele a cada bot "lista de crons" y confirma que apunta a SU repo
- [ ] Reinicia el Droplet (`sudo reboot`) y confirma que los contenedores
      vuelven solos (`restart: unless-stopped`)
- [ ] `free -h` muestra el swap activo

Si todos pasan: la fase 0 está completa. Siguiente fase: afinar el routing de
modelos (config.yaml) y/o montar el grafo.

---

## Notas de costo y operación

- Apagar el Droplet NO detiene el cobro (DO reserva recursos). Para pausar de
  verdad: snapshot + destroy.
- Backups automáticos de DO cuestan 20% del Droplet (~$3/mes). Opcional pero
  recomendado.
- Si algo se rompe en un contenedor, su volumen está intacto: borras el
  contenedor y `docker compose up -d` lo recrea sin perder memoria/skills.
- `unattended-upgrades` aplica parches de seguridad solo; los reinicios de
  kernel siguen siendo manuales (`sudo reboot` cuando lo veas conveniente).
