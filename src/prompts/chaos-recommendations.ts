import * as z from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerChaosRecommendationsPrompt(server: McpServer): void {
  server.registerPrompt(
    "chaos-recommendations",
    {
      description: "Get and prioritize chaos engineering recommendations for improving system resilience",
      argsSchema: {
        projectId: z.string().describe("Project identifier").optional(),
      },
    },
    async ({ projectId }) => ({
      messages: [{
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `Get chaos engineering recommendations and create a prioritized action plan.

Steps:
1. Call harness_chaos_list with resource_type="chaos_recommendation"${projectId ? ` and project_id="${projectId}"` : ""}
2. Call harness_chaos_list with resource_type="chaos_risk"
3. Cross-reference recommendations with service risk scores
4. For each recommendation:
   - **Service**: Which service it applies to
   - **Risk Level**: Current risk score
   - **Recommendation**: What chaos tests to run
   - **Priority**: Based on risk level and blast radius
   - **Next Steps**: Specific actions (create experiment, add probe, etc.)
5. Present a prioritized action plan sorted by risk impact`,
        },
      }],
    }),
  );
}
