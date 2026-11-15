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
