import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createLogger } from "../utils/logger.js";
const log = createLogger("chaos-guide");
let guideCache = null;
function loadGuide() {
    if (guideCache)
        return guideCache;
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const guidePath = resolve(__dirname, "..", "docs", "chaos-guide.md");
    try {
        guideCache = readFileSync(guidePath, "utf-8");
    }
    catch (err) {
        log.warn("Could not load chaos-guide.md, returning inline fallback", { error: String(err) });
        guideCache = getInlineGuide();
    }
    return guideCache;
}
function getInlineGuide() {
    return `# Harness Chaos Engineering — Agent Guide

## 1. Bootstrap
Call \`harness_chaos_describe()\` (no arguments) to see all available resource types and operations.

## 2. Core Resource Types
| Resource Type | Description |
|---|---|
| chaos_experiment | Chaos experiments with fault injection |
| chaos_experiment_run | Experiment execution history and results |
| chaos_hub | Git-based fault/experiment repositories |
| chaos_infrastructure | K8s targets for experiment execution |
| chaos_probe | Steady-state validation (HTTP, CMD, Prom, K8s) |
| chaos_fault | Individual fault definitions |
| chaosguard_condition | Governance conditions (time, user, infra) |
| chaosguard_rule | Governance rules combining conditions |
| chaos_network_map | Service dependency maps |
| chaos_recommendation | AI resilience recommendations |
| chaos_risk | Service-level risk scores |
| chaos_dr_test | Disaster recovery tests |

## 3. Tool Calling Conventions
- **harness_chaos_list** — List resources with pagination and filters
- **harness_chaos_get** — Get a single resource by ID
- **harness_chaos_create** — Create a new resource
- **harness_chaos_update** — Update an existing resource
- **harness_chaos_delete** — Delete a resource
- **harness_chaos_execute** — Run experiments, launch templates, enable rules
- **harness_chaos_describe** — Discover resource types and their schemas (no API call)

## 4. Common Workflows

### Investigate Experiment Results
1. List experiments: \`harness_chaos_list(resource_type="chaos_experiment")\`
2. Get runs: \`harness_chaos_list(resource_type="chaos_experiment_run", filters={experiment_id: "..."})\`
3. Check resiliency scores and fault outcomes

### Check Infrastructure Health
1. List infra: \`harness_chaos_list(resource_type="chaos_infrastructure")\`
2. Look for \`isActive: false\` — means agent is disconnected
3. Get manifest to reinstall: \`harness_chaos_get(resource_type="chaos_infra_manifest", resource_id="...")\`

### Review Governance
1. List ChaosGuard rules: \`harness_chaos_list(resource_type="chaosguard_rule")\`
2. Check which are enabled
3. List conditions: \`harness_chaos_list(resource_type="chaosguard_condition")\`

### Run an Experiment
1. Find the experiment: \`harness_chaos_list(resource_type="chaos_experiment")\`
2. Execute it: \`harness_chaos_execute(resource_type="chaos_experiment", resource_id="...")\`
3. Monitor: \`harness_chaos_list(resource_type="chaos_experiment_run", filters={experiment_id: "..."})\`

## 5. Scope
Most chaos resources are project-scoped. Always provide org_id and project_id, or set defaults via HARNESS_DEFAULT_ORG_ID and HARNESS_DEFAULT_PROJECT_ID.

## 6. API Paths
All Chaos APIs use the base path \`/gateway/chaos/manager/api/\`. Authentication uses x-api-key (PAT/SA token).
`;
}
export function registerChaosGuideTool(server) {
    server.registerTool("harness_chaos_guide", {
        description: "Returns the complete Chaos Engineering agent guide — resource types, tool calling conventions, common workflows, troubleshooting. Call this at the start of every session.",
        inputSchema: {},
        annotations: {
            title: "Chaos Engineering Agent Guide",
            readOnlyHint: true,
            openWorldHint: false,
        },
    }, async () => ({
        content: [{ type: "text", text: loadGuide() }],
    }));
}
//# sourceMappingURL=harness-chaos-guide.js.map