output "uri" {
  description = "Default Cloud Run URL. Cloudflare proxies img.fudapop.com to this host. The game does not call it yet."
  value       = google_cloud_run_v2_service.imgproxy.uri
}

output "service_account_email" {
  description = "Runtime service account. It can get objects in the static bucket and nothing else. No JSON key."
  value       = google_service_account.imgproxy.email
}

output "image" {
  description = "Image Cloud Run pulls through the Docker Hub remote repository."
  value       = local.image
}

output "repository_id" {
  description = "Artifact Registry repository id."
  value       = google_artifact_registry_repository.dockerhub.repository_id
}
