import json
import unittest
from urllib.parse import parse_qs, urlparse

from tools.rp03_automation.foundation import JULES_SOURCE
from tools.rp03_automation.shadow_read import BASE_URL, BudgetExceeded, PaginationError, ProviderHTTPError, ReadBudget, ShadowReadError, ShadowReader, SourceBindingError, UnsafeProviderRequest


class FakeTransport:
    def __init__(self, routes):
        self.routes = routes
        self.calls = []

    def __call__(self, method, url, headers, timeout, max_bytes):
        self.calls.append((method, url, dict(headers), timeout, max_bytes))
        parsed = urlparse(url)
        key = (parsed.path, tuple(sorted((k, tuple(v)) for k, v in parse_qs(parsed.query).items())))
        value = self.routes.get(key)
        if value is None:
            value = self.routes.get(parsed.path)
        if value is None:
            raise AssertionError(f"unexpected route {url}")
        if callable(value):
            value = value(method, url, headers, timeout, max_bytes)
        if isinstance(value, tuple):
            return value
        return 200, json.dumps(value).encode()


def bound_session(sid="S1", state="COMPLETED"):
    return {"name": f"sessions/{sid}", "id": sid, "title": "must never persist", "prompt": "must never persist", "state": state, "createTime": "2026-08-30T18:00:00Z", "updateTime": "2026-08-30T18:01:00Z", "sourceContext": {"source": JULES_SOURCE}, "outputs": [{"pullRequest": {"url": "https://example.invalid/private"}}]}


class ShadowReadTests(unittest.TestCase):
    def test_fixed_get_only_transport_and_header_is_not_in_output(self):
        transport = FakeTransport({"/v1alpha/sources": {"sources": [{"name": JULES_SOURCE, "githubRepo": {"owner": "hamad933", "repo": "BOOKING-SERVICES"}}]}, "/v1alpha/sessions": {"sessions": [bound_session()]}})
        reader = ShadowReader("AIza" + "A" * 35, transport=transport)
        receipt = reader.probe()
        self.assertTrue(receipt["provider_read_complete"])
        self.assertFalse(receipt["provider_mutation_performed"])
        self.assertEqual(receipt["external_effects_dispatched"], 0)
        self.assertFalse(receipt["safe_to_blind_retry"])
        self.assertNotIn("must never persist", json.dumps(receipt))
        for method, url, headers, _, _ in transport.calls:
            self.assertEqual(method, "GET")
            self.assertTrue(url.startswith(BASE_URL + "/"))
            self.assertIn("x-goog-api-key", headers)
            self.assertNotIn(headers["x-goog-api-key"], json.dumps(receipt))

    def test_source_binding_exact_and_repo_binding(self):
        for source in ({"name": "sources/github/example/other", "githubRepo": {"owner": "example", "repo": "other"}}, {"name": JULES_SOURCE, "githubRepo": {"owner": "wrong", "repo": "BOOKING-SERVICES"}}):
            reader = ShadowReader("k", transport=FakeTransport({"/v1alpha/sources": {"sources": [source]}}))
            with self.assertRaises(SourceBindingError):
                reader.inspect_sources()

    def test_list_sessions_fetches_detail_when_summary_lacks_source_and_filters_other_sources(self):
        routes = {"/v1alpha/sessions": {"sessions": [{"name": "sessions/A", "state": "COMPLETED"}, {"name": "sessions/B", "state": "FAILED"}]}, "/v1alpha/sessions/A": bound_session("A", "COMPLETED"), "/v1alpha/sessions/B": {**bound_session("B", "FAILED"), "sourceContext": {"source": "sources/github/example/other"}}}
        result = ShadowReader("k", transport=FakeTransport(routes)).inspect_sessions()
        self.assertEqual(result["provider_session_count"], 1)
        self.assertEqual(result["provider_state_counts"], {"COMPLETED": 1})

    def test_get_session_rejects_cross_source(self):
        session = {**bound_session(), "sourceContext": {"source": "sources/github/example/other"}}
        reader = ShadowReader("k", transport=FakeTransport({"/v1alpha/sessions/S1": session}))
        with self.assertRaises(SourceBindingError):
            reader.inspect_session("S1")

    def test_activities_are_sanitized_and_artifacts_only_digested(self):
        artifact = {"changeSet": {"source": JULES_SOURCE, "gitPatch": {"baseCommitId": "a" * 40, "unidiffPatch": "SECRET PATCH BODY"}}}
        routes = {"/v1alpha/sessions/S1": bound_session(), "/v1alpha/sessions/S1/activities": {"activities": [{"name": "sessions/S1/activities/A1", "originator": "agent", "description": "private message", "createTime": "2026-08-30T18:02:00Z", "artifacts": [artifact]}]}}
        result = ShadowReader("k", transport=FakeTransport(routes)).inspect_activities("S1")
        encoded = json.dumps(result)
        self.assertNotIn("private message", encoded)
        self.assertNotIn("SECRET PATCH BODY", encoded)
        self.assertEqual(len(result["activities"][0]["artifact_digests"][0]), 64)

    def test_duplicate_page_token_fails_closed(self):
        def page(method, url, headers, timeout, max_bytes):
            return 200, json.dumps({"sessions": [], "nextPageToken": "same"}).encode()
        with self.assertRaises(PaginationError):
            ShadowReader("k", transport=FakeTransport({"/v1alpha/sessions": page})).inspect_sessions()

    def test_page_and_item_budgets_fail_closed(self):
        def page(method, url, headers, timeout, max_bytes):
            parsed = urlparse(url)
            token = parse_qs(parsed.query).get("pageToken", [None])[0]
            return 200, json.dumps({"sessions": [{"name": f"sessions/{token or 'A'}", "sourceContext": {"source": JULES_SOURCE}}], "nextPageToken": "B" if token is None else "C"}).encode()
        with self.assertRaises(BudgetExceeded):
            ShadowReader("k", transport=FakeTransport({"/v1alpha/sessions": page}), budget=ReadBudget(max_pages=1)).inspect_sessions()
        many = {"sessions": [bound_session(str(i)) for i in range(3)]}
        with self.assertRaises(BudgetExceeded):
            ShadowReader("k", transport=FakeTransport({"/v1alpha/sessions": many}), budget=ReadBudget(max_items=2)).inspect_sessions()

    def test_response_byte_budget_and_invalid_json(self):
        with self.assertRaises(BudgetExceeded):
            ShadowReader("k", transport=FakeTransport({"/v1alpha/sessions/S1": (200, b"x" * 2048)}), budget=ReadBudget(max_response_bytes=1024)).inspect_session("S1")
        with self.assertRaises(ShadowReadError):
            ShadowReader("k", transport=FakeTransport({"/v1alpha/sessions/S1": (200, b"not-json")})).inspect_session("S1")

    def test_non_success_status_is_provider_error_and_not_retried(self):
        transport = FakeTransport({"/v1alpha/sessions/S1": (429, b'{"error":"rate"}')})
        reader = ShadowReader("k", transport=transport)
        with self.assertRaises(ProviderHTTPError) as ctx:
            reader.inspect_session("S1")
        self.assertEqual(ctx.exception.status, 429)
        self.assertEqual(len(transport.calls), 1)

    def test_path_and_api_key_guards(self):
        reader = ShadowReader("k", transport=FakeTransport({}))
        for path in ("https://evil.test", "/../sessions", "/sessions/x:sendMessage", "/sessions/x/activities/1"):
            with self.assertRaises(UnsafeProviderRequest):
                reader._url(path)
        with self.assertRaises(UnsafeProviderRequest):
            ShadowReader("a\nmalicious", transport=FakeTransport({}))


if __name__ == "__main__":
    unittest.main()
