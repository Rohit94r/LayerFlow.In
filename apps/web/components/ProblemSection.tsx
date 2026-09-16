export default function ProblemSection() {
  return (
    <section className="v2s" id="how">
      <div className="wrap-narrow">
        <span className="kicker rv" style={{ color: "#c2410c", borderColor: "rgba(249,115,22,0.2)" }}>
          The problem
        </span>
        <h2 className="rv rv-d1">
          AI is powerful.
          <br />
          Your <span className="serif" style={{ color: "#ea580c" }}>workflow isn&apos;t.</span>
        </h2>
        <p className="lede rv rv-d2">
          Every time you hit a rate limit at 11 PM or switch between ChatGPT, Claude, and Gemini,
          you lose context, re-explain the project from scratch, and <b>pay twice for the same tokens</b>.
          LayerFlow preserves your project memory, auto-compresses context, and finishes the thought in under a second.
        </p>

        <div className="badge-row rv rv-d3">
          <div className="badge">
            <div className="big" style={{ color: "#ea580c" }}>100%</div>
            <div className="small">BYOK &amp; zero markup</div>
          </div>
          <div className="badge-sep"></div>
          <div className="badge">
            <div className="big" style={{ color: "#ea580c" }}>$0</div>
            <div className="small">wasted on repeated tokens</div>
          </div>
          <div className="badge-sep"></div>
          <div className="badge">
            <div className="big s" style={{ color: "#f97316" }}>★★★★★</div>
            <div className="small">browser + CLI sync</div>
          </div>
        </div>

        <a
          className="cta-pill cta-lg rv"
          href="/sign-in"
          style={{
            background: "var(--accent)",
            boxShadow: "0 4px 18px rgba(249, 115, 22, 0.4)",
          }}
        >
          Try LayerFlow Free <span className="arrow">→</span>
        </a>

        <div className="mbp rv">
          <div className="mbp-lid">
            <div className="mbp-screen">
              <div className="mbp-media">
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  poster="/art/problem-poster.webp"
                  aria-label="LayerFlow rescues dead conversations and restores your coding context in seconds"
                >
                  <source src="/art/problem.mp4" type="video/mp4" />
                </video>
              </div>
            </div>
          </div>
          <div className="mbp-deck"></div>
        </div>
      </div>
    </section>
  );
}
