variable "project_id" {
  type        = string
  description = "Existing Google Cloud project. This stack does not create a project."
  default     = "new-hanafuda"
}

variable "region" {
  type        = string
  description = <<-EOT
    Default region for regional resources in this stack.
    TODO: the region is not decided. The Cloud Storage Always Free tier covers
    only us-central1, us-east1, and us-west1. Use the same region as the
    bootstrap state bucket. Leave this empty until a region is chosen; nothing
    in this stack is regional yet.
  EOT
  default     = ""
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
