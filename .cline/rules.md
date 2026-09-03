# LayerFlow Rules

## Before any edit
1. Read `31August.md` — find first unchecked box in current phase.
2. Inspect actual code before editing. Never assume mock/fake.
3. Never remove test mocks; only remove production mocks.

## Quality gate (every commit)
```bash
npx tsc --noEmit && npm test && npm test --workspace @layerflow/api && (cd terminal && go build ./... && go vet ./... && go test -race ./...) && npx next build
```

## Hard rules
- Never fabricate model support, users, revenue, or success states.
- Never expose secrets, bypass permissions, or log raw chat content.
- Never add models to the registry without a working adapter.
- Never present invented job listings as real found jobs.
- Cost must always be calculated server-side — never trust client values.
- One truth: `packages/model-registry/src/index.ts` for models.
- Document actual implementation. If it isn't wired, don't call it done.