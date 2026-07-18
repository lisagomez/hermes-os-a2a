import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { cwd } from 'node:process'

const root = cwd()
const standaloneSource = join(root, '.next', 'standalone')
const staticSource = join(root, '.next', 'static')
const publicSource = join(root, 'public')
const resourceRoot = join(root, 'src-tauri', 'resources', 'next')
const standaloneTarget = join(resourceRoot, 'standalone')

if (!existsSync(standaloneSource)) {
  throw new Error('Missing .next/standalone. next.config.ts must keep output: "standalone".')
}

rmSync(standaloneTarget, { recursive: true, force: true })
mkdirSync(standaloneTarget, { recursive: true })

cpSync(standaloneSource, standaloneTarget, { recursive: true })

for (const relativePath of ['src-tauri', '.git', '.next/cache', 'coverage']) {
  rmSync(join(standaloneTarget, relativePath), { recursive: true, force: true })
}

if (existsSync(staticSource)) {
  cpSync(staticSource, join(standaloneTarget, '.next', 'static'), { recursive: true })
}

if (existsSync(publicSource)) {
  cpSync(publicSource, join(standaloneTarget, 'public'), { recursive: true })
}

console.log(`[desktop] Prepared Tauri Next resources at ${standaloneTarget}`)
