"use client";

import React from "react";
import { ContextMetrics } from "@/lib/trace";

interface ContextEngineeringCardProps {
  context: ContextMetrics;
}

export default function ContextEngineeringCard({ context }: ContextEngineeringCardProps) {
  return (
    <div className="bg-[#0e1424] border border-slate-800 rounded-lg p-4 shadow">
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
        <h2 className="text-xs font-bold uppercase tracking-wider text-purple-300 font-mono">
          CONTEXT ENGINEERING
        </h2>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-950 border border-purple-800 text-purple-300">
          Optimization
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3 font-mono text-center">
        <div className="bg-slate-950 p-2 rounded border border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase block">Original</span>
          <span className="text-xs font-bold text-slate-200">
            {context.original_tokens !== "N/A" ? `${context.original_tokens}` : "N/A"}
          </span>
          <span className="text-[9px] text-slate-500 block">tokens</span>
        </div>

        <div className="bg-slate-950 p-2 rounded border border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase block">Selected</span>
          <span className="text-xs font-bold text-emerald-400">
            {context.selected_tokens !== "N/A" ? `${context.selected_tokens}` : "N/A"}
          </span>
          <span className="text-[9px] text-slate-500 block">tokens</span>
        </div>

        <div className="bg-slate-950 p-2 rounded border border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase block">Reduction</span>
          <span className="text-xs font-bold text-purple-400">
            {context.reduction_percentage !== "N/A" ? `${context.reduction_percentage}` : "N/A"}
          </span>
          <span className="text-[9px] text-slate-500 block">savings</span>
        </div>
      </div>

      <div className="bg-slate-950/70 border border-slate-800 rounded p-2 text-xs">
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-0.5">
          Strategy:
        </span>
        <p className="text-[11px] text-slate-300 font-mono leading-tight">
          {context.strategy}
        </p>
      </div>
    </div>
  );
}
