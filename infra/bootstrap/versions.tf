# Pinned on purpose. Bump Terraform and the Google provider together, then
# refresh .terraform.lock.hcl with `terraform providers lock`.
terraform {
  required_version = "1.17.2"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "8.11.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region

  # Lets a user ADC call APIs that bill the project. Service-account auth
  # used by GitHub Actions does not need this, and CI does not apply bootstrap.
  billing_project       = var.project_id
  user_project_override = true
}
