# =============================================================================
# Service Discovery Agent — appended by harness-chaos-advisor-agent
# =============================================================================

variable "discovery_agent_name" {
  description = "Name of the service discovery agent"
  type        = string
  default     = "chaos-discovery-agent"
}

variable "discovery_org_identifier" {
  description = "Organization identifier for the discovery agent"
  type        = string
}

variable "discovery_project_identifier" {
  description = "Project identifier for the discovery agent"
  type        = string
}

variable "discovery_environment_identifier" {
  description = "Environment identifier for the discovery agent"
  type        = string
}

variable "discovery_infra_identifier" {
  description = "Infrastructure identifier for the discovery agent"
  type        = string
}

variable "discovery_namespace" {
  description = "Kubernetes namespace for service discovery"
  type        = string
  default     = "hce"
}

resource "harness_service_discovery_agent" "chaos_discovery" {
  name                   = var.discovery_agent_name
  org_identifier         = var.discovery_org_identifier
  project_identifier     = var.discovery_project_identifier
  environment_identifier = var.discovery_environment_identifier
  infra_identifier       = var.discovery_infra_identifier
  installation_type      = "CONNECTED"

  config {
    kubernetes {
      namespace = var.discovery_namespace
    }
  }
}

output "discovery_agent_name" {
  description = "Service discovery agent name"
  value       = harness_service_discovery_agent.chaos_discovery.name
}
