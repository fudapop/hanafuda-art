# Public static objects and imgproxy. The game still requests Supabase URLs.
# Cloudflare hostnames are documented in infra/README.md. This stack does not
# manage DNS. storage, run, and artifactregistry are enabled in infra/bootstrap.

module "static_bucket" {
  source = "../modules/static-bucket"

  project_id   = var.project_id
  name         = var.static_bucket_name
  location     = local.static_region
  cors_origins = local.static_cors_origins
}

module "imgproxy" {
  source = "../modules/imgproxy"

  project_id             = var.project_id
  project_number         = data.google_project.current.number
  region                 = local.static_region
  bucket_name            = module.static_bucket.name
  terraform_apply_member = "serviceAccount:terraform-apply@${var.project_id}.iam.gserviceaccount.com"
  # Supabase card faces use width=120 and resize=contain. fit with height 0
  # keeps the aspect ratio and does not enlarge. card2x is the same fit at 240.
  presets   = "card=rs:fit:120:0,card2x=rs:fit:240:0"
  image_tag = "v4.0.24"
}
