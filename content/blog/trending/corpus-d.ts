import type { BlogPost } from "@/lib/blog/types";

export const corpusD: BlogPost[] = [
  {
    "slug": "reasoning-models-guide-2026",
    "title": "Reasoning Models in 2026: When to Pay for Chain-of-Thought",
    "metaTitle": "Reasoning Models 2026 | CoT Models vs Fast LLMs",
    "description": "Reasoning (o1-style) models in 2026 explained: how chain-of-thought works, when it is worth the price and latency, and when a fast model is the smarter buy.",
    "publishedAt": "2026-08-17",
    "category": "Model comparison",
    "tags": ["reasoning models", "chain of thought", "o1 models"],
    "primaryKeyword": "reasoning models",
    "secondaryKeywords": ["o1 style models", "chain of thought", "when to use reasoning models"],
    "readingTime": "8 min read",
    "author": "LayerFlow Team",
    "relatedSlugs": ["gpt-vs-claude-vs-gemini-vs-deepseek-2026", "model-routing-latency-cost-quality", "cost-per-token-explained"],
    "blocks": [
      { "type": "p", "text": "Reasoning models — the o1-style line that thinks before it answers — are the biggest single change in LLM quality since ChatGPT. They trade latency and tokens for deeper accuracy on hard problems. In 2026 the decision is rarely which reasoning model to use; it is whether a given request needs one at all." },
      { "type": "h2", "id": "how-reasoning-works", "text": "How chain-of-thought works" },
      { "type": "p", "text": "A reasoning model generates a hidden chain of thought before producing the visible answer. Instead of one forward pass over your prompt, the model breaks the problem into steps, tries approaches, checks its own work, and only then writes the final response. Those internal steps are billed as output tokens, which is why reasoning requests cost several times more than a standard completion of the same length." },
      { "type": "h2", "id": "what-you-pay", "text": "What reasoning actually costs" },
      { "type": "ul", "items": [
        "Hidden reasoning tokens are billed at full output rates.",
        "End-to-end latency is measured in seconds, not milliseconds.",
        "Price multiples of 2-10x versus the same provider's fast model.",
        "Output caps can truncate long reasoning before the model finishes.",
        "Per-request variance is high: a simple prompt can still trigger long thinking."
      ] },
      { "type": "h2", "id": "when-reasoning-pays", "text": "When paying for reasoning is worth it" },
      { "type": "ul", "items": [
        "Complex math and quantitative problems with verifiable answers.",
        "Bugs in code where the cause is subtle and the fix must be exact.",
        "Planning tasks: multi-step procedures, scheduling, dependency chains.",
        "Ambiguous or adversarial instructions where a wrong read is expensive.",
        "Agent step-planning before a tool loop starts."
      ] },
      { "type": "h2", "id": "when-fast-models-win", "text": "When a fast model is the smarter buy" },
      { "type": "ul", "items": [
        "Classification, extraction, and structured output with clear schemas.",
        "Summaries and rewrites where the source is self-contained.",
        "High-volume chat and support traffic where speed matters.",
        "Anything already answered reliably by a template or small model.",
        "Requests where a wrong answer is cheap to detect and retry."
      ] },
      { "type": "h2", "id": "mixing-the-two", "text": "Mixing reasoning and fast models" },
      { "type": "p", "text": "The strongest systems in 2026 do not pick a model per product — they pick per request. A cheap classifier or a simple keyword rule sends routine requests to a fast model and escalates only the hard ones to a reasoning model. A cascade works even better: run the fast model, check the answer with a verifier, and re-run with reasoning only when the verification fails." },
      { "type": "h2", "id": "measuring-value", "text": "Measure the value before you commit" },
      { "type": "ol", "items": [
        "Pick a benchmark set of 20-50 real requests with known-good answers.",
        "Run each request against a fast model and a reasoning model.",
        "Score both on accuracy and count how often reasoning changed the outcome.",
        "Multiply the accuracy delta by the business cost of a wrong answer.",
        "Compare that value against the price difference at your real traffic volume."
      ] },
      { "type": "callout", "text": "Rule of thumb: if the request is well-specified and you can verify the answer cheaply, a fast model plus a retry beats paying for reasoning on every call." },
      { "type": "h2", "id": "faq", "text": "FAQ" },
      { "type": "faq", "items": [
        { "q": "What is a reasoning model?", "a": "A model that produces a hidden chain of thought before answering, trading extra tokens and latency for higher accuracy on complex problems like math, code, and planning." },
        { "q": "Are reasoning models worth the extra cost?", "a": "For hard, high-value tasks yes; for routine extraction, chat, and summaries rarely. Route only the difficult requests to reasoning to keep the bill sane." },
        { "q": "How much slower are reasoning models?", "a": "They typically add seconds of latency per request because the model generates reasoning tokens before the visible answer. Fine for offline jobs, bad for latency-critical UIs." }
      ] }
    ]
  },
  {
    "slug": "small-language-models-2026",
    "title": "Small Language Models in 2026: When Smaller Is Smarter",
    "metaTitle": "Small Language Models 2026 | SLM vs LLM Costs",
    "description": "Small language models in 2026: what models under 10B parameters can and cannot do, where on-device models beat frontier LLMs, and the real cost savings.",
    "publishedAt": "2026-08-17",
    "category": "Model comparison",
    "tags": ["small language models", "on-device LLM", "SLM"],
    "primaryKeyword": "small language models",
    "secondaryKeywords": ["on-device models", "SLM vs LLM", "small model cost savings"],
    "readingTime": "7 min read",
    "author": "LayerFlow Team",
    "relatedSlugs": ["on-device-llms-guide", "open-source-llms-2026", "cost-per-token-explained"],
    "blocks": [
      { "type": "p", "text": "Small language models are having their moment. The 2026 crop of models under 10B parameters runs on laptops and phones, costs a fraction of a frontier API call, and handles a surprisingly large share of real production traffic. The trick is knowing which tasks actually need a giant model — most do not." },
      { "type": "h2", "id": "what-counts-small", "text": "What counts as small in 2026" },
      { "type": "p", "text": "Small is relative, but in practice it means models you can run on consumer hardware or a single modest GPU: roughly 1B to 10B parameters, usually quantized to 4 or 8 bits. They compress the patterns of much larger models into fewer weights, which means they answer fast, load in seconds, and cost pennies — but they also forget edge cases and struggle with genuinely novel reasoning." },
      { "type": "h2", "id": "where-small-beats-large", "text": "Where small models beat frontier LLMs" },
      { "type": "ul", "items": [
        "High-volume classification and routing where a large model is overkill.",
        "Extraction of names, dates, numbers, and codes from structured-ish text.",
        "On-device features: autocomplete, summarization, and rewrite with zero network calls.",
        "Privacy-sensitive workloads where data must never leave the machine.",
        "Latency-critical paths where a local call is milliseconds and a round trip is not.",
        "Steady-state chat with a narrow domain and a well-tuned system prompt."
      ] },
      { "type": "h2", "id": "where-small-fails", "text": "Where small models fail" },
      { "type": "ul", "items": [
        "Novel problem solving that requires genuine multi-step reasoning.",
        "Long, ambiguous instructions with many interacting constraints.",
        "Complex code generation or refactoring across files.",
        "Creative writing that must not sound generic.",
        "Any task where you cannot test the failure mode cheaply."
      ] },
      { "type": "h2", "id": "the-cost-math", "text": "The cost math nobody does upfront" },
      { "type": "p", "text": "Run the numbers before you assume small is cheap. A frontier API at a few dollars per million output tokens adds up fast at scale, but a GPU box costs real money too. The crossover usually lands somewhere in the tens of millions of tokens a month. Below that, a well-cached API is simpler; above that, serving a small model becomes the obvious economic win." },
      { "type": "h2", "id": "hybrid-deployments", "text": "The hybrid pattern that wins in production" },
      { "type": "p", "text": "The winning deployment in 2026 is hybrid: a small model on-device or on a cheap instance handles the easy majority of traffic, and a frontier model — routed, not hardcoded — handles the hard tail. A confidence check or a fallback classifier decides which path each request takes. Done well, the blended cost lands near a tenth of an all-frontier stack while quality stays flat." },
      { "type": "callout", "text": "Start with your cheapest verifiable task. Put a small model in front of it, log disagreements with your current setup for a week, and let the data — not enthusiasm — decide whether it stays." },
      { "type": "h2", "id": "faq", "text": "FAQ" },
      { "type": "faq", "items": [
        { "q": "What is a small language model?", "a": "An LLM with a few billion parameters or fewer, compact enough to run on a laptop, phone, or single GPU, usually quantized, at a fraction of the cost of frontier APIs." },
        { "q": "Can small models replace GPT or Claude?", "a": "For narrow, well-defined, high-volume tasks yes. For open-ended reasoning, complex code, and creative work, most teams keep a frontier model in the loop." },
        { "q": "How much do small models save?", "a": "Inference can be orders of magnitude cheaper per token than hosted frontier models, but the savings only beat API hosting once your volume is high enough to justify the compute." }
      ] }
    ]
  },
  {
    "slug": "ai-chatbot-api-integration",
    "title": "AI Chatbot API Integration: A Practical Playbook",
    "metaTitle": "AI Chatbot API Integration | Streaming, History, Auth",
    "description": "Integrating an LLM chat API into your app: streaming responses, conversation history, auth and tenancy, moderation, and cost control that survives real traffic.",
    "publishedAt": "2026-08-17",
    "category": "AI gateway",
    "tags": ["chatbot API", "LLM integration", "streaming"],
    "primaryKeyword": "AI chatbot API integration",
    "secondaryKeywords": ["LLM chat integration", "streaming chat responses", "chat API architecture"],
    "readingTime": "8 min read",
    "author": "LayerFlow Team",
    "relatedSlugs": ["streaming-llm-responses-guide", "llm-rate-limits-retry-guide", "ai-api-token-management-playbook"],
    "blocks": [
      { "type": "p", "text": "Adding a real LLM chat experience to an app is an integration problem, not a prompt problem. The pieces that separate a demo from a shippable chatbot are streaming, history, auth, moderation, and cost — and each has traps that only show up under real traffic." },
      { "type": "h2", "id": "streaming-first", "text": "Stream responses, always" },
      { "type": "p", "text": "Users read while they type. Return the completion as a stream of tokens and render them incrementally instead of waiting for the full response. Every major provider exposes a streaming endpoint, and it changes perceived latency from several seconds to instant. Forward the stream events to the client as they arrive, and close the upstream stream the moment the user cancels or disconnects." },
      { "type": "h2", "id": "conversation-history", "text": "Managing conversation history" },
      { "type": "ol", "items": [
        "Store messages in your own database keyed to the user, not the vendor.",
        "Send only the last N messages that fit your context budget.",
        "Summarize old turns into a rolling summary as history grows.",
        "Trim tool output and long attachments before they re-enter context.",
        "Never trust client-sent history as the source of truth."
      ] },
      { "type": "h2", "id": "auth-and-tenancy", "text": "Auth and multi-tenant safety" },
      { "type": "p", "text": "Every request should carry your user's identity so you can enforce per-user budgets, rate limits, and audit logs. Keep the provider API key server-side — never embed it in the client. For multi-tenant apps, attach tenant metadata to every call so you can see which accounts are driving cost and cap the noisy ones before the bill surprises you." },
      { "type": "h2", "id": "moderation-and-safety", "text": "Moderation and safety layers" },
      { "type": "ul", "items": [
        "Run input checks for prompt injection and abuse patterns.",
        "Validate outputs against your content policy before showing them.",
        "Rate-limit per user, not just globally.",
        "Log a sample of conversations for review.",
        "Give users a clear way to report a bad response."
      ] },
      { "type": "h2", "id": "cost-control", "text": "Controlling chat API cost" },
      { "type": "p", "text": "Chat multiplies API cost because every turn re-sends the full history. Put the system prompt and stable context in the cached prefix, keep history inside a hard token budget, and cache the conversation window for common cases. A token budget per user session — hard-capped — turns an unknown bill into a predictable number." },
      { "type": "h2", "id": "observability", "text": "Observability from day one" },
      { "type": "p", "text": "Ship latency, token usage, and error metrics from the start. You need per-user token spend, per-route latency, time-to-first-token, and failure rates before you can tune anything else. Alerts on error-rate spikes and per-tenant cost anomalies catch most integration problems within minutes instead of at billing time." },
      { "type": "callout", "text": "Demo chat works on the happy path. Production chat is defined by streaming that never buffers, history that never balloons, and a bill that never surprises. Build those three first." },
      { "type": "h2", "id": "faq", "text": "FAQ" },
      { "type": "faq", "items": [
        { "q": "How do I stream LLM responses to my app?", "a": "Call the provider's streaming endpoint, forward token events to your client over SSE or WebSocket, and render tokens incrementally while aborting the stream if the user cancels." },
        { "q": "Should conversation history live on the server?", "a": "Yes. Store messages server-side keyed to the user, send a bounded window of recent turns, and summarize older history to control token costs." },
        { "q": "How do I keep chat API costs under control?", "a": "Use prompt caching for stable prefixes, cap per-session token budgets, summarize old history, and monitor per-user spend so outliers get caught early." }
      ] }
    ]
  },
  {
    "slug": "llm-caching-strategies",
    "title": "LLM Caching Strategies: Cache Design for Lower Token Bills",
    "metaTitle": "LLM Caching Strategies | Cut Token Costs 2026",
    "description": "LLM caching strategies beyond prompt caching: semantic caching, cache key design, TTLs and invalidation, and how to measure hit rates and real savings.",
    "publishedAt": "2026-08-17",
    "category": "Cost control",
    "tags": ["LLM caching", "semantic cache", "cost control"],
    "primaryKeyword": "LLM caching strategies",
    "secondaryKeywords": ["semantic caching LLM", "cache key design", "LLM cache hit rate"],
    "readingTime": "7 min read",
    "author": "LayerFlow Team",
    "relatedSlugs": ["prompt-caching-guide", "cost-optimization-llm-apps", "token-cost-optimization-guide"],
    "blocks": [
      { "type": "p", "text": "Most LLM spend is repeat work. The same system prompt, the same document, the same question pattern hit the API over and over. Caching is how you turn that repeat traffic into a discount — but prompt caching alone leaves money on the table. The full playbook has layers." },
      { "type": "h2", "id": "provider-prompt-caching", "text": "Layer one: provider prompt caching" },
      { "type": "p", "text": "Your first layer is provider-side prompt caching, which discounts re-sent prefix tokens. It is automatic on most platforms once the same prefix appears repeatedly. Design for it: put stable instructions and fixed context first, the variable question last, and keep the prefix byte-identical between calls. Check each provider's cache TTL and size limits, and watch your cache-hit rate in the dashboard." },
      { "type": "h2", "id": "semantic-caching", "text": "Layer two: semantic caching at the answer level" },
      { "type": "p", "text": "The second layer caches at the answer level: before calling the model, check whether a near-identical question has been answered. Embed the question, compare against a cache of recent questions with a similarity threshold, and return the stored answer when it matches. This works brilliantly for support, FAQ-style assistants, and lookup-heavy chatbots where users ask the same thing with slightly different words." },
      { "type": "h2", "id": "cache-key-design", "text": "Designing cache keys that actually hit" },
      { "type": "ul", "items": [
        "Include the model, temperature, and response format in the key.",
        "Exclude timestamps and request IDs that change every call.",
        "Normalize whitespace and casing before hashing.",
        "For semantic cache, key on question embeddings, not raw strings.",
        "Bump the version field when you change a system prompt or policy.",
        "Purge by policy version, not just by age."
      ] },
      { "type": "h2", "id": "invalidation", "text": "TTLs and invalidation" },
      { "type": "p", "text": "LLM answers go stale — pricing pages change, policies get updated, products ship. Give every cache entry a TTL that matches the volatility of its data, and support forced invalidation when you edit the underlying content. A support chatbot answering yesterday's policy is worse than no answer at all. Store the source document version alongside the cached answer so you can evict on change." },
      { "type": "h2", "id": "measuring-gain", "text": "Measuring the actual gain" },
      { "type": "ul", "items": [
        "Track cache hit rate per provider and per endpoint.",
        "Log tokens saved per day, not just requests saved.",
        "Compare spend before and after enabling each layer.",
        "Watch for quality regressions from stale semantic-cache hits.",
        "Recompute the breakeven whenever a provider changes cache pricing."
      ] },
      { "type": "callout", "text": "Layers compound: provider prompt caching cuts the input bill, semantic caching cuts the whole call. Each layer has its own knob — measure each one separately or you will never know which one is carrying the savings." },
      { "type": "h2", "id": "faq", "text": "FAQ" },
      { "type": "faq", "items": [
        { "q": "What is semantic caching for LLMs?", "a": "Caching entire answers for semantically similar questions by comparing question embeddings, so repeat questions skip the model call entirely and return a stored response." },
        { "q": "Does caching hurt answer quality?", "a": "Prompt caching does not change output at all. Semantic caching can serve stale answers, which is why cache entries need TTLs and invalidation tied to content changes." },
        { "q": "How much can caching save?", "a": "Prompt caching discounts cached input tokens by up to 90%; semantic caching removes whole calls. Combined, teams often cut token spend by half or more on repetitive workloads." }
      ] }
    ]
  },
  {
    "slug": "prompt-evaluation-metrics",
    "title": "Prompt Evaluation Metrics: Measuring What Matters",
    "metaTitle": "Prompt Evaluation Metrics | Accuracy, Faithfulness, Cost",
    "description": "Prompt evaluation metrics explained: accuracy, faithfulness, format compliance, plus cost and latency — and how to build a lightweight eval harness.",
    "publishedAt": "2026-08-17",
    "category": "Prompt engineering",
    "tags": ["prompt evaluation", "LLM evals", "metrics"],
    "primaryKeyword": "prompt evaluation metrics",
    "secondaryKeywords": ["prompt quality metrics", "LLM eval harness", "faithfulness evaluation"],
    "readingTime": "8 min read",
    "author": "LayerFlow Team",
    "relatedSlugs": ["eval-llm-prompts-systematic", "prompt-engineering-best-practices-teams-2026", "structured-outputs-json-guide"],
    "blocks": [
      { "type": "p", "text": "You cannot improve a prompt you cannot measure. Prompt evaluation is the discipline of scoring your prompt on real inputs and using the numbers to decide what to change. The metrics that matter fall into five buckets: accuracy, faithfulness, format compliance, and the two everyone forgets — cost and latency." },
      { "type": "h2", "id": "accuracy", "text": "Accuracy: is the answer right" },
      { "type": "p", "text": "Accuracy is how often the model returns the correct answer. It needs ground truth: a set of test inputs with known-correct outputs. Measure exact match for structured answers, and semantic similarity or an LLM judge for open-ended ones. Track accuracy against your test set after every prompt change — it is the guardrail that stops sounds better from becoming works worse." },
      { "type": "h2", "id": "faithfulness", "text": "Faithfulness: is the answer grounded" },
      { "type": "p", "text": "Faithfulness is whether the answer is supported by the provided context — critical for RAG and document work where the model should answer from sources, not from memory. The classic check is an NLI-style evaluation: does the answer contradict the source or lack support in it? Hallucination is not just an accuracy problem; a confident wrong answer can look accurate and still be unfaithful." },
      { "type": "h2", "id": "format-compliance", "text": "Format compliance: does it parse" },
      { "type": "ul", "items": [
        "Valid JSON or output matching the declared schema.",
        "All required fields present with the right types.",
        "No extra prose wrapped around a structured output.",
        "Enum values drawn from the allowed set.",
        "Items correctly ordered when order matters."
      ] },
      { "type": "h2", "id": "cost-and-latency", "text": "Cost and latency: the forgotten metrics" },
      { "type": "p", "text": "A prompt that scores two points better but costs three times more and adds a second of latency is a bad trade at volume. Measure tokens per request — input, output, and total — and time-to-first-token on your real infrastructure. Normalize quality per dollar and per millisecond, and let that ratio, not raw accuracy, pick the winner between two similar prompts." },
      { "type": "h2", "id": "lightweight-harness", "text": "Building a lightweight eval harness" },
      { "type": "ol", "items": [
        "Collect 30-50 real requests with ground truth where it exists.",
        "Run them against the current prompt and the candidate prompt.",
        "Score accuracy, faithfulness, and format automatically.",
        "Log tokens and latency for every run.",
        "Compare on a scorecard and pick the prompt that wins the ratio, not just accuracy.",
        "Re-run the suite on every prompt edit and every model upgrade."
      ] },
      { "type": "callout", "text": "Start with 30 examples, not a thousand. A small, noisy scorecard beats a perfect one that does not exist — the goal is directional signal between prompt versions, not a publishable benchmark." },
      { "type": "h2", "id": "faq", "text": "FAQ" },
      { "type": "faq", "items": [
        { "q": "What metrics should I use to evaluate prompts?", "a": "Accuracy against ground truth, faithfulness to provided context, format compliance, plus tokens per request and latency. Judge by quality per dollar, not accuracy alone." },
        { "q": "How do I evaluate a prompt without ground truth?", "a": "Use an LLM judge with clear rubrics, or human review on a small sample. For faithfulness, compare answers against their source context." },
        { "q": "How many test examples do I need?", "a": "Thirty to fifty well-chosen examples usually surface the meaningful differences between prompt versions. More helps, but the setup should stay cheap to run." }
      ] }
    ]
  },
  {
    "slug": "knowledge-bases-llm-apps",
    "title": "Knowledge Bases for LLM Apps: A Build Guide",
    "metaTitle": "Knowledge Base LLM Apps | Chunking, Embeddings, Retrieval",
    "description": "Building an LLM app over a knowledge base: chunking strategy, embedding choice, retrieval quality, citations, and keeping answers current.",
    "publishedAt": "2026-08-18",
    "category": "Use cases",
    "tags": ["knowledge base", "RAG", "retrieval"],
    "primaryKeyword": "knowledge base LLM app",
    "secondaryKeywords": ["RAG chunking strategy", "embedding selection", "retrieval quality"],
    "readingTime": "8 min read",
    "author": "LayerFlow Team",
    "relatedSlugs": ["what-is-rag-guide", "vector-database-comparison-2026", "embedding-models-comparison"],
    "blocks": [
      { "type": "p", "text": "An LLM over your knowledge base sounds simple — upload files, ask questions — but the quality of the answer is decided long before the model runs. Chunking, embeddings, retrieval, and refresh strategy determine whether your app finds the right paragraph and cites it correctly, or confidently invents an answer from a mismatched chunk." },
      { "type": "h2", "id": "chunking-strategy", "text": "Chunking strategy" },
      { "type": "p", "text": "Chunks are what retrieval matches against. Too large and the relevant signal drowns in noise; too small and the chunk misses the sentence that answers the question. In practice, split on semantic boundaries — sections, paragraphs, list items — rather than fixed character counts. Keep context-losing fragments whole: a table, a code block, a numbered list. Aim for chunks that answer a single question, and keep a little overlap when boundaries force awkward splits." },
      { "type": "h2", "id": "embedding-choice", "text": "Choosing an embedding model" },
      { "type": "ul", "items": [
        "Match embedding size to your scale and latency budget.",
        "Prefer a model fine-tuned on your document type if one exists.",
        "Compare on your own retrieval task, not a public benchmark.",
        "Normalize inputs and watch for low-cardinality domains like names, SKUs, and acronyms.",
        "Re-embed on model upgrades — old and new vectors do not mix well."
      ] },
      { "type": "h2", "id": "retrieval-quality", "text": "Retrieval quality" },
      { "type": "p", "text": "Retrieval quality is a ranking problem. Start with top-k by cosine similarity, then add metadata filters — document type, date, department — so irrelevant sections never compete. Hybrid search that blends keyword match with embeddings catches exact terms that vectors miss. Test with the same question in ten phrasings and measure how often the right chunk ranks in the top five; that number, not the demo, is your retrieval score." },
      { "type": "h2", "id": "answering-and-citations", "text": "Answering and citations" },
      { "type": "ol", "items": [
        "Retrieve the top k chunks and pass only those as context.",
        "Instruct the model to answer strictly from the provided chunks.",
        "Require citations to the source chunk for every claim.",
        "Add a not-in-the-context escape hatch instead of forcing an answer.",
        "Re-rank with a lightweight model if top-k precision matters."
      ] },
      { "type": "h2", "id": "keeping-current", "text": "Keeping the knowledge base current" },
      { "type": "p", "text": "The knowledge base decays the moment you stop updating it. Index on document change rather than a nightly cron: listen to the content store, delete replaced chunks, re-embed edited ones, and keep a version stamp per chunk. Your cache and retrieval layers must honor the same invalidation, or you will serve deleted policies for weeks. Publish a last-updated date and let users see it — it sets honest expectations." },
      { "type": "callout", "text": "Every the-AI-got-it-wrong in a knowledge-base app traces to one of three places: a missing chunk, a retrieval miss, or an unfaithful answer. Fix the first two before you blame the model." },
      { "type": "h2", "id": "faq", "text": "FAQ" },
      { "type": "faq", "items": [
        { "q": "How should I chunk documents for an LLM knowledge base?", "a": "Split on semantic boundaries like sections and paragraphs, keep tables and lists intact, use modest overlap, and aim for chunks that each answer a single question." },
        { "q": "What embedding model should I use?", "a": "Choose based on your scale and latency budget, then validate on your own data with a retrieval test. Prefer a model tuned for your document type when one exists." },
        { "q": "How do I know retrieval is working?", "a": "Take ten real questions, rephrase each three ways, and measure how often the correct chunk ranks in the top five. Iterate chunking and search until that number is high." }
      ] }
    ]
  },
  {
    "slug": "ai-document-summarization-apis",
    "title": "AI Document Summarization APIs: Long Docs Without the Token Burn",
    "metaTitle": "Document Summarization with LLM APIs | 2026 Guide",
    "description": "Summarizing long documents with LLM APIs: map-reduce over chunks, choosing map and reduce models, cost control, and quality checks that catch bad summaries.",
    "publishedAt": "2026-08-18",
    "category": "Use cases",
    "tags": ["summarization", "long documents", "LLM API"],
    "primaryKeyword": "AI document summarization",
    "secondaryKeywords": ["long document summarization", "map reduce summarization", "LLM summarization cost"],
    "readingTime": "8 min read",
    "author": "LayerFlow Team",
    "relatedSlugs": ["context-window-optimization", "llm-context-compression", "llm-apis-pricing-comparison-2026"],
    "blocks": [
      { "type": "p", "text": "Summarizing documents with LLM APIs is one of the most requested features in the stack — and one of the easiest ways to burn money. A 200-page PDF is millions of tokens, and feeding it whole to a single call is both expensive and shallow. The craft is chunking, map-reduce, and quality control, done in a way that scales to your corpus." },
      { "type": "h2", "id": "single-call-limit", "text": "Why the single-call approach fails" },
      { "type": "p", "text": "A single call with a giant prompt produces a thin summary: the model sees everything at once, so it flattens detail into a generic overview. Long contexts also cost the most per token and hit latency limits that feel broken in a UI. The fix is to summarize hierarchically: split the document, summarize the parts, then summarize the summaries." },
      { "type": "h2", "id": "map-reduce", "text": "Map-reduce in practice" },
      { "type": "ol", "items": [
        "Split the document into sections with stable boundaries.",
        "Summarize each section with the same instructions — the map step.",
        "Collect the section summaries, preserving order and headings.",
        "Summarize the combined summaries into the final document — the reduce step.",
        "For very large outputs, add another level: summaries of summaries."
      ] },
      { "type": "h2", "id": "chunking-for-summaries", "text": "Chunking for summaries, not retrieval" },
      { "type": "p", "text": "Chunking for summarization differs from chunking for retrieval. Here each chunk should be a coherent unit — a chapter, a section, a page — so the map step produces self-contained mini-summaries. Keep headings attached to their text so the reduce step can reason about structure. Overlap matters less than boundaries: splitting mid-table or mid-list destroys meaning that no summary step can recover." },
      { "type": "h2", "id": "controlling-cost", "text": "Controlling cost at scale" },
      { "type": "ul", "items": [
        "Summarize at the resolution the reader needs: one line, one paragraph, one page.",
        "Use a cheaper fast model for the map step and a stronger model for the final reduce.",
        "Cache summaries per document version and reuse them.",
        "Estimate tokens before the run and warn on outliers.",
        "Use batch APIs for offline corpora where nothing is waiting."
      ] },
      { "type": "h2", "id": "quality-checks", "text": "Quality checks that catch bad summaries" },
      { "type": "p", "text": "Summaries fail silently. Add checks: does the summary contain the key numbers and named entities from the source? Do the section headings survive? Is anything contradicted? Run an LLM judge that compares the summary against the source for coverage and faithfulness, and spot-check a sample by hand. Log the checks alongside each summary so regressions are visible when you change models or prompts." },
      { "type": "h2", "id": "output-contract", "text": "Define the output contract first" },
      { "type": "p", "text": "Decide the output shape before generating: length, heading structure, bullet density, and whether to cite source sections. Structured summaries — sections and bullet lists — are more useful and easier to verify than prose, and they play nicely with downstream systems that render or further process the result." },
      { "type": "callout", "text": "Summarize at the cheapest level that satisfies the user. Most readers want the executive summary, not the 50-page synthesis — and each level of detail you add multiplies the token cost." },
      { "type": "h2", "id": "faq", "text": "FAQ" },
      { "type": "faq", "items": [
        { "q": "How do I summarize a very long document with an LLM API?", "a": "Use a map-reduce approach: split into coherent sections, summarize each, then summarize the summaries. One call over the whole document is expensive and produces a shallow result." },
        { "q": "How much does document summarization cost?", "a": "It scales with tokens read and generated. Mapping with a cheap model, reducing with a stronger one, and caching per document version keeps large-corpus costs manageable." },
        { "q": "How do I know a summary is accurate?", "a": "Check coverage of key entities and numbers, verify there are no contradictions against the source, and use an LLM judge plus human spot-checks on a sample." }
      ] }
    ]
  },
  {
    "slug": "autonomous-ai-agents-2026",
    "title": "Autonomous AI Agents in 2026: Loops, Guardrails, Budgets",
    "metaTitle": "Autonomous AI Agents 2026 | Guardrails and Budgets",
    "description": "Autonomous AI agents in 2026: how agent loops run, the hard guardrails that keep them safe, per-run budgets, and when full autonomy actually works.",
    "publishedAt": "2026-08-18",
    "category": "Use cases",
    "tags": ["autonomous agents", "agent guardrails", "agentic AI"],
    "primaryKeyword": "autonomous AI agents",
    "secondaryKeywords": ["agent loops", "agent guardrails", "AI agent budgets"],
    "readingTime": "8 min read",
    "author": "LayerFlow Team",
    "relatedSlugs": ["ai-agents-guide-2026", "ai-agent-frameworks-comparison", "multi-agent-systems-guide"],
    "blocks": [
      { "type": "p", "text": "Autonomous AI agents — systems that take a goal, work through it with tools, and hand back a finished result — went from demo to production in 2026. The ones that survived the transition share three habits: tight loops, hard guardrails, and explicit budgets. The ones that did not shared a fourth: too much autonomy and too little supervision." },
      { "type": "h2", "id": "the-agent-loop", "text": "The agent loop" },
      { "type": "p", "text": "An autonomous agent is a loop, not a single call. The model receives the goal, plans a step, calls a tool, reads the result, and repeats until done or stopped. Everything that makes autonomy work or fail lives in the loop's details: how many steps it can take, what it does on a failed tool call, when it asks for help, and how it knows it is finished." },
      { "type": "h2", "id": "hard-guardrails", "text": "Hard guardrails that keep agents safe" },
      { "type": "ul", "items": [
        "A max step count that ends the loop no matter what.",
        "A token budget for the whole run, not just per call.",
        "An allowlist of tools and a denylist of actions.",
        "Read-only defaults; write access only where required.",
        "Human approval gates for destructive or external actions.",
        "A kill switch that stops the current run instantly."
      ] },
      { "type": "h2", "id": "budgets-and-cost", "text": "Budgets and cost control" },
      { "type": "p", "text": "Autonomy multiplies cost because every step is a fresh model call with a growing context. A twenty-step run can re-send the whole history twenty times. Budget per run — steps and tokens — and bill per tenant so runaway loops are a refundable event, not a surprise invoice. Log cost per completed goal, not per run, so you know the real price of an outcome." },
      { "type": "h2", "id": "when-autonomy-works", "text": "Where autonomy genuinely works" },
      { "type": "ul", "items": [
        "Research and synthesis: gather sources, verify, write a brief.",
        "Back-office processing: classify, extract, route documents.",
        "Code tasks with a testable definition of done.",
        "Monitoring and triage: collect, categorize, alert.",
        "Anything where a human would otherwise review every intermediate step."
      ] },
      { "type": "h2", "id": "when-it-doesnt", "text": "Where full autonomy does not" },
      { "type": "p", "text": "Full autonomy fails where failure is expensive and hard to detect: irreversible external actions, financial decisions, legal commitments, and anything where a wrong answer looks right. For those, autonomy is fine as a draft stage — the agent prepares, a human approves, and the action only fires after the gate." },
      { "type": "callout", "text": "Design the loop so giving up is a valid outcome. An agent that stops and asks for help costs one human minute; an agent that confidently completes the wrong task costs whatever it touched." },
      { "type": "h2", "id": "faq", "text": "FAQ" },
      { "type": "faq", "items": [
        { "q": "What makes an AI agent autonomous?", "a": "The ability to run a goal-driven loop — plan, act, observe, repeat — without a human approving each step. Autonomy exists on a spectrum, not as an on-or-off switch." },
        { "q": "How do I stop an autonomous agent from going off the rails?", "a": "Set a hard step count, a token budget, a tool allowlist, and human approval gates for destructive actions. Treat the kill switch as a required feature, not an afterthought." },
        { "q": "When is full autonomy safe?", "a": "When failure is cheap and detectable: research, drafting, classification, and processing tasks. Keep humans in the loop for irreversible, high-stakes actions." }
      ] }
    ]
  },
  {
    "slug": "llm-routing-policy-guide",
    "title": "LLM Routing Policies: Directing Every Request to the Right Model",
    "metaTitle": "LLM Routing Policy Guide | Cost vs Quality Routing",
    "description": "LLM routing policies explained: rule-based, cascade, and classifier routing to balance cost, latency, and quality — plus how to set and monitor thresholds.",
    "publishedAt": "2026-08-18",
    "category": "AI gateway",
    "tags": ["LLM routing", "model routing", "cost optimization"],
    "primaryKeyword": "LLM routing policy",
    "secondaryKeywords": ["model routing rules", "cost vs quality routing", "smart routing LLM"],
    "readingTime": "8 min read",
    "author": "LayerFlow Team",
    "relatedSlugs": ["llm-routing-formula-explained", "model-routing-latency-cost-quality", "best-llm-gateways-2026"],
    "blocks": [
      { "type": "p", "text": "No single model is the best answer for every request. A routing policy decides, per request, which model handles it — balancing cost, latency, and quality in one decision. Done well, routing is the difference between a 10x API bill and a 3x one, with identical output quality." },
      { "type": "h2", "id": "what-a-policy-declares", "text": "What a routing policy declares" },
      { "type": "p", "text": "A routing policy is a set of rules that maps request attributes to models. The attributes you can route on include task type, required quality, latency budget, token volume, content sensitivity, and even the caller. The output is always the same shape: for this request, use that model. The hard part is choosing the attributes and setting the boundaries." },
      { "type": "h2", "id": "rule-based-routing", "text": "Rule-based routing" },
      { "type": "ol", "items": [
        "Classify the request type first — chat, extraction, summary, code, analysis.",
        "Route each type to a model proven on that type.",
        "Add guards: token length, content sensitivity, and latency budget.",
        "Escalate to a stronger model when a hard task is detected.",
        "Fall through to a default model for anything unclassified."
      ] },
      { "type": "h2", "id": "quality-threshold-routing", "text": "Quality-threshold routing" },
      { "type": "p", "text": "Instead of guessing, let the answer decide. Run the cheap model first, score its output with a verifier — schema validation, an LLM judge, or a confidence check — and re-run with a stronger model only when the cheap answer fails. This cascade keeps costs low when the cheap model is right and quality high when it is not. It trades a little latency for the best cost-quality ratio available in 2026." },
      { "type": "h2", "id": "classifier-routing", "text": "Classifier routing at scale" },
      { "type": "p", "text": "At higher traffic, a small classifier — not a giant LLM — decides the route. A compact model or even keyword rules can label requests with high accuracy for a few cents per million requests. The classifier is cheap enough to run on everything, and its labels feed your routing table. Train it on your own traffic with the same labels you would write by hand, and it pays for itself in a week." },
      { "type": "h2", "id": "cost-quality-math", "text": "The cost-versus-quality math" },
      { "type": "ul", "items": [
        "Compute blended cost per request, not per model sticker price.",
        "Measure quality per dollar for every route.",
        "Price reasoning-tier models only on the traffic that actually needs them.",
        "Track routing fallback rates to find misclassification.",
        "Revisit thresholds monthly — model pricing changes fast."
      ] },
      { "type": "callout", "text": "Route on measurable attributes, not vibes. If you cannot state the boundary between the cheap route and the expensive route as a number, you do not have a policy yet — you have a coin flip." },
      { "type": "h2", "id": "faq", "text": "FAQ" },
      { "type": "faq", "items": [
        { "q": "What is LLM routing?", "a": "Directing each request to the model best suited for it — by task type, quality needs, latency budget, or cost — instead of sending everything to one model." },
        { "q": "How does routing save money?", "a": "Most traffic can be handled by cheaper models. Routing moves only the hard fraction to expensive frontier models, cutting blended cost while keeping quality flat." },
        { "q": "How do I set routing thresholds?", "a": "Measure quality and cost per model on your real traffic, then set boundaries where the cheaper model's failure rate becomes worth paying for. Verify with fallback-rate monitoring." }
      ] }
    ]
  },
  {
    "slug": "cost-optimization-llm-apps",
    "title": "The LLM Cost Optimization Playbook for 2026",
    "metaTitle": "LLM Cost Optimization Playbook | Cut API Bills",
    "description": "An LLM cost optimization playbook: caching, routing, batching, compression, token hygiene, and monitoring that cuts API spend by 50-80% without cutting quality.",
    "publishedAt": "2026-08-18",
    "category": "Cost control",
    "tags": ["LLM cost", "cost optimization", "token spend"],
    "primaryKeyword": "LLM cost optimization",
    "secondaryKeywords": ["reduce LLM API costs", "LLM cost savings", "token spend reduction"],
    "readingTime": "9 min read",
    "author": "LayerFlow Team",
    "relatedSlugs": ["token-cost-optimization-guide", "prompt-caching-guide", "cost-per-token-explained"],
    "blocks": [
      { "type": "p", "text": "LLM bills grow the way storage bills used to: silently, until someone looks. Cost optimization is not about switching to the cheapest model — it is a stack of practices — caching, routing, batching, compression, and hygiene — that together cut spend by 50-80% while output quality stays the same or improves." },
      { "type": "h2", "id": "know-where-it-goes", "text": "Know where the money goes first" },
      { "type": "p", "text": "Before optimizing, instrument. Log tokens — input, cached, and output — per endpoint, per user, and per feature. Without that map you will optimize the wrong thing. In most apps the split is predictable: a few high-volume features burn most of the spend, and one of them is usually conversation history or RAG context being re-sent in full." },
      { "type": "h2", "id": "caching-first", "text": "Caching is the cheapest win" },
      { "type": "p", "text": "The cheapest token is the one never sent. Provider prompt caching discounts stable prefixes by up to 90%. Semantic caching — returning a stored answer for a similar question — skips the call entirely for repeat intents. Cache keys must include model, temperature, and format; TTLs must match content volatility." },
      { "type": "h2", "id": "routing", "text": "Route, don't standardize" },
      { "type": "p", "text": "A fast, cheap model handles the easy majority; a frontier model handles the hard fraction. Cascade routing — run cheap, verify, escalate on failure — gives you the quality of the big model on the bill of the small one. Every point of traffic you move to a cheaper model cuts blended cost directly." },
      { "type": "h2", "id": "batching-and-compression", "text": "Batching and compression" },
      { "type": "ul", "items": [
        "Move non-interactive work to batch APIs at roughly a 50% discount.",
        "Compress or summarize long histories before they re-enter context.",
        "Drop redundant context: only send the chunks that changed or match.",
        "Reduce output tokens: demand terse, structured responses where possible.",
        "Pre-compute and reuse: cache summaries and embeddings per document."
      ] },
      { "type": "h2", "id": "token-hygiene", "text": "Token hygiene habits that compound" },
      { "type": "p", "text": "Small habits compound. Keep the system prompt short and stable so caching works. Strip chat history to the last N turns. Send retrieval context at the resolution the task needs — the relevant page, not the whole book. And set per-user and per-tenant caps so a single runaway session cannot wreck the month. These read as obvious; they are also where most apps leak around a third of their spend." },
      { "type": "h2", "id": "monitoring-loop", "text": "The monitoring loop" },
      { "type": "ol", "items": [
        "Track spend per feature and per tenant weekly.",
        "Alert on anomalies: cost spikes, error bursts, cache-hit drops.",
        "Re-run your eval suite after every model or pricing change.",
        "Compare quality per dollar, not raw price, when choosing models.",
        "Re-evaluate providers when your volume crosses new pricing tiers."
      ] },
      { "type": "callout", "text": "Cost optimization is a feedback loop, not a one-time cleanup. Pick the single biggest leak in your token map, fix it, measure the new baseline, and move to the next one. Six months of that beats one heroic migration." },
      { "type": "h2", "id": "faq", "text": "FAQ" },
      { "type": "faq", "items": [
        { "q": "What is the fastest way to cut LLM costs?", "a": "Find the highest-volume endpoint, add prompt caching for its stable prefix, and route the easy share of its traffic to a cheaper model. That usually captures the biggest win first." },
        { "q": "Does cost optimization hurt answer quality?", "a": "It should not. Caching, routing, and compression change what you send and which model handles it; evals keep quality constant while the bill falls. Only aggressive summarization risks quality, so measure it." },
        { "q": "How often should I review LLM spend?", "a": "Weekly at minimum once you are past a pilot. Track spend per feature, watch cache-hit and fallback rates, and re-run evals whenever model pricing or versions change." }
      ] }
    ]
  }
];
