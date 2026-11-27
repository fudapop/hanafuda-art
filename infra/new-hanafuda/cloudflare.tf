resource "cloudflare_r2_bucket" "static" {
  account_id = var.cloudflare_account_id
  name       = "fudapop-static"
  location   = "enam"
}

resource "cloudflare_r2_custom_domain" "static_domain" {
  account_id  = var.cloudflare_account_id
  bucket_name = cloudflare_r2_bucket.static.name
  domain      = "assets.fudapop.com"
  enabled     = true
  zone_id     = var.cloudflare_zone_id
  min_tls     = "1.2"
}

# Public, credential-free reads for browser fetches and cached audio seeking.
# Existing CDN responses must be refreshed after applying this policy.
resource "cloudflare_r2_bucket_cors" "static" {
  account_id  = var.cloudflare_account_id
  bucket_name = cloudflare_r2_bucket.static.name
  rules = [{
    id = "public-asset-reads"
    allowed = {
      origins = ["*"]
      methods = ["GET", "HEAD"]
      headers = ["Range"]
    }
    expose_headers  = ["Content-Range", "Accept-Ranges", "Content-Length"]
    max_age_seconds = 3600
  }]
}

# Archive source bytes separately from the existing public derivative bucket.
# Placement is a hint, not a residency guarantee. See ../r2-card-assets.md.
resource "cloudflare_r2_bucket" "private" {
  account_id    = var.cloudflare_account_id
  name          = "fudapop-private"
  location      = "enam"
  jurisdiction  = "default"
  storage_class = "Standard"

  lifecycle {
    prevent_destroy = true
  }
}

# Custom domains and r2.dev are independent public access paths.
# No custom domain may be attached to the originals archive.
resource "cloudflare_r2_managed_domain" "no_custom" {
  account_id   = var.cloudflare_account_id
  bucket_name  = cloudflare_r2_bucket.private.name
  jurisdiction = cloudflare_r2_bucket.private.jurisdiction
  enabled      = false
}
