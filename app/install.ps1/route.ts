import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Serves the Windows (PowerShell) installer at:
 *   https://layerflow.dev/install.ps1
 * Used with:  irm https://layerflow.dev/install.ps1 | iex
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const script = join(process.cwd(), "terminal", "scripts", "install.ps1");
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
