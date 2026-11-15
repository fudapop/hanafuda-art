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

output "static_region" {
  description = "Region used for the static bucket, Artifact Registry, and imgproxy."
  value       = local.static_region
}

output "static_bucket_name" {
  description = "Public static asset bucket."
  value       = module.static_bucket.name
}

output "static_bucket_url" {
  description = "Path-style base URL for objects. The game still requests Supabase until a later change."
  value       = module.static_bucket.url
}

output "static_uploader_service_account" {
  description = "Service account to impersonate for rclone and scripts/upload-to-gcs.ts. No JSON key."
  value       = module.static_bucket.uploader_email
}

output "imgproxy_uri" {
  description = "Cloud Run URL. Point img.fudapop.com at this host from Cloudflare. The game does not call it yet."
  value       = module.imgproxy.uri
}

output "imgproxy_service_account" {
  description = "imgproxy runtime service account. Object get on the static bucket only."
  value       = module.imgproxy.service_account_email
}

output "imgproxy_image" {
  description = "Pinned imgproxy image pulled through the Docker Hub remote repository."
  value       = module.imgproxy.image
}
