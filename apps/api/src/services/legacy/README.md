# services/legacy — FROZEN feature logic (kept, not shipped)

These business-logic modules belong to features that are **frozen**: kept in
`git` for career value / possible revival, but NOT shipped, not in nav, not in
pricing. Do NOT extend them.

Frozen here: **agents · audio · community · compare · learning · memory ·
rescue · runs**

Mirror of `routes/legacy/` (same feature list) so the HTTP and business layers
stay in sync. The **live** services are the siblings directly in `services/`,
e.g. `budgets/` (the heart of the product: reserve/settle/reconcile),
`keys/` (vault for provider keys), `reports/`, `notifications/`,
`email/`, `analytics/`, `savings/`, `billing/`, `demo/`, `security/`, `audit/`
— see `ARCHITECTURE.md`.