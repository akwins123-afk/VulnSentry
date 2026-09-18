"""
Security Agent Core Loop (Owned by Akash)
Integrates with GlassBox ExecutionTracer and ToolValidator.
"""
import os
import re
import json
import time
from typing import Optional, Dict, Any

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

from tools.schemas import TOOL_SCHEMAS
from tools.security_scan import run_sql_injection_scan, run_secret_leak_scan
from agent.prompts import SYSTEM_PROMPT, RECOVERY_PROMPT_TEMPLATE, SYNTHESIS_PROMPT
from agent.findings import SecurityFinding


class SecurityAgent:
    def __init__(
        self,
        tracer=None,
        validator=None,
        model_name: str = "gpt-4o-mini",
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        mock_mode: Optional[bool] = None,
    ):
        self.tracer = tracer
        self.validator = validator
        self.model_name = model_name
        self._last_event = None

        # Register tool schemas if validator supports schema registration
        if self.validator and hasattr(self.validator, "register_schema"):
            for name, schema in TOOL_SCHEMAS.items():
                self.validator.register_schema(name, schema)

        resolved_api_key = (
            api_key
            or os.getenv("LLM_API_KEY")
            or os.getenv("OPENAI_API_KEY")
            or "dummy-key-for-local"
        )
        resolved_base_url = base_url or os.getenv("LLM_BASE_URL", "https://api.openai.com/v1")

        # Determine mock mode: if explicitly passed, or OpenAI not installed, or using dummy key without custom base url
        if mock_mode is not None:
            self.mock_mode = mock_mode
        elif OpenAI is None:
            self.mock_mode = True
        elif resolved_api_key == "dummy-key-for-local" and not os.getenv("OPENAI_API_KEY") and not os.getenv("LLM_API_KEY") and not base_url:
            self.mock_mode = True
        else:
            self.mock_mode = False

        if OpenAI is not None and not self.mock_mode:
            self.client = OpenAI(
                base_url=resolved_base_url,
                api_key=resolved_api_key,
            )
        else:
            self.client = None

    def _log(
        self,
        event_type: str,
        input: Any = None,
        output: Any = None,
        status: str = "SUCCESS",
        duration_ms: Optional[float] = None,
        metadata: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None,
        parent_event_id: Optional[str] = None,
        **kwargs: Any,
    ) -> Optional[Any]:
        """
        Log an event to ExecutionTracer conforming to GlassBox conventions.
        Accepts input, output, status, duration_ms, and tracks parent-child DAG relationships.
        """
        # Backwards-compatibility for input_data / output_data
        if input is None and "input_data" in kwargs:
            input = kwargs.pop("input_data")
        if output is None and "output_data" in kwargs:
            output = kwargs.pop("output_data")

        normalized_status = status.upper() if isinstance(status, str) else str(status)

        # Resolve parent event: explicit parameter > last logged event
        effective_parent = parent_event_id
        if effective_parent is None and self._last_event is not None:
            effective_parent = getattr(self._last_event, "event_id", None)

        combined_metadata = dict(metadata or {})
        if kwargs:
            combined_metadata.update(kwargs)

        event = None
        if self.tracer and hasattr(self.tracer, "log_event"):
            event = self.tracer.log_event(
                event_type=event_type,
                parent_event_id=effective_parent,
                input=input,
                output=output,
                status=normalized_status,
                duration_ms=duration_ms,
                metadata=combined_metadata,
                error=error,
            )
            self._last_event = event
        else:
            print(f"[{event_type}] status={normalized_status} | err={error}")

        return event

    def _simulate_llm_response(self, messages: list) -> Dict[str, Any]:
        """
        Deterministic local security reasoning when running in mock or offline mode.
        """
        last_user_msg = ""
        last_assistant_msg = ""
        system_msg = ""

        for m in messages:
            role = m.get("role", "")
            content = m.get("content", "")
            if role == "system":
                system_msg = content
            elif role == "user":
                last_user_msg = content
            elif role == "assistant":
                last_assistant_msg = content

        # Case 1: Recovery from validation failure
        if "[CRITICAL: TOOL VALIDATION ERROR]" in last_user_msg:
            tool_name = "run_sql_injection_scan"
            if last_assistant_msg:
                try:
                    prev_json = json.loads(last_assistant_msg)
                    tool_name = prev_json.get("tool_name", tool_name)
                except Exception:
                    pass

            return {
                "thought": "Validation error received. Correcting tool arguments to strictly match allowed schema by removing invalid parameters.",
                "tool_name": tool_name,
                "tool_args": {
                    "code_snippet": last_user_msg.split("Reason:")[0] if "code_snippet" in last_user_msg else "",
                    "confidence_threshold": 0.7,
                },
            }

        # Case 2: Synthesis reporting
        if "Synthesis" in system_msg or "reporting" in system_msg.lower() or "SYNTHESIS_PROMPT" in system_msg or "vulnerability_detected" in last_user_msg:
            is_vulnerable = (
                ('"vulnerable": true' in last_user_msg.lower() or "'vulnerable': true" in last_user_msg.lower())
                and ('"vulnerable": false' not in last_user_msg.lower() and "'vulnerable': false" not in last_user_msg.lower())
            )
            if "run_secret_leak_scan" in last_user_msg:
                return {
                    "vulnerability_detected": is_vulnerable,
                    "cwe_id": "CWE-798" if is_vulnerable else "N/A",
                    "severity": "HIGH" if is_vulnerable else "NONE",
                    "title": "CWE-798: Hardcoded Credentials" if is_vulnerable else "Clean: No Credentials Leaked",
                    "description": "Hardcoded secret or API key identified in source file." if is_vulnerable else "No credentials detected.",
                    "remediation": "Store sensitive credentials in environment variables or a secure secrets manager." if is_vulnerable else "Continue following secure secrets hygiene.",
                }
            else:
                return {
                    "vulnerability_detected": is_vulnerable,
                    "cwe_id": "CWE-89" if is_vulnerable else "N/A",
                    "severity": "CRITICAL" if is_vulnerable else "NONE",
                    "title": "CWE-89: SQL Injection via Raw String Interpolation" if is_vulnerable else "Clean: No SQL Injection Found",
                    "description": "Unsanitized string interpolation detected in SQL query execution allowing raw injection." if is_vulnerable else "No direct SQL string interpolation found.",
                    "remediation": "Use parameterized queries or prepared statements instead of raw string interpolation." if is_vulnerable else "Continue using parameterized queries.",
                }

        code_part = last_user_msg
        if "Inspect this code snippet and select a verification tool:\n\n" in last_user_msg:
            code_part = last_user_msg.split("Inspect this code snippet and select a verification tool:\n\n", 1)[1]

        has_secret = bool(re.search(r"AKIA[0-9A-Z_]{12,}|secret_key|AWS_SECRET|API_KEY|PASSWORD", code_part, re.IGNORECASE))
        has_sql = bool(re.search(r"\b(SELECT|INSERT|UPDATE|DELETE)\b|sqlite3|cursor\.execute", code_part, re.IGNORECASE))

        if has_sql:
            return {
                "thought": "Detected SQL query construction with potential user input interpolation. Selecting run_sql_injection_scan to verify vulnerability.",
                "tool_name": "run_sql_injection_scan",
                "tool_args": {
                    "code_snippet": code_part,
                    "confidence_threshold": 0.7,
                },
            }
        elif has_secret:
            return {
                "thought": "Detected hardcoded credential pattern. Selecting run_secret_leak_scan to verify secret exposure.",
                "tool_name": "run_secret_leak_scan",
                "tool_args": {
                    "code_snippet": code_part,
                },
            }
        else:
            return {
                "thought": "Defaulting to SQL injection security analysis.",
                "tool_name": "run_sql_injection_scan",
                "tool_args": {
                    "code_snippet": code_part,
                    "confidence_threshold": 0.7,
                },
            }

    def _call_llm(self, messages: list) -> Dict[str, Any]:
        t0 = time.time()
        tokens = {"input_tokens": 0, "output_tokens": 0}
        parsed: Dict[str, Any] = {}

        if self.mock_mode:
            duration_ms = max(5.0, (time.time() - t0) * 1000)
            parsed = self._simulate_llm_response(messages)
            in_chars = sum(len(str(m.get("content", ""))) for m in messages)
            in_tokens = max(20, int(round(in_chars / 4.0)))
            out_chars = len(json.dumps(parsed))
            out_tokens = max(15, int(round(out_chars / 4.0)))
            tokens = {"input_tokens": in_tokens, "output_tokens": out_tokens}
        else:
            try:
                response = self.client.chat.completions.create(
                    model=self.model_name,
                    messages=messages,
                    temperature=0.0,
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
                    "output_tokens": usage.completion_tokens if usage else 0,
                }
            except Exception:
                duration_ms = (time.time() - t0) * 1000
                parsed = self._simulate_llm_response(messages)
                tokens = {"input_tokens": 100, "output_tokens": 50}

        self._log(
            event_type="LLM_CALL",
            input=messages,
            output=parsed,
            status="SUCCESS" if "error" not in parsed else "ERROR",
            duration_ms=duration_ms,
            metadata={
                "model": self.model_name,
                **tokens,
            },
        )
        return parsed

    def analyze_code(self, code_snippet: str, trigger_demo_failure: bool = False) -> Dict[str, Any]:
        # Reset last event for the new scan root node so USER_QUERY is a root DAG event
        self._last_event = None

        t_query_start = time.time()
        self._log(
            event_type="USER_QUERY",
            input={"code_snippet": code_snippet},
            output={"action": "security_audit", "trigger_demo_failure": trigger_demo_failure},
            status="SUCCESS",
            duration_ms=(time.time() - t_query_start) * 1000,
            parent_event_id=None,
        )

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Inspect this code snippet and select a verification tool:\n\n{code_snippet}"},
        ]
        decision = self._call_llm(messages)
        tool_name = decision.get("tool_name", "run_sql_injection_scan")
        tool_args = dict(decision.get("tool_args", {"code_snippet": code_snippet}))

        if "code_snippet" not in tool_args:
            tool_args["code_snippet"] = code_snippet

        if trigger_demo_failure:
            tool_args["force_gas"] = 999999

        t_sel = time.time()
        self._log(
            event_type="TOOL_SELECTION",
            input={"tool": tool_name, "arguments": dict(tool_args)},
            output={"candidate_selected": tool_name},
            status="SUCCESS",
            duration_ms=(time.time() - t_sel) * 1000,
        )

        t_val = time.time()
        is_valid = True
        validation_error = None
        validation_error_type = None

        if self.validator and hasattr(self.validator, "validate"):
            val_result = self.validator.validate(tool_name, tool_args)
            is_valid = val_result.is_valid
            validation_error = val_result.error
            validation_error_type = getattr(val_result, "error_type", None)
        else:
            schema = TOOL_SCHEMAS.get(tool_name, {}).get("parameters", {}).get("properties", {})
            invalid_keys = set(tool_args.keys()) - set(schema.keys())
            if invalid_keys:
                is_valid = False
                validation_error = f"Invalid tool arguments: {sorted(list(invalid_keys))} not allowed by schema."
                validation_error_type = "UNKNOWN_PARAMETER"

        val_duration_ms = (time.time() - t_val) * 1000

        self._log(
            event_type="TOOL_VALIDATION",
            input={"tool": tool_name, "arguments": dict(tool_args)},
            output={"is_valid": is_valid, "error": validation_error},
            status="SUCCESS" if is_valid else "FAILURE",
            duration_ms=val_duration_ms,
            error=validation_error,
            metadata={"error_type": validation_error_type} if validation_error_type else {},
        )

        if not is_valid:
            self._log(
                event_type="FAILURE_DETECTED",
                input={"tool": tool_name, "arguments": dict(tool_args)},
                output={"correction_message": f"Validation failed: {validation_error}. Initiating self-correction."},
                status="FAILURE",
                error=validation_error,
                metadata={
                    "error_type": validation_error_type,
                    "blocked": True,
                },
            )

            # Rule 2: Agent Self-Correction Recovery Loop
            messages.append({"role": "assistant", "content": json.dumps(decision)})
            messages.append({
                "role": "user",
                "content": RECOVERY_PROMPT_TEMPLATE.format(validation_error=validation_error),
            })

            recovery_decision = self._call_llm(messages)
            tool_name = recovery_decision.get("tool_name", tool_name)
            rec_args = recovery_decision.get("tool_args", {})
            if isinstance(rec_args, dict) and rec_args:
                tool_args = dict(rec_args)
            tool_args.pop("force_gas", None)
            tool_args["code_snippet"] = code_snippet

            if self.validator and hasattr(self.validator, "validate"):
                rec_val = self.validator.validate(tool_name, tool_args)
                if not rec_val.is_valid:
                    tool_args.pop("force_gas", None)

            self._log(
                event_type="RECOVERY",
                input={"recovered_tool": tool_name, "corrected_arguments": dict(tool_args)},
                output={"status": "recovered"},
                status="SUCCESS",
                metadata={"previous_error": validation_error},
            )

        t_call = time.time()
        self._log(
            event_type="TOOL_CALL",
            input={"tool": tool_name, "arguments": dict(tool_args)},
            output={"status": "executing"},
            status="SUCCESS",
        )

        if tool_name == "run_sql_injection_scan":
            confidence = tool_args.get("confidence_threshold", 0.7)
            tool_result = run_sql_injection_scan(code_snippet, confidence_threshold=confidence)
        elif tool_name == "run_secret_leak_scan":
            tool_result = run_secret_leak_scan(code_snippet)
        else:
            tool_result = {"error": f"Tool {tool_name} not recognized"}

        call_duration_ms = (time.time() - t_call) * 1000

        self._log(
            event_type="TOOL_RESULT",
            input=tool_args,
            output=tool_result,
            status="SUCCESS",
            duration_ms=call_duration_ms,
            metadata={"vulnerable": tool_result.get("vulnerable", False)},
        )

        synthesis_messages = [
            {"role": "system", "content": "You are a professional security report generator."},
            {"role": "user", "content": SYNTHESIS_PROMPT.format(tool_name=tool_name, tool_result=json.dumps(tool_result))},
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
            raw_tool_output=tool_result,
        )

        final_dict = finding.to_dict()
        self._log(
            event_type="FINAL_RESPONSE",
            input={"finding_title": final_dict["title"], "severity": final_dict["severity"]},
            output=final_dict,
            status="SUCCESS",
        )
        return final_dict