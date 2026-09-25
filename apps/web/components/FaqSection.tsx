export default function FaqSection() {
  const faqs = [
    {
      q: "What is LayerFlow and how is it different from standard AI chat apps?",
      a: "LayerFlow is an AI spend firewall and gateway. One OpenAI-compatible endpoint sits in front of every major model — your keys, hard budget caps, alerts at 50/80/100%, and usage history. Rather than locking you into one vendor, it lets you route calls to Claude, ChatGPT, Gemini, and DeepSeek while keeping every dollar accounted for.",
    },
    {
      q: "How do hard budget caps work?",
      a: "You set a monthly cap per workspace. Every request counts against it, and at 50%, 80%, and 100% you get an email. At 100%, new requests hard-block — no surprise bills, no exceptions.",
    },
    {
      q: "Can I bring my own API keys (BYOK)?",
      a: "Yes! Plug in your own keys for Anthropic, OpenAI, Google Gemini, DeepSeek, Groq, and more. LayerFlow charges 0% token markup — you pay provider wholesale rates directly, and we add caps, alerts, and usage history on top.",
    },
    {
      q: "How does per-project spend attribution work?",
      a: "Send one header — x-lf-project: client-acme — on any request and the cost lands under that project in your usage history. No spreadsheets, no guesswork.",
    },
    {
      q: "What exactly is usage history?",
      a: "Every gateway completion records the model, input/output tokens, project tag, and the exact dollar cost to four decimals. View it in the dashboard, or via `lf cost` in the terminal.",
    },
    {
      q: "What AI models are supported?",
      a: "All major frontier models: Claude Sonnet / Opus, OpenAI GPT-4o / o3-mini, Google Gemini Flash / Pro, DeepSeek R1 / V3, Groq (Llama 3.3 70B), and more via a single OpenAI-compatible API.",
    },
    {
      q: "Can I use the CLI without a LayerFlow account?",
      a: "Yes. Set a provider key (`lf config key openai sk-...`) or an env var like OPENAI_API_KEY and lf chats directly to that provider at your configured base URL. `lf login` is only needed for gateway budgets.",
    },
    {
      q: "Is my code private and secure?",
      a: "Yes. With BYOK, requests go straight to provider endpoints through your own key. Direct-mode requests are never stored. LayerFlow never trains on your code or prompts, and provider keys in the vault are encrypted.",
    },
  ];

  return (
    <section className="v2s" id="faq">
      <div className="wrap-narrow">
        <span
          className="kicker rv"
          style={{ color: "#c2410c", borderColor: "rgba(249,115,22,0.2)" }}
        >
          FAQ
        </span>
        <h2 className="rv rv-d1">
          Everything you would ask{" "}
          <span className="serif" style={{ color: "#ea580c" }}>
            before switching your AI workflow.
          </span>
        </h2>
      </div>
      <div className="faq-list rv">
        {faqs.map((faq, idx) => (
          <details key={idx}>
            <summary>
              {faq.q}
              <span
                className="tog"
                style={{
                  color: "#ea580c",
                  borderColor: "rgba(249,115,22,0.3)",
                }}
              >
                +
              </span>
            </summary>
            <div className="a">{faq.a}</div>
          </details>
        ))}
      </div>
    </section>
  );
}
