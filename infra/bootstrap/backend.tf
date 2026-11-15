# Copy to backend.tf only after the first bootstrap apply has created the
# bucket. Then run: terraform init -migrate-state
# The bucket name must match var.state_bucket_name and
# infra/new-hanafuda/backend.tf.
terraform {
  backend "gcs" {
    bucket = "new-hanafuda-tfstate"
    prefix = "bootstrap"
  }
}
