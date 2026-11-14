data "google_project" "current" {
  project_id = var.project_id
}

# Deploys Firestore rules and indexes through `firebase deploy`. This stack
# does not manage the rules files, the indexes, or Firebase Auth templates.
resource "google_service_account" "firestore_deploy" {
  project      = var.project_id
  account_id   = "firestore-deploy"
  display_name = "GitHub Actions Firestore rules deploy"
  description  = "Releases Firestore rules and indexes from main. No JSON key."

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_project_iam_member" "firestore_deploy" {
  for_each = local.firestore_deploy_roles

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.firestore_deploy.email}"
}

resource "google_service_account_iam_member" "firestore_deploy_wif" {
  service_account_id = google_service_account.firestore_deploy.name
  role               = "roles/iam.workloadIdentityUser"
  member             = local.firestore_deploy_principal
}
