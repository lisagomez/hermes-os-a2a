# Guion — Presentación A2A para logística y comercio exterior

**Público:** lead comercial/logístico (un *forwarder* y un fabricante de *fasteners*), sin perfil técnico.
**Marca:** genérica A2A Factory. No se menciona ninguna cuenta por nombre.
**Idioma:** español.
**Entregable:** deck HTML publicado + 7 ilustraciones sketchnote.

---

## Regla de redacción que gobierna todo este guion

Este material va a un prospecto real. Una promesa que no se pueda enseñar cuando la pidan cuesta la
cuenta entera. Por eso:

| Se puede decir en **presente** | Hay que decirlo como **lo que se implementa contigo** |
|---|---|
| La plataforma de agentes opera hoy (el equipo la usa a diario para fabricar su propio software) | Cualquier agente **de tu operación**: documentación aduanera, rastreo, regulatorio, comercial, coordinación |
| El motor del mapa de reglas está vivo y **cubre comercio exterior**: Ley Aduanera, Ley de Comercio Exterior, LCPAF, Ley de Aviación Civil y T-MEC (98 reglas, 61 categorías) | Tus **reglas propias** y lo que el mapa declara fuera de alcance: la clasificación arancelaria de tu catálogo (Tarifa LIGIE), las reglas de origen por producto (Anexo 4-B del T-MEC) y el complemento fiscal Carta Porte |
| La bitácora compartida está construida y probada de extremo a extremo | Que esté **sellando tus embarques** — eso se activa en tu implementación |

> **Actualizado el 2026-09-03.** Cuando se escribió este guion (2026-08-31) el mapa tenía 68 reglas
> y **cero** comercio exterior; los PRs #307/#308/#309 sembraron aduanas, logística y el T-MEC. La
> fila de arriba ya lo refleja: es la capacidad más relevante para este lead y venderla de menos
> también desinforma. Sigue **sin** cambiar lo demás: no existe ningún agente sectorial y la
> bitácora no está desplegada. ⚠️ Antes de enseñar el mapa en vivo, verificar que las reglas nuevas
> ya estén aplicadas al servicio — están en el repositorio, y el runtime quedó pendiente mientras el
> servidor tiene la red cortada.

Ninguna diapositiva afirma en presente que exista un agente que despache aduanas hoy. El valor no se
pierde: se cuenta como **lo que queda montado al terminar el piloto**, que es lo que el lead compra.

Las cifras del documento de encargo (40–60 %, «de días a horas») viajan siempre como **objetivo del
piloto**, nunca como resultado histórico. No tenemos una línea base medida en esta operación.

---

## Diapositiva 1 — Portada

**Título:** Soluciones A2A para logística y comercio exterior
**Subtítulo:** Automatización inteligente para forwarders y fabricantes

**Notas del presentador:**
> Arranca por el dolor, no por la tecnología: «cada embarque mueve más papeles que carga». La
> presentación entera responde a eso. No adelantes las palabras "blockchain" ni "grafo" todavía.

---

## Diapositiva 2 — ¿Qué es A2A? Un equipo digital

**Mensaje clave:** Agentes autónomos que colaboran como un equipo, cada uno con su especialidad.

- Un **equipo digital** de colaboradores especializados, no un programa más
- Cada agente domina **una** tarea: documentos, validación, rastreo, coordinación
- Trabajan **en paralelo** y se pasan el trabajo entre ellos, sin esperar a que alguien reenvíe un correo
- Cuando algo se sale de lo previsto, **escala a una persona** en vez de inventar
- Resultado: procesos más rápidos, con menos errores y con visibilidad de punta a punta

**Notas del presentador:**
> La analogía que funciona: «no es un robot que reemplaza a tu equipo; es un equipo de becarios
> incansables que nunca se distraen, nunca olvidan un requisito y te avisan cuando algo no cuadra».
> La cuarta viñeta es la que más confianza genera con operadores: el agente **sabe cuándo parar**.

---

## Diapositiva 3 — Los tres pilares

**Mensaje clave:** Tres piezas, explicadas por lo que hacen por la operación.

- **Enjambre de agentes** — el equipo digital que ejecuta tareas en paralelo. *Es la pieza que hoy
  opera: este mismo equipo la usa a diario para construir su propio software.*
- **Bitácora compartida inmutable** (cadena de bloques permisionada) — cada paso queda **sellado con
  evidencia verificable**: quién hizo qué, cuándo, y sin que nadie pueda editarlo después
- **Mapa de reglas por país** (grafo regulatorio) — un motor que responde qué exige cada
  jurisdicción, y que **cita la fuente de cada respuesta**; si no hay regla aplicable, lo dice en vez
  de opinar
- Las tres piezas se conectan: el agente consulta el mapa, ejecuta, y la bitácora guarda la evidencia

**Notas del presentador:**
> Aquí NO hay etiquetas de estado: el camino de implementación va en el cierre. Pero si el lead
> pregunta directamente «¿esto ya está funcionando?», la respuesta honesta y suficiente es:
> **«la plataforma sí, y la usamos todos los días. Lo que se configura contigo es el contenido de tu
> sector: tus reglas de aduanas y tus documentos.»**
>
> El detalle fino, sólo si insisten: la bitácora está construida y probada de extremo a extremo, y se
> activa en la implementación; el mapa de reglas hoy cubre materia fiscal, contable, contractual y de
> datos personales en México y Colombia — comercio exterior es justamente lo que se carga en el piloto.
> Nunca ofrezcas una demostración en vivo de un despacho aduanero: no existe. Ofrece la sesión de
> descubrimiento.

---

## Diapositiva 4 — Caso 1: Forwarder logístico

**Encabezado obligatorio en la diapositiva:** *Así queda tu operación al terminar el piloto*

**Escenario:** Documentación aduanera, rastreo de embarques y validación regulatoria, coordinados.

1. Entra la solicitud de cotización del cliente
2. El **agente de documentación** arma el expediente y revisa que no falte nada antes de que salga
3. El **agente de rastreo** vigila el embarque y avisa de la desviación, no del hecho consumado
4. El **agente regulatorio** contrasta requisitos de origen y destino contra el mapa de reglas
5. Cada paso queda **sellado en la bitácora compartida**, disponible para tu cliente final

**Lo que gana el forwarder:**
- **Objetivo del piloto:** llevar el tiempo de procesamiento de días a horas
- Menos errores de documentación, que son los que generan retenciones
- Visibilidad total para el cliente final, sin llamadas de seguimiento
- Cumplimiento verificable, con la fuente de cada requisito a la mano

**Notas del presentador:**
> El encabezado *«así queda tu operación»* no es adorno: es lo que hace honesta esta diapositiva.
> Estos cinco agentes se configuran para su operación; no son un catálogo que ya exista corriendo.
> Si preguntan «¿me lo puedes enseñar funcionando hoy?» → ver la respuesta preparada al final de
> este guion. No improvises ahí.
>
> Nivel de escalamiento (útil si el lead es operativo): corrección automática → agente dentro de la
> política que ustedes definan → una persona de su equipo → escalamiento mayor. Los agentes no
> deciden fuera de política.

---

## Diapositiva 5 — Caso 2: Fabricante de *fasteners*

**Encabezado obligatorio en la diapositiva:** *Así queda tu operación al terminar el piloto*

**Escenario:** Pedidos internacionales, requisitos de importación y exportación, coordinación con el forwarder.

1. Entra el pedido internacional
2. El **agente comercial** valida especificaciones del producto contra lo que el cliente pidió
3. El **agente regulatorio** verifica requisitos de exportación en origen y de importación en destino
4. El **agente de coordinación** notifica al forwarder y programa la recolección
5. El ciclo completo queda **sellado en la bitácora**, listo para auditoría

**Lo que gana el fabricante:**
- Pedidos procesados más rápido, sin el ida y vuelta por correo
- Menor riesgo de retención aduanera por un requisito que nadie vio a tiempo
- Coordinación con el forwarder sin que alguien tenga que acordarse de avisar
- Historial completo para auditorías, sin reconstruir nada a mano

**Notas del presentador:**
> Mismo encabezado y misma disciplina que la diapositiva 4.
> Un fabricante de fasteners vive de la especificación: grado, recubrimiento, norma. La viñeta 2 es
> la que le va a importar más — el agente compara contra lo pedido y detecta la discrepancia antes de
> que el contenedor salga, no cuando lo devuelven.

---

## Diapositiva 6 — Beneficios transversales

**Mensaje clave:** Dónde se nota, en plata y en riesgo.

- **Eficiencia operativa** — procesos que hoy toman días, medidos en horas *(objetivo del piloto)*
- **Reducción de costos** — menos reproceso, menos errores, menos gente en tareas repetitivas
- **Menor riesgo** — cumplimiento verificable y trazabilidad completa de cada embarque
- **Escalabilidad** — el equipo digital crece con la operación: más volumen no significa más nómina

**Notas del presentador:**
> Las cifras van etiquetadas como objetivo a propósito. Si el lead pregunta «¿de dónde sale el
> 40–60 %?», la respuesta es: **«es la meta que fijamos para el piloto, y la primera semana medimos
> tu línea base para saber contra qué comparar.»** Prometer un número medido en otra operación es lo
> que hunde la segunda reunión.

---

## Diapositiva 7 — El camino: de hoy a la operación automatizada

**Mensaje clave:** Cómo se implementa, por etapas, y qué queda listo en cada una.

- **Semanas 1–2 · Diagnóstico y carga de tus reglas** — mapeamos tu operación real y cargamos tus
  requisitos de aduanas, incoterms y documentación al mapa de reglas
- **Semanas 3–6 · Piloto con trazabilidad verificada** — uno o dos procesos corriendo de punta a
  punta, con la bitácora compartida activa en tu ambiente de pruebas
- **Semana 7 en adelante · Producción** — se amplía a los demás procesos con la línea base ya medida
- **Cada etapa cierra por resultado verificado, no por calendario** — si el criterio no se cumple, no
  avanzamos de etapa
- **Próximo paso concreto:** sesión de descubrimiento de 1 a 2 horas

**Notas del presentador:**
> Esta diapositiva es el semáforo de madurez, contado como lo que realmente es: el arranque normal de
> cualquier implementación seria. Dice la verdad completa —el sector se configura, la bitácora se
> activa, la línea base se mide— sin sonar a descargo de responsabilidad.
> La cuarta viñeta es la que diferencia: casi nadie promete cerrar por criterio en vez de por fecha.

---

## Respuesta preparada: «¿me lo enseñas funcionando hoy?»

Es la pregunta más probable después de las diapositivas 4 y 5, y hay que tenerla lista **palabra por
palabra**, porque improvisar aquí es donde se pierde la credibilidad:

> «Te puedo enseñar hoy la plataforma de agentes trabajando: es la misma que usamos todos los días
> para construir nuestro propio software, con varios agentes coordinándose, revisándose entre ellos y
> dejando registro de cada paso. Lo que **no** te voy a enseñar hoy es un despacho aduanero, porque
> eso se configura con tus reglas y tus documentos, y todavía no los tengo. Eso es exactamente lo que
> hacemos en las primeras dos semanas del piloto.»

Por qué funciona: entrega algo real y demostrable, nombra el límite antes de que lo descubran, y
convierte el límite en el primer entregable del piloto.

**Lo que nunca se dice:** que ya hay agentes despachando aduanas, que la bitácora ya está sellando
embarques, o que el mapa de reglas ya cubre comercio exterior. Nada de eso es cierto hoy.

---

## Origen del material y su nivel de madurez

Para quien retome este guion: los flujos de las diapositivas 4 y 5 se apoyan en
`businessos/logistica/propuesta-erp-logistica.md`. **Ese documento es diseño, no producto
entregado** — su propia sección 11 tiene decisiones abiertas. Todo lo que venga de ahí (torre de
control por niveles, conectores de transportistas, logística inversa) entra al deck como lo que se
configura en el piloto, jamás como capacidad existente.

Advertencia concreta: **no repetir** la afirmación de ese documento sobre un motor fiscal con
timbrado ya operando. Se verificó falsa — el timbrado está marcado como simulado en el código.
