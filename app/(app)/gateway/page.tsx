import { gatewayConfig } from "@/lib/mock-data";

export const metadata = {
  title: "Gateway & SDK",
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
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-ink)]">
          Gateway & SDK
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          OpenAI-compatible API — one integration, every provider. Costs tracked,
          budgets enforced.
        </p>
      </div>

      <div className="card p-6">
        <h3 className="mb-4 text-base font-semibold text-[var(--color-ink)]">
          Connection
        </h3>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-[var(--color-muted)]">
              Base URL
            </label>
            <code className="block rounded-lg bg-[var(--color-surface-2)] px-3 py-2 font-mono text-sm text-[var(--color-brand-2)]">
              {gatewayConfig.baseUrl}
            </code>
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--color-muted)]">
              API Key
            </label>
            <code className="block rounded-lg bg-[var(--color-surface-2)] px-3 py-2 font-mono text-sm text-[var(--color-ink)]">
              {gatewayConfig.apiKey}
            </code>
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--color-muted)]">
              Default model
            </label>
            <code className="block rounded-lg bg-[var(--color-surface-2)] px-3 py-2 font-mono text-sm text-[var(--color-ink)]">
              {gatewayConfig.defaultModel}
            </code>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="border-b border-[var(--color-border)] px-4 py-2.5">
            <span className="text-xs font-medium text-[var(--color-muted)]">
              TypeScript SDK
            </span>
          </div>
          <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-[var(--color-muted)]">
            {tsExample}
          </pre>
        </div>
        <div className="card overflow-hidden">
          <div className="border-b border-[var(--color-border)] px-4 py-2.5">
            <span className="text-xs font-medium text-[var(--color-muted)]">
              Python SDK
            </span>
          </div>
          <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-[var(--color-muted)]">
            {pyExample}
          </pre>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-[var(--color-border)] px-4 py-2.5">
          <span className="text-xs font-medium text-[var(--color-muted)]">
            cURL (OpenAI-compatible)
          </span>
        </div>
        <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-[var(--color-muted)]">
          {curlExample}
        </pre>
      </div>

      <div className="card p-6">
        <h3 className="mb-3 text-base font-semibold text-[var(--color-ink)]">
          Supported providers
        </h3>
        <div className="flex flex-wrap gap-2">
          {["OpenAI", "Anthropic", "Google", "DeepSeek", "Mistral", "Groq"].map(
            (p) => (
              <span
                key={p}
                className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-muted)]"
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
