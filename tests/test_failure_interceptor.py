"""
Unit tests for FailureInterceptor.
Validates:
- Execution blocking (preventing invalid execution)
- Structured failure result creation
- Preserving validation errors
- Correction message generation for LLM agents
- Failure logging using ExecutionTracer (FAILURE_DETECTED)
- Expected trace sequence:
    TOOL_SELECTION -> TOOL_VALIDATION -> FAILURE_DETECTED -> RECOVERY
"""

from pathlib import Path
import sys
import unittest
from unittest.mock import MagicMock

# Ensure project root is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from glassbox.events import REQUIRED_EVENT_FIELDS, EventStatus, EventType
from glassbox.tracer import ExecutionTracer
from validation.failure_interceptor import (
    ExecutionBlockedError,
    FailureInterceptor,
    FailureResult,
)
from validation.tool_validator import ToolValidator, ValidationErrorType


class TestFailureInterceptor(unittest.TestCase):
    """Test suite for FailureInterceptor and DAG trace failure handling."""

    def setUp(self) -> None:
        self.tracer = ExecutionTracer()
        self.validator = ToolValidator()
        self.interceptor = FailureInterceptor(
            validator=self.validator,
            tracer=self.tracer,
        )

    def test_execution_blocking_on_invalid_call(self) -> None:
        """
        Requirement: Prevent invalid execution.
        If a tool call is invalid, the target execution function must NEVER be invoked.
        """
        mock_execute = MagicMock(return_value={"status": "simulated_exploit"})

        invalid_call = {
            "tool": "exploit_simulator",
            "arguments": {
                "target": "test_app",
                "force_gas": 999999,  # Unknown parameter
            },
        }

        result = self.interceptor.intercept(invalid_call, execute_fn=mock_execute)

        # Assert execution was blocked
        self.assertFalse(result.success)
        self.assertTrue(result.blocked)
        self.assertFalse(result.executed)
        self.assertIsNone(result.output)
        mock_execute.assert_not_called()

        # Assert validation error is preserved
        self.assertIsNotNone(result.error)
        self.assertIn("force_gas", result.error)
        self.assertEqual(result.error_type, ValidationErrorType.UNKNOWN_PARAMETER.value)

    def test_valid_call_execution(self) -> None:
        """Verify that a valid tool call proceeds to execution successfully."""
        mock_execute = MagicMock(return_value={"status": "success", "gas_used": 21000})

        valid_call = {
            "tool": "exploit_simulator",
            "arguments": {
                "target": "target_service",
                "gas_limit": 50000,
            },
        }

        result = self.interceptor.intercept(valid_call, execute_fn=mock_execute)

        self.assertTrue(result.success)
        self.assertFalse(result.blocked)
        self.assertTrue(result.executed)
        self.assertEqual(result.output, {"status": "success", "gas_used": 21000})
        self.assertIsNone(result.error)
        mock_execute.assert_called_once_with(target="target_service", gas_limit=50000)

    def test_structured_failure_result_fields(self) -> None:
        """
        Requirement: Create a structured failure result preserving validation error,
        indicating execution blocking, and containing actionable correction guidance.
        """
        invalid_call = {
            "tool": "exploit_simulator",
            "arguments": {
                "target": "test_app",
                "force_gas": 999999,
            },
        }

        result = self.interceptor.intercept(invalid_call)

        self.assertIsInstance(result, FailureResult)
        self.assertEqual(result.tool, "exploit_simulator")
        self.assertEqual(result.arguments, {"target": "test_app", "force_gas": 999999})
        self.assertTrue(result.blocked)
        self.assertFalse(result.success)
        self.assertFalse(result.executed)

        # Check dictionary serialization and key access
        result_dict = result.to_dict()
        self.assertIn("blocked", result_dict)
        self.assertTrue(result_dict["blocked"])
        self.assertIn("correction_message", result_dict)
        self.assertEqual(result["blocked"], True)

    def test_correction_message_generation(self) -> None:
        """
        Requirement: Generate a correction message for the agent explaining
        the validation failure and how to correct it.
        """
        val_result = self.validator.validate({
            "tool": "exploit_simulator",
            "arguments": {"target": "test_app", "force_gas": 999999},
        })

        correction = self.interceptor.generate_correction_message("exploit_simulator", val_result)

        self.assertIsInstance(correction, str)
        self.assertIn("exploit_simulator", correction)
        self.assertIn("force_gas", correction)
        self.assertIn("Expected schema", correction)
        self.assertIn("target: string", correction)
        self.assertIn("gas_limit: integer", correction)
        self.assertIn("Action:", correction)

    def test_failure_logging_with_tracer(self) -> None:
        """
        Requirement: Log FAILURE_DETECTED using the existing ExecutionTracer.
        """
        run_id = self.tracer.start_run(metadata={"test": "failure_logging"})

        invalid_call = {
            "tool": "exploit_simulator",
            "arguments": {
                "target": "test_app",
                "force_gas": 999999,
            },
        }

        result = self.interceptor.intercept(invalid_call, run_id=run_id)
        run = self.tracer.get_run(run_id)

        # Check that events were logged
        self.assertIsNotNone(run)
        event_types = [e.event_type for e in run.events]
        self.assertIn(EventType.TOOL_VALIDATION.value, event_types)
        self.assertIn(EventType.FAILURE_DETECTED.value, event_types)

        # Find the FAILURE_DETECTED event
        failure_events = [e for e in run.events if e.event_type == EventType.FAILURE_DETECTED.value]
        self.assertEqual(len(failure_events), 1)
        fail_ev = failure_events[0]

        self.assertEqual(fail_ev.status, EventStatus.FAILURE.value)
        self.assertIn("force_gas", fail_ev.error)
        self.assertEqual(fail_ev.input["tool"], "exploit_simulator")
        self.assertIn("correction_message", fail_ev.output)
        self.assertTrue(fail_ev.metadata.get("blocked"))

    def test_expected_trace_sequence(self) -> None:
        """
        Requirement 6:
        The expected trace should be:
        TOOL_SELECTION
        -> TOOL_VALIDATION
        -> FAILURE_DETECTED
        -> RECOVERY

        Asserts all 4 events exist in proper order with DAG parent-child linkage
        and all 11 required event fields present.
        """
        run_id = self.tracer.start_run(metadata={"flow": "failure_interception_recovery"})

        invalid_call = {
            "tool": "exploit_simulator",
            "arguments": {
                "target": "test_app",
                "force_gas": 999999,
            },
        }
        recovered_call = {
            "tool": "exploit_simulator",
            "arguments": {
                "target": "test_app",
                "gas_limit": 50000,
            },
        }

        # Execute full 4-step sequence
        failure_result, events = self.interceptor.trace_failure_and_recovery(
            invalid_tool_call=invalid_call,
            recovered_tool_call=recovered_call,
            run_id=run_id,
        )

        self.assertEqual(len(events), 4)

        # 1. TOOL_SELECTION
        e_selection = events[0]
        self.assertEqual(e_selection.event_type, EventType.TOOL_SELECTION.value)
        self.assertEqual(e_selection.status, EventStatus.SUCCESS.value)

        # 2. TOOL_VALIDATION (Child of TOOL_SELECTION)
        e_validation = events[1]
        self.assertEqual(e_validation.event_type, EventType.TOOL_VALIDATION.value)
        self.assertEqual(e_validation.parent_event_id, e_selection.event_id)
        self.assertEqual(e_validation.status, EventStatus.FAILURE.value)
        self.assertIn("force_gas", e_validation.error)

        # 3. FAILURE_DETECTED (Child of TOOL_VALIDATION)
        e_failure = events[2]
        self.assertEqual(e_failure.event_type, EventType.FAILURE_DETECTED.value)
        self.assertEqual(e_failure.parent_event_id, e_validation.event_id)
        self.assertEqual(e_failure.status, EventStatus.FAILURE.value)
        self.assertIn("force_gas", e_failure.error)
        self.assertIn("correction_message", e_failure.output)

        # 4. RECOVERY (Child of FAILURE_DETECTED)
        e_recovery = events[3]
        self.assertEqual(e_recovery.event_type, EventType.RECOVERY.value)
        self.assertEqual(e_recovery.parent_event_id, e_failure.event_id)
        self.assertEqual(e_recovery.status, EventStatus.SUCCESS.value)
        self.assertEqual(e_recovery.input["recovered_tool"], "exploit_simulator")
        self.assertEqual(e_recovery.input["corrected_arguments"]["gas_limit"], 50000)

        # Verify all 11 required event fields on every event in the trace
        for event in events:
            ev_dict = event.to_dict()
            for required_field in REQUIRED_EVENT_FIELDS:
                self.assertIn(
                    required_field,
                    ev_dict,
                    f"Event {event.event_type} missing field {required_field}",
                )

    def test_raise_on_blocked_option(self) -> None:
        """Verify that raise_on_blocked=True raises ExecutionBlockedError."""
        invalid_call = {
            "tool": "exploit_simulator",
            "arguments": {"target": "test_app", "force_gas": 999999},
        }
        with self.assertRaises(ExecutionBlockedError) as ctx:
            self.interceptor.intercept(invalid_call, raise_on_blocked=True)

        self.assertIn("force_gas", str(ctx.exception))
        self.assertIsNotNone(ctx.exception.failure_result)
        self.assertTrue(ctx.exception.failure_result.blocked)


if __name__ == "__main__":
    unittest.main()
