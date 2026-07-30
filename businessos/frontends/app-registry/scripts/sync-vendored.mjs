#!/usr/bin/env node
// Sincroniza el registro canónico a las copias vendored de cada app interna.
//   node scripts/sync-vendored.mjs           → escribe las copias
//   node scripts/sync-vendored.mjs --check   → exit 1 si alguna copia driftó
// Los tests de cada app cablean --check: el drift se vuelve gate rojo, jamás
// silencioso. PROHIBIDO editar una copia a mano (la cabecera lo repite).

import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const AQUI = dirname(fileURLToPath(import.meta.url))
const PAQUETE = resolve(AQUI, '..')
const FRONTENDS = resolve(PAQUETE, '..')
const REPO = resolve(FRONTENDS, '..', '..')

const ARCHIVOS = ['apps.ts', 'nav.ts', 'index.ts']
const DESTINOS = [
  { app: 'mission-control', dir: join(REPO, 'src', 'shared', 'app-registry') },
  { app: 'control-interno', dir: join(FRONTENDS, 'control-interno', 'src', 'shared', 'app-registry') },
  { app: 'meeting-copilot', dir: join(FRONTENDS, 'meeting-copilot', 'src', 'shared', 'app-registry') },
]

const fuentes = Object.fromEntries(
  ARCHIVOS.map((a) => [a, readFileSync(join(PAQUETE, 'src', a), 'utf8')])
)
const hash = createHash('sha256')
  .update(ARCHIVOS.map((a) => fuentes[a]).join('\n'))
  .digest('hex')
  .slice(0, 12)
const version = /REGISTRY_VERSION = (\d+)/.exec(fuentes['apps.ts'])?.[1] ?? '?'

const cabecera = (archivo) =>
  `// VENDORED-FROM businessos/frontends/app-registry/src/${archivo} (v${version}, ${hash})\n` +
  `// NO editar aquí: editar el canónico y correr node scripts/sync-vendored.mjs\n`

function sinCabecera(contenido) {
  return contenido
    .split('\n')
    .filter((l) => !l.startsWith('// VENDORED-FROM') && !l.startsWith('// NO editar aquí'))
    .join('\n')
}

const modo = process.argv.includes('--check') ? 'check' : 'sync'
let drift = false

for (const { app, dir } of DESTINOS) {
  for (const archivo of ARCHIVOS) {
    const destino = join(dir, archivo)
    const esperado = cabecera(archivo) + fuentes[archivo]
    if (modo === 'sync') {
      mkdirSync(dir, { recursive: true })
      writeFileSync(destino, esperado)
      console.log(`sync  ${app}/${archivo}`)
    } else {
      const actual = existsSync(destino) ? readFileSync(destino, 'utf8') : ''
      if (sinCabecera(actual) !== sinCabecera(esperado)) {
        const vLocal = /\(v(\d+), /.exec(actual)?.[1] ?? 'ausente'
        console.error(`DRIFT ${app}/${archivo}: vendored v${vLocal} ← canónico v${version} — correr node scripts/sync-vendored.mjs`)
        drift = true
      }
    }
  }
}

if (modo === 'check') {
  if (drift) process.exit(1)
  console.log(`ok: las ${DESTINOS.length} copias coinciden con el canónico (v${version}, ${hash})`)
}
