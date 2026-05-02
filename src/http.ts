#!/usr/bin/env node
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID } from "node:crypto";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { createZynxMcpServer } from "./mcpServer.js";
import { mcpAllowedHosts, mcpHost, mcpHttpPort, mcpPath } from "./config.js";

const app = createMcpExpressApp({
  host: mcpHost,
  allowedHosts: mcpAllowedHosts
});

const transports = new Map<string, Transport>();

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "zynx-mcp-wrapper-server",
    version: "0.1.0"
  });
});

app.all(mcpPath, async (req, res) => {
  try {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    let transport: StreamableHTTPServerTransport | undefined;

    if (sessionId) {
      const existingTransport = transports.get(sessionId);
      if (!existingTransport) {
        res.status(404).json({
          error: "Session not found",
          message: "No transport found for this MCP session ID"
        });
        return;
      }
      if (!(existingTransport instanceof StreamableHTTPServerTransport)) {
        res.status(400).json({
          error: "Bad Request",
          message: "Session exists but uses the SSE transport"
        });
        return;
      }
      transport = existingTransport;
    } else if (req.method === "POST") {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID()
      });

      if (transport.sessionId) {
        transports.set(transport.sessionId, transport);
      }

      transport.onclose = () => {
        if (transport?.sessionId) {
          transports.delete(transport.sessionId);
        }
      };

      const server = createZynxMcpServer();
      await server.connect(transport);
    } else {
      res.status(400).json({
        error: "Bad Request",
        message: "Missing MCP session ID. Start with a POST request."
      });
      return;
    }

    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("MCP HTTP error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
});

app.get("/sse", async (_req, res) => {
  try {
    const transport = new SSEServerTransport("/messages", res);
    transports.set(transport.sessionId, transport);
    res.on("close", () => {
      transports.delete(transport.sessionId);
    });

    const server = createZynxMcpServer();
    await server.connect(transport);
  } catch (error) {
    console.error("MCP SSE error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
});

app.post("/messages", async (req, res) => {
  const sessionId = typeof req.query.sessionId === "string" ? req.query.sessionId : undefined;
  const transport = sessionId ? transports.get(sessionId) : undefined;

  if (!(transport instanceof SSEServerTransport)) {
    res.status(400).json({
      error: "Bad Request",
      message: "No SSE transport found for this session ID"
    });
    return;
  }

  await transport.handlePostMessage(req, res, req.body);
});

app.listen(mcpHttpPort, () => {
  console.log(`🤖 Zynx MCP Wrapper Server (Standard Express Mode)`);
  console.log(`   Port: ${mcpHttpPort}`);
  console.log(`   Host: ${mcpHost}`);
  if (mcpAllowedHosts?.length) {
    console.log(`   Allowed hosts: ${mcpAllowedHosts.join(", ")}`);
  }
  console.log(`   Health: http://localhost:${mcpHttpPort}/health`);
  console.log(`   MCP: http://localhost:${mcpHttpPort}${mcpPath}`);
  console.log(`   SSE: http://localhost:${mcpHttpPort}/sse`);
});
