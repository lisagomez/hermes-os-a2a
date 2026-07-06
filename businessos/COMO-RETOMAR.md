# Cómo retomar — BusinessOS

Guía rápida para volver a entrar y operar. Estado al 2026-07-05:
**negocio (@a2aTeamBot) vive en Hetzner**; personal + clientes siguen en la máquina WSL2 local.

| Recurso | Dónde |
|---------|-------|
| Servidor (runtime de negocio) | Hetzner cx33 · Falkenstein · **`167.233.233.56`** |
| Repo + compose en el server | `/home/hermes/repo/businessos` |
| Volumen de negocio | `/home/hermes/businessos/negocio/.hermes` |
| Este repo (desarrollo) | `/home/gsore/code/a2aboths` |

---

## 1. Hablar con el bot (sin login)

**@a2aTeamBot** corre 24/7 en Hetzner. Solo mándale un mensaje por **Telegram**. No hay que entrar a nada.

## 2. Entrar al servidor (para operarlo)

Desde tu terminal WSL:
```bash
ssh hermes@167.233.233.56
```
Entra con tu llave, sin contraseña. Estás dentro cuando el prompt diga `hermes@businessos:~$`.

Todo vive en:
```bash
cd ~/repo/businessos
```
Comandos útiles:
```bash
docker compose ps                      # qué está corriendo
docker compose logs -f hermes-negocio  # logs del bot (Ctrl+C para salir)
docker compose restart hermes-negocio  # reiniciar el bot
docker compose up -d                    # levantar el núcleo (negocio+grafo+grafo-db+a2abot)
```

Sumar servicios a demanda (perfiles):
```bash
docker compose --profile verticales up -d   # + personal + clientes
docker compose --profile trio up -d         # + ejecutor + supervisor
docker compose --profile a2a up -d          # + grafo-a2a
```

## 3. Ver el dashboard (Mission Control)

En tu PC, deja esta ventana abierta:
```bash
ssh -L 9200:localhost:9200 hermes@167.233.233.56
```
Y abre en el navegador: **http://localhost:9200** (AI Spend + Pantheon + Grafo).

## 4. Gestionar el servidor por CLI (crear/apagar/precios/costo)

El token de Hetzner ya está en `~/.config/claude/secrets.env`.
```bash
cd ~/printing-press/library/hcloud
source ~/.config/claude/secrets.env
./hcloud-pp-cli servers list --json     # estado
./hcloud-pp-cli burn --json             # costo mensual real corriendo
```

## 5. Seguir con Claude Code

Abre Claude Code en `/home/gsore/code/a2aboths` y escribe **`/primer`** para recargar todo el contexto. La memoria ya sabe que negocio vive en Hetzner y cómo se migró.

---

## Reglas de oro (para no romper nada)

- **NO correr `docker compose up` de negocio en la máquina WSL2 local.** El token de @a2aTeamBot
  ahora vive en Hetzner; Telegram permite una sola conexión por token → chocarían. (personal y
  clientes en local están bien, tienen tokens distintos.)
- Escalar el server: `cx33 → cx42` es **resize en caliente** desde la consola de Hetzner
  (minutos, sin reprovisionar).
- Apagar el server en Hetzner **no** deja de cobrar (reserva recursos); pausa real = snapshot + delete.

## Pendientes anotados

- [ ] Cron nocturno de respaldo de negocio (a un repo privado `businessos-negocio`)
- [ ] Migrar personal + clientes a Hetzner (mismo patrón que negocio — ver `.claude/memory/project/despliegue-hetzner.md`)
- [ ] Decidir cierre de root SSH (hoy abierto con llave para poder operar el server)
