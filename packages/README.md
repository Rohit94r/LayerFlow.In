# packages/

Shared TypeScript workspace packages, imported by `apps/web` and `apps/api`:

- **`contracts/`** — `@layerflow/contracts`: zod schemas + TS types for every
  API area (one file per area: `chat.ts`, `agent.ts`, `rescue.ts`, …).
  Add request/response types here first; both apps consume them.
- **`model-registry/`** — `@layerflow/model-registry`: the model catalog
  (providers, models, pricing, capabilities). Single source of truth for
  which models the platform offers.
