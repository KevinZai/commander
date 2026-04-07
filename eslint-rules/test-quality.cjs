'use strict';

/**
 * ESLint custom rules for test quality enforcement.
 * Applied to test files only — see eslint.config.mjs for file targeting.
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Collect all identifier/string/member-expression names referenced in a subtree. */
function collectNames(node) {
  if (!node) return [];
  const names = [];
  function walk(n) {
    if (!n || typeof n !== 'object') return;
    if (n.type === 'Identifier') names.push(n.name);
    if (n.type === 'Literal' && typeof n.value === 'string') names.push(n.value);
    if (n.type === 'MemberExpression') {
      walk(n.object);
      walk(n.property);
      return;
    }
    for (const key of Object.keys(n)) {
      if (key === 'parent') continue;
      const child = n[key];
      if (Array.isArray(child)) child.forEach(walk);
      else if (child && typeof child === 'object' && child.type) walk(child);
    }
  }
  walk(node);
  return names;
}

/** Return all string literals present anywhere in a subtree. */
function collectStringLiterals(node) {
  const strs = [];
  function walk(n) {
    if (!n || typeof n !== 'object') return;
    if (n.type === 'Literal' && typeof n.value === 'string') strs.push(n.value);
    for (const key of Object.keys(n)) {
      if (key === 'parent') continue;
      const child = n[key];
      if (Array.isArray(child)) child.forEach(walk);
      else if (child && typeof child === 'object' && child.type) walk(child);
    }
  }
  walk(node);
  return strs;
}

/** Get the raw source text of a node (ESLint 8+ and 10 compatible). */
function src(context, node) {
  return context.sourceCode.getText(node);
}

// ─── Rule: no-unscoped-service-test ───────────────────────────────────────────

/**
 * Flags test files that create a mock Supabase/DB client but never assert
 * org/user/tenant scoping on the results.
 *
 * Triggers: any call or variable whose name matches supabase-client patterns.
 * Safe if:  any assertion references org_id / user_id / organization_id /
 *           tenant_id / owner_id anywhere in the file.
 */
const noUnscopedServiceTest = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Test files that mock a Supabase/DB client must assert org/user scoping.',
    },
    schema: [],
    messages: {
      missing:
        'This test file mocks a service client but never asserts a scoping field ' +
        '(org_id, user_id, organization_id, tenant_id, owner_id). ' +
        'Add a scoping assertion or this test may pass for the wrong tenant.',
    },
  },
  create(context) {
    const MOCK_PATTERNS = /createClient|supabase|mockSupabase|mock.*client/i;
    const SCOPE_KEYS = ['org_id', 'user_id', 'organization_id', 'tenant_id', 'owner_id'];

    let hasMockClient = false;
    let hasScopeAssertion = false;

    function checkText(text) {
      if (SCOPE_KEYS.some((k) => text.includes(k))) hasScopeAssertion = true;
    }

    return {
      Identifier(node) {
        if (MOCK_PATTERNS.test(node.name)) hasMockClient = true;
        if (SCOPE_KEYS.includes(node.name)) hasScopeAssertion = true;
      },
      Literal(node) {
        if (typeof node.value === 'string') {
          if (MOCK_PATTERNS.test(node.value)) hasMockClient = true;
          checkText(node.value);
        }
      },
      TemplateLiteral(node) {
        const text = src(context, node);
        if (MOCK_PATTERNS.test(text)) hasMockClient = true;
        checkText(text);
      },
      'Program:exit'(node) {
        if (hasMockClient && !hasScopeAssertion) {
          context.report({ node, messageId: 'missing' });
        }
      },
    };
  },
};

// ─── Rule: require-error-code-assertion ───────────────────────────────────────

/**
 * Flags tests that check ok===false / success===false / .error without also
 * asserting a specific error code.
 *
 * Triggers: comparisons or property accesses that indicate a failure check.
 * Safe if:  the same scope also references error_code / errorCode / code /
 *           error.code.
 */
const requireErrorCodeAssertion = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Tests that check for failure should also assert a specific error code.',
    },
    schema: [],
    messages: {
      missing:
        'Failure assertion found (ok===false, success===false, or .error) without asserting ' +
        'a specific error code (error_code, errorCode, code, error.code). ' +
        'Pin the expected error code so regressions are caught precisely.',
    },
  },
  create(context) {
    const ERROR_CODE_NAMES = new Set(['error_code', 'errorCode', 'code', 'error.code']);

    // Tracks per-function-scope whether we've seen a failure check and a code check.
    const scopeStack = [];

    function currentScope() {
      return scopeStack[scopeStack.length - 1];
    }

    function pushScope() {
      scopeStack.push({ hasFailureCheck: false, hasCodeAssertion: false, reportNode: null });
    }

    function popScope() {
      const scope = scopeStack.pop();
      if (scope && scope.hasFailureCheck && !scope.hasCodeAssertion && scope.reportNode) {
        context.report({ node: scope.reportNode, messageId: 'missing' });
      }
    }

    function markFailureCheck(node) {
      const s = currentScope();
      if (s) { s.hasFailureCheck = true; s.reportNode = s.reportNode || node; }
    }

    function markCodeAssertion() {
      const s = currentScope();
      if (s) s.hasCodeAssertion = true;
    }

    function isFailureLiteral(node) {
      return node && node.type === 'Literal' && node.value === false;
    }

    function isFailureIdentifier(node) {
      return node && node.type === 'Identifier' && node.name === 'false';
    }

    // ok === false / success === false
    function checkBinaryExpression(node) {
      if (node.operator !== '===' && node.operator !== '==') return;
      const left = node.left;
      const right = node.right;

      const leftName = left.type === 'Identifier' ? left.name :
        left.type === 'MemberExpression' && left.property.type === 'Identifier' ? left.property.name : null;
      const rightIsFalse = isFailureLiteral(right) || isFailureIdentifier(right);
      const leftIsFalse = isFailureLiteral(left) || isFailureIdentifier(left);
      const rightName = right.type === 'Identifier' ? right.name :
        right.type === 'MemberExpression' && right.property.type === 'Identifier' ? right.property.name : null;

      const targetNames = ['ok', 'success'];
      if (
        (targetNames.includes(leftName) && rightIsFalse) ||
        (targetNames.includes(rightName) && leftIsFalse)
      ) {
        markFailureCheck(node);
      }
    }

    return {
      // Scope boundaries
      FunctionDeclaration: pushScope,
      FunctionExpression: pushScope,
      ArrowFunctionExpression: pushScope,
      'FunctionDeclaration:exit': popScope,
      'FunctionExpression:exit': popScope,
      'ArrowFunctionExpression:exit': popScope,

      // Seed top-level scope
      Program: pushScope,
      'Program:exit': popScope,

      BinaryExpression(node) {
        checkBinaryExpression(node);
      },

      // .error property access (e.g. result.error, response.error)
      MemberExpression(node) {
        if (
          node.property.type === 'Identifier' &&
          node.property.name === 'error' &&
          // Avoid flagging error.code itself as a failure check
          !(node.parent && node.parent.type === 'MemberExpression' && node.parent.object === node)
        ) {
          // Only flag if used in an assertion-like context (argument to assert/expect)
          const parent = node.parent;
          if (parent && (parent.type === 'CallExpression' || parent.type === 'BinaryExpression')) {
            markFailureCheck(node);
          }
        }

        // Detect error.code, error_code, errorCode as a code assertion
        const propName = node.property.type === 'Identifier' ? node.property.name : null;
        if (propName === 'code' || propName === 'error_code' || propName === 'errorCode') {
          markCodeAssertion();
        }
        // Detect error.code via chained member: something.error.code
        if (
          propName === 'code' &&
          node.object.type === 'MemberExpression' &&
          node.object.property.type === 'Identifier' &&
          node.object.property.name === 'error'
        ) {
          markCodeAssertion();
        }
      },

      // Detect identifier references like error_code, errorCode
      Identifier(node) {
        if (ERROR_CODE_NAMES.has(node.name)) {
          markCodeAssertion();
        }
      },

      // Detect string literals like 'error_code', 'errorCode'
      Literal(node) {
        if (typeof node.value === 'string' && ERROR_CODE_NAMES.has(node.value)) {
          markCodeAssertion();
        }
      },
    };
  },
};

// ─── Rule: no-mock-echo ────────────────────────────────────────────────────────

/**
 * Detects tests where a mock returns a fixed literal and the assertion
 * checks that the result equals that same literal — i.e., the test is just
 * echoing the mock back, not testing real behaviour.
 *
 * Pattern detected:
 *   stub.returns(X) / stub.resolves(X) / jest.fn().mockReturnValue(X)
 *   followed by: assert(result === X) / expect(result).toEqual(X) / etc.
 *   where X is the same primitive literal.
 *
 * We track literals used in .returns()/.resolves()/.mockReturnValue() and flag
 * when an assertion uses the exact same literal.
 */
const noMockEcho = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Avoid asserting the exact value a mock was configured to return.',
    },
    schema: [],
    messages: {
      echo:
        'Mock echo detected: the mock returns {{value}} and the assertion checks for the same value. ' +
        'This test only confirms the mock works, not that the real logic works. ' +
        'Assert a transformation or a side-effect instead.',
    },
  },
  create(context) {
    // Collect primitive literal values used as mock return values in this file.
    const mockReturnLiterals = new Set();

    const RETURN_METHODS = new Set(['returns', 'resolves', 'mockReturnValue', 'mockResolvedValue', 'mockReturnValueOnce', 'mockResolvedValueOnce']);
    const ASSERT_METHODS = new Set(['toEqual', 'toBe', 'toStrictEqual', 'deepEqual', 'strictEqual', 'equal']);

    function isPrimitiveLiteral(node) {
      return node && node.type === 'Literal' && (
        typeof node.value === 'string' ||
        typeof node.value === 'number' ||
        typeof node.value === 'boolean'
      );
    }

    function literalKey(node) {
      return JSON.stringify(node.value);
    }

    return {
      // Track: stub.returns(X), stub.resolves(X), fn.mockReturnValue(X)
      CallExpression(node) {
        const callee = node.callee;
        if (
          callee.type === 'MemberExpression' &&
          callee.property.type === 'Identifier' &&
          RETURN_METHODS.has(callee.property.name)
        ) {
          const firstArg = node.arguments[0];
          if (isPrimitiveLiteral(firstArg)) {
            mockReturnLiterals.add(literalKey(firstArg));
          }
        }

        // Detect assertion methods: expect(x).toEqual(Y), assert.equal(x, Y)
        if (
          callee.type === 'MemberExpression' &&
          callee.property.type === 'Identifier' &&
          ASSERT_METHODS.has(callee.property.name)
        ) {
          // For expect(x).toEqual(Y) — the asserted value is the first argument
          const assertedArg = node.arguments[0];
          if (isPrimitiveLiteral(assertedArg) && mockReturnLiterals.has(literalKey(assertedArg))) {
            context.report({
              node,
              messageId: 'echo',
              data: { value: String(assertedArg.value) },
            });
          }
        }
      },

      // Detect: assert(result === X) / result === X in assert calls
      BinaryExpression(node) {
        if (node.operator !== '===' && node.operator !== '==') return;
        const { left, right } = node;

        if (isPrimitiveLiteral(right) && mockReturnLiterals.has(literalKey(right))) {
          // Only flag if inside an assert/expect call
          let parent = node.parent;
          while (parent) {
            if (
              parent.type === 'CallExpression' &&
              parent.callee.type === 'Identifier' &&
              /^(assert|expect|ok|strictEqual|equal)$/.test(parent.callee.name)
            ) {
              context.report({
                node,
                messageId: 'echo',
                data: { value: String(right.value) },
              });
              break;
            }
            if (
              parent.type === 'CallExpression' &&
              parent.callee.type === 'MemberExpression' &&
              /^(assert|expect|ok|strictEqual|equal)$/.test(parent.callee.object && parent.callee.object.name)
            ) {
              context.report({
                node,
                messageId: 'echo',
                data: { value: String(right.value) },
              });
              break;
            }
            parent = parent.parent;
          }
        }

        if (isPrimitiveLiteral(left) && mockReturnLiterals.has(literalKey(left))) {
          let parent = node.parent;
          while (parent) {
            if (
              parent.type === 'CallExpression' &&
              parent.callee.type === 'Identifier' &&
              /^(assert|expect|ok|strictEqual|equal)$/.test(parent.callee.name)
            ) {
              context.report({
                node,
                messageId: 'echo',
                data: { value: String(left.value) },
              });
              break;
            }
            parent = parent.parent;
          }
        }
      },
    };
  },
};

// ─── Plugin export ────────────────────────────────────────────────────────────

module.exports = {
  meta: {
    name: 'ccc-test-quality',
    version: '1.0.0',
  },
  rules: {
    'no-unscoped-service-test': noUnscopedServiceTest,
    'require-error-code-assertion': requireErrorCodeAssertion,
    'no-mock-echo': noMockEcho,
  },
};
