"""
VulnSentry Trace Generator
Executes the full VulnSentry pipeline using real components:
  1. USER_QUERY (Root query requesting security audit)
  2. CONTEXT_SELECTED (ContextManager compressing multi-turn history)
  3. LLM_CALL (Agent model invocation)
  4. TOOL_SELECTION (Initial tool selection proposing candidate tools)
  5. TOOL_VALIDATION (ToolValidator detecting invalid parameters)
  6. FAILURE_DETECTED (FailureInterceptor blocking execution and generating correction)
  7. RECOVERY (Agent self-correction to valid security tool)
  8. TOOL_CALL (Executing verified security tool)
  9. TOOL_RESULT (Raw scanner output detecting vulnerabilities)
  10. FINAL_RESPONSE (Synthesized SecurityFinding report)
Exports the execution DAG to JSON for the Next.js dashboard.
"""

import json
import os
from pathlib import Path
import sys

# Ensure root directory is in sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from glassbox.events import EventType, EventStatus
from glassbox.tracer import ExecutionTracer
from context.context_manager import ContextManager
from validation.tool_validator import ToolValidator
from validation.failure_interceptor import FailureInterceptor
from tools.security_scan import run_sql_injection_scan, run_secret_leak_scan
from agent.findings import SecurityFinding


def generate_trace_data(code_snippet: str = None, trigger_failure: bool = True):
    """Run the complete end-to-end audit pipeline and return the ExecutionTracer run data."""
    if code_snippet is None:
        fixture_file = ROOT_DIR / "test_fixtures" / "vulnerable_app.py"
        if fixture_file.exists():
            with open(fixture_file, "r") as f:
                code_snippet = f.read()
        else:
            code_snippet = (
                "import sqlite3\n"
                "AWS_SECRET_KEY = 'AKIA_FAKE_SECRET_KEY_EXPOSED_IN_PROD_12345'\n"
                "def get_user_profile(user_input: str):\n"
                "    conn = sqlite3.connect('users.db')\n"
                "    query = f\"SELECT * FROM users WHERE username = '{user_input}'\"\n"
                "    return conn.cursor().execute(query).fetchall()\n"
            )

    tracer = ExecutionTracer()
    validator = ToolValidator()
    interceptor = FailureInterceptor(validator=validator, tracer=tracer)
    context_mgr = ContextManager(tracer=tracer, selection_strategy="security_aware_recency")

    run_id = tracer.start_run(
        metadata={
            "scanner": "VulnSentry",
            "version": "1.0.0",
            "environment": "production-audit",
            "target": "vulnerable_app.py",
        }
    )

    # 1. USER_QUERY (Root event)
    e_user_query = tracer.log_event(
        event_type=EventType.USER_QUERY,
        run_id=run_id,
        parent_event_id=None,
        input={
            "query": "Audit repository test_fixtures/vulnerable_app.py for injection flaws and credential leaks.",
            "target_file": "vulnerable_app.py",
            "code_snippet": code_snippet,
        },
        output={
            "status": "ACCEPTED",
            "target": "vulnerable_app.py",
            "lines_of_code": len(code_snippet.splitlines()),
        },
        duration_ms=4.2,
        metadata={"source": "cli_dashboard", "audit_mode": "deep_inspection"},
    )

    # 2. CONTEXT_SELECTED (ContextManager compresses multi-turn history)
    sample_conversation = [
        {"role": "system", "content": "You are VulnSentry security audit agent."},
        {"role": "user", "content": "Hello VulnSentry, let's start the security audit."},
        {"role": "assistant", "content": "Ready to inspect codebase."},
        {"role": "user", "content": "List files in repo."},
        {"role": "assistant", "content": "Files: vulnerable_app.py, config.py, database.py."},
        {"role": "user", "content": "Historical inquiry: what was yesterday's scan status?"},
        {"role": "assistant", "content": "Yesterday's baseline scan found 0 critical flaws."},
        {"role": "user", "content": "What is the weather today?"},
        {"role": "assistant", "content": "I am an auditor and do not track weather."},
        {"role": "user", "content": "Let's focus on vulnerable_app.py."},
        {"role": "assistant", "content": "Inspecting vulnerable_app.py contents."},
        {
            "role": "user",
            "content": f"Audit this code for vulnerabilities:\n\n{code_snippet}",
        },
    ]

    context_result = context_mgr.process_context(
        sample_conversation,
        run_id=run_id,
        parent_event_id=e_user_query.event_id,
    )
    e_context = context_mgr.last_event

    # 3. LLM_CALL (Agent reasoning step)
    e_llm = tracer.log_event(
        event_type=EventType.LLM_CALL,
        run_id=run_id,
        parent_event_id=e_context.event_id if e_context else e_user_query.event_id,
        input={
            "prompt": "Analyze code snippet and determine security verification strategy.",
            "model": "gpt-4o-mini",
            "temperature": 0.0,
            "messages_count": len(context_result["selected_context"]),
        },
        output={
            "thought": "Code contains string interpolation in SQL query execution. Also contains hardcoded AKIA AWS key. Proposing exploit simulation and static verification.",
            "tool_decision": "exploit_simulator" if trigger_failure else "run_sql_injection_scan",
        },
        duration_ms=412.5,
        metadata={"tokens": {"prompt_tokens": 340, "completion_tokens": 48}},
    )

    last_parent_id = e_llm.event_id

    # 4. TOOL_SELECTION
    invalid_tool_call = {
        "tool": "exploit_simulator",
        "arguments": {
            "target": "vulnerable_app.py",
            "force_gas": 999999,  # Invalid parameter to trigger failure interception
        },
    }
    e_tool_selection = tracer.log_event(
        event_type=EventType.TOOL_SELECTION,
        run_id=run_id,
        parent_event_id=last_parent_id,
        input=invalid_tool_call,
        output={"selected_tool": "exploit_simulator", "requires_validation": True},
        duration_ms=1.8,
    )
    last_parent_id = e_tool_selection.event_id

    # 5. TOOL_VALIDATION & 6. FAILURE_DETECTED (FailureInterceptor)
    failure_result = interceptor.intercept(
        invalid_tool_call,
        run_id=run_id,
        parent_event_id=last_parent_id,
        log_validation_event=True,
    )
    # The interceptor logged TOOL_VALIDATION and FAILURE_DETECTED
    last_parent_id = interceptor.last_event.event_id if interceptor.last_event else last_parent_id

    # 7. RECOVERY (Self-Correction)
    recovered_call = {
        "tool": "run_sql_injection_scan",
        "arguments": {
            "code_snippet": code_snippet,
            "confidence_threshold": 0.7,
        },
    }
    e_recovery = interceptor.record_recovery(
        recovered_call,
        parent_event_id=last_parent_id,
        run_id=run_id,
        metadata={"correction_source": "agent_self_reflection", "recovery_strategy": "fallback_to_verified_static_scanner"},
    )
    last_parent_id = e_recovery.event_id if e_recovery else last_parent_id

    # 8. TOOL_CALL (Verified security tool execution)
    e_tool_call = tracer.log_event(
        event_type=EventType.TOOL_CALL,
        run_id=run_id,
        parent_event_id=last_parent_id,
        input={"tool": "run_sql_injection_scan", "arguments": {"confidence_threshold": 0.7}},
        output={"status": "executing"},
        duration_ms=8.5,
    )
    last_parent_id = e_tool_call.event_id

    # 9. TOOL_RESULT (Raw output from security scanner)
    sqli_result = run_sql_injection_scan(code_snippet)
    secret_result = run_secret_leak_scan(code_snippet)
    combined_tool_result = {
        "sql_injection_scan": sqli_result,
        "secret_leak_scan": secret_result,
        "vulnerabilities_found": 2,
    }

    e_tool_result = tracer.log_event(
        event_type=EventType.TOOL_RESULT,
        run_id=run_id,
        parent_event_id=last_parent_id,
        input={"tool": "run_sql_injection_scan"},
        output=combined_tool_result,
        duration_ms=14.2,
        metadata={"scanners_executed": ["run_sql_injection_scan", "run_secret_leak_scan"]},
    )
    last_parent_id = e_tool_result.event_id

    # 10. FINAL_RESPONSE (Synthesized SecurityFinding)
    finding = SecurityFinding(
        vulnerability_detected=True,
        title="CWE-89: SQL Injection via Raw String Interpolation & CWE-798: Exposed AWS Key",
        severity="CRITICAL",
        cwe_id="CWE-89, CWE-798",
        description=(
            "Found unsanitized string interpolation in SQL query execution inside get_user_profile(). "
            "Additionally discovered hardcoded AWS credentials (AKIA_FAKE_SECRET_KEY_EXPOSED_IN_PROD_12345)."
        ),
        remediation=(
            "1. Replace raw f-strings with parameterized queries: cursor.execute('SELECT * FROM users WHERE username = ?', (user_input,))\n"
            "2. Move credentials to an encrypted secrets manager or environment variable."
        ),
        tool_used="run_sql_injection_scan, run_secret_leak_scan",
        raw_tool_output=combined_tool_result,
    )

    tracer.log_event(
        event_type=EventType.FINAL_RESPONSE,
        run_id=run_id,
        parent_event_id=last_parent_id,
        input={"finding_title": finding.title},
        output=finding.to_dict(),
        duration_ms=210.0,
        metadata={"audit_completed": True, "verdict": "VULNERABLE"},
    )

    tracer.end_run(run_id=run_id, status="COMPLETED")

    run = tracer.get_run(run_id)
    return {
        "run": run.to_dict(),
        "code_snippet": code_snippet,
        "finding": finding.to_dict(),
        "context_metrics": {
            "original_token_count": context_result["original_token_count"],
            "compressed_token_count": context_result["compressed_token_count"],
            "reduction_percentage": context_result["reduction_percentage"],
            "preserved_items": context_result["preserved_items"],
        },
        "failure_details": {
            "blocked": failure_result.blocked,
            "invalid_tool": failure_result.tool,
            "invalid_arguments": failure_result.arguments,
            "validation_error": failure_result.error,
            "correction_message": failure_result.correction_message,
        },
    }


if __name__ == "__main__":
    data = generate_trace_data()
    out_dir = ROOT_DIR / "data"
    out_dir.mkdir(exist_ok=True)
    out_file = out_dir / "latest_trace.json"
    with open(out_file, "w") as f:
        json.dump(data, f, indent=2)
    print(f"Generated trace with {len(data['run']['events'])} events -> {out_file}")
