"use client";

import React, { useState } from "react";

interface NavbarProps {
  runId: string;
  status: string;
  onRunAudit: () => void;
  isRunningAudit: boolean;
  selectedRunLabel: string;
}

export default function Navbar({
  runId,
  status,
  onRunAudit,
  isRunningAudit,
  selectedRunLabel,
}: NavbarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!runId || runId === "N/A") return;
    navigator.clipboard.writeText(runId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shortId = runId && runId !== "N/A"
    ? `${runId.slice(0, 8)}...${runId.slice(-4)}`
    : "N/A";

  return (
    <header className="bg-[#0b101b] border-b border-slate-800/80 px-5 py-3 sticky top-0 z-40">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 max-w-[1700px] mx-auto">
        {/* Brand & Identity */}
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 shrink-0 font-mono font-bold text-sm shadow-inner">
            <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-base font-bold tracking-tight text-white font-mono">
                VulnSentry
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/50">
                SOC Auditor
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans">
              Glass-Box Security Intelligence
            </p>
          </div>
        </div>

        {/* Status, Active Run, & Trigger */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Active View / Run Label */}
          <div className="hidden lg:flex items-center px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
            <span>View:</span>
            <span className="ml-1.5 font-semibold text-slate-200">{selectedRunLabel}</span>
          </div>

          {/* Run ID Pill */}
          <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs font-mono text-slate-300">
            <span className="text-slate-500">Run ID:</span>
            <span className="text-slate-200" title={runId}>{shortId}</span>
            <button
              onClick={handleCopy}
              className="text-slate-500 hover:text-slate-300 transition-colors ml-1"
              title="Copy Run ID"
            >
              {copied ? (
                <span className="text-emerald-400 text-[10px]">Copied</span>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>

          {/* Status Badge */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-emerald-950/60 border border-emerald-800 text-emerald-300 font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
            <span>Status: {status}</span>
          </div>

          {/* Run Audit Button */}
          <button
            onClick={onRunAudit}
            disabled={isRunningAudit}
            className="flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow transition-colors disabled:opacity-50 font-sans"
          >
            <svg
              className={`w-3.5 h-3.5 ${isRunningAudit ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{isRunningAudit ? "Running Audit..." : "Run Audit"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
