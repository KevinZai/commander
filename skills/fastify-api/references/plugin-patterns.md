# Fastify Plugin Patterns

## Plugin Anatomy

```ts
import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';

// Always wrap with fp() to share decorations across encapsulation scopes
const myPlugin: FastifyPluginAsync<{ option: string }> = async (fastify, opts) => {
  fastify.decorate('myService', createService(opts.option));
  fastify.addHook('onClose', async () => { /* cleanup */ });
};

export default fp(myPlugin, {
  name: 'my-plugin',
  dependencies: ['db'], // ensure 'db' plugin is registered first
});
```

## Scoped vs Global Plugins

```ts
// Global (via fp()) — decoration visible everywhere
export default fp(async (fastify) => {
  fastify.decorate('config', { apiUrl: process.env.API_URL });
});

// Scoped (without fp()) — only available in this sub-router
// Useful for route-specific middleware
fastify.register(async (scoped) => {
  scoped.addHook('preHandler', scoped.verifyJWT); // only this scope
  scoped.get('/protected', handler);
});
```

## Autoload Routes

```ts
import autoload from '@fastify/autoload';
import path from 'path';

await app.register(autoload, {
  dir: path.join(__dirname, 'routes'),
  options: { prefix: '/api/v1' },
  // file structure maps to routes:
  // routes/users/index.ts → /api/v1/users
  // routes/users/[id].ts  → /api/v1/users/:id
});
```

## Config Plugin (env validation)

```ts
import fp from 'fastify-plugin';
import { z } from 'zod';

const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

declare module 'fastify' {
  interface FastifyInstance {
    config: z.infer<typeof EnvSchema>;
  }
}

export default fp(async (fastify) => {
  const config = EnvSchema.parse(process.env);
  fastify.decorate('config', config);
}, { name: 'config' });
```

## Request Context Pattern

```ts
// Attach per-request context (org, user, etc.)
declare module 'fastify' {
  interface FastifyRequest {
    ctx: {
      userId: string;
      orgId: string;
      role: string;
    };
  }
}

const authHook: preHandlerHookHandler = async (request, reply) => {
  const session = await verifySession(request);
  request.ctx = {
    userId: session.userId,
    orgId: session.activeOrgId,
    role: session.role,
  };
};
```

## Response Serialization

```ts
// Define response schema for auto-serialization (faster than JSON.stringify)
fastify.get('/users', {
  schema: {
    response: {
      200: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
          },
        },
      },
    },
  },
}, handler);
```

## Pagination Pattern

```ts
const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

fastify.get('/items', async (request, reply) => {
  const { page, limit } = PaginationSchema.parse(request.query);
  const offset = (page - 1) * limit;

  const [items, [{ total }]] = await Promise.all([
    db.select().from(table).limit(limit).offset(offset),
    db.select({ total: count() }).from(table),
  ]);

  return reply.send({
    data: items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});
```

## File Upload

```ts
await fastify.register(import('@fastify/multipart'), { limits: { fileSize: 10_000_000 } });

fastify.post('/upload', async (request, reply) => {
  const data = await request.file();
  if (!data) return reply.code(400).send({ error: 'No file' });

  const buffer = await data.toBuffer();
  // upload to S3/R2
  const url = await uploadToStorage(buffer, data.filename, data.mimetype);
  return reply.send({ url });
});
```

## Background Jobs Pattern

```ts
// Simple in-memory queue (use BullMQ for production)
declare module 'fastify' {
  interface FastifyInstance {
    queue: { enqueue: (job: Job) => void };
  }
}

export default fp(async (fastify) => {
  const jobs: Job[] = [];

  async function processJobs() {
    while (true) {
      const job = jobs.shift();
      if (job) {
        try { await job.handler(); }
        catch (e) { fastify.log.error(e, `Job ${job.type} failed`); }
      }
      await new Promise(r => setTimeout(r, 100));
    }
  }

  fastify.decorate('queue', {
    enqueue: (job: Job) => jobs.push(job),
  });

  processJobs(); // fire-and-forget
});
```

## Health Check Route

```ts
fastify.get('/health', {
  schema: { hide: true }, // hide from Swagger
}, async (request, reply) => {
  try {
    await fastify.db.execute(sql`SELECT 1`);
    return reply.send({ status: 'ok', db: 'ok', ts: new Date().toISOString() });
  } catch {
    return reply.code(503).send({ status: 'degraded', db: 'error' });
  }
});
```

## Graceful Shutdown

```ts
const signals = ['SIGINT', 'SIGTERM'];
for (const signal of signals) {
  process.once(signal, async () => {
    fastify.log.info(`Received ${signal}, shutting down...`);
    await fastify.close();
    process.exit(0);
  });
}
```
