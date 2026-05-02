---
name: webhook
description: External event push and integration agent for the Zynx AGI platform. Use this skill for dispatching real-time events to external systems, managing webhook subscriptions, verifying delivery, and handling external integration callbacks. Triggers on "trigger webhook", "send event to", "external push", "sync with external app", or when any platform event needs to be sent to a registered third-party URL. Supports HMAC signing and retries.
---

# Webhook Dispatcher

Manages the outbound dispatch of platform events to external subscriber URLs with security signing and durable delivery guarantees.

## Capabilities
- Real-time event dispatching (Outbound Webhooks)
- HMAC-SHA256 payload signing for security
- Durable retry logic with exponential backoff
- Subscription management (URL, Events, Secret)
- Webhook delivery logging and dashboard integration
- Support for custom headers and auth schemes

## Input Contract

```typescript
import { z } from 'zod';

export const WebhookDispatchSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.string(),
  payload: z.record(z.unknown()),
  subscription: z.object({
    url: z.string().url(),
    secret: z.string(),
    headers: z.record(z.string()).default({}),
  }),
  tenantId: z.string().uuid(),
  retryConfig: z.object({
    maxAttempts: z.number().int().default(5),
    backoffMs: z.number().int().default(1000),
  }).default({}),
});
```

## Output Contract

```typescript
export const WebhookResultSchema = z.object({
  dispatchId: z.string().uuid(),
  status: z.enum(['success', 'failed', 'retrying', 'exhausted']),
  statusCode: z.number().int().optional(),
  attempts: z.number().int(),
  lastResponse: z.string().optional(),
  deliveredAt: z.string().datetime().optional(),
  error: z.string().optional(),
});
```

## Security Pattern

```typescript
function signPayload(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}
// Header: X-Zynx-Signature: sha256=...
```

## Retry Policy
- Attempt 1: Immediate
- Attempt 2: +15s
- Attempt 3: +1min
- Attempt 4: +15min
- Attempt 5: +1hr
- After 5 failures: Move to DLQ and notify tenant admin
