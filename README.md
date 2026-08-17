# RP03 — Booking & Services

## Repository role

This public repository is the legal repository of record for RP03 technical and execution truth: source files, branches, commits, pull requests, CI checks, and repository-hosted technical evidence.

Google Drive retains the governed RP03 administrative state, including accepted decisions, gate records, continuity records, and other controller-approved state. Executors do not update that state unless a later bounded contract explicitly authorizes it.

The RP03 static control pack governs stable product and domain invariants. It is not copied into this repository by this workstream.

## Current implementation status

**Product implementation status: IN PROGRESS.**

Real RP03 S01-S12 UI implementation is present in the repository under bounded, Controller-reviewed workstreams. Existing implementation progress must not be interpreted as product completion, product readiness, release readiness, deployment readiness, or production readiness.

**Production foundation design status: APPROVED.**

**Production foundation implementation status: IN PROGRESS.**

`RP03-PRODUCTION-FOUNDATION-W01` introduces only the first bounded server/data foundation: a same-origin plain-PHP runtime, SQLite 3 through `PDO_SQLITE`, explicit CLI-only numbered migrations, synthetic development seeding, read-only public service APIs, and focused integration validation. It does not activate production authentication or authoritative booking confirmation.

The Controller-approved minimum production foundation is:

- existing accepted frontend preserved: semantic HTML + plain CSS + browser-native JavaScript;
- production server boundary: supported PHP 8.x release at implementation time;
- persistence: SQLite 3;
- database access: `PDO_SQLITE` with parameterized SQL and no ORM;
- server interaction: same-origin HTTP/JSON only where authoritative server behavior is required;
- architecture condition: `SINGLE_HOST_LOCAL_DURABLE_STORAGE`.

The SQLite database must remain on durable local storage on one application host. PostgreSQL must be re-evaluated before release if later approved requirements introduce multiple application hosts, ephemeral/serverless local storage, network-hosted SQLite, sustained write contention, database HA requirements, or mandatory database-native temporal exclusion.

No framework or ORM is approved by default.

Architecture approval records technical direction; it does not itself authorize deployment, production credentials, production data, external identity integration, payment integration, notification integration, remote-session integration, release, or production activation.

The following product decisions remain unresolved and must not be represented as settled:

- `RP03-DQ-004` — UNRESOLVED — payment/deposit/refund/fees;
- `RP03-DQ-005` — UNRESOLVED — guest ownership proof / remote-session access;
- `RP03-DQ-006` — UNRESOLVED — limited guest access vs permanent customer portal;
- `RP03-DQ-007` — UNRESOLVED — notification and final resource/exception/override authority;
- `RP03-DQ-012` — UNRESOLVED — production identity/session product model;
- `RP03-DQ-013` — UNRESOLVED — concrete scheduled-duration rule for authoritative bookable intervals.

This repository status does not by itself authorize additional product work; each change still requires a bounded Workstream Contract.

## W01 local foundation execution

The database location comes from `RP03_DB_PATH`. If it is unset, development falls back to the ignored local file `database/rp03.local.sqlite`. Runtime SQLite files and WAL/SHM sidecars remain prohibited from Git.

Typical local execution after ensuring PHP 8.x with `PDO_SQLITE` is available:

```bash
php database/migrate.php
php database/seed.php
php -S 127.0.0.1:8000 server/router.php
```

The W01 public API surface is intentionally read-only:

- `GET /api/health`
- `GET /api/services`
- `GET /api/services/{slug}`

Normal HTTP requests never run migrations or seeds. The accepted S01-S12 browser implementation remains unchanged in W01; S02 is not yet server-integrated.

## Execution governance

Read the repository-native execution rules before making changes:

1. [`AGENTS.md`](AGENTS.md)
2. [`CONTRIBUTING.md`](CONTRIBUTING.md)

The initial commit on `main` was a one-time owner-authorized seed exception used only to establish the branch. Direct writes to `main` after that exception are prohibited. All subsequent changes require a dedicated branch and pull request.

Governance files record execution controls and approved repository-stable technical truth. They must not be interpreted as product readiness, release readiness, deployment readiness, production readiness, implementation authority, or feature acceptance.
