variable "project_id" {
  type        = string
  description = "Google Cloud project that owns the service and the remote repository."
}

variable "project_number" {
  type        = string
  description = "Numeric project number. Used to grant the Cloud Run service agent reader on the remote repository."

  validation {
    condition     = can(regex("^[0-9]+$", var.project_number))
    error_message = "project_number must be the numeric Google Cloud project number."
  }
}

variable "region" {
  type        = string
  description = "Region for Cloud Run and the Artifact Registry remote repository."

  validation {
    condition     = can(regex("^[a-z]+(?:-[a-z]+)+[0-9]$", var.region))
    error_message = "region must be a Google Cloud region such as us-central1."
  }
}

variable "bucket_name" {
  type        = string
  description = "GCS bucket imgproxy may read. The only allowed source."
}

variable "terraform_apply_member" {
  type        = string
  description = "Member that deploys this service. It receives roles/iam.serviceAccountUser on the runtime account. roles/iam.serviceAccountAdmin does not include iam.serviceAccounts.actAs."

  validation {
    condition     = can(regex("^serviceAccount:[^@]+@[^@]+\\.iam\\.gserviceaccount\\.com$", var.terraform_apply_member))
    error_message = "terraform_apply_member must look like serviceAccount:name@project.iam.gserviceaccount.com."
  }
}

variable "repository_id" {
  type        = string
  description = "Artifact Registry repository id for the Docker Hub pull-through cache."
  default     = "dockerhub"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,61}[a-z0-9]$", var.repository_id))
    error_message = "repository_id must be a valid Artifact Registry repository id."
  }
}

variable "image_tag" {
  type        = string
  description = "Pinned darthsim/imgproxy tag. Do not use latest."
  default     = "v4.0.24"

  validation {
    condition     = can(regex("^v[0-9]+\\.[0-9]+\\.[0-9]+$", var.image_tag))
    error_message = "image_tag must be a pinned release tag such as v4.0.24."
  }
}

variable "presets" {
  type        = string
  description = "IMGPROXY_PRESETS value. card matches Supabase width=120 resize=contain. card2x is the same fit at 240."
  default     = "card=rs:fit:120:0,card2x=rs:fit:240:0"

  validation {
    condition     = length(var.presets) > 0 && !strcontains(var.presets, " ") && strcontains(var.presets, "card=") && strcontains(var.presets, "card2x=")
    error_message = "presets must include card and card2x, with no spaces."
  }
}

variable "max_src_file_bytes" {
  type        = number
  description = "IMGPROXY_MAX_SRC_FILE_SIZE. Rejects larger source objects on this public unsigned proxy."
  default     = 20971520

  validation {
    condition     = var.max_src_file_bytes > 0 && var.max_src_file_bytes <= 52428800
    error_message = "max_src_file_bytes must be between 1 and 52428800 (50 MiB)."
  }
}

variable "max_instance_count" {
  type        = number
  description = "Cap on Cloud Run instances. The service scales to zero."
  default     = 10

  validation {
    condition     = var.max_instance_count >= 1 && var.max_instance_count <= 20
    error_message = "max_instance_count must be from 1 to 20."
  }
}
