"use client";

import React, { useState } from "react";

interface CodeInputPanelProps {
  code: string;
}

export default function CodeInputPanel({ code }: CodeInputPanelProps) {
  const [copied, setCopied] = useState(false);

  const defaultCode = `import sqlite3

AWS_SECRET_KEY = "AKIA_FAKE_SECRET_KEY_EXPOSED_IN_PROD_12345"

def get_user_profile(user_input: str):
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    # VULNERABILITY: Raw string interpolation leading to SQL Injection
    query = f"SELECT * FROM users WHERE username = '{user_input}'"
    cursor.execute(query)
    return cursor.fetchall()`;

  const displayCode = code && code.trim() ? code : defaultCode;
  const lines = displayCode.split("\n");

  const handleCopy = () => {
    navigator.clipboard.writeText(displayCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#0e1424] border border-slate-800 rounded-lg p-4 shadow flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400"></span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
            Audited Source: <span className="text-cyan-300">vulnerable_app.py</span>
          </h3>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
            Python 3
          </span>
          <button
            onClick={handleCopy}
            className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors border border-slate-700"
          >
            {copied ? "Copied" : "Copy Code"}
          </button>
        </div>
      </div>

      {/* Code Viewer with Line Highlights */}
      <div className="overflow-x-auto bg-slate-950 p-2.5 rounded border border-slate-800/80 font-mono text-xs text-slate-300 max-h-[190px]">
        {lines.map((line, index) => {
          const lineNum = index + 1;
          const isSqliLine = line.includes("SELECT * FROM users") || line.includes("f\"SELECT");
          const isSecretLine = line.includes("AWS_SECRET_KEY") || line.includes("AKIA_FAKE");

          let highlightBg = "";
          let badge = null;

          if (isSqliLine) {
            highlightBg = "bg-rose-950/40 border-l-2 border-rose-500 pl-1";
            badge = (
              <span className="ml-2 px-1 py-0.2 text-[9px] font-bold rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase">
                CWE-89: SQLi
              </span>
            );
          } else if (isSecretLine) {
            highlightBg = "bg-amber-950/40 border-l-2 border-amber-500 pl-1";
            badge = (
              <span className="ml-2 px-1 py-0.2 text-[9px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                CWE-798: Exposed Key
              </span>
            );
          }

          return (
            <div key={lineNum} className={`flex items-start leading-5 py-0.5 ${highlightBg}`}>
              <span className="text-slate-600 select-none w-6 text-right pr-2 shrink-0 text-[10px]">
                {lineNum}
              </span>
              <span className="text-slate-200 whitespace-pre flex-1 text-[11px]">{line}</span>
              {badge}
            </div>
          );
        })}
      </div>
    </div>
  );
}
