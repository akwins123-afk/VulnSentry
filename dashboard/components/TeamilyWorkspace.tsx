"use client";

import React, { useState } from "react";
import { NormalizedTrace, TraceEvent } from "@/lib/trace";

interface TeamilyWorkspaceProps {
  traceData: NormalizedTrace;
  onRunCustomAudit: (code: string, triggerFailure: boolean) => Promise<void>;
  isRunning: boolean;
  onToggleTechnicalView?: () => void;
  onInspectEvent?: (event: TraceEvent) => void;
}

const PRESET_CODE = {
  sqli: `import sqlite3

AWS_SECRET_KEY = "AKIA_FAKE_SECRET_KEY_EXPOSED_IN_PROD_12345"

def get_user_profile(user_input: str):
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    # VULNERABILITY: Raw string interpolation leading to SQL Injection
    query = f"SELECT * FROM users WHERE username = '{user_input}'"
    cursor.execute(query)
    return cursor.fetchall()`,

  secrets: `import os

# CRITICAL: Hardcoded Production Cloud Credentials
AWS_ACCESS_KEY_ID = "AKIA_IOS72EXAMPLE_KEY_PROD"
AWS_SECRET_ACCESS_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"

def init_s3():
    print("Connecting to AWS S3 bucket...")`,

  clean: `import sqlite3

def get_user_profile(user_input: str):
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    # SECURE: Parameterized Query
    query = "SELECT * FROM users WHERE username = ?"
    cursor.execute(query, (user_input,))
    return cursor.fetchall()`,
};

export default function TeamilyWorkspace({
  traceData,
  onRunCustomAudit,
  isRunning,
  onToggleTechnicalView,
  onInspectEvent,
}: TeamilyWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<"team" | "shield" | "healer" | "context" | "tracer">("team");
  const [inputCode, setInputCode] = useState(PRESET_CODE.sqli);
  const [submittedCode, setSubmittedCode] = useState(PRESET_CODE.sqli);
  const [triggerFailure, setTriggerFailure] = useState(true);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handlePresetSelect = (type: "sqli" | "secrets" | "clean") => {
    const code = PRESET_CODE[type];
    setInputCode(code);
    setSubmittedCode(code);
    onRunCustomAudit(code, triggerFailure);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim() || isRunning) return;
    setSubmittedCode(inputCode);
    onRunCustomAudit(inputCode, triggerFailure);
  };

  const handleCopyTrace = () => {
    navigator.clipboard.writeText(JSON.stringify(traceData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const failureEvent = traceData.events.find(
    (e) => e.status === "FAILURE" || e.event_type === "FAILURE_DETECTED"
  );
  const recoveryEvent = traceData.events.find((e) => e.event_type === "RECOVERY");

  return (
    <div className="flex h-screen w-full bg-[#f3faf6] text-slate-800 font-sans overflow-hidden">
      {/* ========================================================================= */}
      {/* 1. FAR-LEFT NARROW ICON BAR (Teamily AI Nav)                              */}
      {/* ========================================================================= */}
      <nav className="w-16 bg-white border-r border-slate-200/80 flex flex-col items-center py-4 justify-between shrink-0 select-none">
        <div className="flex flex-col items-center space-y-6">
          {/* Teamily Style Brand Logo (Green Square with Avatar) */}
          <div className="h-10 w-10 rounded-2xl bg-[#00c968] flex items-center justify-center text-white shadow-sm shadow-emerald-200">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
            </svg>
          </div>

          {/* Nav Icons Stack */}
          <div className="flex flex-col items-center space-y-4 text-slate-400">
            {/* Chat (Active with green highlight) */}
            <button
              title="Agent Chat"
              className="p-2.5 rounded-xl bg-[#eaf8f0] text-[#00c968] hover:text-[#00b05b] transition-colors relative"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#00c968]"></span>
            </button>

            {/* Discover */}
            <button
              title="Discover Agents"
              className="p-2.5 rounded-xl hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </button>

            {/* Contacts / Agents */}
            <button
              title="Agent Team"
              className="p-2.5 rounded-xl hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </button>

            {/* Technical SOC Switcher */}
            {onToggleTechnicalView && (
              <button
                onClick={onToggleTechnicalView}
                title="Switch to Dense SOC Telemetry View"
                className="p-2.5 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-indigo-500"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Bottom User Avatar */}
        <div className="h-9 w-9 rounded-full bg-slate-200 border-2 border-white shadow flex items-center justify-center text-xs font-bold text-slate-600">
          JJ
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* 2. CHANNELS / AGENTS LIST (Teamily AI Middle Column)                      */}
      {/* ========================================================================= */}
      <aside className="w-72 bg-[#fafcfb] border-r border-slate-200/80 flex flex-col shrink-0">
        {/* Search Header */}
        <div className="p-3.5 flex items-center space-x-2 border-b border-slate-100">
          <div className="flex-1 bg-white border border-slate-200/90 rounded-xl px-3 py-1.5 flex items-center text-xs text-slate-400 shadow-2xs">
            <svg className="w-3.5 h-3.5 mr-2 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-slate-700 placeholder-slate-400 w-full"
            />
          </div>

          <button
            onClick={() => handlePresetSelect("sqli")}
            title="New Audit"
            className="h-8 w-8 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500 shadow-2xs transition-colors"
          >
            +
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {/* Main Agent Channel: VulnSentry Team (Active) */}
          <div
            onClick={() => setActiveTab("team")}
            className={`p-2.5 rounded-2xl cursor-pointer transition-all flex items-center space-x-3 ${
              activeTab === "team"
                ? "bg-[#eaf8f0] text-slate-900 shadow-2xs"
                : "hover:bg-slate-100 text-slate-700"
            }`}
          >
            <div className="h-10 w-10 rounded-full bg-[#00c968] text-white flex items-center justify-center text-sm font-bold shadow-xs shrink-0">
              🛡️
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900 truncate">VulnSentry Team</span>
                <span className="text-[10px] text-slate-400 font-mono">Live</span>
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                Glass-Box Autonomous SOC
              </p>
            </div>
          </div>

          {/* Section Divider */}
          <div className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
            4 Core AI Pieces
          </div>

          {/* Piece 1: The Shield */}
          <div
            onClick={() => setActiveTab("shield")}
            className={`p-2.5 rounded-2xl cursor-pointer transition-all flex items-center space-x-3 ${
              activeTab === "shield"
                ? "bg-[#eaf8f0] text-slate-900 shadow-2xs"
                : "hover:bg-slate-100 text-slate-700"
            }`}
          >
            <div className="h-9 w-9 rounded-full bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center text-xs font-bold shrink-0">
              🛡️
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 truncate">The Shield</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">P1</span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">tool_validator.py &bull; Guardrail</p>
            </div>
          </div>

          {/* Piece 2: Self-Healer */}
          <div
            onClick={() => setActiveTab("healer")}
            className={`p-2.5 rounded-2xl cursor-pointer transition-all flex items-center space-x-3 ${
              activeTab === "healer"
                ? "bg-[#eaf8f0] text-slate-900 shadow-2xs"
                : "hover:bg-slate-100 text-slate-700"
            }`}
          >
            <div className="h-9 w-9 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
              🔄
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 truncate">Self-Healer</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">P2</span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">failure_interceptor.py &bull; Fix</p>
            </div>
          </div>

          {/* Piece 3: Context Optimizer */}
          <div
            onClick={() => setActiveTab("context")}
            className={`p-2.5 rounded-2xl cursor-pointer transition-all flex items-center space-x-3 ${
              activeTab === "context"
                ? "bg-[#eaf8f0] text-slate-900 shadow-2xs"
                : "hover:bg-slate-100 text-slate-700"
            }`}
          >
            <div className="h-9 w-9 rounded-full bg-purple-100 border border-purple-200 text-purple-700 flex items-center justify-center text-xs font-bold shrink-0">
              🧠
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 truncate">Context Optimizer</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 font-bold">P3</span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">context_manager.py &bull; -42.8%</p>
            </div>
          </div>

          {/* Piece 4: Glass-Box Logger */}
          <div
            onClick={() => setActiveTab("tracer")}
            className={`p-2.5 rounded-2xl cursor-pointer transition-all flex items-center space-x-3 ${
              activeTab === "tracer"
                ? "bg-[#eaf8f0] text-slate-900 shadow-2xs"
                : "hover:bg-slate-100 text-slate-700"
            }`}
          >
            <div className="h-9 w-9 rounded-full bg-cyan-100 border border-cyan-200 text-cyan-700 flex items-center justify-center text-xs font-bold shrink-0">
              📊
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 truncate">Glass-Box Tracer</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-100 text-cyan-800 font-bold">P4</span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">tracer.py &bull; 11-Field DAG</p>
            </div>
          </div>

          {/* Sample Audit Scenarios */}
          <div className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
            Sample Scenarios
          </div>

          <div
            onClick={() => handlePresetSelect("sqli")}
            className="p-2 rounded-xl text-xs hover:bg-slate-100 cursor-pointer flex items-center justify-between text-slate-600"
          >
            <span>🔴 SQL Injection (CWE-89)</span>
            <span className="h-2 w-2 rounded-full bg-rose-500"></span>
          </div>

          <div
            onClick={() => handlePresetSelect("secrets")}
            className="p-2 rounded-xl text-xs hover:bg-slate-100 cursor-pointer flex items-center justify-between text-slate-600"
          >
            <span>🟠 AWS Secret Key Leak</span>
            <span className="h-2 w-2 rounded-full bg-amber-500"></span>
          </div>

          <div
            onClick={() => handlePresetSelect("clean")}
            className="p-2 rounded-xl text-xs hover:bg-slate-100 cursor-pointer flex items-center justify-between text-slate-600"
          >
            <span>🟢 Parameterized Query</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
          </div>
        </div>

        {/* Footer Status */}
        <div className="p-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
          <span className="flex items-center space-x-1.5">
            <span className="h-2 w-2 rounded-full bg-[#00c968] animate-pulse"></span>
            <span>All Guardrails Active</span>
          </span>
          <span className="font-mono text-[10px]">{traceData.metrics.estimatedCost}</span>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 3. MAIN CHAT AREA (Teamily AI Feed)                                       */}
      {/* ========================================================================= */}
      <main className="flex-1 bg-white flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-14 border-b border-slate-100 px-6 flex items-center justify-between bg-white shrink-0 select-none">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-full bg-[#00c968] text-white flex items-center justify-center text-xs font-bold">
              🛡️
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-sm font-bold text-slate-900">VulnSentry Security Team</h1>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#eaf8f0] text-[#00c968] border border-emerald-200">
                  Glass-Box SOC
                </span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                  Owner: Jeevan &bull; Akash
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-slate-400">
            {/* Copy trace JSON */}
            <button
              onClick={handleCopyTrace}
              className="text-xs px-3 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors font-mono flex items-center space-x-1"
            >
              <span>{copied ? "✓ Copied" : "Copy Trace JSON"}</span>
            </button>

            {/* Menu icon */}
            <button className="p-1 hover:text-slate-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h.01M12 12h.01M19 12h.01" />
              </svg>
            </button>
          </div>
        </header>

        {/* Scrollable Conversation Stream */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* User Prompt Message (Teamily AI format: "Ivy: Schedule for tomorrow...") */}
          <div className="flex items-start space-x-3">
            <div className="h-8 w-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold shrink-0">
              JJ
            </div>
            <div className="flex-1 max-w-3xl">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-xs font-bold text-slate-900">Jeevan (Lead Auditor)</span>
                <span className="text-[10px] text-slate-400">Just now</span>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl rounded-tl-sm p-4 text-xs text-slate-800 space-y-2">
                <p className="font-medium text-slate-700">
                  Audit this target code for SQL injection vulnerabilities and hardcoded credentials. Enforce all Glass-Box guardrails:
                </p>
                <div className="bg-slate-900 rounded-xl p-3 font-mono text-[11px] text-slate-200 overflow-x-auto shadow-inner">
                  {submittedCode}
                </div>
              </div>

              {/* Agent Mention Tag */}
              <div className="mt-2 text-xs font-semibold text-[#00c968] flex items-center space-x-2">
                <span>@The Shield</span>
                <span className="text-slate-300">&bull;</span>
                <span>@Context Optimizer</span>
                <span className="text-slate-300">&bull;</span>
                <span>@Self-Healer</span>
                <span className="text-slate-300">&bull;</span>
                <span>@Glass-Box Tracer</span>
              </div>
            </div>
          </div>

          {/* Agent Response: The Structured Teamily AI Card */}
          <div className="flex items-start space-x-3">
            <div className="h-8 w-8 rounded-full bg-[#00c968] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm shadow-emerald-200">
              🛡️
            </div>
            <div className="flex-1 max-w-3xl space-y-4">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-900">VulnSentry Security Team</span>
                <span className="text-[10px] text-slate-400">Automated Pipeline</span>
              </div>

              {/* The Structured Card (Exact Teamily AI layout from screenshot) */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4 text-xs">
                {/* Header Checkmark */}
                <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    traceData.finding.vulnerability_detected
                      ? "bg-rose-100 text-rose-600"
                      : "bg-emerald-100 text-[#00c968]"
                  }`}>
                    {traceData.finding.vulnerability_detected ? "⚠" : "✓"}
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      {traceData.finding.vulnerability_detected
                        ? "Security Vulnerability Detected & Intercepted!"
                        : "Security Audit Completed: Target Code is Clean & Secure!"}
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      All 4 autonomous guardrails executed with zero unhandled exceptions.
                    </p>
                  </div>
                </div>

                {/* Section 1: Event Details */}
                <div className="space-y-1.5">
                  <div className="font-bold text-slate-800 flex items-center space-x-1.5">
                    <span>📋</span>
                    <span>Event Details:</span>
                  </div>
                  <ul className="space-y-1 text-slate-600 pl-5 list-disc text-[11px] leading-relaxed">
                    <li>
                      <strong>Target:</strong> <code className="bg-slate-100 px-1 py-0.2 rounded text-slate-800">
                        {submittedCode.includes("def get_user_profile") ? "get_user_profile() [Python]" : "Custom Input Snippet"}
                      </code>
                    </li>
                    <li>
                      <strong>Status:</strong>{" "}
                      {traceData.finding.vulnerability_detected ? (
                        <span className="text-rose-600 font-bold bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded text-[10px]">
                          ⚠ VULNERABILITY CONFIRMED
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded text-[10px]">
                          ✓ SECURE / CLEAN
                        </span>
                      )}
                    </li>
                    <li>
                      <strong>Verified Finding:</strong>{" "}
                      <span className={traceData.finding.vulnerability_detected ? "text-rose-600 font-bold" : "text-emerald-600 font-bold"}>
                        {traceData.finding.title}
                      </span>
                    </li>
                    <li>
                      <strong>CWE ID:</strong>{" "}
                      <span className="font-mono font-semibold text-slate-800">{traceData.finding.cwe_id}</span> &bull; Severity:{" "}
                      <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                        traceData.finding.severity === "CRITICAL"
                          ? "bg-rose-100 text-rose-700"
                          : traceData.finding.severity === "HIGH"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {traceData.finding.severity}
                      </span>
                    </li>
                    <li>
                      <strong>Tool Executed:</strong>{" "}
                      <code className="bg-slate-100 px-1 py-0.2 rounded text-slate-800 font-mono">
                        {traceData.finding.tool_used}
                      </code>
                    </li>
                  </ul>
                </div>

                {/* Section 2: Piece 1 (The Shield) & Piece 2 (Self-Healer) */}
                <div className="bg-[#fafcfb] border border-slate-200/80 rounded-xl p-3.5 space-y-2">
                  <div className="font-bold text-slate-800 flex items-center justify-between">
                    <span className="flex items-center space-x-1.5">
                      <span>🛡️</span>
                      <span>Piece 1: The Shield (tool_validator.py)</span>
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      failureEvent
                        ? "bg-rose-100 text-rose-700 border border-rose-200"
                        : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                    }`}>
                      {failureEvent ? "PRE-EXECUTION BLOCKED" : "SCHEMA PASSED"}
                    </span>
                  </div>

                  {failureEvent ? (
                    <div className="text-[11px] text-slate-600 space-y-1">
                      <p>
                        The agent attempted to invoke the scan tool with an unauthorized parameter:{" "}
                        <code className="bg-rose-50 text-rose-700 font-bold px-1 rounded border border-rose-200">
                          {traceData.failure.invalid_argument || "force_gas: 999999"}
                        </code>.
                      </p>
                      <p className="text-rose-700 font-medium">
                        ✓ <strong>Shield Protection:</strong> Prevented unauthorized tool invocation before touching the system.
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-600">
                      Tool call arguments strictly verified against registered JSON schema.
                    </p>
                  )}

                  {/* Piece 2 Recovery */}
                  {failureEvent && (
                    <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-600 space-y-1">
                      <div className="font-bold text-slate-800 flex items-center space-x-1.5">
                        <span>🔄</span>
                        <span>Piece 2: Self-Correction (failure_interceptor.py)</span>
                      </div>
                      <p>
                        <strong>Rule 2 Self-Correction Loop:</strong> Instead of crashing, the agent intercepted the schema error, removed the invalid parameter, and automatically recovered execution.
                      </p>
                    </div>
                  )}
                </div>

                {/* Section 3: Piece 3 (Context Manager) */}
                <div className="bg-[#fafcfb] border border-slate-200/80 rounded-xl p-3.5 space-y-2">
                  <div className="font-bold text-slate-800 flex items-center justify-between">
                    <span className="flex items-center space-x-1.5">
                      <span>🧠</span>
                      <span>Piece 3: Context Manager (context_manager.py)</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200">
                      {traceData.context.reduction_percentage} SAVINGS
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-mono">
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-400 text-[9px] uppercase block">Original</span>
                      <span className="font-bold text-slate-700">{traceData.context.original_tokens} tok</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-400 text-[9px] uppercase block">Compressed</span>
                      <span className="font-bold text-emerald-600">{traceData.context.selected_tokens} tok</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-slate-400 text-[9px] uppercase block">Pruned</span>
                      <span className="font-bold text-purple-600">{traceData.context.reduction_percentage}</span>
                    </div>
                  </div>
                </div>

                {/* Section 4: Piece 4 (Execution Tracer) */}
                <div className="space-y-1.5">
                  <div className="font-bold text-slate-800 flex items-center space-x-1.5">
                    <span>📊</span>
                    <span>Piece 4: Glass-Box DAG Telemetry (tracer.py)</span>
                  </div>
                  <ul className="space-y-1 text-slate-600 pl-5 list-disc text-[11px] font-mono leading-relaxed">
                    <li>Total DAG Events Logged: {traceData.metrics.totalEvents}</li>
                    <li>Execution Latency: {traceData.metrics.totalLatencyMs}</li>
                    <li>Tokens Tracked: {traceData.metrics.inputTokens} in / {traceData.metrics.outputTokens} out</li>
                    <li>Total Calculated Cost: <strong className="text-emerald-600 font-bold">{traceData.metrics.estimatedCost}</strong></li>
                  </ul>
                </div>

                {/* Section 5: Remediation Code Card or Clean Verification */}
                {traceData.finding.vulnerability_detected ? (
                  <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 space-y-1.5">
                    <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                      Remediation Guidance:
                    </span>
                    <pre className="bg-white p-2.5 rounded-lg border border-emerald-200/80 text-[11px] font-mono text-emerald-950 overflow-x-auto whitespace-pre-wrap">
                      {traceData.finding.remediation}
                    </pre>
                  </div>
                ) : (
                  <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 space-y-1">
                    <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                      ✓ Security Verification Passed
                    </span>
                    <p className="text-[11px] text-emerald-900 leading-relaxed font-sans">
                      {traceData.finding.description || "No SQL string concatenation or unparameterized queries found. The query safely uses bind parameters."}
                    </p>
                  </div>
                )}

                {/* Teamily Style Footer Link */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center space-x-1.5">
                    <span>📁</span>
                    <span>Verifiable Execution DAG:</span>
                    <code className="text-slate-700 bg-slate-100 px-1 rounded">/audit_trace.json</code>
                  </div>
                  <button
                    onClick={handleCopyTrace}
                    className="text-[#00c968] hover:underline font-semibold"
                  >
                    View in JSON &rarr;
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. BOTTOM CHAT INPUT BAR (Exact Teamily AI Style)                         */}
        {/* ========================================================================= */}
        <div className="p-4 border-t border-slate-100 bg-white shrink-0">
          <form onSubmit={handleSend} className="max-w-4xl mx-auto space-y-2">
            {/* Quick Pills & Guardrail Option */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center space-x-1.5">
                <span className="text-[11px] text-slate-400 font-medium">Try Preset:</span>
                <button
                  type="button"
                  onClick={() => handlePresetSelect("sqli")}
                  className="px-2.5 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] transition-colors"
                >
                  ⚡ SQLi
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetSelect("secrets")}
                  className="px-2.5 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] transition-colors"
                >
                  🔑 AWS Secret
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetSelect("clean")}
                  className="px-2.5 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] transition-colors"
                >
                  ✓ Clean Code
                </button>
              </div>

              <label className="flex items-center space-x-2 cursor-pointer text-[11px] text-slate-600 select-none">
                <input
                  type="checkbox"
                  checked={triggerFailure}
                  onChange={(e) => setTriggerFailure(e.target.checked)}
                  className="rounded border-slate-300 text-[#00c968] focus:ring-0"
                />
                <span className="font-medium">Test Guardrail (Inject Invalid Parameter)</span>
              </label>
            </div>

            {/* Input Capsule Box */}
            <div className="flex items-center bg-[#f7f9f8] border border-slate-200 rounded-2xl px-4 py-2 focus-within:border-[#00c968] focus-within:bg-white transition-all shadow-2xs">
              <textarea
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="I need more information about... or paste code to audit"
                rows={2}
                className="flex-1 bg-transparent border-none outline-none text-xs text-slate-800 placeholder-slate-400 resize-none font-sans leading-relaxed"
              />

              {/* Action Icons & Circular Send Button */}
              <div className="flex items-center space-x-2 ml-2 shrink-0">
                {/* Send Button (Green circle with paper plane like in screenshot) */}
                <button
                  type="submit"
                  disabled={isRunning || !inputCode.trim()}
                  className="h-9 w-9 rounded-full bg-[#00c968] hover:bg-[#00b05b] disabled:opacity-50 text-white flex items-center justify-center shadow-sm shadow-emerald-200 transition-transform active:scale-95"
                >
                  {isRunning ? (
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
