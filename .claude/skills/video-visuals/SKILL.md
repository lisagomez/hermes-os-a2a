---
name: video-visuals
description: |
  Genera paquetes visuales narrativos completos estilo sketchnote para videos, presentaciones,
  o contenido educativo. Imagenes didacticas dibujadas a mano con doodles rellenos de color,
  trazos de marcador grueso, flechas organicas, iconos expresivos y etiquetas sobre fondo crema calido.
  Triggers: video visuals, paquete visual, imagenes para video, genera las imagenes, narrativa visual,
  imagenes del video, genera imagenes para el video, crea las imagenes, dibuja la narrativa,
  sketchnote, infografia, visual.
allowed-tools: Read, Write, Edit, Bash, Glob
---

# Video Visuals — Generador de Narrativa Visual Sketchnote

Genera paquetes completos de imagenes didacticas estilo sketchnote. Infografias dibujadas a mano con doodles rellenos de color, trazos de marcador grueso, flechas organicas, iconos expresivos y muchas etiquetas sobre fondo crema calido.

## IDIOMA — REGLA #1, NO NEGOCIABLE

**TODO el texto visible en las imagenes DEBE ser en ESPANOL.** El publico es hispanohablante.
**El prompt COMPLETO se escribe en ESPANOL.** Gemini entiende espanol perfectamente. NUNCA escribir el prompt en ingles.

| En vez de... | Usar... |
|-------------|---------|
| BEFORE / AFTER | ANTES / DESPUES |
| TWO TYPES | DOS TIPOS |
| WITHOUT / WITH | SIN / CON |
| TEST AND IMPROVE | PROBAR Y MEJORAR |
| TODAY / FUTURE | HOY / FUTURO |

## Estilo Visual — Sketchnote Hand-Drawn

| Regla | Valor |
|-------|-------|
| **Fondo** | Crema calido (#F5F0E8), como papel antiguo o pizarron blanco usado. |
| **Dibujos** | Doodles hand-drawn con relleno de color. Personajes con cuerpo (no solo stick figures). Iconos expresivos rellenos. |
| **Trazos** | Negro grueso estilo marcador. Ligeramente irregulares (organicos, no perfectos). |
| **Contornos** | Los colores de marca FUERTES (#8C27F1, #f69f02, etc.) se usan SOLO para contornos, bordes y trazos. |
| **Rellenos** | Los rellenos son versiones SUAVES/PASTEL del color, estilo lapiz de color o marcatextos. Textura irregular, no solido plano. Con sombreado manual visible (trazos de lapiz visibles). |
| **Texto** | Muchas etiquetas cortas EN ESPANOL. Titulos grandes estilo hand-lettering. Subtitulos en fuente manuscrita. |
| **Densidad** | Rica en elementos: 8-15 elementos etiquetados por imagen. Flechas, iconos, recuadros, personajes, todo con su etiqueta. |
| **Aspect ratio** | 16:9 siempre (formato YouTube). |
| **Anti-patron** | NUNCA fotorrealista. NUNCA fondos oscuros. NUNCA limpio/corporativo. NUNCA minimalista vacio. |

### Elementos Estructurales

- **Recuadros redondeados con relleno de color** para agrupar conceptos
- **Hand-lettering grande** para titulos principales (como escrito con marcador grueso)
- **Flechas organicas dibujadas a mano** (curvas, no rectas) conectando conceptos
- **Iconos rellenos de color**: engranes, focos, checks, X, cerebros, estrellas, cohetes, rayos
- **Personajes doodle** con cuerpo simple, expresiones, y a veces sosteniendo objetos
- **Banners y cintas** para destacar conceptos clave
- **Numeracion en circulos rellenos** para secuencias
- **Subrayados y circulos a mano** para enfasis
- **Divisiones visuales**: lineas onduladas o punteadas para secciones

### Principio de Densidad Narrativa

Cada imagen debe contar una historia completa:
- **Titulo grande** arriba (hand-lettering)
- **Subtitulo** explicando el concepto en una linea
- **Elementos centrales** (el diagrama, flujo, o comparacion principal)
- **Etiquetas en CADA elemento** (nada sin etiquetar)
- **Anotaciones laterales** con flechas apuntando a detalles
- **Iconos decorativos** rellenando espacios vacios (estrellas, rayos, flechas pequeñas)

## Sistema de Colores — SaaS Factory Brand

**Regla fundamental:** Los colores de marca son para CONTORNOS y BORDES. Los rellenos son versiones pastel/suaves del mismo color, con textura de lapiz de color o marcatextos (trazos visibles, no plano).

| Color | Contorno (fuerte) | Relleno (suave, estilo lapiz) | Uso |
|-------|-------------------|-------------------------------|-----|
| **Negro** | #000000 | Sombreado gris suave a lapiz | Trazos base, texto, contornos principales. |
| **Morado** | #8C27F1 | Lila/lavanda suave a lapiz de color | Contorno de recuadros protagonista. Relleno lavanda suave. |
| **Naranja** | #f69f02 | Amarillo/durazno suave a marcatextos | Contorno de flechas y banners. Relleno durazno claro. |
| **Rojo** | #E74C3C | Rosa/salmon suave a lapiz de color | Contorno de areas de error. Relleno rosa palido. |
| **Verde** | #2ECC71 | Verde menta suave a lapiz de color | Contorno de checkmarks. Relleno verde agua claro. |
| **Azul** | #3498DB | Celeste suave a lapiz de color | Contorno de recuadros info. Relleno celeste palido. |
| **Crema** | — | #F5F0E8 | Fondo base calido. |

### Tecnica de Relleno
- **NUNCA relleno solido plano.** Siempre con textura de lapiz de color o marcatextos.
- Los trazos del relleno deben ser VISIBLES (como si alguien coloreara a mano).
- El sombreado agrega profundidad: mas intenso en bordes, mas suave en centro.
- Los contornos fuertes contrastan contra los rellenos suaves = efecto educativo profesional.

## Personaje Levy — Mascota AI de SaaS Factory

Cuando una imagen necesite un personaje o mascota, usar a **Levy** (el agente AI de SaaS Factory).

**Asset:** `.claude/skills/video-visuals/assets/levy.png`

### Como Incluir a Levy

1. Pasar `assets/levy.png` como `--image` de referencia
2. En el prompt: `"personaje robot AI estilo doodle basado en la referencia (cabeza metalica azul-morada, chip SF en la frente, ojos brillantes)"`
3. Describir EXPRESION o POSE especifica al contexto

### Cuando Incluir vs Excluir a Levy

| Incluir Levy (SI) | Excluir Levy (NO) |
|---------------------|---------------------|
| Presentando un concepto central | Diagramas de flujo puros |
| Comparaciones ANTES/DESPUES | Listas de features/acciones |
| Recomendando una opcion | Timelines o evolucion de sistema |
| Teasers / CTAs | Conceptos tecnicos abstractos |

### Reglas de Posicionamiento
- Levy va a la IZQUIERDA cuando señala contenido a la DERECHA
- Levy va a la DERECHA cuando mira/señala contenido a la IZQUIERDA
- NUNCA poner a Levy en el centro bloqueando el contenido principal

## Pipeline Completo

### Paso 1: Analizar el Contenido

Lee el script/transcript/idea y extrae **momentos visuales clave** (6-12 maximo).

### Paso 2: Generar Prompts

**Template base:**

```
Fondo color crema calido (#F5F0E8). Infografia estilo sketchnote dibujada a mano con marcador grueso. [DESCRIPCION DETALLADA EN ESPANOL con TODOS los textos/etiquetas que deben aparecer]. Trazos negros gruesos estilo marcador para contornos. CONTORNOS de colores fuertes: morado (#8C27F1), naranja (#f69f02), rojo (#E74C3C), verde (#2ECC71), azul (#3498DB). RELLENOS suaves estilo lapiz de color y marcatextos: lila pastel, durazno claro, rosa palido, verde menta, celeste. Los trazos del relleno a lapiz deben ser visibles, con sombreado manual. Muchas etiquetas manuscritas en espanol. Hand-lettering grande para titulo. Rico en elementos visuales, denso pero organizado. Formato 16:9. NO incluir: fotorrealista, fondo blanco puro, minimalista, corporativo, rellenos solidos planos, colores saturados como relleno, caras detalladas, 3D, digital, vectorial
```

**Reglas de Prompting:**

1. **PROMPT 100% EN ESPANOL.** Todo. Sin excepciones.
2. Empezar con: `Fondo color crema calido (#F5F0E8). Infografia estilo sketchnote dibujada a mano con marcador grueso.`
3. Describir TODOS los textos/etiquetas que deben aparecer (8-15 elementos etiquetados).
4. Colores fuertes SOLO para contornos. Rellenos SUAVES estilo lapiz de color.
5. Terminar con: `Rellenos suaves estilo lapiz de color con trazos visibles y sombreado manual. Contornos fuertes de color. Rico en elementos visuales, denso pero organizado. Formato 16:9.`
6. Concatenar: `NO incluir: fotorrealista, fondo blanco puro, minimalista, corporativo, rellenos solidos planos, colores saturados como relleno, caras detalladas, 3D, digital, vectorial`
7. Todo texto visible en la imagen en ESPANOL

### Paso 3: Generar Imagenes

Usar la skill `image-generation` que ya esta instalada:

```bash
npx tsx .claude/skills/image-generation/scripts/generate-image.ts \
  --prompt "PROMPT_EN_ESPANOL" \
  --output generadas/XX-nombre.png \
  --aspect 16:9
```

Con Levy como referencia:
```bash
npx tsx .claude/skills/image-generation/scripts/generate-image.ts \
  --prompt "PROMPT_EN_ESPANOL" \
  --image .claude/skills/video-visuals/assets/levy.png \
  --output generadas/XX-nombre.png \
  --aspect 16:9
```

### Paso 4: Validar

1. Verificar que la imagen existe (tamano > 0 bytes)
2. **Verificar que TODO texto visible esta en ESPANOL**
3. Revisar: fondo crema, recuadros presentes, colores correctos
4. Si el texto NO esta en espanol, regenerar inmediatamente

## Estructura de Archivos

```
generadas/
├── 01-nombre.png
├── 02-nombre.png
└── ...
```

Guardar todas las imagenes generadas en una carpeta `generadas/` en la raiz del proyecto.
