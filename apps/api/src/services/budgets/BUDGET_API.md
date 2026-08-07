# Budget enforcement API

Callable from the Runs agent (compare/playground) and the gateway.

Import:

```ts
import {
  reserveBudget,
  settleBudget,
  releaseBudget,
  getLiveMonthlySpent,
  getLiveDailySpent,
} from "../budgets/enforce";
```

## `reserveBudget(input)`

```ts
reserveBudget({
  workspaceId: string;
  projectId?: string | null;
  apiKeyId?: string | null;
  estimateMicro: number; // integer micro-dollars
}): Promise<BudgetReservation>
```

- Atomically increments Redis counters for workspace monthly (+ daily if set) and matching project/api_key scopes.
- Throws `AppError(402, "budget_exceeded")` when hardBlock and `spent + estimate > limit`.
- Throws `AppError(503, "budget_unavailable")` when Redis is down **and** hardBlock is true (fail closed).
- Soft budgets (`hardBlock: false`) allow the call even if Redis is down.

## `settleBudget(input)`

```ts
settleBudget({
  reservationId: string;
  actualMicro: number;
  provider: string;
  model: string;
  source: string;          // "gateway" | "compare" | "playground" | ...
  inputTokens?: number;
  outputTokens?: number;
  runId?: string | null;
}): Promise<{ ledgerId: string }>
```

- Adjusts Redis by `(actual - estimate)`.
- Inserts an immutable `usage_ledger` row.
- Upserts `usage_rollups` for the day/dimensions.
- Increments Postgres `budgets.spent_micro`.

## `releaseBudget({ reservationId })`

- Subtracts the reserved estimate (provider failure / abort).
- Does **not** write a ledger row.

## Money units

All amounts are **integer micro-dollars** (`$1 = 1_000_000`). Never floats.
