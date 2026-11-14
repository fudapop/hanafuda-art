module "budget" {
  count  = local.budget_enabled ? 1 : 0
  source = "../modules/budget"

  billing_account_id = trimspace(var.billing_account_id)
  amount             = trimspace(var.budget_amount)
  project_number     = data.google_project.current.number
  display_name       = "new-hanafuda"

  depends_on = [terraform_data.budget_inputs]
}
