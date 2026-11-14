locals {
  billing_account_raw = trimspace(var.billing_account_id)
  billing_account_id  = startswith(local.billing_account_raw, "billingAccounts/") ? trimprefix(local.billing_account_raw, "billingAccounts/") : local.billing_account_raw
  billing_account     = "billingAccounts/${upper(local.billing_account_id)}"
}

resource "google_billing_budget" "this" {
  billing_account = local.billing_account
  display_name    = var.display_name

  budget_filter {
    projects               = ["projects/${var.project_number}"]
    credit_types_treatment = "INCLUDE_ALL_CREDITS"
    calendar_period        = "MONTH"
  }

  amount {
    specified_amount {
      currency_code = var.currency_code
      units         = var.amount
    }
  }

  # 50%, 90%, and 100% of actual spend for the month. Forecast alerts are
  # not configured.
  threshold_rules {
    threshold_percent = 0.5
    spend_basis       = "CURRENT_SPEND"
  }
  threshold_rules {
    threshold_percent = 0.9
    spend_basis       = "CURRENT_SPEND"
  }
  threshold_rules {
    threshold_percent = 1.0
    spend_basis       = "CURRENT_SPEND"
  }

  all_updates_rule {
    monitoring_notification_channels = var.notification_channel_ids
    disable_default_iam_recipients   = false
    enable_project_level_recipients  = false
  }
}
