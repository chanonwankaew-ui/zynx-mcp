---
name: chat-interface
description: Conversational UI layer for the Zynx AGI platform. Use this skill to build, render, or manage real-time chat interfaces — including message streaming, conversation history, multi-agent chat rooms, and WebSocket connections. Triggers when user asks for a "chat UI", "conversational interface", "message window", "chat component", or when any agent needs to present its output through a conversational interface. Always use for interactive dialogue between users and Zynx agents.
---

# Chat Interface

Real-time conversational UI layer connecting users to Zynx agents via WebSocket streaming with persistent conversation history.

## Responsibilities
- Stream LLM tokens to client via Server-Sent Events (SSE) or WebSocket
- Maintain conversation state with Memory Manager
- Route user messages to correct agent based on intent
- Render agent responses with markdown, code blocks, and rich media

## Input Contract

```typescript
import { z } from 'zod';

export const ChatMessageSchema = z.object({
  messageId: z.string().uuid(),
  conversationId: z.string().uuid(),
  role: z.enum(['user', 'assistant', 'system', 'agent']),
  content: z.string().min(1).max(32_000),
  agentId: z.string().optional(),
  attachments: z.array(z.object({
    type: z.enum(['image', 'file', 'audio']),
    url: z.string().url(),
    mimeType: z.string(),
    sizeBytes: z.number().int().positive(),
  })).max(10).default([]),
  metadata: z.record(z.unknown()).default({}),
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  timestamp: z.string().datetime(),
});
```

## Output Contract

```typescript
export const ChatResponseSchema = z.object({
  messageId: z.string().uuid(),
  conversationId: z.string().uuid(),
  content: z.string(),
  streamComplete: z.boolean(),
  agentId: z.string(),
  thinkingTrace: z.array(z.string()).optional(),
  citations: z.array(z.object({
    source: z.string(),
    excerpt: z.string(),
    url: z.string().url().optional(),
  })).optional(),
  suggestedReplies: z.array(z.string()).max(4).default([]),
  tokensUsed: z.number().int(),
});
```

## Streaming Pattern

```typescript
async function* streamResponse(msg: ChatMessage): AsyncGenerator<string> {
  const stream = await anthropic.messages.stream({
    model: await llmRouter.select(msg),
    messages: buildMessageHistory(msg.conversationId),
    system: buildSystemPrompt(msg.agentId),
  });
  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta') {
      yield chunk.delta.text;
    }
  }
}
```

## WebSocket Events

| Event | Direction | Payload |
|---|---|---|
| `message.send` | Client → Server | `ChatMessage` |
| `token.stream` | Server → Client | `{ token: string }` |
| `message.complete` | Server → Client | `ChatResponse` |
| `agent.thinking` | Server → Client | `{ trace: string }` |
| `error` | Server → Client | `{ code, message }` |

## Error Handling
- Disconnection → buffer tokens, replay on reconnect
- Agent failure → show graceful error bubble in UI
- Rate limit → queue message, show position in queue
