import * as z from "zod/v4";
export function registerInfraHealthCheckPrompt(server) {
    server.registerPrompt("infra-health-check", {
        description: "Check the health and status of all chaos infrastructure targets",
        argsSchema: {
            projectId: z.string().describe("Project identifier to check").optional(),
        },
    }, async ({ projectId }) => ({
        messages: [{
                role: "user",
                content: {
                    type: "text",
                    text: `Check the health of all chaos infrastructure targets.

Steps:
1. Call harness_chaos_list with resource_type="chaos_infrastructure"${projectId ? ` and project_id="${projectId}"` : ""}
2. Call harness_chaos_get with resource_type="chaos_infra_stats"${projectId ? ` and project_id="${projectId}"` : ""}
3. For each infrastructure target, report:
   - **Name & ID**: Infrastructure identifier
   - **Status**: Active or inactive
   - **Last Heartbeat**: When it was last connected
   - **Version**: Current agent version
   - **Environment**: Which environment it belongs to
4. Flag any issues:
   - Inactive infrastructure that should be active
   - Outdated agent versions
   - Infrastructure without recent experiment runs`,
                },
            }],
    }));
}
//# sourceMappingURL=infra-health-check.js.map