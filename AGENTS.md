# RP03 Repository Execution Contract

This file is the repository-native execution contract for **RP03 — Booking & Services**. It governs bounded executors working in this repository. It does not authorize product implementation, architecture selection, merging, release, deployment, or gate transition.

## 1. Authority precedence

When instructions or evidence appear to conflict, use this precedence order:

1. **Bounded Workstream Contract** — defines the current task, authorized scope, required evidence, prohibited changes, and Stop Gate.
2. **Google Drive governed RP03 state** — contains controller-accepted decisions, gates, administrative state, and continuity records.
3. **GitHub** — contains code, branches, commits, pull requests, CI results, and repository-hosted technical evidence.
4. **RP03 static control pack** — governs stable product and domain invariants.
5. **Conversation memory** — may assist with context but is never legal or authoritative project truth.

A lower authority cannot override a higher authority. An executor must stop and report the conflict rather than invent a resolution.

## 2. Mandatory reading order

Every future executor must read, in order:

1. `AGENTS.md`.
2. `CONTRIBUTING.md`.
3. The current Bounded Workstream Contract.
4. Only the repository files directly required to execute that contract.

Stop expanding context as soon as the task criteria are executable. Do not load unrelated projects, historical packages, broad template libraries, or product implementation history without explicit authorization.

## 3. Scope control

No execution may begin without both `PROJECT_ID` and `WORKSTREAM_ID`.

The current contract must explicitly define:

- In Scope;
- Out of Scope;
- Prohibited Changes;
- Required Evidence; and
- Stop Gate.

Do not broaden scope from personal inference, convenience, apparent dependency, or assumed product intent. A blocked dependency is reported as a limitation or blocker; it is not permission to expand the workstream.

RP03 must never be mixed with RP01, RP02, RP04, GS, UPDOS, or any other project. Do not copy their files, decisions, assumptions, templates, or implementation history unless a later controlling contract explicitly authorizes a named artifact.

## 4. Branch, commit, and pull-request rules

The one-time owner-authorized seed commit is the sole exception to branch-first execution.

After that seed exception:

- direct push or direct file creation on `main` is prohibited;
- each Workstream uses a dedicated branch created from its verified baseline;
- every change requires a pull request targeting the authorized base branch;
- every pull request must identify its `WORKSTREAM_ID`;
- commits must be clear, bounded, and attributable to the workstream;
- the executor must not enable auto-merge;
- the executor must not merge, release, or deploy unless a later contract grants explicit authority;
- the executor must not approve their own work; and
- the executor must not issue a final acceptance, gate, release, or product-readiness verdict.

A pull request is an evidence and review boundary, not proof of acceptance.

## 5. Security, privacy, and operational safety

Never commit a secret, credential, token, password, private key, signing key, production connection string, or equivalent sensitive material.

Use synthetic data only unless a later bounded contract expressly authorizes another controlled dataset. Default tests must not use real customer, guest, provider, staff, booking, payment, or communication data.

The following actions are prohibited without an independent, explicit contract:

- destructive migrations, data deletion, or irreversible state changes;
- Git history rewrite or force-push;
- production provider configuration;
- payment, refund, payout, notification, or remote-session integration;
- use of production credentials or production data;
- changes to authentication or authorization behavior;
- changes to guest identity, guest ownership, booking ownership, or access-control rules; and
- security-sensitive data model changes.

Any authorized change involving authentication, authorization, guest ownership, payment, sensitive data, or external providers requires explicit scope, threat-aware validation, and security evidence in the pull request.

## 6. Implementation prohibitions for governance-only work

A governance workstream does not authorize application code, framework scaffolding, package manifests, lockfiles, database definitions, migrations, API routes, UI components, booking logic, authentication code, payment code, notification providers, remote-session integrations, containers, deployment configuration, architecture decisions, ADRs, design systems, release structures, copied Drive state, screenshots, or large logs.

Do not infer a framework, database, API style, UI technology, deployment platform, or architecture from generic governance files.

## 7. Evidence and Execution Handoff

Every executor must publish a lightweight, reference-oriented `Execution Handoff` containing:

- Repository and Workstream;
- verified baseline commit;
- branch, head SHA, and pull-request reference;
- complete changed-path list;
- tests, validation commands, results, and CI references;
- evidence entry points;
- limitations and deviations;
- reviewer entry point; and
- Stop State.

The handoff must classify evidence as references when GitHub or GitHub Actions already holds the logs, screenshots, patches, or artifacts. Do not duplicate full logs, screenshots, or large artifacts in the handoff or repository merely to restate existing GitHub evidence.

Evidence must be sufficient for a reviewer to reproduce the executor's claims without relying on conversation memory.

## 8. Authority separation

- **Executor:** implements only the bounded contract, validates the result, publishes evidence, and stops at the stated gate.
- **RP03 Central Controller:** reviews the diff and evidence and issues the Primary Verdict, including any authorized gate decision.
- **Independent Reviewer:** participates only when explicitly delegated by the controlling authority.

The executor does not update Google Drive governed state, announce a gate transition, declare acceptance, authorize release, or represent work as production-ready.

## 9. Required stop behavior

Stop immediately when the contract's Stop Gate is reached, when the verified baseline has changed unexpectedly, when authority conflicts, when required permissions are missing, or when the task would require an out-of-scope change.

Report the exact blocker, completed evidence, unresolved limitations, and safe reviewer entry point. Do not repair the contract, reinterpret authority, or continue into adjacent planning or implementation.
