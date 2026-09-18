"""
FailureInterceptor implementation for LLM Tool Validation.
Intercepts invalid tool calls, prevents unauthorized or broken execution,
creates structured failure records, generates actionable correction guidance
for agent self-correction, and logs FAILURE_DETECTED events via ExecutionTracer.
"""

from __future__ import annotations

from dataclasses import dataclass, field
import json
from typing import Any, Callable, Dict, List, Optional, Tuple, Union

from glassbox.events import Event, EventStatus, EventType
from glassbox.tracer import ExecutionTracer
from .tool_validator import ToolValidator, ValidationErrorType, ValidationResult


class ExecutionBlockedError(Exception):
    """Exception raised when tool execution is blocked due to validation failure."""

    def __init__(self, message: str, failure_result: Optional[FailureResult] = None) -> None:
        super().__init__(message)
        self.failure_result = failure_result


@dataclass
class FailureResult:
    """
    Structured failure result produced when a tool call fails validation or execution is blocked.
    Preserves original validation error, indicates execution blocking, and provides
    clear correction guidance for the agent.
    """
    success: bool
    blocked: bool
    tool: str
    arguments: Dict[str, Any]
    error: Optional[str]
    error_type: Optional[str]
    correction_message: str
    validation_result: Optional[ValidationResult] = None
    output: Optional[Any] = None
    executed: bool = False
    trace_events: List[Event] = field(default_factory=list)

    def __bool__(self) -> bool:
        """Allow boolean evaluation: if failure_result: ..."""
        return self.success

    def __getitem__(self, key: str) -> Any:
        """Allow dictionary-style access: result['blocked']"""
        if hasattr(self, key):
            return getattr(self, key)
        raise KeyError(key)

    def to_dict(self) -> Dict[str, Any]:
        """Serialize failure result to a structured dictionary."""
        return {
            "success": self.success,
            "blocked": self.blocked,
            "tool": self.tool,
            "arguments": dict(self.arguments),
            "error": self.error,
            "error_type": self.error_type,
            "correction_message": self.correction_message,
            "executed": self.executed,
            "output": self.output,
        }


class FailureInterceptor:
    """
    Interception layer that sits between LLM tool generation and actual tool execution.
    Responsibilities:
      - Prevent invalid execution
      - Create structured failure results
      - Preserve validation errors
      - Generate actionable correction messages for the agent
      - Log FAILURE_DETECTED events using ExecutionTracer
      - Support complete execution trace chains:
        TOOL_SELECTION -> TOOL_VALIDATION -> FAILURE_DETECTED -> RECOVERY
    """

    def __init__(
        self,
        validator: Optional[ToolValidator] = None,
        tracer: Optional[ExecutionTracer] = None,
        default_run_id: Optional[str] = None,
    ) -> None:
        self.validator = validator or ToolValidator()
        self.tracer = tracer
        self.default_run_id = default_run_id
        self._last_event: Optional[Event] = None

    @property
    def last_event(self) -> Optional[Event]:
        """Return the most recently logged trace event in this interceptor."""
        return self._last_event

    def generate_correction_message(
        self,
        tool_name: str,
        validation_result: ValidationResult,
    ) -> str:
        """
        Generate a structured, actionable correction message for the agent explaining
        the exact failure and how to correct the tool call parameters according to the schema.
        """
        error_type = validation_result.error_type
        error_msg = validation_result.error or "Unknown validation error"
        schema = validation_result.schema or self.validator.schemas.get(tool_name)

        lines = [f"Validation failed for tool '{tool_name}':"]
        lines.append(f"- Error: {error_msg}")

        if schema:
            params_spec = schema.get("parameters", {})
            properties = params_spec.get("properties", {})
            required = params_spec.get("required", [])

            lines.append(f"- Expected schema for '{tool_name}':")
            for prop_name, prop_spec in sorted(properties.items()):
                p_type = prop_spec.get("type", "any")
                is_req = "(required)" if prop_name in required else "(optional)"
                lines.append(f"    * {prop_name}: {p_type} {is_req}")

        if error_type == ValidationErrorType.INVALID_TOOL:
            available = sorted(list(self.validator.schemas.keys()))
            lines.append(f"- Action: Tool '{tool_name}' is invalid. Please select from available tools: {available}.")
        elif error_type == ValidationErrorType.UNKNOWN_PARAMETER:
            lines.append(
                f"- Action: Remove any unrecognized parameters and only supply the valid parameters listed above."
            )
        elif error_type == ValidationErrorType.MISSING_PARAMETER:
            lines.append(
                f"- Action: Supply all required parameters with non-null values matching their expected types."
            )
        elif error_type == ValidationErrorType.INVALID_TYPE:
            lines.append(
                f"- Action: Ensure all argument values match the required types (e.g. integers must be numeric, strings must be quoted text)."
            )
        else:
            lines.append("- Action: Please correct the tool call arguments according to the schema above and retry.")

        return "\n".join(lines)

    def log_failure(
        self,
        tool: str,
        arguments: Dict[str, Any],
        validation_result: ValidationResult,
        correction_message: str,
        run_id: Optional[str] = None,
        parent_event_id: Optional[Union[str, Event]] = None,
    ) -> Optional[Event]:
        """
        Log a FAILURE_DETECTED event to the ExecutionTracer.
        """
        if not self.tracer:
            return None

        target_run_id = run_id or self.default_run_id or self.tracer.current_run_id
        if target_run_id is None:
            target_run_id = self.tracer.start_run()

        resolved_parent_id = parent_event_id.event_id if isinstance(parent_event_id, Event) else parent_event_id

        event = self.tracer.log_event(
            event_type=EventType.FAILURE_DETECTED,
            run_id=target_run_id,
            parent_event_id=resolved_parent_id,
            input={"tool": tool, "arguments": arguments},
            output={"correction_message": correction_message},
            status=EventStatus.FAILURE.value,
            error=validation_result.error,
            metadata={
                "error_type": validation_result.error_type,
                "errors": validation_result.errors,
                "blocked": True,
            },
        )
        self._last_event = event
        return event

    def intercept(
        self,
        tool_call_or_name: Union[Dict[str, Any], str],
        arguments: Optional[Dict[str, Any]] = None,
        execute_fn: Optional[Callable[..., Any]] = None,
        run_id: Optional[str] = None,
        parent_event_id: Optional[Union[str, Event]] = None,
        log_validation_event: bool = True,
        raise_on_blocked: bool = False,
    ) -> FailureResult:
        """
        Intercept a tool call before execution:
          1. Validates the call against schema
          2. If invalid: PREVENTS execution, generates correction, logs FAILURE_DETECTED
          3. If valid: Executes tool if execute_fn is provided, else returns success
        """
        tool_name, args, parse_err = self.validator._parse_input(tool_call_or_name, arguments)
        actual_tool = tool_name or "unknown_tool"
        actual_args = args if args is not None else {}

        target_run_id = run_id or self.default_run_id
        if self.tracer and target_run_id is None:
            target_run_id = self.tracer.current_run_id or self.tracer.start_run()

        resolved_parent = parent_event_id.event_id if isinstance(parent_event_id, Event) else parent_event_id

        trace_events: List[Event] = []

        # Step 1: Validate
        val_result = self.validator.validate(tool_call_or_name, arguments)

        # Step 2: Log TOOL_VALIDATION event if tracer configured
        val_event: Optional[Event] = None
        if self.tracer and log_validation_event:
            val_event = self.tracer.log_event(
                event_type=EventType.TOOL_VALIDATION,
                run_id=target_run_id,
                parent_event_id=resolved_parent,
                input={"tool": actual_tool, "arguments": actual_args},
                output={"is_valid": val_result.is_valid, "error": val_result.error},
                status=EventStatus.SUCCESS.value if val_result.is_valid else EventStatus.FAILURE.value,
                error=val_result.error,
                metadata={"error_type": val_result.error_type},
            )
            self._last_event = val_event
            trace_events.append(val_event)
            resolved_parent = val_event.event_id

        # Step 3: Handle validation failure -> BLOCK EXECUTION
        if not val_result.is_valid:
            correction_msg = self.generate_correction_message(actual_tool, val_result)

            # Log FAILURE_DETECTED event
            if self.tracer:
                fail_event = self.log_failure(
                    tool=actual_tool,
                    arguments=actual_args,
                    validation_result=val_result,
                    correction_message=correction_msg,
                    run_id=target_run_id,
                    parent_event_id=resolved_parent,
                )
                if fail_event:
                    trace_events.append(fail_event)

            failure_result = FailureResult(
                success=False,
                blocked=True,
                tool=actual_tool,
                arguments=actual_args,
                error=val_result.error,
                error_type=val_result.error_type,
                correction_message=correction_msg,
                validation_result=val_result,
                output=None,
                executed=False,
                trace_events=trace_events,
            )

            if raise_on_blocked:
                raise ExecutionBlockedError(
                    f"Execution blocked: {val_result.error}",
                    failure_result=failure_result,
                )

            return failure_result

        # Step 4: Valid call -> execute if function provided
        executed_output: Optional[Any] = None
        was_executed = False

        if execute_fn is not None:
            # Execute tool function
            try:
                try:
                    executed_output = execute_fn(**actual_args)
                except TypeError:
                    executed_output = execute_fn(actual_args)
                was_executed = True
            except Exception as e:
                # If execution itself fails with a runtime exception
                err_msg = f"Tool execution failed with exception: {e}"
                if self.tracer:
                    fail_ev = self.tracer.log_event(
                        event_type=EventType.FAILURE_DETECTED,
                        run_id=target_run_id,
                        parent_event_id=resolved_parent,
                        input={"tool": actual_tool, "arguments": actual_args},
                        status=EventStatus.ERROR.value,
                        error=err_msg,
                    )
                    trace_events.append(fail_ev)

                return FailureResult(
                    success=False,
                    blocked=False,
                    tool=actual_tool,
                    arguments=actual_args,
                    error=err_msg,
                    error_type="RUNTIME_EXECUTION_ERROR",
                    correction_message=f"Runtime error during execution of {actual_tool}: {e}",
                    validation_result=val_result,
                    output=None,
                    executed=True,
                    trace_events=trace_events,
                )

        return FailureResult(
            success=True,
            blocked=False,
            tool=actual_tool,
            arguments=actual_args,
            error=None,
            error_type=None,
            correction_message="",
            validation_result=val_result,
            output=executed_output,
            executed=was_executed,
            trace_events=trace_events,
        )

    def record_recovery(
        self,
        recovered_tool_call_or_name: Union[Dict[str, Any], str],
        arguments: Optional[Dict[str, Any]] = None,
        parent_event_id: Optional[Union[str, Event]] = None,
        run_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Optional[Event]:
        """
        Record a RECOVERY event in the ExecutionTracer linking to previous failure.
        """
        if not self.tracer:
            return None

        tool_name, args, _ = self.validator._parse_input(recovered_tool_call_or_name, arguments)
        target_run_id = run_id or self.default_run_id or self.tracer.current_run_id
        if target_run_id is None:
            target_run_id = self.tracer.start_run()

        resolved_parent_id: Optional[str] = None
        if isinstance(parent_event_id, Event):
            resolved_parent_id = parent_event_id.event_id
        elif parent_event_id is not None:
            resolved_parent_id = str(parent_event_id)
        elif self._last_event is not None:
            resolved_parent_id = self._last_event.event_id

        event = self.tracer.log_event(
            event_type=EventType.RECOVERY,
            run_id=target_run_id,
            parent_event_id=resolved_parent_id,
            input={"recovered_tool": tool_name or "unknown", "corrected_arguments": args or {}},
            output={"status": "recovered"},
            status=EventStatus.SUCCESS.value,
            metadata=metadata or {},
        )
        self._last_event = event
        return event

    def trace_failure_and_recovery(
        self,
        invalid_tool_call: Union[Dict[str, Any], str],
        recovered_tool_call: Optional[Union[Dict[str, Any], str]] = None,
        invalid_arguments: Optional[Dict[str, Any]] = None,
        recovered_arguments: Optional[Dict[str, Any]] = None,
        run_id: Optional[str] = None,
        parent_event_id: Optional[Union[str, Event]] = None,
    ) -> Tuple[FailureResult, List[Event]]:
        """
        Execute and trace the expected 4-step execution sequence:
        TOOL_SELECTION
        -> TOOL_VALIDATION
        -> FAILURE_DETECTED
        -> RECOVERY

        Returns:
            Tuple of (FailureResult, List of generated trace events in order).
        """
        if not self.tracer:
            raise ValueError("ExecutionTracer must be provided to trace failure and recovery sequences.")

        target_run_id = run_id or self.default_run_id or self.tracer.current_run_id
        if target_run_id is None:
            target_run_id = self.tracer.start_run()

        inv_tool, inv_args, _ = self.validator._parse_input(invalid_tool_call, invalid_arguments)
        inv_tool_str = inv_tool or "unknown"
        inv_args_dict = inv_args or {}

        events: List[Event] = []
        curr_parent = parent_event_id.event_id if isinstance(parent_event_id, Event) else parent_event_id

        # 1. TOOL_SELECTION
        ev_selection = self.tracer.log_event(
            event_type=EventType.TOOL_SELECTION,
            run_id=target_run_id,
            parent_event_id=curr_parent,
            input={"tool": inv_tool_str, "arguments": inv_args_dict},
            output={"candidate_selected": inv_tool_str},
            status=EventStatus.SUCCESS.value,
        )
        events.append(ev_selection)

        # 2 & 3. TOOL_VALIDATION & FAILURE_DETECTED (via intercept)
        failure_result = self.intercept(
            tool_call_or_name=invalid_tool_call,
            arguments=invalid_arguments,
            run_id=target_run_id,
            parent_event_id=ev_selection.event_id,
            log_validation_event=True,
        )
        events.extend(failure_result.trace_events)

        # 4. RECOVERY
        if recovered_tool_call is not None:
            last_event_id = events[-1].event_id if events else ev_selection.event_id
            ev_recovery = self.record_recovery(
                recovered_tool_call_or_name=recovered_tool_call,
                arguments=recovered_arguments,
                parent_event_id=last_event_id,
                run_id=target_run_id,
            )
            if ev_recovery:
                events.append(ev_recovery)

        return failure_result, events
