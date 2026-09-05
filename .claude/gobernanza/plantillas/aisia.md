# AISIA — Evaluación de Impacto del Sistema de IA

> Control **C4** de `../GOBERNANZA.md`. Se llena una por sistema de IA y una por feature
> con consecuencias sobre personas. Se revisa al cambiar el sistema o tras un incidente.
>
> Doctrina: `businessos/gobernanza/adenda-iso42001.md` §3 (Anexo A.5).

**La pregunta que responde**: *¿a quién podemos dañar sin que nadie nos ataque?*
El modelo de amenazas cubre al atacante. Esto cubre el sistema operando **bien**.

---

## Plantilla

```markdown
# AISIA — <sistema / feature>
> Fecha: YYYY-MM-DD · Estado: borrador | firmada · Revisión: <disparador>

## 1. Partes afectadas
Quién recibe consecuencias, incluidos los que NO son usuarios.

## 2. Daños posibles SIN atacante
Qué pasa cuando el sistema decide mal operando exactamente como fue diseñado.

## 3. Severidad × probabilidad × reversibilidad
| Daño | Severidad | Probabilidad | ¿Reversible? |
|---|---|---|---|

## 4. Mitigaciones
Qué gate humano, qué plazo de gracia, qué vía de apelación, y qué se le comunica
al afectado.

## 5. Decisión
aceptar / mitigar / rediseñar / no ofrecer — con una línea de justificación.

Firmada por: ____________  Rol: ____________  Fecha: ____________
```

---

## Ejemplo lleno — Hermes OS · A2A como sistema

> Fecha: 2026-09-04 · Estado: **borrador, sin firmar** · Revisión: al alta del segundo
> tenant, al activar el envío del buzón, o tras el primer incidente.

### 1. Partes afectadas

- **La dueña y el equipo**: operan un sistema que ejecuta agentes con terminal, llaves y
  capacidad de escribir en producción.
- **Los leads y sus datos**: personas cuyos datos entran por formularios, chat de la
  landing, enriquecimiento (RFC, DENUE, patrón de dominio) y transcripciones. **Nunca
  hablaron con el sistema y muchas ni saben que existe.**
- **Los destinatarios de correo** del buzón agéntico: reciben texto redactado por un
  agente en nombre del negocio.
- **Terceros mencionados en reuniones y correos** que se transcriben o ingieren.
- **Los clientes de las verticales** (marca blanca, CRM multi-tenant) y, detrás de ellos,
  **sus** clientes finales.
- **Quien reciba un dictamen del grafo regulatorio** y tome una decisión con él.

### 2. Daños posibles SIN atacante

| Daño | Cómo ocurre operando "bien" |
|---|---|
| **Fuga entre clientes** | Una superficie usa `service_role` (C7) y el aislamiento vive solo en el código. Nadie ataca: el aislamiento simplemente no existe el día del segundo tenant. |
| **Dictamen regulatorio equivocado** | El grafo cita una ley abrogada, o un mock declarado "espejo" dejó de serlo, y alguien decide con eso. **Una fuente falsa es peor que no tener regla.** |
| **Correo indebido en nombre del negocio** | Un borrador aprobado por fatiga (O3) llega a un cliente real con contenido erróneo. Irreversible. |
| **Dato personal enriquecido sin base** | Se enriquece a una persona física sin gate LFPDPPP, o se conserva más de lo necesario. |
| **Decisión automatizada sin apelación** | El calificador mueve una etapa del CRM, el gate 69-B bloquea a una contraparte, y no hay ruta humana declarada para revertirlo. |
| **Pérdida de datos** | Una migración generada altera una columna en producción; el agente hizo exactamente lo que se le pidió. |
| **Exclusión por diseño** | Las superficies asumen conectividad, español y un dispositivo. Quien no encaja no aparece en ninguna métrica. |
| **Opacidad** | Un lead conversa por chat o recibe un correo sin saber que hay un agente detrás. |

### 3. Severidad × probabilidad × reversibilidad

| Daño | Severidad | Probabilidad | ¿Reversible? |
|---|---|---|---|
| Fuga entre clientes | **Alta** | Baja hoy (un solo tenant), **alta el día del segundo** | **No**: el dato ya salió |
| Dictamen equivocado | **Alta** | Media — el seed envejece con la ley | Depende de qué se decidió con él |
| Correo indebido | Media-alta | Media | **No**: enviado es enviado |
| Enriquecimiento sin base | Media-alta | Media | Parcial (supresión LFPDPPP) |
| Decisión sin apelación | Media | **Alta** — nadie pide la vía de apelación | Sí, si existe la vía |
| Pérdida de datos | Alta | Baja-media | Solo con respaldo probado |
| Exclusión por diseño | Media | Alta | Sí, pero es invisible: nadie reporta |
| Opacidad | Baja-media | Alta | Sí |

### 4. Mitigaciones

- **Fuga**: RLS obligatoria **más** C7 — la regla que hace que RLS no sea decorativa. El
  disparador es el alta del segundo tenant, con detector automático y test de arquitectura
  (Fase 7), no una fecha.
- **Dictamen**: fail-safe `dudoso` "sin regla aplicable", disclaimer siempre, y **todo lo
  que aporta al output cita su fuente**. Un hueco declarado con fuente es información; un
  vacío mudo, no. El seed se aplica al runtime o el dictamen viejo sigue sirviéndose *sin
  error*.
- **Correo**: ningún componente que ejecuta un modelo tiene credenciales de envío; la
  firma es una fila que el motor no puede fabricar. Modo espejo hasta cumplir 7 días y 20
  borradores. Anti-sello-de-goma: gates deterministas antes de la bandeja.
- **Enriquecimiento**: gate LFPDPPP **fail-closed** (sin dato, no hay permiso), ledger
  append-only con procedencia por campo, y supresión como operación soportada.
- **Sin apelación**: toda feature que bloquee, cobre, rechace o mueva de etapa declara su
  **vía de apelación humana** en Criterios de Éxito del PRP. Si no la declara, no está
  completa.
- **Pérdida**: toda migración destructiva es acción irreversible → gate humano explícito y
  respaldo **probado** antes, no después.
- **Exclusión**: la AISIA de cada feature nombra explícitamente a quién deja fuera.
- **Opacidad**: las superficies que conversan o escriben en nombre del negocio pueden y
  deben declarar que operan con asistencia automatizada cuando eso afecte a la persona.

### 5. Decisión

**Mitigar**, con dos rediseños explícitos: no se acepta ningún flujo donde un agente
escriba a producción, envíe correo o mueva dinero sin firma humana; y **los daños que
recaen sobre terceros que no firmaron no se aceptan con una entrada de C5** — se rediseñan
o no se hacen.

Firmada por: ____________  Rol: ____________  Fecha: ____________

> La firma la pone una persona; ningún agente puede fabricarla. Este ejemplo queda como
> **borrador sin firmar** a propósito: lo escribió un agente y su valor es servir de punto
> de partida, no de evaluación aprobada.
