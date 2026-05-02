---
name: zynx-orchestrator
description: Master coordinator for the Zynx AGI platform. Use this skill whenever a task requires multi-agent coordination, routing between specialized agents, decomposing complex requests into agent pipelines, managing execution plans, or when the user says "orchestrate", "coordinate agents", "run the pipeline", or asks for a multi-step automated workflow. This is the entry point for all Zynx platform executions — trigger it even for ambiguous high-level requests.
---

# Zynx Orchestrator

Master coordinator and origin node for the Zynx AGI platform. Receives top-level intents, decomposes them into executable plans, routes sub-tasks to specialized agents, and assembles results.

## Responsibilities
- Parse user intent → structured `ExecutionPlan`
- Select and sequence agents based on task type
- Manage agent-to-agent handoffs and data contracts
- Handle retries, fallbacks, and partial failures
- Return consolidated output with execution trace

## Input Contract

```typescript
import { z } from 'zod';

export const OrchestratorInputSchema = z.object({
  intent: z.string().min(1),
  context: z.record(z.unknown()).optional(),
  priority: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
  tenantId: z.string().uuid(),
  requestId: z.string().uuid(),
  maxAgents: z.number().int().min(1).max(20).default(10),
  timeoutMs: z.number().int().min(1000).max(300_000).default(30_000),
});

export type OrchestratorInput = z.infer<typeof OrchestratorInputSchema>;
```

## Output Contract

```typescript
export const ExecutionPlanSchema = z.object({
  planId: z.string().uuid(),
  steps: z.array(z.object({
    stepId: z.string(),
    agentId: z.string(),
    input: z.record(z.unknown()),
    dependsOn: z.array(z.string()).default([]),
    status: z.enum(['pending', 'running', 'done', 'failed']),
  })),
  result: z.unknown().optional(),
  trace: z.array(z.object({
    timestamp: z.string().datetime(),
    agentId: z.string(),
    event: z.string(),
    durationMs: z.number(),
  })),
  error: z.string().optional(),
});
```

## Agent Routing Table

| Intent Pattern | Primary Agent | Fallback |
|---|---|---|
| `data.*` | data-ingestion | db-agent |
| `code.*` | code-generator | refactor-agent |
| `ui.*` | frontend-designer | dashboard-agent |
| `report.*` | report-generator | doc-writer |
| `auth.*` | auth-guard | — |
| `notify.*` | notifier | — |
| `query.*` | rag-agent | db-agent |

## Execution Pattern

```typescript
async function orchestrate(input: OrchestratorInput): Promise<ExecutionPlan> {
  const plan = await taskPlanner.decompose(input.intent);
  const results = await Promise.allSettled(
    plan.steps.map(step => runAgent(step))
  );
  return assemblePlan(plan, results);
}
```

## Error Handling
- Validate input with Zod; throw `ZodError` on schema failure
- Each step timeout is `timeoutMs / steps.length`
- Failed steps are retried once with exponential backoff (base 500ms)
- Partial success returns completed steps + error list

## Output Format
Always return `ExecutionPlanSchema`-compliant JSON. Log every agent call to the Logger agent.
