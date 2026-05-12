import { registerListTool } from "./harness-list.js";
import { registerGetTool } from "./harness-get.js";
import { registerDescribeTool } from "./harness-describe.js";
import { registerExecuteTool } from "./harness-chaos-execute.js";
import { registerCreateTool, registerUpdateTool, registerDeleteTool } from "./harness-chaos-mutate.js";
import { registerChaosGuideTool } from "./harness-chaos-guide.js";
import { registerOnboardTool } from "./harness-chaos-onboard.js";
import { registerPodApiBlockTool } from "./harness-chaos-pod-api-block.js";
import { registerChaosReportTool } from "./harness-chaos-report.js";
export function registerAllTools(server, registry, client, config) {
    registerListTool(server, registry, client);
    registerGetTool(server, registry, client);
    registerDescribeTool(server, registry);
    registerExecuteTool(server, registry, client);
    registerCreateTool(server, registry, client);
    registerUpdateTool(server, registry, client);
    registerDeleteTool(server, registry, client);
    registerChaosGuideTool(server);
    registerOnboardTool(server, client, config);
    registerPodApiBlockTool(server, client, config);
    registerChaosReportTool(server, client, config);
}
//# sourceMappingURL=index.js.map