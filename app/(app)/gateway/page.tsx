import PageHeader from "@/components/workspace/PageHeader";
import { gatewayConfig } from "@/lib/mock-data";

export const metadata = {
  title: "Gateway",
};

const tsExample = `import LayerFlow from "@layerflow/sdk";

const client = new LayerFlow({
  apiKey: process.env.LAYERFLOW_API_KEY,
  // OpenAI-compatible — drop-in replacement
});

const response = await client.chat.completions.create({
  model: "gpt-4o",           // or claude-sonnet-4, gemini-2.5-pro
  messages: [{ role: "user", content: "Hello!" }],
});

console.log(response.choices[0].message.content);
// Cost tracked automatically · budget enforced`;

const pyExample = `from layerflow import LayerFlow

client = LayerFlow(api_key=os.environ["LAYERFLOW_API_KEY"])

response = client.chat.completions.create(
    model="claude-sonnet-4",
    messages=[{"role": "user", "content": "Hello!"}],
)

print(response.choices[0].message.content)`;

const curlExample = `curl https://api.layerflow.dev/v1/chat/completions \\
  -H "Authorization: Bearer $LAYERFLOW_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`;

export default function GatewayPage() {
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
              {gatewayConfig.baseUrl}
            </code>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">API key</label>
            <code className="block rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-ink">
              {gatewayConfig.apiKey}
            </code>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">
              Default model
            </label>
            <code className="block rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-ink">
              {gatewayConfig.defaultModel}
            </code>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="workspace-code-block">
          <div className="workspace-code-header">TypeScript SDK</div>
          <pre>{tsExample}</pre>
        </div>
        <div className="workspace-code-block">
          <div className="workspace-code-header">Python SDK</div>
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
          {["OpenAI", "Anthropic", "Google", "DeepSeek", "Mistral", "Groq"].map(
            (p) => (
              <span
                key={p}
                className="rounded-lg border border-border px-3 py-1 text-xs text-muted"
              >
                {p}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}
