"""
Validation and Failure Interception Layer for VulnSentry.
Provides pre-execution validation of LLM tool calls and failure interception
with ExecutionTracer DAG logging.
"""

from .failure_interceptor import (
    ExecutionBlockedError,
    FailureInterceptor,
    FailureResult,
)
from .tool_validator import (
    DEFAULT_TOOL_SCHEMAS,
    ToolValidator,
    ValidationErrorType,
    ValidationIssue,
    ValidationResult,
)

__all__ = [
    "ToolValidator",
    "ValidationErrorType",
    "ValidationIssue",
    "ValidationResult",
    "DEFAULT_TOOL_SCHEMAS",
    "FailureInterceptor",
    "FailureResult",
    "ExecutionBlockedError",
]
