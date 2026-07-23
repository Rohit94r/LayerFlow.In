/**
 * Smoke check: is the API up and are its dependencies healthy?
 *
 *   npm run smoke --workspace @layerflow/api
 *
 * Hits GET /health on API_URL (default http://localhost:8787). Exits 0 when
 * healthy, 1 when the API responds but a dependency is down, and 0 with a
 * "skipped" message when the API isn't running at all (so CI without the
 * stack doesn't fail).
 */

const base = process.env.API_URL ?? "http://localhost:8787";

async function main(): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${base}/health`, { signal: AbortSignal.timeout(5_000) });
  } catch {
    console.log(`smoke: SKIPPED — no API listening at ${base}`);
    console.log(
      "smoke: start it with `npm run dev --workspace @layerflow/api` after confirming apps/api/.env points at Neon/Upstash or local Docker services.",
    );
    return;
  }

  const body = (await res.json()) as { status: string; checks: Record<string, boolean> };
  console.log(`smoke: GET ${base}/health → ${res.status} ${JSON.stringify(body)}`);

  if (res.ok && body.status === "ok") {
    console.log("smoke: OK — db and redis are healthy");
    return;
  }

  for (const [name, up] of Object.entries(body.checks ?? {})) {
    if (!up) console.error(`smoke: dependency DOWN: ${name}`);
  }
  console.error(
    "smoke: FAILED — check apps/api/.env first (DATABASE_URL / REDIS_URL). Docker is optional if Neon and Upstash are reachable.",
  );
  process.exit(1);
}

main();
