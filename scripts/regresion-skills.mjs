#!/usr/bin/env node
/**
 * Control C2 — suite de regresion de skills.
 *
 * Capa A (por defecto): contratos estructurales de cada SKILL.md. Deterministas, sin
 *   invocar al modelo, corren en cada build y en cada PR. Comparan por FORMA, no por
 *   texto: da igual como este redactado un skill mientras siga declarando lo que no se
 *   negocia.
 *
 * Capa B (--trampa): corpus de entradas adversariales que DEBEN escalar o negarse.
 *   Requiere invocar al modelo, asi que no es determinista ni gratuita: se corre en cada
 *   CDC, no en cada build. Aqui solo se verifica que el corpus este completo y se lista.
 *
 * Verde = promovible. Rojo = el cambio de modelo/skill NO se promueve.
 *
 * Portado del template el 2026-09-04 (Fase 3 del plan de alineacion). Diferencias con el
 * original, todas deliberadas:
 *   - el espacio de identificadores del corpus es HT-nn, no el del template: con aquel,
 *     27 archivos versionados de este repo romperian la regla del protocolo ciego;
 *   - se comprueba la COBERTURA (`_cobertura_minima`): borrar un contrato tiene que ser un
 *     acto visible, no una reduccion silenciosa del numero de comprobaciones;
 *   - la resolucion de la rama del corpus va inline (el template la tiene en lib/corpus.mjs,
 *     compartida con scripts que aqui no existen).
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR_SKILLS = join(raiz, '.claude/skills');
const DIR_GOLDEN = join(raiz, '.claude/gobernanza/golden-sets');
const RAMA_CORPUS = 'golden-sets';
const modoTrampa = process.argv.includes('--trampa');

const fallos = [];
const ok = [];
const anota = (desc, cond, pista) => (cond ? ok.push(desc) : fallos.push({ desc, pista }));

const git = (args) => execFileSync('git', args, { cwd: raiz, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
/** Un clon normal trae `origin/golden-sets` sin crear la rama local: se prueba la local y,
 *  si no existe, la remota. Sin esto, capa B seria inaccesible en toda maquina recien clonada. */
function refCorpus() {
  for (const ref of [RAMA_CORPUS, `origin/${RAMA_CORPUS}`]) {
    try {
      git(['rev-parse', '--verify', '--quiet', ref]);
      return ref;
    } catch { /* no existe: se prueba la siguiente */ }
  }
  return null;
}

// ---------------------------------------------------------------- capa B
if (modoTrampa) {
  // El corpus NO vive en el arbol de trabajo: se saca a su propia rama para que una sesion
  // fria que trabaja en master no lo encuentre leyendo el directorio. Se lee de la rama,
  // nunca se materializa en disco.
  const ref = refCorpus();
  if (!ref) {
    console.error(`No existe la rama "${RAMA_CORPUS}" (ni local ni origin/): C2 capa B esta inaccesible.`);
    console.error(`Crearla es la Fase 6 del plan de alineacion. Si ya existe: git fetch origin ${RAMA_CORPUS}:${RAMA_CORPUS}`);
    process.exit(1);
  }
  let corpus = null;
  try {
    corpus = git(['show', `${ref}:casos-trampa.md`]);
  } catch {
    console.error(`La rama "${ref}" existe pero no tiene casos-trampa.md.`);
    process.exit(1);
  }
  const casos = [...corpus.matchAll(/^##\s+(HT-\d+)\s*·\s*(.+)$/gm)];
  const esperado = new Map();
  anota(`el corpus declara casos (${casos.length})`, casos.length > 0, 'corpus vacio');
  for (const [, id] of casos) {
    const bloque = corpus.split(new RegExp(`^##\\s+${id}\\s`, 'm'))[1]?.split(/^## /m)[0] ?? '';
    const b64 = bloque.match(/\*\*Expectativa \(b64\):\*\*\s*```([\s\S]*?)```/);
    anota(
      `${id} declara entrada y expectativa`,
      /\*\*Entrada:\*\*/.test(bloque) && b64 !== null,
      'un caso sin expectativa no se puede evaluar: es decoracion',
    );
    if (b64) esperado.set(id, Buffer.from(b64[1].replace(/\s+/g, ''), 'base64').toString('utf8'));
  }
  console.log('\nCasos-trampa a ejecutar en este CDC (sesion limpia, comparacion estructural):\n');
  for (const [, id, titulo] of casos) {
    console.log(`\n  \x1b[1m${id} · ${titulo}\x1b[0m`);
    const exp = esperado.get(id);
    if (exp) console.log(exp.split('\n').map((l) => `      ${l}`).join('\n'));
  }
  console.log('\n  \x1b[2mLas expectativas viven en base64 para que un agente no las lea por accidente.');
  console.log('  Ejecutar cada caso en una SESION FRIA, sin el contexto del cambio.\x1b[0m');
  console.log('  Resultado -> anotarlo en .claude/gobernanza/BITACORA-CDC.md\n');
}

// ---------------------------------------------------------------- capa A
if (!modoTrampa) {
  const contratos = JSON.parse(readFileSync(join(DIR_GOLDEN, 'contratos.json'), 'utf8'));
  const skills = readdirSync(DIR_SKILLS, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  anota(`hay skills que verificar (${skills.length})`, skills.length > 0, 'no se encontro ningun skill');

  for (const skill of skills) {
    const ruta = join(DIR_SKILLS, skill, 'SKILL.md');
    if (!existsSync(ruta)) {
      anota(`${skill}: tiene SKILL.md`, false, 'un directorio en skills/ sin SKILL.md no es un skill');
      continue;
    }
    const contenido = readFileSync(ruta, 'utf8');
    const aplicables = [...(contratos.todos_los_skills ?? []), ...(contratos.skills?.[skill] ?? [])];
    for (const { patron, prohibido, porque } of aplicables) {
      // `prohibido` es el contrato al reves: la forma que NO debe volver. Existe porque un
      // contrato positivo no caza una regresion por ANADIDO — el skill puede seguir
      // declarando lo correcto y traer de vuelta, al lado, la sintaxis inventada que ya
      // costo una correccion (playwright: verbos del MCP que nunca existieron en el CLI).
      if (prohibido !== undefined) {
        anota(
          `${skill}: ${porque}`,
          !new RegExp(prohibido, 'm').test(contenido),
          `reaparecio /${prohibido}/ en ${skill}/SKILL.md`,
        );
        continue;
      }
      anota(
        `${skill}: ${porque}`,
        new RegExp(patron, 'm').test(contenido),
        `no se encontro /${patron}/ en ${skill}/SKILL.md`,
      );
    }
  }

  // Un skill con contrato declarado que ya no existe = contrato huerfano.
  for (const nombre of Object.keys(contratos.skills ?? {})) {
    anota(
      `el contrato de "${nombre}" apunta a un skill existente`,
      skills.includes(nombre),
      'contrato huerfano: el skill se renombro o se borro sin actualizar contratos.json',
    );
  }

  // La COBERTURA es una asercion, no un comentario. Sin esto, borrar contratos reduce el
  // numero de comprobaciones y el gate sigue "en verde" verificando menos — el gemelo del
  // bucle que recorre cero filas. Bajarla exige justificarla en el CDC.
  const conContrato = Object.keys(contratos.skills ?? {}).length;
  const minima = contratos._cobertura_minima ?? 0;
  anota(
    `la cobertura de contratos no bajo (${conContrato} skills con contrato especifico, minimo ${minima})`,
    conContrato >= minima,
    `bajo de ${minima} a ${conContrato}: borrar un contrato es un acto visible, no una reduccion silenciosa`,
  );

  // Contar CLAVES no basta: `"supabase": []` deja la clave puesta, la cobertura intacta y
  // el skill sin una sola regla vigilada. Es el mismo fallo que un bucle que recorre cero
  // filas — verde sin ejercitar nada. Se cuentan tambien los contratos, y se prohibe el
  // array vacio, que no es "menos vigilancia": es ninguna, disfrazada de entrada presente.
  const vacios = Object.entries(contratos.skills ?? {}).filter(([, v]) => !Array.isArray(v) || v.length === 0);
  anota(
    'ningun skill contratado tiene su lista de contratos vacia',
    vacios.length === 0,
    `vacios: ${vacios.map(([k]) => k).join(', ')} — una clave sin contratos deja el skill sin vigilar `
      + 'mientras la cobertura sigue cuadrando',
  );
  const totalContratos = Object.values(contratos.skills ?? {}).reduce((n, v) => n + (Array.isArray(v) ? v.length : 0), 0);
  const minimoContratos = contratos._contratos_minimos ?? 0;
  anota(
    `el numero de contratos no bajo (${totalContratos}, minimo ${minimoContratos})`,
    totalContratos >= minimoContratos,
    `bajo de ${minimoContratos} a ${totalContratos}: se puede vaciar un skill sin borrar su clave, `
      + 'y entonces la cobertura por claves no se entera',
  );
}

// ---------------------------------------------------------------- reporte
const total = ok.length + fallos.length;
for (const l of ok) console.log(`  \x1b[32m✓\x1b[0m ${l}`);
for (const f of fallos) {
  console.log(`  \x1b[31m✗\x1b[0m ${f.desc}`);
  console.log(`      \x1b[2m↳ ${f.pista}\x1b[0m`);
}
console.log('');
const capa = modoTrampa ? 'C2 capa B (casos-trampa)' : 'C2 capa A (contratos)';
if (fallos.length === 0) {
  console.log(`\x1b[32m${capa}: ${ok.length}/${total} en verde — promovible.\x1b[0m`);
  process.exit(0);
}
console.log(`\x1b[31m${capa}: ${fallos.length} de ${total} fallaron — NO promovible.\x1b[0m`);
console.log('\x1b[2mUn skill perdio una regla que no se negocia. Sin excepciones ni "se ve bien".\x1b[0m');
process.exit(1);
