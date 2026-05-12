import type { ToolsetDefinition } from "../types.js";
import {
  passthrough,
  chaosListExtract,
  chaosExperimentListExtract,
  chaosExperimentRunListExtract,
  chaosHubListExtract,
  chaosInfraListExtract,
  chaosProbeListExtract,
  chaosFaultListExtract,
  chaosGuardConditionListExtract,
  chaosGuardRuleListExtract,
  chaosNetworkMapListExtract,
  chaosExperimentStatsExtract,
  chaosRecommendationListExtract,
  chaosRiskExtract,
  chaosDrTestListExtract,
  chaosActionListExtract,
} from "../extractors.js";

export const chaosToolset: ToolsetDefinition = {
  name: "chaos",
  displayName: "Resilience Testing (Chaos Engineering)",
  description: "Harness Chaos Engineering — experiments, faults, probes, ChaosGuard, infrastructure, hubs, recommendations, DR tests, and more.",
  resources: [
    // -----------------------------------------------------------------------
    // Experiments
    // -----------------------------------------------------------------------
    {
      resourceType: "chaos_experiment",
      displayName: "Chaos Experiment",
      description: "Chaos experiments define a set of faults to inject into target infrastructure to test resilience.",
      toolset: "chaos",
      scope: "project",
      identifierFields: ["experiment_id"],
      listFilterFields: [
        { name: "filter", description: "Filter experiments by name or keyword" },
        { name: "infraType", description: "Filter by infrastructure type (e.g. Kubernetes)" },
        { name: "page", description: "Page number (0-indexed)", type: "number" },
        { name: "limit", description: "Page size", type: "number" },
      ],
      deepLinkTemplate: "/ng/account/{accountId}/chaos/orgs/{orgIdentifier}/projects/{projectIdentifier}/experiments/{experiment_id}",
      diagnosticHint: "Use chaos_experiment_run to see execution history. Check chaos_infrastructure to ensure an active infra target exists.",
      operations: {
        list: {
          method: "GET",
          path: "/gateway/chaos/manager/api/rest/v2/experiment",
          queryParams: {
            filter: "filter",
            infraType: "infraType",
            page: "page",
            limit: "limit",
          },
          responseExtractor: chaosExperimentListExtract,
          description: "List all chaos experiments in a project",
        },
        get: {
          method: "GET",
          path: "/gateway/chaos/manager/api/rest/v2/experiment/{identity}",
          pathParams: { experiment_id: "identity" },
          responseExtractor: passthrough,
          description: "Get a single chaos experiment by ID",
        },
        create: {
          method: "POST",
          path: "/gateway/chaos/manager/api/rest/v2/experiment",
          bodyBuilder: (input) => input.body ?? input,
          responseExtractor: passthrough,
          description: "Create a new chaos experiment",
        },
        update: {
          method: "PUT",
          path: "/gateway/chaos/manager/api/rest/v2/experiment/{identity}",
          pathParams: { experiment_id: "identity" },
          bodyBuilder: (input) => input.body ?? input,
          responseExtractor: passthrough,
          description: "Update an existing chaos experiment",
        },
        delete: {
          method: "DELETE",
          path: "/gateway/chaos/manager/api/rest/v2/experiment/{identity}",
          pathParams: { experiment_id: "identity" },
          responseExtractor: passthrough,
          description: "Delete a chaos experiment",
        },
        execute: {
          method: "POST",
          path: "/gateway/chaos/manager/api/rest/v2/experiment/{identity}/run",
          pathParams: { experiment_id: "identity" },
          bodyBuilder: (input) => input.body ?? {},
          responseExtractor: passthrough,
          description: "Run a chaos experiment",
        },
      },
    },

    // -----------------------------------------------------------------------
    // Experiment Runs
    // -----------------------------------------------------------------------
    {
      resourceType: "chaos_experiment_run",
      displayName: "Chaos Experiment Run",
      description: "Execution history and results of chaos experiment runs including resiliency scores and fault outcomes.",
      toolset: "chaos",
      scope: "project",
      identifierFields: ["experiment_id", "experiment_run_id"],
      listFilterFields: [
        { name: "experiment_id", description: "Filter runs by experiment ID" },
        { name: "page", description: "Page number (0-indexed)", type: "number" },
        { name: "limit", description: "Page size", type: "number" },
      ],
      diagnosticHint: "If runs show low resiliency scores, check the individual fault results and probe outcomes.",
      operations: {
        list: {
          method: "GET",
          path: "/gateway/chaos/manager/api/rest/v2/experiment/{identity}/runs",
          pathParams: { experiment_id: "identity" },
          queryParams: {
            page: "page",
            limit: "limit",
          },
          responseExtractor: chaosExperimentRunListExtract,
          description: "List experiment runs (execution history) for a given experiment",
        },
        get: {
          method: "GET",
          path: "/gateway/chaos/manager/api/rest/v2/experiment/{identity}/run/{runIdentity}",
          pathParams: {
            experiment_id: "identity",
            experiment_run_id: "runIdentity",
          },
          responseExtractor: passthrough,
          description: "Get details of a specific experiment run",
        },
      },
    },

    // -----------------------------------------------------------------------
    // Experiment Run Report
    // -----------------------------------------------------------------------
    {
      resourceType: "chaos_experiment_run_report",
      displayName: "Chaos Experiment Run Report",
      description: "Get the report for a specific chaos experiment run.",
      toolset: "chaos",
      scope: "project",
      identifierFields: ["experiment_run_id", "notify_id"],
      operations: {
        get: {
          method: "GET",
          path: "/gateway/chaos/manager/api/rest/chaos-experiment-run/report/{experimentRunId}/{notifyId}",
          pathParams: {
            experiment_run_id: "experimentRunId",
            notify_id: "notifyId",
          },
          responseExtractor: passthrough,
          description: "Get the report for a specific experiment run",
        },
      },
    },

    // -----------------------------------------------------------------------
    // Experiment Stats (overview)
    // -----------------------------------------------------------------------
    {
      resourceType: "chaos_experiment_stats",
      displayName: "Chaos Experiment Stats",
      description: "Overview statistics for chaos experiments — total experiments, runs, and active experiments.",
      toolset: "chaos",
      scope: "project",
      identifierFields: [],
      operations: {
        get: {
          method: "GET",
          path: "/gateway/chaos/manager/api/rest/overview/experiment-stats",
          responseExtractor: chaosExperimentStatsExtract,
          description: "Get experiment overview stats",
        },
      },
    },

    // -----------------------------------------------------------------------
    // Experiment Templates
    // -----------------------------------------------------------------------
    {
      resourceType: "chaos_experiment_template",
      displayName: "Chaos Experiment Template",
      description: "Reusable experiment templates that can be instantiated to create new experiments.",
      toolset: "chaos",
      scope: "project",
      identifierFields: ["template_id"],
      listFilterFields: [
        { name: "filter", description: "Filter templates by name" },
        { name: "page", description: "Page number", type: "number" },
        { name: "limit", description: "Page size", type: "number" },
      ],
      operations: {
        list: {
          method: "GET",
          path: "/gateway/chaos/manager/api/rest/experimenttemplates",
          queryParams: {
            filter: "filter",
            page: "page",
            limit: "limit",
          },
          responseExtractor: chaosListExtract,
          description: "List experiment templates",
        },
        get: {
          method: "GET",
          path: "/gateway/chaos/manager/api/rest/experimenttemplates/{identity}",
          pathParams: { template_id: "identity" },
          responseExtractor: passthrough,
          description: "Get an experiment template by ID",
        },
        create: {
          method: "POST",
          path: "/gateway/chaos/manager/api/rest/experimenttemplates",
          bodyBuilder: (input) => input.body ?? input,
          responseExtractor: passthrough,
          description: "Create an experiment template",
        },
        update: {
          method: "PUT",
          path: "/gateway/chaos/manager/api/rest/experimenttemplates/{identity}",
          pathParams: { template_id: "identity" },
          bodyBuilder: (input) => input.body ?? input,
          responseExtractor: passthrough,
          description: "Update an experiment template",
        },
        delete: {
          method: "DELETE",
          path: "/gateway/chaos/manager/api/rest/experimenttemplates/{identity}",
          pathParams: { template_id: "identity" },
          responseExtractor: passthrough,
          description: "Delete an experiment template",
        },
        execute: {
          method: "POST",
          path: "/gateway/chaos/manager/api/rest/experimenttemplates/{identity}/launch",
          pathParams: { template_id: "identity" },
          bodyBuilder: (input) => input.body ?? {},
          responseExtractor: passthrough,
          description: "Launch an experiment from a template",
        },
      },
    },

    // -----------------------------------------------------------------------
    // Chaos Hubs
    // -----------------------------------------------------------------------
    {
      resourceType: "chaos_hub",
      displayName: "Chaos Hub",
      description: "Chaos Hubs are Git repositories containing fault and experiment definitions. Includes the default Enterprise Chaos Hub.",
      toolset: "chaos",
      scope: "project",
      identifierFields: ["hub_id"],
      listFilterFields: [
        { name: "filter", description: "Filter hubs by name" },
      ],
      deepLinkTemplate: "/ng/account/{accountId}/chaos/orgs/{orgIdentifier}/projects/{projectIdentifier}/chaos-hubs",
      diagnosticHint: "If hub sync fails, check git credentials and repository access. Use chaos_hub get to see sync status.",
      operations: {
        list: {
          method: "GET",
          path: "/gateway/chaos/manager/api/rest/hubs",
          queryParams: {
            filter: "filter",
          },
          responseExtractor: chaosHubListExtract,
          description: "List all Chaos Hubs",
        },
        get: {
          method: "GET",
          path: "/gateway/chaos/manager/api/rest/hubs/{hubIdentity}",
          pathParams: { hub_id: "hubIdentity" },
          responseExtractor: passthrough,
          description: "Get a Chaos Hub by ID",
        },
        create: {
          method: "POST",
          path: "/gateway/chaos/manager/api/rest/hubs",
          bodyBuilder: (input) => input.body ?? input,
          responseExtractor: passthrough,
          description: "Connect a new Chaos Hub",
        },
        update: {
          method: "PUT",
          path: "/gateway/chaos/manager/api/rest/hubs/{hubIdentity}",
          pathParams: { hub_id: "hubIdentity" },
          bodyBuilder: (input) => input.body ?? input,
          responseExtractor: passthrough,
          description: "Update a Chaos Hub",
        },
        delete: {
          method: "DELETE",
          path: "/gateway/chaos/manager/api/rest/hubs/{hubIdentity}",
          pathParams: { hub_id: "hubIdentity" },
          responseExtractor: passthrough,
          description: "Disconnect a Chaos Hub",
        },
      },
    },

    // -----------------------------------------------------------------------
    // Hub Faults (faults available in hubs)
    // -----------------------------------------------------------------------
    {
      resourceType: "chaos_hub_fault",
      displayName: "Chaos Hub Fault",
      description: "Faults available in connected Chaos Hubs. Browse available faults to use in experiments.",
      toolset: "chaos",
      scope: "project",
      identifierFields: [],
      operations: {
        list: {
          method: "GET",
          path: "/gateway/chaos/manager/api/rest/hubs/faults",
          responseExtractor: chaosFaultListExtract,
          description: "List all faults available across connected hubs",
        },
      },
    },

    // -----------------------------------------------------------------------
    // Faults
    // -----------------------------------------------------------------------
    {
      resourceType: "chaos_fault",
      displayName: "Chaos Fault",
      description: "Individual chaos faults — atomic failure injections (pod kill, network loss, CPU stress, etc.).",
      toolset: "chaos",
      scope: "project",
      identifierFields: ["fault_id"],
      listFilterFields: [
        { name: "filter", description: "Filter faults by name" },
      ],
      operations: {
        list: {
          method: "GET",
          path: "/gateway/chaos/manager/api/rest/faults",
          queryParams: {
            filter: "filter",
          },
          responseExtractor: chaosFaultListExtract,
          description: "List project-level faults",
        },
        get: {
          method: "GET",
          path: "/gateway/chaos/manager/api/rest/faults/{identity}",
          pathParams: { fault_id: "identity" },
          responseExtractor: passthrough,
          description: "Get a fault by ID",
        },
        create: {
          method: "POST",
          path: "/gateway/chaos/manager/api/rest/faults",
          bodyBuilder: (input) => input.body ?? input,
          responseExtractor: passthrough,
          description: "Create a custom fault",
        },
      },
    },

    // -----------------------------------------------------------------------
    // Fault Templates
    // -----------------------------------------------------------------------
    {
      resourceType: "chaos_fault_template",
      displayName: "Chaos Fault Template",
      description: "Reusable fault templates with pre-configured parameters.",
      toolset: "chaos",
      scope: "project",
      identifierFields: ["template_id"],
      operations: {
        list: {
          method: "GET",
          path: "/gateway/chaos/manager/api/rest/faulttemplates",
          responseExtractor: chaosListExtract,
          description: "List fault templates",
        },
        get: {
          method: "GET",
          path: "/gateway/chaos/manager/api/rest/faulttemplates/{identity}",
          pathParams: { template_id: "identity" },
          responseExtractor: passthrough,
          description: "Get a fault template by ID",
        },
        create: {
          method: "POST",
          path: "/gateway/chaos/manager/api/rest/faulttemplates",
          bodyBuilder: (input) => input.body ?? input,
          responseExtractor: passthrough,
          description: "Create a fault template",
        },
        update: {
          method: "PUT",
          path: "/gateway/chaos/manager/api/rest/faulttemplates/{identity}",
          pathParams: { template_id: "identity" },
          bodyBuilder: (input) => input.body ?? input,
          responseExtractor: passthrough,
          description: "Update a fault template",
        },
        delete: {
          method: "DELETE",
          path: "/gateway/chaos/manager/api/rest/faulttemplates/{identity}",
          pathParams: { template_id: "identity" },
          responseExtractor: passthrough,
          description: "Delete a fault template",
        },
      },
    },

    // -----------------------------------------------------------------------
    // Actions
    // -----------------------------------------------------------------------
    {
      resourceType: "chaos_action",
      displayName: "Chaos Action",
      description: "Chaos actions represent individual fault injection steps within an experiment.",
      toolset: "chaos",
      scope: "project",
      identifierFields: ["action_id"],
      operations: {
        list: {
          method: "GET",
          path: "/gateway/chaos/manager/api/rest/actions",
          responseExtractor: chaosActionListExtract,
          description: "List chaos actions",
        },
        get: {
          method: "GET",
          path: "/gateway/chaos/manager/api/rest/actions/{identity}",
          pathParams: { action_id: "identity" },
          responseExtractor: passthrough,
          description: "Get a chaos action by ID",
        },
        create: {
          method: "POST",
          path: "/gateway/chaos/manager/api/rest/actions",
          bodyBuilder: (input) => input.body ?? input,
          responseExtractor: passthrough,
          description: "Create a chaos action",
        },
        update: {
          method: "PUT",
          path: "/gateway/chaos/manager/api/rest/actions/{identity}",
          pathParams: { action_id: "identity" },
          bodyBuilder: (input) => input.body ?? input,
          responseExtractor: passthrough,
          description: "Update a chaos action",
        },
        delete: {
          method: "DELETE",
          path: "/gateway/chaos/manager/api/rest/actions/{identity}",
          pathParams: { action_id: "identity" },
          responseExtractor: passthrough,
          description: "Delete a chaos action",
        },
      },
    },

    // -----------------------------------------------------------------------
    // Action Templates
    // -----------------------------------------------------------------------
    {
      resourceType: "chaos_action_template",
      displayName: "Chaos Action Template",
      description: "Reusable action templates with pre-configured fault parameters.",
      toolset: "chaos",
      scope: "project",
      identifierFields: ["template_id"],
      operations: {
        list: {
          method: "GET",
          path: "/gateway/chaos/manager/api/rest/templates/actions",
          responseExtractor: chaosListExtract,
          description: "List action templates",
        },
        get: {
          method: "GET",
          path: "/gateway/chaos/manager/api/rest/templates/actions/{identity}",
          pathParams: { template_id: "identity" },
          responseExtractor: passthrough,
          description: "Get an action template by ID",
        },
        create: {
          method: "POST",
          path: "/gateway/chaos/manager/api/rest/templates/actions",
          bodyBuilder: (input) => input.body ?? input,
          responseExtractor: passthrough,
          description: "Create an action template",
        },
        update: {
          method: "PUT",
          path: "/gateway/chaos/manager/api/rest/templates/actions/{identity}",
          pathParams: { template_id: "identity" },
          bodyBuilder: (input) => input.body ?? input,
          responseExtractor: passthrough,
          description: "Update an action template",
        },
        delete: {
          method: "DELETE",
          path: "/gateway/chaos/manager/api/rest/templates/actions/{identity}",
          pathParams: { template_id: "identity" },
          responseExtractor: passthrough,
          description: "Delete an action template",
        },
      },
    },

    // -----------------------------------------------------------------------
    // Chaos Infrastructure
    // -----------------------------------------------------------------------
    {
      resourceType: "chaos_infrastructure",
      displayName: "Chaos Infrastructure",
      description: "Kubernetes-based chaos infrastructure targets where experiments execute. Must be active and connected for experiment runs.",
      toolset: "chaos",
      scope: "project",
      identifierFields: ["infra_id"],
      listFilterFields: [
        { name: "filter", description: "Filter infras by name" },
        { name: "environmentID", description: "Filter by environment ID" },
        { name: "page", description: "Page number", type: "number" },
        { name: "limit", description: "Page size", type: "number" },
      ],
      deepLinkTemplate: "/ng/account/{accountId}/chaos/orgs/{orgIdentifier}/projects/{projectIdentifier}/environments",
      diagnosticHint: "If infra shows as inactive, check the chaos agent pod status in the target cluster. Use `helm-command` or `manifest` to reinstall.",
      operations: {
        list: {
          method: "GET",
          path: "/gateway/chaos/manager/api/rest/v2/kubernetes/infra",
          queryParams: {
            filter: "filter",
            environmentID: "environmentID",
            page: "page",
            limit: "limit",
          },
          responseExtractor: chaosInfraListExtract,
          description: "List all chaos infrastructure",
        },
        get: {
          method: "GET",
          path: "/gateway/chaos/manager/api/rest/kubernetes/infra/{id}",
          pathParams: { infra_id: "id" },
          responseExtractor: passthrough,
          description: "Get chaos infrastructure details",
        },
        create: {
          method: "POST",
          path: "/gateway/chaos/manager/api/rest/kubernetes/infra",
          bodyBuilder: (input) => input.body ?? input,
          responseExtractor: passthrough,
          description: "Register new chaos infrastructure",
        },
        delete: {
          method: "DELETE",
          path: "/gateway/chaos/manager/api/rest/kubernetes/infra/{id}",
          pathParams: { infra_id: "id" },
          responseExtractor: passthrough,
          description: "Deregister chaos infrastructure",
        },
      },
    },

    // -----------------------------------------------------------------------
    // Infra Manifest & Helm Command
    // -----------------------------------------------------------------------
    {
      resourceType: "chaos_infra_manifest",
      displayName: "Chaos Infrastructure Manifest",
      description: "Get the Kubernetes manifest or Helm command for installing the chaos agent on target infrastructure.",
      toolset: "chaos",
      scope: "project",
      identifierFields: ["infra_id"],
      operations: {
        get: {
          method: "GET",
          path: "/gateway/chaos/manager/api/rest/kubernetes/infra/manifest/{id}",
          pathParams: { infra_id: "id" },
          responseExtractor: passthrough,
          description: "Get the K8s manifest YAML for installing the chaos agent",
        },
      },
    },

    {
      resourceType: "chaos_infra_helm_command",
      displayName: "Chaos Infrastructure Helm Command",
      description: "Get the Helm install command for a chaos infrastructure.",
      toolset: "chaos",
      scope: "project",
      identifierFields: ["infra_id"],
      operations: {
        get: {
          method: "GET",
          path: "/gateway/chaos/manager/api/rest/kubernetes/infra/helm-command/{id}",
          pathParams: { infra_id: "id" },
          responseExtractor: passthrough,
          description: "Get the Helm install command for the chaos agent",
        },
      },
    },

    // -----------------------------------------------------------------------
    // Infra Stats & Version
    // -----------------------------------------------------------------------
    {
      resourceType: "chaos_infra_stats",
      displayName: "Chaos Infrastructure Stats",
      description: "Overview statistics for chaos infrastructure — active, inactive, and total counts.",
      toolset: "chaos",
      scope: "project",
      identifierFields: [],
      operations: {
        get: {
          method: "GET",
          path: "/gateway/chaos/manager/api/rest/kubernetes/infra/stats",
          responseExtractor: passthrough,
          description: "Get infra overview stats",
        },
      },
    },

    {
      resourceType: "chaos_infra_version",
      displayName: "Chaos Infrastructure Version",
      description: "Get the latest available chaos infrastructure agent version.",
      toolset: "chaos",
      scope: "project",
      identifierFields: [],
      operations: {
        get: {
          method: "GET",
          path: "/gateway/chaos/manager/api/rest/kubernetes/infra/version",
          responseExtractor: passthrough,
          description: "Get the latest chaos infra agent version",
        },
      },
    },

    // -----------------------------------------------------------------------
    // Probes
    // -----------------------------------------------------------------------
    {
      resourceType: "chaos_probe",
      displayName: "Chaos Probe",
      description: "Probes validate the steady-state hypothesis during chaos experiments — HTTP, CMD, Prometheus, Kubernetes, Datadog, Dynatrace, or SLO probes.",
      toolset: "chaos",
      scope: "project",
      identifierFields: ["probe_id"],
      listFilterFields: [
        { name: "filter", description: "Filter probes by name" },
        { name: "type", description: "Filter by probe type (httpProbe, cmdProbe, promProbe, k8sProbe)", enum: ["httpProbe", "cmdProbe", "promProbe", "k8sProbe"] },
      ],
      deepLinkTemplate: "/ng/account/{accountId}/chaos/orgs/{orgIdentifier}/projects/{projectIdentifier}/probes",
      diagnosticHint: "If probes fail unexpectedly, check probe endpoint accessibility from the chaos infrastructure namespace.",
      operations: {
        list: {
          method: "GET",
          path: "/gateway/chaos/manager/api/rest/v2/probes",
          queryParams: {
            filter: "filter",
            type: "type",
          },
          responseExtractor: chaosProbeListExtract,
          description: "List all chaos probes",
        },
        get: {
          method: "GET",
          path: "/gateway/chaos/manager/api/rest/v2/probes/{probeId}",
          pathParams: { probe_id: "probeId" },
          responseExtractor: passthrough,
          description: "Get a probe by ID",
        },
        create: {
          method: "POST",
          path: "/gateway/chaos/manager/api/rest/v2/probes",
          bodyBuilder: (input) => input.body ?? input,
          responseExtractor: passthrough,
          description: "Create a new probe",
        },
        update: {
          method: "PUT",
          path: "/gateway/chaos/manager/api/rest/v2/probes/{probeId}",
          pathParams: { probe_id: "probeId" },
          bodyBuilder: (input) => input.body ?? input,
          responseExtractor: passthrough,
          description: "Update a probe",
        },
        delete: {
          method: "DELETE",
          path: "/gateway/chaos/manager/api/rest/v2/probes/{probeId}",
          pathParams: { probe_id: "probeId" },
          responseExtractor: passthrough,
          description: "Delete a probe",
        },
      },
    },

    // -----------------------------------------------------------------------
    // Probe Templates
    // -----------------------------------------------------------------------
    {
      resourceType: "chaos_probe_template",
      displayName: "Chaos Probe Template",
      description: "Reusable probe templates with pre-configured validation parameters.",
      toolset: "chaos",
      scope: "project",
      identifierFields: ["template_id"],
      operations: {
        list: {
          method: "GET",
          path: "/gateway/chaos/manager/api/rest/templates/probes",
          responseExtractor: chaosListExtract,
          description: "List probe templates",
        },
        get: {
          method: "GET",
          path: "/gateway/chaos/manager/api/rest/templates/probes/{identity}",
          pathParams: { template_id: "identity" },
          responseExtractor: passthrough,
          description: "Get a probe template by ID",
        },
        create: {
          method: "POST",
          path: "/gateway/chaos/manager/api/rest/templates/probes",
          bodyBuilder: (input) => input.body ?? input,
          responseExtractor: passthrough,
          description: "Create a probe template",
        },
        update: {
          method: "PUT",
          path: "/gateway/chaos/manager/api/rest/templates/probes/{identity}",
          pathParams: { template_id: "identity" },
          bodyBuilder: (input) => input.body ?? input,
          responseExtractor: passthrough,
          description: "Update a probe template",
        },
        delete: {
          method: "DELETE",
          path: "/gateway/chaos/manager/api/rest/templates/probes/{identity}",
          pathParams: { template_id: "identity" },
          responseExtractor: passthrough,
          description: "Delete a probe template",
        },
      },
    },

    // -----------------------------------------------------------------------
    // ChaosGuard Conditions
    // -----------------------------------------------------------------------
    {
      resourceType: "chaosguard_condition",
      displayName: "ChaosGuard Condition",
      description: "ChaosGuard conditions define WHEN chaos experiments can run — time windows, user identity, infrastructure constraints, etc.",
      toolset: "chaos",
      scope: "project",
      identifierFields: ["condition_id"],
      deepLinkTemplate: "/ng/account/{accountId}/chaos/orgs/{orgIdentifier}/projects/{projectIdentifier}/chaosguard",
      operations: {
        list: {
          method: "GET",
          path: "/gateway/chaos/manager/api/v3/chaosguard-conditions",
          responseExtractor: chaosGuardConditionListExtract,
          description: "List ChaosGuard conditions",
        },
        get: {
          method: "GET",
          path: "/gateway/chaos/manager/api/v3/chaosguard-conditions/{identity}",
          pathParams: { condition_id: "identity" },
          responseExtractor: passthrough,
          description: "Get a ChaosGuard condition by ID",
        },
        create: {
          method: "POST",
          path: "/gateway/chaos/manager/api/v3/chaosguard-conditions",
          bodyBuilder: (input) => input.body ?? input,
          responseExtractor: passthrough,
          description: "Create a ChaosGuard condition",
        },
        update: {
          method: "PUT",
          path: "/gateway/chaos/manager/api/v3/chaosguard-conditions/{identity}",
          pathParams: { condition_id: "identity" },
          bodyBuilder: (input) => input.body ?? input,
          responseExtractor: passthrough,
          description: "Update a ChaosGuard condition",
        },
        delete: {
          method: "DELETE",
          path: "/gateway/chaos/manager/api/v3/chaosguard-conditions/{identity}",
          pathParams: { condition_id: "identity" },
          responseExtractor: passthrough,
          description: "Delete a ChaosGuard condition",
        },
      },
    },

    // -----------------------------------------------------------------------
    // ChaosGuard Rules
    // -----------------------------------------------------------------------
    {
      resourceType: "chaosguard_rule",
      displayName: "ChaosGuard Rule",
      description: "ChaosGuard rules combine conditions to create governance policies controlling experiment execution.",
      toolset: "chaos",
      scope: "project",
      identifierFields: ["rule_id"],
      deepLinkTemplate: "/ng/account/{accountId}/chaos/orgs/{orgIdentifier}/projects/{projectIdentifier}/chaosguard",
      operations: {
        list: {
          method: "GET",
          path: "/gateway/chaos/manager/api/v3/chaosguard-rules",
          responseExtractor: chaosGuardRuleListExtract,
          description: "List ChaosGuard rules",
        },
        get: {
          method: "GET",
          path: "/gateway/chaos/manager/api/v3/chaosguard-rules/{identity}",
          pathParams: { rule_id: "identity" },
          responseExtractor: passthrough,
          description: "Get a ChaosGuard rule by ID",
        },
        create: {
          method: "POST",
          path: "/gateway/chaos/manager/api/v3/chaosguard-rules",
          bodyBuilder: (input) => input.body ?? input,
          responseExtractor: passthrough,
          description: "Create a ChaosGuard rule",
        },
        update: {
          method: "PUT",
          path: "/gateway/chaos/manager/api/v3/chaosguard-rules/{identity}",
          pathParams: { rule_id: "identity" },
          bodyBuilder: (input) => input.body ?? input,
          responseExtractor: passthrough,
          description: "Update a ChaosGuard rule",
        },
        delete: {
          method: "DELETE",
          path: "/gateway/chaos/manager/api/v3/chaosguard-rules/{identity}",
          pathParams: { rule_id: "identity" },
          responseExtractor: passthrough,
          description: "Delete a ChaosGuard rule",
        },
        execute: {
          method: "PUT",
          path: "/gateway/chaos/manager/api/v3/chaosguard-rules/{identity}/enable",
          pathParams: { rule_id: "identity" },
          bodyBuilder: (input) => input.body ?? { enabled: true },
          responseExtractor: passthrough,
          description: "Enable or disable a ChaosGuard rule",
        },
      },
    },

    // -----------------------------------------------------------------------
    // Network Maps
    // -----------------------------------------------------------------------
    {
      resourceType: "chaos_network_map",
      displayName: "Chaos Network Map",
      description: "Network maps (application maps) model service dependencies for targeted chaos testing.",
      toolset: "chaos",
      scope: "project",
      identifierFields: ["network_map_id"],
      deepLinkTemplate: "/ng/account/{accountId}/chaos/orgs/{orgIdentifier}/projects/{projectIdentifier}/network-maps",
      operations: {
        list: {
          method: "GET",
          path: "/gateway/chaos/manager/api/rest/v2/applicationmaps",
          responseExtractor: chaosNetworkMapListExtract,
          description: "List network maps",
        },
        get: {
          method: "GET",
          path: "/gateway/chaos/manager/api/rest/v2/applicationmaps/{applicationmapid}",
          pathParams: { network_map_id: "applicationmapid" },
          responseExtractor: passthrough,
          description: "Get a network map by ID",
        },
        create: {
          method: "POST",
          path: "/gateway/chaos/manager/api/rest/v2/applicationmaps",
          bodyBuilder: (input) => input.body ?? input,
          responseExtractor: passthrough,
          description: "Create a network map",
        },
        delete: {
          method: "DELETE",
          path: "/gateway/chaos/manager/api/rest/v2/applicationmaps/{applicationmapid}",
          pathParams: { network_map_id: "applicationmapid" },
          responseExtractor: passthrough,
          description: "Delete a network map",
        },
      },
    },

    // -----------------------------------------------------------------------
    // Chaos Recommendations
    // -----------------------------------------------------------------------
    {
      resourceType: "chaos_recommendation",
      displayName: "Chaos Recommendation",
      description: "AI-generated recommendations for improving system resilience based on experiment results and service analysis.",
      toolset: "chaos",
      scope: "project",
      identifierFields: [],
      deepLinkTemplate: "/ng/account/{accountId}/chaos/orgs/{orgIdentifier}/projects/{projectIdentifier}/recommendations",
      operations: {
        list: {
          method: "GET",
          path: "/gateway/chaos/manager/api/rest/recommendations",
          responseExtractor: chaosRecommendationListExtract,
          description: "List chaos recommendations",
        },
        create: {
          method: "POST",
          path: "/gateway/chaos/manager/api/rest/recommendations",
          bodyBuilder: (input) => input.body ?? input,
          responseExtractor: passthrough,
          description: "Generate new chaos recommendations",
        },
        execute: {
          method: "POST",
          path: "/gateway/chaos/manager/api/rest/recommendations/action/run",
          bodyBuilder: (input) => input.body ?? input,
          responseExtractor: passthrough,
          description: "Execute a chaos recommendation action",
        },
      },
    },

    // -----------------------------------------------------------------------
    // Risks / Service Resilience
    // -----------------------------------------------------------------------
    {
      resourceType: "chaos_risk",
      displayName: "Chaos Risk / Service Resilience",
      description: "Service-level risk scores and resilience reports — measures how well services withstand chaos.",
      toolset: "chaos",
      scope: "account",
      identifierFields: [],
      operations: {
        list: {
          method: "GET",
          path: "/gateway/chaos/manager/api/v3/risks",
          responseExtractor: chaosListExtract,
          description: "List service risks",
        },
        get: {
          method: "GET",
          path: "/gateway/chaos/manager/api/v3/risks/{identity}",
          pathParams: { risk_id: "identity" },
          responseExtractor: chaosRiskExtract,
          description: "Get risk details for a service",
        },
      },
    },

    {
      resourceType: "chaos_service_stats",
      displayName: "Chaos Service Stats",
      description: "Overall service resilience statistics across the account.",
      toolset: "chaos",
      scope: "account",
      identifierFields: [],
      operations: {
        get: {
          method: "GET",
          path: "/gateway/chaos/manager/api/rest/service/overall/stats/{accountID}",
          pathParams: { account_id: "accountID" },
          responseExtractor: chaosRiskExtract,
          description: "Get overall service resilience stats",
        },
      },
    },

    {
      resourceType: "chaos_service_report",
      displayName: "Chaos Service Report",
      description: "Detailed service-level resilience report for the account.",
      toolset: "chaos",
      scope: "account",
      identifierFields: [],
      operations: {
        get: {
          method: "GET",
          path: "/gateway/chaos/manager/api/rest/service/report/{accountID}",
          pathParams: { account_id: "accountID" },
          responseExtractor: passthrough,
          description: "Get the service resilience report",
        },
      },
    },

    // -----------------------------------------------------------------------
    // DR Tests
    // -----------------------------------------------------------------------
    {
      resourceType: "chaos_dr_test",
      displayName: "DR Test",
      description: "Disaster Recovery tests validate failover and recovery processes using chaos experiments.",
      toolset: "chaos",
      scope: "project",
      identifierFields: ["dr_test_id"],
      operations: {
        list: {
          method: "GET",
          path: "/gateway/chaos/manager/api/v3/dr-tests",
          responseExtractor: chaosDrTestListExtract,
          description: "List DR tests",
        },
        create: {
          method: "POST",
          path: "/gateway/chaos/manager/api/v3/dr-tests",
          bodyBuilder: (input) => input.body ?? input,
          responseExtractor: passthrough,
          description: "Create a DR test",
        },
      },
    },

    // -----------------------------------------------------------------------
    // Chaos Components
    // -----------------------------------------------------------------------
    {
      resourceType: "chaos_component",
      displayName: "Chaos Component",
      description: "Integrations for running chaos as a component in CI/CD pipelines.",
      toolset: "chaos",
      scope: "project",
      identifierFields: [],
      operations: {
        execute: {
          method: "POST",
          path: "/gateway/chaos/manager/api/v3/integrations/run-chaos-component",
          bodyBuilder: (input) => input.body ?? input,
          responseExtractor: passthrough,
          description: "Run a chaos component integration",
        },
      },
    },

    // -----------------------------------------------------------------------
    // Health Check
    // -----------------------------------------------------------------------
    {
      resourceType: "chaos_health",
      displayName: "Chaos Service Health",
      description: "Health check for the Chaos Manager service.",
      toolset: "chaos",
      scope: "account",
      identifierFields: [],
      operations: {
        get: {
          method: "GET",
          path: "/gateway/chaos/manager/api/v3/health",
          responseExtractor: passthrough,
          description: "Check Chaos Manager health status",
        },
      },
    },

    // -----------------------------------------------------------------------
    // Image Registry
    // -----------------------------------------------------------------------
    {
      resourceType: "chaos_image_registry",
      displayName: "Chaos Image Registry",
      description: "Custom container image registry configuration for chaos experiment runners.",
      toolset: "chaos",
      scope: "project",
      identifierFields: [],
      operations: {
        get: {
          method: "GET",
          path: "/gateway/chaos/manager/api/rest/imageRegistry",
          responseExtractor: passthrough,
          description: "Get the configured image registry",
        },
      },
    },
  ],
};
