locals {
  # The shared pool also hosts the pull-request provider, so its bindings are
  # visible to every token that pool accepts. pull_request_target tokens have
  # ref refs/heads/main and subject repo:<repo>:pull_request. Reject that event
  # here. Firestore deploy runs as workflow_run, which still matches.
  github_repository = "fudapop/hanafuda-art"
  main_provider_condition = join(" && ", [
    "assertion.repository=='${local.github_repository}'",
    "assertion.ref=='refs/heads/main'",
    "assertion.event_name!='pull_request_target'",
  ])

  # Second safeguard. Apply now has its own pool, but a pull-request token must
  # still be unable to present an environment subject in this pool.
  plan_provider_id = "github-pull-request"
  plan_provider_condition = join(" && ", [
    "assertion.repository=='${local.github_repository}'",
    "assertion.ref.startsWith('refs/pull/')",
    "!assertion.sub.startsWith('repo:${local.github_repository}:environment:')",
  ])

  # Own pool, so no other provider's tokens can match the apply binding.
  # The apply job's subject is the environment form, and its ref stays main.
  apply_pool_id     = "github-terraform-apply"
  apply_provider_id = "github"
  apply_subject     = "repo:${local.github_repository}:environment:terraform"
  apply_provider_condition = join(" && ", [
    "assertion.repository=='${local.github_repository}'",
    "assertion.ref=='refs/heads/main'",
    "assertion.sub=='${local.apply_subject}'",
    "assertion.environment=='terraform'",
  ])

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
      condition     = local.main_provider_condition == "assertion.repository=='fudapop/hanafuda-art' && assertion.ref=='refs/heads/main' && assertion.event_name!='pull_request_target'"
      error_message = "The main GitHub provider must stay locked to fudapop/hanafuda-art on refs/heads/main and must reject pull_request_target."
    }
    precondition {
      condition     = local.apply_provider_condition == "assertion.repository=='fudapop/hanafuda-art' && assertion.ref=='refs/heads/main' && assertion.sub=='repo:fudapop/hanafuda-art:environment:terraform' && assertion.environment=='terraform'"
      error_message = "The Terraform apply provider must accept only the terraform environment on refs/heads/main."
    }
    precondition {
      condition     = strcontains(local.plan_provider_condition, "!assertion.sub.startsWith('repo:fudapop/hanafuda-art:environment:')")
      error_message = "The pull-request provider must reject GitHub environment subjects so it cannot mint the Terraform apply identity."
    }
  }
}
