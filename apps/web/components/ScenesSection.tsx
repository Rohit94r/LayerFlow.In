export default function ScenesSection() {
  return (
    <section className="v2s workbench-sec" id="terminal">
      <div className="wrap">
        <div className="wrap-narrow">
          <span
            className="kicker rv"
            style={{ color: "#c2410c", borderColor: "rgba(249,115,22,0.2)" }}
          >
            Browser + Terminal
          </span>
          <h2 className="rv rv-d1">
            A terminal that
            <br />
            <span className="serif" style={{ color: "#ea580c" }}>
              runs like an engineering team.
            </span>
          </h2>
          <p className="lede rv rv-d2">
            Install the <b>lf CLI</b> once. It auto-improves your prompt, trims unused
            repository context, runs parallel agents with approvals, and keeps one shared memory
            between your browser and command line.
          </p>
        </div>

        <div className="studio-video rv">
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="/art/scene-studio-poster.webp"
            aria-label="LayerFlow CLI and web workspace multi-agent coding in action"
          >
            <source src="/art/scene-studio.mp4" type="video/mp4" />
          </video>
        </div>

        <div className="feature-minis" id="features">
          {/* Mini 1 */}
          <div className="fmini rv">
            <div className="num" style={{ color: "#ea580c" }}>01</div>
            <div className="demo">
              <div className="dghost">
                <span>11 PM limit reached</span>
              </div>
              <span className="darrow" style={{ color: "#ea580c" }}>→</span>
              <div
                className="dsolid"
                style={{
                  background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                }}
              ></div>
            </div>
            <h3>Rescue dead conversations</h3>
            <p>
              Paste any frozen or rate-limited AI chat. LayerFlow compresses it, extracts the
              architecture decisions, and generates a Continue Pack ready to drop into another model.
            </p>
            <div className="foot">Never re-explain your project at midnight</div>
          </div>

          {/* Mini 2 */}
          <div className="fmini rv rv-d1">
            <div className="num" style={{ color: "#ea580c" }}>02</div>
            <div className="demo">
              <div
                className="dwall"
                style={{
                  backgroundImage: "url('/art/hero-768.webp')",
                  backgroundPosition: "50% 30%",
                  borderColor: "rgba(249,115,22,0.3)",
                }}
              >
                <b style={{ color: "#9a3412" }}>Claude 3.7</b>
              </div>
              <div
                className="dwall"
                style={{
                  backgroundImage: "url('/art/footer-768.webp')",
                  backgroundPosition: "50% 35%",
                  borderColor: "rgba(249,115,22,0.3)",
                }}
              >
                <b style={{ color: "#ea580c" }}>DeepSeek R1</b>
              </div>
            </div>
            <h3>Multi-model routing &amp; BYOK</h3>
            <p>
              Route reasoning tasks to DeepSeek R1, code generation to Claude 3.7, and speed tests
              to Groq. Use your own keys with zero markup and hard budget caps.
            </p>
            <div className="foot">Support for OpenAI, Anthropic, Gemini &amp; DeepSeek</div>
          </div>

          {/* Mini 3 */}
          <div className="fmini rv rv-d2">
            <div className="num" style={{ color: "#ea580c" }}>03</div>
            <div className="demo">
              <div
                className="dkey k1"
                style={{
                  borderColor: "rgba(249,115,22,0.4)",
                  color: "#ea580c",
                }}
              >
                lf
              </div>
              <span className="dplus">+</span>
              <div
                className="dkey k1"
                style={{
                  borderColor: "rgba(249,115,22,0.4)",
                  color: "#ea580c",
                }}
              >
                run
              </div>
              <span style={{ width: 10 }}></span>
              <div className="dkey k2">⌘</div>
              <span className="dplus">+</span>
              <div className="dkey k2">K</div>
            </div>
            <h3>Unified web + terminal sync</h3>
            <p>
              One workspace. Start a coding task in the CLI while traveling, inspect the agent
              diffs in the web UI, and approve terminal file modifications with one tap.
            </p>
            <div className="foot">Instant bi-directional state synchronization</div>
          </div>
        </div>
      </div>
    </section>
  );
}
