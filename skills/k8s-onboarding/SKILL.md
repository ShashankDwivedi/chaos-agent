# Chaos Engineering Onboarding

Automates the full Kubernetes chaos onboarding flow using the `harness_chaos_onboard` MCP tool. The tool orchestrates a multi-step interactive workflow combining Harness Terraform provider resources and Harness REST APIs.

## What Gets Created

| Step | Method | Resource | Purpose |
|------|--------|----------|---------|
| 1 | Terraform | `harness_platform_organization` | Harness Organization to house the chaos project |
| 2 | Terraform | `harness_platform_project` | Harness Project scoped to the org |
| 3 | Interactive | Delegate selection | User picks an existing delegate for cluster access |
| 4 | Terraform | `harness_platform_connector_kubernetes` | K8s Connector using delegate assume-role method |
| 5 | REST API | `POST /ng/api/infrastructures` | Harness Infrastructure Definition (KubernetesDirect) |
| 6 | REST API | `POST /gateway/chaos/manager/api/rest/v2/infrastructure` | Enable Chaos v2 on the infrastructure |
| 7 | Terraform | `harness_service_discovery_agent` | Auto-discovers services in the K8s cluster |

## Workflow

### Step 1: List Delegates

Call the onboarding tool **without** `delegate_selectors` to fetch available delegates:

```
harness_chaos_onboard()
```

This returns a list of delegates with their names, connection status, and types. Present the list to the user and ask them to choose one.

### Step 2: Ask User to Choose a Delegate

After receiving the delegate list, ask the user which delegate to use. The user provides the delegate name or identifier.

If **no delegates are found**, tell the user to install a Kubernetes-based delegate first and point them to:
https://developer.harness.io/docs/platform/delegates/install-delegates/

### Step 3: Create Org, Project, and K8s Connector via Terraform

Call the tool with the chosen delegate and step `create_terraform`:

```
harness_chaos_onboard(
  step="create_terraform",
  delegate_selectors=["chosen-delegate-name"],
  output_dir="./chaos-onboarding-tf",
  org_name="My Chaos Org",
  project_name="My Chaos Project"
)
```

This generates Terraform files for **Organization**, **Project**, and **Kubernetes Connector** (using delegate assume-role method), then guides the user to apply them.

### Step 4: Guide the User to Apply Terraform

Tell the user to run:

```bash
cd ./chaos-onboarding-tf
export TF_VAR_harness_api_key="pat.xxxxx.xxxxx.xxxxx"
terraform init
terraform plan
terraform apply
```

### Step 5: Create Infrastructure Definition via REST API

After Terraform apply succeeds, call the tool with step `create_infrastructure`:

```
harness_chaos_onboard(
  step="create_infrastructure",
  org_identifier="my_chaos_org",
  project_identifier="my_chaos_project",
  environment_name="Chaos Environment",
  environment_type="PreProduction",
  k8s_connector_identifier="chaos_k8s_connector",
  infrastructure_name="Chaos K8s Infrastructure",
  namespace="hce"
)
```

This creates the Harness Environment and Infrastructure Definition via the REST API (`POST /ng/api/infrastructures`).

### Step 6: Enable Chaos v2 via REST API

Ask the user for the **Kubernetes namespace** and **Service Account name** for chaos components. Then call:

```
harness_chaos_onboard(
  step="enable_chaos",
  org_identifier="my_chaos_org",
  project_identifier="my_chaos_project",
  environment_identifier="chaos_environment",
  infrastructure_identifier="chaos_k8s_infra",
  chaos_namespace="hce",
  chaos_service_account="hce"
)
```

This enables Chaos v2 on the infrastructure via `POST /gateway/chaos/manager/api/rest/v2/infrastructure`.

### Step 7: Create Discovery Agent via Terraform

Call the tool with step `create_discovery_agent`:

```
harness_chaos_onboard(
  step="create_discovery_agent",
  output_dir="./chaos-onboarding-tf",
  org_identifier="my_chaos_org",
  project_identifier="my_chaos_project",
  environment_identifier="chaos_environment",
  infrastructure_identifier="chaos_k8s_infra",
  discovery_namespace="hce",
  discovery_service_account="hce"
)
```

This appends the `harness_service_discovery_agent` Terraform resource and the user applies it.

## Customization Options

| Parameter | Default | Description |
|-----------|---------|-------------|
| `org_name` | Chaos Engineering | Organization display name |
| `org_identifier` | chaos_engineering | Organization ID |
| `project_name` | Chaos Onboarding | Project display name |
| `project_identifier` | chaos_onboarding | Project ID |
| `environment_name` | Chaos Environment | Environment name |
| `environment_type` | PreProduction | PreProduction or Production |
| `namespace` | hce | K8s namespace for infrastructure |
| `chaos_namespace` | hce | K8s namespace for chaos components |
| `chaos_service_account` | hce | K8s service account for chaos |
| `output_dir` | ./chaos-onboarding-tf | Where to write Terraform files |

## Prerequisites

Before running onboarding, the user needs:

1. **Harness account** with API key (PAT or service account token)
2. **Harness Delegate** installed in their Kubernetes cluster
3. **Terraform** installed locally (>= 1.0)
4. **Harness Terraform provider** (auto-downloaded by `terraform init`)

If no delegates are found, guide the user to install one first:
https://developer.harness.io/docs/platform/delegates/install-delegates/

## API Reference

### Infrastructure Definition (Step 5)
- **Endpoint**: `POST /ng/api/infrastructures?accountIdentifier={accountId}`
- **Body**: JSON with `yaml` field containing the infrastructure YAML

### Chaos v2 Infrastructure (Step 6)
- **Endpoint**: `POST /gateway/chaos/manager/api/rest/v2/infrastructure?accountIdentifier={accountId}`
- **Body**: JSON with `identity`, `name`, `orgIdentifier`, `projectIdentifier`, `environmentID`, `namespace`, `serviceAccount`, `infraType`

## Terraform Provider Reference

All Terraform resources use the [Harness Terraform Provider](https://registry.terraform.io/providers/harness/harness/latest/docs):

- [harness_platform_organization](https://registry.terraform.io/providers/harness/harness/latest/docs/resources/platform_organization)
- [harness_platform_project](https://registry.terraform.io/providers/harness/harness/latest/docs/resources/platform_project)
- [harness_platform_connector_kubernetes](https://registry.terraform.io/providers/harness/harness/latest/docs/resources/platform_connector_kubernetes)
- [harness_service_discovery_agent](https://registry.terraform.io/providers/harness/harness/latest/docs/resources/service_discovery_agent)
