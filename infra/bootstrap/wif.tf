module "github_wif" {
  source = "../modules/github-wif"

  project_id            = var.project_id
  pool_id               = "github"
  pool_display_name     = "GitHub Actions"
  provider_id           = "github"
  provider_display_name = "GitHub OIDC"
  attribute_condition   = local.main_provider_condition
  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
    "attribute.event_name" = "assertion.event_name"
  }

  additional_providers = {
    (local.plan_provider_id) = {
      display_name        = "GitHub OIDC pull requests"
      description         = "Pull-request tokens from fudapop/hanafuda-art, used only by the read-only Terraform plan identity. Disabled until enable_pull_request_provider is true."
      attribute_condition = local.plan_provider_condition
      disabled            = !var.enable_pull_request_provider
    }
  }

  depends_on = [google_project_service.required, terraform_data.main_provider_condition]
}

# Separate pool so a token accepted by github or github-pull-request cannot
# match the apply binding. Bindings are pool-wide.
module "github_wif_apply" {
  source = "../modules/github-wif"

  project_id            = var.project_id
  pool_id               = local.apply_pool_id
  pool_display_name     = "GitHub Actions Terraform apply"
  pool_description      = "Only jobs on main that use the terraform GitHub environment."
  provider_id           = local.apply_provider_id
  provider_display_name = "GitHub OIDC Terraform apply"
  provider_description  = "Tokens whose subject is the terraform environment on refs/heads/main."
  attribute_condition   = local.apply_provider_condition
  attribute_mapping = {
    "google.subject"        = "assertion.sub"
    "attribute.repository"  = "assertion.repository"
    "attribute.ref"         = "assertion.ref"
    "attribute.environment" = "assertion.environment"
  }

  depends_on = [google_project_service.required, terraform_data.main_provider_condition]
}

# Exact subject, and only in the apply pool. The provider condition also
# requires that subject, refs/heads/main, and environment terraform.
resource "google_service_account_iam_member" "terraform_apply" {
  service_account_id = google_service_account.terraform_apply.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principal://iam.googleapis.com/${module.github_wif_apply.pool_name}/subject/${local.apply_subject}"
}

# GitHub's default pull_request subject. This does not match a push to main.
# An organization-level custom subject claim would require a different member.
resource "google_service_account_iam_member" "terraform_plan" {
  service_account_id = google_service_account.terraform_plan.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principal://iam.googleapis.com/${module.github_wif.pool_name}/subject/repo:${local.github_repository}:pull_request"
}
