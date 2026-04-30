import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { AGENT_REGISTRY, findAgent } from "../src/agentRegistry.js";

type WorkflowAgent = {
  step?: number;
  id: string;
  name?: string;
  role?: string;
  category?: string;
  estimatedDuration?: number;
};

type WorkflowFile = {
  workflow?: {
    id?: string;
    name?: string;
    goal?: string;
    agents?: WorkflowAgent[];
  };
};

type FlowNode = {
  id: string;
  type: "agent";
  label: string;
  role: string;
  category: string;
  estimatedDuration: number;
};

type FlowEdge = {
  source: string;
  target: string;
};

const defaultWorkflowPath = "workflows/nightly-governance-validation.json";
const args = process.argv.slice(2);
const execute = args.includes("--execute");
const workflowPath = args.find(arg => !arg.startsWith("--")) ?? defaultWorkflowPath;
const input = args.find((arg, index) => index > args.indexOf(workflowPath) && !arg.startsWith("--")) ?? (execute ? "execute" : "dry-run");
const backendBaseUrl = (process.env.ZYNX_API_BASE_URL ?? "http://localhost:8787").replace(/\/$/, "");

function slug(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "workflow";
}

function asWorkflowAgent(agent: WorkflowAgent, index: number): WorkflowAgent {
  if (!agent.id) {
    throw new Error(`Workflow agent at index ${index} is missing id`);
  }

  return {
    step: agent.step ?? index + 1,
    id: agent.id,
    name: agent.name ?? agent.id,
    role: agent.role ?? "Workflow agent",
    category: agent.category ?? "worker",
    estimatedDuration: agent.estimatedDuration ?? 1
  };
}

function buildFlow(agents: WorkflowAgent[]) {
  const nodes: FlowNode[] = agents.map(agent => ({
    id: agent.id,
    type: "agent",
    label: agent.name ?? agent.id,
    role: agent.role ?? "Workflow agent",
    category: agent.category ?? "worker",
    estimatedDuration: agent.estimatedDuration ?? 1
  }));

  const edges: FlowEdge[] = nodes.slice(1).map((node, index) => ({
    source: nodes[index].id,
    target: node.id
  }));

  return { nodes, edges };
}

function serviceHeaders() {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-zynx-tenant-id": process.env.ZYNX_DEFAULT_TENANT_ID ?? "dev",
    "x-zynx-user-id": process.env.ZYNX_DEFAULT_USER_ID ?? "workflow-executor",
    "x-zynx-roles": process.env.ZYNX_DEFAULT_ROLES ?? "user"
  };

  if (process.env.ZYNX_SERVICE_TOKEN) {
    headers.authorization = `Bearer ${process.env.ZYNX_SERVICE_TOKEN}`;
  }

  return headers;
}

async function invokeBackendAgent(agent: WorkflowAgent, context: Record<string, unknown>) {
  const route = findAgent(agent.id)?.backendRoute;
  if (!route) {
    throw new Error(`No backend route mapped for agentId "${agent.id}"`);
  }

  const res = await fetch(`${backendBaseUrl}${route}`, {
    method: "POST",
    headers: serviceHeaders(),
    body: JSON.stringify({
      input: {
        workflowInput: input,
        context,
        agent: {
          id: agent.id,
          name: agent.name,
          role: agent.role,
          category: agent.category
        }
      },
      streaming: false,
      options: {
        timeoutMs: 30000,
        maxTokens: 2048
      }
    })
  });

  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }

  if (!res.ok) {
    const message = typeof body === "object" && body && "error" in body
      ? String((body as { error?: unknown }).error)
      : `HTTP ${res.status}`;
    throw new Error(message);
  }

  return body;
}

async function main() {
  const absoluteWorkflowPath = path.resolve(process.cwd(), workflowPath);
  const raw = await readFile(absoluteWorkflowPath, "utf8");
  const parsed = JSON.parse(raw) as WorkflowFile;
  const workflow = parsed.workflow;

  if (!workflow) {
    throw new Error("Workflow file must contain a workflow object");
  }

  const agents = (workflow.agents ?? []).map(asWorkflowAgent);
  if (!agents.length) {
    throw new Error("Workflow must contain at least one agent");
  }

  const workflowId = slug(workflow.id ?? workflow.name ?? path.basename(workflowPath, ".json"));
  const flow = buildFlow(agents);
  const now = new Date();
  const dateId = now.toISOString().slice(0, 10);

  let cursor = 0;
  const context: Record<string, unknown> = { input };
  const steps = [];
  let runState = execute ? "Completed" : "CompletedDryRun";

  for (const agent of agents) {
    const duration = agent.estimatedDuration ?? 1;
    const start = cursor;
    cursor += duration;
    const route = findAgent(agent.id);
    const baseStep = {
      step: agent.step,
      agentId: agent.id,
      agentName: agent.name,
      role: agent.role,
      category: agent.category,
      mcpTool: route?.mcpTool ?? null,
      backendRoute: route?.backendRoute ?? null,
      plannedStart: start,
      plannedEnd: cursor
    };

    if (!execute) {
      steps.push({
        ...baseStep,
        state: route ? "Mapped" : "Unmapped",
        executed: false,
        output: route
          ? `Dry-run mapped ${agent.name} to ${route.mcpTool} -> ${route.backendRoute}`
          : `No route mapped for ${agent.id}`
      });
      continue;
    }

    try {
      const output = await invokeBackendAgent(agent, context);
      context[agent.id] = output;
      steps.push({
        ...baseStep,
        state: "Completed",
        executed: true,
        output
      });
    } catch (error) {
      runState = "Failed";
      steps.push({
        ...baseStep,
        state: "Failed",
        executed: true,
        error: error instanceof Error ? error.message : String(error)
      });
      break;
    }
  }

  const runRecord = {
    workflowRunId: `${workflowId}-${now.toISOString()}`,
    workflowId,
    workflowName: workflow.name ?? workflowId,
    goal: workflow.goal ?? "Run workflow",
    input,
    runMode: execute ? "execute" : "dry-run",
    runState,
    executedBy: "scripts/run-workflow.ts",
    createdAt: now.toISOString(),
    durationUnits: cursor,
    contextPassing: "sequential",
    routeMap: AGENT_REGISTRY.map(agent => ({
      agentId: agent.id,
      mcpTool: agent.mcpTool,
      backendRoute: agent.backendRoute,
      status: agent.status
    })),
    flow,
    steps,
    nextActions: [
      execute
        ? "Review completed step outputs and replace backend stubs with real agent implementations where needed."
        : "Review this dry-run route map before running with --execute.",
      "Map specialized agent behavior behind each backend route.",
      "Promote approved workflows into scheduled governance or production runbooks."
    ]
  };

  const outputDir = path.resolve(process.cwd(), "reports/workflow-runs");
  await mkdir(outputDir, { recursive: true });
  const modeSuffix = execute ? "execute" : "dry-run";
  const outputPath = path.join(outputDir, `${dateId}-${workflowId}-${modeSuffix}-run.json`);
  await writeFile(outputPath, `${JSON.stringify(runRecord, null, 2)}\n`, "utf8");

  console.log(`Workflow run mode: ${runRecord.runMode}`);
  console.log(`Workflow run state: ${runRecord.runState}`);
  console.log(`Workflow: ${runRecord.workflowName}`);
  console.log(`Steps: ${steps.length}`);
  console.log(`Report: ${outputPath}`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
