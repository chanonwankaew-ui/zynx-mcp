import { DeejaAgent } from "./deeja.agent.js";
import { OrchestratorAgent } from "./orchestrator.agent.js";
import { LLMRouterAgent, RAGAgent, TaskPlannerAgent, NotifierAgent } from "./agents.js";
import { AgentResult } from "./schemas/index.js";

export * from "./schemas/index.js";
export * from "./deeja.agent.js";
export * from "./orchestrator.agent.js";
export * from "./agents.js";

/**
 * Zynx AGI Platform Main Entry
 * Wires all agents together into a unified workflow.
 */
export class ZynxAGIPlatform {
  private deeja: DeejaAgent;
  private orchestrator: OrchestratorAgent;
  
  private router: LLMRouterAgent;
  private rag: RAGAgent;
  private planner: TaskPlannerAgent;
  private notifier: NotifierAgent;

  constructor(config: { anthropicApiKey?: string; slackWebhookUrl?: string }) {
    // Initialize Agents
    this.deeja = new DeejaAgent();
    this.router = new LLMRouterAgent();
    this.rag = new RAGAgent();
    this.planner = new TaskPlannerAgent();
    this.notifier = new NotifierAgent();

    // Map agents for orchestrator execution
    const registry = new Map<string, (payload: any) => Promise<AgentResult<any>>>();
    registry.set("llm_router", (payload: any) => this.router.routeAndExecute(payload));
    registry.set("rag_agent", (payload: any) => this.rag.queryWithRerank(payload));
    registry.set("planner_agent", (payload: any) => this.planner.generatePlan(payload.intentId, payload.context));
    registry.set("notifier_agent", (payload: any) => this.notifier.sendNotification(payload));

    this.orchestrator = new OrchestratorAgent({
      maxConcurrency: 5,
      globalTimeoutMs: 60000,
      agentRegistry: registry
    });
  }

  /**
   * Main Process Pipeline
   */
  async process(sessionId: string, input: string): Promise<AgentResult<any>> {
    console.error(`\n[Platform] Starting session ${sessionId} for input: "${input}"`);
    
    // 1. NLP Parse via Deeja
    const intentRes = await this.deeja.parseIntent(input);
    if (!intentRes.success || !intentRes.data) {
      return { success: false, error: `Intent parsing failed: ${intentRes.error}` };
    }
    const intent = intentRes.data;
    console.error(`[Platform] Intent parsed: ${intent.parsedIntent} (confidence: ${intent.confidence.toFixed(2)})`);

    // 2. Task Planning
    const planRes = await this.planner.generatePlan(intent.id, intent.parsedIntent);
    if (!planRes.success || !planRes.data) {
      return { success: false, error: `Task planning failed: ${planRes.error}` };
    }
    const plan = planRes.data;
    console.error(`[Platform] DAG Plan created with ${plan.steps.length} steps.`);

    // 3. Orchestrate Execution
    console.error(`[Platform] Handing over to Orchestrator...`);
    const execRes = await this.orchestrator.executePlan(plan);
    
    if (!execRes.success) {
      console.error(`[Platform] Execution failed: ${execRes.error}`);
      return execRes;
    }

    console.error(`[Platform] Execution complete!`);
    return { success: true, data: execRes.data, metadata: { intent, planId: plan.planId } };
  }
}
