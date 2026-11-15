variable "project_id" {
  type        = string
  description = "Google Cloud project that owns the bucket."
}

variable "name" {
  type        = string
  description = "Globally unique bucket name. Object keys match the Supabase static bucket."

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9._-]{1,61}[a-z0-9]$", var.name))
    error_message = "name must be a valid Cloud Storage bucket name."
  }
}

variable "location" {
  type        = string
  description = "Bucket location. Use the same region as Cloud Run imgproxy."

  validation {
    condition     = can(regex("^[a-z]+(?:-[a-z]+)+[0-9]$", var.location))
    error_message = "location must be a Google Cloud region such as us-central1."
  }
}

variable "cors_origins" {
  type        = list(string)
  description = "Browser origins allowed to read objects. Each entry is a full origin. GCS does not accept a wildcard inside a hostname."

  validation {
    condition = length(var.cors_origins) > 0 && alltrue([
      for origin in var.cors_origins : can(regex("^https?://[A-Za-z0-9.-]+(?::[0-9]+)?$", origin))
    ])
    error_message = "cors_origins must be a non-empty list of http(s) origins without paths or wildcards."
  }
}

variable "uploader_account_id" {
  type        = string
  description = "Account id of the service account that writes objects. No JSON key is created."
  default     = "static-uploader"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{4,28}[a-z0-9]$", var.uploader_account_id))
    error_message = "uploader_account_id must be a valid service account id."
  }
}
