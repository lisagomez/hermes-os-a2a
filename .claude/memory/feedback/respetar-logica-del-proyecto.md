# Respetar la lógica del proyecto, no atajos

Feedback del usuario (Elisa) el 2026-06-27.

## Qué pidió / corrigió
- **"Hermes debe mandar el mensaje"** — no enviar por la Bot API cruda. Los mensajes a
  Telegram deben salir de la vertical Hermes (con su persona), no de un `curl` directo.
- **"¿Se respeta la lógica del proyecto con estas acciones?"** — al ofrecer un atajo
  (un `docker run` one-shot con `hermes send`, volumen vacío, sin persona), pidió hacerlo
  **bien**: servicio persistente vía el patrón del `docker-compose.yml`, en `hermes-net`,
  con SOUL/AGENTS/MEMORY cargadas. Un envío mecánico NO es "la vertical hablando".

## Cómo aplicarlo
- Antes de actuar, contrastar con los principios de BusinessOS (ROADMAP §principios):
  aislar-no-fundir, acotar-antes-de-escalar, **verificar-antes-de-confiar**.
- No declarar éxito sin verificación real (round-trip), y ser honesto sobre los matices
  (p.ej. distinguir "Hermes lo envió" de "el binario `hermes send` lo entregó sin persona").
- Preferir el camino arquitectónicamente correcto aunque tenga más pasos. Si hay que
  tomar un atajo por una limitación del entorno (p.ej. no hay `docker compose` en WSL),
  decirlo explícitamente y replicar el patrón oficial.
