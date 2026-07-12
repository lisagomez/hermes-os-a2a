#!/usr/bin/env bash
# Respaldo nocturno de los volumenes .hermes de LAS TRES verticales (memoria +
# sesiones): negocio, personal y clientes — todas viven en Hetzner desde 2026-07-08.
# Estrategia: tarball leido via contenedor privilegiado (los volumenes son
# uid-10000/0700), rotacion local (ultimos KEEP por vertical) + espejo off-box a
# repo privado con historia de 1 commit (tamano acotado). Corre como hermes; NO
# requiere sudo. (Antes: backup-negocio.sh, solo negocio.)
set -euo pipefail

BASE=/home/hermes/businessos
VERTICALES="negocio personal clientes"
BK=/home/hermes/backups
REPO=/home/hermes/hermes-os-a2a-backups
KEEP=7
STAMP=$(date +%Y%m%d-%H%M%S)

mkdir -p "$BK"
exec >>"$BK/backup.log" 2>&1
echo "=== $(date -Is) inicio ==="

for V in $VERTICALES; do
  VOL="$BASE/$V/.hermes"
  if [ ! -d "$VOL" ]; then
    echo "AVISO: $VOL no existe; se omite $V"
    continue
  fi
  # 1) leer el volumen (uid 10000, 0700) via contenedor privilegiado -> tarball local
  docker run --rm -v "$VOL":/data:ro alpine tar -czf - -C /data . > "$BK/$V-$STAMP.tgz"
  echo "tarball: $V-$STAMP.tgz ($(du -h "$BK/$V-$STAMP.tgz" | cut -f1))"
  # 2) rotacion local: conservar solo los ultimos KEEP de cada vertical
  ls -1t "$BK/$V"-*.tgz | tail -n +$((KEEP+1)) | xargs -r rm -f
done

# 3) espejo off-box: repo privado con historia de 1 commit (blobs viejos se hacen GC)
cd "$REPO"
rm -f negocio-*.tgz personal-*.tgz clientes-*.tgz
cp "$BK"/*-*.tgz .
git checkout --orphan fresh -q
git add -A
git -c user.email=backup@businessos -c user.name=verticales-backup \
    commit -q -m "backup $STAMP ($(ls *-*.tgz | wc -l) copias, 3 verticales)"
git branch -M fresh main
GIT_SSH_COMMAND="ssh -F /home/hermes/.ssh/config" git push -f origin main -q
echo "=== $(date -Is) OK: empujado a hermes-os-a2a-backups (3 verticales) ==="
