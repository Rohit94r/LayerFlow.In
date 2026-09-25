# scripts/

Deployment + ops shell scripts. None of these are needed for local dev.

| Script | What it does |
| --- | --- |
| `deploy-api-prod.sh` | **Deploys the API + worker to Fly.io** (Docker build; secrets from `.vercel.env`; scales `app=1 worker=1`). Used by `npm run deploy:api`. |
| `check-production.sh` | Health-checks the production deployment: site, DNS, API + worker (`npm run check:prod`). |
| `preflight-prod.sh` | Validates `.vercel.env`/`fly.env` before deploying — required keys, golden URL rules, Vercel↔Fly parity. No values printed (`npm run preflight:prod`; runs automatically inside the deploy script). |
| `vercel-env-checklist.sh` | Prints/verifies the env vars Vercel needs for the web app. |
| `generate-blog-posts.mjs` | Generates blog markdown into `apps/web/content/blog/`. |

Deployment docs: `docs/DEPLOYMENT.md`.
