CREATE TABLE services (
    id INTEGER PRIMARY KEY,
    stable_id TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    title_ar TEXT NOT NULL,
    description_ar TEXT NOT NULL,
    category TEXT NOT NULL,
    supports_in_person INTEGER NOT NULL DEFAULT 0 CHECK (supports_in_person IN (0, 1)),
    supports_remote INTEGER NOT NULL DEFAULT 0 CHECK (supports_remote IN (0, 1)),
    preparation_context_ar TEXT,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    CHECK (supports_in_person = 1 OR supports_remote = 1)
);

CREATE TABLE providers (
    id INTEGER PRIMARY KEY,
    stable_id TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    bio_ar TEXT,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE provider_capabilities (
    id INTEGER PRIMARY KEY,
    provider_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    capability_note_ar TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE RESTRICT,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT,
    UNIQUE (provider_id, service_id)
);

CREATE TABLE resources (
    id INTEGER PRIMARY KEY,
    stable_id TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    description_ar TEXT,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE availability_rules (
    id INTEGER PRIMARY KEY,
    stable_id TEXT NOT NULL UNIQUE,
    provider_id INTEGER,
    resource_id INTEGER,
    weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
    start_local_time TEXT NOT NULL,
    end_local_time TEXT NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'Asia/Aden',
    effective_from TEXT,
    effective_to TEXT,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE RESTRICT,
    FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE RESTRICT,
    CHECK ((provider_id IS NOT NULL AND resource_id IS NULL) OR (provider_id IS NULL AND resource_id IS NOT NULL)),
    CHECK (start_local_time < end_local_time)
);

CREATE INDEX availability_rules_provider_idx ON availability_rules(provider_id, weekday) WHERE provider_id IS NOT NULL;
CREATE INDEX availability_rules_resource_idx ON availability_rules(resource_id, weekday) WHERE resource_id IS NOT NULL;

CREATE TABLE availability_exceptions (
    id INTEGER PRIMARY KEY,
    stable_id TEXT NOT NULL UNIQUE,
    provider_id INTEGER,
    resource_id INTEGER,
    starts_at TEXT NOT NULL,
    ends_at TEXT NOT NULL,
    exception_kind TEXT NOT NULL,
    reason_ar TEXT,
    metadata_json TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE RESTRICT,
    FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE RESTRICT,
    CHECK ((provider_id IS NOT NULL AND resource_id IS NULL) OR (provider_id IS NULL AND resource_id IS NOT NULL)),
    CHECK (starts_at < ends_at)
);

CREATE INDEX availability_exceptions_provider_idx ON availability_exceptions(provider_id, starts_at, ends_at) WHERE provider_id IS NOT NULL;
CREATE INDEX availability_exceptions_resource_idx ON availability_exceptions(resource_id, starts_at, ends_at) WHERE resource_id IS NOT NULL;

CREATE TABLE audit_events (
    id INTEGER PRIMARY KEY,
    event_id TEXT NOT NULL UNIQUE,
    actor_reference TEXT,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    occurred_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    metadata_json TEXT,
    correlation_id TEXT
);

CREATE INDEX audit_events_entity_idx ON audit_events(entity_type, entity_id, occurred_at);
CREATE INDEX audit_events_correlation_idx ON audit_events(correlation_id) WHERE correlation_id IS NOT NULL;

CREATE TRIGGER audit_events_append_only_update
BEFORE UPDATE ON audit_events
BEGIN
    SELECT RAISE(ABORT, 'audit_events are append-only');
END;

CREATE TRIGGER audit_events_append_only_delete
BEFORE DELETE ON audit_events
BEGIN
    SELECT RAISE(ABORT, 'audit_events are append-only');
END;
