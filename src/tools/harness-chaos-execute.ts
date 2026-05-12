import * as z from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Registry } from "../registry/index.js";
import type { HarnessClient } from "../client/harness-client.js";
import { jsonResult, errorResult } from "../utils/response-formatter.js";
import { isUserError, isUserFixableApiError, toMcpError } from "../utils/errors.js";
import { applyUrlDefaults } from "../utils/url-parser.js";
import { asString } from "../utils/type-guards.js";

export function registerExecuteTool(server: McpServer, registry: Registry, client: HarnessClient): void {
  server.registerTool(
    "harness_chaos_execute",
    {
      description: "Execute an action on a Harness Chaos resource — run an experiment, launch a template, enable a ChaosGuard rule, etc.",
      inputSchema: z.object({
        resource_type: z.string().describe("Chaos resource type (e.g. chaos_experiment, chaos_experiment_template, chaosguard_rule)"),
        resource_id: z.string().describe("Primary resource identifier").optional(),
        action: z.string().describe("Action to perform: 'run', 'launch', 'enable'").default("run").optional(),
        url: z.string().describe("Harness UI URL — auto-extracts org, project, type, and ID").optional(),
        org_id: z.string().describe("Organization identifier (overrides default)").optional(),
        project_id: z.string().describe("Project identifier (overrides default)").optional(),
        body: z.record(z.string(), z.unknown()).describe("Request body for the execute action").optional(),
      }).passthrough(),
      annotations: {
        title: "Execute Chaos Action",
        readOnlyHint: false,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const input = applyUrlDefaults(args as Record<string, unknown>, args.url);
        const resourceType = asString(input.resource_type);
        if (!resourceType) {
          return errorResult("resource_type is required.");
        }
        const resourceId = asString(input.resource_id);

        const def = registry.getResource(resourceType);
        const primaryField = def.identifierFields[0];
        if (primaryField && resourceId) {
          input[primaryField] = resourceId;
        }

        const result = await registry.dispatch(client, resourceType, "execute", input);
        return jsonResult(result);
      } catch (err) {
        if (isUserError(err)) return errorResult(err.message);
        if (isUserFixableApiError(err)) return errorResult(err.message);
        throw toMcpError(err);
      }
    },
  );
}
