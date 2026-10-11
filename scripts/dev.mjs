import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BACKEND_PORT = 8000;
const FRONTEND_PORT = 5173;
const BACKEND_HOST = '127.0.0.1';

function portInUse(port, host) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });
    socket.setTimeout(1000);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => resolve(false));
  });
}

function resolvePython() {
  const candidates = [
    path.join(root, 'backend', '.venv', 'Scripts', 'python.exe'),
    path.join(root, '.venv', 'Scripts', 'python.exe'),
    path.join(root, 'backend', '.venv', 'bin', 'python'),
    path.join(root, '.venv', 'bin', 'python'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

async function waitForHealth(timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(`http://${BACKEND_HOST}:${BACKEND_PORT}/health`);
      if (res.ok) return true;
    } catch {
      // Backend still starting
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

function spawnInherit(command, args, extraEnv = {}) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
    shell: false,
    windowsHide: true,
  });
  return child;
}

const python = resolvePython();
if (!python) {
  console.error(
    'AgentSentry backend virtualenv was not found.\n' +
      'Expected: backend/.venv/Scripts/python.exe (Windows) or backend/.venv/bin/python'
  );
  process.exit(1);
}

if (await portInUse(BACKEND_PORT, BACKEND_HOST)) {
  console.error(
    `Port ${BACKEND_PORT} is already in use on ${BACKEND_HOST}.\n` +
      'AgentSentry local development requires port 8000 for the API.\n' +
      'Another process (for example the AgroSaarthi Docker backend) is occupying it.\n' +
      'Stop that other service yourself if you want to run AgentSentry locally.\n' +
      'This script will not stop, modify, or depend on Docker containers.'
  );
  process.exit(1);
}

if (await portInUse(FRONTEND_PORT, '127.0.0.1') || await portInUse(FRONTEND_PORT, 'localhost')) {
  console.error(
    `Port ${FRONTEND_PORT} is already in use.\n` +
      'AgentSentry local development requires port 5173 for the Vite frontend.'
  );
  process.exit(1);
}

let shuttingDown = false;
let backend = null;
let frontend = null;

function killProcessTree(pid) {
  if (!pid) return;
  if (process.platform === 'win32') {
    try {
      spawn('taskkill', ['/F', '/T', '/PID', String(pid)], { stdio: 'ignore', windowsHide: true });
    } catch {
      // Ignore fallback
    }
  }
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of [frontend, backend]) {
    if (child) {
      if (child.pid) {
        killProcessTree(child.pid);
      }
      if (!child.killed) {
        child.kill();
      }
    }
  }
  process.exit(code);
}

console.log('Starting AgentSentry backend on http://127.0.0.1:8000 ...');
backend = spawnInherit(
  python,
  ['-m', 'uvicorn', 'backend.main:app', '--reload', '--host', BACKEND_HOST, '--port', String(BACKEND_PORT)],
  { PYTHONPATH: root }
);

backend.on('exit', (code, signal) => {
  if (!shuttingDown) {
    console.error(`Backend exited unexpectedly (code=${code}, signal=${signal}).`);
    shutdown(code || 1);
  }
});

if (!(await waitForHealth())) {
  console.error('Backend did not become healthy on http://127.0.0.1:8000/health in time.');
  shutdown(1);
}

console.log('Starting AgentSentry frontend on http://localhost:5173 ...');
const frontendCommand = process.platform === 'win32' ? process.env.ComSpec || 'cmd.exe' : 'npm';
const frontendArgs = process.platform === 'win32'
  ? ['/d', '/s', '/c', 'npm run dev --prefix frontend']
  : ['run', 'dev', '--prefix', 'frontend'];
frontend = spawnInherit(frontendCommand, frontendArgs);

frontend.on('exit', (code, signal) => {
  if (!shuttingDown) {
    console.error(`Frontend exited unexpectedly (code=${code}, signal=${signal}).`);
    shutdown(code || 1);
  }
});

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
