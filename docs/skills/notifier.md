---
name: notifier
description: Multi-channel notification dispatcher for the Zynx AGI platform. Use this skill for sending alerts, updates, and messages across Slack, Email, LINE, SMS, and Push notifications. Triggers on "notify the team", "send alert to", "email the user", "Slack message", "push notification", "LINE alert", or when any agent needs to communicate with users outside the platform. Supports templating and rate limiting.
---

# Notifier

Centralized notification engine for dispatching multi-channel alerts and messages with template support and provider abstraction.

## Capabilities
- Multi-channel delivery (Slack, Email, LINE, SMS, Web Push)
- Dynamic message templating (Handlebars/Mustache)
- Priority-based routing and batching
- Rate limiting and deduplication per user/tenant
- Delivery status tracking and retry logic
- Opt-out/Preference management enforcement

## Input Contract

```typescript
import { z } from 'zod';

export const NotificationRequestSchema = z.object({
  recipient: z.object({
    userId: z.string().optional(),
    email: z.string().email().optional(),
    slackChannel: z.string().optional(),
    lineId: z.string().optional(),
    phone: z.string().optional(),
  }),
  templateId: z.string(),
  data: z.record(z.unknown()).default({}),
  channels: z.array(z.enum(['email', 'slack', 'line', 'sms', 'push'])).min(1),
  priority: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
  tenantId: z.string().uuid(),
  metadata: z.record(z.unknown()).default({}),
});
```

## Output Contract

```typescript
export const NotificationOutputSchema = z.object({
  notificationId: z.string().uuid(),
  status: z.record(z.enum(['sent', 'queued', 'failed', 'skipped'])),
  deliveredAt: z.string().datetime().optional(),
  errors: z.array(z.object({
    channel: z.string(),
    message: z.string(),
  })).default([]),
  providerTrace: z.record(z.string()).optional(),
});
```

## Delivery Strategy
- **Critical Alerts**: Simultaneous delivery across all primary channels + SMS
- **Batching**: Group low-priority updates into a single daily digest
- **Retry**: Exponential backoff for transient provider errors (5xx)
- **Tracking**: All notifications log a `message_sent` event to Logger

## Providers
- Email: SendGrid / Resend
- Slack: Webhooks / App Home
- LINE: Messaging API (Thai primary)
- SMS: Twilio / AIS / ThaiBulkSMS
