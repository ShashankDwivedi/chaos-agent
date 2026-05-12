import * as z from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Registry } from "../registry/index.js";
import type { HarnessClient } from "../client/harness-client.js";
import { jsonResult, errorResult } from "../utils/response-formatter.js";
import { isUserError, isUserFixableApiError, toMcpError } from "../utils/errors.js";
import { compactItems } from "../utils/compact.js";
import { applyUrlDefaults } from "../utils/url-parser.js";
import { asString, isRecord } from "../utils/type-guards.js";

export function registerListTool(server: McpServer, registry: Registry, client: HarnessClient): void {
  const allFilterNames = registry.getAllFilterFields().map((f) => f.name);
  const filtersDesc = allFilterNames.length > 0
    ? `Resource-specific filters as key-value pairs. Available keys across enabled resource types: ${allFilterNames.join(", ")}. Call harness_chaos_describe for filters available on a specific resource_type.`
    : "Resource-specific filters as key-value pairs. Call harness_chaos_describe for available filters per resource_type.";

  server.registerTool(
    "harness_chaos_list",
    {
      description: "List Harness Chaos Engineering resources with filtering and pagination. Accepts a Harness URL to auto-extract scope.",
      inputSchema: z.object({
        resource_type: z.string().describe("Chaos resource type (e.g. chaos_experiment, chaos_hub, chaos_infrastructure, chaos_probe). Auto-detected from url.").optional(),
        url: z.string().describe("Harness UI URL — auto-extracts org, project, and type").optional(),
        org_id: z.string().describe("Organization identifier (overrides default)").optional(),
        project_id: z.string().describe("Project identifier (overrides default)").optional(),
        page: z.number().describe("Page number, 0-indexed").default(0).optional(),
        size: z.number().min(1).max(100).describe("Page size (1–100)").default(20).optional(),
        search_term: z.string().describe("Filter results by name or keyword").optional(),
        compact: z.boolean().describe("Strip verbose metadata from list items (default true)").default(true).optional(),
        filters: z.record(z.string(), z.unknown()).describe(filtersDesc).optional(),
      }).passthrough(),
      annotations: {
        title: "List Chaos Resources",
        readOnlyHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const { filters, ...rest } = args;
        const input = applyUrlDefaults(rest as Record<string, unknown>, args.url);
        if (filters) Object.assign(input, filters);
        const resourceType = asString(input.resource_type);
        if (!resourceType) {
          return errorResult("resource_type is required. Provide it explicitly or via a Harness URL.");
        }
        const result = await registry.dispatch(client, resourceType, "list", input);

        if (args.compact !== false && isRecord(result)) {
          const items = result.items;
          if (Array.isArray(items)) {
            result.items = compactItems(items);
          }
        }

        return jsonResult(result);
      } catch (err) {
        if (isUserError(err)) return errorResult(err.message);
        if (isUserFixableApiError(err)) return errorResult(err.message);
        throw toMcpError(err);
      }
    },
  );
}
