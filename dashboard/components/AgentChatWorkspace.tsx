"use client";

import React, { useState } from "react";
import { NormalizedTrace, TraceEvent } from "@/lib/trace";

interface AgentChatWorkspaceProps {
  traceData: NormalizedTrace;
  onRunCustomAudit: (code: string, triggerFailure: boolean) => Promise<void>;
  isRunning: boolean;
  onInspectEvent: (event: TraceEvent) => void;
}

interface ChatMessage {
  id: string;
  sender: "user" | "context" | "agent" | "shield" | "healer" | "tracer" | "system";
  agentName?: string;
  agentRole?: string;
  avatarBg?: string;
  avatarText?: string;
  title?: string;
  content?: string;
  codeSnippet?: string;
  badge?: { label: string; color: string };
  metrics?: { label: string; value: string }[];
  finding?: any;
  timestamp?: string;
}

const PRESET_SNIPPETS = {
  sqli: `import sqlite3

def get_user_profile(user_input: str):
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    # VULNERABILITY: Raw string interpolation
    query = f"SELECT * FROM users WHERE username = '{user_input}'"
    cursor.execute(query)
    return cursor.fetchall()`,

  secrets: `import os

# CRITICAL: Hardcoded AWS Production Credentials
AWS_SECRET_KEY = "AKIA_FAKE_SECRET_KEY_EXPOSED_IN_PROD_12345"
DB_PASSWORD = "SuperSecretAdminPassword!2026"

def connect_storage():
    print(f"Connecting to AWS with {AWS_SECRET_KEY[:6]}...")`,

  clean: `import sqlite3

def get_user_profile(user_input: str):
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    # SECURE: Parameterized Query
    query = "SELECT * FROM users WHERE username = ?"
    cursor.execute(query, (user_input,))
    return cursor.fetchall()`,
};

export default function AgentChatWorkspace({
  traceData,
  onRunCustomAudit,
  isRunning,
  onInspectEvent,
}: AgentChatWorkspaceProps) {
  const [inputCode, setInputCode] = useState(PRESET_SNIPPETS.sqli);
  const [triggerFailure, setTriggerFailure] = useState(true);
  const [activeTab, setActiveTab] = useState<"sqli" | "secrets" | "clean">("sqli");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim() || isRunning) return;
    onRunCustomAudit(inputCode, triggerFailure);
  };

  const handleSelectPreset = (key: "sqli" | "secrets" | "clean") => {
    setActiveTab(key);
    setInputCode(PRESET_SNIPPETS[key]);
  };

  // Derive agent messages from traceData events
  const failureEvent = traceData.events.find(
    (e) => e.status === "FAILURE" || e.event_type === "FAILURE_DETECTED"
  );
  const recoveryEvent = traceData.events.find((e) => e.event_type === "RECOVERY");
  const toolResultEvent = traceData.events.find((e) => e.event_type === "TOOL_RESULT");
  const finalEvent = traceData.events.find((e) => e.event_type === "FINAL_RESPONSE");

  return (
    <div className="flex h-[88vh] bg-[#0b101b] border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl">
      {/* ========================================================= */}
      {/* 1. LEFT SIDEBAR: Agent Roster & Audit History (Teamily AI) */}
      {/* ========================================================= */}
      <aside className="w-80 border-r border-slate-800/80 bg-[#080d17] flex flex-col shrink-0 hidden md:flex">
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm shadow-inner">
              🛡️
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-white text-sm font-sans tracking-tight">VulnSentry</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  AI Team
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Autonomous Security Agents</p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-3 pt-3 pb-2">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5 flex items-center text-xs text-slate-400">
            <span className="mr-2 text-slate-500">🔍</span>
            <input
              type="text"
              placeholder="Search agents or threads..."
              className="bg-transparent border-none outline-none text-xs text-slate-200 placeholder-slate-500 w-full"
            />
          </div>
        </div>

        {/* Security Agent Roster */}
        <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
          Security Agents (4 Pieces)
        </div>
        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {/* Agent 1: The Shield */}
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:bg-slate-800/60 transition-colors cursor-pointer">
            <div className="flex items-center space-x-2.5">
              <div className="h-8 w-8 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center text-xs">
                🛡️
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">The Shield</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">Piece 1</span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">tool_validator.py &bull; Pre-Execution</p>
              </div>
            </div>
          </div>

          {/* Agent 2: Self-Correction */}
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:bg-slate-800/60 transition-colors cursor-pointer">
            <div className="flex items-center space-x-2.5">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center text-xs">
                🔄
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">Self-Healer</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">Piece 2</span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">failure_interceptor.py &bull; Recovery</p>
              </div>
            </div>
          </div>

          {/* Agent 3: Context Compressor */}
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:bg-slate-800/60 transition-colors cursor-pointer">
            <div className="flex items-center space-x-2.5">
              <div className="h-8 w-8 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center justify-center text-xs">
                🧠
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">Context Optimizer</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300">Piece 3</span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">context_manager.py &bull; 42.8% Saved</p>
              </div>
            </div>
          </div>

          {/* Agent 4: Glass-Box Logger */}
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:bg-slate-800/60 transition-colors cursor-pointer">
            <div className="flex items-center space-x-2.5">
              <div className="h-8 w-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 flex items-center justify-center text-xs">
                📊
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">Glass-Box Tracer</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300">Piece 4</span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">tracer.py &bull; 11-Field Telemetry</p>
              </div>
            </div>
          </div>

          {/* Quick Scenario Picker */}
          <div className="pt-3 pb-1 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
            Sample Audit Presets
          </div>

          <button
            onClick={() => handleSelectPreset("sqli")}
            className={`w-full text-left p-2 rounded-lg text-xs transition-colors border ${
              activeTab === "sqli"
                ? "bg-indigo-950/60 border-indigo-500 text-white font-medium"
                : "bg-slate-900/40 border-slate-800/80 text-slate-400 hover:text-slate-200"
            }`}
          >
            🔴 SQL Injection (CWE-89)
          </button>

          <button
            onClick={() => handleSelectPreset("secrets")}
            className={`w-full text-left p-2 rounded-lg text-xs transition-colors border ${
              activeTab === "secrets"
                ? "bg-indigo-950/60 border-indigo-500 text-white font-medium"
                : "bg-slate-900/40 border-slate-800/80 text-slate-400 hover:text-slate-200"
            }`}
          >
            🟠 AWS Secret Key Leak (CWE-798)
          </button>

          <button
            onClick={() => handleSelectPreset("clean")}
            className={`w-full text-left p-2 rounded-lg text-xs transition-colors border ${
              activeTab === "clean"
                ? "bg-indigo-950/60 border-indigo-500 text-white font-medium"
                : "bg-slate-900/40 border-slate-800/80 text-slate-400 hover:text-slate-200"
            }`}
          >
            🟢 Secure Parameterized Query
          </button>
        </div>

        {/* Run Footnote */}
        <div className="p-3 border-t border-slate-800/80 text-[10px] text-slate-500 font-mono">
          Run ID: {traceData.run_id.slice(0, 8)}... &bull; 100% Verifiable
        </div>
      </aside>

      {/* ========================================================= */}
      {/* 2. MAIN CHAT & AGENT COLLABORATION STREAM (Teamily AI)    */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#070b14]">
        {/* Stream Top Navbar */}
        <div className="px-5 py-3 border-b border-slate-800/80 bg-[#080d17]/80 backdrop-blur flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-sm">
              🛡️
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-white">VulnSentry Security Team</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono font-semibold">
                  Autonomous SOC
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Coordinated AI Agents inspecting target code with deterministic guardrails
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="text-right hidden sm:block">
              <span className="text-[10px] text-slate-500 block font-mono">Total DAG Events</span>
              <span className="text-xs font-bold text-slate-200 font-mono">{traceData.metrics.totalEvents} logged</span>
            </div>
            <div className="text-right hidden sm:block pl-3 border-l border-slate-800">
              <span className="text-[10px] text-slate-500 block font-mono">Total Cost</span>
              <span className="text-xs font-bold text-emerald-400 font-mono">{traceData.metrics.estimatedCost}</span>
            </div>
          </div>
        </div>

        {/* Agent Messages Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 font-sans text-sm">
          {/* User Query Message */}
          <div className="flex items-start space-x-3 justify-end">
            <div className="max-w-2xl bg-indigo-600 text-white rounded-2xl rounded-tr-sm p-4 shadow-lg">
              <div className="flex items-center justify-between text-[11px] text-indigo-200 mb-1.5 pb-1 border-b border-indigo-500/50">
                <span className="font-semibold">You (Security Auditor)</span>
                <span className="font-mono">Audit Request</span>
              </div>
              <p className="text-xs leading-relaxed mb-2 font-medium">
                Please audit this Python code for potential injection risks or credential leaks. Enforce full Glass-Box guardrails.
              </p>
              <pre className="bg-indigo-950/80 p-2.5 rounded-lg text-[11px] font-mono text-indigo-100 overflow-x-auto border border-indigo-500/40">
                {inputCode}
              </pre>
            </div>
            <div className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
              👤
            </div>
          </div>

          {/* AI Plan Banner (Inspired by Teamily AI) */}
          <div className="max-w-3xl mx-auto bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-200 mb-1 font-mono">
              <span>📋</span>
              <span>Autonomous Security DAG Plan Initiated (4 Pieces)</span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              VulnSentry orchestrates 4 specialized AI guardrails in strict sequence:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-slate-950/80 p-2 rounded-lg border border-purple-900/40 flex items-center space-x-2">
                <span className="text-purple-400">1.</span>
                <span className="text-purple-300 font-semibold">Context Optimizer</span>
                <span className="text-[10px] text-slate-500">(Token Pruning)</span>
              </div>
              <div className="bg-slate-950/80 p-2 rounded-lg border border-indigo-900/40 flex items-center space-x-2">
                <span className="text-indigo-400">2.</span>
                <span className="text-indigo-300 font-semibold">Security Agent</span>
                <span className="text-[10px] text-slate-500">(Tool Selection)</span>
              </div>
              <div className="bg-slate-950/80 p-2 rounded-lg border border-amber-900/40 flex items-center space-x-2">
                <span className="text-amber-400">3.</span>
                <span className="text-amber-300 font-semibold">The Shield</span>
                <span className="text-[10px] text-slate-500">(ToolValidator)</span>
              </div>
              <div className="bg-slate-950/80 p-2 rounded-lg border border-emerald-900/40 flex items-center space-x-2">
                <span className="text-emerald-400">4.</span>
                <span className="text-emerald-300 font-semibold">Glass-Box Logger</span>
                <span className="text-[10px] text-slate-500">(tracer.py)</span>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* STEP 1: ContextManager Agent Response (Piece 3)          */}
          {/* ========================================================= */}
          <div className="flex items-start space-x-3">
            <div className="h-8 w-8 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 text-xs font-bold shrink-0">
              🧠
            </div>
            <div className="max-w-2xl bg-slate-900/90 border border-slate-800 rounded-2xl rounded-tl-sm p-4 shadow">
              <div className="flex items-center justify-between text-xs pb-1.5 mb-2 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-purple-300">Context Optimizer</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800">
                    Piece 3: context_manager.py
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">
                  {traceData.context.reduction_percentage} Reduced
                </span>
              </div>

              <p className="text-xs text-slate-300 mb-2 leading-relaxed">
                I examined the active session history. To prevent unbounded prompt bloat and runaway token billing, I pruned low-value conversational turns while strictly retaining current code and active security facts.
              </p>

              <div className="grid grid-cols-3 gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800/80 text-center font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Original</span>
                  <span className="text-xs font-bold text-slate-300">{traceData.context.original_tokens} tok</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Compressed</span>
                  <span className="text-xs font-bold text-emerald-400">{traceData.context.selected_tokens} tok</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Savings</span>
                  <span className="text-xs font-bold text-purple-400">{traceData.context.reduction_percentage}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* STEP 2: Lead Security Agent (LLM Reasoning & Tool)        */}
          {/* ========================================================= */}
          <div className="flex items-start space-x-3">
            <div className="h-8 w-8 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 text-xs font-bold shrink-0">
              🤖
            </div>
            <div className="max-w-2xl bg-slate-900/90 border border-slate-800 rounded-2xl rounded-tl-sm p-4 shadow">
              <div className="flex items-center justify-between text-xs pb-1.5 mb-2 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-indigo-300">Security Agent</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                    agent.py &bull; LLM
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">Decision: Verified</span>
              </div>

              <p className="text-xs text-slate-300 mb-2 leading-relaxed">
                Analyzing AST syntax tree. Found user-supplied variable interpolated into database query string.
              </p>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs font-mono space-y-1">
                <div className="text-indigo-400 font-semibold">
                  &gt; Proposing Tool Call: <span className="text-white font-bold">{traceData.finding.tool_used}</span>
                </div>
                <div className="text-slate-400 text-[11px]">
                  Arguments: <code className="text-cyan-300">&#123; "confidence_threshold": 0.7 &#125;</code>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* STEP 3: The Shield (ToolValidator.py - Piece 1)           */}
          {/* ========================================================= */}
          <div className="flex items-start space-x-3">
            <div className="h-8 w-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 text-xs font-bold shrink-0">
              🛡️
            </div>
            <div className={`max-w-2xl border rounded-2xl rounded-tl-sm p-4 shadow ${
              failureEvent
                ? "bg-[#140e16] border-rose-800/80"
                : "bg-slate-900/90 border-slate-800"
            }`}>
              <div className="flex items-center justify-between text-xs pb-1.5 mb-2 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-amber-300">The Shield</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">
                    Piece 1: tool_validator.py
                  </span>
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.2 rounded ${
                  failureEvent
                    ? "bg-rose-950 text-rose-300 border border-rose-800"
                    : "bg-emerald-950 text-emerald-400 border border-emerald-800"
                }`}>
                  {failureEvent ? "INTERCEPTED & BLOCKED" : "VALIDATION PASSED"}
                </span>
              </div>

              {failureEvent ? (
                <div className="space-y-2 text-xs font-mono">
                  <p className="text-rose-300 leading-relaxed font-sans">
                    🚨 <strong>Pre-Execution Guardrail Triggered:</strong> The agent attempted to invoke the scan tool with an illegal, unwhitelisted parameter:
                  </p>
                  <div className="bg-rose-950/50 p-2 rounded-lg border border-rose-800 text-rose-200">
                    <span className="text-rose-400 font-bold block mb-0.5">Unknown Parameter Blocked:</span>
                    <code>{traceData.failure.invalid_argument || "force_gas"}</code>
                  </div>
                  <p className="text-slate-400 text-[11px] font-sans">
                    <strong>Why this matters:</strong> In production, unvalidated AI tool calls can corrupt databases or trigger malicious exploits. The Shield killed the call <em>before</em> it ran!
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-300 leading-relaxed">
                  ✅ All tool arguments strictly adhere to the registered JSON Schema for <code className="text-indigo-300">{traceData.finding.tool_used}</code>. Execution permit issued.
                </p>
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* STEP 4: Self-Correction Loop (FailureInterceptor - Piece 2) */}
          {/* ========================================================= */}
          {failureEvent && (
            <div className="flex items-start space-x-3">
              <div className="h-8 w-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 text-xs font-bold shrink-0">
                🔄
              </div>
              <div className="max-w-2xl bg-[#09151c] border border-emerald-800/80 rounded-2xl rounded-tl-sm p-4 shadow">
                <div className="flex items-center justify-between text-xs pb-1.5 mb-2 border-b border-emerald-900/60">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-emerald-300">Self-Correction Agent</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      Piece 2: failure_interceptor.py
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">
                    ✓ Self-Healed
                  </span>
                </div>

                <p className="text-xs text-emerald-200/90 leading-relaxed mb-2 font-sans">
                  The agent did <strong>not</strong> crash. FailureInterceptor generated a structured correction payload explaining the schema error and prompted the LLM to self-heal.
                </p>

                <div className="bg-slate-950/80 p-2.5 rounded-lg border border-emerald-900/40 text-xs font-mono">
                  <span className="text-emerald-400 font-bold block mb-1">&gt; Recovery Actions Taken:</span>
                  <ul className="space-y-1 text-slate-300 text-[11px] list-disc list-inside">
                    <li>Removed invalid parameter <code className="text-rose-400">{traceData.failure.invalid_argument || "force_gas"}</code></li>
                    <li>Re-aligned tool call with schema: <code className="text-emerald-300">['code_snippet', 'confidence_threshold']</code></li>
                    <li>Resumed pipeline automatically with 0 human intervention</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 5: ExecutionTracer Agent & Finding (Piece 4)          */}
          {/* ========================================================= */}
          <div className="flex items-start space-x-3">
            <div className="h-8 w-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 text-xs font-bold shrink-0">
              📊
            </div>
            <div className="max-w-2xl bg-slate-900/90 border border-slate-800 rounded-2xl rounded-tl-sm p-4 shadow space-y-3">
              <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-cyan-300">Glass-Box Tracer</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                    Piece 4: tracer.py
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  audit_trace.json
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Scan executed and verified. Every single action was committed to the Directed Acyclic Graph (DAG) with 11 verifiable fields.
              </p>

              {/* Finding Card */}
              <div className="bg-[#140e16] border border-rose-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-tight">
                    {traceData.finding.title}
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700">
                    {traceData.finding.severity}
                  </span>
                </div>

                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  {traceData.finding.description}
                </p>

                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 text-xs font-mono">
                  <span className="text-emerald-400 font-bold block mb-1 text-[11px] uppercase tracking-wider">
                    Remediation:
                  </span>
                  <code className="text-slate-200 text-[11px]">
                    {traceData.finding.remediation}
                  </code>
                </div>
              </div>

              {/* Telemetry bar */}
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800/60">
                <span>Latency: {traceData.metrics.totalLatencyMs}</span>
                <span>Tokens: {traceData.metrics.inputTokens} in / {traceData.metrics.outputTokens} out</span>
                <span className="text-emerald-400 font-bold">Cost: {traceData.metrics.estimatedCost}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. BOTTOM INTERACTIVE PROMPT / CODE INPUT (Teamily AI)    */}
        {/* ========================================================= */}
        <div className="p-4 border-t border-slate-800/80 bg-[#080d17] shrink-0">
          <form onSubmit={handleSubmit} className="space-y-2.5 max-w-4xl mx-auto">
            {/* Quick chips & Guardrail toggle */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center space-x-1.5">
                <span className="text-[11px] text-slate-500 font-mono">Quick Test:</span>
                <button
                  type="button"
                  onClick={() => handleSelectPreset("sqli")}
                  className={`px-2 py-0.5 rounded-full text-[11px] font-mono transition-colors ${
                    activeTab === "sqli" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  ⚡ SQLi
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset("secrets")}
                  className={`px-2 py-0.5 rounded-full text-[11px] font-mono transition-colors ${
                    activeTab === "secrets" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  🔑 AWS Secret
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset("clean")}
                  className={`px-2 py-0.5 rounded-full text-[11px] font-mono transition-colors ${
                    activeTab === "clean" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  ✓ Clean Code
                </button>
              </div>

              {/* Shield Failure Simulation Toggle */}
              <label className="flex items-center space-x-2 cursor-pointer bg-slate-900 border border-slate-800 hover:border-slate-700 px-2.5 py-1 rounded-full text-[11px] font-mono text-slate-300">
                <input
                  type="checkbox"
                  checked={triggerFailure}
                  onChange={(e) => setTriggerFailure(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                />
                <span>Test Shield Guardrail (Inject Invalid Parameter)</span>
              </label>
            </div>

            {/* Main Input Textarea & Send Button */}
            <div className="relative flex items-center bg-slate-900/90 border border-slate-800 rounded-2xl focus-within:border-indigo-500 shadow-inner p-2">
              <textarea
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="Ask any question or paste Python code to audit live in real time..."
                rows={3}
                className="w-full bg-transparent border-none outline-none text-xs font-mono text-slate-100 placeholder-slate-500 resize-none pr-24 pl-2"
              />

              <button
                type="submit"
                disabled={isRunning || !inputCode.trim()}
                className="absolute right-3 bottom-3 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-lg flex items-center space-x-1.5 shrink-0"
              >
                {isRunning ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <span>Auditing...</span>
                  </>
                ) : (
                  <>
                    <span>Run Audit</span>
                    <span>➔</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
