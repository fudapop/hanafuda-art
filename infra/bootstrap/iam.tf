resource "google_service_account" "terraform_plan" {
  project      = var.project_id
  account_id   = "terraform-plan"
  display_name = "GitHub Actions Terraform plan"
  description  = "Read-only identity for terraform plan on pull requests. No JSON key."

  depends_on = [google_project_service.required]

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_service_account" "terraform_apply" {
  project      = var.project_id
  account_id   = "terraform-apply"
  display_name = "GitHub Actions Terraform apply"
  description  = "Applies infra/new-hanafuda from main after a GitHub environment approval. No JSON key."

  depends_on = [google_project_service.required]

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_project_iam_member" "terraform_plan" {
  for_each = local.terraform_plan_roles

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.terraform_plan.email}"
}

resource "google_project_iam_member" "terraform_apply" {
  for_each = local.terraform_apply_roles

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.terraform_apply.email}"
}

# Bucket metadata only. storage.admin and roles/viewer can read object bytes.
# These roles do not include storage.objects.get or storage.objects.list.
resource "google_project_iam_custom_role" "terraform_plan_storage" {
  project     = var.project_id
  role_id     = "terraformPlanStorage"
  title       = "Terraform plan storage metadata"
  description = "Read bucket metadata during terraform plan. Does not grant object read."
  permissions = [
    "storage.buckets.get",
    "storage.buckets.getIamPolicy",
    "storage.buckets.list",
  ]
  stage = "GA"

  depends_on = [google_project_service.required]
}

resource "google_project_iam_custom_role" "terraform_apply_storage" {
  project     = var.project_id
  role_id     = "terraformApplyStorage"
  title       = "Terraform apply storage buckets"
  description = "Create and configure buckets during terraform apply. Does not grant object read."
  permissions = [
    "storage.buckets.create",
    "storage.buckets.delete",
    "storage.buckets.get",
    "storage.buckets.getIamPolicy",
    "storage.buckets.list",
    "storage.buckets.setIamPolicy",
    "storage.buckets.update",
  ]
  stage = "GA"

  depends_on = [google_project_service.required]
}

resource "google_project_iam_member" "terraform_plan_storage" {
  project = var.project_id
  role    = google_project_iam_custom_role.terraform_plan_storage.id
  member  = "serviceAccount:${google_service_account.terraform_plan.email}"
}

resource "google_project_iam_member" "terraform_apply_storage" {
  project = var.project_id
  role    = google_project_iam_custom_role.terraform_apply_storage.id
  member  = "serviceAccount:${google_service_account.terraform_apply.email}"
}
