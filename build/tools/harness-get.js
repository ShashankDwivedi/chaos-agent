import * as z from "zod/v4";
import { jsonResult, errorResult } from "../utils/response-formatter.js";
import { isUserError, isUserFixableApiError, toMcpError } from "../utils/errors.js";
import { applyUrlDefaults } from "../utils/url-parser.js";
import { asString } from "../utils/type-guards.js";
export function registerGetTool(server, registry, client) {
    server.registerTool("harness_chaos_get", {
        description: "Get a Harness Chaos Engineering resource by ID. Accepts a Harness URL to auto-extract identifiers.",
        inputSchema: z.object({
            resource_type: z.string().describe("Chaos resource type (e.g. chaos_experiment, chaos_hub, chaos_probe). Auto-detected from url.").optional(),
            resource_id: z.string().describe("Primary resource identifier. Auto-detected from url.").optional(),
            url: z.string().describe("Harness UI URL — auto-extracts org, project, type, and ID").optional(),
            org_id: z.string().describe("Organization identifier (overrides default)").optional(),
            project_id: z.string().describe("Project identifier (overrides default)").optional(),
            params: z.record(z.string(), z.unknown()).describe("Additional identifiers for nested resources. Call harness_chaos_describe for fields per resource_type.").optional(),
        }).passthrough(),
        annotations: {
            title: "Get Chaos Resource",
            readOnlyHint: true,
            openWorldHint: true,
        },
    }, async (args) => {
        try {
            const { params, ...rest } = args;
            const input = applyUrlDefaults(rest, args.url);
            if (params)
                Object.assign(input, params);
            const resourceType = asString(input.resource_type);
            if (!resourceType) {
                return errorResult("resource_type is required. Provide it explicitly or via a Harness URL.");
            }
            const resourceId = asString(input.resource_id);
            const def = registry.getResource(resourceType);
            const primaryField = def.identifierFields[0];
            if (primaryField && resourceId) {
                input[primaryField] = resourceId;
            }
            const result = await registry.dispatch(client, resourceType, "get", input);
            return jsonResult(result);
        }
        catch (err) {
            if (isUserError(err))
                return errorResult(err.message);
            if (isUserFixableApiError(err))
                return errorResult(err.message);
            throw toMcpError(err);
        }
    });
}
//# sourceMappingURL=harness-get.js.map