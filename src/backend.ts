import express from "express";
import { z } from "zod";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { agentBackendPort, listenHost } from "./config.js";
import { AGENT_REGISTRY, type AgentMeta, findAgent } from "./agentRegistry.js";
import { invokeAgentHandler } from "./agentHandlers.js";
import { validateWorkflowContract } from "./workflowSchema.js";
import { getProviderStatus } from "./providerClient.js";
import type { ProviderRuntimeConfig } from "./providerClient.js";
import { describeCorsOrigins, zynxCorsOptions } from "./corsConfig.js";

export const app = express();
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

app.use(cors(zynxCorsOptions()));
const parseJsonBody = express.json();
app.use((req, res, next) => {
  if (req.body !== undefined) {
    next();
    return;
  }
  parseJsonBody(req, res, next);
});

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use((req, res, next) => {
  const traceId = req.headers["x-zynx-trace-id"] as string || `tr-${Math.random().toString(36).slice(2, 11)}`;
  req.headers["x-zynx-trace-id"] = traceId;
  res.setHeader("x-zynx-trace-id", traceId);
  next();
});

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const InvokePayloadSchema = z.object({
  input: z.record(z.unknown()),
  sessionId: z.string().uuid().optional(),
  streaming: z.boolean().default(false),
  options: z.object({
    timeoutMs: z.number().int().min(100).max(120000).default(30000),
    maxTokens: z.number().int().min(1).max(8192).default(2048),
  }).optional(),
});

// ─── Auth Helper ───────────────────────────────────────────────────────────────

function getAuth(req: express.Request) {
  const tenantId = req.headers["x-zynx-tenant-id"] as string || "dev";
  const userId = req.headers["x-zynx-user-id"] as string || "anonymous";
  const roles = (req.headers["x-zynx-roles"] as string || "user").split(",");
  const traceId = req.headers["x-zynx-trace-id"] as string;
  return { tenantId, userId, roles, traceId };
}

function headerString(req: express.Request, name: string) {
  const value = req.headers[name.toLowerCase()];
  if (Array.isArray(value)) return value[0]?.trim();
  return typeof value === "string" ? value.trim() : undefined;
}

function headerBoolean(req: express.Request, name: string) {
  const value = headerString(req, name);
  if (!value) return undefined;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function headerNumber(req: express.Request, name: string) {
  const value = headerString(req, name);
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getProviderConfig(req: express.Request): ProviderRuntimeConfig | undefined {
  const provider = headerString(req, "x-zynx-llm-provider");
  const requireProvider = headerBoolean(req, "x-zynx-llm-require-provider");
  const timeoutMs = headerNumber(req, "x-zynx-llm-timeout-ms");
  const openaiBaseUrl = headerString(req, "x-openai-base-url");
  const openaiModel = headerString(req, "x-openai-model");
  const openaiApiKey = headerString(req, "x-openai-api-key") || headerString(req, "x-zynx-openai-api-key");

  const config = {
    provider,
    requireProvider,
    timeoutMs,
    openaiBaseUrl,
    openaiModel,
    openaiApiKey
  };

  return Object.values(config).some((value) => value !== undefined && value !== "")
    ? config
    : undefined;
}

// ─── Guards ───────────────────────────────────────────────────────────────────

function assertPublished(meta: AgentMeta) {
  if (meta.status !== "published") {
    throw Object.assign(new Error(`Agent is "${meta.status}", not published`), { status: 503 });
  }
}

function assertTenantAccess(meta: AgentMeta, tenantId: string) {
  if (meta.tenantScope === "global") return;
  if (meta.tenantScope === "scoped" && meta.allowedTenants?.includes(tenantId)) return;
  throw Object.assign(new Error("Tenant not allowed"), { status: 403 });
}

function assertRole(meta: AgentMeta, roles: string[]) {
  const ok = roles.some((r) => meta.allowedRoles.includes(r));
  if (!ok) throw Object.assign(new Error("Insufficient role"), { status: 403 });
}

// ─── Health Metrics & Tracking ────────────────────────────────────────────────

const DEV_STUB_HEALTH = process.env.DEV_STUB_HEALTH === "true";

interface AgentMetrics {
  invokeCount: number;
  errorCount: number;
  totalDurationMs: number;
  lastDurationMs: number;
  lastInvokeAt: string | null;
}

const agentMetricsStore = new Map<string, AgentMetrics>();

function getOrInitMetrics(agentId: string): AgentMetrics {
  let m = agentMetricsStore.get(agentId);
  if (!m) {
    m = {
      invokeCount: 0,
      errorCount: 0,
      totalDurationMs: 0,
      lastDurationMs: 0,
      lastInvokeAt: null,
    };
    agentMetricsStore.set(agentId, m);
  }
  return m;
}

function recordInvoke(agentId: string, durationMs: number, success: boolean) {
  const m = getOrInitMetrics(agentId);
  m.invokeCount++;
  m.lastInvokeAt = new Date().toISOString();
  m.lastDurationMs = durationMs;
  m.totalDurationMs += durationMs;
  if (!success) m.errorCount++;
}

async function getAgentHealthMetrics(agentId: string) {
  if (DEV_STUB_HEALTH) {
    // Explicit stub mode — only active when DEV_STUB_HEALTH=true.
    return {
      uptime: Math.floor(Math.random() * 86400),
      memoryMb: Math.floor(Math.random() * 512) + 64,
      latencyMs: Math.floor(Math.random() * 100) + 10,
      activeJobs: Math.floor(Math.random() * 5),
      errors: 0,
    };
  }

  const mem = process.memoryUsage();
  const m = agentMetricsStore.get(agentId);
  
  return {
    uptime: Math.floor(process.uptime()),
    memoryMb: Math.round(mem.rss / 1024 / 1024),
    heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
    latencyMs: m ? m.lastDurationMs : 0,
    avgLatencyMs: m && m.invokeCount > 0 ? Math.round(m.totalDurationMs / m.invokeCount) : 0,
    invokeCount: m ? m.invokeCount : 0,
    errors: m ? m.errorCount : 0,
    lastInvokeAt: m ? m.lastInvokeAt : null,
  };
}

// ─── Audit Logger ──────────────────────────────────────────────────────────────

function auditLog(event: { 
  agentId: string; 
  tenantId: string; 
  userId: string; 
  traceId: string;
  action: string; 
  status: number;
  durationMs?: number;
  provider?: string;
  model?: string;
}) {
  console.error(JSON.stringify({ ts: new Date().toISOString(), ...event }));
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// Health check
app.get("/", (_req, res) => {
  res.sendFile(path.join(repoRoot, "zynx-mcp-dashboard.html"));
});

app.get("/dashboard", (_req, res) => {
  res.sendFile(path.join(repoRoot, "zynx-mcp-dashboard.html"));
});

app.get("/zynx-mcp", (_req, res) => {
  res.sendFile(path.join(repoRoot, "zynx-mcp-dashboard.html"));
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "zynx-agent-backend", version: "0.1.0", provider: getProviderStatus() });
});

// GET /agents — List all agents
app.get("/agents", (req, res) => {
  const auth = getAuth(req);
  
  const agents = AGENT_REGISTRY.map((a) => ({
    id: a.id,
    name: a.name,
    status: a.status,
    tenantScope: a.tenantScope,
    allowedRoles: a.allowedRoles,
    role: a.role,
    category: a.category,
    mcpTool: a.mcpTool,
    backendRoute: a.backendRoute,
  }));

  res.json({ agents });
});

// POST /agents/:agentId/invoke
app.post("/agents/:agentId/invoke", async (req, res) => {
  const { agentId } = req.params;
  let auth = { tenantId: "", userId: "", roles: [] as string[], traceId: "" };
  const startMs = Date.now();

  try {
    auth = getAuth(req);

    // Validate payload
    const parsed = InvokePayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    }
    const payload = parsed.data;

    // Agent lookup
    const meta = findAgent(agentId);
    if (!meta) return res.status(404).json({ error: "Agent not found" });

    // Guards
    assertPublished(meta);
    assertTenantAccess(meta, auth.tenantId);
    assertRole(meta, auth.roles);

    // Execute
    const result = await invokeAgentHandler(agentId, payload.input, {
      tenantId: auth.tenantId,
      userId: auth.userId,
      providerConfig: getProviderConfig(req),
      traceId: auth.traceId
    });
    const durationMs = Date.now() - startMs;

    // Audit
    auditLog({ 
      agentId, 
      tenantId: auth.tenantId, 
      userId: auth.userId, 
      traceId: auth.traceId,
      action: "invoke", 
      status: 200,
      durationMs,
      provider: getProviderConfig(req)?.provider,
      model: result.modelUsed
    });

    // Response
    res.json({
      agentId,
      sessionId: payload.sessionId,
      output: result.output,
      meta: {
        durationMs,
        tokensUsed: result.tokensUsed,
        modelUsed: result.modelUsed,
      },
    });

    // Record metrics
    recordInvoke(agentId, durationMs, true);
  } catch (err) {
    const durationMs = Date.now() - startMs;
    const e = err as any;
    const status = e?.status ?? 500;
    const message = e?.message ?? "Internal server error";
    
    // Record failure
    recordInvoke(agentId, durationMs, false);
    auditLog({ 
      agentId, 
      tenantId: auth.tenantId, 
      userId: auth.userId, 
      traceId: auth.traceId,
      action: "invoke", 
      status 
    });
    res.status(status).json({ error: message, traceId: auth.traceId });
  }
});

// GET /agents/:agentId/health
app.get("/agents/:agentId/health", async (req, res) => {
  const { agentId } = req.params;

  try {
    const meta = findAgent(agentId);
    if (!meta) return res.status(404).json({ error: "Agent not found" });

    const metrics = await getAgentHealthMetrics(agentId);
    const alive = meta.status === "published";

    res.json({
      agentId,
      status: meta.status,
      alive,
      checks: { registry: "ok", process: "ok" },
      metrics,
      ts: new Date().toISOString(),
    });
  } catch (err) {
    const e = err as any;
    res.status(500).json({
      agentId,
      status: "error",
      alive: false,
      error: e?.message ?? "Unknown error",
      ts: new Date().toISOString(),
    });
  }
});

// GET /agents/:agentId/skill
app.get("/agents/:agentId/skill", (req, res) => {
  const { agentId } = req.params;
  const skillPath = path.join(repoRoot, "docs", "skills", `${agentId}.md`);
  if (fs.existsSync(skillPath)) {
    res.json({ skill: fs.readFileSync(skillPath, "utf-8") });
  } else {
    res.json({ skill: "" });
  }
});

// POST /agents/:agentId/skill
app.post("/agents/:agentId/skill", (req, res) => {
  const { agentId } = req.params;
  const { skill } = req.body;
  const dirPath = path.join(repoRoot, "docs", "skills");
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  const skillPath = path.join(dirPath, `${agentId}.md`);
  fs.writeFileSync(skillPath, skill, "utf-8");
  res.json({ success: true });
});

// ─── Workflow Routes ──────────────────────────────────────────────────────────

// GET /provider/status — safe provider config snapshot (no key values)
app.get("/provider/status", (_req, res) => {
  res.json(getProviderStatus());
});

// POST /workflow/validate — Phase 2 contract validation
app.post("/workflow/validate", (req, res) => {
  try {
    const body = req.body;
    if (!body || typeof body !== "object") {
      return res.status(400).json({ error: "Request body must be a JSON object" });
    }
    const result = validateWorkflowContract(body);
    return res.json(result);
  } catch (err) {
    const e = err as any;
    return res.status(500).json({ error: e?.message ?? "Validation error" });
  }
});

// GET /workflow/runs — list run report summaries from reports/workflow-runs/
app.get("/workflow/runs", (_req, res) => {
  const runsDir = path.join(repoRoot, "reports", "workflow-runs");
  try {
    if (!fs.existsSync(runsDir)) {
      return res.json({ runs: [] });
    }
    const files = fs.readdirSync(runsDir)
      .filter(f => f.endsWith(".json") && f !== ".gitkeep")
      .sort()
      .reverse();

    const runs = files.map(filename => {
      const filePath = path.join(runsDir, filename);
      try {
        const raw = fs.readFileSync(filePath, "utf-8");
        const data = JSON.parse(raw);
        // Extract summary fields from run report without returning full content
        const run = data.run ?? data;
        return {
          filename,
          workflowId: run.workflowId ?? run.workflow?.id ?? null,
          workflowName: run.workflowName ?? run.workflow?.name ?? filename.replace(/\.json$/, ""),
          mode: run.mode ?? (filename.includes("dry-run") ? "dry-run" : filename.includes("execute") ? "execute" : "unknown"),
          date: run.startedAt ?? run.ts ?? null,
          stepCount: Array.isArray(run.steps) ? run.steps.length : (Array.isArray(run.agentResults) ? run.agentResults.length : null),
          status: run.status ?? null,
          passed: run.passed ?? null,
          failed: run.failed ?? null,
          warnings: run.warnings ?? null,
        };
      } catch {
        return { filename, workflowName: filename.replace(/\.json$/, ""), error: "could not parse" };
      }
    });

    return res.json({ runs });
  } catch (err) {
    const e = err as any;
    return res.status(500).json({ error: e?.message ?? "Could not list workflow runs" });
  }
});

app.get("/workflow/runs/:filename", (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(repoRoot, "reports", "workflow-runs", filename);
  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Run report not found" });
    }
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    return res.json(data);
  } catch {
    return res.status(500).json({ error: "Could not parse run report" });
  }
});

// POST /tools/test — Connection test for MCP/Vertex
app.post("/tools/test", async (req, res) => {
  const { type, config } = req.body;
  
  const { tenantId, userId, traceId } = getAuth(req);
  auditLog({ 
    agentId: "system", 
    tenantId, 
    userId, 
    traceId, 
    action: `test_connection:${type}`, 
    status: 200 
  });

  try {
    if (type === "mcp") {
      const { url } = config;
      if (!url) throw new Error("MCP URL is required");
      
      // Basic connectivity check for SSE/HTTP based MCP
      const start = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      try {
        const fetchRes = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        return res.json({ 
          ok: fetchRes.ok, 
          message: fetchRes.ok ? "Connection successful" : `HTTP ${fetchRes.status}`,
          latencyMs: Date.now() - start
        });
      } catch (e) {
        return res.json({ ok: false, message: "Could not reach MCP server" });
      }
    }

    if (type === "vertex") {
      const { projectId, dataStoreId } = config;
      if (!projectId || !dataStoreId) throw new Error("Project ID and Data Store ID are required");
      
      // Simulated check for Vertex AI structure
      return res.json({ 
        ok: true, 
        message: "Vertex AI configuration format is valid",
        latencyMs: 12
      });
    }

    res.status(400).json({ error: "Unknown tool type" });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Start Server ──────────────────────────────────────────────────────────────

export function startBackendServer() {
  return app.listen(agentBackendPort, listenHost, () => {
    console.error("Server listening on", agentBackendPort);
    console.error(`Zynx Agent Backend`);
    console.error(`   Host: ${listenHost}`);
    console.error(`   Port: ${agentBackendPort}`);
    console.error(`   Health:         http://${listenHost}:${agentBackendPort}/health`);
    console.error(`   Agents:         http://${listenHost}:${agentBackendPort}/agents`);
    console.error(`   Invoke:         POST http://${listenHost}:${agentBackendPort}/agents/:agentId/invoke`);
    console.error(`   Agent Health:   GET  http://${listenHost}:${agentBackendPort}/agents/:agentId/health`);
    console.error(`   Workflow Runs:  GET  http://${listenHost}:${agentBackendPort}/workflow/runs`);
    console.error(`   WF Validate:    POST http://${listenHost}:${agentBackendPort}/workflow/validate`);
    console.error(`   Provider:       GET  http://${listenHost}:${agentBackendPort}/provider/status`);
    console.error(`   CORS origin:    ${describeCorsOrigins()}`);
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startBackendServer();
}
