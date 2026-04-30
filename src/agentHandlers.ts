import { AGENT_REGISTRY, findAgent, type AgentMeta } from "./agentRegistry.js";

export type AgentInvocationContext = {
  tenantId: string;
  userId: string;
};

export type AgentHandlerResult = {
  output: Record<string, unknown>;
  tokensUsed: number;
  modelUsed: string;
  durationMs: number;
};

type WorkflowAgentInput = {
  id?: unknown;
  name?: unknown;
  role?: unknown;
  category?: unknown;
  estimatedDuration?: unknown;
};

type WorkflowInput = {
  id?: unknown;
  name?: unknown;
  goal?: unknown;
  agents?: unknown;
};

type CheckResult = {
  name: string;
  status: "pass" | "warn" | "fail";
  message: string;
};

type Finding = {
  severity: "info" | "warn" | "blocker";
  title: string;
  detail: string;
};

function stringify(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "zynx-workflow";
}

function summarize(value: unknown, maxLength = 240): string {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function getGoal(input: Record<string, unknown>): string {
  const context = asRecord(input.context);
  const values = [
    input.goal,
    input.task,
    input.message,
    input.workflowInput,
    context.goal,
    context.input
  ];

  for (const value of values) {
    const text = stringify(value);
    if (text) return text;
  }

  return "Run Zynx workflow";
}

function getWorkflow(input: Record<string, unknown>): WorkflowInput | undefined {
  const direct = asRecord(input.workflow);
  if (Object.keys(direct).length) return direct;

  const context = asRecord(input.context);
  const contextual = asRecord(context.workflow);
  if (Object.keys(contextual).length) return contextual;

  return undefined;
}

function getAgentInput(input: Record<string, unknown>): WorkflowAgentInput {
  return asRecord(input.agent) as WorkflowAgentInput;
}

function registryAgent(agentId: string): AgentMeta {
  const meta = findAgent(agentId);
  if (!meta) throw new Error(`Agent "${agentId}" is not registered`);
  return meta;
}

function agentStep(agentId: string, index: number) {
  const meta = registryAgent(agentId);
  return {
    step: index + 1,
    id: meta.id,
    name: meta.name,
    role: meta.role,
    category: meta.category,
    estimatedDuration: index === 0 ? 2 : 3,
    backendRoute: meta.backendRoute,
    mcpTool: meta.mcpTool
  };
}

function plannedAgentIdsForGoal(goal: string, input: Record<string, unknown>): string[] {
  const explicit = asArray(input.preferredAgents ?? input.preferred_agents ?? input.agents)
    .map((value) => stringify(value))
    .filter(Boolean)
    .filter((agentId) => Boolean(findAgent(agentId)));

  if (explicit.length) return ["orchestrator", "task-planner", ...explicit, "validator", "reviewer", "report-gen", "logger"];

  const lowered = goal.toLowerCase();
  if (lowered.includes("governance") || lowered.includes("manifest") || lowered.includes("duplicate")) {
    return ["orchestrator", "data-ingest", "validator", "transformer", "reviewer", "report-gen", "logger"];
  }

  if (lowered.includes("code") || lowered.includes("build") || lowered.includes("developer") || lowered.includes("implementation")) {
    return ["orchestrator", "task-planner", "validator", "code-gen", "reviewer", "test-gen", "doc-writer", "report-gen", "logger"];
  }

  if (lowered.includes("deeja") || lowered.includes("chat") || lowered.includes("user")) {
    return ["deeja", "task-planner", "validator", "reviewer", "report-gen"];
  }

  return ["orchestrator", "task-planner", "validator", "reviewer", "report-gen", "logger"];
}

function uniqueAgentIds(agentIds: string[]): string[] {
  const seen = new Set<string>();
  return agentIds.filter((agentId) => {
    if (seen.has(agentId)) return false;
    seen.add(agentId);
    return true;
  });
}

async function taskPlannerHandler(input: Record<string, unknown>, ctx: AgentInvocationContext): Promise<Record<string, unknown>> {
  const goal = getGoal(input);
  const agents = uniqueAgentIds(plannedAgentIdsForGoal(goal, input)).map(agentStep);
  const workflowId = slug(stringify(input.workflowId) || goal);

  return {
    message: `Planned ${agents.length} registry-backed Zynx workflow steps.`,
    workflow: {
      id: workflowId,
      name: stringify(input.workflowName) || `Zynx Plan: ${goal.slice(0, 60)}`,
      goal,
      contextPassing: "sequential",
      executedBy: "task-planner",
      tenantId: ctx.tenantId,
      agents
    },
    routeSummary: agents.map((agent) => ({
      agentId: agent.id,
      backendRoute: agent.backendRoute,
      mcpTool: agent.mcpTool
    })),
    nextActions: [
      "Review the generated workflow before execute mode.",
      "Run scripts/run-workflow.ts in dry-run mode to verify every route.",
      "Keep provider-dependent execution behind environment checks."
    ]
  };
}

async function deejaHandler(input: Record<string, unknown>, ctx: AgentInvocationContext): Promise<Record<string, unknown>> {
  const goal = getGoal(input);
  const context = asRecord(input.context);
  const rawResult = input.result ?? input.output ?? context.result ?? context.output ?? input;
  const hasThai = /[\u0E00-\u0E7F]/.test(goal) || /[\u0E00-\u0E7F]/.test(JSON.stringify(rawResult));
  const summary = summarize(rawResult);

  return {
    message: hasThai
      ? "รับงานแล้วค่ะ นี่คือสรุปสถานะที่ตรวจสอบได้"
      : "Received. Here is the reviewable Zynx response.",
    persona: "Deeja",
    language: hasThai ? "th" : "en",
    tone: "calm-operator",
    actionableCard: {
      title: hasThai ? "สรุปงาน Zynx" : "Zynx Work Summary",
      status: "In Progress",
      goal,
      summary,
      suggestedActions: [
        "Verify the workflow report before approving execution.",
        "Route unclear requirements back to task-planner.",
        "Keep user-facing copy separate from orchestration details."
      ]
    },
    decisionLog: [
      {
        actor: "deeja",
        decision: "Formatted backend output for user review without changing execution state.",
        tenantId: ctx.tenantId,
        userId: ctx.userId
      }
    ]
  };
}

function validateWorkflow(workflow: WorkflowInput | undefined): CheckResult[] {
  const checks: CheckResult[] = [];

  if (!workflow) {
    checks.push({
      name: "workflow.present",
      status: "warn",
      message: "No workflow object supplied; validating invocation context only."
    });
    return checks;
  }

  checks.push({
    name: "workflow.goal",
    status: stringify(workflow.goal) ? "pass" : "fail",
    message: stringify(workflow.goal) ? "Workflow goal is present." : "Workflow goal is missing."
  });

  const agents = asArray(workflow.agents);
  checks.push({
    name: "workflow.agents",
    status: agents.length > 0 ? "pass" : "fail",
    message: agents.length > 0 ? `Workflow includes ${agents.length} agents.` : "Workflow must include at least one agent."
  });

  for (const [index, agent] of agents.entries()) {
    const record = asRecord(agent) as WorkflowAgentInput;
    const agentId = stringify(record.id);
    const meta = agentId ? findAgent(agentId) : undefined;
    checks.push({
      name: `workflow.agents.${index}.route`,
      status: meta ? "pass" : "fail",
      message: meta
        ? `${agentId} maps to ${meta.backendRoute}.`
        : `Agent at index ${index} is missing a valid registry route.`
    });
  }

  return checks;
}

async function validatorHandler(input: Record<string, unknown>): Promise<Record<string, unknown>> {
  const workflow = getWorkflow(input);
  const agent = getAgentInput(input);
  const agentId = stringify(agent.id);
  const context = asRecord(input.context);
  const checks = validateWorkflow(workflow);

  if (agentId) {
    const meta = findAgent(agentId);
    checks.push({
      name: "invocation.agentRoute",
      status: meta ? "pass" : "fail",
      message: meta ? `${agentId} is registered at ${meta.backendRoute}.` : `${agentId} is not registered.`
    });
  }

  checks.push({
    name: "context.available",
    status: Object.keys(context).length ? "pass" : "warn",
    message: Object.keys(context).length ? `Context contains ${Object.keys(context).length} entries.` : "No context entries supplied."
  });

  const failed = checks.filter((check) => check.status === "fail");
  const warnings = checks.filter((check) => check.status === "warn");

  return {
    message: failed.length ? "Validation failed." : warnings.length ? "Validation passed with warnings." : "Validation passed.",
    valid: failed.length === 0,
    severity: failed.length ? "fail" : warnings.length ? "warn" : "ok",
    checks,
    routeMapSize: AGENT_REGISTRY.length
  };
}

function reviewerFindings(input: Record<string, unknown>): Finding[] {
  const findings: Finding[] = [];
  const text = JSON.stringify(input).toLowerCase();

  if (/(rm -rf|git reset --hard|delete all|drop table|destroy production)/.test(text)) {
    findings.push({
      severity: "blocker",
      title: "Destructive action requires human approval",
      detail: "The request or context includes destructive-action language."
    });
  }

  if (/(sk-[a-z0-9]|api[_-]?key|secret|private[_-]?key)/i.test(JSON.stringify(input))) {
    findings.push({
      severity: "warn",
      title: "Possible credential material",
      detail: "Review output before publishing because the payload references credential-like terms."
    });
  }

  const context = asRecord(input.context);
  const failedContextKeys = Object.entries(context)
    .filter(([, value]) => JSON.stringify(value).toLowerCase().includes("\"state\":\"failed\""))
    .map(([key]) => key);

  if (failedContextKeys.length) {
    findings.push({
      severity: "blocker",
      title: "Prior workflow step failed",
      detail: `Failed context entries: ${failedContextKeys.join(", ")}.`
    });
  }

  if (!findings.length) {
    findings.push({
      severity: "info",
      title: "No blocking review findings",
      detail: "The reviewer found no destructive action, failed prior step, or obvious credential exposure."
    });
  }

  return findings;
}

async function reviewerHandler(input: Record<string, unknown>): Promise<Record<string, unknown>> {
  const findings = reviewerFindings(input);
  const blockers = findings.filter((finding) => finding.severity === "blocker");
  const warnings = findings.filter((finding) => finding.severity === "warn");

  return {
    message: blockers.length ? "Review blocked." : warnings.length ? "Review passed with warnings." : "Review approved.",
    reviewStatus: blockers.length ? "blocked" : warnings.length ? "needs_review" : "approved",
    findings,
    requiredActions: blockers.length
      ? ["Stop execute-mode promotion until blocker findings are resolved."]
      : warnings.length
        ? ["Review warning findings before publishing or notifying users."]
        : ["Proceed to the next workflow step."]
  };
}

async function fallbackHandler(agentId: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
  const meta = registryAgent(agentId);
  return {
    message: `Executed ${meta.name} through local fallback handler.`,
    handlerType: "fallback",
    agent: {
      id: meta.id,
      name: meta.name,
      role: meta.role,
      category: meta.category
    },
    receivedInput: summarize(input),
    nextActions: [
      `Add a specialized handler for ${meta.id} when this agent needs production behavior.`
    ]
  };
}

export async function invokeAgentHandler(
  agentId: string,
  input: Record<string, unknown>,
  ctx: AgentInvocationContext
): Promise<AgentHandlerResult> {
  const startedAt = Date.now();
  let output: Record<string, unknown>;

  switch (agentId) {
    case "task-planner":
      output = await taskPlannerHandler(input, ctx);
      break;
    case "deeja":
      output = await deejaHandler(input, ctx);
      break;
    case "validator":
      output = await validatorHandler(input);
      break;
    case "reviewer":
      output = await reviewerHandler(input);
      break;
    default:
      output = await fallbackHandler(agentId, input);
      break;
  }

  return {
    output: {
      ...output,
      agentId,
      handledBy: agentId === "task-planner" || agentId === "deeja" || agentId === "validator" || agentId === "reviewer"
        ? "specialized-handler"
        : "fallback-handler"
    },
    tokensUsed: 0,
    modelUsed: "local-deterministic-handler",
    durationMs: Date.now() - startedAt
  };
}

