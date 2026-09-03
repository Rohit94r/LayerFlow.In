/**
 * Agent Specification Interface
 *
 * Defines the complete agent spec including:
 * - Identity (id, workspace, name, description, goal)
 * - Model policy (model selection, temperature, provider)
 * - Tool policy (which tools are enabled)
 * - Permission policy (what the agent can/cannot do)
 * - Budget (max spend per run/month)
 * - Limits (max iterations, timeout)
 * - Memory policy (how the agent stores/retrieves memory)
 * - Status (active, paused, archived)
 */

export type AgentStatus = "active" | "paused" | "archived";
export type AgentRole =
  | "implement" | "review" | "test" | "custom"
  | "job_apply" | "internship_hunter" | "linkedin_outreach"
  | "research" | "scholarship" | "startup_research"
  | "content_repurposing" | "meeting_followup";

export interface ModelPolicy {
  /** Model ID from the registry, or null for auto-select (cheapest capable). */
  modelId: string | null;
  /** Provider hint (e.g. "openai", "anthropic"), or null for auto. */
  provider: string | null;
  /** Temperature override (0-2), or null for default. */
  temperature: number | null;
  /** Max output tokens per LLM call. */
  maxTokens: number;
  /** Allow automatic failover to other models when the primary is unavailable. */
  autoSwitch: boolean;
}

export interface ToolPolicy {
  /** List of enabled tool names (e.g. "read_file", "search", "write_file"). */
  enabledTools: string[];
  /** Per-tool permission overrides. Keys are tool names, values are permission levels. */
  permissions: Record<string, "allow_always" | "allow_once" | "deny" | "blocked">;
}

export interface BudgetPolicy {
  /** Max micro-dollars per single run. Null = unlimited. */
  maxPerRun: number | null;
  /** Max micro-dollars per month. Null = unlimited. */
  maxPerMonth: number | null;
  /** Max API calls per run. */
  maxApiCalls: number;
}

export interface MemoryPolicy {
  /** Whether the agent can create/retrieve memories. */
  enabled: boolean;
  /** Max memories to retrieve per context building. */
  maxRetrieved: number;
  /** Memory retention in days. */
  ttlDays: number;
}

export interface AgentSpec {
  // Identity
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  goal: string;
  role: AgentRole;

  // Model
  model: ModelPolicy;

  // Tools
  tools: ToolPolicy;

  // Permissions
  permissions: BudgetPolicy;

  // Limits
  maxIterations: number;
  timeoutMs: number;

  // Memory
  memory: MemoryPolicy;

  // Schedule
  schedule: {
    cron: string | null;
    timezone: string;
    enabled: boolean;
  };

  // Status
  status: AgentStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Default specs for agent roles.
 */
export function defaultSpecForRole(role: AgentRole, workspaceId: string, name: string): Omit<AgentSpec, "id" | "createdAt" | "updatedAt"> {
  const base = {
    workspaceId,
    name,
    description: "",
    goal: "",
    role,
    model: {
      modelId: null as string | null,
      provider: null as string | null,
      temperature: 0.7,
      maxTokens: 2048,
      autoSwitch: true,
    },
    permissions: {
      maxPerRun: 500_000, // $0.50 per run
      maxPerMonth: 10_000_000, // $10 per month
      maxApiCalls: 100,
    },
    maxIterations: 25,
    timeoutMs: 300_000, // 5 minutes
    memory: {
      enabled: true,
      maxRetrieved: 5,
      ttlDays: 90,
    },
    schedule: {
      cron: null,
      timezone: "UTC",
      enabled: false,
    },
    status: "active" as AgentStatus,
  };

  // Role-specific overrides.
  switch (role) {
    case "implement":
    case "custom":
      return {
        ...base,
        tools: {
          enabledTools: ["read_file", "search", "write_file", "edit_file", "shell", "fetch_url"],
          permissions: {
            read_file: "allow_always",
            search: "allow_always",
            fetch_url: "allow_always",
            write_file: "deny",
            edit_file: "deny",
            shell: "deny",
          },
        },
      };

    case "review":
      return {
        ...base,
        tools: {
          enabledTools: ["read_file", "search", "fetch_url"],
          permissions: {
            read_file: "allow_always",
            search: "allow_always",
            fetch_url: "allow_always",
          },
        },
      };

    case "test":
      return {
        ...base,
        tools: {
          enabledTools: ["read_file", "search", "shell"],
          permissions: {
            read_file: "allow_always",
            search: "allow_always",
            shell: "deny",
          },
        },
      };

    case "research":
    case "startup_research":
      return {
        ...base,
        tools: {
          enabledTools: ["read_file", "search", "fetch_url"],
          permissions: {
            read_file: "allow_always",
            search: "allow_always",
            fetch_url: "allow_always",
          },
        },
      };

    case "content_repurposing":
    case "meeting_followup":
      return {
        ...base,
        tools: {
          enabledTools: ["read_file", "write_file", "fetch_url"],
          permissions: {
            read_file: "allow_always",
            fetch_url: "allow_always",
            write_file: "deny",
          },
        },
      };

    default:
      return {
        ...base,
        tools: {
          enabledTools: ["read_file", "search", "fetch_url"],
          permissions: {},
        },
      };
  }
}
