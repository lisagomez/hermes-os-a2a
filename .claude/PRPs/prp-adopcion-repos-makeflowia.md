# PRP — Adopción acotada de los repos Makeflowia

**Origen:** auditoría de los 6 repos (`auditoria-repos-vs-hermes-os.md`, 2026-08-05)
**Alcance:** 4 adopciones + 1 gate legal. Todo lo demás queda declarado y **fuera** de esta ronda.
**Regla de la ronda:** un PR por adopción. No se mezclan. Ninguna avanza si la anterior no cerró su gate.

---

## Invariantes que no se negocian en ninguna de las 4

1. **Aislar, no fundir.** Lo que entra al plano A2A se **reescribe en Python** con la superficie de siempre — exactamente `{card, rpc, /health}`, sin `/docs` ni `/openapi.json`. No se copia TypeScript al servidor "porque ya existe".
2. **Cero tokens donde se puede.** Ninguna de las 4 adopciones introduce una llamada a modelo nueva. Si una la necesitara, se declara **inactiva** hasta que pase por la doctrina de exclusión (2026-07-28) y el OK de la dueña.
3. **Fallo visible.** Nada best-effort silencioso. Todo skip, error o degradación se imprime y deja rastro. Un escritor por origen; si no persiste, la tarea sale `failed` reintentable.
4. **Sin secretos en el agente.** Las claves nuevas viven en el `.env` del servicio que las usa, nunca en el volumen de Hermes ni en la imagen.
5. **Gate humano en lo irreversible.** Merge a main, DDL en producción, envío al cliente y firma: siempre Elisa. La management API solo con permiso explícito por operación.
6. **Nada se declara hecho sin runtime.** Gate de imagen (build + arranque efímero) + smoke dentro de `hermes-net` antes de marcar `[x]`.

---

## PASO 0 — Gate legal BO-AT (bloqueante de 2, 3 y 4) — ✅ RESUELTO 2026-08-09

> **Decisión de Elisa (2026-08-09): Escenario A — misma casa.** Makeflowia Lab y
> Hermes OS son la misma casa; la adopción es libre y **las adopciones 2, 3 y 4
> quedan desbloqueadas**. Registrado en `businessos/negocio/MEMORY.md`, que es la
> salida que este paso exigía.
>
> Lo que el Escenario A **no** exime: sigue en pie cablear `verificar-origen.mjs`
> como gate del Supervisor en el departamento de adquisición. No es condición para
> arrancar las adopciones, pero es parte de darlas por terminadas.

**No es una tarea de ingeniería. Es una decisión de la dueña, y bloquea todo lo que copie o derive código de estos repos.**

La licencia BO-AT 1.0 concede uso, modificación, rebranding y venta, con **una** condición: declarar el origen en cuatro puntos —`ORIGEN.md` íntegro con marcador `BO-ORIGEN-v1`, README, **la interfaz visible del producto**, y los metadatos del paquete—. El artículo 6 **termina la licencia** mientras falte la atribución.

Dos escenarios, y el ejecutor no elige:

- **(A) Makeflowia Lab y Hermes OS son la misma casa** → no hay conflicto. Se adopta libremente y, de pilón, `verificar-origen.mjs` se cablea como **gate del Supervisor** en el departamento de adquisición, junto a `plantilla_contrato_intacta` y `politica_intocable` (mismo espíritu de integridad sha256).
- **(B) Son casas distintas** → adoptar código de estos repos obliga a poner *"basado en el Business OS de Makeflowia Lab"* en el pie de Mission Control **y en los productos que se vendan a clientes**. Eso es una decisión comercial y legal, no técnica.

**Salida del Paso 0:** una línea escrita en `negocio/MEMORY.md` con el escenario elegido y la fecha. Sin esa línea, las adopciones 2, 3 y 4 no arrancan. — **Hecha el 2026-08-09** (Escenario A).

> **La adopción 1 NO depende de este gate**, porque no se copia código: se reimplementa en Python desde una especificación de comportamiento (formato de audio, endpoint, modelo). Empieza por ahí mientras se resuelve el Paso 0.

---

## ADOPCIÓN 1 — Motor STT real en `transcripcion-a2a`

**Qué cierra:** el `[~]` de voz de FASE 0 (entrada) y el hito 3 del paquete EG.CRM.
**Por qué es la primera:** el servicio ya existe en el puerto 4800 con motor pluggable, mock por default, y la regla `STT_ENGINE` desconocido = no arranca. **Solo falta el motor.**

### Qué construir

`GroqWhisperEngine` como segundo motor del pluggable existente, activado con `STT_ENGINE=groq`.

- Modelo `whisper-large-v3` contra `https://api.groq.com/openai/v1/audio/transcriptions`, multipart, `response_format=json`.
- **Gotcha obligatorio:** Telegram entrega las notas de voz como `.oga` y Groq rechaza esa extensión. Renombrar a `.ogg` antes de subir — es el **mismo códec**, solo cambia la extensión. Si esto falta, todo audio real falla y los tests con `.wav` no lo cazan.
- Audio por el volumen `adquisicion-audio` en **solo lectura**, como hoy.
- Persistencia con **escritor único** en `transcripciones`. Fallo de POST = `failed` reintentable, visible en log.
- `GROQ_API_KEY` solo en el `.env` del servicio. Ausente o vacía → **el servicio no arranca** (misma invariante que el `STT_ENGINE` desconocido; no degradar en silencio a mock).

### Fronteras

- **Sin LLM.** Es un puente determinista, patrón `grafo-a2a`/`ventas-a2a`. La transcripción no se resume, no se interpreta, no se corrige "para que lea mejor".
- **La card no miente:** anuncia transcribir audio a texto. No anuncia diarización, ni idiomas que no se probaron, ni análisis.
- **TTS de salida queda FUERA de esta ronda.** Voz saliente por Telegram es cara al usuario y es decisión aparte de la dueña.

### Costo — no dejarlo mudo

Groq Whisper se tarifa por **hora de audio**, no por tokens: no cabe en `token_usage` sin ensuciar el ledger. Registrar el consumo (segundos de audio × tarifa) como **hueco declarado**, con el mismo criterio de `filas_sin_costo`. Un costo invisible es un costo que la alerta del 80% no ve.

### Gates de cierre

- [ ] Los 21 tests existentes siguen verdes + tests nuevos del motor (incluido `.oga` → `.ogg`).
- [ ] Interop con el cliente real del SDK A2A.
- [ ] Test de opacidad: superficie **exactamente** `{card, rpc, /health}`.
- [ ] Gate de imagen: build + arranque efímero (recordar el gotcha de Fase 9 — **todo módulo Python nuevo exige su `COPY` en el Dockerfile**, los tests de dev no lo cazan porque corren desde el fuente).
- [ ] Smoke en `hermes-net` con **audio real**, no sintético: transcripción → fila verificada en `transcripciones` de producción.
- [ ] `ss -tlnp` confirma 4800 solo en `127.0.0.1`.

---

## ADOPCIÓN 2 — Reparador determinista antes del reintento con modelo

**Qué cierra:** hoy, cuando el Supervisor rechaza por infra, el Ejecutor reintenta **quemando presupuesto de GLM-5.2**. Pasó dos veces en el dogfood de Fase 6, y ambas el modelo no tenía la culpa.

### Dónde vive

Entre el veredicto rechazado y el reintento. **Lo llama el Ejecutor**, sobre el worktree de la tarea, **antes** de tocar `presupuesto_usd`.

```
Supervisor → RECHAZADO con hallazgos
   ↓
self-heal (determinista, cero tokens)
   GATE → clasificar síntoma → fix acotado → RE-GATE
   ↓
curado → revalidar con el Supervisor (sin gastar modelo)
revertido → reintento con modelo, con el hallazgo ORIGINAL intacto
escalado → al humano, sin tocar nada
```

### Catálogo

`reglas/fixers-software.toml` — versionado en el repo, formato TOML como el resto de las reglas (no JSON), y **el motor no puede editarlo**. Arranca con los cuatro casos que ya están probados en la práctica:

| id | Cuándo | Acción |
|---|---|---|
| `missing-deps` | módulo/paquete no encontrado | `npm install` → re-gate; si no cura, revierte el lockfile |
| `phantom-lockfile` | lockfile en carpeta padre confunde al bundler | **escala** (archivo fuera del repo, irreversible) |
| `config-env-missing` | variable de entorno ausente | **escala** — es configuración del humano, no código roto |
| `dubious-ownership` | git aborta por uid del bind-mount | tu gotcha ya conocido, ahora automatizado |

### Invariantes propias

- Nunca toca `main`. Solo el worktree de la tarea.
- **Nunca commitea.** Deja el diff para veto humano.
- Lista negra dura: no acepta `any`, `@ts-ignore`, `eslint-disable`, borrar archivos ni truncar/reducir tests. Un fix que apaga el gate no es un fix.
- Tope de archivos tocados y tope de intentos. Al agotarse: revierte y devuelve el hallazgo original **sin editar**.
- Síntoma sin fixer = **escala**, jamás "asumido". Misma doctrina que el gate no corrible del Supervisor.
- **El fixer tipo LLM del repo origen NO se adopta** en esta ronda: introduce un modelo nuevo (`gpt-4o-mini`) sin pasar por la doctrina de exclusión, y rompe el cero-tokens. Se declara en el catálogo como **inactivo**, igual que `code_review` y `security_review`.

### Medición

Contador de rechazos por infra curados sin modelo. Si en un mes no cura ninguno, el catálogo está mal y se revisa — no se amplía por fe.

### Gates de cierre

- [ ] Tests del clasificador y del rollback (incluido: fix que no cura → estado idéntico al previo, byte a byte).
- [ ] Prueba en vivo: romper el scaffold de `trio-repo` de las 4 formas del catálogo y verificar cura, reversión y escalamiento.
- [ ] Verificado que **no** se llamó a ningún modelo en todo el ciclo (log limpio de `token_usage`).

---

## ADOPCIÓN 3 — Tres gates nuevos en el Supervisor (departamento software)

**Contenido nuevo para un mecanismo que ya existe.** No se toca el motor: se agregan reglas a `reglas/software.toml`. La invariante se mantiene — **regla activa sin runner = el servicio no arranca**.

| Gate | Runner | Umbral | Nota |
|---|---|---|---|
| `a11y` | Playwright + axe (Chromium ya está en la imagen desde 2026-07-09) | WCAG AA: roles/labels, contraste, foco visible, `alt` | Solo tareas que tocan UI |
| `web_vitals` | Lighthouse en **lab** | LCP < 2.5s · CLS < 0.1 · INP < 200ms | **Declarar el límite en la regla:** es lab, no producción. Un gate que se cree campo no sirve |
| `costo_tarea` | `v_costeo_tarea` | costo real ≤ `presupuesto_usd` declarado en la TAREA | **Adaptación deliberada** (ver abajo) |

### Sobre `costo_tarea` — por qué no es el gate del repo origen

La skill original mide **costo-IA por usuario activo**, métrica que hoy no puedes calcular: no hay base de usuarios. Lo que **sí** tienes, y con precisión quirúrgica tras el fix del ledger, es el **costo real por tarea**. El gate se adapta a eso: una tarea que rebasa su presupuesto declarado no se aprueba sola. Cuando haya usuarios de verdad, la métrica original entra por `outcomes` — otra ronda.

### Alcance

- Solo `software.toml`. **No se toca `adquisicion.toml`** en esta ronda.
- Cada gate arranca **inactivo** y se activa uno por uno, verificando que su runner corre de verdad sobre el worktree. Activar los tres de golpe es cómo se rompe un servicio que ya funciona.

---

## ADOPCIÓN 4 — Documentos de cumplimiento de las superficies públicas vivas

**Qué cierra:** tienes superficies capturando datos y cobrando **hoy**, sin los documentos que las cubren.

### Paso 1 — Inventario (primero, y por escrito)

Enumerar cada superficie pública viva con: qué datos captura, de quién, en qué jurisdicción y con qué terceros los comparte. Como mínimo: `cliente-web2` (checkout Polar), `/reservar/*` de meeting-copilot, la línea CRM marca blanca, el buzón agéntico, y la card pública de `ventas-a2a` vía el edge de Caddy.

Sin inventario no hay documento honesto — solo plantilla genérica, que es peor que nada porque promete cobertura que no existe.

### Paso 2 — Generar

Por superficie, no genérico: Aviso de Privacidad MX (corto + integral, LFPDPPP), Términos, **divulgación de uso de IA** con advertencia de posibles errores, límite de responsabilidad, flujo de borrado (derecho al olvido), y política de cookies si aplica.

### Paso 3 — Validar por el grafo

Cada documento entra a `validar-contratos.py` → dimensión contractual, país del cliente → banderas con fuente citada → `en_revision`. Se aplica la regla de oro completa: **disclaimer siempre, cero afirmación sin fuente**.

### Paso 4 — Firma

**Solo Elisa.** El sistema señala; el profesional decide. Ninguno de estos documentos es asesoría legal y así debe decirlo.

### Frontera

Los claims de la landing y del pitch deck ya están fijados por test parametrizado contra `claims_aprobados`. **Esta adopción no los toca.** Si un documento nuevo obliga a cambiar un claim, eso es una tarea aparte con su propio gate.

---

## Lo que NO se aplica en esta ronda (declarado, no olvidado)

| Pieza | Por qué espera |
|---|---|
| `vertical-pack` + `factory-brain` | Tanda 3. Son procedimiento, y el procedimiento se escribe cuando las 4 de arriba hayan dejado aprendizajes reales que destilar |
| Multi-tenant `uuid` vs slug | Bloqueado por decisión previa (choque de tipo en `tenant_id`). La evidencia de v6 es insumo para decidir, no permiso para migrar |
| Catálogo de v6 (SocialFlow / CampaignOS / CRM B2B) | Es oferta comercial, no código a fundir. Entra por Adquisición cuando exista `vertical-pack` |
| `outcomes` | Necesita usuarios reales que medir |
| `rules-engine` (json-rules-engine) | Comparar contra el motor TOML actual antes de decidir. No se sustituye lo que funciona sin evidencia |
| Avatar (Raziel / HeyGen) | Decisión comercial de la dueña, con costo por minuto y dependencia de un tercero |
| Consejo de cc-hermes, `parallel-build` | El trío y el Coordinador ya lo hacen, y mejor |
| Stripe, Neon+Prisma, `cost-optimizer`, skills de mission-control | Descartados con motivo en la auditoría §5 |

---

## Orden y criterio de cierre

```
PASO 0 (decisión de la dueña) ──┐
                                 ├─→ ADOPCIÓN 2 → ADOPCIÓN 3 → ADOPCIÓN 4
ADOPCIÓN 1 (arranca ya) ─────────┘
```

Cada adopción cierra cuando: PR mergeado con OK humano · tests verdes sin regresión en los servicios existentes · gate de imagen PASS · smoke en `hermes-net` verificado en runtime · línea de estado en el archivo de memoria de la fase correspondiente.

**Ninguna se marca `[x]` en el ROADMAP por estar construida.** Se marca por estar corriendo y verificada — como todas las anteriores.
