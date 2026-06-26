---
name: website-3d
description: >
  Crear landing pages cinematicas estilo Apple con scroll-driven video animation + copy de alta conversion.
  Toma un video de producto y construye un sitio donde el video avanza/retrocede con el scroll.
  Incluye: starscape, annotation cards con snap-stop, specs con count-up, navbar pill, glass-morphism,
  loader, y responsive completo. Copy generado con frameworks AIDA/PAS y psicologia de ventas.
  Trigger cuando el usuario dice "landing page", "pagina de venta", "scroll animation",
  "scroll-stop build", "Apple-style scroll", "video on scroll", "build the scroll-stop site",
  "necesito una landing", "pagina principal", "website 3d", o proporciona un video y pide hacerlo scroll-controlled.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Landing Page Builder — Scroll-Stop + High-Conversion Copy

Construyes landing pages cinematicas donde un video de producto se controla con el scroll,
combinado con copy de alta conversion usando frameworks de psicologia de ventas.

Antes de construir NADA, debes hacer la entrevista completa. No asumas nada.

---

## Step 0: La Entrevista (OBLIGATORIA)

### Bloque 1: Marca y Visual

Pregunta en tono conversacional, no como interrogatorio:

1. **Nombre de marca** — "Como se llama tu marca o producto?"
2. **Logo** — "Tienes un logo? (SVG o PNG)"
3. **Color accent** — "Cual es tu color principal? (hex, o describelo y te sugiero opciones)"
4. **Color de fondo** — "Que color de fondo quieres? (fondos oscuros funcionan mejor para este efecto)"
5. **Vibe general** — "Que sensacion debe transmitir? (premium tech, luxury, minimal, bold, energetico)"

### Bloque 2: Objetivo de Conversion

```
Cual es la UNICA accion que queremos que haga el usuario?

A) Captura de Lead — Formulario nombre/email a cambio de valor
B) Contacto Directo — Boton WhatsApp / Llamada
C) Agendar Cita — Calendly / Cal.com embebido
D) Venta Directa — Boton de compra / checkout

(Elige UNA. Esto define toda la jerarquia visual y el CTA.)
```

### Bloque 3: Psicologia de Ventas

```
Dame la MUNICION para el copy:

1. DOLOR PRINCIPAL del cliente:
   (Que le quita el sueno? Que le molesta HOY? Se crudo.)
   Ej: "Pierden 4 horas al dia en tareas manuales", "Miedo a quedarse atras"

2. FOMO (Miedo a Perderse Algo):
   (Por que deben actuar AHORA y no manana?)
   Ej: "Oferta acaba en 24h", "Solo 3 cupos", "La competencia ya lo usa"

3. BENEFICIO MAGICO:
   (Como se siente su vida DESPUES de usar esto?)
   Ej: "Libertad total", "Dormir tranquilo", "Ingresos pasivos"
```

### Bloque 4: Contenido del Sitio

Pregunta como quiere proveer el contenido:

- **Opcion A: Basado en un sitio existente** — "Es basado en un sitio web existente? Comparte la URL y extraigo el contenido real (nombre, features, specs, copy)."
- **Opcion B: Lo pega directamente** — "Si no tienes sitio, pega las descripciones, features, specs, testimonios, etc."

Si da URL, usar `WebFetch` para extraer copy, detalles de producto, features, specs, y cualquier contenido usable.

### Bloque 5: Secciones Opcionales

Pregunta si quiere incluir:

- **Testimonios** — "Quieres seccion de testimonios? Si si, proporcionamelos o los extraigo del sitio que compartiste."
- **Confetti** — "Quieres efecto de confetti en algun momento? (al hacer click en CTA, al cargar la pagina)"
- **Card Scanner** — "Quieres una seccion 3D de particulas? (Three.js, buena para mostrar un producto/dispositivo/tarjeta)"

Solo incluir si el usuario dice explicitamente que si.

### Bloque 6: El Video

- **El usuario debe proporcionar un video** (MP4, MOV, WebM)
- Ideal: 3-10 segundos de duracion
- **El primer frame DEBE ser fondo blanco.** Si no lo es, informar y pedir re-export o imagen hero separada.

---

## Prerequisites

- **FFmpeg** instalado (`brew install ffmpeg` si no)
- Video del usuario (3-10 seg, primer frame en fondo blanco)

---

## Design System (Construido de las Respuestas)

- **Fonts**: Space Grotesk (headings), Archivo (body), JetBrains Mono (code/mono)
- **Color accent**: De la respuesta del usuario (botones, glows, progress bars, highlights)
- **Color de fondo**: De la respuesta del usuario (body, secciones)
- **Colores de texto**: Derivados del fondo — si bg oscuro: blanco + secondary muted; si bg claro: oscuro + secondary muted
- **Selection**: Accent color de fondo con texto contrastante
- **Scrollbar**: Track oscuro con thumb gradient usando accent, glow on hover
- **Cards**: Glass-morphism — bg semi-transparente, borde sutil, `backdrop-filter: blur(20px)`, `border-radius: 20px`
- **Botones**: Primary = accent bg + texto contrastante + glow; Secondary = transparente con borde blanco/oscuro
- **Efectos**: Orbs flotantes (tonos del accent, blurred), grid overlay sutil, starscape animado
- **Marca y logo**: Usados en navbar, footer, loader, y donde aparezca branding

---

## Tecnica: Frame Sequence + Canvas

La tecnica mas confiable para scroll-driven video:

1. **Extraer frames** del video con FFmpeg
2. **Precargar todos los frames** como imagenes con indicador de carga
3. **Dibujar frames en un canvas** basado en posicion del scroll
4. La posicion del scroll mapea a un indice de frame — scroll adelante avanza el video, scroll atras lo regresa

Es la misma tecnica que Apple usa en sus paginas de producto.

**Por que no `<video>` con `currentTime`?**
Los decoders de video del browser no estan optimizados para seeking en cada evento de scroll.
Canvas + frames pre-extraidos es buttery smooth y da control frame-perfect.

---

## El Proceso de Build

### Step 1: Analizar el Video

```bash
ffprobe -v quiet -print_format json -show_streams -show_format "{VIDEO_PATH}"
```

Extraer duracion, fps, resolucion, total de frames. Target: 60-150 frames total.

### Step 2: Extraer Frames

```bash
mkdir -p "{OUTPUT_DIR}/frames"
ffmpeg -i "{VIDEO_PATH}" -vf "fps={TARGET_FPS},scale=1920:-2" -q:v 2 "{OUTPUT_DIR}/frames/frame_%04d.jpg"
```

`-q:v 2` para JPEG de alta calidad. Usar JPEG no PNG para archivos mas ligeros.

### Step 3: Construir el Sitio

Crear UN SOLO archivo HTML. Las secciones (de arriba a abajo):

1. **Starscape** — Canvas fijo con estrellas animadas que parpadean
2. **Loader** — Pantalla completa con logo, "Loading", progress bar con accent color
3. **Scroll Progress Bar** — Barra fija arriba, gradient accent, 3px
4. **Navbar** — Logo + nombre, se transforma de full-width a pill centrado al scrollear
5. **Hero** — Titulo (con DOLOR), subtitulo (con BENEFICIO), botones CTA, scroll hint, orbs + grid
6. **Scroll Animation** — Canvas sticky con frame sequence, annotation cards con snap-stop
7. **Specs** — Cuatro numeros con count-up animation al scrollear
8. **Features** — Cards glass-morphism en grid
9. **CTA** — Seccion de call to action (con FOMO/urgencia)
10. **Testimonials** — *(solo si el usuario opto in)* Cards horizontales drag-to-scroll
11. **Card Scanner** — *(solo si el usuario opto in)* Particulas Three.js
12. **Footer** — Nombre de marca y links

Para detalles de implementacion de cada seccion, leer `references/sections-guide.md`.

### Step 4: Escribir el Copy (AIDA/PAS)

Usar los datos de la entrevista (Bloque 3: Psicologia de Ventas) para todo el copy:

**Framework AIDA:**
- **Atencion** (Hero headline): Usa el DOLOR para capturar. "Cansado de [dolor]?"
- **Interes** (Annotation cards): Features que resuelven el dolor. Datos concretos.
- **Deseo** (Specs + Features): El BENEFICIO MAGICO. Como se siente la vida despues.
- **Accion** (CTA): Urgencia con FOMO. "Empieza ahora antes de que [fomo]."

**Framework PAS (alternativo):**
- **Problema**: Headline que nombra el dolor directamente
- **Agitacion**: Annotation cards que amplificam las consecuencias
- **Solucion**: Features + CTA que presentan la salida

**Reglas de copy:**
- Enfocado en BENEFICIOS, no features
- Cada annotation card debe tener un dato/stat concreto
- El CTA debe tener urgencia real (del FOMO de la entrevista)
- NUNCA usar "Lorem ipsum" o texto placeholder
- Si el contenido vino de una URL, usar el texto REAL de ese sitio

### Step 5: Patrones Clave de Implementacion

**Canvas con soporte Retina:**
```javascript
canvas.width = window.innerWidth * window.devicePixelRatio;
canvas.height = window.innerHeight * window.devicePixelRatio;
canvas.style.width = window.innerWidth + 'px';
canvas.style.height = window.innerHeight + 'px';
```

**Cover-fit (desktop) — zoomed contain-fit (mobile):**
Desktop: cover-fit para que el frame llene edge-to-edge.
Mobile: contain-fit con zoom ligero para que el objeto quede centrado y visible.

**Annotation cards con snap-stop scroll:**
Cards aparecen en puntos especificos del scroll progress (data-show/data-hide).
El scroll SE CONGELA brevemente en cada posicion de card — efecto "boom, boom, boom".
JS-based snap: detecta cuando el scroll progress entra en snap zone, scrollea a posicion exacta,
bloquea body overflow por ~600ms, luego libera. El numero de cards es flexible.

**Navbar scroll-to-pill:**
Navbar empieza full-width, al scrollear se encoge a pill centrado (max-width ~820px)
con rounded corners y glass-morphism.

**Count-up animation:**
Numeros de specs animan de 0 a target con easeOutExpo, staggered 200ms.
Glow pulse en accent color mientras cuentan. Trigger por IntersectionObserver.

**Starscape animado:**
Canvas fijo detras de todo con ~180 estrellas que derivan y parpadean lentamente.

### Step 6: Servir y Testear

```bash
cd "{OUTPUT_DIR}" && python3 -m http.server 8080
```

Abrir `http://localhost:8080` y testear. Luego abrir la URL en el browser para el usuario.

---

## Checklist de Conversion (ANTES de entregar)

- [ ] **Above the fold:** Headline + CTA visibles sin scroll
- [ ] **Un solo objetivo:** Todos los CTAs llevan a la MISMA accion (del Bloque 2)
- [ ] **Contraste:** El boton CTA destaca claramente del fondo
- [ ] **Copy con dolor:** El headline nombra el dolor del cliente
- [ ] **Copy con urgencia:** El CTA tiene razon para actuar AHORA (FOMO)
- [ ] **Mobile-first:** Se ve perfecto en movil (cards compactas, nav pill, specs 2x2)
- [ ] **Velocidad:** Frames en JPEG (<100KB cada uno), preload con loader
- [ ] **Primer frame blanco:** El video arranca limpio en fondo blanco
- [ ] **Sin placeholders:** Todo el texto es real, del contenido del usuario

---

## Mobile Responsiveness

- **Annotation cards**: Diseno compacto single-line — ocultar parrafo, stats y labels. Solo numero + titulo en flex row. Posicion en bottom del viewport.
- **Scroll animation height**: 350vh (desktop) → 300vh (tablet) → 250vh (phone)
- **Navbar**: Ocultar links en mobile, solo logo + pill
- **Testimonials** (si incluido): Touch-scrollable, snap to card edges
- **Feature cards**: Stack a single column
- **Specs**: Grid 2x2 en mobile

---

## Best Practices

1. **`requestAnimationFrame` para dibujar** — Nunca dibujar directo en scroll handler
2. **`{ passive: true }` en scroll listener** — Habilita optimizaciones del browser
3. **Canvas con `devicePixelRatio`** — Crisp en pantallas Retina
4. **Precargar TODOS los frames antes de mostrar** — Sin pop-in durante scroll
5. **Frame deduplication** — Solo llama `drawFrame` cuando el indice cambia
6. **Sin `scroll-behavior: smooth`** — Interfiere con el mapeo frame-accurate
7. **Sin librerias JS pesadas** — Vanilla JS puro excepto Three.js para card scanner (si incluido)
8. **Sticky canvas** — `position: sticky` mantiene canvas fijo mientras el contenedor se mueve
9. **Primer frame blanco** — El video DEBE empezar en fondo blanco limpio

---

## Error Recovery

| Problema | Solucion |
| --- | --- |
| Frames no cargan | Verificar paths, asegurar que server local esta corriendo (no funciona desde `file://`) |
| Animacion choppy | Reducir frame count, asegurar JPEG no PNG, verificar tamanos (<100KB cada uno) |
| Canvas borroso | Asegurar que el scaling de `devicePixelRatio` esta aplicado |
| Scroll muy rapido/lento | Ajustar height de `.scroll-animation` (200vh=rapido, 500vh=lento, 800vh=cinematico) |
| Cards en mobile se solapan | Usar diseno compacto single-line, posicionar en `bottom: 1.5vh` |
| Snap-stop se siente brusco | Reducir HOLD_DURATION a 400ms o aumentar SNAP_ZONE |
| Estrellas muy brillantes/tenues | Ajustar opacity del canvas starscape (default 0.6) |
| Primer frame no es blanco | Pedir al usuario re-export del video con frame blanco de apertura |
