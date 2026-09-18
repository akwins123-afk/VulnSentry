import re
from typing import Dict, Any

def run_sql_injection_scan(code_snippet: str, confidence_threshold: float = 0.7) -> Dict[str, Any]:
    patterns = [
        r"execute\s*\(\s*f[\"'].*?\{.*?\}[\"']\s*\)",
        r"execute\s*\(\s*[\"'].*?%s.*?[\"']\s*%",
        r"execute\s*\(\s*[\"'].*?\+.*?\+[\"']\s*\)",
    ]
    matches = []
    for pattern in patterns:
        found = re.findall(pattern, code_snippet)
        if found:
            matches.extend(found)

    if matches:
        return {
            "vulnerable": True,
            "vuln_type": "CWE-89: SQL Injection",
            "details": f"Unsanitized string interpolation detected in query execution: {matches}",
            "severity": "CRITICAL"
        }
    return {"vulnerable": False, "details": "No direct SQL string interpolation found."}

def run_secret_leak_scan(code_snippet: str) -> Dict[str, Any]:
    secret_pattern = r"(AKIA[0-9A-Z]{16})|(secret_key\s*=\s*['\"][A-Za-z0-9_\-]{20,}['\"])"
    matches = re.findall(secret_pattern, code_snippet, re.IGNORECASE)
    if matches:
        return {
            "vulnerable": True,
            "vuln_type": "CWE-798: Hardcoded Credentials",
            "details": "Hardcoded credential or key signature identified in source file.",
            "severity": "HIGH"
        }
    return {"vulnerable": False, "details": "No hardcoded credentials matched."}