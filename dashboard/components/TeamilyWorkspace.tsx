"use client";

import React, { useState } from "react";
import { NormalizedTrace, TraceEvent } from "@/lib/trace";
import AgentAvatar from "./AgentAvatars";
import DatadogObservabilityView from "./DatadogObservabilityView";

interface TeamilyWorkspaceProps {
  traceData: NormalizedTrace;
  onRunCustomAudit: (code: string, triggerFailure: boolean) => Promise<void>;
  isRunning: boolean;
  onToggleTechnicalView?: () => void;
  onInspectEvent?: (event: TraceEvent) => void;
}

export interface AgentRole {
  id: string;
  name: string;
  avatarType: "orchestrator" | "shield" | "healer" | "context" | "tracer" | "datadog" | "pentester" | "architect" | "compliance" | "custom";
  description: string;
  systemRole: string;
  isActiveInChat: boolean;
  isBuiltIn?: boolean;
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

const INITIAL_ROLES: AgentRole[] = [
  {
    id: "orchestrator",
    name: "VulnSentry Lead",
    avatarType: "orchestrator",
    description: "Autonomous SOC Orchestrator & Synthesis",
    systemRole: "Lead security architect synthesizing multi-agent findings into verifiable reports.",
    isActiveInChat: true,
    isBuiltIn: true,
  },
  {
    id: "shield",
    name: "The Shield",
    avatarType: "shield",
    description: "tool_validator.py • Schema Guardrail",
    systemRole: "Strict schema validator ensuring tools only execute with allowed parameters.",
    isActiveInChat: true,
    isBuiltIn: true,
  },
  {
    id: "healer",
    name: "Self-Healer",
    avatarType: "healer",
    description: "failure_interceptor.py • Auto-Recovery",
    systemRole: "Self-correction loop catching schema exceptions and auto-correcting parameters.",
    isActiveInChat: true,
    isBuiltIn: true,
  },
  {
    id: "datadog",
    name: "Datadog APM Agent",
    avatarType: "datadog",
    description: "dd-trace • Spans & DogStatsD Metrics",
    systemRole: "Datadog APM observability agent tracking flame graph spans, latency, and SIEM signals.",
    isActiveInChat: true,
    isBuiltIn: true,
  },
  {
    id: "pentester",
    name: "Red Team Pentester",
    avatarType: "pentester",
    description: "Exploit & Injection Payload Specialist",
    systemRole: "Offensive security specialist finding attack vectors and payload bypasses.",
    isActiveInChat: false,
  },
  {
    id: "architect",
    name: "Cloud Architect",
    avatarType: "architect",
    description: "AWS / Cloud IAM & Credential Guard",
    systemRole: "Cloud architect evaluating IAM boundaries and secret storage.",
    isActiveInChat: false,
  },
  {
    id: "compliance",
    name: "Compliance Auditor",
    avatarType: "compliance",
    description: "SOC2, HIPAA & Data Governance",
    systemRole: "Compliance specialist verifying data handling and security governance.",
    isActiveInChat: false,
  },
  {
    id: "context",
    name: "Context Optimizer",
    avatarType: "context",
    description: "context_manager.py • Token Compressor",
    systemRole: "Token manager pruning non-security conversational turns.",
    isActiveInChat: false,
    isBuiltIn: true,
  },
  {
    id: "tracer",
    name: "Glass-Box Tracer",
    avatarType: "tracer",
    description: "tracer.py • 11-Field DAG Telemetry",
    systemRole: "Telemetry engineer maintaining verifiable DAG provenance.",
    isActiveInChat: false,
    isBuiltIn: true,
  },
];

export default function TeamilyWorkspace({
  traceData,
  onRunCustomAudit,
  isRunning,
  onToggleTechnicalView,
  onInspectEvent,
}: TeamilyWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<"team" | "datadog" | "shield" | "healer" | "context" | "tracer">("team");
  const [roles, setRoles] = useState<AgentRole[]>(INITIAL_ROLES);
  const [inputCode, setInputCode] = useState(PRESET_CODE.sqli);
  const [submittedCode, setSubmittedCode] = useState(PRESET_CODE.sqli);
  const [triggerFailure, setTriggerFailure] = useState(true);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [roleNotice, setRoleNotice] = useState<string | null>(null);

  const [geminiMessage, setGeminiMessage] = useState<string>(
    "Jeevan, I'm the VulnSentry Lead AI Agent powered by Gemini 3.6 Flash. I'm actively monitoring your audit pipeline alongside our active 4-agent chat chamber and Datadog APM."
  );
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);

  const activeRolesCount = roles.filter((r) => r.isActiveInChat).length;
  const activeRoles = roles.filter((r) => r.isActiveInChat);

  // Toggle active status of a role (strict max 4 limit)
  const handleToggleRoleActive = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRoles((prev) => {
      const target = prev.find((r) => r.id === id);
      if (!target) return prev;
      if (target.isActiveInChat) {
        const count = prev.filter((r) => r.isActiveInChat).length;
        if (count <= 1) {
          setRoleNotice("At least 1 agent must remain active in the chat chamber.");
          setTimeout(() => setRoleNotice(null), 3000);
          return prev;
        }
        return prev.map((r) => (r.id === id ? { ...r, isActiveInChat: false } : r));
      } else {
        const count = prev.filter((r) => r.isActiveInChat).length;
        if (count >= 4) {
          setRoleNotice("Maximum 4 roles can be active in chat at a time! Deactivate one role first.");
          setTimeout(() => setRoleNotice(null), 4000);
          return prev;
        }
        return prev.map((r) => (r.id === id ? { ...r, isActiveInChat: true } : r));
      }
    });
  };

  // Create custom agent (max 10 in team roster)
  const handleCreateRole = (name: string, desc: string) => {
    if (!name.trim()) return;
    if (roles.length >= 10) {
      setRoleNotice("Teams roster is full (Maximum 10 roles reached).");
      setTimeout(() => setRoleNotice(null), 4000);
      return;
    }
    const cleanName = name.trim().replace(/^@/, "").replace(/^\//, "");
    const count = roles.filter((r) => r.isActiveInChat).length;
    const canActivate = count < 4;
    const newRole: AgentRole = {
      id: `custom-${Date.now()}`,
      name: cleanName,
      avatarType: "custom",
      description: desc.trim() || `Specialist in ${cleanName}`,
      systemRole: desc.trim() || `Security specialist focusing on ${cleanName}`,
      isActiveInChat: canActivate,
    };
    setRoles((prev) => [...prev, newRole]);
    setGeminiMessage(
      `✨ Role Agent '${cleanName}' created! ${
        canActivate
          ? `Activated in the chat chamber (Slot ${count + 1}/4). Ready to advise on ${cleanName}!`
          : "Added to team roster on standby. Toggle [Active] to swap into the chat chamber."
      }`
    );
    setRoleNotice(`Created agent '${cleanName}'!`);
    setTimeout(() => setRoleNotice(null), 3000);
    setShowRoleModal(false);
    setNewRoleName("");
    setNewRoleDesc("");
  };

  // Fetch live commentary from Gemini 3.6 Flash
  const fetchGeminiCommentary = async (codeToAudit: string, hasFail: boolean, customPrompt?: string) => {
    setIsGeminiLoading(true);
    try {
      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: customPrompt || "",
          code: codeToAudit,
          finding: traceData.finding,
          shieldStatus: hasFail ? "blocked" : "passed",
          hasFailure: hasFail,
          contextSavings: traceData.context?.reduction_percentage || "42.8%",
          activeRoles: activeRoles.map((r) => ({ name: r.name, role: r.systemRole, description: r.description })),
          speakerRole: activeRoles[0] || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setGeminiMessage(data.message);
        }
      }
    } catch (err) {
      console.warn("Gemini commentary error:", err);
    } finally {
      setIsGeminiLoading(false);
    }
  };

  const handlePresetSelect = async (type: "sqli" | "secrets" | "clean") => {
    setActiveTab("team");
    const code = PRESET_CODE[type];
    setInputCode(code);
    setSubmittedCode(code);
    await onRunCustomAudit(code, triggerFailure);
    fetchGeminiCommentary(code, triggerFailure);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim() || isRunning) return;

    // Check for /role command
    if (inputCode.trim().startsWith("/role")) {
      const rest = inputCode.trim().slice(5).trim();
      const parts = rest.split(" ");
      const roleName = parts[0] || "Specialist";
      const roleDesc = parts.slice(1).join(" ") || `Specialized security advisor for ${roleName}`;
      handleCreateRole(roleName, roleDesc);
      setInputCode("");
      return;
    }

    const code = inputCode;
    setSubmittedCode(code);
    await onRunCustomAudit(code, triggerFailure);
    fetchGeminiCommentary(code, triggerFailure, code);
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
          {/* Teamily Style Brand Logo */}
          <div
            onClick={() => setActiveTab("team")}
            className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#00c968] to-[#059669] flex items-center justify-center text-white shadow-md shadow-emerald-500/20 cursor-pointer"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
            </svg>
          </div>

          {/* Nav Icons Stack */}
          <div className="flex flex-col items-center space-y-4 text-slate-400">
            {/* Chat (Active with green highlight) */}
            <button
              onClick={() => setActiveTab("team")}
              title="Agent Team Chat"
              className={`p-2.5 rounded-xl transition-colors relative shadow-2xs ${
                activeTab === "team"
                  ? "bg-[#eaf8f0] text-[#00c968]"
                  : "hover:bg-slate-100 hover:text-slate-600"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#00c968]"></span>
            </button>

            {/* Datadog APM Nav Icon */}
            <button
              onClick={() => setActiveTab("datadog")}
              title="Datadog APM & LLM Observability"
              className={`p-2.5 rounded-xl transition-colors relative ${
                activeTab === "datadog"
                  ? "bg-purple-100 text-[#632ca6]"
                  : "hover:bg-purple-50 hover:text-purple-600 text-purple-400"
              }`}
            >
              <span className="text-base">🐕</span>
              {activeTab === "datadog" && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#a855f7] animate-pulse"></span>
              )}
            </button>

            {/* Add Role Agent Button */}
            <button
              onClick={() => setShowRoleModal(true)}
              title="Create Custom Agent (/role)"
              className="p-2.5 rounded-xl hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
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
        <AgentAvatar type="user" size="sm" />
      </nav>

      {/* ========================================================================= */}
      {/* 2. CHANNELS / AGENTS LIST (Teamily AI Middle Column)                      */}
      {/* ========================================================================= */}
      <aside className="w-80 bg-[#fafcfb] border-r border-slate-200/80 flex flex-col shrink-0">
        {/* Search Header */}
        <div className="p-3.5 flex items-center space-x-2 border-b border-slate-100">
          <div className="flex-1 bg-white border border-slate-200/90 rounded-xl px-3 py-1.5 flex items-center text-xs text-slate-400 shadow-2xs">
            <svg className="w-3.5 h-3.5 mr-2 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search agents or threads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-slate-700 placeholder-slate-400 w-full"
            />
          </div>

          <button
            onClick={() => setShowRoleModal(true)}
            title="Create Custom Role Agent"
            className="h-8 px-2 rounded-xl bg-[#00c968] hover:bg-[#00b05b] text-white flex items-center justify-center shadow-2xs transition-colors font-bold text-xs space-x-1"
          >
            <span>+</span>
            <span>Role</span>
          </button>
        </div>

        {/* Notification Toast Banner */}
        {roleNotice && (
          <div className="mx-2 mt-2 p-2 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] rounded-xl flex items-center justify-between font-medium">
            <span>{roleNotice}</span>
            <button onClick={() => setRoleNotice(null)} className="font-bold text-amber-600">&times;</button>
          </div>
        )}

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {/* Main Agent Channel: VulnSentry Team (Active) */}
          <div
            onClick={() => setActiveTab("team")}
            className={`p-2.5 rounded-2xl cursor-pointer transition-all flex items-center space-x-3 ${
              activeTab === "team"
                ? "bg-[#eaf8f0] text-slate-900 shadow-2xs border border-emerald-200/60"
                : "hover:bg-slate-100 text-slate-700 border border-transparent"
            }`}
          >
            <AgentAvatar type="orchestrator" size="md" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 truncate">VulnSentry Team</span>
                <span className="text-[10px] text-emerald-600 font-mono font-bold">Chat Active</span>
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
                Gemini 3.6 Flash &bull; 4-Agent Chamber
              </p>
            </div>
          </div>

          {/* Datadog APM & LLM Obs Channel */}
          <div
            onClick={() => setActiveTab("datadog")}
            className={`p-2.5 rounded-2xl cursor-pointer transition-all flex items-center space-x-3 ${
              activeTab === "datadog"
                ? "bg-[#f3ebff] text-slate-900 shadow-2xs border border-purple-300"
                : "hover:bg-purple-50/60 text-slate-700 border border-transparent"
            }`}
          >
            <AgentAvatar type="datadog" size="md" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 truncate">Datadog APM & Obs</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-100 text-[#632ca6] font-mono font-bold">DD APM</span>
              </div>
              <p className="text-[11px] text-purple-700 truncate mt-0.5 font-medium">
                Waterfall Spans &bull; SIEM &bull; DogStatsD
              </p>
            </div>
          </div>

          {/* Section: Active Chat Chamber Status */}
          <div className="px-3 pt-3 pb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
            <span>Team Roster ({roles.length}/10)</span>
            <span className="text-emerald-700 font-semibold">{activeRolesCount}/4 in Chat</span>
          </div>

          {/* List of All Agent Roles with Toggle */}
          <div className="space-y-1">
            {roles.map((role) => (
              <div
                key={role.id}
                className="p-2 rounded-xl bg-white border border-slate-100 hover:border-slate-200 flex items-center justify-between transition-all"
              >
                <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                  <AgentAvatar type={role.avatarType} label={role.name} size="sm" showStatus={role.isActiveInChat} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-800 truncate">{role.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{role.description}</div>
                  </div>
                </div>

                {/* Active in Chat Chamber Toggle Button */}
                <button
                  onClick={(e) => handleToggleRoleActive(role.id, e)}
                  title={role.isActiveInChat ? "Active in Chat Chamber (Click to deactivate)" : "Click to activate in Chat Chamber (Max 4)"}
                  className={`text-[9px] font-bold px-2 py-0.8 rounded-full transition-all shrink-0 ml-1.5 ${
                    role.isActiveInChat
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200"
                  }`}
                >
                  {role.isActiveInChat ? "Active" : "Standby"}
                </button>
              </div>
            ))}
          </div>

          {/* Sample Scenarios */}
          <div className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
            Audit Scenarios
          </div>

          <div
            onClick={() => handlePresetSelect("sqli")}
            className="p-2 rounded-xl text-xs hover:bg-slate-100 cursor-pointer flex items-center justify-between text-slate-600 transition-colors"
          >
            <span>🔴 SQL Injection (CWE-89)</span>
            <span className="h-2 w-2 rounded-full bg-rose-500"></span>
          </div>

          <div
            onClick={() => handlePresetSelect("secrets")}
            className="p-2 rounded-xl text-xs hover:bg-slate-100 cursor-pointer flex items-center justify-between text-slate-600 transition-colors"
          >
            <span>🟠 AWS Secret Key Leak</span>
            <span className="h-2 w-2 rounded-full bg-amber-500"></span>
          </div>

          <div
            onClick={() => handlePresetSelect("clean")}
            className="p-2 rounded-xl text-xs hover:bg-slate-100 cursor-pointer flex items-center justify-between text-slate-600 transition-colors"
          >
            <span>🟢 Parameterized Query</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
          </div>
        </div>

        {/* Footer Status */}
        <div className="p-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between bg-white">
          <span className="flex items-center space-x-1.5">
            <span className="h-2 w-2 rounded-full bg-[#00c968] animate-pulse"></span>
            <span className="font-semibold text-emerald-700">Gemini 3.6 Flash</span>
          </span>
          <span className="font-mono text-[10px] font-bold text-slate-700">{traceData.metrics.estimatedCost}</span>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 3. MAIN AREA: Either Datadog APM View or Teamily Chat View                */}
      {/* ========================================================================= */}
      {activeTab === "datadog" ? (
        <DatadogObservabilityView traceData={traceData} onInspectEvent={onInspectEvent} />
      ) : (
        <main className="flex-1 bg-white flex flex-col min-w-0 overflow-hidden">
          {/* Top Header Bar */}
          <header className="h-14 border-b border-slate-100 px-6 flex items-center justify-between bg-white shrink-0 select-none">
            <div className="flex items-center space-x-3">
              <AgentAvatar type="orchestrator" size="md" />
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-sm font-bold text-slate-900">VulnSentry Multi-Agent SOC</h1>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#eaf8f0] text-[#00c968] border border-emerald-200">
                    Chamber: {activeRolesCount}/4 Active
                  </span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                    Owner: Jeevan &bull; Akash
                  </span>
                </div>
              </div>
            </div>

            {/* Active Chamber Avatars Stack */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center -space-x-1.5 mr-2">
                {activeRoles.map((r) => (
                  <div key={r.id} title={`${r.name} (${r.description})`}>
                    <AgentAvatar type={r.avatarType} label={r.name} size="sm" showStatus={false} />
                  </div>
                ))}
              </div>

              <button
                onClick={handleCopyTrace}
                className="text-xs px-3 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors font-mono flex items-center space-x-1"
              >
                <span>{copied ? "✓ Copied" : "Copy Trace JSON"}</span>
              </button>

              <button
                onClick={() => setActiveTab("datadog")}
                className="text-xs px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 transition-colors font-medium flex items-center space-x-1"
              >
                <span>🐕</span>
                <span>Datadog APM</span>
              </button>
            </div>
          </header>

          {/* Scrollable Conversation Stream */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* User Prompt Message */}
            <div className="flex items-start space-x-3">
              <AgentAvatar type="user" size="md" />
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

                {/* Active Agents Mention Tag */}
                <div className="mt-2 text-xs font-semibold text-[#00c968] flex items-center space-x-2">
                  {activeRoles.map((r, i) => (
                    <React.Fragment key={r.id}>
                      {i > 0 && <span className="text-slate-300">&bull;</span>}
                      <span>@{r.name}</span>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* GEMINI 3.6 FLASH LIVE AGENT INTERACTION BUBBLE                            */}
            {/* ========================================================================= */}
            <div className="flex items-start space-x-3">
              <AgentAvatar type="orchestrator" size="md" />
              <div className="flex-1 max-w-3xl space-y-1.5">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-900">VulnSentry Lead Co-Pilot</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 border border-emerald-300 font-mono flex items-center gap-1">
                    <span>✨</span>
                    <span>Gemini 3.6 Flash</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Chamber Response</span>
                </div>

                <div className="bg-gradient-to-br from-[#f0faf5] via-white to-[#e8f6ef] border border-emerald-200/90 rounded-2xl rounded-tl-sm p-4 text-xs text-slate-800 shadow-xs space-y-2">
                  {isGeminiLoading ? (
                    <div className="flex items-center space-x-2 text-emerald-700 font-mono text-xs py-1">
                      <div className="h-3.5 w-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Evaluating your code with your active agent team in real-time...</span>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-700 leading-relaxed font-sans font-medium whitespace-pre-wrap">
                      {geminiMessage}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* STRUCTURED TEAMILY AI AUDIT CARD (All 4 Pieces Verified)                  */}
            {/* ========================================================================= */}
            <div className="flex items-start space-x-3">
              <AgentAvatar type="shield" size="md" />
              <div className="flex-1 max-w-3xl space-y-4">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-900">Deterministic Guardrail Stream</span>
                  <span className="text-[10px] text-slate-400">Verifiable DAG</span>
                </div>

                {/* The Structured Card */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4 text-xs">
                  {/* Header Checkmark */}
                  <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-white shrink-0 ${
                      traceData.finding.vulnerability_detected ? "bg-rose-500" : "bg-[#00c968]"
                    }`}>
                      {traceData.finding.vulnerability_detected ? "!" : "✓"}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-xs">
                        {traceData.finding.vulnerability_detected
                          ? `Security Vulnerability Detected: ${traceData.finding.title}`
                          : "Security Audit Completed: Target Code is Clean & Secure!"}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        All 4 autonomous guardrails executed with zero unhandled exceptions.
                      </p>
                    </div>
                  </div>

                  {/* Section 1: Event Details */}
                  <div className="space-y-1">
                    <div className="font-bold text-slate-800 flex items-center space-x-1.5">
                      <span>📋</span>
                      <span>Event Details:</span>
                    </div>
                    <ul className="space-y-1 text-slate-600 pl-5 list-disc text-[11px] leading-relaxed">
                      <li>
                        Target: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-800">
                          {submittedCode.includes("def get_user_profile") ? "get_user_profile() [Python]" : "Custom Input Snippet"}
                        </code>
                      </li>
                      <li>
                        Status:{" "}
                        <span className={`font-bold px-1.5 py-0.2 rounded text-[10px] font-mono ${
                          traceData.finding.vulnerability_detected
                            ? "bg-rose-100 text-rose-700 border border-rose-200"
                            : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                        }`}>
                          {traceData.finding.vulnerability_detected ? "✗ VULNERABILITY FOUND" : "✓ SECURE / CLEAN"}
                        </span>
                      </li>
                      <li>
                        Verified Finding:{" "}
                        <strong className={traceData.finding.vulnerability_detected ? "text-rose-600" : "text-emerald-700 font-bold"}>
                          {traceData.finding.title}
                        </strong>
                      </li>
                      <li>
                        CWE ID: <code className="font-mono">{traceData.finding.cwe_id}</code> &bull; Severity:{" "}
                        <span className={`font-bold px-1 rounded text-[10px] font-mono ${
                          traceData.finding.severity === "CRITICAL" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"
                        }`}>
                          {traceData.finding.severity}
                        </span>
                      </li>
                      <li>Tool Executed: <code className="font-mono text-slate-700">{traceData.finding.tool_used}</code></li>
                    </ul>
                  </div>

                  {/* Section 2: Piece 1 (The Shield) & Piece 2 (Self-Correction) */}
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
                            {traceData.failure.invalid_argument || "force_gas"}
                          </code>.
                        </p>
                        <p className="text-rose-700 font-medium">
                          ✓ <strong>Shield Protection:</strong> Prevented unauthorized tool invocation before touching the system.
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-600">
                        ✅ Tool call arguments strictly verified against registered JSON schema.
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
                        🛡️ Recommended Automated Remediation:
                      </span>
                      <p className="text-[11px] text-slate-600">
                        {traceData.finding.remediation}
                      </p>
                      <div className="bg-slate-900 rounded-lg p-2.5 font-mono text-[10px] text-emerald-400 overflow-x-auto">
                        {PRESET_CODE.clean}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 text-[11px] text-emerald-800 font-medium">
                      ✓ <strong>SECURITY VERIFICATION PASSED:</strong> Parameterized query patterns validated against SQLi AST checks.
                    </div>
                  )}

                  {/* Footer Link */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-mono">📁 Verifiable Execution DAG: /audit_trace.json</span>
                    <button
                      onClick={handleCopyTrace}
                      className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                    >
                      View in JSON &rarr;
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Chat Input Bar with Quick Presets and /role command support */}
          <div className="border-t border-slate-100 p-4 bg-white shrink-0 space-y-2">
            {/* Quick Action Presets */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">Try Preset:</span>
                <button
                  type="button"
                  onClick={() => handlePresetSelect("sqli")}
                  className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors text-[11px] font-medium"
                >
                  ⚡ SQLi
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetSelect("secrets")}
                  className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors text-[11px] font-medium"
                >
                  🔑 AWS Secret
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetSelect("clean")}
                  className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors text-[11px] font-medium"
                >
                  ✓ Clean Code
                </button>
                <button
                  type="button"
                  onClick={() => setShowRoleModal(true)}
                  className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors text-[11px] font-semibold flex items-center gap-1"
                >
                  <span>+</span>
                  <span>/role</span>
                </button>
              </div>

              {/* Guardrail Self-Healing Toggle */}
              <label className="flex items-center space-x-2 text-[11px] text-slate-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={triggerFailure}
                  onChange={(e) => setTriggerFailure(e.target.checked)}
                  className="rounded text-[#00c968] focus:ring-[#00c968] h-3.5 w-3.5 border-slate-300"
                />
                <span className="font-medium">Test Guardrail Self-Healing (Simulate Tool Schema Breach)</span>
              </label>
            </div>

            {/* Input Capsule Box */}
            <form onSubmit={handleSend} className="bg-[#fafcfb] border border-slate-200 rounded-2xl p-2.5 flex items-end shadow-2xs">
              <textarea
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="Try '/role Pentester Exploit specialist' or paste Python code to audit..."
                rows={2}
                className="flex-1 bg-transparent border-none outline-none text-xs text-slate-800 placeholder-slate-400 resize-none font-sans leading-relaxed"
              />

              {/* Action Icons & Circular Send Button */}
              <div className="flex items-center space-x-2 ml-2 shrink-0">
                <button
                  type="submit"
                  disabled={isRunning || isGeminiLoading || !inputCode.trim()}
                  className="h-9 w-9 rounded-full bg-[#00c968] hover:bg-[#00b05b] disabled:opacity-50 text-white flex items-center justify-center shadow-sm shadow-emerald-200 transition-transform active:scale-95"
                >
                  {isRunning || isGeminiLoading ? (
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 translate-x-0.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                  )}
                </button>
              </div>
            </form>
          </div>
        </main>
      )}

      {/* ========================================================================= */}
      {/* 4. CREATE ROLE MODAL (/role <Name> <Goal>)                                */}
      {/* ========================================================================= */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <AgentAvatar type="custom" label={newRoleName || "AI"} size="sm" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Create AI Agent Role</h3>
                  <p className="text-[11px] text-slate-400">Team Roster limit: 10 roles &bull; Max 4 active in chat</p>
                </div>
              </div>
              <button
                onClick={() => setShowRoleModal(false)}
                className="h-7 w-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Role Name (e.g. Pentester, CloudArchitect, Compliance)
                </label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g. RedTeamPentester"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Role Goal & Specialty
                </label>
                <textarea
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder="Describe what this agent specializes in and how it should give security suggestions..."
                  rows={3}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 text-slate-800 resize-none"
                />
              </div>

              <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-100">
                💡 <strong>Tip:</strong> You can also create agents directly in the chat bar anytime by typing: <br />
                <code className="text-emerald-700 font-mono font-bold">/role &lt;RoleName&gt; &lt;Description&gt;</code>
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRoleModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleCreateRole(newRoleName, newRoleDesc)}
                disabled={!newRoleName.trim()}
                className="px-4 py-2 rounded-xl bg-[#00c968] hover:bg-[#00b05b] disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-all"
              >
                Create Agent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
