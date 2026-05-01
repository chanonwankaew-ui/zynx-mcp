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
