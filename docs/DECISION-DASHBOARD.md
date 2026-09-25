# LayerFlow — Decision Dashboard

> Source: `docs/research.md` Appendix C. Track **5 numbers per week**. If none
> of them move for 3 weeks in a row, change the *approach* — not the feature
> list. This file is the template + the exact place each number comes from.
> One row per week; fill in on the same day every week (suggested: Monday).

## The 5 numbers (definitions + where to get them)

| # | Number | Definition | Source |
|---|---|---|---|
| 1 | **New signups** | accounts created this week (Google + email) | PostHog event `user_signed_up` — count for the week. Fallback: `select count(*) from users where created_at >= now() - interval '7 days'` |
| 2 | **Weekly-active users** | distinct users who made a **real gateway request** in the last 7 days | PostHog `gateway.request` distinct users — this is activation, not just login. Fallback: `select count(distinct workspace_id) from usage_ledger where created_at >= now() - interval '7 days'` |
| 3 | **Conversations done** | people you actually talked to (not clicks) | Manual — log each one in `docs/USER-CONVERSATIONS.md` (verbatim words, not your summary of them) |
| 4 | **Paying customers / MRR** | Pro subscriptions active + $ per month | Dodo dashboard + `select count(*) from subscriptions where status='active'`. MRR = active × 9 (or the real $ after promos) |
| 5 | **Hours spent** | your actual time on LayerFlow this week (build + talk + admin) | Your time log / weekly estimate. Be honest — this is the one your gut lies about |

## Weekly log

| Week of | Signups | WAU (real requests) | Conversations | Paying / MRR | Hours | What moved? What was tried? |
|---|---|---|---|---|---|---|
| 2026-09-25 (baseline) | 0 | 0 | 0 | 0 / $0 | — | Phase 5.1 E2E green (2 passed + 1 opt-in skip). Not yet deployed to prod. |
| | | | | | | |
| | | | | | | |

## Behavior rules

1. If the five **don't move for 3 straight weeks** → change the approach (pitch,
   channel, audience), **do not** add a feature.
2. If **conversations** is the only number moving → you're learning the right
   thing: keep talking until a *behavior* (activation or payment) follows.
3. One number defines the week. Pick one to focus before the others.
4. WAU uses **real gateway requests**, not page views. A signup that never makes
   a request is still zero.