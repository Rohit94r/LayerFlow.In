# scripts/

Deployment + ops shell scripts. None of these are needed for local dev.

| Script | What it does |
| --- | --- |
| `deploy-api-prod.sh` | **Deploys the API + worker to Fly.io** (Docker build; secrets from `.vercel.env`; scales `app=1 worker=1`). Used by `npm run deploy:api`. |
| `check-production.sh` | Health-checks the production deployment: site, DNS, API + worker (`npm run check:prod`). |
| `vercel-env-checklist.sh` | Prints/verifies the env vars Vercel needs for the web app. |
| `generate-blog-posts.mjs` | Generates blog markdown into `apps/web/content/blog/`. |
| `legacy/` | Archived Render blueprint + VPS Docker stack (`render.yaml`, `docker-compose.prod.yml`/`.vps.yml`, `nginx.conf`, root `Dockerfile`, `deploy-vps.sh`, `vps-migrate.sh`) — kept for reference; Fly is the production path. |

Deployment docs: `docs/DEPLOYMENT.md`, ops: `docs/ops/docker-commands.md`.
