"""
ExecutionTracer implementation for the Glass Box observability layer.
Manages run lifecycles, event logging, parent-child event DAGs, and JSON export.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
import uuid

from .events import Event, EventStatus, EventType, Run


class RunId(str):
    """
    A string subclass representing a run ID.
    Provides string compatibility along with convenient attribute access
    (e.g., run_id.run_id or run_id.run).
    """
    _run: Optional[Run]

    def __new__(cls, value: str, run: Optional[Run] = None):
        instance = super().__new__(cls, value)
        instance._run = run
        return instance

    @property
    def run_id(self) -> str:
        return str(self)

    @property
    def run(self) -> Optional[Run]:
        return self._run


class ExecutionTracer:
    """
    Observability tracer for agent execution workflows.
    Records events with parent-child relationships for execution DAG reconstruction.
    """

    def __init__(self) -> None:
        self._runs: Dict[str, Run] = {}
        self._current_run_id: Optional[str] = None

    @property
    def current_run_id(self) -> Optional[str]:
        """Return the identifier of the currently active run, if any."""
        return self._current_run_id

    def start_run(
        self,
        run_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ) -> str:
        """
        Start a new execution run.

        Args:
            run_id: Optional unique run identifier. Auto-generated as UUID if omitted.
            metadata: Optional metadata dictionary associated with this run.
            **kwargs: Additional metadata key-value pairs.

        Returns:
            The run_id string.
        """
        if run_id is None:
            run_id = str(uuid.uuid4())

        combined_metadata = dict(metadata or {})
        if kwargs:
            combined_metadata.update(kwargs)

        run = Run(
            run_id=run_id,
            status="RUNNING",
            start_time=datetime.now(timezone.utc).isoformat(),
            metadata=combined_metadata,
        )

        self._runs[run_id] = run
        self._current_run_id = run_id
        return RunId(run_id, run=run)

    def log_event(
        self,
        event_type: Union[EventType, str, Event],
        run_id: Optional[str] = None,
        parent_event_id: Optional[Union[str, Event]] = None,
        input: Any = None,
        output: Any = None,
        status: Union[EventStatus, str] = EventStatus.SUCCESS.value,
        duration_ms: Optional[float] = None,
        metadata: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None,
        event_id: Optional[str] = None,
        timestamp: Optional[str] = None,
        **kwargs: Any,
    ) -> Event:
        """
        Log an execution event with parent-child DAG linking.

        Args:
            event_type: Type of event (EventType or string), or an existing Event instance.
            run_id: Run ID to associate event with. Defaults to current active run.
            parent_event_id: ID of the parent event or parent Event instance.
            input: Input data or payload for this execution step.
            output: Output data or response for this execution step.
            status: Execution status (e.g. "SUCCESS", "FAILURE", etc.).
            duration_ms: Execution duration in milliseconds.
            metadata: Additional metadata dictionary.
            error: Error message string if a failure occurred.
            event_id: Optional custom event ID. Auto-generated if omitted.
            timestamp: Optional ISO 8601 timestamp. Defaults to UTC now.
            **kwargs: Additional metadata parameters.

        Returns:
            The created and logged Event instance.
        """
        # If an Event object is passed directly as event_type
        if isinstance(event_type, Event):
            event = event_type
            target_run_id = run_id or event.run_id or self._current_run_id
            if target_run_id is None:
                target_run_id = self.start_run()
            if target_run_id not in self._runs:
                self._runs[target_run_id] = Run(run_id=target_run_id)
            self._runs[target_run_id].add_event(event)
            return event

        # Handle positional swap where run_id was passed first, e.g. log_event("run-123", EventType.USER_QUERY)
        if isinstance(event_type, str) and (
            event_type in self._runs
            or (isinstance(run_id, (EventType, str)) and str(run_id) in EventType.__members__)
        ):
            target_run_id = event_type
            event_type = run_id
        else:
            target_run_id = run_id or self._current_run_id

        if target_run_id is None:
            # Auto-start run if none exists
            target_run_id = self.start_run()

        if target_run_id not in self._runs:
            self._runs[target_run_id] = Run(run_id=target_run_id)

        target_run = self._runs[target_run_id]

        # Resolve parent_event_id if passed as an Event instance
        resolved_parent_id: Optional[str]
        if isinstance(parent_event_id, Event):
            resolved_parent_id = parent_event_id.event_id
        elif parent_event_id is not None:
            resolved_parent_id = str(parent_event_id)
        else:
            resolved_parent_id = None

        resolved_event_id = event_id or str(uuid.uuid4())
        resolved_timestamp = timestamp or datetime.now(timezone.utc).isoformat()

        combined_metadata = dict(metadata or {})
        if kwargs:
            combined_metadata.update(kwargs)

        event = Event(
            run_id=target_run_id,
            event_id=resolved_event_id,
            parent_event_id=resolved_parent_id,
            timestamp=resolved_timestamp,
            event_type=event_type,
            input=input,
            output=output,
            status=status,
            duration_ms=duration_ms,
            metadata=combined_metadata,
            error=error,
        )

        target_run.add_event(event)
        return event

    def end_run(
        self,
        run_id: Optional[str] = None,
        status: str = "COMPLETED",
        error: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ) -> Run:
        """
        End an execution run.

        Args:
            run_id: The run ID to end. Defaults to current active run.
            status: Final status ("COMPLETED", "FAILED", etc.).
            error: Optional error message if the run failed.
            metadata: Optional additional metadata to append.
            **kwargs: Extra metadata fields.

        Returns:
            The completed Run instance.
        """
        target_run_id = run_id or self._current_run_id
        if target_run_id is None or target_run_id not in self._runs:
            raise ValueError(f"Run ID '{target_run_id}' not found.")

        run = self._runs[target_run_id]
        run.status = status
        run.end_time = datetime.now(timezone.utc).isoformat()
        if error is not None:
            run.error = error

        if metadata:
            run.metadata.update(metadata)
        if kwargs:
            run.metadata.update(kwargs)

        return run

    def get_run(self, run_id: Optional[str] = None) -> Optional[Run]:
        """
        Retrieve a run by its ID or the current active run if omitted.
        """
        target_run_id = run_id or self._current_run_id
        if target_run_id is None:
            return None
        return self._runs.get(target_run_id)

    def get_events(self, run_id: Optional[str] = None) -> List[Event]:
        """
        Retrieve all events for a run.
        """
        run = self.get_run(run_id)
        if run is None:
            return []
        return list(run.events)

    def get_event(self, event_id: str, run_id: Optional[str] = None) -> Optional[Event]:
        """
        Retrieve a specific event by ID within a run (or across all runs).
        """
        if run_id:
            run = self.get_run(run_id)
            return run.get_event(event_id) if run else None

        # Search across all runs
        for run in self._runs.values():
            event = run.get_event(event_id)
            if event is not None:
                return event
        return None

    def get_dag(self, run_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Get the DAG representation of a run (nodes, edges, adjacency list).
        """
        run = self.get_run(run_id)
        if run is None:
            raise ValueError(f"Run ID '{run_id or self._current_run_id}' not found.")
        return run.to_dag()

    def export_json(
        self,
        run_id: Optional[str] = None,
        file_path: Optional[Union[str, Path]] = None,
        indent: int = 2,
    ) -> str:
        """
        Export trace run(s) and their events to JSON.

        Args:
            run_id: Run ID to export. If None, exports current or all runs.
            file_path: Optional path to write JSON output to.
            indent: Indentation for formatted JSON output.

        Returns:
            JSON string representation.
        """
        if run_id is not None:
            run = self.get_run(run_id)
            if run is None:
                raise ValueError(f"Run ID '{run_id}' not found.")
            data = run.to_dict()
        elif self._current_run_id and self._current_run_id in self._runs:
            data = self._runs[self._current_run_id].to_dict()
        elif len(self._runs) == 1:
            data = list(self._runs.values())[0].to_dict()
        else:
            data = {rid: r.to_dict() for rid, r in self._runs.items()}

        json_str = json.dumps(data, indent=indent, default=str)

        if file_path:
            p = Path(file_path)
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(json_str, encoding="utf-8")

        return json_str

    def clear(self) -> None:
        """Reset all runs and active state."""
        self._runs.clear()
        self._current_run_id = None
