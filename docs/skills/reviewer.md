---
name: code-reviewer
description: Code quality and lint review agent for the Zynx AGI platform. Use this skill to review TypeScript or Python code for quality, security vulnerabilities, performance issues, style violations, and architectural concerns. Triggers on "review this code", "check code quality", "find bugs", "security review", "lint this", or when any generated code needs quality verification before deployment. Always run before committing or deploying code.
---

# Code Reviewer

Reviews TypeScript and Python code for quality, security, performance, and adherence to Zynx coding standards with actionable, prioritized feedback.

## Review Dimensions

| Dimension | Checks | Severity |
|---|---|---|
| Security | Injection, secrets, RBAC bypass | Critical |
| Correctness | Logic errors, edge cases, types | High |
| Performance | N+1 queries, memory leaks, blocking | High |
| Maintainability | Complexity, naming, duplication | Medium |
| Style | ESLint/Prettier compliance | Low |
| Test Coverage | Missing test cases | Medium |

## Input Contract

```typescript
import { z } from 'zod';

export const ReviewRequestSchema = z.object({
  reviewId: z.string().uuid(),
  code: z.string().min(1).max(100_000),
  language: z.enum(['typescript', 'python', 'sql', 'yaml']),
  context: z.string().optional(),
  focusAreas: z.array(z.enum([
    'security', 'correctness', 'performance', 'maintainability', 'style', 'tests',
  ])).default(['security', 'correctness', 'performance']),
  existingTests: z.string().optional(),
  tenantId: z.string().uuid(),
});
```

## Output Contract

```typescript
export const ReviewResultSchema = z.object({
  reviewId: z.string(),
  summary: z.string(),
  overallScore: z.number().min(0).max(100),
  approved: z.boolean(),
  findings: z.array(z.object({
    id: z.string(),
    severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
    category: z.string(),
    line: z.number().int().optional(),
    code: z.string().optional(),
    message: z.string(),
    suggestion: z.string(),
    cweId: z.string().optional(),   // CWE ID for security findings
  })),
  metrics: z.object({
    linesOfCode: z.number(),
    cyclomaticComplexity: z.number(),
    cognitiveComplexity: z.number(),
    duplicatedLines: z.number(),
    anyTypeUsages: z.number(),
    missingErrorHandling: z.number(),
  }),
  autoFixable: z.array(z.string()),  // Finding IDs that can be auto-fixed
});
```

## Security Checklist (TypeScript)

```typescript
const SECURITY_CHECKS = [
  'No process.env without validation',
  'No eval() or Function()',
  'SQL uses parameterized queries only',
  'JWT verified with correct algorithm',
  'All user input passed through Zod',
  'No hardcoded secrets or tokens',
  'Tenant isolation enforced in queries',
  'No prototype pollution vectors',
];
```

## Approval Policy
- `critical` finding → block deployment (`approved: false`)
- `high` findings > 3 → block deployment
- `approved: true` only when no critical/blocking issues remain
