"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Zap, Plus, KeyRound, CheckCircle2 } from "@/components/ui/icons";
import { PageHeader } from "@/components/shared/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { getApiBaseUrl } from "@/lib/api/config";
import { modelService } from "@/lib/services/models";

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="scrollbar-thin overflow-x-auto rounded-lg border border-line/80 bg-bg-muted p-4 font-mono text-xs leading-relaxed text-ink">
      {children}
    </pre>
  );
}

export default function McpPage() {
  const [mcpUrl] = useState(() => `${getApiBaseUrl()}/api/mcp`);
  const [name, setName] = useState("mcp");
  const [secret, setSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(t);
  }, [copied]);

  async function createKey() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await modelService.createPlatformKey(name.trim() || "mcp");
      setSecret(res.secret);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the API key.");
    } finally {
      setBusy(false);
    }
  }

  function copyConfig() {
    if (!secret) return;
    navigator.clipboard
      ?.writeText(
        JSON.stringify(
          {
            mcpServers: {
              layerflow: {
                type: "http",
                url: mcpUrl,
                headers: { Authorization: `Bearer ${secret}` },
              },
            },
          },
          null,
          2,
        ),
      )
      .catch(() => undefined);
    setCopied(true);
  }

  const snippet = `{
  "mcpServers": {
    "layerflow": {
      "type": "http",
      "url": "${mcpUrl}",
      "headers": { "Authorization": "Bearer ${secret ?? "<lf_live_...>"}" }
    }
  }
}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="MCP server"
        description="Expose LayerFlow spend tools to Claude Code, Cursor, or any MCP client."
      />

      <Panel>
        <PanelHeader
          title={<span className="flex items-center gap-2"><Zap className="h-4 w-4 text-brand" />Model Context Protocol</span>}
          description="Let an agent read this month's spend and raise the cap from the chat."
        />
        <PanelBody>
          <div className="space-y-3">
            {[
              ["layerflow_get_budget", "Current monthly budget, spend, and % used in USD."],
              ["layerflow_set_monthly_budget", "Raise or lower the monthly cap and hard-block behavior."],
              ["layerflow_get_spend_summary", "Request/token/cost totals over any window, grouped as needed."],
              ["layerflow_list_projects", "List workspace projects to scope spend queries."],
            ].map(([tool, desc]) => (
              <div key={tool} className="flex items-start justify-between gap-4 rounded-lg border border-line/70 p-3">
                <div>
                  <div className="font-mono text-sm text-ink">{tool}</div>
                  <div className="text-sm text-faint">{desc}</div>
                </div>
                <Badge tone="neutral">tool</Badge>
              </div>
            ))}
          </div>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader
          title={<span className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-brand" />1. Create an API key</span>}
          description="The MCP client authenticates with a LayerFlow platform key (lf_live_…)."
        />
        <PanelBody>
          <div className="flex items-end gap-3">
            <Field label="Key name" hint="Optional">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="mcp" />
            </Field>
            <Button onClick={createKey} disabled={busy}>
              <Plus className="h-4 w-4" />
              {busy ? "Creating…" : "Generate key"}
            </Button>
          </div>
          {secret && (
            <div className="mt-3 rounded-lg border border-brand/30 bg-brand/5 p-3">
              <div className="mb-1 text-xs font-medium text-brand">Key created — copy it now, it won&apos;t be shown again</div>
              <code className="break-all font-mono text-sm text-ink">{secret}</code>
            </div>
          )}
          {error && <div className="mt-3 text-sm text-danger">{error}</div>}
          <div className="mt-3 text-sm text-faint">
            Need an existing key? Manage them on the{" "}
            <Link href="/keys" className="text-brand underline underline-offset-2">
              API keys
            </Link>{" "}
            page.
          </div>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader
          title={<span className="flex items-center gap-2"><Zap className="h-4 w-4 text-brand" />2. Add the server</span>}
          description="Paste into Claude Code (~/.claude.json) or Cursor as an HTTP MCP server."
        />
        <PanelBody>
          <CodeBlock>{snippet}</CodeBlock>
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-sm text-faint">
              Endpoint <span className="font-mono">{mcpUrl}</span> · same-origin, cookie-free (Bearer auth).
            </p>
            <Button variant="outline" onClick={copyConfig} disabled={!secret}>
              <CheckCircle2 className="h-4 w-4" />
              {copied ? "Copied" : "Copy config"}
            </Button>
          </div>
        </PanelBody>
      </Panel>

      <p className="text-center text-sm text-faint">
        Or from the terminal: <code className="font-mono text-xs">lf mcp layerflow --api-key=&lt;key&gt;</code>
      </p>
    </div>
  );
}