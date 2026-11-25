# Pinned on purpose. Bump Terraform and the Google provider together, then
# refresh .terraform.lock.hcl with `terraform providers lock`.
terraform {
  required_version = "1.17.2"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "8.11.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "5.29.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region != "" ? var.region : null

  # Required for billing budgets when planning with user ADC. CI uses the
  # terraform-apply service account, which also needs serviceusage.services.use
  # on this project (granted in infra/bootstrap).
  billing_project       = var.project_id
  user_project_override = true
}

provider "cloudflare" {}
