"use client";

import React, { useState } from "react";

interface CodeInputPanelProps {
  code: string;
}

export default function CodeInputPanel({ code }: CodeInputPanelProps) {
  const [copied, setCopied] = useState(false);

  const lines = code ? code.split("\n") : [];

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
        <div className="flex items-center space-x-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400"></span>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Target Code: <span className="text-cyan-300 font-mono">vulnerable_app.py</span>
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
            Python 3
          </span>
        </div>

        <button
          onClick={handleCopy}
          className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
        >
          {copied ? "Copied!" : "Copy Code"}
        </button>
      </div>

      {/* Code Viewer with Line Highlights */}
      <div className="flex-1 overflow-y-auto bg-slate-950 p-3 rounded-lg border border-slate-800/80 font-mono text-xs text-slate-300">
        {lines.map((line, index) => {
          const lineNum = index + 1;
          const isSqliLine = line.includes("SELECT * FROM users") || line.includes("f\"SELECT");
          const isSecretLine = line.includes("AWS_SECRET_KEY") || line.includes("AKIA_FAKE");

          let highlightBg = "";
          let badge = null;

          if (isSqliLine) {
            highlightBg = "bg-rose-950/40 border-l-2 border-rose-500 pl-1";
            badge = (
              <span className="ml-2 px-1.5 py-0.5 text-[9px] font-bold rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase">
                CWE-89: SQLi
              </span>
            );
          } else if (isSecretLine) {
            highlightBg = "bg-amber-950/40 border-l-2 border-amber-500 pl-1";
            badge = (
              <span className="ml-2 px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                CWE-798: Exposed Key
              </span>
            );
          }

          return (
            <div key={lineNum} className={`flex items-start leading-5 py-0.5 ${highlightBg}`}>
              <span className="text-slate-600 select-none w-7 text-right pr-3 shrink-0 text-[11px]">
                {lineNum}
              </span>
              <span className="text-slate-200 whitespace-pre flex-1">{line}</span>
              {badge}
            </div>
          );
        })}
      </div>
    </div>
  );
}
