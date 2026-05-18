---
name: zynx-agent-backend
description: >
  Guide for developing, extending, debugging, and operating the Zynx Agent Backend
  (src/backend.ts). Use this skill whenever the user wants to: add a new agent handler,
  modify invoke/health/list routes, change LLM provider wiring, debug a failing /invoke
  call, add a new agentId to the registry, wire a Prompt template to a backend handler,
  or understand how agentRegistry → agentHandlers → backend.ts connect together.
  Also trigger for questions about providerClient, fallback logic, or tenant/RBAC headers.
---

# Zynx Agent Backend Skill

## Project Layout (canonical paths)

```
/Users/kant/zynx-mcp/
├── src/
│   ├── backend.ts          ← Express server, routes, guards
│   ├── agentRegistry.ts    ← Single source of truth for all agent metadata
│   ├── agentHandlers.ts    ← Specialized + fallback handlers per agentId
│   ├── providerClient.ts   ← OpenAI Responses API adapter (opt-in)
│   ├── workflowSchema.ts   ← Zod schemas shared by planner + executor
│   ├── config.ts           ← dotenv → typed exports
│   ├── mcpServer.ts        ← MCP tools + prompts (Prompts primitive added)
│   └── zynxClient.ts       ← HTTP client used by mcpServer → backend
├── scripts/
│   ├── run-workflow.ts     ← Workflow executor (dry-run / execute)
│   └── run-governance.ts   ← Nightly governance report generator
└── .env                    ← Never commit; see .env.example
```

---

## Core Architecture

```
MCP Client (IDE / ChatGPT)
    ↓  JSON-RPC  (stdio or Streamable HTTP)
src/mcpServer.ts  [McpServer]
    ↓  invoke_agent tool call
src/zynxClient.ts  [fetch]
    ↓  POST /agents/:agentId/invoke
src/backend.ts  [Express]
    ↓  guard: published? tenantAccess? role?
src/agentHandlers.ts  [invokeAgentHandler]
    ↓  switch(agentId)
specialized handler  OR  fallbackHandler
    ↓  optional
src/providerClient.ts  [generateProviderText]  → OpenAI Responses API
```

---

## Routes

| Method | Path | Handler |
|--------|------|---------|
| GET | `/health` | Returns `{ ok, service, version }` |
| GET | `/agents` | Lists full AGENT_REGISTRY |
| POST | `/agents/:agentId/invoke` | Validates → guards → invokeAgentHandler |
| GET | `/agents/:agentId/health` | Registry lookup + stub metrics |
| GET | `/` | Serves `zynx-mcp-dashboard.html` (static) |

**Default port:** `ZYNX_BACKEND_PORT` env (fallback `8787`).
Current local run: **8790**.

---

## Adding a New Agent

### 1 — Register in `src/agentRegistry.ts`

```typescript
// agentRegistry.ts — append to AGENT_REGISTRY array
agent("my-agent", "My Agent", "Short role description", "worker", 3)
//     id           name        role                      category  dur
```

**Categories:** `core | ui | data | worker | biz | output`

### 2 — Add a specialized handler in `src/agentHandlers.ts`

```typescript
// Inside invokeAgentHandler switch
case "my-agent":
  output = await myAgentHandler(input, ctx);
  break;

// Handler function
async function myAgentHandler(
  input: Record<string, unknown>,
  ctx: AgentInvocationContext
): Promise<Record<string, unknown>> {
  const goal = getGoal(input);           // extracts goal/task/message from input
  // ... your logic here
  return {
    message: "Done",
    result: goal,
    nextActions: ["review output"]
  };
}
```

### 3 — Wire LLM (optional)

```typescript
const provider = await generateProviderText({
  instructions: "You are my-agent. Do X.",
  input: JSON.stringify({ goal }),
  fallbackText: "Deterministic fallback response.",
  maxOutputTokens: 300,
  metadata: { agent_id: "my-agent", tenant_id: ctx.tenantId }
});
return { message: provider.text, providerExecution: publicProviderExecution(provider) };
```

LLM only runs when `ZYNX_LLM_PROVIDER=openai` + `OPENAI_API_KEY` set.
Falls back silently unless `ZYNX_LLM_REQUIRE_PROVIDER=true`.

### 4 — Verify

```bash
npm run build
curl -s -X POST http://localhost:8790/agents/my-agent/invoke \
  -H "Content-Type: application/json" \
  -d '{"input":{"goal":"test"},"streaming":false}' | jq .
```

---

## Specialized Handlers (currently implemented)

| agentId | Handler | LLM | Notes |
|---------|---------|-----|-------|
| `task-planner` | `taskPlannerHandler` | ✓ optional | Returns typed workflow plan |
| `deeja` | `deejaHandler` | ✓ optional | Thai/EN persona, actionable card |
| `validator` | `validatorHandler` | ✗ | Zod + route-map checks |
| `reviewer` | `reviewerHandler` | ✗ | Safety gate, credential scan |
| *(all others)* | `fallbackHandler` | ✗ | Echo + nextActions stub |

---

## Request / Response Contract

**Invoke payload** (`InvokePayloadSchema`):
```json
{
  "input": { "goal": "...", "task": "..." },
  "sessionId": "optional-uuid",
  "streaming": false,
  "options": { "timeoutMs": 30000, "maxTokens": 2048 }
}
```

**Invoke response:**
```json
{
  "agentId": "deeja",
  "sessionId": null,
  "output": { "message": "...", "handledBy": "specialized-handler" },
  "meta": { "durationMs": 42, "tokensUsed": 0, "modelUsed": "local-deterministic-handler" }
}
```

**Auth headers** (from MCP wrapper or direct caller):
```
x-zynx-tenant-id: dev
x-zynx-user-id:   chatgpt-mcp
x-zynx-roles:     user
authorization:    Bearer <ZYNX_SERVICE_TOKEN>   (optional)
```

---

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `ZYNX_BACKEND_PORT` | `8787` | Backend listen port |
| `ZYNX_API_BASE_URL` | `http://localhost:8787` | Used by zynxClient |
| `ZYNX_LLM_PROVIDER` | `local` | `local` or `openai` |
| `ZYNX_LLM_REQUIRE_PROVIDER` | `false` | Fail if provider unavailable |
| `ZYNX_LLM_TIMEOUT_MS` | `30000` | Remote call timeout |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | OpenAI endpoint |
| `OPENAI_MODEL` | *(empty)* | e.g. `gpt-4o` |
| `OPENAI_API_KEY` | *(empty)* | Required for openai provider |
| `ZYNX_DEFAULT_TENANT_ID` | `dev` | Default tenant for CLI/executor |
| `ZYNX_SERVICE_TOKEN` | *(empty)* | Bearer token (optional) |

---

## Common Operations

### Start backend
```bash
# dev (tsx, hot-ish reload with manual restart)
npm run dev:backend

# production build
npm run build && npm run start:backend
```

### Smoke test all routes
```bash
BASE=http://localhost:8790

curl $BASE/health
curl $BASE/agents | jq '.agents | length'
curl -s -X POST $BASE/agents/task-planner/invoke \
  -H "Content-Type: application/json" \
  -d '{"input":{"goal":"build a governance report"},"streaming":false}' | jq .output.message
curl $BASE/agents/deeja/health | jq '{alive,status}'
```

### Test with OpenAI provider
```bash
ZYNX_LLM_PROVIDER=openai \
OPENAI_MODEL=gpt-4o \
OPENAI_API_KEY=sk-... \
npm run dev:backend
```

---

## MCP Prompts → Backend Connection

The three prompts in `src/mcpServer.ts` guide the LLM to call the right tool:

| Prompt | Calls | Backend route |
|--------|-------|---------------|
| `invoke-deeja` | `invoke_agent { agentId: "deeja" }` | `POST /agents/deeja/invoke` |
| `invoke-task-planner` | `invoke_agent { agentId: "task-planner" }` | `POST /agents/task-planner/invoke` |
| `agent-health-check` | `get_agent_health` × N | `GET /agents/:id/health` |

---

## Guards & Security

All `/agents/:agentId/invoke` calls go through three guards before reaching a handler:

1. **assertPublished** — agent status must be `"published"` (not `"deprecated"`)
2. **assertTenantAccess** — `tenantScope: "global"` passes always; `"scoped"` checks `allowedTenants`
3. **assertRole** — caller's `x-zynx-roles` must overlap `allowedRoles`

Failures return `403` or `503` with `{ error: "..." }`.

---

## Debugging Checklist

| Symptom | Check |
|---------|-------|
| `Cannot POST /connect` | Dashboard using wrong endpoint — use `/agents/:id/invoke` |
| `Load failed` | Backend port mismatch (dashboard default 8787, backend on 8790) |
| `Agent not found` | agentId not in `AGENT_REGISTRY` → add to `agentRegistry.ts` |
| `Insufficient role` | Missing `x-zynx-roles` header → add `"user"` |
| `OpenAI provider returned no output` | Check `OPENAI_MODEL` set + API key valid |
| `provider.status: "fallback"` | Provider disabled or key missing — normal in local mode |
| Build error after adding handler | Run `npm run build` and fix TypeScript errors |

---

## Verification After Changes

```bash
# Always run after editing src/
npm run build
npm audit --audit-level=moderate

# If backend routing changed
npm run dev:backend &
npm run workflow:run -- --execute
```

---

## Reference Files

- `src/agentRegistry.ts` — full 35-agent registry with colors, durations, routes
- `src/agentHandlers.ts` — all handler implementations
- `src/providerClient.ts` — OpenAI adapter with fallback logic
- `docs/examples/agent-router.example.ts` — production-grade router pattern with full RBAC
- `AGENTS.md` — workspace-level coding rules and security constraints
