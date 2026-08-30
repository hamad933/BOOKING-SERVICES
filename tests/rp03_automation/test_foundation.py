import unittest
from tools.rp03_automation.foundation import *

BASE={"schema_version":"1.0","request_id":"REQ-001","action":"inspect.sessions","workstream_id":"RP03-AUTO-W01-FOUNDATION","expected_branch":"feat/rp03-automation-gateway-foundation","expected_head_sha":"0"*40,"payload":{"page_size":100}}

def mutation(action="mutation.create_session"):
    payload={"source":"sources/github/hamad933/BOOKING-SERVICES","branch":"work/rp03-canary","starting_commit":"a"*40,"title":"bounded canary","prompt":"Do the bounded task.","require_plan_approval":True}
    if action=="mutation.send_message": payload={"session_id":"SESSION-001","expected_state":"AWAITING_USER_FEEDBACK","expected_update_time":"2026-08-30T18:00:00Z","prompt":"Continue bounded task."}
    return {"schema_version":"1.0","request_id":"REQ-MUT-001","action":action,"workstream_id":"RP03-AUTO-W03-MUTATION","expected_branch":"work/rp03-canary","expected_head_sha":"a"*40,"logical_task_id":"TASK-001","write_domain":"domain-a","mutation_gate":True,"payload":payload}

class FoundationTests(unittest.TestCase):
    def test_trusted_binding_and_unknown_top_field(self):
        n=normalize_request(BASE); self.assertEqual((n["project_id"],n["route"],n["repository"]),("RP03","RP03","hamad933/BOOKING-SERVICES"))
        with self.assertRaises(SchemaError): normalize_request(dict(BASE,project_id="OTHER"))

    def test_action_payload_is_strict(self):
        r=dict(BASE); r["payload"]={"page_size":10,"automationMode":"AUTO_CREATE_PR"}
        with self.assertRaises(SchemaError): normalize_request(r)

    def test_create_session_requires_plan_approval_and_isolated_branch(self):
        r=mutation(); self.assertEqual(normalize_request(r)["action_class"],"MUTATION")
        r["payload"]=dict(r["payload"],require_plan_approval=False)
        with self.assertRaises(SchemaError): normalize_request(r)
        r=mutation(); r["payload"]=dict(r["payload"],branch="main")
        with self.assertRaises(SchemaError): normalize_request(r)

    def test_secret_like_input_and_evidence_redaction(self):
        r=dict(BASE); r["payload"]={"page_token":"ghp_"+("A"*36)}
        with self.assertRaises(SecretLikeInputError): normalize_request(r)
        red=redact_for_evidence({"session_id":"S-1","prompt":"private","safe":"visible"})
        self.assertEqual(red,{"session_id":"<redacted>","prompt":"<redacted>","safe":"visible"})

    def test_request_and_effect_identity_stable_and_scope_bound(self):
        n=normalize_request(mutation()); self.assertEqual(request_digest(n),request_digest({k:n[k] for k in reversed(list(n))}))
        first=derive_effect_identity(n).key; n2=dict(n,write_domain="domain-b"); self.assertNotEqual(first,derive_effect_identity(n2).key)

    def test_idempotency_new_terminal_unknown_and_collision(self):
        self.assertEqual(decide(None,identity_key="e",request_digest="d").decision,Decision.EXECUTE_NEW)
        terminal=OperationRecord("e","d",OperationState.COMPLETED,"r")
        self.assertEqual(decide(terminal,identity_key="e",request_digest="d").decision,Decision.RETURN_TERMINAL)
        unknown=OperationRecord("e","d",OperationState.UNKNOWN_WRITE_OUTCOME)
        self.assertEqual(decide(unknown,identity_key="e",request_digest="d").decision,Decision.RECONCILE_FIRST)
        with self.assertRaises(IdentityCollisionError): decide(terminal,identity_key="e",request_digest="different")

    def test_reconciliation_never_blind_retries(self):
        unknown=OperationRecord("e","d",OperationState.UNKNOWN_WRITE_OUTCOME)
        no=reconcile_unknown(unknown,ProviderObservation.NOT_APPLIED); self.assertTrue(no.provider_write_authorized); self.assertFalse(no.safe_to_blind_retry)
        self.assertEqual(decide(no.next_record,identity_key="e",request_digest="d").decision,Decision.EXECUTE_RECONCILED_RETRY)
        amb=reconcile_unknown(unknown,ProviderObservation.AMBIGUOUS); self.assertFalse(amb.provider_write_authorized); self.assertEqual(amb.next_record.state,OperationState.RECONCILIATION_REQUIRED)
        yes=reconcile_unknown(unknown,ProviderObservation.APPLIED); self.assertEqual(yes.next_record.state,OperationState.COMPLETED); self.assertFalse(yes.provider_write_authorized)

    def test_mutation_kill_switch_default_disabled_and_exact(self):
        n=normalize_request(mutation("mutation.send_message"))
        with self.assertRaises(MutationGateError): assert_mutation_gate(n,{})
        with self.assertRaises(MutationGateError): assert_mutation_gate(n,{MUTATION_ENABLE_ENV:"true"})
        assert_mutation_gate(n,{MUTATION_ENABLE_ENV:MUTATION_ENABLE_VALUE})

    def test_publication_guards(self):
        self.assertEqual(validate_publication_paths(["assets/js/example.js"],allowed_prefixes=("assets/js",)),("assets/js/example.js",))
        for path in ("../x",".github/workflows/x.yml","tools/rp03_automation/x.py","server/x.php","assets/js/../x.js",".env"):
            with self.assertRaises(UnsafePublicationError): validate_publication_paths([path],allowed_prefixes=("assets/js",))
        for mode in ("120000","160000"):
            with self.assertRaises(UnsafePublicationError): assert_safe_git_mode(mode)
        assert_safe_git_mode("100644")
        with self.assertRaises(UnsafePublicationError): assert_text_patch("a\x00b")

    def test_receipt_is_redacted_and_never_blind_retry_safe(self):
        req={"request_id":"REQ-1","workstream_id":"WS-1","action":"mutation.send_message","payload":{"session_id":"S-1","prompt":"bounded"}}
        r=build_receipt(request=req,request_digest="d"*64,outcome="UNKNOWN_WRITE_OUTCOME",observed_at="2026-08-30T18:00:00Z",provider_mutation_performed=True,external_effects_dispatched=1)
        self.assertFalse(r["safe_to_blind_retry"]); self.assertEqual(r["request"]["payload"]["session_id"],"<redacted>")

if __name__=="__main__": unittest.main()
