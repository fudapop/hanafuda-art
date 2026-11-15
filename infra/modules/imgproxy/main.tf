locals {
  # Docker Hub image darthsim/imgproxy, pulled through the remote repository
  # rather than from Docker Hub at runtime. The tag is pinned in variables.
  image = "${google_artifact_registry_repository.dockerhub.location}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.dockerhub.repository_id}/darthsim/imgproxy:${var.image_tag}"

  # gs:// is off unless IMGPROXY_USE_GCS is set. v4 also has a bucket allowlist
  # separate from IMGPROXY_ALLOWED_SOURCES. The trailing slash is required so
  # a prefix such as gs://bucket.evil/ does not match.
  # AUTO_WEBP and AUTO_AVIF are the current names. ENABLE_WEBP_DETECTION and
  # ENABLE_AVIF_DETECTION are deprecated aliases of the same settings.
  # Detection applies when the imgproxy URL omits an output extension.
  # Key and salt stay unset, so the first path segment is an unchecked
  # placeholder (insecure, or any other word). Presets and the source
  # allowlist are the restrictions on this public service.
  env = {
    IMGPROXY_USE_GCS             = "true"
    IMGPROXY_ALLOWED_SOURCES     = "gs://${var.bucket_name}/"
    IMGPROXY_GCS_ALLOWED_BUCKETS = var.bucket_name
    IMGPROXY_ONLY_PRESETS        = "true"
    IMGPROXY_PRESETS             = var.presets
    IMGPROXY_TTL                 = "31536000"
    IMGPROXY_AUTO_WEBP           = "true"
    IMGPROXY_AUTO_AVIF           = "true"
    IMGPROXY_BIND                = ":8080"
    IMGPROXY_MAX_SRC_FILE_SIZE   = tostring(var.max_src_file_bytes)
  }
}

resource "google_service_account" "imgproxy" {
  project      = var.project_id
  account_id   = "imgproxy"
  display_name = "imgproxy"
  description  = "Cloud Run runtime identity for imgproxy. Object get on the static bucket only. No JSON key."

  lifecycle {
    prevent_destroy = true
  }
}

# Cloud Run refuses to attach a runtime account unless the deployer has
# iam.serviceAccounts.actAs on it. serviceAccountAdmin can set this policy.
# It cannot act as the account by itself.
resource "google_service_account_iam_member" "terraform_apply" {
  service_account_id = google_service_account.imgproxy.name
  role               = "roles/iam.serviceAccountUser"
  member             = var.terraform_apply_member
}

resource "google_storage_bucket_iam_member" "runtime" {
  bucket = var.bucket_name
  role   = "roles/storage.legacyObjectReader"
  member = "serviceAccount:${google_service_account.imgproxy.email}"
}

resource "google_artifact_registry_repository" "dockerhub" {
  project       = var.project_id
  location      = var.region
  repository_id = var.repository_id
  description   = "Pull-through cache of public Docker Hub images for Cloud Run."
  format        = "DOCKER"
  mode          = "REMOTE_REPOSITORY"

  remote_repository_config {
    description = "Docker Hub"
    docker_repository {
      public_repository = "DOCKER_HUB"
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

# Cloud Run pulls images as the serverless robot service agent, not as the
# runtime service account. The agent is created when the Run API is enabled.
# Binding a member that does not exist yet is valid. The grant applies once
# Google creates the agent.
resource "google_artifact_registry_repository_iam_member" "cloud_run_agent" {
  project    = var.project_id
  location   = google_artifact_registry_repository.dockerhub.location
  repository = google_artifact_registry_repository.dockerhub.repository_id
  role       = "roles/artifactregistry.reader"
  member     = "serviceAccount:service-${var.project_number}@serverless-robot-prod.iam.gserviceaccount.com"
}

resource "google_cloud_run_v2_service" "imgproxy" {
  name     = "imgproxy"
  project  = var.project_id
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  # Public invoke without an allUsers binding. Domain restricted sharing
  # often rejects allUsers. Cloudflare sends no Google identity token, so
  # the invoker check has to be off. Presets and the source allowlist are
  # what keep the proxy on this bucket.
  invoker_iam_disabled = true
  deletion_protection  = true
  launch_stage         = "GA"

  scaling {
    min_instance_count = 0
    max_instance_count = var.max_instance_count
  }

  template {
    service_account                  = google_service_account.imgproxy.email
    timeout                          = "30s"
    execution_environment            = "EXECUTION_ENVIRONMENT_GEN2"
    max_instance_request_concurrency = 1

    containers {
      image = local.image

      ports {
        container_port = 8080
        name           = "http1"
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "1Gi"
        }
        # resources is set, so cpu_idle must be set too. true keeps CPU
        # allocated only while a request is running.
        cpu_idle          = true
        startup_cpu_boost = true
      }

      dynamic "env" {
        for_each = local.env
        iterator = setting
        content {
          name  = setting.key
          value = setting.value
        }
      }

      startup_probe {
        timeout_seconds   = 1
        period_seconds    = 3
        failure_threshold = 20
        http_get {
          path = "/health"
          port = 8080
        }
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  depends_on = [
    google_artifact_registry_repository_iam_member.cloud_run_agent,
    google_service_account_iam_member.terraform_apply,
    google_storage_bucket_iam_member.runtime,
  ]
}
