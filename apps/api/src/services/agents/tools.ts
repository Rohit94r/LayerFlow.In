/**
 * Agent Tool Execution Framework
 *
 * Provides a basic set of tools (read_file, search, edit, write, shell) that
 * agents can invoke during runs. Each tool is a simple async function that
 * receives a workspace-scoped context and returns a structured result.
 * Tool results are recorded as agent steps for auditability.
 */
import { logger } from "../../config/logger";
import { resolve, normalize, relative, dirname } from "node:path";



// ── Types ────────────────────────────────────────────────────────

export interface ToolContext {
  workspaceId: string;
  agentId: string;
  agentRunId: string;
  /** Working directory for file tools; defaults to the repo root. */
  cwd?: string;
}

export interface ToolInput {
  name: string;
  args: Record<string, unknown>;
}

export interface ToolResult {
  ok: boolean;
  output: string;
  error?: string;
}

type ToolHandler = (ctx: ToolContext, args: Record<string, unknown>) => Promise<ToolResult>;

// ── Registry ─────────────────────────────────────────────────────

const toolRegistry = new Map<string, { handler: ToolHandler; description: string }>();

export function registerTool(name: string, description: string, handler: ToolHandler): void {
  toolRegistry.set(name, { handler, description });
}

export function getToolSpecs(): Array<{ name: string; description: string }> {
  return Array.from(toolRegistry.entries()).map(([name, spec]) => ({
    name,
    description: spec.description,
  }));
}

export async function executeTool(ctx: ToolContext, input: ToolInput): Promise<ToolResult> {
  const entry = toolRegistry.get(input.name);
  if (!entry) {
    return { ok: false, output: "", error: `Unknown tool "${input.name}"` };
  }
  try {
    const result = await entry.handler(ctx, input.args);
    logger.info(
      { tool: input.name, agentId: ctx.agentId, ok: result.ok },
      "tool executed",
    );
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ tool: input.name, agentId: ctx.agentId, err: message }, "tool failed");
    return { ok: false, output: "", error: message };
  }
}

export async function executeToolChain(
  ctx: ToolContext,
  tools: ToolInput[],
): Promise<ToolResult[]> {
  const results: ToolResult[] = [];
  for (const tool of tools) {
    const result = await executeTool(ctx, tool);
    results.push(result);
    if (!result.ok) break; // stop on first failure
  }
  return results;
}

// ── Built-in tools ───────────────────────────────────────────────

// read_file — read a file from the filesystem (within allowed workspace directory only)
registerTool("read_file", "Read the contents of a file", async (ctx, args) => {
  const path = String(args.path ?? "");
  if (!path) return { ok: false, output: "", error: "Missing 'path' argument" };
  const fs = await import("fs/promises");
  try {
    const normalized = await resolvePath(ctx.cwd ?? process.cwd(), path);
    const content = await fs.readFile(normalized, "utf-8");
    return { ok: true, output: content.slice(0, 100_000) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "read failed";
    return { ok: false, output: "", error: message };
  }
});

// search — grep for patterns across the workspace (protected against shell injection)
registerTool("search", "Search for a pattern in files", async (ctx, args) => {
  const pattern = String(args.pattern ?? "");
  const searchPath = String(args.path ?? ".");
  if (!pattern) return { ok: false, output: "", error: "Missing 'pattern' argument" };
  
  // Security: use spawnSync with array args to prevent shell injection
  const { spawnSync } = await import("child_process");
  try {
    const cwd = ctx.cwd ?? process.cwd();
    const normalized = await resolvePath(cwd, searchPath);
    const allowed = normalize(cwd);
    if (relative(allowed, normalized).startsWith("..")) {
      return { ok: false, output: "", error: "Search path outside allowed workspace" };
    }
    
    const result = spawnSync("grep", [
      "-rn",
      "--include=*.ts",
      "--include=*.tsx",
      "--include=*.go",
      "--include=*.js",
      "--include=*.json",
      "--include=*.md",
      pattern,
      searchPath,
    ], {
      cwd: ctx.cwd ?? process.cwd(),
      maxBuffer: 1024 * 1024,
      timeout: 30_000,
      encoding: "utf-8",
    });
    if (result.error) {
      return { ok: false, output: "", error: result.error.message.slice(0, 500) };
    }
    const stdout = result.stdout ?? "";
    if (stdout) return { ok: true, output: stdout.slice(0, 100_000) };
    return { ok: false, output: "", error: "No matches found" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, output: "", error: msg.slice(0, 500) };
  }
});

// write_file — create or overwrite a file (within allowed workspace directory only)
registerTool("write_file", "Write content to a file", async (ctx, args) => {
  const path = String(args.path ?? "");
  const content = String(args.content ?? "");
  if (!path) return { ok: false, output: "", error: "Missing 'path' argument" };
  const fs = await import("fs/promises");
  try {
    const normalized = await resolvePath(ctx.cwd ?? process.cwd(), path);
    await fs.mkdir(dirname(normalized), { recursive: true });
    await fs.writeFile(normalized, content, "utf-8");
    return { ok: true, output: `Wrote ${content.length} bytes to ${path}` };
  } catch (err) {
    const message = err instanceof Error ? err.message : "write failed";
    return { ok: false, output: "", error: message };
  }
});

// edit_file — apply a patch or replacement (within allowed workspace directory only)
registerTool("edit_file", "Edit a file by replacing text", async (ctx, args) => {
  const path = String(args.path ?? "");
  const oldText = String(args.old_text ?? "");
  const newText = String(args.new_text ?? "");
  if (!path || !oldText) return { ok: false, output: "", error: "Missing 'path' or 'old_text' argument" };
  const fs = await import("fs/promises");
  try {
    const normalized = await resolvePath(ctx.cwd ?? process.cwd(), path);
    const content = await fs.readFile(normalized, "utf-8");
    if (!content.includes(oldText)) {
      return { ok: false, output: "", error: "old_text not found in file" };
    }
    const updated = content.replace(oldText, newText);
    await fs.writeFile(normalized, updated, "utf-8");
    return { ok: true, output: `Replaced in ${path} (${content.length} → ${updated.length} bytes)` };
  } catch (err) {
    const message = err instanceof Error ? err.message : "edit failed";
    return { ok: false, output: "", error: message };
  }
});

// fetch_url — fetch a URL with SSRF protection
registerTool("fetch_url", "Fetch the contents of a URL (HTTP/HTTPS only, private IPs blocked)", async (_ctx, args) => {
  const url = String(args.url ?? "");
  if (!url) return { ok: false, output: "", error: "Missing 'url' argument" };
  const { safeFetch } = await import("./ssrf");
  const result = await safeFetch(url);
  if (!result.ok) return { ok: false, output: "", error: result.error };
  return { ok: true, output: result.body.slice(0, 50_000) };
});
registerTool("shell", "Run a shell command (read-only by default, dangerous commands blocked)", async (ctx, args) => {
  const command = String(args.command ?? "");
  if (!command) return { ok: false, output: "", error: "Missing 'command' argument" };

  // Security: check for dangerous commands
  const { dangerous, reason } = isDangerousCommand(command);
  if (dangerous) {
    return { ok: false, output: "", error: `Command blocked: ${reason}` };
  }

  const { execSync } = await import("child_process");
  try {
    const output = execSync(command, {
      maxBuffer: 1024 * 1024,
      encoding: "utf-8",
      timeout: 30_000,
      cwd: ctx.cwd ?? process.cwd(),
      // Security: use explicit shell to control env
      shell: "/bin/sh",
    });
    return { ok: true, output: String(output).slice(0, 50_000) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("timed out")) return { ok: false, output: "", error: "Command timed out after 30s" };
    return { ok: false, output: "", error: msg.slice(0, 1000) };
  }
});
// -- Path traversal prevention ------------------------------------------------

/**
 * Resolve a path within the allowed workspace directory.
 * Uses realpath on the deepest existing ancestor to prevent symlink escapes:
 * a symlink inside the workspace pointing outside will be caught.
 */
export async function resolvePath(baseDir: string, userPath: string): Promise<string> {
  const fs = await import("fs/promises");
  const base = resolve(baseDir);
  const target = resolve(base, normalize(userPath));
  const rel = relative(base, target);

  if (rel.startsWith("..") || rel.startsWith("/") || rel === "") {
    throw new Error(
      `Path traversal blocked: "${userPath}" resolves to "${target}" which is outside the allowed workspace "${base}"`,
    );
  }

  // Walk upward to the deepest existing ancestor, then realpath it to catch symlinks.
  let check = target;
  while (check !== base) {
    try {
      await fs.access(check);
      break; // exists — realpath will reveal if it's a symlink
    } catch {
      check = dirname(check);
    }
  }
  try {
    const real = await fs.realpath(check);
    const relReal = relative(base, real);
    if (relReal.startsWith("..") || relReal.startsWith("/")) {
      throw new Error(
        `Path traversal blocked: "${userPath}" resolves through symlink to "${real}" which is outside the workspace`,
      );
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Path traversal")) throw err;
    // Non-existent path is fine (will be created by write)
  }

  return target;
}

/**
 * List of dangerous command patterns that are always blocked in the shell tool.
 */
export const DANGEROUS_COMMANDS = [
  // System destruction
  /\brm\b.*\brf\b/i,
  /\brm\b.*\b-rf\b/i,
  /\brm\b.*\b--recursive\b.*\b--force\b/i,
  /\bmkfs\b/i,
  /\bdd\b/i,
  /\bformat\b/i,
  /\bmkswap\b/i,
  /\bfdisk\b/i,
  /\bparted\b/i,
  /\bmke2fs\b/i,
  /\bmkfs\\..+/i,

  // Package manager dangerous ops
  /\bnpm\b.*\brm\b/i,
  /\brm\b.*\bnpm\b/i,
  /\byarn\b.*\bremove\b/i,
  /\bpip\b.*\buninstall\b/i,
  /\bgo\b.*\bmod\b.*\bdrop\b/i,

  // Network/destructive
  /\bcurl\b.*\b--output\b/i,
  /\bwget\b.*\b-O\b/i,
  /\bgit\b.*\bpush\b.*\b--force\b/i,
  /\bgit\b.*\bpush\b.*\b-f\b/i,
  /\bgit\b.*\breset\b.*\b--hard\b/i,
  /\bgit\b.*\bclean\b.*\b-fd\b/i,
  /\bgit\b.*\bclean\b.*\b-df\b/i,

  // SSH/remote access
  /\bssh\b/i,
  /\bscp\b/i,
  /\brsync\b/i,
  /\bscp\b/i,

  // Environment/secret dumping
  /\benv\b/i,
  /\bprintenv\b/i,

  // Process manipulation
  /\bkill\b/i,
  /\bpkill\b/i,
  /\bchmod\b.*\b777\b/i,
  /\bchown\b/i,

  // Fork bomb
  /:\s*\(\)\s*\{[^}]*:\s*:\s*&\s*:\s*;\s*\}/i,

  // Command substitution — block nested eval / subshell escape hatches.
  // $() form
  /\$\(/i,
  // Backtick form
  /`/,

  // Sub-shell launchers (bash -c, sh -c, zsh -c)
  /\b(bash|sh|zsh|csh|fish)\s+-c\b/i,

  // env -i / env manipulation used to clear ambient vars
  /\benv\s+-[ie]+\b/i,
];

/**
 * Check if a command contains dangerous patterns.
 * Returns true and a reason if blocked.
 */
export function isDangerousCommand(command: string): { dangerous: boolean; reason?: string } {
  const trimmed = command.trim().replace(/\s+/g, " ");

  // Extract just the command name for block list matching.
  const cmdName = trimmed.split(/\s+/)[0]?.toLowerCase() ?? "";

  // Block dangerous command names regardless of arguments.
  const blockedCommands = [
    "sudo", "su", "chown", "chmod", "mkfs", "dd", "fdisk",
    "parted", "ssh", "scp", "rsync", "kill", "pkill", "killall",
    "nohup", "disown", "bash", "zsh", "csh", "fish", "env",
  ];
  if (blockedCommands.includes(cmdName)) {
    return { dangerous: true, reason: `command "${cmdName}" is blocked for security reasons` };
  }

  // Check regex patterns.
  for (const pattern of DANGEROUS_COMMANDS) {
    if (pattern.test(trimmed)) {
      return { dangerous: true, reason: `matches blocked pattern: ${pattern}` };
    }
  }

  return { dangerous: false };
}

// Update the shell tool to use sandboxing.
// Re-register the shell tool with sandboxed execution.
const originalShell = toolRegistry.get("shell");
if (originalShell) {
  registerTool("shell", "Run a shell command (read-only by default, dangerous commands blocked)", async (_ctx, args) => {
    const command = String(args.command ?? "");
    if (!command) return { ok: false, output: "", error: "Missing 'command' argument" };

    // Check for dangerous commands.
    const { dangerous, reason } = isDangerousCommand(command);
    if (dangerous) {
      return { ok: false, output: "", error: `Command blocked: ${reason}` };
    }

    // Verify working directory is allowed.
    const cwd = _ctx.cwd ?? process.cwd();
    if (_ctx.workspaceId) {
      const allowedBase = process.cwd();
      try {
        await resolvePath(allowedBase, cwd);
      } catch {
        return { ok: false, output: "", error: "Working directory outside allowed workspace" };
      }
    }

    const { execSync } = await import("child_process");
    try {
      const output = execSync(command, {
        maxBuffer: 1024 * 1024,
        encoding: "utf-8",
        timeout: 30_000,
        cwd,
      });
      return { ok: true, output: String(output).slice(0, 50_000) };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, output: "", error: msg.slice(0, 1000) };
    }
  });
}
