import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentStatus = "published" | "deployed" | "deprecated";

interface AgentMeta {
  id: string;
  name: string;
  status: AgentStatus;
  tenantScope: "global" | "scoped" | "private";
  allowedTenants?: string[];         // used when tenantScope === "scoped"
  allowedRoles: string[];
}

interface OrchestratorResult {
  output: unknown;
  tokensUsed?: number;
  modelUsed?: string;
  durationMs?: number;
}

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const InvokePayloadSchema = z.object({
  input: z.record(z.unknown()),
  sessionId: z.string().uuid().optional(),
  streaming: z.boolean().default(false),
  options: z
    .object({
      timeoutMs: z.number().int().min(100).max(120_000).default(30_000),
      maxTokens: z.number().int().min(1).max(8192).default(2048),
    })
    .default({}),
});

type InvokePayload = z.infer<typeof InvokePayloadSchema>;

// ─── Stub: replace with your real registry + orchestrator ─────────────────────

async function getAgentMeta(agentId: string): Promise<AgentMeta | null> {
  // TODO: query AgentRegistry (DB / in-memory store)
  return null;
}

async function callOrchestrator(
  agentId: string,
  payload: InvokePayload,
  ctx: { tenantId: string; userId: string }
): Promise<OrchestratorResult> {
  // TODO: forward to Zynx Orchestrator handler
  throw new Error("Not implemented");
}

async function getAgentHealthMetrics(agentId: string) {
  // TODO: query your metrics store / sidecar
  return {
    uptime: process.uptime(),
    memoryMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
  };
}

// ─── Auth helpers (expects upstream JWT middleware to populate req.user) ──────

interface AuthContext {
  tenantId: string;
  userId: string;
  roles: string[];
}

function getAuth(req: Request): AuthContext {
  // Support both JWT middleware (req.user) and header-based auth
  const user = (req as any).user;
  if (user?.tenantId && user?.userId) {
    return user as AuthContext;
  }
  
  // Header-based auth (for MCP wrapper)
  const tenantId = req.headers["x-zynx-tenant-id"] as string || "dev";
  const userId = req.headers["x-zynx-user-id"] as string || "anonymous";
  const rolesHeader = req.headers["x-zynx-roles"] as string | undefined;
  const roles = rolesHeader ? rolesHeader.split(",") : ["user"];
  
  return { tenantId, userId, roles };
}

// ─── Guards ───────────────────────────────────────────────────────────────────

function assertPublished(meta: AgentMeta) {
  if (meta.status !== "published") {
    throw Object.assign(
      new Error(`Agent is "${meta.status}", not published`),
      { status: 503 }
    );
  }
}

function assertTenantAccess(meta: AgentMeta, tenantId: string) {
  if (meta.tenantScope === "global") return;
  if (
    meta.tenantScope === "scoped" &&
    meta.allowedTenants?.includes(tenantId)
  ) return;
  throw Object.assign(new Error("Tenant not allowed"), { status: 403 });
}

function assertRole(meta: AgentMeta, roles: string[]) {
  const ok = roles.some((r) => meta.allowedRoles.includes(r));
  if (!ok) {
    throw Object.assign(new Error("Insufficient role"), { status: 403 });
  }
}

// ─── Audit logger (replace with your Logger agent / Winston / Datadog) ────────

function auditLog(event: {
  agentId: string;
  tenantId: string;
  userId: string;
  action: string;
  status: number;
  meta?: Record<string, unknown>;
}) {
  // TODO: emit to Logger agent
  console.log(JSON.stringify({ ts: new Date().toISOString(), ...event }));
}

// ─── Error handler helper ─────────────────────────────────────────────────────

function httpError(
  res: Response,
  err: unknown,
  agentId: string,
  auth?: AuthContext
) {
  const e = err as any;
  const status: number = e?.status ?? 500;
  const message: string = e?.message ?? "Internal server error";
  if (auth) {
    auditLog({
      agentId,
      tenantId: auth.tenantId,
      userId: auth.userId,
      action: "invoke",
      status,
      meta: { error: message },
    });
  }
  res.status(status).json({ error: message });
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const agentRouter = Router({ mergeParams: true });

// ── POST /agents/:agentId/invoke ──────────────────────────────────────────────
agentRouter.post(
  "/:agentId/invoke",
  async (req: Request, res: Response) => {
    const { agentId } = req.params;
    let auth: AuthContext | undefined;
    const startMs = Date.now();

    try {
      // 1. Auth
      auth = getAuth(req);

      // 2. Validate payload
      const parsed = InvokePayloadSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid payload",
          details: parsed.error.flatten(),
        });
      }
      const payload = parsed.data;

      // 3. Agent registry lookup
      const meta = await getAgentMeta(agentId);
      if (!meta) return res.status(404).json({ error: "Agent not found" });

      // 4. Guards — must all pass before orchestrator is called
      assertPublished(meta);
      assertTenantAccess(meta, auth.tenantId);
      assertRole(meta, auth.roles);

      // 5. Forward to orchestrator
      const result = await callOrchestrator(agentId, payload, auth);

      const durationMs = Date.now() - startMs;

      // 6. Audit
      auditLog({
        agentId,
        tenantId: auth.tenantId,
        userId: auth.userId,
        action: "invoke",
        status: 200,
        meta: { durationMs, model: result.modelUsed, tokens: result.tokensUsed },
      });

      // 7. Response
      res.status(200).json({
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
      httpError(res, err, agentId, auth);
    }
  }
);

// ── GET /agents/:agentId/health ───────────────────────────────────────────────
agentRouter.get(
  "/:agentId/health",
  async (req: Request, res: Response) => {
    const { agentId } = req.params;

    try {
      const meta = await getAgentMeta(agentId);
      if (!meta) return res.status(404).json({ error: "Agent not found" });

      const metrics = await getAgentHealthMetrics(agentId);

      const alive = meta.status === "published";

      res.status(alive ? 200 : 503).json({
        agentId,
        status: meta.status,
        alive,
        checks: {
          registry: "ok",
          process: "ok",
        },
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
  }
);

// ─── Mount example (in your app.ts) ──────────────────────────────────────────
//
//   import { agentRouter } from "./agent-router";
//   app.use("/agents", jwtMiddleware, agentRouter);
//
