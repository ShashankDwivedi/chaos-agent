import * as z from "zod/v4";
import { jsonResult, errorResult } from "../utils/response-formatter.js";
import { isUserError, isUserFixableApiError, toMcpError } from "../utils/errors.js";
import { applyUrlDefaults } from "../utils/url-parser.js";
import { asString } from "../utils/type-guards.js";
export function registerCreateTool(server, registry, client) {
    server.registerTool("harness_chaos_create", {
        description: "Create a new Harness Chaos resource — experiment, hub, probe, ChaosGuard condition/rule, etc.",
        inputSchema: z.object({
            resource_type: z.string().describe("Chaos resource type to create (e.g. chaos_experiment, chaos_hub, chaos_probe)"),
            org_id: z.string().describe("Organization identifier (overrides default)").optional(),
            project_id: z.string().describe("Project identifier (overrides default)").optional(),
            body: z.record(z.string(), z.unknown()).describe("Resource body payload. Call harness_chaos_describe for required fields."),
        }).passthrough(),
        annotations: {
            title: "Create Chaos Resource",
            readOnlyHint: false,
            openWorldHint: true,
        },
    }, async (args) => {
        try {
            const input = args;
            const resourceType = asString(input.resource_type);
            if (!resourceType) {
                return errorResult("resource_type is required.");
            }
            const result = await registry.dispatch(client, resourceType, "create", input);
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
export function registerUpdateTool(server, registry, client) {
    server.registerTool("harness_chaos_update", {
        description: "Update an existing Harness Chaos resource.",
        inputSchema: z.object({
            resource_type: z.string().describe("Chaos resource type to update"),
            resource_id: z.string().describe("Primary resource identifier"),
            org_id: z.string().describe("Organization identifier (overrides default)").optional(),
            project_id: z.string().describe("Project identifier (overrides default)").optional(),
            body: z.record(z.string(), z.unknown()).describe("Updated resource body payload"),
        }).passthrough(),
        annotations: {
            title: "Update Chaos Resource",
            readOnlyHint: false,
            openWorldHint: true,
        },
    }, async (args) => {
        try {
            const input = applyUrlDefaults(args, args.url);
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
            const result = await registry.dispatch(client, resourceType, "update", input);
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
export function registerDeleteTool(server, registry, client) {
    server.registerTool("harness_chaos_delete", {
        description: "Delete a Harness Chaos resource.",
        inputSchema: z.object({
            resource_type: z.string().describe("Chaos resource type to delete"),
            resource_id: z.string().describe("Primary resource identifier"),
            url: z.string().describe("Harness UI URL — auto-extracts org, project, type, and ID").optional(),
            org_id: z.string().describe("Organization identifier (overrides default)").optional(),
            project_id: z.string().describe("Project identifier (overrides default)").optional(),
        }).passthrough(),
        annotations: {
            title: "Delete Chaos Resource",
            readOnlyHint: false,
            openWorldHint: true,
        },
    }, async (args) => {
        try {
            const input = applyUrlDefaults(args, args.url);
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
            const result = await registry.dispatch(client, resourceType, "delete", input);
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
//# sourceMappingURL=harness-chaos-mutate.js.map