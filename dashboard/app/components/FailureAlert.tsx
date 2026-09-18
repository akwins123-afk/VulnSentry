"use client";

import React from "react";
import { FailureDetailsData } from "@/app/types";

interface FailureAlertProps {
  failure: FailureDetailsData;
}

export default function FailureAlert({ failure }: FailureAlertProps) {
  if (!failure || !failure.blocked) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-amber-950/50 via-rose-950/40 to-slate-900 border border-amber-500/40 rounded-xl p-4 shadow-lg shadow-amber-950/20">
      <div className="flex items-start gap-3">
        {/* Warning Icon Badge */}
        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-amber-300 text-sm">
                Guardrail Interception: Execution Blocked
              </span>
              <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase tracking-wider">
                Shield Active
              </span>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Target Tool: <code className="text-amber-200 font-semibold">{failure.invalid_tool}</code>
            </span>
          </div>

          <p className="text-xs text-slate-300 mb-2 leading-relaxed">
            <strong className="text-slate-100">FailureInterceptor</strong> prevented execution of unauthorized parameter{" "}
            <code className="bg-rose-950/80 text-rose-300 border border-rose-800 px-1.5 py-0.5 rounded text-[11px] font-mono">
              force_gas: 999999
            </code>
            . The underlying tool was <span className="text-emerald-300 font-medium">shielded from execution</span>.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-800/80">
            {/* Preserved Validation Error */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2.5">
              <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                Preserved Validation Error
              </span>
              <p className="text-xs text-rose-300/90 font-mono leading-tight">
                {failure.validation_error}
              </p>
            </div>

            {/* Generated Recovery Guidance */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2.5">
              <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                Automated Self-Recovery Action
              </span>
              <p className="text-xs text-emerald-300/90 font-mono leading-tight">
                Self-corrected to static scanner <code className="text-emerald-200">run_sql_injection_scan</code>. Execution resumed safely.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
