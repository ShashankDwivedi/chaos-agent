variable "harness_account_id" {
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
