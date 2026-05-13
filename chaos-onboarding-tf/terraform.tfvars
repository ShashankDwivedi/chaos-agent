# Harness Chaos Onboarding — terraform.tfvars

harness_account_id = "SxuV0ChbRqWGSYClFlMQMQ"
harness_api_key    = "pat.SxuV0ChbRqWGSYClFlMQMQ.6915a15f5176ec4f502fe8f6.xXH1gkbbuSWnIkv6mhgQ"

# Delegate selectors (from your chosen delegate)
delegate_selectors = ["shashank-delegate"]

# Organization
org_name       = "Chaos Engineering"
org_identifier = "chaos_engineering"

# Project
project_name       = "Chaos Onboarding"
project_identifier = "chaos_onboarding"

# Kubernetes Connector
k8s_connector_name       = "Chaos K8s Connector"
k8s_connector_identifier = "chaos_k8s_connector"

tags = {
  "managed_by" = "terraform"
  "purpose"    = "chaos-onboarding"
}
