import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAgentHealth, invokeAgent, listAgents } from "./zynxClient.js";

function jsonText(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(value, null, 2)
      }
    ]
  };
}

export function createZynxMcpServer() {
  const server = new McpServer({
    name: "zynx-agi",
    version: "0.1.0"
  });

  server.tool(
    "invoke_agent",
    "Invoke a published Zynx agent through the Zynx backend router.",
    {
      agentId: z.string().min(1).describe("Zynx agent ID, for example orchestrator, deeja, task-planner, rag-agent."),
      input: z.record(z.unknown()).describe("Agent input payload. This maps to InvokePayloadSchema.input."),
      sessionId: z.string().uuid().optional().describe("Optional session UUID."),
      streaming: z.boolean().optional().default(false).describe("Whether the downstream orchestrator should stream."),
      options: z.object({
        timeoutMs: z.number().int().min(100).max(120000).optional(),
        maxTokens: z.number().int().min(1).max(8192).optional()
      }).optional()
    },
    async (args) => {
      const result = await invokeAgent(args);
      return jsonText(result);
    }
  );

  server.tool(
    "get_agent_health",
    "Get health and runtime metrics for a Zynx agent.",
    {
      agentId: z.string().min(1).describe("Zynx agent ID.")
    },
    async (args) => {
      const result = await getAgentHealth(args);
      return jsonText(result);
    }
  );

  server.tool(
    "list_agents",
    "List agents available in the Zynx Agent Registry.",
    {},
    async () => {
      const result = await listAgents();
      return jsonText(result);
    }
  );

  return server;
}
