resource "google_project_service" "required" {
  for_each = local.services

  project = var.project_id
  service = each.value

  # Destroying this stack must not turn APIs off. Firebase, Firestore, and
  # billing stay enabled for the running game.
  disable_on_destroy         = false
  disable_dependent_services = false
}
