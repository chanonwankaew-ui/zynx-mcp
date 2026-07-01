import { z } from "zod";

const OptionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().url().optional()
);

const OptionalSecret = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(16).optional()
);

export const EnvironmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  PUBLIC_BASE_URL: z.string().url().default("http://localhost:3001"),
  MCP_PATH: z.string().startsWith("/").default("/mcp"),
  CORS_ALLOWLIST: z.string().default("http://localhost:5173"),
  SUPABASE_URL: OptionalUrl,
  SUPABASE_ANON_KEY: OptionalSecret,
  SUPABASE_SERVICE_ROLE_KEY: OptionalSecret,
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: OptionalSecret,
  GITHUB_WEBHOOK_SECRET: OptionalSecret,
  VERCEL_CLIENT_ID: z.string().optional(),
  VERCEL_CLIENT_SECRET: OptionalSecret,
  ZYNX_INTERNAL_API_URL: OptionalUrl,
  ZYNX_INTERNAL_API_TOKEN: OptionalSecret,
  OAUTH_ISSUER: OptionalUrl,
  OAUTH_AUDIENCE: z.string().optional(),
  SESSION_ENCRYPTION_KEY: OptionalSecret,
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info")
}).superRefine((env, ctx) => {
  if (env.NODE_ENV === "production") {
    const required: Array<keyof typeof env> = [
      "SESSION_ENCRYPTION_KEY",
      "OAUTH_ISSUER",
      "OAUTH_AUDIENCE"
    ];
    for (const key of required) {
      if (!env[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${String(key)} is required in production`
        });
      }
    }
  }

  const hasSupabaseUrl = Boolean(env.SUPABASE_URL);
  const hasSupabaseAnon = Boolean(env.SUPABASE_ANON_KEY);
  if (hasSupabaseUrl !== hasSupabaseAnon) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["SUPABASE_URL"],
      message: "SUPABASE_URL and SUPABASE_ANON_KEY must be configured together"
    });
  }
});

export type Environment = z.infer<typeof EnvironmentSchema>;

export function loadEnvironment(source: NodeJS.ProcessEnv = process.env): Environment {
  const result = EnvironmentSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${details}`);
  }
  return result.data;
}

export function integrationStatus(env: Environment) {
  return {
    supabase: env.SUPABASE_URL && env.SUPABASE_ANON_KEY ? "CONFIGURED" : "NOT_CONFIGURED",
    github: env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET ? "CONFIGURED" : "NOT_CONFIGURED",
    vercel: env.VERCEL_CLIENT_ID && env.VERCEL_CLIENT_SECRET ? "CONFIGURED" : "NOT_CONFIGURED",
    zynxInternal: env.ZYNX_INTERNAL_API_URL && env.ZYNX_INTERNAL_API_TOKEN ? "CONFIGURED" : "NOT_CONFIGURED"
  } as const;
}
