---
name: api-builder
description: REST and GraphQL API scaffolder for the Zynx AGI platform. Use this skill to generate complete API implementations — endpoints, routers, middleware, validation, authentication, and OpenAPI docs — from schema definitions or natural language descriptions. Triggers on "build an API", "create endpoints", "scaffold REST", "GraphQL schema", "add CRUD for", or when any feature needs a complete API layer. Produces Next.js App Router API routes or Express/Fastify with TypeScript strict.
---

# API Builder

Scaffolds production-ready REST and GraphQL APIs with authentication, Zod validation, OpenAPI docs, and rate limiting from schema or feature descriptions.

## Supported Stacks

| Stack | Pattern | Auth |
|---|---|---|
| Next.js 15 App Router | Route handlers | JWT middleware |
| Fastify 5 | Plugin-based | `@fastify/jwt` |
| Express 5 | Router + middleware | Passport JWT |
| GraphQL (Pothos) | Schema-first | Context JWT |

## Input Contract

```typescript
import { z } from 'zod';

export const APISpecSchema = z.object({
  apiId: z.string(),
  name: z.string(),
  style: z.enum(['rest', 'graphql', 'rest+graphql']).default('rest'),
  stack: z.enum(['nextjs', 'fastify', 'express', 'graphql']).default('nextjs'),
  resources: z.array(z.object({
    name: z.string(),
    schema: z.record(z.unknown()),
    operations: z.array(z.enum(['create', 'read', 'update', 'delete', 'list', 'search'])),
    auth: z.array(z.string()).default(['*']),    // Required roles per operation
    rateLimit: z.object({
      windowMs: z.number(),
      max: z.number(),
    }).optional(),
  })).min(1),
  baseUrl: z.string().url(),
  version: z.string().default('v1'),
  tenantId: z.string().uuid(),
});
```

## Output Contract

```typescript
export const APIOutputSchema = z.object({
  apiId: z.string(),
  files: z.array(z.object({
    path: z.string(),
    content: z.string(),
    type: z.enum(['route', 'schema', 'middleware', 'types', 'test', 'docs']),
  })),
  openApiSpec: z.string(),   // YAML
  curlExamples: z.array(z.string()),
  estimatedEndpoints: z.number().int(),
});
```

## REST Route Template (Next.js)

```typescript
// app/api/v1/[resource]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authGuard } from '@/lib/auth';
import { ResourceSchema } from './schema';

export async function POST(req: NextRequest) {
  const user = await authGuard(req, ['write']);
  const body = ResourceSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ errors: body.error.issues }, { status: 422 });
  const result = await resourceService.create({ ...body.data, tenantId: user.tenantId });
  return NextResponse.json(result, { status: 201 });
}
```

## Standard Response Format

```typescript
type APIResponse<T> = {
  data?: T;
  error?: { code: string; message: string; details?: unknown };
  meta?: { page: number; total: number; perPage: number };
};
```
