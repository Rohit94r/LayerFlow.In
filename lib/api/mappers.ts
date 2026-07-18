import type {
  ActivityEvent,
  ApiKey as ApiKeyDto,
  BudgetScope,
  CompareJobResponse,
  CurrentBudgetResponse,
  Domain as DomainDto,
  Project as ProjectDto,
  Prompt as PromptDto,
  PromptOutput,
  PromptSession as PromptSessionDto,
  PromptVersion as PromptVersionDto,
  RoutingRule as RoutingRuleDto,
  SessionMessage,
  User as UserDto,
  WorkspaceSettingsDto,
} from "@layerflow/contracts";
import { microToUsd } from "./money";
import type {
  ActivityItem,
  ApiKey,
  Budget,
  CompareResult,
  Domain,
  KeyBudget,
  Project,
  ProjectBudget,
  Prompt,
  PromptSession,
  PromptVersion,
  RoutingRule,
  User,
  WorkspaceSettings,
} from "@/lib/types";

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function mapUser(user: UserDto): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarInitials: initialsFromName(user.name),
    plan: "pro",
  };
}

export function mapDomain(
  domain: DomainDto,
  counts?: { projectCount?: number; promptCount?: number },
): Domain {
  return {
    id: domain.id,
    slug: domain.slug,
    name: domain.name,
    description: domain.description ?? "",
    icon: domain.icon ?? "Sparkles",
    color: domain.color ?? "#44edbc",
    projectCount: counts?.projectCount ?? 0,
    promptCount: counts?.promptCount ?? 0,
  };
}

export function mapProject(
  project: ProjectDto,
  counts?: { folderCount?: number; promptCount?: number },
): Project {
  return {
    id: project.id,
    domainId: project.domainId,
    name: project.name,
    description: project.description ?? "",
    folderCount: counts?.folderCount ?? 0,
    promptCount: counts?.promptCount ?? 0,
    updatedAt: project.updatedAt,
    archived: project.status === "archived",
  };
}

export function mapPromptVersion(
  version: PromptVersionDto,
  output?: PromptOutput | null,
): PromptVersion {
  return {
    id: version.id,
    version: version.version,
    content: version.body,
    model: output?.model ?? version.modelHint ?? "unknown",
    provider: output?.provider ?? "unknown",
    cost: output ? microToUsd(output.costMicro) : 0,
    tokensIn: output?.inputTokens ?? 0,
    tokensOut: output?.outputTokens ?? 0,
    output: output?.body ?? "",
    createdAt: version.createdAt,
    note: version.note ?? undefined,
  };
}

export function mapPrompt(
  prompt: PromptDto,
  currentVersion?: PromptVersionDto | null,
  versions: PromptVersion[] = [],
): Prompt {
  const content = currentVersion?.body ?? versions[versions.length - 1]?.content ?? "";
  const latest = versions[versions.length - 1];
  return {
    id: prompt.id,
    projectId: prompt.projectId ?? "",
    folderId: prompt.folderId ?? undefined,
    domainId: prompt.domainId ?? "",
    title: prompt.title,
    description: prompt.description ?? undefined,
    content,
    tags: prompt.tags,
    favorite: prompt.favorite,
    variables: [],
    versions,
    notes: prompt.notes ?? undefined,
    model: latest?.model ?? currentVersion?.modelHint ?? "gpt-4o",
    provider: latest?.provider ?? "unknown",
    cost: latest?.cost ?? 0,
    tokensIn: latest?.tokensIn ?? 0,
    tokensOut: latest?.tokensOut ?? 0,
    updatedAt: prompt.updatedAt,
    createdAt: prompt.createdAt,
  };
}

export function mapSession(
  session: PromptSessionDto,
  messages: SessionMessage[] = [],
): PromptSession {
  const promptIds = [
    ...new Set(
      messages
        .map((m) => m.promptId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  return {
    id: session.id,
    title: session.title,
    description: session.description ?? undefined,
    domainId: session.domainId ?? "",
    projectId: session.projectId ?? undefined,
    promptIds,
    status: session.status,
    totalCost: microToUsd(session.totalCostMicro),
    totalTokens: session.totalTokens,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

export function mapBudget(res: CurrentBudgetResponse): Budget {
  const { budget, remainingMicro, percentUsed, blocked, dailySpentMicro } = res;
  const monthlyLimit = microToUsd(budget.monthlyLimitMicro);
  const spent = microToUsd(budget.spentMicro);
  const dailyLimit = budget.dailyLimitMicro != null ? microToUsd(budget.dailyLimitMicro) : 0;
  const [year, month] = budget.period.split("-").map(Number);
  const resetDate = new Date(Date.UTC(year, month, 1)).toISOString();
  return {
    monthlyLimit,
    dailyLimit,
    spent,
    dailySpent: dailySpentMicro != null ? microToUsd(dailySpentMicro) : 0,
    remaining: microToUsd(remainingMicro),
    percentUsed,
    blocked,
    alertThreshold: budget.alertAtPct,
    resetDate,
  };
}

export function mapProjectBudgets(
  scopes: BudgetScope[],
  projects: Project[],
): ProjectBudget[] {
  return scopes
    .filter((s) => s.scopeType === "project" && s.projectId)
    .map((s) => {
      const project = projects.find((p) => p.id === s.projectId);
      const limit = microToUsd(s.limitMicro);
      const spent = microToUsd(s.spentMicro);
      return {
        projectId: s.projectId!,
        projectName: project?.name ?? "Project",
        limit,
        spent,
        percentUsed: limit > 0 ? (spent / limit) * 100 : 0,
      };
    });
}

export function mapKeyBudgets(scopes: BudgetScope[], keys: ApiKey[]): KeyBudget[] {
  return scopes
    .filter((s) => s.scopeType === "api_key" && s.apiKeyId)
    .map((s) => {
      const key = keys.find((k) => k.id === s.apiKeyId);
      const limit = microToUsd(s.limitMicro);
      const spent = microToUsd(s.spentMicro);
      return {
        keyId: s.apiKeyId!,
        keyName: key?.name ?? "API key",
        limit,
        spent,
        percentUsed: limit > 0 ? (spent / limit) * 100 : 0,
      };
    });
}

export function mapApiKey(key: ApiKeyDto): ApiKey {
  return {
    id: key.id,
    name: key.name,
    prefix: key.keyPrefix,
    projectId: key.projectId ?? undefined,
    createdAt: key.createdAt,
    lastUsed: key.lastUsedAt ?? undefined,
  };
}

export function mapSettings(settings: WorkspaceSettingsDto): WorkspaceSettings {
  return {
    preferCheap: settings.preferCheap,
    executionMode: settings.executionMode,
    defaultModel: settings.defaultModel,
  };
}

export function mapRoutingRule(rule: RoutingRuleDto): RoutingRule {
  return {
    id: rule.id,
    condition: rule.condition,
    model: rule.targetModel,
    enabled: rule.enabled,
  };
}

export function mapActivity(event: ActivityEvent): ActivityItem {
  const typeMap: Record<string, ActivityItem["type"]> = {
    "prompt.created": "prompt_saved",
    "prompt.updated": "prompt_saved",
    "prompt.version_created": "prompt_saved",
    "compare.completed": "compare_run",
    "session.created": "session_started",
    "budget.alert": "budget_alert",
    "cache.hit": "cache_hit",
  };
  return {
    id: event.id,
    type: typeMap[event.type] ?? "prompt_saved",
    title: event.title,
    description: event.description ?? undefined,
    timestamp: event.createdAt,
    meta: typeof event.meta?.summary === "string" ? event.meta.summary : undefined,
  };
}

export function mapCompareResults(job: CompareJobResponse): CompareResult[] {
  return job.results.map((r) => ({
    model: r.run.model,
    provider: r.run.provider,
    output: r.run.output ?? "",
    cost: microToUsd(r.run.costMicro),
    latencyMs: r.run.latencyMs ?? 0,
    tokensIn: r.run.inputTokens,
    tokensOut: r.run.outputTokens,
    qualityScore: r.rankHints?.best ? 100 : r.rankHints?.cheapest ? 80 : 70,
    rankHints: r.rankHints ?? undefined,
  }));
}
