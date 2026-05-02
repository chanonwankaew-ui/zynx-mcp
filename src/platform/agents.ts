import { AgentResult, NotificationPayload, RAGQuery, RAGResult, TaskPlan } from "./schemas/index.js";
import { v4 as uuidv4 } from "uuid";

// Mock Utility
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * 1. LLMRouterAgent: Model registry, cost/latency scoring, fallback chain
 */
export class LLMRouterAgent {
  async routeAndExecute(prompt: string): Promise<AgentResult<string>> {
    // Simulate cost/latency scoring logic
    console.log(`[LLMRouter] Analyzing prompt for optimal model routing...`);
    await sleep(200);
    const selectedModel = Math.random() > 0.5 ? "claude-3-haiku" : "gpt-4o-mini";
    
    console.log(`[LLMRouter] Selected ${selectedModel}. Executing fallback chain if needed.`);
    await sleep(1000); // simulate LLM call
    
    return {
      success: true,
      data: `Response from ${selectedModel}: Processed '${prompt.substring(0, 20)}...'`,
      metadata: { modelUsed: selectedModel, tokens: 150, latencyMs: 1000 }
    };
  }
}

/**
 * 2. RAGAgent: Vector store query + re-rank with timeout
 */
export class RAGAgent {
  async queryWithRerank(query: RAGQuery): Promise<AgentResult<RAGResult>> {
    console.log(`[RAGAgent] Searching vector store for: ${query.query}`);
    await sleep(600); // simulate DB/vector search latency
    
    // Simulate finding documents
    const docs = [
      { id: "doc_1", content: "Data Privacy Act 2025 details...", score: 0.95 },
      { id: "doc_2", content: "Internal summary report Q1...", score: 0.88 },
    ];
    
    return {
      success: true,
      data: { documents: docs, latencyMs: 600 }
    };
  }
}

/**
 * 3. TaskPlannerAgent: LLM-generated DAG plan, Zod-validated output
 */
export class TaskPlannerAgent {
  async generatePlan(intentId: string, intentContext: string): Promise<AgentResult<TaskPlan>> {
    console.log(`[TaskPlanner] Generating DAG plan for intent: ${intentContext}`);
    await sleep(800); // simulate LLM generating JSON plan
    
    const plan: TaskPlan = {
      planId: uuidv4(),
      intentId,
      steps: [
        {
          id: "step_rag",
          agentId: "rag_agent",
          payload: { query: intentContext, topK: 3 },
          dependencies: [],
          timeoutMs: 5000,
          retryCount: 2
        },
        {
          id: "step_llm",
          agentId: "llm_router",
          payload: `Synthesize information based on intent: ${intentContext}`,
          dependencies: ["step_rag"],
          timeoutMs: 15000,
          retryCount: 3
        },
        {
          id: "step_notify",
          agentId: "notifier_agent",
          payload: { channel: "slack", text: "Synthesis complete!" },
          dependencies: ["step_llm"],
          timeoutMs: 5000,
          retryCount: 3
        }
      ]
    };
    
    return { success: true, data: plan };
  }
}

/**
 * 4. NotifierAgent: Slack / SendGrid / LINE with per-channel retry
 */
export class NotifierAgent {
  async sendNotification(payload: NotificationPayload): Promise<AgentResult<string>> {
    console.log(`[Notifier] Sending notification via ${payload.channel}...`);
    await sleep(400); // simulate API call
    
    // Simulate occasional channel failure
    if (Math.random() < 0.1) {
      throw new Error(`API error from ${payload.channel}`);
    }
    
    return { success: true, data: `Successfully sent via ${payload.channel}` };
  }
}
