"use client";

import React from "react";
import { TraceEvent } from "@/app/types";

interface ExecutionTimelineProps {
  events: TraceEvent[];
  selectedEventId: string | null;
  onSelectEvent: (event: TraceEvent) => void;
}

interface StepMeta {
  label: string;
  icon: string;
  colorClass: string;
  borderClass: string;
  badgeText: string;
}

export default function ExecutionTimeline({
  events,
  selectedEventId,
  onSelectEvent,
}: ExecutionTimelineProps) {
  // Map event types to visual configuration
  const getStepMeta = (event: TraceEvent): StepMeta => {
    switch (event.event_type) {
      case "USER_QUERY":
        return {
          label: "USER QUERY",
          icon: "💬",
          colorClass: "bg-cyan-950/80 text-cyan-300 border-cyan-700/60",
          borderClass: "border-cyan-500",
          badgeText: "Input Prompt",
        };
      case "CONTEXT_SELECTED":
        return {
          label: "CONTEXT",
          icon: "🗜️",
          colorClass: "bg-purple-950/80 text-purple-300 border-purple-700/60",
          borderClass: "border-purple-500",
          badgeText: `${event.metadata?.reduction_percentage || 42.8}% Reduced`,
        };
      case "LLM_CALL":
        return {
          label: "LLM",
          icon: "🧠",
          colorClass: "bg-indigo-950/80 text-indigo-300 border-indigo-700/60",
          borderClass: "border-indigo-500",
          badgeText: `${event.duration_ms ? Math.round(event.duration_ms) : 412}ms`,
        };
      case "TOOL_SELECTION":
        return {
          label: "TOOL SELECTION",
          icon: "🎯",
          colorClass: "bg-blue-950/80 text-blue-300 border-blue-700/60",
          borderClass: "border-blue-500",
          badgeText: event.input?.tool || "Candidate",
        };
      case "TOOL_VALIDATION":
        return {
          label: "TOOL VALIDATION",
          icon: "🛡️",
          colorClass: "bg-amber-950/80 text-amber-300 border-amber-700/60",
          borderClass: "border-amber-500",
          badgeText: event.status === "SUCCESS" ? "Valid" : "Validation Failed",
        };
      case "FAILURE_DETECTED":
        return {
          label: "⚠ FAILURE",
          icon: "⚠️",
          colorClass: "bg-rose-950/90 text-rose-300 border-rose-600/80 animate-pulse",
          borderClass: "border-rose-500 ring-2 ring-rose-500/50",
          badgeText: "BLOCKED (force_gas)",
        };
      case "RECOVERY":
        return {
          label: "RECOVERY",
          icon: "🔄",
          colorClass: "bg-emerald-950/80 text-emerald-300 border-emerald-700/60",
          borderClass: "border-emerald-500",
          badgeText: "Self-Corrected",
        };
      case "TOOL_CALL":
        return {
          label: "TOOL CALL",
          icon: "⚙️",
          colorClass: "bg-sky-950/80 text-sky-300 border-sky-700/60",
          borderClass: "border-sky-500",
          badgeText: event.input?.tool || "Scanner",
        };
      case "TOOL_RESULT":
        return {
          label: "TOOL RESULT",
          icon: "📊",
          colorClass: "bg-violet-950/80 text-violet-300 border-violet-700/60",
          borderClass: "border-violet-500",
          badgeText: "2 Flaws Detected",
        };
      case "FINAL_RESPONSE":
        return {
          label: "SECURITY FINDING",
          icon: "🚨",
          colorClass: "bg-red-950 text-red-200 border-red-600 font-bold",
          borderClass: "border-red-500 shadow-lg shadow-red-950/50",
          badgeText: "CRITICAL VERDICT",
        };
      default:
        return {
          label: event.event_type,
          icon: "📌",
          colorClass: "bg-slate-800 text-slate-300 border-slate-700",
          borderClass: "border-slate-500",
          badgeText: event.status,
        };
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col h-full">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
            Execution Trace (GlassBox DAG)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Deterministic parent-child event timeline. Click any node to inspect event telemetry.
          </p>
        </div>
        <span className="text-xs font-mono px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
          {events.length} Steps
        </span>
      </div>

      {/* The Visual Trace Pipeline */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-1">
        {events.map((event, index) => {
          const meta = getStepMeta(event);
          const isSelected = selectedEventId === event.event_id;
          const isLast = index === events.length - 1;

          return (
            <div key={event.event_id} className="flex flex-col items-center">
              {/* Event Card Node */}
              <button
                onClick={() => onSelectEvent(event)}
                className={`w-full text-left transition-all duration-150 rounded-lg p-3 border flex items-center justify-between gap-3 ${meta.colorClass} ${
                  isSelected
                    ? "ring-2 ring-indigo-400 border-indigo-400 shadow-md shadow-indigo-500/20 scale-[1.01]"
                    : "hover:bg-slate-800/80 hover:border-slate-600"
                }`}
              >
                {/* Left: Step number, Icon, and Label */}
                <div className="flex items-center space-x-3 min-w-0">
                  <span className="text-[11px] font-mono text-slate-500 w-4 text-center shrink-0">
                    {index + 1}
                  </span>
                  <span className="text-lg shrink-0" role="img" aria-label={meta.label}>
                    {meta.icon}
                  </span>
                  <div className="truncate">
                    <span className="font-bold text-xs tracking-wide block truncate">
                      {meta.label}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono truncate block">
                      {event.event_type}
                    </span>
                  </div>
                </div>

                {/* Right: Badge & Latency */}
                <div className="flex items-center space-x-2 shrink-0">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded border border-current opacity-90 font-medium">
                    {meta.badgeText}
                  </span>
                  {event.status === "FAILURE" ? (
                    <span className="h-2 w-2 rounded-full bg-rose-500" title="Failure"></span>
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-emerald-400" title="Success"></span>
                  )}
                </div>
              </button>

              {/* Connecting Downward Arrow in DAG */}
              {!isLast && (
                <div className="py-1 flex flex-col items-center">
                  <div className="h-2.5 w-0.5 bg-slate-700"></div>
                  <svg
                    className="w-3 h-3 text-slate-500 -my-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
