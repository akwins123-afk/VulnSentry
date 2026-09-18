from typing import Dict, Any

TOOL_SCHEMAS: Dict[str, Dict[str, Any]] = {
    "run_sql_injection_scan": {
        "name": "run_sql_injection_scan",
        "description": "Scans code for raw string concatenation or interpolation in SQL queries.",
        "parameters": {
            "type": "object",
            "properties": {
                "code_snippet": {"type": "string", "description": "The source code to analyze."},
                "confidence_threshold": {"type": "number", "description": "Confidence float between 0.0 and 1.0"}
            },
            "required": ["code_snippet"]
        }
    },
    "run_secret_leak_scan": {
        "name": "run_secret_leak_scan",
        "description": "Scans code for hardcoded API keys, secrets, and private credentials.",
        "parameters": {
            "type": "object",
            "properties": {
                "code_snippet": {"type": "string", "description": "The source code to analyze."}
            },
            "required": ["code_snippet"]
        }
    }
}