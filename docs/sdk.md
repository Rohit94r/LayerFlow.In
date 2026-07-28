# LayerFlow SDK

> **Status: not published.** There is no `@layerflow/sdk` (or Python package) on npm / PyPI yet. Marketing snippets that showed `npm install @layerflow/sdk` were aspirational — do not treat them as live.

The OpenAI-compatible HTTP gateway already works. An official first-party SDK will wrap that gateway with typed helpers. Until it ships, use HTTP or the official OpenAI client pointed at LayerFlow.

Honest product gaps (worker, BYOK, DNS, etc.): see [features-status.md](features-status.md).

---

## Why an SDK later?

LayerFlow’s differentiator is the **workspace** (prompts, timeline, budgets, compare). The gateway is one surface on top of that:

| Today | Later |
|-------|--------|
| `POST /v1/chat/completions` with an `lf_…` key | Thin TypeScript (then Python) client |
| OpenAI SDK with `baseURL` → LayerFlow `/v1` | Same calls, plus LayerFlow-specific helpers |
| Hard budgets return **402** over HTTP | Typed budget / error helpers in the SDK |

Shipping a package before the gateway path is solid would only recreate the fake-install problem. Phase 0 is “HTTP works”; the SDK wraps that.

---

## Planned packages / features (TypeScript first)

Working name: **`@layerflow/sdk`** (not on npm yet).

| Area | Planned behavior |
|------|------------------|
| **Client** | `LayerFlow` / thin wrapper around chat completions |
| **Auth** | Optional helpers for `lf_…` keys (env, headers); no magic beyond Bearer auth |
| **Streaming** | SSE / stream helpers matching gateway `stream: true` |
| **Budgets & errors** | Map **402** (and related) to typed errors |
| **Models** | List / resolve models exposed by the gateway |
| **Drop-in** | Remain compatible with OpenAI request shapes where possible |

Python (`layerflow` / similar) is **Phase 2**, after the TypeScript package is published and stable.

---

## Use LayerFlow today (no SDK)

### 1. Mint a key

In the app: **Gateway** (`/gateway`) → create an API key. The secret (`lf_…`) is shown once.

You still need **BYOK** (or platform Groq/Gemini keys where configured) for provider calls. See [features-status.md](features-status.md) §3.

### 2. curl

Production uses **same-origin** `/v1` on `layerflow.dev` until dedicated `api.layerflow.dev` DNS is live. Local API defaults to port `8787`.

```bash
# Production (same-origin on layerflow.dev)
curl -X POST https://layerflow.dev/v1/chat/completions \
  -H "Authorization: Bearer lf_...your-secret..." \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Say hi"}]}'

# Local
curl -X POST http://localhost:8787/v1/chat/completions \
  -H "Authorization: Bearer lf_...your-secret..." \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Say hi"}]}'
```

Identical requests may hit the exact-match cache (`x-layerflow-cache: hit`). Over-budget calls return **402**.

### 3. OpenAI SDK (any language) with `baseURL`

```ts
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.LAYERFLOW_API_KEY, // lf_…
  baseURL: "https://layerflow.dev/v1",   // or http://localhost:8787/v1
});

const result = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Say hi" }],
});
```

```python
from openai import OpenAI
import os

client = OpenAI(
    api_key=os.environ["LAYERFLOW_API_KEY"],
    base_url="https://layerflow.dev/v1",
)

result = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Say hi"}],
)
```

More walkthrough: [getting-started.md](getting-started.md) §7. In-app snippets also live on `/gateway`.

---

## Roadmap

| Phase | What | Status |
|-------|------|--------|
| **0 — HTTP** | OpenAI-compatible `/v1/chat/completions`, `lf_` keys, budgets, cache | **Available** (needs keys / Redis / BYOK as in features-status) |
| **1 — TypeScript SDK** | Publish `@layerflow/sdk`: client, streaming, 402 helpers, model list | **Planned / being built** — not on npm |
| **2 — Python** | PyPI client mirroring the TS surface | Planned after Phase 1 |
| **3+** | Deeper workspace APIs in SDK (only if product needs them) | Not committed |

Do **not** claim the SDK is live in blogs, landing copy, or demos until Phase 1 is published and linked from this doc.

---

## Related docs

| Doc | Use |
|-----|-----|
| [features-status.md](features-status.md) | What’s working vs stub (incl. “no published SDK”) |
| [getting-started.md](getting-started.md) | Mint a key and call the gateway |
| [deployment.md](deployment.md) | Prod hosts, same-origin vs Fly DNS |
| [features.md](features.md) | Product scope |
