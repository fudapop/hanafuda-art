# R2 card-original storage: operator runbook

## Scope and current evidence

This is the Phase 1 storage boundary, not a migration or delivery change. The
frontend stays on Supabase. Phase 2 must wait for actual Phase 1 deployment and
access evidence. The three authoritative `hanafuda-r2-card-assets-01` through `03`
plans govern this work; older storage plans are historical context only.

The operator's revised scope supersedes the plans' preserve-public-name decision:
replace `fudapop-static-assets` with `fudapop-static`, reconnect
`assets.fudapop.com`, and create `fudapop-private` for original artwork.
The operator reports having emptied the old bucket, including its non-card
assets. This was not independently verified; no asset copy is included here.

Cloudflare provider 5.29.0 marks bucket `name` as `RequiresReplace`; this is not
an in-place rename. The supplied plan has four additions and two destructions:
the two new buckets, the new custom-domain resource, disabled private `r2.dev`
access, and removal of the old public bucket/domain resources. The external
plans have not been updated for this revised scope. Preparing a PR does not
apply the plan or approve a deployment.

Repository preparation on 2026-11-26 found a clean `main` tracking `origin/main`,
Terraform 1.17.2, and Cloudflare provider 5.29.0. An attempt to read provider
schema through the existing backend could not read the GCS state because local
ADC required reauthentication (`invalid_grant` / `invalid_rapt`). No state contents
were returned. No Cloudflare token or account variable was present in the process
environment. No credentials were searched for in local secret files.

The provider schema was then read successfully from a disposable, backend-free
configuration using the locked installed providers. Backend-free validation uses
disposable HOME/data and no cloud credentials. These checks establish supported
configuration, not deployed state.

| Identity | Configuration / repository evidence | Deployment evidence |
| --- | --- | --- |
| Public bucket | `cloudflare_r2_bucket.static`: `fudapop-static`, `enam` | Planned replacement of `fudapop-static-assets`; apply and actual settings unverified |
| Public hostname | `cloudflare_r2_custom_domain.static_domain`: `assets.fudapop.com`, enabled, TLS 1.2 | Planned reconnection to the new bucket; handover ordering and live status unverified |
| Private archive | Proposed `cloudflare_r2_bucket.private`: `fudapop-private`, Standard, `enam`, jurisdiction `default` | Name availability, pre-existing resource, actual placement and privacy unknown |
| Source | Repository CSS references project `ymoriyakbittfgocvxbw`, origin `https://ymoriyakbittfgocvxbw.supabase.co`, bucket `static`, prefix `cards/` | Operator must confirm exact production project and approved source snapshot; runtime face origin is environment-configured |

The old bucket's empty state is operator-reported, not independently verified.
Do not repeat deletion or infer that CDN copies are gone.
Supabase originals remain public under the current setup, so R2 privacy alone
cannot establish original privacy everywhere.

## Storage boundary and provider capabilities

The new public bucket starts empty; Terraform does not migrate objects.
The old and new custom-domain resources have different Terraform addresses,
with no explicit ordering between removal and attachment. Before apply, resolve
the handover ordering so attachment does not race an existing hostname binding.
Expect an availability gap until the new bucket is populated and the domain is
active. The private archive has no custom domain resource. Its separate
`cloudflare_r2_managed_domain.no_custom` explicitly sets
`enabled = false` because disabling a custom domain does not disable `r2.dev`.
Absence of a Terraform domain resource does not prove that no out-of-band domain
or Worker exposes the bucket; the operator must inspect those routes.

The proposed placement matches the public bucket's configured `enam` hint.
`default` jurisdiction imposes no specific legal residency boundary. `enam` is
best-effort and only honored on first creation, not a residency guarantee.
Approve this choice before deployment. If an existing bucket differs, stop and
review/import it rather than replacing it or silently choosing another name.

Provider 5.29.0 schema and versioned primary documentation confirm:

| Capability | Treatment |
| --- | --- |
| Bucket `location`, `jurisdiction`, `storage_class` | Explicitly configured for the private archive |
| Managed `r2.dev` domain `enabled` | Supported; explicitly false |
| Managed-domain import | Not supported in 5.29.0; do not invent an import ID |
| Managed-domain destruction | Removes Terraform state only; does not reset the setting in Cloudflare. The creation-time warning is expected |
| Managed-domain drift refresh | The 5.29.0 implementation's `Read` is empty; Terraform refresh does not independently verify the live `r2.dev` setting |
| Bucket import | Supported as `<account_id>/<bucket_name>/<jurisdiction>`; requires separate state-write approval |
| Bucket deletion protection / force-delete switch | No such bucket attribute in this schema |
| Terraform destruction protection | `lifecycle.prevent_destroy = true` blocks planned replacement/deletion while the resource remains configured |
| Object lock and lifecycle resources | Available, but not added: no approved retention policy, expiry, or deletion rules |

`prevent_destroy` is not an R2-side lock or protection against object deletion,
console actions, removing the resource block, or broad credentials. It must not
be presented as immutable storage. No credentials or object resources are
managed by Terraform, and no credential outputs are added.

Andre owns the manual read-only settings audit before and after apply, and again
before the Phase 2 handoff. Record the actual managed-domain setting from the
Cloudflare dashboard or settings API in restricted evidence. A no-change plan
cannot prove it stayed disabled, given the provider's missing refresh behavior.
The versioned implementation's `Create` calls the managed-domain update API, so
the false setting is applied even when adopting an existing bucket setting.
No provider upgrade is proposed; one would need separate review.

Keep private keys identical to approved source keys:
`static` bucket key `cards/{design}/{filename}` maps to
`fudapop-private/cards/{design}/{filename}`. Do not add a `static/` key
prefix, normalize names, or derive identities from arbitrary URLs. Recording the
initial approved source-snapshot identity/reference in a private inventory is a
PENDING Phase 1 gate and required restricted handoff evidence. It has not been
collected or approved here. Phase 2 still owns the full authenticated inventory,
hashes, source freeze, reconciliation and unexpected-file classification. Keep
that inventory restricted, not in this repository or public CI artifacts.

## Scoped access procedure (not authorization to issue credentials)

Andre is the proposed infrastructure/access owner and approval contact. Andre
must name the migration operator and independent validation operator before
issuing access. No new credential has been created, inspected, or revoked.

Use existing Terraform identities and protected workflows. Preserve GCP WIF and
the GCS backend. Do not put Cloudflare credentials in Terraform variables,
resources, outputs or state.

| Role | Required scope | Secret location / disposition |
| --- | --- | --- |
| Terraform plan | `Workers R2 Storage Read` for the intended account, plus only read permissions needed by existing zone/domain resources; no storage write | Existing repository Actions secret `CLOUDFLARE_PLAN_API_TOKEN`; verify actual policy, do not replace unrelated access |
| Terraform apply | `Workers R2 Storage Write` for the intended account, plus only permissions needed by existing zone/domain resources | Existing protected `terraform` environment secret `CLOUDFLARE_APPLY_API_TOKEN`; owner reviews any required expansion |
| Source inventory/copy | Authenticated listing/read of the approved Supabase `static/cards/` snapshot; no source writes | Operator-approved secret manager entry; actual entry and supported least-privilege source mechanism must be recorded before use |
| Private archive copy | Separate R2 **Object Read & Write** token scoped only to `fudapop-private` | Separate restricted secret manager entry, not CI/frontend |
| Public derivative publication | Separate R2 **Object Read & Write** token scoped only to `fudapop-static`, once deployed and verified | Separate restricted secret manager entry, never reused for source/original operations |
| Independent validation | R2 **Object Read only**, limited to the two intended buckets; source read only if needed | Separate restricted entry; no write credential required |

Cloudflare's bucket-scoped object credentials work through the S3 API, not the
Cloudflare REST settings API. They must not be used as Terraform administration
tokens. The documented bucket-token scope does not provide prefix isolation.
Public writes therefore can affect unrelated objects: Phase 2 tooling must
enforce exact bucket and approved immutable derivative prefix, and reject raw
source publication. Private writes must enforce the approved `cards/` mapping.
Read/write credentials are not an append-only or deletion-prevention control.
Do not claim prefix- or delete-denial guarantees from these roles.

Before issuing any temporary credential, the owner must approve and record:

1. Named operator, task, account/bucket scope, permissions, and secret-manager
   entry reference (never the value), with access restricted to that operator.
2. A concrete UTC expiration no later than the approved migration/validation
   window; if expiration is unavailable, a named revocation owner and deadline.
3. Read-only/listing checks against allowed and disallowed buckets, without
   logging keys, tokens, authorization headers or signed URLs.
4. A separately approved write test if needed. No credential creation, fixture
   upload/removal or revocation is authorized by this runbook.

Use short-lived local process injection from the approved secret store, no
shell tracing, CLI secret arguments, committed `.env`, shared logs or permanent
upload service. Store temporary local configs with restrictive permissions
outside the checkout. Keep source read separate from all destination writes.
Do not widen source access to a broad service-role key merely to unblock work;
stop for an operator-approved mechanism if scoped read access is unavailable.

## Approval, deployment and evidence gates

No gate below has passed. Andre must choose a restricted operator evidence
location and record its reference before inspection or execution that captures
inventories or state-derived evidence. Do not publish raw state, originals,
credentials, full inventories or binary plans to public issues/CI artifacts.

BLOCKER: Phase 1 deployment and merging this infrastructure into auto-apply main
are blocked until an owner-approved mechanism to review/reject the actual
execution-time changes is implemented and verified. The inherited
`terraform-apply.yml` waits for environment approval before
`terraform apply -auto-approve` computes a NEW plan.
It does not apply the reviewed PR plan and has no execution-time plan review or
allowlist. Changed variables or state could therefore replace the public bucket
or domain without review. Environment approval alone is not sufficient.
Workflow redesign is deferred pending the owner's decision; repository
preparation does not authorize auto-apply. The protected workflow requirement
remains in force, and local apply is not an alternative.

1. Restore read-only state and Cloudflare settings access without dumping state.
   Identify the exact account and resource addresses. Inspect both buckets,
   actual jurisdiction/location/storage class, custom domains, `r2.dev`,
   lifecycle/lock policies, and any existing Worker bindings/routes. Investigate
   drift before deployment. A matching intended archive needs reviewed import
   rather than duplicate creation; import changes state and needs approval.
2. Confirm the old bucket is empty before its planned deletion. Record the
   operator-approved asset removal and the current domain/cache settings.
   The earlier non-card preservation baseline cannot be established from deleted
   objects; do not report it as passed. Restoring any non-card assets is separate
   work, not an implicit action in this infrastructure PR.
3. Confirm the Supabase project, `static` bucket and `cards/` prefix with the
   operator, not just repository URLs. Record the initial approved source-snapshot
   identity/reference and its approval in a private inventory before Phase 1
   handoff. This gate remains pending; do not fabricate or collect a snapshot as
   part of repository preparation. Do not copy objects in Phase 1.
4. Review a fresh Terraform plan through the existing plan workflow. The supplied
   plan shows four additions and two destructions for the revised scope above.
   Confirm the old bucket is empty, resolve custom-domain handover ordering,
   and stop for unrelated changes, private public access, or any additional
   destructive operations. Local validation is not that plan.
   The existing workflow posts plan text publicly; review any evidence handling
   before running and never introduce secrets into configuration/state.
5. Deployment remains blocked until the owner-approved execution-time review/
   rejection mechanism above is implemented and verified. After that blocker is
   resolved, execution must still use the protected `terraform` environment/
   workflow with explicit operator approval. Do not run a local apply or trigger
   a workflow as part of repository preparation. Verify actual GitHub environment
   protection; its presence in YAML is not proof of protection.
6. Inspect actual disabled `r2.dev`, absence of all private custom domains,
   absence of expiry rules, and no public service route to the archive.
   A known existing non-sensitive fixture may prove authenticated GET success
   and anonymous GET/unsigned S3 failure on the same key, but requires a separate
   exact upload/removal approval. Record bytes/hash and endpoint settings. An
   empty bucket's missing-object 404 is not privacy proof. Never use original
   artwork as a public test fixture.
7. Verify the public domain is active on `fudapop-static`. Record that it starts
   empty rather than claiming asset preservation or migration. Leave frontend,
   Supabase, caches and unrelated resources unchanged. No further object deletion
   or cache purge is authorized.

For Phase 2 handoff record the infrastructure commit once one exists, reviewed
plan and apply run IDs, timestamp/operator, exact account, bucket names and
actual region/jurisdiction, Terraform resource ownership, authenticated/private
access checks, public endpoint/settings inventory, old-bucket removal/cache
references, credential roles/store references/expiry, the initial approved
source-snapshot identity/private-inventory reference and approval, evidence that
the execution-time plan blocker is resolved, and approvals. Both gates remain
pending, so no completed Phase 1 handoff is available. Include an explicit
statement that no frontend deployment, asset migration or Supabase change was
performed by this PR; record the operator's prior asset deletion separately.
Unknowns remain blockers, not passed gates.

If a deployment fails, keep the frontend on Supabase and reconcile the intended
public bucket/domain connection through reviewed Terraform. Do not assume the
deleted old assets can be restored from R2. Never delete a populated archive or
make it public as a workaround.

## Local validation

Use the formatting, backend-free initialization and validation commands in
[README.md](./README.md#local-checks). They do not prove deployed privacy or
safe execution-time changes. To isolate a machine with an already initialized remote
backend, copy the root and its `../modules/budget` dependency to a disposable
directory, omit `backend.tf` only in that copy, and use a disposable HOME and
Terraform data directory. Do not reconfigure or migrate the real backend.

## Primary references

- [5.29.0 bucket schema and import](https://github.com/cloudflare/terraform-provider-cloudflare/blob/v5.29.0/docs/resources/r2_bucket.md)
- [5.29.0 managed-domain schema and import limitation](https://github.com/cloudflare/terraform-provider-cloudflare/blob/v5.29.0/docs/resources/r2_managed_domain.md)
- [5.29.0 managed-domain implementation (including empty Read)](https://github.com/cloudflare/terraform-provider-cloudflare/blob/v5.29.0/internal/services/r2_managed_domain/resource.go)
- [Independent custom-domain and r2.dev access](https://developers.cloudflare.com/r2/buckets/public-buckets/)
- [R2 token permissions and bucket scopes](https://developers.cloudflare.com/r2/api/tokens/)
- [Terraform prevent_destroy limits](https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle#prevent_destroy)
