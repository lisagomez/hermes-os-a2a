#!/usr/bin/env bash
# prep-servidor.sh — Fase 0, pasos 2 y 3 automatizados.
# Correr UNA vez como root en el primer acceso al Droplet (Ubuntu 24.04):
#   ssh root@LA_IP   →   bash prep-servidor.sh
# Crea el usuario 'hermes', endurece firewall, instala fail2ban + parches
# automaticos, crea swap e instala Docker.
#
# NO automatiza el lockdown de SSH (PermitRootLogin/PasswordAuthentication):
# eso se hace a MANO despues de confirmar que entras como 'hermes' con tu llave,
# para no auto-bloquearte. Ver el recordatorio al final y el paso 2 de FASE0.md.

set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Corre este script como root (ssh root@IP)." >&2
  exit 1
fi

USUARIO="hermes"

echo "==> Creando usuario $USUARIO (si no existe)..."
if ! id "$USUARIO" &>/dev/null; then
  adduser --disabled-password --gecos "" "$USUARIO"
  usermod -aG sudo "$USUARIO"
  # Copiar la llave SSH de root al nuevo usuario (acceso por llave, sin password)
  if [ -d /root/.ssh ]; then
    rsync --archive --chown="$USUARIO:$USUARIO" /root/.ssh "/home/$USUARIO/"
  fi
  echo "    Usuario $USUARIO creado y con sudo."
else
  echo "    Ya existe, lo dejo igual."
fi

# La cuenta no tiene contrasena (entra por llave SSH), asi que 'sudo' pediria una
# que no existe. Damos sudo SIN password via drop-in (el acceso ya esta gateado
# por la llave). Si prefieres sudo con contrasena, borra este archivo y corre
# 'passwd hermes' en su lugar.
echo "==> Configurando sudo sin contrasena para $USUARIO..."
echo "$USUARIO ALL=(ALL) NOPASSWD:ALL" > "/etc/sudoers.d/90-$USUARIO"
chmod 0440 "/etc/sudoers.d/90-$USUARIO"
visudo -c >/dev/null   # valida sintaxis; aborta (set -e) si quedo mal

echo "==> Firewall (ufw): SSH + 80 + 443..."
ufw allow OpenSSH >/dev/null
ufw allow 80 >/dev/null
ufw allow 443 >/dev/null
ufw --force enable

echo "==> fail2ban + parches de seguridad automaticos..."
apt-get update -y
apt-get install -y fail2ban unattended-upgrades
systemctl enable --now fail2ban
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "==> Swap (2 GB) como red de seguridad de memoria..."
if ! swapon --show | grep -q '/swapfile'; then
  if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile
  fi
  swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "    Swap activo."
else
  echo "    Swap ya estaba activo, lo dejo igual."
fi

echo "==> Instalando Docker (script oficial)..."
curl -fsSL https://get.docker.com | sh
usermod -aG docker "$USUARIO"

echo ""
echo "============================================================"
echo " LISTO. Ahora:"
echo "   1) Sal de root:            exit"
echo "   2) Entra como el usuario:  ssh $USUARIO@<IP>"
echo "   3) Verifica:               docker --version && docker compose version"
echo "                              free -h   # confirma 2.0Gi de Swap"
echo "   4) Sigue en el paso 4 de FASE0.md"
echo ""
echo " IMPORTANTE (no lo olvides): SOLO cuando confirmes que entras como"
echo " '$USUARIO' con tu llave, endurece SSH (paso 2 de FASE0.md):"
echo "   sudo sed -i 's/^#\\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config"
echo "   sudo sed -i 's/^#\\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config"
echo "   sudo systemctl restart ssh"
echo "============================================================"
