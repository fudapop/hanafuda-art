mock_provider "cloudflare" {}
mock_provider "google" {}

variables {
  cloudflare_account_id = "00000000000000000000000000000000"
  cloudflare_zone_id    = "11111111111111111111111111111111"
}

run "public_asset_cors" {
  command = plan

  assert {
    condition     = cloudflare_r2_bucket_cors.static.bucket_name == cloudflare_r2_bucket.static.name
    error_message = "CORS must target the public derivative bucket."
  }

  assert {
    condition = (
      length(cloudflare_r2_bucket_cors.static.rules) == 1 &&
      toset(cloudflare_r2_bucket_cors.static.rules[0].allowed.origins) == toset(["*"]) &&
      toset(cloudflare_r2_bucket_cors.static.rules[0].allowed.methods) == toset(["GET", "HEAD"]) &&
      toset(cloudflare_r2_bucket_cors.static.rules[0].allowed.headers) == toset(["Range"])
    )
    error_message = "Public asset CORS must allow credential-free reads and Range requests, not writes."
  }

  assert {
    condition = toset(cloudflare_r2_bucket_cors.static.rules[0].expose_headers) == toset([
      "Content-Range", "Accept-Ranges", "Content-Length"
    ])
    error_message = "Browser audio consumers must be able to read range and length headers."
  }

  assert {
    condition     = cloudflare_r2_managed_domain.no_custom.enabled == false
    error_message = "The private originals bucket must keep its public managed domain disabled."
  }
}
