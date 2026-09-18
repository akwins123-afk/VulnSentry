"use client";

import React, { useState } from "react";
import AgentAvatar from "./AgentAvatars";

export interface RbacRole {
  id: string;
  name: string;
  description: string;
  isOwner?: boolean;
  permissions: {
    liveScan: boolean;
    simulateExploits: boolean;
    selfHealing: boolean;
    datadogExport: boolean;
    deepAstAudit: boolean;
    modifyPrompts: boolean;
  };
  lockdownMode: boolean;
}

export interface PromptingPersona {
  id: string;
  title: string;
  roleCommand: string;
  avatarType: "orchestrator" | "shield" | "healer" | "context" | "tracer" | "datadog" | "pentester" | "architect" | "compliance" | "rbac" | "user" | "custom";
  expertise: string;
  tone: string;
  systemPrompt: string;
}

export const DEFAULT_PERSONAS: PromptingPersona[] = [
  {
    id: "lead-architect",
    title: "Senior Security Architect",
    roleCommand: "Act as a Senior Security Architect",
    avatarType: "orchestrator",
    expertise: "Threat modeling, defense-in-depth, parameterized queries, and defensive architecture.",
    tone: "Authoritative, structured, and engineering-focused.",
    systemPrompt: "Act as a Senior Security Architect. Provide structured, high-level threat modeling, explain root cause vulnerabilities, and recommend enterprise architectural remediations.",
  },
  {
    id: "red-team",
    title: "Red Team Exploit Specialist",
    roleCommand: "Act as a Red Team Pentester",
    avatarType: "pentester",
    expertise: "SQL injection bypasses, authentication evasion, payload crafting (e.g. admin' OR '1'='1).",
    tone: "Aggressive, technical, offensive exploit perspective.",
    systemPrompt: "Act as an elite Red Team Pentester. Detail the exact exploit mechanics, how an attacker constructs injection payloads to bypass filters, and prove proof-of-concept risk.",
  },
  {
    id: "cloud-iam",
    title: "Cloud & IAM Security Engineer",
    roleCommand: "Act as a Cloud Security Engineer",
    avatarType: "architect",
    expertise: "AWS credential leakage, IAM least-privilege, STS tokens, S3 bucket security.",
    tone: "Precise, cloud-native, operational.",
    systemPrompt: "Act as a Senior Cloud Security Engineer. Audit code for credential exposure, AWS IAM misconfigurations, and environment isolation.",
  },
  {
    id: "compliance-officer",
    title: "SOC2 & Compliance Officer",
    roleCommand: "Act as a Compliance Auditor",
    avatarType: "compliance",
    expertise: "Audit trails, GDPR, HIPAA, SOC2 CC6 controls, and regulatory risk scoring.",
    tone: "Formal, regulatory, risk-focused.",
    systemPrompt: "Act as a SOC2 and ISO 27001 Compliance Auditor. Assess vulnerability impact against regulatory controls, audit logging provenance, and data retention standards.",
  },
];

interface RoleManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePersona: PromptingPersona;
  onSelectPersona: (persona: PromptingPersona) => void;
  lockdownMode: boolean;
  onToggleLockdown: (active: boolean) => void;
  onRoleCreated?: (name: string, prompt: string) => void;
}

export default function RoleManagementModal({
  isOpen,
  onClose,
  activePersona,
  onSelectPersona,
  lockdownMode,
  onToggleLockdown,
  onRoleCreated,
}: RoleManagementModalProps) {
  const [activeTab, setActiveTab] = useState<"prompting" | "rbac">("prompting");

  // RBAC Roles State
  const [rbacRoles, setRbacRoles] = useState<RbacRole[]>([
    {
      id: "owner",
      name: "Workspace Owner (Jeevan)",
      description: "Full administrative control over models, live scanning, and telemetry.",
      isOwner: true,
      permissions: {
        liveScan: true,
        simulateExploits: true,
        selfHealing: true,
        datadogExport: true,
        deepAstAudit: true,
        modifyPrompts: true,
      },
      lockdownMode: false,
    },
    {
      id: "auditor",
      name: "Security Analyst",
      description: "Can execute scans and inspect DAG traces; cannot modify schemas.",
      permissions: {
        liveScan: true,
        simulateExploits: true,
        selfHealing: true,
        datadogExport: true,
        deepAstAudit: true,
        modifyPrompts: false,
      },
      lockdownMode: false,
    },
    {
      id: "viewer",
      name: "Developer / Viewer",
      description: "Read-only access to audit reports; restricted from live scans.",
      permissions: {
        liveScan: false,
        simulateExploits: false,
        selfHealing: true,
        datadogExport: false,
        deepAstAudit: false,
        modifyPrompts: false,
      },
      lockdownMode: false,
    },
  ]);

  const [selectedRoleId, setSelectedRoleId] = useState("owner");
  const selectedRole = rbacRoles.find((r) => r.id === selectedRoleId) || rbacRoles[0];

  // Custom persona state
  const [customRoleName, setCustomRoleName] = useState("");
  const [customRolePrompt, setCustomRolePrompt] = useState("");

  if (!isOpen) return null;

  const handleTogglePermission = (key: keyof RbacRole["permissions"]) => {
    setRbacRoles((prev) =>
      prev.map((r) =>
        r.id === selectedRoleId
          ? {
              ...r,
              permissions: {
                ...r.permissions,
                [key]: !r.permissions[key],
              },
            }
          : r
      )
    );
  };

  const handleCreateCustomPersona = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRoleName.trim()) return;
    const newP: PromptingPersona = {
      id: `custom-${Date.now()}`,
      title: customRoleName.trim(),
      roleCommand: `Act as a ${customRoleName.trim()}`,
      avatarType: "custom",
      expertise: customRolePrompt.trim() || `Specialized in ${customRoleName.trim()}`,
      tone: "Custom specialist perspective",
      systemPrompt: customRolePrompt.trim() || `Act as a ${customRoleName.trim()}. Provide authoritative domain-specific analysis.`,
    };
    onSelectPersona(newP);
    if (onRoleCreated) {
      onRoleCreated(newP.title, newP.systemPrompt);
    }
    setCustomRoleName("");
    setCustomRolePrompt("");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-3">
            <AgentAvatar type="rbac" size="md" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Role-Based AI & Workspace Management</h2>
              <p className="text-xs text-slate-500">
                Configure Role-Based Prompting (Personas) and RBAC Feature Access
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 font-bold"
          >
            &times;
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-2xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab("prompting")}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center space-x-2 ${
              activeTab === "prompting"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>🎭</span>
            <span>1. Role-Based Prompting (Personas)</span>
          </button>
          <button
            onClick={() => setActiveTab("rbac")}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center space-x-2 ${
              activeTab === "rbac"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>🔐</span>
            <span>2. Workspace Access Control (RBAC)</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: ROLE-BASED PROMPTING (PERSONAS)                                    */}
        {/* ========================================================================= */}
        {activeTab === "prompting" && (
          <div className="space-y-4">
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3 text-xs text-emerald-900">
              <span className="font-bold">How it works:</span> Command the AI to &quot;Act as a [role]&quot; to adjust its tone, technical depth, and security guidance. Gemini 3.6 Flash dynamically speaks in this persona.
            </div>

            {/* Persona Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
              {DEFAULT_PERSONAS.map((persona) => {
                const isSelected = activePersona.id === persona.id;
                return (
                  <div
                    key={persona.id}
                    onClick={() => onSelectPersona(persona)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "bg-emerald-50/60 border-emerald-400 ring-2 ring-emerald-200"
                        : "bg-white hover:bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="flex items-start space-x-2.5">
                      <AgentAvatar type={persona.avatarType} size="sm" showStatus={false} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-800 truncate">{persona.title}</h4>
                          {isSelected && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-600 text-white font-bold">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">
                          {persona.expertise}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 text-[10px] font-mono text-emerald-700 font-semibold bg-white/80 px-2 py-0.5 rounded border border-slate-100">
                      /{persona.roleCommand}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Custom Persona Builder */}
            <form onSubmit={handleCreateCustomPersona} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-slate-800 block">
                Create Custom Persona (/role command)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={customRoleName}
                  onChange={(e) => setCustomRoleName(e.target.value)}
                  placeholder="e.g. DatabaseDBA, APIHacker"
                  className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="text"
                  value={customRolePrompt}
                  onChange={(e) => setCustomRolePrompt(e.target.value)}
                  placeholder="e.g. Focus on SQLite locking & injection"
                  className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                type="submit"
                disabled={!customRoleName.trim()}
                className="w-full py-1.5 rounded-xl bg-[#00c968] hover:bg-[#00b05b] disabled:opacity-50 text-white text-xs font-semibold shadow-xs"
              >
                + Activate Custom Persona
              </button>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ROLE-BASED ACCESS CONTROL (RBAC)                                   */}
        {/* ========================================================================= */}
        {activeTab === "rbac" && (
          <div className="space-y-4">
            {/* Lockdown Mode Banner */}
            <div className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
              lockdownMode
                ? "bg-rose-50 border-rose-300 text-rose-900"
                : "bg-slate-50 border-slate-200 text-slate-700"
            }`}>
              <div className="flex items-center space-x-2.5">
                <span className="text-lg">{lockdownMode ? "🔒" : "🛡️"}</span>
                <div>
                  <h4 className="text-xs font-bold">Lockdown Mode (Strict Security Guardrail)</h4>
                  <p className="text-[11px] text-slate-500">
                    Restricts live network-enabled APIs and enforces strict local schema verification.
                  </p>
                </div>
              </div>
              <button
                onClick={() => onToggleLockdown(!lockdownMode)}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
                  lockdownMode
                    ? "bg-rose-600 text-white"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {lockdownMode ? "ENABLED" : "DISABLED"}
              </button>
            </div>

            {/* Role Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-500">Select Role to Manage:</span>
              <div className="flex space-x-1">
                {rbacRoles.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRoleId(r.id)}
                    className={`text-xs px-2.5 py-1 rounded-xl font-medium transition-all ${
                      selectedRoleId === r.id
                        ? "bg-indigo-100 text-indigo-800 font-bold border border-indigo-200"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Permissions Matrix */}
            <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
              <div className="border-b border-slate-100 pb-2">
                <h4 className="text-xs font-bold text-slate-900">{selectedRole.name}</h4>
                <p className="text-[11px] text-slate-500">{selectedRole.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <label className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100/80 cursor-pointer">
                  <span className="text-slate-700 font-medium">Execute Live Security Scans</span>
                  <input
                    type="checkbox"
                    checked={selectedRole.permissions.liveScan}
                    onChange={() => handleTogglePermission("liveScan")}
                    className="h-4 w-4 rounded text-[#00c968] focus:ring-[#00c968]"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100/80 cursor-pointer">
                  <span className="text-slate-700 font-medium">Simulate Exploits & SQLi</span>
                  <input
                    type="checkbox"
                    checked={selectedRole.permissions.simulateExploits}
                    onChange={() => handleTogglePermission("simulateExploits")}
                    className="h-4 w-4 rounded text-[#00c968] focus:ring-[#00c968]"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100/80 cursor-pointer">
                  <span className="text-slate-700 font-medium">Rule 2 Autonomous Recovery</span>
                  <input
                    type="checkbox"
                    checked={selectedRole.permissions.selfHealing}
                    onChange={() => handleTogglePermission("selfHealing")}
                    className="h-4 w-4 rounded text-[#00c968] focus:ring-[#00c968]"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100/80 cursor-pointer">
                  <span className="text-slate-700 font-medium">Datadog APM / SIEM Export</span>
                  <input
                    type="checkbox"
                    checked={selectedRole.permissions.datadogExport}
                    onChange={() => handleTogglePermission("datadogExport")}
                    className="h-4 w-4 rounded text-[#00c968] focus:ring-[#00c968]"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100/80 cursor-pointer">
                  <span className="text-slate-700 font-medium">Deep AST Security Scanners</span>
                  <input
                    type="checkbox"
                    checked={selectedRole.permissions.deepAstAudit}
                    onChange={() => handleTogglePermission("deepAstAudit")}
                    className="h-4 w-4 rounded text-[#00c968] focus:ring-[#00c968]"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100/80 cursor-pointer">
                  <span className="text-slate-700 font-medium">Modify Guardrail Schemas</span>
                  <input
                    type="checkbox"
                    checked={selectedRole.permissions.modifyPrompts}
                    onChange={() => handleTogglePermission("modifyPrompts")}
                    className="h-4 w-4 rounded text-[#00c968] focus:ring-[#00c968]"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center space-x-2 text-slate-500">
            <span>Active Persona:</span>
            <span className="font-bold text-slate-900">{activePersona.title}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-xs"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
}
