import * as z from "zod/v4";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { HarnessClient } from "../client/harness-client.js";
import type { Config } from "../config.js";
import { jsonResult, errorResult } from "../utils/response-formatter.js";
import { isUserError, isUserFixableApiError, toMcpError } from "../utils/errors.js";
import { createLogger } from "../utils/logger.js";

const log = createLogger("chaos-onboard");

interface DelegateInfo {
  delegateGroupId?: string;
  groupName?: string;
  delegateGroupIdentifier?: string;
  activelyConnected?: boolean;
  delegateType?: string;
  lastHeartBeat?: number;
}

/**
 * List delegates via the Harness API.
 * Uses POST /ng/api/delegate-setup/listDelegates with the account filter.
 */
async function listDelegates(client: HarnessClient, config: Config): Promise<DelegateInfo[]> {
  try {
    const raw = await client.request<unknown>({
      method: "POST",
      path: "/ng/api/delegate-setup/listDelegates",
      body: {
        filterType: "DelegateGroup",
        accountId: config.HARNESS_ACCOUNT_ID,
      },
    });

    const resp = raw as { resource?: { delegateGroupDetails?: DelegateInfo[] } };
    return resp?.resource?.delegateGroupDetails ?? [];
  } catch (err) {
    log.warn("Failed to list delegates via POST, trying GET fallback", { error: String(err) });
    try {
      const raw = await client.request<unknown>({
        method: "GET",
        path: "/ng/api/delegate-setup/listDelegates",
      });
      const resp = raw as { resource?: { delegateGroupDetails?: DelegateInfo[] } };
      return resp?.resource?.delegateGroupDetails ?? [];
    } catch {
      return [];
    }
  }
}

function generateTerraformProvider(baseUrl: string): string {
  return `terraform {
  required_providers {
    harness = {
      source  = "harness/harness"
      version = ">= 0.31.0"
    }
  }
}

provider "harness" {
  endpoint         = "${baseUrl}"
  account_id       = var.harness_account_id
  platform_api_key = var.harness_api_key
}
`;
}

function generateVariablesTf(): string {
  return `variable "harness_account_id" {
  description = "Harness account identifier"
  type        = string
}

variable "harness_api_key" {
  description = "Harness API key (PAT or service account token)"
  type        = string
  sensitive   = true
}

variable "org_name" {
  description = "Name of the Harness organization to create"
  type        = string
  default     = "Chaos Engineering"
}

variable "org_identifier" {
  description = "Identifier for the organization (lowercase, underscores)"
  type        = string
  default     = "chaos_engineering"
}

variable "project_name" {
  description = "Name of the Harness project to create"
  type        = string
  default     = "Chaos Onboarding"
}

variable "project_identifier" {
  description = "Identifier for the project (lowercase, underscores)"
  type        = string
  default     = "chaos_onboarding"
}

variable "delegate_selectors" {
  description = "Delegate selectors for the Kubernetes connector (delegate tags)"
  type        = list(string)
}

variable "k8s_connector_identifier" {
  description = "Identifier for the Kubernetes connector"
  type        = string
  default     = "chaos_k8s_connector"
}

variable "k8s_connector_name" {
  description = "Display name for the Kubernetes connector"
  type        = string
  default     = "Chaos K8s Connector"
}

variable "environment_name" {
  description = "Name of the Harness environment"
  type        = string
  default     = "Chaos Environment"
}

variable "environment_identifier" {
  description = "Identifier for the environment"
  type        = string
  default     = "chaos_environment"
}

variable "environment_type" {
  description = "Environment type: PreProduction or Production"
  type        = string
  default     = "PreProduction"
}

variable "infrastructure_name" {
  description = "Name of the Harness infrastructure definition"
  type        = string
  default     = "Chaos K8s Infrastructure"
}

variable "infrastructure_identifier" {
  description = "Identifier for the infrastructure definition"
  type        = string
  default     = "chaos_k8s_infra"
}

variable "namespace" {
  description = "Kubernetes namespace for chaos infrastructure"
  type        = string
  default     = "hce"
}

variable "chaos_infra_name" {
  description = "Name of the chaos infrastructure"
  type        = string
  default     = "chaos-k8s-infra"
}

variable "chaos_infra_namespace" {
  description = "Kubernetes namespace for chaos components"
  type        = string
  default     = "hce"
}

variable "discovery_agent_name" {
  description = "Name of the service discovery agent"
  type        = string
  default     = "chaos-discovery-agent"
}

variable "discovery_namespace" {
  description = "Kubernetes namespace for service discovery"
  type        = string
  default     = "hce"
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default = {
    "managed_by" = "terraform"
    "purpose"    = "chaos-onboarding"
  }
}
`;
}

function generateMainTf(): string {
  return `# =============================================================================
# Harness Chaos Engineering — Kubernetes Onboarding
# Generated by harness-chaos-advisor-agent
# =============================================================================

locals {
  tags_set = [for k, v in var.tags : "\${k}=\${v}"]
}

# -----------------------------------------------------------------------------
# 1. Organization
# -----------------------------------------------------------------------------
resource "harness_platform_organization" "chaos_org" {
  identifier  = var.org_identifier
  name        = var.org_name
  description = "Organization for Chaos Engineering onboarding"
  tags        = local.tags_set
}

# -----------------------------------------------------------------------------
# 2. Project
# -----------------------------------------------------------------------------
resource "harness_platform_project" "chaos_project" {
  depends_on = [harness_platform_organization.chaos_org]

  identifier  = var.project_identifier
  name        = var.project_name
  org_id      = harness_platform_organization.chaos_org.id
  description = "Project for Kubernetes chaos engineering"
  tags        = local.tags_set
}

# -----------------------------------------------------------------------------
# 3. Kubernetes Connector (using delegate)
# -----------------------------------------------------------------------------
resource "harness_platform_connector_kubernetes" "chaos_k8s" {
  depends_on = [harness_platform_project.chaos_project]

  identifier = var.k8s_connector_identifier
  name       = var.k8s_connector_name
  org_id     = harness_platform_organization.chaos_org.id
  project_id = harness_platform_project.chaos_project.id

  inherit_from_delegate {
    delegate_selectors = var.delegate_selectors
  }

  description = "Kubernetes connector for chaos engineering (inherits credentials from delegate)"
  tags        = local.tags_set
}

# -----------------------------------------------------------------------------
# 4. Environment
# -----------------------------------------------------------------------------
resource "harness_platform_environment" "chaos_env" {
  depends_on = [harness_platform_project.chaos_project]

  identifier = var.environment_identifier
  name       = var.environment_name
  org_id     = harness_platform_organization.chaos_org.id
  project_id = harness_platform_project.chaos_project.id
  type       = var.environment_type

  description = "Environment for chaos engineering experiments"
  tags        = local.tags_set
}

# -----------------------------------------------------------------------------
# 5. Infrastructure Definition (Kubernetes Direct)
# -----------------------------------------------------------------------------
resource "harness_platform_infrastructure" "chaos_infra" {
  depends_on = [
    harness_platform_environment.chaos_env,
    harness_platform_connector_kubernetes.chaos_k8s,
  ]

  identifier      = var.infrastructure_identifier
  name            = var.infrastructure_name
  org_id          = harness_platform_organization.chaos_org.id
  project_id      = harness_platform_project.chaos_project.id
  env_id          = harness_platform_environment.chaos_env.id
  deployment_type = "Kubernetes"
  type            = "KubernetesDirect"

  yaml = <<-EOT
  infrastructureDefinition:
    name: $\{var.infrastructure_name}
    identifier: $\{var.infrastructure_identifier}
    orgIdentifier: $\{harness_platform_organization.chaos_org.id}
    projectIdentifier: $\{harness_platform_project.chaos_project.id}
    environmentRef: $\{harness_platform_environment.chaos_env.id}
    type: KubernetesDirect
    deploymentType: Kubernetes
    allowSimultaneousDeployments: false
    spec:
      connectorRef: $\{harness_platform_connector_kubernetes.chaos_k8s.id}
      namespace: $\{var.namespace}
      releaseName: release-$\{var.infrastructure_identifier}
  EOT

  tags = local.tags_set
}

# -----------------------------------------------------------------------------
# 6. Chaos Infrastructure (enable chaos on the K8s infra)
# -----------------------------------------------------------------------------
resource "harness_chaos_infrastructure_v2" "chaos_infra" {
  depends_on = [harness_platform_infrastructure.chaos_infra]

  org_id         = harness_platform_organization.chaos_org.id
  project_id     = harness_platform_project.chaos_project.id
  environment_id = harness_platform_environment.chaos_env.id
  infra_id       = harness_platform_infrastructure.chaos_infra.id
  name           = var.chaos_infra_name
  description    = "Chaos-enabled Kubernetes infrastructure"

  namespace  = var.chaos_infra_namespace
  infra_type = "KubernetesV2"

  service_account = "hce"
  tags            = local.tags_set
}

# -----------------------------------------------------------------------------
# 7. Service Discovery Agent
# -----------------------------------------------------------------------------
resource "harness_service_discovery_agent" "chaos_discovery" {
  depends_on = [harness_chaos_infrastructure_v2.chaos_infra]

  name                   = var.discovery_agent_name
  org_identifier         = harness_platform_organization.chaos_org.id
  project_identifier     = harness_platform_project.chaos_project.id
  environment_identifier = harness_platform_environment.chaos_env.id
  infra_identifier       = harness_platform_infrastructure.chaos_infra.id
  installation_type      = "CONNECTED"

  config {
    kubernetes {
      namespace = var.discovery_namespace
    }
  }
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------
output "organization_id" {
  description = "Created organization identifier"
  value       = harness_platform_organization.chaos_org.id
}

output "project_id" {
  description = "Created project identifier"
  value       = harness_platform_project.chaos_project.id
}

output "k8s_connector_id" {
  description = "Kubernetes connector identifier"
  value       = harness_platform_connector_kubernetes.chaos_k8s.id
}

output "environment_id" {
  description = "Environment identifier"
  value       = harness_platform_environment.chaos_env.id
}

output "infrastructure_id" {
  description = "Infrastructure definition identifier"
  value       = harness_platform_infrastructure.chaos_infra.id
}

output "chaos_infrastructure_id" {
  description = "Chaos infrastructure identifier"
  value       = harness_chaos_infrastructure_v2.chaos_infra.id
}

output "discovery_agent_name" {
  description = "Service discovery agent name"
  value       = harness_service_discovery_agent.chaos_discovery.name
}
`;
}

function generateTfvarsTemplate(
  accountId: string,
  delegateSelectors: string[],
): string {
  return `# Harness Chaos Onboarding — terraform.tfvars
# Fill in your values and run: terraform init && terraform apply

harness_account_id = "${accountId}"
harness_api_key    = ""  # Set via TF_VAR_harness_api_key env var for security

# Delegate selectors (from your chosen delegate)
delegate_selectors = ${JSON.stringify(delegateSelectors)}

# Organization
org_name       = "Chaos Engineering"
org_identifier = "chaos_engineering"

# Project
project_name       = "Chaos Onboarding"
project_identifier = "chaos_onboarding"

# Kubernetes Connector
k8s_connector_name       = "Chaos K8s Connector"
k8s_connector_identifier = "chaos_k8s_connector"

# Environment
environment_name       = "Chaos Environment"
environment_identifier = "chaos_environment"
environment_type       = "PreProduction"

# Infrastructure
infrastructure_name       = "Chaos K8s Infrastructure"
infrastructure_identifier = "chaos_k8s_infra"
namespace                 = "hce"

# Chaos Infrastructure
chaos_infra_name      = "chaos-k8s-infra"
chaos_infra_namespace = "hce"

# Service Discovery Agent
discovery_agent_name = "chaos-discovery-agent"
discovery_namespace  = "hce"

tags = {
  "managed_by" = "terraform"
  "purpose"    = "chaos-onboarding"
}
`;
}

export function registerOnboardTool(server: McpServer, client: HarnessClient, config: Config): void {
  server.registerTool(
    "harness_chaos_onboard",
    {
      description:
        "Automate Kubernetes chaos engineering onboarding. Lists available delegates, " +
        "then generates a complete Terraform configuration that creates: Harness Organization, " +
        "Project, Kubernetes Connector (using a delegate), Environment, Infrastructure, " +
        "Chaos Infrastructure, and a Service Discovery Agent. The generated Terraform files " +
        "are written to a local directory ready for `terraform init && terraform apply`.",
      inputSchema: z.object({
        output_dir: z
          .string()
          .describe(
            "Directory path where Terraform files will be written (e.g. './chaos-onboarding-tf'). Created if it doesn't exist.",
          )
          .default("./chaos-onboarding-tf"),
        delegate_selectors: z
          .array(z.string())
          .describe(
            "Delegate selectors (tags) to use for the Kubernetes connector. " +
            "Call this tool first WITHOUT this parameter to list available delegates, " +
            "then call again WITH the chosen delegate selector(s).",
          )
          .optional(),
        org_name: z.string().describe("Organization name").default("Chaos Engineering").optional(),
        org_identifier: z.string().describe("Organization identifier").default("chaos_engineering").optional(),
        project_name: z.string().describe("Project name").default("Chaos Onboarding").optional(),
        project_identifier: z.string().describe("Project identifier").default("chaos_onboarding").optional(),
        environment_name: z.string().describe("Environment name").default("Chaos Environment").optional(),
        environment_type: z.enum(["PreProduction", "Production"]).describe("Environment type").default("PreProduction").optional(),
        namespace: z.string().describe("Kubernetes namespace for chaos infrastructure").default("hce").optional(),
      }),
      annotations: {
        title: "Chaos Onboarding (Terraform)",
        readOnlyHint: false,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        // Step 1: If no delegate_selectors provided, list delegates and return them
        if (!args.delegate_selectors || args.delegate_selectors.length === 0) {
          log.info("Listing delegates for user selection");
          const delegates = await listDelegates(client, config);

          if (delegates.length === 0) {
            return jsonResult({
              status: "no_delegates_found",
              message:
                "No delegates found in your Harness account. " +
                "Please install a Harness Delegate in your Kubernetes cluster first, " +
                "then call this tool again. " +
                "See: https://developer.harness.io/docs/platform/delegates/install-delegates/",
              next_step:
                "Install a Harness Delegate, then call harness_chaos_onboard again " +
                "with delegate_selectors set to the delegate's tag/selector.",
            });
          }

          const delegateList = delegates.map((d) => ({
            name: d.groupName ?? d.delegateGroupIdentifier ?? "unknown",
            identifier: d.delegateGroupIdentifier ?? d.delegateGroupId ?? "unknown",
            connected: d.activelyConnected ?? false,
            type: d.delegateType ?? "unknown",
            lastHeartbeat: d.lastHeartBeat
              ? new Date(d.lastHeartBeat).toISOString()
              : null,
          }));

          return jsonResult({
            status: "delegates_listed",
            message:
              "Found the following delegates. Ask the user which delegate to use, " +
              "then call harness_chaos_onboard again with delegate_selectors " +
              "set to the chosen delegate's name/identifier.",
            delegates: delegateList,
            next_step:
              "Ask the user to choose a delegate from the list above, " +
              "then call harness_chaos_onboard with delegate_selectors=[\"<chosen_delegate_name>\"].",
            example_call:
              'harness_chaos_onboard(delegate_selectors=["<delegate_name>"], output_dir="./chaos-onboarding-tf")',
          });
        }

        // Step 2: Generate Terraform files
        const outputDir = resolve(args.output_dir);
        if (!existsSync(outputDir)) {
          mkdirSync(outputDir, { recursive: true });
        }

        const providerTf = generateTerraformProvider(config.HARNESS_BASE_URL);
        const variablesTf = generateVariablesTf();
        const mainTf = generateMainTf();
        const tfvars = generateTfvarsTemplate(
          config.HARNESS_ACCOUNT_ID,
          args.delegate_selectors,
        );

        writeFileSync(resolve(outputDir, "provider.tf"), providerTf, "utf-8");
        writeFileSync(resolve(outputDir, "variables.tf"), variablesTf, "utf-8");
        writeFileSync(resolve(outputDir, "main.tf"), mainTf, "utf-8");
        writeFileSync(resolve(outputDir, "terraform.tfvars"), tfvars, "utf-8");

        const readmeContent = `# Chaos Engineering Onboarding — Terraform

Generated by \`harness-chaos-advisor-agent\`.

## What This Creates

1. **Harness Organization** — \`${args.org_name ?? "Chaos Engineering"}\`
2. **Harness Project** — \`${args.project_name ?? "Chaos Onboarding"}\`
3. **Kubernetes Connector** — using delegate selector(s): \`${args.delegate_selectors.join(", ")}\`
4. **Harness Environment** — \`${args.environment_name ?? "Chaos Environment"}\` (${args.environment_type ?? "PreProduction"})
5. **Infrastructure Definition** — KubernetesDirect in namespace \`${args.namespace ?? "hce"}\`
6. **Chaos Infrastructure** — enables chaos on the K8s infra
7. **Service Discovery Agent** — auto-discovers services in the cluster

## Usage

\`\`\`bash
# 1. Set your API key
export TF_VAR_harness_api_key="pat.xxxxx.xxxxx.xxxxx"

# 2. Initialize Terraform
terraform init

# 3. Review the plan
terraform plan

# 4. Apply
terraform apply
\`\`\`

## Files

| File | Purpose |
|------|---------|
| \`provider.tf\` | Harness Terraform provider configuration |
| \`variables.tf\` | All input variables with defaults |
| \`main.tf\` | Resource definitions (org, project, connector, env, infra, discovery agent) |
| \`terraform.tfvars\` | Pre-filled variable values (edit as needed) |

## Customization

Edit \`terraform.tfvars\` to change names, identifiers, namespaces, or environment type before applying.
`;
        writeFileSync(resolve(outputDir, "README.md"), readmeContent, "utf-8");

        log.info("Terraform files generated", { outputDir });

        return jsonResult({
          status: "terraform_generated",
          message: `Terraform configuration written to ${outputDir}`,
          output_dir: outputDir,
          files: [
            "provider.tf",
            "variables.tf",
            "main.tf",
            "terraform.tfvars",
            "README.md",
          ],
          resources_to_create: [
            "harness_platform_organization",
            "harness_platform_project",
            "harness_platform_connector_kubernetes",
            "harness_platform_environment",
            "harness_platform_infrastructure",
            "harness_chaos_infrastructure_v2",
            "harness_service_discovery_agent",
          ],
          delegate_selectors: args.delegate_selectors,
          next_steps: [
            `cd ${outputDir}`,
            'export TF_VAR_harness_api_key="your-api-key"',
            "terraform init",
            "terraform plan",
            "terraform apply",
          ],
        });
      } catch (err) {
        if (isUserError(err)) return errorResult(err.message);
        if (isUserFixableApiError(err)) return errorResult(err.message);
        throw toMcpError(err);
      }
    },
  );
}
