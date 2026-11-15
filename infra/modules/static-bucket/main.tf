resource "google_storage_bucket" "static" {
  name                        = var.name
  project                     = var.project_id
  location                    = var.location
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "inherited"
  force_destroy               = false

  cors {
    origin          = var.cors_origins
    method          = ["GET", "HEAD", "OPTIONS"]
    response_header = ["Content-Type", "Content-Length", "Cache-Control", "ETag", "Accept-Ranges"]
    max_age_seconds = 3600
  }

  labels = {
    managed-by = "terraform"
    purpose    = "static-assets"
  }

  lifecycle {
    prevent_destroy = true
  }
}

# objectViewer includes storage.objects.list. legacyObjectReader is the
# predefined role that grants only storage.objects.get. Browsers and imgproxy
# fetch known keys. They do not list the bucket. Same reason the state bucket
# uses legacyBucketReader for buckets.get.
resource "google_storage_bucket_iam_member" "public_read" {
  bucket = google_storage_bucket.static.name
  role   = "roles/storage.legacyObjectReader"
  member = "allUsers"
}

resource "google_service_account" "uploader" {
  project      = var.project_id
  account_id   = var.uploader_account_id
  display_name = "Static asset uploader"
  description  = "Writes objects in the public static bucket. No JSON key. Operators impersonate this account."

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_storage_bucket_iam_member" "uploader_objects" {
  bucket = google_storage_bucket.static.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.uploader.email}"
}

# objectAdmin does not include storage.buckets.get. rclone calls that when it
# opens the bucket.
resource "google_storage_bucket_iam_member" "uploader_bucket" {
  bucket = google_storage_bucket.static.name
  role   = "roles/storage.legacyBucketReader"
  member = "serviceAccount:${google_service_account.uploader.email}"
}
