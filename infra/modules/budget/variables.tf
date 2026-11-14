variable "billing_account_id" {
  type        = string
  description = "Billing account id, with or without the billingAccounts/ prefix. There is no default: the caller supplies the account."

  validation {
    condition     = can(regex("^(billingAccounts/)?[0-9A-Fa-f]{6}-[0-9A-Fa-f]{6}-[0-9A-Fa-f]{6}$", var.billing_account_id))
    error_message = "billing_account_id must look like 012345-6789AB-CDEF01 or billingAccounts/012345-6789AB-CDEF01."
  }
}

variable "amount" {
  type        = string
  description = "Budget for each calendar month, in whole currency units. \"25\" with the default currency is $25. There is no default."

  validation {
    condition     = can(regex("^[1-9][0-9]*$", var.amount))
    error_message = "amount must be a positive whole number of currency units, without a decimal point."
  }
}

variable "currency_code" {
  type        = string
  description = "ISO 4217 currency code for the budget amount."
  default     = "USD"

  validation {
    condition     = can(regex("^[A-Z]{3}$", var.currency_code))
    error_message = "currency_code must be a three-letter ISO currency code."
  }
}

variable "project_number" {
  type        = string
  description = "Numeric project number the budget applies to. Spend in other projects on the same billing account is ignored."

  validation {
    condition     = can(regex("^[0-9]+$", var.project_number))
    error_message = "project_number must be the numeric Google Cloud project number."
  }
}

variable "display_name" {
  type        = string
  description = "Name shown on the budget in the billing console."

  validation {
    condition     = length(var.display_name) > 0 && length(var.display_name) <= 60
    error_message = "display_name must be 1-60 characters."
  }
}

variable "notification_channel_ids" {
  type        = list(string)
  description = "Optional Monitoring notification channel ids. Billing account administrators are notified either way."
  default     = []
}
