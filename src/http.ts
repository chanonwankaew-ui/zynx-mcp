#!/usr/bin/env node
import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { createZynxMcpServer } from "./mcpServer.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { mcpHttpPort, mcpPath } from "./config.js";

// Allow override via env; default to * for local dev only.
const corsOrigin = process.env.ZYNX_CORS_ORIGIN ?? "*";

const app = express();
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

const transports = new Map<string, StreamableHTTPServerTransport>();

// Health check
app.get("/health", (_req, res) => {
  res.json({ 
    ok: true, 
    service: "zynx-mcp-wrapper-server",
    version: "0.1.0"
  });
});

// MCP Streamable HTTP endpoint
app.all(mcpPath, async (req, res) => {
  try {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    let transport: StreamableHTTPServerTransport | undefined;

    if (sessionId) {
      // Resume existing session
      transport = transports.get(sessionId);
      if (!transport) {
        res.status(404).json({
          error: "Session not found",
          message: "No transport found for this MCP session ID"
        });
        return;
      }
    } else if (req.method === "POST") {
      // New session
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

app.listen(mcpHttpPort, () => {
  console.log(`🤖 Zynx MCP Wrapper Server`);
  console.log(`   Port: ${mcpHttpPort}`);
  console.log(`   Health: http://localhost:${mcpHttpPort}/health`);
  console.log(`   MCP: http://localhost:${mcpHttpPort}${mcpPath}`);
});
