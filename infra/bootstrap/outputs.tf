output "state_bucket" {
  description = "Remote state bucket. infra/new-hanafuda and, after migration, this directory store state here."
  value       = google_storage_bucket.tfstate.name
}

output "gcp_workload_identity_provider" {
  description = "Value for the GitHub variable GCP_WORKLOAD_IDENTITY_PROVIDER. Used by Terraform apply and by the Firestore deploy workflow."
  value       = module.github_wif.provider_name
}

output "gcp_terraform_plan_workload_identity_provider" {
  description = "Value for the GitHub variable GCP_TERRAFORM_PLAN_WORKLOAD_IDENTITY_PROVIDER."
  value       = module.github_wif.additional_provider_names[local.plan_provider_id]
}

output "gcp_terraform_plan_service_account" {
  description = "Value for the GitHub variable GCP_TERRAFORM_PLAN_SERVICE_ACCOUNT."
  value       = google_service_account.terraform_plan.email
}

output "gcp_terraform_apply_service_account" {
  description = "Value for the GitHub variable GCP_TERRAFORM_APPLY_SERVICE_ACCOUNT."
  value       = google_service_account.terraform_apply.email
}
