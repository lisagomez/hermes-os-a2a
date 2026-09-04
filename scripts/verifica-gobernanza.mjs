#!/usr/bin/env node
/**
 * Verificador de cableado de la capa de gobernanza.
 *
 * Falla (exit 1) si el papel y el codigo divergen: si falta un control, si CLAUDE.md dejo
 * de referenciar la capa, si prp-base.md perdio sus secciones, si una plantilla
 * referenciada no existe, o si el gate desaparecio de la ruta de deploy.
 *
 * Es el principio de §9 de GOBERNANZA.md aplicado a la propia capa: un documento que nada
 * obliga a mantener se pudre en silencio.
 *
 * ---------------------------------------------------------------------------
 * PORTADO del template el 2026-09-04 (Fase 4 del plan de alineacion), RECORTADO.
 *
 * De las 37 rutas que exige el verificador de origen, 25 no existen aqui: no son huecos de
 * gobernanza, son otros subsistemas de aquel template (imprenta de CLIs, routing por nivel,
 * contabilidad de tokens, presupuesto de contexto, empaquetador, specs EARS, deploy
 * dimensionado, ancla de imagen del agente, portabilidad de arneses). Portarlos dejaria el
 * gate rojo desde el primer dia — y un gate que nace rojo se desactiva, que es el mismo modo
 * de fallo que uno que siempre pasa.
 *
 * Adaptaciones deliberadas, cada una justificada donde ocurre:
 *   - GEMINI.md: solo se exige el PUNTERO a la capa (decision del CDC 2026-09-04).
 *   - la ruta de deploy es CI, no `npm run deploy`: Hermes despliega por Vercel y Docker.
 *   - las firmas pendientes se LISTAN, no tumban el gate (ver bloque 6b).
 *   - el corpus (HT-nn) se vigila desde la Fase 6, cuando exista su rama.
 * ---------------------------------------------------------------------------
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GOB = '.claude/gobernanza';

const fallos = [];
const ok = [];
const avisos = [];

const ruta = (p) => join(raiz, p);
const lee = (p) => (existsSync(ruta(p)) ? readFileSync(ruta(p), 'utf8') : null);

const vistas = new Set();
function comprueba(descripcion, condicion, pista) {
  if (vistas.has(descripcion)) return; // una referencia repetida se verifica una vez
  vistas.add(descripcion);
  if (condicion) ok.push(descripcion);
  else fallos.push({ descripcion, pista });
}

/** Busca un basename en el repo, ignorando ruido. Un enlace a `prp-base.md` es valido
 *  aunque el archivo viva en .claude/PRPs/ y no junto al documento que lo nombra. */
const IGNORAR = new Set(['node_modules', '.next', '.git', 'dist', '.turbo', 'test-results', '.venv']);
function existeEnRepo(basename, desde = raiz) {
  for (const entrada of readdirSync(desde, { withFileTypes: true })) {
    if (IGNORAR.has(entrada.name)) continue;
    if (entrada.isDirectory()) {
      if (existeEnRepo(basename, join(desde, entrada.name))) return true;
    } else if (entrada.name === basename) return true;
  }
  return false;
}

// --- 1. Los documentos de la capa existen -----------------------------------
const documentos = [
  `${GOB}/GOBERNANZA.md`,
  `${GOB}/golden-sets/contratos.json`,
  `${GOB}/REGISTRO-RIESGO.md`,
  `${GOB}/BITACORA-CDC.md`,
  `${GOB}/INCIDENTES.md`,
  `${GOB}/plantillas/aisia.md`,
  `${GOB}/plantillas/modelo-amenazas.md`,
  `${GOB}/plantillas/incidente.md`,
];
for (const doc of documentos) {
  comprueba(`existe ${doc}`, existsSync(ruta(doc)), 'el documento fue borrado o movido');
}

// --- 2. Los 7 controles siguen declarados -----------------------------------
const gobernanza = lee(`${GOB}/GOBERNANZA.md`) ?? '';
const controles = {
  C1: 'Cambio de Comportamiento',
  C2: 'regresión de skills',
  C3: 'Modelo de amenazas',
  C4: 'Evaluación de Impacto',
  C5: 'decisiones de riesgo',
  C6: 'incidente',
  C7: 'service_role',
};
for (const [id, titulo] of Object.entries(controles)) {
  comprueba(
    `GOBERNANZA.md declara ${id} (${titulo})`,
    gobernanza.includes(`**${id}**`) && gobernanza.includes(titulo),
    `el control ${id} desaparecio del documento`,
  );
}

// --- 2b. Cada control apunta al documento VIVO de Hermes que lo desarrolla ---
// La tesis de esta capa es que NO duplica doctrina: indexa los nueve documentos de
// businessos/gobernanza/ y les da un puntero de vuelta. Si el puntero se cae, la capa
// se convierte en la segunda fuente que vino a evitar.
const PUNTEROS = {
  C3: 'businessos/gobernanza/modelo-amenazas-v1.md',
  C4: 'businessos/gobernanza/adenda-iso42001.md',
  C6: 'businessos/gobernanza/procedimiento-incidente-inyeccion.md',
  C7: 'businessos/gobernanza/decision-service-role.md',
};
for (const [id, destino] of Object.entries(PUNTEROS)) {
  comprueba(
    `${id} apunta al documento vivo (${destino})`,
    gobernanza.includes(destino.split('/').pop()) && existsSync(ruta(destino)),
    `el puntero de ${id} se rompio: o GOBERNANZA.md dejo de nombrarlo, o el documento se movio`,
  );
}

// --- 3. CLAUDE.md referencia la capa (el cable principal) -------------------
const claudeMd = lee('CLAUDE.md') ?? '';
comprueba(
  'CLAUDE.md referencia .claude/gobernanza/',
  claudeMd.includes('.claude/gobernanza'),
  'la capa quedo suelta: sin esto nada del flujo obliga a consultarla',
);
comprueba(
  'CLAUDE.md tiene entrada de gobernanza en su decision tree',
  /gobernanza/i.test(claudeMd) && claudeMd.includes('Decision Tree'),
  'añade la rama de gobernanza al decision tree',
);
comprueba(
  'CLAUDE.md declara la regla service_role (C7) en Reglas de Codigo',
  claudeMd.includes('service_role'),
  'sin esta regla, "SIEMPRE habilitar RLS" es decorativo',
);

// --- 3b. GEMINI.md: SOLO el puntero ----------------------------------------
// Decision registrada (CDC 2026-09-04): GEMINI.md queda fuera del alcance de las reglas
// inline. Es una copia manual que ya divergio del proyecto —todavia se presenta como
// "SaaS Factory V4"— y Hermes no tiene generador que la sincronice (no hay AGENTS.md raiz
// del que derivarla). Duplicar alli las diez reglas crearia una segunda fuente que se
// pudre. Lo que SI se exige es el puntero: sin el, una sesion con Gemini se salta la capa.
const geminiMd = lee('GEMINI.md');
if (geminiMd !== null) {
  comprueba(
    'GEMINI.md apunta a la capa de gobernanza',
    geminiMd.includes('.claude/gobernanza'),
    'sin el puntero, una sesion con Gemini ignoraria los siete controles',
  );
  comprueba(
    'GEMINI.md apunta a CLAUDE.md como fuente de las reglas',
    /CLAUDE\.md/.test(geminiMd),
    'el espejo debe declarar donde viven las reglas vinculantes, o se lee como si fuera la fuente',
  );
  comprueba(
    'GEMINI.md declara su propia divergencia',
    /ESPEJO RANCIO|espejo rancio|divergi/i.test(geminiMd),
    'un espejo desactualizado que no se declara como tal engaña mas que un archivo ausente',
  );
}

// --- 3c. Los READMEs documentan la capa --------------------------------------
for (const readme of ['README.md', '.claude/README.md']) {
  const contenido = lee(readme);
  if (contenido === null) continue;
  comprueba(
    `${readme} documenta la capa de gobernanza`,
    contenido.includes('gobernanza'),
    'la documentacion publica dejo de mencionar la capa',
  );
}

// --- 3d. new-app sigue emitiendo la gobernanza en BUSINESS_LOGIC.md ---------
const newApp = lee('.claude/skills/new-app/SKILL.md');
if (newApp !== null) {
  comprueba(
    'el skill new-app emite la seccion de Gobernanza en BUSINESS_LOGIC.md',
    /##\s*\d+\.\s*Gobernanza/.test(newApp),
    'sin esto, cada proyecto nuevo nace sin evaluacion de impacto (C4)',
  );
}
const businessLogic = lee('BUSINESS_LOGIC.md');
if (businessLogic !== null) {
  comprueba(
    'BUSINESS_LOGIC.md incluye su seccion de Gobernanza',
    /Gobernanza/.test(businessLogic),
    'fue generado antes de la capa: regeneralo o anade la seccion a mano',
  );
}

// --- 3d-bis. Todo paso de `validate` esta declarado en la documentacion -----
// Un gate que corre sin que ningun documento lo nombre es media divergencia papel-codigo:
// quien lee el README no sabe que existe, y quien lo quite no encuentra que actualizar.
{
  const pkgTxt = lee('package.json');
  const pkgJson = pkgTxt === null ? null : JSON.parse(pkgTxt);
  const validate = pkgJson?.scripts?.validate ?? '';
  const pasos = [...validate.matchAll(/npm run ([a-z:]+)/g)].map((m) => m[1]);
  const docs = ['README.md', '.claude/README.md']
    .map((d) => lee(d)).filter((t) => t !== null).join('\n');
  const sinDeclarar = pasos.filter((paso) => !docs.includes(paso));
  comprueba(
    `todo paso de validate esta declarado en la documentacion (${pasos.length} pasos)`,
    pasos.length > 0 && sinDeclarar.length === 0,
    `paso(s) sin declarar: ${sinDeclarar.join(', ')} — un gate que el papel no nombra no lo `
      + 'conoce quien lee, y quien lo quite no encuentra que actualizar',
  );
}

// --- 3e. El conteo de skills declarado coincide con los directorios reales ---
const dirSkills = join(raiz, '.claude/skills');
if (existsSync(dirSkills)) {
  const reales = readdirSync(dirSkills, { withFileTypes: true }).filter((e) => e.isDirectory()).length;
  const patrones = [/\b(\d+)\s+[Ss]kills\b/g, /[Ss]kills\s*\((\d+)\s*total\)/g, /[Ss]kills:\s*(\d+)/g];
  for (const doc of ['README.md', '.claude/README.md', 'CLAUDE.md']) {
    const contenido = lee(doc);
    if (contenido === null) continue;
    const declarados = new Set();
    for (const patron of patrones) {
      for (const [, n] of contenido.matchAll(patron)) declarados.add(Number(n));
    }
    if (declarados.size === 0) continue; // el documento no declara conteo: nada que verificar
    const malos = [...declarados].filter((n) => n !== reales);
    comprueba(
      `${doc} declara el numero real de skills (${reales})`,
      malos.length === 0,
      `declara ${malos.join(', ')} pero hay ${reales} directorios en .claude/skills/`,
    );
  }
}

// --- 3f. Las reglas que NO disparaban, inline en CLAUDE.md ------------------
// Vivian solo en GOBERNANZA.md y por eso no obligaban: el documento explica, las reglas
// obligan. Cada ancla apunta a lo que SOLO afirma su regla — no a palabras que tambien
// salen en el decision tree, porque entonces el control negativo pasa con la regla borrada.
{
  const doc = 'CLAUDE.md';
  const contenido = claudeMd;
  comprueba(
    `${doc}: el CDC (C1) nombra la configuracion (settings.json / model)`,
    /settings\.json/.test(contenido) && /BITACORA-CDC/.test(contenido),
    'sin nombrarla, un cambio de modelo se lee como tarea de config y el CDC no dispara',
  );
  comprueba(
    `${doc}: rechaza \`latest\` explicitamente`,
    /latest/.test(contenido) && /PINEADO|pineado/.test(contenido),
    'el modelo en produccion va pineado; latest es anti-patron',
  );
  comprueba(
    `${doc}: el pineo cubre tambien el tag de una imagen de agente`,
    /tag de una imagen de agente/.test(contenido),
    'una imagen con :latest cambia el comportamiento del sistema sin diff ni regresion',
  );
  comprueba(
    `${doc}: C5 esta en las reglas, no solo en el documento`,
    /REGISTRO-RIESGO/.test(contenido),
    'nadie enruta "acepto el riesgo" al registro si no esta en las reglas',
  );
  comprueba(
    `${doc}: declara el limite de C5 (riesgos infirmables)`,
    /INFIRMABLE|infirmable/.test(contenido) && /terceros/.test(contenido),
    'sin el limite, C5 se lee como llave maestra: una firma no cubre el daño a terceros',
  );
  comprueba(
    `${doc}: prohibe imprimir el valor de una variable de entorno`,
    /enmascar/i.test(contenido) && /variable de entorno|variables de entorno/i.test(contenido),
    'sin la regla es azar: un agente enmascara y otro imprime, y lo impreso queda en el transcript',
  );
  comprueba(
    `${doc}: el respaldo es un contrato y sus cifras no se inventan`,
    /respaldo/i.test(contenido) && /\bRPO\b/.test(contenido) && /\bRTO\b/.test(contenido),
    'sin la regla, un agente escribe un RPO/RTO que nadie midio — y acaba en una propuesta',
  );
  comprueba(
    `${doc}: los canales de chat externos exigen C3 y C4`,
    /entrada NO autenticada|entrada \*\*?no autenticada/i.test(contenido)
      && /Telegram/.test(contenido) && /Slack/.test(contenido)
      && /C3/.test(contenido) && /C4/.test(contenido),
    'un canal de chat es entrada no autenticada hacia un agente con llaves: sin la regla se conecta "rapido"',
  );
  comprueba(
    `${doc}: declara la regla de idioma`,
    /[Ii]dioma/.test(contenido) && /espa[nñ]ol/i.test(contenido),
    'sin regla explicita, una sesion fria de cada dos responde en ingles',
  );
}

// --- 3g. El gate esta en la RUTA DE DEPLOY ----------------------------------
// Hermes no despliega con `npm run deploy`: despliega por Vercel (merge a master) y por
// Docker en el servidor. Su ruta de deploy es el CI. Un gate que no corre ahi no es un gate:
// es un comando que alguien podria acordarse de correr.
{
  const ci = lee('.github/workflows/ci.yml');
  comprueba(
    'existe .github/workflows/ci.yml',
    ci !== null,
    'sin CI no hay ruta de deploy donde colgar el gate',
  );
  if (ci !== null) {
    comprueba(
      'el CI corre verify:gobernanza en cada PR',
      /verify:gobernanza/.test(ci),
      'el verificador quedo fuera de la ruta de deploy: se convierte en un comando opcional',
    );
    comprueba(
      'el CI corre la regresion de skills (C2 capa A)',
      /npm run regresion|regresion-skills/.test(ci),
      'sin C2 en CI, un skill puede perder una regla no negociable y fusionarse igual',
    );
    comprueba(
      'el CI se dispara en pull_request',
      /pull_request/.test(ci),
      'un gate que solo corre a mano no detiene nada',
    );
  }
}

// --- 3g-bis. `validate` corre lo que los documentos dicen que corre --------
{
  const pkgTxt = lee('package.json');
  const pkg = pkgTxt === null ? null : JSON.parse(pkgTxt);
  const validate = pkg?.scripts?.validate ?? '';
  for (const paso of ['typecheck', 'lint', 'build', 'verify:gobernanza', 'regresion']) {
    comprueba(
      `validate encadena ${paso}`,
      validate.includes(paso),
      `${paso} desaparecio de la cadena: el gate se encoge sin que nadie lo note`,
    );
  }
}

// --- 4. prp-base.md conserva sus secciones (el segundo cable) --------------
const prpBase = lee('.claude/PRPs/prp-base.md') ?? '';
comprueba(
  'prp-base.md contiene la seccion "Modelo de amenazas"',
  prpBase.includes('Modelo de amenazas'),
  'todo PRP debe responder: ¿quien nos ataca?',
);
comprueba(
  'prp-base.md contiene la seccion "Evaluación de impacto"',
  /Evaluaci[oó]n de impacto/i.test(prpBase),
  'todo PRP debe responder: ¿a quien podemos dañar sin atacante?',
);
comprueba(
  'prp-base.md pregunta por CDC aplicable',
  /CDC/.test(prpBase),
  'el PRP debe declarar si cambia comportamiento de agentes',
);

// --- 5. Toda plantilla y todo enlace referenciado existe -------------------
const enlaceMd = /\[[^\]]*\]\(([^)#]+\.md)\)/g;
for (const doc of documentos) {
  const contenido = lee(doc);
  if (!contenido) continue;
  for (const [, destino] of contenido.matchAll(enlaceMd)) {
    if (/^https?:/.test(destino)) continue;
    const resuelto = join(dirname(doc), destino);
    comprueba(
      `enlace vivo: ${doc} -> ${destino}`,
      existsSync(ruta(resuelto)),
      'enlace roto hacia una plantilla inexistente',
    );
  }
}
/** El corpus y sus reportes viven en la rama `golden-sets`, nunca en disco (protocolo
 *  ciego): nombrarlos NO es un enlace roto. Se comprueba tambien alli. */
const enRamaCorpus = (basename) => {
  for (const ref of ['golden-sets', 'origin/golden-sets']) {
    try {
      execFileSync('git', ['cat-file', '-e', `${ref}:${basename}`], { cwd: raiz, stdio: 'ignore' });
      return true;
    } catch { /* la rama no existe o no tiene el archivo */ }
  }
  return false;
};
const refBacktick = /`((?:\.\.\/)?(?:plantillas\/)?[A-Za-z0-9_.-]+\.md)`/g;
for (const [, destino] of gobernanza.matchAll(refBacktick)) {
  const resuelto = join(GOB, destino);
  const basename = destino.split('/').pop();
  comprueba(
    `referencia viva: GOBERNANZA.md -> ${destino}`,
    existsSync(ruta(resuelto)) || existeEnRepo(basename) || enRamaCorpus(basename),
    'GOBERNANZA.md nombra un archivo que no existe ni en el repo ni en la rama golden-sets',
  );
}

// --- 6. Los registros append-only conservan su marca ----------------------
for (const registro of [`${GOB}/REGISTRO-RIESGO.md`, `${GOB}/BITACORA-CDC.md`, `${GOB}/INCIDENTES.md`]) {
  const contenido = lee(registro) ?? '';
  comprueba(
    `${registro} conserva la marca append-only`,
    /NO editar (las|los) anteriores/i.test(contenido),
    'sin la marca, alguien reescribira una decision pasada',
  );
}

// --- 6b. Ninguna entrada se queda sin firma (y las pendientes se VEN) ------
// El original tumba el gate ante cualquier entrada sin firmar. Aqui NO, y es deliberado:
// la adopcion de esta capa nace con firmas pendientes de la dueña por diseño —un agente no
// puede fabricarlas— y un gate que nace rojo se desactiva, que es el modo de fallo que este
// plan existe para evitar.
//
// Lo que se conserva es el proposito real del control: que una entrada sin firma no pase
// DESAPERCIBIDA (en el template paso una que llevaba dias sin firma porque nada la miraba).
// Aqui se listan, ruidosamente, en cada corrida. Lo que SI tumba el gate es una entrada
// malformada: sin campo de firma, o con un marcador que no es el canonico — porque eso ya
// no es "esperando a una persona", es una entrada que perdio su forma.
const FIRMA = /^[-*]\s+\*\*(?:Firmado|Aprobado) por\*\*(?:\s*\([^)]*\))?:\s*(.+)$/m;
const PENDIENTE_CANONICO = /^_pendiente de firma_$/;
for (const registro of [`${GOB}/REGISTRO-RIESGO.md`, `${GOB}/BITACORA-CDC.md`]) {
  const contenido = lee(registro) ?? '';
  const cuerpo = contenido.split(/^##\s+Entradas\s*$/m)[1];
  const malformadas = [];
  const pendientes = [];
  for (const entrada of (cuerpo ?? '').split(/^### /m).slice(1)) {
    const titulo = entrada.split('\n')[0].trim().slice(0, 60);
    const firma = entrada.match(FIRMA);
    if (!firma) { malformadas.push(`${titulo} (sin campo de firma)`); continue; }
    const valor = firma[1].trim();
    if (PENDIENTE_CANONICO.test(valor)) { pendientes.push(titulo); continue; }
    if (/^(\[|☐|todo\b|—\s*$|xxx)/i.test(valor)) malformadas.push(`${titulo} (marcador no canonico: "${valor}")`);
  }
  comprueba(
    `toda entrada de ${registro} tiene su campo de firma en forma`,
    cuerpo !== undefined && malformadas.length === 0,
    cuerpo === undefined
      ? 'no se encontro la seccion "## Entradas": el registro cambio de forma'
      : `malformada(s): ${malformadas.join(' | ')} — o se firma, o se marca "_pendiente de firma_"`,
  );
  if (pendientes.length > 0) avisos.push(`${registro}: ${pendientes.length} entrada(s) esperan firma humana → ${pendientes.join(' | ')}`);
}

// --- 7. C1 muerde sobre .mcp.json -----------------------------------------
// C1 declara `.mcp.json` material de CDC, pero `.gitignore` lo excluye (y debe: lleva
// credenciales vivas). Sin superficie trackeada, "diff revisado" es imposible y el control
// se vuelve papel. El espejo es `example.mcp.json`, que SI se versiona.
const servidores = (texto) => {
  try {
    const j = JSON.parse(texto ?? '');
    return Object.entries(j.mcpServers ?? {}).filter(([, v]) => v && typeof v === 'object').map(([k]) => k);
  } catch {
    return null;
  }
};
const ejemplo = lee('.claude/example.mcp.json');
comprueba(
  'existe .claude/example.mcp.json (superficie revisable de los MCP)',
  ejemplo !== null && servidores(ejemplo) !== null,
  'sin el ejemplo trackeado, un cambio de MCP no pasa por revision de codigo',
);
const real = lee('.mcp.json');
// Las comprobaciones sobre el `.mcp.json` VIVO se emiten SIEMPRE, exista o no: si fueran
// condicionales, el TOTAL dependeria de la maquina y el bloque 9 (que declara ese total en
// los README) saldria rojo en unas y verde en otras por una divergencia inexistente.
const SIN_VIVO = real === null ? ' (no hay .mcp.json vivo en esta maquina)' : '';
const declarados = new Set(servidores(ejemplo ?? '') ?? []);
const configurados = servidores(real ?? '') ?? [];
const huerfanos = configurados.filter((s) => !declarados.has(s));
comprueba(
  `todo servidor MCP configurado esta declarado en example.mcp.json${SIN_VIVO}`,
  huerfanos.length === 0,
  `sin declarar: ${huerfanos.join(', ')} — anadir un MCP es un CDC (C1) y debe quedar revisable`,
);
const FLOTANTE = /@latest|:latest|@next\b|:main\b|@canary/;
if (ejemplo !== null) {
  const flotantes = ejemplo.split('\n').filter((l) => FLOTANTE.test(l)).map((l) => l.trim().slice(0, 60));
  comprueba(
    'example.mcp.json pinea sus servidores MCP (sin alias auto-actualizables)',
    flotantes.length === 0,
    `flotante(s): ${flotantes.join(' | ')} — es el anti-patron de C1, aqui tambien`,
  );
  let vivos = [];
  try {
    const j = JSON.parse(ejemplo);
    for (const [nombre, cfg] of Object.entries(j.mcpServers ?? {})) {
      if (!cfg || typeof cfg !== 'object') continue;
      for (const [clave, valor] of Object.entries(cfg.env ?? {})) {
        if (typeof valor === 'string' && valor !== '' && !/^(YOUR_|<|\$\{)/.test(valor)) vivos.push(`${nombre}.${clave}`);
      }
    }
  } catch { vivos = ['(example.mcp.json no es JSON valido)']; }
  comprueba(
    'example.mcp.json no lleva credenciales reales, solo placeholders',
    vivos.length === 0,
    `valores sospechosos en ${vivos.join(', ')} — el ejemplo se versiona: ahi solo van YOUR_* o \${VAR}`,
  );
}
const flotantesVivos = (real ?? '').split('\n').filter((l) => FLOTANTE.test(l)).map((l) => l.trim().slice(0, 60));
comprueba(
  `.mcp.json vivo pinea sus servidores MCP${SIN_VIVO}`,
  flotantesVivos.length === 0,
  `flotante(s): ${flotantesVivos.join(' | ')} — los esquemas que se pagan en CADA sesion pueden cambiar sin gate`,
);

// --- 8. Ningun archivo versionado lleva una credencial viva -----------------
const FIRMAS_CRED = [
  ['token de Supabase (sbp_)', /sbp_[A-Za-z0-9]{36,}/],
  ['clave estilo OpenAI/OpenRouter (sk-)', /\bsk-[A-Za-z0-9_-]{24,}/],
  ['token de GitHub', /\bghp_[A-Za-z0-9]{36}|\bgithub_pat_[A-Za-z0-9_]{50,}/],
  ['token de Slack', /\bxox[baprs]-[A-Za-z0-9-]{12,}/],
  ['token de Telegram', /\b\d{8,10}:AA[A-Za-z0-9_-]{30,}/],
  ['clave de AWS', /\bAKIA[0-9A-Z]{16}\b/],
  ['clave privada PEM', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['JWT con las tres partes completas', /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/],
];
// Este propio script contiene las firmas: se excluye o se delata a si mismo.
const SIN_ESCANEAR = new Set(['scripts/verifica-gobernanza.mjs', 'package-lock.json']);
let versionadosCred = null;
try {
  // `-z` (separador NUL) es obligatorio: sin el, git ENTRECOMILLA y escapa en octal toda
  // ruta con acentos o espacios ("docs/Validaci\303\263n....md"), y esa ruta escapada no
  // existe en disco -> el escaneo la reportaba como "no se pudo leer". Un falso rojo que
  // manda a buscar donde no es, sobre un repo en espanol donde eso es la norma.
  versionadosCred = execFileSync('git', ['ls-files', '-z'], { cwd: raiz, encoding: 'utf8' })
    .split('\0').filter((f) => f && !SIN_ESCANEAR.has(f));
} catch { /* sin listado no hay nada que escanear; se reporta abajo */ }
comprueba(
  'el arbol versionado se puede listar (requisito del escaneo de credenciales)',
  versionadosCred !== null,
  'git ls-files fallo: sin el listado, el escaneo de credenciales no prueba nada',
);
/** Un placeholder no es una credencial. Se distingue por ENTROPIA, no por lista blanca de
 *  archivos: una lista blanca dejaria pasar un secreto real que aterrice manana en
 *  `.env.example`. Y lo que se descarta se DECLARA abajo, en vez de callarlo: "no es un
 *  secreto" tiene que ser una afirmacion visible, no un silencio. */
const esPlaceholder = (v) => {
  const cuerpo = v.replace(/^(sk-(or-|ant-)?|ghp_|xox.-|AKIA)/, '');
  if (new Set(cuerpo).size <= 8) return true;                 // entropia ridicula
  return /x{4,}|0{4,}|abcdefghij|YOUR_|EXAMPLE|PLACEHOLDER|CHANGEME|TU_|AQUI|<.*>/i.test(v);
};

if (versionadosCred !== null) {
  const encontrados = [];
  const descartados = [];
  const ilegibles = [];
  for (const archivo of versionadosCred) {
    let esArchivo = false;
    try { esArchivo = statSync(ruta(archivo)).isFile(); } catch { /* borrado o roto */ }
    if (!esArchivo) { if (!existsSync(ruta(archivo))) ilegibles.push(archivo); continue; }
    const contenido = lee(archivo);
    if (contenido === null) { ilegibles.push(archivo); continue; }
    if (contenido.includes(String.fromCharCode(0))) continue; // binario
    for (const [nombre, patron] of FIRMAS_CRED) {
      for (const m of contenido.match(new RegExp(patron.source, 'g')) ?? []) {
        if (esPlaceholder(m)) descartados.push(`${archivo} (${nombre})`);
        else encontrados.push(`${archivo} (${nombre})`);
      }
    }
  }
  comprueba(
    'ningun archivo versionado lleva una credencial viva',
    encontrados.length === 0,
    `${encontrados.join('; ')} — rotala YA: lo versionado se hereda, y git recuerda aunque lo borres`,
  );
  // Un archivo que no se pudo mirar NO es un archivo limpio: se dice, en vez de sumarlo al verde.
  if (descartados.length > 0) {
    const unicos = [...new Set(descartados)];
    avisos.push(`escaneo de credenciales: ${descartados.length} coincidencia(s) descartadas por forma de placeholder → ${unicos.join(', ')}`);
  }
  comprueba(
    'ningun archivo versionado quedo sin escanear',
    ilegibles.length === 0,
    `sin mirar: ${ilegibles.join(', ')} — no se pudo leer, que no es lo mismo que estar limpio`,
  );
}

// --- 9. La cifra de comprobaciones que declaran los README es la real -------
// Va al final porque necesita el total, y se cuenta a si misma: una comprobacion por
// documento que declare cifra. Misma pudricion que el conteo de skills, mismo remedio.
const DECLARAN_CIFRA = ['README.md', '.claude/README.md']
  .map((doc) => ({ doc, contenido: lee(doc) }))
  .filter(({ contenido }) => contenido !== null)
  .map(({ doc, contenido }) => {
    const linea = contenido.split('\n').find((l) => /verify:gobernanza/.test(l) && /\d+\s+comprobaciones/.test(l));
    return { doc, cifra: linea ? Number(linea.match(/(\d+)\s+comprobaciones/)[1]) : null };
  })
  .filter(({ cifra }) => cifra !== null);
const totalEsperado = ok.length + fallos.length + DECLARAN_CIFRA.length;
for (const { doc, cifra } of DECLARAN_CIFRA) {
  comprueba(
    `${doc} declara el numero real de comprobaciones del verificador (${totalEsperado})`,
    cifra === totalEsperado,
    `declara ${cifra} pero el verificador hace ${totalEsperado}: actualizar la linea de verify:gobernanza`,
  );
}

// --- Reporte --------------------------------------------------------------
const total = ok.length + fallos.length;
for (const linea of ok) console.log(`  \x1b[32m✓\x1b[0m ${linea}`);
for (const f of fallos) {
  console.log(`  \x1b[31m✗\x1b[0m ${f.descripcion}`);
  console.log(`      \x1b[2m↳ ${f.pista}\x1b[0m`);
}
if (avisos.length > 0) {
  console.log('');
  for (const a of avisos) console.log(`  \x1b[33m⧗\x1b[0m ${a}`);
  console.log('  \x1b[2mUna firma la pone una persona; ningun agente puede fabricarla.\x1b[0m');
}
console.log('');
if (fallos.length === 0) {
  console.log(`\x1b[32mGobernanza cableada: ${ok.length}/${total} comprobaciones en verde.\x1b[0m`);
  process.exit(0);
}
console.log(`\x1b[31mGobernanza DIVERGENTE: ${fallos.length} de ${total} comprobaciones fallaron.\x1b[0m`);
console.log('\x1b[2mEl papel y el codigo dejaron de decir lo mismo. Ese es el hallazgo que un auditor busca.\x1b[0m');
process.exit(1);
