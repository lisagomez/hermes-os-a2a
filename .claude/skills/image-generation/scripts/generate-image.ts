#!/usr/bin/env npx tsx
/**
 * Image Generation via OpenRouter + Gemini
 * Usage: npx tsx generate-image.ts --prompt "description" [--image input.png] [--output output.png] [--aspect 16:9] [--model model-id]
 */

import fs from "fs";
import path from "path";

// Parse CLI args
const args = process.argv.slice(2);
function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : undefined;
}

const prompt = getArg("prompt");
const inputImage = getArg("image");
const outputPath = getArg("output");
const aspect = getArg("aspect") || "1:1";
// OpenRouter retira modelos: el anterior default
// (google/gemini-2.5-flash-preview-image-generation) devuelve 400 "not a valid model ID"
// desde 2026-08. Para ver los vigentes:
//   curl -H 'User-Agent: curl/8.0' https://openrouter.ai/api/v1/models
//   | jq -r '.data[] | select(.architecture.output_modalities[]? == "image") | .id'
const model = getArg("model") || "google/gemini-3.1-flash-image";

if (!prompt) {
  console.error("Usage: npx tsx generate-image.ts --prompt 'description'");
  console.error("Options:");
  console.error("  --prompt    Text description (REQUIRED)");
  console.error("  --image     Input image path (for editing)");
  console.error("  --output    Output path (default: generated/img-{ts}.png)");
  console.error("  --aspect    Aspect ratio: 1:1, 16:9, 9:16, 4:3 (default: 1:1)");
  console.error("  --model     OpenRouter model ID");
  process.exit(1);
}

// Load API key from .env.local
function loadEnvKey(): string {
  const envPaths = [".env.local", ".env"];
  for (const envPath of envPaths) {
    const fullPath = path.resolve(process.cwd(), envPath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf-8");
      const match = content.match(/OPENROUTER_API_KEY=(.+)/);
      if (match) return match[1].trim();
    }
  }
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;
  console.error("ERROR: OPENROUTER_API_KEY not found in .env.local, .env, or environment");
  console.error("Run /ai setup-base to configure OpenRouter first.");
  process.exit(1);
}

const apiKey = loadEnvKey();

async function generateImage() {
  // Build messages
  const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

  // Add input image if provided (for editing)
  if (inputImage) {
    const imgPath = path.resolve(inputImage);
    if (!fs.existsSync(imgPath)) {
      console.error(`ERROR: Input image not found: ${imgPath}`);
      process.exit(1);
    }
    const imgBuffer = fs.readFileSync(imgPath);
    const base64 = imgBuffer.toString("base64");
    const ext = path.extname(imgPath).slice(1).toLowerCase();
    const mime = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
    content.push({
      type: "image_url",
      image_url: { url: `data:${mime};base64,${base64}` },
    });
  }

  // Add text prompt with aspect ratio hint
  const fullPrompt = `${prompt}\n\nGenerate the image with aspect ratio: ${aspect}. Return ONLY the image, no text.`;
  content.push({ type: "text", text: fullPrompt });

  console.error(`Generating image with ${model}...`);
  console.error(`Prompt: ${prompt}`);
  console.error(`Aspect: ${aspect}`);

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://saas-factory.dev",
      "X-Title": "SaaS Factory Image Generation",
    },
    body: JSON.stringify({
      model,
      // Sin esto, algunos modelos responden solo texto.
      modalities: ["image", "text"],
      messages: [{ role: "user", content }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`ERROR: OpenRouter API returned ${response.status}`);
    console.error(errorText);
    process.exit(1);
  }

  type ParteContenido = { type: string; text?: string; image_url?: { url: string } };
  const data = await response.json() as {
    choices: Array<{
      message: {
        // OpenRouter entrega la imagen generada AQUI (y deja content en null).
        images?: Array<{ type?: string; image_url?: { url: string } }>;
        content: ParteContenido[] | string | null;
      };
    }>;
  };

  // Extract image from response
  const message = data.choices?.[0]?.message;
  if (!message) {
    console.error("ERROR: No response from model");
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }

  // Handle multimodal response (array of content parts)
  let imageBase64: string | null = null;
  let textResponse: string | null = null;

  // Forma vigente de OpenRouter: message.images[].image_url.url con un data URL.
  // Se mira PRIMERO; el resto queda como respaldo para respuestas multimodales
  // al estilo antiguo, que algunos modelos todavia devuelven.
  for (const img of message.images ?? []) {
    const url = img.image_url?.url;
    if (!url) continue;
    const match = url.match(/^data:image\/\w+;base64,(.+)$/);
    imageBase64 = match ? match[1] : url;
    break;
  }

  if (imageBase64) {
    // ya esta
  } else if (Array.isArray(message.content)) {
    for (const part of message.content) {
      if (part.type === "image_url" && part.image_url?.url) {
        // Extract base64 from data URL
        const match = part.image_url.url.match(/^data:image\/\w+;base64,(.+)/);
        imageBase64 = match ? match[1] : part.image_url.url;
      } else if (part.type === "text" && part.text) {
        textResponse = part.text;
      }
    }
  } else if (typeof message.content === "string") {
    // Check if it's a base64 image string
    if (message.content.startsWith("data:image")) {
      const match = message.content.match(/^data:image\/\w+;base64,(.+)/);
      imageBase64 = match ? match[1] : null;
    } else {
      textResponse = message.content;
    }
  }

  if (!imageBase64) {
    // Volcar la respuesta entera enterraba el motivo bajo miles de lineas de
    // razonamiento del modelo. Se dice QUE falto y donde mirar.
    console.error("ERROR: No image in response");
    if (textResponse) console.error(`Model said: ${textResponse.slice(0, 500)}`);
    console.error(
      `Response had: images=${message.images?.length ?? 0}, ` +
      `content=${Array.isArray(message.content) ? "array" : typeof message.content}`
    );
    console.error("If images=0, the model returned no image: check the model ID supports image output.");
    process.exit(1);
  }

  // Save image
  const timestamp = Date.now();
  const outDir = outputPath ? path.dirname(path.resolve(outputPath)) : path.resolve("generated");
  const outFile = outputPath ? path.resolve(outputPath) : path.join(outDir, `img-${timestamp}.png`);

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const buffer = Buffer.from(imageBase64, "base64");
  fs.writeFileSync(outFile, buffer);

  // Output results (machine-readable)
  console.log(`IMAGE:${outFile}`);
  if (textResponse) console.log(`TEXT:${textResponse}`);

  console.error(`\nImage saved to: ${outFile}`);
  console.error(`Size: ${(buffer.length / 1024).toFixed(1)} KB`);
}

generateImage().catch((err) => {
  console.error("ERROR:", err.message || err);
  process.exit(1);
});
