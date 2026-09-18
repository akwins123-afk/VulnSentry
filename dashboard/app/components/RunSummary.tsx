"use client";

import React, { useState } from "react";
import { TracePayload } from "@/app/types";

interface RunSummaryProps {
  data: TracePayload;
  onRefresh: () => void;
  isLoading: boolean;
}

export default function RunSummary({ data, onRefresh, isLoading }: RunSummaryProps) {
  const [copied, setCopied] = useState(false);

  const runId = data.run?.run_id || "N/A";
  const status = data.run?.status || "UNKNOWN";
  const eventsCount = data.run?.events?.length || 0;
  const isVulnerable = data.finding?.vulnerability_detected;
  const severity = data.finding?.severity || "LOW";

  const handleCopy = () => {
    navigator.clipboard.writeText(runId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-6 py-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Brand & Project Identity */}
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-tr from-rose-600 via-indigo-600 to-cyan-400 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
            VS
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight text-white">VulnSentry</h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
                GlassBox AI Auditor
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Deterministic Guardrails & Observability Trace
            </p>
          </div>
        </div>

        {/* Badges & Metrics Bar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Run ID Pill */}
          <div className="flex items-center space-x-2 bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-300">
            <span className="text-slate-500">Run:</span>
            <span className="font-semibold text-slate-200" title={runId}>
              {runId.slice(0, 8)}...{runId.slice(-4)}
            </span>
            <button
              onClick={handleCopy}
              className="text-slate-400 hover:text-white transition-colors"
              title="Copy full Run ID"
            >
              {copied ? (
                <span className="text-emerald-400 font-sans font-medium">Copied!</span>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>

          {/* Audit Status Badge */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-950/70 border border-emerald-800/80 text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{status} ({eventsCount} Events)</span>
          </div>

          {/* Severity Badge */}
          {isVulnerable && (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-950/70 border border-rose-800/80 text-rose-300">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{severity}: 2 Vulnerabilities</span>
            </div>
          )}

          {/* Refresh Action */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            <svg className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{isLoading ? "Running Audit..." : "Re-run Audit"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
