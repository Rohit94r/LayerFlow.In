import {
  installScriptResponse,
  readInstallScript,
} from "@/lib/server/install-scripts";

/**
 * Alias so both of these work:
 *   curl -fsSL https://layerflow.dev/install | bash
 *   curl -fsSL https://layerflow.dev/install.sh | bash
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return installScriptResponse(await readInstallScript("install.sh"));
}

