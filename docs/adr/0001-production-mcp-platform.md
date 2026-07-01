# ADR-0001: Production MCP Platform Architecture

- Status: Accepted for incremental implementation
- Date: 2026-07-01

## Context

The repository already provides MCP Streamable HTTP and legacy SSE transports through Express, plus Zynx agent tools. Current sessions are held in process memory, the health response is static, and the MCP tool path has no production authentication, authorization, approval persistence, or durable audit trail.

## Decision

1. Preserve the existing Node.js + Express implementation as the portable reference runtime.
2. Keep Streamable HTTP at `/mcp` as the primary MCP transport. Retain STDIO only for local development and MCP Inspector tests. Treat SSE as compatibility-only and schedule removal after client migration.
3. Introduce transport-independent packages for authentication, permission policies, approvals, adapters, observability, schemas, and shared types.
4. Use Supabase Postgres as the system of record for organizations, sessions, connections, approvals, executions, audit logs, traces, snapshots, and health checks.
5. Use OAuth 2.1 Authorization Code with PKCE for interactive clients. Dashboard sessions use secure HTTP-only cookies; MCP clients use scoped bearer tokens.
6. Default-deny unknown tools. Read tools are `READ_ONLY`; write, delete, deployment, promotion, and rollback operations require a non-expired approval unless an explicit sandbox policy applies.
7. Never expose provider secrets to browsers or MCP tool output. Provider status must be `NOT_CONFIGURED` when credentials are absent. Mock adapters must report `SIMULATED`.
8. Deploy the Express reference runtime in a Docker-compatible environment first. Add a Cloudflare Worker adapter only for stateless endpoints or when SDK/runtime compatibility is verified. Durable Objects may later own MCP session affinity.
9. Dashboard live updates use Server-Sent Events initially because telemetry is server-to-client. WebSocket support is deferred until bidirectional runtime control is required.

## Target boundaries

- `apps/mcp-server`: HTTP transport, OAuth endpoints, monitoring API
- `apps/monitoring-dashboard`: React dashboard and approval UI
- `packages/core`: orchestration and structured errors
- `packages/auth`: principals, sessions, OAuth and token validation
- `packages/permissions`: RBAC, policies and approval guard
- `packages/observability`: logs, metrics, traces and redaction
- provider adapter packages: Supabase, GitHub, Vercel and Zynx
- `packages/tool-schemas`: Zod input/output contracts

## Security invariants

- Service-role credentials are server-only.
- Arbitrary SQL and arbitrary shell execution are not exposed.
- Every tool call receives request, trace, principal and organization context.
- Every tool call creates an execution record and audit event, including failures.
- Inputs and outputs are redacted before persistence or display.
- Safe reads may be retried; writes are never automatically retried without an idempotency strategy.
- Delete and production deployment actions cannot execute without explicit approval.

## Consequences

The implementation can be migrated incrementally without breaking the current agent router. Production deployment should use an always-on Node/Docker runtime until Cloudflare Worker compatibility, session persistence, and dependency support have been proven with contract and load tests.
