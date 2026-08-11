import type { BlogPost } from "@/lib/blog/types";

/**
 * Search Console corpus — Batch 4 (Aug 14): BYOK, API keys, security cluster.
 */
export const corpusSC4: BlogPost[] = [
  {
    "slug": "byok-for-beginners-guide",
    "title": "BYOK Explained: Bring Your Own Key for AI Tools, Plain and Simple",
    "metaTitle": "BYOK Explained for Beginners (2026)",
    "description": "BYOK (bring your own key) explained simply: what it is, how it works, what it costs, and whether it is right for you in 2026.",
    "publishedAt": "2026-08-14",
    "category": "AI gateway",
    "tags": ["BYOK", "bring your own key", "API key", "AI tool pricing"],
    "primaryKeyword": "BYOK",
    "secondaryKeywords": ["bring your own key explained", "what is BYOK AI", "BYOK setup", "BYOK for beginners"],
    "readingTime": "6 min read",
    "author": "LayerFlow Team",
    "relatedSlugs": ["bring-your-own-keys-byok", "byok-vs-platform-credits", "connecting-byok-providers", "byok-in-windsurf-guide"],
    "blocks": [
      { "type": "p", "text": "BYOK — bring your own key — means an AI tool uses your own API key from OpenAI, Anthropic, Google, or another provider instead of selling you access through its own credits. You pay the provider directly for tokens; the tool charges separately for what it adds." },
      { "type": "p", "text": "In 2026 BYOK is everywhere — Cursor, Warp, JetBrains, and GitHub Copilot all added BYOK options in the past year. This guide explains it plainly: how it works, what it costs, and who should use it. [LayerFlow is BYOK-first](/sign-in); the [docs](/docs) cover key setup and [pricing](/pricing) shows the plans." },
      { "type": "h2", "id": "how-it-works", "text": "How BYOK works" },
      { "type": "ol", "items": [
        "You create an account and API key at the provider (OpenAI, Anthropic, Google, DeepSeek).",
        "You paste the key into the tool's settings once — it is stored encrypted.",
        "The tool calls the provider using your key, on your billing account.",
        "Your provider bill reflects your usage at published rates.",
        "The tool charges separately — usually a subscription for its features."
      ] },
      { "type": "p", "text": "The key difference from subscriptions: your AI usage is billed by the provider at the provider's rate, not bundled into a plan at a marked-up price." },
      { "type": "h2", "id": "the-cost-reality", "text": "The cost reality" },
      { "type": "p", "text": "Resold credits carry markups of 20-50% over provider rates. BYOK eliminates the markup but adds two real costs: you manage the billing yourself, and you can overspend if nothing caps your usage. The math works out for anyone who uses AI more than a few hours a week." },
      { "type": "h2", "id": "who-should-use-it", "text": "Who should use BYOK" },
      { "type": "ul", "items": [
        "Developers and heavy users who want provider pricing and instant access to new models.",
        "Teams with existing provider agreements or enterprise rates.",
        "Anyone with privacy or compliance requirements — data flows under your own provider agreement.",
        "Students and budget users who pay only for what they consume."
      ] },
      { "type": "h2", "id": "who-should-skip-it", "text": "Who can skip it" },
      { "type": "p", "text": "Casual users who open an AI tool twice a month will not notice the markup. And anyone unwilling to set limits should stay on subscriptions until they add caps — BYOK without a budget is just transparency with risk." },
      { "type": "h2", "id": "security-basics", "text": "The security basics" },
      { "type": "ul", "items": [
        "Store keys in the tool's secure vault, never in shared files or code.",
        "Use per-tool keys so a leak is revocable without killing other integrations.",
        "Set spend caps and alerts on the provider console and the tool.",
        "Rotate keys on a schedule — see the [rotation guide](/blog/api-key-rotation-automation)."
      ] },
      { "type": "callout", "text": "Pro tip: create a dedicated key per tool with a spend limit in the provider console. When a tool goes unused, revoke its key — no other integration notices." },
      { "type": "h2", "id": "next-steps", "text": "Internal next steps" },
      { "type": "p", "text": "Go deeper with [Why BYOK Is the Smartest Move in 2026](/blog/bring-your-own-keys-byok) and [BYOK vs Platform Credits: The Math](/blog/byok-vs-platform-credits). For the coding-tool angle, read [What Is BYOK in Windsurf](/blog/byok-in-windsurf-guide)." },
      { "type": "p", "text": "Try BYOK today: [sign in](/sign-in) to LayerFlow and connect your own key in minutes. [Pricing](/pricing) covers the free tier." },
      { "type": "h2", "id": "faq", "text": "FAQ" },
      { "type": "faq", "items": [
        { "q": "What does BYOK mean in AI tools?", "a": "BYOK means bring your own key: you connect your own API key from a provider like OpenAI or Anthropic, and the tool calls the provider on your account at published rates instead of selling you marked-up credits." },
        { "q": "Is BYOK cheaper than subscriptions?", "a": "Usually yes for regular users. Resold credits carry 20-50% markups, so BYOK removes that. The trade-offs are self-managed billing and the need to set your own spend caps." },
        { "q": "Is BYOK safe?", "a": "Yes, with basics: encrypted key storage in the tool, one key per tool, spend caps, and rotation. Your data flows under your own provider agreement, which is often a compliance advantage." }
      ] }
    ]
  },
  {
    "slug": "byok-vs-platform-credits",
    "title": "BYOK vs Platform Credits: The Math Behind AI Tool Pricing",
    "metaTitle": "BYOK vs Platform Credits: The Math",
    "description": "BYOK vs platform credits: do the math on markups, expiry, and model access — and see when each pricing model wins for your usage.",
    "publishedAt": "2026-08-14",
    "category": "AI gateway",
    "tags": ["BYOK vs credits", "AI tool pricing", "API cost", "credit systems AI"],
    "primaryKeyword": "BYOK vs platform credits",
    "secondaryKeywords": ["AI credit markup", "resold AI credits", "BYOK cost comparison", "AI tool pricing models"],
    "readingTime": "6 min read",
    "author": "LayerFlow Team",
    "relatedSlugs": ["byok-for-beginners-guide", "bring-your-own-keys-byok", "ai-tool-security-audit", "connecting-byok-providers"],
    "blocks": [
      { "type": "p", "text": "Two pricing models dominate AI tools: platform credits, where you buy usage from the tool at its rates, and BYOK, where your own key bills you at provider rates. The gap between them is usually 20-50% of your AI spend — and it is rarely visible on the pricing page." },
      { "type": "p", "text": "This guide does the math both ways, including the hidden costs of each model, and ends with the question that decides which one is right for you. [LayerFlow chose BYOK](/sign-in) — the [pricing page](/pricing) shows exactly what the tool charges separately." },
      { "type": "h2", "id": "what-platform-credits-cost", "text": "What platform credits actually cost" },
      { "type": "p", "text": "The tool buys tokens at provider rates and resells them inside a subscription or credit pack. The markup is invisible by design: a $20 plan might contain $5 of tokens and $15 of interface, or $15 of tokens and $5 of interface — you cannot tell from the price. Credits also expire on many platforms, so the unused half of a pack is revenue, not inventory." },
      { "type": "h2", "id": "what-byok-costs", "text": "What BYOK costs" },
      { "type": "p", "text": "BYOK passes provider rates through unchanged. The tool charges a separate, transparent fee for its features. Your bill has three clear line items instead of one opaque plan: the provider bill at published rates, the tool subscription, and whatever you spent on mistakes like un-capped usage." },
      { "type": "h2", "id": "the-hidden-costs", "text": "The hidden costs of each model" },
      { "type": "ul", "items": [
        "Credits: markups, expiry, rate-limit surprises, and model access limited to the platform's roadmap.",
        "BYOK: self-managed billing, spend risk without caps, and key security responsibility."
      ] },
      { "type": "p", "text": "The credit model's hidden costs are structural — they come from the business model. The BYOK hidden costs are behavioral — they come from your setup. Structural costs never go away; behavioral costs are fixed with caps and a rotation schedule." },
      { "type": "h2", "id": "the-decision", "text": "The decision question" },
      { "type": "p", "text": "Ask one question: are you paying for the tool's features, or for the tokens? If the tool's interface and workflow are the value, BYOK gets you the same features without paying a token markup. If you barely use AI, the convenience of credits wins. Heavy users, teams, and anyone with compliance needs land on BYOK." },
      { "type": "callout", "text": "Pro tip: run the export test. Export your last month of usage, calculate what it would cost at provider rates, and compare with what you paid. The gap is the markup — and it is usually a 2-3x difference." },
      { "type": "h2", "id": "next-steps", "text": "Internal next steps" },
      { "type": "p", "text": "Read [BYOK Explained for Beginners](/blog/byok-for-beginners-guide) for the basics and [Why BYOK Is the Smartest Move](/blog/bring-your-own-keys-byok) for the trend argument. For security, see [The AI Tool Security Audit](/blog/ai-tool-security-audit)." },
      { "type": "p", "text": "Do the math on your own usage: [sign in](/sign-in) to LayerFlow and connect a key — the cost check shows provider rates before every run. [Pricing](/pricing) lists the flat fee." },
      { "type": "h2", "id": "faq", "text": "FAQ" },
      { "type": "faq", "items": [
        { "q": "Is BYOK cheaper than buying credits?", "a": "For regular users, yes. Platform credits carry invisible 20-50% markups and expiry; BYOK passes provider rates through. The trade-off is self-managed billing and the discipline of setting caps." },
        { "q": "Why do AI tools prefer credits?", "a": "Credits lock in revenue, expire unused, and hide the markup — none of which serve the user. BYOK forces the tool to compete on features, which is why it is spreading." },
        { "q": "Can I use BYOK and credits together?", "a": "Yes. Many users keep subscriptions for casual tools and BYOK for heavy tools. The math usually flips everything to BYOK once usage passes a few hours a week." }
      ] }
    ]
  },
  {
    "slug": "llm-api-key-management-guide",
    "title": "LLM API Key Management: Vaults, Rotation, and Least Privilege",
    "metaTitle": "LLM API Key Management Guide (2026)",
    "description": "LLM API key management: secure vaults, per-key scoping, rotation schedules, and least-privilege policies for OpenAI, Anthropic, and Google keys.",
    "publishedAt": "2026-08-14",
    "category": "AI gateway",
    "tags": ["API key management", "LLM keys", "key security", "BYOK security"],
    "primaryKeyword": "LLM API key management",
    "secondaryKeywords": ["manage API keys securely", "OpenAI API key security", "key vault LLM", "least privilege API keys"],
    "readingTime": "7 min read",
    "author": "LayerFlow Team",
    "relatedSlugs": ["secure-ai-key-management", "managing-multiple-llm-api-keys", "api-key-rotation-automation", "team-api-keys-security"],
    "blocks": [
      { "type": "p", "text": "An exposed LLM API key is a credit card with no spending limit and no name on it. Credential sprawl is one of the most common AI security failures — keys pasted into shared chats, committed to repos, and reused across every tool and teammate." },
      { "type": "p", "text": "LLM API key management is the discipline that prevents this: vaults, per-key scoping, rotation, and least privilege. This guide covers the policy and the mechanics. [LayerFlow's key vault](/sign-in) implements it for BYOK users; the [docs](/docs) show the setup and [pricing](/pricing) the plans." },
      { "type": "h2", "id": "principle-1-vaulting", "text": "Principle 1: Keys live in vaults, not files" },
      { "type": "p", "text": "A key belongs in an encrypted store with access control: a secrets manager, a tool's key vault, or a password manager — never in source code, .env files committed to git, or chat messages. The test is simple: if a teammate joins the repo and the key is readable, the key is compromised." },
      { "type": "h2", "id": "principle-2-scoping", "text": "Principle 2: One key per purpose" },
      { "type": "p", "text": "Create a separate key per tool, per environment (dev, staging, prod), and per client. A leaked CI key then revokes without breaking your editor integration. Scoped keys also make provider dashboards useful: the key burning the most tokens is identifiable by name." },
      { "type": "h2", "id": "principle-3-rotation", "text": "Principle 3: Rotation on a schedule" },
      { "type": "p", "text": "Rotate keys quarterly, immediately after a suspected leak, and when anyone with access leaves. Automation beats calendars: most providers allow multiple active keys, so rotate with an overlap window and zero downtime. Full process in the [rotation guide](/blog/api-key-rotation-automation)." },
      { "type": "h2", "id": "principle-4-least-privilege", "text": "Principle 4: Least privilege" },
      { "type": "p", "text": "A key should do one job with the minimum permission: read-only where possible, per-model if the provider supports it, with a spend cap that matches its purpose. A key with org-level permissions and no cap is an incident waiting for a trigger." },
      { "type": "callout", "text": "Pro tip: add a spend cap to every key at creation. Most providers and tools let you set per-key limits — it is the cheapest insurance against both leaks and runaway loops." },
      { "type": "h2", "id": "the-policy", "text": "The written policy" },
      { "type": "ul", "items": [
        "Keys never appear in code, chats, or docs.",
        "One key per tool and environment, named consistently.",
        "Rotation quarterly and on any personnel change.",
        "Spend caps on every key.",
        "Revocation within one hour of a suspected leak."
      ] },
      { "type": "h2", "id": "common-mistakes", "text": "Common mistakes" },
      { "type": "ul", "items": [
        "Sharing one team key — attribution dies and leaks are catastrophic.",
        "Committing .env files to repositories.",
        "Never rotating, so every former teammate still holds live keys.",
        "No per-key caps — one leak becomes a five-figure bill.",
        "Storing keys in AI chats where they train models' context."
      ] },
      { "type": "h2", "id": "next-steps", "text": "Internal next steps" },
      { "type": "p", "text": "Continue with [Secure AI Key Management](/blog/secure-ai-key-management) and [Managing Multiple LLM API Keys](/blog/managing-multiple-llm-api-keys). For teams, read [Team API Keys Without the Security Nightmare](/blog/team-api-keys-security)." },
      { "type": "p", "text": "Put your keys in a real vault: [sign in](/sign-in) to LayerFlow and connect keys with per-purpose scoping, or review [pricing](/pricing) first." },
      { "type": "h2", "id": "faq", "text": "FAQ" },
      { "type": "faq", "items": [
        { "q": "How do I manage LLM API keys securely?", "a": "Four practices: keys in encrypted vaults, one key per purpose and environment, rotation on a quarterly schedule, and least privilege with spend caps on every key." },
        { "q": "What happens if my API key leaks?", "a": "Anyone with the key can spend your balance. Revoke the key immediately, check provider logs for unauthorized usage, rotate remaining keys, and fix the leak path before generating a replacement." },
        { "q": "Should I share API keys with my team?", "a": "No. Give each teammate scoped keys with caps. A shared key removes attribution, makes leaks catastrophic, and cannot be revoked for one person." }
      ] }
    ]
  },
  {
    "slug": "team-api-keys-security",
    "title": "Team API Keys: Sharing Credentials Without a Security Nightmare",
    "metaTitle": "Team API Keys: Sharing Credentials Safely",
    "description": "Team API keys done right: per-member keys, caps, vaults, and onboarding flows that keep AI credentials secure without slowing the team down.",
    "publishedAt": "2026-08-14",
    "category": "AI gateway",
    "tags": ["team API keys", "API key sharing", "team AI credentials", "key management teams"],
    "primaryKeyword": "team API keys",
    "secondaryKeywords": ["share API keys team", "team AI credentials", "per member API keys", "secure team keys"],
    "readingTime": "6 min read",
    "author": "LayerFlow Team",
    "relatedSlugs": ["llm-api-key-management-guide", "managing-multiple-llm-api-keys", "secure-ai-key-management", "ai-cost-per-client-tracking"],
    "blocks": [
      { "type": "p", "text": "The shared Slack message with the API key is the most common AI security incident in small teams. It is also the most preventable: sharing a key is never the right answer, but the alternative — every teammate wrestling with provider consoles — is why teams do it anyway." },
      { "type": "p", "text": "The fix is a key distribution system: per-member keys, per-key caps, one vault, and an onboarding flow that takes minutes. This guide is that system. [LayerFlow's team keys](/sign-in) implement it; [pricing](/pricing) covers team plans." },
      { "type": "h2", "id": "why-shared-keys-fail", "text": "Why shared keys fail" },
      { "type": "ul", "items": [
        "No attribution: the bill cannot say who spent what.",
        "No revocation: one key cannot be revoked for one person.",
        "One leak is everyone's leak: the key is as safe as its most careless holder.",
        "No caps per person: one teammate's runaway loop drains the team budget."
      ] },
      { "type": "p", "text": "Every one of these failures is structural — you cannot fix them by being more careful with a shared key. You fix them by not sharing keys." },
      { "type": "h2", "id": "the-system", "text": "The per-member key system" },
      { "type": "ol", "items": [
        "Each teammate gets their own key, scoped to their role and environment.",
        "Each key carries a spend cap aligned to their work.",
        "Keys live in a shared vault with access control — nobody sees raw keys except owners.",
        "Offboarding revokes the key in one click; the rest of the team is untouched.",
        "Provider dashboards and the workspace show spend per member automatically."
      ] },
      { "type": "p", "text": "The per-member model converts key management from a security ritual into a byproduct of onboarding — the same flow that gives someone a laptop gives them a capped, scoped key." },
      { "type": "h2", "id": "team-vs-personal-context", "text": "Team keys for clients and projects" },
      { "type": "p", "text": "Agencies and consultancies need per-client keys: each client's usage billed to their own provider account or a dedicated key with a dedicated cap. This is where BYOK earns its keep — client A pays client A's usage, and the audit trail is clean. Details in the [per-client cost guide](/blog/ai-cost-per-client-tracking)." },
      { "type": "callout", "text": "Pro tip: name keys by person and purpose — alice-dev, alice-prod. Naming is what makes the provider dashboard legible, and legibility is what makes enforcement possible." },
      { "type": "h2", "id": "common-mistakes", "text": "Common mistakes" },
      { "type": "ul", "items": [
        "Pasting keys in Slack or Notion because the vault feels slow.",
        "One team key that everyone copies into their own tools.",
        "No caps per member, so the first runaway loop drains the month.",
        "Offboarding that forgets to revoke — former teammates hold live keys.",
        "Ignoring provider multi-key support because setup felt like work."
      ] },
      { "type": "h2", "id": "next-steps", "text": "Internal next steps" },
      { "type": "p", "text": "Read [LLM API Key Management](/blog/llm-api-key-management-guide) for the four principles and [API Key Rotation Automation](/blog/api-key-rotation-automation) for the schedule. For per-client billing, see [Track AI Costs Per Client](/blog/ai-cost-per-client-tracking)." },
      { "type": "p", "text": "Set up team keys in minutes: [sign in](/sign-in) to LayerFlow and invite your first teammate, or check [pricing](/pricing) for team plans." },
      { "type": "h2", "id": "faq", "text": "FAQ" },
      { "type": "faq", "items": [
        { "q": "How should teams share API keys?", "a": "They should not share one key. Give each member a scoped key with a spend cap, stored in a shared vault, revoked on offboarding. Attribution and revocation are the whole game." },
        { "q": "What is the safest way to distribute keys to teammates?", "a": "Per-member keys issued through a vault with access control, named by person and purpose, each with its own cap. Onboarding issues keys in the same flow as laptops." },
        { "q": "How do I revoke a teammate's API key?", "a": "With per-member keys, revoke that member's key in the provider console or vault — one click, no impact on anyone else. Then rotate if the key ever touched shared systems." }
      ] }
    ]
  },
  {
    "slug": "software-private-key-workflows-2026",
    "title": "Software Private Key Workflows: Git, CI/CD, and LLM Keys in 2026",
    "metaTitle": "Software Private Key Workflows (2026)",
    "description": "Private key workflows for software teams: git-safe key storage, CI/CD secret injection, and LLM API keys without leaks — the 2026 playbook.",
    "publishedAt": "2026-08-14",
    "category": "AI gateway",
    "tags": ["private key workflows", "CI/CD secrets", "git secrets", "API key security"],
    "primaryKeyword": "software private key workflows",
    "secondaryKeywords": ["private key management software", "CI/CD secret management", "git secret scanning", "LLM keys in CI"],
    "readingTime": "7 min read",
    "author": "LayerFlow Team",
    "relatedSlugs": ["secure-ai-key-management", "private-key-workflows-software-teams", "llm-api-key-management-guide", "api-key-rotation-automation"],
    "blocks": [
      { "type": "p", "text": "A private key in git history is a permanent incident: even when the file is deleted, the key lives in every clone and fork forever. For software teams this is the classic leak — and in 2026 the stakes grew, because LLM API keys behave like credit cards with no caps." },
      { "type": "p", "text": "This playbook covers the full private key workflow: git-safe storage, CI/CD secret injection, scanning, rotation, and the LLM-specific additions teams now need. The [LayerFlow key vault](/sign-in) covers the LLM half; the [docs](/docs) show integration patterns." },
      { "type": "h2", "id": "workflow-1-git", "text": "Workflow 1: Git-safe key storage" },
      { "type": "ul", "items": [
        "Never commit .env or key files — add them to .gitignore before the first commit.",
        "Use secret managers for storage: a secrets vault, not files on disk.",
        "For local dev, use env injection or a local secrets store with access control.",
        "Treat any key that ever hit a repo as compromised: rotate it, even if history was purged."
      ] },
      { "type": "p", "text": "The rotation rule is the one that saves teams: git history is immortal, so a committed key is a leaked key. Rotate, do not sanitize." },
      { "type": "h2", "id": "workflow-2-ci", "text": "Workflow 2: CI/CD secret injection" },
      { "type": "ol", "items": [
        "Store secrets in the CI provider's secret store, scoped to the environment.",
        "Inject them as environment variables at runtime — never baked into images.",
        "Scope secrets per job: build, test, and deploy get only what they need.",
        "Mask secrets in logs so accidental echoes do not print them.",
        "Use environment-specific secrets for dev, staging, and prod."
      ] },
      { "type": "p", "text": "The rule that prevents most pipeline leaks: a secret is injected where it is used, and exists nowhere else in the pipeline's artifacts." },
      { "type": "h2", "id": "workflow-3-scanning", "text": "Workflow 3: Scanning and prevention" },
      { "type": "p", "text": "Prevention beats cleanup: enable secret scanning on every repo, add pre-commit hooks that block key-shaped strings, and run scheduled scans of history for patterns from all major providers. Scanning catches the leak after the fact; hooks stop it before the commit." },
      { "type": "h2", "id": "workflow-4-rotation", "text": "Workflow 4: Rotation with zero downtime" },
      { "type": "p", "text": "Rotation should be boring: providers allow multiple active keys, so create the new key, update references, verify, and revoke the old one. Automate it quarterly and on personnel changes. Full process in the [rotation guide](/blog/api-key-rotation-automation)." },
      { "type": "h2", "id": "llm-specific-rules", "text": "The LLM-specific additions" },
      { "type": "ul", "items": [
        "Every LLM key gets a spend cap at creation — the leak is billable otherwise.",
        "One key per tool and environment, so a CI leak does not kill the editor integration.",
        "Never paste keys into AI chats — they become context for other users' sessions.",
        "Log which key ran which workload, so a burn rate anomaly is attributable."
      ] },
      { "type": "callout", "text": "Pro tip: run the leave-the-team test. When anyone with key access departs, rotation should be a checklist item that completes in one hour — automated where possible, never dependent on memory." },
      { "type": "h2", "id": "next-steps", "text": "Internal next steps" },
      { "type": "p", "text": "Start with [Secure AI Key Management](/blog/secure-ai-key-management) and [Software Private Key Workflows for Teams](/blog/private-key-workflows-software-teams). Then [API Key Rotation Automation](/blog/api-key-rotation-automation) and [LLM API Key Management](/blog/llm-api-key-management-guide)." },
      { "type": "p", "text": "Apply the LLM rules to your stack: [sign in](/sign-in) to LayerFlow and connect scoped, capped keys — or review [pricing](/pricing) first." },
      { "type": "h2", "id": "faq", "text": "FAQ" },
      { "type": "faq", "items": [
        { "q": "How do I keep private keys out of git?", "a": "Gitignore secret files before the first commit, store secrets in a vault or CI secret store, inject via environment variables, and enable secret scanning plus pre-commit hooks that block key-shaped strings." },
        { "q": "What should I do if a key is committed?", "a": "Rotate it immediately — git history is permanent, so the key is compromised even after the file is removed. Then fix the leak path and scan for other secrets." },
        { "q": "How do LLM API keys fit into CI/CD?", "a": "Store them in the CI secret store scoped per environment and job, inject at runtime, mask in logs, and add spend caps at creation so a pipeline leak cannot run up the bill." }
      ] }
    ]
  },
  {
    "slug": "ai-tool-security-audit",
    "title": "The AI Tool Security Audit: 15 Questions Before You Connect a Key",
    "metaTitle": "AI Tool Security Audit: 15 Questions",
    "description": "Run an AI tool security audit before connecting your API key: 15 questions on storage, data flow, billing, and revocation across your AI stack.",
    "publishedAt": "2026-08-14",
    "category": "AI gateway",
    "tags": ["AI tool security", "security audit", "API key safety", "BYOK security"],
    "primaryKeyword": "AI tool security audit",
    "secondaryKeywords": ["AI tool security checklist", "API key safety", "BYOK security audit", "AI tool vetting"],
    "readingTime": "6 min read",
    "author": "LayerFlow Team",
    "relatedSlugs": ["data-privacy-ai-tools-byok", "byok-vs-platform-credits", "llm-api-key-management-guide", "ai-governance-small-teams"],
    "blocks": [
      { "type": "p", "text": "Every AI tool you connect a key to is a supply chain decision. The tool sees your prompts, holds your credentials, and touches your billing. Most teams audit their SaaS stack annually and their AI tools never — even though AI tools hold the most sensitive data of all." },
      { "type": "p", "text": "This is the 15-question audit. Run it before connecting a new key, and re-run it annually on everything already connected. The [LayerFlow security model](/sign-in) is designed to pass every question; the [docs](/docs) state the details." },
      { "type": "h2", "id": "storage-questions", "text": "Storage: how are keys handled?" },
      { "type": "ol", "items": [
        "Is my key encrypted at rest in the tool's vault?",
        "Can anyone on the vendor side see my raw key?",
        "Does the tool log keys or prompts in plaintext?",
        "Is the key rotatable without breaking my setup?"
      ] },
      { "type": "h2", "id": "data-questions", "text": "Data: what does the tool see?" },
      { "type": "ol", "items": [
        "Does the tool train on my prompts? (check the contract, not the settings page)",
        "Do my prompts flow directly to the provider, or through the tool's servers?",
        "Where is my data stored, and under which jurisdiction?",
        "Is there an audit trail of who accessed my workspace?"
      ] },
      { "type": "h2", "id": "billing-questions", "text": "Billing: who spends what?" },
      { "type": "ol", "items": [
        "Can I see provider-rate billing, or only the tool's credits?",
        "Can I set spend caps per key or per project?",
        "What happens if my usage spikes — block, alert, or silent?",
        "Can I attribute spend per teammate, client, or task?"
      ] },
      { "type": "h2", "id": "control-questions", "text": "Control: can I leave?" },
      { "type": "ol", "items": [
        "Can I revoke a key in one click?",
        "Can I export my prompts, versions, and data?",
        "Does offboarding remove my access everywhere?"
      ] },
      { "type": "callout", "text": "Pro tip: score the audit — anything under 12 of 15 means the tool is trading your security for its convenience. The two questions most tools fail: training on your prompts, and no per-key caps." },
      { "type": "h2", "id": "why-byok-passes", "text": "Why BYOK tools tend to pass" },
      { "type": "p", "text": "BYOK tools route your requests through your own provider account, which changes the data flow: your prompts go to the provider under your agreement, the tool never resells tokens, and provider dashboards give you real-time usage. BYOK is not automatically secure — the audit still applies — but it removes the two worst structural risks: opaque billing and data training by the reseller." },
      { "type": "h2", "id": "next-steps", "text": "Internal next steps" },
      { "type": "p", "text": "Continue with [Data Privacy in AI Tools: Why BYOK Is a Compliance Feature](/blog/data-privacy-ai-tools-byok) and [AI Governance for Small Teams](/blog/ai-governance-small-teams). For credentials, see [LLM API Key Management](/blog/llm-api-key-management-guide)." },
      { "type": "p", "text": "Audit your stack: [sign in](/sign-in) to LayerFlow and review the security docs, or compare [pricing](/pricing) and contracts before connecting keys." },
      { "type": "h2", "id": "faq", "text": "FAQ" },
      { "type": "faq", "items": [
        { "q": "What should I check before connecting an API key to an AI tool?", "a": "Run the 15-question audit: key encryption, plaintext logging, training on your prompts, data jurisdiction, provider-rate billing, spend caps, one-click revocation, and exportability." },
        { "q": "Do AI tools train on my prompts?", "a": "Some do. Check the contract, not the settings page — many tools reserve rights to use prompts for model improvement. BYOK tools that pass prompts through under your provider agreement remove this risk." },
        { "q": "How often should I audit AI tools?", "a": "Before connecting a new key and annually on everything connected. Re-audit immediately after any acquisition, privacy-policy change, or security incident at the vendor." }
      ] }
    ]
  },
  {
    "slug": "api-key-rotation-automation",
    "title": "API Key Rotation Automation: Zero-Downtime Rotations in 2026",
    "metaTitle": "API Key Rotation Automation (2026)",
    "description": "Automate API key rotation: overlap windows, scripts, CI checks, and revocation — zero-downtime rotation for LLM and SaaS keys in 2026.",
    "publishedAt": "2026-08-14",
    "category": "AI gateway",
    "tags": ["API key rotation", "key rotation automation", "secret rotation", "credential lifecycle"],
    "primaryKeyword": "API key rotation",
    "secondaryKeywords": ["key rotation automation", "rotate API keys", "credential lifecycle management", "zero downtime key rotation"],
    "readingTime": "6 min read",
    "author": "LayerFlow Team",
    "relatedSlugs": ["llm-api-key-management-guide", "software-private-key-workflows-2026", "secure-ai-key-management", "managing-multiple-llm-api-keys"],
    "blocks": [
      { "type": "p", "text": "Most key rotations happen in a panic at 2 a.m. after a leak. The alternative — scheduled, automated, zero-downtime rotation — is a discipline that most providers now support natively, because multiple active keys per account became table stakes in 2025." },
      { "type": "p", "text": "Rotation automation removes the two failure modes: forgetting to rotate, and breaking production while doing it. This guide covers the overlap pattern, the scripts, and the checks. The [LayerFlow vault](/sign-in) rotates with you; the [docs](/docs) cover the API." },
      { "type": "h2", "id": "the-overlap-pattern", "text": "The overlap pattern" },
      { "type": "ol", "items": [
        "Create the new key while the old one stays active.",
        "Deploy the new key to all references (vault, CI, tools, teammates).",
        "Verify: test traffic succeeds with the new key only.",
        "Revoke the old key once verification passes.",
        "Record the rotation in the audit log."
      ] },
      { "type": "p", "text": "The overlap is what makes rotation boring. Without it, every rotation is a deploy window with a rollback plan — with it, rotation is a background chore." },
      { "type": "h2", "id": "automation-building-blocks", "text": "The automation building blocks" },
      { "type": "ul", "items": [
        "A script that calls the provider API: create key, tag it with the date and owner.",
        "A vault or secrets manager as the single source of truth for the active key.",
        "A sweep that updates every reference from the vault — no hand-copied keys.",
        "A verification step: a test request through the new key before revocation.",
        "A calendar or CI job that triggers rotation quarterly and after any access change."
      ] },
      { "type": "callout", "text": "Pro tip: name keys by rotation date — alice-prod-2026Q3. Naming with dates makes the provider dashboard tell you which keys are overdue without any tooling." },
      { "type": "h2", "id": "rotation-triggers", "text": "When to rotate" },
      { "type": "ul", "items": [
        "On a fixed schedule: quarterly is the standard minimum.",
        "Immediately after any suspected leak, commit to git, or paste into chat.",
        "When anyone with key access leaves the team.",
        "After an incident at the provider or a vendor that touches your keys.",
        "When a key's spend pattern looks anomalous — the key may be compromised."
      ] },
      { "type": "h2", "id": "mistakes", "text": "Mistakes that break rotation" },
      { "type": "ul", "items": [
        "Revoking before verification — production breaks and blame follows.",
        "Keys hard-coded in repos or tools that never read from the vault.",
        "One key per account instead of per purpose, so every rotation is a big bang.",
        "No date naming, so the dashboard cannot show overdue keys.",
        "Rotation as a manual checklist item that competes with real work and loses."
      ] },
      { "type": "h2", "id": "next-steps", "text": "Internal next steps" },
      { "type": "p", "text": "Start with the foundations: [LLM API Key Management](/blog/llm-api-key-management-guide) and [Software Private Key Workflows](/blog/software-private-key-workflows-2026). Then [Secure AI Key Management](/blog/secure-ai-key-management) and [Managing Multiple LLM API Keys](/blog/managing-multiple-llm-api-keys)." },
      { "type": "p", "text": "Make rotation boring: [sign in](/sign-in) to LayerFlow and connect keys with dated naming and caps, or check [pricing](/pricing)." },
      { "type": "h2", "id": "faq", "text": "FAQ" },
      { "type": "faq", "items": [
        { "q": "How often should I rotate API keys?", "a": "At minimum quarterly, plus immediately after any leak, personnel change, or vendor incident. For high-risk keys — production, client data — monthly or continuous rotation is worth the automation." },
        { "q": "How do I rotate API keys without downtime?", "a": "Use the overlap pattern: create the new key while the old is active, deploy to all references, verify traffic, then revoke the old. Multiple active keys per account make this native on most providers." },
        { "q": "Can key rotation be fully automated?", "a": "Yes, with a vault as source of truth plus provider API calls for create/revoke, a sweep that updates all references, and a verification step. Calendar-triggered runs remove the human dependency." }
      ] }
    ]
  },
  {
    "slug": "data-privacy-ai-tools-byok",
    "title": "Data Privacy in AI Tools: Why BYOK Is a Compliance Feature",
    "metaTitle": "Data Privacy in AI Tools: BYOK Compliance",
    "description": "Data privacy in AI tools: what happens to your prompts, why BYOK changes the data flow, and how bring-your-own-key supports GDPR and compliance.",
    "publishedAt": "2026-08-14",
    "category": "AI gateway",
    "tags": ["data privacy AI", "BYOK compliance", "prompt data privacy", "AI GDPR"],
    "primaryKeyword": "data privacy AI tools",
    "secondaryKeywords": ["AI data privacy BYOK", "prompt data compliance", "GDPR AI tools", "bring your own key privacy"],
    "readingTime": "7 min read",
    "author": "LayerFlow Team",
    "relatedSlugs": ["byok-for-beginners-guide", "byok-vs-platform-credits", "ai-tool-security-audit", "ai-governance-small-teams"],
    "blocks": [
      { "type": "p", "text": "Every prompt you type is data. It can contain customer records, source code, strategy, salaries — and in most AI tools, that data flows through the tool's infrastructure and into the tool's contracts. Most teams accept this without reading either document." },
      { "type": "p", "text": "BYOK — bring your own key — is often described as a cost feature, but its real value is data flow: the prompt goes from the tool to the provider under your agreement, and the tool resells nothing. This guide covers the privacy mechanics. The [LayerFlow docs](/docs) state exactly how prompts flow; [sign in](/sign-in) to review." },
      { "type": "h2", "id": "where-prompts-go", "text": "Where your prompts actually go" },
      { "type": "ul", "items": [
        "Cloud model: the tool's servers receive your prompt, forward it to a model, and store both.",
        "BYOK model: the tool passes your prompt to the model provider under your provider agreement.",
        "The difference is who your contract is with — and whose data processing terms apply.",
        "Some tools are resellers: they buy tokens and sell them back as credits, at a margin."
      ] },
      { "type": "p", "text": "The practical question is not whether your prompt reaches a model — it must, that is the product — but which entity is the data processor, what they can do with the data, and what their retention terms say." },
      { "type": "h2", "id": "what-byok-changes", "text": "What BYOK changes" },
      { "type": "ol", "items": [
        "Processing terms: the provider's DPA governs your data, not the tool's.",
        "No reselling: the tool has no margin motive on your tokens, so no reason to maximize them.",
        "Training rights: your provider agreement decides whether your prompts train models.",
        "Audit trail: provider dashboards show exactly what your keys sent.",
        "Cost visibility: you see provider rates, not resold credits."
      ] },
      { "type": "callout", "text": "Pro tip: ask vendors for their data flow diagram before signing. The honest ones show it in two boxes. The vague ones take six months of legal review to produce anything at all." },
      { "type": "h2", "id": "gdpr-checklist", "text": "The compliance checklist" },
      { "type": "ul", "items": [
        "Know who processes prompt data: tool, provider, or both.",
        "Confirm training rights in writing — settings toggles are not contracts.",
        "Check data residency and transfer mechanisms (SCCs, adequacy decisions).",
        "Define retention: how long prompts, versions, and logs are kept.",
        "Ensure deletion requests cover AI tool data, not just your CRM.",
        "Log access: who can view prompts, and is there an audit trail?"
      ] },
      { "type": "h2", "id": "when-byok-is-not-enough", "text": "When BYOK is not enough" },
      { "type": "p", "text": "BYOK changes the data flow, but it does not change model providers' retention and training policies. For regulated data, combine BYOK with: provider agreements that opt out of training, on-premise or private endpoints where available, and redaction before prompts leave your systems. BYOK is the enabler, not the whole program." },
      { "type": "h2", "id": "next-steps", "text": "Internal next steps" },
      { "type": "p", "text": "Start with [BYOK for Beginners](/blog/byok-for-beginners-guide) and [BYOK vs Platform Credits](/blog/byok-vs-platform-credits). For the checklist in practice, run the [AI Tool Security Audit](/blog/ai-tool-security-audit) and see [AI Governance for Small Teams](/blog/ai-governance-small-teams)." },
      { "type": "p", "text": "Review the data flow before connecting keys: [sign in](/sign-in) to LayerFlow and read the docs, or compare [pricing](/pricing)." },
      { "type": "h2", "id": "faq", "text": "FAQ" },
      { "type": "faq", "items": [
        { "q": "How does BYOK improve data privacy?", "a": "BYOK routes your prompts to the model provider under your agreement: the tool stops being the data processor, stops reselling tokens, and the provider's DPA and training terms govern your data." },
        { "q": "Can AI tools train on my prompts?", "a": "Some can. Your provider agreement decides — with BYOK, that agreement is yours to sign and review. Some providers allow opting out of training; check your agreement rather than settings toggles." },
        { "q": "What should a privacy policy cover for AI tools?", "a": "Data processor identity, training rights, residency and transfers, retention windows, deletion flows, and access logging. Ask for a data flow diagram and keep it on file." }
      ] }
    ]
  },
  {
    "slug": "ai-governance-small-teams",
    "title": "AI Governance for Small Teams: Policy Without a Compliance Department",
    "metaTitle": "AI Governance for Small Teams (2026)",
    "description": "AI governance for small teams: a lightweight policy framework for AI usage, keys, data, and budgets without hiring a compliance department.",
    "publishedAt": "2026-08-14",
    "category": "AI gateway",
    "tags": ["AI governance", "AI policy", "small team AI", "responsible AI"],
    "primaryKeyword": "AI governance",
    "secondaryKeywords": ["AI governance small teams", "AI usage policy", "responsible AI policy", "AI compliance checklist"],
    "readingTime": "7 min read",
    "author": "LayerFlow Team",
    "relatedSlugs": ["ai-tool-security-audit", "data-privacy-ai-tools-byok", "team-api-keys-security", "ai-cost-per-client-tracking"],
    "blocks": [
      { "type": "p", "text": "AI governance sounds like a compliance department problem, but the teams leaking client data and blowing budgets are small — because small teams have no one enforcing anything. Governance for a small team is a policy, not a program: four pages, one owner, and tooling that enforces it." },
      { "type": "p", "text": "This guide is that policy framework, ready to adapt. The tooling half — keys, caps, and attribution — is what [LayerFlow](/sign-in) does; [pricing](/pricing) covers the plans." },
      { "type": "h2", "id": "why-small-teams-need-it", "text": "Why small teams need it most" },
      { "type": "ul", "items": [
        "No compliance department means no one reviews tool contracts.",
        "Everyone is an admin, so every leak is an org-wide leak.",
        "Budgets are tight, so a runaway loop is existential.",
        "Clients ask — and small teams cannot absorb the reputational hit."
      ] },
      { "type": "p", "text": "Governance is a force multiplier when the team is small: one hour of policy saves a week of damage control." },
      { "type": "h2", "id": "the-four-pages", "text": "The four-page policy" },
      { "type": "ol", "items": [
        "Allowed tools and the approval rule: no tool connects to data or a key without a named owner.",
        "Data rules: what may go into prompts, what must be redacted, what never leaves the org.",
        "Credentials: per-member keys, caps, rotation, and one-click offboarding.",
        "Budget: who approves spend, what the alert threshold is, who holds the provider bill."
      ] },
      { "type": "p", "text": "One page per topic, one owner per page. Governance collapses when it becomes a manual — small teams need policy that fits in a day's reading." },
      { "type": "h2", "id": "tooling-enforcement", "text": "Let tooling enforce the policy" },
      { "type": "p", "text": "A policy without enforcement is a suggestion. The enforcement layer for small teams: per-member keys with caps (credentials policy enforced at creation), budget alerts at the threshold (budget policy enforced at the provider), and an access review at onboarding and offboarding (data policy enforced by the tool's audit trail). If a rule requires a human to remember it, it will fail." },
      { "type": "callout", "text": "Pro tip: assign a named owner to every AI tool — the approval rule prevents the graveyard of orphaned integrations with live keys. Orphaned tool = orphaned key = unmanaged spend." },
      { "type": "h2", "id": "escalation", "text": "The incident path" },
      { "type": "ol", "items": [
        "Leak suspected: revoke the key first, ask questions second.",
        "Runaway spend: block at the provider, then review the prompt loop.",
        "Client data exposure: notify per your client agreement and log the incident.",
        "Every incident ends with a one-paragraph review: cause, fix, prevention."
      ] },
      { "type": "h2", "id": "next-steps", "text": "Internal next steps" },
      { "type": "p", "text": "Run the [AI Tool Security Audit](/blog/ai-tool-security-audit) as the first governance exercise, then see [Data Privacy in AI Tools](/blog/data-privacy-ai-tools-byok). Credentials: [Team API Keys](/blog/team-api-keys-security). Budgets: [Track AI Costs Per Client](/blog/ai-cost-per-client-tracking)." },
      { "type": "p", "text": "Put the policy to work: [sign in](/sign-in) to LayerFlow and set up named keys with caps, or check [pricing](/pricing)." },
      { "type": "h2", "id": "faq", "text": "FAQ" },
      { "type": "faq", "items": [
        { "q": "How do I start AI governance in a small team?", "a": "Write a four-page policy: allowed tools with owners, data rules, credentials, and budget. Assign one owner per page, then enforce with tooling — per-member keys, caps, and alerts — not memory." },
        { "q": "Who should own AI governance?", "a": "A named person — often the founder, CTO, or ops lead — who owns the policy and the enforcement tooling. Small teams succeed by ownership, not committees." },
        { "q": "What is the minimum AI compliance checklist?", "a": "Named tool owners, data classification rules, per-member keys with caps, rotation and offboarding, budget alerts, and an incident path. Enough for a four-page document." }
      ] }
    ]
  },
  {
    "slug": "ai-cost-per-client-tracking",
    "title": "Track AI Costs Per Client: Usage Attribution for Agencies and Consultancies",
    "metaTitle": "Track AI Costs Per Client: Attribution Guide",
    "description": "Track AI costs per client: per-client keys, tagged usage, and billing-grade attribution for agencies and consultancies running AI workflows.",
    "publishedAt": "2026-08-14",
    "category": "Cost control",
    "tags": ["per client AI costs", "AI usage attribution", "agency AI billing", "client cost tracking"],
    "primaryKeyword": "AI costs per client",
    "secondaryKeywords": ["track AI usage per client", "AI cost allocation", "agency AI billing", "client-specific API keys"],
    "readingTime": "6 min read",
    "author": "LayerFlow Team",
    "relatedSlugs": ["hard-budgets-ai-teams", "ai-spend-analytics-dashboard", "team-api-keys-security", "byok-for-beginners-guide"],
    "blocks": [
      { "type": "p", "text": "The agency question is always the same: whose usage is this? When one team runs dozens of clients through shared models, the bill is a single number — and every client line item has to be reconstructed from memory. That breaks both billing and trust." },
      { "type": "p", "text": "Per-client tracking has three layers: per-client keys, tagged usage, and a review cadence. This guide covers all three. [LayerFlow's client tags](/sign-in) implement it; the [docs](/docs) show the setup." },
      { "type": "h2", "id": "layer-1-keys", "text": "Layer 1: Per-client keys" },
      { "type": "p", "text": "Give each client its own API key, named after the client, with its own cap. Attribution becomes structural: the provider dashboard groups by key, and the bill maps to clients without any tagging discipline. Per-client keys are also the compliance answer — client data runs under a key that is only ever used for that client." },
      { "type": "h2", "id": "layer-2-tags", "text": "Layer 2: Tagged usage" },
      { "type": "ul", "items": [
        "Tag prompts by client, project, and task type at creation time.",
        "Store tags on prompts, versions, and runs — not just the final outputs.",
        "Use tags for reporting AND routing: cost attribution and budget enforcement share the tag.",
        "Keep a fixed tag taxonomy; free-text tags decay into unusable data."
      ] },
      { "type": "p", "text": "Keys give the ceiling; tags give the breakdown. Without tags, a client key tells you the total, but not which project or task inside the client burned it." },
      { "type": "h2", "id": "layer-3-review", "text": "Layer 3: The review cadence" },
      { "type": "ol", "items": [
        "Monthly: reconcile provider spend against client budgets.",
        "Quarterly: re-estimate client AI budgets from actuals, not guesses.",
        "Incident: alert at the cap threshold, before the client invoice, not after.",
        "Every review ends with the question: does the client's budget match the usage pattern?"
      ] },
      { "type": "callout", "text": "Pro tip: include AI usage in the client SOW from day one. Teams that invoice AI as a pass-through never fight about attribution; teams that bury it in overhead re-litigate it every month." },
      { "type": "h2", "id": "mistakes", "text": "Mistakes that ruin attribution" },
      { "type": "ul", "items": [
        "One shared key across all clients — attribution is impossible, not difficult.",
        "Tags added after the fact from memory.",
        "No caps per client, so one client's workload bleeds into another's budget.",
        "Provider dashboards as the only report — nobody reads them monthly.",
        "Treating AI costs as overhead instead of pass-through."
      ] },
      { "type": "h2", "id": "next-steps", "text": "Internal next steps" },
      { "type": "p", "text": "Foundations first: [BYOK for Beginners](/blog/byok-for-beginners-guide) and [Team API Keys](/blog/team-api-keys-security). Then [Hard Budgets for AI Teams](/blog/hard-budgets-ai-teams) and [AI Spend Analytics Dashboards](/blog/ai-spend-analytics-dashboard)." },
      { "type": "p", "text": "Attribution from day one: [sign in](/sign-in) to LayerFlow and set up per-client keys and tags, or check [pricing](/pricing)." },
      { "type": "h2", "id": "faq", "text": "FAQ" },
      { "type": "faq", "items": [
        { "q": "How do I track AI costs per client?", "a": "Three layers: per-client API keys with caps, tags on every prompt (client, project, task), and a monthly reconciliation of provider spend against client budgets." },
        { "q": "How do agencies bill AI usage to clients?", "a": "Define it in the SOW as pass-through, attribute by per-client keys and tags, and invoice actuals reconciled monthly. The attribution system must exist before the first invoice." },
        { "q": "What is the best way to attribute AI usage?", "a": "Structural attribution: per-client keys for the ceiling and fixed-taxonomy tags for the breakdown. Both are set at creation time — retroactive attribution is guesswork." }
      ] }
    ]
  }
];