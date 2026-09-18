"""
Security Agent Core Loop (Owned by Akash)
"""
import os
import re
import json
import time
from typing import Optional, Dict, Any

from openai import OpenAI
from tools.schemas import TOOL_SCHEMAS
from tools.security_scan import run_sql_injection_scan, run_secret_leak_scan
from agent.prompts import SYSTEM_PROMPT, RECOVERY_PROMPT_TEMPLATE, SYNTHESIS_PROMPT
from agent.findings import SecurityFinding

class SecurityAgent:
    def __init__(self, 
                 tracer=None, 
                 validator=None, 
                 model_name: str = "gpt-4o-mini",
                 base_url: Optional[str] = None,
                 api_key: Optional[str] = None):
        self.tracer = tracer
        self.validator = validator
        self.model_name = model_name
        
        self.client = OpenAI(
            base_url=base_url or os.getenv("LLM_BASE_URL", "https://api.openai.com/v1"),
            api_key=api_key or os.getenv("LLM_API_KEY", "dummy-key-for-local")
        )

    def _log(self, event_type: str, input_data: Any = None, output_data: Any = None, 
             metadata: Optional[Dict[str, Any]] = None, error: Optional[str] = None, status: str = "success"):
        if self.tracer and hasattr(self.tracer, "log_event"):
            self.tracer.log_event(
                event_type=event_type,
                input_data=input_data,
                output_data=output_data,
                metadata=metadata or {},
                error=error,
                status=status
            )
        else:
            print(f"[{event_type}] status={status} | err={error}")

    def _call_llm(self, messages: list) -> Dict[str, Any]:
        t0 = time.time()
        response = self.client.chat.completions.create(
            model=self.model_name,
            messages=messages,
            temperature=0.0
        )
        duration_ms = (time.time() - t0) * 1000
        raw_text = response.choices[0].message.content.strip()

        cleaned_json = re.sub(r"^```[a-zA-Z]*\n?", "", raw_text)
        cleaned_json = re.sub(r"\n?```$", "", cleaned_json).strip()

        try:
            parsed = json.loads(cleaned_json)
        except json.JSONDecodeError:
            parsed = {"error": "Failed to parse LLM response as JSON", "raw": raw_text}

        usage = response.usage
        tokens = {
            "input_tokens": usage.prompt_tokens if usage else 0,
            "output_tokens": usage.completion_tokens if usage else 0
        }

        self._log(
            event_type="LLM_CALL",
            input_data=messages,
            output_data=parsed,
            metadata={
                "duration_ms": duration_ms,
                "model": self.model_name,
                **tokens
            }
        )
        return parsed

    def analyze_code(self, code_snippet: str, trigger_demo_failure: bool = False) -> Dict[str, Any]:
        self._log("USER_QUERY", input_data=code_snippet)

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Inspect this code snippet and select a verification tool:\n\n{code_snippet}"}
        ]
        decision = self._call_llm(messages)
        tool_name = decision.get("tool_name", "run_sql_injection_scan")
        tool_args = decision.get("tool_args", {})

        if trigger_demo_failure:
            tool_args["force_gas"] = 999999

        self._log("TOOL_SELECTION", input_data={"tool": tool_name, "args": tool_args})

        is_valid = True
        validation_error = None

        if self.validator and hasattr(self.validator, "validate"):
            is_valid, validation_error = self.validator.validate(tool_name, tool_args)
        else:
            schema = TOOL_SCHEMAS.get(tool_name, {}).get("parameters", {}).get("properties", {})
            invalid_keys = set(tool_args.keys()) - set(schema.keys())
            if invalid_keys:
                is_valid = False
                validation_error = f"Invalid tool arguments: {list(invalid_keys)} not allowed by schema."

        self._log(
            event_type="TOOL_VALIDATION",
            input_data={"tool": tool_name, "args": tool_args},
            status="success" if is_valid else "failure",
            error=validation_error
        )

        if not is_valid:
            self._log(
                event_type="FAILURE_DETECTED",
                input_data={"tool": tool_name, "args": tool_args},
                error=validation_error,
                status="failure"
            )

            messages.append({"role": "assistant", "content": json.dumps(decision)})
            messages.append({
                "role": "user",
                "content": RECOVERY_PROMPT_TEMPLATE.format(validation_error=validation_error)
            })

            recovery_decision = self._call_llm(messages)
            tool_name = recovery_decision.get("tool_name", tool_name)
            tool_args = recovery_decision.get("tool_args", {"code_snippet": code_snippet})
            tool_args.pop("force_gas", None)

            self._log(
                event_type="RECOVERY",
                input_data={"recovered_tool": tool_name, "corrected_args": tool_args},
                status="success"
            )

        self._log("TOOL_CALL", input_data={"tool": tool_name, "args": tool_args})

        if tool_name == "run_sql_injection_scan":
            tool_result = run_sql_injection_scan(code_snippet)
        elif tool_name == "run_secret_leak_scan":
            tool_result = run_secret_leak_scan(code_snippet)
        else:
            tool_result = {"error": f"Tool {tool_name} not recognized"}

        self._log("TOOL_RESULT", input_data=tool_args, output_data=tool_result)

        synthesis_messages = [
            {"role": "system", "content": "You are a professional security report generator."},
            {"role": "user", "content": SYNTHESIS_PROMPT.format(tool_name=tool_name, tool_result=json.dumps(tool_result))}
        ]
        synthesis = self._call_llm(synthesis_messages)

        finding = SecurityFinding(
            vulnerability_detected=tool_result.get("vulnerable", False),
            title=synthesis.get("title", tool_result.get("vuln_type", "Security Scan Result")),
            severity=synthesis.get("severity", tool_result.get("severity", "LOW")),
            cwe_id=synthesis.get("cwe_id", "CWE-89"),
            description=synthesis.get("description", tool_result.get("details", "")),
            remediation=synthesis.get("remediation", "Use parameterized queries."),
            tool_used=tool_name,
            raw_tool_output=tool_result
        )

        final_dict = finding.to_dict()
        self._log("FINAL_RESPONSE", output_data=final_dict)
        return final_dict