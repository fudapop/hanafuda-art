resource "cloudflare_r2_bucket" "assets" {
  account_id = var.cloudflare_account_id
  name       = "fudapop-static-assets"
  location   = "enam"
}

resource "cloudflare_r2_custom_domain" "assets_domain" {
  account_id  = var.cloudflare_account_id
  bucket_name = cloudflare_r2_bucket.assets.name
  domain      = "assets.fudapop.com"
  enabled     = true
  zone_id     = var.cloudflare_zone_id
  min_tls     = "1.2"
}
