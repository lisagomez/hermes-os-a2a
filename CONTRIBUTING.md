# Contribuir a Hermes OS · A2A

Guía para el equipo. Trabajo **100% remoto**: humanos + agentes sobre el mismo repo.

## 0. Reglas de oro (léelas una vez)

- **NUNCA `git push origin master`.** Todo cambio entra por Pull Request con al menos
  1 review. Vale también para el agente.
- **NUNCA `docker compose up` de una vertical (negocio / personal / clientes)** en tu
  máquina ni en tu Codespace. Los bots viven 24/7 en el servidor (Hetzner) y Telegram
  permite **una sola conexión por token**: los chocarías. Aquí se desarrolla y se corren
  tests; los bots corren en producción.
- **Sin secretos en el código.** Los `.env` están git-ignored. Nadie commitea llaves.
- Aprobación humana obligatoria en lo irreversible: **merge a master, deploy, cara al
  cliente y dinero**.

## 1. Entrar (entorno de desarrollo remoto)

Dos formas, ninguna instala nada en tu compu:

**a) GitHub Codespaces (recomendado).** En el repo → **Code ▸ Codespaces ▸ Create
codespace on master**. Levanta el devcontainer (Python 3.12 + Node 22), instala todo
solo y te deja listo.

**b) VS Code local + Dev Container.** Clona, abre en VS Code con la extensión
*Dev Containers*, "Reopen in Container". Mismo entorno.

El contenedor te deja listos: el dashboard Next.js, los 6 servicios Python con su venv
compartido, y los frontends.

## 2. Correr las cosas

| Qué | Comando |
|---|---|
| Dashboard (Mission Control) | `npm run dev` → http://localhost:3000 |
| Typecheck / lint del dashboard | `npm run typecheck` · `npm run lint` |
| Tests de un servicio A2A | `cd businessos/<servicio> && ../.venv/bin/python -m pytest -q` |
| Frontends | `cd businessos/frontends/<app> && npm run dev` |

Servicios A2A: `grafo-a2a`, `ejecutor-a2a`, `supervisor-a2a`, `coordinador-a2a`,
`ventas-a2a`, `grafo`. Corren con **motores mock (cero tokens)** por defecto — no
necesitas secretos de producción para desarrollar ni testear.

## 3. Contribuir código (flujo de PR)

```bash
git switch -c tu-rama/lo-que-haces
# ...cambios + tests verdes...
git push -u origin tu-rama/lo-que-haces
gh pr create --fill --base master
```

- `master` está protegida: **no admite push directo**, hace falta PR + aprobación.
- Corre los tests del servicio que tocas **antes** de pedir review.
- ¿Añadiste un módulo Python nuevo a un servicio? Súmalo a su `Dockerfile` (COPY
  explícito) en el MISMO PR, o el runtime crashea (lección viva del repo).

## 4. Pedirle trabajo a los agentes

El trío (**Hermes → Ejecutor → Supervisor**) construye software por ti. No le pides al
bot que programe él: le pides una **feature** y el trío la descompone, la ejecuta en un
worktree aislado y la valida con gates antes de que toque nada.

Canales:

- **Telegram — grupo A2ATeamGroup** (`@a2aTeamBot`): avisos, preguntas rápidas
  ("¿cómo va el presupuesto?"), agendas. Ahí caen el digest diario (08:00) y el cierre
  semanal (lunes 08:00).
- **Slack — `#dep-negocio`** (workspace A2AMassivo): centro de trabajo del equipo.
  @menciona a `@Hermes Negocio`.
- **Slack — `#dep-desarrollo`**: la **bandeja del trío**. Pides una feature, el Ejecutor
  **la encola** (te responde posición en ~1 s) y un worker serial la va drenando; un
  aviso al canal te dice el desenlace. Solo Elisa reordena la cola.

Qué esperar: la cola es **serial** (un trabajo a la vez, 8 GB de RAM). `fan_out_max`
compra **orden**, no velocidad.

## 5. Qué decide un humano (matriz)

| Acción | Quién |
|---|---|
| Merge a master | Reviewer humano (en el PR) |
| Enviar algo a un cliente | PM / CEO |
| Cobrar / mover dinero | CFO |
| Firmar contrato | Solo Elisa |
| Deploy a producción | Humano |

Todo lo demás —redactar, proponer, construir en rama, validar por gates— lo hace el
agente. Matriz completa de roles: `businessos/departamentos/equipo-y-slack.md`.

---

¿Una tool del bot falla o algo de infra no responde? **No es tu bug** — repórtalo, no
intentes depurar Docker/servidor.
