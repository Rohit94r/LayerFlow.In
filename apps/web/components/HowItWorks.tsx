export default function HowItWorks() {
  return (
    <section className="v2s">
      <div className="wrap">
        <div className="wrap-narrow">
          <span
            className="kicker rv"
            style={{ color: "#c2410c", borderColor: "rgba(249,115,22,0.2)" }}
          >
            How it works
          </span>
          <h2 className="rv rv-d1">
            Three steps.{" "}
            <span className="serif" style={{ color: "#ea580c" }}>
              From plain English to shipped code.
            </span>
          </h2>
        </div>
        <div className="trio">
          {/* Step 1 */}
          <div className="tcard rv">
            <div
              className="art"
              style={{
                backgroundImage: "url('/art/hero-768.webp')",
                backgroundPosition: "12% 74%",
              }}
            >
              <div className="glyph">
                <div
                  className="gwin"
                  style={{
                    width: 118,
                    height: 76,
                    border: "1.5px solid rgba(249,115,22,0.4)",
                    backgroundColor: "rgba(255,255,255,0.85)",
                  }}
                >
                  <div className="p-1.5 font-mono text-[9px] text-stone-600 font-medium leading-tight">
                    &gt; write plain prompt...
                  </div>
                </div>
                <div
                  className="gwin"
                  style={{
                    width: 64,
                    height: 48,
                    marginTop: 28,
                    border: "1.5px solid rgba(249,115,22,0.3)",
                    backgroundColor: "rgba(255,255,255,0.7)",
                  }}
                ></div>
              </div>
            </div>
            <div className="body">
              <div className="step" style={{ color: "#ea580c" }}>STEP 01</div>
              <h3>Write in plain English</h3>
              <p>
                No prompt engineering ritual or complex setup. Type a simple sentence or paste
                a broken AI chat you got stuck on. LayerFlow extracts the real objective.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="tcard rv rv-d1">
            <div
              className="art"
              style={{
                backgroundImage: "url('/art/hero-768.webp')",
                backgroundPosition: "50% 68%",
              }}
            >
              <div className="glyph">
                <div
                  className="gwin"
                  style={{
                    width: 92,
                    height: 64,
                    border: "1.5px solid rgba(249,115,22,0.4)",
                    backgroundColor: "rgba(255,255,255,0.85)",
                  }}
                >
                  <div className="p-1.5 font-mono text-[9px] text-orange-600 font-bold">
                    Score: 98/100
                  </div>
                </div>
                <span className="garrow" style={{ color: "#ea580c" }}>→</span>
                <div
                  className="gwin ghost"
                  style={{
                    width: 92,
                    height: 64,
                    border: "1.5px dashed rgba(249,115,22,0.5)",
                  }}
                >
                  <div className="p-1.5 font-mono text-[8px] text-stone-500">
                    -8,240 tokens
                  </div>
                </div>
              </div>
            </div>
            <div className="body">
              <div className="step" style={{ color: "#ea580c" }}>STEP 02</div>
              <h3>Auto-improve &amp; cut context</h3>
              <p>
                LayerFlow refines your request into a precise prompt with strict constraints,
                tests, and schema, while trimming away token bloat to keep your costs near zero.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="tcard rv rv-d2">
            <div
              className="art"
              style={{
                backgroundImage: "url('/art/footer-768.webp')",
                backgroundPosition: "55% 42%",
              }}
            >
              <div className="glyph" style={{ gap: 8 }}>
                <div
                  className="gwin"
                  style={{
                    width: 84,
                    height: 60,
                    border: "1.5px solid rgba(249,115,22,0.4)",
                    backgroundColor: "rgba(255,255,255,0.9)",
                  }}
                >
                  <div className="p-1 font-mono text-[8px] text-emerald-600 font-bold">
                    ✓ Browser
                  </div>
                  <div className="p-1 font-mono text-[8px] text-orange-600 font-bold">
                    ✓ CLI Sync
                  </div>
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  <div
                    className="gwin"
                    style={{
                      width: 52,
                      height: 26,
                      backgroundColor: "rgba(255,255,255,0.8)",
                    }}
                  ></div>
                  <div
                    className="gwin"
                    style={{
                      width: 52,
                      height: 26,
                      backgroundColor: "rgba(255,255,255,0.8)",
                    }}
                  ></div>
                </div>
              </div>
              <div
                className="gcheck"
                style={{
                  backgroundColor: "#f97316",
                  color: "#fff",
                  boxShadow: "0 2px 10px rgba(249,115,22,0.4)",
                }}
              >
                ✓
              </div>
            </div>
            <div className="body">
              <div className="step" style={{ color: "#ea580c" }}>STEP 03</div>
              <h3>Multi-agent run &amp; sync</h3>
              <p>
                Implementation, code review, and test agents run in parallel across your choice
                of models. Every finished thought generates a Continue Pack ready for any AI.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
