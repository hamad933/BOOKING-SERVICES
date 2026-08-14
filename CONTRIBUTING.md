# Contributing to RP03 — Booking & Services

All repository changes are bounded execution. Contribution does not begin from a feature idea or conversation alone; it begins from an authorized Workstream Contract.

## 1. Required workstream contract

Before changing any file, confirm that the current contract provides:

- `PROJECT_ID` and `WORKSTREAM_ID`;
- verified baseline commit or ref;
- In Scope and Out of Scope;
- Authorized Paths;
- Prohibited Changes;
- Required Evidence; and
- Stop Gate.

Stop when any required field is absent, contradictory, or no longer matches the repository baseline. Do not repair or enlarge the contract yourself.

## 2. Create a bounded branch

Create one dedicated branch from the verified baseline. Use the exact name specified by the contract. When the contract supplies only a convention, use a clear lowercase name such as:

```text
<type>/rp03-<bounded-purpose>
```

Examples of `<type>` include `chore`, `docs`, `fix`, or `feat` only when that type is authorized by the workstream.

The initial repository seed is the only authorized direct commit to `main`. Never push, create, update, or delete files directly on `main` after that exception.

## 3. Keep the diff authorized

Modify only paths explicitly authorized by the Workstream Contract. Before opening or updating the pull request, compare the branch with its base and inspect the complete changed-path list.

Do not add convenience files, empty directories, generated output, copied control-state packages, screenshots, large logs, or unrelated cleanup. A useful but unauthorized change remains prohibited.

Governance work must not invent, select, or broaden a framework, ORM, database, API style, deployment platform, external provider, or architecture. A bounded governance workstream may record Controller-approved repository-stable architecture truth when explicitly authorized, but that recording does not authorize implementation.

Do not add application code, scaffolds, package manifests, lockfiles, migrations, routes, components, containers, deployment files, ADRs, or product features unless a later product workstream expressly authorizes them.

## 4. Commit discipline

Use clear, limited commit messages that describe the repository change without claiming acceptance or readiness. Keep commits attributable to the active `WORKSTREAM_ID` and avoid mixing unrelated concerns.

Do not rewrite shared history or force-push. Do not sign, tag, release, or deploy unless the contract grants explicit authority.

## 5. Security and data handling

Never commit secrets, credentials, tokens, private keys, production configuration, runtime production databases, database sidecars, or database backups.

Use synthetic data by default. No real production data may be used in normal development or testing. Do not use real customer, guest, provider, booking, payment, identity, notification, remote-session, or communication data unless a later contract explicitly authorizes a controlled dataset and its handling requirements.

Report suspected secret exposure or unauthorized data immediately and stop. Do not conceal it with a normal follow-up commit or history rewrite.

## 6. Future production-foundation contribution requirements

When a later Workstream Contract explicitly authorizes production-foundation implementation, apply only the checks relevant to the authorized change.

Where PHP is introduced:

- run PHP syntax validation and any explicitly authorized static validation;
- do not add framework or ORM tooling unless separately approved.

Where database work is introduced:

- use real SQLite integration tests rather than mocks as the sole database evidence;
- validate migrations from an empty database and from each prior supported schema required by the workstream;
- provide transaction rollback evidence for failed multi-step mutations;
- never use a committed runtime database or production data.

Where booking or schedule authority is introduced or changed:

- provide a concurrency test for competing exclusive-slot confirmation;
- show that one authoritative confirmation can win and the conflicting confirmation is rejected without partial durable state.

Where protected server operations are introduced or changed:

- provide authorization negative tests proving unauthorized principals cannot perform the protected operation;
- treat server-side authorization as authoritative; client route guards are UX only.

These requirements define future contribution evidence. They do not create the tests, schema, routes, PHP code, or implementation authority by themselves.

## 7. Validate before opening the pull request

Run the validation required by the contract and any repository-native checks that apply to the changed files. At minimum, inspect:

```bash
git status --short
git diff --check
git diff --check main...HEAD
git diff --name-only main...HEAD
git log --oneline --decorate --max-count=10
```

Record exact commands and results in the pull request. Confirm that the changed paths are authorized, the diff contains no accidental product implementation, and no secret, runtime database, backup, or real production data is present.

Exact-head CI evidence is required before RP03 Central Controller review. Do not claim a GitHub Actions check passed until the check result is visible for the exact pull-request HEAD commit.

## 8. Open and maintain the pull request

Every change after the seed exception requires a pull request. The pull request must identify the Project ID, Workstream ID, verified baseline, scope, changed paths, validation, evidence, limitations, requested verdict, and Stop State.

Do not enable auto-merge. Do not approve or merge your own work. Keep the pull request open for the RP03 Central Controller unless a later authority explicitly directs another state.

When a deviation, limitation, failed check, baseline movement, or evidence gap appears, update the pull-request description or add a concise reference comment. Do not silently compensate by expanding scope.

## 9. Execution Handoff format

Publish a lightweight, reference-oriented handoff using this structure:

```text
PROJECT_ID:
WORKSTREAM_ID:

REPOSITORY:
BASELINE_COMMIT_SHA:
BRANCH:
HEAD_SHA:
PR_URL:
PR_STATE:

CHANGED_PATHS:
- ...

VALIDATION:
- command:
  result:

CI_CHECKS:
- name:
  status:
  url:

EVIDENCE_CLASSIFICATION:
REFERENCE_ONLY

DEVIATIONS:
LIMITATIONS:
PRODUCT_IMPLEMENTATION_INTRODUCED:
DRIVE_UPDATED_BY_EXECUTOR:
PR_MERGED:

REVIEWER_ENTRY_POINT:
STOP_STATE:
```

Reference GitHub commits, the pull-request diff, checks, and GitHub Actions logs rather than copying full logs or large artifacts into the handoff.

## 10. Controller and owner authority

The executor implements, validates, references evidence, and stops. The RP03 Central Controller reviews the diff and evidence and issues the Primary Verdict.

Merge authorization and Google Drive state recording belong to the Central Controller or repository owner according to explicit delegation. An executor must not update Drive governed state, declare a gate transition, announce acceptance, merge, release, or deploy without later written authority.
