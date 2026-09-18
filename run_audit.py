"""
VulnSentry - Root Security Audit Runner
Orchestrates AI Security Agent analysis with GlassBox ExecutionTracer and ToolValidator.
"""
from pathlib import Path
import json
import sys

# Ensure workspace root is in sys.path
WORKSPACE_ROOT = Path(__file__).resolve().parent
if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))

from glassbox.tracer import ExecutionTracer
from validation.tool_validator import ToolValidator
from tools.schemas import TOOL_SCHEMAS
from agent.agent import SecurityAgent


def run_audit():
    print("=" * 65)
    print("           VulnSentry Security Audit Execution")
    print("=" * 65)

    # 1. Initialize ExecutionTracer and start run
    tracer = ExecutionTracer()
    run_id = tracer.start_run(
        metadata={
            "scanner": "VulnSentry",
            "version": "1.0",
            "auditor": "Akash",
            "environment": "integration_audit",
        }
    )
    print(f"[*] Started ExecutionTracer Run: {run_id}")

    # 2. Initialize ToolValidator with registered schemas
    validator = ToolValidator(schemas=TOOL_SCHEMAS)
    print(f"[*] Initialized ToolValidator with {len(validator.schemas)} schemas: {sorted(list(validator.schemas.keys()))}")

    # 3. Initialize SecurityAgent
    agent = SecurityAgent(tracer=tracer, validator=validator)
    print("[*] Initialized SecurityAgent with tracer and validator.")

    # 4. Load test fixture
    fixture_path = WORKSPACE_ROOT / "test_fixtures" / "vulnerable_app.py"
    if not fixture_path.exists():
        raise FileNotFoundError(f"Fixture not found at: {fixture_path}")
    code_content = fixture_path.read_text(encoding="utf-8")
    print(f"[*] Loaded target fixture: {fixture_path.name} ({len(code_content)} bytes)")

    # 5. Run a clean scan first
    print("\n" + "-" * 55)
    print("[1/2] RUNNING CLEAN SECURITY SCAN (trigger_demo_failure=False)")
    print("-" * 55)
    finding_1 = agent.analyze_code(code_content, trigger_demo_failure=False)
    print(f"[+] Scan 1 Finding:")
    print(f"    Title:                 {finding_1.get('title')}")
    print(f"    Severity:              {finding_1.get('severity')}")
    print(f"    CWE ID:                {finding_1.get('cwe_id')}")
    print(f"    Vulnerability Detected:{finding_1.get('vulnerability_detected')}")
    print(f"    Tool Used:             {finding_1.get('tool_used')}")
    print(f"    Remediation:           {finding_1.get('remediation')}")

    # 6. Run a second scan demonstrating Rule 2 self-correction recovery loop
    print("\n" + "-" * 55)
    print("[2/2] RUNNING DEMO FAILURE SCAN (trigger_demo_failure=True)")
    print("      Demonstrating Rule 2 Self-Correction Recovery Loop")
    print("-" * 55)
    finding_2 = agent.analyze_code(code_content, trigger_demo_failure=True)
    print(f"[+] Scan 2 Finding (Recovered):")
    print(f"    Title:                 {finding_2.get('title')}")
    print(f"    Severity:              {finding_2.get('severity')}")
    print(f"    CWE ID:                {finding_2.get('cwe_id')}")
    print(f"    Vulnerability Detected:{finding_2.get('vulnerability_detected')}")
    print(f"    Tool Used:             {finding_2.get('tool_used')}")
    print(f"    Remediation:           {finding_2.get('remediation')}")

    # 7. End tracer run and export telemetry to audit_trace.json
    tracer.end_run(run_id=run_id, status="COMPLETED")
    output_path = WORKSPACE_ROOT / "audit_trace.json"
    exported_json = tracer.export_json(run_id=run_id, file_path=output_path)

    print("\n" + "=" * 65)
    print(f"[SUCCESS] Security Audit completed with ZERO unhandled exceptions.")
    print(f"[SUCCESS] Telemetry trace exported to: {output_path}")
    print(f"[SUCCESS] Exported {len(tracer.get_events(run_id))} events across 2 scan DAGs.")
    print("=" * 65)

    return finding_1, finding_2, output_path


if __name__ == "__main__":
    run_audit()
