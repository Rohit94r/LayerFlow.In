import {
  installScriptResponse,
  readInstallScript,
} from "@/lib/server/install-scripts";

/**
 * Serves the Windows (PowerShell) installer at:
 *   https://layerflow.dev/install.ps1
 * Used with:  irm https://layerflow.dev/install.ps1 | iex
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return installScriptResponse(await readInstallScript("install.ps1"));
}

