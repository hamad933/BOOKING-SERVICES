"""GET-only Jules shadow reader for RP03.

This module contains no provider mutation operation. It accepts only internally
constructed GET paths below the Jules v1alpha API root and emits sanitized,
bounded evidence.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import time
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Callable, Iterable, Mapping
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import HTTPRedirectHandler, Request, build_opener

from .foundation import JULES_SOURCE, PROJECT_ID, REPOSITORY, ROUTE

BASE_URL = "https://jules.googleapis.com/v1alpha"
API_HOST = "jules.googleapis.com"
API_KEY_ENV = "JULES_API_KEY"
MAX_RESPONSE_BYTES = 2_000_000
DEFAULT_TIMEOUT_SECONDS = 15.0
DEFAULT_PAGE_SIZE = 100
MAX_PAGES = 5
MAX_ITEMS = 250
MAX_REQUESTS = 300
MAX_TOTAL_BYTES = 10_000_000
MAX_ELAPSED_SECONDS = 240.0
_RESOURCE_ID = re.compile(r"^[A-Za-z0-9._~-]{1,160}$")
_TIMESTAMP = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$")


class ShadowReadError(RuntimeError):
    pass


class ProviderHTTPError(ShadowReadError):
    def __init__(self, status: int, reason: str = "provider request failed") -> None:
        self.status = int(status)
        super().__init__(f"{reason} (status={self.status})")


class BudgetExceeded(ShadowReadError):
    pass


class PaginationError(ShadowReadError):
    pass


class SourceBindingError(ShadowReadError):
    pass


class UnsafeProviderRequest(ShadowReadError):
    pass


@dataclass(frozen=True)
class ReadBudget:
    timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS
    max_response_bytes: int = MAX_RESPONSE_BYTES
    max_pages: int = MAX_PAGES
    max_items: int = MAX_ITEMS
    max_requests: int = MAX_REQUESTS
    max_total_bytes: int = MAX_TOTAL_BYTES
    max_elapsed_seconds: float = MAX_ELAPSED_SECONDS

    def validate(self) -> "ReadBudget":
        if not 0.5 <= float(self.timeout_seconds) <= 60.0:
            raise ValueError("timeout_seconds outside bounded range")
        if not 1024 <= int(self.max_response_bytes) <= 5_000_000:
            raise ValueError("max_response_bytes outside bounded range")
        if not 1 <= int(self.max_pages) <= 20:
            raise ValueError("max_pages outside bounded range")
        if not 1 <= int(self.max_items) <= 1000:
            raise ValueError("max_items outside bounded range")
        if not 1 <= int(self.max_requests) <= 1000:
            raise ValueError("max_requests outside bounded range")
        if not 1024 <= int(self.max_total_bytes) <= 50_000_000:
            raise ValueError("max_total_bytes outside bounded range")
        if not 1.0 <= float(self.max_elapsed_seconds) <= 900.0:
            raise ValueError("max_elapsed_seconds outside bounded range")
        return self


Transport = Callable[[str, str, Mapping[str, str], float, int], tuple[int, bytes]]


def _validate_api_key(api_key: str) -> str:
    if not isinstance(api_key, str) or not api_key or len(api_key) > 512:
        raise UnsafeProviderRequest("API key missing or invalid")
    if "\r" in api_key or "\n" in api_key:
        raise UnsafeProviderRequest("API key contains invalid control characters")
    return api_key


def _resource_id(value: str, field: str) -> str:
    if not isinstance(value, str) or not _RESOURCE_ID.fullmatch(value):
        raise UnsafeProviderRequest(f"invalid {field}")
    return value


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _stable_key(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:20]


def _json_digest(value: Any) -> str:
    encoded = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


class _NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def urllib_get_transport(method: str, url: str, headers: Mapping[str, str], timeout: float, max_bytes: int) -> tuple[int, bytes]:
    if method != "GET":
        raise UnsafeProviderRequest("shadow transport permits GET only")
    request = Request(url, headers=dict(headers), method="GET")
    opener = build_opener(_NoRedirect())
    try:
        with opener.open(request, timeout=timeout) as response:
            status = int(getattr(response, "status", 200))
            body = response.read(max_bytes + 1)
    except HTTPError as exc:
        raise ProviderHTTPError(exc.code) from None
    except URLError as exc:
        raise ShadowReadError(f"provider transport failed: {type(exc.reason).__name__}") from None
    if len(body) > max_bytes:
        raise BudgetExceeded("provider response exceeded byte budget")
    return status, body


class ShadowReader:
    def __init__(self, api_key: str, *, transport: Transport = urllib_get_transport, budget: ReadBudget | None = None) -> None:
        self._api_key = _validate_api_key(api_key)
        self._transport = transport
        self._budget = (budget or ReadBudget()).validate()
        self._request_count = 0
        self._bytes_read = 0
        self._started_at = time.monotonic()

    @property
    def request_count(self) -> int:
        return self._request_count

    @property
    def bytes_read(self) -> int:
        return self._bytes_read

    def _url(self, path: str, query: Mapping[str, Any] | None = None) -> str:
        if not path.startswith("/") or ".." in path or "\\" in path or "//" in path:
            raise UnsafeProviderRequest("unsafe provider path")
        if not (
            path == "/sources"
            or path == "/sessions"
            or re.fullmatch(r"/sessions/[A-Za-z0-9._~-]{1,160}", path)
            or re.fullmatch(r"/sessions/[A-Za-z0-9._~-]{1,160}/activities", path)
        ):
            raise UnsafeProviderRequest("provider path not allowlisted")
        url = BASE_URL + path
        if query:
            clean: list[tuple[str, str]] = []
            for key, value in query.items():
                if key not in {"pageSize", "pageToken", "filter"}:
                    raise UnsafeProviderRequest("query key not allowlisted")
                if value is None or value == "":
                    continue
                text = str(value)
                if len(text) > 1024 or "\r" in text or "\n" in text:
                    raise UnsafeProviderRequest("query value invalid")
                clean.append((key, text))
            if clean:
                url += "?" + urlencode(clean)
        return url

    def _get(self, path: str, query: Mapping[str, Any] | None = None) -> dict[str, Any]:
        if time.monotonic() - self._started_at > self._budget.max_elapsed_seconds:
            raise BudgetExceeded("provider elapsed-time budget exhausted")
        if self._request_count >= self._budget.max_requests:
            raise BudgetExceeded("provider request budget exhausted")
        url = self._url(path, query)
        headers = {"Accept": "application/json", "x-goog-api-key": self._api_key, "User-Agent": "rp03-automation-shadow-read/1"}
        self._request_count += 1
        status, body = self._transport("GET", url, headers, self._budget.timeout_seconds, self._budget.max_response_bytes)
        if len(body) > self._budget.max_response_bytes:
            raise BudgetExceeded("provider response exceeded byte budget")
        self._bytes_read += len(body)
        if self._bytes_read > self._budget.max_total_bytes:
            raise BudgetExceeded("provider total byte budget exhausted")
        if status < 200 or status >= 300:
            raise ProviderHTTPError(status)
        try:
            decoded = json.loads(body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            raise ShadowReadError("provider returned invalid JSON") from None
        if not isinstance(decoded, dict):
            raise ShadowReadError("provider JSON root must be an object")
        return decoded

    def _paginate(self, path: str, collection_key: str, *, query: Mapping[str, Any] | None = None) -> tuple[list[dict[str, Any]], int]:
        items: list[dict[str, Any]] = []
        token: str | None = None
        seen_tokens: set[str] = set()
        pages = 0
        while True:
            if pages >= self._budget.max_pages:
                raise BudgetExceeded("provider page budget exhausted")
            q = dict(query or {})
            q["pageSize"] = min(DEFAULT_PAGE_SIZE, self._budget.max_items)
            if token:
                q["pageToken"] = token
            page = self._get(path, q)
            pages += 1
            raw_items = page.get(collection_key, [])
            if not isinstance(raw_items, list) or not all(isinstance(item, dict) for item in raw_items):
                raise ShadowReadError(f"provider {collection_key} collection invalid")
            items.extend(raw_items)
            if len(items) > self._budget.max_items:
                raise BudgetExceeded("provider item budget exhausted")
            next_token = page.get("nextPageToken")
            if not next_token:
                break
            if not isinstance(next_token, str) or len(next_token) > 1024:
                raise PaginationError("invalid next page token")
            if next_token in seen_tokens:
                raise PaginationError("duplicate next page token detected")
            seen_tokens.add(next_token)
            token = next_token
        return items, pages

    @staticmethod
    def _session_source(session: Mapping[str, Any]) -> str | None:
        context = session.get("sourceContext")
        if not isinstance(context, Mapping):
            return None
        source = context.get("source")
        return source if isinstance(source, str) else None

    def get_bound_session(self, session_id: str) -> dict[str, Any]:
        sid = _resource_id(session_id, "session_id")
        session = self._get(f"/sessions/{sid}")
        if self._session_source(session) != JULES_SOURCE:
            raise SourceBindingError("session source does not match RP03")
        return session

    def inspect_sources(self) -> dict[str, Any]:
        sources, pages = self._paginate("/sources", "sources", query={"filter": f"name={JULES_SOURCE}"})
        exact = [source for source in sources if source.get("name") == JULES_SOURCE]
        if len(exact) != 1:
            raise SourceBindingError(f"expected exactly one RP03 source; found={len(exact)}")
        source = exact[0]
        repo = source.get("githubRepo")
        if isinstance(repo, Mapping):
            owner, name = repo.get("owner"), repo.get("repo")
            if owner != "hamad933" or name != "BOOKING-SERVICES":
                raise SourceBindingError("RP03 source repository binding mismatch")
        return {"source_binding": "SOURCE_BINDING_PROVEN", "source": JULES_SOURCE, "source_count": 1, "pages": pages}

    def inspect_sessions(self) -> dict[str, Any]:
        sessions, pages = self._paginate("/sessions", "sessions")
        bound: list[dict[str, Any]] = []
        for summary in sessions:
            source = self._session_source(summary)
            detail = summary
            if source is None:
                name = summary.get("name")
                if not isinstance(name, str) or not name.startswith("sessions/"):
                    raise SourceBindingError("session missing inspectable source binding")
                sid = _resource_id(name.split("/", 1)[1], "session_id")
                detail = self._get(f"/sessions/{sid}")
                source = self._session_source(detail)
            if source == JULES_SOURCE:
                bound.append(self._sanitize_session(detail))
        counts = Counter(item["state"] for item in bound)
        return {"source_binding": "SOURCE_BINDING_PROVEN", "source": JULES_SOURCE, "provider_session_count": len(bound), "provider_state_counts": dict(sorted(counts.items())), "sessions": bound, "pages": pages}

    def inspect_session(self, session_id: str) -> dict[str, Any]:
        session = self.get_bound_session(session_id)
        return {"source_binding": "SOURCE_BINDING_PROVEN", "session": self._sanitize_session(session)}

    def inspect_activities(self, session_id: str) -> dict[str, Any]:
        session = self.get_bound_session(session_id)
        raw_name = session.get("name")
        if not isinstance(raw_name, str) or not raw_name.startswith("sessions/"):
            raise SourceBindingError("session resource name invalid")
        sid = _resource_id(raw_name.split("/", 1)[1], "session_id")
        activities, pages = self._paginate(f"/sessions/{sid}/activities", "activities")
        return {"source_binding": "SOURCE_BINDING_PROVEN", "session_key": _stable_key(raw_name), "activities": [self._sanitize_activity(activity) for activity in activities], "activity_count": len(activities), "pages": pages}

    @staticmethod
    def _sanitize_session(session: Mapping[str, Any]) -> dict[str, Any]:
        name = session.get("name") if isinstance(session.get("name"), str) else "unknown-session"
        state = session.get("state") if isinstance(session.get("state"), str) else "UNKNOWN"
        create_time = session.get("createTime") if isinstance(session.get("createTime"), str) else None
        update_time = session.get("updateTime") if isinstance(session.get("updateTime"), str) else None
        return {"session_key": _stable_key(name), "state": state, "create_time": create_time, "update_time": update_time, "source_binding": "SOURCE_BINDING_PROVEN"}

    @staticmethod
    def _sanitize_activity(activity: Mapping[str, Any]) -> dict[str, Any]:
        name = activity.get("name") if isinstance(activity.get("name"), str) else "unknown-activity"
        originator = activity.get("originator") if isinstance(activity.get("originator"), str) else "UNKNOWN"
        create_time = activity.get("createTime") if isinstance(activity.get("createTime"), str) else None
        kinds = sorted(key for key, value in activity.items() if key not in {"name", "id", "originator", "description", "createTime"} and value is not None)
        artifact_digests: list[str] = []
        artifacts = activity.get("artifacts")
        if isinstance(artifacts, list):
            for artifact in artifacts[:20]:
                if isinstance(artifact, Mapping):
                    artifact_digests.append(_json_digest(artifact))
        return {"activity_key": _stable_key(name), "originator": originator, "create_time": create_time, "kinds": kinds[:20], "artifact_digests": artifact_digests}

    def probe(self) -> dict[str, Any]:
        source = self.inspect_sources()
        sessions = self.inspect_sessions()
        return {"schema_version": "1.0", "project_id": PROJECT_ID, "route": ROUTE, "repository": REPOSITORY, "observed_at": _utc_now(), "provider_read_complete": True, "source_binding": "SOURCE_BINDING_PROVEN", "source": source["source"], "provider_session_count": sessions["provider_session_count"], "provider_state_counts": sessions["provider_state_counts"], "requests_performed": self.request_count, "bytes_read": self.bytes_read, "provider_mutation_performed": False, "external_effects_dispatched": 0, "new_tasks_or_sessions_created": 0, "safe_to_blind_retry": False, "sessions": sessions["sessions"]}


def _main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="RP03 GET-only Jules shadow read")
    parser.add_argument("--probe", action="store_true", help="run fixed bounded RP03 source/session probe")
    args = parser.parse_args(list(argv) if argv is not None else None)
    if not args.probe:
        parser.error("only --probe is supported")
    key = os.environ.get(API_KEY_ENV, "")
    if not key:
        print(json.dumps({"status": "SECRET_NOT_CONFIGURED", "provider_mutation_performed": False, "safe_to_blind_retry": False}, sort_keys=True))
        return 3
    try:
        receipt = ShadowReader(key).probe()
    except ShadowReadError as exc:
        print(json.dumps({"status": type(exc).__name__, "provider_read_complete": False, "provider_mutation_performed": False, "external_effects_dispatched": 0, "safe_to_blind_retry": False}, sort_keys=True))
        return 2
    print(json.dumps(receipt, sort_keys=True, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    sys.exit(_main())
