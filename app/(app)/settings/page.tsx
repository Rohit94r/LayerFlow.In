import { demoUser, apiKeys } from "@/lib/mock-data";

export const metadata = {
  title: "Settings",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-ink)]">
          Settings
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Account, API keys, and workspace preferences.
        </p>
      </div>

      <div className="card p-6">
        <h3 className="mb-4 text-base font-semibold text-[var(--color-ink)]">
          Profile
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-lg font-medium text-[var(--color-brand)]">
            {demoUser.avatarInitials}
          </div>
          <div>
            <p className="font-medium text-[var(--color-ink)]">{demoUser.name}</p>
            <p className="text-sm text-[var(--color-muted)]">{demoUser.email}</p>
            <span className="mt-1 inline-block rounded-full bg-[var(--color-brand)]/15 px-2 py-0.5 text-xs font-medium text-[var(--color-brand)]">
              {demoUser.plan === "pro" ? "Pro plan" : "Free plan"}
            </span>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-[var(--color-ink)]">
            API Keys
          </h3>
          <button className="btn-primary rounded-lg px-3 py-1.5 text-xs font-medium">
            Create key
          </button>
        </div>
        <div className="space-y-3">
          {apiKeys.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-[var(--color-ink)]">
                  {key.name}
                </p>
                <p className="font-mono text-xs text-[var(--color-faint)]">
                  {key.prefix}••••••••
                </p>
              </div>
              <div className="text-right text-xs text-[var(--color-faint)]">
                <p>Created {formatDate(key.createdAt)}</p>
                {key.lastUsed && <p>Last used {formatDate(key.lastUsed)}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="mb-4 text-base font-semibold text-[var(--color-ink)]">
          Budget defaults
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs text-[var(--color-muted)]">
              Monthly limit ($)
            </label>
            <input
              type="number"
              defaultValue={50}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-border-strong)]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-[var(--color-muted)]">
              Alert at (%)
            </label>
            <input
              type="number"
              defaultValue={80}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-border-strong)]"
            />
          </div>
        </div>
        <button className="btn-primary mt-4 rounded-lg px-4 py-2 text-sm font-medium">
          Save preferences
        </button>
      </div>
    </div>
  );
}
