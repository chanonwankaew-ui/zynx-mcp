---
name: support-bot
description: Customer helpdesk and support automation agent for the Zynx AGI platform. Use this skill for handling customer inquiries, ticket management, knowledge base lookups, automated troubleshooting, and escalation to human agents. Triggers on "customer issue", "help with", "troubleshoot", "open ticket", "support request", "how to use", or when automating customer service workflows. Integrates with Zendesk, Freshdesk, and LINE Messaging.
---

# Support Bot

Handles real-time customer support, automated troubleshooting, and ticket lifecycle management with high-empathy AI responses.

## Capabilities
- 24/7 Automated first-response for common issues
- Ticket creation and routing based on sentiment/urgency
- Semantic lookup in Support Knowledge Base (via RAG Agent)
- Step-by-step troubleshooting guides
- Seamless handoff to human agents for complex issues
- Multilingual support (Thai/English)

## Input Contract

```typescript
import { z } from 'zod';

export const SupportRequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('handle-inquiry'),
    message: z.string(),
    channel: z.enum(['chat', 'email', 'line', 'phone']),
    userId: z.string(),
    tenantId: z.string().uuid(),
  }),
  z.object({
    action: z.literal('manage-ticket'),
    op: z.enum(['create', 'update', 'close', 'escalate']),
    ticketId: z.string().optional(),
    details: z.record(z.unknown()),
    tenantId: z.string().uuid(),
  }),
  z.object({
    action: z.literal('get-help-article'),
    query: z.string(),
    tenantId: z.string().uuid(),
  }),
]);
```

## Output Contract

```typescript
export const SupportOutputSchema = z.object({
  action: z.string(),
  response: z.string(),
  sentiment: z.enum(['positive', 'neutral', 'negative', 'urgent']),
  ticketId: z.string().optional(),
  suggestedArticles: z.array(z.object({
    title: z.string(),
    url: z.string().url(),
  })).default([]),
  handoffRequired: z.boolean().default(false),
  error: z.string().optional(),
});
```

## Escalation Logic
- Sentiment = `urgent` OR `negative` + high-value customer → Immediate human escalation
- Troubleshooting failed > 2 steps → Open ticket and escalate
- User explicitly says "talk to human" → Direct handoff
- Integration: Use `notifier` to alert human support team on Slack/LINE

## Persona Guidelines
- Warm, empathetic, and solution-oriented
- Use "ค่ะ/ครับ" for Thai interactions
- Acknowledge frustrations before providing technical steps
- "I'm an AI assistant, but I'm here to help or find someone who can."
