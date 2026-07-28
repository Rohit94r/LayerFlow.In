<div align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-6C5CE7?style=flat-square" alt="Version" />
  <img src="https://img.shields.io/badge/license-MIT-00B894?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss" alt="Tailwind" />
  <img src="https://img.shields.io/badge/status-alpha-FA8072?style=flat-square" alt="Status" />
  <br/>
  <a href="https://layerflow.dev" target="_blank">
    <img src="https://img.shields.io/badge/website-layerflow.dev-6C5CE7?style=flat-square" alt="Website" />
  </a>
  <a href="https://twitter.com/layerflow" target="_blank">
    <img src="https://img.shields.io/badge/follow-%40layerflow-1DA1F2?style=flat-square&logo=x" alt="Twitter" />
  </a>
</div>

<br/>

<div align="center">
  <h1>LayerFlow</h1>
  <p>
    <strong>The AI Workspace for Everyone</strong>
  </p>
  <p>
    <em>Organize. Version. Compare. Control.</em>
  </p>
  <p>
    LayerFlow is a production-grade workspace for AI prompts and model management — 
    think <strong>GitHub for code meets Vercel for deployment</strong>, purpose-built for prompt engineering.
  </p>
</div>

<br/>

---

## Features

<div align="center">
  <table>
    <tr>
      <td align="center">📝</td>
      <td><strong>Prompt Workspace</strong></td>
      <td>Organize prompts in projects, folders, and domains with full CRUD</td>
    </tr>
    <tr>
      <td align="center">⏱️</td>
      <td><strong>Prompt Timeline</strong></td>
      <td>Git-inspired version history for every prompt — diff, revert, branch</td>
    </tr>
    <tr>
      <td align="center">⚖️</td>
      <td><strong>Multi-Model Compare</strong></td>
      <td>Run the same prompt across GPT-4, Claude, Gemini and compare outputs side-by-side</td>
    </tr>
    <tr>
      <td align="center">💰</td>
      <td><strong>Hard Budget UI</strong></td>
      <td>Set per-project, per-model, and per-user spend limits that actually enforce</td>
    </tr>
    <tr>
      <td align="center">🔌</td>
      <td><strong>Unified Gateway</strong></td>
      <td>OpenAI-compatible API gateway with BYOK, rate limiting, and failover</td>
    </tr>
    <tr>
      <td align="center">👥</td>
      <td><strong>Team Collaboration</strong></td>
      <td>Share prompts, review versions, and collaborate across domains</td>
    </tr>
  </table>
</div>

---

## Tech Stack

<div align="center">
  <table>
    <tr>
      <td><strong>Framework</strong></td>
      <td>
        <img src="public/images/vercel.svg" height="20" alt="Vercel" />
        &nbsp;Next.js 16 (App Router)
      </td>
    </tr>
    <tr>
      <td><strong>Language</strong></td>
      <td>TypeScript 5 (Strict)</td>
    </tr>
    <tr>
      <td><strong>Styling</strong></td>
      <td>Tailwind CSS v4 + CSS Custom Properties</td>
    </tr>
    <tr>
      <td><strong>Animation</strong></td>
      <td>Framer Motion 11</td>
    </tr>
    <tr>
      <td><strong>Icons</strong></td>
      <td>Lucide React</td>
    </tr>
    <tr>
      <td><strong>Fonts</strong></td>
      <td>DM Sans + DM Mono (next/font)</td>
    </tr>
  </table>
</div>

### Supported Providers

<div align="center">
  <table>
    <tr>
      <td><img src="public/images/openai.svg" height="30" alt="OpenAI" /></td>
      <td><img src="public/images/anthropic.svg" height="30" alt="Anthropic" /></td>
      <td><img src="public/images/google-gemini.svg" height="30" alt="Google Gemini" /></td>
      <td><img src="public/images/databricks.svg" height="30" alt="Databricks" /></td>
    </tr>
    <tr>
      <td><img src="public/images/bedrock.png" height="30" alt="AWS Bedrock" /></td>
      <td><img src="public/images/mistral.svg" height="30" alt="Mistral" /></td>
      <td><img src="public/images/cohere.svg" height="30" alt="Cohere" /></td>
      <td><img src="public/images/groq.svg" height="30" alt="Groq" /></td>
    </tr>
  </table>
</div>

### Trusted By

<div align="center">
  <table>
    <tr>
      <td><img src="public/images/companies/microsoft.svg" height="25" alt="Microsoft" /></td>
      <td><img src="public/images/companies/meta.svg" height="25" alt="Meta" /></td>
      <td><img src="public/images/companies/accenture.svg" height="25" alt="Accenture" /></td>
      <td><img src="public/images/companies/booking.svg" height="25" alt="Booking" /></td>
      <td><img src="public/images/companies/toyota.svg" height="25" alt="Toyota" /></td>
    </tr>
  </table>
</div>

---

## Getting Started

```bash
# Clone the repository
git clone https://github.com/Rohit94r/LayerFlow.In.git

# Navigate to the project
cd LayerFlow.In

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```
├── app/
│   ├── (marketing)/          # Marketing pages (landing, about, pricing)
│   │   ├── page.tsx          # Landing page
│   │   ├── about/page.tsx    # About page
│   │   └── pricing/page.tsx  # Pricing page
│   └── (app)/                # Authenticated workspace
│       ├── workspace/        # Dashboard home
│       ├── projects/         # Project management
│       ├── prompts/          # Prompt editor & timeline
│       ├── compare/          # Multi-model comparison
│       ├── budget/           # Spend management
│       ├── gateway/          # API gateway config
│       └── settings/         # Workspace settings
├── components/
│   ├── marketing/            # Marketing site components
│   │   ├── Hero.tsx          # Parallax hero section
│   │   ├── Navbar.tsx        # Glass morphism nav
│   │   ├── Footer.tsx        # Multi-column footer
│   │   └── ...               # 13 more components
│   └── workspace/            # App workspace components
│       ├── AppSidebar.tsx    # Navigation sidebar
│       ├── PromptEditor.tsx  # Prompt editing surface
│       ├── ComparePanel.tsx  # Side-by-side comparison
│       ├── Timeline.tsx      # Version history timeline
│       └── ...               # 3 more components
├── lib/                      # Utilities, types, data
│   ├── types.ts              # TypeScript domain model
│   ├── mock-data.ts          # Demo data
│   ├── marketing-content.ts  # Marketing copy
│   └── highlight-code.tsx    # Syntax highlighter
├── docs/                     # Product & architecture docs
│   ├── product-strategy.md   # Vision and roadmap
│   ├── features.md           # Feature specifications
│   └── backend.md            # Backend architecture
├── public/images/            # Logos and brand assets
└── package.json
```

---

## Roadmap

| Phase | Focus | Timeline |
|-------|-------|----------|
| **MVP** | Workspace, Projects, Prompts, Timeline, Compare, Budget | Week 1-4 |
| **Launch** | Gateway, SDK, API, Team features | Week 5-8 |
| **Growth** | Templates, Community, Marketplace | Q2 |
| **Scale** | Enterprise SSO, RBAC, Audit, SOC2 | Q3 |

---

## Documentation

- [Product Strategy](docs/product-strategy.md) — Vision, personas, and roadmap
- [Features](docs/features.md) — Detailed feature specifications
- [Features status](docs/features-status.md) — What’s working vs planned
- [Getting started](docs/getting-started.md) — Use the app + gateway without an SDK
- [SDK](docs/sdk.md) — Official SDK planned (not on npm); HTTP / OpenAI client today
- [Backend Architecture](docs/backend.md) — API design and data model

---

<div align="center">
  <p>
    Built with ❤️ by <a href="https://github.com/Rohit94r">Rohit Jadhav</a>
  </p>
  <p>
    <a href="https://layerflow.dev">layerflow.dev</a> ·
    <a href="https://github.com/Rohit94r/LayerFlow.In/issues">Issues</a> ·
    <a href="https://github.com/Rohit94r/LayerFlow.In/discussions">Discussions</a>
  </p>
</div>
