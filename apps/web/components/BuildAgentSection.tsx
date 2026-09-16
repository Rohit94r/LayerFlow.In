import Link from "next/link";

export default function BuildAgentSection() {
  return (
    <section className="v2s" id="build">
      <div className="wrap">
        <div className="wrap-narrow">
          <span
            className="kicker rv"
            style={{ color: "#c2410c", borderColor: "rgba(249,115,22,0.2)" }}
          >
            For coders &amp; everyone else
          </span>
          <h2 className="rv rv-d1">
            Build your own agent.
            <br />
            <span className="serif" style={{ color: "#ea580c" }}>
              Then just talk to it.
            </span>
          </h2>
          <p className="lede rv rv-d2">
            LayerFlow is the same workspace for two kinds of people: coders who want an agent
            that runs tools, reads their repo and asks before acting — and everyone who just
            wants to chat with an AI that never forgets, plus the ability to create their own
            AI and chat with it on their own terms (bring your own API key, keep your own cost
            limits).
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rv rv-d2 feature-card">
            <div className="feature-ico">⌨️</div>
            <h3 className="feature-title" style={{ color: "#ea580c" }}>
              Coders — bring your own keys
            </h3>
            <p className="feature-body">
              Build an agent in `lf` that plans, edits files, runs tests and streams results.
              Give it tools with approvals, cap its budget, keep it in sessions that never
              die.
            </p>
            <Link
              href="/docs"
              className="feature-cta"
            >
              Read the build docs →
            </Link>
          </div>

          <div className="rv rv-d3 feature-card">
            <div className="feature-ico">💬</div>
            <h3 className="feature-title" style={{ color: "#ea580c" }}>
              Everyone — just chat
            </h3>
            <p className="feature-body">
              No setup, no code. Chat with any model, resume a dead conversation instead of
              starting over, and use your own API key so it's as cheap as you want it to be.
            </p>
            <Link
              href="/sign-in"
              className="feature-cta"
            >
              Start chatting →
            </Link>
          </div>

          <div className="rv rv-d4 feature-card">
            <div className="feature-ico">🤖</div>
            <h3 className="feature-title" style={{ color: "#ea580c" }}>
              Or build your own
            </h3>
            <p className="feature-body">
              Create an agent that works the way you do — give it memory, tools alerts and
              approval gates, then share it with your team. Both paths use the same LayerFlow
              workspace.
            </p>
            <Link
              href="/docs"
              className="feature-cta"
            >
              How agents work →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
