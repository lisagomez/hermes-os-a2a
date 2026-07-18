#!/usr/bin/env node
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Debe coincidir con `productName` de src-tauri/tauri.conf.json. Antes hardcodeado
// al nombre del bundle: el build genera el .app con el productName de tauri.conf y
// el script seguia instalando un Business OS.app viejo que quedaba en el bundle dir
// (icono + nombre antiguos). Ahora agarra el bundle correcto.
const appName = 'business-os-new.app';
const sourceApp = path.join(root, 'src-tauri/target/release/bundle/macos', appName);
const destinationDir = path.join(process.env.HOME || '', 'Applications');
const destinationApp = path.join(destinationDir, appName);
const port = process.env.BUSINESS_OS_DESKTOP_PORT || '3218';
const shouldOpen = !process.argv.includes('--no-open');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    ...options,
  });

  if (result.error) {
    console.error(`Failed to run ${command}: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function tryRun(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: root,
    stdio: 'ignore',
    ...options,
  });
}

async function waitForServer(baseUrl) {
  const deadline = Date.now() + 20_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/login`, { cache: 'no-store' });
      if (response.ok) return true;
    } catch {
      // The app may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return false;
}

function stopDebugAndInstalledInstances() {
  tryRun('screen', ['-S', 'business-os-desktop', '-X', 'quit']);
  tryRun('pkill', ['-x', 'business-os-desktop']);

  const listeners = spawnSync('lsof', [`-tiTCP:${port}`, '-sTCP:LISTEN'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  const pids = listeners.stdout?.trim().split(/\s+/).filter(Boolean) || [];
  if (pids.length > 0) {
    tryRun('kill', pids);
  }
}

if (!process.env.HOME) {
  console.error('HOME is not set; cannot install the app into ~/Applications.');
  process.exit(1);
}

run('npm', ['run', 'desktop:app']);

if (!existsSync(sourceApp)) {
  console.error(`App bundle not found: ${sourceApp}`);
  process.exit(1);
}

stopDebugAndInstalledInstances();
mkdirSync(destinationDir, { recursive: true });
rmSync(destinationApp, { recursive: true, force: true });
run('cp', ['-R', sourceApp, destinationApp]);

console.log(`Installed ${appName} to ${destinationApp}`);

if (shouldOpen) {
  run('open', [destinationApp]);
  const baseUrl = `http://127.0.0.1:${port}`;
  if (!(await waitForServer(baseUrl))) {
    console.error(`Opened ${appName}, but the local server did not become ready on ${baseUrl}.`);
    process.exit(1);
  }
  console.log(`business-os-new is ready: ${baseUrl}`);
}
