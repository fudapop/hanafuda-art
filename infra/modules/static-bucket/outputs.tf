output "name" {
  description = "Bucket name."
  value       = google_storage_bucket.static.name
}

output "url" {
  description = "Path-style base URL. Object keys are appended, matching the Supabase static bucket."
  value       = "https://storage.googleapis.com/${google_storage_bucket.static.name}"
}

output "uploader_email" {
  description = "Service account operators impersonate when copying or uploading objects. It has no JSON key."
  value       = google_service_account.uploader.email
}
