"use client";

import React, { useState, useMemo } from "react";
import { TraceEvent } from "@/lib/trace";

interface ExecutionTraceProps {
  events: TraceEvent[];
  selectedEventId: string | null;
  onSelectEvent: (event: TraceEvent) => void;
}

type FilterType = "All" | "LLM" | "Tools" | "Context" | "Failures" | "Recovery";

export default function ExecutionTrace({
  events,
  selectedEventId,
  onSelectEvent,
}: ExecutionTraceProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Filtering & Search
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      // 1. Category Filter
      if (activeFilter === "LLM" && ev.event_type !== "LLM_CALL") return false;
      if (activeFilter === "Tools" && !["TOOL_SELECTION", "TOOL_VALIDATION", "TOOL_CALL", "TOOL_RESULT"].includes(ev.event_type)) return false;
      if (activeFilter === "Context" && ev.event_type !== "CONTEXT_SELECTED") return false;
      if (activeFilter === "Failures" && ev.status !== "FAILURE" && ev.status !== "ERROR" && ev.event_type !== "FAILURE_DETECTED") return false;
      if (activeFilter === "Recovery" && ev.event_type !== "RECOVERY") return false;

      // 2. Text Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const typeMatch = ev.event_type.toLowerCase().includes(query);
        const errorMatch = (ev.error || "").toLowerCase().includes(query);
        const toolMatch = (ev.tool_name || "").toLowerCase().includes(query);
        const inputMatch = JSON.stringify(ev.input || {}).toLowerCase().includes(query);
        const outputMatch = JSON.stringify(ev.output || {}).toLowerCase().includes(query);
        return typeMatch || errorMatch || toolMatch || inputMatch || outputMatch;
      }

      return true;
    });
  }, [events, activeFilter, searchQuery]);

  // Visual metadata per event type
  const getEventBadge = (event: TraceEvent) => {
    const isFail = event.status === "FAILURE" || event.event_type === "FAILURE_DETECTED";

    if (isFail) {
      return {
        label: event.event_type === "FAILURE_DETECTED" ? "!!! FAILURE DETECTED" : event.event_type,
        color: "text-rose-400 bg-rose-950/80 border-rose-600",
        dotColor: "bg-rose-500 ring-4 ring-rose-500/20",
        isAlert: true,
      };
    }

    switch (event.event_type) {
      case "USER_QUERY":
        return {
          label: "USER QUERY",
          color: "text-cyan-300 bg-cyan-950/60 border-cyan-800",
          dotColor: "bg-cyan-400",
          isAlert: false,
        };
      case "CONTEXT_SELECTED":
        return {
          label: "CONTEXT SELECTED",
          color: "text-purple-300 bg-purple-950/60 border-purple-800",
          dotColor: "bg-purple-400",
          isAlert: false,
        };
      case "LLM_CALL":
        return {
          label: "LLM CALL",
          color: "text-indigo-300 bg-indigo-950/60 border-indigo-800",
          dotColor: "bg-indigo-400",
          isAlert: false,
        };
      case "TOOL_SELECTION":
        return {
          label: "TOOL SELECTION",
          color: "text-blue-300 bg-blue-950/60 border-blue-800",
          dotColor: "bg-blue-400",
          isAlert: false,
        };
      case "TOOL_VALIDATION":
        return {
          label: "TOOL VALIDATION",
          color: "text-amber-300 bg-amber-950/60 border-amber-800",
          dotColor: "bg-amber-400",
          isAlert: false,
        };
      case "RECOVERY":
        return {
          label: "RECOVERY",
          color: "text-emerald-300 bg-emerald-950/60 border-emerald-800",
          dotColor: "bg-emerald-400 ring-4 ring-emerald-500/20",
          isAlert: false,
        };
      case "TOOL_CALL":
        return {
          label: "TOOL CALL",
          color: "text-sky-300 bg-sky-950/60 border-sky-800",
          dotColor: "bg-sky-400",
          isAlert: false,
        };
      case "TOOL_RESULT":
        return {
          label: "TOOL RESULT",
          color: "text-teal-300 bg-teal-950/60 border-teal-800",
          dotColor: "bg-teal-400",
          isAlert: false,
        };
      case "FINAL_RESPONSE":
        return {
          label: "FINAL RESPONSE",
          color: "text-rose-200 bg-rose-950/90 border-rose-700 font-bold",
          dotColor: "bg-rose-400",
          isAlert: false,
        };
      default:
        return {
          label: event.event_type,
          color: "text-slate-300 bg-slate-900 border-slate-700",
          dotColor: "bg-slate-400",
          isAlert: false,
        };
    }
  };

  // Brief preview snippet
  const getEventSnippet = (ev: TraceEvent): string => {
    if (ev.error) return `Error: ${ev.error}`;
    if (ev.event_type === "TOOL_SELECTION" || ev.event_type === "TOOL_CALL") {
      const tool = ev.tool_name || ev.input?.tool || "tool";
      return `Tool: ${tool}`;
    }
    if (ev.event_type === "LLM_CALL") {
      const thought = ev.output?.thought;
      if (thought) return `Thought: ${thought.slice(0, 75)}...`;
      return "Agent security reasoning execution";
    }
    if (ev.event_type === "FINAL_RESPONSE") {
      return `Report: ${ev.output?.title || "Security Finding"}`;
    }
    if (ev.event_type === "RECOVERY") {
      return `Recovered to: ${ev.input?.recovered_tool || "run_sql_injection_scan"}`;
    }
    if (ev.event_type === "TOOL_RESULT") {
      return ev.output?.vulnerable ? `Vulnerable: ${ev.output?.vuln_type || "CWE-89"}` : "Clean result";
    }
    return "";
  };

  const filters: FilterType[] = ["All", "LLM", "Tools", "Context", "Failures", "Recovery"];

  return (
    <div className="bg-[#0e1424] border border-slate-800 rounded-lg p-4 shadow-xl flex flex-col h-full">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-800">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
            EXECUTION TRACE
          </h2>
          <span className="text-[11px] text-slate-500 font-sans block mt-0.5">
            Click any event to inspect full telemetry in the detail panel
          </span>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 self-start sm:self-auto">
          {filteredEvents.length} of {events.length} Events
        </span>
      </div>

      {/* Controls: Filter Tabs & Search Bar */}
      <div className="space-y-2 mb-3">
        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2 text-slate-500 hover:text-slate-300 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-1">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-2 py-0.5 text-[11px] font-mono rounded transition-colors ${
                activeFilter === f
                  ? "bg-indigo-600 text-white font-semibold"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Vertical Timeline */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-0.5">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs font-mono">
            No events match the current filter or search query.
          </div>
        ) : (
          filteredEvents.map((event, index) => {
            const badge = getEventBadge(event);
            const isSelected = selectedEventId === event.event_id;
            const snippet = getEventSnippet(event);
            const isLast = index === filteredEvents.length - 1;

            return (
              <div key={event.event_id} className="relative pl-6 pb-2.5 group">
                {/* Connecting Timeline Line */}
                {!isLast && (
                  <div className="absolute left-[7px] top-3 bottom-0 w-[2px] bg-slate-800 group-hover:bg-slate-700 transition-colors"></div>
                )}

                {/* Timeline Dot Indicator */}
                <div
                  className={`absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full ${badge.dotColor} transition-transform ${
                    isSelected ? "scale-125 ring-2 ring-white" : ""
                  }`}
                ></div>

                {/* Clickable Event Card */}
                <button
                  onClick={() => onSelectEvent(event)}
                  className={`w-full text-left rounded p-2.5 border transition-all ${
                    isSelected
                      ? "bg-slate-800/90 border-indigo-400 shadow-md ring-1 ring-indigo-400"
                      : "bg-[#0b101b] border-slate-800/80 hover:bg-slate-900/90 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className="text-[10px] font-mono text-slate-500 shrink-0">
                        #{event.display_index}
                      </span>
                      <span
                        className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded border ${badge.color} truncate`}
                      >
                        {badge.label}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {event.duration_ms !== null && (
                        <span className="text-[10px] font-mono text-slate-500">
                          {event.duration_ms.toFixed(1)}ms
                        </span>
                      )}
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                          event.status === "FAILURE"
                            ? "bg-rose-950 text-rose-300 border border-rose-800"
                            : "bg-emerald-950 text-emerald-400 border border-emerald-800"
                        }`}
                      >
                        {event.status}
                      </span>
                    </div>
                  </div>

                  {/* Summary Snippet */}
                  {snippet && (
                    <p className="text-[11px] text-slate-400 font-mono truncate pl-0.5">
                      {snippet}
                    </p>
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
