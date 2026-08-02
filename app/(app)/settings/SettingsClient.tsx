"use client";

import { useState } from "react";
import { User, Bell, Shield, KeyRound, Palette, CreditCard, Check } from "@/components/ui/icons";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { useSession } from "@/lib/auth-client";

export default function SettingsClient() {
  const session = useSession();
  const user = session.data?.user;
  const [saved, setSaved] = useState<string | null>(null);

  function save(label: string) {
    setSaved(label);
    window.setTimeout(() => setSaved(null), 1800);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" description="Your account, workspace, keys and plan." />

      <div className="space-y-5">
        {/* Profile */}
        <Card>
          <CardHeader title="Profile" description="Shown across your workspace" action={<User className="h-4 w-4 text-faint" />} />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input defaultValue={user?.name ?? ""} />
            </Field>
            <Field label="Email">
              <Input defaultValue={user?.email ?? ""} disabled />
            </Field>
            <Field label="Default target model" hint="Where Continue Packs are formatted for">
              <Select defaultValue="gemini-flash">
                <option value="gemini-flash">Gemini 2.5 Flash</option>
                <option value="claude-sonnet">Claude Sonnet 4.5</option>
                <option value="gpt-5">GPT-5</option>
                <option value="deepseek-v3">DeepSeek V3.2</option>
                <option value="kimi-k2">Kimi K2</option>
              </Select>
            </Field>
            <Field label="Language">
              <Select defaultValue="en">
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="hi">हिन्दी</option>
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Button size="sm" onClick={() => save("Profile saved")} icon={saved === "Profile saved" ? <Check className="h-3.5 w-3.5" /> : undefined}>
                {saved === "Profile saved" ? "Saved" : "Save profile"}
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader title="Notifications" description="Keep your AI work top of mind" action={<Bell className="h-4 w-4 text-faint" />} />
          <CardBody className="space-y-3">
            {[
              { label: "Weekly context digest", hint: "Summary of rescues, prompts and learnings every Monday" },
              { label: "Cost alerts", hint: "When monthly spend passes 50% / 80% of your budget" },
              { label: "BYOK health warnings", hint: "When a provider key starts failing" },
              { label: "Outcome feedback reminders", hint: "Ask how a Continue Pack performed" },
            ].map((n) => (
              <label key={n.label} className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-border bg-surface-2/40 p-4">
                <span>
                  <span className="block text-sm font-medium text-ink">{n.label}</span>
                  <span className="mt-0.5 block text-[11px] text-faint">{n.hint}</span>
                </span>
                <input type="checkbox" defaultChecked className="mt-1 h-4 w-4 accent-amber-500" />
              </label>
            ))}
            <Button size="sm" onClick={() => save("Notification prefs saved")} icon={saved === "Notification prefs saved" ? <Check className="h-3.5 w-3.5" /> : undefined}>
              {saved === "Notification prefs saved" ? "Saved" : "Save preferences"}
            </Button>
          </CardBody>
        </Card>

        {/* Plan */}
        <Card>
          <CardHeader title="Plan" description="Workflow value pricing — never pay per AI credit" action={<CreditCard className="h-4 w-4 text-faint" />} />
          <CardBody>
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface-2/40 p-5">
              <div>
                <p className="text-sm font-semibold text-ink">Free plan</p>
                <p className="mt-0.5 text-[11px] text-faint">
                  3 Rescue Reports / month · Upgrade for unlimited reports + Cost Check + BYOK
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm">Compare plans</Button>
                <Button size="sm">Upgrade to Starter · $5</Button>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader title="Appearance" action={<Palette className="h-4 w-4 text-faint" />} />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field label="Theme">
              <Select defaultValue="system">
                <option value="system">System</option>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </Select>
            </Field>
            <Field label="Density">
              <Select defaultValue="comfortable">
                <option value="comfortable">Comfortable</option>
                <option value="compact">Compact</option>
              </Select>
            </Field>
          </CardBody>
        </Card>

        {/* Privacy */}
        <Card>
          <CardHeader title="Privacy & data" action={<Shield className="h-4 w-4 text-faint" />} />
          <CardBody className="space-y-4">
            <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-border bg-surface-2/40 p-4">
              <span>
                <span className="block text-sm font-medium text-ink">Private mode (no storage)</span>
                <span className="mt-0.5 block text-[11px] text-faint">
                  Never store raw chats — only the derived report. Coming in Phase 3.
                </span>
              </span>
              <input type="checkbox" className="mt-1 h-4 w-4 accent-amber-500" />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm">Export all data (.zip)</Button>
              <Button variant="secondary" size="sm" className="text-rose-400 hover:text-rose-300">Delete workspace</Button>
            </div>
          </CardBody>
        </Card>

        {/* Danger zone */}
        <Card className="border-rose-500/20">
          <CardHeader title="Danger zone" description="Irreversible actions" action={<KeyRound className="h-4 w-4 text-faint" />} />
          <CardBody>
            <p className="text-sm text-muted">
              Signing out or clearing local data never touches your saved passports — they live in
              your workspace. This build runs on mock data; nothing is actually deleted.
            </p>
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" size="sm">Sign out</Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
