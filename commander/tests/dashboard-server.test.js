import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { Readable, Writable } from 'node:stream';
import test from 'node:test';

import {
  createServer,
  DEFAULT_PORT,
  HOST,
  startServer,
} from '../../dashboard/server.js';

let tmpRoot;
let sessionsDir;

test.before(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cc-dashboard-test-'));
  sessionsDir = path.join(tmpRoot, 'sessions');
  await fs.mkdir(sessionsDir);
  await fs.writeFile(path.join(sessionsDir, '2026-04-26-new.tmp'), 'new session\n', 'utf8');
  await fs.writeFile(path.join(sessionsDir, '2026-04-25-old.tmp'), 'old session\n', 'utf8');
  await fs.writeFile(path.join(sessionsDir, 'ignore.txt'), 'not a session\n', 'utf8');

  const oldTime = new Date('2026-04-25T12:00:00.000Z');
  const newTime = new Date('2026-04-26T12:00:00.000Z');
  await fs.utimes(path.join(sessionsDir, '2026-04-25-old.tmp'), oldTime, oldTime);
  await fs.utimes(path.join(sessionsDir, '2026-04-26-new.tmp'), newTime, newTime);
});

test.after(async () => {
  if (tmpRoot) {
    await fs.rm(tmpRoot, { force: true, recursive: true });
  }
});

function dispatch(server, url, options = {}) {
  return new Promise((resolve) => {
    const req = new Readable({
      read() {
        this.push(null);
      },
    });
    req.method = options.method || 'GET';
    req.url = url;
    req.headers = {};

    const chunks = [];
    const res = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(Buffer.from(chunk));
        callback();
      },
    });

    res.statusCode = 200;
    res.headers = {};
    res.writeHead = (statusCode, headers) => {
      res.statusCode = statusCode;
      res.headers = headers || {};
      return res;
    };
    res.end = (chunk) => {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      }
      resolve({
        body: Buffer.concat(chunks).toString('utf8'),
        headers: res.headers,
        statusCode: res.statusCode,
      });
      return Writable.prototype.end.call(res);
    };

    server.emit('request', req, res);
  });
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

test('startServer binds to localhost port 4690', async (t) => {
  const listenCalls = [];

  t.mock.method(http.Server.prototype, 'listen', function listen(port, host) {
    listenCalls.push({ host, port });
    process.nextTick(() => this.emit('listening'));
    return this;
  });

  t.mock.method(http.Server.prototype, 'address', () => ({
    address: HOST,
    family: 'IPv4',
    port: DEFAULT_PORT,
  }));

  const server = await startServer({
    host: HOST,
    port: DEFAULT_PORT,
    sessionsDir,
  });

  assert.deepEqual(listenCalls, [{ host: HOST, port: DEFAULT_PORT }]);
  assert.deepEqual(server.address(), {
    address: HOST,
    family: 'IPv4',
    port: DEFAULT_PORT,
  });
});

test('real HTTP health smoke on localhost when sockets are available', async (t) => {
  let liveServer;

  try {
    liveServer = await startServer({
      host: HOST,
      port: DEFAULT_PORT,
      sessionsDir,
    });
  } catch (error) {
    if (error && error.code === 'EPERM') {
      t.skip('Loopback listen is blocked in this sandbox');
      return;
    }
    throw error;
  }

  try {
    const response = await fetch(`http://${HOST}:${DEFAULT_PORT}/api/health`);
    assert.equal(response.status, 200);

    const body = await response.json();
    assert.equal(body.status, 'ok');
    assert.equal(body.version, '1.3.0');
  } finally {
    await closeServer(liveServer);
  }
});

test('health endpoint returns ok', async () => {
  const server = createServer({ sessionsDir });
  const response = await dispatch(server, '/api/health');
  assert.equal(response.statusCode, 200);

  const body = JSON.parse(response.body);
  assert.equal(body.status, 'ok');
  assert.equal(body.version, '1.3.0');
  assert.equal(typeof body.uptime, 'number');
});

test('sessions endpoint returns tmp files sorted by mtime', async () => {
  const server = createServer({ sessionsDir });
  const response = await dispatch(server, '/api/sessions');
  assert.equal(response.statusCode, 200);

  const body = JSON.parse(response.body);
  assert.deepEqual(
    body.map((session) => session.name),
    ['2026-04-26-new.tmp', '2026-04-25-old.tmp']
  );
  assert.equal(body[0].size, 'new session\n'.length);
  assert.equal(typeof body[0].mtime, 'string');
});

test('session detail returns file content and rejects traversal', async () => {
  const server = createServer({ sessionsDir });
  const detail = await dispatch(server, '/api/sessions/2026-04-26-new.tmp');
  assert.equal(detail.statusCode, 200);
  assert.equal(detail.body, 'new session\n');

  const traversal = await dispatch(server, `/api/sessions/${encodeURIComponent('../secret.tmp')}`);
  assert.equal(traversal.statusCode, 400);
});

test('non-GET requests are rejected', async () => {
  const server = createServer({ sessionsDir });
  const response = await dispatch(server, '/api/health', { method: 'POST' });
  assert.equal(response.statusCode, 405);
  assert.equal(response.headers.Allow, 'GET');
});

test('missing sessions directory returns an empty list', async () => {
  const server = createServer({ sessionsDir: path.join(tmpRoot, 'missing') });
  const response = await dispatch(server, '/api/sessions');
  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), []);
});
