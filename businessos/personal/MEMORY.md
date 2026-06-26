# MEMORY.md — Vertical Personal

Memoria persistente del contenedor `hermes-personal`. Vive en
`personal/.hermes/MEMORY.md`. Reglas operativas en AGENTS.md, persona en SOUL.md.
Aquí van los HECHOS estables del usuario: preferencias, recurrentes y rutinas.
El cron "dreaming" nocturno consolida aquí lo capturado en el día; mantenlo
corto y editado, no acumules historia.

---

## Sobre el usuario (rellenar)

- Nombre / cómo prefiere que le hablen: (pendiente)
- Zona horaria: America/Mexico_City (zona del servidor).
- Horario activo / "no molestar": (pendiente, p. ej. 22:00–7:00)
- Canales: Telegram (texto y voz).

---

## Preferencias de interacción

- Idioma: español.
- Digest matutino: máximo 200 palabras, entrega a Telegram a las 8:00.
- Salida hablada (TTS): solo si lo pido explícito ("respóndeme en voz") o para
  el digest diario. El resto, por texto (la voz es lo caro).
- Sube a un modelo caro (Sonnet) solo cuando lo pida razonamiento real; lo
  ligero va con modelo barato.

---

## Bóveda Obsidian

- Montada en `/opt/data/obsidian` (lectura/escritura).
- Capturas nuevas → `/opt/data/obsidian/inbox/AAAA-MM-DD-HHMM.md` con frontmatter
  `fecha / origen / tags`.
- El "dreaming" nocturno archiva las notas de `inbox/` a su carpeta destino y
  resume lo relevante aquí.

---

## Recurrentes / rutinas (rellenar)

| Qué | Cuándo | Notas |
|-----|--------|-------|
| (ej. revisar agenda) | diario 8:00 | va en el digest |
| (ej. pagar X)        | mensual día N | recordatorio |
| (ej. plan semanal)   | domingo       | usa Sonnet |

---

## Crons activos (referencia)

- **Digest matutino 8:00** — agenda + recordatorios + pendientes de la bóveda.
- **"Dreaming" nocturno 2:00** — consolida capturas en este MEMORY.md, archiva
  `inbox/`.
- **Sync nocturno 2:00** — respalda el workspace de personal a su repo privado
  `businessos-personal` (modelo: un repo por vertical, horarios escalonados;
  ver FASE0 §9). No incluye `.env` ni secretos.

---

## Decisiones registradas

- 2026-06-26 — Semilla inicial del MEMORY de personal. *(El "dreaming" irá
  completando las secciones a medida que captures notas.)*
