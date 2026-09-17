export default function JobAgentSection() {
  return (
    <section className="v2s" id="job-agent">
      <div className="wrap">
        <div className="wrap-narrow">
          <span
            className="kicker rv"
            style={{ color: "#c2410c", borderColor: "rgba(249,115,22,0.2)" }}
          >
            Agent at work
          </span>
          <h2 className="rv rv-d1">
            An agent for the job hunt.
            <br />
            <span className="serif" style={{ color: "#ea580c" }}>
              apply, pitch, repeat.
            </span>
          </h2>
          <p className="lede rv rv-d2">
            Build your own job-hunt agent. It scans openings, tailors your resume and cover
            letter, applies while you sleep, and hunts freelancing clients with pitches that
            sound like you — all in the background.
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
                job
              </div>
            </div>
            <h3>Auto-apply to jobs</h3>
            <p>
              Your agent watches job boards and companies for roles that match your skills, ranks
              them by fit, rewrites your resume and cover letter per position, and submits the
              application — no copy-pasting.
            </p>
            <div className="foot">Cover letters written for every role</div>
          </div>

          <div className="fmini rv rv-d1">
            <div className="num" style={{ color: "#ea580c" }}>02</div>
            <div className="demo">
              <div className="dkey k1" style={{ borderColor: "rgba(249,115,22,0.4)", color: "#ea580c" }}>
                lf
              </div>
              <span className="dplus">+</span>
              <div className="dkey k1" style={{ borderColor: "rgba(249,115,22,0.4)", color: "#ea580c" }}>
                client
              </div>
            </div>
            <h3>Find freelancing clients</h3>
            <p>
              Point it at Upwork, Fiverr, or your own target list. It matches you to briefs,
              writes a pitch in your tone, sends the first message, replies to follow-ups, and
              nudges leads before they go cold.
            </p>
            <div className="foot">Pitches that sound like you</div>
          </div>

          <div className="fmini rv rv-d2">
            <div className="num" style={{ color: "#ea580c" }}>03</div>
            <div className="demo">
              <div className="dkey k2">⌘</div>
              <span className="dplus">+</span>
              <div className="dkey k2">A</div>
            </div>
            <h3>Runs in the background</h3>
            <p>
              The grunt work never sleeps. Your agent tracks replies and deadlines, surfaces next
              steps, and pings you only when a human decision is needed — one tap to steer it.
            </p>
            <div className="foot">You approve · the agent does the rest</div>
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
            Build your job agent <span className="arrow">→</span>
          </a>
          <p className="cta-sub">
            Start free with your own keys or a local model. No credit card, no lock-in.
          </p>
        </div>
      </div>
    </section>
  );
}