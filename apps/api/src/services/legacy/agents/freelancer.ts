/**
 * Freelancer / User-Defined Agent Templates
 *
 * Provides pre-built agent templates for common freelancer workflows:
 * - Lead research & outreach
 * - Proposal writing
 * - Client follow-up
 * - SEO/content research
 * - Competitor research
 * - Code review & QA
 * - Content research & repurposing
 */

import type { AgentRole } from "@layerflow/contracts";
import type { AgentPermission } from "./permissions";

// -- Template Interface ------------------------------------------------------

export interface FreelancerTemplate {
  key: string;
  name: string;
  description: string;
  category: string;
  role: AgentRole;
  defaultTools: string[];
  defaultPermissions: AgentPermission[];
  defaultSystemPrompt: string;
  estimatedCost: string;
  expectedOutcome: string;
}

// -- Template Catalog --------------------------------------------------------

export const FREELANCER_TEMPLATES: FreelancerTemplate[] = [
  {
    key: "lead_research",
    name: "Lead Research",
    description: "Research potential leads, companies, and decision-makers for outreach.",
    category: "Sales & Outreach",
    role: "research",
    defaultTools: ["search", "fetch_url", "read_file", "write_file"],
    defaultPermissions: [
      { key: "search", label: "Search web", description: "Search for leads online", category: "Research", level: "allow_always" },
      { key: "fetch_url", label: "Fetch URLs", description: "Visit company pages and profiles", category: "Research", level: "allow_always" },
      { key: "write_file", label: "Save research", description: "Save lead data to files", category: "Storage", level: "allow_once" },
    ],
    defaultSystemPrompt: `You are a lead research assistant. Your job is to:
1. Research companies matching the user's ideal customer profile
2. Find decision-makers and their contact info
3. Compile lead lists with company background, size, funding, and tech stack
4. Save findings to structured files for review`,
    estimatedCost: "$1-$5 per research session",
    expectedOutcome: "A curated list of qualified leads with contact information and company profiles.",
  },
  {
    key: "proposal_writing",
    name: "Proposal Writer",
    description: "Draft professional proposals and bids for freelance projects.",
    category: "Sales & Outreach",
    role: "custom",
    defaultTools: ["read_file", "write_file", "fetch_url"],
    defaultPermissions: [
      { key: "read_file", label: "Read templates", description: "Read proposal templates and examples", category: "Read", level: "allow_always" },
      { key: "write_file", label: "Write proposal", description: "Create and edit proposal documents", category: "Write", level: "deny" },
      { key: "fetch_url", label: "Browse RFP", description: "Review RFP/job posting details", category: "Research", level: "allow_always" },
    ],
    defaultSystemPrompt: `You are a proposal writing assistant. Your job is to:
1. Analyze the project requirements or RFP
2. Draft a tailored proposal including scope, timeline, and pricing
3. Highlight relevant experience and past work
4. Save the proposal for review before submission`,
    estimatedCost: "$2-$8 per proposal",
    expectedOutcome: "A complete, professional proposal ready for review and submission.",
  },
  {
    key: "client_followup",
    name: "Client Follow-Up",
    description: "Draft and schedule client follow-up messages and check-ins.",
    category: "Communication",
    role: "meeting_followup",
    defaultTools: ["read_file", "write_file"],
    defaultPermissions: [
      { key: "read_file", label: "Read history", description: "Read past interactions and notes", category: "Read", level: "allow_always" },
      { key: "write_file", label: "Draft message", description: "Write follow-up drafts", category: "Write", level: "deny" },
    ],
    defaultSystemPrompt: `You are a client follow-up assistant. Your job is to:
1. Review past interactions and project status
2. Draft professional follow-up messages
3. Suggest timing for follow-ups based on context
4. Track communication history`,
    estimatedCost: "<$1 per follow-up draft",
    expectedOutcome: "Well-crafted follow-up messages that maintain client relationships.",
  },
  {
    key: "seo_research",
    name: "SEO & Content Research",
    description: "Research keywords, analyze competitors, and suggest content strategies.",
    category: "Marketing",
    role: "research",
    defaultTools: ["search", "fetch_url", "write_file"],
    defaultPermissions: [
      { key: "search", label: "Search web", description: "Search for keywords and trends", category: "Research", level: "allow_always" },
      { key: "fetch_url", label: "Analyze pages", description: "Analyze competitor and top-ranking pages", category: "Research", level: "allow_always" },
      { key: "write_file", label: "Save report", description: "Save research findings", category: "Storage", level: "allow_once" },
    ],
    defaultSystemPrompt: `You are an SEO research assistant. Your job is to:
1. Research target keywords and their difficulty
2. Analyze top-ranking pages for target keywords
3. Identify content gaps and opportunities
4. Suggest content topics and outlines
5. Compile findings into a structured report`,
    estimatedCost: "$2-$8 per research topic",
    expectedOutcome: "An actionable SEO research report with keyword targets and content recommendations.",
  },
  {
    key: "competitor_research",
    name: "Competitor Research",
    description: "Research competitors, their products, pricing, and market positioning.",
    category: "Research",
    role: "startup_research",
    defaultTools: ["search", "fetch_url", "read_file", "write_file"],
    defaultPermissions: [
      { key: "search", label: "Search", description: "Search for competitor information", category: "Research", level: "allow_always" },
      { key: "fetch_url", label: "Fetch pages", description: "Visit competitor websites and profiles", category: "Research", level: "allow_always" },
      { key: "write_file", label: "Save analysis", description: "Save competitor analysis", category: "Storage", level: "allow_once" },
    ],
    defaultSystemPrompt: `You are a competitive research assistant. Your job is to:
1. Identify key competitors in the market
2. Research their products, pricing, features, and positioning
3. Analyze their strengths and weaknesses
4. Identify market opportunities and threats
5. Compile a structured competitive analysis report`,
    estimatedCost: "$3-$12 per competitor analysis",
    expectedOutcome: "A detailed competitive analysis with actionable insights.",
  },
  {
    key: "code_review_qa",
    name: "Code Review & QA",
    description: "Review code for quality, security issues, and best practices.",
    category: "Development",
    role: "review",
    defaultTools: ["read_file", "search", "write_file"],
    defaultPermissions: [
      { key: "read_file", label: "Read code", description: "Read source files for review", category: "Read", level: "allow_always" },
      { key: "search", label: "Search codebase", description: "Search for patterns across the codebase", category: "Read", level: "allow_always" },
      { key: "write_file", label: "Write review", description: "Write review comments", category: "Write", level: "deny" },
    ],
    defaultSystemPrompt: `You are a code review and QA assistant. Your job is to:
1. Review code changes for bugs, security issues, and anti-patterns
2. Check for test coverage and suggest improvements
3. Verify coding standards and best practices
4. Provide clear, actionable feedback
5. Suggest fixes and improvements`,
    estimatedCost: "$1-$5 per review",
    expectedOutcome: "A thorough code review with actionable feedback and improvement suggestions.",
  },
  {
    key: "content_research",
    name: "Content Research & Repurposing",
    description: "Research content topics, gather resources, and repurpose existing content.",
    category: "Content",
    role: "content_repurposing",
    defaultTools: ["search", "fetch_url", "read_file", "write_file"],
    defaultPermissions: [
      { key: "search", label: "Search", description: "Search for content ideas and references", category: "Research", level: "allow_always" },
      { key: "fetch_url", label: "Fetch references", description: "Fetch reference content", category: "Research", level: "allow_always" },
      { key: "write_file", label: "Save content", description: "Save drafted content", category: "Storage", level: "deny" },
    ],
    defaultSystemPrompt: `You are a content research and repurposing assistant. Your job is to:
1. Research trending topics and content gaps
2. Gather reference materials and sources
3. Suggest content formats and angles
4. Repurpose existing content for new formats (blog, social, video, podcast)
5. Draft content outlines and drafts`,
    estimatedCost: "$2-$6 per content package",
    expectedOutcome: "Researched, repurposed content ready for publication across channels.",
  },
];

// -- Template Access ---------------------------------------------------------

export function getAllTemplates(): FreelancerTemplate[] {
  return FREELANCER_TEMPLATES;
}

export function getTemplateByKey(key: string): FreelancerTemplate | null {
  return FREELANCER_TEMPLATES.find((t) => t.key === key) ?? null;
}

export function getTemplatesByCategory(category: string): FreelancerTemplate[] {
  return FREELANCER_TEMPLATES.filter((t) => t.category === category);
}

/**
 * Apply a freelancer template to create an agent config draft.
 */
export function applyTemplate(
  templateKey: string,
  workspaceId: string,
  customGoal?: string,
): {
  name: string;
  description: string;
  role: AgentRole;
  tools: string[];
  systemPrompt: string;
  permissions: AgentPermission[];
} | null {
  const template = getTemplateByKey(templateKey);
  if (!template) return null;

  return {
    name: template.name,
    description: customGoal ?? template.description,
    role: template.role,
    tools: template.defaultTools,
    systemPrompt: customGoal
      ? `${template.defaultSystemPrompt}\n\nSpecific goal: ${customGoal}`
      : template.defaultSystemPrompt,
    permissions: template.defaultPermissions,
  };
}
