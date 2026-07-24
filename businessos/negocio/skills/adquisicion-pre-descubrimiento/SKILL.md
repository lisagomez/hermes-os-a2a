---
name: adquisicion-pre-descubrimiento
description: >-
  Activo Digital del departamento de Adquisición de Clientes (Hermes OS · A2A, Fase 9). Al agendar la
  primera llamada de un lead (Hito 2 del pipeline de EG.CRM), hace el pre-descubrimiento: investiga en
  fuentes públicas (web y redes del prospecto) a partir de empresa, WhatsApp Business y URLs, y deja una
  Ficha de Inteligencia con giro, dolores y puntos de abordaje asociada a la fila del lead. Corre como
  competencia del Ejecutor del trío, con modelo barato por routing. Usa este skill siempre que se agende
  una llamada, entre un lead nuevo con empresa/WAB, o alguien pida "investigar al prospecto", "ficha de
  inteligencia", "pre-descubrimiento" o "puntos de abordaje", aunque no se nombre el skill.
tipo_activo: Activo Digital
objetivo: >-
  Dar al asesor humano, ANTES de la llamada, una lectura accionable del prospecto (giro, dolores, puntos
  de abordaje) con fuentes citadas y sin inventar, para llegar preparado sin quemar tokens de más.
---

# Adquisición · Pre-descubrimiento (Ficha de Inteligencia)

**Activo Digital:** Ficha de Inteligencia del prospecto.
**Objetivo:** entregar, antes de la llamada, un resumen accionable del prospecto —giro, dolores, puntos de abordaje— con fuentes citadas, para que el asesor personalice la conversación.

## Encuadre en Hermes OS (ROADMAP)

- **Departamento:** Adquisición de Clientes (Fase 9). No es un agente suelto: es una **competencia** que el **Ejecutor** del trío carga para esta tarea, orquestado por Hermes-Negocio. *(Aislar, no fundir.)*
- **Persistencia:** la ficha se ancla a la fila del lead en la tabla `leads` (Supabase). **Un solo escritor**; si el guardado falla, la tarea sale `failed` reintentable — nunca se dice "listo" sin fila. *(Verificar antes de confiar.)*
- **Routing:** investigación = tarea barata → modelo económico (perfil ligero, no Opus). *(Eficiencia por routing, no por recorte.)*
- **No bloquea el pipeline:** si no hay datos suficientes, la ficha queda `Parcial` y la llamada procede. *(Acotar antes de escalar.)*

## Entradas

De la ficha del lead: nombre del prospecto, **empresa** (mínimo), **WAB**, **web/redes** (si hay), `origen_canal` y campaña como contexto.

## Proceso

1. **Reúne fuentes públicas.** Con URLs, parte de ahí; sin URLs, localiza por **empresa + WAB** (nombre comercial, directorios, redes públicas). Solo información pública.
2. **Extrae señales** de a qué se dedica: productos/servicios, sector, tamaño aparente, público, propuesta de valor, presencia digital.
3. **Infiere dolores**, marcando cada uno como **`observado`** (hay evidencia) o **`hipótesis`** (inferencia). Esta distinción es la regla de oro del proyecto aplicada aquí: *señala, no afirma sin fuente*.
4. **Propón puntos de abordaje**: ángulos concretos ligados a dolores, listos para abrir conversación.

## Salida — Ficha de Inteligencia (formato fijo)

```
# Ficha de Inteligencia — [Empresa]
Estado: Completa | Parcial
Fuentes consultadas: [URLs / búsquedas]  ← obligatorio; sin fuentes no se entrega

## Giro / Tema
[2-4 líneas]

## Dolores detectados
- [Dolor] — (observado | hipótesis) — [evidencia o razonamiento]

## Puntos de abordaje
- [Ángulo ligado a un dolor]

> Insumo de preparación. El asesor humano decide qué usar.
```

## Reglas de oro (heredadas del ROADMAP)

- **Cero invención.** Sin evidencia, no se afirma: se marca `hipótesis` o se omite. Nunca se fabrican fuentes.
- **Fuentes siempre.** La ficha lista las fuentes; si no hay ninguna, sale `Parcial` diciéndolo.
- **Accionable, no enciclopédico.** El valor son los puntos de abordaje.
- **Datos faltantes no bloquean.** `Parcial` es un estado válido; el pipeline sigue.

## Método diio aplicado ("Guía de supervivencia para vender con IA")

- **Las 4 capas de una buena preparación** (diio, cap. 6) estructuran la ficha: (1) contexto visible, (2) el **rol** de la persona y sus tensiones, (3) **hipótesis** de dolor/fricción, (4) ángulos de conversación. Distintos roles (VP, CFO, founder, operaciones) → conversaciones distintas.
- **Framing del dolor** desde el cliente, no desde el producto: *"qué podría estar siendo difícil, caro, lento, invisible o riesgoso para esta persona en este contexto"* — nunca "qué resuelve mi producto".
- **Hipótesis, no oráculos.** *"Contexto mata prompt bonito"* (diio, apéndice). Cada dolor va marcado como hipótesis a validar, no como hecho.
- **Check anti-genérico (Trampa 3, "research superficial").** Antes de cerrar la ficha, pregúntate: *"¿esto serviría casi igual para tres empresas distintas del mismo sector?"* Si sí, todavía está demasiado genérica — busca lo que aplica **solo a este prospecto**.
- **Simular el comité comprador** (diio, práctica 1): anticipa stakeholders (champion, CFO, operaciones, CEO, IT/legal), qué le importa a cada uno y qué objeción podría introducir. La decisión B2B es una red, no un solo interlocutor.
- **Filtro de valor:** *"¿esto me ayuda solo a producir algo, o también a ver algo que antes no veía?"*

## Integración

Su salida alimenta a `adquisicion-entrevista-dinamica` (Hito 3), que adapta la guía de preguntas a partir de esta ficha.

---
*Método basado en "Guía de supervivencia para vender con IA" (diio.com), CC BY-SA 4.0.*
