"""
Security Finding Schemas (Owned by Akash)
"""
from typing import Dict, Any

class SecurityFinding:
    def __init__(self, 
                 vulnerability_detected: bool, 
                 title: str, 
                 severity: str, 
                 cwe_id: str, 
                 description: str, 
                 remediation: str,
                 tool_used: str,
                 raw_tool_output: Dict[str, Any]):
        self.vulnerability_detected = vulnerability_detected
        self.title = title
        self.severity = severity
        self.cwe_id = cwe_id
        self.description = description
        self.remediation = remediation
        self.tool_used = tool_used
        self.raw_tool_output = raw_tool_output

    def to_dict(self) -> Dict[str, Any]:
        return {
            "vulnerability_detected": self.vulnerability_detected,
            "title": self.title,
            "severity": self.severity,
            "cwe_id": self.cwe_id,
            "description": self.description,
            "remediation": self.remediation,
            "tool_used": self.tool_used,
            "raw_tool_output": self.raw_tool_output
        }