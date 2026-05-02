---
name: rag-agent
description: Retrieval-augmented generation agent for the Zynx AGI platform. Use this skill for knowledge-base Q&A, document search and synthesis, context-grounded generation, and any task requiring information from indexed documents. Triggers on "find information about", "answer from our docs", "search knowledge base", "what does the document say about", "RAG query", or when a user question needs grounding in specific documents. Always cites sources.
---

# RAG Agent

Answers questions and generates content grounded in indexed knowledge bases using retrieval-augmented generation with citation tracking.

## RAG Pipeline

```
Query → [Rewrite] → Vector Search → [Rerank] → Context Build → LLM Generate → [Verify] → Response + Citations
```

## Input Contract

```typescript
import { z } from 'zod';

export const RAGQuerySchema = z.object({
  queryId: z.string().uuid(),
  question: z.string().min(1).max(2000),
  namespace: z.string().default('default'),
  topK: z.number().int().min(1).max(20).default(8),
  minRelevanceScore: z.number().min(0).max(1).default(0.65),
  rewriteQuery: z.boolean().default(true),
  rerankResults: z.boolean().default(true),
  responseStyle: z.enum(['concise', 'detailed', 'bullet', 'structured']).default('detailed'),
  language: z.enum(['en', 'th', 'match-source']).default('match-source'),
  citationsRequired: z.boolean().default(true),
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
});
```

## Output Contract

```typescript
export const RAGResponseSchema = z.object({
  queryId: z.string(),
  answer: z.string(),
  citations: z.array(z.object({
    docId: z.string(),
    chunkId: z.string(),
    title: z.string(),
    excerpt: z.string(),
    relevanceScore: z.number(),
    url: z.string().url().optional(),
    pageNumber: z.number().int().optional(),
  })),
  confidence: z.number().min(0).max(1),
  groundingScore: z.number().min(0).max(1),   // % answer attributable to context
  retrievedChunks: z.number().int(),
  usedChunks: z.number().int(),
  tokensUsed: z.number().int(),
  cannotAnswer: z.boolean(),
  clarifyingQuestion: z.string().optional(),
});
```

## Query Rewrite

```typescript
async function rewriteQuery(question: string): Promise<string[]> {
  // Generate 3 alternative phrasings to improve retrieval recall
  return await llm.generate({
    system: 'Generate 3 alternative search queries for the given question. Return as JSON array.',
    user: question,
  });
}
```

## Grounding Verification

```typescript
function verifyGrounding(answer: string, chunks: Chunk[]): number {
  // Check % of answer claims attributable to retrieved chunks
  // Score 0-1; warn if < 0.6
  const context = chunks.map(c => c.content).join('\n');
  return measureAttributability(answer, context);
}
```

## Error Handling
- No relevant chunks found → `cannotAnswer: true` + ask for clarification
- Low confidence (<0.5) → flag in response, offer to search more broadly
- Always cite sources — never generate uncited facts
