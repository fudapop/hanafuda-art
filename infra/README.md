# Infrastructure

Terraform for the `new-hanafuda` Google Cloud project. Nothing in this directory is applied by opening a pull request. Andre applies `infra/bootstrap` once from his own machine. After that, GitHub Actions plans `infra/new-hanafuda` on pull requests and applies it from `main` only after someone approves the GitHub environment.

Authentication is Workload Identity Federation through `google-github-actions/auth`. Do not create a JSON key.

Terraform 1.17.2 and the Google provider 8.11.0 are pinned in each root module. The lock files are `.terraform.lock.hcl`.

## Layout

| Path | What it manages | Who applies it |
| --- | --- | --- |
| `infra/bootstrap` | State bucket, APIs, Workload Identity pool and providers, Terraform plan and apply service accounts | Andre, once, from a machine with user credentials |
| `infra/new-hanafuda` | `firestore-deploy`, `hanafuda-github-translate`, the static asset bucket, imgproxy, and the monthly billing budget | GitHub Actions, from `main`, after approval |
| `infra/modules/github-wif` | Workload Identity pool and GitHub OIDC providers | Called by bootstrap |
| `infra/modules/budget` | A billing budget with alerts at 50%, 90%, and 100% of actual spend | Called by `new-hanafuda` |
| `infra/modules/static-bucket` | Public bucket `fudapop-static`, its CORS policy, and the uploader service account | Called by `new-hanafuda` |
| `infra/modules/imgproxy` | Docker Hub pull-through repository and Cloud Run imgproxy | Called by `new-hanafuda` |

`infra/bootstrap` stores its state in `gs://new-hanafuda-tfstate` with prefix `bootstrap`. That bucket already exists, so `backend.tf` is in git. `backend.tf.example` is the same block, for a first apply in a project where the bucket does not exist yet.

## Out of scope

- This Terraform does not create the Google Cloud project and does not attach a billing account.
- Firestore rules and indexes stay in `packages/frontend` and deploy with `firebase deploy`, the workflow from the Firestore rules pull request. Terraform only creates the identity that workflow assumes.
- Firebase Auth email templates are not managed here. Do not import or edit Identity Platform config to make Terraform quiet.
- Cloudflare DNS for `img.fudapop.com` and `assets.fudapop.com` is not in this Terraform. The manual steps are under Static assets. The game still requests Supabase URLs.

## One-time setup

Do these in order. Stop if a plan wants to destroy Firestore, Firebase Auth, or anything else this repository does not describe.

### 1. Confirm the project

The project `new-hanafuda` already exists. Do not create another one. Terraform will not create it.

```bash
gcloud projects describe new-hanafuda
gcloud billing projects describe new-hanafuda
```

If the billing description has no account, link the existing billing account before the budget can be created:

```bash
gcloud billing projects link new-hanafuda --billing-account=BILLING_ACCOUNT_ID
```

`BILLING_ACCOUNT_ID` is the id from `gcloud billing accounts list`, shaped like `012345-6789AB-CDEF01`.

### 2. Choose a region

The region is not decided. The Cloud Storage Always Free tier covers only `us-central1`, `us-east1`, and `us-west1`. The state bucket lives in whatever region you set. A bucket outside those three regions is billed.

```bash
cd infra/bootstrap
cp terraform.tfvars.example terraform.tfvars
```

Edit `region` in `terraform.tfvars`. Leave the project id as `new-hanafuda` unless that project is wrong. `terraform.tfvars` is gitignored.

Use the same region later for the GitHub variable `TF_VAR_region`. When that variable is empty, the static bucket, Artifact Registry, and imgproxy are created in `us-central1`. Set the variable before the first apply of those resources if the state bucket is in `us-east1` or `us-west1`. Cloud Run cannot use a multi-region location.

### 3. Create the GitHub environment before merging

GitHub creates an environment with no protection rules if a workflow names one that does not exist. Do this before the apply workflow runs on `main`.

In `fudapop/hanafuda-art` → Settings → Environments → New environment:

| Setting | Value |
| --- | --- |
| Name | `terraform` |
| Required reviewers | Add yourself |
| Deployment branches | Selected branches → `main` only |

The apply job waits in this environment until a reviewer approves it. The plan job does not use an environment.

### 4. Sign in, without a JSON key

```bash
gcloud auth application-default login
gcloud config set project new-hanafuda
```

The user needs to enable APIs, create a bucket, create service accounts, set project IAM, and create a Workload Identity pool. Project Owner on `new-hanafuda` covers that.

### 5. Import the Workload Identity pool if it already exists

Skip this step if you have not created the pool from the Firestore deploy pull request.

```bash
gcloud iam workload-identity-pools describe github \
  --project=new-hanafuda \
  --location=global
```

If that command finds the pool, import it before the first bootstrap apply. From `infra/bootstrap` after `terraform init`:

```bash
terraform init -input=false

terraform import module.github_wif.google_iam_workload_identity_pool.github \
  projects/new-hanafuda/locations/global/workloadIdentityPools/github

terraform import module.github_wif.google_iam_workload_identity_pool_provider.github \
  projects/new-hanafuda/locations/global/workloadIdentityPools/github/providers/github
```

Then `terraform plan`. You should see a new pull-request provider with `disabled = true`, a new pool `github-terraform-apply` and its provider, the state bucket, and the Terraform service accounts. You should not see Terraform replacing the `github` pool. An in-place change to the `github` provider is expected: its condition gains `assertion.event_name!='pull_request_target'`. That update does not recreate the provider. If the plan wants to recreate the `github` pool or provider, stop.

The pull request that adds Firestore deploy still documents the shorter condition. Do not recreate the provider from that text after this stack is applied. Firestore deploy itself still authenticates: that job runs from `workflow_run`, whose `event_name` is `workflow_run` and whose `ref` is `refs/heads/main`. A `pull_request_target` job is the one this clause rejects. Its `ref` is also `refs/heads/main`, and its subject is `repo:fudapop/hanafuda-art:pull_request`.

The pull-request provider (`github-pull-request`) and the apply pool are new. Do not import them. Leave `enable_pull_request_provider` false for this apply.

### 6. Apply bootstrap

From `infra/bootstrap`. `backend.tf` is committed and points at `gs://new-hanafuda-tfstate`, which already exists, so this init uses remote state.

```bash
terraform init -input=false
terraform plan
terraform apply
```

If the bucket does not exist yet, move `backend.tf` aside before these commands. `terraform init` would otherwise look for `new-hanafuda-tfstate` before this apply creates it. After the apply, move `backend.tf` back and run `terraform init -migrate-state`.

This creates:

- A versioned state bucket, `new-hanafuda-tfstate`, with uniform access and public access prevention. The name is global. If it is taken, change `state_bucket_name` and the bucket in `infra/bootstrap/backend.tf`, `infra/bootstrap/backend.tf.example`, and `infra/new-hanafuda/backend.tf` together.
- The APIs the rest of this stack calls. APIs are not disabled when this Terraform is destroyed.
- Workload Identity pool `github`.
- Provider `github`, whose condition is `assertion.repository=='fudapop/hanafuda-art' && assertion.ref=='refs/heads/main' && assertion.event_name!='pull_request_target'`. Firestore deploy and, once merged, content translation use this provider. Terraform apply does not.
- Provider `github-pull-request`, limited to this repository and `refs/pull/*`, created disabled. It also rejects tokens whose subject is a GitHub environment. That rejection stays as a second safeguard after the provider is enabled. A disabled provider rejects tokens. Leave it disabled until step 9. Bindings on this pool are visible to every provider in it, so enabling `github-pull-request` while a repository-wide `firestore-deploy` binding exists would let a pull request deploy rules.
- Workload Identity pool `github-terraform-apply` and provider `github`. Its condition requires this repository, `refs/heads/main`, subject `repo:fudapop/hanafuda-art:environment:terraform`, and `environment` claim `terraform`. Only `terraform-apply` is bound to this pool.
- Service accounts `terraform-plan` and `terraform-apply`, with no keys.
- Custom roles `terraformPlanStorage`, `terraformApplyStorage`, and `terraformApplyArtifactRegistry`. The storage roles read and update bucket metadata and do not grant object read. The Artifact Registry role creates repositories and sets their IAM. It does not grant artifact read or write. `terraform-apply` gets `roles/artifactregistry.reader` on the `dockerhub` repository only, because deploying Cloud Run requires the caller to read that image. `roles/run.admin` is on `terraform-apply`. `run.googleapis.com` and `artifactregistry.googleapis.com` are enabled here. Re-apply bootstrap after pulling this, or the static-asset plan fails with 403 or with the API disabled.

`terraform-plan` can read IAM, enabled APIs, project metadata, and the state object. It can also create and delete objects whose names end in `.tflock`, because `terraform init` locks state and `-lock=false` only skips the lock during a backend migration. It cannot replace the state file. It does not get `roles/viewer`, because that role can read Firestore and Cloud Storage data. It can read Cloud Run services and Artifact Registry repositories. The custom role `terraformPlanStorage` lets it read bucket metadata, not object bytes. Re-apply bootstrap after pulling this change or plan init fails with 403 on the lock object, and the static-asset plan fails with 403 on the bucket. `terraform-apply` can manage service accounts and project IAM, and it can enable APIs. `roles/resourcemanager.projectIamAdmin` can grant any project role; that is what lets it attach the Firestore and Vertex roles. `roles/serviceusage.serviceUsageAdmin` is what lets it enable `aiplatform.googleapis.com`. `run.googleapis.com` and `artifactregistry.googleapis.com` are enabled in this bootstrap apply, next to `storage.googleapis.com`, so the plan can read Cloud Run and Artifact Registry. `roles/run.admin` creates the imgproxy service. `roles/iam.serviceAccountAdmin` does not include `iam.serviceAccounts.actAs`. The managed stack grants `roles/iam.serviceAccountUser` on the imgproxy service account to `terraform-apply`. The custom role `terraformApplyArtifactRegistry` creates the Docker Hub remote repository and sets its IAM. It does not include `repositories.downloadArtifacts`. The managed stack grants `roles/artifactregistry.reader` on that repository to `terraform-apply` and to the Cloud Run service agent. `roles/artifactregistry.repoAdmin` does not include `repositories.create` or `repositories.setIamPolicy`. `roles/artifactregistry.admin` does, and it can read and write every artifact in the project. The custom role `terraformApplyStorage` creates buckets and sets bucket IAM. It does not grant object read. None of these roles is `roles/editor` or `roles/owner`. The managed API resource sets `disable_on_destroy` to false.

If you already applied an older bootstrap, apply this one again before the managed stack. The apply identity needs the service-usage admin role before it can enable Vertex AI.

Copy the outputs:

```bash
terraform output -raw gcp_project_id
terraform output -raw gcp_workload_identity_provider
terraform output -raw gcp_terraform_plan_workload_identity_provider
terraform output -raw gcp_terraform_apply_workload_identity_provider
terraform output -raw gcp_terraform_plan_service_account
terraform output -raw gcp_terraform_apply_service_account
```

### 7. Confirm bootstrap state is in the bucket

Bootstrap state is in `gs://new-hanafuda-tfstate` under prefix `bootstrap`. `infra/bootstrap/backend.tf` stays in git. CI does not apply bootstrap, and its validate step uses `terraform init -backend=false`, so that step does not need the bucket.

If state is still only in a local `terraform.tfstate`, migrate it:

```bash
terraform init -migrate-state
terraform state list
```

After `state list` shows the resources, delete the local `terraform.tfstate.backup`. Do not commit either state file.

### 8. Import the Firestore deploy identity if it already exists

Skip this step if you have not created `firestore-deploy` by hand.

The service account email is `firestore-deploy@new-hanafuda.iam.gserviceaccount.com`. From `infra/new-hanafuda`, with the state bucket already created:

```bash
terraform init -input=false

terraform import google_service_account.firestore_deploy \
  projects/new-hanafuda/serviceAccounts/firestore-deploy@new-hanafuda.iam.gserviceaccount.com
```

Import each project role that already exists. Skip a role the next command says is missing.

```bash
SA="serviceAccount:firestore-deploy@new-hanafuda.iam.gserviceaccount.com"

terraform import 'google_project_iam_member.firestore_deploy["roles/firebaserules.admin"]' \
  "new-hanafuda roles/firebaserules.admin ${SA}"

terraform import 'google_project_iam_member.firestore_deploy["roles/datastore.indexAdmin"]' \
  "new-hanafuda roles/datastore.indexAdmin ${SA}"

terraform import 'google_project_iam_member.firestore_deploy["roles/firebase.viewer"]' \
  "new-hanafuda roles/firebase.viewer ${SA}"
```

The Workload Identity binding from the Firestore deploy pull request allows every token from this repository, and the provider condition was what limited that to `main`. This pool now also accepts pull-request tokens, so the binding has to require `refs/heads/main` itself. Import the binding you actually created.

If you used the `attribute.repository` member from that pull request:

```bash
NUMBER="$(gcloud projects describe new-hanafuda --format='value(projectNumber)')"
OLD="principalSet://iam.googleapis.com/projects/${NUMBER}/locations/global/workloadIdentityPools/github/attribute.repository/fudapop/hanafuda-art"

terraform import google_service_account_iam_member.firestore_deploy_wif \
  "projects/new-hanafuda/serviceAccounts/firestore-deploy@new-hanafuda.iam.gserviceaccount.com roles/iam.workloadIdentityUser ${OLD}"
```

The next plan replaces that member with `attribute.ref/refs/heads/main`. Main-branch deploys still match. Pull-request tokens do not. Apply that replacement before step 9. It removes the wider binding.

If the binding is already `attribute.ref/refs/heads/main`, import that member instead of `OLD`.

Confirm the repository-wide member is gone:

```bash
gcloud iam service-accounts get-iam-policy \
  firestore-deploy@new-hanafuda.iam.gserviceaccount.com \
  --project=new-hanafuda \
  --format='value(bindings.members)'
```

On `firestore-deploy`, the output must not contain `attribute.repository/fudapop/hanafuda-art`. If that service account does not exist yet, there is no such binding. `hanafuda-github-translate` is also limited to `refs/heads/main`. If a repository-wide member was created for it, import that member and apply the replacement the same way.

`terraform plan` in this directory should show `hanafuda-github-translate`, `roles/aiplatform.user`, its main-branch Workload Identity binding, and `aiplatform.googleapis.com`. It shows the billing budget only when both budget variables are set. It must not show a new Firestore database, ruleset, or Auth config.

If `hanafuda-github-translate` already exists, import it before that apply:

```bash
terraform import google_service_account.translate \
  projects/new-hanafuda/serviceAccounts/hanafuda-github-translate@new-hanafuda.iam.gserviceaccount.com

terraform import google_project_iam_member.translate \
  "new-hanafuda roles/aiplatform.user serviceAccount:hanafuda-github-translate@new-hanafuda.iam.gserviceaccount.com"
```

If the Workload Identity member already exists, import the member that is actually on the account. A repository-wide member is replaced on the next apply by `attribute.ref/refs/heads/main`.

```bash
NUMBER="$(gcloud projects describe new-hanafuda --format='value(projectNumber)')"
TRANSLATE="principalSet://iam.googleapis.com/projects/${NUMBER}/locations/global/workloadIdentityPools/github/attribute.repository/fudapop/hanafuda-art"

terraform import google_service_account_iam_member.translate_wif \
  "projects/new-hanafuda/serviceAccounts/hanafuda-github-translate@new-hanafuda.iam.gserviceaccount.com roles/iam.workloadIdentityUser ${TRANSLATE}"
```

### 9. Enable the pull-request provider

Do this only after step 8. In `infra/bootstrap/terraform.tfvars`:

```hcl
enable_pull_request_provider = true
```

Then, from `infra/bootstrap`:

```bash
terraform apply
```

That sets `disabled = false` on `github-pull-request`. Until this apply, pull-request tokens cannot be exchanged, including tokens that would otherwise match a leftover repository-wide binding. The provider also rejects tokens whose subject is a GitHub environment, so a pull request cannot mint the Terraform apply identity by naming the `terraform` environment.

If `firestore-deploy` was never created, step 8 does not apply and this enable is safe on its own.

### 10. Grant billing roles when you want the budget

The billing account id and the amount are variables. Leave both unset and Terraform skips the budget. Set both and it creates a monthly budget on `new-hanafuda` with alerts at 50%, 90%, and 100% of actual spend. Billing administrators receive the alerts. Credits count toward the spend.

These roles are on the billing account, not the project. Terraform does not grant them. Do this before the first plan or apply that includes the budget, or the plan fails with a permission error.

```bash
BILLING="billingAccounts/BILLING_ACCOUNT_ID"

gcloud billing accounts add-iam-policy-binding "$BILLING" \
  --member="serviceAccount:terraform-plan@new-hanafuda.iam.gserviceaccount.com" \
  --role="roles/billing.viewer"

gcloud billing accounts add-iam-policy-binding "$BILLING" \
  --member="serviceAccount:terraform-apply@new-hanafuda.iam.gserviceaccount.com" \
  --role="roles/billing.costsManager"
```

There is no default amount. Pick one, for example `25` for $25.

### 11. Set GitHub Actions variables

In `fudapop/hanafuda-art` → Settings → Secrets and variables → Actions → Variables. These are identifiers, not secrets. Do not put them in Secrets, and do not add a JSON key.

| Variable | Value |
| --- | --- |
| `GCP_PROJECT_ID` | Bootstrap output `gcp_project_id`. `new-hanafuda` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Bootstrap output `gcp_workload_identity_provider`. Shape: `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github/providers/github` |
| `GCP_TERRAFORM_APPLY_WORKLOAD_IDENTITY_PROVIDER` | Bootstrap output `gcp_terraform_apply_workload_identity_provider`. Pool `github-terraform-apply`, provider `github` |
| `GCP_FIRESTORE_DEPLOY_SERVICE_ACCOUNT` | `firestore-deploy@new-hanafuda.iam.gserviceaccount.com` |
| `GCP_TRANSLATE_SERVICE_ACCOUNT` | `hanafuda-github-translate@new-hanafuda.iam.gserviceaccount.com` |
| `GCP_TERRAFORM_PLAN_WORKLOAD_IDENTITY_PROVIDER` | Bootstrap output `gcp_terraform_plan_workload_identity_provider`. The provider id is `github-pull-request` |
| `GCP_TERRAFORM_PLAN_SERVICE_ACCOUNT` | `terraform-plan@new-hanafuda.iam.gserviceaccount.com` |
| `GCP_TERRAFORM_APPLY_SERVICE_ACCOUNT` | `terraform-apply@new-hanafuda.iam.gserviceaccount.com` |
| `TF_VAR_region` | Optional. The region from step 2. Empty means the static bucket, Artifact Registry, and imgproxy use `us-central1`. Set this before the first apply of those resources if you want another region. Cloud Run cannot use a multi-region location |
| `TF_VAR_static_cors_extra_origins` | Optional. Comma-separated extra browser origins for the static bucket, such as `https://abc123.project.pages.dev`. Empty adds none. GCS does not accept a wildcard inside a hostname |
| `TF_VAR_billing_account_id` | Optional. The billing account id. Set together with the amount |
| `TF_VAR_budget_amount` | Optional. Whole US dollars, such as `25` |

`GCP_WORKLOAD_IDENTITY_PROVIDER` and `GCP_FIRESTORE_DEPLOY_SERVICE_ACCOUNT` are the names the Firestore deploy workflow reads. Plan uses the pull-request provider. Apply uses `GCP_TERRAFORM_APPLY_WORKLOAD_IDENTITY_PROVIDER`, the provider in pool `github-terraform-apply`. The shared `github` provider rejects `pull_request_target` as well as every ref other than `refs/heads/main`.

`GCP_PROJECT_ID` and `GCP_TRANSLATE_SERVICE_ACCOUNT` are the identity for content translation. This pull request does not add that workflow, and the Deno scripts in this checkout still call Gemini with `GEMINI_API_KEY`. The workflow that will use this service account is [pull request #90](https://github.com/fudapop/hanafuda-art/pull/90). It calls Vertex AI as `hanafuda-github-translate` (`roles/aiplatform.user`). The binding is `attribute.ref/refs/heads/main` on the `github` pool, the same limit as Firestore deploy. That workflow reads the email from `GCP_SERVICE_ACCOUNT`, so set `GCP_SERVICE_ACCOUNT` to the same address as `GCP_TRANSLATE_SERVICE_ACCOUNT` when #90 is merged. Until then, these two variables do not change how translation runs.

`terraform-apply` is bound only in pool `github-terraform-apply`, to the subject `repo:fudapop/hanafuda-art:environment:terraform`. The provider in that pool also requires `refs/heads/main` and the `environment` claim `terraform`. The apply job declares `environment: terraform`, which is what waits for approval and what puts that subject on the token. Another workflow on `main` does not get this subject, and a token from the shared `github` pool cannot match this binding. The environment name in GitHub, the provider condition, and the binding have to stay `terraform`.

`infra/new-hanafuda` prints the same identifiers after that stack has been applied:

```bash
terraform output -raw gcp_project_id
terraform output -raw gcp_workload_identity_provider
terraform output -raw gcp_firestore_deploy_service_account
terraform output -raw gcp_translate_service_account
```

The service account emails are the values in the table above either way. The translation email exists only after `infra/new-hanafuda` has been applied.

The repository is public. A plan comment includes the billing account id and the amount once those variables are set. Do not put secrets in `TF_VAR_` variables.

### 12. Merge, then approve the apply

Merging does not apply bootstrap. The apply workflow runs on `main` when `infra/` changes, waits for the `terraform` environment, and applies `infra/new-hanafuda`.

Until the plan variables exist, pull-request plans are skipped and the workflow says so. `terraform fmt` and `terraform validate` still run. After the variables exist, a failed plan fails the check.

Fork pull requests do not get the plan identity. A fork can still edit the workflow file, and GitHub's `pull_request` event runs that file. Keep the repository setting that requires approval before workflows run for first-time contributors. The plan identity is read-only; it can read the state file. Do not put secrets in Terraform state.

Do not change these workflows to `pull_request_target`. That event's token carries `refs/heads/main`, so it would pass the apply provider.

The plan locks state only long enough to read it, and both `terraform init` and `terraform plan` wait up to five minutes if another job holds the lock. The plan identity can write only `*.tflock` objects. The apply identity writes the state, and its init and apply wait the same five minutes.

## Static assets

This adds a public bucket and imgproxy. It does not change the URLs the game requests. Those stay on Supabase until a later change, after `img.fudapop.com` and `assets.fudapop.com` answer. Workload Identity conditions are unchanged. There is no Cloudflare provider in this repository, so DNS stays a manual step.

Object keys match the Supabase bucket `static` on project `ymoriyakbittfgocvxbw`: `cards/`, `avatars/`, `audio/`, `assets/`, and anything else already stored there.

| Resource | Name | Notes |
| --- | --- | --- |
| Bucket | `fudapop-static` | Uniform access. Public object get via `roles/storage.legacyObjectReader` for `allUsers`. That role is object get only, so the public cannot list keys. `public_access_prevention` stays `inherited`. Bucket names are global. If `fudapop-static` is taken, change `static_bucket_name` before the first apply. |
| Uploader | `static-uploader@new-hanafuda.iam.gserviceaccount.com` | Object admin on that bucket, plus bucket metadata get so rclone can open it. No JSON key. |
| imgproxy runtime | `imgproxy@new-hanafuda.iam.gserviceaccount.com` | Object get on that bucket only. No JSON key. Cloud Run uses Application Default Credentials. `IMGPROXY_GCS_KEY` is unset. |
| Repository | `dockerhub` | Artifact Registry remote repository. Upstream is public Docker Hub. No Docker Hub credentials are stored. |
| Cloud Run | `imgproxy` | Image `darthsim/imgproxy:v4.0.24`, pulled as `REGION-docker.pkg.dev/new-hanafuda/dockerhub/darthsim/imgproxy:v4.0.24`. Scales to zero, at most 10 instances, one request at a time, 1 CPU and 1 GiB. |

`storage.googleapis.com`, `run.googleapis.com`, and `artifactregistry.googleapis.com` are enabled in bootstrap, with `disable_on_destroy` left false. The managed stack does not enable them again. Vertex AI stays the API that `infra/new-hanafuda` enables itself.

imgproxy accepts only the presets `card` (`rs:fit:120:0`) and `card2x` (`rs:fit:240:0`). `fit` with height `0` keeps the aspect ratio and does not enlarge, which is the Supabase transform `width=120&resize=contain`. Sources are limited to `gs://fudapop-static/`. `IMGPROXY_TTL` is 31536000 seconds. WebP and AVIF detection are on (`IMGPROXY_AUTO_WEBP` and `IMGPROXY_AUTO_AVIF`; the older names `IMGPROXY_ENABLE_WEBP_DETECTION` and `IMGPROXY_ENABLE_AVIF_DETECTION` are aliases of those). Key and salt are unset, so URLs are unsigned. The first path segment can be any word. Examples use `insecure`. A source larger than 20 MiB is rejected.

The default Cloud Run URL is public because `invoker_iam_disabled` is true. That does not add an `allUsers` Cloud Run binding, which domain restricted sharing often blocks. The restrictions on the proxy are the preset list and the bucket allowlist.

### Apply order

Do this when bootstrap has already been applied from an older revision. A first-time bootstrap apply already includes the new roles.

1. From `infra/bootstrap`, on a machine with user credentials:

```bash
terraform init -input=false
terraform plan
terraform apply
```

The plan enables `run.googleapis.com` and `artifactregistry.googleapis.com`, and it adds the Cloud Run role plus the custom storage and Artifact Registry roles. It must not recreate the Workload Identity pools or providers. An in-place change that is not one of those roles or API enables is a reason to stop.

2. Set `TF_VAR_region` in GitHub if the static resources should not land in `us-central1`. Changing the region after the first apply replaces Cloud Run and the repository. The bucket location changes only by replacing the bucket, and `prevent_destroy` blocks that.

3. Merge, then approve the `terraform` environment. CI applies `infra/new-hanafuda`. The plan before step 1 fails with 403, because the plan identity cannot read the new resources yet. `terraform fmt` and `terraform validate` still pass.

4. If the apply fails while attaching the imgproxy service account or pulling `darthsim/imgproxy`, run it again. The `roles/iam.serviceAccountUser` binding and the Cloud Run service agent binding can each take a minute to propagate, and an anonymous Docker Hub pull can be rate-limited. This stack does not store Docker Hub credentials.

5. If the `allUsers` binding on the bucket fails, the organization is blocking public objects. `constraints/iam.allowedPolicyMemberDomains` has to allow `allUsers` for this project, and `constraints/storage.publicAccessPrevention` has to stay unset or unenforced. imgproxy can still read the bucket with its own service account. `assets.fudapop.com` cannot serve objects until the public binding exists.

6. Copy objects, then configure DNS. Both are below. The game keeps using Supabase until a later pull request.

After the apply, from `infra/new-hanafuda`:

```bash
terraform output static_region
terraform output static_bucket_url
terraform output static_uploader_service_account
terraform output imgproxy_uri
terraform output imgproxy_service_account
```

`imgproxy_uri` looks like `https://imgproxy-HASH.REGION.run.app`. The Cloudflare steps use the hostname with no scheme.

### Copy from Supabase

rclone copies keys unchanged from `supabase:static` to `gcs:fudapop-static`. `rclone copy` does not delete destination objects that are absent from the source.

Credentials:

| Side | What | Where it lives |
| --- | --- | --- |
| Supabase | S3 access key from Storage → S3 configuration. The secret is shown once and can read and write every bucket in the project. Copy the region from that same page. | The operator's rclone config, mode `600`, outside git. `scripts/rclone/rclone.conf` is gitignored. Revoke the key after the copy. Do not put it in GitHub Secrets for this change. |
| GCS | Application Default Credentials impersonating `static-uploader`. No JSON key. | `gcloud auth application-default login` on the machine that runs rclone. |

The example config is `scripts/rclone/static-assets.conf.example`. Copy it and fill in the Supabase key, secret, and region:

```bash
install -m 600 /dev/null ~/.config/rclone/rclone.conf
# paste the example, then edit the three YOUR_* values
```

Grant your user permission to impersonate the uploader. Terraform does not know your email, so this stays a manual binding. `USER_EMAIL` is the address you use with `gcloud auth login`.

```bash
gcloud auth login
gcloud auth application-default login
gcloud auth application-default set-quota-project new-hanafuda

gcloud iam service-accounts add-iam-policy-binding \
  static-uploader@new-hanafuda.iam.gserviceaccount.com \
  --project=new-hanafuda \
  --member="user:USER_EMAIL" \
  --role="roles/iam.serviceAccountTokenCreator"
```

Confirm both remotes, then copy and compare:

```bash
rclone lsd supabase:
rclone lsd gcs:fudapop-static

rclone copy supabase:static gcs:fudapop-static \
  --checksum \
  --fast-list \
  --transfers 8 \
  --progress

rclone check supabase:static gcs:fudapop-static --checksum
```

`lsd` on `supabase:` lists buckets. You want a bucket named `static`. `lsd` on `gcs:fudapop-static` lists key prefixes in that bucket. `static-uploader` cannot list every bucket in the project, so `rclone lsd gcs:` fails even when the copy credentials work. A signature error means the endpoint, region, or key does not match the dashboard. The endpoint in the example is `https://ymoriyakbittfgocvxbw.storage.supabase.co/storage/v1/s3`, which is the direct storage host. `force_path_style = true` is required. The GCS remote sets `env_auth = true` so rclone uses Application Default Credentials.

The live game still reads Supabase. A new file has to land in both places until the URL switch. Use `scripts/upload-to-static.ts` for Supabase and the command below for GCS, or upload to Supabase and run `rclone copy` again. `rclone copy` skips objects that are already the same.

### New uploads to GCS

From the repository root, with the same Application Default Credentials:

```bash
export GCS_IMPERSONATE_SERVICE_ACCOUNT=static-uploader@new-hanafuda.iam.gserviceaccount.com

deno task --config scripts/deno.json upload-to-gcs -- \
  --dir ./path/to/images \
  --path cards/cherry-version
```

`--path` is the key prefix. The script uploads one directory of images and does not descend into subdirectories, same as the Supabase script. Supported types are png, jpeg, gif, webp, and avif. Add `--upsert` to overwrite an object that already exists. Without it, an existing object is left in place. Audio files are not handled by this script. rclone copies those.

The script shells out to `gcloud auth application-default print-access-token`. It does not read `.env` and it does not take a key path. `GCS_STATIC_BUCKET` overrides the bucket name. The default is `fudapop-static`.

`pnpm test:upload-gcs` checks key and content-type helpers. It does not call Google.

### DNS

Do this after the apply, in the Cloudflare account that serves `fudapop.com`. Leave the records proxied (orange cloud) and set SSL/TLS mode to Full (strict).

Cloud Run rejects a request whose `Host` is `img.fudapop.com` unless that hostname is a mapped domain. A proxied CNAME forwards the browser `Host`. Something has to rewrite `Host` to the Cloud Run hostname from `imgproxy_uri`.

**img.fudapop.com**, when the Cloudflare plan can override the Host header with an Origin Rule:

1. DNS CNAME `img` to the `imgproxy_uri` hostname, proxied.
2. Origin Rule: if the hostname equals `img.fudapop.com`, set the Host header to that same Cloud Run hostname, and set the origin to it.
3. Cache Rule for `img.fudapop.com`: cache successful responses, respect the origin `Cache-Control` (`max-age=31536000`), and include the `Accept` header in the cache key. WebP and AVIF detection varies on `Accept`. A cache key that ignores `Accept` serves the wrong format.

When the plan cannot override Host, use a Worker on the route `img.fudapop.com/*` instead of the Origin Rule. The CNAME still has to exist and be proxied. Replace `CLOUD_RUN_HOST` with the hostname from `imgproxy_uri`.

```js
const ORIGIN = 'https://CLOUD_RUN_HOST'

// A path that starts with "//" is a scheme-relative URL. Passing it to
// `new URL(path, ORIGIN)` selects that host and sends the browser's headers
// there. Build the URL from ORIGIN, then set the path.
function targetUrl(requestUrl) {
  const incoming = new URL(requestUrl)
  const target = new URL(ORIGIN)
  target.pathname = `/${incoming.pathname.replace(/^\/+/, '')}`
  target.search = incoming.search
  return target
}

function originHeaders(request, host) {
  const headers = new Headers()
  const accept = request.headers.get('Accept')
  if (accept) headers.set('Accept', accept)
  headers.set('Host', host)
  return headers
}

export default {
  async fetch(request) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405 })
    }
    const target = targetUrl(request.url)
    const cacheUrl = new URL(target.href)
    cacheUrl.searchParams.set('__accept', request.headers.get('Accept') || '')
    const cacheKey = new Request(cacheUrl.toString(), { method: 'GET' })
    const cache = caches.default
    const cached = await cache.match(cacheKey)
    if (cached) {
      return cached
    }
    const response = await fetch(target, {
      method: request.method,
      headers: originHeaders(request, target.host),
    })
    if (response.ok && request.method === 'GET') {
      const stored = new Response(response.body, response)
      stored.headers.set('Cache-Control', 'public, max-age=31536000')
      await cache.put(cacheKey, stored.clone())
      return stored
    }
    return response
  },
}
```

**assets.fudapop.com** serves the object key as the URL path. `https://assets.fudapop.com/avatars/flat-crane.webp` is object `avatars/flat-crane.webp`.

Origin Rule path:

1. DNS CNAME `assets` to `fudapop-static.storage.googleapis.com`, proxied.
2. Origin Rule: Host header `fudapop-static.storage.googleapis.com`.
3. Cache Rule: cache successful responses and respect the object's `Cache-Control`. The upload script sets `public, max-age=31536000`.

Worker path, route `assets.fudapop.com/*`, if Host override is unavailable:

```js
const ORIGIN = 'https://storage.googleapis.com/fudapop-static'

function targetUrl(requestUrl) {
  const incoming = new URL(requestUrl)
  const target = new URL(ORIGIN)
  target.pathname = `${target.pathname}/${incoming.pathname.replace(/^\/+/, '')}`
  target.search = incoming.search
  return target
}

function originHeaders(request, host) {
  const headers = new Headers()
  const accept = request.headers.get('Accept')
  if (accept) headers.set('Accept', accept)
  const range = request.headers.get('Range')
  if (range) headers.set('Range', range)
  // GCS uses this header to decide Access-Control-Allow-Origin.
  const origin = request.headers.get('Origin')
  if (origin) headers.set('Origin', origin)
  headers.set('Host', host)
  return headers
}

export default {
  async fetch(request) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405 })
    }
    const target = targetUrl(request.url)
    return fetch(target, {
      method: request.method,
      headers: originHeaders(request, target.host),
    })
  },
}
```

The bucket CORS policy answers the browser `Origin` for `https://newhanafuda.art`, `https://www.newhanafuda.art`, `https://play.fudapop.com`, and local dev (`http://localhost:3000`, `http://127.0.0.1:3000`, `http://127.0.0.1:8888`). Add each Cloudflare Pages preview origin in `TF_VAR_static_cors_extra_origins` and apply again. A pattern such as `https://*.pages.dev` is rejected by GCS.

Two other ways to attach the hostnames, and why they are not the default:

- Cloud Run domain mapping (`gcloud run domain-mappings create --service=imgproxy --domain=img.fudapop.com --region=REGION`) plus a DNS-only CNAME to `ghs.googlehosted.com`. Google issues the certificate. The record has to stay grey-cloud, so Cloudflare does not proxy or cache. That misses the reason for putting the host on Cloudflare.
- A global external Application Load Balancer, a serverless NEG, and a backend bucket. That is a billed Google front end. It is not in this Terraform. Use it when you want the hostname on a Google certificate and Cloudflare in front of a stable IP.

### URLs for the later app change

Leave these unused until the hosts answer. Card faces go through imgproxy. Omit an output extension so Accept detection can choose AVIF or WebP. The `.webp` in the path is the object name, not an imgproxy format suffix.

```text
https://img.fudapop.com/insecure/card/plain/gs://fudapop-static/cards/{design}/{card}.webp
https://img.fudapop.com/insecure/card2x/plain/gs://fudapop-static/cards/{design}/{card}.webp
https://assets.fudapop.com/avatars/{name}.webp
https://assets.fudapop.com/audio/...
https://assets.fudapop.com/assets/...
```

Today the game builds card faces as `{supabaseUrl}/storage/v1/render/image/public/static/cards/{design}/{card}.webp?width=120&resize=contain`, and other files as `{supabaseUrl}/storage/v1/object/public/static/{key}`.

Check one object after DNS, before any app change:

```bash
curl -sI "https://img.fudapop.com/insecure/card/plain/gs://fudapop-static/cards/DESIGN/CARD.webp"
curl -sI "https://assets.fudapop.com/assets/logo-title.webp"
```

A 200 from imgproxy with `cache-control: max-age=31536000` means the preset and the bucket read worked. The Supabase URLs should still be what the running site requests.

## Local checks

No cloud credentials required:

```bash
terraform fmt -check -recursive -diff infra
terraform -chdir=infra/bootstrap init -backend=false -input=false
terraform -chdir=infra/bootstrap validate
terraform -chdir=infra/new-hanafuda init -backend=false -input=false
terraform -chdir=infra/new-hanafuda validate
```

`fmt` is also what CI runs. A pull request that only changes `infra/bootstrap` is formatted and validated. It is not planned against Google Cloud. The plan comment says when bootstrap files changed.
