# routes/legacy — FROZEN feature routes (kept, not shipped)

These HTTP routers belong to features that are **frozen**: kept in `git` for
career value / possible revival, but NOT in navigation, pricing, or docs, and
not part of the wedge ("AI spend firewall"). Do NOT extend them.

Frozen here: **agents · audio · autosubmit · community · compare · learning ·
memory · rescue · runs**

Tree shadow of `services/legacy/` — if you add (or revive) a feature, keep its
HTTP layer and business layer in the same-named folder so the two maps match.

The **live** routes are the siblings directly in `routes/`, e.g.
`budgets/`, `keys/`, `report/`, `notifications/`, `billing/`,
`models/`, `workspace/`, `admin/`, `sync/`, `terminal/` — see `ARCHITECTURE.md`.