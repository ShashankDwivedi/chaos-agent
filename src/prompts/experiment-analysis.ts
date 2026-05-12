import * as z from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerExperimentAnalysisPrompt(server: McpServer): void {
  server.registerPrompt(
    "experiment-analysis",
    {
      description: "Analyze chaos experiment runs to identify resilience gaps and improvement opportunities",
      argsSchema: {
        experimentId: z.string().describe("Experiment ID to analyze").optional(),
        projectId: z.string().describe("Project identifier").optional(),
      },
    },
    async ({ experimentId, projectId }) => ({
      messages: [{
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `Analyze chaos experiment results to identify resilience gaps.

Steps:
1. ${experimentId
  ? `Call harness_chaos_get with resource_type="chaos_experiment" and resource_id="${experimentId}"`
  : `Call harness_chaos_list with resource_type="chaos_experiment"${projectId ? ` and project_id="${projectId}"` : ""} and pick the most recent experiments`}
2. For each experiment, get run history: harness_chaos_list with resource_type="chaos_experiment_run"
3. Analyze each run:
   - Resiliency score trend over time (improving or degrading?)
   - Which faults consistently pass vs fail
   - Probe validation outcomes
4. Present:
   - **Summary**: Overall experiment health
   - **Trends**: Score trajectory across recent runs
   - **Failures**: Detailed breakdown of failed faults with root cause analysis
   - **Recommendations**: Specific actions to improve resilience`,
        },
      }],
    }),
  );
}
