output "pool_name" {
  description = "Full resource name of the Workload Identity pool."
  value       = google_iam_workload_identity_pool.github.name
}

output "provider_name" {
  description = "Full resource name of the primary GitHub OIDC provider. This is the GCP_WORKLOAD_IDENTITY_PROVIDER value."
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "additional_provider_names" {
  description = "Full resource names of the additional providers, keyed by provider id."
  value       = { for id, provider in google_iam_workload_identity_pool_provider.additional : id => provider.name }
}
