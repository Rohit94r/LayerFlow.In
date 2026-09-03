/**
 * Repository Context Relevance
 *
 * Selects relevant files from a repository based on token budget instead of
 * sending entire repositories. Uses a combination of:
 * - File extension filtering (only code/text files)
 * - Keyword matching against the query/goal
 * - Token budget-aware selection
 * - Recency (recently modified files get a boost)
 */

import { logger } from "../../config/logger";
import { estimateTokens } from "../intelligence/analyze";

// -- Types ------------------------------------------------------------------

export interface RelevantFile {
  path: string;
  tokens: number;
  relevance: number;
  reason: string;
  lastModified: Date | null;
}

export interface RepoContextRequest {
  /** Root path of the repository */
  repoPath: string;
  /** The query or task description to match against */
  query: string;
  /** Maximum tokens to include */
  maxTokens: number;
  /** File extensions to consider (default: code files) */
  extensions?: string[];
  /** Specific files to always include (high priority) */
  alwaysInclude?: string[];
  /** Files/directories to exclude */
  excludePaths?: string[];
}

export interface RepoContextResult {
  files: RelevantFile[];
  totalTokens: number;
  totalFiles: number;
  truncated: boolean;
}

// -- Default extensions for code files --------------------------------------

const CODE_EXTENSIONS = [
  "ts", "tsx", "js", "jsx", "mjs", "cjs",
  "go", "py", "rs", "java", "kt", "scala",
  "c", "cpp", "h", "hpp",
  "rb", "php", "swift",
  "md", "json", "yaml", "yml", "toml",
  "css", "scss", "html", "svelte", "vue",
  "sql", "graphql",
  "sh", "bash", "zsh",
];

const EXCLUDE_DIRECTORIES = [
  "node_modules", "dist", "build", "target", "__pycache__",
  ".git", ".svn", ".idea", ".vscode",
  "venv", ".venv", "env",
  "coverage", ".next", ".cache",
];

// -- Scoring -----------------------------------------------------------------

/**
 * Score a file's relevance to a query based on:
 * - Path matches (filename contains query terms)
 * - Extension relevance
 * - Recency boost
 */
function scoreFileRelevance(filePath: string, query: string, lastModified: Date | null): { score: number; reason: string } {
  const lowerPath = filePath.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const queryTerms = lowerQuery.split(/\s+/).filter((t) => t.length > 2);

  let score = 0.1; // Base score
  const reasons: string[] = [];

  // Check if filename matches query terms.
  const fileName = lowerPath.split("/").pop() ?? "";
  for (const term of queryTerms) {
    if (fileName.includes(term)) {
      score += 0.3;
      reasons.push(`filename matches "${term}"`);
    }
    if (lowerPath.includes(term)) {
      score += 0.15;
      if (!reasons.some((r) => r.includes(term))) {
        reasons.push(`path matches "${term}"`);
      }
    }
  }

  // Extension preference for code files.
  const ext = fileName.split(".").pop() ?? "";
  if (["ts", "tsx", "js", "go", "py", "rs", "md"].includes(ext)) {
    score += 0.1;
    reasons.push(`${ext} file`);
  }

  // Config/entry files are often relevant.
  const entryFiles = ["package.json", "tsconfig.json", "go.mod", "cargo.toml", "dockerfile", "docker-compose.yml", "readme.md"];
  if (entryFiles.includes(fileName)) {
    score += 0.2;
    reasons.push("config file");
  }

  // Recency boost: recently modified files are more likely relevant.
  if (lastModified) {
    const daysAgo = (Date.now() - lastModified.getTime()) / (1000 * 60 * 60 * 24);
    if (daysAgo < 1) {
      score += 0.3;
      reasons.push("modified today");
    } else if (daysAgo < 7) {
      score += 0.15;
      reasons.push("modified this week");
    }
  }

  // Normalize score to 0-1 range.
  score = Math.min(score, 1.0);

  return { score, reason: reasons.join(", ") || "general relevance" };
}

// -- File Scanning -----------------------------------------------------------

/**
 * Scan a repository directory and return relevant files within the token budget.
 */
export async function selectRelevantFiles(
  request: RepoContextRequest,
): Promise<RepoContextResult> {
  const {
    repoPath,
    query,
    maxTokens,
    extensions = CODE_EXTENSIONS,
    alwaysInclude = [],
    excludePaths = [],
  } = request;

  const fs = await import("fs/promises");
  const { join, relative } = await import("path");

  const candidates: RelevantFile[] = [];
  const excludeSet = new Set(excludePaths.map((p) => p.replace(/^\//, "")));

  async function scanDir(dir: string, relativePath: string): Promise<void> {
    let entries: import("fs").Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

      if (excludeSet.has(relPath) || EXCLUDE_DIRECTORIES.includes(entry.name)) continue;
      if (entry.name.startsWith(".") && entry.name !== ".env.example") continue;

      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        await scanDir(fullPath, relPath);
      } else if (entry.isFile()) {
        const ext = entry.name.split(".").pop()?.toLowerCase() ?? "";
        if (!extensions.includes(ext)) continue;

        try {
          const stat = await fs.stat(fullPath);
          // Skip binary/large files.
          if (stat.size > 500_000) continue; // 500KB max

          const tokenEstimate = Math.ceil(stat.size / 4); // Rough estimate: 4 bytes per token
          if (tokenEstimate > maxTokens / 2) continue; // Single file shouldn't eat more than half budget

          const { score, reason } = scoreFileRelevance(relPath, query, stat.mtime);

          candidates.push({
            path: relPath,
            tokens: tokenEstimate,
            relevance: score,
            reason,
            lastModified: stat.mtime,
          });
        } catch {
          // skip unreadable files
        }
      }
    }
  }

  await scanDir(repoPath, "");

  // Always-include files get max priority.
  for (const [i, candidate] of candidates.entries()) {
    if (alwaysInclude.includes(candidate.path) || alwaysInclude.some((a) => candidate.path.endsWith(a))) {
      candidates[i] = { ...candidate, relevance: 1.0, reason: "always included" };
    }
  }

  // Sort by relevance descending, then by token count ascending.
  candidates.sort((a, b) => {
    const relDiff = b.relevance - a.relevance;
    if (Math.abs(relDiff) > 0.01) return relDiff > 0 ? 1 : -1;
    return a.tokens - b.tokens;
  });

  // Select files within the token budget.
  const selected: RelevantFile[] = [];
  let totalTokens = 0;
  let truncated = false;

  for (const candidate of candidates) {
    if (totalTokens + candidate.tokens > maxTokens) {
      // Try to include at least high-relevance files.
      if (candidate.relevance < 0.5) {
        truncated = true;
        continue;
      }
      // If we can trim the file to fit, mark as truncated.
      if (totalTokens + Math.min(candidate.tokens, maxTokens / 4) > maxTokens) {
        truncated = true;
        continue;
      }
    }
    selected.push(candidate);
    totalTokens += candidate.tokens;
  }

  logger.debug(
    { files: selected.length, totalTokens, candidates: candidates.length, truncated },
    "repo context selected",
  );

  return {
    files: selected,
    totalTokens,
    totalFiles: candidates.length,
    truncated,
  };
}

/**
 * Format selected files as a context block for LLM prompts.
 */
export function formatFilesForContext(files: RelevantFile[]): string {
  if (files.length === 0) return "";

  const parts = files.map(
    (f) => `File: ${f.path}\n\`\`\`\n${f.reason}\n\`\`\``,
  );

  return `<files>\n${parts.join("\n\n")}\n</files>`;
}

/**
 * Format file list as a compact summary string for UI display.
 */
export function formatFileSummary(result: RepoContextResult): string {
  const types = new Map<string, number>();
  for (const file of result.files) {
    const ext = file.path.split(".").pop() ?? "?";
    types.set(ext, (types.get(ext) ?? 0) + 1);
  }

  const extParts = Array.from(types.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([ext, count]) => `${ext}: ${count}`)
    .join(", ");

  return `${result.files.length}/${result.totalFiles} files (${extParts}) — ${result.totalTokens} tokens${result.truncated ? " (truncated)" : ""}`;
}
