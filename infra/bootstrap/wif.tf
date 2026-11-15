module "github_wif" {
  source = "../modules/github-wif"

  project_id            = var.project_id
  pool_id               = "github"
  pool_display_name     = "GitHub Actions"
  provider_id           = "github"
  provider_display_name = "GitHub OIDC"
  attribute_condition   = local.main_provider_condition

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

# GitHub puts the environment name in the subject only for jobs that declare
# that environment. The main provider still requires refs/heads/main. A job on
# main that skips the terraform environment gets a different subject and cannot
# impersonate this account. The pull-request provider rejects environment
# subjects, so a pull request cannot exchange this one either.
resource "google_service_account_iam_member" "terraform_apply" {
  service_account_id = google_service_account.terraform_apply.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principal://iam.googleapis.com/${module.github_wif.pool_name}/subject/repo:${local.github_repository}:environment:terraform"
}

# GitHub's default pull_request subject. This does not match a push to main.
# An organization-level custom subject claim would require a different member.
resource "google_service_account_iam_member" "terraform_plan" {
  service_account_id = google_service_account.terraform_plan.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principal://iam.googleapis.com/${module.github_wif.pool_name}/subject/repo:${local.github_repository}:pull_request"
}
