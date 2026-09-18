"use client";

import React, { useEffect, useState, useMemo } from "react";
import TeamilyWorkspace from "@/components/TeamilyWorkspace";
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
  const [viewMode, setViewMode] = useState<"teamily" | "soc">("teamily");

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

  const auditedCodeSnippet = useMemo(() => {
    if (!traceData || traceData.events.length === 0) return "";
    for (const ev of traceData.events) {
      if (ev.input?.code_snippet) return String(ev.input.code_snippet);
    }
    return "";
  }, [traceData]);

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
      <div className="min-h-screen bg-[#f3faf6] flex flex-col items-center justify-center text-slate-600 font-sans">
        <div className="h-10 w-10 border-3 border-[#00c968] border-t-transparent rounded-full animate-spin mb-3"></div>
        <div className="text-sm font-bold text-slate-800">Loading VulnSentry AI Agents...</div>
        <p className="text-xs text-slate-400 mt-0.5">Initializing Glass-Box guardrails and telemetry</p>
      </div>
    );
  }

  // Error Screen
  if (error && !traceData) {
    return (
      <div className="min-h-screen bg-[#f3faf6] flex flex-col items-center justify-center p-6 font-sans">
        <div className="bg-white border border-rose-200 rounded-2xl p-6 max-w-md text-center shadow-lg">
          <div className="text-rose-500 text-2xl mb-2">⚠</div>
          <h2 className="text-sm font-bold text-slate-900 mb-1">
            Failed to Load Execution Trace
          </h2>
          <p className="text-xs text-slate-500 mb-4">{error}</p>
          <div className="flex justify-center gap-2">
            <button
              onClick={fetchTrace}
              className="px-4 py-1.5 bg-[#00c968] hover:bg-[#00b05b] text-white rounded-xl text-xs font-semibold"
            >
              Retry
            </button>
            <button
              onClick={handleRunAudit}
              className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
            >
              Run Audit Pipeline
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!traceData || !activeMetrics || !activeFinding || !activeFailure) return null;

  return (
    <div className="min-h-screen bg-[#f3faf6] flex flex-col">
      {/* ============================================================== */}
      {/* 1. PRIMARY VIEW: Teamily AI Workspace                          */}
      {/* ============================================================== */}
      {viewMode === "teamily" && (
        <TeamilyWorkspace
          traceData={traceData}
          onRunCustomAudit={handleRunCustomAudit}
          isRunning={isRunningAudit}
          onToggleTechnicalView={() => setViewMode("soc")}
          onInspectEvent={(ev) => {
            setSelectedEvent(ev);
            setViewMode("soc");
          }}
        />
      )}

      {/* ============================================================== */}
      {/* 2. SECONDARY VIEW: Dense SOC Glass-Box Dashboard                */}
      {/* ============================================================== */}
      {viewMode === "soc" && (
        <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col">
          <Navbar
            runId={traceData.run_id}
            status={traceData.status}
            onRunAudit={handleRunAudit}
            isRunningAudit={isRunningAudit}
            selectedRunLabel={activeRunGroup?.label || "Full Trace"}
          />

          <div className="bg-[#080d17] border-b border-slate-800/80 px-4 py-2 flex items-center justify-between">
            <button
              onClick={() => setViewMode("teamily")}
              className="px-3 py-1 bg-[#00c968] hover:bg-[#00b05b] text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow"
            >
              <span>&larr; Back to Teamily AI Chat View</span>
            </button>
            <span className="text-xs font-mono text-slate-400">
              Dense Telemetry &bull; 11 Verifiable Fields &bull; DAG Execution
            </span>
          </div>

          <main className="flex-1 p-4 max-w-[1780px] mx-auto w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Left Column */}
              <div className="lg:col-span-3 space-y-4">
                <SecurityFindingsPanel finding={activeFinding} />
                <GlassBoxWorkflow />
                <FailureDemoCard failure={activeFailure} />
                <ContextEngineeringCard context={traceData.context} />
              </div>

              {/* Center Column */}
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

              {/* Right Column */}
              <div className="lg:col-span-3 space-y-4">
                <RunMetrics metrics={activeMetrics} />
                <RunHistory
                  runGroups={traceData.runGroups}
                  selectedGroupId={selectedGroupId}
                  onSelectGroup={handleSelectGroup}
                />
              </div>
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
