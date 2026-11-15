# Remote state for bootstrap. gs://new-hanafuda-tfstate already exists.
# The bucket name must match var.state_bucket_name and
# infra/new-hanafuda/backend.tf. backend.tf.example is the same block, for a
# first apply in a project where this bucket does not exist yet.
terraform {
  backend "gcs" {
    bucket = "new-hanafuda-tfstate"
    prefix = "bootstrap"
  }
}
