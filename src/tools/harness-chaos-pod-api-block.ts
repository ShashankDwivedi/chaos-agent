import * as z from "zod/v4";
import { randomUUID } from "node:crypto";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { HarnessClient } from "../client/harness-client.js";
import type { Config } from "../config.js";
import { jsonResult, errorResult } from "../utils/response-formatter.js";
import { HarnessApiError, isUserError, isUserFixableApiError, toMcpError } from "../utils/errors.js";
import { createLogger } from "../utils/logger.js";

const log = createLogger("pod-api-block");

interface EnvInfo {
  identifier: string;
  name: string;
  type: string;
}

interface InfraInfo {
  identifier: string;
  name: string;
  type: string;
  deploymentType: string;
}

async function listEnvironments(
  client: HarnessClient,
  accountId: string,
  orgId: string,
  projectId: string,
): Promise<EnvInfo[]> {
  const raw = await client.request<unknown>({
    method: "GET",
    path: "/ng/api/environmentsV2",
    params: {
      orgIdentifier: orgId,
      projectIdentifier: projectId,
      size: 100,
    },
  });

  const resp = raw as { data?: { content?: Array<{ environment: Record<string, unknown> }> } };
  const content = resp?.data?.content ?? [];

  return content.map((e) => ({
    identifier: String(e.environment.identifier ?? ""),
    name: String(e.environment.name ?? ""),
    type: String(e.environment.type ?? ""),
  }));
}

async function listInfrastructures(
  client: HarnessClient,
  accountId: string,
  orgId: string,
  projectId: string,
  envId: string,
): Promise<InfraInfo[]> {
  const raw = await client.request<unknown>({
    method: "GET",
    path: "/ng/api/infrastructures",
    params: {
      orgIdentifier: orgId,
      projectIdentifier: projectId,
      environmentIdentifier: envId,
      size: 100,
    },
  });

  const resp = raw as { data?: { content?: Array<{ infrastructure: Record<string, unknown> }> } };
  const content = resp?.data?.content ?? [];

  return content.map((i) => ({
    identifier: String(i.infrastructure.identifier ?? ""),
    name: String(i.infrastructure.name ?? ""),
    type: String(i.infrastructure.type ?? ""),
    deploymentType: String(i.infrastructure.deploymentType ?? ""),
  }));
}

function buildPodApiBlockManifest(params: {
  experimentName: string;
  experimentId: string;
  namespace: string;
  infraId: string;
  environmentId: string;
  targetWorkloadKind: string;
  targetWorkloadNamespace: string;
  targetWorkloadNames: string;
  chaosDuration: number;
  pathFilter: string;
  dataDirection: string;
  destinationHosts: string;
  serviceDirection: string;
  podAffectedPercentage: number;
  transactionPercentage: number;
}): string {
  const faultName = `pod-api-block-${randomUUID().slice(0, 3)}`;
  const manifest = {
    apiVersion: "litmuschaos.io/v1beta1",
    kind: "ChaosExperiment",
    metadata: {
      name: params.experimentName,
      namespace: params.namespace,
      labels: {
        infra_id: params.infraId,
        revision_id: "1",
        workflow_id: params.experimentId,
      },
    },
    spec: {
      cleanupPolicy: "delete",
      experimentId: params.experimentId,
      experimentRunId: "",
      faultRef: [
        {
          authEnabled: true,
          identity: "pod-api-block",
          infraId: params.infraId,
          isEnterprise: true,
          name: faultName,
          values: [
            { name: "TARGET_WORKLOAD_KIND", value: params.targetWorkloadKind },
            { name: "TARGET_WORKLOAD_NAMESPACE", value: params.targetWorkloadNamespace },
            { name: "TARGET_WORKLOAD_NAMES", value: params.targetWorkloadNames },
            { name: "TOTAL_CHAOS_DURATION", value: params.chaosDuration },
            { name: "PATH_FILTER", value: params.pathFilter },
            { name: "DATA_DIRECTION", value: params.dataDirection },
            { name: "DESTINATION_HOSTS", value: params.destinationHosts },
            { name: "SERVICE_DIRECTION", value: params.serviceDirection },
            { name: "POD_AFFECTED_PERCENTAGE", value: params.podAffectedPercentage },
            { name: "TRANSACTION_PERCENTAGE", value: params.transactionPercentage },
          ],
        },
      ],
      infraId: `${params.environmentId}/${params.infraId}`,
      infraType: "KubernetesV2",
      serviceAccountName: "chaos-delegate",
      vertices: [
        { name: "v-start", start: { faults: [{ name: faultName }] } },
        { name: "v-end", end: { faults: [{ name: faultName }] } },
      ],
    },
  };

  return JSON.stringify(manifest);
}

export function registerPodApiBlockTool(server: McpServer, client: HarnessClient, config: Config): void {
  server.registerTool(
    "harness_chaos_pod_api_block",
    {
      description:
        "Create a Pod API Block chaos experiment for testing downstream dependency, " +
        "third-party API, or API failure scenarios. " +
        "Phase 1 (no environment_id): Lists environments in the project — ask user to pick one. " +
        "Phase 2 (environment_id set, no infra_id): Lists infrastructures for that environment — ask user to pick one. " +
        "Phase 3 (both set): Creates the Pod API Block experiment with the specified parameters.",
      inputSchema: z.object({
        org_id: z.string().describe("Organization identifier (default: 'default')").optional(),
        project_id: z.string().describe("Project identifier").optional(),
        environment_id: z.string().describe("Environment identifier (from Phase 1). Omit to list environments.").optional(),
        infra_id: z.string().describe("Infrastructure identifier (from Phase 2). Omit to list infrastructures.").optional(),
        experiment_name: z.string().describe("Name for the chaos experiment").optional(),
        namespace: z.string().describe("K8s namespace for experiment runner").optional(),
        target_workload_kind: z.string().describe("Target workload type: deployment, statefulset, daemonset").optional(),
        target_workload_namespace: z.string().describe("Namespace of the target workload (required in Phase 3)").optional(),
        target_workload_names: z.string().describe("Name(s) of the target workload(s) (required in Phase 3)").optional(),
        path_filter: z.string().describe("API path to block e.g. '/api/v1/payments' (required in Phase 3)").optional(),
        destination_hosts: z.string().describe("Destination host(s) to block e.g. 'svc.default.svc.cluster.local' (required in Phase 3)").optional(),
        chaos_duration: z.number().describe("Chaos duration in seconds").optional(),
        data_direction: z.string().describe("Intercept direction: request, response, or both").optional(),
        service_direction: z.string().describe("Traffic direction: ingress or egress").optional(),
        pod_affected_percentage: z.number().describe("Percentage of pods to affect (1-100)").optional(),
        transaction_percentage: z.number().describe("Percentage of transactions to block").optional(),
      }).passthrough(),
      annotations: {
        title: "Create Pod API Block Experiment",
        readOnlyHint: false,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const orgId = args.org_id ?? config.HARNESS_DEFAULT_ORG_ID;
        const projectId = args.project_id ?? config.HARNESS_DEFAULT_PROJECT_ID;
        if (!projectId) {
          return errorResult("project_id is required. Provide it explicitly or set HARNESS_DEFAULT_PROJECT_ID in your .env.");
        }

        // ---------------------------------------------------------------
        // Phase 1: List environments
        // ---------------------------------------------------------------
        if (!args.environment_id) {
          log.info("Phase 1: Listing environments", { orgId, projectId });
          const envs = await listEnvironments(client, config.HARNESS_ACCOUNT_ID, orgId, projectId);

          if (envs.length === 0) {
            return errorResult(
              `No environments found in project "${projectId}" (org: "${orgId}"). ` +
              "Create an environment first in the Harness UI or via harness_chaos_onboard.",
            );
          }

          return jsonResult({
            status: "environments_listed",
            message:
              "Ask the user to choose an environment from the list below, then " +
              "call harness_chaos_pod_api_block again with environment_id set.",
            project_id: projectId,
            org_id: orgId,
            environments: envs,
            next_step:
              'Call harness_chaos_pod_api_block with environment_id="<chosen_id>" ' +
              "to list infrastructures for that environment.",
          });
        }

        // ---------------------------------------------------------------
        // Phase 2: List infrastructures
        // ---------------------------------------------------------------
        if (!args.infra_id) {
          log.info("Phase 2: Listing infrastructures", { orgId, projectId, envId: args.environment_id });
          const infras = await listInfrastructures(
            client,
            config.HARNESS_ACCOUNT_ID,
            orgId,
            projectId,
            args.environment_id,
          );

          if (infras.length === 0) {
            return errorResult(
              `No infrastructures found in environment "${args.environment_id}" ` +
              `(project: "${projectId}", org: "${orgId}"). ` +
              "Create a Kubernetes infrastructure first.",
            );
          }

          return jsonResult({
            status: "infrastructures_listed",
            message:
              "Present the infrastructure list to the user and ask them to choose one. " +
              "IMPORTANT: You MUST also collect the following 4 runtime inputs from the user " +
              "before calling Phase 3. Do NOT proceed without all 4 values.",
            project_id: projectId,
            org_id: orgId,
            environment_id: args.environment_id,
            infrastructures: infras,
            runtime_inputs_required: {
              description:
                "Ask the user to provide ALL of the following. These are mandatory runtime inputs — " +
                "the experiment cannot be created without them.",
              inputs: [
                {
                  parameter: "target_workload_namespace",
                  ask: "What is the Kubernetes namespace where your target workload runs?",
                  example: "default, production, app-namespace",
                },
                {
                  parameter: "target_workload_names",
                  ask: "What is the name of the deployment/workload you want to disrupt?",
                  example: "payment-service, order-api, my-app",
                },
                {
                  parameter: "path_filter",
                  ask: "Which API path should be blocked?",
                  example: "/api/v1/payments, /health, /v1/charges",
                },
                {
                  parameter: "destination_hosts",
                  ask: "What is the destination host whose API calls should be blocked?",
                  example: "payment-svc.default.svc.cluster.local, api.stripe.com, orders-api:8080",
                },
              ],
            },
            next_step:
              "After the user provides the infrastructure choice AND all 4 runtime inputs above, " +
              "call harness_chaos_pod_api_block with: infra_id, target_workload_namespace, " +
              "target_workload_names, path_filter, destination_hosts.",
          });
        }

        // ---------------------------------------------------------------
        // Phase 3: Create the experiment
        // ---------------------------------------------------------------
        const missingInputs: Array<{ parameter: string; ask: string }> = [];
        if (!args.target_workload_namespace?.trim())
          missingInputs.push({ parameter: "target_workload_namespace", ask: "What is the Kubernetes namespace where your target workload runs?" });
        if (!args.target_workload_names?.trim())
          missingInputs.push({ parameter: "target_workload_names", ask: "What is the name of the deployment/workload you want to disrupt?" });
        if (!args.path_filter?.trim())
          missingInputs.push({ parameter: "path_filter", ask: "Which API path should be blocked? (e.g. /api/v1/payments)" });
        if (!args.destination_hosts?.trim())
          missingInputs.push({ parameter: "destination_hosts", ask: "What is the destination host whose API calls should be blocked? (e.g. payment-svc.default.svc.cluster.local)" });
        if (missingInputs.length > 0) {
          return jsonResult({
            status: "runtime_inputs_missing",
            message:
              "The following runtime inputs are required from the user before the experiment can be created. " +
              "Ask the user to provide each one.",
            missing_inputs: missingInputs,
            provided_so_far: {
              environment_id: args.environment_id,
              infra_id: args.infra_id,
              target_workload_namespace: args.target_workload_namespace || null,
              target_workload_names: args.target_workload_names || null,
              path_filter: args.path_filter || null,
              destination_hosts: args.destination_hosts || null,
            },
          });
        }

        log.info("Phase 3: Creating Pod API Block experiment", {
          orgId,
          projectId,
          envId: args.environment_id,
          infraId: args.infra_id,
        });

        const experimentId = randomUUID();
        const shortId = experimentId.slice(0, 8);
        const baseName = args.experiment_name ?? "pod-api-block";
        const experimentName = `${baseName}-${shortId}`;

        const manifest = buildPodApiBlockManifest({
          experimentName,
          experimentId,
          namespace: args.namespace ?? "harness-delegate-ng",
          infraId: args.infra_id,
          environmentId: args.environment_id,
          targetWorkloadKind: args.target_workload_kind ?? "deployment",
          targetWorkloadNamespace: args.target_workload_namespace!,
          targetWorkloadNames: args.target_workload_names!,
          chaosDuration: args.chaos_duration ?? 240,
          pathFilter: args.path_filter!,
          dataDirection: args.data_direction ?? "response",
          destinationHosts: args.destination_hosts!,
          serviceDirection: args.service_direction ?? "egress",
          podAffectedPercentage: args.pod_affected_percentage ?? 100,
          transactionPercentage: args.transaction_percentage ?? 100,
        });

        const requestBody = {
          id: experimentId,
          identity: experimentId,
          name: experimentName,
          description: `Pod API Block experiment — blocks API path "${args.path_filter}" on "${args.destination_hosts}" for workload "${args.target_workload_names}"`,
          tags: ["fault=pod-api-block", "scenario=api-dependency"],
          infraId: `${args.environment_id}/${args.infra_id}`,
          infraType: "KubernetesV2",
          manifest,
          experimentType: "Workflow",
        };

        let raw: unknown;
        try {
          raw = await client.request<unknown>({
            method: "POST",
            path: "/gateway/chaos/manager/api/rest/v2/experiment",
            params: {
              organizationIdentifier: orgId,
              projectIdentifier: projectId,
            },
            body: requestBody,
          });
        } catch (apiErr) {
          const msg = apiErr instanceof Error ? apiErr.message : String(apiErr);
          log.error("Chaos API error creating experiment", { error: msg });
          return errorResult(`Failed to create experiment: ${msg}`);
        }

        const deepLink =
          `${config.HARNESS_BASE_URL}/ng/account/${config.HARNESS_ACCOUNT_ID}` +
          `/chaos/orgs/${orgId}/projects/${projectId}/experiments/${experimentId}`;

        return jsonResult({
          status: "experiment_created",
          message: `Pod API Block experiment "${experimentName}" created successfully.`,
          experiment_id: experimentId,
          experiment_name: experimentName,
          environment_id: args.environment_id,
          infra_id: args.infra_id,
          fault_parameters: {
            target_workload_kind: args.target_workload_kind ?? "deployment",
            target_workload_namespace: args.target_workload_namespace,
            target_workload_names: args.target_workload_names,
            path_filter: args.path_filter,
            destination_hosts: args.destination_hosts,
            chaos_duration: args.chaos_duration ?? 240,
            data_direction: args.data_direction ?? "response",
            service_direction: args.service_direction ?? "egress",
            pod_affected_percentage: args.pod_affected_percentage ?? 100,
            transaction_percentage: args.transaction_percentage ?? 100,
          },
          open_in_harness: deepLink,
          api_response: raw,
          next_steps: [
            "Open the experiment in the Harness UI using the link above",
            "Run the experiment: harness_chaos_execute(resource_type='chaos_experiment', resource_id='<experiment_id>')",
            "Monitor the run: harness_chaos_list(resource_type='chaos_experiment_run', filters={experiment_id: '<experiment_id>'})",
          ],
        });
      } catch (err) {
        if (err instanceof Error) {
          log.error("Pod API Block tool error", { error: err.message, name: err.name });
          return errorResult(`Error: ${err.message}`);
        }
        throw toMcpError(err);
      }
    },
  );
}
