import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AGENT_REGISTRY } from "./agentRegistry.js";
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

function parseAgentCsv(value: string | undefined) {
  if (!value) return undefined;
  const agentIds = value
    .split(",")
    .map((agentId) => agentId.trim())
    .filter(Boolean);
  return agentIds.length ? agentIds : undefined;
}

function availableAgentText() {
  return AGENT_REGISTRY.map((agent) => agent.id).join(", ");
}

const DEEJA_FEW_SHOT = [
  {
    role: "user" as const,
    content: {
      type: "text" as const,
      text: "สวัสดี Deeja ช่วยสรุปสถานะระบบให้หน่อย"
    }
  },
  {
    role: "assistant" as const,
    content: {
      type: "text" as const,
      text: JSON.stringify({
        tool: "invoke_agent",
        arguments: {
          agentId: "deeja",
          input: {
            goal: "สรุปสถานะระบบ",
            message: "สวัสดี Deeja ช่วยสรุปสถานะระบบให้หน่อย"
          }
        }
      }, null, 2)
    }
  },
  {
    role: "user" as const,
    content: {
      type: "text" as const,
      text: "Ask Deeja to summarise today's workflow runs"
    }
  },
  {
    role: "assistant" as const,
    content: {
      type: "text" as const,
      text: JSON.stringify({
        tool: "invoke_agent",
        arguments: {
          agentId: "deeja",
          input: {
            goal: "summarise today's workflow runs",
            task: "workflow summary"
          }
        }
      }, null, 2)
    }
  }
];

const TASK_PLANNER_FEW_SHOT = [
  {
    role: "user" as const,
    content: {
      type: "text" as const,
      text: "วางแผน workflow สำหรับ nightly governance validation"
    }
  },
  {
    role: "assistant" as const,
    content: {
      type: "text" as const,
      text: JSON.stringify({
        tool: "invoke_agent",
        arguments: {
          agentId: "task-planner",
          input: {
            goal: "nightly governance validation",
            task: "วางแผน workflow",
            preferredAgents: ["data-ingest", "validator", "reviewer", "report-gen", "logger"]
          }
        }
      }, null, 2)
    }
  },
  {
    role: "user" as const,
    content: {
      type: "text" as const,
      text: "Plan a developer mode build workflow for implementing new agent handlers"
    }
  },
  {
    role: "assistant" as const,
    content: {
      type: "text" as const,
      text: JSON.stringify({
        tool: "invoke_agent",
        arguments: {
          agentId: "task-planner",
          input: {
            goal: "implement new agent handlers in developer mode",
            task: "build workflow planning",
            preferredAgents: ["code-gen", "validator", "reviewer", "test-gen", "doc-writer"]
          }
        }
      }, null, 2)
    }
  }
];

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

  server.prompt(
    "invoke-deeja",
    "Few-shot template for invoking the Deeja Thai UI agent through invoke_agent.",
    {
      goal: z.string().min(1).describe("เป้าหมายหรือข้อความที่ผู้ใช้ต้องการส่งให้ Deeja")
    },
    ({ goal }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: [
              "คุณกำลังทำงานกับ Zynx MCP Server ซึ่งมี tool ชื่อ invoke_agent",
              "Deeja คือ Thai UI Agent ที่รับ goal/message ภาษาไทยหรืออังกฤษ",
              "เมื่อผู้ใช้ต้องการคุยกับ Deeja ให้เรียก invoke_agent ด้วย agentId: 'deeja'",
              "",
              "ตัวอย่างที่ถูกต้อง:"
            ].join("\n")
          }
        },
        ...DEEJA_FEW_SHOT,
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: goal
          }
        }
      ]
    })
  );

  server.prompt(
    "invoke-task-planner",
    "Few-shot template for invoking task-planner with workflow planning payloads.",
    {
      goal: z.string().min(1).describe("Workflow goal or task description to plan"),
      agents: z.string().optional().describe("Comma-separated preferred agent IDs, for example validator,reviewer,report-gen")
    },
    ({ goal, agents }) => {
      const preferredAgents = parseAgentCsv(agents);
      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: [
                "คุณกำลังทำงานกับ Zynx MCP Server",
                "task-planner คือ agent ที่รับ goal แล้วสร้าง workflow plan พร้อม route map",
                "ถ้ามี preferredAgents ให้ใส่ลง input.preferredAgents เป็น array ของ agent IDs",
                "",
                `Agent IDs ที่ใช้ได้จาก registry ปัจจุบัน: ${availableAgentText()}`,
                "",
                "ตัวอย่างที่ถูกต้อง:"
              ].join("\n")
            }
          },
          ...TASK_PLANNER_FEW_SHOT,
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: preferredAgents
                ? `${goal}\n\npreferredAgents: ${preferredAgents.join(", ")}`
                : goal
            }
          }
        ]
      };
    }
  );

  server.prompt(
    "invoke-validator",
    "Template for invoking the validator agent against a workflow or payload.",
    {
      goal: z.string().min(1).describe("Validation goal or payload description")
    },
    ({ goal }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: [
              "เรียก invoke_agent ด้วย agentId: 'validator'",
              "ส่ง input.goal เป็นข้อความ validation ที่ผู้ใช้ต้องการ",
              "ถ้าผู้ใช้ให้ workflow JSON ให้ส่งไว้ใน input.workflow",
              "",
              "คำขอจริง:",
              goal
            ].join("\n")
          }
        }
      ]
    })
  );

  server.prompt(
    "invoke-reviewer",
    "Template for invoking the reviewer agent for code, workflow, or execution review.",
    {
      goal: z.string().min(1).describe("Review goal or artifact description")
    },
    ({ goal }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: [
              "เรียก invoke_agent ด้วย agentId: 'reviewer'",
              "ส่ง input.goal เป็นสิ่งที่ต้อง review",
              "ถ้ามี artifact หรือ code ให้ส่งเป็น input.artifact หรือ input.code",
              "",
              "คำขอจริง:",
              goal
            ].join("\n")
          }
        }
      ]
    })
  );

  server.prompt(
    "agent-health-check",
    "Template for checking one or multiple Zynx agents by calling get_agent_health.",
    {
      agents: z.string().min(1).describe("Comma-separated agent IDs to check, for example deeja,task-planner,validator")
    },
    ({ agents }) => {
      const agentIds = parseAgentCsv(agents) ?? [];
      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: [
                `ตรวจสอบ health ของ agent จำนวน ${agentIds.length} ตัว:`,
                agentIds.map((id, index) => `${index + 1}. ${id}`).join("\n"),
                "",
                "เรียก get_agent_health สำหรับแต่ละ agentId ด้านบน",
                "สรุปผลเป็นตาราง: agentId | alive | status | latencyMs"
              ].join("\n")
            }
          }
        ]
      };
    }
  );

  return server;
}
