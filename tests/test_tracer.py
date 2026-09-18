"""
Tests for ExecutionTracer in the Glass Box observability layer.
Simulates end-to-end execution chains with parent-child DAG linking and validates all required fields.
"""

import json
import os
from pathlib import Path
import sys
import tempfile
import unittest

# Ensure project root is in sys.path for direct script execution
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from glassbox.events import (
    REQUIRED_EVENT_FIELDS,
    Event,
    EventStatus,
    EventType,
    Run,
)
from glassbox.tracer import ExecutionTracer


class TestExecutionTracer(unittest.TestCase):
    """Test suite for ExecutionTracer and parent-child event DAG tracking."""

    def setUp(self) -> None:
        self.tracer = ExecutionTracer()

    def test_simulated_execution_chain(self) -> None:
        """
        Simulate the required end-to-end pipeline:
        USER_QUERY
         -> CONTEXT_SELECTED
         -> LLM_CALL
         -> TOOL_SELECTION
         -> TOOL_VALIDATION
         -> TOOL_CALL
         -> TOOL_RESULT
         -> FINAL_RESPONSE

        Asserts all events are linked via parent_event_id, forming an execution DAG.
        """
        run_id = self.tracer.start_run(metadata={"scanner": "VulnSentry", "version": "1.0"})
        self.assertIsNotNone(run_id)
        self.assertEqual(self.tracer.current_run_id, run_id)

        # 1. USER_QUERY (Root event, no parent)
        e_user_query = self.tracer.log_event(
            event_type=EventType.USER_QUERY,
            parent_event_id=None,
            input={"query": "Scan repository for SQL injection vulnerabilities"},
            output={"normalized_query": "Scan repository for SQL injection vulnerabilities"},
            status="SUCCESS",
            duration_ms=10.2,
            metadata={"source": "cli", "user": "Jeevan"},
        )
        self.assertIsNone(e_user_query.parent_event_id)
        self.assertEqual(e_user_query.event_type, "USER_QUERY")

        # 2. CONTEXT_SELECTED (Child of USER_QUERY)
        e_context_selected = self.tracer.log_event(
            event_type=EventType.CONTEXT_SELECTED,
            parent_event_id=e_user_query.event_id,
            input={"repo_path": "/app", "filters": ["*.py"]},
            output={"selected_files": ["app/views.py", "app/database.py"]},
            status="SUCCESS",
            duration_ms=25.0,
            metadata={"files_count": 2},
        )
        self.assertEqual(e_context_selected.parent_event_id, e_user_query.event_id)
        self.assertEqual(e_context_selected.event_type, "CONTEXT_SELECTED")

        # 3. LLM_CALL (Child of CONTEXT_SELECTED)
        e_llm_call = self.tracer.log_event(
            event_type=EventType.LLM_CALL,
            parent_event_id=e_context_selected.event_id,
            input={
                "prompt": "Analyze selected files for SQL injection patterns",
                "model": "gemini-1.5-pro",
            },
            output={"decision": "Use semgrep with rule python.lang.security.injection"},
            status="SUCCESS",
            duration_ms=512.4,
            metadata={"tokens": 340},
        )
        self.assertEqual(e_llm_call.parent_event_id, e_context_selected.event_id)
        self.assertEqual(e_llm_call.event_type, "LLM_CALL")

        # 4. TOOL_SELECTION (Child of LLM_CALL)
        e_tool_selection = self.tracer.log_event(
            event_type=EventType.TOOL_SELECTION,
            parent_event_id=e_llm_call.event_id,
            input={"candidates": ["semgrep", "bandit", "trufflehog"]},
            output={"tool": "semgrep", "ruleset": "p/sql-injection"},
            status="SUCCESS",
            duration_ms=4.8,
            metadata={"confidence": 0.95},
        )
        self.assertEqual(e_tool_selection.parent_event_id, e_llm_call.event_id)
        self.assertEqual(e_tool_selection.event_type, "TOOL_SELECTION")

        # 5. TOOL_VALIDATION (Child of TOOL_SELECTION)
        e_tool_validation = self.tracer.log_event(
            event_type=EventType.TOOL_VALIDATION,
            parent_event_id=e_tool_selection.event_id,
            input={"tool": "semgrep", "arguments": ["--config", "p/sql-injection"]},
            output={"validated": True, "sandbox_secure": True},
            status="SUCCESS",
            duration_ms=14.1,
            metadata={"safe_execution": True},
        )
        self.assertEqual(e_tool_validation.parent_event_id, e_tool_selection.event_id)
        self.assertEqual(e_tool_validation.event_type, "TOOL_VALIDATION")

        # 6. TOOL_CALL (Child of TOOL_VALIDATION)
        e_tool_call = self.tracer.log_event(
            event_type=EventType.TOOL_CALL,
            parent_event_id=e_tool_validation.event_id,
            input={"command": "semgrep --config p/sql-injection app/database.py"},
            output={"exit_code": 0, "status": "executed"},
            status="SUCCESS",
            duration_ms=185.3,
            metadata={"pid": 9812},
        )
        self.assertEqual(e_tool_call.parent_event_id, e_tool_validation.event_id)
        self.assertEqual(e_tool_call.event_type, "TOOL_CALL")

        # 7. TOOL_RESULT (Child of TOOL_CALL)
        e_tool_result = self.tracer.log_event(
            event_type=EventType.TOOL_RESULT,
            parent_event_id=e_tool_call.event_id,
            input={"raw_output_size_bytes": 1024},
            output={
                "vulnerabilities": [
                    {
                        "type": "SQL Injection",
                        "severity": "HIGH",
                        "file": "app/database.py",
                        "line": 42,
                        "code": "cursor.execute(f'SELECT * FROM users WHERE id = {user_id}')",
                    }
                ]
            },
            status="SUCCESS",
            duration_ms=8.0,
            metadata={"finding_count": 1},
        )
        self.assertEqual(e_tool_result.parent_event_id, e_tool_call.event_id)
        self.assertEqual(e_tool_result.event_type, "TOOL_RESULT")

        # 8. FINAL_RESPONSE (Child of TOOL_RESULT)
        e_final_response = self.tracer.log_event(
            event_type=EventType.FINAL_RESPONSE,
            parent_event_id=e_tool_result.event_id,
            input={"total_findings": 1},
            output={
                "report": "Vulnerability identified: HIGH severity SQL Injection in app/database.py:42"
            },
            status="SUCCESS",
            duration_ms=45.0,
            metadata={"status": "scan_complete"},
        )
        self.assertEqual(e_final_response.parent_event_id, e_tool_result.event_id)
        self.assertEqual(e_final_response.event_type, "FINAL_RESPONSE")

        # End run
        ended_run = self.tracer.end_run(status="COMPLETED")
        self.assertEqual(ended_run.status, "COMPLETED")
        self.assertIsNotNone(ended_run.end_time)

        # Verify all 8 events are recorded
        run = self.tracer.get_run(run_id)
        self.assertIsNotNone(run)
        self.assertEqual(len(run.events), 8)

        # Verify parent-child DAG chain
        expected_sequence = [
            (EventType.USER_QUERY, None),
            (EventType.CONTEXT_SELECTED, e_user_query.event_id),
            (EventType.LLM_CALL, e_context_selected.event_id),
            (EventType.TOOL_SELECTION, e_llm_call.event_id),
            (EventType.TOOL_VALIDATION, e_tool_selection.event_id),
            (EventType.TOOL_CALL, e_tool_validation.event_id),
            (EventType.TOOL_RESULT, e_tool_call.event_id),
            (EventType.FINAL_RESPONSE, e_tool_result.event_id),
        ]

        for i, (expected_type, expected_parent_id) in enumerate(expected_sequence):
            event = run.events[i]
            self.assertEqual(event.event_type, expected_type.value)
            self.assertEqual(event.parent_event_id, expected_parent_id)

        # Verify DAG structure representation
        dag = run.to_dag()
        self.assertEqual(len(dag["nodes"]), 8)
        self.assertEqual(len(dag["edges"]), 7)
        self.assertEqual(dag["root_event_ids"], [e_user_query.event_id])

        # Verify edge chain
        for i in range(len(dag["edges"])):
            edge = dag["edges"][i]
            parent_node = run.events[i]
            child_node = run.events[i + 1]
            self.assertEqual(edge["source"], parent_node.event_id)
            self.assertEqual(edge["target"], child_node.event_id)

    def test_every_event_contains_all_11_required_fields(self) -> None:
        """
        Verify every event contains all 11 required fields:
        - run_id
        - event_id
        - parent_event_id
        - timestamp
        - event_type
        - input
        - output
        - status
        - duration_ms
        - metadata
        - error
        """
        run_id = self.tracer.start_run()
        event = self.tracer.log_event(
            event_type=EventType.USER_QUERY,
            input={"test": "input"},
            output={"test": "output"},
            status="SUCCESS",
            duration_ms=15.5,
            metadata={"key": "val"},
            error=None,
        )

        # Attribute access check
        for field_name in REQUIRED_EVENT_FIELDS:
            self.assertTrue(
                hasattr(event, field_name),
                f"Event object missing attribute '{field_name}'",
            )

        # Dictionary representation check
        event_dict = event.to_dict()
        for field_name in REQUIRED_EVENT_FIELDS:
            self.assertIn(
                field_name,
                event_dict,
                f"Event to_dict() missing required key '{field_name}'",
            )

        self.assertEqual(event_dict["run_id"], run_id)
        self.assertIsNotNone(event_dict["event_id"])
        self.assertIsNone(event_dict["parent_event_id"])
        self.assertIsNotNone(event_dict["timestamp"])
        self.assertEqual(event_dict["event_type"], "USER_QUERY")
        self.assertEqual(event_dict["input"], {"test": "input"})
        self.assertEqual(event_dict["output"], {"test": "output"})
        self.assertEqual(event_dict["status"], "SUCCESS")
        self.assertEqual(event_dict["duration_ms"], 15.5)
        self.assertEqual(event_dict["metadata"], {"key": "val"})
        self.assertIsNone(event_dict["error"])

    def test_failure_detected_and_recovery_events(self) -> None:
        """
        Test FAILURE_DETECTED and RECOVERY event types with parent linkage and error capturing.
        """
        run_id = self.tracer.start_run()

        # Step 1: Tool call fails
        e_tool_call = self.tracer.log_event(
            event_type=EventType.TOOL_CALL,
            input={"cmd": "nmap -sV 127.0.0.1"},
            status="FAILURE",
            duration_ms=100.0,
        )

        # Step 2: FAILURE_DETECTED
        e_failure = self.tracer.log_event(
            event_type=EventType.FAILURE_DETECTED,
            parent_event_id=e_tool_call.event_id,
            input={"target_step": e_tool_call.event_id},
            output={"reason": "Permission denied: raw socket requires root"},
            status="FAILURE",
            duration_ms=5.0,
            error="PermissionError: Root privileges required for SYN scan",
            metadata={"severity": "HIGH"},
        )
        self.assertEqual(e_failure.event_type, EventType.FAILURE_DETECTED.value)
        self.assertEqual(e_failure.parent_event_id, e_tool_call.event_id)
        self.assertEqual(e_failure.status, "FAILURE")
        self.assertIsNotNone(e_failure.error)

        # Step 3: RECOVERY
        e_recovery = self.tracer.log_event(
            event_type=EventType.RECOVERY,
            parent_event_id=e_failure.event_id,
            input={"strategy": "fallback_to_connect_scan", "cmd": "nmap -sT 127.0.0.1"},
            output={"recovery_status": "applied"},
            status="SUCCESS",
            duration_ms=8.0,
            metadata={"strategy": "fallback"},
        )
        self.assertEqual(e_recovery.event_type, EventType.RECOVERY.value)
        self.assertEqual(e_recovery.parent_event_id, e_failure.event_id)
        self.assertEqual(e_recovery.status, "SUCCESS")

        # Step 4: Final response
        e_final = self.tracer.log_event(
            event_type=EventType.FINAL_RESPONSE,
            parent_event_id=e_recovery.event_id,
            output={"result": "Scan completed using unprivileged connect scan."},
        )
        self.assertEqual(e_final.parent_event_id, e_recovery.event_id)

        self.tracer.end_run(status="COMPLETED")

        # Verify DAG relationships
        run = self.tracer.get_run(run_id)
        self.assertEqual(len(run.events), 4)
        self.assertEqual(run.get_children(e_tool_call.event_id)[0].event_id, e_failure.event_id)
        self.assertEqual(run.get_children(e_failure.event_id)[0].event_id, e_recovery.event_id)
        self.assertEqual(run.get_parent(e_recovery.event_id).event_id, e_failure.event_id)

    def test_export_json_string_and_file(self) -> None:
        """
        Verify export_json outputs valid JSON and can write to disk.
        """
        run_id = self.tracer.start_run(metadata={"test": "export"})
        e1 = self.tracer.log_event(
            event_type=EventType.USER_QUERY,
            input={"q": "Hello"},
            output={"q": "Hello"},
        )
        self.tracer.log_event(
            event_type=EventType.FINAL_RESPONSE,
            parent_event_id=e1.event_id,
            output={"reply": "World"},
        )
        self.tracer.end_run()

        # 1. Export as JSON string
        json_str = self.tracer.export_json(run_id=run_id)
        self.assertIsInstance(json_str, str)
        parsed = json.loads(json_str)
        self.assertEqual(parsed["run_id"], run_id)
        self.assertEqual(parsed["status"], "COMPLETED")
        self.assertEqual(len(parsed["events"]), 2)
        self.assertIn("dag", parsed)

        # 2. Export to temporary file
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            self.tracer.export_json(run_id=run_id, file_path=tmp_path)
            self.assertTrue(os.path.exists(tmp_path))
            with open(tmp_path, "r", encoding="utf-8") as f:
                file_data = json.load(f)
            self.assertEqual(file_data["run_id"], run_id)
            self.assertEqual(len(file_data["events"]), 2)
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    def test_parent_event_passed_as_object(self) -> None:
        """
        Verify passing an Event instance directly as parent_event_id automatically
        extracts its event_id.
        """
        self.tracer.start_run()
        e1 = self.tracer.log_event(event_type=EventType.USER_QUERY)
        # Pass e1 directly as parent_event_id
        e2 = self.tracer.log_event(
            event_type=EventType.CONTEXT_SELECTED,
            parent_event_id=e1,
        )
        self.assertEqual(e2.parent_event_id, e1.event_id)

    def test_run_and_event_dict_and_attr_access(self) -> None:
        """
        Verify Event and Run support both attribute access and dictionary-style access.
        """
        run_id = self.tracer.start_run()
        event = self.tracer.log_event(
            event_type=EventType.USER_QUERY,
            input="test-input",
        )
        run = self.tracer.get_run(run_id)

        # Event dict access
        self.assertEqual(event["event_type"], "USER_QUERY")
        self.assertEqual(event.get("input"), "test-input")
        self.assertTrue("event_id" in event)

        # Run dict access
        self.assertEqual(run["run_id"], run_id)
        self.assertEqual(len(run["events"]), 1)
        self.assertTrue("status" in run)


if __name__ == "__main__":
    unittest.main()
