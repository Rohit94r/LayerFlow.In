import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Shared loader for the CLI installer scripts served by the /install* routes
 * (app/install, app/install.sh, app/install.ps1).
 *
 * The scripts live in terminal/scripts/ (single source of truth — the same
 * files GoReleaser attaches to GitHub releases). On Vercel they are
 * force-included in the serverless bundle via outputFileTracingIncludes in
 * next.config.mjs.
 *
 * cwd is apps/web (workspace root), so the scripts sit two levels up; the
 * second candidate covers being run from the repo root (`next dev apps/web`).
 */
export async function readInstallScript(
  name: "install.sh" | "install.ps1",
): Promise<string> {
  const script = [
    join(process.cwd(), "..", "..", "terminal", "scripts", name),
    join(process.cwd(), "terminal", "scripts", name),
  ].find((p) => existsSync(p))!;
  return readFile(script, "utf8");
}

/** Plain-text response used by all /install* routes. */
export function installScriptResponse(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
