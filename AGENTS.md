# RP03 Repository Execution Contract

This file is the repository-native execution contract for **RP03 — Booking & Services**. It governs bounded executors working in this repository. It records Controller-approved repository-stable technical truth, but it does not authorize product implementation, architecture changes, merging, release, deployment, or gate transition.

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

Never commit a secret, credential, token, password, private key, signing key, production connection string, production configuration, or equivalent sensitive material.

Use synthetic data only unless a later bounded contract expressly authorizes another controlled dataset. Production data is prohibited in normal development/testing. Default tests must not use real customer, guest, provider, staff, booking, payment, identity, notification, remote-session, or communication data.

Production database files, SQLite WAL/SHM sidecars, database backups, secrets, and production configuration must never be committed.

The following actions are prohibited without an independent, explicit contract:

- destructive migrations, data deletion, or irreversible state changes;
- Git history rewrite or force-push;
- production provider configuration;
- payment, refund, payout, notification, or remote-session integration;
- use of production credentials or production data;
- changes to authentication or authorization behavior;
- changes to guest identity, guest ownership, booking ownership, or access-control rules; and
- security-sensitive data model changes.

Any authorized change involving authentication, authorization, identity, guest ownership, payment, sensitive data, or external providers requires explicit scope, threat-aware validation, and security evidence in the pull request.

## 6. Controller-approved production-foundation truth

The approved minimum production foundation is:

- preserved existing frontend: semantic HTML + plain CSS + browser-native JavaScript;
- production server boundary: a supported PHP 8.x release at implementation time;
- persistence: SQLite 3;
- database access: `PDO_SQLITE` with parameterized SQL and no ORM;
- server interaction: same-origin HTTP/JSON only where authoritative server behavior is required.

Repository shorthand for the approved foundation is:

`PHP 8.x + SQLite 3 + PDO_SQLITE`

No framework or ORM is approved by default.

`SINGLE_HOST_LOCAL_DURABLE_STORAGE` is a hard architecture condition. The SQLite database must remain on durable local storage on one application host. PostgreSQL must be re-evaluated before release if later approved requirements introduce multiple application hosts, ephemeral/serverless local storage, network-hosted SQLite, sustained write contention, database HA requirements, or mandatory database-native temporal exclusion.

This section records Controller-approved architecture truth only. It does not authorize PHP implementation, database creation, schema work, migrations, routes, dependencies, deployment, production data, production credentials, or any unresolved product decision.

## 7. Database and migration governance

Database/schema/migration work requires an explicitly authorized workstream.

For any later authorized migration work:

- migrations must be numbered and immutable after acceptance;
- migrations must never run automatically from normal HTTP requests;
- destructive migrations require separate explicit authority;
- migration execution, rollback behavior, supported starting schema, and recovery expectations must be defined by the authorizing workstream;
- production database files, SQLite WAL/SHM files, database backups, and production data remain prohibited from Git.

No governance text is permission to create a schema, migration, SQL DDL, runtime database, seed containing production data, or database backup.

## 8. Authorization, booking authority, and concurrency governance

Authentication/authorization/identity-sensitive changes require explicit scope and security evidence.

Server-side authorization is authoritative; client route guards remain UX only.

Booking/schedule authority changes require transaction and concurrency evidence. For later authorized schedule-affecting server mutations, evidence must show that authoritative availability/conflict checks and writes are protected by the approved transaction strategy rather than trusting browser-selected availability.

Changes that affect booking ownership, protected operations, administrator authority, provider/resource assignment, exceptions/overrides, or identity/session behavior must remain inside explicitly authorized scope and must include negative authorization evidence where applicable.

## 9. Implementation prohibitions for governance-only work

A governance workstream does not authorize application code, framework scaffolding, package manifests, lockfiles, database definitions, migrations, API routes, UI components, booking logic, authentication code, payment code, notification providers, remote-session integrations, containers, deployment configuration, ADRs, design systems, release structures, copied Drive state, screenshots, or large logs.

A governance workstream may record an already Controller-approved architecture only when its bounded contract explicitly authorizes that repository-governance update. It must not invent, broaden, or implement architecture.

Do not infer a framework, ORM, alternative database, external identity provider, payment provider, notification provider, remote-session provider, deployment platform, or settled product policy from generic governance text.

## 10. Evidence and Execution Handoff

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

## 11. Authority separation

- **Executor:** implements only the bounded contract, validates the result, publishes evidence, and stops at the stated gate.
- **RP03 Central Controller:** reviews the diff and evidence and issues the Primary Verdict, including any authorized gate decision.
- **Independent Reviewer:** participates only when explicitly delegated by the controlling authority.

The executor does not update Google Drive governed state, announce a gate transition, declare acceptance, authorize release, or represent work as production-ready.

## 12. Required stop behavior

Stop immediately when the contract's Stop Gate is reached, when the verified baseline has changed unexpectedly, when authority conflicts, when required permissions are missing, or when the task would require an out-of-scope change.

Report the exact blocker, completed evidence, unresolved limitations, and safe reviewer entry point. Do not repair the contract, reinterpret authority, or continue into adjacent planning or implementation.
