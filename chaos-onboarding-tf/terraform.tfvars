# Harness Chaos Onboarding — terraform.tfvars
# Fill in your values and run: terraform init && terraform apply

harness_account_id = "SxuV0ChbRqWGSYClFlMQMQ"
harness_api_key    = ""  # Set via TF_VAR_harness_api_key env var for security

# Delegate selectors (from your chosen delegate)
delegate_selectors = ["my-k8s-delegate"]

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
