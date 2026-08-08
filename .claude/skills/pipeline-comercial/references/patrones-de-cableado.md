# Patrones de cableado — codigo generico

> Probado en produccion (Next.js App Router + Postgres via API REST + servicios externos).
> Los nombres entre `<>` son marcadores: adaptalos al dominio del proyecto.
> El principio es portable a cualquier runtime: **la captura se guarda; los espejos se intentan.**

---

## 1. El punto unico de captura

Un solo archivo escribe en la base. Los espejos se disparan desde ahi, nunca desde otra ruta.

```ts
// POST /api/<captura> — el UNICO punto que escribe en la tabla de captura.
import { NextResponse, after } from "next/server";
import { espejarACanonico } from "@/lib/canonico";
import { espejarAHoja } from "@/lib/hoja";
import { enviarCorreoAlLead } from "@/lib/correo-lead";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_BODY_BYTES = 4096;
const DB_TIMEOUT_MS = 8000;
const CONSENT_VERSION = "v1-<AAAA-MM-DD>"; // congelada junto al texto legal publicado

// Limite de tasa best-effort por instancia. No pretende ser distribuido:
// frena al curioso con la consola abierta, no a un atacante decidido.
const RATE_MAX = 8;
const RATE_WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

function limited(ip: string, now: number): boolean {
  const prev = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  prev.push(now);
  hits.set(ip, prev);
  if (hits.size > 2000) hits.clear(); // techo de memoria
  return prev.length > RATE_MAX;
}

export async function POST(req: Request) {
  if (Number(req.headers.get("content-length") ?? "0") > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: "body" }, { status: 413 });
  }
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  if (limited(ip, Date.now())) {
    return NextResponse.json({ ok: false, error: "rate" }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try { body = (await req.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ ok: false, error: "json" }, { status: 400 }); }

  // Trampa para bots: campo oculto que un humano nunca llena. Si viene lleno,
  // responde 200 en silencio — no le des señal de que fue detectado.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (name.length < 2 || name.length > 120) return NextResponse.json({ ok: false, error: "name" }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ ok: false, error: "email" }, { status: 400 });
  // Sin autorizacion explicita NO hay fila. Es el requisito legal, no un detalle de UX.
  if (body.consent !== true) return NextResponse.json({ ok: false, error: "consent" }, { status: 400 });

  const url = process.env.<CAPTURA>_DB_URL;
  const key = process.env.<CAPTURA>_DB_SERVICE_KEY; // server-only, jamas al cliente
  if (!url || !key) {
    // Sin configuracion la app NO se cae: falla explicito y el cliente reintenta.
    return NextResponse.json({ ok: false, error: "config" }, { status: 503 });
  }

  const row = {
    name, email,
    consent: true,
    consent_version: CONSENT_VERSION, // prueba de QUE texto se acepto
    origen: process.env.<CAPTURA>_ORIGEN ?? "<etiqueta_estable>",
  };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), DB_TIMEOUT_MS);
  let dbOk = false, duplicate = false;
  try {
    const res = await fetch(`${url}/rest/v1/<tabla_captura>`, {
      method: "POST",
      headers: { apikey: key, authorization: `Bearer ${key}`,
                 "content-type": "application/json", prefer: "return=minimal" },
      body: JSON.stringify(row), signal: ctrl.signal, cache: "no-store",
    });
    duplicate = res.status === 409;   // indice unico → ya registrado
    dbOk = res.ok || duplicate;       // idempotente: el duplicado es EXITO
  } catch { dbOk = false; }
  finally { clearTimeout(timer); }

  if (!duplicate) {
    // Todos los espejos en paralelo. allSettled: ninguno puede tumbar la respuesta.
    // Si la base fallo, el aviso en vivo igual sale (marcado) — es la redundancia.
    await Promise.allSettled([
      avisoEnVivo(dbOk ? row : { ...row, origen: `${row.origen} ⚠SIN-BD` }),
      espejarACanonico(row),
      enviarCorreoAlLead(row),
    ]);

    // Lo que NO debe hacer esperar al usuario va DESPUES de responder.
    // El candado de la hoja no puede agregarle latencia a alguien en una fila fisica.
    after(espejarAHoja({
      canal: "<Etiqueta>", nombre: row.name, contacto: row.email, detalle: "—",
    }));
  }

  if (!dbOk) return NextResponse.json({ ok: false, error: "db" }, { status: 502 });
  return NextResponse.json(duplicate ? { ok: true, duplicate: true } : { ok: true });
}
```

---

## 2. Espejo al destino canonico (CRM)

**Lee las convenciones reales de la base antes de escribir.** No inventes valores de columnas
de estado, plaza o tenant: consulta que usan las filas existentes.

```sql
-- Ejecuta ESTO antes de escribir el espejo:
select estado, count(*) from <tabla_canonica> group by 1 order by 2 desc;
select canal_origen, count(*) from <tabla_canonica> group by 1 order by 2 desc;
```

```ts
// lib/canonico.ts — puente hacia la unica fuente de verdad.
export const ORIGEN = "<etiqueta_estable>";

export async function espejarACanonico(lead: {
  name: string; email: string; phone?: string | null;
}): Promise<boolean> {
  const url = process.env.<CANONICO>_DB_URL;
  const key = process.env.<CANONICO>_DB_SERVICE_KEY;
  if (!url || !key) return false; // sin gate configurado, silencio: no rompe nada

  // Contexto legible para quien abra el lead en el CRM. El "por que" del lead
  // vale mas que los campos sueltos cuando alguien lo llama tres dias despues.
  const contexto = [
    `Origen: <superficie> (<url publica>).`,
    lead.phone ? `Telefono: ${lead.phone}.` : null,
  ].filter(Boolean).join(" ");

  try {
    const res = await fetch(`${url}/rest/v1/<tabla_canonica>`, {
      method: "POST",
      headers: { apikey: key, authorization: `Bearer ${key}`,
                 "content-type": "application/json", prefer: "return=minimal" },
      body: JSON.stringify({
        nombre: lead.name, email: lead.email, telefono: lead.phone ?? null,
        canal_origen: ORIGEN,
        estado: "<estado_inicial_real>", // leido de la data, no inventado
        notas: contexto,
      }),
      signal: AbortSignal.timeout(8000), cache: "no-store",
    });
    return res.ok;
  } catch {
    return false; // el canonico caido no puede tumbar la captura del lead
  }
}
```

---

## 3. Espejo a hoja de calculo (con candado del otro lado)

El script que va pegado en la hoja esta en `apps-script-espejo.js` — incluye candado de
concurrencia y deduplicacion, ambos indispensables.

```ts
// lib/hoja.ts — empuje instantaneo de UNA fila.
const TZ_OFFSET_H = <-5>; // zona del negocio, sin horario de verano

export interface Fila { canal: string; nombre: string; contacto: string; detalle: string; }

/** Mismo formato EXACTO que el reporte periodico: sin esto la deduplicacion no coincide. */
function fechaHoraLocal(ahora: Date): { fecha: string; hora: string } {
  const local = new Date(ahora.getTime() + TZ_OFFSET_H * 3600_000).toISOString();
  return { fecha: local.slice(0, 10), hora: local.slice(11, 16) };
}

/** Nunca lanza. Un fallo de la hoja jamas afecta la captura. */
export async function espejarAHoja(fila: Fila): Promise<boolean> {
  const hook = process.env.HOJA_WEBHOOK_URL;
  const token = process.env.HOJA_WEBHOOK_TOKEN;
  if (!hook || !token) return false;

  const { fecha, hora } = fechaHoraLocal(new Date());
  // GOTCHA CRITICO: el token va en la URL, NUNCA en el body.
  // Apps Script solo puebla e.parameter desde query params o form-urlencoded.
  const url = `${hook}${hook.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`;

  try {
    const res = await fetch(url, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ fecha, filas: [{ hora, ...fila }] }),
      // Corto a proposito: si el candado esta ocupado no vale la pena hacer
      // esperar a nadie — el reporte periodico lo recupera esta noche.
      signal: AbortSignal.timeout(5000),
    });
    // Verifica el CUERPO, no solo el status: este endpoint devuelve 200 al rechazar.
    const texto = await res.text();
    return res.ok && texto.includes('"ok":true');
  } catch { return false; }
}
```

---

## 4. Aviso en vivo al operador

```ts
/** Espejo a chat del operador. Fire-and-almost-forget: ≤3 s, nunca rompe. */
async function avisoEnVivo(row: Record<string, unknown>): Promise<void> {
  const token = process.env.AVISO_BOT_TOKEN;
  const chat = process.env.AVISO_CHAT_ID;
  if (!token || !chat) return;
  const text =
    `Nuevo lead: ${String(row.name)}\n` +
    `${String(row.email)}\n` +
    `Origen: ${String(row.origen)}`;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text }),
      signal: AbortSignal.timeout(3000),
    });
  } catch { /* el aviso jamas tumba el registro */ }
}
```

> Si el negocio ya tiene un canal de avisos, **reutiliza el mismo destino** en vez de crear
> otro. Un operador con cinco chats deja de mirar los cinco. Pero verifica a que chat apunta
> cada variable: dos tokens parecidos que van a chats distintos es un error silencioso caro.

---

## 5. Reporte periodico de reconciliacion

Cumple tres funciones a la vez: resumen legible, red de seguridad del camino instantaneo, y
mantiene vivas las conexiones a las bases (evita suspension por inactividad en planes free).

```ts
// GET /api/reporte-periodico — programado (cron) una vez al dia.
export const maxDuration = 30;

const TZ_OFFSET_H = <-5>;

/** Ventana [00:00, 24:00) local del dia, en ISO UTC. */
function ventanaDelDia(ahora: Date) {
  const local = new Date(ahora.getTime() + TZ_OFFSET_H * 3600_000);
  const inicio = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  const desde = new Date(inicio - TZ_OFFSET_H * 3600_000);
  const hasta = new Date(desde.getTime() + 86_400_000);
  return { desde: desde.toISOString(), hasta: hasta.toISOString(),
           etiqueta: new Date(inicio).toISOString().slice(0, 10) };
}

export async function GET(req: Request) {
  // El cron manda el secreto; una llamada manual sin el devuelve el resumen SIN
  // enviar correo — asi se puede probar sin spamear al operador.
  const secreto = process.env.CRON_SECRET;
  const esCron = !secreto || req.headers.get("authorization") === `Bearer ${secreto}`;
  const forzar = new URL(req.url).searchParams.get("enviar") === "1";

  const { desde, hasta, etiqueta } = ventanaDelDia(new Date());

  // 1. Consulta CADA fuente por su ventana del dia → arma filas con formato UNICO
  //    (identico al del empuje instantaneo, o la deduplicacion no coincide).
  // 2. Empuja las filas a la hoja (el destino deduplica: no duplica lo ya enviado).
  // 3. Envia UN correo con la tabla del dia.
  // Devuelve siempre un JSON con el conteo por canal para poder auditar sin correo.
  return Response.json({ ok: true, fecha: etiqueta, /* total, porCanal, correo, hoja */ });
}
```

---

## 6. Checklist de invariantes antes de dar por cerrado

- [ ] Un solo archivo escribe en la tabla de captura.
- [ ] Todos los espejos en `Promise.allSettled`; cada funcion devuelve `boolean` y no lanza.
- [ ] Todos los espejos tienen timeout explicito (3-8 s).
- [ ] Lo lento va despues de responder (`after` / cola / `waitUntil`).
- [ ] Indice unico en el canonico; el conflicto se trata como exito.
- [ ] Consentimiento obligatorio + version del texto guardada.
- [ ] Llaves de servicio solo en servidor; token de operador jamas en el hosting.
- [ ] Camino instantaneo y periodico emiten formato identico.
- [ ] La verificacion mira el cuerpo de la respuesta, no solo el codigo HTTP.
