import { spawn } from 'node:child_process'

const DEV_URL = 'http://127.0.0.1:3000'

async function isServerUp() {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 1000)
    const res = await fetch(DEV_URL, { signal: controller.signal })
    clearTimeout(timeout)
    return res.status < 500
  } catch {
    return false
  }
}

if (await isServerUp()) {
  console.log(`[desktop] Reusing business-os-new dev server at ${DEV_URL}`)
  process.exit(0)
}

const child = spawn('npm', ['run', 'dev', '--', '--port', '3000'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    BUSINESS_OS_DESKTOP_EMBED: '1',
  },
})

function forward(signal) {
  child.kill(signal)
}

process.on('SIGINT', () => forward('SIGINT'))
process.on('SIGTERM', () => forward('SIGTERM'))

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exit(code ?? 0)
})
