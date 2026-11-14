# Vertex AI Gemini for the content translation workflow. This stack does not
# call the model and does not manage the translated files.
resource "google_project_service" "aiplatform" {
  project = var.project_id
  service = "aiplatform.googleapis.com"

  disable_on_destroy         = false
  disable_dependent_services = false
}

resource "google_service_account" "translate" {
  project      = var.project_id
  account_id   = "hanafuda-github-translate"
  display_name = "GitHub Actions content translation"
  description  = "Calls Vertex AI Gemini from GitHub Actions. No JSON key."

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_project_iam_member" "translate" {
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.translate.email}"

  depends_on = [google_project_service.aiplatform]
}

resource "google_service_account_iam_member" "translate_wif" {
  service_account_id = google_service_account.translate.name
  role               = "roles/iam.workloadIdentityUser"
  member             = local.translate_principal
}
