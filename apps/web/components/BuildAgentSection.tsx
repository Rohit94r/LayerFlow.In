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
            Build your own
          </span>
          <h2 className="rv rv-d1">
            Build your own agent
            <br />
            <span className="serif" style={{ color: "#ea580c" }}>
              and just chat.
            </span>
          </h2>
          <p className="lede rv rv-d2">
            LayerFlow puts you in control. Bring your own API keys, cap your budget, wire up
            tools, and run an agent that does the work — or skip all of it and simply chat. Same
            workspace, two ways in.
          </p>
        </div>

        <div className="feature-minis">
          <div className="fmini rv">
            <div className="num" style={{ color: "#ea580c" }}>01</div>
            <div className="demo">
              <div className="dkey k1" style={{ borderColor: "rgba(249,115,22,0.4)", color: "#ea580c" }}>
                lf
              </div>
              <span className="dplus">+</span>
              <div className="dkey k1" style={{ borderColor: "rgba(249,115,22,0.4)", color: "#ea580c" }}>
                agent
              </div>
            </div>
            <h3>Build your own agent</h3>
            <p>
              For coders: attach your own model keys, add tools and approvals, set hard budget
              caps and request limits. Your agent plans, writes, and ships — with every cost line
              visible.
            </p>
            <div className="foot">Bring your keys · BYOK · zero markup</div>
          </div>

          <div className="fmini rv rv-d1">
            <div className="num" style={{ color: "#ea580c" }}>02</div>
            <div className="demo">
              <div className="dkey k2">⌘</div>
              <span className="dplus">+</span>
              <div className="dkey k2">K</div>
            </div>
            <h3>Or just chat</h3>
            <p>
              No code, no setup. Open a chat, type plain English, and get real answers the moment
              you hit &ldquo;Start&rdquo;. Perfect for everyone who wants the outcome, not the
              terminal.
            </p>
            <div className="foot">Chat first · no terminal needed</div>
          </div>

          <div className="fmini rv rv-d2">
            <div className="num" style={{ color: "#ea580c" }}>03</div>
            <div className="demo">
              <div className="dkey k1" style={{ borderColor: "rgba(249,115,22,0.4)", color: "#ea580c" }}>
                ∞
              </div>
            </div>
            <h3>Runs fully local</h3>
            <p>
              Use Ollama or LM Studio on your own machine — no account, no cloud, no API key
              required. The terminal, models, and your conversations all live where you do.
            </p>
            <div className="foot">100% local · like opencode</div>
          </div>
        </div>

        <div className="cta-wrap">
          <a
            className="cta-pill cta-lg rv"
            href="/docs"
            style={{
              background: "var(--accent)",
              boxShadow: "0 4px 18px rgba(249, 115, 22, 0.4)",
            }}
          >
            Build yours — Start Coding <span className="arrow">→</span>
          </a>
          <p className="cta-sub">
            Start free with your own keys or a local model. No credit card, no lock-in.
          </p>
        </div>
      </div>
    </section>
  );
}
