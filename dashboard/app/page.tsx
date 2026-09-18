"use client";

import React, { useEffect, useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
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
      // Fallback reload
      fetchTrace();
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
        <div className="h-10 w-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <div className="text-sm font-bold text-white">Loading VulnSentry Telemetry...</div>
        <p className="text-xs text-slate-500 mt-1">Reading audit_trace.json and normalizing execution DAG</p>
      </div>
    );
  }

  // Error Screen
  if (error && !traceData) {
    return (
      <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center text-slate-300 p-6 font-mono">
        <div className="bg-[#120e18] border border-rose-800 rounded-lg p-6 max-w-lg text-center shadow-2xl">
          <div className="text-rose-400 text-2xl mb-2">⚠</div>
          <h2 className="text-sm font-bold text-rose-300 uppercase tracking-wider mb-2">
            Failed to Load Execution Trace
          </h2>
          <p className="text-xs text-slate-400 mb-4 font-sans">{error}</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={fetchTrace}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold"
            >
              Retry
            </button>
            <button
              onClick={handleRunAudit}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold border border-slate-700"
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
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col selection:bg-indigo-900 selection:text-indigo-200">
      {/* 1. Top SOC Navbar */}
      <Navbar
        runId={traceData.run_id}
        status={traceData.status}
        onRunAudit={handleRunAudit}
        isRunningAudit={isRunningAudit}
        selectedRunLabel={activeRunGroup?.label || "Full Trace"}
      />

      {/* 2. Main 3-Column Glass-Box Workspace */}
      <main className="flex-1 p-4 sm:p-5 max-w-[1780px] mx-auto w-full space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* ============================================================== */}
          {/* LEFT COLUMN: Security Findings, Glass-Box Workflow, Failure Demo */}
          {/* ============================================================== */}
          <div className="lg:col-span-3 space-y-4">
            {/* Security Findings Panel (CWE-89) */}
            <SecurityFindingsPanel finding={activeFinding} />

            {/* Why Did This Run Happen? Glass Box workflow */}
            <GlassBoxWorkflow />

            {/* Failure Demonstration (Blocked force_gas & recovery) */}
            <FailureDemoCard failure={activeFailure} />

            {/* Context Engineering */}
            <ContextEngineeringCard context={traceData.context} />
          </div>

          {/* ============================================================== */}
          {/* CENTER COLUMN: Execution Trace Timeline & Event Inspection     */}
          {/* ============================================================== */}
          <div className="lg:col-span-6 space-y-4">
            {/* Execution Trace Timeline (Clickable events, filters, search) */}
            <div className="min-h-[460px]">
              <ExecutionTrace
                events={activeEvents}
                selectedEventId={selectedEvent?.event_id || null}
                onSelectEvent={(ev) => setSelectedEvent(ev)}
              />
            </div>

            {/* Event Detail Drawer / Telemetry Panel */}
            <div className="min-h-[380px]">
              <EventDetailDrawer
                event={selectedEvent}
                onClose={() => setSelectedEvent(null)}
              />
            </div>

            {/* Target Code Snippet Being Audited */}
            <CodeInputPanel code={auditedCodeSnippet} />
          </div>

          {/* ============================================================== */}
          {/* RIGHT COLUMN: SOC Telemetry Metrics & Run History Switcher      */}
          {/* ============================================================== */}
          <div className="lg:col-span-3 space-y-4">
            {/* 9 SOC Run Metrics */}
            <RunMetrics metrics={activeMetrics} />

            {/* Run History & Multi-Scan Switcher */}
            <RunHistory
              runGroups={traceData.runGroups}
              selectedGroupId={selectedGroupId}
              onSelectGroup={handleSelectGroup}
            />
          </div>
        </div>
      </main>

      {/* 3. Footer */}
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
