import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Alias so both of these work:
 *   curl -fsSL https://layerflow.dev/install | bash
 *   curl -fsSL https://layerflow.dev/install.sh | bash
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
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
