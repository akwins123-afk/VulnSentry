"use client";

import React from "react";
import { SecurityFinding } from "@/lib/trace";

interface SecurityFindingsPanelProps {
  finding: SecurityFinding;
}

export default function SecurityFindingsPanel({ finding }: SecurityFindingsPanelProps) {
  const isVulnerable = finding.vulnerability_detected;
  const severity = finding.severity || "CRITICAL";

  return (
    <div className="bg-[#0e1424] border border-rose-800/80 rounded-lg p-4 shadow-lg">
      <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse"></span>
          <h2 className="text-xs font-bold uppercase tracking-wider text-rose-300 font-mono">
            Security Findings
          </h2>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 border border-rose-800 text-rose-300 font-bold">
          {severity}
        </span>
      </div>

      {/* Primary Finding Header */}
      <div className="mb-3">
        <h3 className="text-sm font-bold text-white leading-snug mb-1">
          {finding.title}
        </h3>
        <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400">
          <span>CWE: <span className="text-rose-300 font-semibold">{finding.cwe_id}</span></span>
        </div>
      </div>

      {/* Vulnerability Detected Banner */}
      <div className="bg-rose-950/40 border border-rose-800/60 rounded p-2.5 mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-300">
          Vulnerability Detected:
        </span>
        <span className="text-xs font-bold text-rose-300 bg-rose-950 px-2.5 py-0.5 rounded border border-rose-700 uppercase tracking-wider font-mono">
          {isVulnerable ? "YES" : "NO"}
        </span>
      </div>

      {/* Tool Used */}
      <div className="mb-3 text-xs">
        <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block mb-0.5">
          Tool:
        </span>
        <span className="font-mono text-slate-200 bg-slate-900 px-2 py-1 rounded border border-slate-800 inline-block">
          {finding.tool_used}
        </span>
      </div>

      {/* Remediation Guidance */}
      <div className="bg-slate-950/80 border border-slate-800/90 rounded p-3 text-xs">
        <span className="text-[11px] font-mono font-semibold text-emerald-400 block mb-1 uppercase tracking-wider">
          Remediation:
        </span>
        <p className="font-mono text-slate-300 leading-relaxed text-[11px]">
          {finding.remediation}
        </p>
      </div>
    </div>
  );
}
