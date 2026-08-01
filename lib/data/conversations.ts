export interface DemoMessage {
  role: "user" | "assistant";
  content: string;
}

export const SAMPLE_CONVERSATIONS: { id: string; label: string; source: string; messages: DemoMessage[] }[] = [
  {
    id: "demo-blog",
    label: "Blog migration (Next.js images)",
    source: "chatgpt",
    messages: [
      {
        role: "user",
        content:
          "hi, so I'm moving my blog from wordpress to next.js. its a travel blog with like 47 posts. I want to keep all the urls the same for seo. I already set up the app router thing and the slugs are working. but the images are totally broken, next/image gives me 400 errors when it tries to get webp, and I'm hosting images on cloudinary.\n\nI tried using the default loader but cloudinary urls dont work with it. also i read that webp detection via accept header breaks in production builds? that happened to me too. my lighthouse score tanked because the hero images are like 12mb each. i need to fix this asap since I'm going live end of month.",
      },
      {
        role: "assistant",
        content:
          "I see the issue — you're mixing the Next.js default loader with Cloudinary URLs. Let me explain what's happening and how to fix it. First, the default loader assumes images are served from your own domain and tries to fetch and re-encode them. When it encounters Cloudinary's signed URLs or certain query params, it can return 400s. Also, the WebP detection via the Accept header is unreliable in production builds. The correct approach is to configure remotePatterns for Cloudinary in next.config and use the Cloudinary loader or the new Image component props. Would you like me to write the full config?",
      },
      {
        role: "user",
        content:
          "yes please, and also do i need to do anything special with vercel, i saw something about image optimization limits on the hobby plan. also my upload preset on cloudinary is called travelblog_uploads if that matters.\n\nalso side note the 301 redirects from wordpress are working perfectly, all 47 posts redirect fine. and i moved the seo stuff to the metadata api, that works too. isr revalidation at 3600 seconds is also working.",
      },
      {
        role: "assistant",
        content:
          "Great, that's excellent progress. The redirects and metadata being done is huge. Let me give you the complete config for Cloudinary with remotePatterns. You'll want to use the fetch format from Cloudinary's URLs. For Vercel: the hobby plan allows up to 1000 images optimized per month, and 4KB of cache. There's also a limit on source images of 8MB unless you set quality...",
      },
      {
        role: "user",
        content:
          "ok so i tried what you said with remotePatterns but its still giving me errors?? i put cloudinary-res.cloudinary.com in the patterns. maybe i need the avif format too, what do you think",
      },
      {
        role: "assistant",
        content:
          "The order of remotePatterns matters — Cloudinary patterns should come before any wildcard patterns. If you have a catch-all pattern like '**' listed first, it takes priority. Let me also note: AVIF is supported in modern browsers, but you should keep WebP as a fallback. The 400 could also be from Cloudinary's fetch API params conflicting with next/image's own transformations. Could you share the exact error message?",
      },
      {
        role: "user",
        content:
          "its the one about 'Invalid src prop... hostname is not configured under images.remotePatterns' — wait that says hostname not configured but I DID configure it? maybe im putting it in the wrong place. i have it under images in next.config.mjs. hmm also i should mention the budget is tight, like $20 a month total for infra, so i cant pay for vercel pro or any paid cdn stuff. cloudinary free tier only. and im the only one working on this, going live end of the month.",
      },
      {
        role: "assistant",
        content:
          "The error you're seeing is a strong hint. When next/image shows 'hostname is not configured under images.remotePatterns' even though you added it, the common causes are: 1) The config file isn't being picked up (Next.js 15+ uses next.config.mjs and the property moved), 2) You're using the old 'domains' array alongside remotePatterns, 3) A wildcard pattern earlier in the list shadows your Cloudinary entry. Also check that the protocol is 'https' and there's no trailing slash. Let me walk you through the exact file structure...",
      },
    ],
  },
  {
    id: "demo-outreach",
    label: "Cold email sequence (limit hit)",
    source: "chatgpt",
    messages: [
      {
        role: "user",
        content:
          "hey, writing a cold email sequence for my SaaS, targeting founders of companies with 10-50 employees. I do migration audits for free as the hook instead of demos, that worked better in testing. I finished email 1, 2, 3 and theyre good but i just hit the chatgpt limit. I need emails 4-7 for days 7, 11, 16, 21.\n\nemail 1 got 34% open rate and 11% reply rate which is great. the voice is short sentences, max 120 words, one question per email, no fluff. earlier versions with long paragraphs got zero replies basically. also case-study style emails felt too salesy and people ignored them. so keep it personal, reference their stack like {{stack}} or {{crm}}.\n\nno spam words obviously, this needs to go through gmail and look human.",
      },
      {
        role: "assistant",
        content:
          "Here are the next four emails maintaining your approved voice... [email 4 draft]...",
      },
      {
        role: "user",
        content:
          "email 4 is good but can you make email 5 shorter, it should basically just be a one-liner with a question. and in email 6 i want to include the case study but told you case study style felt salesy?? no i mean like a tiny 2-line proof point, not a whole case study. make it feel like a friend forwarding something.",
      },
      {
        role: "assistant",
        content:
          "Got it — here's the revised email 5 and 6... [drafts]...",
      },
    ],
  },
  {
    id: "demo-webhook",
    label: "Webhook API design (Claude limit)",
    source: "claude",
    messages: [
      {
        role: "user",
        content:
          "designing a webhook ingestion API. the senders are our customers' systems, they post events to us. we chose postgres as the event store with a table event_log that has an idempotency_key column, dedupe works at 1k rps in load tests. retry policy is 3 attempts with exponential backoff and jitter, processed async through a worker queue.\n\nwe were debating mTLS for sender auth but our customers cant do client certs, so we settled on HMAC signing. I need the security design written out, plus dead letter queue flow, and signature ttl recommendation.\n\nconstraints: at-least-once delivery guaranteed, senders might be down for up to 5 minutes, PII must never appear in logs in plaintext. team of two, no new infra, this is the part i got to before claude hit its limit lol. also we found exactly-once without the idempotency table broke under load, so that was a lesson learned.",
      },
      {
        role: "assistant",
        content:
          "Let me lay out the HMAC design... [section 1: signing] [section 2: verification]...",
      },
      {
        role: "user",
        content:
          "that signing section is exactly right, i'll use it. i also want the payload size limit recommendation and a replay procedure. and for the dlq, what alerting channel makes sense for a two person team? slack or just email?",
      },
      {
        role: "assistant",
        content:
          "[section 3: DLQ flow] [section 4: replay] ... For alerting with a two-person team, a Slack webhook to a #webhooks channel with a 5-minute dedupe window works better than email — email gets lost in promotions...",
      },
    ],
  },
];
