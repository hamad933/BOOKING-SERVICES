import unittest
from copy import deepcopy

from tools.rp03_automation.foundation import *

BASE = {
    "schema_version": "1.0",
    "request_id": "REQ-001",
    "action": "inspect.sessions",
    "workstream_id": "RP03-AUTO-W01-FOUNDATION",
    "expected_branch": "feat/rp03-automation-gateway-foundation",
    "expected_head_sha": "0" * 40,
    "payload": {"page_size": 100, "source": JULES_SOURCE},
}


def mutation(action="mutation.create_session"):
    payload = {
        "source": JULES_SOURCE,
        "branch": "work/rp03-canary",
        "starting_commit": "a" * 40,
        "title": "bounded canary",
        "prompt": "Do the bounded task.",
        "require_plan_approval": True,
    }
    if action == "mutation.send_message":
        payload = {
            "session_id": "SESSION-001",
            "expected_state": "AWAITING_USER_FEEDBACK",
            "expected_update_time": "2026-08-30T18:00:00Z",
            "prompt": "Continue bounded task.",
        }
    if action == "mutation.approve_plan":
        payload = {
            "session_id": "SESSION-001",
            "expected_state": "AWAITING_PLAN_APPROVAL",
            "expected_update_time": "2026-08-30T18:00:00Z",
            "plan_id": "PLAN-001",
            "plan_digest": "b" * 64,
        }
    return {
        "schema_version": "1.0",
        "request_id": "REQ-MUT-001",
        "action": action,
        "workstream_id": "RP03-AUTO-W03-MUTATION",
        "expected_branch": "work/rp03-canary",
        "expected_head_sha": "a" * 40,
        "logical_task_id": "TASK-001",
        "write_domain": "domain-a",
        "mutation_gate": True,
        "payload": payload,
    }


class FoundationTests(unittest.TestCase):
    def test_trusted_binding_and_unknown_top_field(self):
        normalized = normalize_request(BASE)
        self.assertEqual(
            (normalized["project_id"], normalized["route"], normalized["repository"]),
            ("RP03", "RP03", "hamad933/BOOKING-SERVICES"),
        )
        with self.assertRaises(SchemaError):
            normalize_request(dict(BASE, project_id="OTHER"))

    def test_read_source_is_required_and_exact(self):
        bad = dict(BASE)
        bad["payload"] = {"page_size": 10}
        with self.assertRaises(SchemaError):
            normalize_request(bad)
        bad = dict(BASE)
        bad["payload"] = {"page_size": 10, "source": "sources/github/example/other"}
        with self.assertRaises(SchemaError):
            normalize_request(bad)

    def test_action_payload_is_strict(self):
        request = dict(BASE)
        request["payload"] = {"page_size": 10, "source": JULES_SOURCE, "automationMode": "AUTO_CREATE_PR"}
        with self.assertRaises(SchemaError):
            normalize_request(request)

    def test_create_session_requires_plan_approval_and_isolated_branch(self):
        request = mutation()
        self.assertEqual(normalize_request(request)["action_class"], "MUTATION")
        request["payload"] = dict(request["payload"], require_plan_approval=False)
        with self.assertRaises(SchemaError):
            normalize_request(request)
        request = mutation()
        request["payload"] = dict(request["payload"], branch="main")
        request["expected_branch"] = "main"
        with self.assertRaises(SchemaError):
            normalize_request(request)

    def test_create_session_source_branch_and_sha_must_match_trusted_envelope(self):
        request = mutation()
        request["payload"] = dict(request["payload"], source="sources/github/example/other")
        with self.assertRaises(SchemaError):
            normalize_request(request)
        request = mutation()
        request["payload"] = dict(request["payload"], branch="work/other")
        with self.assertRaises(SchemaError):
            normalize_request(request)
        request = mutation()
        request["payload"] = dict(request["payload"], starting_commit="c" * 40)
        with self.assertRaises(SchemaError):
            normalize_request(request)

    def test_all_mutations_require_isolated_expected_branch(self):
        request = mutation("mutation.send_message")
        request["expected_branch"] = "main"
        with self.assertRaises(SchemaError):
            normalize_request(request)

    def test_secret_like_input_and_evidence_redaction(self):
        request = dict(BASE)
        request["payload"] = {"source": JULES_SOURCE, "page_token": "ghp_" + ("A" * 36)}
        with self.assertRaises(SecretLikeInputError):
            normalize_request(request)
        redacted = redact_for_evidence({"session_id": "S-1", "prompt": "private", "page_token": "opaque", "safe": "visible"})
        self.assertEqual(
            redacted,
            {"session_id": "<redacted>", "prompt": "<redacted>", "page_token": "<redacted>", "safe": "visible"},
        )

    def test_request_identity_is_request_id_bound_while_digest_is_payload_bound(self):
        first = normalize_request(BASE)
        changed_raw = deepcopy(BASE)
        changed_raw["payload"]["page_size"] = 50
        changed = normalize_request(changed_raw)
        self.assertEqual(request_identity_key(first), request_identity_key(changed))
        self.assertNotEqual(request_digest(first), request_digest(changed))

    def test_effect_identity_is_stable_and_scope_bound(self):
        normalized = normalize_request(mutation())
        first = derive_effect_identity(normalized).key
        changed_domain = dict(normalized, write_domain="domain-b")
        self.assertNotEqual(first, derive_effect_identity(changed_domain).key)
        changed_branch = dict(normalized, expected_branch="work/other")
        self.assertNotEqual(first, derive_effect_identity(changed_branch).key)

    def test_idempotency_new_terminal_unknown_and_collision(self):
        self.assertEqual(decide(None, identity_key="e", request_digest="d").decision, Decision.EXECUTE_NEW)
        terminal = OperationRecord("e", "d", OperationState.COMPLETED, "r")
        self.assertEqual(decide(terminal, identity_key="e", request_digest="d").decision, Decision.RETURN_TERMINAL)
        unknown = OperationRecord("e", "d", OperationState.UNKNOWN_WRITE_OUTCOME)
        self.assertEqual(decide(unknown, identity_key="e", request_digest="d").decision, Decision.RECONCILE_FIRST)
        with self.assertRaises(IdentityCollisionError):
            decide(terminal, identity_key="e", request_digest="different")

    def test_reconciliation_never_blind_retries(self):
        unknown = OperationRecord("e", "d", OperationState.UNKNOWN_WRITE_OUTCOME)
        not_applied = reconcile_unknown(unknown, ProviderObservation.NOT_APPLIED)
        self.assertTrue(not_applied.provider_write_authorized)
        self.assertFalse(not_applied.safe_to_blind_retry)
        self.assertEqual(
            decide(not_applied.next_record, identity_key="e", request_digest="d").decision,
            Decision.EXECUTE_RECONCILED_RETRY,
        )
        ambiguous = reconcile_unknown(unknown, ProviderObservation.AMBIGUOUS)
        self.assertFalse(ambiguous.provider_write_authorized)
        self.assertEqual(ambiguous.next_record.state, OperationState.RECONCILIATION_REQUIRED)
        applied = reconcile_unknown(unknown, ProviderObservation.APPLIED)
        self.assertEqual(applied.next_record.state, OperationState.COMPLETED)
        self.assertFalse(applied.provider_write_authorized)

    def test_mutation_kill_switch_default_disabled_and_exact(self):
        normalized = normalize_request(mutation("mutation.send_message"))
        with self.assertRaises(MutationGateError):
            assert_mutation_gate(normalized, {})
        with self.assertRaises(MutationGateError):
            assert_mutation_gate(normalized, {MUTATION_ENABLE_ENV: "true"})
        assert_mutation_gate(normalized, {MUTATION_ENABLE_ENV: MUTATION_ENABLE_VALUE})

    def test_publication_guards(self):
        self.assertEqual(
            validate_publication_paths(["assets/js/example.js"], allowed_prefixes=("assets/js",)),
            ("assets/js/example.js",),
        )
        for path in (
            "../x", ".github/workflows/x.yml", "tools/rp03_automation/x.py", "server/x.php",
            "assets/js/../x.js", ".env",
        ):
            with self.assertRaises(UnsafePublicationError):
                validate_publication_paths([path], allowed_prefixes=("assets/js",))
        for mode in ("120000", "160000"):
            with self.assertRaises(UnsafePublicationError):
                assert_safe_git_mode(mode)
        assert_safe_git_mode("100644")
        with self.assertRaises(UnsafePublicationError):
            assert_text_patch("a\x00b")
        with self.assertRaises(UnsafePublicationError):
            assert_text_patch("+x-goog-api-key: AIza" + ("A" * 32))

    def test_receipt_validation_redaction_and_no_blind_retry(self):
        request = normalize_request(mutation("mutation.send_message"))
        receipt = build_receipt(
            request=request,
            request_digest=request_digest(request),
            outcome="UNKNOWN_WRITE_OUTCOME",
            observed_at="2026-08-30T18:00:00Z",
            provider_mutation_performed=True,
            external_effects_dispatched=1,
        )
        self.assertFalse(receipt["safe_to_blind_retry"])
        self.assertTrue(receipt["request_identity_key"].startswith("rp03:v1:request:"))
        self.assertEqual(receipt["request"]["payload"]["session_id"], "<redacted>")
        with self.assertRaises(SchemaError):
            build_receipt(
                request=request,
                request_digest="bad",
                outcome="X",
                observed_at="2026-08-30T18:00:00Z",
            )


if __name__ == "__main__":
    unittest.main()
