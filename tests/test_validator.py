"""
Unit tests for ToolValidator.
Validates detection of:
- valid tool calls
- unknown parameters
- missing required parameters
- incorrect parameter types
- invalid tool names
"""

import json
from pathlib import Path
import sys
import unittest

# Ensure project root is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from validation.tool_validator import (
    DEFAULT_TOOL_SCHEMAS,
    ToolValidator,
    ValidationErrorType,
    ValidationResult,
)


class TestToolValidator(unittest.TestCase):
    """Test suite for ToolValidator schema verification."""

    def setUp(self) -> None:
        self.validator = ToolValidator()

    def test_valid_call(self) -> None:
        """Requirement: Validate a valid tool call according to exploit_simulator schema."""
        call = {
            "tool": "exploit_simulator",
            "arguments": {
                "target": "test_app",
                "gas_limit": 50000,
            },
        }
        result = self.validator.validate(call)

        self.assertTrue(result.is_valid)
        self.assertTrue(bool(result))
        self.assertIsNone(result.error)
        self.assertIsNone(result.error_type)
        self.assertEqual(len(result.errors), 0)
        self.assertEqual(result.tool_name, "exploit_simulator")
        self.assertEqual(result.validated_arguments["target"], "test_app")
        self.assertEqual(result.validated_arguments["gas_limit"], 50000)

    def test_unknown_parameter(self) -> None:
        """
        Requirement: Detect unknown parameters.
        Example invalid call:
        {
            "tool": "exploit_simulator",
            "arguments": {
                "target": "test_app",
                "force_gas": 999999
            }
        }
        This must be rejected because force_gas is not a valid parameter.
        """
        call = {
            "tool": "exploit_simulator",
            "arguments": {
                "target": "test_app",
                "force_gas": 999999,
            },
        }
        result = self.validator.validate(call)

        self.assertFalse(result.is_valid)
        self.assertFalse(bool(result))
        self.assertIsNotNone(result.error)
        self.assertIn("force_gas", result.error)
        self.assertEqual(result.error_type, ValidationErrorType.UNKNOWN_PARAMETER.value)

        # Unpacking check: is_valid, error = validator.validate(...)
        is_valid, error = self.validator.validate(call)
        self.assertFalse(is_valid)
        self.assertIn("force_gas", error)

    def test_missing_required_parameter(self) -> None:
        """Requirement: Detect missing required parameters (e.g. gas_limit or target omitted)."""
        # Missing gas_limit
        call_missing_gas = {
            "tool": "exploit_simulator",
            "arguments": {
                "target": "test_app",
            },
        }
        result = self.validator.validate(call_missing_gas)
        self.assertFalse(result.is_valid)
        self.assertEqual(result.error_type, ValidationErrorType.MISSING_PARAMETER.value)
        self.assertIn("gas_limit", result.error)

        # Missing target
        call_missing_target = {
            "tool": "exploit_simulator",
            "arguments": {
                "gas_limit": 10000,
            },
        }
        result_target = self.validator.validate(call_missing_target)
        self.assertFalse(result_target.is_valid)
        self.assertEqual(result_target.error_type, ValidationErrorType.MISSING_PARAMETER.value)
        self.assertIn("target", result_target.error)

    def test_incorrect_parameter_types(self) -> None:
        """Requirement: Detect incorrect parameter types (string instead of int, bool instead of int, etc.)."""
        # String passed instead of integer
        call_str_gas = {
            "tool": "exploit_simulator",
            "arguments": {
                "target": "test_app",
                "gas_limit": "50000",
            },
        }
        result = self.validator.validate(call_str_gas)
        self.assertFalse(result.is_valid)
        self.assertEqual(result.error_type, ValidationErrorType.INVALID_TYPE.value)
        self.assertIn("gas_limit", result.error)
        self.assertIn("integer", result.error)

        # Boolean passed instead of integer (bool is subclass of int in Python)
        call_bool_gas = {
            "tool": "exploit_simulator",
            "arguments": {
                "target": "test_app",
                "gas_limit": True,
            },
        }
        result_bool = self.validator.validate(call_bool_gas)
        self.assertFalse(result_bool.is_valid)
        self.assertEqual(result_bool.error_type, ValidationErrorType.INVALID_TYPE.value)

        # Integer passed instead of string
        call_int_target = {
            "tool": "exploit_simulator",
            "arguments": {
                "target": 12345,
                "gas_limit": 50000,
            },
        }
        result_target = self.validator.validate(call_int_target)
        self.assertFalse(result_target.is_valid)
        self.assertEqual(result_target.error_type, ValidationErrorType.INVALID_TYPE.value)
        self.assertIn("target", result_target.error)

    def test_invalid_tool_name(self) -> None:
        """Requirement: Detect invalid tool name."""
        call = {
            "tool": "unauthorized_backdoor_tool",
            "arguments": {
                "target": "test_app",
            },
        }
        result = self.validator.validate(call)
        self.assertFalse(result.is_valid)
        self.assertEqual(result.error_type, ValidationErrorType.INVALID_TOOL.value)
        self.assertIn("unauthorized_backdoor_tool", result.error)

    def test_positional_arguments_and_dict_serialization(self) -> None:
        """Verify calling validate(tool_name, arguments) directly and serialization."""
        is_valid, err = self.validator.validate(
            "exploit_simulator",
            {"target": "production_cluster", "gas_limit": 80000},
        )
        self.assertTrue(is_valid)
        self.assertIsNone(err)

        # Serialization to dict
        val_res = self.validator.validate("exploit_simulator", {"target": "cluster", "gas_limit": 100})
        res_dict = val_res.to_dict()
        self.assertIn("is_valid", res_dict)
        self.assertTrue(res_dict["is_valid"])
        self.assertEqual(res_dict["tool_name"], "exploit_simulator")

    def test_json_string_input(self) -> None:
        """Verify passing tool calls as raw JSON strings."""
        raw_json = json.dumps({
            "tool": "exploit_simulator",
            "arguments": {"target": "test_json", "gas_limit": 25000},
        })
        result = self.validator.validate(raw_json)
        self.assertTrue(result.is_valid)
        self.assertEqual(result.tool_name, "exploit_simulator")

    def test_custom_schema_registration(self) -> None:
        """Verify registering and validating custom schemas."""
        self.validator.register_schema(
            "port_scanner",
            {
                "target_host": "string",
                "port_number": "integer",
            },
        )
        # Valid custom call
        valid_custom = self.validator.validate("port_scanner", {"target_host": "127.0.0.1", "port_number": 80})
        self.assertTrue(valid_custom.is_valid)

        # Invalid custom call (wrong type for port_number)
        invalid_custom = self.validator.validate("port_scanner", {"target_host": "127.0.0.1", "port_number": "eighty"})
        self.assertFalse(invalid_custom.is_valid)
        self.assertEqual(invalid_custom.error_type, ValidationErrorType.INVALID_TYPE.value)


if __name__ == "__main__":
    unittest.main()
