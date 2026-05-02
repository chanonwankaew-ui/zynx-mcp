import { z } from "zod";

// 1. Intent Schema
export const IntentSchema = z.object({
  id: z.string().uuid(),
  rawInput: z.string(),
  parsedIntent: z.string(),
  entities: z.record(z.string(), z.any()).optional(),
  confidence: z.number().min(0).max(1),
  createdAt: z.date().default(() => new Date()),
});
export type Intent = z.infer<typeof IntentSchema>;

// 2. Task Step Schema (DAG Nodes)
export const TaskStepSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  payload: z.any(),
  dependencies: z.array(z.string()).default([]), // IDs of steps that must complete first
  timeoutMs: z.number().optional().default(30000),
  retryCount: z.number().optional().default(3),
});
export type TaskStep = z.infer<typeof TaskStepSchema>;

// 3. Task Plan Schema
export const TaskPlanSchema = z.object({
  planId: z.string().uuid(),
  intentId: z.string().uuid(),
  steps: z.array(TaskStepSchema),
});
export type TaskPlan = z.infer<typeof TaskPlanSchema>;

// 4. LLM Request / Response
export const LLMRequestSchema = z.object({
  prompt: z.string(),
  model: z.string().optional(),
  temperature: z.number().optional(),
});
export type LLMRequest = z.infer<typeof LLMRequestSchema>;

export const LLMResponseSchema = z.object({
  text: z.string(),
  tokensUsed: z.number().optional(),
  latencyMs: z.number().optional(),
  modelUsed: z.string(),
});
export type LLMResponse = z.infer<typeof LLMResponseSchema>;

// 5. RAG Query / Result
export const RAGQuerySchema = z.object({
  query: z.string(),
  topK: z.number().optional().default(5),
  namespace: z.string().optional(),
});
export type RAGQuery = z.infer<typeof RAGQuerySchema>;

export const RAGResultSchema = z.object({
  documents: z.array(z.object({
    id: z.string(),
    content: z.string(),
    score: z.number(),
    metadata: z.record(z.string(), z.any()).optional(),
  })),
  latencyMs: z.number(),
});
export type RAGResult = z.infer<typeof RAGResultSchema>;

// 6. Notification Payload (Discriminated Union)
export const NotificationPayloadSchema = z.discriminatedUnion("channel", [
  z.object({ channel: z.literal("slack"), text: z.string(), blocks: z.array(z.any()).optional() }),
  z.object({ channel: z.literal("sendgrid"), to: z.string().email(), subject: z.string(), html: z.string() }),
  z.object({ channel: z.literal("line"), userId: z.string(), text: z.string() }),
]);
export type NotificationPayload = z.infer<typeof NotificationPayloadSchema>;

// 7. Generic Agent Result
export const AgentResultSchema = <T extends z.ZodTypeAny>(dataSchema: T) => z.object({
  success: z.boolean(),
  data: dataSchema.optional(),
  error: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type AgentResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
};
