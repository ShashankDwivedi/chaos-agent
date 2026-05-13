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
  description = "Delegate selectors (tags) for the Kubernetes connector"
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

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default = {
    "managed_by" = "terraform"
    "purpose"    = "chaos-onboarding"
  }
}
