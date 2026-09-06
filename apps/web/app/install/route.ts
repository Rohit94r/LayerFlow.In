import {
  installScriptResponse,
  readInstallScript,
} from "@/lib/server/install-scripts";

/**
 * Universal installer endpoint — mirror of the opencode pattern:
 *   curl -fsSL https://layerflow.dev/install | bash
 *
 * Serves the canonical installer script straight from the repo
 * (terminal/scripts/install.sh) so there is a single source of truth and no
 * GitHub dependency at install time.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return installScriptResponse(await readInstallScript("install.sh"));
}

