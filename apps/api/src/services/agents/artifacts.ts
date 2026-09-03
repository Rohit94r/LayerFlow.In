/**
 * Structured Artifacts
 *
 * Provides CSV, JSON, and export support for agent-generated data:
 * - Lead lists
 * - Research reports
 * - Application records
 * - Any structured agent output
 */

import { logger } from "../../config/logger";

// -- Types ------------------------------------------------------------------

export type ArtifactFormat = "csv" | "json" | "markdown" | "text";

export interface Artifact {
  id: string;
  agentId: string;
  runId: string;
  format: ArtifactFormat;
  filename: string;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

/**
 * Generate a CSV string from an array of objects.
 */
export function toCsv<T extends Record<string, unknown>>(
  data: T[],
  columns?: (keyof T & string)[],
): string {
  if (data.length === 0) return "";

  const keys = columns ?? (Object.keys(data[0]) as (keyof T & string)[]);
  const header = keys.map(escapeCsvField).join(",");
  const rows = data.map((row) =>
    keys.map((key) => escapeCsvField(String(row[key] ?? ""))).join(","),
  );

  return [header, ...rows].join("\n");
}

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Generate a JSON string from data with optional pretty-printing.
 */
export function toJson<T>(data: T, pretty = true): string {
  return JSON.stringify(data, null, pretty ? 2 : undefined);
}

/**
 * Generate a Markdown table from an array of objects.
 */
export function toMarkdownTable<T extends Record<string, unknown>>(
  data: T[],
  columns?: (keyof T & string)[],
): string {
  if (data.length === 0) return "*No data*\n";

  const keys = columns ?? (Object.keys(data[0]) as (keyof T & string)[]);
  const header = `| ${keys.map((k) => String(k)).join(" | ")} |`;
  const separator = `| ${keys.map(() => "---").join(" | ")} |`;
  const rows = data.map(
    (row) => `| ${keys.map((key) => String(row[key] ?? "")).join(" | ")} |`,
  );

  return [header, separator, ...rows].join("\n");
}

// -- Report Generators -------------------------------------------------------

/**
 * Generate a lead report from structured lead data.
 */
export function generateLeadReport(
  leads: Array<{
    company: string;
    contact?: string;
    email?: string;
    title?: string;
    source?: string;
    notes?: string;
  }>,
  format: ArtifactFormat = "csv",
): { filename: string; content: string; format: ArtifactFormat } {
  switch (format) {
    case "csv":
      return {
        filename: `leads-${Date.now()}.csv`,
        content: toCsv(leads, ["company", "contact", "email", "title", "source", "notes"]),
        format,
      };
    case "json":
      return {
        filename: `leads-${Date.now()}.json`,
        content: toJson(leads),
        format,
      };
    case "markdown":
      return {
        filename: `leads-${Date.now()}.md`,
        content: `# Lead Report\n\n${toMarkdownTable(leads, ["company", "contact", "email", "title", "source", "notes"])}`,
        format,
      };
    default:
      return {
        filename: `leads-${Date.now()}.txt`,
        content: leads.map((l) => `${l.company}: ${l.contact ?? "N/A"} (${l.email ?? "N/A"})`).join("\n"),
        format,
      };
  }
}

/**
 * Generate a research report from findings data.
 */
export function generateResearchReport(
  findings: Array<{
    topic: string;
    summary: string;
    sources?: string[];
    keyFindings?: string[];
    recommendations?: string[];
  }>,
  format: ArtifactFormat = "markdown",
): { filename: string; content: string; format: ArtifactFormat } {
  const sections = findings.map(
    (f) => `## ${f.topic}\n\n${f.summary}\n\n${
      f.keyFindings?.length
        ? `**Key Findings:**\n${f.keyFindings.map((kf) => `- ${kf}`).join("\n")}`
        : ""
    }${
      f.recommendations?.length
        ? `\n\n**Recommendations:**\n${f.recommendations.map((r) => `- ${r}`).join("\n")}`
        : ""
    }${
      f.sources?.length
        ? `\n\n**Sources:**\n${f.sources.map((s) => `- ${s}`).join("\n")}`
        : ""
    }`,
  );

  const content = `# Research Report\n\nGenerated: ${new Date().toISOString()}\n\n${sections.join("\n\n---\n\n")}`;

  return {
    filename: `research-${Date.now()}.${format === "markdown" ? "md" : format}`,
    content: format === "json" ? toJson(findings) : content,
    format,
  };
}

/**
 * Generate application records export.
 */
export function generateApplicationReport(
  applications: Array<{
    company: string;
    role: string;
    status: string;
    appliedAt?: string;
    notes?: string;
  }>,
  format: ArtifactFormat = "csv",
): { filename: string; content: string; format: ArtifactFormat } {
  switch (format) {
    case "csv":
      return {
        filename: `applications-${Date.now()}.csv`,
        content: toCsv(applications, ["company", "role", "status", "appliedAt", "notes"]),
        format,
      };
    case "json":
      return {
        filename: `applications-${Date.now()}.json`,
        content: toJson(applications),
        format,
      };
    default:
      return {
        filename: `applications-${Date.now()}.md`,
        content: `# Application Tracker\n\n${toMarkdownTable(applications, ["company", "role", "status", "appliedAt", "notes"])}`,
        format: "markdown",
      };
  }
}

/**
 * Generate a comprehensive agent run report combining all artifacts.
 */
export function generateRunReport(params: {
  agentName: string;
  goal: string;
  summary: string;
  toolCalls: number;
  totalCost: number;
  duration: number;
  artifacts?: Array<{ name: string; format: string }>;
}): string {
  return `# Agent Run Report: ${params.agentName}\n\n` +
    `**Goal:** ${params.goal}\n` +
    `**Summary:** ${params.summary}\n\n` +
    `## Metrics\n\n` +
    `- Tool calls: ${params.toolCalls}\n` +
    `- Total cost: $${(params.totalCost / 1_000_000).toFixed(4)}\n` +
    `- Duration: ${(params.duration / 1000).toFixed(1)}s\n\n` +
    (params.artifacts?.length
      ? `## Artifacts\n\n${params.artifacts.map((a) => `- ${a.name} (${a.format})`).join("\n")}`
      : "");
}
