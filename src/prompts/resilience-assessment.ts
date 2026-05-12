import * as z from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerResilienceAssessmentPrompt(server: McpServer): void {
  server.registerPrompt(
    "resilience-assessment",
    {
      description: "Assess the overall resilience posture of a Harness project by analyzing experiments, infrastructure, and risks",
      argsSchema: {
        projectId: z.string().describe("Project identifier to assess").optional(),
      },
    },
    async ({ projectId }) => ({
      messages: [{
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `Perform a comprehensive resilience assessment for this Harness project.

Steps:
1. Call harness_chaos_get with resource_type="chaos_experiment_stats"${projectId ? ` and project_id="${projectId}"` : ""} to get experiment overview
2. Call harness_chaos_list with resource_type="chaos_experiment"${projectId ? ` and project_id="${projectId}"` : ""} to list all experiments
3. Call harness_chaos_list with resource_type="chaos_infrastructure"${projectId ? ` and project_id="${projectId}"` : ""} to check infrastructure health
4. Call harness_chaos_list with resource_type="chaos_recommendation"${projectId ? ` and project_id="${projectId}"` : ""} to get resilience recommendations
5. For each experiment with recent runs, analyze:
   - **Resiliency Score**: How well the system handles chaos (0-100)
   - **Fault Results**: Which faults passed vs failed
   - **Probe Outcomes**: Steady-state validation results
6. Provide:
   - Overall resilience grade (A-F)
   - Top risks identified
   - Priority recommendations
   - Infrastructure health summary`,
        },
      }],
    }),
  );
}
