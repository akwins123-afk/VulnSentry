"use client";

import React, { useState } from "react";
import { TraceEvent } from "@/lib/trace";

interface EventDetailDrawerProps {
  event: TraceEvent | null;
  onClose?: () => void;
}

export default function EventDetailDrawer({ event, onClose }: EventDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "input" | "output" | "raw">("overview");
  const [copied, setCopied] = useState(false);

  if (!event) {
    return (
      <div className="bg-[#0e1424] border border-slate-800 rounded-lg p-6 flex flex-col items-center justify-center text-center text-slate-500 h-full min-h-[300px]">
        <svg className="w-8 h-8 mb-2 opacity-40 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>
        <p className="text-xs font-mono text-slate-400">Select any event from the timeline to inspect full telemetry</p>
        <span className="text-[10px] text-slate-600 mt-1">Examines all 11 fields, schema validation errors, and raw JSON payloads</span>
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(event, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isFailure = event.status === "FAILURE" || event.event_type === "FAILURE_DETECTED";
  const isRecovery = event.event_type === "RECOVERY";

  return (
    <div className="bg-[#0e1424] border border-slate-800 rounded-lg p-4 shadow-xl flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800">
        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono text-slate-500 font-bold">
              #{event.display_index}
            </span>
            <span className="font-bold text-xs text-white font-mono tracking-tight">
              {event.event_type}
            </span>
            <span
              className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded uppercase tracking-wider ${
                isFailure
                  ? "bg-rose-950 text-rose-300 border border-rose-800"
                  : isRecovery
                  ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                  : "bg-slate-900 text-slate-300 border border-slate-800"
              }`}
            >
              {event.status}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono truncate block mt-0.5" title={event.event_id}>
            Event ID: {event.event_id}
          </span>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleCopy}
            className="px-2.5 py-1 text-[11px] font-mono rounded bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors border border-slate-700 flex items-center space-x-1"
          >
            <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>{copied ? "Copied" : "Copy JSON"}</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-300 p-1 text-xs"
              title="Close panel"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Failure Callout Banner if error is present */}
      {(event.error || event.invalid_parameter) && (
        <div className="bg-rose-950/40 border border-rose-700/80 rounded p-2.5 mb-3 text-xs font-mono space-y-1">
          <div className="flex items-center space-x-1.5 text-rose-300 font-bold">
            <span>⚠</span>
            <span className="uppercase tracking-wider">Guardrail Interception Alert</span>
          </div>
          {event.error && (
            <div className="text-rose-200 text-[11px] leading-tight">
              <span className="text-rose-400 font-semibold">Error: </span>
              {event.error}
            </div>
          )}
          {event.invalid_parameter && (
            <div className="text-[11px]">
              <span className="text-rose-400 font-semibold">Blocked Argument: </span>
              <span className="text-white bg-rose-950 px-1 py-0.5 rounded border border-rose-800 font-bold">
                {event.invalid_parameter}
              </span>
            </div>
          )}
          {event.expected_parameter && (
            <div className="text-[11px]">
              <span className="text-slate-400 font-semibold">Expected Schema: </span>
              <span className="text-indigo-300 font-mono">
                {event.expected_parameter}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Recovery Banner if recovery step */}
      {isRecovery && (
        <div className="bg-emerald-950/40 border border-emerald-700/80 rounded p-2.5 mb-3 text-xs font-mono">
          <div className="flex items-center space-x-1.5 text-emerald-300 font-bold mb-0.5">
            <span>✓</span>
            <span className="uppercase tracking-wider">Autonomous Agent Self-Recovery</span>
          </div>
          <p className="text-emerald-200/90 text-[11px]">
            Agent intercepted the validation failure, sanitized arguments to match tool schema, and successfully resumed execution.
          </p>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex space-x-1 border-b border-slate-800 mb-3 text-xs font-mono">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-1.5 px-2 border-b-2 font-medium transition-colors ${
            activeTab === "overview"
              ? "border-indigo-500 text-indigo-400 font-bold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Overview (11 Fields)
        </button>
        <button
          onClick={() => setActiveTab("input")}
          className={`pb-1.5 px-2 border-b-2 font-medium transition-colors ${
            activeTab === "input"
              ? "border-indigo-500 text-indigo-400 font-bold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Input Payload
        </button>
        <button
          onClick={() => setActiveTab("output")}
          className={`pb-1.5 px-2 border-b-2 font-medium transition-colors ${
            activeTab === "output"
              ? "border-indigo-500 text-indigo-400 font-bold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Output / Result
        </button>
        <button
          onClick={() => setActiveTab("raw")}
          className={`pb-1.5 px-2 border-b-2 font-medium transition-colors ${
            activeTab === "raw"
              ? "border-indigo-500 text-indigo-400 font-bold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Raw JSON
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto text-xs font-mono space-y-2 max-h-[420px] pr-1">
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
            {/* 1. run_id */}
            <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">1. run_id</span>
              <span className="text-slate-200 text-[11px] break-all">{event.run_id}</span>
            </div>

            {/* 2. event_id */}
            <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">2. event_id</span>
              <span className="text-slate-200 text-[11px] break-all">{event.event_id}</span>
            </div>

            {/* 3. parent_event_id */}
            <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">3. parent_event_id</span>
              <span className="text-slate-300 text-[11px] break-all">
                {event.parent_event_id || "None (DAG Root)"}
              </span>
            </div>

            {/* 4. timestamp */}
            <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">4. timestamp</span>
              <span className="text-slate-200 text-[11px]">{event.timestamp || "N/A"}</span>
            </div>

            {/* 5. event_type */}
            <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">5. event_type</span>
              <span className="text-indigo-300 font-bold text-[11px]">{event.event_type}</span>
            </div>

            {/* 6. status */}
            <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">6. status</span>
              <span className={`text-[11px] font-bold ${isFailure ? "text-rose-400" : "text-emerald-400"}`}>
                {event.status}
              </span>
            </div>

            {/* 7. duration_ms */}
            <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">7. duration_ms</span>
              <span className="text-slate-200 text-[11px]">
                {event.duration_ms !== null ? `${event.duration_ms.toFixed(2)} ms` : "N/A"}
              </span>
            </div>

            {/* 8. tool_name */}
            <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">8. tool_name</span>
              <span className="text-slate-200 text-[11px]">
                {event.tool_name || "N/A"}
              </span>
            </div>

            {/* 9. error */}
            <div className="col-span-full bg-slate-950 p-2 rounded border border-slate-800/80">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">9. error</span>
              <span className={`text-[11px] ${event.error ? "text-rose-300 font-semibold" : "text-slate-500"}`}>
                {event.error || "None"}
              </span>
            </div>

            {/* 10 & 11. metadata */}
            <div className="col-span-full bg-slate-950 p-2 rounded border border-slate-800/80">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
                10 & 11. metadata & telemetry
              </span>
              <pre className="text-slate-300 whitespace-pre-wrap text-[11px] overflow-x-auto">
                {Object.keys(event.metadata || {}).length > 0
                  ? JSON.stringify(event.metadata, null, 2)
                  : "No metadata attached"}
              </pre>
            </div>
          </div>
        )}

        {activeTab === "input" && (
          <div className="bg-slate-950 p-3 rounded border border-slate-800 h-full overflow-y-auto">
            <pre className="text-cyan-300 whitespace-pre-wrap text-[11px]">
              {event.input !== null && event.input !== undefined
                ? JSON.stringify(event.input, null, 2)
                : "null"}
            </pre>
          </div>
        )}

        {activeTab === "output" && (
          <div className="bg-slate-950 p-3 rounded border border-slate-800 h-full overflow-y-auto">
            <pre className="text-emerald-300 whitespace-pre-wrap text-[11px]">
              {event.output !== null && event.output !== undefined
                ? JSON.stringify(event.output, null, 2)
                : "null"}
            </pre>
          </div>
        )}

        {activeTab === "raw" && (
          <div className="bg-slate-950 p-3 rounded border border-slate-800 h-full overflow-y-auto">
            <pre className="text-slate-300 whitespace-pre-wrap text-[11px]">
              {JSON.stringify(event, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
