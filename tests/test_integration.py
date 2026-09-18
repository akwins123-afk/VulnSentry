"""
Integration tests for VulnSentry.
Verifies:
- SecurityAgent integration with ToolValidator and ExecutionTracer
- Clean execution scan DAG
- Rule 2 self-correction recovery loop trace sequence
- run_audit.py execution and audit_trace.json export
"""
from pathlib import Path
import json
import sys
import unittest

# Ensure workspace root is in sys.path
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))

from glassbox.events import REQUIRED_EVENT_FIELDS, EventStatus, EventType
from glassbox.tracer import ExecutionTracer
from validation.tool_validator import ToolValidator
from tools.schemas import TOOL_SCHEMAS
from agent.agent import SecurityAgent
import run_audit


class TestVulnSentryIntegration(unittest.TestCase):
    """Integration test suite for SecurityAgent, ToolValidator, and ExecutionTracer."""

    def setUp(self) -> None:
        self.tracer = ExecutionTracer()
        self.validator = ToolValidator(schemas=TOOL_SCHEMAS)
        self.agent = SecurityAgent(
            tracer=self.tracer,
            validator=self.validator,
            mock_mode=True,
        )
        fixture_path = WORKSPACE_ROOT / "test_fixtures" / "vulnerable_app.py"
        self.code_snippet = fixture_path.read_text(encoding="utf-8")

    def test_tool_validator_schemas_registered(self) -> None:
        """Verify that agent registers TOOL_SCHEMAS on ToolValidator."""
        self.assertIn("run_sql_injection_scan", self.validator.schemas)
        self.assertIn("run_secret_leak_scan", self.validator.schemas)

    def test_clean_scan_execution_and_dag(self) -> None:
        """
        Verify that a clean scan produces:
        - Valid finding dictionary
        - Proper DAG events with all required fields
        - No unhandled exceptions
        """
        run_id = self.tracer.start_run(metadata={"test": "clean_scan"})
        finding = self.agent.analyze_code(self.code_snippet, trigger_demo_failure=False)

        self.assertIsInstance(finding, dict)
        self.assertIn("vulnerability_detected", finding)
        self.assertTrue(finding["vulnerability_detected"])
        self.assertIn("title", finding)
        self.assertIn("severity", finding)

        events = self.tracer.get_events(run_id)
        self.assertGreater(len(events), 0)

        # Verify event types present
        event_types = [e.event_type for e in events]
        self.assertIn("USER_QUERY", event_types)
        self.assertIn("LLM_CALL", event_types)
        self.assertIn("TOOL_SELECTION", event_types)
        self.assertIn("TOOL_VALIDATION", event_types)
        self.assertIn("TOOL_CALL", event_types)
        self.assertIn("TOOL_RESULT", event_types)
        self.assertIn("FINAL_RESPONSE", event_types)

        # In clean scan, FAILURE_DETECTED and RECOVERY must NOT appear
        self.assertNotIn("FAILURE_DETECTED", event_types)
        self.assertNotIn("RECOVERY", event_types)

        # Verify all 11 required fields on every event
        for event in events:
            ev_dict = event.to_dict()
            for req_field in REQUIRED_EVENT_FIELDS:
                self.assertIn(req_field, ev_dict)
            self.assertIsNotNone(event.status)

    def test_self_correction_recovery_loop(self) -> None:
        """
        Verify Rule 2 Self-Correction Recovery Loop when trigger_demo_failure=True:
        TOOL_SELECTION
        -> TOOL_VALIDATION (FAILURE)
        -> FAILURE_DETECTED
        -> RECOVERY
        -> TOOL_CALL
        -> TOOL_RESULT
        -> FINAL_RESPONSE
        """
        run_id = self.tracer.start_run(metadata={"test": "self_correction_recovery"})
        finding = self.agent.analyze_code(self.code_snippet, trigger_demo_failure=True)

        self.assertIsInstance(finding, dict)
        self.assertTrue(finding["vulnerability_detected"])

        events = self.tracer.get_events(run_id)
        event_types = [e.event_type for e in events]

        self.assertIn("FAILURE_DETECTED", event_types)
        self.assertIn("RECOVERY", event_types)

        # Check TOOL_VALIDATION status was FAILURE
        val_events = [e for e in events if e.event_type == "TOOL_VALIDATION"]
        self.assertTrue(any(e.status == "FAILURE" for e in val_events))

        # Check FAILURE_DETECTED event
        fail_events = [e for e in events if e.event_type == "FAILURE_DETECTED"]
        self.assertEqual(len(fail_events), 1)
        fail_ev = fail_events[0]
        self.assertEqual(fail_ev.status, "FAILURE")
        self.assertIn("force_gas", str(fail_ev.error))

        # Check RECOVERY event
        recovery_events = [e for e in events if e.event_type == "RECOVERY"]
        self.assertEqual(len(recovery_events), 1)
        rec_ev = recovery_events[0]
        self.assertEqual(rec_ev.status, "SUCCESS")
        self.assertNotIn("force_gas", rec_ev.input.get("corrected_arguments", {}))

    def test_run_audit_end_to_end(self) -> None:
        """Verify run_audit() executes completely and generates audit_trace.json."""
        finding_1, finding_2, trace_path = run_audit.run_audit()

        self.assertIsInstance(finding_1, dict)
        self.assertIsInstance(finding_2, dict)
        self.assertTrue(trace_path.exists())

        trace_data = json.loads(trace_path.read_text(encoding="utf-8"))
        self.assertIn("run_id", trace_data)
        self.assertEqual(trace_data["status"], "COMPLETED")
        self.assertIn("events", trace_data)
        self.assertIn("dag", trace_data)
        self.assertGreaterEqual(len(trace_data["events"]), 15)


if __name__ == "__main__":
    unittest.main()
