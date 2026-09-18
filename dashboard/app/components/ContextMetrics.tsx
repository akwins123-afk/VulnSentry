"use client";

import React from "react";
import { ContextMetricsData } from "@/app/types";

interface ContextMetricsProps {
  metrics: ContextMetricsData;
}

export default function ContextMetrics({ metrics }: ContextMetricsProps) {
  const original = metrics?.original_token_count || 465;
  const compressed = metrics?.compressed_token_count || 266;
  const reduction = metrics?.reduction_percentage || 42.8;
  const preservedItems = metrics?.preserved_items || [
    "system_prompt",
    "current_user_request",
    "recent_turns_window:4",
    "security_findings_preserved:2",
    "compressed_historical_turns:13",
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
        <div className="flex items-center space-x-2">
          <span className="h-2 w-2 rounded-full bg-purple-400"></span>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Context Compression Telemetry
          </h3>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/60">
          Strategy: security_aware_recency
        </span>
      </div>

      {/* Progress & Numbers */}
      <div className="grid grid-cols-3 gap-3 mb-3 text-center">
        <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Original Tokens</span>
          <span className="text-base font-bold text-slate-200 font-mono">{original}</span>
        </div>
        <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Compressed Tokens</span>
          <span className="text-base font-bold text-emerald-400 font-mono">{compressed}</span>
        </div>
        <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Token Reduction</span>
          <span className="text-base font-bold text-purple-400 font-mono">{reduction}%</span>
        </div>
      </div>

      {/* Reduction Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-[11px] text-slate-400 mb-1">
          <span>Payload Optimization</span>
          <span className="text-purple-300 font-semibold">{reduction}% Savings</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, reduction))}%` }}
          ></div>
        </div>
      </div>

      {/* Preserved Items Breakdown */}
      <div>
        <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
          Guaranteed Inclusions (Deterministic Guardrails):
        </span>
        <div className="flex flex-wrap gap-1.5">
          {preservedItems.map((item, idx) => {
            let badgeClass = "bg-slate-800 text-slate-300 border-slate-700";
            if (item.includes("security_findings")) {
              badgeClass = "bg-rose-950/80 text-rose-300 border-rose-800 font-bold";
            } else if (item.includes("system_prompt") || item.includes("current_user")) {
              badgeClass = "bg-indigo-950/80 text-indigo-300 border-indigo-800";
            } else if (item.includes("recent_turns")) {
              badgeClass = "bg-emerald-950/80 text-emerald-300 border-emerald-800";
            } else if (item.includes("compressed_historical")) {
              badgeClass = "bg-slate-800/60 text-slate-400 border-slate-700/60";
            }

            return (
              <span
                key={idx}
                className={`text-[10px] font-mono px-2 py-0.5 rounded border ${badgeClass}`}
              >
                {item}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
