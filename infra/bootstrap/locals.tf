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
    # Enabled here so a plan of the static-asset stack can read Cloud Run and
    # Artifact Registry after this bootstrap apply. The managed stack does not
    # enable them again.
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudbilling.googleapis.com",
    "billingbudgets.googleapis.com",
    "firebase.googleapis.com",
    "firebaserules.googleapis.com",
    "firestore.googleapis.com",
  ])

  # Read what the CI-managed stack contains. This is not roles/viewer: that
  # role can read Firestore and Cloud Storage data.
  # run.viewer and artifactregistry.reader are for the static-assets stack.
  # reader can also pull images. It is the predefined role that includes
  # artifactregistry.repositories.get. Bucket metadata is a custom role in
  # iam.tf. roles/storage.admin and roles/viewer can read object bytes, so
  # they are not used here.
  terraform_plan_roles = toset([
    "roles/browser",
    "roles/iam.securityReviewer",
    "roles/iam.serviceAccountViewer",
    "roles/serviceusage.serviceUsageConsumer",
    "roles/serviceusage.serviceUsageViewer",
    "roles/run.viewer",
    "roles/artifactregistry.reader",
  ])

  # projectIamAdmin can grant any project role, including owner. The managed
  # stack needs it to attach the Firestore deploy roles and roles/aiplatform.user.
  # serviceUsageAdmin lets that stack enable APIs, including aiplatform,
  # run, and artifactregistry. It can also disable APIs; the managed service
  # sets disable_on_destroy to false.
  # run.admin creates the imgproxy service. serviceAccountAdmin already
  # includes iam.serviceAccounts.actAs, which Cloud Run requires on the
  # runtime service account. repoAdmin creates the Docker Hub remote
  # repository and its IAM. Neither role is roles/editor or roles/owner.
  # Bucket create and bucket IAM are a custom role below so this identity
  # cannot read object bytes on the public bucket.
  terraform_apply_roles = toset([
    "roles/browser",
    "roles/iam.securityReviewer",
    "roles/iam.serviceAccountAdmin",
    "roles/resourcemanager.projectIamAdmin",
    "roles/serviceusage.serviceUsageAdmin",
    "roles/serviceusage.serviceUsageConsumer",
    "roles/run.admin",
    "roles/artifactregistry.repoAdmin",
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
