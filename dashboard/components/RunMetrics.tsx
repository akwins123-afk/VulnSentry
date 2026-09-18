"use client";

import React from "react";
import { RunMetrics as RunMetricsType } from "@/lib/trace";

interface RunMetricsProps {
  metrics: RunMetricsType;
}

export default function RunMetrics({ metrics }: RunMetricsProps) {
  return (
    <div className="bg-[#0e1424] border border-slate-800 rounded-lg p-4 shadow">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
          RUN TELEMETRY & COST
        </h2>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
          SOC Telemetry
        </span>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono mb-3">
        {/* Total Events */}
        <div className="bg-slate-950 p-2 rounded border border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
            Total Events
          </span>
          <span className="text-base font-bold text-white">
            {metrics.totalEvents}
          </span>
          <span className="text-[9px] text-slate-500 block">DAG steps</span>
        </div>

        {/* Failures */}
        <div className="bg-slate-950 p-2 rounded border border-rose-900/60">
          <span className="text-[10px] text-rose-400 uppercase tracking-wider block">
            Failures
          </span>
          <span className="text-base font-bold text-rose-400">
            {metrics.failures}
          </span>
          <span className="text-[9px] text-rose-500/80 block">intercepted</span>
        </div>

        {/* Recoveries */}
        <div className="bg-slate-950 p-2 rounded border border-emerald-900/60">
          <span className="text-[10px] text-emerald-400 uppercase tracking-wider block">
            Recoveries
          </span>
          <span className="text-base font-bold text-emerald-400">
            {metrics.recoveries}
          </span>
          <span className="text-[9px] text-emerald-500/80 block">self-corrected</span>
        </div>

        {/* LLM Calls */}
        <div className="bg-slate-950 p-2 rounded border border-indigo-900/60">
          <span className="text-[10px] text-indigo-400 uppercase tracking-wider block">
            LLM Calls
          </span>
          <span className="text-base font-bold text-indigo-300">
            {metrics.llmCalls}
          </span>
          <span className="text-[9px] text-indigo-400/80 block">invocations</span>
        </div>

        {/* Tool Calls */}
        <div className="bg-slate-950 p-2 rounded border border-sky-900/60">
          <span className="text-[10px] text-sky-400 uppercase tracking-wider block">
            Tool Calls
          </span>
          <span className="text-base font-bold text-sky-300">
            {metrics.toolCalls}
          </span>
          <span className="text-[9px] text-sky-400/80 block">executed</span>
        </div>

        {/* Latency */}
        <div className="bg-slate-950 p-2 rounded border border-amber-900/60">
          <span className="text-[10px] text-amber-400 uppercase tracking-wider block">
            Latency
          </span>
          <span className="text-base font-bold text-amber-300">
            {metrics.totalLatencyMs}
          </span>
          <span className="text-[9px] text-amber-400/80 block">total pipeline</span>
        </div>
      </div>

      {/* Token Usage & Cost Panel */}
      <div className="bg-slate-950 border border-slate-800 rounded p-2.5 mb-2 font-mono text-xs space-y-1.5">
        <div className="flex items-center justify-between text-slate-400 text-[11px] pb-1 border-b border-slate-900">
          <span>Token Telemetry</span>
          <span className="text-[10px] text-slate-500">gpt-4o-mini</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <span className="text-slate-500 text-[10px] block">Input Tokens:</span>
            <span className="text-slate-200 font-bold">{metrics.inputTokens}</span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block">Output Tokens:</span>
            <span className="text-slate-200 font-bold">{metrics.outputTokens}</span>
          </div>
        </div>

        <div className="pt-1.5 border-t border-slate-900 flex items-center justify-between">
          <span className="text-slate-400 text-[11px]">Estimated Cost:</span>
          <span className="text-emerald-400 font-bold text-xs bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
            {metrics.estimatedCost}
          </span>
        </div>
      </div>

      <div className="text-[10px] text-slate-500 font-mono leading-tight px-1">
        • Metrics derived 100% from deterministic backend execution trace.
      </div>
    </div>
  );
}
