export default function PublicBand() {
  return (
    <section className="v2s public-band">
      <div className="wrap-narrow">
        <span
          className="kicker rv"
          style={{ color: "#fdba74", borderColor: "rgba(253,186,116,0.3)" }}
        >
          Engineered in the open
        </span>
        <h2 className="rv rv-d1">
          No lock-in.
          <br />
          No token markups.{" "}
          <span className="serif" style={{ color: "#fdba74" }}>
            No BS.
          </span>
        </h2>
        <p className="lede rv rv-d2">
          LayerFlow was created by developers who got tired of AI context rot, midnight rate limits,
          and paying twice for the same prompt history. Bring your own API keys, run locally, and
          control every single penny.
        </p>

        <div className="stat-row">
          <div className="stat rv">
            <div className="n" style={{ color: "#fff" }}>
              &lt; 0.8<em>s</em>
            </div>
            <div className="l">prompt refinement &amp; context cut</div>
          </div>
          <div className="stat rv rv-d1">
            <div className="n" style={{ color: "#fdba74" }}>
              $0.00 <em>markup</em>
            </div>
            <div className="l">direct provider billing with BYOK</div>
          </div>
          <div className="stat rv rv-d2">
            <div className="n" style={{ color: "#fff" }}>
              0 <em>lost chats</em>
            </div>
            <div className="l">instant rescue into Continue Packs</div>
          </div>
        </div>

        <div className="public-links rv">
          <a
            href="https://layerflow.dev/docs"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read the documentation &amp; CLI setup →
          </a>
          <a
            href="https://layerflow.dev/agents"
            target="_blank"
            rel="noopener noreferrer"
          >
            Explore agent templates &amp; workflows →
          </a>
          <a
            href="https://layerflow.dev/pricing"
            target="_blank"
            rel="noopener noreferrer"
          >
            View pricing &amp; hard budget limits →
          </a>
        </div>
      </div>
    </section>
  );
}
