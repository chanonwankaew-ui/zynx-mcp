---
name: vector-store
description: Embedding and vector retrieval agent for the Zynx AGI platform. Use this skill for storing document embeddings, performing semantic search, building RAG knowledge bases, or retrieving contextually similar content. Triggers on "embed this", "semantic search", "find similar", "build knowledge base", "index documents", "retrieve relevant context", or when any agent needs vector-based similarity matching. Always use as the retrieval backend for the RAG Agent.
---

# Vector Store

Manages embedding generation, vector storage (pgvector), and semantic similarity retrieval for the Zynx AGI platform.

## Responsibilities
- Generate embeddings via Anthropic, OpenAI, or local models
- Store vectors in pgvector with tenant isolation
- Perform approximate nearest-neighbor (ANN) search
- Manage document chunking strategies
- Support hybrid search (vector + full-text)

## Input Contract

```typescript
import { z } from 'zod';

export const VectorOpSchema = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('upsert'),
    documents: z.array(z.object({
      docId: z.string(),
      content: z.string().min(1).max(100_000),
      metadata: z.record(z.unknown()).default({}),
      namespace: z.string().default('default'),
    })).min(1).max(1000),
    embeddingModel: z.enum(['text-embedding-3-large', 'text-embedding-3-small', 'voyage-3']).default('text-embedding-3-large'),
    chunkStrategy: z.enum(['sentence', 'paragraph', 'fixed', 'semantic']).default('semantic'),
    chunkSize: z.number().int().min(128).max(4096).default(512),
    chunkOverlap: z.number().int().min(0).max(512).default(64),
    tenantId: z.string().uuid(),
  }),
  z.object({
    op: z.literal('query'),
    query: z.string().min(1).max(4000),
    namespace: z.string().default('default'),
    topK: z.number().int().min(1).max(100).default(10),
    minScore: z.number().min(0).max(1).default(0.7),
    filter: z.record(z.unknown()).optional(),
    hybridAlpha: z.number().min(0).max(1).default(0.7),  // 0=BM25, 1=vector
    tenantId: z.string().uuid(),
  }),
  z.object({
    op: z.literal('delete'),
    docIds: z.array(z.string()).min(1),
    namespace: z.string().default('default'),
    tenantId: z.string().uuid(),
  }),
]);
```

## Output Contract

```typescript
export const VectorResultSchema = z.object({
  op: z.string(),
  hits: z.array(z.object({
    docId: z.string(),
    chunkId: z.string(),
    content: z.string(),
    score: z.number(),
    metadata: z.record(z.unknown()),
  })).optional(),
  upsertedCount: z.number().int().optional(),
  deletedCount: z.number().int().optional(),
  error: z.string().optional(),
});
```

## Chunking Strategy

```typescript
function chunkDocument(content: string, strategy: ChunkStrategy): Chunk[] {
  switch (strategy) {
    case 'semantic': return semanticChunk(content);     // LLM-based boundary detection
    case 'sentence': return sentenceChunk(content);    // NLTK sentence tokenizer
    case 'paragraph': return content.split('\n\n').map(toChunk);
    case 'fixed': return slidingWindow(content, chunkSize, overlap);
  }
}
```

## Error Handling
- Embedding model unavailable → fallback to `text-embedding-3-small`
- Vector dimension mismatch → throw `DimensionMismatchError`
- Tenant isolation enforced at SQL level (`WHERE tenant_id = $1`)
