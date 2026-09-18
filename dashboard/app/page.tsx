"use client";

import React, { useEffect, useState } from "react";
import RunSummary from "./components/RunSummary";
import FailureAlert from "./components/FailureAlert";
import ExecutionTimeline from "./components/ExecutionTimeline";
import EventDetailPanel from "./components/EventDetailPanel";
import CodeInputPanel from "./components/CodeInputPanel";
import ContextMetrics from "./components/ContextMetrics";
import TokenLatencyMetrics from "./components/TokenLatencyMetrics";
import { TraceEvent, TracePayload } from "./types";

export default function DashboardPage() {
  const [data, setData] = useState<TracePayload | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<TraceEvent | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrace = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/trace");
      if (!res.ok) {
        throw new Error(`Failed to load trace: ${res.statusText}`);
      }
      const payload: TracePayload = await res.json();
      setData(payload);
      if (payload.run?.events?.length > 0) {
        // Default to FAILURE_DETECTED event if present, otherwise the last event
        const failureEv = payload.run.events.find((e) => e.event_type === "FAILURE_DETECTED");
        setSelectedEvent(failureEv || payload.run.events[0]);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to load audit trace.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrace();
  }, []);

  if (isLoading && !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <div className="h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-mono">Loading VulnSentry GlassBox Trace...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-rose-300 p-6">
        <div className="bg-rose-950/50 border border-rose-800 rounded-xl p-6 max-w-md text-center">
          <h2 className="text-lg font-bold mb-2">Error Loading Trace</h2>
          <p className="text-xs text-rose-200 mb-4">{error}</p>
          <button
            onClick={fetchTrace}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const events = data.run?.events || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* 7. Run Summary Header */}
      <RunSummary data={data} onRefresh={fetchTrace} isLoading={isLoading} />

      {/* Main Dashboard Container */}
      <main className="flex-1 p-6 space-y-6 max-w-[1600px] mx-auto w-full">
        {/* 4. Failure Alert Banner (High visibility when failure intercepted) */}
        {data.failure_details && <FailureAlert failure={data.failure_details} />}

        {/* 3-Column Core Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 2. Execution Timeline (The central visual DAG) - 4 Cols */}
          <div className="lg:col-span-4 min-h-[550px]">
            <ExecutionTimeline
              events={events}
              selectedEventId={selectedEvent?.event_id || null}
              onSelectEvent={(ev) => setSelectedEvent(ev)}
            />
          </div>

          {/* Center Column: Event Detail & Target Code - 5 Cols */}
          <div className="lg:col-span-5 flex flex-col space-y-6 min-h-[550px]">
            {/* 3. Event Detail Panel (Inspecting 11 Required Fields) */}
            <div className="flex-1 min-h-[300px]">
              <EventDetailPanel event={selectedEvent} />
            </div>

            {/* 1. Code / Input Panel */}
            <div className="h-[250px]">
              <CodeInputPanel code={data.code_snippet} />
            </div>
          </div>

          {/* Right Column: Telemetry & Verified Findings - 3 Cols */}
          <div className="lg:col-span-3 flex flex-col space-y-6">
            {/* 5. Context Compression Metrics */}
            <ContextMetrics metrics={data.context_metrics} />

            {/* 6. Token / Latency Metrics */}
            <TokenLatencyMetrics events={events} />

            {/* Final Security Finding Card */}
            {data.finding && (
              <div className="bg-slate-900 border border-rose-800/80 rounded-xl p-5 shadow-xl">
                <div className="flex items-center space-x-2 pb-2 mb-2 border-b border-slate-800">
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping"></span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-rose-300">
                    Verified Security Finding
                  </h3>
                </div>
                <h4 className="text-sm font-bold text-white mb-1.5 leading-snug">
                  {data.finding.title}
                </h4>
                <div className="flex gap-2 mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700">
                    {data.finding.severity}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {data.finding.cwe_id}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mb-2.5 leading-relaxed">
                  {data.finding.description}
                </p>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] font-semibold text-emerald-400 block mb-1 uppercase tracking-wider">
                    Remediation
                  </span>
                  <pre className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap">
                    {data.finding.remediation}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-3 text-center text-xs text-slate-500 font-mono">
        VulnSentry &bull; GlassBox Execution Tracer &bull; Deterministic Guardrails
      </footer>
    </div>
  );
}
