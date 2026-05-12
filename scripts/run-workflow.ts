import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { AGENT_REGISTRY, findAgent } from "../src/agentRegistry.js";
import {
  normalizeWorkflowAgents,
  parseWorkflowFile,
  resolveWorkflowFlow,
  slugWorkflowName,
  type WorkflowAgent
} from "../src/workflowSchema.js";

const defaultWorkflowPath = "workflows/nightly-governance-validation.json";
const args = process.argv.slice(2);
const execute = args.includes("--execute");

// --workflow <id> resolves workflows/<id>.json; positional path still works as fallback
const workflowFlagIdx = args.findIndex(a => a === "--workflow" || a === "-w");
const workflowId = workflowFlagIdx !== -1 ? args[workflowFlagIdx + 1] : undefined;
// Exclude flags and the value consumed by --workflow flag; keep first remaining non-flag arg
const positionalPath = args.find((arg, idx) => {
  if (arg.startsWith("--") || arg.startsWith("-")) return false;
  if (workflowFlagIdx !== -1 && idx === workflowFlagIdx + 1) return false; // value after --workflow
  return true;
});
const workflowPath = workflowId
  ? `workflows/${workflowId}.json`
  : positionalPath ?? defaultWorkflowPath;

const input = (execute ? "execute" : "dry-run");
const backendBaseUrl = (process.env.ZYNX_API_BASE_URL ?? "http://localhost:8787").replace(/\/$/, "");

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
  const parsed = parseWorkflowFile(JSON.parse(raw));
  const workflow = parsed.workflow;
  const agents = normalizeWorkflowAgents(workflow.agents);

  const workflowId = slugWorkflowName(workflow.id ?? workflow.name ?? path.basename(workflowPath, ".json"));
  const flowResult = resolveWorkflowFlow(workflow, agents);
  const flow = flowResult.flow;
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
    flowSource: flowResult.source,
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
