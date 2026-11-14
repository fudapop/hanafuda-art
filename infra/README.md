# Infrastructure

Terraform for the `new-hanafuda` Google Cloud project. Nothing in this directory is applied by opening a pull request. Andre applies `infra/bootstrap` once from his own machine. After that, GitHub Actions plans `infra/new-hanafuda` on pull requests and applies it from `main` only after someone approves the GitHub environment.

Authentication is Workload Identity Federation through `google-github-actions/auth`. Do not create a JSON key.

Terraform 1.17.2 and the Google provider 8.11.0 are pinned in each root module. The lock files are `.terraform.lock.hcl`.

## Layout

| Path | What it manages | Who applies it |
| --- | --- | --- |
| `infra/bootstrap` | State bucket, APIs, Workload Identity pool and providers, Terraform plan and apply service accounts | Andre, once, from a machine with user credentials |
| `infra/new-hanafuda` | `firestore-deploy`, `hanafuda-github-translate`, and the monthly billing budget | GitHub Actions, from `main`, after approval |
| `infra/modules/github-wif` | Workload Identity pool and GitHub OIDC providers | Called by bootstrap |
| `infra/modules/budget` | A billing budget with alerts at 50%, 90%, and 100% of actual spend | Called by `new-hanafuda` |

`infra/bootstrap` has no remote backend in git. The bucket it creates cannot be its own backend until after the first apply. `backend.tf.example` is the config to copy once the bucket exists.

## Out of scope

- This Terraform does not create the Google Cloud project and does not attach a billing account.
- Firestore rules and indexes stay in `packages/frontend` and deploy with `firebase deploy`, the workflow from the Firestore rules pull request. Terraform only creates the identity that workflow assumes.
- Firebase Auth email templates are not managed here. Do not import or edit Identity Platform config to make Terraform quiet.
- There is no module yet for the card-art bucket or for Cloud Run.

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

Use the same region later for the GitHub variable `TF_VAR_region`. Nothing in `infra/new-hanafuda` is regional yet, so that variable can stay empty until you need it.

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

Then `terraform plan`. You should see a new pull-request provider with `disabled = true`, the state bucket, and the Terraform service accounts. You should not see Terraform replacing the `github` pool. An in-place change to the provider description is expected. If the plan wants to recreate the pool or the `github` provider, stop.

The pull-request provider (`github-pull-request`) is new. Do not import it. Leave `enable_pull_request_provider` false for this apply.

### 6. Apply bootstrap

From `infra/bootstrap`:

```bash
terraform init -input=false
terraform plan
terraform apply
```

This creates:

- A versioned state bucket, `new-hanafuda-tfstate`, with uniform access and public access prevention. The name is global. If it is taken, change `state_bucket_name` and the bucket in `infra/new-hanafuda/backend.tf` and `infra/bootstrap/backend.tf.example` together.
- The APIs the rest of this stack calls. APIs are not disabled when this Terraform is destroyed.
- Workload Identity pool `github`.
- Provider `github`, whose condition is `assertion.repository=='fudapop/hanafuda-art' && assertion.ref=='refs/heads/main'`. Terraform apply and Firestore deploy use this provider.
- Provider `github-pull-request`, limited to this repository and `refs/pull/*`, created disabled. A disabled provider rejects tokens. Leave it disabled until step 9. The `github` provider still rejects every token whose ref is not `refs/heads/main`. Bindings are on the pool, so enabling `github-pull-request` while a repository-wide `firestore-deploy` binding exists would let a pull request deploy rules.
- Service accounts `terraform-plan` and `terraform-apply`, with no keys.

`terraform-plan` can read IAM, enabled APIs, project metadata, and the state object. It does not get `roles/viewer`, because that role can read Firestore and Cloud Storage data. `terraform-apply` can manage service accounts and project IAM, and it can enable APIs. `roles/resourcemanager.projectIamAdmin` can grant any project role; that is what lets it attach the Firestore and Vertex roles. `roles/serviceusage.serviceUsageAdmin` is what lets it enable `aiplatform.googleapis.com`. Neither role is `roles/editor` or `roles/owner`. The managed API resource sets `disable_on_destroy` to false.

If you already applied an older bootstrap, apply this one again before the managed stack. The apply identity needs the service-usage admin role before it can enable Vertex AI.

Copy the outputs:

```bash
terraform output -raw gcp_project_id
terraform output -raw gcp_workload_identity_provider
terraform output -raw gcp_terraform_plan_workload_identity_provider
terraform output -raw gcp_terraform_plan_service_account
terraform output -raw gcp_terraform_apply_service_account
```

### 7. Move bootstrap state into the bucket

```bash
cp backend.tf.example backend.tf
terraform init -migrate-state
terraform state list
```

After `state list` shows the resources, delete the local `terraform.tfstate.backup`. Do not commit either state file. Commit `infra/bootstrap/backend.tf` in a follow-up so the remote backend is recorded. CI does not apply bootstrap.

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

On `firestore-deploy`, the output must not contain `attribute.repository/fudapop/hanafuda-art`. If that service account does not exist yet, there is no such binding. `hanafuda-github-translate` is a different account and does use that member.

`terraform plan` in this directory should show `hanafuda-github-translate`, `roles/aiplatform.user`, its repository Workload Identity binding, and `aiplatform.googleapis.com`. It shows the billing budget only when both budget variables are set. It must not show a new Firestore database, ruleset, or Auth config.

If `hanafuda-github-translate` already exists, import it before that apply:

```bash
terraform import google_service_account.translate \
  projects/new-hanafuda/serviceAccounts/hanafuda-github-translate@new-hanafuda.iam.gserviceaccount.com

terraform import google_project_iam_member.translate \
  "new-hanafuda roles/aiplatform.user serviceAccount:hanafuda-github-translate@new-hanafuda.iam.gserviceaccount.com"
```

Import the Workload Identity member only when it already uses `attribute.repository/fudapop/hanafuda-art`.

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

That sets `disabled = false` on `github-pull-request`. Until this apply, pull-request tokens cannot be exchanged, including tokens that would otherwise match a leftover repository-wide binding.

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
| `GCP_FIRESTORE_DEPLOY_SERVICE_ACCOUNT` | `firestore-deploy@new-hanafuda.iam.gserviceaccount.com` |
| `GCP_TRANSLATE_SERVICE_ACCOUNT` | `hanafuda-github-translate@new-hanafuda.iam.gserviceaccount.com` |
| `GCP_TERRAFORM_PLAN_WORKLOAD_IDENTITY_PROVIDER` | Bootstrap output `gcp_terraform_plan_workload_identity_provider`. The provider id is `github-pull-request` |
| `GCP_TERRAFORM_PLAN_SERVICE_ACCOUNT` | `terraform-plan@new-hanafuda.iam.gserviceaccount.com` |
| `GCP_TERRAFORM_APPLY_SERVICE_ACCOUNT` | `terraform-apply@new-hanafuda.iam.gserviceaccount.com` |
| `TF_VAR_region` | Optional. The region you chose in step 2, once you want it recorded for later regional resources |
| `TF_VAR_billing_account_id` | Optional. The billing account id. Set together with the amount |
| `TF_VAR_budget_amount` | Optional. Whole US dollars, such as `25` |

`GCP_WORKLOAD_IDENTITY_PROVIDER` and `GCP_FIRESTORE_DEPLOY_SERVICE_ACCOUNT` are the names the Firestore deploy workflow reads. Terraform apply uses the same provider variable. Plan uses the pull-request provider, because the `github` provider rejects every token whose ref is not `refs/heads/main`.

`GCP_PROJECT_ID` and `GCP_TRANSLATE_SERVICE_ACCOUNT` are the identity for content translation. This pull request does not add that workflow, and the Deno scripts in this checkout still call Gemini with `GEMINI_API_KEY`. The workflow that will use this service account is [pull request #90](https://github.com/fudapop/hanafuda-art/pull/90). It calls Vertex AI as `hanafuda-github-translate` (`roles/aiplatform.user`, bound to `attribute.repository/fudapop/hanafuda-art` on the `github` pool). That workflow reads the email from `GCP_SERVICE_ACCOUNT`, so set `GCP_SERVICE_ACCOUNT` to the same address as `GCP_TRANSLATE_SERVICE_ACCOUNT` when #90 is merged. Until then, these two variables do not change how translation runs.

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

The plan does not lock state. The apply identity is the one that writes the lock and the state.

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
