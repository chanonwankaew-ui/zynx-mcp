import dotenv from "dotenv";

dotenv.config();

function numberFromEnv(name: string, fallback: number) {
  const value = process.env[name];
  if (!value) return fallback;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const mcpHttpPort = numberFromEnv("MCP_PORT", numberFromEnv("PORT", 3000));
export const agentBackendPort = numberFromEnv("ZYNX_BACKEND_PORT", numberFromEnv("PORT", 8787));
export const mcpPath = process.env.MCP_PATH || "/mcp";
