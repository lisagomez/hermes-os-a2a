#!/usr/bin/env bash
# Host-jobs nocturnos de negocio (Fase 1 + Fase 4). Corre como hermes, sin sudo.
# - ingest-token-usage: alimenta token_usage + snapshot presupuesto.json (lo lee el bot)
# - snapshot-pantheon:   alimenta la vista Pantheon del dashboard
# - cli-audit:           auditoría de CLIs agente-nativos -> cli-audit.json (lo lee el bot)
set -uo pipefail
cd /home/hermes/repo/businessos
set -a; . ./.env 2>/dev/null; set +a
mkdir -p /home/hermes/logs
{
  echo "=== $(date -Is) nightly inicio ==="
  # token_usage: ayer (día completo) + hoy (parcial), en UTC. UPSERT idempotente,
  # así el conteo de cada día se completa en la corrida siguiente.
  python3 ingest-token-usage.py "$(date -u -d 'yesterday' +%F)"
  python3 ingest-token-usage.py
  # dashboard: pantheon de las verticales vivas en esta máquina
  python3 snapshot-pantheon.py
  # inyectar el presupuesto en el SOUL del bot (contexto siempre cargado; el bot no puede
  # leer archivos porque no hay Docker en el contenedor). Idempotente (bloque con marcadores).
  docker exec -i -u hermes hermes-negocio python3 - < /home/hermes/bin/inject-presupuesto.py
  # auditoría de CLIs agente-nativos (Printing Press, Nivel 2-prep: DETECTA y avisa,
  # NO imprime — imprimir es Claude Code + Go). Corre aquí porque el servidor es la
  # única máquina 24/7; lee lo impreso del índice versionado (cli-library-index.json),
  # no de la librería de binarios, que solo existe en la máquina donde se imprime.
  python3 cli-audit.py
  # vigilancia 69-B CFF (App A): dictamina en contraparte_69b los RFCs que la cascada
  # de enriquecimiento-a2a ha visto (+ refresco de los ya vigilados). Es EL productor
  # del gate 69-B: sin esta corrida el gate queda fail-closed para todo RFC.
  python3 vigilancia-69b.py
  # estado del trio -> tareas.json en el volumen de negocio. El bot NO tiene credenciales
  # (por diseño): sin este snapshot no puede consultar una tarea y ADIVINA (1a corrida real).
  python3 snapshot-tareas.py
  # proyectos de clientes -> proyectos.json en el volumen de CLIENTES. El bot no tiene el
  # repo: lee este snapshot (fuente origin/master, que el cron de fetch refresca cada 5 min).
  python3 snapshot-proyectos.py
  # expedientes de promoción A1->A2 del CRM (plan D-40): el sistema arma los números
  # y los PRESENTA a la dueña por Telegram; promover es botón humano, jamás del job.
  python3 expediente-promocion.py
  # deriva repo->runtime: lo fusionado que NO está corriendo (imágenes viejas, seed sin
  # aplicar, doctrina que no llegó al volumen, checkout atrasado). Solo LEE y NOMBRA;
  # desplegar sigue siendo decisión humana. Nace de las cuatro derivas simultáneas del
  # 2026-08-20, una de ellas un bug vivo con 12 días de antigüedad.
  python3 drift-runtime.py
  echo "=== $(date -Is) nightly fin ==="
} >> /home/hermes/logs/host-jobs.log 2>&1
