import { AGENT_REGISTRY, findAgent, type AgentMeta } from "./agentRegistry.js";
import {
  WorkflowSchema,
  createWorkflowFile,
  normalizeWorkflowAgents,
  resolveWorkflowFlow,
  slugWorkflowName
} from "./workflowSchema.js";
import { generateProviderText, type ProviderRuntimeConfig, type ProviderTextResult } from "./providerClient.js";

export type AgentInvocationContext = {
  tenantId: string;
  userId: string;
  traceId?: string;
  providerConfig?: ProviderRuntimeConfig;
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

function summarize(value: unknown, maxLength = 240): string {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function publicProviderExecution(result: ProviderTextResult) {
  return {
    provider: result.provider,
    status: result.status,
    modelUsed: result.modelUsed,
    tokensUsed: result.tokensUsed,
    usedRemoteProvider: result.usedRemoteProvider,
    error: result.error
  };
}

/**
 * Securely read a file from the workspace. 
 * Prevents reading outside repoRoot.
 */
function readWorkspaceFile(filePath: string): string | null {
  try {
    if (!filePath) return null;
    const fullPath = path.resolve(repoRoot, filePath);
    
    // Security check: must be inside repoRoot
    if (!fullPath.startsWith(repoRoot)) {
      console.warn(`[Security] Blocked attempt to read outside workspace: ${filePath}`);
      return null;
    }

    if (fs.existsSync(fullPath) && fs.lstatSync(fullPath).isFile()) {
      return fs.readFileSync(fullPath, "utf-8");
    }
  } catch (e) {
    console.error(`[Error] Failed to read workspace file ${filePath}:`, e);
  }
  return null;
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

function getWorkflow(input: Record<string, unknown>): unknown | undefined {
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
  const traceId = ctx.traceId || "no-trace";
  const agents = uniqueAgentIds(plannedAgentIdsForGoal(goal, input)).map(agentStep);
  console.error(`[Agent][${traceId}] task-planner: Planned ${agents.length} agents for goal: ${goal.slice(0, 50)}...`);
  const workflowId = slugWorkflowName(stringify(input.workflowId) || goal);
  const workflowFile = createWorkflowFile({
    id: workflowId,
    name: stringify(input.workflowName) || `Zynx Plan: ${goal.slice(0, 60)}`,
    goal,
    agents,
    contextPassing: "sequential",
    executedBy: "task-planner",
    tenantId: ctx.tenantId
  });
  const filePath = stringify(input.filePath || input.path || input.file);
  let fileContext = "";
  if (filePath) {
    const content = readWorkspaceFile(filePath);
    if (content) {
      fileContext = `FILE CONTENT (${filePath}):\n${content.slice(0, 4000)}`;
      console.error(`[Agent][${traceId}] task-planner: Read ${filePath} for context (${content.length} bytes)`);
    }
  }

  const provider = await generateProviderText({
    instructions: [
      "You are the Zynx task-planner agent.",
      "Write a concise operator summary for a workflow plan.",
      "If file content is provided, analyze it to ensure the plan is technically relevant to the codebase.",
      "Do not invent agent ids or routes. Mention only risks or next actions supported by the supplied plan."
    ].join(" "),
    input: JSON.stringify({
      goal,
      fileContext,
      agents: agents.map((agent) => ({
        id: agent.id,
        name: agent.name,
        backendRoute: agent.backendRoute,
        mcpTool: agent.mcpTool
      }))
    }),
    fallbackText: `Planned ${agents.length} registry-backed Zynx workflow steps. ${fileContext ? "Contextualized by workspace file." : ""}`,
    maxOutputTokens: 240,
    metadata: {
      agent_id: "task-planner",
      tenant_id: ctx.tenantId,
      trace_id: traceId,
      has_file_context: String(!!fileContext)
    },
    runtime: { ...ctx.providerConfig, traceId }
  });

  return {
    message: provider.text,
    workflow: workflowFile.workflow,
    routeSummary: agents.map((agent) => ({
      agentId: agent.id,
      backendRoute: agent.backendRoute,
      mcpTool: agent.mcpTool
    })),
    nextActions: [
      "Review the generated workflow before execute mode.",
      "Run scripts/run-workflow.ts in dry-run mode to verify every route.",
      "Keep provider-dependent execution behind environment checks."
    ],
    providerExecution: publicProviderExecution(provider)
  };
}

async function deejaHandler(input: Record<string, unknown>, ctx: AgentInvocationContext): Promise<Record<string, unknown>> {
  const goal = getGoal(input);
  const traceId = ctx.traceId || "no-trace";
  console.error(`[Agent][${traceId}] deeja: Generating response for goal: ${goal.slice(0, 50)}...`);
  const context = asRecord(input.context);
  const rawResult = input.result ?? input.output ?? context.result ?? context.output ?? input;
  const hasThai = /[\u0E00-\u0E7F]/.test(goal) || /[\u0E00-\u0E7F]/.test(JSON.stringify(rawResult));
  const summary = summarize(rawResult);
  const fallbackMessage = hasThai
    ? "รับงานแล้วค่ะ นี่คือสรุปสถานะที่ตรวจสอบได้"
    : "Received. Here is the reviewable Zynx response.";
  const filePath = stringify(input.filePath || input.path || input.file);
  let fileContext = "";
  if (filePath) {
    const content = readWorkspaceFile(filePath);
    if (content) {
      fileContext = `WORKSPACE FILE (${filePath}):\n${content.slice(0, 3000)}`;
      console.error(`[Agent][${traceId}] deeja: Read ${filePath} for user-facing response context.`);
    }
  }

  const provider = await generateProviderText({
    instructions: [
      "You are Deeja, the Zynx user-facing persona layer.",
      "Write one calm, actionable response for the user.",
      "If a workspace file is provided, reference its contents to provide a highly relevant answer.",
      "Keep orchestration details separate from user-facing wording.",
      hasThai ? "Respond in Thai." : "Respond in English."
    ].join(" "),
    input: JSON.stringify({
      goal,
      fileContext,
      backendSummary: summary,
      tenantId: ctx.tenantId,
      userId: ctx.userId
    }),
    fallbackText: fallbackMessage,
    maxOutputTokens: 220,
    metadata: {
      agent_id: "deeja",
      tenant_id: ctx.tenantId,
      language: hasThai ? "th" : "en",
      trace_id: traceId,
      has_file_context: String(!!fileContext)
    },
    runtime: { ...ctx.providerConfig, traceId }
  });

  return {
    message: provider.text,
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
    ],
    providerExecution: publicProviderExecution(provider)
  };
}

function validateWorkflow(workflow: unknown | undefined): CheckResult[] {
  const checks: CheckResult[] = [];

  if (!workflow) {
    checks.push({
      name: "workflow.present",
      status: "warn",
      message: "No workflow object supplied; validating invocation context only."
    });
    return checks;
  }

  const parsed = WorkflowSchema.safeParse(workflow);
  if (!parsed.success) {
    return parsed.error.issues.map((issue) => ({
      name: `workflow.schema.${issue.path.join(".") || "root"}`,
      status: "fail",
      message: issue.message
    }));
  }

  const typedWorkflow = parsed.data;
  checks.push({
    name: "workflow.goal",
    status: stringify(typedWorkflow.goal) ? "pass" : "warn",
    message: stringify(typedWorkflow.goal) ? "Workflow goal is present." : "Workflow goal is optional but recommended."
  });

  const agents = normalizeWorkflowAgents(typedWorkflow.agents);
  checks.push({
    name: "workflow.agents",
    status: agents.length > 0 ? "pass" : "fail",
    message: agents.length > 0 ? `Workflow includes ${agents.length} agents.` : "Workflow must include at least one agent."
  });

  for (const [index, agent] of agents.entries()) {
    const meta = findAgent(agent.id);
    checks.push({
      name: `workflow.agents.${index}.route`,
      status: meta ? "pass" : "fail",
      message: meta
        ? `${agent.id} maps to ${meta.backendRoute}.`
        : `Agent at index ${index} is missing a valid registry route.`
    });
  }

  const flowResult = resolveWorkflowFlow(typedWorkflow, agents);
  checks.push({
    name: "workflow.flow",
    status: flowResult.source === "workflow.flow" ? "pass" : "warn",
    message: flowResult.source === "workflow.flow"
      ? `Workflow contains typed flow with ${flowResult.flow.nodes.length} nodes and ${flowResult.flow.edges.length} edges.`
      : "Workflow has no flow object; a sequential flow will be generated from agents."
  });

  const agentIds = new Set(agents.map((agent) => agent.id));
  for (const node of flowResult.flow.nodes) {
    checks.push({
      name: `workflow.flow.nodes.${node.id}`,
      status: agentIds.has(node.id) ? "pass" : "fail",
      message: agentIds.has(node.id) ? `${node.id} is backed by workflow.agents.` : `${node.id} is not listed in workflow.agents.`
    });
  }

  const nodeIds = new Set(flowResult.flow.nodes.map((node) => node.id));
  for (const edge of flowResult.flow.edges) {
    const valid = nodeIds.has(edge.source) && nodeIds.has(edge.target);
    checks.push({
      name: `workflow.flow.edges.${edge.source}->${edge.target}`,
      status: valid ? "pass" : "fail",
      message: valid ? "Edge endpoints resolve to flow nodes." : "Edge endpoint is missing from flow nodes."
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

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ─── Orchestrator Handler ─────────────────────────────────────────────────

async function orchestratorHandler(input: Record<string, unknown>, ctx: AgentInvocationContext): Promise<Record<string, unknown>> {
  const goal = getGoal(input);
  const preferredAgents = asArray(input.preferredAgents ?? input.preferred_agents ?? input.agents)
    .map(v => stringify(v))
    .filter(Boolean);

  const provider = await generateProviderText({
    instructions: [
      "You are the Zynx Orchestrator agent — master coordinator.",
      "Given the goal and optional preferred agents, produce a brief coordination plan:",
      "which agents to activate, in what order, and why.",
      "Keep the response short (2-4 sentences). Do not invent agent IDs not in the registry."
    ].join(" "),
    input: JSON.stringify({ goal, preferredAgents, tenantId: ctx.tenantId }),
    fallbackText: `Orchestrating workflow for goal: ${goal.slice(0, 120)}. Routing to task-planner for decomposition.`,
    maxOutputTokens: 180,
    metadata: { agent_id: "orchestrator", tenant_id: ctx.tenantId },
    runtime: ctx.providerConfig
  });

  return {
    message: provider.text,
    coordinationPlan: {
      goal,
      preferredAgents: preferredAgents.length ? preferredAgents : ["task-planner"],
      nextAgent: preferredAgents[0] ?? "task-planner",
      tenantId: ctx.tenantId
    },
    nextActions: [
      "Route to task-planner to decompose the goal into workflow steps.",
      "Pass coordinationPlan.goal forward as workflow context."
    ],
    providerExecution: publicProviderExecution(provider)
  };
}

// ─── Data Ingest Handler ───────────────────────────────────────────────────

async function dataIngestHandler(input: Record<string, unknown>, ctx: AgentInvocationContext): Promise<Record<string, unknown>> {
  const goal = getGoal(input);
  const rawData = input.data ?? input.payload ?? input.source ?? input;
  const dataSummary = summarize(rawData, 400);

  const provider = await generateProviderText({
    instructions: [
      "You are the Zynx Data Ingestion agent — ETL pipeline.",
      "Summarize the provided input data: identify key fields, data types, and any obvious quality issues.",
      "Keep your response to 3-5 bullet points. Do not fabricate data not in the input."
    ].join(" "),
    input: JSON.stringify({ goal, dataSummary, tenantId: ctx.tenantId }),
    fallbackText: `Data ingestion: received payload for goal '${goal.slice(0, 80)}'. Fields extracted and staged for downstream agents.`,
    maxOutputTokens: 220,
    metadata: { agent_id: "data-ingest", tenant_id: ctx.tenantId },
    runtime: ctx.providerConfig
  });

  return {
    message: provider.text,
    ingestResult: {
      goal,
      recordsIngested: Array.isArray(rawData) ? rawData.length : 1,
      dataShape: typeof rawData === "object" && rawData !== null
        ? Object.keys(rawData as Record<string, unknown>).slice(0, 10)
        : ["scalar"],
      staged: true
    },
    nextActions: [
      "Pass ingestResult to validator for schema checks.",
      "Then route to transformer for normalization."
    ],
    providerExecution: publicProviderExecution(provider)
  };
}

// ─── Report Generator Handler ───────────────────────────────────────────────

async function reportGenHandler(input: Record<string, unknown>, ctx: AgentInvocationContext): Promise<Record<string, unknown>> {
  const goal = getGoal(input);
  const runData = input.runData ?? input.report ?? input.summary ?? input.result ?? input;
  const runSummary = summarize(runData, 600);
  const ts = new Date().toISOString();

  const provider = await generateProviderText({
    instructions: [
      "You are the Zynx Report Generator agent.",
      "Write a concise, structured operator report for the completed workflow run.",
      "Include: a one-line status summary, key outcomes (pass/fail counts if available),",
      "and one recommended next action. Keep it under 150 words."
    ].join(" "),
    input: JSON.stringify({ goal, runSummary, tenantId: ctx.tenantId, ts }),
    fallbackText: `Workflow run report generated at ${ts}. Goal: ${goal.slice(0, 80)}. See run data for details.`,
    maxOutputTokens: 280,
    metadata: { agent_id: "report-gen", tenant_id: ctx.tenantId },
    runtime: ctx.providerConfig
  });

  return {
    message: provider.text,
    report: {
      generatedAt: ts,
      goal,
      tenantId: ctx.tenantId,
      format: "markdown-operator",
      content: provider.text
    },
    nextActions: [
      "Route report to notifier for human review notification.",
      "Archive to reports/workflow-runs/ via logger."
    ],
    providerExecution: publicProviderExecution(provider)
  };
}

// ─── Notifier Handler ─────────────────────────────────────────────────────────

async function notifierHandler(input: Record<string, unknown>, ctx: AgentInvocationContext): Promise<Record<string, unknown>> {
  const goal = getGoal(input);
  const channel = stringify(input.channel) || "default";
  const recipientHint = stringify(input.recipient ?? input.userId ?? ctx.userId) || "operator";
  const context = asRecord(input.context);
  const reportContent = stringify(input.reportContent ?? context.content ?? input.message);

  const provider = await generateProviderText({
    instructions: [
      "You are the Zynx Notifier agent — Slack / email / LINE output.",
      "Write a short, clear notification message (2-3 sentences max) for a human reviewer.",
      "Tone: professional, factual, actionable. Do not include raw JSON or stack traces."
    ].join(" "),
    input: JSON.stringify({ goal, channel, recipient: recipientHint, reportContent: reportContent.slice(0, 300) }),
    fallbackText: `Zynx notification: Workflow '${goal.slice(0, 60)}' completed. Please review the run report. Tenant: ${ctx.tenantId}.`,
    maxOutputTokens: 160,
    metadata: { agent_id: "notifier", tenant_id: ctx.tenantId, channel },
    runtime: ctx.providerConfig
  });

  return {
    message: provider.text,
    notification: {
      channel,
      recipient: recipientHint,
      sentAt: new Date().toISOString(),
      content: provider.text,
      delivered: false  // actual delivery requires channel adapter (Phase 3 runtime service)
    },
    nextActions: [
      "Add channel adapter (Slack/email/LINE) in Phase 3 runtime services to set delivered=true."
    ],
    providerExecution: publicProviderExecution(provider)
  };
}


async function fallbackHandler(agentId: string, input: Record<string, unknown>, ctx: AgentInvocationContext): Promise<Record<string, unknown>> {
  const meta = registryAgent(agentId);
  const skillPath = path.join(repoRoot, "docs", "skills", `${agentId}.md`);
  
  if (fs.existsSync(skillPath)) {
    const skillContent = fs.readFileSync(skillPath, "utf-8");
    const systemPrompt = `You are the ${meta.name} agent. Role: ${meta.role}.\n\nSKILL DEFINITION:\n${skillContent}`;
    
    const userPrompt = `GOAL:\n${stringify(input.goal, "No goal provided.")}\n\nCONTEXT:\n${JSON.stringify(input.context || {}, null, 2)}`;
    
    const result = await generateProviderText({
      instructions: systemPrompt,
      input: userPrompt,
      fallbackText: "Fallback output because LLM provider is disabled.",
      runtime: ctx.providerConfig
    });
    
    return {
      message: result.text,
      handlerType: "skill-driven-llm",
      providerExecution: {
        modelUsed: result.modelUsed,
        tokensUsed: result.tokensUsed
      }
    };
  }

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
      `Add a SKILL.md file or specialized handler for ${meta.id} when this agent needs production behavior.`
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
    case "orchestrator":
      output = await orchestratorHandler(input, ctx);
      break;
    case "data-ingest":
      output = await dataIngestHandler(input, ctx);
      break;
    case "report-gen":
      output = await reportGenHandler(input, ctx);
      break;
    case "notifier":
      output = await notifierHandler(input, ctx);
      break;
    default:
      output = await fallbackHandler(agentId, input, ctx);
      break;
  }

  return {
    output: {
      ...output,
      agentId,
      handledBy: ["task-planner", "deeja", "validator", "reviewer", "orchestrator", "data-ingest", "report-gen", "notifier"].includes(agentId)
        ? "specialized-handler"
        : "fallback-handler"
    },
    tokensUsed: typeof asRecord(output.providerExecution).tokensUsed === "number"
      ? asRecord(output.providerExecution).tokensUsed as number
      : 0,
    modelUsed: stringify(asRecord(output.providerExecution).modelUsed) || "local-deterministic-handler",
    durationMs: Date.now() - startedAt
  };
}
