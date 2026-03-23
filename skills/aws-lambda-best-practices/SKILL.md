---
name: aws-lambda-best-practices
description: "AWS Lambda — function design, cold starts, layers, VPC, error handling, monitoring, and cost optimization."
risk: low
source: custom
date_added: '2026-03-20'
---

# AWS Lambda Best Practices

Expert guide to building production-ready Lambda functions.

## Use this skill when

- Designing Lambda functions for API, event processing, or scheduled tasks
- Optimizing cold starts and execution performance
- Implementing error handling, retries, and dead letter queues
- Managing Lambda layers, VPC configuration, and monitoring

## Do not use this skill when

- Running long-running processes (> 15 min) — use ECS/Fargate
- Need persistent connections — use EC2/ECS

## Instructions

1. Design the function with cold start awareness.
2. Implement proper error handling and idempotency.
3. Configure triggers, permissions, and environment.
4. Monitor with CloudWatch and X-Ray.

---

## Function Design

### Handler Pattern (Node.js/TypeScript)

```typescript
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb'

// Initialize OUTSIDE handler — reused across warm invocations
const client = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(client)
const TABLE_NAME = process.env.TABLE_NAME!

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  try {
    const id = event.pathParameters?.id
    if (!id) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing id' }) }
    }

    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { id },
    }))

    if (!result.Item) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Not found' }) }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.Item),
    }
  } catch (error) {
    console.error('Handler error:', JSON.stringify({
      error: (error as Error).message,
      stack: (error as Error).stack,
      event: { path: event.rawPath, method: event.requestContext.http.method },
    }))

    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    }
  }
}
```

### Idempotent Event Processing

```typescript
import { SQSEvent, SQSBatchResponse } from 'aws-lambda'

export async function handler(event: SQSEvent): Promise<SQSBatchResponse> {
  const batchItemFailures: { itemIdentifier: string }[] = []

  for (const record of event.Records) {
    try {
      const body = JSON.parse(record.body)

      // Idempotency check — use DynamoDB conditional write
      const processed = await markAsProcessing(body.idempotencyKey)
      if (!processed) {
        console.log(`Already processed: ${body.idempotencyKey}`)
        continue
      }

      await processMessage(body)
      await markAsCompleted(body.idempotencyKey)
    } catch (error) {
      console.error(`Failed: ${record.messageId}`, error)
      batchItemFailures.push({ itemIdentifier: record.messageId })
    }
  }

  return { batchItemFailures }
}
```

## Cold Start Optimization

### Minimize Package Size

```bash
# Use esbuild to bundle (reduces from 100MB+ to <1MB)
esbuild src/handler.ts --bundle --platform=node --target=node20 \
  --outfile=dist/handler.js --minify --external:@aws-sdk/*

# AWS SDK v3 is included in Lambda runtime — don't bundle it
```

### Provisioned Concurrency

```yaml
# SAM template
MyFunction:
  Type: AWS::Serverless::Function
  Properties:
    Handler: dist/handler.handler
    Runtime: nodejs20.x
    MemorySize: 512  # More memory = more CPU = faster cold start
    AutoPublishAlias: live
    ProvisionedConcurrencyConfig:
      ProvisionedConcurrentExecutions: 5
```

### SnapStart (Java) / Lazy Initialization

```typescript
// Lazy initialize heavy clients
let heavyClient: HeavyClient | null = null

function getHeavyClient(): HeavyClient {
  if (!heavyClient) {
    heavyClient = new HeavyClient(config)
  }
  return heavyClient
}
```

## Memory and Timeout Configuration

```yaml
# Memory directly affects CPU allocation
# 128 MB = 1/10 vCPU
# 1,792 MB = 1 full vCPU
# 10,240 MB = 6 vCPUs

# Use AWS Lambda Power Tuning to find optimal memory
# https://github.com/alexcasalboni/aws-lambda-power-tuning

MyFunction:
  Properties:
    MemorySize: 512     # Sweet spot for most API functions
    Timeout: 30         # Always set explicit timeout
    ReservedConcurrentExecutions: 100  # Protect downstream services
```

## Lambda Layers

```bash
# Create a shared dependencies layer
mkdir -p layer/nodejs
cd layer/nodejs
npm init -y
npm install --save sharp uuid
cd ../..
zip -r layer.zip layer/

aws lambda publish-layer-version \
  --layer-name shared-deps \
  --zip-file fileb://layer.zip \
  --compatible-runtimes nodejs20.x
```

## VPC Configuration

```yaml
# Only use VPC if Lambda needs to access VPC resources (RDS, ElastiCache)
# VPC adds cold start latency

MyFunction:
  Properties:
    VpcConfig:
      SecurityGroupIds:
        - !Ref LambdaSecurityGroup
      SubnetIds:
        - !Ref PrivateSubnet1
        - !Ref PrivateSubnet2
    # Lambda needs NAT Gateway for internet access in VPC
```

## Error Handling and Retries

```yaml
# Async invocation retry config
MyFunction:
  Properties:
    EventInvokeConfig:
      MaximumRetryAttempts: 2
      MaximumEventAgeInSeconds: 3600
      DestinationConfig:
        OnFailure:
          Destination: !GetAtt DeadLetterQueue.Arn

# SQS trigger with partial batch failure reporting
SQSTrigger:
  Type: SQS
  Properties:
    Queue: !GetAtt MyQueue.Arn
    BatchSize: 10
    FunctionResponseTypes:
      - ReportBatchItemFailures
```

## Monitoring

```typescript
// Structured logging for CloudWatch Insights
console.log(JSON.stringify({
  level: 'INFO',
  message: 'Order processed',
  orderId: order.id,
  duration: endTime - startTime,
  cold_start: isColdStart,
}))

// Custom metrics via Embedded Metric Format (no CloudWatch API calls needed)
const { createMetricsLogger, Unit } = require('aws-embedded-metrics')

export async function handler(event) {
  const metrics = createMetricsLogger()
  metrics.setNamespace('MyApp')
  metrics.putMetric('OrderProcessed', 1, Unit.Count)
  metrics.putMetric('ProcessingTime', duration, Unit.Milliseconds)
  metrics.setProperty('OrderId', orderId)
  await metrics.flush()
}
```

## Cost Optimization

- **Right-size memory** — Use Lambda Power Tuning to find cost-optimal memory.
- **ARM64 (Graviton2)** — 20% cheaper, often faster. Use `arm64` architecture.
- **Avoid VPC** unless required — VPC adds ENI costs and cold start latency.
- **Use provisioned concurrency sparingly** — Only for latency-sensitive functions.
- **Bundle and tree-shake** — Smaller packages = faster cold starts = less billable time.
- **Set reserved concurrency** — Prevent runaway scaling and unexpected bills.

## Common Pitfalls

1. **Not initializing SDK clients outside handler** — Recreating clients per invocation wastes time.
2. **Missing timeout** — Default 3s timeout. Always set explicitly based on expected duration.
3. **No dead letter queue** — Failed async invocations are silently dropped without DLQ.
4. **Synchronous calls in VPC** — VPC + internet access needs NAT Gateway ($32/mo minimum).
5. **Over-provisioning memory** — Profile first, then choose. 128MB is often fine for simple functions.
6. **Not reporting batch item failures** — Without `ReportBatchItemFailures`, one failure retries entire batch.
7. **Logging raw events** — Events may contain PII. Log selectively.
