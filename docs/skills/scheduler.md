---
name: job-scheduler
description: Cron and queue manager for the Zynx AGI platform. Use this skill when scheduling recurring jobs (cron), queuing background tasks, managing job priorities, handling retries/dead-letter queues, or monitoring job execution status. Triggers on phrases like "schedule this", "run every X", "queue a job", "set up a cron", "background task", or when any agent needs deferred or periodic execution. Always use for async workflows that should not block the main request.
---

# Job Scheduler

Manages cron-based scheduled jobs and priority work queues for the Zynx AGI platform using BullMQ (Redis-backed).

## Responsibilities
- Register cron expressions and validate with `cron-parser`
- Enqueue jobs with priority, delay, and backoff config
- Monitor queue depths, failure rates, and processing times
- Expose dead-letter queue (DLQ) for manual retry

## Input Contract

```typescript
import { z } from 'zod';

export const JobDefinitionSchema = z.object({
  jobId: z.string().uuid().optional(),
  jobType: z.string().min(1),
  queueName: z.string().min(1).default('zynx-default'),
  payload: z.record(z.unknown()),
  tenantId: z.string().uuid(),
  schedule: z.union([
    z.object({ type: z.literal('immediate') }),
    z.object({ type: z.literal('delayed'), delayMs: z.number().int().positive() }),
    z.object({ type: z.literal('cron'), expression: z.string() }),
  ]),
  priority: z.number().int().min(1).max(10).default(5),
  maxRetries: z.number().int().min(0).max(10).default(3),
  backoffType: z.enum(['fixed', 'exponential']).default('exponential'),
  backoffDelayMs: z.number().int().positive().default(1000),
  timeoutMs: z.number().int().positive().default(30_000),
  tags: z.array(z.string()).default([]),
});
```

## Output Contract

```typescript
export const JobResultSchema = z.object({
  jobId: z.string(),
  queueName: z.string(),
  status: z.enum(['queued', 'scheduled', 'running', 'completed', 'failed', 'dlq']),
  scheduledAt: z.string().datetime().optional(),
  nextRunAt: z.string().datetime().optional(),
  attemptsMade: z.number(),
  error: z.string().optional(),
});
```

## Queue Architecture

```
zynx-critical  (priority 1-2)  → Auth, Payments
zynx-high      (priority 3-4)  → User-facing APIs
zynx-default   (priority 5-6)  → Standard workflows
zynx-bulk      (priority 7-9)  → Reports, ETL
zynx-dlq       (failed)        → Manual review
```

## Cron Examples
```typescript
// Every day at 02:00 ICT
{ type: 'cron', expression: '0 2 * * *' }

// Every 15 minutes on weekdays
{ type: 'cron', expression: '*/15 * * * 1-5' }
```

## Error Handling
- Invalid cron → throw `InvalidCronExpressionError` with human-readable message
- Queue full (>10K jobs) → return `QUEUE_FULL` status, do not enqueue
- After `maxRetries` → move to DLQ, emit `job.failed` event to Notifier
