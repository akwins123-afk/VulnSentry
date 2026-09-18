"""
Events and Run data structures for the Glass Box observability layer.
Defines supported event types and ensures every event contains all 11 required fields
with parent-child relationship tracking for execution DAG reconstruction.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Union
import uuid


class EventType(str, Enum):
    """Supported event types for VulnSentry execution tracing."""
    USER_QUERY = "USER_QUERY"
    CONTEXT_SELECTED = "CONTEXT_SELECTED"
    LLM_CALL = "LLM_CALL"
    TOOL_SELECTION = "TOOL_SELECTION"
    TOOL_VALIDATION = "TOOL_VALIDATION"
    TOOL_CALL = "TOOL_CALL"
    TOOL_RESULT = "TOOL_RESULT"
    FAILURE_DETECTED = "FAILURE_DETECTED"
    RECOVERY = "RECOVERY"
    FINAL_RESPONSE = "FINAL_RESPONSE"


class EventStatus(str, Enum):
    """Standard statuses for execution events."""
    SUCCESS = "SUCCESS"
    FAILURE = "FAILURE"
    RUNNING = "RUNNING"
    PENDING = "PENDING"
    ERROR = "ERROR"


REQUIRED_EVENT_FIELDS = [
    "run_id",
    "event_id",
    "parent_event_id",
    "timestamp",
    "event_type",
    "input",
    "output",
    "status",
    "duration_ms",
    "metadata",
    "error",
]


@dataclass
class Event:
    """
    Represents a single execution event within a trace run.
    Contains all 11 required fields and supports parent-child linking for DAG representation.
    """
    run_id: str
    event_id: str
    parent_event_id: Optional[str]
    timestamp: str
    event_type: str
    input: Any = None
    output: Any = None
    status: str = EventStatus.SUCCESS.value
    duration_ms: Optional[float] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None

    def __post_init__(self) -> None:
        if isinstance(self.event_type, Enum):
            self.event_type = self.event_type.value
        else:
            self.event_type = str(self.event_type)

        if isinstance(self.status, Enum):
            self.status = self.status.value
        else:
            self.status = str(self.status)

        if self.metadata is None:
            self.metadata = {}

    def to_dict(self) -> Dict[str, Any]:
        """Serialize event to a dictionary containing all 11 required fields."""
        return {
            "run_id": self.run_id,
            "event_id": self.event_id,
            "parent_event_id": self.parent_event_id,
            "timestamp": self.timestamp,
            "event_type": self.event_type,
            "input": self.input,
            "output": self.output,
            "status": self.status,
            "duration_ms": self.duration_ms,
            "metadata": self.metadata,
            "error": self.error,
        }

    def __getitem__(self, key: str) -> Any:
        try:
            return getattr(self, key)
        except AttributeError:
            raise KeyError(f"Event has no attribute '{key}'")

    def get(self, key: str, default: Any = None) -> Any:
        return getattr(self, key, default)

    def __contains__(self, key: str) -> bool:
        return hasattr(self, key)


@dataclass
class Run:
    """
    Represents a complete execution trace containing multiple linked events.
    Provides DAG utilities to query parent-child relationships, roots, and DAG topology.
    """
    run_id: str
    status: str = "RUNNING"
    start_time: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    end_time: Optional[str] = None
    events: List[Event] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None

    def __post_init__(self) -> None:
        if self.metadata is None:
            self.metadata = {}

    def add_event(self, event: Event) -> None:
        """Add an event to this run."""
        self.events.append(event)

    def get_event(self, event_id: str) -> Optional[Event]:
        """Retrieve an event by its ID."""
        for e in self.events:
            if e.event_id == event_id:
                return e
        return None

    def get_children(self, event_id: str) -> List[Event]:
        """Return all direct child events of the specified event_id."""
        return [e for e in self.events if e.parent_event_id == event_id]

    def get_parent(self, event_id: str) -> Optional[Event]:
        """Return the parent event of the specified event_id, if any."""
        event = self.get_event(event_id)
        if event and event.parent_event_id:
            return self.get_event(event.parent_event_id)
        return None

    def get_root_events(self) -> List[Event]:
        """Return all root events that have no parent (parent_event_id is None)."""
        return [e for e in self.events if e.parent_event_id is None]

    def to_dag(self) -> Dict[str, Any]:
        """
        Represent the run events as a Directed Acyclic Graph (DAG).
        Returns nodes, edges (parent -> child), and an adjacency list.
        """
        nodes = [event.to_dict() for event in self.events]
        edges = []
        adjacency_list: Dict[str, List[str]] = {e.event_id: [] for e in self.events}

        for event in self.events:
            if event.parent_event_id:
                edges.append({
                    "source": event.parent_event_id,
                    "target": event.event_id,
                })
                if event.parent_event_id in adjacency_list:
                    adjacency_list[event.parent_event_id].append(event.event_id)

        return {
            "run_id": self.run_id,
            "nodes": nodes,
            "edges": edges,
            "adjacency_list": adjacency_list,
            "root_event_ids": [e.event_id for e in self.get_root_events()],
        }

    def to_dict(self) -> Dict[str, Any]:
        """Serialize run, its events, and DAG structure to a dictionary."""
        return {
            "run_id": self.run_id,
            "status": self.status,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "metadata": self.metadata,
            "events": [e.to_dict() for e in self.events],
            "error": self.error,
            "dag": self.to_dag(),
        }

    def __getitem__(self, key: str) -> Any:
        try:
            return getattr(self, key)
        except AttributeError:
            raise KeyError(f"Run has no attribute '{key}'")

    def get(self, key: str, default: Any = None) -> Any:
        return getattr(self, key, default)

    def __contains__(self, key: str) -> bool:
        return hasattr(self, key)
