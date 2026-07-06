#!/usr/bin/env bash
# Respaldo nocturno del volumen .hermes de la vertical NEGOCIO (memoria + sesiones).
# Estrategia: tarball leido via contenedor privilegiado (el volumen es uid-10000/0700),
# rotacion local (ultimos KEEP) + espejo off-box a repo privado con historia de 1 commit
# (tamano acotado). Corre como hermes; NO requiere sudo.
set -euo pipefail

VOL=/home/hermes/businessos/negocio/.hermes
BK=/home/hermes/backups
REPO=/home/hermes/businessos-negocio
KEEP=7
STAMP=$(date +%Y%m%d-%H%M%S)

mkdir -p "$BK"
exec >>"$BK/backup.log" 2>&1
echo "=== $(date -Is) inicio ==="

# 1) leer el volumen (uid 10000, 0700) via contenedor privilegiado -> tarball local
docker run --rm -v "$VOL":/data:ro alpine tar -czf - -C /data . > "$BK/negocio-$STAMP.tgz"
echo "tarball: negocio-$STAMP.tgz ($(du -h "$BK/negocio-$STAMP.tgz" | cut -f1))"

# 2) rotacion local: conservar solo los ultimos KEEP
ls -1t "$BK"/negocio-*.tgz | tail -n +$((KEEP+1)) | xargs -r rm -f

# 3) espejo off-box: repo privado con historia de 1 commit (blobs viejos se hacen GC)
cd "$REPO"
rm -f negocio-*.tgz
cp "$BK"/negocio-*.tgz .
git checkout --orphan fresh -q
git add -A
git -c user.email=backup@businessos -c user.name=negocio-backup \
    commit -q -m "backup $STAMP ($(ls negocio-*.tgz | wc -l) copias)"
git branch -M fresh main
GIT_SSH_COMMAND="ssh -F /home/hermes/.ssh/config" git push -f origin main -q
echo "=== $(date -Is) OK: empujado a businessos-negocio ==="
