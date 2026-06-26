---
name: image-generation
description: |
  Generar y editar imagenes usando OpenRouter + Gemini. Usar cuando el usuario pide crear,
  generar o editar imagenes, thumbnails, logos, banners, ilustraciones, o cualquier asset visual.
  Requiere OPENROUTER_API_KEY configurada (via skill /ai setup-base).
  Triggers: imagen, image, genera imagen, create image, generate image, foto, picture,
  edita imagen, edit image, thumbnail, banner, logo, ilustracion, dibujo.
allowed-tools: Read, Write, Edit, Bash, Glob
---

# Image Generation (OpenRouter + Gemini)

> Generar imagenes desde texto o editar imagenes existentes via OpenRouter API con modelos Gemini.
> Requiere: `OPENROUTER_API_KEY` en `.env.local` (se configura con skill `/ai setup-base`).

---

## Comando

```bash
npx tsx .claude/skills/image-generation/scripts/generate-image.ts \
  --prompt "PROMPT" \
  [--image /path/to/input.png] \
  [--output /path/to/output.png] \
  [--aspect 16:9] \
  [--model google/gemini-2.5-flash-preview-image-generation]
```

## Argumentos

| Arg | Requerido | Descripcion |
|-----|-----------|-------------|
| `--prompt` | SI | Descripcion de lo que generar o como editar |
| `--image` | NO | Path a imagen de entrada (para editar/transformar una imagen existente) |
| `--output` | NO | Path de salida personalizado. Default: `generated/img-{timestamp}.png` |
| `--aspect` | NO | Aspect ratio: `1:1` (default), `16:9`, `9:16`, `4:3`, `3:2` |
| `--model` | NO | Model ID de OpenRouter. Default: `google/gemini-2.5-flash-preview-image-generation` |

### Modelos Disponibles

| Modelo | Mejor para |
|--------|-----------|
| `google/gemini-2.5-flash-preview-image-generation` | Default. Rapido, buena calidad |
| `google/gemini-2.5-pro-preview-image-generation` | Pro quality, mas detalle |

---

## Ejemplos

```bash
# Texto a imagen
npx tsx .claude/skills/image-generation/scripts/generate-image.ts \
  --prompt "A minimalist logo with the letter S in cyan on dark background"

# Editar imagen existente
npx tsx .claude/skills/image-generation/scripts/generate-image.ts \
  --prompt "Remove the background and make it transparent" \
  --image ./public/photo.png

# Widescreen para thumbnail
npx tsx .claude/skills/image-generation/scripts/generate-image.ts \
  --prompt "Futuristic dashboard UI with charts and graphs" \
  --aspect 16:9 \
  --output ./public/images/thumbnail.png

# Usando modelo Pro
npx tsx .claude/skills/image-generation/scripts/generate-image.ts \
  --prompt "Detailed architectural blueprint of a SaaS platform" \
  --model google/gemini-2.5-pro-preview-image-generation
```

---

## Cuando Usar

Activar cuando el usuario:
- Pide **crear** o **generar** una imagen, ilustracion, diseno o visual
- Pide **editar** o **modificar** una imagen existente (pasar original con `--image`)
- Necesita un thumbnail, banner, logo, o cualquier asset visual
- Envia una imagen y pide cambiar algo de ella

---

## Despues de Generar

**SIEMPRE** incluir la imagen en tu respuesta para que el usuario la vea:

```markdown
![Descripcion de la imagen](path/to/generated/image.png)
```

Si la imagen se guardo en `public/`, usar el path relativo para que sea accesible desde la app.

---

## Tips de Prompts

- Se especifico: "A golden retriever wearing sunglasses on a beach at sunset" > "a dog"
- Especifica estilo: "photorealistic", "illustration", "watercolor", "pixel art", "minimalist", "3D render"
- Para ediciones: describe el cambio claramente: "Make the sky purple" o "Add a hat to the person"
- Para logos/texto: Gemini puede renderizar texto en imagenes, especifica que texto incluir
- Para assets de la app: incluir contexto de donde se usara: "Hero image for a SaaS landing page"
