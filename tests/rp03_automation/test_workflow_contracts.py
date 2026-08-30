import json
import unittest
from pathlib import Path


WORKFLOW = Path('.github/workflows/rp03-automation-shadow-read.yml')
MARKER = Path('tools/rp03_automation/live_probe_request.json')
BASELINE = '18af07d7fbd3c41ae9c40b881f7deab11c2fe345'


class WorkflowContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.workflow_text = WORKFLOW.read_text(encoding='utf-8')
        cls.marker = json.loads(MARKER.read_text(encoding='utf-8'))

    def test_main_push_trigger_is_path_scoped_and_manual_dispatch_remains(self):
        text = self.workflow_text
        self.assertIn('push:\n    branches: [main]\n    paths:\n      - \'tools/rp03_automation/live_probe_request.json\'', text)
        self.assertIn('workflow_dispatch:', text)
        self.assertIn("github.event_name == 'push' && github.ref == 'refs/heads/main'", text)
        self.assertNotIn("github.event_name == 'pull_request' &&", text.split('live-shadow-read:', 1)[1])

    def test_permissions_remain_read_only(self):
        text = self.workflow_text
        self.assertNotIn('contents: write', text)
        self.assertIn('permissions:\n  contents: read', text)
        self.assertIn('permissions:\n      contents: read', text)

    def test_credential_environment_is_step_scoped(self):
        live_section = self.workflow_text.split('live-shadow-read:', 1)[1]
        before_steps, steps = live_section.split('    steps:', 1)
        self.assertNotIn('JULES_API_KEY', before_steps)
        self.assertEqual(steps.count('JULES_API_KEY: ${{ secrets.JULES_API_KEY }}'), 2)
        self.assertNotIn('echo "$JULES_API_KEY"', steps)
        self.assertNotIn('printenv', steps)

    def test_push_request_binding_is_exact_and_non_mutating(self):
        self.assertEqual(
            self.marker,
            {
                'schema_version': '1.0',
                'request_id': 'RP03-AUTO-W02-LIVE-20260830T1935Z',
                'action': 'GET_ONLY_SHADOW_PROBE',
                'repository': 'hamad933/BOOKING-SERVICES',
                'expected_parent_sha': BASELINE,
                'provider_mutation_authorized': False,
            },
        )
        self.assertNotIn('session_id', self.marker)
        self.assertNotIn('prompt', self.marker)

    def test_push_guard_compares_marker_parent_to_event_before(self):
        text = self.workflow_text
        self.assertIn('EXPECTED_BEFORE: ${{ github.event.before }}', text)
        self.assertIn("'expected_parent_sha': os.environ['EXPECTED_BEFORE']", text)
        self.assertIn("'provider_mutation_authorized': False", text)
        self.assertIn('MAIN_ONLY_PROBE_REQUEST_BINDING_PROVEN', text)

    def test_live_receipt_contract_is_zero_effect_and_no_blind_retry(self):
        text = self.workflow_text
        self.assertIn("data['provider_read_complete'] is True", text)
        self.assertIn("data['source_binding'] == 'SOURCE_BINDING_PROVEN'", text)
        self.assertIn("data['provider_mutation_performed'] is False", text)
        self.assertIn("data['external_effects_dispatched'] == 0", text)
        self.assertIn("data['new_tasks_or_sessions_created'] == 0", text)
        self.assertIn("data['safe_to_blind_retry'] is False", text)


if __name__ == '__main__':
    unittest.main()
