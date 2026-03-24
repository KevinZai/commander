# Fastify API Skill

Stack: Fastify + Drizzle ORM + Zod validation + TypeScript
Used for: GuestNetworks MCP server, internal APIs

## Install

```bash
npm install fastify @fastify/cors @fastify/rate-limit @fastify/auth @fastify/jwt
npm install @fastify/swagger @fastify/swagger-ui @fastify/websocket
npm install fastify-plugin zod
npm install -D @types/node tsx
```

---

## Project Structure (Plugin-Based)

```
src/
├── app.ts              # Fastify instance + plugin registration
├── server.ts           # Entry point (listen)
├── plugins/
│   ├── db.ts           # Drizzle database plugin
│   ├── auth.ts         # JWT/API key auth plugin
│   ├── cors.ts         # CORS config
│   └── swagger.ts      # OpenAPI docs
├── routes/
│   ├── index.ts        # Route autoload
│   ├── users/
│   │   ├── index.ts    # GET /users, POST /users
│   │   └── [id].ts     # GET /users/:id, PATCH, DELETE
│   └── health.ts       # GET /health
├── hooks/
│   └── auth.hook.ts    # Auth prehandler hooks
├── schemas/
│   └── user.schema.ts  # Zod schemas
└── errors/
    └── index.ts        # Custom error classes
```

---

## App Setup (`src/app.ts`)

```ts
import Fastify, { FastifyInstance } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import fastifyPlugin from 'fastify-plugin';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport: process.env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
    ajv: {
      customOptions: { strict: 'log', keywords: ['kind', 'modifier'] },
    },
  }).withTypeProvider<TypeBoxTypeProvider>();

  // Register plugins
  await app.register(import('./plugins/db'));
  await app.register(import('./plugins/cors'));
  await app.register(import('./plugins/auth'));
  await app.register(import('./plugins/swagger'));

  // Register routes with prefix
  await app.register(import('./routes/health'));
  await app.register(import('./routes/users'), { prefix: '/api/v1' });
  await app.register(import('./routes/teams'), { prefix: '/api/v1' });

  return app;
}
```

`src/server.ts`:
```ts
import { buildApp } from './app';

const app = await buildApp();
await app.listen({ port: Number(process.env.PORT) || 3001, host: '0.0.0.0' });
console.log(`Server listening on port ${process.env.PORT || 3001}`);
```

---

## Database Plugin (`src/plugins/db.ts`)

```ts
import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '../db/schema';

declare module 'fastify' {
  interface FastifyInstance {
    db: ReturnType<typeof drizzle<typeof schema>>;
  }
}

const dbPlugin: FastifyPluginAsync = async (fastify) => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
  const db = drizzle(pool, { schema });
  fastify.decorate('db', db);

  fastify.addHook('onClose', async () => {
    await pool.end();
  });
};

export default fp(dbPlugin, { name: 'db' });
```

---

## Auth Plugin (`src/plugins/auth.ts`)

```ts
import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import fastifyAuth from '@fastify/auth';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { userId: string; role: string; orgId?: string };
    user: { userId: string; role: string; orgId?: string };
  }
}

const authPlugin = fp(async (fastify) => {
  await fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET!,
    sign: { expiresIn: '7d' },
  });

  await fastify.register(fastifyAuth);

  // Auth strategies
  fastify.decorate('verifyJWT', async function(request, reply) {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  fastify.decorate('verifyApiKey', async function(request, reply) {
    const apiKey = request.headers['x-api-key'];
    if (!apiKey) return reply.code(401).send({ error: 'Missing API key' });

    const hash = createHash('sha256').update(apiKey as string).digest('hex');
    const key = await fastify.db.query.apiKeys.findFirst({
      where: and(eq(apiKeys.keyHash, hash), isNull(apiKeys.revokedAt)),
    });
    if (!key) return reply.code(401).send({ error: 'Invalid API key' });

    request.user = { userId: key.userId!, role: 'api', orgId: key.organizationId! };
  });

  fastify.decorate('verifyAny', fastify.auth([
    fastify.verifyJWT,
    fastify.verifyApiKey,
  ]));
});

export default authPlugin;
```

---

## Route Definition with Zod

```ts
// src/routes/users/index.ts
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { users } from '../../db/schema';

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(['admin', 'member', 'viewer']).default('member'),
});

const UserParamsSchema = z.object({ id: z.string().uuid() });

const routes: FastifyPluginAsync = async (fastify) => {
  // GET /users
  fastify.get('/users', {
    preHandler: fastify.auth([fastify.verifyJWT]),
  }, async (request, reply) => {
    const users = await fastify.db.query.users.findMany({
      orderBy: (u, { desc }) => desc(u.createdAt),
      limit: 50,
    });
    return reply.send(users);
  });

  // POST /users
  fastify.post('/users', {
    preHandler: fastify.auth([fastify.verifyJWT]),
  }, async (request, reply) => {
    const body = CreateUserSchema.parse(request.body);
    const [user] = await fastify.db.insert(users).values(body).returning();
    return reply.code(201).send(user);
  });

  // GET /users/:id
  fastify.get<{ Params: z.infer<typeof UserParamsSchema> }>('/users/:id', {
    preHandler: fastify.auth([fastify.verifyJWT]),
  }, async (request, reply) => {
    const { id } = UserParamsSchema.parse(request.params);
    const user = await fastify.db.query.users.findFirst({
      where: eq(users.id, id),
    });
    if (!user) return reply.code(404).send({ error: 'Not found' });
    return reply.send(user);
  });
};

export default routes;
```

---

## Hooks Lifecycle

```ts
// Global hooks registered in app.ts
app.addHook('onRequest', async (request, reply) => {
  request.log.info({ url: request.url, method: request.method }, 'Incoming request');
});

app.addHook('preHandler', async (request, reply) => {
  // Runs before route handler — good for common auth checks
});

app.addHook('onSend', async (request, reply, payload) => {
  reply.header('X-Request-Id', request.id);
  return payload;
});

app.addHook('onError', async (request, reply, error) => {
  request.log.error({ err: error }, 'Request error');
});

app.addHook('onClose', async (instance) => {
  // Cleanup — close DB pools, etc.
});
```

---

## Error Handling

```ts
// src/errors/index.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
  ) {
    super(message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor() { super('Unauthorized', 401, 'UNAUTHORIZED'); }
}

export class ForbiddenError extends AppError {
  constructor() { super('Forbidden', 403, 'FORBIDDEN'); }
}

export class ValidationError extends AppError {
  constructor(message: string) { super(message, 422, 'VALIDATION_ERROR'); }
}
```

Global error handler:
```ts
app.setErrorHandler((error, request, reply) => {
  if (error instanceof AppError) {
    return reply.code(error.statusCode).send({
      error: { code: error.code, message: error.message },
    });
  }

  if (error instanceof z.ZodError) {
    return reply.code(422).send({
      error: { code: 'VALIDATION_ERROR', issues: error.issues },
    });
  }

  request.log.error(error);
  return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
});
```

---

## WebSocket (`@fastify/websocket`)

```ts
await app.register(import('@fastify/websocket'));

fastify.get('/ws/events', { websocket: true }, (socket, request) => {
  socket.on('message', (message) => {
    const data = JSON.parse(message.toString());
    // handle incoming message
    socket.send(JSON.stringify({ type: 'ack', id: data.id }));
  });

  socket.on('close', () => {
    // cleanup subscriptions
  });

  // Push events to client
  const interval = setInterval(() => {
    socket.send(JSON.stringify({ type: 'ping', ts: Date.now() }));
  }, 30_000);
  socket.on('close', () => clearInterval(interval));
});
```

---

## OpenAPI / Swagger

```ts
// src/plugins/swagger.ts
import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

export default fp(async (fastify) => {
  await fastify.register(swagger, {
    openapi: {
      info: { title: 'API', version: '1.0.0' },
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          apiKey: { type: 'apiKey', in: 'header', name: 'x-api-key' },
        },
      },
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: { deepLinking: false },
  });
});
```

---

## Testing

```ts
import { buildApp } from '../src/app';
import { FastifyInstance } from 'fastify';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

test('GET /health returns 200', async () => {
  const response = await app.inject({
    method: 'GET',
    url: '/health',
  });
  expect(response.statusCode).toBe(200);
  expect(JSON.parse(response.body)).toMatchObject({ status: 'ok' });
});

test('POST /api/v1/users requires auth', async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/users',
    payload: { email: 'test@example.com', name: 'Test' },
  });
  expect(response.statusCode).toBe(401);
});

// Authenticated request
test('GET /api/v1/users with JWT', async () => {
  const token = app.jwt.sign({ userId: 'test-id', role: 'admin' });
  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/users',
    headers: { authorization: `Bearer ${token}` },
  });
  expect(response.statusCode).toBe(200);
});
```

---

## MCP Server (Model Context Protocol)

```ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({
  name: 'guestnetworks-mcp',
  version: '1.0.0',
});

// Register a tool
server.tool(
  'list_networks',
  'List all WiFi networks for a location',
  { locationId: z.string().describe('Location UUID') },
  async ({ locationId }) => {
    const networks = await db.query.networks.findMany({
      where: eq(networks.locationId, locationId),
    });
    return {
      content: [{ type: 'text', text: JSON.stringify(networks, null, 2) }],
    };
  },
);

// Register a resource
server.resource(
  'network',
  'guestnetworks://network/{id}',
  async (uri) => {
    const id = uri.pathname.replace('/network/', '');
    const network = await db.query.networks.findFirst({ where: eq(networks.id, id) });
    return {
      contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(network) }],
    };
  },
);

// Register a prompt
server.prompt(
  'troubleshoot_network',
  'Generate troubleshooting steps for a network issue',
  { issue: z.string() },
  ({ issue }) => ({
    messages: [{
      role: 'user',
      content: { type: 'text', text: `Troubleshoot this WiFi issue: ${issue}` },
    }],
  }),
);

// Start with stdio transport (for Claude Desktop / MCP clients)
const transport = new StdioServerTransport();
await server.connect(transport);
```

Fastify + MCP via HTTP/SSE:
```ts
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

fastify.get('/mcp/sse', async (request, reply) => {
  const transport = new SSEServerTransport('/mcp/messages', reply.raw);
  await server.connect(transport);
  reply.raw.on('close', () => server.close());
});

fastify.post('/mcp/messages', async (request, reply) => {
  // handled by transport
});
```

---

## CORS + Rate Limiting

```ts
// src/plugins/cors.ts
import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';

export default fp(async (fastify) => {
  await fastify.register(cors, {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await fastify.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (request) => request.user?.userId || request.ip,
    errorResponseBuilder: () => ({
      error: { code: 'RATE_LIMITED', message: 'Too many requests' },
    }),
  });
});
```
