output "gcp_workload_identity_provider" {
  description = "Value for the GitHub variable GCP_WORKLOAD_IDENTITY_PROVIDER."
  value       = local.workload_identity_provider
}

output "gcp_project_id" {
  description = "Value for the GitHub variable GCP_PROJECT_ID."
  value       = var.project_id
}

output "gcp_firestore_deploy_service_account" {
  description = "Value for the GitHub variable GCP_FIRESTORE_DEPLOY_SERVICE_ACCOUNT."
  value       = google_service_account.firestore_deploy.email
}

output "gcp_translate_service_account" {
  description = "Value for the GitHub variable GCP_TRANSLATE_SERVICE_ACCOUNT."
  value       = google_service_account.translate.email
}

output "billing_budget" {
  description = "Budget resource name, or null when the billing account and amount are unset."
  value       = one(module.budget[*].name)
}
