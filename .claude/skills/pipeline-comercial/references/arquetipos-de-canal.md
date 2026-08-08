# Arquetipos de canal — cual sirve a que negocio

> No es un menu para copiar entero. Es un catalogo para **elegir segun la Fase 0**.
> Un canal que no corresponde al negocio es peso muerto: codigo que mantener, otra cosa
> que se puede romper, y un lugar mas donde buscar cuando algo no cuadra.

---

## 1. Superficies de captura (por donde ENTRA un interesado)

| Arquetipo | Como se ve | Encaja cuando | No lo construyas si |
|---|---|---|---|
| **Formulario de contacto/demo** | Landing con formulario → endpoint propio | Siempre. Es el piso minimo | — |
| **Diagnostico / autoevaluacion** | Cuestionario que devuelve un resultado util al instante | Venta consultiva: el resultado *es* la razon para dejar los datos, y te da contexto rico del lead | El producto se compra solo; el diagnostico sobra |
| **Mensajeria (WhatsApp / DM)** | Webhook entrante de la API de negocio | Mercados donde la gente escribe antes de llenar un formulario (LatAm, retail, servicios) | Nadie te escribe hoy: no construyas el canal antes que la demanda |
| **App de ultra-enganche** | Mini-experiencia util o divertida que termina en registro voluntario | Hay un momento de atencion concentrada: feria, stand, evento, campaña, aula | No hay evento ni pico de atencion; sin distribucion no captura nada |
| **Contenido con captura** | Descargable, calculadora, plantilla | Ciclo largo, hay que nutrir antes de vender | Ciclo corto: agrega friccion sin retorno |
| **Referido / lista manual** | Alguien apunta nombres a mano | Siempre existe aunque no lo llames canal | Nunca: **es el que mas se pierde**, dale una entrada formal |

### Sobre la app de ultra-enganche
Es el arquetipo menos obvio y el mas potente en presencial: en vez de pedir datos a cambio de
nada, se entrega algo util *primero* (un resultado, un diagnostico, un juego con premio de
informacion) y el registro es la continuacion natural. Reglas duras que la hacen funcionar:

- **El valor se entrega completo aunque no se registre.** Si condicionas el resultado al
  registro, la gente miente en el formulario y capturas basura.
- **Funciona sin conexion buena.** En un evento la red se satura; si depende de una llamada
  lenta al servidor para mostrar valor, muere en la fila.
- **Puerta de mayoria de edad antes de pedir datos** si el publico puede incluir menores
  (universidades, colegios, ferias abiertas). Un menor debe poder usarla sin dejar datos.
- **Base de datos propia**, no la del producto principal: es una superficie publica con
  perfil de riesgo distinto. Si necesita escritura anonima, aislala.

---

## 2. Espejos (a donde SALE la informacion una vez capturada)

Todos son opcionales salvo el canonico. Elige por el modo de operar del negocio, no por gusto.

| Espejo | Para que sirve de verdad | Cuando SI | Cuando NO |
|---|---|---|---|
| **Destino canonico (CRM)** | La unica verdad; se consulta por SQL/API | **Siempre** | Nunca se omite |
| **Aviso en vivo** (chat del operador) | El operador ve entrar el lead en el celular y puede reaccionar en minutos; ademas es redundancia si la base falla | Venta consultiva, ciclo corto, eventos | Cientos/dia: se vuelve ruido y se ignora |
| **Hoja de calculo** | El operador manipula, filtra y comparte sin pedir permiso a nadie | Hay alguien no tecnico que necesita autonomia | Nadie la abre — es mantenimiento sin lector |
| **Correo al propio lead** | Cierra la promesa que la interfaz ya hizo por escrito | La UI dice "te enviamos X" | La UI no promete nada: no inventes un correo no solicitado |
| **Reporte periodico de reconciliacion** | Red de seguridad: recupera lo que el camino instantaneo perdio, y es el resumen que el operador lee | Casi siempre; es barato y salva datos | Volumen tan bajo que el aviso en vivo ya lo cubre |

### El par instantaneo + reconciliacion
No son alternativas, son **capas**. El instantaneo da inmediatez; el periodico da garantia.
Funciona solo si se cumplen las tres condiciones:

1. Ambos caminos emiten **exactamente el mismo formato de fila**.
2. El destino **deduplica** por una clave natural estable.
3. La clave **no incluye campos que difieren entre los dos caminos** (la hora es el error
   clasico: el instantaneo usa el reloj del servidor y el periodico la marca de tiempo de la
   base — pueden caer en minutos distintos y la deduplicacion nunca coincide).

---

## 3. Etiquetado de origen — la decision que se paga sola

Cada superficie escribe en el canonico con una **etiqueta de origen estable** (`canal_origen`
o equivalente). Sin esto, en tres meses no puedes responder "¿que canal trae los leads que
cierran?" y todo el pipeline es un monton de nombres sin trazabilidad.

- Una etiqueta **por superficie**, no por campaña: `whatsapp`, `diagnostico_publico`,
  `app_evento_2026`, `formulario_web`, `referido_manual`.
- **Estable en el tiempo.** Renombrarla parte las series historicas.
- Si necesitas granularidad de campaña, va en un campo aparte, no dentro de la etiqueta.
- Documenta la lista de etiquetas validas en el runbook. Una etiqueta libre sin registro
  termina en cinco variantes de la misma palabra.
