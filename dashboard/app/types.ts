/**
 * VulnSentry Dashboard Data Types
 * Strict typing matching the 11 required event fields from glassbox/events.py
 */

export interface TraceEvent {
  run_id: string;
  event_id: string;
  parent_event_id: string | null;
  timestamp: string;
  event_type: string;
  input: any;
  output: any;
  status: "SUCCESS" | "FAILURE" | "RUNNING" | "PENDING" | "ERROR" | string;
  duration_ms: number | null;
  metadata: Record<string, any>;
  error: string | null;
}

export interface TraceRun {
  run_id: string;
  status: string;
  start_time: string;
  end_time: string | null;
  events: TraceEvent[];
  metadata: Record<string, any>;
}

export interface SecurityFindingData {
  title: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | string;
  cwe_id: string;
  description: string;
  remediation: string;
  tool_used: string;
  raw_tool_output: Record<string, any>;
  vulnerability_detected: boolean;
}

export interface ContextMetricsData {
  original_token_count: number;
  compressed_token_count: number;
  reduction_percentage: number;
  preserved_items: string[];
}

export interface FailureDetailsData {
  blocked: boolean;
  invalid_tool: string;
  invalid_arguments: Record<string, any>;
  validation_error: string;
  correction_message: string;
}

export interface TracePayload {
  run: TraceRun;
  code_snippet: string;
  finding: SecurityFindingData;
  context_metrics: ContextMetricsData;
  failure_details: FailureDetailsData;
}
