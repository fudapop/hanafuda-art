variable "project_id" {
  type        = string
  description = "Existing Google Cloud project. This stack does not create a project."
  default     = "new-hanafuda"
}

variable "region" {
  type        = string
  description = <<-EOT
    Region for the Terraform state bucket.
    TODO: the region is not decided. Set it in terraform.tfvars before the first apply.
    The Cloud Storage Always Free tier covers only us-central1, us-east1, and us-west1.
    A bucket in any other region is billed.
  EOT

  validation {
    condition     = length(trimspace(var.region)) > 0
    error_message = "Set region before applying bootstrap. See the TODO in this variable's description. Cloud Storage Always Free covers only us-central1, us-east1, and us-west1."
  }
}

variable "enable_pull_request_provider" {
  type        = bool
  description = <<-EOT
    Enable the github-pull-request Workload Identity provider.
    Leave this false until any repository-wide firestore-deploy binding is gone.
    That binding matches every provider in the pool. Enabling this provider while
    it still exists lets a pull-request workflow assume firestore-deploy.
  EOT
  default     = false
}

variable "state_bucket_name" {
  type        = string
  description = "Globally unique name of the remote state bucket. Keep this identical to the bucket in infra/new-hanafuda/backend.tf and infra/bootstrap/backend.tf.example."
  default     = "new-hanafuda-tfstate"

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9._-]{1,61}[a-z0-9]$", var.state_bucket_name))
    error_message = "state_bucket_name must be a valid Cloud Storage bucket name."
  }
}
