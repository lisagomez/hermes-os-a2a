---
name: orquestar-agentes-fable
description: DELTA de la skill `orquestar-agentes` para cuando el modelo del loop principal ES Fable 5. No es autosuficiente: la doctrina completa (filtro maestro, niveles L0-L2, ruteo por blast radius, briefs en frio, paralelizacion, verificacion antes de integrar, escalada, handoff PROGRESS.md) vive en `.claude/skills/orquestar-agentes/SKILL.md` y hay que leerla primero. Aqui vive SOLO lo que cambia cuando dirige Fable: roles (Fable dirige y sintetiza; el atacante es Sonnet 5/Haiku 4.5 con lente escrito si el plan es barato de revertir y Opus 5 si es caro, nunca Fable), debate adversarial como politica POR DEFECTO antes de aprobar cualquier plan ejecutable (no solo lo irreversible) y ante error grave en ejecucion, economia de no-relectura del director, y techo de esfuerzo xhigh (nunca max). Se selecciona por un HECHO de la sesion (el loop corre en Fable), no por creer que Fable sea el mejor modelo: en codigo mergeable Opus 5 le gana. Usar cuando: Fable dirige, variante fable, debate con Opus, sub-director, audita este plan antes de ejecutarlo, plan bajo ataque. NO USAR para: tareas simples inline (Filtro maestro de la madre), ni cuando el director es Opus/Sonnet (ahi manda `orquestar-agentes` a secas).
---

# Orquestar agentes, variante FABLE (delta, no doctrina completa)

> ## ⚠️ LEE PRIMERO LA MADRE. Este archivo NO es autosuficiente.
>
> Doctrina completa: **`.claude/skills/orquestar-agentes/SKILL.md`** (cargala con `Read`
> si no esta ya en tu contexto). Ahi viven el Filtro maestro, los niveles L0-L2, el ruteo por blast
> radius, los briefs en frio, la paralelizacion, la verificacion antes de integrar, la escalada por
> ejes y el handoff `PROGRESS.md`. **Todo eso aplica igual cuando dirige Fable.**
>
> Este archivo es el **delta**: solo lo que cambia. Antes duplicaba las secciones 0-8 de la madre y
> las dos copias se desincronizaron: este archivo se quedo citando a Opus 4.8 como el modelo tope
> despues de que Opus 5 lo relevara, y la madre gano contenido que aqui nunca llego. La duplicacion
> se elimino el 2026-07-26 por eso, no por estetica: sincronizar a mano dos copias de ~450 lineas no
> es un mecanismo.

---

## A. ¿Cuando aplica esta variante? (la premisa cambio, 2026-07-26)

**La variante se selecciona por un HECHO de la sesion: el loop principal corre en Fable 5.** No se
elige porque Fable sea "el modelo de mayor razonamiento": esa premisa, que era la del texto original
(2026-07-01), **ya no la sostiene la evidencia**.

| Eje | Fable 5 | Opus 5 | Lectura |
|---|---|---|---|
| Inteligencia compuesta (Artificial Analysis Index, [I] 2026-07-25) | 60 (#3/190) | **61 (#1/190)** | Empate tecnico, Opus arriba por un punto |
| Razonamiento cerrado (GPQA) | 92.6 | **93.7** | Empate |
| Codigo "mergeable" (FrontierCode, de Cognition [I]) | 46.3% | **53.4%** | Opus 5 gana claro |
| Coding agentico (SWE-Pro) | **80.0-80.3** | 79.2 | Empate estrecho, Fable arriba |
| Escritura creativa/emocional | **#1 en todas las tablas [I]** | sin dato; señal temprana negativa | Fable gana claro |
| Fiabilidad en produccion (uptime / error de salida estructurada) | 94.0% / 8.7-16.2% | **99.7% / 3.5-7.2%** | Opus 5 gana claro |

Etiqueta [I] = fuente independiente verificada. Opus 5 salio el 2026-07-24 y relevo a Opus 4.8 como
flagship; Opus 4.8 sigue disponible, no esta deprecado.

**Consecuencias de ruteo (esto es lo accionable, no la tabla):**

1. **Esta skill NO es un argumento para mandar trabajo a Fable.** Si la tarea es dificil **en codigo**
   (implementar una direccion ya dada, migracion, refactor grande), la evidencia apunta a **Opus 5**.
   Antes de escalar por dificultad hay que decir **en que** es dificil.
2. **Fable sigue siendo la eleccion correcta** para diseño y escritura ABIERTA (elegir la direccion,
   redactar la pieza insignia), razonamiento abierto sin direccion dada, y horizonte largo/autonomia.
   "Diseño delicado" ya no es sinonimo de Fable a secas.
3. **Fable NUNCA para seguridad/cyber/ML ni datos sensibles**, dirija o no: sus clasificadores
   re-enrutan SILENCIOSAMENTE a otro modelo (falsos positivos documentados) y tiene retencion
   obligatoria de 30 dias sin ZDR.

**Y aun asi la variante sigue viva**, por dos razones que no dependen de quien gane el benchmark:
Fable puede ser el modelo del loop cualquier dia (y entonces la pregunta "¿como se trabaja?" necesita
respuesta), y lo que cambia cuando dirige Fable es real: quien ataca, cuando es obligatorio el debate,
y que el director no puede permitirse releer material pesado.

---

## B. Roles

| Rol | Quien | Que hace |
|---|---|---|
| **Director / Orquestador** | **Fable 5** (este loop) | El L0 de la madre §1, con un matiz de costo: su tiempo se invierte en **sintesis y juicio**, no en exploracion repetitiva. Formula, reconcilia y decide; **no relee material pesado** que un subagente puede destilar (§E). |
| **Sub-director / contraparte de debate** | **Opus 5** (subagente) cuando el plan es caro de revertir; **Sonnet 5 / Haiku 4.5 con lente escrito** cuando es barato (§C) | El adversario del protocolo: Fable propone, otro modelo ataca. Opus 5 tambien puede seguir siendo **L1 ejecutor de riesgo** (madre §1): son dos sombreros del mismo modelo. |
| L2 ejecutores | Sonnet 5 / Haiku 4.5 | Igual que la madre. Sin cambios. |

- **Por que Opus 5 y no Opus 4.8 como sub-director:** es el flagship desde 2026-07-24, gana el indice
  compuesto, y su fiabilidad en produccion es claramente mejor. El dato historico de Opus 4.8 en el
  benchmark de esfuerzo (§F) se conserva **etiquetado como 4.8**: se actualiza el ROL, no la cifra.
- **Candado de calibracion:** Opus 5 **NO hereda automaticamente** el rol de verificador de hechos que
  tenia Opus 4.8. Su propio system card admite que la alucinacion factual "subio un poco" y se
  contradice en calibracion; el AA-Omniscience Non-Hallucination Rate lo pone en 49.9%. Mitigacion,
  que aplica sin importar el modelo:
  - Cada objecion del ataque viaja con **evidencia citada** (archivo + linea, salida de comando) y con
    un **"no pude verificar"** explicito cuando no la tiene. Objecion sin evidencia es hipotesis, no
    hallazgo.
  - Si el nucleo del ataque es **verificacion de HECHOS contra fuentes** (no atacar la logica del
    plan), sumar un **segundo lector Haiku 4.5** con la pregunta escrita (*"verifica esta afirmacion
    contra la fuente y devuelve la evidencia; si no puedes, dilo"*): Haiku es el que MENOS alucina en
    las tablas medidas (9.8% HHEM) y cuesta centavos. **Ojo, restriccion operativa:** desde una sesion
    de Claude Code solo se puede rutear un subagente a `opus` / `sonnet` / `haiku` / `fable`, y `opus`
    resuelve al Opus vigente, asi que **Opus 4.8 NO es seleccionable como subagente** aunque siga
    existiendo por API. No lo cites como escape hatch: no es ejecutable.
- **Fable NUNCA es el atacante**, ni siquiera cuando dirige Fable (seria el mismo modelo en los dos
  lados) ni cuando dirige otro: pagas ~2x por paridad de razonamiento, con TTFT de ~128s, el doble de
  error en salida estructurada (y el retorno del ataque ES estructurado), y clasificadores que lo
  reemplazan en silencio, asi que ni siquiera sabes si atacó Fable.
- **L1 dificil → subagente Fable `low→med`** sigue permitido: que el director no ejecute no prohibe
  lanzar OTRA instancia de Fable como subagente ejecutor para hojas verdaderamente dificiles (procesos
  separados; el director preserva SU contexto). Con el filtro del punto 1 de §A: si la dificultad es
  de codigo, esa hoja va a Opus 5.

---

## C. Gatillo: el debate es OBLIGATORIO (endurece la madre §7)

La madre reserva el debate adversarial para decisiones **genuinamente irreversibles**. Cuando dirige
Fable, el debate es **politica por defecto** en dos momentos:

1. **SIEMPRE antes de aprobar un plan que vaya a ejecutarse.** Cualquier plan al que Fable este por
   dar luz verde (plan de build, plan de fases, un set de recomendaciones que otros van a ejecutar)
   pasa por el ataque **antes** de darse por bueno. No solo lo irreversible.
2. **Ante cualquier error grave detectado en ejecucion**: algo que, si sigue sin corregirse,
   compromete el resultado (un supuesto roto, una migracion mal aplicada, un contrato violado). Se
   pausa, se debate el fix, se reconcilia, se continua.

**Por que se endurece (rationale reescrito 2026-07-26 con evidencia; antes decia "Fable es el de mayor
razonamiento", y eso ya no aplica):** el director Fable es el eslabon con **menos verificacion externa
disponible**.
- Su **calibracion de alucinacion no esta publicada**: es preciso en bruto pero no se sabe si se
  abstiene bien. Un director del que no se sabe si sabe cuando no sabe necesita un gate externo, no
  auto-reporte (la confianza autoreportada no es señal creible, madre §2).
- Sus **clasificadores re-enrutan en silencio** a otro modelo: puede que el plan no lo haya escrito
  Fable y nadie lo note.
- Su **tasa de error de salida estructurada duplica** la de Opus 5 en produccion, asi que los
  artefactos formales que emite (planes, contratos, JSON) tienen mas probabilidad de salir mal
  formados.

Ninguna de las tres es una opinion sobre su inteligencia: son huecos de verificabilidad, y el debate
obligatorio es el parche.

> El Filtro maestro (madre §0) sigue aplicando al **resto** de la ceremonia (briefs, paneles,
> workflows), pero **NO exime del gatillo 1**: si hay un plan por aprobar, hay debate. La
> proporcionalidad se aplica **graduando el ataque, no eximiendolo**. Y la graduacion es por MODELO,
> porque la diversidad se compra barata: el valor del atacante viene de que no tiene tu rationale, es
> read-only y lleva una pregunta escrita, no de su potencia bruta.
> - **Plan simple** (pocas piezas, reversible, no toca datos ni contratos): **Sonnet 5 `med`** con un
>   lente escrito, y **Haiku 4.5 `low`** como segundo lente si hay afirmaciones facticas que
>   verificar. Brief corto, retorno corto: un ataque rapido, no un informe. Dos lentes ortogonales
>   baratos rinden mas que un atacante caro con un "revisa esto".
> - **Plan delicado** (multi-fase, toca esquema/contratos, lanza varios subagentes, caro de
>   revertir): **Opus 5 `high→xhigh`**, ataque profundo con verificacion contra los archivos reales.
>   Aqui si paga la capacidad.

---

## D. Protocolo del debate (mismo espiritu anti-teatro de la madre §7, roles fijos)

1. **Fable formula la propuesta/plan** completo, con los supuestos y las afirmaciones verificables
   explicitas.
2. **Fable delega al atacante que corresponda por §C** (Sonnet 5 / Haiku 4.5 si el plan es barato de
   revertir, Opus 5 `high→xhigh` si es caro; nunca Fable, nunca `max`) dandole **SOLO la propuesta**,
   nunca el razonamiento a favor (lo racionalizaria), y la **orden explicita de destruirla**: vectores
   de ataque concretos con evidencia citada, alternativas con tradeoffs, el fallo mas probable, y un
   veredicto. El lente va ESCRITO en el brief: un "revisa esto" desperdicia el agente sin importar que
   modelo sea.
3. **Fable responde por escrito a CADA objecion**: `refutada` / `aceptada` / `mitigada`. Ninguna se
   ignora en silencio. Una objecion sin evidencia se responde como hipotesis, no como hallazgo.
4. **Fable reconcilia, decide y deja constancia** de que adopto, que descarto y por que.
5. **Una sola ronda**, salvo que el debate revele algo nuevo de peso.

> El atacante corre como subagente de SOLO LECTURA: recibe la propuesta y la orden de destruirla,
> puede correr verificacion de lectura (tests, consultas) para fundamentar los ataques, y nunca edita.
> Ese candado de herramientas es lo que hace confiable su veredicto. Verificar un DIFF ya escrito es
> otro trabajo y otro agente (madre §5), no este.

---

## E. Economia: el director no relee (la asimetria de la madre §3 aplicada a Fable)

- **Fable NO relee ni reprocesa el material en cada ronda.** La exploracion pesada (releer codigo y
  specs, buscar edge cases contra los archivos reales, verificar afirmaciones facticas) **se delega
  dentro del propio brief de ataque**: el brief de ida lleva las rutas exactas y las afirmaciones a
  verificar; el atacante quema SU ventana leyendo y devuelve el veredicto apretado.
- **Fable retiene solo tres cosas:** el brief de entrada, la propuesta que formulo, y la sintesis de
  vuelta. Todo lo demas lo consume **destilado**.
- **Brief de ida completo > corto** (sub-especificar sigue siendo la causa #1 de fallo); **retorno
  apretado** con formato fijo: por objecion → ataque + evidencia + severidad; luego alternativas,
  fallo mas probable, veredicto.
- Si el ataque exige verificacion empirica extra (correr un test, consultar la BD), **el atacante la
  pide o la ejecuta el**. Fable no se convierte en el ejecutor del debate.
- Razon adicional propia de Fable: su **TTFT es de ~128s** y sus turnos son de minutos. Cada
  relectura del director no cuesta solo cuota, cuesta la sesion entera de quien espera.

---

## F. Techo de esfuerzo: ni Fable ni Opus usan `max`

`max` queda **reservado y fuera de uso** en este modelo de debate, igual que en la madre.

- **Opus 5** (atacante, y como L1 ejecutor de riesgo): escala `high → xhigh` segun lo caro de
  revertir. `xhigh` es el techo.
- **Fable** (director): **alterna** su propio esfuerzo (`medium → high → xhigh`) segun la complejidad
  de la sintesis del momento, no fija un nivel unico para todo. Techo `xhigh`.
- **Por que, con el dato mas fresco** (Opus 5, API oficial de Artificial Analysis, [I] 2026-07-25):
  `high` ya saca el **mejor GPQA de toda su escalera** (93.7%, empatado con `xhigh`) con TTFT de
  10.1s, mientras `max` tarda 28.7s (~2.8x mas) y en GPQA **baja** a 93.2%; solo gana el indice
  compuesto agregado por 0.6-1.8 puntos. Respaldo independiente en la doc oficial de Anthropic
  (`build-with-claude/effort`): empezar en `xhigh` y subir a `max` solo con evals propias que muestren
  headroom medible.
- **Dato historico, conservado con su etiqueta** (es de **Opus 4.8** y de **Fable 5**, no de Opus 5;
  FrontierCode v1 + Artificial Analysis, 2026-07-01): `max` rendia igual o peor que `xhigh` costando
  40-60% mas (Fable 5: 44.7% vs 46.3% · Opus 4.8: 31.3% vs 34.3%). No reetiquetar esas cifras como si
  fueran de Opus 5.
- Razon estructural, ademas del benchmark: el atacante corre en **cada** aprobacion de plan (§C,
  gatillo obligatorio). Sin techo y sin graduacion, el mecanismo de debate se comeria el ahorro que el
  Filtro maestro protege.

---

## G. Que NO vive aqui (mapa a la madre)

Si buscas cualquiera de estos, esta en `.claude/skills/orquestar-agentes/SKILL.md`:

| Tema | Seccion de la madre |
|---|---|
| Filtro maestro (¿orquestar o no?) | §0 |
| Niveles L0-L2 | §1 |
| Clasificador de arranque, CRITERIOS-DELICADOS, tabla de ruteo canonica | §2 |
| Briefs en frio y economia asimetrica de la comunicacion | §3 |
| Sello de dificultad/modelo por unidad en planes, PRPs y kickoffs | §3.5 |
| Paralelizacion segura y orden topologico | §4 |
| Verificacion antes de integrar, circuit breaker y la clase de error SILENCIOSO | §5 |
| Escalada por ejes (0/A/B), candado de harnesses prehechos, desempate calidad/costo | §6 |
| Debate adversarial base (gatillo por irreversibilidad y protocolo) | §7 |
| Handoff `PROGRESS.md` y cadencia por hitos | §8 |

Al aplicar cualquiera de esas secciones **con Fable dirigiendo**, se leen tal cual: lo unico que las
sobreescribe es lo de este delta (roles §B, gatillo §C, protocolo §D, economia §E, techo §F).

---

## Como se invoca

- Se auto-descubre por su `description` cuando el loop corre en Fable. Al cargarla, **lee tambien la
  madre**: este archivo lo dice en su primera linea.
- Si la citas a mano: *"lee `.claude/skills/orquestar-agentes/SKILL.md` y luego el delta
  `.claude/skills/orquestar-agentes-fable/SKILL.md`"*. Los dos, en ese orden.
- **En subagentes:** arrancan en frio y no heredan nada. Si quieres que un subagente aplique este
  modelo, pegale las secciones que necesita en el brief o dale las dos rutas.

---

> **Origen y registro.** La variante nacio el 2026-07-01. Registro de decisiones (ADR) con los datos
> crudos: `README.md` en esta misma carpeta.
>
> **Reescritura 2026-07-26:** tres cambios. (1) La premisa se corrigio: la variante se selecciona por
> el modelo del loop, no por creer que Fable sea el mejor (en codigo mergeable Opus 5 le gana,
> FrontierCode 53.4% vs 46.3%). (2) El sub-director paso de Opus 4.8 a **Opus 5**, con candado de
> calibracion; los benchmarks de 4.8 se conservan etiquetados como historicos. (3) Se **elimino la
> duplicacion** de las secciones 0-8, que era la causa estructural del desfase. La regla de
> mantenimiento cambio: la variante es un DELTA, no una copia sincronizada.
