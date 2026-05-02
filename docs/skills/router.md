---
name: llm-router
description: LLM model selector for the Zynx AGI platform. Use this skill when selecting which AI model (Claude Opus, Sonnet, Haiku, GPT-4o, Gemini, local models, etc.) to use for a given task based on cost, latency, capability, and context window requirements. Triggers when an agent needs a model decision, when the user mentions "which model", "route to LLM", or when the Orchestrator needs model assignment for a task step. Always use before invoking any LLM call in the pipeline.
---

# LLM Router

Selects the optimal language model for each task based on a multi-factor scoring matrix covering capability, cost, latency, and context requirements.

## Responsibilities
- Score candidate models against task requirements
- Enforce cost budgets per tenant
- Apply fallback chains when primary model is unavailable
- Log model usage for billing and analytics

## Input Contract

```typescript
import { z } from 'zod';

export const RoutingRequestSchema = z.object({
  taskType: z.enum([
    'reasoning', 'coding', 'summarization', 'translation',
    'classification', 'generation', 'embedding', 'vision',
  ]),
  promptTokensEstimate: z.number().int().positive(),
  maxOutputTokens: z.number().int().min(1).max(200_000),
  latencyBudgetMs: z.number().int().optional(),
  costBudgetUsd: z.number().positive().optional(),
  requiresVision: z.boolean().default(false),
  requiresToolUse: z.boolean().default(false),
  tenantId: z.string().uuid(),
  language: z.string().default('en'),
});
```

## Output Contract

```typescript
export const RoutingDecisionSchema = z.object({
  selectedModel: z.string(),
  provider: z.enum(['anthropic', 'openai', 'google', 'local']),
  modelId: z.string(),
  estimatedCostUsd: z.number(),
  estimatedLatencyMs: z.number(),
  fallbackChain: z.array(z.string()),
  rationale: z.string(),
});
```

## Model Capability Matrix

| Model | Reasoning | Code | Vision | Context | Cost/1M tok |
|---|---|---|---|---|---|
| claude-opus-4 | ★★★★★ | ★★★★★ | ✅ | 200K | $$$$$ |
| claude-sonnet-4 | ★★★★ | ★★★★★ | ✅ | 200K | $$$ |
| claude-haiku-4 | ★★★ | ★★★ | ✅ | 200K | $ |
| gpt-4o | ★★★★ | ★★★★ | ✅ | 128K | $$$$ |
| gemini-2.5-pro | ★★★★ | ★★★★ | ✅ | 1M | $$$ |

## Routing Logic

```typescript
function selectModel(req: RoutingRequest): RoutingDecision {
  const candidates = MODELS.filter(m =>
    m.contextWindow >= req.promptTokensEstimate + req.maxOutputTokens &&
    (!req.requiresVision || m.supportsVision) &&
    (!req.requiresToolUse || m.supportsTools)
  );
  return candidates
    .map(m => ({ ...m, score: scoreModel(m, req) }))
    .sort((a, b) => b.score - a.score)[0];
}
```

## Error Handling
- No candidates → throw `NoModelAvailableError`
- Budget exceeded → downgrade to cheapest capable model, warn in logs
- Always provide `fallbackChain` of at least 2 alternatives
