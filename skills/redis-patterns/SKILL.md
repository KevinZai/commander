---
name: redis-patterns
description: "Redis patterns — data structures, caching strategies, pub/sub, rate limiting, session management, and operational best practices."
risk: low
source: custom
date_added: '2026-03-20'
---

# Redis Patterns

Expert guide to Redis data structures, caching strategies, and application patterns.

## Use this skill when

- Implementing caching layers (application cache, HTTP cache, query cache)
- Using Redis data structures for queues, leaderboards, sessions, or rate limiting
- Designing pub/sub or stream-based messaging
- Optimizing Redis performance and memory usage

## Do not use this skill when

- Need ACID transactions (use a relational database)
- Need complex queries or joins (use PostgreSQL/MySQL)

## Instructions

1. Identify the use case and appropriate data structure.
2. Design key naming and expiration strategy.
3. Implement with proper error handling and fallbacks.
4. Monitor memory usage and performance.

---

## Key Naming Conventions

```
# Pattern: service:entity:id:field
user:1234:profile
user:1234:sessions
order:5678:status
cache:api:posts:page:1
rate:ip:192.168.1.1
lock:order:5678
queue:emails:pending
```

## Caching Patterns

### Cache-Aside (Lazy Loading)

```typescript
async function getUser(userId: string): Promise<User> {
  const cacheKey = `user:${userId}:profile`

  // Try cache first
  const cached = await redis.get(cacheKey)
  if (cached) return JSON.parse(cached)

  // Cache miss — fetch from database
  const user = await db.users.findById(userId)
  if (!user) return null

  // Store in cache with TTL
  await redis.set(cacheKey, JSON.stringify(user), 'EX', 3600) // 1 hour

  return user
}
```

### Write-Through

```typescript
async function updateUser(userId: string, data: Partial<User>): Promise<User> {
  // Update database first
  const user = await db.users.update(userId, data)

  // Update cache immediately
  const cacheKey = `user:${userId}:profile`
  await redis.set(cacheKey, JSON.stringify(user), 'EX', 3600)

  return user
}
```

### Cache Stampede Prevention

```typescript
async function getWithLock<T>(key: string, ttl: number, fetchFn: () => Promise<T>): Promise<T> {
  const cached = await redis.get(key)
  if (cached) return JSON.parse(cached)

  // Try to acquire lock
  const lockKey = `lock:${key}`
  const acquired = await redis.set(lockKey, '1', 'EX', 30, 'NX')

  if (!acquired) {
    // Another process is fetching — wait and retry
    await new Promise(resolve => setTimeout(resolve, 100))
    return getWithLock(key, ttl, fetchFn)
  }

  try {
    const data = await fetchFn()
    await redis.set(key, JSON.stringify(data), 'EX', ttl)
    return data
  } finally {
    await redis.del(lockKey)
  }
}
```

## Data Structure Patterns

### Sorted Sets — Leaderboard

```typescript
// Add/update scores
await redis.zadd('leaderboard:weekly', score, `user:${userId}`)

// Get top 10
const top10 = await redis.zrevrange('leaderboard:weekly', 0, 9, 'WITHSCORES')

// Get user rank (0-based)
const rank = await redis.zrevrank('leaderboard:weekly', `user:${userId}`)

// Get users in score range
const players = await redis.zrangebyscore('leaderboard:weekly', 100, 500)
```

### Hash — User Session

```typescript
// Store session data
await redis.hset(`session:${sessionId}`, {
  userId: '1234',
  ip: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  loginAt: Date.now().toString(),
})
await redis.expire(`session:${sessionId}`, 86400) // 24 hours

// Get specific fields
const userId = await redis.hget(`session:${sessionId}`, 'userId')

// Get all session data
const session = await redis.hgetall(`session:${sessionId}`)

// Update single field
await redis.hset(`session:${sessionId}`, 'lastActivity', Date.now().toString())
```

### Sets — Tags and Relationships

```typescript
// Tag posts
await redis.sadd('tag:javascript', 'post:1', 'post:2', 'post:5')
await redis.sadd('tag:typescript', 'post:2', 'post:3', 'post:5')

// Posts with both tags (intersection)
const both = await redis.sinter('tag:javascript', 'tag:typescript')
// Result: ['post:2', 'post:5']

// Posts with either tag (union)
const either = await redis.sunion('tag:javascript', 'tag:typescript')

// Online users tracking
await redis.sadd('online:users', userId)
await redis.srem('online:users', userId)
const onlineCount = await redis.scard('online:users')
```

### Lists — Job Queue

```typescript
// Producer: push jobs
await redis.lpush('queue:emails', JSON.stringify({ to: 'user@example.com', template: 'welcome' }))

// Consumer: blocking pop (waits for new items)
const [queue, job] = await redis.brpop('queue:emails', 30) // 30s timeout
if (job) {
  const data = JSON.parse(job)
  await processEmail(data)
}

// Reliable queue with backup list
const job = await redis.rpoplpush('queue:emails', 'queue:emails:processing')
// Process job...
await redis.lrem('queue:emails:processing', 1, job)
```

### Streams — Event Log

```typescript
// Produce events
await redis.xadd('stream:orders', '*', {
  event: 'order.created',
  orderId: '5678',
  total: '9999',
})

// Consumer group
await redis.xgroup('CREATE', 'stream:orders', 'order-processors', '0', 'MKSTREAM')

// Consume events
const entries = await redis.xreadgroup(
  'GROUP', 'order-processors', 'worker-1',
  'COUNT', 10,
  'BLOCK', 5000,
  'STREAMS', 'stream:orders', '>'
)

// Acknowledge processed events
await redis.xack('stream:orders', 'order-processors', entryId)
```

## Rate Limiting

### Sliding Window

```typescript
async function isRateLimited(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const now = Date.now()
  const windowStart = now - (windowSeconds * 1000)

  const pipeline = redis.pipeline()
  pipeline.zremrangebyscore(key, 0, windowStart) // Remove old entries
  pipeline.zadd(key, now, `${now}:${Math.random()}`) // Add current request
  pipeline.zcard(key) // Count requests in window
  pipeline.expire(key, windowSeconds) // Set TTL

  const results = await pipeline.exec()
  const count = results[2][1] as number

  return count > limit
}

// Usage
const limited = await isRateLimited(`rate:ip:${clientIp}`, 100, 60) // 100 req/min
if (limited) return res.status(429).json({ error: 'Rate limit exceeded' })
```

### Token Bucket

```typescript
async function consumeToken(key: string, maxTokens: number, refillRate: number): Promise<boolean> {
  const script = `
    local key = KEYS[1]
    local max = tonumber(ARGV[1])
    local rate = tonumber(ARGV[2])
    local now = tonumber(ARGV[3])

    local data = redis.call('hmget', key, 'tokens', 'last_refill')
    local tokens = tonumber(data[1]) or max
    local last = tonumber(data[2]) or now

    local elapsed = now - last
    tokens = math.min(max, tokens + elapsed * rate / 1000)

    if tokens >= 1 then
      tokens = tokens - 1
      redis.call('hmset', key, 'tokens', tokens, 'last_refill', now)
      redis.call('expire', key, math.ceil(max / rate) + 1)
      return 1
    end
    return 0
  `

  const result = await redis.eval(script, 1, key, maxTokens, refillRate, Date.now())
  return result === 1
}
```

## Pub/Sub

```typescript
// Publisher
await redis.publish('notifications:user:1234', JSON.stringify({
  type: 'message',
  from: 'user:5678',
  text: 'Hello!',
}))

// Subscriber (separate connection required)
const subscriber = redis.duplicate()
await subscriber.subscribe('notifications:user:1234')

subscriber.on('message', (channel, message) => {
  const data = JSON.parse(message)
  handleNotification(data)
})

// Pattern subscription
await subscriber.psubscribe('notifications:user:*')
```

## Distributed Lock

```typescript
import Redlock from 'redlock'

const redlock = new Redlock([redis], {
  retryCount: 3,
  retryDelay: 200,
})

async function processExclusively(resourceId: string): Promise<void> {
  const lock = await redlock.acquire([`lock:${resourceId}`], 30000) // 30s TTL

  try {
    await doExclusiveWork(resourceId)
  } finally {
    await lock.release()
  }
}
```

## Operational Best Practices

```bash
# Memory management
CONFIG SET maxmemory 4gb
CONFIG SET maxmemory-policy allkeys-lru  # Evict least recently used

# Persistence
CONFIG SET save "900 1 300 10"  # RDB snapshots
CONFIG SET appendonly yes       # AOF for durability

# Monitoring
INFO memory        # Memory usage
INFO stats         # Hit/miss ratios
INFO clients       # Connected clients
SLOWLOG GET 10     # Slow commands
CLIENT LIST        # Active connections
```

## Common Pitfalls

1. **No TTL on keys** — Memory grows unbounded. Always set expiration.
2. **Large keys** — Keep values under 100KB. Split large data into smaller keys.
3. **Hot keys** — Single key accessed by many clients causes contention. Use consistent hashing or replicas.
4. **Blocking commands on main connection** — Use separate connection for BRPOP/SUBSCRIBE.
5. **No persistence for important data** — Configure RDB + AOF for data you cannot afford to lose.
6. **Using KEYS command** — `KEYS *` blocks Redis. Use `SCAN` for iteration.
7. **No connection pooling** — Creating connections per request is expensive. Use a pool.
8. **Missing error handling** — Always handle Redis connection failures gracefully with fallbacks.
