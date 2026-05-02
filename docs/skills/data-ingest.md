---
name: data-ingestion
description: ETL pipeline agent for the Zynx AGI platform. Use this skill for extracting data from external sources (APIs, files, databases, webhooks), transforming it to Zynx schemas, and loading into target stores. Triggers on "ingest data", "import from", "ETL", "sync data", "pull records from", "process this file", or when any agent needs to bring external data into the platform. Always use for any data import operation.
---

# Data Ingestion

Manages Extract-Transform-Load (ETL) pipelines for ingesting data from heterogeneous sources into the Zynx platform data layer.

## Supported Sources

| Source Type | Protocol | Auth |
|---|---|---|
| REST API | HTTP/HTTPS | Bearer, API Key, OAuth2 |
| GraphQL | HTTP | Bearer |
| PostgreSQL | pg | Connection string |
| CSV/XLSX | File | — |
| S3 / GCS | Object store | IAM / Service account |
| Webhook | HTTP POST | HMAC-SHA256 |
| LINE Messaging | REST | Channel token |
| Notion | REST | Integration token |

## Input Contract

```typescript
import { z } from 'zod';

export const IngestionJobSchema = z.object({
  jobId: z.string().uuid(),
  sourceType: z.enum(['rest', 'graphql', 'postgres', 'csv', 'xlsx', 's3', 'webhook', 'line', 'notion']),
  sourceConfig: z.record(z.unknown()),
  extractQuery: z.string().optional(),
  targetSchema: z.string(),
  batchSize: z.number().int().min(1).max(10_000).default(1000),
  upsertKey: z.array(z.string()).optional(),
  tenantId: z.string().uuid(),
  scheduleExpression: z.string().optional(),
  onConflict: z.enum(['skip', 'update', 'error']).default('update'),
  dryRun: z.boolean().default(false),
});
```

## Output Contract

```typescript
export const IngestionResultSchema = z.object({
  jobId: z.string(),
  status: z.enum(['success', 'partial', 'failed']),
  extracted: z.number().int(),
  transformed: z.number().int(),
  loaded: z.number().int(),
  skipped: z.number().int(),
  errors: z.array(z.object({
    row: z.number().optional(),
    field: z.string().optional(),
    message: z.string(),
  })),
  durationMs: z.number(),
  checksum: z.string(),
});
```

## Pipeline Stages

```typescript
async function runPipeline(job: IngestionJob): Promise<IngestionResult> {
  const raw = await extract(job);         // Source → raw records
  const transformed = await transform(raw, job.targetSchema); // Map + validate
  if (!job.dryRun) await load(transformed, job); // Write to target
  return buildResult(raw, transformed, job);
}
```

## Error Handling
- Schema validation failure → log row, continue with `skipped++`
- Source connection failure → retry 3x exponential, then throw
- `dryRun: true` → validate only, never write
- All errors include source row reference for debugging
