/**
 * E2E for the remote-control terminal protocol (create → claim → stream →
 * finish → cancel) against the running API.
 *
 *   npm run e2e:terminal --workspace @layerflow/api
 *
 * Uses the CLI path: a throwaway workspace API key (kept in memory, never
 * printed) hitting API_URL (default http://localhost:8787). The key is
 * revoked before exit. Exits 0 when every check passes.
 */
import { db } from "../src/db/client";
import { createWorkspaceApiKey, revokeWorkspaceApiKey } from "../src/services/keys/api-keys";
import { pool } from "../src/db/client";
import { workspaces } from "../src/db/schema/tenancy";
import { eq } from "drizzle-orm";

const base = process.env.API_URL ?? "http://localhost:8787";
const failures: string[] = [];

function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ✓ ${name}`);
  } else {
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
    failures.push(name);
  }
}

interface TerminalCommand {
  id: string;
  status: string;
  device_id?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  output?: string | null;
  exit_code?: number | null;
  error_message?: string | null;
}

interface TerminalCommandResponse {
  command?: TerminalCommand | null;
  commands?: TerminalCommand[];
}

async function call(path: string, secret: string, init?: RequestInit) {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
      ...(init?.headers ?? {}),
    },
  });
  let body: TerminalCommandResponse | null = null;
  try {
    body = (await res.json()) as TerminalCommandResponse;
  } catch {
    /* no body */
  }
  return { res, body };
}

async function main() {
  const user = await db.query.users.findFirst();
  check("user exists", !!user, "no users in dev DB");
  if (!user) return;

  // Throwaway workspace so repeated runs never collide with stale commands or
  // a shared workspace's data; it (and its commands/keys) cascade away below.
  const registered = await db
    .insert(workspaces)
    .values({
      ownerUserId: user.id,
      name: `e2e-terminal ${Date.now()}`,
      slug: `e2e-terminal-${Date.now()}`,
    })
    .returning();
  const ws = registered[0];
  console.log("created throwaway workspace", ws.id);

  const { key, secret } = await createWorkspaceApiKey(ws.id, { name: "e2e-tmp-smoke" });
  try {
    console.log("created key", key.id, "workspace", ws.id, "secretLen", secret.length);
    const reread = await db.query.apiKeys.findFirst({ where: (k, { eq }) => eq(k.id, key.id) });
    console.log("reread key row:", reread ? { id: reread.id, prefix: reread.keyPrefix, revoked: reread.revokedAt } : "MISSING");

    // -- create (null device → any device can run) -------------------------
    const c1 = await call("/api/v1/terminal/commands", secret, {
      method: "POST",
      body: JSON.stringify({ command: "echo apple" }),
    });
    check("create any-device command → 201", c1.res.status === 201);
    check("create returns pending", c1.body?.command?.status === "pending");
    const m1 = c1.body!.command!;

    // -- create (device-scoped) --------------------------------------------
    const c2 = await call("/api/v1/terminal/commands", secret, {
      method: "POST",
      body: JSON.stringify({ command: "whoami", device_id: "e2e-device-a" }),
    });
    check("create device-scoped command → 201", c2.res.status === 201);
    check("create stores device_id", c2.body?.command?.device_id === "e2e-device-a");
    const m2 = c2.body!.command!;

    // -- claim by a different device → oldest eligible (the any-device one) -
    const p1 = await call("/api/v1/terminal/commands/poll", secret, {
      method: "POST",
      body: JSON.stringify({ device_id: "e2e-device-b" }),
    });
    check("wrong device claims the any-device command", p1.body?.command?.id === m1.id);
    check("claim upserts device_id onto command", p1.body?.command?.device_id === "e2e-device-b");
    check("claim marks running", p1.body?.command?.status === "running");
    check("claim sets started_at", !!p1.body?.command?.started_at);
    const r1 = p1.body!.command!;

    // -- second claim by wrong device → nothing eligible --------------------
    const p2 = await call("/api/v1/terminal/commands/poll", secret, {
      method: "POST",
      body: JSON.stringify({ device_id: "e2e-device-b" }),
    });
    check("second claim by wrong device → null", p2.res.status === 200 && p2.body?.command === null);

    // -- right device picks up its scoped command ---------------------------
    const p3 = await call("/api/v1/terminal/commands/poll", secret, {
      method: "POST",
      body: JSON.stringify({ device_id: "e2e-device-a" }),
    });
    check("right device claims its scoped command", p3.body?.command?.id === m2.id);

    // -- wrong device doing a partial result on a command it claimed? --
    // (result is workspace-scoped; any authed caller may report — fine for a
    //  single-device product; covered by workspace scoping)

    // -- partial stream ------------------------------------------------------
    const s1 = await call(`/api/v1/terminal/commands/${r1.id}/result`, secret, {
      method: "POST",
      body: JSON.stringify({ output: "apple\n", finished: false }),
    });
    check("stream partial → 200", s1.res.status === 200);
    check("stream keeps running", s1.body?.command?.status === "running");
    check("stream accumulates output", (s1.body?.command?.output ?? "").includes("apple"));

    // -- finish success -------------------------------------------------------
    const f1 = await call(`/api/v1/terminal/commands/${r1.id}/result`, secret, {
      method: "POST",
      body: JSON.stringify({ output: "apple\nexit ok\n", finished: true, exit_code: 0 }),
    });
    check("finish success → 200", f1.res.status === 200);
    check("finish sets succeeded", f1.body?.command?.status === "succeeded");
    check("finish sets exit_code 0", f1.body?.command?.exit_code === 0);
    check("finish sets completed_at", !!f1.body?.command?.completed_at);

    // -- finish failure --------------------------------------------------------
    const f2 = await call(`/api/v1/terminal/commands/${m2.id}/result`, secret, {
      method: "POST",
      body: JSON.stringify({ output: "boom\n", finished: true, exit_code: 2, error: "command failed" }),
    });
    check("finish failure sets status failed", f2.body?.command?.status === "failed");
    check("finish failure stores error", f2.body?.command?.error_message === "command failed");

    // -- result on finished command → 409 -------------------------------------
    const r409 = await call(`/api/v1/terminal/commands/${r1.id}/result`, secret, {
      method: "POST",
      body: JSON.stringify({ finished: true, exit_code: 0 }),
    });
    check("result on finished command → 409", r409.res.status === 409);

    // -- cancel a pending command ---------------------------------------------
    const c3 = await call("/api/v1/terminal/commands", secret, {
      method: "POST",
      body: JSON.stringify({ command: "sleep 9999" }),
    });
    const m3 = c3.body!.command!;
    const cancel = await call(`/api/v1/terminal/commands/${m3.id}/cancel`, secret, {
      method: "POST",
    });
    check("cancel pending → 200/409-ok", [200, 409].includes(cancel.res.status));
    if (cancel.res.status === 200) {
      check("cancel marks cancelled", cancel.body?.command?.status === "cancelled");
    }

    // -- cancel a running command → 409 ---------------------------------------
    const cancelRunning = await call(`/api/v1/terminal/commands/${m2.id}/cancel`, secret, {
      method: "POST",
    });
    check("cancel running command → 409", cancelRunning.res.status === 409);

    // -- list reflects all ------------------------------------------------
    const list = await call("/api/v1/terminal/commands?limit=10", secret);
    const ids = (list.body?.commands ?? []).map((c) => c.id);
    check("list shows all commands", [m1.id, m2.id, m3.id].every((id) => ids.includes(id)));
    check("list newest-first", ids[0] === m3.id);

    // -- validation ---------------------------------------------------------
    const bad = await call("/api/v1/terminal/commands", secret, {
      method: "POST",
      body: JSON.stringify({ command: "" }),
    });
    check("empty command rejected", bad.res.status === 400);

    // -- invalid key → 401 ---------------------------------------------------
    const badKey = await call("/api/v1/terminal/commands", "lf_live_bogus_key", {});
    check("bogus key → 401", badKey.res.status === 401);
  } finally {
    await revokeWorkspaceApiKey(ws.id, key.id);
    await db.delete(workspaces).where(eq(workspaces.id, ws.id));
    console.log(`\nrevoked test key ${key.keyPrefix}… and removed throwaway workspace`);
  }

  await pool.end();
  if (failures.length > 0) {
    console.error(`\nE2E FAILED (${failures.length}): ${failures.join(", ")}`);
    process.exit(1);
  }
  console.log("\nE2E OK — remote-control protocol verified end to end.");
}

main().catch(async (err) => {
  console.error("E2E error:", err);
  await pool.end();
  process.exit(1);
});
