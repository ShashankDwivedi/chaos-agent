import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerResilienceAssessmentPrompt } from "./resilience-assessment.js";
import { registerExperimentAnalysisPrompt } from "./experiment-analysis.js";
import { registerInfraHealthCheckPrompt } from "./infra-health-check.js";
import { registerChaosRecommendationsPrompt } from "./chaos-recommendations.js";

export function registerAllPrompts(server: McpServer): void {
  registerResilienceAssessmentPrompt(server);
  registerExperimentAnalysisPrompt(server);
  registerInfraHealthCheckPrompt(server);
  registerChaosRecommendationsPrompt(server);
}
