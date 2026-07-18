"use client";

import PageHeader from "@/components/workspace/PageHeader";
import { ErrorState, LoadingState } from "@/components/workspace/DataState";
import { useAsyncData, errorMessage } from "@/lib/hooks/use-async-data";
import { listApiKeys, getWorkspaceSettings } from "@/lib/api";
import { getGatewayBaseUrl } from "@/lib/api/config";
import { mapApiKey, mapSettings } from "@/lib/api/mappers";

const tsExample = `import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.LAYERFLOW_API_KEY,
  baseURL: "${getGatewayBaseUrl()}",
});

const response = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Hello!" }],
});

console.log(response.choices[0].message.content);`;

const pyExample = `from openai import OpenAI
import os

client = OpenAI(
    api_key=os.environ["LAYERFLOW_API_KEY"],
    base_url="${getGatewayBaseUrl()}",
)

response = client.chat.completions.create(
    model="claude-sonnet-4",
    messages=[{"role": "user", "content": "Hello!"}],
)

print(response.choices[0].message.content)`;

async function loadGateway() {
  const [keysRes, settingsRes] = await Promise.all([
    listApiKeys(),
    getWorkspaceSettings(),
  ]);
  const keys = keysRes.keys.map(mapApiKey);
  const settings = mapSettings(settingsRes.settings);
  return {
    baseUrl: getGatewayBaseUrl(),
    defaultModel: settings.defaultModel,
    keys,
  };
}

export default function GatewayClient() {
  const state = useAsyncData(loadGateway, []);

  if (state.status === "loading") return <LoadingState label="Loading gateway…" />;
  if (state.status === "error") {
    return <ErrorState message={errorMessage(state.error)} onRetry={state.reload} />;
  }

  const { baseUrl, defaultModel, keys } = state.data;
  const primaryKey = keys[0];
  const curlExample = `curl ${baseUrl}/chat/completions \\
  -H "Authorization: Bearer $LAYERFLOW_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${defaultModel}",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Build"
        title="Gateway"
        description="BYOK, OpenAI-compatible API, and SDK snippets — for when you deploy, not the center of the workspace."
      />

      <div className="card p-6">
        <h3 className="text-base font-semibold text-ink">Connection</h3>
        <p className="mt-0.5 text-sm text-muted">
          Your keys, every LLM, one workspace — and an API when you deploy.
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs text-muted">Base URL</label>
            <code className="block rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-ink">
              {baseUrl}
            </code>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">API key</label>
            <code className="block rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-ink">
              {primaryKey
                ? `${primaryKey.prefix}••••••••`
                : "Create a key in Settings — secret shown once"}
            </code>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Default model</label>
            <code className="block rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-ink">
              {defaultModel}
            </code>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="workspace-code-block">
          <div className="workspace-code-header">TypeScript (OpenAI SDK)</div>
          <pre>{tsExample}</pre>
        </div>
        <div className="workspace-code-block">
          <div className="workspace-code-header">Python (OpenAI SDK)</div>
          <pre>{pyExample}</pre>
        </div>
      </div>

      <div className="workspace-code-block">
        <div className="workspace-code-header">cURL (OpenAI-compatible)</div>
        <pre>{curlExample}</pre>
      </div>

      <div className="card p-6">
        <h3 className="text-base font-semibold text-ink">Supported providers</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {["OpenAI", "Anthropic", "Google", "DeepSeek", "Groq", "xAI", "OpenRouter"].map(
            (p) => (
              <span
                key={p}
                className="rounded-lg border border-border px-3 py-1 text-xs text-muted"
              >
                {p}
              </span>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
