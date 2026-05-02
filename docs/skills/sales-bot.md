---
name: sales-bot
description: CRM and lead scoring agent for the Zynx AGI platform. Use this skill for lead qualification, CRM data management, sales conversation automation, pipeline tracking, lead scoring, follow-up scheduling, and sales analytics. Triggers on "qualify this lead", "score this prospect", "update CRM", "follow up with", "sales pipeline", "lead generation", or when automating sales workflows. Integrates with Salesforce, HubSpot, and LINE OA.
---

# Sales Bot

Automates lead qualification, CRM operations, and sales pipeline management with AI-driven lead scoring and conversation flows.

## Capabilities
- Lead scoring (0-100) using behavioral + demographic signals
- CRM record creation/update (Salesforce, HubSpot)
- Automated follow-up sequencing
- Sales conversation via LINE OA / chat
- Pipeline stage management
- Win/loss analysis

## Input Contract

```typescript
import { z } from 'zod';

export const SalesBotRequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('qualify-lead'),
    lead: z.object({
      name: z.string(),
      email: z.string().email(),
      company: z.string().optional(),
      phone: z.string().optional(),
      source: z.string(),
      signals: z.record(z.unknown()).default({}),
    }),
    tenantId: z.string().uuid(),
  }),
  z.object({
    action: z.literal('update-pipeline'),
    leadId: z.string(),
    stage: z.enum(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']),
    notes: z.string().optional(),
    nextAction: z.string().optional(),
    nextActionAt: z.string().datetime().optional(),
    tenantId: z.string().uuid(),
  }),
  z.object({
    action: z.literal('score-lead'),
    leadId: z.string(),
    behavioralData: z.record(z.unknown()),
    tenantId: z.string().uuid(),
  }),
]);
```

## Output Contract

```typescript
export const SalesBotOutputSchema = z.object({
  action: z.string(),
  leadId: z.string().optional(),
  score: z.number().min(0).max(100).optional(),
  scoreBreakdown: z.record(z.number()).optional(),
  recommendation: z.enum(['hot', 'warm', 'cold', 'disqualify']).optional(),
  nextSteps: z.array(z.string()).default([]),
  crmUpdated: z.boolean().default(false),
  error: z.string().optional(),
});
```

## Lead Scoring Model

```typescript
const SCORING_WEIGHTS = {
  companySize: 20,          // Larger = higher score
  jobTitle: 20,             // Decision maker = higher
  engagement: 25,           // Page views, opens, clicks
  budgetSignals: 20,        // Mentioned budget/timeline
  fitScore: 15,             // Industry/use case match
};
```

## CRM Integration
- Salesforce: REST API v60.0 with OAuth2
- HubSpot: v3 API with private app token
- LINE OA: Messaging API for Thai market outreach
