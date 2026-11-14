output "gcp_workload_identity_provider" {
  description = "Value for the GitHub variable GCP_WORKLOAD_IDENTITY_PROVIDER."
  value       = local.workload_identity_provider
}

output "gcp_firestore_deploy_service_account" {
  description = "Value for the GitHub variable GCP_FIRESTORE_DEPLOY_SERVICE_ACCOUNT."
  value       = google_service_account.firestore_deploy.email
}

output "billing_budget" {
  description = "Budget resource name, or null when the billing account and amount are unset."
  value       = one(module.budget[*].name)
}
