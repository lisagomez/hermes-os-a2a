#!/usr/bin/env node
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = process.env.BUSINESS_OS_DESKTOP_PORT || '3218';
const screenName = process.env.BUSINESS_OS_SCREEN || 'business-os-desktop';
const logPath = process.env.BUSINESS_OS_DESKTOP_LOG || '/tmp/business-os-desktop.log';
const binary = path.join(root, 'src-tauri/target/debug/business-os-desktop');
const flags = new Set(process.argv.slice(2));

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

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
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/login`, { cache: 'no-store' });
      if (response.ok) {
        return true;
      }
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.error(`Desktop server did not become ready: ${lastError || 'timeout'}`);
  return false;
}

if (flags.has('--build')) {
  run('npm', ['run', 'desktop:build']);
}

if (!existsSync(binary)) {
  console.error('Desktop binary not found. Run `npm run desktop:build` first.');
  process.exit(1);
}

tryRun('screen', ['-S', screenName, '-X', 'quit']);

const listeners = spawnSync('lsof', [`-tiTCP:${port}`, '-sTCP:LISTEN'], {
  cwd: root,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'ignore'],
});
const pids = listeners.stdout?.trim().split(/\s+/).filter(Boolean) || [];
if (pids.length > 0) {
  tryRun('kill', pids);
}

const command = [
  `cd ${shellQuote(root)}`,
  `BUSINESS_OS_DESKTOP_PORT=${shellQuote(port)} ${shellQuote(binary)} >${shellQuote(logPath)} 2>&1`,
].join(' && ');

run('screen', ['-dmS', screenName, 'zsh', '-lc', command]);

const baseUrl = `http://127.0.0.1:${port}`;
if (!(await waitForServer(baseUrl))) {
  console.error(`Check logs with: tail -f ${logPath}`);
  process.exit(1);
}

console.log(`business-os-new desktop restarted: ${baseUrl}`);
console.log(`Screen session: ${screenName}`);
console.log(`Logs: tail -f ${logPath}`);
