#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { loadConfig, type Config } from "./config.js";
import { setLogLevel, createLogger } from "./utils/logger.js";
import { HarnessClient } from "./client/harness-client.js";
import { Registry } from "./registry/index.js";
import { registerAllTools } from "./tools/index.js";
import { registerAllResources } from "./resources/index.js";
import { registerAllPrompts } from "./prompts/index.js";
import { parseArgs } from "./utils/cli.js";

const log = createLogger("main");

function mcpJsonRpcMethodFromBody(body: unknown): string | undefined {
  if (body && typeof body === "object" && "method" in body) {
    const m = (body as { method?: unknown }).method;
    if (typeof m === "string") return m;
  }
  return undefined;
}

function createHarnessServer(config: Config): McpServer {
  const client = new HarnessClient(config);
  const registry = new Registry(config);

  const server = new McpServer(
    {
      name: "harness-chaos-advisor-agent",
      version: "1.0.0",
      icons: [{ src: "https://app.harness.io/favicon.ico" }],
      websiteUrl: "https://harness.io",
    },
    {
      capabilities: { logging: {} },
      instructions:
        "IMPORTANT: Call harness_chaos_guide (no parameters) at the start of every " +
        "session. It returns the complete agent guide covering all tool calling conventions, " +
        "resource types (experiments, faults, probes, infrastructure, ChaosGuard, hubs, " +
        "recommendations, risks, DR tests), common workflows, troubleshooting, and more. " +
        "Without this guide you will not know how to use the other tools correctly.",
    },
  );

  registerAllTools(server, registry, client, config);
  registerAllResources(server, registry, client, config);
  registerAllPrompts(server);

  return server;
}

async function startStdio(config: Config): Promise<void> {
  const server = createHarnessServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log.info("harness-chaos-advisor-agent connected via stdio");

  const shutdown = async (signal: string): Promise<void> => {
    log.info(`Received ${signal}, closing stdio transport...`);
    await transport.close();
    await server.close();
    log.info("Stdio server closed");
    process.exit(0);
  };

  process.on("SIGINT", () => { shutdown("SIGINT"); });
  process.on("SIGTERM", () => { shutdown("SIGTERM"); });
}

interface Session {
  server: McpServer;
  transport: StreamableHTTPServerTransport;
  lastActivity: number;
}

const SESSION_TTL_MS = 30 * 60_000;
const REAP_INTERVAL_MS = 60_000;

async function startHttp(config: Config, port: number): Promise<void> {
  const host = process.env.HOST || "127.0.0.1";
  const app = createMcpExpressApp({ host });

  const maxBodySize = config.HARNESS_MAX_BODY_SIZE_MB * 1024 * 1024;
  const { json } = await import("express");
  app.use(json({ limit: maxBodySize }));

  app.use((_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", `http://${host}:${port}`);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, mcp-session-id");
    res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");
    next();
  });

  const ipHits = new Map<string, { count: number; resetAt: number }>();
  const RATE_WINDOW_MS = 60_000;
  const RATE_LIMIT = 60;

  app.use((req, res, next) => {
    const ip = req.ip ?? "unknown";
    const now = Date.now();
    let entry = ipHits.get(ip);
    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + RATE_WINDOW_MS };
      ipHits.set(ip, entry);
    }
    entry.count++;
    if (entry.count > RATE_LIMIT) {
      res.status(429).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Too many requests. Try again later." },
        id: null,
      });
      return;
    }
    next();
  });

  const sessions = new Map<string, Session>();

  function destroySession(sessionId: string): void {
    const session = sessions.get(sessionId);
    if (!session) return;
    sessions.delete(sessionId);
    session.transport.close().catch(() => {});
    session.server.close().catch(() => {});
    log.info("Session destroyed", { sessionId, remaining: sessions.size });
  }

  const reaper = setInterval(() => {
    const now = Date.now();
    for (const [id, session] of sessions) {
      if (now - session.lastActivity > SESSION_TTL_MS) {
        log.info("Reaping idle session", { sessionId: id });
        destroySession(id);
      }
    }
    for (const [ip, entry] of ipHits) {
      if (now >= entry.resetAt) {
        ipHits.delete(ip);
      }
    }
  }, REAP_INTERVAL_MS);
  reaper.unref();

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", sessions: sessions.size });
  });

  app.post("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (sessionId) {
      const session = sessions.get(sessionId);
      if (!session) {
        res.status(404).json({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Session not found. Send an initialize request to start a new session." },
          id: null,
        });
        return;
      }
      session.lastActivity = Date.now();
      const httpStart = performance.now();
      const rpcMethod = mcpJsonRpcMethodFromBody(req.body);
      try {
        await session.transport.handleRequest(req, res, req.body);
      } catch (err) {
        log.error("Error handling session request", { sessionId, error: String(err) });
        if (!res.headersSent) {
          res.status(400).json({
            jsonrpc: "2.0",
            error: { code: -32700, message: "Invalid request" },
            id: null,
          });
        }
      } finally {
        log.info("MCP HTTP request", {
          durationMs: Math.round(performance.now() - httpStart),
          route: "POST /mcp",
          jsonrpcMethod: rpcMethod ?? "(none)",
          sessionId,
        });
      }
      return;
    }

    let server: McpServer | undefined;
    let transport: StreamableHTTPServerTransport | undefined;
    const initHttpStart = performance.now();
    const initRpcMethod = mcpJsonRpcMethodFromBody(req.body);
    try {
      server = createHarnessServer(config);
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => {
          sessions.set(id, { server: server!, transport: transport!, lastActivity: Date.now() });
          log.info("Session created", { sessionId: id, total: sessions.size });
        },
      });

      transport.onclose = () => {
        if (transport!.sessionId) {
          destroySession(transport!.sessionId);
        }
      };

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      log.error("Error initializing session", { error: String(err) });
      if (!res.headersSent) {
        res.status(400).json({
          jsonrpc: "2.0",
          error: { code: -32700, message: "Invalid request. Send a JSON-RPC initialize message to start a session." },
          id: null,
        });
      }
      await transport?.close();
      await server?.close();
    } finally {
      log.info("MCP HTTP request", {
        durationMs: Math.round(performance.now() - initHttpStart),
        route: "POST /mcp",
        jsonrpcMethod: initRpcMethod ?? "(none)",
        sessionId: "initialize",
      });
    }
  });

  app.get("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId) {
      res.status(400).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "mcp-session-id header is required. Initialize a session first via POST." },
        id: null,
      });
      return;
    }

    const session = sessions.get(sessionId);
    if (!session) {
      res.status(404).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Session not found. Send an initialize request to start a new session." },
        id: null,
      });
      return;
    }

    session.lastActivity = Date.now();
    const sseStart = performance.now();
    try {
      await session.transport.handleRequest(req, res);
    } catch (err) {
      log.error("Error handling SSE request", { sessionId, error: String(err) });
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Failed to establish SSE stream" },
          id: null,
        });
      }
    } finally {
      log.info("MCP HTTP request", {
        durationMs: Math.round(performance.now() - sseStart),
        route: "GET /mcp",
        jsonrpcMethod: "sse",
        sessionId,
      });
    }
  });

  app.delete("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId) {
      res.status(400).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "mcp-session-id header is required." },
        id: null,
      });
      return;
    }

    const session = sessions.get(sessionId);
    if (!session) {
      res.status(404).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Session not found." },
        id: null,
      });
      return;
    }

    const delStart = performance.now();
    const delRpcMethod = mcpJsonRpcMethodFromBody(req.body);
    try {
      await session.transport.handleRequest(req, res);
    } catch (err) {
      log.error("Error handling DELETE request", { sessionId, error: String(err) });
    } finally {
      log.info("MCP HTTP request", {
        durationMs: Math.round(performance.now() - delStart),
        route: "DELETE /mcp",
        jsonrpcMethod: delRpcMethod ?? "session_close",
        sessionId,
      });
    }
    destroySession(sessionId);
  });

  const httpServer = app.listen(port, host, () => {
    log.info(`harness-chaos-advisor-agent listening on http://${host}:${port}`);
    log.info(`  POST   /mcp    — MCP endpoint (session-based)`);
    log.info(`  GET    /mcp    — SSE stream (progress, elicitation)`);
    log.info(`  DELETE /mcp    — Terminate session`);
    log.info(`  GET    /health — Health check`);
  });

  let draining = false;

  const shutdown = (signal: string): void => {
    if (draining) return;
    draining = true;
    log.info(`Received ${signal}, draining...`);

    httpServer.close(() => {
      log.info("HTTP server closed — no new connections");
    });

    app.use((_req, res, _next) => {
      res.status(503).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Server is shutting down" },
        id: null,
      });
    });

    clearInterval(reaper);
    for (const [id] of sessions) {
      destroySession(id);
    }

    const DRAIN_TIMEOUT_MS = 10_000;
    setTimeout(() => {
      log.warn("Drain timeout — forcing exit");
      process.exit(1);
    }, DRAIN_TIMEOUT_MS).unref();

    const drainCheck = setInterval(() => {
      httpServer.getConnections((err, count) => {
        if (err || count === 0) {
          clearInterval(drainCheck);
          log.info("All connections drained, exiting");
          process.exit(0);
        }
        log.debug("Draining...", { connections: count });
      });
    }, 500);
    drainCheck.unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

async function main(): Promise<void> {
  process.on("unhandledRejection", (reason) => {
    log.error("Unhandled promise rejection — exiting", { error: String(reason), stack: (reason as Error)?.stack });
    process.exit(1);
  });
  process.on("uncaughtException", (err) => {
    log.error("Uncaught exception — exiting", { error: err.message, stack: err.stack });
    process.exit(1);
  });

  const config = loadConfig();
  setLogLevel(config.LOG_LEVEL);

  const { transport, port } = parseArgs();

  log.info("Starting harness-chaos-advisor-agent", {
    transport,
    baseUrl: config.HARNESS_BASE_URL,
    accountId: config.HARNESS_ACCOUNT_ID,
    defaultOrg: config.HARNESS_DEFAULT_ORG_ID,
    defaultProject: config.HARNESS_DEFAULT_PROJECT_ID ?? "(none)",
    toolsets: config.HARNESS_TOOLSETS ?? "(all)",
  });

  if (transport === "stdio") {
    await startStdio(config);
  } else {
    await startHttp(config, port);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
