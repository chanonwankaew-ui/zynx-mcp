---
name: refactor-agent
description: Code improvement and refactoring agent for the Zynx AGI platform. Use this skill to refactor existing TypeScript or Python code for better readability, performance, maintainability, or adherence to Zynx coding standards — without changing external behavior. Triggers on "refactor this", "improve this code", "clean up", "extract function", "reduce complexity", "make this more readable", or when code review findings need to be resolved. Always preserves existing behavior.
---

# Refactor Agent

Improves existing code quality through targeted refactoring — extract functions, reduce complexity, improve types, and modernize patterns — while preserving behavior.

## Refactoring Patterns

| Pattern | When | Risk |
|---|---|---|
| Extract Function | Function >20 lines | Low |
| Replace `any` with `unknown` | Type safety | Medium |
| Add Zod validation | Unvalidated input | Low |
| Promise.all parallelization | Sequential awaits | Medium |
| Repository pattern | Inline DB queries | High |
| Error union types | Generic `throw Error` | Medium |
| Const enum → Zod enum | Loose string types | Low |

## Input Contract

```typescript
import { z } from 'zod';

export const RefactorRequestSchema = z.object({
  requestId: z.string().uuid(),
  code: z.string().min(1).max(100_000),
  language: z.enum(['typescript', 'python', 'sql']),
  goals: z.array(z.enum([
    'readability', 'performance', 'type-safety', 'error-handling',
    'reduce-complexity', 'dry', 'solid', 'testability',
  ])).min(1),
  constraints: z.array(z.string()).default([]),
  preserveSignatures: z.boolean().default(true),
  tenantId: z.string().uuid(),
});
```

## Output Contract

```typescript
export const RefactorOutputSchema = z.object({
  requestId: z.string(),
  originalCode: z.string(),
  refactoredCode: z.string(),
  diff: z.string(),          // Unified diff format
  changes: z.array(z.object({
    type: z.string(),
    description: z.string(),
    linesAffected: z.tuple([z.number(), z.number()]),
    behaviorPreserved: z.boolean(),
  })),
  metricsImprovement: z.object({
    complexityBefore: z.number(),
    complexityAfter: z.number(),
    locBefore: z.number(),
    locAfter: z.number(),
    anyTypesBefore: z.number(),
    anyTypesAfter: z.number(),
  }),
  testUpdateRequired: z.boolean(),
  breakingChanges: z.array(z.string()).default([]),
});
```

## Safety Guarantees
- `preserveSignatures: true` → never change public function signatures
- Always list `breakingChanges` even if empty
- Provide unified diff for every change
- Flag when tests must be updated
- Run Code Reviewer on output before returning
