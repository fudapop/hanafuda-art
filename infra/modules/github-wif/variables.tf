variable "project_id" {
  type        = string
  description = "Google Cloud project that owns the Workload Identity pool."
}

variable "pool_id" {
  type        = string
  description = "Workload Identity pool id. Immutable after creation."
  default     = "github"

  validation {
    condition     = can(regex("^[a-z0-9-]{4,32}$", var.pool_id))
    error_message = "pool_id must be 4-32 characters of lowercase letters, digits, and hyphens."
  }
}

variable "pool_display_name" {
  type        = string
  description = "Display name for the Workload Identity pool."
  default     = "GitHub Actions"
}

variable "pool_description" {
  type        = string
  description = "Description of the Workload Identity pool."
  default     = "GitHub Actions identities for this repository."
}

variable "provider_id" {
  type        = string
  description = "Id of the primary GitHub OIDC provider."
  default     = "github"

  validation {
    condition     = can(regex("^[a-z0-9-]{4,32}$", var.provider_id))
    error_message = "provider_id must be 4-32 characters of lowercase letters, digits, and hyphens."
  }
}

variable "provider_display_name" {
  type        = string
  description = "Display name for the primary GitHub OIDC provider."
  default     = "GitHub OIDC"
}

variable "provider_description" {
  type        = string
  description = "Description of the primary GitHub OIDC provider."
  default     = "GitHub OIDC tokens that pass the primary attribute condition."
}

variable "attribute_mapping" {
  type        = map(string)
  description = "Claims copied from the GitHub token. google.subject is required. Map every claim the attribute condition reads."
  default = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
  }
}

variable "attribute_condition" {
  type        = string
  description = "CEL condition for the primary provider. This is the trust boundary for tokens exchanged through that provider."

  validation {
    condition     = length(var.attribute_condition) > 0
    error_message = "attribute_condition must restrict which GitHub tokens the provider accepts."
  }
}

variable "additional_providers" {
  type = map(object({
    display_name        = string
    description         = string
    attribute_condition = string
    disabled            = optional(bool, false)
  }))
  description = "Extra OIDC providers in the same pool, keyed by provider id. Bindings are pool-wide, so each extra provider needs its own attribute condition. A disabled provider rejects tokens."
  default     = {}
}
