# Recomendación de recursos — App B (`reuniones-a2a`) · Paso 0 del encargo 3-apps

> **Entregable #4 del encargo** (2026-07-30): evaluación de recursos del servidor **antes
> de escribir una línea de código** de la App B. El paso 2 del encargo es explícito:
> *"Implementar SOLO lo que quepa según la recomendación del Paso 0"*. Este documento es
> ese gate.
>
> **Método (fijado por el propio encargo):** solo lectura de archivos del repositorio y
> aritmética — cero llamadas a APIs externas, cero SSH al servidor. Toda cifra de este
> documento es reproducible desde `businessos/docker-compose.yml` en el commit de este PR.

---

## 1. Inventario — qué declara el compose y qué corre en el servidor

Servidor: Hetzner **cx33 — 4 vCPU / 8 GB RAM + 2 GB swap** (ROADMAP FASE 0; despliegue
2026-07-05). Los 20 servicios del compose, por perfil, con sus límites declarados
(`deploy.resources.limits`):

| Perfil | Servicios | Σ memoria (techo) | Σ vCPU (techo) | ¿Corre en el servidor? |
|---|---|---|---|---|
| *(núcleo, sin perfil)* | hermes-negocio 2G, frontend-ci 1G, a2abot 512M, grafo 512M, grafo-db 512M | **4.50 GB** | 4.0 | Sí (siempre: `up -d` plano) |
| `verticales` | hermes-personal 2G, hermes-clientes 2G | 4.00 GB | 3.0 | Sí (migradas 2026-07-05) |
| `a2a` | grafo-a2a, ventas, chat-web2, crm-canales, sup-crm, transcripcion, buzon, enriquecimiento — 8 × 256M | 2.00 GB | 4.0 | Sí (enriquecimiento desde 2026-08-02, PR #214) |
| `trio` | ejecutor 2G, supervisor 2G, coordinador 2G | 6.00 GB | 3.0 | Sí (Fases 6–10 en runtime) |
| `edge` | edge 256M | 0.25 GB | 0.5 | Sí (rebuilds documentados con `--profile a2a --profile edge`) |
| `dashboard-nativo` | dashboard 512M | 0.50 GB | 0.5 | Presumido NO (redundante con a2abot; sin evidencia de despliegue) |
| **Total desplegado (sin dashboard-nativo)** | 19 servicios | **≈16.75 GB** | **≈14.5** | sobre 8 GB / 4 vCPU físicos |

Dos notas de honestidad del inventario:

- El comentario del encabezado del compose ("núcleo mínimo ~3.5 GB") estaba rancio:
  `frontend-ci` (1G) se sumó al núcleo **sin perfil** el 2026-07-15 y nadie actualizó la
  cifra. El núcleo real siempre-activo es **4.5 GB de techo**. (Corregido en este PR.)
- La clasificación "¿corre?" sale de documentos del repo (ROADMAP, memoria de despliegue),
  no de observar el servidor — esta máquina no tiene SSH. Si algún perfil está apagado en
  la realidad, el margen mejora, nunca empeora.

## 2. El hallazgo central: la aritmética de techos ya es negativa HOY

**8 GB físicos − 16.75 GB de techos declarados = −8.75 GB.** El servidor está **~2×
sobre-suscrito en memoria y ~3.6× en CPU por diseño declarado** — y el propio compose lo
admite: *"los limits están sobre-suscritos: solo sobreviven gracias al swap"*. Esto
funciona porque `deploy.resources.limits` es **techo, no reserva**: la sobre-suscripción
solo muerde si todos los servicios pican a la vez.

Consecuencia metodológica que este documento no va a esconder: **la resta que pide el
encargo ("8 GB − Σ límites = headroom") no produce un número positivo ni útil.** El
margen real del servidor es una **incógnita** desde esta máquina; el único dato que la
resuelve es un muestreo de uso real en el servidor:

```bash
# En el servidor (pedido a quien tenga SSH — 30 segundos, cero riesgo):
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.CPUPerc}}" && free -h
```

**Ese snapshot es el insumo decisivo para la decisión del modo stream** (§3.1). Lo que
sigue es lo máximo que la aritmética honesta permite afirmar sin él.

## 3. Las tres respuestas que pide el encargo

### 3.1 ¿Cabe el stream nativo (Zoom RTMS vía WebSocket)?

**Sí en su propio consumo; condicionado en el contexto — proceder con diseño austero y
confirmar con el snapshot.**

- El servicio `reuniones-a2a` en modo stream es **I/O-bound**: recibe audio por WebSocket
  y lo reenvía. Con el patrón estándar del perfil `a2a` (256M / 0.5 vCPU) su techo
  incremental es **+256M sobre 16.75 GB ya declarados (+1.5%)** — marginal.
- El costo pesado del audio NO vive en esta caja **por doctrina**: el encargo ordena que
  el STT de audio de cliente vaya a un proveedor con ZDR (o 503 fail-closed). Transcribir
  localmente (faster-whisper) SÍ cambiaría la ecuación (≥1 GB + CPU sostenida) — esa
  decisión, si algún día se toma, exige re-abrir este análisis.
- Condición: como el margen real es incógnita (§2), el visto bueno final del modo stream
  lo da el snapshot de `docker stats`. Si el uso real del servidor ronda ya los 7+ GB,
  primero hay que apagar o adelgazar algo (candidato obvio: ¿de verdad necesita
  `frontend-ci` 1G en el núcleo?).

### 3.2 ¿`transcripcion-a2a` :4800 aguanta más carga?

**La pregunta está mal planteada y conviene decirlo de frente: hoy no hay carga que
aguantar, porque el motor STT real no existe.**

- `businessos/transcripcion-a2a/stt.py:19` → `MOTORES_SOPORTADOS = ("mock",)`. El
  servicio es un esqueleto de protocolo con motor simulado; los candidatos reales
  (faster-whisper, etc.) siguen "por elegir".
- Su contrato de entrada es fijo (`{lead_id, audio_path, asesor, modalidad, ...}`) y **no
  tiene `reunion_id` ni `tenant_id`** — la App B no puede colgarse de él sin una
  adaptación de contrato (campo aditivo), que debe entrar en el paso 2 de la App B, no
  improvisarse.
- En recursos: 256M / 0.5 vCPU declarados y consumo real ~nulo (mock). El "límite" de
  :4800 no es de capacidad sino de **existencia del motor** — y cuando el motor exista,
  la doctrina ZDR empuja a que sea remoto, no local (ver §3.1).

### 3.3 ¿El modo bot (Chrome headless) exige escalar la máquina?

**Sí — y el eje decisivo es CPU, no memoria.**

- Un bot de reuniones corre un Chrome headless que **decodifica audio/video en tiempo
  real**: en la práctica ~1–2 vCPU sostenidos + 1–1.5 GB por reunión concurrente. La caja
  tiene **4 vCPU físicos con ≈14.5 ya prometidos**; la sobre-suscripción de CPU (~3.6×) es
  proporcionalmente peor que la de memoria, y una carga *sostenida* (no a ráfagas, como
  todo lo demás) es exactamente lo que rompe una sobre-suscripción que hoy convive en paz.
- **Recomendación: NO escalar ahora.** El modo bot queda como **seam declarado — 501 con
  cuerpo explicativo ("requiere escalar máquina")**, tal como el encargo ya preveía. Cero
  costo mientras nadie lo pida.
- Si algún día se activa: el tier de referencia del encargo es **cx43 (8 vCPU / 16 GB,
  ~$18/mes, dato público)**. Contradicción interna a resolver en ese momento:
  `businessos/COMO-RETOMAR.md:83` habla de "cx33 → cx42"; la línea de naming verificada
  el 2026-07-05 fue cx23/cx33 (y por patrón cx43). Verificar nombre y precio contra el
  endpoint `pricing` de Hetzner **al momento de decidir** — no se asienta aquí un tier
  como hecho.

## 4. Presupuesto — no mezclar peras con manzanas

Los **$30/mes** del proyecto son presupuesto de **tokens/LLM** (ROADMAP FASE 1; fuente
única `negocio/MEMORY.md`) — **no** de infraestructura. El hosting es una línea de gasto
aparte: hoy **~$9/mes** (cx33) **sin techo formal fijado**. Comparar "escalar a ~$18/mes"
contra los $30 de tokens sería un error de categoría (parecería comerse el 60% de un
presupuesto al que no pertenece).

- Escalar servidor se evalúa contra los rangos por fase de
  `businessos/plan-escalamiento-hermes.md`, que sí mezcla infra+LLM+plataforma.
- **Fijar un techo de gasto de infraestructura es decisión de Elisa** — este documento
  solo deja claro que hoy ese techo no existe por escrito.

## 5. Mapa de puertos — dos decisiones que el rebase de la App A obliga a dejar escritas

Ocupados hoy (todos en 127.0.0.1): 3000 grafo · 3001 frontend-ci · 4000 grafo-a2a ·
4100/4200/4300 trío · 4400 ventas · 4500 chat-web2 · 4600 crm-canales · 4700 sup-crm ·
4800 transcripcion · 4900 buzon · **5000 enriquecimiento** · 9119 dashboard · 9200 a2abot
(+443 edge, único público).

| Puerto | Asignación | Estado |
|---|---|---|
| 5000 | ~~reuniones-a2a (encargo original)~~ → **enriquecimiento-a2a** | ocupado — el 4900 del spec de la App A lo tomó buzon-a2a (#208) y la App A corrió al 5000 (#210) |
| **5100** | **RESERVADO: `flujos-a2a` (App C)** | el encargo se lo asigna; esta reserva no estaba escrita en ningún archivo del repo — queda escrita AQUÍ para que el paso 0 de la App C no choque a ciegas |
| **5200** | **PROPUESTO: `reuniones-a2a` (App B)** | siguiente libre respetando la reserva de 5100 |

## 6. Qué implementará el paso 2 según esta recomendación

Traducción operativa del *"SOLO lo que quepa"*:

1. **Gate de consentimiento PRIMERO** (sin registro → rechazo fail-closed) — no consume
   recursos, no depende del snapshot.
2. **Modo stream nativo**: SÍ, con límites austeros (256M / 0.5 vCPU, perfil `a2a`,
   puerto 5200), **condicionado al snapshot de `docker stats`** (§2). STT siempre remoto
   con ZDR o 503 — nunca transcripción local en esta caja.
3. **Modo bot: seam 501** con cuerpo explicativo. No se escala máquina; si Elisa decide
   activarlo, se re-abre §3.3 con precio/nombre de tier verificados ese día.
4. **Adaptación aditiva del contrato de `transcripcion-a2a`** (`reunion_id`/`tenant_id`)
   como parte del paso 2 — no existe hoy y sin ella la integración es imposible.

---

*Paso 0 del encargo 3-apps · App B. Elaborado solo con archivos del repositorio y
aritmética (método fijado por el encargo). Pendiente externo: snapshot de `docker stats`
del servidor (§2) antes de dar el visto bueno final al modo stream.*
