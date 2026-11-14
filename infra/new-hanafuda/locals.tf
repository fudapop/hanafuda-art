locals {
  workload_identity_pool_id = "github"

  # Same provider resource the Firestore deploy workflow reads from
  # GCP_WORKLOAD_IDENTITY_PROVIDER. The pool and provider are created in
  # infra/bootstrap; this stack only binds the deploy service account to it.
  workload_identity_provider = "projects/${data.google_project.current.number}/locations/global/workloadIdentityPools/${local.workload_identity_pool_id}/providers/github"

  # attribute.ref, not attribute.repository. The pool also has a pull-request
  # provider, and a repository principal would let those tokens deploy rules.
  # The provider condition still requires repository=='fudapop/hanafuda-art'
  # && ref=='refs/heads/main'. This member requires the ref again.
  firestore_deploy_principal = "principalSet://iam.googleapis.com/projects/${data.google_project.current.number}/locations/global/workloadIdentityPools/${local.workload_identity_pool_id}/attribute.ref/refs/heads/main"

  budget_amount_set   = trimspace(var.budget_amount) != ""
  billing_account_set = trimspace(var.billing_account_id) != ""
  budget_enabled      = local.budget_amount_set && local.billing_account_set
  firestore_deploy_roles = toset([
    "roles/firebaserules.admin",
    "roles/datastore.indexAdmin",
    "roles/firebase.viewer",
  ])
}

resource "terraform_data" "budget_inputs" {
  lifecycle {
    precondition {
      condition     = local.budget_amount_set == local.billing_account_set
      error_message = "Set billing_account_id and budget_amount together, or leave both empty to skip the budget."
    }
  }
}
