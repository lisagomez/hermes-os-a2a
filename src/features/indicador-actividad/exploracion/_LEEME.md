# Exploracion descartada / aparcada del indicador-actividad (2026-07-18)

> Nada de esta carpeta esta en la linea de producto. Se conserva porque documenta QUE se probo,
> QUE veredicto tuvo y POR QUE, para que un agente futuro no repita el mismo camino. La linea viva
> es `../enjambre-binario.v4.html` (+ `../enjambre-engine.ts` + `../enjambre-binario.tsx`).

## La leccion mas importante (leer antes de retomar el personaje)

Se intento un "ser IA" amigable dibujando la forma CON CODIGO (perfil de cabeza, blob, munequito con
bezier/elipses) en 4 iteraciones, y todas fallaron por lo mismo: una silueta dibujada por codigo no
tiene el detalle ni el arte para verse bien (salio creepy, espectro, pollo). La tecnica correcta es
**image-to-particles**: tomar una IMAGEN terminada y nitida (generada con IA o ilustrada), muestrear
sus pixeles (`getImageData`) y poner particulas encima con el color de cada pixel. La definicion viene
de la imagen, no del codigo. Referencia real que lo hace bien: el leon/fenix de
`https://excellentaisolutions.es/` (imagen fuente + ensamblado por particulas).

**Receta si se retoma:** (1) generar el personaje como imagen nitida sobre fondo negro con la skill
`image-generation` (los collages `ser-ia-opciones*.png` de aqui ya tienen candidatos aprobados de
direccion: blob con ojos ambar); (2) muestrear ESA imagen por brillo/alpha; (3) animar ensamblado/
disolucion sobre las posiciones muestreadas. NUNCA dibujar la silueta a mano en codigo.
La investigacion de respaldo vive en el cerebro: `cerebro-investigacion/temas/diseno-ser-ia-amigable-rostro-empatia.md`
(F364: ser abstracto + 2 ojos calidos, valle inquietante, baby schema) y
`temas/estados-actividad-agente-enjambre.md` (F363).

## Veredicto por archivo

| Archivo | Que es | Veredicto |
|---|---|---|
| `enjambre-webgl-demo.html` | Demo WebGL2: 60k particulas glow ("Pensando" escalado) | REFERENCIA tecnica. Prueba que WebGL2 corre en la GPU local; base para un futuro hero de fondo. No es producto. |
| `enjambre-webgpu-demo.html` | Demo WebGPU: 300k particulas con fisica en compute shader | REFERENCIA tecnica ("el techo"). Soporte de navegador aun parcial; solo para cuando el 80%+ de clientes lo tenga. |
| `enjambre-morph-agente.html` | Morph orbe -> profesiones (WebGL2 adaptativo, colores vividos) | DESCARTADO como personaje (el orbe se quedo corto y la cabeza de perfil previa era creepy). Los colores gustaron; el mecanismo de morph por muestreo sirve de referencia. |
| `enjambre-ser-etereo.html` | Ser de luz calida aireada (paleta calida) | DESCARTADO: a Johann no le gusto el resultado (preferia los colores vividos del morph). |
| `ser-ia-prototipo.html` | Blob Canvas 2D con ojos, respiracion, mirada, disolucion binaria | DESCARTADO: look plano (~30% del concepto) y la disolucion revelaba el rectangulo del canvas (parcialmente corregido, pero la direccion se aparco). |
| `ser-ia-webgl.html` | Munequito WebGL2 con rim light y ojos estructurados | DESCARTADO: "da mas miedo, parece un pollo". Confirma la leccion: silueta por codigo no funciona. |
| `ser-ia-opciones.png` | Collage 1 de Nano Banana (6 conceptos del ser) | INSUMO VALIDO. Direccion aprobada: blob particulas + 2 ojos ambar. Fuente candidata para image-to-particles. |
| `ser-ia-opciones-2.png` | Collage 2 (variantes: disolucion ligera/fuerte, medico con/sin ojos) | INSUMO VALIDO. Decisiones tomadas: disolucion FUERTE, reposo solido, profesion CON ojos. |
| `ser-ia-transicion.png` | Tira de 5 frames de la transformacion | INSUMO VALIDO. Storyboard canonico de la transicion (reposo -> disolucion -> rearmado -> profesion). |

## Decisiones que sobreviven a la exploracion (ya tomadas por Johann)

- Personaje: blob redondito de particulas + 2 ojos ambar calidos con catchlight, sin boca (panel 1 collage 2).
- Transicion: disolucion FUERTE en 1s y 0s; en reposo SOLIDO respirando (no gotea binario).
- Al transformarse en profesion: CONSERVA los ojos (ancla de identidad; el medico con ojos gano).
- La disolucion jamas debe llegar al borde del area de dibujo (nube circular acotada + fade), o se ve el marco.

## Adenda (2026-07-18, mismo dia): la receta YA tiene demo funcionando

Tras el reto de Johann se construyo el demo de la tecnica correcta:
- `ser-ia-fuente.png` = imagen fuente generada con Nano Banana (el blob aprobado, solo, fondo limpio).
- `ser-ia-image-to-particles.html` = demo autocontenido (imagen embebida en base64, abre con doble
  clic): muestrea los pixeles de la imagen (~8.900 particulas con el color real de cada pixel),
  ensambla el personaje desde particulas dispersas (efecto leon), respira, titila, los ~420 pixeles
  ambar de los ojos parpadean, y click = re-ensamblar. Verificado con decodificador PNG en Node
  (muestreo 8.938 particulas, 422 de ojo, fondo excluido).
Esto confirma la leccion: la MISMA sesion que fallo 4 veces dibujando por codigo produjo esto al
primer intento usando la imagen como fuente. Si se retoma el personaje, se parte de AQUI.
