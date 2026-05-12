terraform {
  required_providers {
    harness = {
      source  = "harness/harness"
      version = ">= 0.31.0"
    }
  }
}

provider "harness" {
  endpoint         = "https://app.harness.io"
  account_id       = var.harness_account_id
  platform_api_key = var.harness_api_key
}
