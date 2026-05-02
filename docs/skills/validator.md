---
name: schema-validator
description: Zod and JSON Schema validation agent for the Zynx AGI platform. Use this skill to validate any data payload against a schema, generate Zod schemas from example data or JSON Schema, convert between schema formats, or check data integrity before processing. Triggers on "validate this data", "check schema", "does this match the schema", "generate a Zod schema for", or whenever an agent needs to verify data shape before processing. Always validate before persisting or transmitting data.
---

# Schema Validator

Validates data payloads, generates Zod schemas, and converts between schema formats (JSON Schema ↔ Zod ↔ TypeScript types ↔ OpenAPI).

## Responsibilities
- Validate any JSON/object against Zod or JSON Schema
- Infer Zod schema from example data (schema generation)
- Convert JSON Schema → Zod TypeScript
- Generate TypeScript types from schemas
- Produce human-readable validation error reports

## Input Contract

```typescript
import { z } from 'zod';

export const ValidationRequestSchema = z.discriminatedUnion('operation', [
  z.object({
    operation: z.literal('validate'),
    data: z.unknown(),
    schema: z.unknown(),        // Zod schema as JSON or JSON Schema
    schemaFormat: z.enum(['zod-json', 'json-schema', 'openapi']),
    tenantId: z.string().uuid(),
    stopOnFirstError: z.boolean().default(false),
  }),
  z.object({
    operation: z.literal('infer'),
    sampleData: z.array(z.unknown()).min(1).max(100),
    schemaName: z.string(),
    tenantId: z.string().uuid(),
  }),
  z.object({
    operation: z.literal('convert'),
    sourceSchema: z.unknown(),
    sourceFormat: z.enum(['json-schema', 'openapi', 'typescript']),
    targetFormat: z.enum(['zod', 'json-schema', 'openapi', 'typescript']),
    tenantId: z.string().uuid(),
  }),
]);
```

## Output Contract

```typescript
export const ValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(z.object({
    path: z.string(),
    message: z.string(),
    received: z.unknown(),
    expected: z.string(),
  })),
  generatedSchema: z.string().optional(),   // For 'infer' operation
  convertedSchema: z.string().optional(),   // For 'convert' operation
  schemaHash: z.string(),
});
```

## Validation Pattern

```typescript
function validateWithZod(data: unknown, schema: ZodSchema): ValidationResult {
  const result = schema.safeParse(data);
  if (result.success) return { valid: true, errors: [] };
  return {
    valid: false,
    errors: result.error.issues.map(issue => ({
      path: issue.path.join('.'),
      message: issue.message,
      received: getValueAtPath(data, issue.path),
      expected: issue.code,
    })),
  };
}
```

## Error Format
Always use `safeParse` — never `parse`. Return full `ZodError.issues` array with human-readable paths.
