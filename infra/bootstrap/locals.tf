locals {
  # Locked to this repository. The main provider condition is the string the
  # Firestore deploy setup requires: repository and refs/heads/main.
  github_repository       = "fudapop/hanafuda-art"
  main_provider_condition = "assertion.repository=='${local.github_repository}' && assertion.ref=='refs/heads/main'"

  # Pull-request tokens use refs/pull/<number>/merge, so they cannot satisfy
  # the main provider. A second provider in the same pool accepts only those
  # refs, and only from this repository, for the read-only plan identity.
  plan_provider_id        = "github-pull-request"
  plan_provider_condition = "assertion.repository=='${local.github_repository}' && assertion.ref.startsWith('refs/pull/')"

  services = toset([
    "cloudresourcemanager.googleapis.com",
    "serviceusage.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "sts.googleapis.com",
    "storage.googleapis.com",
    "cloudbilling.googleapis.com",
    "billingbudgets.googleapis.com",
    "firebase.googleapis.com",
    "firebaserules.googleapis.com",
    "firestore.googleapis.com",
  ])

  # Read what the CI-managed stack contains. This is not roles/viewer: that
  # role can read Firestore and Cloud Storage data.
  terraform_plan_roles = toset([
    "roles/browser",
    "roles/iam.securityReviewer",
    "roles/iam.serviceAccountViewer",
    "roles/serviceusage.serviceUsageConsumer",
    "roles/serviceusage.serviceUsageViewer",
  ])

  # projectIamAdmin can grant any project role, including owner. The managed
  # stack needs it to attach the Firestore deploy roles and roles/aiplatform.user.
  # serviceUsageAdmin lets that stack enable aiplatform.googleapis.com. It can
  # also disable APIs; the managed service sets disable_on_destroy to false.
  # Neither role is roles/editor or roles/owner.
  terraform_apply_roles = toset([
    "roles/browser",
    "roles/iam.securityReviewer",
    "roles/iam.serviceAccountAdmin",
    "roles/resourcemanager.projectIamAdmin",
    "roles/serviceusage.serviceUsageAdmin",
    "roles/serviceusage.serviceUsageConsumer",
  ])
}

resource "terraform_data" "main_provider_condition" {
  lifecycle {
    precondition {
      condition     = local.main_provider_condition == "assertion.repository=='fudapop/hanafuda-art' && assertion.ref=='refs/heads/main'"
      error_message = "The main GitHub provider must stay locked to fudapop/hanafuda-art on refs/heads/main."
    }
  }
}
