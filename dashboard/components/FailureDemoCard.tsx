"use client";

import React from "react";
import { FailureDetail } from "@/lib/trace";

interface FailureDemoCardProps {
  failure: FailureDetail;
}

export default function FailureDemoCard({ failure }: FailureDemoCardProps) {
  if (!failure.detected) {
    return (
      <div className="bg-[#0e1424] border border-slate-800 rounded-lg p-3.5 text-xs text-slate-400">
        <span className="font-mono text-emerald-400 font-semibold block mb-1">
          ✓ Clean Execution
        </span>
        No tool validation failures were triggered in this scan.
      </div>
    );
  }

  return (
    <div className="bg-[#120e18] border-2 border-rose-600/80 rounded-lg p-4 shadow-xl">
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-rose-900/60">
        <div className="flex items-center space-x-2">
          <span className="text-amber-400 text-sm">⚠</span>
          <h2 className="text-xs font-bold uppercase tracking-wider text-rose-300 font-mono">
            FAILURE DETECTED
          </h2>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 border border-rose-700 text-rose-200 font-bold uppercase tracking-wider">
          Glass-Box Protection
        </span>
      </div>

      <div className="space-y-2.5 text-xs font-mono">
        {/* Invalid argument callout */}
        <div className="bg-slate-950/80 border border-rose-900/60 rounded p-2.5">
          <span className="text-[10px] text-slate-400 block mb-0.5 uppercase tracking-wider">
            Invalid Tool Argument:
          </span>
          <code className="text-rose-300 font-bold text-xs bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-800 inline-block">
            {failure.invalid_argument}
          </code>
        </div>

        {/* Blocking status */}
        <div className="bg-rose-950/50 border border-rose-800 rounded p-2 text-center">
          <span className="text-rose-200 font-bold text-xs tracking-wider block">
            TOOL EXECUTION BLOCKED
          </span>
          <span className="text-[10px] text-rose-300/80 font-sans block mt-0.5">
            Shield prevented unauthorized invocation of target tool
          </span>
        </div>

        {/* Recovery */}
        <div className="bg-slate-950/80 border border-slate-800 rounded p-2.5">
          <span className="text-[10px] text-slate-400 block mb-0.5 uppercase tracking-wider">
            Recovery:
          </span>
          <p className="text-slate-300 text-[11px] font-sans leading-relaxed">
            Agent corrected the tool call: removed <code className="text-rose-300">{failure.invalid_argument}</code> and supplied verified parameters.
          </p>
        </div>

        {/* Recovery Successful Badge */}
        {failure.recovered && (
          <div className="bg-emerald-950/50 border border-emerald-800/80 rounded p-2 text-center">
            <span className="text-emerald-300 font-bold text-xs tracking-wide">
              ✓ RECOVERY SUCCESSFUL
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
