import { z } from "zod";

export const PermissionPolicySchema = z.enum([
  "READ_ONLY",
  "ASK_BEFORE_WRITE",
  "SANDBOX_WRITE",
  "ADMIN_ONLY",
  "DENY"
]);

export type PermissionPolicy = z.infer<typeof PermissionPolicySchema>;

export const RiskLevelSchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export interface ToolSecurityDefinition {
  readonly policy: PermissionPolicy;
  readonly risk: RiskLevel;
  readonly write: boolean;
  readonly destructive: boolean;
  readonly requiredRoles: readonly ("owner" | "admin" | "engineer" | "viewer" | "agent" | "user")[];
}

export const DEFAULT_TOOL_POLICIES: Readonly<Record<string, ToolSecurityDefinition>> = {
  system_health: {
    policy: "READ_ONLY",
    risk: "LOW",
    write: false,
    destructive: false,
    requiredRoles: ["owner", "admin", "engineer", "viewer", "agent", "user"]
  },
  get_agent_health: {
    policy: "READ_ONLY",
    risk: "LOW",
    write: false,
    destructive: false,
    requiredRoles: ["owner", "admin", "engineer", "viewer", "agent", "user"]
  },
  list_agents: {
    policy: "READ_ONLY",
    risk: "LOW",
    write: false,
    destructive: false,
    requiredRoles: ["owner", "admin", "engineer", "viewer", "agent", "user"]
  },
  zynx_list_agents: {
    policy: "READ_ONLY",
    risk: "LOW",
    write: false,
    destructive: false,
    requiredRoles: ["owner", "admin", "engineer", "viewer", "agent", "user"]
  },
  invoke_agent: {
    policy: "SANDBOX_WRITE",
    risk: "MEDIUM",
    write: true,
    destructive: false,
    requiredRoles: ["owner", "admin", "engineer", "agent", "user"]
  },
  zynx_run_workflow: {
    policy: "ASK_BEFORE_WRITE",
    risk: "HIGH",
    write: true,
    destructive: false,
    requiredRoles: ["owner", "admin", "engineer", "agent"]
  },
  supabase_delete_rows: {
    policy: "ASK_BEFORE_WRITE",
    risk: "CRITICAL",
    write: true,
    destructive: true,
    requiredRoles: ["owner", "admin", "engineer"]
  },
  github_commit_files: {
    policy: "ASK_BEFORE_WRITE",
    risk: "HIGH",
    write: true,
    destructive: false,
    requiredRoles: ["owner", "admin", "engineer"]
  },
  vercel_trigger_deployment: {
    policy: "ASK_BEFORE_WRITE",
    risk: "HIGH",
    write: true,
    destructive: false,
    requiredRoles: ["owner", "admin", "engineer"]
  },
  vercel_rollback_deployment: {
    policy: "ASK_BEFORE_WRITE",
    risk: "CRITICAL",
    write: true,
    destructive: true,
    requiredRoles: ["owner", "admin"]
  },
  database_migration: {
    policy: "DENY",
    risk: "CRITICAL",
    write: true,
    destructive: true,
    requiredRoles: []
  },
  database_consolidate: {
    policy: "DENY",
    risk: "CRITICAL",
    write: true,
    destructive: true,
    requiredRoles: []
  },
  shell_execute: {
    policy: "DENY",
    risk: "CRITICAL",
    write: true,
    destructive: true,
    requiredRoles: []
  }
};

export function getToolSecurityDefinition(toolName: string): ToolSecurityDefinition {
  return DEFAULT_TOOL_POLICIES[toolName] ?? {
    policy: "DENY",
    risk: "CRITICAL",
    write: true,
    destructive: true,
    requiredRoles: []
  };
}

export function evaluateToolAccess(
  toolName: string,
  userRoles: string[] = ["agent", "user", "viewer"]
): { allowed: boolean; reason?: string; definition: ToolSecurityDefinition } {
  const definition = getToolSecurityDefinition(toolName);

  if (definition.policy === "DENY") {
    return {
      allowed: false,
      reason: `Tool '${toolName}' is blocked by security policy DENY.`,
      definition
    };
  }

  if (definition.requiredRoles.length > 0) {
    const hasRole = definition.requiredRoles.some((r) => userRoles.includes(r));
    if (!hasRole) {
      return {
        allowed: false,
        reason: `Access denied to tool '${toolName}'. Required roles: [${definition.requiredRoles.join(", ")}], caller roles: [${userRoles.join(", ")}].`,
        definition
      };
    }
  }

  return { allowed: true, definition };
}

export function assertToolPermission(
  toolName: string,
  userRoles: string[] = ["agent", "user", "viewer"]
): ToolSecurityDefinition {
  const evalResult = evaluateToolAccess(toolName, userRoles);
  if (!evalResult.allowed) {
    const err = new Error(evalResult.reason || `Tool '${toolName}' access denied`);
    (err as Record<string, unknown>).status = 403;
    throw err;
  }
  return evalResult.definition;
}

/**
 * Gate 4: Database Boundary Manifest
 * Formalizes the boundary freeze across the 4 distinct hosted Supabase projects in 5 repositories.
 */
export const FROZEN_DATABASE_MANIFEST = Object.freeze({
  status: "FROZEN",
  gate: "Gate 4",
  policy: "Zero database consolidation or cross-project table joins without explicit human approval",
  projectCount: 4,
  repositoryCount: 5,
  instances: Object.freeze([
    { repository: "Chanont-Wankaew/deeja-chat", projectId: "zoqgqiophsrugobqogsb", role: "chat_interface", isolationLevel: "isolated" },
    { repository: "zynx-chanont/deeja-ai", projectId: "fodfavehcfrehwgyuxte", role: "cultural_ai", isolationLevel: "isolated" },
    { repository: "zynx-chanont/deejas-cultural-compass", projectId: "uuvaefwnolpdwtwpuzrn", role: "cultural_compass", isolationLevel: "shared_infrastructure_instance" },
    { repository: "zynx-chanont/zynx-proof-of-concept", projectId: "uuvaefwnolpdwtwpuzrn", role: "poc_gaming_experiments", isolationLevel: "shared_infrastructure_instance" },
    { repository: "zynx-chanont/zynx-infra-suite", projectId: "jjxrykcuwpdhlwhfzrys", role: "infrastructure_management", isolationLevel: "isolated" }
  ])
});
