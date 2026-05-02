---
name: data-transformer
description: Data shape and payload mapping agent for the Zynx AGI platform. Use this skill to remap, reshape, filter, aggregate, or normalize data between different schemas, API formats, or internal models. Triggers on "transform this data", "map fields", "reshape payload", "normalize", "convert format", "merge datasets", or when data from one agent needs to match another agent's input contract. Always use between data-ingestion and any target agent.
---

# Data Transformer

Maps and reshapes data payloads between schemas using declarative transformation pipelines with full type safety.

## Transformation Operations

| Op | Description |
|---|---|
| `map` | Rename/remap fields |
| `filter` | Remove records matching predicate |
| `flatten` | Unnest nested structures |
| `aggregate` | Group + reduce (sum, avg, count) |
| `join` | Merge two datasets on key |
| `cast` | Type coercion (string→number, etc.) |
| `compute` | Add derived fields |
| `chunk` | Split large arrays into batches |

## Input Contract

```typescript
import { z } from 'zod';

export const TransformSpecSchema = z.object({
  transformId: z.string().uuid(),
  sourceData: z.union([z.array(z.unknown()), z.record(z.unknown())]),
  pipeline: z.array(z.object({
    op: z.enum(['map', 'filter', 'flatten', 'aggregate', 'join', 'cast', 'compute', 'chunk']),
    config: z.record(z.unknown()),
  })).min(1).max(20),
  targetSchema: z.unknown().optional(),   // Validate output if provided
  tenantId: z.string().uuid(),
  dryRun: z.boolean().default(false),
});
```

## Output Contract

```typescript
export const TransformResultSchema = z.object({
  transformId: z.string(),
  inputCount: z.number().int(),
  outputCount: z.number().int(),
  data: z.union([z.array(z.unknown()), z.record(z.unknown())]),
  validationErrors: z.array(z.object({
    index: z.number(),
    path: z.string(),
    message: z.string(),
  })).default([]),
  pipelineTrace: z.array(z.object({
    op: z.string(),
    inputCount: z.number(),
    outputCount: z.number(),
    durationMs: z.number(),
  })),
});
```

## Map Config Example

```typescript
// Rename + remap fields
{
  op: 'map',
  config: {
    fieldMap: {
      'user.firstName': 'name.first',
      'user.lastName': 'name.last',
      'amount_thb': 'price.thb',
    },
    dropUnmapped: true,
  }
}
```

## Error Handling
- Invalid op config → throw `TransformConfigError` before processing
- Per-record errors → log and continue; include in `validationErrors`
- `dryRun: true` → run pipeline on first 10 records, return preview only
