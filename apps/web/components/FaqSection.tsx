export default function FaqSection() {
  const faqs = [
    {
      q: "What is LayerFlow and how is it different from standard AI chat apps?",
      a: "LayerFlow is an AI workspace and CLI built on shared project memory, prompt optimization, and multi-model routing. Rather than locking you into one vendor, LayerFlow lets you chat across Claude, ChatGPT, Gemini, and DeepSeek, rescue dead conversations with Continue Packs, and run multi-agent workflows with approval gates.",
    },
    {
      q: "How does Chat Rescue work when I hit an AI rate limit at 11 PM?",
      a: "When a provider locks you out or a long conversation starts degrading, paste the chat into LayerFlow. Our pipeline extracts architectural decisions, trims redundant tokens, and generates a clean Continue Pack formatted to resume immediately in another AI model without repeating yourself.",
    },
    {
      q: "Can I bring my own API keys (BYOK)?",
      a: "Yes! You can plug in your own API keys for Anthropic, OpenAI, Google Gemini, DeepSeek, Groq, and OpenRouter. LayerFlow charges 0% token markup—you pay provider wholesale rates directly.",
    },
    {
      q: "How does the lf CLI sync with the web dashboard?",
      a: "The lf CLI connects securely to your LayerFlow workspace. Every terminal prompt, context cut, and agent execution is mirrored in your web dashboard, allowing you to review diffs and manage sessions from anywhere.",
    },
    {
      q: "How does Auto Context Cutting reduce token bills?",
      a: "Standard chatbots resend the entire conversation history on every turn. LayerFlow extracts only the active dependencies and instructions needed for the current prompt, cutting up to 70% of redundant input tokens.",
    },
    {
      q: "What AI models are supported?",
      a: "All major frontier models: Claude 3.7 Sonnet / Opus, OpenAI GPT-4o / o1 / o3-mini, Google Gemini 2.0 Flash / Pro, DeepSeek R1 / V3, Groq (Llama 3.3 70B), and 200+ models via OpenRouter.",
    },
    {
      q: "How do hard budget limits work?",
      a: "You can define hard dollar caps per agent run, per project, or per day (e.g. $5.00). If an autonomous agent nears your spending threshold, LayerFlow pauses and requires human approval before proceeding.",
    },
    {
      q: "Is my code private and secure?",
      a: "Yes. When using your own API keys (BYOK), requests go directly to provider endpoints. LayerFlow never trains on your code or prompts, and local files accessed via the CLI remain strictly on your machine.",
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
