# Estándar de colaboración humano + agentes (v2)

> **Propósito.** Propuesta para revisión del equipo (humanos y agentes). Complementa el
> `CONTRIBUTING.md` existente; no lo reescribe. Nada cambia hasta que este PR se mergee y se activen
> los settings que se indican. Cada recomendación va **respaldada con fuentes primarias 2025-2026**
> (org + fecha + URL), no con opinión: la idea es que puedan evaluarla contra su propio setup.

## 1. Contexto de la industria (2025-2026), para ubicar la propuesta

Cuando parte del código lo escriben agentes de IA, la práctica que se consolidó en la industria
**no** es "un humano revisa cada línea de cada PR" ni "la IA mergea sola". Es un modelo de **3 capas,
llamado human-review-by-exception**:

1. **Revisor-IA automático** en cada PR: filtra estilo y riesgos obvios, **no bloquea el merge**.
2. **El autor valida** antes de pedir revisión.
3. **Gate de merge real:** CI verde obligatorio + **firma humana por excepción, según el riesgo**.

Fuentes: GitHub, "Agent pull requests are everywhere: here's how to review them", 2026-05-07
(https://github.blog/ai-and-ml/generative-ai/agent-pull-requests-are-everywhere-heres-how-to-review-them/);
Forrester, marco "Agentic Development Security" con gobernanza de revisión humana por umbral de
riesgo, abr-2026 (vía Augment Code, fuente secundaria:
https://www.augmentcode.com/guides/agentic-development-security).

Dos hallazgos con datos que sostienen el modelo:
- **Un modelo es mal juez de su propio trabajo.** CodeRabbit reporta 64.5% de tasa de fallo cuando
  un modelo intenta corregir sus propios errores, y que modelos de la misma familia se aprueban
  entre sí 9 a 17 puntos porcentuales más seguido que un revisor independiente; lo conectan a SOC 2
  (segregación de funciones). CodeRabbit, "Code review needs independence", 2026-06-17
  (https://www.coderabbit.ai/blog/code-review-needs-independence).
- **El código con autoría IA trae más defectos.** CodeRabbit, sobre una muestra de 470 PRs
  open-source (autoría IA inferida por señales de co-autor, limitación reconocida por los autores):
  ~1.7x más issues por PR y hasta 2.74x más vulnerabilidades que el código solo-humano.
  "State of AI vs Human Code Generation", 2025-12-17
  (https://www.coderabbit.ai/blog/state-of-ai-vs-human-code-generation-report).
- **La velocidad sin controles degrada la estabilidad.** DORA 2025: la adopción de IA correlaciona
  con más throughput pero **menor estabilidad** (más change-failure, más rework), y "la IA amplifica
  lo que ya existe". DORA, "State of AI-assisted Software Development 2025"
  (https://dora.dev/dora-report-2025/).

Conclusión que se saca de ahí (no nuestra opinión): con agentes se puede ir mucho más rápido, pero
el gate que reemplaza al ojo humano tiene que ser **mecánico e independiente**, no la firma del
mismo que escribió el código.

## 2. Principio rector

El humano sale de la **lectura línea por línea**, NO del **loop**. Lo reemplazan gates mecánicos
(CI verde, tests, escaneos, un verificador independiente que no escribió el código); la firma humana
se concentra **por excepción, según riesgo**. Se confía en señal verificable (un test que corre),
no en lo que un agente dice de sí mismo.

## 3. Ruteo por riesgo (blast radius)

| Nivel | Ejemplos | Gate |
|---|---|---|
| **L0 trivial** | script interno, doc, prototipo desechable | CI verde -> merge. Sin ceremonia. |
| **L1 normal** | feature acotada, fix localizado | CI verde + revisor-IA + el autor valida. Humano por muestreo. |
| **L2 alto** | auth, pagos, datos de cliente, migraciones, CI/infra | CI verde + debate adversarial del plan + verificador del diff + firma humana. |
| **L3 irreversible** | dinero, cara al cliente, deploy a prod, firma | Todo L2 + aprobación humana nominada. Nunca el agente solo. |

En L0/L1 el debate y el ojo humano serían ceremonia; se omiten. Ahí está la ganancia de velocidad.

## 4. Piso mecánico de CI

`.github/workflows/ci.yml` corre `typecheck` + `lint` en cada PR del dashboard. Un PR no se mergea
con CI en rojo. Sin verificación, un cambio no es de bajo riesgo por defecto. Los servicios A2A
(Python) ya tienen su `pytest`; sumarlo al CI cuando se cablee. Anthropic recomienda darle al agente
una verificación que pueda correr (tests/build) como definición de "hecho", no su propia opinión.
Anthropic, "Claude Code best practices" (https://code.claude.com/docs/en/best-practices).

## 5. El verificador es de solo lectura (por qué importa)

Este repo ya tiene el **Supervisor A2A** como juez read-only del trío: buen patrón. A nivel de
Claude Code se suman dos agentes hermanos en `.claude/agents/`: `verificador-qa` (verifica antes de
integrar) y `atacante-adversarial` (red team del plan). Su valor es que **no tienen herramientas de
edición**: no pueden arreglar lo que auditan, por eso su veredicto es confiable, y corren en
**contexto fresco** (solo ven el diff y el criterio, no el razonamiento que produjo el cambio).
Anthropic lo recomienda explícito: que un modelo fresco intente refutar el resultado, porque "no
estará sesgado hacia el código que acaba de escribir". Anthropic, best practices (mismo enlace).

## 6. Nota de gobernanza (opcional, decisión del dueño del repo)

Contexto de plataforma: GitHub, por defecto, **impide que una GitHub Action apruebe PRs** (ajuste
"Allow GitHub Actions to create and approve pull requests", desactivado por defecto), y Microsoft
recomienda que un agente tenga **identidad propia** y **roles distintos para lectura vs escritura**,
porque "un agente nunca debería tener más privilegios que tú". GitHub Changelog, 2022-01-14
(https://github.blog/changelog/2022-01-14-github-actions-prevent-github-actions-from-approving-pull-requests/);
Microsoft Security, "Least privilege for AI agents", 2026-07-16
(https://www.microsoft.com/en-us/security/blog/2026/07/16/least-privilege-for-ai-agents-identity-access-and-tool-binding/).

Aplicado a un flujo donde el agente mergea: si el merge depende de que una identidad **baje la
protección de rama** (p.ej. reducir la revisión requerida) y esa misma identidad construye el
código, el control deja de proteger de esa identidad. Alternativa mecánica: gatear el merge por
**required status checks** (CI verde) en vez de por conteo de revisión, y dar al agente una cuenta
con push pero **sin permiso de admin** sobre la protección. Así "CI verde = merge", rápido, y
**ninguna identidad puede bajar su propio muro**. Tiene un costo (montar el status check como gate);
la decisión es del dueño del repo.

Riesgo adicional a tener presente en cualquier pipeline con agentes: no usar `pull_request_target`
con checkout de la rama del PR en un workflow que invoque un agente (vector con explotación real).
Aikido, "PromptPwnd", 2025-12/2026-03 (https://www.aikido.dev/blog/promptpwnd-github-actions-ai-agents).

## 7. Fuentes (todas primarias salvo lo marcado)

- GitHub, "Agent pull requests are everywhere", 2026-05-07.
- Forrester "Agentic Development Security", abr-2026 (vía Augment Code, secundaria).
- CodeRabbit, "Code review needs independence", 2026-06-17.
- CodeRabbit, "State of AI vs Human Code Generation", 2025-12-17 (autoría IA inferida, no confirmada).
- DORA, "State of AI-assisted Software Development 2025".
- GitClear, "The AI Code Quality Maintainability Gap", ene-2026
  (https://www.gitclear.com/the_ai_code_quality_maintainability_gap): duplicación de bloques +81%
  desde 2023, refactorización -70%.
- Anthropic, "Claude Code best practices".
- GitHub Changelog (Actions approve PRs 2022-01-14; required-reviewer-rule GA 2026-02-17).
- Microsoft Security, "Least privilege for AI agents", 2026-07-16.
- Aikido, "PromptPwnd", 2025-12/2026-03.
