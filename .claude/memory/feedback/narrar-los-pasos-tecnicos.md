# Narrar los pasos técnicos en lenguaje llano

Feedback de Victor el 2026-08-07.

## Qué pidió

> *"¿Hay forma de que cada vez que corras una implementación, pruebas, conexiones etc,
> expliques de forma sencilla qué estás haciendo? Es que no llego a entender todo el
> protocolo que sigues."*

Se le ofrecieron tres niveles de detalle y eligió el intermedio, **narrado en el
momento** (no como resumen al cerrar la fase).

## Cómo aplicarlo

Alrededor de cada bloque técnico —migración, pruebas, conexión a un servicio,
verificación, despliegue— tres cosas, en este orden:

- **Qué voy a hacer** — en lenguaje llano. Si hace falta un término técnico, se explica
  ahí mismo. Un nombre de archivo o un comando NO son una explicación.
- **Para qué sirve** — qué problema evita o qué pregunta responde. Es la parte que
  Victor echaba en falta: veía el *qué* y nunca el *por qué*.
- **Qué pasó** — al terminar, qué significa el resultado para la decisión que sigue.
  No "salió verde", sino qué queda habilitado o bloqueado porque salió verde.

**Granularidad**: se explica el propósito de un BLOQUE, no comando por comando. Si cinco
comandos responden una sola pregunta, se explica la pregunta una vez. Las lecturas
sueltas de orientación (mirar dónde vive algo) no se narran: son hojear, no hacer.
Narrarlo todo tapa lo importante con ruido, que es el problema original con otra forma.

**Por qué importa, más allá de la comodidad**: sin esto Victor no puede juzgar si el
trabajo está bien hecho ni frenar un rumbo equivocado mientras aún es barato
corregirlo. Es el mismo principio de *verificar antes de confiar*, aplicado a que el
humano pueda verificar. Por eso va en vivo y no en un resumen final: un resumen llega
cuando el desvío ya ocurrió.

**Alcance**: es preferencia de Victor. Elisa no la ha pedido; con ella se mantiene el
nivel de siempre salvo que diga otra cosa.

Relacionado: `feedback/respetar-logica-del-proyecto.md` (no declarar éxito sin
verificación real) y el hábito de esta casa de no dejar nada en silencio —todo
best-effort imprime, todo omitido se nombra—; aquí se extiende al interlocutor humano.
