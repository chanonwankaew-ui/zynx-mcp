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
  readonly requiredRoles: readonly ("owner" | "admin" | "engineer" | "viewer" | "agent")[];
}

export const DEFAULT_TOOL_POLICIES: Readonly<Record<string, ToolSecurityDefinition>> = {
  system_health: {
    policy: "READ_ONLY",
    risk: "LOW",
    write: false,
    destructive: false,
    requiredRoles: ["owner", "admin", "engineer", "viewer", "agent"]
  },
  zynx_list_agents: {
    policy: "READ_ONLY",
    risk: "LOW",
    write: false,
    destructive: false,
    requiredRoles: ["owner", "admin", "engineer", "viewer", "agent"]
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
