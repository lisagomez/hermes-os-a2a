#!/usr/bin/env bash
# buzon-jobs.sh — ciclo del buzon agentico (SPEC-buzon-a2a).
#
# Va aparte de nightly-jobs.sh a proposito: un buzon de atencion revisado una vez
# al dia no sirve de nada. Cadencia: cada 15 minutos (ver crontab).
#
# La cadena completa, y donde vive cada credencial:
#   1. ingerir-entrantes.py   HOST, CON credenciales de Gmail -> correos_entrantes
#   2. redactar-borradores.py HOST, SIN credenciales -> llama a buzon-a2a :4900
#      buzon-a2a               CONTENEDOR, SIN credenciales -> corre 11 gates
#   3. (no hay paso 3) el envio es enviar-salientes.py y exige firma humana en
#      aprobaciones_salientes. Este script JAMAS envia.
#
# INGERIR_REAL/REDACTAR_REAL se fijan AQUI y no en el .env: asi una corrida
# manual del script suelto sigue siendo dry-run por defecto.
set -uo pipefail
cd /home/hermes/repo/businessos
set -a; . ./.env 2>/dev/null; set +a
mkdir -p /home/hermes/logs
{
  echo "=== $(date -Is) buzon inicio ==="
  # Trae el correo nuevo y lo sanea (aplana HTML invisible, normaliza Unicode,
  # trunca el hilo citado, hash de evidencia). Idempotente por
  # unique(buzon_id, proveedor_id): re-leer un correo no lo duplica.
  INGERIR_REAL=1 python3 ingerir-entrantes.py
  echo "rc_ingerir=$?"
  # Pide un borrador por cada entrante sin respuesta. No responde a remitentes
  # automaticos (evita bucles). Los 11 gates corren dentro de buzon-a2a; un
  # CRITICO en rojo deja el borrador fuera de la bandeja de A5.
  REDACTAR_REAL=1 python3 redactar-borradores.py
  echo "rc_redactar=$?"
  echo "=== $(date -Is) buzon fin ==="
} >> /home/hermes/logs/host-jobs.log 2>&1
