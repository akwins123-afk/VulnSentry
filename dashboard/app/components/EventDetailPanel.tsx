"use client";

import React, { useState } from "react";
import { TraceEvent } from "@/app/types";

interface EventDetailPanelProps {
  event: TraceEvent | null;
}

export default function EventDetailPanel({ event }: EventDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "input" | "output" | "raw">("overview");
  const [copied, setCopied] = useState(false);

  if (!event) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center text-center text-slate-500 h-full">
        <svg className="w-10 h-10 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-sm font-medium">Select a node from the timeline to inspect telemetry</p>
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(event, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-sm text-white font-mono">{event.event_type}</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                event.status === "FAILURE"
                  ? "bg-rose-950 text-rose-300 border border-rose-800"
                  : "bg-emerald-950 text-emerald-300 border border-emerald-800"
              }`}
            >
              {event.status}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono truncate block mt-0.5" title={event.event_id}>
            ID: {event.event_id}
          </span>
        </div>

        <button
          onClick={handleCopy}
          className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 shrink-0"
        >
          {copied ? "Copied!" : "Copy JSON"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-800/80 mb-3 text-xs">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-2 px-1 border-b-2 font-medium transition-colors ${
            activeTab === "overview"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Overview (11 Fields)
        </button>
        <button
          onClick={() => setActiveTab("input")}
          className={`pb-2 px-1 border-b-2 font-medium transition-colors ${
            activeTab === "input"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Input Payload
        </button>
        <button
          onClick={() => setActiveTab("output")}
          className={`pb-2 px-1 border-b-2 font-medium transition-colors ${
            activeTab === "output"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Output / Result
        </button>
        <button
          onClick={() => setActiveTab("raw")}
          className={`pb-2 px-1 border-b-2 font-medium transition-colors ${
            activeTab === "raw"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Raw JSON
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto text-xs font-mono space-y-2.5">
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-300">
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">run_id</span>
              <span className="text-slate-200 break-all">{event.run_id}</span>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">parent_event_id</span>
              <span className="text-slate-200 break-all">{event.parent_event_id || "None (Root)"}</span>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">timestamp</span>
              <span className="text-slate-200">{event.timestamp}</span>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">duration_ms</span>
              <span className="text-slate-200">{event.duration_ms !== null ? `${event.duration_ms} ms` : "N/A"}</span>
            </div>
            {event.error && (
              <div className="col-span-full bg-rose-950/40 p-2.5 rounded-lg border border-rose-800/60">
                <span className="text-[10px] text-rose-400 uppercase tracking-wider block">error</span>
                <span className="text-rose-200">{event.error}</span>
              </div>
            )}
            <div className="col-span-full bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">metadata</span>
              <pre className="text-slate-300 whitespace-pre-wrap text-[11px] overflow-x-auto">
                {JSON.stringify(event.metadata, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {activeTab === "input" && (
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 h-full overflow-y-auto">
            <pre className="text-cyan-300 whitespace-pre-wrap text-[11px]">
              {JSON.stringify(event.input, null, 2)}
            </pre>
          </div>
        )}

        {activeTab === "output" && (
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 h-full overflow-y-auto">
            <pre className="text-emerald-300 whitespace-pre-wrap text-[11px]">
              {JSON.stringify(event.output, null, 2)}
            </pre>
          </div>
        )}

        {activeTab === "raw" && (
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 h-full overflow-y-auto">
            <pre className="text-slate-300 whitespace-pre-wrap text-[11px]">
              {JSON.stringify(event, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
