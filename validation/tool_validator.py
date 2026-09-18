"""
ToolValidator implementation for LLM tool call validation.
Validates LLM-generated tool calls against registered schemas prior to execution,
detecting unknown parameters, missing required parameters, incorrect parameter types,
and invalid tool names.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
import json
from typing import Any, Callable, Dict, List, Optional, Set, Tuple, Union


class ValidationErrorType(str, Enum):
    """Categorized validation error types."""
    INVALID_TOOL = "INVALID_TOOL"
    UNKNOWN_PARAMETER = "UNKNOWN_PARAMETER"
    MISSING_PARAMETER = "MISSING_PARAMETER"
    INVALID_TYPE = "INVALID_TYPE"
    INVALID_FORMAT = "INVALID_FORMAT"


@dataclass
class ValidationIssue:
    """Represents a single validation error or violation."""
    error_type: ValidationErrorType
    parameter: Optional[str]
    message: str


@dataclass
class ValidationResult:
    """
    Result of a tool call validation.
    Supports attribute access, dict serialization, and tuple unpacking:
        is_valid, error = validator.validate(tool_name, tool_args)
    """
    is_valid: bool
    error: Optional[str] = None
    error_type: Optional[str] = None
    errors: List[str] = field(default_factory=list)
    issues: List[ValidationIssue] = field(default_factory=list)
    tool_name: Optional[str] = None
    validated_arguments: Dict[str, Any] = field(default_factory=dict)
    schema: Optional[Dict[str, Any]] = None

    def __bool__(self) -> bool:
        """Allow boolean evaluation: if validation_result: ..."""
        return self.is_valid

    def __iter__(self):
        """Allow unpacking: is_valid, error = validator.validate(...)"""
        yield self.is_valid
        yield self.error

    def to_dict(self) -> Dict[str, Any]:
        """Serialize validation result to dictionary."""
        return {
            "is_valid": self.is_valid,
            "error": self.error,
            "error_type": self.error_type,
            "errors": list(self.errors),
            "tool_name": self.tool_name,
            "validated_arguments": dict(self.validated_arguments),
        }


# Default schema supporting exploit_simulator
DEFAULT_TOOL_SCHEMAS: Dict[str, Dict[str, Any]] = {
    "exploit_simulator": {
        "name": "exploit_simulator",
        "description": "Simulates exploit execution against a target application.",
        "parameters": {
            "type": "object",
            "properties": {
                "target": {
                    "type": "string",
                    "description": "Target application or endpoint to simulate.",
                },
                "gas_limit": {
                    "type": "integer",
                    "description": "Maximum gas/compute limit for simulation.",
                },
            },
            "required": ["target", "gas_limit"],
        },
    }
}


class ToolValidator:
    """
    Validates LLM-generated tool calls before execution.
    Detects:
      - unknown parameters
      - missing required parameters
      - incorrect parameter types
      - invalid tool names
    """

    def __init__(self, schemas: Optional[Dict[str, Dict[str, Any]]] = None) -> None:
        self._schemas: Dict[str, Dict[str, Any]] = {}
        # Load defaults
        for name, s in DEFAULT_TOOL_SCHEMAS.items():
            self.register_schema(name, s)
        # Load user-provided schemas if any
        if schemas:
            for name, s in schemas.items():
                self.register_schema(name, s)

    @property
    def schemas(self) -> Dict[str, Dict[str, Any]]:
        """Return registered schemas dictionary."""
        return self._schemas

    def register_schema(self, tool_name: str, schema: Dict[str, Any]) -> None:
        """Register or update a tool schema."""
        self._schemas[tool_name] = self._normalize_schema(tool_name, schema)

    def _normalize_schema(self, tool_name: str, raw: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize various schema formats into a consistent internal structure."""
        # Case 1: Simple key-value mapping like {"target": "string", "gas_limit": "integer"}
        if all(isinstance(v, (str, type)) for v in raw.values()) and "parameters" not in raw:
            properties = {}
            for k, v in raw.items():
                t_str = v if isinstance(v, str) else v.__name__
                properties[k] = {"type": t_str}
            return {
                "name": tool_name,
                "parameters": {
                    "type": "object",
                    "properties": properties,
                    "required": list(properties.keys()),
                },
            }

        # Case 2: Standard JSON Schema format
        params = raw.get("parameters", {})
        if "properties" in params:
            props = params.get("properties", {})
            req = params.get("required", [])
            return {
                "name": raw.get("name", tool_name),
                "description": raw.get("description", ""),
                "parameters": {
                    "type": "object",
                    "properties": dict(props),
                    "required": list(req),
                },
            }

        # Case 3: parameters directly contains property dicts
        if isinstance(params, dict) and params:
            props = {}
            req = []
            for k, v in params.items():
                if isinstance(v, dict):
                    props[k] = v
                    if v.get("required", False):
                        req.append(k)
                elif isinstance(v, (str, type)):
                    t_str = v if isinstance(v, str) else v.__name__
                    props[k] = {"type": t_str}
                    req.append(k)
            return {
                "name": raw.get("name", tool_name),
                "description": raw.get("description", ""),
                "parameters": {
                    "type": "object",
                    "properties": props,
                    "required": req,
                },
            }

        return raw

    def _parse_input(
        self,
        tool_call_or_name: Union[Dict[str, Any], str],
        arguments: Optional[Dict[str, Any]] = None,
    ) -> Tuple[Optional[str], Optional[Dict[str, Any]], Optional[str]]:
        """
        Parse flexible tool call inputs into (tool_name, arguments, parse_error).
        Handles:
          - ({"tool": "exploit_simulator", "arguments": {...}})
          - ({"name": "exploit_simulator", "parameters": {...}})
          - ({"tool_name": "exploit_simulator", "tool_args": {...}})
          - ('{"tool": "...", "arguments": {...}}')
          - ("exploit_simulator", {"target": "..."})
        """
        # If passed as a JSON string
        if isinstance(tool_call_or_name, str) and arguments is None and tool_call_or_name.strip().startswith("{"):
            try:
                parsed = json.loads(tool_call_or_name)
                if isinstance(parsed, dict):
                    tool_call_or_name = parsed
            except json.JSONDecodeError as e:
                return None, None, f"Failed to parse JSON tool call string: {e}"

        # If passed as a dictionary
        if isinstance(tool_call_or_name, dict):
            t_dict = tool_call_or_name
            # Check tool name keys
            tool_name = (
                t_dict.get("tool")
                or t_dict.get("tool_name")
                or t_dict.get("name")
            )
            # OpenAI function calling format {"function": {"name": ..., "arguments": ...}}
            if not tool_name and "function" in t_dict and isinstance(t_dict["function"], dict):
                fn = t_dict["function"]
                tool_name = fn.get("name")
                if arguments is None:
                    raw_args = fn.get("arguments", {})
                    arguments = json.loads(raw_args) if isinstance(raw_args, str) else raw_args

            if not tool_name:
                return None, None, "Missing tool name in tool call payload."

            if arguments is None:
                raw_args = (
                    t_dict.get("arguments")
                    or t_dict.get("args")
                    or t_dict.get("tool_args")
                    or t_dict.get("parameters")
                    or {}
                )
                if isinstance(raw_args, str):
                    try:
                        arguments = json.loads(raw_args)
                    except json.JSONDecodeError as e:
                        return tool_name, None, f"Failed to parse arguments JSON string: {e}"
                elif isinstance(raw_args, dict):
                    arguments = raw_args
                else:
                    return tool_name, None, f"Tool arguments must be a dictionary, got {type(raw_args).__name__}"

            return str(tool_name), arguments, None

        # If passed as (tool_name, arguments)
        if isinstance(tool_call_or_name, str):
            tool_name = tool_call_or_name
            actual_args = arguments if arguments is not None else {}
            if not isinstance(actual_args, dict):
                return tool_name, None, f"Tool arguments must be a dictionary, got {type(actual_args).__name__}"
            return tool_name, actual_args, None

        return None, None, f"Unsupported tool call format: {type(tool_call_or_name).__name__}"

    def _check_type(self, value: Any, expected_type: str) -> bool:
        """
        Validate whether a value conforms to the expected type string.
        Supports: string, integer, number/float, boolean, array/list, object/dict.
        """
        normalized_type = str(expected_type).lower().strip()

        if normalized_type in ("string", "str"):
            return isinstance(value, str)
        if normalized_type in ("integer", "int"):
            # In Python, bool is a subclass of int (isinstance(True, int) is True). Must exclude bool.
            return isinstance(value, int) and not isinstance(value, bool)
        if normalized_type in ("number", "float"):
            return isinstance(value, (int, float)) and not isinstance(value, bool)
        if normalized_type in ("boolean", "bool"):
            return isinstance(value, bool)
        if normalized_type in ("array", "list"):
            return isinstance(value, list)
        if normalized_type in ("object", "dict"):
            return isinstance(value, dict)
        if normalized_type in ("any", ""):
            return True

        return True

    def validate(
        self,
        tool_call_or_name: Union[Dict[str, Any], str],
        arguments: Optional[Dict[str, Any]] = None,
    ) -> ValidationResult:
        """
        Validate an LLM-generated tool call before execution.

        Args:
            tool_call_or_name: Tool call dictionary, JSON string, or tool name string.
            arguments: Tool arguments dictionary if tool_call_or_name is a string.

        Returns:
            ValidationResult containing is_valid, error, error_type, errors, issues, etc.
        """
        tool_name, args, parse_error = self._parse_input(tool_call_or_name, arguments)

        if parse_error or tool_name is None:
            issue = ValidationIssue(
                error_type=ValidationErrorType.INVALID_FORMAT,
                parameter=None,
                message=parse_error or "Invalid tool call format",
            )
            return ValidationResult(
                is_valid=False,
                error=issue.message,
                error_type=issue.error_type.value,
                errors=[issue.message],
                issues=[issue],
                tool_name=tool_name,
                validated_arguments=args or {},
            )

        # 1. Detect invalid tool name
        if tool_name not in self._schemas:
            allowed = sorted(list(self._schemas.keys()))
            msg = f"Invalid tool name: '{tool_name}' is not recognized. Allowed tools: {allowed}."
            issue = ValidationIssue(
                error_type=ValidationErrorType.INVALID_TOOL,
                parameter=None,
                message=msg,
            )
            return ValidationResult(
                is_valid=False,
                error=msg,
                error_type=ValidationErrorType.INVALID_TOOL.value,
                errors=[msg],
                issues=[issue],
                tool_name=tool_name,
                validated_arguments=args or {},
            )

        schema = self._schemas[tool_name]
        parameters_spec = schema.get("parameters", {})
        properties: Dict[str, Any] = parameters_spec.get("properties", {})
        required_params: List[str] = parameters_spec.get("required", [])

        if args is None:
            args = {}

        issues: List[ValidationIssue] = []
        errors: List[str] = []

        # 2. Detect unknown parameters
        allowed_keys = set(properties.keys())
        provided_keys = set(args.keys())
        unknown_keys = sorted(list(provided_keys - allowed_keys))

        if unknown_keys:
            if len(unknown_keys) == 1:
                param = unknown_keys[0]
                msg = (
                    f"Unknown parameter: '{param}' is not a valid parameter for tool '{tool_name}'. "
                    f"Allowed parameters: {sorted(list(allowed_keys))}."
                )
            else:
                msg = (
                    f"Unknown parameters: {unknown_keys} are not valid parameters for tool '{tool_name}'. "
                    f"Allowed parameters: {sorted(list(allowed_keys))}."
                )
            issues.append(
                ValidationIssue(
                    error_type=ValidationErrorType.UNKNOWN_PARAMETER,
                    parameter=unknown_keys[0],
                    message=msg,
                )
            )
            errors.append(msg)

        # 3. Detect missing required parameters
        missing_keys = [p for p in required_params if p not in args or args[p] is None]
        if missing_keys:
            if len(missing_keys) == 1:
                param = missing_keys[0]
                msg = f"Missing required parameter '{param}' for tool '{tool_name}'."
            else:
                msg = f"Missing required parameters {missing_keys} for tool '{tool_name}'."
            issues.append(
                ValidationIssue(
                    error_type=ValidationErrorType.MISSING_PARAMETER,
                    parameter=missing_keys[0],
                    message=msg,
                )
            )
            errors.append(msg)

        # 4. Detect incorrect parameter types
        for param_name, param_value in args.items():
            if param_name in properties:
                expected_type = properties[param_name].get("type", "any")
                if not self._check_type(param_value, expected_type):
                    actual_type = type(param_value).__name__
                    msg = (
                        f"Incorrect parameter type for '{param_name}': expected {expected_type}, "
                        f"got {actual_type} ({repr(param_value)})."
                    )
                    issues.append(
                        ValidationIssue(
                            error_type=ValidationErrorType.INVALID_TYPE,
                            parameter=param_name,
                            message=msg,
                        )
                    )
                    errors.append(msg)

        # Formulate validation result
        if issues:
            # Determine primary error type
            primary_issue = issues[0]
            combined_error = " ".join(errors)
            return ValidationResult(
                is_valid=False,
                error=combined_error,
                error_type=primary_issue.error_type.value,
                errors=errors,
                issues=issues,
                tool_name=tool_name,
                validated_arguments=args,
                schema=schema,
            )

        return ValidationResult(
            is_valid=True,
            error=None,
            error_type=None,
            errors=[],
            issues=[],
            tool_name=tool_name,
            validated_arguments=args,
            schema=schema,
        )
