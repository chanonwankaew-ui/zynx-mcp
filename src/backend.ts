import express from "express";
import { z } from "zod";
import cors from "cors";
import { agentBackendPort } from "./config.js";
import { AGENT_REGISTRY, type AgentMeta, findAgent } from "./agentRegistry.js";
import { invokeAgentHandler } from "./agentHandlers.js";

const app = express();
app.use(cors());
app.use(express.json());

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
  return { tenantId, userId, roles };
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

// ─── Health Metrics Stub ──────────────────────────────────────────────────────

async function getAgentHealthMetrics(agentId: string) {
  return {
    uptime: Math.floor(Math.random() * 86400),
    memoryMb: Math.floor(Math.random() * 512) + 64,
    latencyMs: Math.floor(Math.random() * 100) + 10,
    activeJobs: Math.floor(Math.random() * 5),
    errors: 0,
  };
}

// ─── Audit Logger ──────────────────────────────────────────────────────────────

function auditLog(event: { agentId: string; tenantId: string; userId: string; action: string; status: number }) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), ...event }));
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// Health check
app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "zynx-agent-backend", version: "0.1.0" });
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
  let auth = { tenantId: "", userId: "", roles: [] as string[] };
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
    const result = await invokeAgentHandler(agentId, payload.input, auth);
    const durationMs = Date.now() - startMs;

    // Audit
    auditLog({ agentId, tenantId: auth.tenantId, userId: auth.userId, action: "invoke", status: 200 });

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
  } catch (err) {
    const e = err as any;
    const status = e?.status ?? 500;
    const message = e?.message ?? "Internal server error";
    auditLog({ agentId, tenantId: auth.tenantId, userId: auth.userId, action: "invoke", status });
    res.status(status).json({ error: message });
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

// ─── Start Server ──────────────────────────────────────────────────────────────

app.listen(agentBackendPort, () => {
  console.log(`🤖 Zynx Agent Backend`);
  console.log(`   Port: ${agentBackendPort}`);
  console.log(`   Health: http://localhost:${agentBackendPort}/health`);
  console.log(`   Agents: http://localhost:${agentBackendPort}/agents`);
  console.log(`   Invoke: POST http://localhost:${agentBackendPort}/agents/:agentId/invoke`);
  console.log(`   Health: GET http://localhost:${agentBackendPort}/agents/:agentId/health`);
});
