#!/usr/bin/env node
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID } from "node:crypto";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import cors from "cors";
import { createZynxMcpServer } from "./mcpServer.js";
import { app as backendApp } from "./backend.js";
import { listenHost, mcpAllowedHosts, mcpHost, mcpHttpPort, mcpPath, sslCertPath, sslKeyPath } from "./config.js";
import { zynxCorsOptions } from "./corsConfig.js";
import https from "node:https";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = createMcpExpressApp({
  host: mcpHost,
  allowedHosts: mcpAllowedHosts
});

app.use(cors(zynxCorsOptions()));

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const transports = new Map<string, Transport>();

app.get("/", (_req, res) => {
  res.sendFile(path.join(repoRoot, "zynx-mcp-dashboard.html"));
});

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
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (initializedSessionId) => {
          if (transport) {
            transports.set(initializedSessionId, transport);
          }
        },
        onsessionclosed: (closedSessionId) => {
          transports.delete(closedSessionId);
        }
      });

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

app.use(backendApp);

// Start Server with optional HTTPS
function startServer() {
  const isHttps = sslKeyPath && sslCertPath && fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath);
  
  const server = isHttps 
    ? https.createServer({
        key: fs.readFileSync(sslKeyPath!),
        cert: fs.readFileSync(sslCertPath!)
      }, app)
    : http.createServer(app);

  server.listen(mcpHttpPort, listenHost, () => {
    const protocol = isHttps ? "https" : "http";
    console.error("Server listening on", mcpHttpPort);
    console.error(`Zynx MCP Wrapper Server (${isHttps ? "Secure HTTPS" : "Standard HTTP"} Mode)`);
    console.error(`   Port: ${mcpHttpPort}`);
    console.error(`   Host: ${listenHost}`);
    console.error(`   MCP host policy: ${mcpHost}`);
    if (mcpAllowedHosts?.length) {
      console.error(`   Allowed hosts: ${mcpAllowedHosts.join(", ")}`);
    }
    console.error(`   Health: ${protocol}://${listenHost}:${mcpHttpPort}/health`);
    console.error(`   MCP: ${protocol}://${listenHost}:${mcpHttpPort}${mcpPath}`);
    console.error(`   SSE: ${protocol}://${listenHost}:${mcpHttpPort}/sse`);
    
    if (!isHttps) {
      console.warn("⚠️  Running in HTTP mode. Cloud AI (Claude/GPTs) will require HTTPS.");
      console.warn("💡 Tip: Use 'ngrok http " + mcpHttpPort + "' for a temporary HTTPS tunnel.");
    }
  });
}

startServer();
