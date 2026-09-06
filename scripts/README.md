# scripts/

Deployment + ops shell scripts. None of these are needed for local dev.

| Script | What it does |
| --- | --- |
| `deploy-api-prod.sh` | Deploys the API to production (used by `npm run deploy:api`). |
| `check-production.sh` | Health-checks the production deployment (`npm run check:prod`). |
| `deploy-vps.sh` | VPS Docker deployment helper. |
| `vps-migrate.sh` | Runs DB migrations against the VPS stack. |
| `vercel-env-checklist.sh` | Prints/verifies the env vars Vercel needs for the web app. |
| `generate-blog-posts.mjs` | Generates blog markdown into `apps/web/content/blog/`. |

Deployment docs: `docs/DEPLOYMENT.md`, `docs/ops/docker-commands.md`.
