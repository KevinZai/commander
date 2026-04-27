#!/usr/bin/env node

// =============================================================================
// EXPERIMENTAL — ask-bridge.js
// =============================================================================
// This module is NOT production-ready. It implements a speculative wire
// protocol for Codex Desktop's `tool/requestUserInput` App Server method
// based on documentation research as of 2026-04-26. The actual Codex Desktop
// App Server protocol must be validated against a live instance before this
// can be promoted.
//
// Wire format assumptions are documented inline. See:
//   docs/wave4-codex-desktop-gui-spec.md §2 and §6.5
// =============================================================================

import { createInterface } from 'node:readline';
import process from 'node:process';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const EXPERIMENTAL_WARNING =
  '[ask-bridge EXPERIMENTAL] This bridge uses a speculative Codex App Server ' +
  'protocol. Validate against a real Codex Desktop instance before shipping.';

// JSON-RPC method name as documented in Codex App Server API.
const RPC_METHOD = 'tool/requestUserInput';

// Env var Codex Desktop sets when an App Server stdio pipe is available.
// ASSUMPTION: Codex sets CODEX_APP_SERVER_PIPE or similar to indicate the
// pipe file descriptor. This has NOT been confirmed against a live Desktop.
// Adjust once validated.
const APP_SERVER_PIPE_ENV = 'CODEX_APP_SERVER_PIPE';
const EXPERIMENTAL_API_ENV = 'CODEX_EXPERIMENTAL_API';

// ---------------------------------------------------------------------------
// Input / output types (JSDoc only — no TypeScript)
// ---------------------------------------------------------------------------

/**
 * @typedef {{ label: string, description?: string }} InputOption
 * @typedef {{ question: string, options: InputOption[], header?: string, multiSelect?: boolean }} BridgeSpec
 * @typedef {{ selected: string, isOther?: boolean, otherText?: string }} BridgeResult
 */

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

/**
 * Returns true when the runtime looks like a live Codex Desktop App Server
 * pipe is available. Detection is heuristic — validate on a real Desktop.
 *
 * @param {Record<string, string|undefined>} [env]
 * @returns {boolean}
 */
export function isCodexAppServerAvailable(env = process.env) {
  return Boolean(env[APP_SERVER_PIPE_ENV] || env[EXPERIMENTAL_API_ENV]);
}

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

/**
 * Validates a BridgeSpec object. Throws a TypeError on bad input.
 *
 * @param {unknown} spec
 * @returns {BridgeSpec}
 */
export function validateSpec(spec) {
  if (!spec || typeof spec !== 'object') {
    throw new TypeError('ask-bridge: spec must be a JSON object');
  }
  if (typeof spec.question !== 'string' || !spec.question.trim()) {
    throw new TypeError('ask-bridge: spec.question must be a non-empty string');
  }
  if (!Array.isArray(spec.options) || spec.options.length === 0) {
    throw new TypeError('ask-bridge: spec.options must be a non-empty array');
  }
  for (let i = 0; i < spec.options.length; i += 1) {
    const opt = spec.options[i];
    if (typeof opt.label !== 'string' || !opt.label.trim()) {
      throw new TypeError(`ask-bridge: spec.options[${i}].label must be a non-empty string`);
    }
  }
  return spec;
}

// ---------------------------------------------------------------------------
// Stdin reader
// ---------------------------------------------------------------------------

/**
 * Reads the entire stream as UTF-8 and parses as JSON.
 *
 * @param {NodeJS.ReadableStream} [input]
 * @returns {Promise<BridgeSpec>}
 */
export async function readSpecFromStdin(input = process.stdin) {
  if (input.isTTY) {
    throw new Error('ask-bridge: no stdin spec provided (stdin is a TTY)');
  }

  const chunks = [];
  for await (const chunk of input) {
    chunks.push(Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) {
    throw new Error('ask-bridge: stdin is empty — expected a JSON BridgeSpec');
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`ask-bridge: stdin JSON parse error: ${err.message}`);
  }

  return validateSpec(parsed);
}

// ---------------------------------------------------------------------------
// App Server path (experimental — wire format assumed)
// ---------------------------------------------------------------------------

/**
 * Builds the JSON-RPC 2.0 initialize request with experimentalApi capability.
 *
 * ASSUMPTION: Codex App Server speaks JSON-RPC 2.0 over stdio (newline-
 * delimited). The `initialize` method accepts a `capabilities` object and
 * responds with session info. This mirrors the documented MCP/LSP pattern.
 *
 * @param {number} id
 * @returns {string}
 */
export function buildInitializeRequest(id = 1) {
  return (
    JSON.stringify({
      jsonrpc: '2.0',
      id,
      method: 'initialize',
      params: {
        capabilities: {
          experimentalApi: true,
        },
      },
    }) + '\n'
  );
}

/**
 * Builds the `tool/requestUserInput` JSON-RPC request from a BridgeSpec.
 *
 * ASSUMPTION: The method signature matches the documented structure:
 *   params.questions = [{ text, isOther }]
 *   options are passed as separate items in the questions array if multiSelect
 *   is false; for single-choice the first question lists them as choices.
 *
 * Real validation against Codex Desktop is required to confirm this shape.
 *
 * @param {BridgeSpec} spec
 * @param {number} id
 * @returns {string}
 */
export function buildRequestUserInputRpc(spec, id = 2) {
  // Map options to the assumed App Server question format.
  const choices = spec.options.map((opt) => ({
    label: opt.label,
    description: opt.description || '',
  }));

  return (
    JSON.stringify({
      jsonrpc: '2.0',
      id,
      method: RPC_METHOD,
      params: {
        header: spec.header || spec.question,
        questions: [
          {
            text: spec.question,
            choices,
            isMultiSelect: Boolean(spec.multiSelect),
          },
        ],
      },
    }) + '\n'
  );
}

/**
 * Sends requests to App Server over the given writable stream and reads the
 * response from the given readable. Both streams are expected to be the App
 * Server pipe (stdio or socket).
 *
 * Returns a BridgeResult.
 *
 * @param {BridgeSpec} spec
 * @param {NodeJS.WritableStream} writable
 * @param {NodeJS.ReadableStream} readable
 * @returns {Promise<BridgeResult>}
 */
export async function callAppServer(spec, writable, readable) {
  return new Promise((resolve, reject) => {
    const rl = createInterface({ input: readable, crlfDelay: Infinity });
    let phase = 'init'; // init | question | done
    let initId = 1;
    let questionId = 2;
    let settled = false;

    function settle(fn) {
      if (settled) return;
      settled = true;
      rl.close();
      fn();
    }

    function onLine(line) {
      const trimmed = line.trim();
      if (!trimmed) return;

      let msg;
      try {
        msg = JSON.parse(trimmed);
      } catch {
        settle(() =>
          reject(new Error(`ask-bridge: App Server returned non-JSON: ${trimmed.slice(0, 200)}`))
        );
        return;
      }

      if (msg.error) {
        settle(() =>
          reject(
            new Error(
              `ask-bridge: App Server error (${msg.error.code}): ${msg.error.message}`
            )
          )
        );
        return;
      }

      if (phase === 'init' && msg.id === initId) {
        // Initialize acknowledged — send the actual question.
        phase = 'question';
        writable.write(buildRequestUserInputRpc(spec, questionId));
        return;
      }

      if (phase === 'question' && msg.id === questionId) {
        phase = 'done';
        settle(() => {
          const result = parseAppServerResponse(msg.result);
          resolve(result);
        });
      }
    }

    rl.on('line', onLine);
    rl.on('error', (err) => {
      settle(() => reject(new Error(`ask-bridge: readline error: ${err.message}`)));
    });
    rl.on('close', () => {
      if (!settled) {
        settle(() => reject(new Error('ask-bridge: App Server pipe closed before response')));
      }
    });

    // Start by sending initialize.
    writable.write(buildInitializeRequest(initId));
  });
}

/**
 * Parses the App Server `tool/requestUserInput` result into a BridgeResult.
 *
 * ASSUMPTION: result.answers is an array; the first item has `.selected` (label)
 * and optionally `.isOther` + `.otherText`. Adjust once validated.
 *
 * @param {unknown} result
 * @returns {BridgeResult}
 */
export function parseAppServerResponse(result) {
  if (!result) {
    throw new Error('ask-bridge: App Server returned empty result');
  }

  // Handle assumed response shape: { answers: [{ selected, isOther, otherText }] }
  const firstAnswer =
    (result.answers && result.answers[0]) ||
    result; // fallback if result is the answer directly

  const selected =
    firstAnswer.selected ||
    firstAnswer.choice ||
    firstAnswer.label ||
    firstAnswer.value;

  if (typeof selected !== 'string' || !selected) {
    throw new Error(
      `ask-bridge: App Server response missing selected field: ${JSON.stringify(result).slice(0, 200)}`
    );
  }

  /** @type {BridgeResult} */
  const out = { selected };
  if (firstAnswer.isOther) out.isOther = true;
  if (firstAnswer.otherText) out.otherText = String(firstAnswer.otherText);
  return out;
}

// ---------------------------------------------------------------------------
// Fallback: plain readline when App Server is unavailable
// ---------------------------------------------------------------------------

/**
 * Prompts the user with a plain readline interaction when not running inside
 * Codex Desktop with an App Server pipe available.
 *
 * @param {BridgeSpec} spec
 * @param {NodeJS.ReadStream} [input]
 * @param {NodeJS.WriteStream} [output]
 * @returns {Promise<BridgeResult>}
 */
export async function fallbackReadline(spec, input = process.stdin, output = process.stderr) {
  return new Promise((resolve, reject) => {
    output.write(`\n${spec.header || spec.question}\n`);
    output.write(`${spec.question}\n`);

    spec.options.forEach((opt, idx) => {
      const suffix = opt.description ? ` — ${opt.description}` : '';
      output.write(`  ${idx + 1}. ${opt.label}${suffix}\n`);
    });

    output.write('\nEnter option number: ');

    const rl = createInterface({ input, output: null, terminal: false });
    let settled = false;

    function settle(fn) {
      if (settled) return;
      settled = true;
      rl.close();
      fn();
    }

    rl.once('line', (line) => {
      settle(() => {
        const num = parseInt(line.trim(), 10);
        if (Number.isNaN(num) || num < 1 || num > spec.options.length) {
          reject(
            new Error(
              `ask-bridge: invalid selection "${line.trim()}" — expected 1-${spec.options.length}`
            )
          );
          return;
        }
        resolve({ selected: spec.options[num - 1].label });
      });
    });

    rl.on('error', (err) => settle(() => reject(err)));
    rl.on('close', () => {
      if (!settled) {
        settle(() => reject(new Error('ask-bridge: stdin closed before selection')));
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Runs the full ask-bridge flow:
 *  1. Read JSON spec from stdin
 *  2. If Codex App Server is detected: use `tool/requestUserInput` via RPC
 *  3. Otherwise: fall back to plain readline
 *  4. Write BridgeResult JSON to stdout
 *
 * @param {object} [options]
 * @param {Record<string, string|undefined>} [options.env]
 * @param {NodeJS.ReadStream} [options.stdin]
 * @param {NodeJS.WriteStream} [options.stdout]
 * @param {NodeJS.WriteStream} [options.stderr]
 * @returns {Promise<number>} exit code
 */
export async function runAskBridge(options = {}) {
  const env = options.env || process.env;
  const stdout = options.stdout || process.stdout;
  const stderr = options.stderr || process.stderr;

  // Always emit experimental warning to stderr.
  stderr.write(`${EXPERIMENTAL_WARNING}\n`);

  let spec;
  try {
    spec = await readSpecFromStdin(options.stdin);
  } catch (err) {
    stderr.write(`ask-bridge error: ${err.message}\n`);
    return 1;
  }

  let result;
  try {
    if (isCodexAppServerAvailable(env)) {
      // App Server path — use stdio pipe identified by env var.
      // ASSUMPTION: CODEX_APP_SERVER_PIPE is a path to a Unix socket or a
      // file descriptor number. We open it as a duplex stream.
      // This code path cannot be exercised without a real Codex Desktop
      // environment. For now we throw a descriptive error to guide future
      // implementers.
      //
      // TODO (Wave 5+ or Kevin validation): open the pipe and call callAppServer().
      //   const pipePath = env[APP_SERVER_PIPE_ENV];
      //   const socket = net.createConnection(pipePath);
      //   result = await callAppServer(spec, socket, socket);
      throw new Error(
        'ask-bridge: App Server pipe detected but stdio socket integration is ' +
        'not yet implemented. Pipe path: ' +
        (env[APP_SERVER_PIPE_ENV] || '(CODEX_EXPERIMENTAL_API set)') +
        '. See docs/wave4-codex-desktop-gui-spec.md §6.5 for the TODO.'
      );
    } else {
      result = await fallbackReadline(spec, options.stdin, stderr);
    }
  } catch (err) {
    stderr.write(`ask-bridge error: ${err.message}\n`);
    return 1;
  }

  stdout.write(`${JSON.stringify(result)}\n`);
  return 0;
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

import { fileURLToPath } from 'node:url';
import { resolve as resolvePath } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const isCli = process.argv[1] && __filename === resolvePath(process.argv[1]);

if (isCli) {
  runAskBridge()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((err) => {
      process.stderr.write(`ask-bridge fatal: ${err.message}\n`);
      process.exitCode = 1;
    });
}
