variable "project_id" {
  type        = string
  description = "Existing Google Cloud project. This stack does not create a project."
  default     = "new-hanafuda"
}

variable "region" {
  type        = string
  description = <<-EOT
    Region for Cloud Run, Artifact Registry, and the static asset bucket.
    The Cloud Storage Always Free tier covers only us-central1, us-east1, and
    us-west1. Use the same region as the bootstrap state bucket when that
    bucket is in one of those regions. Leave this empty to use us-central1.
    Cloud Run cannot use a multi-region location such as us.
  EOT
  default     = ""

  validation {
    condition     = trimspace(var.region) == "" || can(regex("^[a-z]+(?:-[a-z]+)+[0-9]$", trimspace(var.region)))
    error_message = "region must be empty or a Google Cloud region such as us-central1. Cloud Run cannot use a multi-region location such as us."
  }
}

variable "static_bucket_name" {
  type        = string
  description = "Public GCS bucket for cards, avatars, audio, and other static objects. Keys match the Supabase static bucket."
  default     = "fudapop-static"

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9._-]{1,61}[a-z0-9]$", var.static_bucket_name))
    error_message = "static_bucket_name must be a valid Cloud Storage bucket name."
  }
}

variable "static_cors_extra_origins" {
  type        = string
  description = <<-EOT
    Comma-separated extra browser origins for the static bucket CORS policy.
    Leave empty to allow only the built-in origins. GCS does not accept a
    wildcard inside a hostname, so each Cloudflare Pages preview origin is
    listed here, for example https://abc123.project.pages.dev.
  EOT
  default     = ""

  validation {
    condition = alltrue([
      for origin in split(",", var.static_cors_extra_origins) :
      trimspace(origin) == "" || can(regex("^https?://[A-Za-z0-9.-]+(?::[0-9]+)?$", trimspace(origin)))
    ])
    error_message = "static_cors_extra_origins must be a comma-separated list of http(s) origins, without paths or wildcards."
  }
}

variable "billing_account_id" {
  type        = string
  description = "Billing account id for the monthly budget. Leave empty, together with budget_amount, to skip the budget. There is no default account."
  default     = ""
}

variable "budget_amount" {
  type        = string
  description = "Monthly budget in whole USD. Leave empty, together with billing_account_id, to skip the budget. There is no default amount."
  default     = ""
}
