export default function ComparisonSection() {
  return (
    <section className="v2s">
      <div className="wrap">
        <div className="wrap-narrow">
          <span
            className="kicker rv"
            style={{ color: "#c2410c", borderColor: "rgba(249,115,22,0.2)" }}
          >
            What makes us different
          </span>
          <h2 className="rv rv-d1">
            Others chat in silos.
            <br />
            <span className="serif" style={{ color: "#ea580c" }}>
              LayerFlow finishes the job.
            </span>
          </h2>
          <p className="lede rv rv-d2">
            Standard AI chat tools are isolated web tabs. They lose context the moment you switch
            models, leave you stranded at midnight limits, and charge you for repetitive tokens.
          </p>
        </div>

        <div className="diff-card rv">
          <div className="diff-grid">
            {/* Column 1: Others */}
            <div className="diff-col others">
              <h4>Standard AI Chatbots</h4>
              <div className="diff-li">
                <span className="x">✕</span>
                <span>
                  Forget everything when you <b>switch models or tabs</b>
                </span>
              </div>
              <div className="diff-li">
                <span className="x">✕</span>
                <span>
                  Hit a <b>limit at 11 PM</b> and lock you out with half-written code
                </span>
              </div>
              <div className="diff-li">
                <span className="x">✕</span>
                <span>
                  No local terminal sync, forcing <b>manual copy-pasting</b> of files
                </span>
              </div>
              <div className="diff-li">
                <span className="x">✕</span>
                <span>
                  Repeatedly send full conversation history, <b>wasting token dollars</b>
                </span>
              </div>
            </div>

            <div className="vs" style={{ color: "#ea580c" }}>vs</div>

            {/* Column 2: LayerFlow */}
            <div className="diff-col putback">
              <h4>LayerFlow</h4>
              <div className="diff-li">
                <span className="c" style={{ color: "#f97316" }}>✓</span>
                <span>
                  <b>One persistent memory</b> shared across Claude, GPT-4o, and DeepSeek
                </span>
              </div>
              <div className="diff-li">
                <span className="c" style={{ color: "#f97316" }}>✓</span>
                <span>
                  Instantly creates <b>Continue Packs</b> to rescue dead or limited chats
                </span>
              </div>
              <div className="diff-li">
                <span className="c" style={{ color: "#f97316" }}>✓</span>
                <span>
                  <b>Native lf CLI</b> with approval prompts directly in your shell
                </span>
              </div>
              <div className="diff-li">
                <span className="c" style={{ color: "#f97316" }}>✓</span>
                <span>
                  Auto-cuts unused context &amp; enforces <b>hard spending budget limits</b>
                </span>
              </div>
            </div>
          </div>

          <div className="diff-foot">
            LayerFlow is not just another wrapper. It is the intelligence and memory your AI workflow was missing.
          </div>
        </div>
      </div>
    </section>
  );
}
