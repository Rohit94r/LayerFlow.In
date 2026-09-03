/**
 * Agent Permission Policy
 *
 * Defines a hierarchical permission model for agent tool access:
 * - read/search: allowed by default
 * - write/run_command: requires approval
 * - delete/deploy/send_email: requires explicit approval
 */

import { and, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { agentPermissions } from "../../db/schema/agents";
import { logger } from "../../config/logger";

// -- Types ------------------------------------------------------------------

export type PermissionLevel =
  | "allow_always"   // No approval needed
  | "allow_once"     // Approved once per run
  | "allow_session"  // Approved for the current session
  | "deny"           // Requires explicit approval each time
  | "blocked";       // Always denied, cannot be overridden

export interface AgentPermission {
  key: string;
  label: string;
  description: string;
  level: PermissionLevel;
  category: string;
}

// -- Permission Registry -----------------------------------------------------

/**
 * Built-in permission categories with their default levels.
 * These are the canonical tool permission mappings.
 */
const PERMISSION_CATALOG: Record<string, { label: string; category: string; defaultLevel: PermissionLevel }> = {
  // Read operations -- always allowed
  read_file:     { label: "Read files",       category: "Read",        defaultLevel: "allow_always" },
  search:        { label: "Search codebase",   category: "Read",        defaultLevel: "allow_always" },
  list_files:    { label: "List files",        category: "Read",        defaultLevel: "allow_always" },
  fetch_url:     { label: "Fetch URLs",        category: "Read",        defaultLevel: "allow_always" },

  // Write operations -- require approval
  write_file:    { label: "Write files",       category: "Write",       defaultLevel: "deny" },
  edit_file:     { label: "Edit files",        category: "Write",       defaultLevel: "deny" },
  patch_file:    { label: "Apply patches",     category: "Write",       defaultLevel: "deny" },

  // Execution -- requires approval
  shell:         { label: "Run shell commands", category: "Execution",   defaultLevel: "deny" },
  run_code:      { label: "Execute code",      category: "Execution",   defaultLevel: "deny" },
  test:          { label: "Run tests",         category: "Execution",   defaultLevel: "deny" },

  // Destructive -- explicit approval required
  delete_file:   { label: "Delete files",      category: "Destructive", defaultLevel: "blocked" },
  delete_branch: { label: "Delete branches",   category: "Destructive", defaultLevel: "blocked" },

  // Network operations -- explicit approval required
  deploy:        { label: "Deploy code",       category: "Network",     defaultLevel: "blocked" },
  send_email:    { label: "Send email",        category: "Network",     defaultLevel: "blocked" },
  publish:       { label: "Publish content",   category: "Network",     defaultLevel: "blocked" },

  // Git operations
  git_commit:    { label: "Git commit",        category: "Git",         defaultLevel: "deny" },
  git_push:      { label: "Git push",          category: "Git",         defaultLevel: "blocked" },
  git_pr:        { label: "Create PR",         category: "Git",         defaultLevel: "deny" },

  // Agent management
  modify_config: { label: "Modify agent config",category: "Agent",      defaultLevel: "deny" },
  create_agent:  { label: "Create agents",     category: "Agent",       defaultLevel: "deny" },
};

// -- Permission Check --------------------------------------------------------

export interface PermissionCheckResult {
  allowed: boolean;
  level: PermissionLevel;
  requiresApproval: boolean;
  reason?: string;
}

/**
 * Check if a tool action is permitted for a given agent.
 * Checks the agent's stored permissions, falling back to the catalog defaults.
 */
export async function checkToolPermission(
  agentId: string,
  workspaceId: string,
  toolName: string,
): Promise<PermissionCheckResult> {
  // Look up the catalog entry.
  const catalogEntry = PERMISSION_CATALOG[toolName];
  if (!catalogEntry) {
    // Unknown tool: default to deny with explicit approval.
    return {
      allowed: false,
      level: "deny",
      requiresApproval: true,
      reason: `Unknown tool "${toolName}" — requires approval`,
    };
  }

  // Check the agent's stored permission override.
  const [stored] = await db
    .select({ mode: agentPermissions.mode })
    .from(agentPermissions)
    .where(
      and(
        eq(agentPermissions.agentId, agentId),
        eq(agentPermissions.workspaceId, workspaceId),
        eq(agentPermissions.key, toolName),
      ),
    )
    .limit(1);

  const effectiveLevel: PermissionLevel = stored
    ? mapStoredMode(stored.mode)
    : catalogEntry.defaultLevel;

  const allowed = effectiveLevel === "allow_always" || effectiveLevel === "allow_once" || effectiveLevel === "allow_session";
  const requiresApproval = effectiveLevel === "deny" || effectiveLevel === "allow_once" || effectiveLevel === "allow_session";

  logger.debug(
    { agentId, toolName, effectiveLevel, allowed },
    "permission check",
  );

  return {
    allowed,
    level: effectiveLevel,
    requiresApproval: requiresApproval && !allowed,
    reason: effectiveLevel === "blocked"
      ? `"${toolName}" is blocked for this agent`
      : undefined,
  };
}

function mapStoredMode(mode: string | null): PermissionLevel {
  switch (mode) {
    case "allow_always": return "allow_always";
    case "allow_once":   return "allow_once";
    default:             return "deny";
  }
}

// -- Default Permission Sets -------------------------------------------------

/**
 * Get the default permission set for a given agent role.
 */
export function defaultPermissionsForRole(role: string): AgentPermission[] {
  switch (role) {
    case "implement":
    case "custom":
      return [
        { key: "read_file",     label: "Read files",       description: "Read workspace files",              category: "Read",        level: "allow_always" },
        { key: "search",        label: "Search codebase",   description: "Search code for patterns",          category: "Read",        level: "allow_always" },
        { key: "write_file",    label: "Write files",       description: "Create or overwrite files",          category: "Write",       level: "deny" },
        { key: "edit_file",     label: "Edit files",        description: "Edit existing files by text replacement", category: "Write",    level: "deny" },
        { key: "shell",         label: "Run shell commands", description: "Execute shell commands in the workspace", category: "Execution", level: "deny" },
        { key: "fetch_url",     label: "Fetch URLs",        description: "Fetch content from URLs",             category: "Read",        level: "allow_always" },
        { key: "git_commit",    label: "Git commit",        description: "Commit changes to the repository",   category: "Git",         level: "deny" },
      ];

    case "review":
      return [
        { key: "read_file",     label: "Read files",       description: "Read workspace files",              category: "Read",        level: "allow_always" },
        { key: "search",        label: "Search codebase",   description: "Search code for patterns",          category: "Read",        level: "allow_always" },
        { key: "fetch_url",     label: "Fetch URLs",        description: "Fetch content from URLs",             category: "Read",        level: "allow_always" },
      ];

    case "test":
      return [
        { key: "read_file",     label: "Read files",       description: "Read workspace files",              category: "Read",        level: "allow_always" },
        { key: "search",        label: "Search codebase",   description: "Search code for patterns",          category: "Read",        level: "allow_always" },
        { key: "shell",         label: "Run tests",         description: "Execute test commands",              category: "Execution",   level: "deny" },
      ];

    default:
      return Object.entries(PERMISSION_CATALOG).map(([key, entry]) => ({
        key,
        label: entry.label,
        description: `${entry.category} operation`,
        category: entry.category,
        level: entry.defaultLevel,
      }));
  }
}
