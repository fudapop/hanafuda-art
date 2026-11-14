output "name" {
  description = "Full resource name of the billing budget."
  value       = google_billing_budget.this.name
}

output "display_name" {
  description = "Display name of the billing budget."
  value       = google_billing_budget.this.display_name
}
