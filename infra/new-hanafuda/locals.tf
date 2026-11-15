locals {
  github_repository         = "fudapop/hanafuda-art"
  workload_identity_pool_id = "github"

  # Same provider resource the Firestore deploy workflow reads from
  # GCP_WORKLOAD_IDENTITY_PROVIDER. The pool and provider are created in
  # infra/bootstrap; this stack only binds the deploy service account to it.
  workload_identity_provider = "projects/${data.google_project.current.number}/locations/global/workloadIdentityPools/${local.workload_identity_pool_id}/providers/github"

  # attribute.ref, not attribute.repository. The pool also has a pull-request
  # provider, and a repository principal would let those tokens deploy rules.
  # The shared provider also rejects pull_request_target. This member requires
  # the ref again, because that pool still has a pull-request provider.
  firestore_deploy_principal = "principalSet://iam.googleapis.com/projects/${data.google_project.current.number}/locations/global/workloadIdentityPools/${local.workload_identity_pool_id}/attribute.ref/refs/heads/main"

  # Same main-branch limit as Firestore deploy. The translation workflow runs
  # from main. A repository principal would let a pull request call Vertex AI.
  translate_principal = "principalSet://iam.googleapis.com/projects/${data.google_project.current.number}/locations/global/workloadIdentityPools/${local.workload_identity_pool_id}/attribute.ref/refs/heads/main"

  budget_amount_set   = trimspace(var.budget_amount) != ""
  billing_account_set = trimspace(var.billing_account_id) != ""
  budget_enabled      = local.budget_amount_set && local.billing_account_set

  # Cloud Run and Artifact Registry need a region. TF_VAR_region is empty
  # until one is chosen, and an empty GitHub variable overrides the Terraform
  # default. us-central1 is the first Cloud Storage Always Free region named
  # in infra/README.md. Set TF_VAR_region before the first apply to use
  # another region. Changing it later replaces the service and the registry.
  static_region = trimspace(var.region) != "" ? trimspace(var.region) : "us-central1"
  static_cors_extra_origins = [
    for origin in split(",", var.static_cors_extra_origins) : trimspace(origin)
    if trimspace(origin) != ""
  ]
  static_cors_origins = distinct(concat(
    [
      "https://newhanafuda.art",
      "https://www.newhanafuda.art",
      "https://play.fudapop.com",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:8888",
    ],
    local.static_cors_extra_origins,
  ))
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
