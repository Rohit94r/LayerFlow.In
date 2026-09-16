export default function PricingSection() {
  return (
    <section className="v2s" id="pricing">
      <div className="wrap">
        <div className="wrap-narrow">
          <span
            className="kicker rv"
            style={{ color: "#c2410c", borderColor: "rgba(249,115,22,0.2)" }}
          >
            Pricing
          </span>
          <h2 className="rv rv-d1">
            Transparent pricing.{" "}
            <span className="serif" style={{ color: "#ea580c" }}>
              Zero token markup.
            </span>
          </h2>
          <p className="lede rv rv-d2">
            Start free with your own API keys. Upgrade when you need unlimited Chat Rescues,
            cloud multi-agent execution, and team prompt sharing.
          </p>
        </div>

        <div className="plans">
          {/* Plan 1: Developer */}
          <div className="plan rv">
            <h3>Developer</h3>
            <div className="macs">Free forever</div>
            <div className="price">
              <span className="n">$0</span>
              <span className="once">no card needed</span>
            </div>
            <ul>
              <li>100% BYOK (OpenAI, Claude, DeepSeek)</li>
              <li>Native lf CLI + web sync</li>
              <li>Prompt auto-improver (scored 0-100)</li>
              <li>10 Chat Rescues / month</li>
            </ul>
            <a
              href="/sign-in"
              className="cta-pill"
            >
              Start Free
            </a>
          </div>

          {/* Plan 2: Pro (Best value) */}
          <div className="plan rv hot mid rv-d1">
            <div
              className="flag"
              style={{
                backgroundColor: "#f97316",
                boxShadow: "0 2px 10px rgba(249,115,22,0.4)",
              }}
            >
              Most popular
            </div>
            <h3>Pro</h3>
            <div className="macs">For engineers &amp; builders</div>
            <div className="price">
              <span className="n" style={{ color: "#ea580c" }}>$19</span>
              <span className="once">per month</span>
            </div>
            <ul>
              <li>Everything in Developer</li>
              <li>Unlimited Chat Rescues &amp; Continue Packs</li>
              <li>Multi-agent parallel execution (review &amp; test)</li>
              <li>Hard budget limits &amp; killswitches</li>
            </ul>
            <a
              href="/pricing"
              className="cta-pill"
              style={{
                backgroundColor: "#f97316",
                color: "#fff",
                boxShadow: "0 4px 18px rgba(249,115,22,0.4)",
              }}
            >
              Get Pro Access
            </a>
          </div>

          {/* Plan 3: Team */}
          <div className="plan rv rv-d2">
            <h3>Team</h3>
            <div className="macs">For engineering squads</div>
            <div className="price">
              <span className="n">$49</span>
              <span className="once">per month</span>
            </div>
            <ul>
              <li>Everything in Pro</li>
              <li>Shared team prompt &amp; agent library</li>
              <li>Centralized BYOK key vault &amp; audit log</li>
              <li>Priority support &amp; private Discord</li>
            </ul>
            <a
              href="/pricing"
              className="cta-pill"
            >
              Upgrade Team
            </a>
          </div>
        </div>

        <div className="pricing-foot">
          Prices in USD. All plans support 100% Bring-Your-Own-Key (BYOK) with 0% token margin.
          Questions?{" "}
          <a
            style={{ color: "#ea580c", fontWeight: 600 }}
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read the key security policy.
          </a>
        </div>
      </div>
    </section>
  );
}
