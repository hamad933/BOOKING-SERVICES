# RP03 Automation Gateway — Foundation Contract

Status: `W01 FOUNDATION — NO LIVE PROVIDER MUTATION`

Project: `RP03 — Booking & Services`
Repository binding: `hamad933/BOOKING-SERVICES`
Jules source binding: `sources/github/hamad933/BOOKING-SERVICES`

## Purpose

The RP03 Automation Gateway is a project-native control boundary for future Controller-driven automation. It is not a second project authority and it never replaces Google Drive governed state or GitHub technical truth.

Foundation flow:

```text
Drive governed authority
→ Central Controller
→ strict RP03 request envelope
→ trusted identity + request/effect digest
→ idempotency decision
→ mutation kill switch / reconciliation gate
→ [future provider adapter]
→ redacted machine receipt
→ Controller review
→ [future trusted publication]
→ isolated GitHub candidate
```

There is intentionally **no provider transport implementation in W01**. No code in this foundation can create a Jules session, send a message, approve a plan, push a candidate, merge, release, or deploy.

## Hard invariants

1. `project_id`, route, repository, and Jules source are trusted RP03 constants; callers cannot override them.
2. Unknown top-level or action-specific fields fail closed.
3. Mutation requests must bind `logical_task_id`, `write_domain`, an isolated exact branch, and an exact expected Git SHA.
4. Create-session requires its payload source, branch, and starting commit to equal the trusted RP03 source and envelope branch/SHA; new sessions require `require_plan_approval=true`; automatic provider PR creation is not in the allowed request schema.
5. Read requests that accept a source are also bound to the exact RP03 source. A future provider adapter must additionally prove returned session/activity source binding before evidence is accepted.
6. Request identity is derived from the trusted project/repository plus `request_id`, while the canonical request digest is payload-bound. Reusing one request identity with a changed digest is therefore a collision, not a new request.
7. Provider-effect identity is separate from request identity and includes project, repository, workstream, logical task, write domain, action, target, exact expected branch, and exact expected SHA.
8. Active or unknown operation states require reconciliation before another provider write.
9. `UNKNOWN_WRITE_OUTCOME` is never safe to blind retry. Only an authoritative `NOT_APPLIED` reconciliation may enter the explicit reconciled-retry state.
10. Mutation is default-disabled and requires both an explicit request gate and the exact out-of-band kill-switch value. W01 still has no provider adapter even if both gates are satisfied.
11. Obvious credential/token/private-key material is rejected before normalization; durable receipts redact prompts, titles, pagination tokens, plan IDs, and provider session identifiers.
12. Publication primitives reject traversal, reserved control-plane paths, environment files, symlink/gitlink modes, binary/oversized patches, secret-like patch material, and paths outside a governed allowlist.
13. `PUSH != ACCEPTANCE != MERGE`. Release/deploy/production are separate gates.

## Concurrency model

Future execution uses separate identity/concurrency domains rather than a project-global lock:

- request identity prevents the same request ID from being consumed with conflicting content;
- effect identity serializes a provider side effect;
- `write_domain` serializes one logical writer domain;
- independent disjoint write domains may run concurrently;
- publication must use a separate target-branch compare-and-swap boundary.

No concurrency primitive grants authority. Drive workstream authority and exact GitHub state still control execution.

## Evidence model

Durable receipts are machine-readable and include the request identity, request digest, workstream, action, outcome, effect key when applicable, observed time, whether provider mutation occurred, external-effect count, and `safe_to_blind_retry=false`. Prompts/session IDs and secret-like values are redacted. Receipt digests and timestamps are validated before emission.

The foundation does not use evidence artifacts as the sole long-term replay barrier. A later mutation workstream must define a durable idempotency store/ledger with post-write reconciliation and must not make a retention-limited CI artifact the only source of replay safety.

## Lifecycle after W01

The next safe stages are intentionally separated:

1. **W02 Shadow Read** — add GET-only Jules/source/session/activity inspection, pagination, budgets, sanitization, source-binding verification, and read receipts. No provider mutation.
2. **W03 Mutation + Reconciliation Canary** — only after W01/W02 acceptance; add durable write intent, final pre-read, exactly one provider write, post-read, unknown-outcome reconciliation, and effect/write-domain concurrency.
3. **W04 Trusted Publication** — exact reviewed changeset/base SHA/path digest binding, isolated branch only, non-force push, remote SHA readback. No merge by the publication worker.
4. **W05 Controller Integration** — connect governed Drive workstream identity and Controller dispatch to the project-native gateway.
5. **Hourly control** — only after mutation, reconciliation, evidence, publication, and kill-switch gates are proven safe. The hourly cycle must continue useful safe work; it must not become a blind retry/status loop.

## Secret provisioning boundary

Repository secret inventory and secret values are not part of this repository contract. A future provider workstream may require the Owner to provision `JULES_API_KEY` through GitHub repository secret settings. The secret must never be committed, printed, copied into Drive, or persisted in receipts.
