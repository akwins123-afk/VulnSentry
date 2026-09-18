"""
ContextManager implementation for VulnSentry.
Prevents sending oversized raw conversation logs to LLMs by intelligently
selecting and compressing turns while preserving critical security findings,
current user intent, and recent context.
Integrates with ExecutionTracer to record CONTEXT_SELECTED events.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Union

from glassbox.events import Event, EventStatus, EventType
from glassbox.tracer import ExecutionTracer
from .context_compressor import ContextCompressor, estimate_tokens


class ContextManager:
    """
    Manages conversational context for security audit agent workflows.
    Ensures optimal context window utilization by pruning low-value conversational turns
    and guaranteeing preservation of critical security vulnerabilities and recent history.
    """

    DEFAULT_SELECTION_STRATEGY = "security_aware_recency"

    def __init__(
        self,
        tracer: Optional[ExecutionTracer] = None,
        compressor: Optional[ContextCompressor] = None,
        recent_window_size: int = 4,
        selection_strategy: str = DEFAULT_SELECTION_STRATEGY,
        default_run_id: Optional[str] = None,
    ) -> None:
        """
        Args:
            tracer: Optional ExecutionTracer instance for DAG event logging.
            compressor: Optional custom ContextCompressor.
            recent_window_size: Number of recent turns to preserve verbatim.
            selection_strategy: Identifier string describing the selection strategy.
            default_run_id: Optional default run ID to associate events with.
        """
        self.tracer = tracer
        self.compressor = compressor or ContextCompressor(recent_window_size=recent_window_size)
        self.selection_strategy = selection_strategy
        self.default_run_id = default_run_id
        self._last_event: Optional[Event] = None

    @property
    def last_event(self) -> Optional[Event]:
        """Return the most recently logged trace event in this context manager."""
        return self._last_event

    def process_context(
        self,
        conversation: List[Dict[str, Any]],
        run_id: Optional[str] = None,
        parent_event_id: Optional[Union[str, Event]] = None,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """
        Process a multi-turn conversation, compress non-essential history,
        preserve vital security findings, and log CONTEXT_SELECTED to ExecutionTracer.

        Args:
            conversation: List of message dictionaries (e.g. [{'role': '...', 'content': '...'}]).
            run_id: Optional trace run ID. Defaults to current active run.
            parent_event_id: Optional parent event or ID for execution DAG linking.
            **kwargs: Extra metadata passed to event logging.

        Returns:
            Dictionary containing:
              - selected_context: List of compressed/selected conversation turns
              - original_token_count: Estimated token count before compression
              - compressed_token_count: Estimated token count after compression
              - reduction_percentage: Percentage of tokens reduced
              - preserved_items: List of preserved item categories
        """
        # Step 1: Compress conversation deterministically
        (
            selected_context,
            orig_tokens,
            comp_tokens,
            reduction_pct,
            preserved_items,
        ) = self.compressor.compress(conversation)

        result: Dict[str, Any] = {
            "selected_context": selected_context,
            "original_token_count": orig_tokens,
            "compressed_token_count": comp_tokens,
            "reduction_percentage": reduction_pct,
            "preserved_items": preserved_items,
        }

        # Step 2: Log CONTEXT_SELECTED if ExecutionTracer configured
        if self.tracer is not None:
            target_run_id = run_id or self.default_run_id or self.tracer.current_run_id
            if target_run_id is None:
                target_run_id = self.tracer.start_run()

            resolved_parent_id: Optional[str] = None
            if isinstance(parent_event_id, Event):
                resolved_parent_id = parent_event_id.event_id
            elif parent_event_id is not None:
                resolved_parent_id = str(parent_event_id)

            metadata: Dict[str, Any] = {
                "original_token_count": orig_tokens,
                "compressed_token_count": comp_tokens,
                "reduction_percentage": reduction_pct,
                "selection_strategy": self.selection_strategy,
                "preserved_items": preserved_items,
            }
            if kwargs:
                metadata.update(kwargs)

            event = self.tracer.log_event(
                event_type=EventType.CONTEXT_SELECTED,
                run_id=target_run_id,
                parent_event_id=resolved_parent_id,
                input={
                    "total_turns": len(conversation),
                    "original_token_count": orig_tokens,
                },
                output={
                    "selected_turns": len(selected_context),
                    "compressed_token_count": comp_tokens,
                    "reduction_percentage": reduction_pct,
                    "selection_strategy": self.selection_strategy,
                },
                status=EventStatus.SUCCESS.value,
                metadata=metadata,
            )
            self._last_event = event

        return result
