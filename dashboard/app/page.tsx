"use client";

import React, { useEffect, useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import AgentChatWorkspace from "@/components/AgentChatWorkspace";
import SecurityFindingsPanel from "@/components/SecurityFindingsPanel";
import GlassBoxWorkflow from "@/components/GlassBoxWorkflow";
import FailureDemoCard from "@/components/FailureDemoCard";
import ContextEngineeringCard from "@/components/ContextEngineeringCard";
import ExecutionTrace from "@/components/ExecutionTrace";
import EventDetailDrawer from "@/components/EventDetailDrawer";
import CodeInputPanel from "@/components/CodeInputPanel";
import RunMetrics from "@/components/RunMetrics";
import RunHistory from "@/components/RunHistory";
import {
  normalizeTrace,
  calculateMetrics,
  extractSecurityFinding,
  extractFailureDetail,
  NormalizedTrace,
  TraceEvent,
} from "@/lib/trace";

export default function DashboardPage() {
  const [traceData, setTraceData] = useState<NormalizedTrace | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<TraceEvent | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRunningAudit, setIsRunningAudit] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"agents" | "soc">("agents");

  // Load audit trace from API
  const fetchTrace = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/trace");
      if (!res.ok) {
        throw new Error(`Failed to load audit trace (${res.status}: ${res.statusText})`);
      }
      const raw = await res.json();
      const normalized = normalizeTrace(raw);
      setTraceData(normalized);

      // Default selected event: failure event if present, else first event
      if (normalized.events.length > 0) {
        const failureEv = normalized.events.find(
          (e) => e.status === "FAILURE" || e.event_type === "FAILURE_DETECTED"
        );
        setSelectedEvent(failureEv || normalized.events[0]);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to load audit trace from audit_trace.json");
    } finally {
      setIsLoading(false);
    }
  };

  // Run audit script via API
  const handleRunAudit = async () => {
    setIsRunningAudit(true);
    try {
      const res = await fetch("/api/run-audit", { method: "POST" });
      if (!res.ok) {
        throw new Error(`Audit execution failed (${res.status})`);
      }
      const raw = await res.json();
      const normalized = normalizeTrace(raw);
      setTraceData(normalized);

      if (normalized.events.length > 0) {
        const failureEv = normalized.events.find(
          (e) => e.status === "FAILURE" || e.event_type === "FAILURE_DETECTED"
        );
        setSelectedEvent(failureEv || normalized.events[0]);
      }
    } catch (err: any) {
      console.error("Run audit error:", err);
      fetchTrace();
    } finally {
      setIsRunningAudit(false);
    }
  };

  // Run custom prompt/code audit in real-time
  const handleRunCustomAudit = async (code: string, triggerFailure: boolean) => {
    setIsRunningAudit(true);
    try {
      const res = await fetch("/api/run-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          trigger_demo_failure: triggerFailure,
        }),
      });
      if (!res.ok) {
        throw new Error(`Interactive audit failed (${res.status})`);
      }
      const raw = await res.json();
      const normalized = normalizeTrace(raw);
      setTraceData(normalized);

      if (normalized.events.length > 0) {
        const failureEv = normalized.events.find(
          (e) => e.status === "FAILURE" || e.event_type === "FAILURE_DETECTED"
        );
        setSelectedEvent(failureEv || normalized.events[0]);
      }
    } catch (err: any) {
      console.error("Custom audit error:", err);
      alert("Failed to run custom audit: " + (err?.message || "Unknown error"));
    } finally {
      setIsRunningAudit(false);
    }
  };

  useEffect(() => {
    fetchTrace();
  }, []);

  // Compute active slice based on selected run group
  const activeRunGroup = useMemo(() => {
    if (!traceData) return null;
    return traceData.runGroups.find((g) => g.id === selectedGroupId) || traceData.runGroups[0];
  }, [traceData, selectedGroupId]);

  const activeEvents = useMemo(() => {
    if (!activeRunGroup) return traceData?.events || [];
    return activeRunGroup.events;
  }, [activeRunGroup, traceData]);

  const activeMetrics = useMemo(() => {
    if (!traceData) return null;
    if (selectedGroupId === "all") return traceData.metrics;
    return calculateMetrics(activeEvents);
  }, [traceData, selectedGroupId, activeEvents]);

  const activeFinding = useMemo(() => {
    if (!traceData) return null;
    if (selectedGroupId === "all") return traceData.finding;
    return extractSecurityFinding(activeEvents);
  }, [traceData, selectedGroupId, activeEvents]);

  const activeFailure = useMemo(() => {
    if (!traceData) return null;
    if (selectedGroupId === "all") return traceData.failure;
    return extractFailureDetail(activeEvents);
  }, [traceData, selectedGroupId, activeEvents]);

  // Extract code snippet from the first event or metadata
  const auditedCodeSnippet = useMemo(() => {
    if (!traceData || traceData.events.length === 0) return "";
    for (const ev of traceData.events) {
      if (ev.input?.code_snippet) return String(ev.input.code_snippet);
    }
    return "";
  }, [traceData]);

  // Group switch handler
  const handleSelectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    if (!traceData) return;
    const targetGroup = traceData.runGroups.find((g) => g.id === groupId);
    const eventsToUse = targetGroup ? targetGroup.events : traceData.events;
    if (eventsToUse.length > 0) {
      const failEv = eventsToUse.find(
        (e) => e.status === "FAILURE" || e.event_type === "FAILURE_DETECTED"
      );
      setSelectedEvent(failEv || eventsToUse[0]);
    }
  };

  // Loading Screen
  if (isLoading && !traceData) {
    return (
      <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center text-slate-300 font-mono">
        <div className="h-10 w-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <div className="text-sm font-bold text-white">Loading VulnSentry AI Agents...</div>
        <p className="text-xs text-slate-500 mt-1">Reading audit_trace.json and setting up guardrails</p>
      </div>
    );
  }

  // Error Screen
  if (error && !traceData) {
    return (
      <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center text-slate-300 p-6 font-mono">
        <div className="bg-[#120e18] border border-rose-800 rounded-2xl p-6 max-w-lg text-center shadow-2xl">
          <div className="text-rose-400 text-2xl mb-2">⚠</div>
          <h2 className="text-sm font-bold text-rose-300 uppercase tracking-wider mb-2">
            Failed to Load Execution Trace
          </h2>
          <p className="text-xs text-slate-400 mb-4 font-sans">{error}</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={fetchTrace}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold"
            >
              Retry
            </button>
            <button
              onClick={handleRunAudit}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700"
            >
              Execute python3 run_audit.py
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!traceData || !activeMetrics || !activeFinding || !activeFailure) return null;

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col selection:bg-emerald-900 selection:text-emerald-200">
      {/* 1. Top Navbar */}
      <Navbar
        runId={traceData.run_id}
        status={traceData.status}
        onRunAudit={handleRunAudit}
        isRunningAudit={isRunningAudit}
        selectedRunLabel={activeRunGroup?.label || "Full Trace"}
      />

      {/* Mode Switcher Bar */}
      <div className="bg-[#080d17] border-b border-slate-800/80 px-4 py-2">
        <div className="max-w-[1780px] mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode("agents")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                viewMode === "agents"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <span>💬</span>
              <span>AI Agents Workspace (Teamily AI View)</span>
            </button>

            <button
              onClick={() => setViewMode("soc")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                viewMode === "soc"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <span>🛡️</span>
              <span>SOC Glass-Box Telemetry (Dense View)</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center space-x-3 text-xs font-mono text-slate-400">
            <span className="flex items-center space-x-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
              <span>The Shield: Active</span>
            </span>
            <span className="text-slate-600">&bull;</span>
            <span>Self-Heal: Ready</span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-purple-400">42.8% Token Savings</span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 p-4 max-w-[1780px] mx-auto w-full">
        {/* ============================================================== */}
        {/* VIEW 1: Teamily AI Conversational Agent Workspace              */}
        {/* ============================================================== */}
        {viewMode === "agents" && (
          <AgentChatWorkspace
            traceData={traceData}
            onRunCustomAudit={handleRunCustomAudit}
            isRunning={isRunningAudit}
            onInspectEvent={(ev) => {
              setSelectedEvent(ev);
              setViewMode("soc");
            }}
          />
        )}

        {/* ============================================================== */}
        {/* VIEW 2: Dense SOC Glass-Box Telemetry Dashboard                */}
        {/* ============================================================== */}
        {viewMode === "soc" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* LEFT COLUMN: Security Findings, Glass-Box Workflow, Failure Demo */}
            <div className="lg:col-span-3 space-y-4">
              <SecurityFindingsPanel finding={activeFinding} />
              <GlassBoxWorkflow />
              <FailureDemoCard failure={activeFailure} />
              <ContextEngineeringCard context={traceData.context} />
            </div>

            {/* CENTER COLUMN: Execution Trace Timeline & Event Detail */}
            <div className="lg:col-span-6 space-y-4">
              <div className="min-h-[460px]">
                <ExecutionTrace
                  events={activeEvents}
                  selectedEventId={selectedEvent?.event_id || null}
                  onSelectEvent={(ev) => setSelectedEvent(ev)}
                />
              </div>

              <div className="min-h-[380px]">
                <EventDetailDrawer
                  event={selectedEvent}
                  onClose={() => setSelectedEvent(null)}
                />
              </div>

              <CodeInputPanel code={auditedCodeSnippet} />
            </div>

            {/* RIGHT COLUMN: SOC Telemetry Metrics & Run History */}
            <div className="lg:col-span-3 space-y-4">
              <RunMetrics metrics={activeMetrics} />
              <RunHistory
                runGroups={traceData.runGroups}
                selectedGroupId={selectedGroupId}
                onSelectGroup={handleSelectGroup}
              />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900/80 py-3 px-4 text-center text-[11px] text-slate-500 font-mono flex flex-col sm:flex-row items-center justify-between max-w-[1780px] mx-auto w-full">
        <div>
          VulnSentry &bull; Glass-Box Autonomous Security & Exploit Auditor
        </div>
        <div className="text-slate-600 mt-1 sm:mt-0">
          Deterministic Guardrails &bull; Pre-Execution Validation &bull; Zero Hallucinations
        </div>
      </footer>
    </div>
  );
}
