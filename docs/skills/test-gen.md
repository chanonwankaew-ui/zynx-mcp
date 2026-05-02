---
name: test-generator
description: Unit and integration test generator for the Zynx AGI platform. Use this skill to generate comprehensive test suites for TypeScript or Python code — including unit tests, integration tests, API contract tests, and property-based tests. Triggers on "generate tests", "write unit tests", "add tests for", "test coverage", "write integration tests", or when any generated code needs a test suite. Always produces tests that are runnable with Vitest or pytest immediately.
---

# Test Generator

Generates production-ready unit, integration, and contract tests for TypeScript (Vitest) and Python (pytest) with high coverage and realistic fixtures.

## Test Types

| Type | Framework | Scope |
|---|---|---|
| Unit | Vitest / pytest | Single function/class |
| Integration | Vitest / pytest | Service + DB/Redis |
| API Contract | Supertest / httpx | HTTP endpoints |
| Property-based | fast-check / Hypothesis | Edge case exploration |
| Snapshot | Vitest | UI components |
| Load | k6 | Performance SLAs |

## Input Contract

```typescript
import { z } from 'zod';

export const TestGenRequestSchema = z.object({
  requestId: z.string().uuid(),
  sourceCode: z.string().min(1),
  language: z.enum(['typescript', 'python']),
  testTypes: z.array(z.enum(['unit', 'integration', 'api', 'property', 'snapshot'])).min(1),
  framework: z.enum(['vitest', 'jest', 'pytest']).optional(),
  coverageTarget: z.number().min(0).max(100).default(80),
  fixtureStrategy: z.enum(['inline', 'factory', 'fixture-file']).default('factory'),
  mockStrategy: z.enum(['vi.mock', 'msw', 'sinon']).default('vi.mock'),
  includeEdgeCases: z.boolean().default(true),
  tenantId: z.string().uuid(),
});
```

## Output Contract

```typescript
export const TestGenOutputSchema = z.object({
  requestId: z.string(),
  testFiles: z.array(z.object({
    path: z.string(),
    content: z.string(),
    testCount: z.number().int(),
    type: z.string(),
  })),
  fixtureFiles: z.array(z.object({
    path: z.string(),
    content: z.string(),
  })).default([]),
  estimatedCoverage: z.number().min(0).max(100),
  runCommand: z.string(),
});
```

## Test Structure (Vitest)

```typescript
describe('ServiceName', () => {
  let service: ServiceName;
  let mockDep: MockType<Dependency>;

  beforeEach(() => {
    mockDep = createMock<Dependency>();
    service = new ServiceName(mockDep);
  });

  describe('methodName', () => {
    it('should return expected result for valid input', async () => {
      // Arrange
      const input = buildValidInput();
      mockDep.someMethod.mockResolvedValue(buildExpectedDep());
      // Act
      const result = await service.methodName(input);
      // Assert
      expect(result).toMatchObject({ success: true });
    });

    it('should throw ValidationError for invalid input', async () => {
      await expect(service.methodName(null as never))
        .rejects.toThrow(ValidationError);
    });
  });
});
```

## Coverage Requirements
- All Zod `safeParse` failure paths must have tests
- All `catch` blocks must be exercised
- All enum values must have at least one test case
