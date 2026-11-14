# Bucket name must match infra/bootstrap var.state_bucket_name (default
# new-hanafuda-tfstate). CI plans and applies only this directory.
terraform {
  backend "gcs" {
    bucket = "new-hanafuda-tfstate"
    prefix = "new-hanafuda"
  }
}
