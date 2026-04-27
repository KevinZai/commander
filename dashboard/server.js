import fs from 'node:fs';
import fsp from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOST = '127.0.0.1';
const DEFAULT_PORT = 4690;
const DEFAULT_SESSIONS_DIR = path.join(os.homedir(), '.claude', 'sessions');
const PUBLIC_DIR = path.join(__dirname, 'public');
const PACKAGE_PATH = path.join(__dirname, 'package.json');

function readVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync(PACKAGE_PATH, 'utf8'));
    return typeof pkg.version === 'string' ? pkg.version : '0.1.0';
  } catch {
    return '0.1.0';
  }
}

const VERSION = readVersion();

function send(res, statusCode, body, headers = {}) {
  res.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  res.end(body);
}

function sendJson(res, statusCode, payload) {
  send(res, statusCode, JSON.stringify(payload), {
    'Content-Type': 'application/json; charset=utf-8',
  });
}

function sendText(res, statusCode, body) {
  send(res, statusCode, body, {
    'Content-Type': 'text/plain; charset=utf-8',
  });
}

async function sendFile(res, filePath, contentType) {
  try {
    const body = await fsp.readFile(filePath);
    send(res, 200, body, {
      'Content-Type': contentType,
    });
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      sendText(res, 404, 'Not found');
      return;
    }
    throw error;
  }
}

function isSafeSessionFilename(filename) {
  return Boolean(
    filename &&
      filename === path.basename(filename) &&
      filename.endsWith('.tmp') &&
      !filename.includes('/') &&
      !filename.includes('\\')
  );
}

async function listSessions(sessionsDir = DEFAULT_SESSIONS_DIR) {
  let entries;

  try {
    entries = await fsp.readdir(sessionsDir, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  const files = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.tmp'))
      .map(async (entry) => {
        const filePath = path.join(sessionsDir, entry.name);

        try {
          const stat = await fsp.stat(filePath);
          return {
            name: entry.name,
            mtime: stat.mtime.toISOString(),
            size: stat.size,
          };
        } catch (error) {
          if (error && error.code === 'ENOENT') {
            return null;
          }
          throw error;
        }
      })
  );

  return files
    .filter(Boolean)
    .sort((left, right) => Date.parse(right.mtime) - Date.parse(left.mtime));
}

async function readSessionFile(sessionsDir, filename) {
  if (!isSafeSessionFilename(filename)) {
    const error = new Error('Unsafe session filename');
    error.statusCode = 400;
    throw error;
  }

  try {
    return await fsp.readFile(path.join(sessionsDir, filename), 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      const notFound = new Error('Session not found');
      notFound.statusCode = 404;
      throw notFound;
    }
    throw error;
  }
}

function createServer(options = {}) {
  const sessionsDir = options.sessionsDir || DEFAULT_SESSIONS_DIR;
  const startedAt = process.hrtime.bigint();

  return http.createServer(async (req, res) => {
    if (!req.url) {
      sendText(res, 400, 'Bad request');
      return;
    }

    if (req.method !== 'GET') {
      send(res, 405, 'Method not allowed', {
        Allow: 'GET',
        'Content-Type': 'text/plain; charset=utf-8',
      });
      return;
    }

    let url;
    try {
      url = new URL(req.url, `http://${HOST}`);
    } catch {
      sendText(res, 400, 'Bad request');
      return;
    }

    try {
      if (url.pathname === '/' || url.pathname === '/index.html') {
        await sendFile(res, path.join(PUBLIC_DIR, 'index.html'), 'text/html; charset=utf-8');
        return;
      }

      if (url.pathname === '/style.css') {
        await sendFile(res, path.join(PUBLIC_DIR, 'style.css'), 'text/css; charset=utf-8');
        return;
      }

      if (url.pathname === '/api/health' || url.pathname === '/health') {
        const uptime = Number((Number(process.hrtime.bigint() - startedAt) / 1e9).toFixed(3));
        sendJson(res, 200, {
          status: 'ok',
          uptime,
          version: VERSION,
        });
        return;
      }

      if (url.pathname === '/api/sessions') {
        sendJson(res, 200, await listSessions(sessionsDir));
        return;
      }

      if (url.pathname.startsWith('/api/sessions/')) {
        const encodedFilename = url.pathname.slice('/api/sessions/'.length);
        let filename;

        try {
          filename = decodeURIComponent(encodedFilename);
        } catch {
          sendJson(res, 400, { error: 'Invalid session filename' });
          return;
        }

        const content = await readSessionFile(sessionsDir, filename);
        sendText(res, 200, content);
        return;
      }

      sendText(res, 404, 'Not found');
    } catch (error) {
      const statusCode = error && Number.isInteger(error.statusCode) ? error.statusCode : 500;
      const message = statusCode === 500 ? 'Internal server error' : error.message;
      sendJson(res, statusCode, { error: message });
    }
  });
}

function startServer(options = {}) {
  const server = createServer(options);
  const port = options.port || DEFAULT_PORT;
  const host = options.host || HOST;

  return new Promise((resolve, reject) => {
    function onError(error) {
      server.off('listening', onListening);
      reject(error);
    }

    function onListening() {
      server.off('error', onError);
      resolve(server);
    }

    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, host);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer()
    .then((server) => {
      const address = server.address();
      const host = typeof address === 'object' && address ? address.address : HOST;
      const port = typeof address === 'object' && address ? address.port : DEFAULT_PORT;
      console.log(`CC Commander Dashboard listening at http://${host}:${port}/`);
    })
    .catch((error) => {
      console.error('Failed to start CC Commander Dashboard:', error.message);
      process.exitCode = 1;
    });
}

export {
  DEFAULT_PORT,
  DEFAULT_SESSIONS_DIR,
  HOST,
  VERSION,
  createServer,
  isSafeSessionFilename,
  listSessions,
  readSessionFile,
  startServer,
};

