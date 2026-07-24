---
name: adquisicion-persona-sintetica
description: >-
  Activo Digital del departamento de Adquisición de Clientes (Hermes OS · A2A, Fase 9). Genera buyer
  personas SINTÉTICAS (ficticias) de alta fidelidad para PROBAR y CALIBRAR el CRM agéntico (ICP, scoring,
  entrevista dinámica, retroalimentación en vivo) y para role-play de coaching de asesores. Es el inverso
  del pre-descubrimiento: aquí SÍ se inventa —con realismo, contradicciones y lenguaje natural— pero todo
  queda marcado como sintético y NUNCA se mezcla con datos reales de la tabla `leads`. Toma un vertical /
  giro, contexto de negocio y contexto regulatorio (del grafo-a2a por país si aplica) y produce un paquete
  de personas usable como guión y dataset de pruebas. Usa este skill siempre que se necesite un lead de
  prueba, calibrar el ICP o el scoring, o entrenar al asesor con un caso realista, o cuando pidan "buyer
  persona", "persona sintética", "lead de prueba para el CRM", "dataset de pruebas", "ICP", "role-play de
  ventas" o "genera un prospecto ficticio", aunque no se nombre el skill.
tipo_activo: Activo Digital
objetivo: >-
  Producir buyer personas ficticias realistas y accionables —con dolores por tipo, comité comprador,
  señales de madurez, objeciones, disparadores, lenguaje real, mapa de conversación y scoring— para probar
  el CRM agéntico y entrenar asesores, sin contaminar jamás los datos reales de leads.
---

# Adquisición · Persona Sintética (buyer persona para pruebas del CRM)

**Activo Digital:** Paquete de buyer personas sintéticas (1 principal + variantes).
**Objetivo:** dar al equipo un prospecto ficticio de alta fidelidad —realista, con dolores, comité comprador, madurez, objeciones, lenguaje y scoring— para **probar/calibrar el CRM agéntico** y **entrenar asesores por role-play**, sin tocar datos reales.

## Encuadre en Hermes OS (ROADMAP)

- **Departamento:** Adquisición de Clientes (Fase 9); **competencia del Ejecutor**, orquestada por Hermes-Negocio. *(Aislar, no fundir.)*
- **Dato sintético ≠ dato real — frontera dura.** Este skill **NO escribe en `leads`** ni en ninguna tabla de prospectos reales. Si se persiste, va a un origen propio y etiquetado (p. ej. archivo `ejemplos/…` o una tabla `personas_sinteticas` con `origen='sintetico'`), nunca al pipeline. *(Un escritor por origen: el dato de prueba no entra por la puerta del dato real.)*
- **Inverso del pre-descubrimiento.** Ahí la regla es *cero invención*; aquí la regla es *inventar bien y marcarlo*. Todo supuesto se rotula como **supuesto plausible**; nada se presenta como hecho verificado de una empresa real.
- **Lo regulatorio, al grafo.** Si el vertical tiene aristas fiscales/contables/contractuales, el contexto normativo se pide a `grafo-a2a` (país correcto) y se cita; sin regla aplicable, `dudoso` con disclaimer. No se fabrican números regulatorios ni siquiera en un caso ficticio. *(Citar fuentes, no inventar.)*
- **Copiloto, no autopiloto.** El paquete calibra herramientas y entrena humanos; no cambia el estatus de ningún lead ni sustituye el descubrimiento real.
- **Routing:** generación larga y con matices → modelo capaz (perfil pesado), no el loop barato. *(Eficiencia por routing: lo importante a modelos capaces.)*

## Entradas

- **Vertical / giro** (p. ej. freight forwarder, despacho contable, clínica). **Obligatorio.**
- **Contexto de negocio propio** — la empresa desde la que se vende (tono, servicios, propuesta de valor; p. ej. GAL Logistics: Hand Carry, Charter, Parcel, Express Freight).
- **Contexto regulatorio** — ejes normativos del vertical, traídos del `grafo-a2a` por país cuando apliquen (p. ej. e-AWB / IATA Resolution 672, carta porte, pedimentos, BL).
- **Arquetipo objetivo** (rol/cargo del comprador) y **nº de variantes** (por defecto 1 principal + 2 secundarias del mismo arquetipo).

## Proceso

1. **Fija el ICP** del vertical: qué hace que un lead **encaje** (rol, tamaño, dolor, madurez) vs. qué lo descarta. Esto es lo que el CRM debe aprender a reconocer.
2. **Inyecta el contexto de dominio** (negocio + regulatorio del grafo). Sin dominio real, la persona sale genérica —lo que este skill NO debe producir—.
3. **Construye el principal + variantes** como personas reales: con contradicciones, prioridades concretas y restricciones del mundo real del vertical. Distingue **usuario, comprador económico, sponsor e influenciador**.
4. **Aterriza dolores por tipo** (mismas cubetas que el pre-descubrimiento: operativo, documental, regulatorio/compliance, comercial/estratégico) para que el dataset case con el resto del pipeline.
5. **Genera los artefactos de prueba**: mapa de conversación para el CRM, guion de retroalimentación en vivo, esquema de scoring, lenguaje literal del prospecto, disparadores y objeciones.
6. **Marca todo como sintético** y cierra con el entregable utilizable (resumen, preguntas maestras, red flags, buying signals, hipótesis de solución, siguiente paso).

## Salida — Paquete de Persona Sintética (formato fijo)

```
# Persona Sintética — [Arquetipo] · Vertical: [giro]  ⚠️ FICTICIA (dataset de prueba)
Contexto de negocio: [empresa desde la que se vende]
Contexto regulatorio: [ejes + fuentes grafo-a2a / "sin aristas regulatorias"]

## Personas
### Principal — [nombre ficticio]
1. **Identidad** — edad · región · cargo exacto · tipo/tamaño de empresa · especialidad · involucramiento en ventas/ops/compliance · relación con terceros (agentes, aerolíneas, navieras, clientes).
2. **Perfil de empresa** — tamaño (rangos, sin cifras imposibles) · estructura · clientes/sectores · modos · mezcla exp/imp · nivel de digitalización · stack probable (ERP/TMS/hojas/WhatsApp/portales).
3. **Responsabilidades reales** — qué decide · qué delega · qué incendios apaga · dónde se entera tarde · qué reportes le piden · qué indicadores le importan · qué le quita el sueño.
4. **Dolores por tipo**
   - Operativos · Documentales · Regulatorios/compliance · Comerciales/estratégicos
   - (cada dolor: severidad + a quién golpea)
5. **Señales de madurez / readiness** — urgencia · presupuesto potencial · sponsor · apertura tecnológica · capacidad de implementación · dependencia cultural del dueño.
6. **Miedos, objeciones y resistencias** — para cada objeción: qué significa en realidad · qué dolor encubre · qué pregunta lo destapa.
7. **Disparadores de compra** — eventos que aceleran (pérdida de cliente, multa/retención, crecimiento que rompe lo manual, cliente grande que exige SLA/trazabilidad, deseo de diferenciarse).
8. **Lenguaje real** — frases literales (cortas/medias/largas): cómo describe el problema, cómo lo minimiza, cómo habla de terceros, cómo expresa frustración, cómo justifica una compra ante dirección.

### Variante 1 — [nombre] (rol/dolor distinto del mismo arquetipo)
[mismas 8 secciones, condensadas]
### Variante 2 — [nombre]
[mismas 8 secciones, condensadas]

## Artefactos para el CRM agéntico
### Mapa de conversación (por fase)
Fases: apertura · operación actual · documentación/cumplimiento · visibilidad/coordinación · impacto económico · herramientas · voluntad de cambio · factibilidad de piloto.
Por fase: objetivo · señales a escuchar · datos a extraer · preguntas de seguimiento · alertas de huecos · clasificación provisional · siguiente mejor pregunta.
### Guion de retroalimentación en vivo al entrevistador
Ejemplos accionables ("Profundiza: mencionó X pero no dijo quién bloquea"; "Señal de compra alta: sponsor + urgencia + problema repetido"; "Objeción encubierta: 'ya lo resolvemos manual' → validar costo humano").
### Esquema de scoring
Variables: severidad del dolor · frecuencia · dependencia de terceros · complejidad documental · exposición regulatoria · necesidad de trazabilidad · apertura a automatización · autoridad de compra · urgencia · valor estratégico · posibilidad de piloto. Para cada una: cómo interpretarla · señales verbales · umbrales cualitativos · curioso vs. prioritario.

## Vínculo dolor → solución (A2A / Hermes)
[Dolor] → [copiloto de entrevista / copiloto documental / validación regulatoria por nodo / repositorio auditable / trazabilidad / handoff ventas-ops-compliance / capa de contratos-evidencia / score de riesgo / control tower]. Vínculo dolor↔valor, sin arquitectura técnica todavía.

## Qué haría fracasar la venta (no perseguir aún)
Dolor insuficiente · urgencia inexistente · cero sponsor · cultura anti-cambio · operación inmadura · problema mal planteado · requerimiento fuera de alcance.

## Entregable final
Resumen ejecutivo · preguntas maestras · red flags · buying signals · hipótesis de solución · siguiente paso comercial.

> ⚠️ Persona FICTICIA generada para pruebas/entrenamiento. No es una empresa real. No entra al pipeline de leads.
```

## Reglas de calidad (del ejemplo semilla)

- **Nada de buyer persona de MBA/marketing.** Debe sonar a alguien que vive la operación del vertical todos los días.
- **Realismo con tensión:** integra explícitamente la tensión propia del giro (p. ej. urgencia operativa vs. complejidad documental; dependencia de terceros; sistemas fragmentados).
- **El comprador no pide "IA":** pide menos fricción, menos errores, más control, más velocidad. Ata la solución a eso.
- **Distingue roles:** usuario, comprador económico, sponsor, influenciador — no los fundas.
- **Supuestos marcados** como supuestos plausibles; cifras en rangos realistas, nunca exactas imposibles.
- **Largo, profundo y usable** como guión y dataset — este es el único activo del departamento donde "enciclopédico" es correcto (es dataset de prueba, no una ficha pre-llamada).

## Método diio aplicado ("Guía de supervivencia para vender con IA")

- **Simular el comité comprador** (práctica 1): champion, CFO, operaciones, CEO, IT/legal — qué le importa a cada uno y qué objeción introduce.
- **Framing del dolor desde el cliente**, no desde el producto: *"qué es difícil, caro, lento, invisible o riesgoso"* para esta persona en este contexto.
- **Check anti-genérico (Trampas 3 y 6):** si la persona serviría casi igual para tres empresas distintas del mismo sector, todavía está genérica — dale lo que la hace única y preserva su voz.
- **Contexto mata prompt bonito:** la fidelidad viene del contexto de negocio + regulatorio inyectado, no del adorno.

## Integración

- **Calibra el pipeline:** el paquete se usa para probar `adquisicion-entrevista-dinamica` (guía), `adquisicion-transcripcion` (dataset de conversación) y `adquisicion-diagnostico-factibilidad` (scoring/FODA) sin gastar un lead real.
- **Entrena asesores:** alimenta el role-play de `adquisicion-coaching-asesor` (el asesor practica contra la persona ficticia y su lenguaje literal).
- **Comparte ICP:** el ICP y el esquema de scoring que produce sirven de referencia para clasificar leads reales — pero la persona en sí **nunca** se registra como lead.
- **Ejemplo semilla:** ver `ejemplos/freight-forwarder-gal.md` (vertical logístico, contexto GAL + regulatorio e-AWB) como instancia trabajada de este skill.

---
*Método basado en "Guía de supervivencia para vender con IA" (diio.com), CC BY-SA 4.0.*
