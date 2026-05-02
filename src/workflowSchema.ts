import { z } from "zod";

export const WorkflowAgentSchema = z.object({
  step: z.number().int().positive().optional(),
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  estimatedDuration: z.number().positive().optional()
}).passthrough();

export const FlowNodeSchema = z.object({
  id: z.string().min(1),
  type: z.literal("agent"),
  label: z.string().min(1),
  role: z.string().min(1),
  category: z.string().min(1),
  estimatedDuration: z.number().positive()
}).passthrough();

export const FlowEdgeSchema = z.object({
  source: z.string().min(1),
  target: z.string().min(1)
}).passthrough();

export const WorkflowFlowSchema = z.object({
  nodes: z.array(FlowNodeSchema),
  edges: z.array(FlowEdgeSchema)
}).passthrough();

export const WorkflowSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  color: z.string().min(1).optional(),
  goal: z.string().min(1).optional(),
  created: z.string().min(1).optional(),
  schedule: z.record(z.unknown()).optional(),
  artifacts: z.record(z.unknown()).optional(),
  agents: z.array(WorkflowAgentSchema).min(1),
  flow: WorkflowFlowSchema.optional()
}).passthrough();

export const WorkflowFileSchema = z.object({
  workflow: WorkflowSchema
}).passthrough();

export type WorkflowAgent = z.infer<typeof WorkflowAgentSchema>;
export type FlowNode = z.infer<typeof FlowNodeSchema>;
export type FlowEdge = z.infer<typeof FlowEdgeSchema>;
export type WorkflowFlow = z.infer<typeof WorkflowFlowSchema>;
export type Workflow = z.infer<typeof WorkflowSchema>;
export type WorkflowFile = z.infer<typeof WorkflowFileSchema>;
export type WorkflowFlowSource = "workflow.flow" | "generated-from-agents";
export type CreateWorkflowFileInput = {
  id?: string;
  name?: string;
  color?: string;
  goal?: string;
  created?: string;
  schedule?: Record<string, unknown>;
  artifacts?: Record<string, unknown>;
  agents: WorkflowAgent[];
  flow?: WorkflowFlow;
  [key: string]: unknown;
};

// ─── Phase 2: Durable Workflow Contracts ─────────────────────────────────────

/**
 * Failure classification — one of 5 typed failure modes from the execution plan.
 * Used in run reports and validation results to classify why a workflow step failed.
 */
export const FailureClassificationSchema = z.enum([
  "BlockedByAuth",
  "BlockedByProvider",
  "BlockedByRoute",
  "FailedValidation",
  "FailedExecution",
]);
export type FailureClassification = z.infer<typeof FailureClassificationSchema>;

/**
 * A single decision log entry — records the rationale behind a workflow decision
 * at a specific step.
 */
export const DecisionLogEntrySchema = z.object({
  step: z.number().int().positive(),
  agentId: z.string().min(1),
  decision: z.string().min(1),
  rationale: z.string().optional(),
  ts: z.string().optional(),
  outcome: z.enum(["pass", "warn", "fail", "skip"]).optional(),
});
export type DecisionLogEntry = z.infer<typeof DecisionLogEntrySchema>;

/**
 * Phase 2 workflow contract fields — added to run reports and workflow artifacts
 * to make the execution contract stable across Planner, CodeD, Verifier, and Monitor.
 */
export const WorkflowContractSchema = z.object({
  /** Which agent or runner executed this workflow */
  executedBy: z.string().optional(),
  /** Context carried forward between steps */
  contextPassing: z.record(z.unknown()).optional(),
  /** Decision log entries (one per significant step/gate) */
  decisionLog: z.array(DecisionLogEntrySchema).optional(),
  /** Top-level failure classification if the workflow did not complete */
  failureClassification: FailureClassificationSchema.optional(),
});
export type WorkflowContract = z.infer<typeof WorkflowContractSchema>;

// ─── Validation ───────────────────────────────────────────────────────────────

export type WorkflowValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  phase2: {
    executedBy: boolean;
    contextPassing: boolean;
    decisionLog: boolean;
    failureClassification: boolean;
    compliant: boolean;
  };
};

/**
 * Validate an unknown value as a workflow file and check Phase 2 contract compliance.
 * Returns a structured result with errors, warnings, and a per-field Phase 2 checklist.
 */
export function validateWorkflowContract(input: unknown): WorkflowValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ── Core schema validation ──
  const parsed = WorkflowFileSchema.safeParse(input);
  if (!parsed.success) {
    const issues = parsed.error.issues;
    for (const issue of issues) {
      errors.push(`[${issue.path.join(".") || "root"}] ${issue.message}`);
    }
  }

  const wf = (input as Record<string, unknown>)?.workflow as Record<string, unknown> | undefined;

  // ── Core field warnings ──
  if (wf) {
    if (!wf.id)        warnings.push("workflow.id is missing — recommended for run report traceability");
    if (!wf.name)      warnings.push("workflow.name is missing — recommended for human-readable reports");
    if (!wf.goal)      warnings.push("workflow.goal is missing — recommended for audit trail");
    if (!wf.created)   warnings.push("workflow.created is missing — add ISO timestamp for chronological ordering");
    if (!wf.flow)      warnings.push("workflow.flow is missing — executor will generate sequential flow from agents");
    if (!wf.schedule)  warnings.push("workflow.schedule is missing — workflow cannot be triggered automatically");
    if (!wf.artifacts) warnings.push("workflow.artifacts is missing — no artifact paths defined");
  } else {
    errors.push("workflow root key is missing");
  }

  // ── Agent step validation ──
  if (wf && Array.isArray(wf.agents)) {
    const agents = wf.agents as WorkflowAgent[];
    const ids = agents.map(a => a.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (dupes.length) errors.push(`Duplicate agent IDs in workflow.agents: ${dupes.join(", ")}`);

    agents.forEach((a, i) => {
      if (!a.id) errors.push(`workflow.agents[${i}].id is required`);
    });
  }

  // ── Phase 2 contract checklist ──
  const hasExecutedBy = typeof wf?.executedBy === "string" && wf.executedBy.length > 0;
  const hasContextPassing = wf?.contextPassing !== undefined && typeof wf.contextPassing === "object";
  const hasDecisionLog = Array.isArray(wf?.decisionLog) && (wf.decisionLog as unknown[]).length > 0;
  const hasFailureClassification = typeof wf?.failureClassification === "string" &&
    FailureClassificationSchema.safeParse(wf.failureClassification).success;

  const phase2Compliant = hasExecutedBy && hasContextPassing && hasDecisionLog;

  if (!hasExecutedBy)     warnings.push("[Phase 2] workflow.executedBy is not set — add the agent/runner ID that owns execution");
  if (!hasContextPassing) warnings.push("[Phase 2] workflow.contextPassing is not set — add context envelope for inter-step data");
  if (!hasDecisionLog)    warnings.push("[Phase 2] workflow.decisionLog is empty — no decisions have been recorded");
  if (!hasFailureClassification && wf?.failureClassification !== undefined) {
    errors.push(`[Phase 2] workflow.failureClassification "${wf.failureClassification}" is not a valid classification`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    phase2: {
      executedBy: hasExecutedBy,
      contextPassing: hasContextPassing,
      decisionLog: hasDecisionLog,
      failureClassification: hasFailureClassification,
      compliant: phase2Compliant,
    },
  };
}

// ─── Existing helpers (unchanged) ─────────────────────────────────────────────

export function slugWorkflowName(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "workflow";
}

export function normalizeWorkflowAgent(agent: WorkflowAgent, index: number): Required<Pick<WorkflowAgent, "step" | "id" | "name" | "role" | "category" | "estimatedDuration">> {
  return {
    step: agent.step ?? index + 1,
    id: agent.id,
    name: agent.name ?? agent.id,
    role: agent.role ?? "Workflow agent",
    category: agent.category ?? "worker",
    estimatedDuration: agent.estimatedDuration ?? 1
  };
}

export function normalizeWorkflowAgents(agents: WorkflowAgent[]) {
  return agents.map(normalizeWorkflowAgent);
}

export function buildSequentialFlow(agents: WorkflowAgent[]): WorkflowFlow {
  const normalizedAgents = normalizeWorkflowAgents(agents);
  const nodes: FlowNode[] = normalizedAgents.map(agent => ({
    id: agent.id,
    type: "agent",
    label: agent.name,
    role: agent.role,
    category: agent.category,
    estimatedDuration: agent.estimatedDuration
  }));

  const edges: FlowEdge[] = nodes.slice(1).map((node, index) => ({
    source: nodes[index].id,
    target: node.id
  }));

  return { nodes, edges };
}

export function resolveWorkflowFlow(workflow: Workflow, agents: WorkflowAgent[] = workflow.agents): { flow: WorkflowFlow; source: WorkflowFlowSource } {
  if (workflow.flow?.nodes.length && Array.isArray(workflow.flow.edges)) {
    return { flow: workflow.flow, source: "workflow.flow" };
  }

  return { flow: buildSequentialFlow(agents), source: "generated-from-agents" };
}

export function createWorkflowFile(input: CreateWorkflowFileInput): WorkflowFile {
  const flow = input.flow ?? buildSequentialFlow(input.agents);
  return {
    workflow: {
      ...input,
      flow
    }
  };
}

export function parseWorkflowFile(value: unknown): WorkflowFile {
  return WorkflowFileSchema.parse(value);
}
