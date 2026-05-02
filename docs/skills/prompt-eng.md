---
name: prompt-engineer
description: Prompt optimization agent for the Zynx AGI platform. Use this skill to design, refine, evaluate, and optimize prompts for any LLM task — including system prompts, few-shot examples, chain-of-thought templates, and agentic instructions. Triggers on "optimize this prompt", "improve my prompt", "write a system prompt for", "add few-shot examples", "why is the LLM not following instructions", or when any agent's output quality needs improvement via prompt engineering. Always test before/after.
---

# Prompt Engineer

Designs and optimizes prompts for LLMs across all Zynx agents — system prompts, task instructions, few-shot examples, and structured output templates.

## Prompt Patterns

| Pattern | Use Case | Complexity |
|---|---|---|
| Zero-shot | Simple, clear tasks | Low |
| Few-shot | Format/style learning | Medium |
| Chain-of-Thought | Reasoning tasks | Medium |
| ReAct | Tool-using agents | High |
| Structured Output | JSON/typed response | Medium |
| Constitutional | Safety/alignment | High |
| Meta-prompting | Prompt generation | High |

## Input Contract

```typescript
import { z } from 'zod';

export const PromptEngineerRequestSchema = z.object({
  requestId: z.string().uuid(),
  task: z.string().min(10),
  currentPrompt: z.string().optional(),
  targetModel: z.string().default('claude-sonnet-4'),
  outputFormat: z.enum(['text', 'json', 'structured', 'code']).default('text'),
  examples: z.array(z.object({
    input: z.string(),
    expectedOutput: z.string(),
  })).max(20).default([]),
  constraints: z.array(z.string()).default([]),
  language: z.enum(['en', 'th', 'mixed']).default('en'),
  evaluationCriteria: z.array(z.string()).default([]),
  tenantId: z.string().uuid(),
});
```

## Output Contract

```typescript
export const PromptEngineerOutputSchema = z.object({
  requestId: z.string(),
  systemPrompt: z.string(),
  userPromptTemplate: z.string(),
  fewShotExamples: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })),
  promptTokenEstimate: z.number().int(),
  qualityScore: z.number().min(0).max(100),
  improvements: z.array(z.object({
    type: z.string(),
    rationale: z.string(),
    before: z.string().optional(),
    after: z.string().optional(),
  })),
  testResults: z.array(z.object({
    input: z.string(),
    output: z.string(),
    score: z.number(),
  })).optional(),
});
```

## Optimization Checklist

```
□ Clear persona/role statement
□ Explicit output format specification
□ Examples for non-obvious outputs
□ Edge case instructions
□ Negative examples ("do NOT do X")
□ Language/tone specification
□ Error handling instructions
□ Token budget awareness
□ Thai/English code-switching (if needed)
```

## Structured Output Pattern

```typescript
const STRUCTURED_PROMPT = `
Respond ONLY with valid JSON matching this exact schema:
${JSON.stringify(schema, null, 2)}

Rules:
- No preamble, no explanation, no markdown fences
- All fields required unless marked optional
- Dates in ISO 8601 format
`;
```
