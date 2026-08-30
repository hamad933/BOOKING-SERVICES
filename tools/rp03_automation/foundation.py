"""RP03 Automation Gateway W01 safety foundation. No provider transport exists here."""
from __future__ import annotations

import hashlib
import json
import posixpath
import re
from collections.abc import Mapping, Sequence
from copy import deepcopy
from dataclasses import dataclass
from enum import Enum
from pathlib import PurePosixPath
from typing import Any, Iterable

PROJECT_ID = "RP03"
ROUTE = "RP03"
REPOSITORY = "hamad933/BOOKING-SERVICES"
SCHEMA_VERSION = "1.0"
READ_ACTIONS = frozenset({"inspect.sessions", "inspect.session", "inspect.activities", "inspect.sources"})
MUTATION_ACTIONS = frozenset({"mutation.create_session", "mutation.send_message", "mutation.approve_plan"})
RECONCILIATION_ACTIONS = frozenset({"reconcile.effect"})
ALL_ACTIONS = READ_ACTIONS | MUTATION_ACTIONS | RECONCILIATION_ACTIONS
MUTATION_ENABLE_ENV = "RP03_AUTOMATION_MUTATION_ENABLED"
MUTATION_ENABLE_VALUE = "ENABLED_BY_GOVERNED_GATE"


class AutomationError(ValueError): pass
class SchemaError(AutomationError): pass
class SecretLikeInputError(AutomationError): pass
class IdentityCollisionError(AutomationError): pass
class MutationGateError(AutomationError): pass
class UnsafePublicationError(AutomationError): pass


_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$")
_SHA = re.compile(r"^[0-9a-f]{40}$")
_BRANCH = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$")
_TS = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$")
_DIGEST = re.compile(r"^[0-9a-f]{64}$")
_SECRET_KEYS = ("api_key", "apikey", "authorization", "access_token", "refresh_token", "private_key", "client_secret", "password", "credential")
_SECRET_PATTERNS = (
    re.compile(r"\bgh[pousr]_[A-Za-z0-9_]{20,}\b"), re.compile(r"\bgithub_pat_[A-Za-z0-9_]{20,}\b"),
    re.compile(r"\bAIza[0-9A-Za-z_-]{20,}\b"), re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----"),
    re.compile(r"\bBearer\s+[A-Za-z0-9._~+/-]{16,}={0,2}\b", re.I), re.compile(r"x-goog-api-key\s*[:=]\s*\S+", re.I),
)
_EVIDENCE_REDACT = {"session_id", "provider_session_id", "raw_session_id", "authorization", "api_key", "access_token", "refresh_token", "private_key", "password", "credential", "prompt"}


def _secret_key(key: str) -> bool:
    folded = key.casefold().replace("-", "_")
    return any(part in folded for part in _SECRET_KEYS)


def _secret_value(value: str) -> bool:
    return any(p.search(value) for p in _SECRET_PATTERNS)


def assert_no_secret_like_input(value: Any, path: str = "$") -> None:
    if isinstance(value, Mapping):
        for key, child in value.items():
            key = str(key)
            if _secret_key(key): raise SecretLikeInputError(f"secret-like key rejected at {path}.{key}")
            assert_no_secret_like_input(child, f"{path}.{key}")
    elif isinstance(value, str):
        if _secret_value(value): raise SecretLikeInputError(f"secret-like value rejected at {path}")
    elif isinstance(value, Sequence) and not isinstance(value, (bytes, bytearray, str)):
        for i, child in enumerate(value): assert_no_secret_like_input(child, f"{path}[{i}]")


def redact_for_evidence(value: Any) -> Any:
    if isinstance(value, Mapping):
        out = {}
        for key, child in value.items():
            key = str(key); folded = key.casefold().replace("-", "_")
            out[key] = "<redacted>" if _secret_key(key) or folded in _EVIDENCE_REDACT else redact_for_evidence(child)
        return out
    if isinstance(value, (list, tuple)): return [redact_for_evidence(x) for x in value]
    if isinstance(value, str) and _secret_value(value): return "<redacted>"
    return value


_TOP = {"schema_version", "request_id", "action", "workstream_id", "expected_branch", "expected_head_sha", "logical_task_id", "write_domain", "payload", "mutation_gate"}
_FIELDS = {
    "inspect.sessions": {"page_size", "page_token", "source"}, "inspect.session": {"session_id"},
    "inspect.activities": {"session_id", "page_size", "page_token"}, "inspect.sources": {"source"},
    "mutation.create_session": {"source", "branch", "starting_commit", "title", "prompt", "require_plan_approval"},
    "mutation.send_message": {"session_id", "expected_state", "expected_update_time", "prompt"},
    "mutation.approve_plan": {"session_id", "expected_state", "expected_update_time", "plan_id", "plan_digest"},
    "reconcile.effect": {"effect_key", "observation", "observation_digest"},
}
_REQUIRED = {
    "inspect.sessions": set(), "inspect.session": {"session_id"}, "inspect.activities": {"session_id"}, "inspect.sources": set(),
    "mutation.create_session": _FIELDS["mutation.create_session"], "mutation.send_message": _FIELDS["mutation.send_message"],
    "mutation.approve_plan": _FIELDS["mutation.approve_plan"], "reconcile.effect": _FIELDS["reconcile.effect"],
}


def _bounded(value: Any, field: str, pattern: re.Pattern[str]) -> str:
    if not isinstance(value, str) or not pattern.fullmatch(value): raise SchemaError(f"invalid {field}")
    return value


def _branch(value: Any, field: str) -> str:
    value = _bounded(value, field, _BRANCH)
    if value.startswith("/") or value.endswith("/") or "//" in value or ".." in value: raise SchemaError(f"unsafe {field}")
    return value


def _text(value: Any, field: str, limit: int) -> str:
    if not isinstance(value, str) or not value or len(value) > limit: raise SchemaError(f"invalid {field}")
    return value


def _payload(action: str, value: Any) -> dict[str, Any]:
    if not isinstance(value, dict): raise SchemaError("payload must be an object")
    unknown, missing = set(value) - _FIELDS[action], _REQUIRED[action] - set(value)
    if unknown: raise SchemaError(f"unknown payload fields: {sorted(unknown)}")
    if missing: raise SchemaError(f"missing payload fields: {sorted(missing)}")
    p = deepcopy(value)
    if "page_size" in p and (not isinstance(p["page_size"], int) or not 1 <= p["page_size"] <= 100): raise SchemaError("invalid page_size")
    if "page_token" in p: _text(p["page_token"], "page_token", 512)
    if "source" in p: _text(p["source"], "source", 256)
    if "session_id" in p: _bounded(p["session_id"], "session_id", _ID)
    if "effect_key" in p: _text(p["effect_key"], "effect_key", 128)
    if "observation" in p and p["observation"] not in {"APPLIED", "NOT_APPLIED", "AMBIGUOUS"}: raise SchemaError("invalid observation")
    if "observation_digest" in p: _bounded(p["observation_digest"], "observation_digest", _DIGEST)
    if "branch" in p:
        b = _branch(p["branch"], "branch")
        if b in {"main", "master"} or b.startswith("release/") or b.startswith("refs/tags/"): raise SchemaError("mutation branch must be isolated")
    if "starting_commit" in p: _bounded(p["starting_commit"], "starting_commit", _SHA)
    if "title" in p: _text(p["title"], "title", 200)
    if "prompt" in p: _text(p["prompt"], "prompt", 12_000)
    if "require_plan_approval" in p and p["require_plan_approval"] is not True: raise SchemaError("plan approval must be required")
    if "expected_state" in p: _bounded(p["expected_state"], "expected_state", _ID)
    if "expected_update_time" in p: _bounded(p["expected_update_time"], "expected_update_time", _TS)
    if "plan_id" in p: _bounded(p["plan_id"], "plan_id", _ID)
    if "plan_digest" in p: _bounded(p["plan_digest"], "plan_digest", _DIGEST)
    return p


def normalize_request(raw: Any) -> dict[str, Any]:
    if not isinstance(raw, dict): raise SchemaError("request must be an object")
    unknown = set(raw) - _TOP
    if unknown: raise SchemaError(f"unknown top-level fields: {sorted(unknown)}")
    if raw.get("schema_version") != SCHEMA_VERSION: raise SchemaError("unsupported schema_version")
    action = raw.get("action")
    if action not in ALL_ACTIONS: raise SchemaError("action not allowed")
    gate = raw.get("mutation_gate", False)
    if not isinstance(gate, bool): raise SchemaError("mutation_gate must be boolean")
    logical, domain = raw.get("logical_task_id"), raw.get("write_domain")
    if action in MUTATION_ACTIONS:
        logical = _bounded(logical, "logical_task_id", _ID); domain = _bounded(domain, "write_domain", _ID)
    else:
        if logical is not None: logical = _bounded(logical, "logical_task_id", _ID)
        if domain is not None: domain = _bounded(domain, "write_domain", _ID)
        if gate: raise SchemaError("mutation_gate is mutation-only")
    assert_no_secret_like_input(raw)
    return {
        "schema_version": SCHEMA_VERSION, "project_id": PROJECT_ID, "route": ROUTE, "repository": REPOSITORY,
        "request_id": _bounded(raw.get("request_id"), "request_id", _ID), "action": action,
        "workstream_id": _bounded(raw.get("workstream_id"), "workstream_id", _ID),
        "expected_branch": _branch(raw.get("expected_branch"), "expected_branch"),
        "expected_head_sha": _bounded(raw.get("expected_head_sha"), "expected_head_sha", _SHA),
        "logical_task_id": logical, "write_domain": domain, "mutation_gate": gate, "payload": _payload(action, raw.get("payload", {})),
        "action_class": "MUTATION" if action in MUTATION_ACTIONS else "READ" if action in READ_ACTIONS else "RECONCILIATION",
    }


def canonical_json(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()


def sha256_hex(value: Any) -> str: return hashlib.sha256(canonical_json(value)).hexdigest()
def request_digest(request: dict[str, Any]) -> str: return sha256_hex(request)


@dataclass(frozen=True)
class EffectIdentity:
    project_id: str; route: str; repository: str; workstream_id: str; logical_task_id: str; write_domain: str; action: str; target: str; expected_head_sha: str
    def canonical(self) -> dict[str, str]: return self.__dict__.copy()
    @property
    def key(self) -> str: return f"rp03:v1:effect:{sha256_hex(self.canonical())}"


def derive_effect_identity(req: dict[str, Any]) -> EffectIdentity:
    if req.get("action_class") != "MUTATION": raise SchemaError("effect identity requires mutation action")
    p, action = req["payload"], req["action"]
    target = f"source:{p['source']}|branch:{p['branch']}" if action == "mutation.create_session" else f"session:{p['session_id']}"
    return EffectIdentity(PROJECT_ID, ROUTE, REPOSITORY, req["workstream_id"], req["logical_task_id"], req["write_domain"], action, target, req["expected_head_sha"])


class OperationState(str, Enum):
    INTENT_RECORDED="INTENT_RECORDED"; EXECUTING="EXECUTING"; COMPLETED="COMPLETED"; REJECTED="REJECTED"; UNKNOWN_WRITE_OUTCOME="UNKNOWN_WRITE_OUTCOME"; RECONCILIATION_REQUIRED="RECONCILIATION_REQUIRED"; RETRY_AUTHORIZED_AFTER_RECONCILIATION="RETRY_AUTHORIZED_AFTER_RECONCILIATION"
class Decision(str, Enum):
    EXECUTE_NEW="EXECUTE_NEW"; EXECUTE_RECONCILED_RETRY="EXECUTE_RECONCILED_RETRY"; RETURN_TERMINAL="RETURN_TERMINAL"; RECONCILE_FIRST="RECONCILE_FIRST"

@dataclass(frozen=True)
class OperationRecord:
    identity_key: str; request_digest: str; state: OperationState; result_digest: str | None = None
@dataclass(frozen=True)
class IdempotencyDecision:
    decision: Decision; reason: str; safe_to_blind_retry: bool = False


def decide(existing: OperationRecord | None, *, identity_key: str, request_digest: str) -> IdempotencyDecision:
    if existing is None: return IdempotencyDecision(Decision.EXECUTE_NEW, "identity_not_seen")
    if existing.identity_key != identity_key or existing.request_digest != request_digest: raise IdentityCollisionError("identity/digest collision")
    if existing.state in {OperationState.COMPLETED, OperationState.REJECTED}: return IdempotencyDecision(Decision.RETURN_TERMINAL, "same_digest_terminal_replay")
    if existing.state is OperationState.RETRY_AUTHORIZED_AFTER_RECONCILIATION: return IdempotencyDecision(Decision.EXECUTE_RECONCILED_RETRY, "authoritative_not_applied")
    return IdempotencyDecision(Decision.RECONCILE_FIRST, f"state_{existing.state.value}_requires_reconciliation")


class ProviderObservation(str, Enum): APPLIED="APPLIED"; NOT_APPLIED="NOT_APPLIED"; AMBIGUOUS="AMBIGUOUS"
@dataclass(frozen=True)
class ReconciliationResult:
    next_record: OperationRecord; provider_write_authorized: bool; safe_to_blind_retry: bool; reason: str


def reconcile_unknown(record: OperationRecord, observation: ProviderObservation) -> ReconciliationResult:
    if record.state not in {OperationState.UNKNOWN_WRITE_OUTCOME, OperationState.RECONCILIATION_REQUIRED}: raise ValueError("record not reconcilable")
    if observation is ProviderObservation.APPLIED:
        return ReconciliationResult(OperationRecord(record.identity_key, record.request_digest, OperationState.COMPLETED, record.result_digest), False, False, "effect_applied")
    if observation is ProviderObservation.NOT_APPLIED:
        return ReconciliationResult(OperationRecord(record.identity_key, record.request_digest, OperationState.RETRY_AUTHORIZED_AFTER_RECONCILIATION), True, False, "effect_not_applied")
    return ReconciliationResult(OperationRecord(record.identity_key, record.request_digest, OperationState.RECONCILIATION_REQUIRED, record.result_digest), False, False, "ambiguous_fail_closed")


def assert_mutation_gate(req: dict[str, Any], environ: Mapping[str, str]) -> None:
    if req.get("action_class") != "MUTATION": return
    if req.get("mutation_gate") is not True: raise MutationGateError("missing governed envelope gate")
    if environ.get(MUTATION_ENABLE_ENV) != MUTATION_ENABLE_VALUE: raise MutationGateError("mutation kill switch disabled")


_FORBIDDEN_PREFIXES = (".git/", ".github/", "tools/rp03_automation/", "tests/rp03_automation/", "docs/RP03_AUTOMATION_GATEWAY.md", "vendor/", "node_modules/")
_FORBIDDEN_NAMES = {".env", ".env.local", ".env.production", ".env.development"}
def canonical_repo_path(path: str) -> str:
    if not isinstance(path, str) or not path or "\\" in path or "\x00" in path or path.startswith("/"): raise UnsafePublicationError("invalid POSIX path")
    normalized = posixpath.normpath(path)
    if normalized in {".", ".."} or normalized.startswith("../") or normalized != path: raise UnsafePublicationError("non-canonical/traversal path")
    return normalized


def validate_publication_paths(paths: Iterable[str], *, allowed_prefixes: tuple[str, ...]) -> tuple[str, ...]:
    if not allowed_prefixes: raise UnsafePublicationError("empty governed allowlist")
    allowed = tuple(canonical_repo_path(p.rstrip("/")) + "/" for p in allowed_prefixes); accepted=[]
    for raw in paths:
        path=canonical_repo_path(raw)
        if path in _FORBIDDEN_NAMES or PurePosixPath(path).name in _FORBIDDEN_NAMES: raise UnsafePublicationError("environment path rejected")
        if any(path == p.rstrip("/") or path.startswith(p) for p in _FORBIDDEN_PREFIXES): raise UnsafePublicationError("reserved path rejected")
        if not any(path.startswith(p) for p in allowed): raise UnsafePublicationError("outside governed allowlist")
        accepted.append(path)
    if not accepted or len(set(accepted)) != len(accepted): raise UnsafePublicationError("empty/duplicate publication set")
    return tuple(accepted)


def assert_safe_git_mode(mode: str) -> None:
    if mode not in {"100644", "100755"}: raise UnsafePublicationError("symlink/gitlink/unsupported mode rejected")


def assert_text_patch(patch: str) -> None:
    if not isinstance(patch, str) or not patch or "\x00" in patch or len(patch.encode()) > 1_000_000: raise UnsafePublicationError("unsafe patch")


def build_receipt(*, request: dict[str, Any], request_digest: str, outcome: str, observed_at: str, effect_key: str | None=None, provider_mutation_performed: bool=False, external_effects_dispatched: int=0, details: dict[str, Any] | None=None) -> dict[str, Any]:
    return {"schema_version": SCHEMA_VERSION, "project_id": PROJECT_ID, "route": ROUTE, "repository": REPOSITORY,
            "request_id": request["request_id"], "request_digest": request_digest, "workstream_id": request["workstream_id"], "action": request["action"],
            "effect_key": effect_key, "outcome": outcome, "observed_at": observed_at, "provider_mutation_performed": bool(provider_mutation_performed),
            "external_effects_dispatched": int(external_effects_dispatched), "safe_to_blind_retry": False,
            "request": redact_for_evidence(request), "details": redact_for_evidence(details or {})}
