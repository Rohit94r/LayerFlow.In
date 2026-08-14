import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Universal installer endpoint — mirror of the opencode pattern:
 *   curl -fsSL https://layerflow.dev/install | bash
 *
 * Serves the canonical installer script straight from the repo
 * (terminal/scripts/install.sh) so there is a single source of truth and no
 * GitHub dependency at install time. Bundled explicitly via
 * outputFileTracingIncludes in next.config.mjs.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handler() {
  const script = join(process.cwd(), "terminal", "scripts", "install.sh");
  const body = await readFile(script, "utf8");

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

export const GET = handler;
