/**
 * IDE / Developer Experience
 *
 * Provides structured displays for:
 * - Active project and branch
 * - Current model configuration
 * - Running agents and their state
 * - Context files being used
 * - Recent changes and diffs
 * - Test status
 */

import { logger } from "../../config/logger";

// -- Types ------------------------------------------------------------------

export interface IdeProject {
  name: string;
  path: string;
  type: string | null;
  branch: string;
  remote: string | null;
  lastCommit: string | null;
  uncommittedChanges: number;
  untrackedFiles: number;
}

export interface IdeAgentStatus {
  agentId: string;
  name: string;
  status: string;
  currentState: string;
  iterationCount: number;
  lastActivity: string | null;
  pendingApprovals: number;
}

export interface IdeContextFile {
  path: string;
  tokens: number;
  relevance: number;
  selected: boolean;
}

export interface IdeChange {
  file: string;
  type: "added" | "modified" | "deleted";
  additions: number;
  deletions: number;
  diff: string;
}

export interface IdeTestStatus {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  timestamp: string;
}

export interface IdeSnapshot {
  project: IdeProject;
  model: {
    modelId: string;
    provider: string;
    temperature: number;
  };
  agents: IdeAgentStatus[];
  contextFiles: IdeContextFile[];
  recentChanges: IdeChange[];
  testStatus: IdeTestStatus | null;
}

// -- Snapshot Builder --------------------------------------------------------

/**
 * Build an IDE snapshot from the current workspace state.
 */
export async function buildIdeSnapshot(params: {
  workspaceId: string;
  projectPath: string;
  projectName: string;
  projectType: string | null;
  branch: string;
  modelId?: string;
  provider?: string;
  temperature?: number;
}): Promise<IdeSnapshot> {
  const { workspaceId, projectPath, projectName, projectType, branch } = params;

  const snapshot: IdeSnapshot = {
    project: {
      name: projectName,
      path: projectPath,
      type: projectType,
      branch,
      remote: null,
      lastCommit: null,
      uncommittedChanges: 0,
      untrackedFiles: 0,
    },
    model: {
      modelId: params.modelId ?? "auto",
      provider: params.provider ?? "auto",
      temperature: params.temperature ?? 0.7,
    },
    agents: [],
    contextFiles: [],
    recentChanges: [],
    testStatus: null,
  };

  // Try to read git status if available.
  try {
    const { execSync } = await import("child_process");
    const gitDir = projectPath;

    try {
      const remote = execSync("git remote get-url origin", {
        cwd: gitDir,
        encoding: "utf-8",
        timeout: 2000,
      }).toString().trim();
      snapshot.project.remote = remote || null;
    } catch {
      // No remote
    }

    try {
      const lastCommit = execSync("git log --oneline -1", {
        cwd: gitDir,
        encoding: "utf-8",
        timeout: 2000,
      }).toString().trim();
      snapshot.project.lastCommit = lastCommit || null;
    } catch {
      // No commits yet
    }

    try {
      const status = execSync("git status --porcelain", {
        cwd: gitDir,
        encoding: "utf-8",
        timeout: 2000,
      }).toString();
      const lines = status.split("\n").filter(Boolean);
      snapshot.project.uncommittedChanges = lines.filter((l) => l.startsWith(" ") || l.startsWith("M") || l.startsWith("A") || l.startsWith("D")).length;
      snapshot.project.untrackedFiles = lines.filter((l) => l.startsWith("??")).length;
    } catch {
      // No changes
    }
  } catch {
    // git not available
  }

  logger.info({ workspaceId, project: projectName }, "ide snapshot built");
  return snapshot;
}

/**
 * Format the IDE snapshot for display in the terminal or web UI.
 */
export function formatIdeStatus(snapshot: IdeSnapshot): string {
  const lines: string[] = [];

  lines.push(`Project: ${snapshot.project.name}`);
  lines.push(`  Path:  ${snapshot.project.path}`);
  lines.push(`  Type:  ${snapshot.project.type ?? "Unknown"}`);
  if (snapshot.project.branch) {
    lines.push(`  Branch: ${snapshot.project.branch}`);
  }
  if (snapshot.project.lastCommit) {
    lines.push(`  Last:  ${snapshot.project.lastCommit}`);
  }
  if (snapshot.project.uncommittedChanges > 0 || snapshot.project.untrackedFiles > 0) {
    lines.push(`  Changes: ${snapshot.project.uncommittedChanges} uncommitted, ${snapshot.project.untrackedFiles} untracked`);
  }

  lines.push("");
  lines.push(`Model: ${snapshot.model.modelId} (${snapshot.model.provider})`);

  if (snapshot.agents.length > 0) {
    lines.push("");
    lines.push(`Agents (${snapshot.agents.length}):`);
    for (const agent of snapshot.agents) {
      lines.push(`  ${agent.name}: ${agent.status} (${agent.currentState})`);
    }
  }

  if (snapshot.contextFiles.length > 0) {
    lines.push("");
    lines.push(`Context (${snapshot.contextFiles.length} files):`);
    for (const file of snapshot.contextFiles) {
      lines.push(`  ${file.path} (${file.tokens}tokens, rel: ${(file.relevance * 100).toFixed(0)}%)`);
    }
  }

  if (snapshot.testStatus) {
    lines.push("");
    const { total, passed, failed, skipped } = snapshot.testStatus;
    lines.push(`Tests: ${passed}/${total} passed${failed > 0 ? `, ${failed} failed` : ""}${skipped > 0 ? `, ${skipped} skipped` : ""}`);
  }

  return lines.join("\n");
}

/**
 * Get context files for an agent based on its current task.
 * Returns relevant files from the workspace.
 */
export async function getContextFilesForAgent(
  workspacePath: string,
  goal: string,
  maxTokens: number = 4000,
): Promise<IdeContextFile[]> {
  // This would use vector search + file analysis to find relevant files.
  // For now, return a placeholder implementation.
  const files: IdeContextFile[] = [];

  try {
    const fs = await import("fs/promises");
    const { join } = await import("path");

    async function scanDir(dir: string): Promise<void> {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith(".")) continue;
        if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") continue;

        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else if (entry.isFile()) {
          const ext = entry.name.split(".").pop()?.toLowerCase();
          if (!["ts", "js", "tsx", "jsx", "go", "py", "rs", "java", "md", "json", "yaml", "toml"].includes(ext ?? "")) continue;
          try {
            const stat = await fs.stat(fullPath);
            const tokenEstimate = Math.ceil(stat.size / 4);
            if (tokenEstimate > maxTokens) continue;
            files.push({
              path: fullPath.replace(workspacePath, "").replace(/^\//, ""),
              tokens: tokenEstimate,
              relevance: 0.5, // Placeholder; real impl uses vector search
              selected: false,
            });
          } catch {
            // skip unreadable files
          }
        }
      }
    }

    await scanDir(workspacePath);

    // Sort by relevance (descending) and limit by token budget.
    files.sort((a, b) => b.relevance - a.relevance);
    let used = 0;
    for (const file of files) {
      if (used + file.tokens > maxTokens) {
        file.selected = false;
      } else {
        file.selected = true;
        used += file.tokens;
      }
    }
  } catch {
    // workspace may not exist
  }

  return files;
}
