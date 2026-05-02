---
name: auth-guard
description: JWT and RBAC enforcement layer for the Zynx AGI platform. Use this skill whenever any agent or API endpoint needs to verify identity, validate permissions, enforce role-based access control, generate tokens, or audit access events. Triggers on "check permissions", "is user authorized", "validate token", "enforce RBAC", or at the start of any protected operation. Always the first agent called in any request pipeline.
---

# Auth Guard

Enforces authentication (JWT RS256) and authorization (RBAC) across all Zynx platform operations with full audit trail.

## Responsibilities
- Validate JWT tokens (signature, expiry, claims)
- Resolve user roles and permissions from tenant config
- Enforce resource-level access control
- Emit audit events for every auth decision

## Input Contract

```typescript
import { z } from 'zod';

export const AuthRequestSchema = z.object({
  token: z.string().min(1),
  resource: z.string().min(1),
  action: z.enum(['read', 'write', 'delete', 'admin', 'execute']),
  tenantId: z.string().uuid(),
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().optional(),
  requestId: z.string().uuid(),
});
```

## Output Contract

```typescript
export const AuthResultSchema = z.object({
  authorized: z.boolean(),
  userId: z.string().uuid().optional(),
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
  tokenExpiresAt: z.string().datetime().optional(),
  reason: z.string().optional(),
  auditId: z.string().uuid(),
});
```

## Role Hierarchy

```
super_admin  → all permissions
tenant_admin → tenant:* permissions
developer    → code:*, api:*, deploy:read
analyst      → data:read, report:*
operator     → workflow:execute, job:*
viewer       → *:read only
```

## JWT Validation Steps

```typescript
async function validateToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, publicKey, {
    algorithms: ['RS256'],
    issuer: 'zynx-auth',
    audience: 'zynx-platform',
  });
  if (payload.exp! < Date.now() / 1000) throw new TokenExpiredError();
  return payload as JWTPayload;
}
```

## Error Handling
- Expired token → `401 TOKEN_EXPIRED`
- Invalid signature → `401 INVALID_TOKEN`
- Insufficient permissions → `403 FORBIDDEN`
- Missing token → `401 UNAUTHORIZED`
- All failures logged to Logger with `severity: 'security'`

## Audit Trail
Every decision emits:
```typescript
{ auditId, userId, resource, action, authorized, timestamp, tenantId, ip }
```
