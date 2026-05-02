---
name: code-generator
description: TypeScript and Python code generation agent for the Zynx AGI platform. Use this skill to generate production-ready code including modules, classes, functions, API clients, schemas, utilities, and full feature implementations. Triggers on "generate code for", "write a function that", "create a class", "implement this feature", "scaffold this module", or when any agent needs working code output. Always produces strict TypeScript or typed Python with Zod validation, error handling, and tests.
---

# Code Generator

Generates production-ready TypeScript (strict) and Python (typed) code for the Zynx AGI platform with full error handling, Zod validation, and test stubs.

## Responsibilities
- Generate typed modules, classes, functions, hooks
- Scaffold full feature directories
- Produce Zod schemas alongside implementation
- Output test stubs for generated code
- Follow Zynx coding standards

## Input Contract

```typescript
import { z } from 'zod';

export const CodeGenRequestSchema = z.object({
  requestId: z.string().uuid(),
  language: z.enum(['typescript', 'python']),
  codeType: z.enum([
    'module', 'class', 'function', 'api-client', 'schema',
    'hook', 'middleware', 'service', 'repository', 'feature',
  ]),
  specification: z.string().min(10).max(8000),
  existingCode: z.string().optional(),
  dependencies: z.array(z.string()).default([]),
  outputFiles: z.array(z.string()).optional(),
  testFramework: z.enum(['vitest', 'jest', 'pytest']).optional(),
  tenantId: z.string().uuid(),
});
```

## Output Contract

```typescript
export const CodeGenOutputSchema = z.object({
  requestId: z.string(),
  files: z.array(z.object({
    path: z.string(),
    content: z.string(),
    language: z.string(),
    type: z.enum(['implementation', 'schema', 'test', 'types', 'index']),
  })),
  dependencies: z.array(z.object({
    package: z.string(),
    version: z.string(),
    dev: z.boolean(),
  })),
  estimatedLoc: z.number().int(),
  warnings: z.array(z.string()).default([]),
});
```

## TypeScript Code Standards

```typescript
// Always include:
'use strict'; // or "use server" / "use client" as needed

// 1. Zod schema first
export const MyDataSchema = z.object({ ... });
export type MyData = z.infer<typeof MyDataSchema>;

// 2. Implementation with explicit return types
export async function myFunction(input: MyData): Promise<Result> {
  const parsed = MyDataSchema.safeParse(input);
  if (!parsed.success) throw new ValidationError(parsed.error);
  // ...
}

// 3. Error types
export class ValidationError extends Error {
  constructor(public readonly issues: z.ZodIssue[]) {
    super('Validation failed');
    this.name = 'ValidationError';
  }
}
```

## File Structure Template

```
feature-name/
├── index.ts           (re-exports)
├── feature.service.ts (business logic)
├── feature.schema.ts  (Zod schemas)
├── feature.types.ts   (TypeScript types)
├── feature.repo.ts    (DB layer)
└── feature.test.ts    (Vitest tests)
```

## Error Handling
- No `any` types — use `unknown` with type guards
- All async functions return `Promise<Result<T, E>>` or throw typed errors
- Every file has explicit `export` statements
