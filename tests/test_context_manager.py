"""
Unit tests for ContextManager and ContextCompressor.
Validates:
- Short conversation handling
- 20-turn conversation processing
- Old conversational turns being compressed/pruned
- Important security findings preserved across historical turns
- Deterministic token reduction calculations
- CONTEXT_SELECTED event logging via ExecutionTracer
"""

from pathlib import Path
import sys
import unittest

# Ensure project root is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from context.context_compressor import ContextCompressor, estimate_tokens
from context.context_manager import ContextManager
from glassbox.events import REQUIRED_EVENT_FIELDS, EventStatus, EventType
from glassbox.tracer import ExecutionTracer


def generate_20_turn_conversation():
    """Helper to generate a realistic 20-turn security audit conversation."""
    return [
        # Turn 0: System Prompt
        {"role": "system", "content": "You are VulnSentry, an autonomous security auditor for smart contracts and web applications."},
        # Turn 1-2: Initial Greeting & Setup
        {"role": "user", "content": "Hello VulnSentry, let's start the security audit for project repo."},
        {"role": "assistant", "content": "Hello! I am ready to inspect your codebase. Where should we begin?"},
        # Turn 3-4: Routine directory inquiry
        {"role": "user", "content": "List the files in the repository to inspect."},
        {"role": "assistant", "content": "Repository contains: app.py, models.py, views.py, config.py, auth.py, database.py."},
        # Turn 5-6: Security finding 1 (CWE-89 SQL Injection)
        {"role": "user", "content": "Run deep static scan on database.py and views.py."},
        {
            "role": "assistant",
            "content": "CRITICAL VULNERABILITY DETECTED: CWE-89 SQL Injection in get_user_profile(). Unsanitized string interpolation detected in query execution.",
            "metadata": {"severity": "CRITICAL", "is_security_finding": True, "cwe_id": "CWE-89"},
        },
        # Turn 7-8: Security finding 2 (Secret Leak / Hardcoded Key)
        {"role": "user", "content": "Check config.py and auth.py for credential leaks."},
        {
            "role": "assistant",
            "content": "HIGH SEVERITY: Hardcoded Credentials identified: AKIA_FAKE_SECRET_KEY_EXPOSED_IN_PROD_12345 leaked in auth.py.",
            "metadata": {"severity": "HIGH", "is_security_finding": True},
        },
        # Turns 9-14: Low-value conversational banter & intermediate chatter (to be compressed)
        {"role": "user", "content": "What is the weather like today in Seattle?"},
        {"role": "assistant", "content": "I am a security auditor and do not have access to live weather data."},
        {"role": "user", "content": "Okay, are you sure?"},
        {"role": "assistant", "content": "Yes, I am focused solely on code analysis and security verification."},
        {"role": "user", "content": "Can you print a smiley face?"},
        {"role": "assistant", "content": "Sure: :) Now let's resume our security analysis."},
        # Turns 15-18: Recent context window
        {"role": "user", "content": "Let's review the affected endpoints again."},
        {"role": "assistant", "content": "The affected endpoints are /users/profile (SQLi) and the AWS S3 client initialization."},
        {"role": "user", "content": "Can we parameterize the SQL query with SQLite cursor execute?"},
        {"role": "assistant", "content": "Yes, replace f-strings with parameterized placeholders like cursor.execute('SELECT * FROM users WHERE username = ?', (user_input,))."},
        # Turn 19: Current User Request
        {"role": "user", "content": "Generate the complete final remediation plan for all detected vulnerabilities."},
    ]


class TestContextManager(unittest.TestCase):
    """Test suite for ContextManager and ContextCompressor."""

    def setUp(self) -> None:
        self.tracer = ExecutionTracer()
        self.compressor = ContextCompressor(recent_window_size=4)
        self.manager = ContextManager(
            tracer=self.tracer,
            compressor=self.compressor,
            selection_strategy="security_aware_recency",
        )

    def test_short_conversation(self) -> None:
        """Requirement: Short conversation (< recent window) preserves all turns with 0% reduction."""
        short_convo = [
            {"role": "system", "content": "You are a security auditor."},
            {"role": "user", "content": "Scan views.py"},
            {"role": "assistant", "content": "No vulnerabilities found."},
        ]

        result = self.manager.process_context(short_convo)

        self.assertIn("selected_context", result)
        self.assertIn("original_token_count", result)
        self.assertIn("compressed_token_count", result)
        self.assertIn("reduction_percentage", result)
        self.assertIn("preserved_items", result)

        self.assertEqual(len(result["selected_context"]), 3)
        self.assertEqual(result["original_token_count"], result["compressed_token_count"])
        self.assertEqual(result["reduction_percentage"], 0.0)

    def test_20_turn_conversation_processing(self) -> None:
        """Requirement: Support a 15-20 turn conversation and reduce token footprint."""
        convo_20 = generate_20_turn_conversation()
        self.assertEqual(len(convo_20), 20)

        result = self.manager.process_context(convo_20)

        # Context was compressed
        self.assertLess(len(result["selected_context"]), 20)
        self.assertGreater(result["original_token_count"], result["compressed_token_count"])
        self.assertGreater(result["reduction_percentage"], 0.0)

        # Output format has all 5 required fields
        for key in [
            "selected_context",
            "original_token_count",
            "compressed_token_count",
            "reduction_percentage",
            "preserved_items",
        ]:
            self.assertIn(key, result)

    def test_old_turns_being_compressed(self) -> None:
        """Requirement: Old non-security historical turns are pruned / compressed."""
        convo = generate_20_turn_conversation()
        result = self.manager.process_context(convo)

        selected_contents = [m["content"] for m in result["selected_context"]]

        # Non-security historical banter from turns 9-14 must NOT be in selected_context
        self.assertFalse(any("weather like today" in c for c in selected_contents))
        self.assertFalse(any("print a smiley face" in c for c in selected_contents))

        # A compression summary note should be present informing the model
        has_summary_note = any("Context Note:" in c and "compressed" in c for c in selected_contents)
        self.assertTrue(has_summary_note)

    def test_important_security_finding_preserved(self) -> None:
        """
        Requirement: Important security findings must survive context compression,
        even if they occurred early in a 20-turn conversation.
        """
        convo = generate_20_turn_conversation()
        result = self.manager.process_context(convo)

        selected_contents = [m["content"] for m in result["selected_context"]]

        # Turn 6 (CWE-89 SQL Injection) was in early history, must survive
        sqli_preserved = any("CWE-89 SQL Injection" in c for c in selected_contents)
        self.assertTrue(sqli_preserved, "CWE-89 finding was dropped during context compression!")

        # Turn 8 (Hardcoded Credentials) was in early history, must survive
        cred_preserved = any("Hardcoded Credentials identified" in c for c in selected_contents)
        self.assertTrue(cred_preserved, "Credential leak finding was dropped during context compression!")

        # Current user request (Turn 19) must be preserved
        user_req_preserved = any("complete final remediation plan" in c for c in selected_contents)
        self.assertTrue(user_req_preserved, "Current user request was dropped!")

    def test_token_reduction_calculated(self) -> None:
        """Requirement: Verify accurate calculation of estimated tokens and reduction percentage."""
        convo = generate_20_turn_conversation()
        result = self.manager.process_context(convo)

        orig = result["original_token_count"]
        comp = result["compressed_token_count"]
        pct = result["reduction_percentage"]

        self.assertGreater(orig, 0)
        self.assertGreater(comp, 0)
        self.assertLess(comp, orig)

        expected_pct = round(((orig - comp) / orig) * 100.0, 2)
        self.assertAlmostEqual(pct, expected_pct, places=2)

        # Test estimate_tokens helper directly
        token_count = estimate_tokens("Short test string")
        self.assertGreater(token_count, 0)
        self.assertEqual(estimate_tokens(""), 0)
        self.assertEqual(estimate_tokens(None), 0)

    def test_context_selected_event_logged(self) -> None:
        """
        Requirement: Integrate with the EXISTING ExecutionTracer.
        Log CONTEXT_SELECTED containing:
          - original token count
          - compressed token count
          - reduction percentage
          - selection strategy
        """
        run_id = self.tracer.start_run(metadata={"scanner": "VulnSentry-Context"})
        convo = generate_20_turn_conversation()

        # Execute context management
        result = self.manager.process_context(convo, run_id=run_id)

        # Verify run has CONTEXT_SELECTED event
        run = self.tracer.get_run(run_id)
        self.assertIsNotNone(run)

        events = [e for e in run.events if e.event_type == EventType.CONTEXT_SELECTED.value]
        self.assertEqual(len(events), 1)

        event = events[0]
        self.assertEqual(event.status, EventStatus.SUCCESS.value)

        # Verify required trace fields in metadata / event
        self.assertIn("original_token_count", event.metadata)
        self.assertIn("compressed_token_count", event.metadata)
        self.assertIn("reduction_percentage", event.metadata)
        self.assertIn("selection_strategy", event.metadata)

        self.assertEqual(event.metadata["original_token_count"], result["original_token_count"])
        self.assertEqual(event.metadata["compressed_token_count"], result["compressed_token_count"])
        self.assertEqual(event.metadata["reduction_percentage"], result["reduction_percentage"])
        self.assertEqual(event.metadata["selection_strategy"], "security_aware_recency")

        # Verify all 11 required event fields
        ev_dict = event.to_dict()
        for field in REQUIRED_EVENT_FIELDS:
            self.assertIn(field, ev_dict, f"Missing required field {field} in event dict")

    def test_dag_linking_with_parent_event(self) -> None:
        """Verify CONTEXT_SELECTED links cleanly to parent event (e.g. USER_QUERY)."""
        run_id = self.tracer.start_run()
        parent_ev = self.tracer.log_event(
            event_type=EventType.USER_QUERY,
            run_id=run_id,
            input={"query": "Run audit"},
        )

        convo = generate_20_turn_conversation()
        self.manager.process_context(convo, run_id=run_id, parent_event_id=parent_ev)

        run = self.tracer.get_run(run_id)
        context_ev = [e for e in run.events if e.event_type == EventType.CONTEXT_SELECTED.value][0]

        self.assertEqual(context_ev.parent_event_id, parent_ev.event_id)


if __name__ == "__main__":
    unittest.main()
