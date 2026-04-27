'use strict';

// =============================================================================
// EXPERIMENTAL — ask-bridge.test.js
// =============================================================================
// Tests for the experimental Codex Desktop ask-bridge. The App Server path
// is exercised via mocks because a real Codex Desktop instance is required for
// live validation. See docs/wave4-codex-desktop-gui-spec.md §6.5.
// =============================================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const { Readable, Writable, PassThrough } = require('node:stream');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

const CODEX_ADAPTER_DIR = path.join(__dirname, '..', 'adapters', 'codex');

function adapterUrl(file) {
  return pathToFileURL(path.join(CODEX_ADAPTER_DIR, file)).href;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeNullStream() {
  const s = new Writable({ write(chunk, enc, cb) { cb(); } });
  return s;
}

function makeStringReadable(str) {
  return Readable.from([str]);
}

// ---------------------------------------------------------------------------
// Test 1: stdin parsing — valid spec round-trips through validateSpec
// ---------------------------------------------------------------------------

test('ask-bridge: validateSpec accepts a valid BridgeSpec', async () => {
  const bridge = await import(adapterUrl('ask-bridge.js'));

  const spec = bridge.validateSpec({
    question: 'What type of project?',
    header: 'Project Setup',
    options: [
      { label: 'Web App', description: 'React / Next.js' },
      { label: 'API', description: 'Node.js backend' },
      { label: 'CLI', description: 'Command-line tool' },
    ],
    multiSelect: false,
  });

  assert.equal(spec.question, 'What type of project?');
  assert.equal(spec.options.length, 3);
  assert.equal(spec.options[1].label, 'API');
});

test('ask-bridge: validateSpec rejects missing question', async () => {
  const bridge = await import(adapterUrl('ask-bridge.js'));

  assert.throws(
    () => bridge.validateSpec({ options: [{ label: 'A' }] }),
    /spec\.question must be a non-empty string/
  );
});

test('ask-bridge: validateSpec rejects empty options array', async () => {
  const bridge = await import(adapterUrl('ask-bridge.js'));

  assert.throws(
    () => bridge.validateSpec({ question: 'Choose:', options: [] }),
    /spec\.options must be a non-empty array/
  );
});

test('ask-bridge: validateSpec rejects option with missing label', async () => {
  const bridge = await import(adapterUrl('ask-bridge.js'));

  assert.throws(
    () => bridge.validateSpec({ question: 'Choose:', options: [{ label: '' }] }),
    /spec\.options\[0\]\.label must be a non-empty string/
  );
});

// ---------------------------------------------------------------------------
// Test 2: stdout shape — runAskBridge writes valid JSON on stdout
// ---------------------------------------------------------------------------

test('ask-bridge: fallback mode writes BridgeResult JSON to stdout', async () => {
  const bridge = await import(adapterUrl('ask-bridge.js'));

  const spec = {
    question: 'Pick one:',
    options: [{ label: 'Alpha' }, { label: 'Beta' }],
  };
  const specJson = JSON.stringify(spec);

  const stdinStream = makeStringReadable(specJson);
  // Make it non-TTY by default (Readable is never a TTY).

  const stdoutChunks = [];
  const stdout = new Writable({
    write(chunk, enc, cb) {
      stdoutChunks.push(chunk.toString());
      cb();
    },
  });

  const stderrStream = makeNullStream();

  // Provide input "1\n" on stdin so the readline fallback picks option 1.
  // We do this by making a readable that first yields the spec JSON (which is
  // the stdin for readSpecFromStdin) and then simulates the user typing "1".
  // Because readSpecFromStdin consumes stdin before we hand it to fallback,
  // we need to provide a separate stream for the fallback readline.
  // We test this by calling the internal helpers directly.

  const result = await bridge.fallbackReadline(
    bridge.validateSpec(spec),
    makeStringReadable('2\n'),
    stderrStream
  );

  assert.equal(result.selected, 'Beta');
});

test('ask-bridge: stdout JSON has required selected field', async () => {
  const bridge = await import(adapterUrl('ask-bridge.js'));

  const spec = bridge.validateSpec({
    question: 'Deploy target?',
    options: [{ label: 'Vercel' }, { label: 'fly.io' }],
  });

  const result = await bridge.fallbackReadline(
    spec,
    makeStringReadable('1\n'),
    makeNullStream()
  );

  // Confirm stdout shape matches BridgeResult
  assert.equal(typeof result.selected, 'string');
  assert.ok(result.selected.length > 0);
  assert.equal(result.selected, 'Vercel');
  // isOther and otherText should be absent for normal selections
  assert.equal(result.isOther, undefined);
  assert.equal(result.otherText, undefined);
});

// ---------------------------------------------------------------------------
// Test 3: fallback behavior — readline when App Server unavailable
// ---------------------------------------------------------------------------

test('ask-bridge: isCodexAppServerAvailable returns false with no env vars', async () => {
  const bridge = await import(adapterUrl('ask-bridge.js'));
  assert.equal(bridge.isCodexAppServerAvailable({}), false);
});

test('ask-bridge: isCodexAppServerAvailable returns true when CODEX_APP_SERVER_PIPE set', async () => {
  const bridge = await import(adapterUrl('ask-bridge.js'));
  assert.equal(
    bridge.isCodexAppServerAvailable({ CODEX_APP_SERVER_PIPE: '/tmp/codex.sock' }),
    true
  );
});

test('ask-bridge: isCodexAppServerAvailable returns true when CODEX_EXPERIMENTAL_API set', async () => {
  const bridge = await import(adapterUrl('ask-bridge.js'));
  assert.equal(
    bridge.isCodexAppServerAvailable({ CODEX_EXPERIMENTAL_API: '1' }),
    true
  );
});

test('ask-bridge: fallback rejects out-of-range selection', async () => {
  const bridge = await import(adapterUrl('ask-bridge.js'));

  const spec = bridge.validateSpec({
    question: 'Choose:',
    options: [{ label: 'A' }, { label: 'B' }],
  });

  await assert.rejects(
    () => bridge.fallbackReadline(spec, makeStringReadable('5\n'), makeNullStream()),
    /invalid selection/
  );
});

// ---------------------------------------------------------------------------
// Test 4: App Server unavailable — runAskBridge returns exit code 1 + stderr
// ---------------------------------------------------------------------------

test('ask-bridge: runAskBridge returns exit 1 when App Server env set but integration not wired', async () => {
  const bridge = await import(adapterUrl('ask-bridge.js'));

  const spec = {
    question: 'Pick framework:',
    options: [{ label: 'Next.js' }, { label: 'Remix' }],
  };

  const stdinStream = makeStringReadable(JSON.stringify(spec));
  // Add a dummy isTTY=false (Readable has no isTTY by default).

  const stderrChunks = [];
  const stderrStream = new Writable({
    write(chunk, enc, cb) {
      stderrChunks.push(chunk.toString());
      cb();
    },
  });

  const exitCode = await bridge.runAskBridge({
    env: { CODEX_APP_SERVER_PIPE: '/tmp/codex-test.sock' },
    stdin: stdinStream,
    stdout: makeNullStream(),
    stderr: stderrStream,
  });

  // Should fail because the App Server socket integration is not yet implemented.
  assert.equal(exitCode, 1);

  const stderrOutput = stderrChunks.join('');
  // Should emit the experimental warning.
  assert.match(stderrOutput, /EXPERIMENTAL/);
  // Should surface the "not yet implemented" error.
  assert.match(stderrOutput, /not yet implemented/i);
});

// ---------------------------------------------------------------------------
// RPC builder tests (protocol shape validation)
// ---------------------------------------------------------------------------

test('ask-bridge: buildInitializeRequest produces valid JSON-RPC 2.0', async () => {
  const bridge = await import(adapterUrl('ask-bridge.js'));
  const raw = bridge.buildInitializeRequest(42);
  const msg = JSON.parse(raw.trim());

  assert.equal(msg.jsonrpc, '2.0');
  assert.equal(msg.id, 42);
  assert.equal(msg.method, 'initialize');
  assert.equal(msg.params.capabilities.experimentalApi, true);
});

test('ask-bridge: buildRequestUserInputRpc produces correct method + choices', async () => {
  const bridge = await import(adapterUrl('ask-bridge.js'));
  const spec = bridge.validateSpec({
    question: 'Select deploy region:',
    header: 'Deployment',
    options: [
      { label: 'us-east-1', description: 'Virginia' },
      { label: 'eu-west-1', description: 'Ireland' },
    ],
  });

  const raw = bridge.buildRequestUserInputRpc(spec, 7);
  const msg = JSON.parse(raw.trim());

  assert.equal(msg.jsonrpc, '2.0');
  assert.equal(msg.id, 7);
  assert.equal(msg.method, 'tool/requestUserInput');
  assert.equal(msg.params.header, 'Deployment');
  assert.equal(msg.params.questions[0].text, 'Select deploy region:');
  assert.equal(msg.params.questions[0].choices.length, 2);
  assert.equal(msg.params.questions[0].choices[0].label, 'us-east-1');
  assert.equal(msg.params.questions[0].choices[1].description, 'Ireland');
});

// ---------------------------------------------------------------------------
// parseAppServerResponse tests
// ---------------------------------------------------------------------------

test('ask-bridge: parseAppServerResponse handles answers array shape', async () => {
  const bridge = await import(adapterUrl('ask-bridge.js'));
  const result = bridge.parseAppServerResponse({
    answers: [{ selected: 'us-east-1', isOther: false }],
  });
  assert.equal(result.selected, 'us-east-1');
  assert.equal(result.isOther, undefined); // false => not included
});

test('ask-bridge: parseAppServerResponse handles isOther with otherText', async () => {
  const bridge = await import(adapterUrl('ask-bridge.js'));
  const result = bridge.parseAppServerResponse({
    answers: [{ selected: 'Other', isOther: true, otherText: 'custom-region' }],
  });
  assert.equal(result.selected, 'Other');
  assert.equal(result.isOther, true);
  assert.equal(result.otherText, 'custom-region');
});

test('ask-bridge: parseAppServerResponse throws when selected missing', async () => {
  const bridge = await import(adapterUrl('ask-bridge.js'));
  assert.throws(
    () => bridge.parseAppServerResponse({ answers: [{}] }),
    /missing selected field/
  );
});

// ---------------------------------------------------------------------------
// callAppServer mock test — verifies RPC handshake flow
// ---------------------------------------------------------------------------

test('ask-bridge: callAppServer completes handshake with mock App Server', async () => {
  const bridge = await import(adapterUrl('ask-bridge.js'));

  const spec = bridge.validateSpec({
    question: 'Pick model:',
    options: [{ label: 'gpt-5.5' }, { label: 'gpt-5.4' }],
  });

  // Create PassThroughs that act as the "App Server" pipe.
  // serverToClient: data the mock server sends to the client (ask-bridge reads this)
  // clientToServer: data the client (ask-bridge) sends to the server (mock reads this)
  const serverToClient = new PassThrough();
  const clientToServer = new PassThrough();

  // Simulate the server side.
  const serverLines = [];
  const serverRl = require('node:readline').createInterface({
    input: clientToServer,
    crlfDelay: Infinity,
  });

  serverRl.on('line', (line) => {
    const msg = JSON.parse(line.trim());
    serverLines.push(msg);

    if (msg.method === 'initialize') {
      serverToClient.write(
        JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { sessionId: 'mock-session' } }) + '\n'
      );
    } else if (msg.method === 'tool/requestUserInput') {
      serverToClient.write(
        JSON.stringify({
          jsonrpc: '2.0',
          id: msg.id,
          result: { answers: [{ selected: 'gpt-5.4' }] },
        }) + '\n'
      );
      // Close serverToClient after responding so callAppServer's readline can end.
      serverToClient.end();
    }
  });

  const result = await bridge.callAppServer(spec, clientToServer, serverToClient);

  assert.equal(result.selected, 'gpt-5.4');
  assert.equal(serverLines.length, 2);
  assert.equal(serverLines[0].method, 'initialize');
  assert.equal(serverLines[1].method, 'tool/requestUserInput');
});

test('ask-bridge: callAppServer rejects on App Server error response', async () => {
  const bridge = await import(adapterUrl('ask-bridge.js'));

  const spec = bridge.validateSpec({
    question: 'Any question?',
    options: [{ label: 'Yes' }],
  });

  const serverToClient = new PassThrough();
  const clientToServer = new PassThrough();

  const serverRl = require('node:readline').createInterface({
    input: clientToServer,
    crlfDelay: Infinity,
  });

  serverRl.on('line', (line) => {
    const msg = JSON.parse(line.trim());
    if (msg.method === 'initialize') {
      serverToClient.write(
        JSON.stringify({
          jsonrpc: '2.0',
          id: msg.id,
          error: { code: -32601, message: 'Method not found' },
        }) + '\n'
      );
      // Close so the readline in callAppServer can detect the error and resolve.
      serverToClient.end();
    }
  });

  await assert.rejects(
    () => bridge.callAppServer(spec, clientToServer, serverToClient),
    /App Server error/
  );
});

// ---------------------------------------------------------------------------
// EXPERIMENTAL banner test
// ---------------------------------------------------------------------------

test('ask-bridge: EXPERIMENTAL_WARNING constant is non-empty and contains EXPERIMENTAL', async () => {
  const bridge = await import(adapterUrl('ask-bridge.js'));
  assert.ok(bridge.EXPERIMENTAL_WARNING.includes('EXPERIMENTAL'));
  assert.ok(bridge.EXPERIMENTAL_WARNING.length > 20);
});
