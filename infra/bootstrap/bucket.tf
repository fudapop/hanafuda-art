resource "google_storage_bucket" "tfstate" {
  name                        = var.state_bucket_name
  project                     = var.project_id
  location                    = var.region
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = false

  versioning {
    enabled = true
  }

  labels = {
    managed-by = "terraform"
    purpose    = "terraform-state"
  }

  depends_on = [google_project_service.required]

  lifecycle {
    prevent_destroy = true
  }
}

# objectAdmin and objectViewer do not include storage.buckets.get. Terraform's
# GCS backend calls that during init. legacyBucketReader is the predefined
# role that grants it, and it is attached only to this bucket.
resource "google_storage_bucket_iam_member" "terraform_plan_objects" {
  bucket = google_storage_bucket.tfstate.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.terraform_plan.email}"
}

resource "google_storage_bucket_iam_member" "terraform_plan_bucket" {
  bucket = google_storage_bucket.tfstate.name
  role   = "roles/storage.legacyBucketReader"
  member = "serviceAccount:${google_service_account.terraform_plan.email}"
}

# terraform init locks state even when -lock=false is only documented for
# migrations. Limit that write to lock objects so the plan identity cannot
# replace the state file.
resource "google_storage_bucket_iam_member" "terraform_plan_lock" {
  bucket = google_storage_bucket.tfstate.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.terraform_plan.email}"

  condition {
    title       = "terraform lock objects only"
    description = "Create and delete Terraform lock files, not state."
    expression  = "resource.name.endsWith('.tflock')"
  }
}

resource "google_storage_bucket_iam_member" "terraform_apply_objects" {
  bucket = google_storage_bucket.tfstate.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.terraform_apply.email}"
}

resource "google_storage_bucket_iam_member" "terraform_apply_bucket" {
  bucket = google_storage_bucket.tfstate.name
  role   = "roles/storage.legacyBucketReader"
  member = "serviceAccount:${google_service_account.terraform_apply.email}"
}
