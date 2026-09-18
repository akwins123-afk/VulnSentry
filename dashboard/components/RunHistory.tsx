"use client";

import React from "react";
import { TraceRunGroup } from "@/lib/trace";

interface RunHistoryProps {
  runGroups: TraceRunGroup[];
  selectedGroupId: string;
  onSelectGroup: (groupId: string) => void;
}

export default function RunHistory({
  runGroups,
  selectedGroupId,
  onSelectGroup,
}: RunHistoryProps) {
  return (
    <div className="bg-[#0e1424] border border-slate-800 rounded-lg p-4 shadow">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-cyan-500"></span>
          RUN HISTORY & SWITCHER
        </h2>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
          {runGroups.length} Scans
        </span>
      </div>

      <p className="text-[11px] text-slate-400 mb-2 font-sans">
        Select a scan run to isolate its execution timeline and failure telemetry:
      </p>

      {/* List of runs */}
      <div className="space-y-1.5 font-mono text-xs">
        {runGroups.map((group) => {
          const isSelected = selectedGroupId === group.id;

          return (
            <button
              key={group.id}
              onClick={() => onSelectGroup(group.id)}
              className={`w-full text-left p-2.5 rounded border transition-all flex flex-col gap-1 ${
                isSelected
                  ? "bg-slate-800 border-indigo-500 ring-1 ring-indigo-500 shadow-md"
                  : "bg-slate-950 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 text-xs truncate">
                  {group.label}
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider shrink-0 ${
                    group.hasFailure
                      ? "bg-rose-950/80 text-rose-300 border border-rose-800"
                      : "bg-emerald-950/80 text-emerald-300 border border-emerald-800"
                  }`}
                >
                  {group.status}
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>{group.eventCount} DAG Events</span>
                <span className="text-slate-500">
                  {group.hasFailure ? "⚠ Failure Intercepted" : "✓ Clean"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
