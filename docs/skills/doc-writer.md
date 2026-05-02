---
name: doc-writer
description: OpenAPI, Markdown, and technical documentation writer for the Zynx AGI platform. Use this skill to generate API documentation, README files, architecture decision records (ADRs), user guides, changelog entries, or any technical writing. Triggers on "write docs", "document this API", "generate README", "create an ADR", "write changelog", or when any agent needs documentation output. Always produces structured, accurate, and developer-friendly docs.
---

# Doc Writer

Generates technical documentation — OpenAPI 3.1 specs, Markdown guides, ADRs, README files, and changelogs — from code, schemas, or descriptions.

## Document Types

| Type | Format | Trigger |
|---|---|---|
| API Reference | OpenAPI 3.1 YAML | "document this API" |
| README | Markdown | "write a README" |
| ADR | Markdown (Nygard format) | "create an ADR" |
| Changelog | Keep-a-Changelog MD | "update changelog" |
| User Guide | Markdown / MDX | "write a user guide" |
| Architecture Doc | Mermaid + MD | "document the architecture" |

## Input Contract

```typescript
import { z } from 'zod';

export const DocRequestSchema = z.object({
  docType: z.enum(['openapi', 'readme', 'adr', 'changelog', 'guide', 'architecture']),
  title: z.string().min(1),
  sourceArtifacts: z.array(z.object({
    type: z.enum(['code', 'schema', 'description', 'existing-doc']),
    content: z.string(),
  })).min(1),
  audience: z.enum(['developer', 'end-user', 'stakeholder', 'ops']).default('developer'),
  language: z.enum(['en', 'th']).default('en'),
  includeExamples: z.boolean().default(true),
  tenantId: z.string().uuid(),
});
```

## Output Contract

```typescript
export const DocOutputSchema = z.object({
  docId: z.string().uuid(),
  title: z.string(),
  content: z.string(),
  format: z.string(),
  wordCount: z.number().int(),
  sections: z.array(z.string()),
  generatedAt: z.string().datetime(),
});
```

## OpenAPI Generation Pattern

```typescript
function generateOpenAPI(routes: Route[]): string {
  const spec: OpenAPISpec = {
    openapi: '3.1.0',
    info: { title, version, description },
    servers: [{ url: 'https://api.zynxdata.com/v1' }],
    paths: routes.reduce((acc, route) => ({
      ...acc,
      [route.path]: buildPathItem(route),
    }), {}),
    components: { schemas: extractZodSchemas(routes) },
  };
  return yaml.dump(spec);
}
```

## ADR Template

```markdown
# ADR-{number}: {title}
**Date**: {date}  **Status**: {Proposed|Accepted|Deprecated}

## Context
## Decision
## Consequences
## Alternatives Considered
```

## Error Handling
- Missing source artifacts → request clarification before generating
- Conflicting information in sources → flag explicitly in doc with `> ⚠️ Conflict`
- Always validate OpenAPI output with `@apidevtools/swagger-parser`
