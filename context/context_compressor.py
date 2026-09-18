"""
Context Compressor for VulnSentry.
Implements deterministic context compression for multi-turn conversations.
Preserves:
  - Current user request (latest user turn)
  - Recent conversation turns (sliding recency window)
  - Important security findings (vulnerabilities, CWE/CVE, credential leaks)
  - Important security state / system prompts
Compresses or prunes:
  - Old non-security conversational turns
  - Low-value historical chatter
  - Redundant or superseded conversation turns
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Set, Tuple, Union


# ESTIMATE: Deterministic token approximation heuristic.
# Model tokenizers (e.g. tiktoken/SentencePiece) typically average ~4 characters
# per token for English text and code, plus ~4 tokens overhead per message framing.
CHARS_PER_TOKEN = 4.0
MESSAGE_OVERHEAD_TOKENS = 4


def estimate_tokens(item: Union[str, Dict[str, Any], List[Any], None]) -> int:
    """
    Lightweight deterministic token approximation.

    DOCUMENTATION / ESTIMATE:
    This is an approximate, deterministic token calculation function used when
    an actual model tokenizer (such as tiktoken or HuggingFace tokenizers) is not bundled.
    Calculation uses ~4 characters per token heuristic plus standard message framing tokens.
    """
    if item is None:
        return 0

    if isinstance(item, str):
        if not item.strip():
            return 0
        return max(1, int(round(len(item) / CHARS_PER_TOKEN)))

    if isinstance(item, dict):
        total = MESSAGE_OVERHEAD_TOKENS
        for k, v in item.items():
            if isinstance(v, (str, int, float, bool)):
                total += estimate_tokens(str(v))
            elif isinstance(v, (dict, list)):
                total += estimate_tokens(v)
        return total

    if isinstance(item, (list, tuple)):
        return sum(estimate_tokens(elem) for elem in item)

    return max(1, int(round(len(str(item)) / CHARS_PER_TOKEN)))


class ContextCompressor:
    """
    Deterministic context compressor tailored for security auditing agents.
    Filters and compresses conversation history to avoid blindly sending the entire
    conversation to the LLM, while strictly preserving critical security findings.
    """

    # Patterns indicating high-value security findings or critical security state
    SECURITY_PATTERNS = [
        re.compile(r"\b(?:CWE-\d+|CVE-\d{4}-\d+)\b", re.IGNORECASE),
        re.compile(r"\b(?:SQL\s*Injection|Hardcoded\s*Credentials?|Secret\s*Leak)\b", re.IGNORECASE),
        re.compile(r"\b(?:Command\s*Injection|Remote\s*Code\s*Execution|Buffer\s*Overflow|XSS)\b", re.IGNORECASE),
        re.compile(r"\b(?:severity\s*[:=]\s*(?:critical|high)|vulnerability\s*detected)\b", re.IGNORECASE),
        re.compile(r"\b(?:vulnerable\s*[:=]\s*true|vulnerability_detected\s*[:=]\s*true)\b", re.IGNORECASE),
        re.compile(r"\b(?:AKIA[0-9A-Z]{16}|aws_secret_key|private_key)\b", re.IGNORECASE),
    ]

    def __init__(self, recent_window_size: int = 4) -> None:
        """
        Args:
            recent_window_size: Number of most recent turns to unconditionally preserve.
        """
        self.recent_window_size = max(1, recent_window_size)

    def is_security_finding(self, message: Dict[str, Any]) -> bool:
        """
        Deterministic check whether a message contains important security findings
        or critical security facts that must never be pruned.
        """
        # 1. Explicit metadata / structured flags
        meta = message.get("metadata", {})
        if isinstance(meta, dict):
            if meta.get("is_security_finding") or meta.get("is_finding") or meta.get("vulnerable"):
                return True
            if meta.get("severity") in ("CRITICAL", "HIGH", "MEDIUM"):
                return True

        if message.get("is_finding") or message.get("vulnerable"):
            return True

        # 2. Text inspection of content
        content = message.get("content", "")
        if isinstance(content, dict):
            content = str(content)
        elif not isinstance(content, str):
            content = str(content)

        for pattern in self.SECURITY_PATTERNS:
            if pattern.search(content):
                return True

        return False

    def compress(
        self,
        conversation: List[Dict[str, Any]],
    ) -> Tuple[List[Dict[str, Any]], int, int, float, List[str]]:
        """
        Compress conversation turns deterministically.

        Returns:
            Tuple of:
              - selected_context: List of compressed / preserved turns
              - original_token_count: Token count estimate before compression
              - compressed_token_count: Token count estimate after compression
              - reduction_percentage: Token reduction percentage (0.0 to 100.0)
              - preserved_items: List of labels describing what was preserved
        """
        if not conversation:
            return [], 0, 0, 0.0, []

        original_token_count = estimate_tokens(conversation)
        total_turns = len(conversation)

        # For very short conversations within the recency window, preserve everything
        if total_turns <= (self.recent_window_size + 1):
            compressed_token_count = original_token_count
            preserved_items = [f"all_{total_turns}_turns_preserved"]
            return list(conversation), original_token_count, compressed_token_count, 0.0, preserved_items

        preserved_indices: Set[int] = set()
        preserved_items: List[str] = []

        # 1. Always preserve System Prompt (if first message is system)
        if conversation[0].get("role") == "system":
            preserved_indices.add(0)
            preserved_items.append("system_prompt")

        # 2. Always preserve Current User Request (the final message)
        last_idx = total_turns - 1
        preserved_indices.add(last_idx)
        preserved_items.append("current_user_request")

        # 3. Always preserve Recent Conversation Turns (recency window)
        start_recent = max(0, total_turns - self.recent_window_size)
        for i in range(start_recent, total_turns):
            preserved_indices.add(i)
        preserved_items.append(f"recent_turns_window:{self.recent_window_size}")

        # 4. Always preserve Important Security Findings from older turns
        finding_count = 0
        for i in range(0, start_recent):
            if i in preserved_indices:
                continue
            if self.is_security_finding(conversation[i]):
                preserved_indices.add(i)
                finding_count += 1

        if finding_count > 0:
            preserved_items.append(f"security_findings_preserved:{finding_count}")

        # 5. Build selected context and calculate compressed turns
        compressed_turns_count = total_turns - len(preserved_indices)
        selected_context: List[Dict[str, Any]] = []

        # If older turns were compressed, insert a concise summary marker to inform the LLM
        summary_inserted = False
        for i, turn in enumerate(conversation):
            if i in preserved_indices:
                selected_context.append(turn)
            elif not summary_inserted and i < start_recent:
                # Add compact summary notification for compressed turns
                summary_msg = {
                    "role": "system",
                    "content": (
                        f"[Context Note: {compressed_turns_count} historical low-value turns "
                        f"compressed. All critical security findings and recent turns are preserved.]"
                    ),
                }
                selected_context.append(summary_msg)
                summary_inserted = True
                preserved_items.append(f"compressed_historical_turns:{compressed_turns_count}")

        compressed_token_count = estimate_tokens(selected_context)

        # Calculate reduction percentage
        if original_token_count > 0:
            reduction = ((original_token_count - compressed_token_count) / original_token_count) * 100.0
            reduction_percentage = max(0.0, round(reduction, 2))
        else:
            reduction_percentage = 0.0

        return (
            selected_context,
            original_token_count,
            compressed_token_count,
            reduction_percentage,
            preserved_items,
        )
