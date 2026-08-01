import type { Prompt } from "@/lib/types";

export const PROMPTS: Prompt[] = [
  {
    id: "prompt-001",
    title: "Blog migration — image config fix",
    description: "Next.js 16 remote images with Cloudinary. Decision-first, checklist output.",
    content: `I'm migrating a WordPress blog to Next.js 16 App Router on Vercel, using Cloudinary as the image CDN.

Current state:
- All 47 post slugs and permalinks are preserved and 301-redirect correctly.
- SEO metadata works via the Metadata API and ISR revalidation at 3600s is live.
- next/image is broken: default loader returns 400 errors for WebP requests and Cloudinary URLs fail.

What already failed:
- Default loader + Cloudinary URLs → 400 errors.
- Accept-header WebP detection broke in the production build.

Constraints:
- Must not change any URL. Budget is $20/mo — free Cloudinary tier only.
- Deploy by end of this month.

Please give me:
1. The exact next.config.ts with remotePatterns for Cloudinary and proper formats.
2. A correct <Image> usage pattern for Cloudinary URLs, including sizing.
3. A checklist of the remaining 47 posts to migrate, sorted by image weight.
4. Any Vercel-specific gotchas for image optimization on the free/hobby plan.`,
    originalContent: `how do i fix next image with cloudinary? it keeps giving 400 errors and my site performance is bad, images are 12mb, what should i do, i'm moving from wordpress to nextjs`,
    score: 92,
    tags: ["nextjs", "images", "cloudinary", "migration"],
    model: "Gemini 2.5 Flash",
    version: 3,
    favorite: true,
    usageCount: 12,
    createdAt: "2026-08-02T09:20:00Z",
    updatedAt: "2026-08-02T09:20:00Z",
    sourceTool: "chatgpt",
  },
  {
    id: "prompt-002",
    title: "Cold email sequence — emails 4–7",
    description: "Continue a 7-email sequence with locked voice rules and metrics.",
    content: `Continue a 7-email cold outreach sequence for B2B SaaS founders (10–50 employees, founder-led).

Approved so far:
- Email 1 (day 0): problem hook — 34% open, 11% reply
- Email 2 (day 2): one-question follow-up
- Email 3 (day 4): proof point with short case

Voice: short sentences, max 120 words, one question per email, no fluff, professional but warm.

What failed before: long paragraphs and case-study style emails lowered replies.

Rules: no spam-trigger words. Personalize by referencing the prospect's stack (e.g. their CRM or billing tool).

Write emails 4–7 for days 7, 11, 16, 21. Keep the same voice. End email 7 with a polite break-up line. Mark personalization variables like {{stack}}.`,
    originalContent: `write me 4 more cold emails, the first 3 are done, keep the same style`,
    score: 89,
    tags: ["sales", "copywriting", "outreach"],
    model: "Gemini 2.5 Flash",
    version: 2,
    favorite: false,
    usageCount: 8,
    createdAt: "2026-08-01T16:45:00Z",
    updatedAt: "2026-08-01T17:00:00Z",
    sourceTool: "chatgpt",
  },
  {
    id: "prompt-003",
    title: "Webhook API — HMAC + DLQ design",
    description: "Decision-first system design continuation with code examples.",
    content: `Complete the webhook ingestion API design. Continue from what's approved — do not re-explain the basics.

Approved so far:
- event_log table with idempotency_key (dedupe works at 1k rps)
- 3 retries, exponential backoff with jitter
- Worker queue for async processing
- HMAC auth chosen (mTLS rejected: senders can't do client certs)

What failed:
- Exactly-once without the idempotency table broke under load
- mTLS draft rejected

Constraints:
- At-least-once delivery, senders may be down 5 minutes
- PII never logged in plaintext
- Two-person team, no new infra

Produce:
1. HMAC signing + verification design with a short Node/TS example
2. Signature TTL policy recommendation
3. Dead-letter queue flow + replay procedure
4. Payload size limit recommendation

Keep it tight — design-doc style, decision-first.`,
    originalContent: `how should i do webhook security? also need dlq stuff`,
    score: 94,
    tags: ["api", "webhooks", "security", "architecture"],
    model: "Claude Sonnet 4.5",
    version: 4,
    favorite: true,
    usageCount: 15,
    createdAt: "2026-07-31T11:30:00Z",
    updatedAt: "2026-07-31T11:30:00Z",
    sourceTool: "claude",
  },
  {
    id: "prompt-004",
    title: "Landing page rewrite — problem-led hero",
    description: "Developer-first tone, no AI buzzwords, one CTA per section.",
    content: `Rewrite the landing page copy for a developer tool. Use the test-learned structure — do not suggest a feature-first hero.

Approved direction:
- Problem-led hero (lifted signup 22%)
- Developer-first tone, zero AI buzzwords
- One CTA per section
- Total under 900 words

What failed: feature-first hero lost testers in 2 rounds.

Sections needed:
1. Hero (headline + subhead + CTA)
2. Problem (3 pain points)
3. How it works (3 steps)
4. Social proof (3 short quotes)
5. Final CTA

Constraints: no clichés like "revolutionize" or "game-changer". Write directly, like a senior engineer explaining a tool to a peer.`,
    originalContent: `rewrite our landing page copy pls, make it good`,
    score: 87,
    tags: ["copywriting", "landing-page", "marketing"],
    model: "Gemini 2.5 Pro",
    version: 2,
    favorite: false,
    usageCount: 5,
    createdAt: "2026-07-30T08:10:00Z",
    updatedAt: "2026-07-30T09:00:00Z",
    sourceTool: "gemini",
  },
  {
    id: "prompt-005",
    title: "Stripe refund flow — edge case review",
    description: "Partial refunds, proration, and EU compliance in a decision table.",
    content: `Review the Stripe refund flow design and complete the edge-case section.

Approved decisions:
- Prorate on plan change
- Refund to original payment method
- Stripe fees not refunded
- EU refund law: 14 days, no questions

Current state: partial refund + proration tested clean. Happy path done.

What failed: full-refund-only approach broke active subscriptions.

Produce:
1. Decision table: scenario → refund amount → subscription state
2. Bank-transfer fallback flow (when original method fails)
3. Dispute/chargeback handling steps
4. 5 test cases for the QA suite

Output: markdown table + short numbered list. No prose.`,
    originalContent: `we need to handle stripe refunds better, what are the edge cases?`,
    score: 85,
    tags: ["payments", "stripe", "logic"],
    model: "Kimi K2",
    version: 1,
    favorite: false,
    usageCount: 3,
    createdAt: "2026-07-28T14:30:00Z",
    updatedAt: "2026-07-28T14:30:00Z",
    sourceTool: "kimi",
  },
  {
    id: "prompt-006",
    title: "TypeScript strict migration plan",
    description: "Repo-wide strict-mode migration, ordered by dependency risk.",
    content: `Plan a repo-wide TypeScript strict-mode migration for a ~40k LOC Next.js app.

Constraints:
- Must keep the app deployable every day
- Team of 3, no dedicated refactor sprint
- CI enforces tsc --noEmit

Current state: strict: false. ~1,300 implicit-any errors estimated.

Produce:
1. Ordered migration phases by dependency risk (leaf modules first)
2. eslint-tsc incremental strategy that keeps CI green
3. Team playbook for the daily 30-min migration slot
4. Realistic timeline with buffers

Decision-first, numbered phases, no fluff.`,
    originalContent: `how do we migrate to strict typescript without breaking everything`,
    score: 90,
    tags: ["typescript", "refactor", "engineering"],
    model: "Claude Sonnet 4.5",
    version: 2,
    favorite: true,
    usageCount: 9,
    createdAt: "2026-07-27T10:00:00Z",
    updatedAt: "2026-07-27T10:30:00Z",
    sourceTool: "claude",
  },
];

export const PROMPT_BY_ID = Object.fromEntries(PROMPTS.map((p) => [p.id, p]));
