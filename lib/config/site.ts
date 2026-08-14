// ─────────────────────────────────────────────────────────────
// Application configuration — single source of truth for the
// dashboard shell. Landing-page copy lives separately in
// lib/data/marketing.ts + lib/marketing-content.ts.
// ─────────────────────────────────────────────────────────────

export const appConfig = {
  name: "LayerFlow",
  homeHref: "/home",
  signInHref: "/sign-in",
  installCommand: "curl -fsSL https://raw.githubusercontent.com/Rohit94r/layerflow-releases/main/install.sh | bash",
  cliDocsHref: "/docs",
  supportEmail: "support@layerflow.dev",
  defaultWorkspace: "Personal",
} as const;
