"use client";

import React from "react";

export default function GlassBoxWorkflow() {
  const steps = [
    { name: "User Request", desc: "Audit target code", color: "text-cyan-300", bg: "bg-cyan-950/40 border-cyan-800/60" },
    { name: "Context Selection", desc: "Prune irrelevant turns", color: "text-purple-300", bg: "bg-purple-950/40 border-purple-800/60" },
    { name: "LLM Decision", desc: "Analyze AST & imports", color: "text-indigo-300", bg: "bg-indigo-950/40 border-indigo-800/60" },
    { name: "Tool Selection", desc: "Propose exploit call", color: "text-blue-300", bg: "bg-blue-950/40 border-blue-800/60" },
    { name: "Validation", desc: "Schema guardrail check", color: "text-amber-300", bg: "bg-amber-950/40 border-amber-800/60" },
    { name: "Failure", desc: "Block invalid parameter", color: "text-rose-400 font-bold", bg: "bg-rose-950/60 border-rose-700" },
    { name: "Recovery", desc: "Self-correct parameters", color: "text-emerald-300", bg: "bg-emerald-950/40 border-emerald-800/60" },
    { name: "Final Result", desc: "Verified security report", color: "text-slate-200 font-bold", bg: "bg-slate-900 border-slate-700" },
  ];

  return (
    <div className="bg-[#0e1424] border border-slate-800 rounded-lg p-4 shadow">
      <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-800">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
          WHY DID THIS RUN HAPPEN?
        </h2>
        <span className="text-[10px] font-mono text-indigo-400 px-1.5 py-0.5 rounded bg-indigo-950/60 border border-indigo-900">
          Glass-Box Architecture
        </span>
      </div>

      <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
        VulnSentry enforces deterministic observability and pre-execution guardrails at every autonomous agent decision point:
      </p>

      {/* Visual Execution Chain */}
      <div className="space-y-1 font-mono text-xs">
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;
          return (
            <div key={step.name} className="flex flex-col items-center">
              <div
                className={`w-full py-1.5 px-2.5 rounded border text-left flex items-center justify-between ${step.bg}`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] text-slate-500 w-3.5 text-right">{idx + 1}.</span>
                  <span className={`text-xs ${step.color}`}>{step.name}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-sans">{step.desc}</span>
              </div>
              {!isLast && (
                <div className="text-slate-600 text-xs leading-none py-0.5 select-none">
                  ↓
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
