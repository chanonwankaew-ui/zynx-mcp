import { TaskPlan, TaskStep, AgentResult } from "./schemas/index.js";

type StepStatus = "pending" | "running" | "completed" | "failed";

export class OrchestratorAgent {
  private maxConcurrency: number;
  private globalTimeoutMs: number;
  private agentRegistry: Map<string, (payload: any) => Promise<AgentResult<any>>>;

  constructor(options: { maxConcurrency?: number; globalTimeoutMs?: number; agentRegistry: Map<string, (payload: any) => Promise<AgentResult<any>>> }) {
    this.maxConcurrency = options.maxConcurrency || 3;
    this.globalTimeoutMs = options.globalTimeoutMs || 60000;
    this.agentRegistry = options.agentRegistry;
  }

  async executePlan(plan: TaskPlan): Promise<AgentResult<Record<string, any>>> {
    return new Promise((resolve, reject) => {
      let isGlobalTimeout = false;
      const globalTimeout = setTimeout(() => {
        isGlobalTimeout = true;
        resolve({ success: false, error: "Global orchestration timeout exceeded" });
      }, this.globalTimeoutMs);

      const stepStatus: Record<string, StepStatus> = {};
      const stepResults: Record<string, any> = {};
      plan.steps.forEach((s: TaskStep) => stepStatus[s.id] = "pending");

      let runningCount = 0;
      let hasFailed = false;

      const checkDeadlock = () => {
        const pendingSteps = plan.steps.filter((s: TaskStep) => stepStatus[s.id] === "pending");
        if (pendingSteps.length > 0 && runningCount === 0) {
          // If we have pending steps but 0 running, and no one can start -> deadlock
          const canAnyStart = pendingSteps.some((s: TaskStep) => s.dependencies.every((d: string) => stepStatus[d] === "completed"));
          if (!canAnyStart) {
            hasFailed = true;
            clearTimeout(globalTimeout);
            resolve({ success: false, error: "DAG Deadlock detected: unfulfilled dependencies" });
          }
        }
      };

      const tryNextSteps = () => {
        if (hasFailed || isGlobalTimeout) return;

        const allCompleted = plan.steps.every((s: TaskStep) => stepStatus[s.id] === "completed");
        if (allCompleted) {
          clearTimeout(globalTimeout);
          resolve({ success: true, data: stepResults });
          return;
        }

        const readySteps = plan.steps.filter((s: TaskStep) => 
          stepStatus[s.id] === "pending" && 
          s.dependencies.every((d: string) => stepStatus[d] === "completed")
        );

        while (readySteps.length > 0 && runningCount < this.maxConcurrency) {
          const step = readySteps.shift()!;
          stepStatus[step.id] = "running";
          runningCount++;
          executeStep(step);
        }

        checkDeadlock();
      };

      const executeStep = async (step: TaskStep) => {
        const agentFunc = this.agentRegistry.get(step.agentId);
        if (!agentFunc) {
          hasFailed = true;
          resolve({ success: false, error: `Unknown agent ID: ${step.agentId}` });
          return;
        }

        let attempt = 0;
        let success = false;
        let lastError = "";

        while (attempt < step.retryCount && !success && !isGlobalTimeout) {
          attempt++;
          try {
            const result = await Promise.race([
              agentFunc(step.payload),
              new Promise<AgentResult<any>>((_, r) => setTimeout(() => r(new Error(`Step ${step.id} timeout`)), step.timeoutMs))
            ]);

            if (result.success) {
              success = true;
              stepResults[step.id] = result.data;
              stepStatus[step.id] = "completed";
            } else {
              lastError = result.error || "Unknown error";
            }
          } catch (err: any) {
            lastError = err.message;
          }

          if (!success && attempt < step.retryCount) {
            await new Promise(r => setTimeout(r, 1000 * attempt)); // Simple backoff
          }
        }

        runningCount--;

        if (!success) {
          hasFailed = true;
          stepStatus[step.id] = "failed";
          clearTimeout(globalTimeout);
          resolve({ success: false, error: `Step ${step.id} failed after ${step.retryCount} retries. Last error: ${lastError}` });
        } else {
          tryNextSteps();
        }
      };

      // Start execution
      tryNextSteps();
    });
  }
}
