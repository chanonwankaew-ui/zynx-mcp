#!/usr/bin/env node
import "./config.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createZynxMcpServer } from "./mcpServer.js";

const server = createZynxMcpServer();
const transport = new StdioServerTransport();
await server.connect(transport);
