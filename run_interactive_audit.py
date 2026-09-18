"""
VulnSentry - Interactive Real-Time Security Audit Bridge
Executes all 4 core Glass-Box features on arbitrary user prompt/code:
  1. ContextManager (Piece 3: Token compression & turn pruning)
  2. SecurityAgent (LLM Reasoning & Tool Selection)
  3. ToolValidator (Piece 1: The Shield - Pre-execution parameter validation)
  4. FailureInterceptor (Piece 2: Self-Correction Recovery Loop)
  5. ExecutionTracer (Piece 4: Verifiable 11-field DAG Telemetry)
"""

import sys
import os
import json
from pathlib import Path

# Ensure workspace root is in sys.path
WORKSPACE_ROOT = Path(__file__).resolve().parent
if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))

from glassbox.tracer import ExecutionTracer
from validation.tool_validator import ToolValidator
from tools.schemas import TOOL_SCHEMAS
from agent.agent import SecurityAgent
from context.context_manager import ContextManager


def run_interactive_audit(
    code_snippet: str,
    trigger_demo_failure: bool = False,
    conversation_history: list = None,
):
    tracer = ExecutionTracer()
    run_id = tracer.start_run(
        metadata={
            "scanner": "VulnSentry",
            "version": "1.0",
            "mode": "realtime_interactive",
            "trigger_demo_failure": trigger_demo_failure,
        }
    )

    # 1. Piece 3: ContextManager (Token Compression & Turn Pruning)
    cm = ContextManager(tracer=tracer, default_run_id=run_id)
    history = list(conversation_history or [])
    # Add context turns if minimal to demonstrate token pruning with dynamic token sizing
    if len(history) < 6:
        clean_code = code_snippet.strip()
        lines = [l for l in clean_code.split("\n") if l.strip()]
        line_count = len(lines)
        char_count = len(clean_code)
        
        sample_context = [
            {"role": "user", "content": f"Security auditor, prepare a scan pipeline for our microservice repository containing {line_count} lines of code ({char_count} chars)."},
            {"role": "assistant", "content": "Security scanner initialized. Rule 1 schema validator and Rule 2 failure interceptor are engaged."},
            {"role": "user", "content": f"Previous commit logs show potential injection vectors in database endpoints."},
            {"role": "assistant", "content": "I have registered the tool schemas for SQL injection and AWS credential leak scanners."},
            {"role": "user", "content": "Please verify if the submitted functions contain unparameterized query strings or hardcoded access tokens."},
            {"role": "assistant", "content": "Understood. Please provide the target code artifact for deterministic AST and schema verification."},
        ]
        history = sample_context + history

    # Add the current user prompt/code
    history.append({
        "role": "user",
        "content": f"Audit this target code for security vulnerabilities:\n\n{code_snippet}",
    })

    context_result = cm.process_context(history, run_id=run_id)

    # 2. Piece 1: ToolValidator (The Shield)
    validator = ToolValidator(schemas=TOOL_SCHEMAS)

    # 3. SecurityAgent (integrates Tracer, Validator & FailureInterceptor)
    agent = SecurityAgent(tracer=tracer, validator=validator)

    # 4. Analyze Code (triggers Tool Selection, Validation, Failure Detection, Recovery, Tool Call, & Final Finding)
    finding = agent.analyze_code(code_snippet, trigger_demo_failure=trigger_demo_failure)

    # 5. Piece 4: ExecutionTracer (The Glass-Box Logger)
    tracer.end_run(run_id=run_id, status="COMPLETED")
    
    # Export to audit_trace.json
    output_path = WORKSPACE_ROOT / "audit_trace.json"
    tracer.export_json(run_id=run_id, file_path=output_path)

    # Return full trace dictionary
    run_obj = tracer.get_run(run_id)
    trace_dict = run_obj.to_dict() if hasattr(run_obj, "to_dict") else {
        "run_id": run_id,
        "status": "COMPLETED",
        "events": [e.to_dict() if hasattr(e, "to_dict") else dict(e) for e in tracer.get_events(run_id)],
        "metadata": run_obj.metadata if hasattr(run_obj, "metadata") else {},
    }

    return {
        "trace": trace_dict,
        "context_result": context_result,
        "finding": finding,
    }


def main():
    try:
        input_data = {}
        if not sys.stdin.isatty():
            raw_input = sys.stdin.read().strip()
            if raw_input:
                input_data = json.loads(raw_input)
    except Exception as e:
        input_data = {}

    code_snippet = input_data.get("code")
    if not code_snippet:
        # Fallback to sample fixture
        fixture_path = WORKSPACE_ROOT / "test_fixtures" / "vulnerable_app.py"
        if fixture_path.exists():
            code_snippet = fixture_path.read_text(encoding="utf-8")
        else:
            code_snippet = "import sqlite3\nquery = f'SELECT * FROM users WHERE id = {uid}'"

    trigger_demo_failure = bool(input_data.get("trigger_demo_failure", False))
    history = input_data.get("history", [])

    result = run_interactive_audit(
        code_snippet=code_snippet,
        trigger_demo_failure=trigger_demo_failure,
        conversation_history=history,
    )

    print(json.dumps(result))


if __name__ == "__main__":
    main()
